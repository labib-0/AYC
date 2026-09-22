"use client";

import React, { useState } from "react";
import { getBrandLogoUrl, BRAND_LOGO_MAP } from "@/lib/brand-logos";
import { BRAND_LOGO_CONTAINER_SURFACE_CLASS } from "@/components/common/ProductBadge";

export { getBrandLogoUrl, BRAND_LOGO_MAP };

export interface ProductBrandLogoOverlayProps {
  brandName?: string;
  brandLogo?: string;
  size?: "card" | "detail" | "modal" | "thumb";
  className?: string;
}

export default function ProductBrandLogoOverlay({
  brandName,
  brandLogo,
  size = "card",
  className = "",
}: ProductBrandLogoOverlayProps) {
  const [hasError, setHasError] = useState(false);

  if (!brandName && !brandLogo) {
    return null;
  }

  if (hasError) {
    return null; // Strict invariant: never show letter fallback, initial, or broken icon
  }

  const logoUrl = getBrandLogoUrl(brandName, brandLogo);
  if (!logoUrl) {
    return null;
  }

  // Dimension classes based on size variant — Compact, balanced 1:1 TRUE SQUARE containers
  let containerDimensions = "w-7.5 h-7.5 sm:w-8 sm:h-8 rounded p-1";
  let imageDimensions = "max-w-[85%] max-h-[85%]";

  if (size === "detail") {
    containerDimensions = "w-11 h-11 sm:w-12 sm:h-12 rounded p-1.5 sm:p-2";
    imageDimensions = "max-w-[85%] max-h-[85%]";
  } else if (size === "modal") {
    containerDimensions = "w-9 h-9 sm:w-10 sm:h-10 rounded p-1.5";
    imageDimensions = "max-w-[85%] max-h-[85%]";
  } else if (size === "thumb") {
    containerDimensions = "w-6 h-6 rounded p-0.5";
    imageDimensions = "max-w-[85%] max-h-[85%]";
  }

  return (
    <div
      style={{ aspectRatio: "1 / 1" }}
      className={`absolute top-2.5 right-2.5 z-20 aspect-square ${containerDimensions} ${BRAND_LOGO_CONTAINER_SURFACE_CLASS} flex items-center justify-center overflow-hidden pointer-events-none transition-transform select-none ${className}`}
      title={brandName || "Brand logo"}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={brandName ? `${brandName} logo` : "Brand logo"}
        className={`w-auto h-auto ${imageDimensions} object-contain`}
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

