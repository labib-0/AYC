"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { getCategoryImageUrl, DEFAULT_CATEGORY_FALLBACK } from "@/lib/category-images";

export interface ProductCategoryTileData {
  id?: string | number;
  name: string;
  slug?: string;
  image?: string | null;
  image_url?: string | null;
  description?: string;
  imageClass?: string;
}

export interface ProductCategoryTileProps {
  category: ProductCategoryTileData;
  href?: string;
  variant?: "primary" | "compact";
  isActive?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
  priority?: boolean;
}

/**
 * Standard Responsive Product Category Grid Container Classes
 *
 * Approved visual formula from Shop By Brand -> All Categories -> Product Categories:
 * Target density: ~10-12 categories per row on desktop screens
 * Breakpoints:
 * - mobile: 2 cols
 * - xs: 3 cols
 * - sm: 4 cols
 * - md: 6 cols
 * - lg: 8 cols
 * - xl: 10 cols
 * - 2xl & wide: 12 cols
 * Gap: gap-2 sm:gap-2.5
 */
export const PRODUCT_CATEGORY_GRID_CLASSES =
  "grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 min-[1800px]:grid-cols-12 gap-2 sm:gap-2.5";

/**
 * ProductCategoryTile
 *
 * Canonical Global Component for Product Category Imagery throughout Ayaan Clothing.
 * Single Source of Truth matching the approved Shop By Brand reference design.
 *
 * Key visual specifications:
 * - Aspect ratio: aspect-[4/3]
 * - Geometry: rounded-lg sm:rounded-xl border
 * - Active state: border-foreground ring-1.5 ring-foreground shadow-xs scale-[1.02] + top-right Check badge
 * - Inactive state: border-border/80 hover:border-foreground/40 shadow-2xs hover:shadow-xs hover:-translate-y-0.5
 * - Image treatment: object-cover with smooth group-hover scale (scale-105)
 * - Overlay: bg-gradient-to-t from-black/85 via-black/25 to-transparent
 * - Label: font-sans font-bold uppercase tracking-tight text-[10.5px] sm:text-[11.5px] md:text-[12px] line-clamp-1
 */
export function ProductCategoryTile({
  category,
  href,
  variant = "compact",
  isActive = false,
  onClick,
  className = "",
}: ProductCategoryTileProps) {
  const [imgSrc, setImgSrc] = useState<string>(() =>
    getCategoryImageUrl(category.slug || category.name, category.image_url || category.image)
  );
  const [hasError, setHasError] = useState(false);

  const cardClasses = `group relative overflow-hidden transition-all duration-200 block w-full text-left cursor-pointer aspect-[4/3] rounded-lg sm:rounded-xl border select-none ${
    isActive
      ? "border-foreground ring-1.5 ring-foreground shadow-xs scale-[1.02]"
      : "border-border/80 hover:border-foreground/40 shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
  } ${className}`;

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(DEFAULT_CATEGORY_FALLBACK);
    }
  };

  const innerContent = (
    <>
      {/* Background Image with Canonical Image Resolution & Error Fallback */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={`Wholesale ${category.name} apparel category`}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
          category.imageClass || "object-center"
        }`}
        loading="lazy"
        onError={handleImageError}
      />

      {/* Subtle Gradient Overlay for Text Legibility */}
      <div
        className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 from-black/85 via-black/25 to-transparent group-hover:from-black/90 ${
          isActive ? "from-black/90 via-black/35" : ""
        }`}
      />

      {/* Active Selection Checkmark Badge */}
      {isActive && (
        <div
          className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-foreground text-background flex items-center justify-center shadow-xs animate-in zoom-in-75"
          aria-hidden="true"
        >
          <Check size={10} strokeWidth={2.5} className="sm:w-2.5 sm:h-2.5" />
        </div>
      )}

      {/* Category Label Content */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-1.5 sm:p-2.5">
        <div className="flex items-center justify-between gap-1">
          <h3
            className="font-sans font-bold uppercase tracking-tight text-white text-[10.5px] sm:text-[11.5px] md:text-[12px] leading-tight line-clamp-1"
            title={category.name}
          >
            {category.name}
          </h3>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cardClasses}
        onClick={onClick}
        title={`Category: ${category.name}`}
        aria-label={`Browse ${category.name} category`}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cardClasses}
      onClick={onClick}
      title={`Category: ${category.name}`}
      aria-label={`Select ${category.name} category`}
      aria-pressed={isActive}
    >
      {innerContent}
    </button>
  );
}

/** Backward compatibility alias */
export { ProductCategoryTile as CategoryCard };
export type { ProductCategoryTileProps as CategoryCardProps };
export default ProductCategoryTile;
