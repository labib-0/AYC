<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\User;
use App\Services\Auth\EmailVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends ApiController
{
    public function __construct(
        protected EmailVerificationService $verificationService
    ) {}

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

        // 2. Delegate to EmailVerificationService
        $rawToken = $request->query('token') ?? $request->input('token');
        $result = $this->verificationService->verify($request, $id, $rawToken);

        $status = $result['status'] ?? 'invalid_or_expired';

        if ($status === 'user_not_found') {
            if ($request->wantsJson()) {
                return $this->error($result['message'], 404);
            }
            return redirect()->away("{$frontendUrl}/auth/verify-email?status=user_not_found");
        }

        if ($status === 'already_verified') {
            $user = $result['user'] ?? User::find($id);
            if ($request->wantsJson()) {
                $response = $this->success([
                    'already_verified' => true,
                    'email_verified_at' => $user?->email_verified_at?->toIso8601String(),
                ], $result['message']);
                if (! empty($result['clear_cookie'])) {
                    $response->withCookie($this->verificationService->clearBindingCookie());
                }
                return $response;
            }
            return redirect()->away("{$frontendUrl}/auth/verify-email?status=already_verified")
                ->withCookie($this->verificationService->clearBindingCookie());
        }

        if ($status === 'different_browser') {
            $user = $result['user'] ?? User::find($id);
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'status' => 'different_browser',
                    'message' => $result['message'],
                    'requires_password' => true,
                    'email' => $user?->email,
                    'user_id' => $user?->id,
                ], 403);
            }
            $emailParam = urlencode($user?->email ?? '');
            return redirect()->away("{$frontendUrl}/auth/verify-email?status=different_browser&id={$id}&email={$emailParam}");
        }

        if ($status === 'invalid_or_expired') {
            if ($request->wantsJson()) {
                return $this->error($result['message'], 403);
            }
            return redirect()->away("{$frontendUrl}/auth/verify-email?status=invalid_or_expired");
        }

        // Success state
        $user = $result['user'] ?? User::find($id);
        if ($request->wantsJson()) {
            $response = $this->success([
                'verified' => true,
                'email_verified_at' => $user?->email_verified_at?->toIso8601String(),
            ], $result['message']);
            if (! empty($result['clear_cookie'])) {
                $response->withCookie($this->verificationService->clearBindingCookie());
            }
            return $response;
        }

        return redirect()->away("{$frontendUrl}/auth/verify-email?status=success")
            ->withCookie($this->verificationService->clearBindingCookie());
    }

    /**
     * Cross-browser recovery: verify on a new device/browser with password.
     *
     * POST /api/v1/auth/email/verify-with-credentials
     */
    public function verifyWithCredentials(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => ['required'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $result = $this->verificationService->verifyWithCredentials(
            $request,
            $validated['id'],
            $validated['token'],
            $validated['password']
        );

        if ($result['status'] === 'invalid_credentials') {
            return $this->error($result['message'], 422);
        }

        if ($result['status'] === 'invalid_or_expired' || $result['status'] === 'user_not_found') {
            return $this->error($result['message'], 403);
        }

        $user = $result['user'] ?? User::find($validated['id']);

        return $this->success([
            'verified' => true,
            'email_verified_at' => $user?->email_verified_at?->toIso8601String(),
        ], $result['message']);
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

        $bindingCookie = null;

        if ($user) {
            if ($user->hasVerifiedEmail()) {
                return $this->success([
                    'already_verified' => true,
                ], 'Email address is already verified.');
            }

            if ($this->verificationService->isEnabled()) {
                $challenge = $this->verificationService->sendVerificationNotification(
                    $user,
                    $request->cookie($this->verificationService->getCookieName())
                );
                $bindingCookie = $challenge['cookie'] ?? null;
            } else {
                $user->sendEmailVerificationNotification();
            }
        }

        // Always return success to protect against account enumeration
        $response = $this->success(null, 'If an account exists with that email address, a verification link has been sent.');
        if ($bindingCookie) {
            $response->withCookie($bindingCookie);
        }

        return $response;
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
            'is_exempt' => $user->isVerifiedOrLegacyExempt(),
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'email' => $user->email,
        ], 'Verification status retrieved.');
    }
}
