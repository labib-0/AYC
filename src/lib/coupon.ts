/**
 * Canonical Promo Code / Coupon Validation & Calculation Module
 * Ayaan Clothing Frontend-Only E-Commerce Architecture
 *
 * Single Source of Truth for coupon logic, adhering to the project's
 * existing CouponRecord data model in mockStore.
 */

import { CouponRecord, PromoDiscountType } from "@/services/admin/promotion.service";
import { mockStore } from "@/lib/mock-data/mock-store";

export interface CouponValidationSuccess {
  isValid: true;
  coupon: CouponRecord;
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  discountAmount: number;
  formattedDiscount: string;
  discountLabel: string;
  description: string;
}

export interface CouponValidationFailure {
  isValid: false;
  error: string;
  code?: string;
}

export type CouponValidationResult = CouponValidationSuccess | CouponValidationFailure;

/**
 * Calculates promo discount amount given a discount type, value, and eligible merchandise subtotal.
 *
 * Rules:
 * - Percentage: eligibleSubtotal * (discountValue / 100), capped at eligibleSubtotal.
 * - Flat: Math.min(discountValue, eligibleSubtotal), capped at eligibleSubtotal.
 * - Never returns a negative discount or an amount exceeding eligibleSubtotal.
 */
export function calculatePromoDiscount(
  discountType: PromoDiscountType | "fixed",
  discountValue: number,
  subtotal: number,
  maxDiscount?: number
): number {
  if (subtotal <= 0 || discountValue <= 0) return 0;

  let rawDiscount = 0;
  if (discountType === "percentage") {
    rawDiscount = (subtotal * discountValue) / 100;
  } else {
    // "flat" (or legacy "fixed")
    rawDiscount = Math.min(discountValue, subtotal);
  }

  // Apply optional max_discount cap if present
  if (maxDiscount && maxDiscount > 0) {
    rawDiscount = Math.min(rawDiscount, maxDiscount);
  }

  // Cap at merchandise subtotal and round to 2 decimal places
  const finalDiscount = Math.min(subtotal, Math.max(0, Math.round(rawDiscount * 100) / 100));
  return finalDiscount;
}

/**
 * Validates a promo code string against the active coupon records in mockStore
 * and calculates the applicable discount amount based on merchandise subtotal.
 *
 * Business Rules:
 * 1. Code is trimmed and compared case-insensitively.
 * 2. Inactive coupons are rejected.
 * 3. Expired coupons or coupons whose start date is in the future are rejected.
 * 4. Coupons exceeding usage_limit are rejected.
 * 5. Minimum order spend (min_spend) must be satisfied by the merchandise subtotal (subtotal >= min_spend).
 * 6. Supports strictly TWO discount types: "percentage" and "flat".
 * 7. Discount is strictly capped at eligible subtotal (subtotal cannot become negative).
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

  // Minimum order rule: subtotal >= min_spend
  const requiredMinSpend = Number(coupon.min_spend) || 0;
  if (requiredMinSpend > 0 && subtotal < requiredMinSpend) {
    return {
      isValid: false,
      error: `Minimum order of $${requiredMinSpend} is required for this promo code.`,
      code,
    };
  }

  // Normalize discount type to canonical "percentage" | "flat"
  const canonicalType: PromoDiscountType =
    coupon.discount_type === "percentage" ? "percentage" : "flat";

  // Calculate discount using central calculation function
  const discountAmount = calculatePromoDiscount(
    canonicalType,
    coupon.discount_value,
    subtotal,
    coupon.max_discount
  );

  const discountLabel =
    canonicalType === "percentage"
      ? `Discount (${coupon.discount_value}%)`
      : `Discount ($${coupon.discount_value})`;

  const description =
    canonicalType === "percentage"
      ? `${coupon.discount_value}% OFF`
      : `$${coupon.discount_value} OFF`;

  return {
    isValid: true,
    coupon,
    code: coupon.code,
    discountType: canonicalType,
    discountValue: coupon.discount_value,
    discountAmount,
    formattedDiscount: `$${discountAmount.toFixed(2)}`,
    discountLabel,
    description,
  };
}

/**
 * Alias for validateCoupon to support both naming conventions.
 */
export const validatePromoCode = validateCoupon;

/**
 * Increments the coupon usage count in mockStore when an order is placed.
 */
export function recordCouponUsage(codeOrId: string | number): void {
  mockStore.incrementCouponUsage(codeOrId);
}

