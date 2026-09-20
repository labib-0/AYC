"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { CategoryModel } from "@/services/category.service";
import CategoryImageUploader from "./CategoryImageUploader";

export interface CategoryFormData {
  name: string;
  slug: string;
  image: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
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
    } else {
      setName("");
      setSlug("");
      setIsSlugManuallyEdited(false);
      setImageUrl("");
      setDescription("");
      setSortOrder(defaultSortOrder);
      setIsActive(true);
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

      {/* 1. Category Basic Info */}
      <div className="space-y-4">
        {/* Category Name */}
        <div className="space-y-1.5">
          <label htmlFor="category-form-name" className="text-xs font-bold uppercase tracking-wider text-foreground block">
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            id="category-form-name"
            type="text"
            required
            autoFocus
            disabled={isSaving}
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. T-Shirts, Hoodies, Jackets"
            className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1.5 transition-all ${
              nameError
                ? "border-red-500 focus:ring-red-500"
                : "border-border focus:ring-foreground"
            }`}
          />
          {nameError && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{nameError}</p>
          )}
        </div>

        {/* Category Slug */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="category-form-slug" className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Category Slug
            </label>
            <span className="text-[10px] text-muted-foreground">
              {isSlugManuallyEdited ? "Customized manually" : "Auto-generated from name"}
            </span>
          </div>
          <input
            id="category-form-slug"
            type="text"
            disabled={isSaving}
            value={slug}
            onChange={handleSlugChange}
            placeholder="e.g. t-shirts"
            className={`w-full px-3.5 py-2 font-mono text-xs rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1.5 transition-all ${
              slugError
                ? "border-red-500 focus:ring-red-500"
                : "border-border focus:ring-foreground"
            }`}
          />
          {slugError && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{slugError}</p>
          )}
        </div>
      </div>

      {/* 2. Category Image Section */}
      <CategoryImageUploader
        imageUrl={imageUrl}
        onChange={setImageUrl}
        categoryName={name || "Category"}
        disabled={isSaving}
      />

      {/* 3. Description & Settings */}
      <div className="space-y-4 pt-1">
        {/* Description */}
        <div className="space-y-1.5">
          <label htmlFor="category-form-description" className="text-xs font-bold uppercase tracking-wider text-foreground block">
            Description <span className="text-muted-foreground font-normal normal-case">(optional)</span>
          </label>
          <textarea
            id="category-form-description"
            rows={3}
            disabled={isSaving}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this apparel category for wholesale buyers..."
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1.5 focus:ring-foreground transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Sort Order */}
          <div className="space-y-1.5">
            <label htmlFor="category-form-sort-order" className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Sort Order
            </label>
            <input
              id="category-form-sort-order"
              type="number"
              min="0"
              disabled={isSaving}
              value={sortOrder}
              onChange={handleSortOrderChange}
              className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1.5 transition-all ${
                sortOrderError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-border focus:ring-foreground"
              }`}
            />
            {sortOrderError && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{sortOrderError}</p>
            )}
          </div>

          {/* Active Status Checkbox */}
          <div className="flex flex-col justify-end pb-1.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                disabled={isSaving}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-border text-foreground focus:ring-foreground accent-foreground cursor-pointer"
              />
              <span className="text-xs font-bold text-foreground">
                Active Category
              </span>
            </label>
            <span className="text-[10px] text-muted-foreground pl-6 mt-0.5">
              Visible across storefront navigation &amp; catalog
            </span>
          </div>
        </div>
      </div>

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
