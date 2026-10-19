<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * Handle an incoming request.
     * Respects EMAIL_VERIFICATION_ENABLED and exempts existing legacy customer accounts.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. If email verification feature is disabled, allow all requests (safe production default)
        if (! config('auth.verification.enabled', false)) {
            return $next($request);
        }

        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // 2. Allow verified accounts and grandfathered legacy customer accounts
        if ($user->isVerifiedOrLegacyExempt()) {
            return $next($request);
        }

        // 3. Unverified new accounts are restricted
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'status' => 'unverified_email',
                'message' => 'Your email address is not verified. Please check your inbox for the verification link.',
                'email' => $user->email,
            ], 403);
        }

        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'https://ayaanclothing.com'));
        return redirect()->away("{$frontendUrl}/auth/verify-email?status=unverified");
    }
}
