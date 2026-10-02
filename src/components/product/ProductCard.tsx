"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { Product } from "@/types";
import { useProductModal } from "@/lib/ProductModalContext";
import { useWishlist } from "@/lib/WishlistContext";
import { useAuth } from "@/lib/AuthContext";
import ProductBrandLogoOverlay from "@/components/common/ProductBrandLogoOverlay";
import ProductPromotionBadges from "@/components/common/ProductPromotionBadges";
import ProductBadge from "@/components/common/ProductBadge";

import { generateProductImageAlt } from "@/lib/seo";
import { getLowestValidCustomerUnitPrice } from "@/lib/product-pricing";
import ProductImageFrame from "./ProductImageFrame";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const { openProductModal } = useProductModal();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();

  const isWishlisted = isInWishlist(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openProductModal(product);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const rawCover = product.images?.[0];
  const coverImage =
    typeof rawCover === "string"
      ? rawCover
      : (rawCover as { image_url?: string } | undefined)?.image_url || "/placeholder.jpg";
  const imageAlt = generateProductImageAlt(product, 0);

  const effectiveMoq = Math.max(1, product.moq || 10);
  const availableStock = product.availableStock !== undefined ? Number(product.availableStock) : Number(product.stock ?? 0);
  const availableMoqs = product.availableMoqs !== undefined 
    ? Number(product.availableMoqs) 
    : Math.floor(availableStock / effectiveMoq);
  const isOutOfStock = availableMoqs <= 0 || availableStock <= 0;

  // Authoritative lowest valid customer-facing unit price across Full Stock, Bulk, and Standard tiers
  const lowestUnitPrice = getLowestValidCustomerUnitPrice(product);
  const hasValidPrice = lowestUnitPrice !== null && lowestUnitPrice > 0;

  return (
    <div className="group relative flex flex-col w-full h-full bg-card rounded-2xl border border-border/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)] hover:shadow-md hover:border-border transition-all duration-300 overflow-hidden font-sans">
      {/* Top Image Container (Flush with upper card boundaries) — Canonical 3:4 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary/40 dark:bg-white/5 shrink-0">
        <Link href={`/products/${product.slug}`} className="block w-full h-full">
          <ProductImageFrame
            src={coverImage}
            alt={imageAlt}
            referenceSize="listing"
            loading={priority ? "eager" : "lazy"}
            hoverZoom
            fallbackText={product.name}
            className="w-full h-full border-0 bg-transparent dark:bg-transparent"
          />
        </Link>

        {/* Global Normalized Promotional Badges (Top Left) */}
        <ProductPromotionBadges product={product} variant="card" />

        {/* Wishlist Button — only shown to authenticated users */}
        {user && (
          <button
            type="button"
            onClick={handleWishlistToggle}
            className={`absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md cursor-pointer ${
              isWishlisted
                ? "bg-rose-500 text-white shadow-md scale-105 opacity-100"
                : "bg-background/80 text-foreground/80 hover:bg-background hover:text-foreground hover:scale-105 opacity-0 group-hover:opacity-100"
            }`}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={13} className={isWishlisted ? "fill-current" : ""} />
          </button>
        )}

        {/* Actual Brand Logo Overlay (Top Right) */}
        <ProductBrandLogoOverlay
          brandName={typeof product.brand === "string" ? product.brand : (product.brand as any)?.name || "Ayaan"}
          brandLogo={product.brandLogo || (product as any).brand_logo || (product as any).brand_data?.logo_url || (product as any).brand_data?.logo}
          brandData={(product as any).brand_data}
          size="card"
        />

        {/* Subtle Compact Design Type Indicator (Lower image metadata area) */}
        <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
          <ProductBadge
            variant="neutral"
            aria-label={`Design Type: ${
              (product.designType || "").toUpperCase() === "MASTER COPY"
                ? "Master Copy"
                : "Original"
            }`}
          >
            {(product.designType || "").toUpperCase() === "MASTER COPY" ? "MASTER COPY" : "ORIGINAL"}
          </ProductBadge>
        </div>

        {/* Quick Add Button */}
        <div className="absolute bottom-0 left-0 w-full p-2.5 sm:p-3 translate-y-5 opacity-0 transition-all duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] z-10 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            disabled={isOutOfStock}
            className={`w-full p-2 text-[13px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 backdrop-blur-md rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none shadow-sm ${
              isOutOfStock
                ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
                : "bg-background/95 text-foreground border border-transparent hover:bg-foreground hover:text-background cursor-pointer"
            }`}
            onClick={handleQuickAdd}
          >
            {isOutOfStock ? "Out of Stock" : !hasValidPrice ? "Inquire / Quote" : "Quick Add"}
          </button>
        </div>
      </div>

      {/* Card Content Area (Restored Approved Typographic Hierarchy with Compact Vertical Padding) */}
      <div className="px-2.5 sm:px-3 pt-2 pb-2 sm:pt-2.5 sm:pb-2.5 flex flex-col justify-between flex-1 bg-card">
        {/* Product Title (14px Inter font-body font-medium leading-snug line-clamp-2) */}
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="text-[14px] font-body font-medium text-foreground transition-colors group-hover:text-primary line-clamp-2 min-h-[2.4rem] leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Pricing & Commercial Discovery Block (Restored Approved Typographic Scale: 17-18px bold price, 13px / pc, 13px MOQ) */}
        <div className="mt-1.5 flex flex-col">
          <div className="flex items-baseline gap-1 font-body">
            {hasValidPrice ? (
              <>
                <span className="text-[17px] sm:text-[18px] font-bold text-foreground tabular-nums leading-tight">
                  {formatPrice(lowestUnitPrice)}
                </span>
                <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">
                  / pc
                </span>
              </>
            ) : (
              <span className="text-[14px] sm:text-[15px] font-semibold text-muted-foreground leading-tight">
                Price on Request
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <p className="text-[13px] font-body text-muted-foreground font-medium">
              MOQ {effectiveMoq} pcs
            </p>
            {isOutOfStock ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Out of Stock
              </span>
            ) : availableMoqs <= 2 ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Only {availableMoqs} left
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
