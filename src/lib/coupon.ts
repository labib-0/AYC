/**
 * Canonical Promo Code / Coupon Validation & Calculation Module
 * Ayaan Clothing Frontend-Only E-Commerce Architecture
 *
 * Single Source of Truth for coupon logic, adhering to the project's
 * existing CouponRecord data model in mockStore.
 */

import { CouponRecord } from "@/services/admin/promotion.service";
import { mockStore } from "@/lib/mock-data/mock-store";

export interface CouponValidationSuccess {
  isValid: true;
  coupon: CouponRecord;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  formattedDiscount: string;
  description: string;
}

export interface CouponValidationFailure {
  isValid: false;
  error: string;
  code?: string;
}

export type CouponValidationResult = CouponValidationSuccess | CouponValidationFailure;

/**
 * Validates a promo code string against the active coupon records in mockStore
 * and calculates the applicable discount amount based on merchandise subtotal.
 *
 * Business Rules:
 * 1. Code is trimmed and compared case-insensitively.
 * 2. Inactive coupons are rejected.
 * 3. Expired coupons or coupons whose start date is in the future are rejected.
 * 4. Coupons exceeding usage_limit are rejected.
 * 5. Minimum order spend (min_spend) must be satisfied by the merchandise subtotal.
 * 6. Percentage or Fixed amount discount is calculated.
 * 7. If max_discount is defined on the coupon, discount is capped at max_discount.
 * 8. Discount is strictly capped at subtotal (subtotal cannot become negative).
 */
export function validateCoupon(
  rawCode: string,
  subtotal: number,
  referenceDate: Date = new Date()
): CouponValidationResult {
  const code = (rawCode || "").trim().toUpperCase();

  if (!code) {
    return {
      isValid: false,
      error: "Please enter a promo code.",
    };
  }

  const coupons = mockStore.getCoupons();
  const coupon = coupons.find((c) => (c.code || "").trim().toUpperCase() === code);

  if (!coupon) {
    return {
      isValid: false,
      error: "Invalid promo code.",
      code,
    };
  }

  if (!coupon.is_active) {
    return {
      isValid: false,
      error: "This promo code is currently inactive.",
      code,
    };
  }

  const now = referenceDate.getTime();

  if (coupon.starts_at) {
    const startTime = new Date(coupon.starts_at).getTime();
    if (!isNaN(startTime) && now < startTime) {
      return {
        isValid: false,
        error: "This promo code is not active yet.",
        code,
      };
    }
  }

  if (coupon.expires_at) {
    const expiryTime = new Date(coupon.expires_at).getTime();
    if (!isNaN(expiryTime) && now > expiryTime) {
      return {
        isValid: false,
        error: "Promo code has expired.",
        code,
      };
    }
  }

  if (coupon.usage_limit && (coupon.usage_count || 0) >= coupon.usage_limit) {
    return {
      isValid: false,
      error: "This promo code has reached its usage limit.",
      code,
    };
  }

  if (coupon.min_spend && subtotal < coupon.min_spend) {
    return {
      isValid: false,
      error: `Minimum order amount is $${coupon.min_spend.toFixed(2)}.`,
      code,
    };
  }

  // Calculate discount amount
  let rawDiscount = 0;
  if (coupon.discount_type === "percentage") {
    rawDiscount = (subtotal * (coupon.discount_value || 0)) / 100;
  } else {
    rawDiscount = coupon.discount_value || 0;
  }

  // Apply maximum discount cap if specified on the coupon
  if (coupon.max_discount && coupon.max_discount > 0) {
    rawDiscount = Math.min(rawDiscount, coupon.max_discount);
  }

  // Discount cannot exceed merchandise subtotal and cannot be negative
  const discountAmount = Math.min(subtotal, Math.max(0, Math.round(rawDiscount * 100) / 100));

  const description =
    coupon.discount_type === "percentage"
      ? `${coupon.discount_value}% OFF`
      : `$${coupon.discount_value.toFixed(2)} OFF`;

  return {
    isValid: true,
    coupon,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    discountAmount,
    formattedDiscount: `$${discountAmount.toFixed(2)}`,
    description,
  };
}

/**
 * Increments the coupon usage count in mockStore when an order is placed.
 */
export function recordCouponUsage(codeOrId: string | number): void {
  mockStore.incrementCouponUsage(codeOrId);
}
