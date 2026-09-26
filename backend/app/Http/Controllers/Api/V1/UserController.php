<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\User\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        // Only allow validated fields (excludes role, password, etc.)
        $user->update($request->validated());

        return $this->success($user->fresh(), 'Profile updated successfully');
    }
}
