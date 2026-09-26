<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends ApiController
{
    /**
     * GET /api/v1/admin/coupons
     */
    public function index(Request $request): JsonResponse
    {
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
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:coupons,code'],
            'discount_type' => ['required', 'string', 'in:percentage,fixed'],
            'discount_value' => ['required', 'numeric', 'min:0'],
            'min_spend' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $coupon = Coupon::create($validated);

        return $this->success($coupon, 'Coupon created successfully', 201);
    }

    /**
     * GET /api/v1/admin/coupons/{id}
     */
    public function show(int $id): JsonResponse
    {
        $coupon = Coupon::findOrFail($id);
        return $this->success($coupon, 'Coupon retrieved');
    }

    /**
     * PUT /api/v1/admin/coupons/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $coupon = Coupon::findOrFail($id);

        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'max:50', 'unique:coupons,code,' . $id],
            'discount_type' => ['sometimes', 'string', 'in:percentage,fixed'],
            'discount_value' => ['sometimes', 'numeric', 'min:0'],
            'min_spend' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $coupon->update($validated);

        return $this->success($coupon, 'Coupon updated successfully');
    }

    /**
     * DELETE /api/v1/admin/coupons/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->delete();

        return $this->success(null, 'Coupon deleted successfully');
    }
}
