<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends ApiController
{
    /**
     * POST /api/v1/auth/register
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'company_name' => $validated['company_name'] ?? null,
            'tax_id' => $validated['tax_id'] ?? null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->success([
            'user' => $user,
            'token' => $token,
        ], 'Registration successful', 201);
    }

    /**
     * POST /api/v1/auth/login
     * Public Customer Login Endpoint. Strictly authenticates customer accounts only.
     * Administrative accounts are rejected before token/session creation.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        return $this->authenticate($request, User::ROLE_CUSTOMER);
    }

    /**
     * POST /api/v1/auth/admin/login
     * Dedicated Administrator Login Endpoint. Strictly authenticates administrator accounts only.
     * Customer accounts are rejected before token/session creation.
     */
    public function adminLogin(LoginRequest $request): JsonResponse
    {
        return $this->authenticate($request, User::ROLE_ADMIN);
    }

    /**
     * Core authentication and role-policy enforcement handler.
     *
     * Order of operations (strictly enforces security):
     *   1. Validate credentials against database password hash
     *   2. Check account status (reject deactivated accounts)
     *   3. Authorize account against required context role (reject unauthorized roles)
     *   4. Create Sanctum personal access token ONLY after role policy passes
     *
     * Zero tokens or sessions are created for rejected administrative or unauthorized attempts.
     */
    protected function authenticate(LoginRequest $request, string $requiredRole): JsonResponse
    {
        $validated = $request->validated();

        $user = User::where('email', $validated['email'])->first();

        // 1. Verify user exists and credentials match
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        // 2. Verify account is active
        if ($user->status === 'inactive') {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated. Please contact an administrator.'],
            ]);
        }

        // 3. Strict Role Separation & Authorization Check
        if ($requiredRole === User::ROLE_CUSTOMER) {
            // Reject admin, super admin, or any non-customer account attempting customer login
            if ($user->isAdmin() || ! $user->isCustomer()) {
                throw ValidationException::withMessages([
                    'email' => ['These credentials cannot be used for customer login.'],
                ]);
            }
        } elseif ($requiredRole === User::ROLE_ADMIN) {
            // Reject customer accounts attempting administrator login
            if (! $user->isAdmin()) {
                throw ValidationException::withMessages([
                    'email' => ['These credentials cannot be used for administrator login.'],
                ]);
            }
        }

        // 4. Token creation ONLY occurs after successful credentials, status, and role validation
        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->success([
            'user' => $user,
            'token' => $token,
        ], 'Login successful');
    }

    /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(null, 'Logged out successfully');
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        return $this->success($request->user(), 'User profile retrieved');
    }

    /**
     * POST /api/v1/auth/forgot-password or /api/v1/auth/password/forgot
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return $this->success(null, __($status));
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }

    /**
     * POST /api/v1/auth/reset-password or /api/v1/auth/password/reset
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // Revoke all existing tokens upon password reset
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return $this->success(null, __($status));
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }
}
