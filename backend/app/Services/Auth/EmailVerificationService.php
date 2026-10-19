<?php

namespace App\Services\Auth;

use App\Models\EmailVerificationToken;
use App\Models\User;
use App\Notifications\CustomerVerifyEmailNotification;
use Carbon\Carbon;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Cookie;

class EmailVerificationService
{
    /**
     * Check if email verification is enabled.
     * Safe default is false (current production behavior).
     */
    public function isEnabled(): bool
    {
        return (bool) Config::get('auth.verification.enabled', false);
    }

    /**
     * Check if same-browser verification is required.
     */
    public function isSameBrowserRequired(): bool
    {
        return (bool) Config::get('auth.verification.same_browser_required', true);
    }

    /**
     * Get configured verification token expiration in minutes.
     */
    public function getExpirationMinutes(): int
    {
        return (int) Config::get('auth.verification.expire', 60);
    }

    /**
     * Get cookie name for same-browser binding.
     */
    public function getCookieName(): string
    {
        return (string) Config::get('auth.verification.cookie_name', 'ayc_reg_binding');
    }

    /**
     * Generate a cryptographically secure 256-bit random secret.
     */
    public function generateSecret(): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Create an email verification challenge for a user.
     * Generates a raw token and raw browser-binding secret, stores their SHA-256 hashes,
     * and returns the challenge payload.
     *
     * @return array{
     *     raw_token: string,
     *     binding_secret: ?string,
     *     verification_url: string,
     *     expires_at: Carbon,
     *     cookie: ?Cookie
     * }
     */
    public function createChallenge(User $user, ?string $existingBindingSecret = null): array
    {
        $rawToken = $this->generateSecret();
        $tokenHash = hash('sha256', $rawToken);

        $bindingSecret = null;
        $bindingHash = null;

        if ($this->isSameBrowserRequired()) {
            $bindingSecret = $existingBindingSecret ?: $this->generateSecret();
            $bindingHash = hash('sha256', $bindingSecret);
        }

        $expiresAt = Carbon::now()->addMinutes($this->getExpirationMinutes());

        DB::transaction(function () use ($user, $tokenHash, $bindingHash, $expiresAt) {
            // Invalidate any existing unused challenges for this user
            EmailVerificationToken::where('user_id', $user->id)
                ->whereNull('used_at')
                ->update(['used_at' => now()]);

            // Persist the new challenge with SHA-256 hashes
            EmailVerificationToken::create([
                'user_id' => $user->id,
                'email' => $user->email,
                'token_hash' => $tokenHash,
                'browser_binding_hash' => $bindingHash,
                'expires_at' => $expiresAt,
            ]);
        });

        // Build temporary signed URL
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            $expiresAt,
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
                'token' => $rawToken,
            ]
        );

        $cookie = null;
        if ($bindingSecret) {
            $cookie = $this->createBindingCookie($bindingSecret, $this->getExpirationMinutes());
        }

        return [
            'raw_token' => $rawToken,
            'binding_secret' => $bindingSecret,
            'verification_url' => $verificationUrl,
            'expires_at' => $expiresAt,
            'cookie' => $cookie,
        ];
    }

    /**
     * Build an HttpOnly, Secure, SameSite=Lax cookie for browser binding.
     */
    public function createBindingCookie(string $secret, int $minutes): Cookie
    {
        $isSecure = app()->isProduction() || request()->isSecure();

        return cookie(
            name: $this->getCookieName(),
            value: $secret,
            minutes: $minutes,
            path: '/',
            domain: null, // Host-only cookie matching current domain
            secure: $isSecure,
            httpOnly: true,
            raw: false,
            sameSite: 'lax' // Permits cookie transmission on top-level navigation from email client
        );
    }

    /**
     * Build an expired cookie to clear the browser binding after verification.
     */
    public function clearBindingCookie(): Cookie
    {
        return cookie()->forget($this->getCookieName(), '/', null);
    }

    /**
     * Atomically verify an incoming token and originating browser context.
     *
     * @return array{
     *     status: 'success'|'already_verified'|'different_browser'|'invalid_or_expired'|'user_not_found',
     *     message: string,
     *     user?: User,
     *     clear_cookie?: bool
     * }
     */
    public function verify(Request $request, string|int $id, ?string $rawToken = null): array
    {
        $user = User::find($id);
        if (! $user) {
            return [
                'status' => 'user_not_found',
                'message' => 'User account not found.',
            ];
        }

        // Already verified
        if ($user->hasVerifiedEmail()) {
            return [
                'status' => 'already_verified',
                'message' => 'Email address is already verified.',
                'user' => $user,
                'clear_cookie' => true,
            ];
        }

        // Legacy / Standard Laravel verification signature verification (if no token system)
        if (empty($rawToken)) {
            // Validate sha1 hash
            if (! hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
                return [
                    'status' => 'invalid_or_expired',
                    'message' => 'The verification link does not match this account.',
                ];
            }

            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
            }

            return [
                'status' => 'success',
                'message' => 'Email verified successfully.',
                'user' => $user,
                'clear_cookie' => true,
            ];
        }

        $tokenHash = hash('sha256', $rawToken);

        // Atomic check with pessimistic lock
        return DB::transaction(function () use ($request, $user, $tokenHash) {
            $tokenRecord = EmailVerificationToken::where('token_hash', $tokenHash)
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $tokenRecord || $tokenRecord->isUsed()) {
                return [
                    'status' => 'invalid_or_expired',
                    'message' => 'This verification link is invalid or has already been used.',
                ];
            }

            if ($tokenRecord->isExpired()) {
                return [
                    'status' => 'invalid_or_expired',
                    'message' => 'This verification link has expired.',
                ];
            }

            // Same-Browser Enforcement
            if ($this->isSameBrowserRequired() && ! empty($tokenRecord->browser_binding_hash)) {
                $incomingCookie = $request->cookie($this->getCookieName());

                if (empty($incomingCookie) || ! $tokenRecord->matchesBrowserBinding($incomingCookie)) {
                    // Scanner / Different Browser: DO NOT consume token. Return different_browser status.
                    return [
                        'status' => 'different_browser',
                        'message' => 'This verification link was opened in a different browser than the one used to register. Please open the link in your original browser, or verify with your account credentials.',
                        'user' => $user,
                        'clear_cookie' => false,
                    ];
                }
            }

            // Successful Verification
            $tokenRecord->update([
                'used_at' => now(),
                'verified_ip' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]);

            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
            }

            return [
                'status' => 'success',
                'message' => 'Email verified successfully.',
                'user' => $user,
                'clear_cookie' => true,
            ];
        });
    }

    /**
     * Cross-browser recovery: Allow customer to verify on a new device/browser
     * by submitting their account password alongside the valid verification token.
     */
    public function verifyWithCredentials(Request $request, string|int $id, string $rawToken, string $password): array
    {
        $user = User::find($id);
        if (! $user) {
            return [
                'status' => 'user_not_found',
                'message' => 'User account not found.',
            ];
        }

        if ($user->hasVerifiedEmail()) {
            return [
                'status' => 'already_verified',
                'message' => 'Email address is already verified.',
                'user' => $user,
            ];
        }

        if (! Hash::check($password, $user->password)) {
            return [
                'status' => 'invalid_credentials',
                'message' => 'The provided account password does not match our records.',
            ];
        }

        $tokenHash = hash('sha256', $rawToken);

        return DB::transaction(function () use ($request, $user, $tokenHash) {
            $tokenRecord = EmailVerificationToken::where('token_hash', $tokenHash)
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $tokenRecord || $tokenRecord->isUsed()) {
                return [
                    'status' => 'invalid_or_expired',
                    'message' => 'This verification link is invalid or has already been used.',
                ];
            }

            if ($tokenRecord->isExpired()) {
                return [
                    'status' => 'invalid_or_expired',
                    'message' => 'This verification link has expired.',
                ];
            }

            // Valid password credentials satisfy identity verification on the new device
            $tokenRecord->update([
                'used_at' => now(),
                'verified_ip' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]);

            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
            }

            return [
                'status' => 'success',
                'message' => 'Email verified successfully.',
                'user' => $user,
            ];
        });
    }

    /**
     * Send or resend verification challenge to a user.
     */
    public function sendVerificationNotification(User $user, ?string $existingBindingSecret = null): array
    {
        $challenge = $this->createChallenge($user, $existingBindingSecret);

        $user->notify(new CustomerVerifyEmailNotification(
            verificationUrl: $challenge['verification_url'],
            rawToken: $challenge['raw_token'],
            expiresInMinutes: $this->getExpirationMinutes()
        ));

        return $challenge;
    }
}
