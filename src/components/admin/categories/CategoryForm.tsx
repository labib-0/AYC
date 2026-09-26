"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { CategoryModel } from "@/services/category.service";
import CategoryBasicInfoSection from "./CategoryBasicInfoSection";
import CategoryImageUploader from "./CategoryImageUploader";
import CategoryAdvancedSection from "./CategoryAdvancedSection";

export interface CategoryFormData {
  name: string;
  slug: string;
  image: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  isFeaturedOnLanding: boolean;
  landingSortOrder: number;
}

interface CategoryFormProps {
  initialCategory?: CategoryModel | null;
  defaultSortOrder?: number;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

function normalizeSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoryForm({
  initialCategory,
  defaultSortOrder = 1,
  onSubmit,
  onCancel,
  isSaving = false,
}: CategoryFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(defaultSortOrder);
  const [isActive, setIsActive] = useState(true);
  const [isFeaturedOnLanding, setIsFeaturedOnLanding] = useState(false);
  const [landingSortOrder, setLandingSortOrder] = useState<number>(0);

  // Validation errors
  const [nameError, setNameError] = useState("");
  const [slugError, setSlugError] = useState("");
  const [sortOrderError, setSortOrderError] = useState("");
  const [formError, setFormError] = useState("");

  // Sync state when initialCategory changes
  useEffect(() => {
    if (initialCategory) {
      setName(initialCategory.name || "");
      setSlug(initialCategory.slug || "");
      setIsSlugManuallyEdited(true); // Treat existing category slug as manually edited to prevent overwriting
      setImageUrl(initialCategory.image_url || initialCategory.image || "");
      setDescription(initialCategory.description || "");
      setSortOrder(initialCategory.sort_order ?? defaultSortOrder);
      setIsActive(initialCategory.is_active ?? true);
      setIsFeaturedOnLanding(Boolean(initialCategory.is_featured_on_landing));
      setLandingSortOrder(initialCategory.landing_sort_order ?? 0);
    } else {
      setName("");
      setSlug("");
      setIsSlugManuallyEdited(false);
      setImageUrl("");
      setDescription("");
      setSortOrder(defaultSortOrder);
      setIsActive(true);
      setIsFeaturedOnLanding(false);
      setLandingSortOrder(0);
    }
    setNameError("");
    setSlugError("");
    setSortOrderError("");
    setFormError("");
  }, [initialCategory, defaultSortOrder]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (nameError) setNameError("");

    // Auto-generate slug if not manually touched
    if (!isSlugManuallyEdited) {
      setSlug(normalizeSlug(newName));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(e.target.value);
    if (slugError) setSlugError("");
  };

  const handleSortOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSortOrder(isNaN(val) ? 0 : val);
    if (sortOrderError) setSortOrderError("");
  };

  const validate = (): boolean => {
    let valid = true;
    setNameError("");
    setSlugError("");
    setSortOrderError("");
    setFormError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Category name is required.");
      valid = false;
    } else if (trimmedName.length > 100) {
      setNameError("Category name must not exceed 100 characters.");
      valid = false;
    }

    const trimmedSlug = (slug || normalizeSlug(trimmedName)).trim();
    if (!trimmedSlug) {
      setSlugError("Category slug cannot be empty.");
      valid = false;
    } else if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      setSlugError("Slug must contain only lowercase letters, numbers, and hyphens.");
      valid = false;
    }

    if (isNaN(sortOrder) || sortOrder < 0) {
      setSortOrderError("Sort order must be a non-negative number.");
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit({
        name: name.trim(),
        slug: (slug || normalizeSlug(name)).trim(),
        image: imageUrl.trim(),
        description: description.trim(),
        sortOrder: Number(sortOrder) || 1,
        isActive,
        isFeaturedOnLanding,
        landingSortOrder: Number(landingSortOrder) || 0,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save category. Please try again.";
      setFormError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle size={15} className="shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. Category Basic Info (Name & Slug) */}
      <CategoryBasicInfoSection
        name={name}
        onNameChange={handleNameChange}
        nameError={nameError}
        slug={slug}
        onSlugChange={handleSlugChange}
        slugError={slugError}
        isSlugManuallyEdited={isSlugManuallyEdited}
        disabled={isSaving}
      />

      {/* 2. Category Image Section */}
      <CategoryImageUploader
        imageUrl={imageUrl}
        onChange={setImageUrl}
        categoryName={name || "Category"}
        disabled={isSaving}
      />

      {/* 3. Category Advanced Section (Description, Sort Order, Active Status, Landing) */}
      <CategoryAdvancedSection
        description={description}
        onDescriptionChange={(e) => setDescription(e.target.value)}
        sortOrder={sortOrder}
        onSortOrderChange={handleSortOrderChange}
        sortOrderError={sortOrderError}
        isActive={isActive}
        onIsActiveChange={setIsActive}
        isFeaturedOnLanding={isFeaturedOnLanding}
        onIsFeaturedOnLandingChange={setIsFeaturedOnLanding}
        disabled={isSaving}
      />

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/70">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && (
            <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
          )}
          <span>{isSaving ? "Saving..." : initialCategory ? "Update Category" : "Create Category"}</span>
        </button>
      </div>
    </form>
  );
}
