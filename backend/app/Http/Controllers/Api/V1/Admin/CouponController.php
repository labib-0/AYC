<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\Coupon;
use App\Services\Audit\ActivityLogger;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization
    ) {}

    /**
     * GET /api/v1/admin/coupons
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'coupon.view')) {
            return $this->forbidden("Forbidden: you do not have the 'coupon.view' permission.");
        }

        $query = Coupon::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('code', 'ilike', "%{$search}%");
        }

        if ($request->filled('status')) {
            if ($request->input('status') === 'active') {
                $query->where('is_active', true);
            } elseif ($request->input('status') === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $coupons = $query->orderBy('created_at', 'desc')->get();

        return $this->success($coupons, 'Coupons retrieved');
    }

    /**
     * POST /api/v1/admin/coupons
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'coupon.create')) {
            return $this->forbidden("Forbidden: you do not have the 'coupon.create' permission.");
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:coupons,code'],
            'discount_type' => ['required', 'string', 'in:percentage,flat,fixed,fixed_amount'],
            'discount_value' => ['required', 'numeric', 'min:0'],
            'min_spend' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));

        // Canonical discount types: percentage or flat
        if (in_array($validated['discount_type'], ['fixed', 'fixed_amount', 'flat'], true)) {
            $validated['discount_type'] = 'flat';
            $validated['max_discount'] = null; // Cap only applies to percentage
        }

        $coupon = Coupon::create($validated);

        \App\Services\Cache\CouponSalesCacheService::invalidateGlobal();

        ActivityLogger::log('coupon.created', $coupon, [
            'code' => $coupon->code,
            'discount_type' => $coupon->discount_type,
            'discount_value' => $coupon->discount_value,
        ], $user);

        return $this->success($coupon, 'Coupon created successfully', 201);
    }

    /**
     * GET /api/v1/admin/coupons/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'coupon.view')) {
            return $this->forbidden("Forbidden: you do not have the 'coupon.view' permission.");
        }

        $coupon = Coupon::findOrFail($id);
        return $this->success($coupon, 'Coupon retrieved');
    }

    /**
     * PUT /api/v1/admin/coupons/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'coupon.edit')) {
            return $this->forbidden("Forbidden: you do not have the 'coupon.edit' permission.");
        }

        $coupon = Coupon::findOrFail($id);

        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'max:50', 'unique:coupons,code,' . $id],
            'discount_type' => ['sometimes', 'string', 'in:percentage,flat,fixed,fixed_amount'],
            'discount_value' => ['sometimes', 'numeric', 'min:0'],
            'min_spend' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        // Canonical discount types: percentage or flat
        if (isset($validated['discount_type']) && in_array($validated['discount_type'], ['fixed', 'fixed_amount', 'flat'], true)) {
            $validated['discount_type'] = 'flat';
            $validated['max_discount'] = null; // Cap only applies to percentage
        }

        if (array_key_exists('is_active', $validated) && $validated['is_active'] !== $coupon->is_active) {
            if ($validated['is_active'] && !$this->authorization->can($user, 'coupon.activate')) {
                return $this->forbidden("Forbidden: you do not have the 'coupon.activate' permission to activate coupons.");
            }
            if (!$validated['is_active'] && !$this->authorization->can($user, 'coupon.deactivate')) {
                return $this->forbidden("Forbidden: you do not have the 'coupon.deactivate' permission to deactivate coupons.");
            }
        }

        $coupon->update($validated);

        \App\Services\Cache\CouponSalesCacheService::invalidateGlobal();

        ActivityLogger::log('coupon.updated', $coupon, [
            'code' => $coupon->code,
            'updated_fields' => array_keys($validated),
        ], $user);

        return $this->success($coupon, 'Coupon updated successfully');
    }

    /**
     * DELETE /api/v1/admin/coupons/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'coupon.delete')) {
            return $this->forbidden("Forbidden: you do not have the 'coupon.delete' permission.");
        }

        $coupon = Coupon::findOrFail($id);

        ActivityLogger::log('coupon.deleted', $coupon, [
            'code' => $coupon->code,
        ], $user);

        $coupon->delete();

        \App\Services\Cache\CouponSalesCacheService::invalidateGlobal();

        return $this->success(null, 'Coupon deleted successfully');
    }
}
