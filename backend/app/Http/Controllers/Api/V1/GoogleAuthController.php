<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class GoogleAuthController extends ApiController
{
    /**
     * Redirect customer to Google OAuth consent screen.
     * GET /api/v1/auth/google/redirect
     */
    public function redirect(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        if (empty(config('services.google.client_id')) || empty(config('services.google.client_secret'))) {
            return $this->handleError($request, 'Google Sign-In is not currently configured on this server.');
        }

        // Store sanitized intended destination in session
        $target = $request->query('redirect', '/dashboard');
        $safeTarget = $this->sanitizeRedirectTarget($target);
        $request->session()->put('google_oauth_redirect', $safeTarget);

        return Socialite::driver('google')->redirect();
    }

    /**
     * Handle incoming OAuth callback from Google.
     * GET /api/v1/auth/google/callback
     */
    public function callback(Request $request): RedirectResponse|JsonResponse
    {
        // 1. Handle user cancellation or provider error parameters
        if ($request->has('error')) {
            $errorCode = $request->get('error');
            if ($errorCode === 'access_denied') {
                return $this->handleError($request, 'Google sign-in was cancelled.');
            }

            $errorDesc = $request->get('error_description', $errorCode);
            return $this->handleError($request, 'Google authentication error: ' . $errorDesc);
        }

        // 2. Validate OAuth state and retrieve Google user profile via Socialite
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (InvalidStateException $e) {
            return $this->handleError($request, 'Invalid callback state. Please try logging in again.');
        } catch (\Throwable $e) {
            Log::warning('Google OAuth callback failed', [
                'exception' => $e->getMessage(),
            ]);
            return $this->handleError($request, 'Google authentication failed. Please try again.');
        }

        // 3. Extract and validate required identity fields
        $googleId = $googleUser->getId();
        $email = $googleUser->getEmail();
        $name = $googleUser->getName() ?: ($googleUser->getNickname() ?: 'Customer');
        $avatar = $googleUser->getAvatar();

        if (empty($googleId)) {
            return $this->handleError($request, 'Unable to retrieve Google user ID.');
        }

        if (empty($email)) {
            return $this->handleError($request, 'Google account email is missing or inaccessible.');
        }

        // Check raw attributes for email verification flag if present
        $rawUser = is_array($googleUser->user) ? $googleUser->user : [];
        if (isset($rawUser['email_verified']) && $rawUser['email_verified'] === false) {
            return $this->handleError($request, 'Google account email is not verified.');
        }

        $email = strtolower(trim($email));

        // 4. Customer Account Rules
        // Case A: Google provider ID already exists in database
        $user = User::where('google_id', $googleId)->first();

        if ($user) {
            // ADMIN PROTECTION: Never authenticate admin accounts via Google
            if ($user->isAdmin() || $user->role !== User::ROLE_CUSTOMER) {
                return $this->handleError(
                    $request,
                    'Google Sign-In is restricted to customer accounts only. Administrators must sign in using the admin login page.',
                    403
                );
            }

            // Check account status
            if ($user->status === 'inactive') {
                return $this->handleError(
                    $request,
                    'This account has been deactivated. Please contact an administrator.',
                    403
                );
            }

            // Update avatar if not previously set
            if (empty($user->avatar_url) && !empty($avatar)) {
                $user->avatar_url = $avatar;
                $user->save();
            }
        } else {
            // Case B: Google provider ID does not exist, but matching verified customer email exists
            $user = User::where('email', $email)->first();

            if ($user) {
                // ADMIN PROTECTION: Never link admin accounts to Google
                if ($user->isAdmin() || $user->role !== User::ROLE_CUSTOMER) {
                    return $this->handleError(
                        $request,
                        'Google Sign-In is restricted to customer accounts only. Administrators must sign in using the admin login page.',
                        403
                    );
                }

                // Check account status
                if ($user->status === 'inactive') {
                    return $this->handleError(
                        $request,
                        'This account has been deactivated. Please contact an administrator.',
                        403
                    );
                }

                // Safely link Google identity to existing customer account
                // CRITICAL: Do NOT modify existing password, role, or permissions!
                $user->google_id = $googleId;
                if (empty($user->avatar_url) && !empty($avatar)) {
                    $user->avatar_url = $avatar;
                }
                if (empty($user->email_verified_at)) {
                    $user->email_verified_at = now();
                }
                $user->save();
            } else {
                // Case C: No matching account exists — create a new CUSTOMER account
                try {
                    $user = User::create([
                        'name' => $name,
                        'email' => $email,
                        'google_id' => $googleId,
                        'password' => Hash::make(Str::random(40)),
                        'role' => User::ROLE_CUSTOMER,
                        'status' => 'active',
                        'avatar_url' => $avatar,
                        'email_verified_at' => now(),
                    ]);
                } catch (\Illuminate\Database\QueryException $e) {
                    Log::warning('Duplicate identity detected during Google account registration', [
                        'error' => $e->getMessage(),
                    ]);
                    return $this->handleError($request, 'An account with this email or Google identity already exists.');
                }
            }
        }

        // 5. Authenticate via existing Sanctum token mechanism
        $token = $user->createToken('auth_token')->plainTextToken;

        // Retrieve sanitized intended redirect
        $intended = $this->sanitizeRedirectTarget($request->session()->pull('google_oauth_redirect', '/dashboard'));

        // If client requested JSON response (e.g., API testing or headless client)
        if ($request->wantsJson()) {
            return $this->success([
                'user' => $user,
                'token' => $token,
                'redirect' => $intended,
            ], 'Login successful');
        }

        // Redirect browser to customer frontend auth callback handler
        $frontendUrl = $this->getFrontendBaseUrl();
        $callbackUrl = rtrim($frontendUrl, '/') . '/auth/callback?token=' . urlencode($token) . '&redirect=' . urlencode($intended);

        return redirect()->away($callbackUrl);
    }

    /**
     * Sanitize and validate internal redirect target to prevent open redirect vulnerabilities.
     */
    protected function sanitizeRedirectTarget(?string $target): string
    {
        if (empty($target)) {
            return '/dashboard';
        }

        // Allow relative paths starting with single '/' (reject '//', '/\', and backslashes)
        if (str_starts_with($target, '/') && !str_starts_with($target, '//') && !str_starts_with($target, '/\\') && !str_contains($target, '\\')) {
            $parsed = parse_url($target);
            if (!isset($parsed['host']) && !isset($parsed['scheme'])) {
                return $target;
            }
        }

        return '/dashboard';
    }

    /**
     * Determine customer storefront base URL for browser redirects.
     */
    protected function getFrontendBaseUrl(): string
    {
        $url = config('app.customer_frontend_url')
            ?? env('CUSTOMER_FRONTEND_URL')
            ?? config('app.frontend_url')
            ?? env('FRONTEND_URL')
            ?? 'https://ayaanclothing.com';

        return rtrim($url, '/');
    }

    /**
     * Handle user-facing error response.
     */
    protected function handleError(Request $request, string $message, int $status = 400): RedirectResponse|JsonResponse
    {
        if ($request->wantsJson()) {
            return response()->json([
                'success' => false,
                'message' => $message,
            ], $status);
        }

        $frontendUrl = $this->getFrontendBaseUrl();
        $loginUrl = rtrim($frontendUrl, '/') . '/login?error=' . urlencode($message);

        return redirect()->away($loginUrl);
    }
}
