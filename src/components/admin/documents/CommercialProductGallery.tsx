"use client";

import React, { useState, useMemo } from "react";
import ProductHeroImage from "./ProductHeroImage";
import ProductImageThumbnails from "./ProductImageThumbnails";

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
 * Reusable Product Image Gallery for Commercial Offer Sheets & Order Sheets.
 * Follows the general structure of the customer Product Detail page gallery:
 * - One prominent large main product image (ProductHeroImage)
 * - Row of small thumbnail images underneath (ProductImageThumbnails)
 * - All available product images shown
 * - Professional export document styling: clean framing, zero marketing badges, no add-to-cart
 * - Print-safe (A4-friendly sizing, page-break avoidance)
 * - Multiple products support: identifies primary/featured product clearly
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
    if (effectivePrimaryImage && !list.includes(effectivePrimaryImage)) {
      list.push(effectivePrimaryImage);
    }
    (effectiveImagesList || []).forEach((img) => {
      if (img && typeof img === "string" && !list.includes(img)) {
        list.push(img);
      }
    });
    return list;
  }, [effectivePrimaryImage, effectiveImagesList]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image index when product/item changes
  React.useEffect(() => {
    setActiveImageIndex(0);
  }, [effectiveProductName, effectivePrimaryImage]);

  if (allImages.length === 0) {
    return null;
  }

  const currentHeroImage = allImages[activeImageIndex] || allImages[0];

  return (
    <div
      className={`rounded-2xl border border-border/70 bg-card p-4 sm:p-5 text-foreground shadow-xs print:shadow-none print:bg-white print:border-slate-300 print:p-3 print:break-inside-avoid ${className}`}
      id="commercial-product-gallery"
    >
      {/* Gallery Section Header & Multiple Products Tabs if applicable */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2 mb-3 print:border-slate-300">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono print:text-slate-600 block">
            Product Visual Gallery &amp; Style Samples
          </span>
          {hasMultipleItems && (
            <span className="text-[10px] font-semibold text-primary block mt-0.5 print:text-slate-700">
              Primary Featured Item: {effectiveProductName}
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
                    setActiveImageIndex(0);
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

      {/* Large Main Product Image Frame */}
      <ProductHeroImage
        imageUrl={currentHeroImage}
        productName={effectiveProductName}
      />

      {/* Thumbnails Row (All Available Images) */}
      <ProductImageThumbnails
        images={allImages}
        activeIndex={activeImageIndex}
        onSelect={setActiveImageIndex}
        productName={effectiveProductName}
      />
    </div>
  );
}
