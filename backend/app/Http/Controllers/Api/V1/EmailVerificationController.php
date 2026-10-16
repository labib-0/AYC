<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends ApiController
{
    /**
     * Mark the authenticated user's email address as verified via signed link.
     *
     * GET /api/v1/auth/email/verify/{id}/{hash}
     */
    public function verify(Request $request, string|int $id, string $hash): JsonResponse|RedirectResponse
    {
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'https://ayaanclothing.com'));

        // 1. Verify signed URL integrity and expiration
        if (! $request->hasValidSignature()) {
            if ($request->wantsJson()) {
                return $this->error('The verification link is invalid or has expired.', 403);
            }
            return redirect()->away("{$frontendUrl}/auth/verify-email?status=invalid_or_expired");
        }

        // 2. Locate user
        $user = User::find($id);
        if (! $user) {
            if ($request->wantsJson()) {
                return $this->error('User not found.', 404);
            }
            return redirect()->away("{$frontendUrl}/auth/verify-email?status=user_not_found");
        }

        // 3. Cryptographically verify that the hash matches the user's current email
        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            if ($request->wantsJson()) {
                return $this->error('The verification link does not match this account.', 403);
            }
            return redirect()->away("{$frontendUrl}/auth/verify-email?status=invalid_hash");
        }

        // 4. Handle already verified state
        if ($user->hasVerifiedEmail()) {
            if ($request->wantsJson()) {
                return $this->success([
                    'already_verified' => true,
                    'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                ], 'Email is already verified.');
            }
            return redirect()->away("{$frontendUrl}/auth/verify-email?status=already_verified");
        }

        // 5. Persist verification and fire Verified event
        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        if ($request->wantsJson()) {
            return $this->success([
                'verified' => true,
                'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            ], 'Email verified successfully.');
        }

        return redirect()->away("{$frontendUrl}/auth/verify-email?status=success");
    }

    /**
     * Resend the email verification notification.
     *
     * POST /api/v1/auth/email/verification-notification
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            $validated = $request->validate([
                'email' => 'required|email',
            ]);
            $user = User::where('email', $validated['email'])->first();
        }

        if ($user) {
            if ($user->hasVerifiedEmail()) {
                return $this->success([
                    'already_verified' => true,
                ], 'Email address is already verified.');
            }

            $user->sendEmailVerificationNotification();
        }

        // Always return success to protect against account enumeration
        return $this->success(null, 'If an account exists with that email address, a verification link has been sent.');
    }

    /**
     * Retrieve current user's email verification status.
     *
     * GET /api/v1/auth/email/verification-status
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->success([
            'is_verified' => $user->hasVerifiedEmail(),
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'email' => $user->email,
        ], 'Verification status retrieved.');
    }
}
