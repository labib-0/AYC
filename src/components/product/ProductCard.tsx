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

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { openProductModal } = useProductModal();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const [imgError, setImgError] = useState(false);

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

  const coverImage = product.images?.[0] || "/placeholder.jpg";
  const imageAlt = generateProductImageAlt(product, 0);

  return (
    <div className="group relative flex flex-col w-full h-full bg-card rounded-2xl border border-border/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)] hover:shadow-md hover:border-border transition-all duration-300 overflow-hidden font-sans">
      {/* Top Image Container (Flush with upper card boundaries) */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary/50 shrink-0">
        <Link href={`/products/${product.slug}`} className="block w-full h-full">
          {!imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverImage}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-center transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
              <span className="text-muted-foreground/40 text-sm font-medium text-center px-4">{product.name}</span>
            </div>
          )}
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
          brandName={product.brand}
          brandLogo={product.brandLogo}
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
            {(product.designType || "").toUpperCase() === "MASTER COPY" ? "MC" : "ORIGINAL"}
          </ProductBadge>
        </div>

        {/* Quick Add Button */}
        <div className="absolute bottom-0 left-0 w-full p-2.5 sm:p-3 translate-y-5 opacity-0 transition-all duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] z-10 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            className="w-full bg-background/95 text-foreground border border-transparent p-2 text-[13px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 backdrop-blur-md rounded-full hover:bg-foreground hover:text-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer shadow-sm"
            onClick={handleQuickAdd}
          >
            Quick Add
          </button>
        </div>
      </div>

      {/* Card Content Area (Predictable Vertical Alignment & Isolation) */}
      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 bg-card">
        {/* Product Title (Normalized 2-line height at standard 13px body size) */}
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="text-[13px] font-body font-medium text-foreground transition-colors group-hover:text-primary line-clamp-2 min-h-[2.25rem] leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Pricing & Commercial Discovery Block */}
        <div className="mt-2 pt-1 flex flex-col">
          <div className="flex items-baseline gap-1 font-body">
            <span className="text-[17px] sm:text-[18px] font-bold text-foreground tabular-nums leading-tight">
              {formatPrice(product.price)}
            </span>
            <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">
              / pc
            </span>
          </div>
          <p className="text-[13px] font-body text-muted-foreground font-medium mt-0.5">
            MOQ {product.moq || 10} pcs
          </p>
        </div>
      </div>
    </div>
  );
}
