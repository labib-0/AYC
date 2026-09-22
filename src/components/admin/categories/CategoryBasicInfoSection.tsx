"use client";

import React from "react";

interface CategoryBasicInfoSectionProps {
  name: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nameError?: string;
  slug: string;
  onSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  slugError?: string;
  isSlugManuallyEdited: boolean;
  disabled?: boolean;
}

export default function CategoryBasicInfoSection({
  name,
  onNameChange,
  nameError,
  slug,
  onSlugChange,
  slugError,
  isSlugManuallyEdited,
  disabled = false,
}: CategoryBasicInfoSectionProps) {
  return (
    <div className="space-y-4">
      {/* Category Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="category-form-name"
          className="text-xs font-bold uppercase tracking-wider text-foreground block"
        >
          Category Name <span className="text-red-500">*</span>
        </label>
        <input
          id="category-form-name"
          type="text"
          required
          autoFocus
          disabled={disabled}
          value={name}
          onChange={onNameChange}
          placeholder="e.g. T-Shirts, Hoodies, Jackets"
          className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1.5 transition-all ${
            nameError
              ? "border-red-500 focus:ring-red-500"
              : "border-border focus:ring-foreground"
          }`}
        />
        {nameError && (
          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
            {nameError}
          </p>
        )}
      </div>

      {/* Category Slug */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="category-form-slug"
            className="text-xs font-bold uppercase tracking-wider text-foreground block"
          >
            Category Slug
          </label>
          <span className="text-[10px] text-muted-foreground">
            {isSlugManuallyEdited ? "Customized manually" : "Auto-generated from name"}
          </span>
        </div>
        <input
          id="category-form-slug"
          type="text"
          disabled={disabled}
          value={slug}
          onChange={onSlugChange}
          placeholder="e.g. t-shirts"
          className={`w-full px-3.5 py-2 font-mono text-xs rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1.5 transition-all ${
            slugError
              ? "border-red-500 focus:ring-red-500"
              : "border-border focus:ring-foreground"
          }`}
        />
        {slugError && (
          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
            {slugError}
          </p>
        )}
      </div>
    </div>
  );
}
