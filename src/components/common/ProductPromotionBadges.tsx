"use client";

import React from "react";
import { getNormalizedPromotion } from "@/lib/product-promotions";
import ProductBadge from "@/components/common/ProductBadge";

export interface ProductPromotionBadgesProps {
  product?: any;
  isNew?: boolean;
  isHot?: boolean;
  isPreorder?: boolean;
  isSoldOut?: boolean;
  isFeatured?: boolean; // Maintained for prop compatibility, ignored for visual badge rendering
  size?: "card" | "detail" | "modal";
  variant?: "card" | "detail" | "modal";
  className?: string;
}

/**
 * ProductPromotionBadges
 * 
 * Authoritative Rule:
 * - SOLD OUT: Merchandising badge for sold out items. Takes visual priority.
 * - PRE-ORDER: Merchandising badge for preorder items.
 * - NEW: Product status badge (Active if product is marked new and not expired).
 * - HOT: Promotional status badge (Active if product is marked hot and not expired).
 * - FEATURED: CONTENT PLACEMENT ONLY. Determines inclusion in the Featured Products
 *   landing page section. It is NEVER rendered as a visual badge on product images or cards.
 */
export default function ProductPromotionBadges({
  product,
  isNew: propIsNew,
  isHot: propIsHot,
  isPreorder: propIsPreorder,
  isSoldOut: propIsSoldOut,
  isFeatured: _propIsFeatured,
  size,
  variant,
  className = "",
}: ProductPromotionBadgesProps) {
  const promo = product ? getNormalizedPromotion(product) : { isNew: false, isHot: false, isFeatured: false, isPreorder: false, isSoldOut: false };
  
  const isSoldOut = propIsSoldOut !== undefined ? Boolean(propIsSoldOut) : promo.isSoldOut;
  const isPreorder = propIsPreorder !== undefined ? Boolean(propIsPreorder) : promo.isPreorder;
  const isNew = propIsNew !== undefined ? Boolean(propIsNew) : promo.isNew;
  const isHot = propIsHot !== undefined ? Boolean(propIsHot) : promo.isHot;
  const activeVariant = size || variant || "card";

  // Status-only badges: Render only if SOLD OUT, PRE-ORDER, NEW or HOT is active
  if (!isSoldOut && !isPreorder && !isNew && !isHot) {
    return null;
  }

  if (activeVariant === "detail") {
    return (
      <div
        role="status"
        aria-label="Product promotional status"
        className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex flex-col gap-1.5 z-10 pointer-events-none select-none ${className}`}
      >
        {isSoldOut ? (
          <ProductBadge
            variant="soldout"
            aria-label="Sold out product"
            className="text-[10px] sm:text-[10.5px] px-2 py-0.5 sm:px-2.5 w-fit"
          >
            SOLD OUT
          </ProductBadge>
        ) : isPreorder ? (
          <ProductBadge
            variant="preorder"
            aria-label="Preorder product"
            className="text-[10px] sm:text-[10.5px] px-2 py-0.5 sm:px-2.5 w-fit"
          >
            PRE-ORDER
          </ProductBadge>
        ) : null}
        {!isSoldOut && isNew && (
          <ProductBadge
            variant="neutral"
            aria-label="New product"
            className="text-[10px] sm:text-[10.5px] px-2 py-0.5 sm:px-2.5 w-fit"
          >
            NEW
          </ProductBadge>
        )}
        {!isSoldOut && isHot && (
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
        {isSoldOut ? (
          <ProductBadge
            variant="soldout"
            aria-label="Sold out product"
            className="text-[9.5px] sm:text-[10px] px-2 py-0.5 w-fit"
          >
            SOLD OUT
          </ProductBadge>
        ) : isPreorder ? (
          <ProductBadge
            variant="preorder"
            aria-label="Preorder product"
            className="text-[9.5px] sm:text-[10px] px-2 py-0.5 w-fit"
          >
            PRE-ORDER
          </ProductBadge>
        ) : null}
        {!isSoldOut && isNew && (
          <ProductBadge
            variant="neutral"
            aria-label="New product"
            className="text-[9.5px] sm:text-[10px] px-2 py-0.5 w-fit"
          >
            NEW
          </ProductBadge>
        )}
        {!isSoldOut && isHot && (
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
      {isSoldOut ? (
        <ProductBadge
          variant="soldout"
          aria-label="Sold out product"
          className="w-fit"
        >
          SOLD OUT
        </ProductBadge>
      ) : isPreorder ? (
        <ProductBadge
          variant="preorder"
          aria-label="Preorder product"
          className="w-fit"
        >
          PRE-ORDER
        </ProductBadge>
      ) : null}
      {!isSoldOut && isNew && (
        <ProductBadge
          variant="neutral"
          aria-label="New product"
          className="w-fit"
        >
          NEW
        </ProductBadge>
      )}
      {!isSoldOut && isHot && (
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


