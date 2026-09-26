"use client";

import React, { useState } from "react";
import { Package } from "lucide-react";

export type ProductImageReferenceSize =
  | "listing"   // 750 × 1000 px reference (3:4)
  | "detail"    // 1200 × 1600 px reference (3:4)
  | "thumbnail" // 300 × 400 px reference (3:4)
  | "compact"   // 150 × 200 px reference (3:4)
  | "custom";

export interface ProductImageFrameProps {
  src?: string | null;
  alt: string;
  referenceSize?: ProductImageReferenceSize;
  className?: string;
  imageClassName?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  draggable?: boolean;
  hoverZoom?: boolean;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

/**
 * ProductImageFrame
 *
 * Canonical shared product image presentation component across Ayaan Clothing.
 *
 * NON-NEGOTIABLE CORE SPECIFICATIONS:
 * 1. Ratio: Canonical 3:4 (aspect-ratio: 3 / 4) across all screen sizes and layouts.
 * 2. Non-Destructive Fit: Always uses `object-fit: contain` so the full source
 *    image remains uncropped, centered, and intact regardless of original upload ratio.
 * 3. Stable Geometry: Retains exact 3:4 bounding box during loading, loaded, and error states.
 * 4. Surface Treatment: Neutral, theme-aware surface backdrop (bg-secondary / dark:bg-white/5).
 */
export default function ProductImageFrame({
  src,
  alt,
  referenceSize = "listing",
  className = "",
  imageClassName = "",
  loading = "lazy",
  decoding = "async",
  draggable = false,
  hoverZoom = false,
  fallbackText,
  fallbackIcon,
  children,
  onClick,
  style,
}: ProductImageFrameProps) {
  const [hasError, setHasError] = useState(false);

  const cleanSrc = src && typeof src === "string" && src.trim() !== "" ? src.trim() : null;
  const isBroken = hasError || !cleanSrc;

  return (
    <div
      style={{ aspectRatio: "3 / 4", ...style }}
      className={`relative aspect-[3/4] overflow-hidden flex items-center justify-center bg-secondary/40 dark:bg-white/5 select-none ${className}`}
      data-reference-size={referenceSize}
      data-aspect-ratio="3:4"
      onClick={onClick}
    >
      {!isBroken ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={cleanSrc}
          alt={alt}
          loading={loading}
          decoding={decoding}
          draggable={draggable}
          onError={() => setHasError(true)}
          className={`w-full h-full object-contain object-center transition-transform duration-300 ease-out pointer-events-none ${
            hoverZoom ? "group-hover:scale-105" : ""
          } ${imageClassName}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-secondary/60 dark:bg-white/[0.04]">
          {fallbackIcon || (
            <Package
              size={referenceSize === "thumbnail" || referenceSize === "compact" ? 18 : 28}
              className="text-muted-foreground/40 shrink-0 mb-1"
            />
          )}
          {fallbackText && (
            <span className="text-[11px] font-medium text-muted-foreground/60 line-clamp-2 px-2">
              {fallbackText}
            </span>
          )}
        </div>
      )}

      {/* Overlays / Badges / Actions slot */}
      {children}
    </div>
  );
}
