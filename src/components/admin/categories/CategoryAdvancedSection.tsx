"use client";

import React from "react";

interface CategoryAdvancedSectionProps {
  description: string;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  sortOrder: number;
  onSortOrderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sortOrderError?: string;
  isActive: boolean;
  onIsActiveChange: (active: boolean) => void;
  isFeaturedOnLanding?: boolean;
  onIsFeaturedOnLandingChange?: (featured: boolean) => void;
  disabled?: boolean;
}

export default function CategoryAdvancedSection({
  description,
  onDescriptionChange,
  sortOrder,
  onSortOrderChange,
  sortOrderError,
  isActive,
  onIsActiveChange,
  isFeaturedOnLanding = false,
  onIsFeaturedOnLandingChange,
  disabled = false,
}: CategoryAdvancedSectionProps) {
  return (
    <div className="space-y-4 pt-1">
      {/* Description */}
      <div className="space-y-1.5">
        <label
          htmlFor="category-form-description"
          className="text-xs font-bold uppercase tracking-wider text-foreground block"
        >
          Description <span className="text-muted-foreground font-normal normal-case">(optional)</span>
        </label>
        <textarea
          id="category-form-description"
          rows={3}
          disabled={disabled}
          value={description}
          onChange={onDescriptionChange}
          placeholder="Brief description of this apparel category for wholesale buyers..."
          className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1.5 focus:ring-foreground transition-all resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Sort Order */}
        <div className="space-y-1.5">
          <label
            htmlFor="category-form-sort-order"
            className="text-xs font-bold uppercase tracking-wider text-foreground block"
          >
            Sort Order
          </label>
          <input
            id="category-form-sort-order"
            type="number"
            min="0"
            disabled={disabled}
            value={sortOrder}
            onChange={onSortOrderChange}
            className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1.5 transition-all ${
              sortOrderError
                ? "border-red-500 focus:ring-red-500"
                : "border-border focus:ring-foreground"
            }`}
          />
          {sortOrderError && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {sortOrderError}
            </p>
          )}
        </div>

        {/* Active Status Checkbox */}
        <div className="flex flex-col justify-end pb-1.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              disabled={disabled}
              onChange={(e) => onIsActiveChange(e.target.checked)}
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

        {/* Show on Landing Page Checkbox */}
        <div className="flex flex-col justify-end pb-1.5 sm:col-span-2 pt-2 border-t border-border/40">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFeaturedOnLanding}
              disabled={disabled}
              onChange={(e) => onIsFeaturedOnLandingChange && onIsFeaturedOnLandingChange(e.target.checked)}
              className="w-4 h-4 rounded border-border text-foreground focus:ring-foreground accent-foreground cursor-pointer"
            />
            <span className="text-xs font-bold text-foreground">
              Show on Landing Page (Hot Sale)
            </span>
          </label>
          <span className="text-[10px] text-muted-foreground pl-6 mt-0.5">
            When enabled, this category is featured in the storefront landing page Hot Sale section.
          </span>
        </div>
      </div>
    </div>
  );
}
