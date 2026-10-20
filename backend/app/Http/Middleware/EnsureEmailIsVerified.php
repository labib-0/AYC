<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * Handle an incoming request.
     * Enforces that customer accounts must have verified their email address.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Strict verification requirement: customer accounts must have verified email
        if (! $user->hasVerifiedEmail()) {
            if ($request->expectsJson() || $request->is('api/*') || $request->is('ayc/api/*')) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'EMAIL_VERIFICATION_REQUIRED',
                    'message' => 'Email verification is required before placing an order. Please verify your email address through the link sent to your inbox, or request a new verification link.',
                    'email' => $user->email,
                ], 403);
            }

            $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'https://ayaanclothing.com'));
            return redirect()->away("{$frontendUrl}/auth/verify-email?status=unverified");
        }

        return $next($request);
    }
}
