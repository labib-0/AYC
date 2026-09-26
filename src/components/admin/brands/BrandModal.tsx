"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BrandModel, brandService } from "@/services/brand.service";
import BrandForm, { BrandFormData } from "./BrandForm";

export interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand?: BrandModel | null;
  onSuccess?: (savedBrand: BrandModel) => void;
  defaultSortOrder?: number;
}

export default function BrandModal({
  isOpen,
  onClose,
  brand,
  onSuccess,
  defaultSortOrder = 1,
}: BrandModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (formData: BrandFormData) => {
    setIsSaving(true);
    try {
      let result: BrandModel;
      if (brand && brand.id) {
        result = await brandService.updateBrand(brand.id, {
          name: formData.name,
          slug: formData.slug,
          logo: formData.logo,
          logo_url: formData.logo,
          website: formData.website || null,
          sort_order: formData.sortOrder,
          is_active: formData.isActive,
          is_featured_on_landing: formData.isFeaturedOnLanding,
          landing_sort_order: formData.landingSortOrder,
        });
      } else {
        result = await brandService.createBrand({
          name: formData.name,
          slug: formData.slug,
          logo: formData.logo,
          logo_url: formData.logo,
          website: formData.website || null,
          sort_order: formData.sortOrder,
          is_active: formData.isActive,
          is_featured_on_landing: formData.isFeaturedOnLanding,
          landing_sort_order: formData.landingSortOrder,
        });
      }

      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative bg-card border border-border rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 my-8 z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/80">
          <div>
            <h3
              id="brand-modal-title"
              className="font-bold text-base sm:text-lg text-foreground tracking-tight"
            >
              {brand ? "Edit Brand" : "Add Brand"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {brand
                ? `Update details and assets for "${brand.name}".`
                : "Create a new manufacturer brand in your wholesale catalog."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Close brand dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Brand Form */}
        <BrandForm
          initialBrand={brand}
          defaultSortOrder={defaultSortOrder}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
