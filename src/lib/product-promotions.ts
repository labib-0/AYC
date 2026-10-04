/**
 * Normalized Product Promotion Domain Logic
 * Single Source of Truth for promotional flags across all components.
 */

export interface ProductPromotionState {
  isNew: boolean;
  isHot: boolean;
  isFeatured: boolean;
  isLimitedDeal: boolean;
  isPreorder: boolean;
  isSoldOut: boolean;
  estimatedDeliveryDate: string | null;
  discountPercent: number | null;
  hasPromotions: boolean;
}

export function getNormalizedPromotion(product: any): ProductPromotionState {
  if (!product) {
    return {
      isNew: false,
      isHot: false,
      isFeatured: false,
      isLimitedDeal: false,
      isPreorder: false,
      isSoldOut: false,
      estimatedDeliveryDate: null,
      discountPercent: null,
      hasPromotions: false,
    };
  }

  const now = Date.now();
  const isNewExpired = product.newUntil || product.new_until
    ? new Date(product.newUntil || product.new_until).getTime() <= now
    : false;
  const isHotExpired = product.hotUntil || product.hot_until
    ? new Date(product.hotUntil || product.hot_until).getTime() <= now
    : false;
  const isFeaturedExpired = product.featuredUntil || product.featured_until
    ? new Date(product.featuredUntil || product.featured_until).getTime() <= now
    : false;

  const isNew = Boolean(product.isNew ?? product.is_new ?? false) && !isNewExpired;
  const isHot = Boolean(product.isHot ?? product.is_hot ?? false) && !isHotExpired;
  const isFeatured = Boolean(product.isFeatured ?? product.is_featured ?? product.featured ?? false) && !isFeaturedExpired;
  const isLimitedDeal = Boolean(product.isLimitedTimeOffer ?? product.isLimitedDeal ?? product.is_limited_deal ?? false);
  const isPreorder = Boolean(product.isPreorder ?? product.is_preorder ?? false);
  const isSoldOut = Boolean(product.isSoldOut ?? product.is_sold_out ?? false);
  const estimatedDeliveryDate = product.estimatedDeliveryDate ?? product.estimated_delivery_date ?? null;

  // Real merchandising promotions only (no fake MSRP/RRP derived discounts)
  const discountPercent: number | null = null;

  const hasPromotions = isNew || isHot || isFeatured || isLimitedDeal || isPreorder || isSoldOut;

  return {
    isNew,
    isHot,
    isFeatured,
    isLimitedDeal,
    isPreorder,
    isSoldOut,
    estimatedDeliveryDate,
    discountPercent,
    hasPromotions,
  };
}
