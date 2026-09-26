<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends ApiController
{
    /**
     * POST /api/v1/coupons/validate or POST /api/v1/promotions/validate
     *
     * Validates a coupon/promo code against active coupon records
     * and calculates the authoritative discount amount.
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'subtotal' => ['required', 'numeric', 'min:0'],
        ]);

        $code = strtoupper(trim($validated['code']));
        $subtotal = (float) $validated['subtotal'];

        $coupon = Coupon::where('code', $code)->first();

        if (!$coupon) {
            return $this->error('Invalid promo code.', 422, ['code' => $code]);
        }

        if (!$coupon->is_active) {
            return $this->error('This promo code is currently inactive.', 422, ['code' => $code]);
        }

        if ($coupon->starts_at && now()->lt($coupon->starts_at)) {
            return $this->error('This promo code is not active yet.', 422, ['code' => $code]);
        }

        if ($coupon->expires_at && now()->gt($coupon->expires_at)) {
            return $this->error('Promo code has expired.', 422, ['code' => $code]);
        }

        if ($coupon->usage_limit && $coupon->usage_count >= $coupon->usage_limit) {
            return $this->error('This promo code has reached its usage limit.', 422, ['code' => $code]);
        }

        $minSpend = (float) ($coupon->min_spend ?? 0);
        if ($minSpend > 0 && $subtotal < $minSpend) {
            return $this->error("Minimum order of \${$minSpend} is required for this promo code.", 422, ['code' => $code]);
        }

        // Calculate discount safely
        $discountAmount = 0.0;
        if ($coupon->discount_type === 'percentage') {
            $discountAmount = round(($subtotal * (float) $coupon->discount_value) / 100, 2);
        } else {
            // fixed or flat
            $discountAmount = min($subtotal, (float) $coupon->discount_value);
        }

        // Apply optional max_discount cap
        if ($coupon->max_discount && (float) $coupon->max_discount > 0) {
            $discountAmount = min($discountAmount, (float) $coupon->max_discount);
        }

        // Strictly capped at subtotal and non-negative
        $discountAmount = min($subtotal, max(0.0, round($discountAmount, 2)));

        $discountLabel = $coupon->discount_type === 'percentage'
            ? "Discount ({$coupon->discount_value}%)"
            : "Discount (\${$coupon->discount_value})";

        $description = $coupon->discount_type === 'percentage'
            ? "{$coupon->discount_value}% OFF"
            : "\${$coupon->discount_value} OFF";

        return $this->success([
            'isValid' => true,
            'code' => $coupon->code,
            'discountType' => $coupon->discount_type === 'percentage' ? 'percentage' : 'flat',
            'discount_type' => $coupon->discount_type,
            'discountValue' => (float) $coupon->discount_value,
            'discount_value' => (float) $coupon->discount_value,
            'discountAmount' => $discountAmount,
            'discount_amount' => $discountAmount,
            'formattedDiscount' => '$' . number_format($discountAmount, 2, '.', ''),
            'discountLabel' => $discountLabel,
            'description' => $description,
            'min_spend' => $minSpend,
            'max_discount' => $coupon->max_discount ? (float) $coupon->max_discount : null,
        ], 'Promo code applied successfully');
    }
}
