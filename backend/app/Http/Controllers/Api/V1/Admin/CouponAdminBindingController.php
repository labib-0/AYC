<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Admin\BindCouponAdminRequest;
use App\Services\Coupon\CouponAdminBindingService;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponAdminBindingController extends ApiController
{
    public function __construct(
        private readonly CouponAdminBindingService $bindingService,
        private readonly AdminAuthorizationService $authorization
    ) {}

    /**
     * GET /api/v1/admin/coupon-bindings
     * List all coupon bindings. Requires Super Admin or coupon.view permission.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && !$this->authorization->can($user, 'coupon.view')) {
            return $this->forbidden("Forbidden: you do not have permission to view coupon bindings.");
        }

        $bindings = $this->bindingService->listBindings(
            search: $request->input('search'),
            adminId: $request->filled('admin_id') ? (int) $request->input('admin_id') : null,
            couponId: $request->filled('coupon_id') ? (int) $request->input('coupon_id') : null
        );

        return $this->success($bindings, 'Coupon bindings retrieved successfully');
    }

    /**
     * GET /api/v1/admin/coupon-bindings/my-bindings
     * Retrieve the bound coupons assigned to the currently authenticated administrator.
     */
    public function myBindings(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return $this->forbidden("Forbidden: only administrators have coupon bindings.");
        }

        $bindings = $this->bindingService->listBindings(
            adminId: $user->id
        );

        return $this->success($bindings, 'Your bound coupons retrieved successfully');
    }

    /**
     * POST /api/v1/admin/coupon-bindings
     * Bind an administrator to a coupon. Requires Super Admin or coupon.edit permission.
     */
    public function store(BindCouponAdminRequest $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && !$this->authorization->can($user, 'coupon.edit')) {
            return $this->forbidden("Forbidden: you do not have permission to bind coupons to administrators.");
        }

        $binding = $this->bindingService->bind(
            couponId: (int) $request->input('coupon_id'),
            adminUserId: (int) $request->input('admin_user_id'),
            actor: $user
        );

        return $this->success($binding, 'Coupon successfully bound to administrator', 201);
    }

    /**
     * DELETE /api/v1/admin/coupon-bindings/{id}
     * Unbind an administrator from a coupon. Requires Super Admin or coupon.edit permission.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && !$this->authorization->can($user, 'coupon.edit')) {
            return $this->forbidden("Forbidden: you do not have permission to unbind coupons.");
        }

        $this->bindingService->unbind($id, $user);

        return $this->success(null, 'Coupon binding removed successfully');
    }
}
