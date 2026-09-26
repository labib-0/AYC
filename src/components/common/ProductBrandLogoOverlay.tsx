"use client";

import React, { useState } from "react";
import { getBrandLogoUrl, BRAND_LOGO_MAP } from "@/lib/brand-logos";
import { BRAND_LOGO_CONTAINER_SURFACE_CLASS } from "@/components/common/ProductBadge";

export { getBrandLogoUrl, BRAND_LOGO_MAP };

export interface ProductBrandLogoOverlayProps {
  brandName?: string;
  brandLogo?: string | null;
  brandData?: { logo_url?: string | null; logo?: string | null } | null;
  size?: "card" | "detail" | "modal" | "thumb";
  className?: string;
}

export default function ProductBrandLogoOverlay({
  brandName,
  brandLogo,
  brandData,
  size = "card",
  className = "",
}: ProductBrandLogoOverlayProps) {
  const [hasError, setHasError] = useState(false);

  const rawLogo = brandLogo || brandData?.logo_url || brandData?.logo || undefined;

  if (!brandName && !rawLogo) {
    return null;
  }

  if (hasError) {
    return null; // Strict invariant: never show letter fallback, initial, or broken icon
  }

  // Resolves identical database-backed logo asset used by Shop By Brand
  const logoUrl = getBrandLogoUrl(brandName, rawLogo) || (rawLogo && !rawLogo.includes("placeholder") ? rawLogo : null);
  if (!logoUrl) {
    return null;
  }

  // Dimension classes based on size variant — Proportional aspect-[1.35/1] matching Shop By Brand tiles
  let containerDimensions = "w-10 sm:w-11 aspect-[1.35/1] rounded-md p-1";

  if (size === "detail") {
    containerDimensions = "w-14 sm:w-16 aspect-[1.35/1] rounded-lg p-1.5 sm:p-2";
  } else if (size === "modal") {
    containerDimensions = "w-12 sm:w-13 aspect-[1.35/1] rounded-lg p-1.5";
  } else if (size === "thumb") {
    containerDimensions = "w-8 aspect-[1.35/1] rounded p-0.5";
  }

  return (
    <div
      style={{ aspectRatio: "1.35 / 1" }}
      className={`absolute top-2.5 right-2.5 z-20 ${containerDimensions} ${BRAND_LOGO_CONTAINER_SURFACE_CLASS} flex items-center justify-center overflow-hidden pointer-events-none transition-transform select-none ${className}`}
      title={brandName || "Brand logo"}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={brandName ? `${brandName} official brand logo` : "Brand logo"}
        className="w-auto h-auto max-h-full max-w-full object-contain pointer-events-none select-none"
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

