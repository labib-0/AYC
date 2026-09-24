"use client";

import React, { useState, useMemo } from "react";

export interface CommercialGalleryItem {
  description: string;
  sku?: string;
  product_image_url?: string;
  product_images?: string[];
}

export interface CommercialProductGalleryProps {
  images?: string[];
  primaryImageUrl?: string;
  productName?: string;
  items?: CommercialGalleryItem[];
  className?: string;
}

/**
 * CommercialProductGallery
 * 
 * Full-Width Multi-Image Product Gallery for Commercial Offer Sheets & Order Sheets.
 * - Starts from the LEFT margin and fills the available document width
 * - Compact 4-5 column grid with canonical 4:5 aspect ratio tiles
 * - Non-destructive object-contain fitting: zero cropping, stretching, or squashing
 * - Automatic row wrapping; incomplete rows remain strictly left-aligned
 * - Includes EVERY available product image in original order without omission
 * - Graceful fallback when images are missing or broken
 * - Multiple products support with seamless tab switching
 */
export default function CommercialProductGallery({
  images = [],
  primaryImageUrl,
  productName = "Export Garment Item",
  items,
  className = "",
}: CommercialProductGalleryProps) {
  // If multiple items exist in the order/document, determine active item
  const hasMultipleItems = Boolean(items && items.length > 1);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  const activeItem = hasMultipleItems && items ? items[selectedItemIndex] : null;
  const effectiveProductName = activeItem?.description || productName;
  const effectivePrimaryImage = activeItem?.product_image_url || primaryImageUrl;
  const effectiveImagesList = activeItem?.product_images && activeItem.product_images.length > 0
    ? activeItem.product_images
    : images;

  // Normalize image list (primary image first, deduplicated, non-empty)
  const allImages = useMemo(() => {
    const list: string[] = [];
    if (effectivePrimaryImage && typeof effectivePrimaryImage === "string" && effectivePrimaryImage.trim().length > 0) {
      list.push(effectivePrimaryImage);
    }
    (effectiveImagesList || []).forEach((img) => {
      if (img && typeof img === "string" && img.trim().length > 0 && !list.includes(img)) {
        list.push(img);
      }
    });
    return list;
  }, [effectivePrimaryImage, effectiveImagesList]);

  // Selected image for enlarged preview in web mode
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  return (
    <section
      className={`rounded-2xl border border-border/70 bg-card p-4 sm:p-5 text-foreground shadow-xs print:shadow-none print:bg-white print:border-slate-300 print:p-3 print:break-inside-avoid ${className}`}
      id="commercial-product-gallery"
      aria-label="Product Visual Gallery & Production Samples"
    >
      {/* Gallery Section Header & Multiple Products Tabs if applicable */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2 mb-3.5 print:border-slate-300">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono print:text-slate-800 block">
            PRODUCT VISUAL GALLERY &amp; PRODUCTION SAMPLES
          </h2>
          {hasMultipleItems && (
            <span className="text-[10px] font-semibold text-primary block mt-0.5 print:text-slate-700">
              Product: {effectiveProductName} {activeItem?.sku ? `(${activeItem.sku})` : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasMultipleItems && items && (
            <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-lg border border-border/60 print:hidden">
              {items.map((it, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedItemIndex(idx);
                    setSelectedPreviewImage(null);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    selectedItemIndex === idx
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Item {idx + 1}
                </button>
              ))}
            </div>
          )}

          <span className="text-[10px] font-medium text-muted-foreground print:text-slate-500 shrink-0">
            {allImages.length} {allImages.length === 1 ? "Sample Image" : "Sample Images"} Available
          </span>
        </div>
      </div>

      {/* Fallback when no images are available */}
      {allImages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-secondary/20 p-4 text-center">
          <p className="text-xs text-muted-foreground font-medium">No product images available.</p>
        </div>
      ) : (
        /* Full-Width Left-Aligned 4:5 Grid */
        <div
          className={`grid gap-2.5 sm:gap-3 ${
            allImages.length <= 4
              ? "grid-cols-4"
              : "grid-cols-4 sm:grid-cols-5"
          }`}
        >
          {allImages.map((imgUrl, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedPreviewImage(imgUrl)}
              className="group relative aspect-[4/5] rounded-xl border border-border/80 bg-secondary/30 p-1.5 flex items-center justify-center overflow-hidden transition-all hover:border-primary/50 hover:shadow-xs cursor-pointer print:border-slate-300 print:bg-slate-50 print:p-1 print:cursor-default"
              title={`View ${effectiveProductName} sample #${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt={`${effectiveProductName} - Visual Sample ${idx + 1}`}
                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                onError={(e) => {
                  // Skip invalid image safely without leaving a huge placeholder
                  (e.currentTarget.parentElement as HTMLElement)?.classList.add("hidden");
                }}
              />
              <span className="absolute bottom-1 right-1.5 text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-black/60 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                #{idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Optional Lightbox Modal for screen review */}
      {selectedPreviewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 print:hidden"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div
            className="relative max-w-xl w-full bg-card rounded-2xl border border-border p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-border/60">
              <span className="text-xs font-bold text-foreground truncate pr-2">
                {effectiveProductName} — Sample View
              </span>
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold px-2 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="w-full aspect-[4/5] max-h-[70vh] bg-secondary/20 rounded-xl flex items-center justify-center overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPreviewImage}
                alt={effectiveProductName}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
