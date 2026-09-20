"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CategoryModel, categoryService } from "@/services/category.service";
import CategoryForm, { CategoryFormData } from "./CategoryForm";

export interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: CategoryModel | null;
  onSuccess?: (savedCategory: CategoryModel) => void;
  defaultSortOrder?: number;
}

export default function CategoryModal({
  isOpen,
  onClose,
  category,
  onSuccess,
  defaultSortOrder = 1,
}: CategoryModalProps) {
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

  const handleSubmit = async (formData: CategoryFormData) => {
    setIsSaving(true);
    try {
      let result: CategoryModel;
      if (category && category.id) {
        result = await categoryService.updateCategory(category.id, {
          name: formData.name,
          slug: formData.slug,
          image: formData.image,
          image_url: formData.image,
          description: formData.description,
          sort_order: formData.sortOrder,
          is_active: formData.isActive,
        });
      } else {
        result = await categoryService.createCategory({
          name: formData.name,
          slug: formData.slug,
          image: formData.image,
          image_url: formData.image,
          description: formData.description,
          sort_order: formData.sortOrder,
          is_active: formData.isActive,
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
      aria-labelledby="category-modal-title"
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
              id="category-modal-title"
              className="font-bold text-base sm:text-lg text-foreground tracking-tight"
            >
              {category ? "Edit Category" : "Add Category"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {category
                ? `Update details and assets for "${category.name}".`
                : "Create a new product category in your wholesale catalog."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Close category dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Form */}
        <CategoryForm
          initialCategory={category}
          defaultSortOrder={defaultSortOrder}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
