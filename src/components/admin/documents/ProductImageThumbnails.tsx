"use client";

import React from "react";

export interface ProductImageThumbnailsProps {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  productName?: string;
  className?: string;
}

/**
 * ProductImageThumbnails
 * 
 * Displays all available product images as a compact thumbnail row underneath the main hero image.
 * - Evenly spaced, centered, wrapping to additional rows if needed
 * - Strict aspect ratio preservation without destructive cropping (object-contain)
 * - Highlights the currently selected/active image
 * - Interactive in web view, print-friendly and clean for physical export documents
 */
export default function ProductImageThumbnails({
  images,
  activeIndex,
  onSelect,
  productName = "Product",
  className = "",
}: ProductImageThumbnailsProps) {
  if (!images || images.length <= 1) {
    return null;
  }

  return (
    <div
      className={`mt-3 pt-3 border-t border-border/50 print:border-slate-200 ${className}`}
      id="product-image-thumbnails-container"
    >
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        {images.map((img, idx) => {
          const isSelected = idx === activeIndex;
          return (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => onSelect(idx)}
              className={`relative w-12 sm:w-14 aspect-[3/4] rounded-lg p-1 bg-secondary/25 border transition-all duration-150 cursor-pointer flex items-center justify-center overflow-hidden print:cursor-default ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30 shadow-xs print:ring-0 print:border-slate-800"
                  : "border-border/70 hover:border-foreground/50 print:border-slate-300 opacity-85 hover:opacity-100"
              }`}
              title={`${productName} view ${idx + 1}`}
              aria-label={`View ${productName} image ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="w-full h-full object-contain rounded"
                loading="lazy"
              />
              {isSelected && (
                <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary print:hidden" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
