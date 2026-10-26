<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\User\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserController extends ApiController
{
    /**
     * GET /api/v1/users/me
     */
    public function me(Request $request): JsonResponse
    {
        return $this->success($request->user()->load(['addresses', 'orders']), 'User retrieved');
    }

    /**
     * PUT /api/v1/users/me
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        if ($request->filled('password')) {
            $currentPassword = $request->input('current_password');
            if (!$currentPassword || !Hash::check($currentPassword, $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['The provided current password is incorrect.'],
                ]);
            }

            $user->password = Hash::make($request->input('password'));
            unset($validated['current_password'], $validated['password'], $validated['password_confirmation']);
        }

        // Only allow validated fields (excludes role, arbitrary user IDs, etc.)
        $user->update($validated);

        return $this->success($user->fresh(), 'Profile updated successfully');
    }
}
