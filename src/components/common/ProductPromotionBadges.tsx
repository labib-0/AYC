"use client";

import React from "react";
import { getNormalizedPromotion } from "@/lib/product-promotions";
import ProductBadge from "@/components/common/ProductBadge";

export interface ProductPromotionBadgesProps {
  product?: any;
  isNew?: boolean;
  isHot?: boolean;
  size?: "card" | "detail" | "modal";
  variant?: "card" | "detail" | "modal";
  className?: string;
}

export default function ProductPromotionBadges({
  product,
  isNew: propIsNew,
  isHot: propIsHot,
  size,
  variant,
  className = "",
}: ProductPromotionBadgesProps) {
  const promo = product ? getNormalizedPromotion(product) : { isNew: false, isHot: false };
  
  const isNew = propIsNew !== undefined ? Boolean(propIsNew) : promo.isNew;
  const isHot = propIsHot !== undefined ? Boolean(propIsHot) : promo.isHot;
  const activeVariant = size || variant || "card";

  // Status-only badges: Render only if NEW or HOT is active
  if (!isNew && !isHot) {
    return null;
  }

  if (activeVariant === "detail") {
    return (
      <div
        role="status"
        aria-label="Product promotional status"
        className={`absolute top-3.5 left-3.5 sm:top-4 sm:left-4 flex flex-col gap-1.5 z-10 pointer-events-none select-none ${className}`}
      >
        {isNew && (
          <ProductBadge
            variant="neutral"
            aria-label="New product"
            className="text-[10px] sm:text-[10.5px] px-2 py-0.5 sm:px-2.5 w-fit"
          >
            NEW
          </ProductBadge>
        )}
        {isHot && (
          <ProductBadge
            variant="hot"
            aria-label="Hot product"
            className="text-[10px] sm:text-[10.5px] px-2 py-0.5 sm:px-2.5 w-fit"
          >
            HOT
          </ProductBadge>
        )}
      </div>
    );
  }

  if (activeVariant === "modal") {
    return (
      <div
        role="status"
        aria-label="Product promotional status"
        className={`absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none select-none ${className}`}
      >
        {isNew && (
          <ProductBadge
            variant="neutral"
            aria-label="New product"
            className="text-[9.5px] sm:text-[10px] px-2 py-0.5 w-fit"
          >
            NEW
          </ProductBadge>
        )}
        {isHot && (
          <ProductBadge
            variant="hot"
            aria-label="Hot product"
            className="text-[9.5px] sm:text-[10px] px-2 py-0.5 w-fit"
          >
            HOT
          </ProductBadge>
        )}
      </div>
    );
  }

  // Default "card" variant (Compact product cards across all customer-facing surfaces)
  return (
    <div
      role="status"
      aria-label="Product promotional status"
      className={`absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none select-none ${className}`}
    >
      {isNew && (
        <ProductBadge
          variant="neutral"
          aria-label="New product"
          className="w-fit"
        >
          NEW
        </ProductBadge>
      )}
      {isHot && (
        <ProductBadge
          variant="hot"
          aria-label="Hot product"
          className="w-fit"
        >
          HOT
        </ProductBadge>
      )}
    </div>
  );
}

export { ProductPromotionBadges as PromotionBadges };


