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
  const estimatedDeliveryDate = product.estimatedDeliveryDate ?? product.estimated_delivery_date ?? null;

  // Compute discount percentage from various product representations
  let discountPercent: number | null = null;

  if (typeof product.discount === "number" && product.discount > 0) {
    discountPercent = Math.round(product.discount);
  } else if (typeof product.discountPercentage === "number" && product.discountPercentage > 0) {
    discountPercent = Math.round(product.discountPercentage);
  } else if (typeof product.discount_percent === "number" && product.discount_percent > 0) {
    discountPercent = Math.round(product.discount_percent);
  } else {
    // Check oldPrice vs price
    const currentPrice = Number(product.price ?? product.wholesalePrice ?? 0);
    const regularPrice = Number(product.oldPrice ?? product.msrpPrice ?? product.compare_at_price_cents ? product.compare_at_price_cents / 100 : 0);

    if (regularPrice > currentPrice && currentPrice > 0) {
      const calc = Math.round(((regularPrice - currentPrice) / regularPrice) * 100);
      if (calc >= 5) {
        discountPercent = calc;
      }
    }
  }

  const hasPromotions = isNew || isHot || isFeatured || isLimitedDeal || isPreorder || (discountPercent !== null && discountPercent > 0);

  return {
    isNew,
    isHot,
    isFeatured,
    isLimitedDeal,
    isPreorder,
    estimatedDeliveryDate,
    discountPercent,
    hasPromotions,
  };
}
