<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

        // Store sanitized intended destination in session if session store is active
        $target = $request->query('redirect', '/dashboard');
        $safeTarget = $this->sanitizeRedirectTarget($target);
        if ($request->hasSession()) {
            $request->session()->put('google_oauth_redirect', $safeTarget);
        }

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
        $rawRedirect = $request->hasSession() ? $request->session()->pull('google_oauth_redirect', '/dashboard') : '/dashboard';
        $intended = $this->sanitizeRedirectTarget($rawRedirect);

        // If client requested JSON response (e.g., API testing or headless client)
        if ($request->wantsJson()) {
            return $this->success([
                'user' => $user,
                'token' => $token,
                'redirect' => $intended,
            ], 'Login successful');
        }

        // SECURE HANDOFF (No tokens in callback URL):
        // Generate a single-use exchange ticket with a strict 2-minute lifetime
        $ticket = Str::random(64);
        Cache::put("google_auth_ticket:{$ticket}", [
            'token' => $token,
            'user_id' => $user->id,
            'intended' => $intended,
        ], now()->addMinutes(2));

        // Store ticket in session if session store is active
        if ($request->hasSession()) {
            $request->session()->put('google_auth_ticket', $ticket);
        }

        $frontendUrl = $this->getFrontendBaseUrl();
        $isProduction = config('app.env') === 'production' || str_starts_with($frontendUrl, 'https://');

        // In production: NEVER include tokens or tickets in the browser URL.
        // In local/testing development: include ?ticket= for cross-origin local port support.
        if ($isProduction) {
            $callbackUrl = rtrim($frontendUrl, '/') . '/auth/callback?redirect=' . urlencode($intended);
        } else {
            $callbackUrl = rtrim($frontendUrl, '/') . '/auth/callback?ticket=' . urlencode($ticket) . '&redirect=' . urlencode($intended);
        }

        // Attach secure HttpOnly, SameSite=Lax cookie for first-party session handoff
        $cookie = cookie(
            'google_auth_ticket',
            $ticket,
            2,
            '/',
            null,
            $isProduction,
            true,
            false,
            'lax'
        );

        return redirect()->away($callbackUrl)->withCookie($cookie);
    }

    /**
     * Securely exchange a one-time Google OAuth ticket or session cookie for Sanctum token and profile.
     * POST|GET /api/v1/auth/google/exchange
     */
    public function exchange(Request $request): JsonResponse
    {
        // 1. Resolve ticket from HttpOnly cookie, session, or request input
        $sessionTicket = $request->hasSession() ? $request->session()->pull('google_auth_ticket') : null;
        $ticket = $request->cookie('google_auth_ticket')
            ?: $sessionTicket
            ?: $request->input('ticket');

        if (empty($ticket) || !is_string($ticket)) {
            return response()->json([
                'success' => false,
                'message' => 'No active Google authentication session found. Please sign in again.',
            ], 401);
        }

        // 2. Retrieve ticket payload from cache and immediately burn it (single-use)
        $cached = Cache::pull("google_auth_ticket:{$ticket}");
        $forgetCookie = cookie()->forget('google_auth_ticket');

        if (!$cached || empty($cached['token']) || empty($cached['user_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication session expired or already used. Please sign in again.',
            ], 401)->withCookie($forgetCookie);
        }

        $user = User::find($cached['user_id']);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User account not found.',
            ], 404)->withCookie($forgetCookie);
        }

        // Ensure user is still a customer
        if ($user->isAdmin() || $user->role !== User::ROLE_CUSTOMER) {
            return response()->json([
                'success' => false,
                'message' => 'Google Sign-In is restricted to customer accounts only.',
            ], 403)->withCookie($forgetCookie);
        }

        $safeRedirect = $this->sanitizeRedirectTarget($cached['intended'] ?? '/dashboard');

        return response()->json([
            'success' => true,
            'message' => 'Authentication successful.',
            'data' => [
                'token' => $cached['token'],
                'user' => $user,
                'redirect' => $safeRedirect,
            ],
        ])->withCookie($forgetCookie);
    }

    /**
     * Sanitize and validate internal redirect target to prevent open redirect vulnerabilities.
     */
    protected function sanitizeRedirectTarget(?string $target): string
    {
        if (empty($target)) {
            return '/dashboard';
        }

        // Google OAuth is customer-only: never redirect to admin paths!
        if (
            $target === '/admin' || str_starts_with($target, '/admin') ||
            $target === '/ayc' || str_starts_with($target, '/ayc')
        ) {
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
            ?: config('app.frontend_url')
            ?: (config('app.env') === 'production' ? 'https://ayaanclothing.com' : 'http://localhost:3000');

        // Hard Defensive Guard: Production MUST NEVER redirect to localhost or loopback
        if (config('app.env') === 'production' && (str_contains($url, 'localhost') || str_contains($url, '127.0.0.1'))) {
            $url = 'https://ayaanclothing.com';
        }

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
