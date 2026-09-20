"use client";

import React, { useState } from "react";

export interface CommercialProductGalleryProps {
  images?: string[];
  primaryImageUrl?: string;
  productName?: string;
  className?: string;
}

/**
 * Commercial Document Product Gallery Component
 * 
 * Specifically designed for Commercial Offer Sheets & Order Sheets.
 * Features:
 * - One prominent large main product image (centered, aspect-ratio preserved, non-destructive)
 * - Row of small thumbnails underneath showing all available product images
 * - Professional export-document framing (clean borders, no marketing badges, no add-to-cart)
 * - Print-safe (A4-friendly sizing, page-break avoidance)
 */
export default function CommercialProductGallery({
  images = [],
  primaryImageUrl,
  productName = "Export Garment Item",
  className = "",
}: CommercialProductGalleryProps) {
  // Normalize images list
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (primaryImageUrl && !images.includes(primaryImageUrl)) {
      list.push(primaryImageUrl);
    }
    images.forEach((img) => {
      if (img && !list.includes(img)) {
        list.push(img);
      }
    });
    return list;
  }, [images, primaryImageUrl]);

  const [activeIndex, setActiveIndex] = useState(0);

  if (allImages.length === 0) {
    return null;
  }

  const activeImage = allImages[activeIndex] || allImages[0];

  return (
    <div
      className={`rounded-2xl border border-border/70 bg-card p-4 sm:p-5 text-foreground shadow-sm print:shadow-none print:bg-white print:border-slate-300 print:p-3 print:break-inside-avoid ${className}`}
      id="commercial-product-gallery"
    >
      {/* Gallery Section Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3 print:border-slate-300">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono print:text-slate-600">
          Product Visual Gallery &amp; Style Samples
        </span>
        <span className="text-[10px] font-medium text-muted-foreground print:text-slate-500">
          {allImages.length} {allImages.length === 1 ? "Image" : "Images"} Available
        </span>
      </div>

      {/* Large Main Product Image Frame */}
      <div className="w-full flex items-center justify-center bg-secondary/15 rounded-xl border border-border/50 p-3 min-h-[220px] max-h-[340px] sm:max-h-[380px] print:max-h-[260px] print:min-h-[180px] print:bg-slate-50 print:border-slate-200">
        <img
          src={activeImage}
          alt={`${productName} - Main View`}
          className="max-h-[320px] sm:max-h-[350px] print:max-h-[240px] w-auto max-w-full object-contain rounded-lg shadow-sm print:shadow-none transition-all duration-200"
          loading="eager"
        />
      </div>

      {/* Thumbnails Row (All Available Images) */}
      {allImages.length > 1 && (
        <div className="mt-3 pt-3 border-t border-border/50 print:border-slate-200">
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {allImages.map((img, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg p-1 bg-secondary/25 border transition-all duration-150 cursor-pointer flex items-center justify-center overflow-hidden print:cursor-default ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 shadow-sm print:ring-0 print:border-slate-800"
                      : "border-border/70 hover:border-foreground/50 print:border-slate-300 opacity-80 hover:opacity-100"
                  }`}
                  title={`${productName} thumbnail ${idx + 1}`}
                >
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
      )}
    </div>
  );
}
