"use client";

import React from "react";

export interface ProductHeroImageProps {
  imageUrl: string;
  productName?: string;
  className?: string;
}

/**
 * ProductHeroImage
 * 
 * Displays the large primary product image for commercial documents (Offer Sheet / Order Sheet).
 * - Centered and prominent
 * - Aspect ratio strictly preserved without destructive cropping (object-contain)
 * - Clean document-friendly framing with subtle borders and neutral background
 * - Print-safe layout with constrained height for A4 export specifications
 */
export default function ProductHeroImage({
  imageUrl,
  productName = "Product View",
  className = "",
}: ProductHeroImageProps) {
  if (!imageUrl) return null;

  return (
    <div
      className={`w-full flex items-center justify-center bg-secondary/15 rounded-xl border border-border/50 p-3 min-h-[220px] max-h-[340px] sm:max-h-[380px] print:max-h-[260px] print:min-h-[180px] print:bg-slate-50 print:border-slate-200 overflow-hidden ${className}`}
      id="product-hero-image-frame"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`${productName} - Primary View`}
        className="max-h-[320px] sm:max-h-[350px] print:max-h-[240px] w-auto max-w-full object-contain rounded-lg shadow-sm print:shadow-none transition-all duration-200"
        loading="eager"
      />
    </div>
  );
}
