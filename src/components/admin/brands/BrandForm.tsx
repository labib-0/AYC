"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { BrandModel } from "@/services/brand.service";
import BrandLogoUploader from "./BrandLogoUploader";

export interface BrandFormData {
  name: string;
  slug: string;
  logo: string;
  website: string;
  sortOrder: number;
  isActive: boolean;
}

interface BrandFormProps {
  initialBrand?: BrandModel | null;
  defaultSortOrder?: number;
  onSubmit: (data: BrandFormData) => Promise<void>;
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

function isValidUrl(urlString: string): boolean {
  if (!urlString) return true;
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function BrandForm({
  initialBrand,
  defaultSortOrder = 1,
  onSubmit,
  onCancel,
  isSaving = false,
}: BrandFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(defaultSortOrder);
  const [isActive, setIsActive] = useState(true);

  // Validation errors
  const [nameError, setNameError] = useState("");
  const [slugError, setSlugError] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [sortOrderError, setSortOrderError] = useState("");
  const [formError, setFormError] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state when initialBrand changes
  useEffect(() => {
    if (initialBrand) {
      setName(initialBrand.name || "");
      setSlug(initialBrand.slug || "");
      setIsSlugManuallyEdited(true); // Treat existing brand slug as manually edited to prevent overwriting
      setLogoUrl(initialBrand.logo_url || initialBrand.logo || "");
      setWebsite(initialBrand.website || "");
      setSortOrder(initialBrand.sort_order ?? defaultSortOrder);
      setIsActive(initialBrand.is_active ?? true);
      setShowAdvanced(Boolean(initialBrand.website || initialBrand.sort_order));
    } else {
      setName("");
      setSlug("");
      setIsSlugManuallyEdited(false);
      setLogoUrl("");
      setWebsite("");
      setSortOrder(defaultSortOrder);
      setIsActive(true);
      setShowAdvanced(false);
    }
    setNameError("");
    setSlugError("");
    setWebsiteError("");
    setSortOrderError("");
    setFormError("");
  }, [initialBrand, defaultSortOrder]);

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

  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWebsite(e.target.value);
    if (websiteError) setWebsiteError("");
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
    setWebsiteError("");
    setSortOrderError("");
    setFormError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Brand name is required.");
      valid = false;
    } else if (trimmedName.length > 100) {
      setNameError("Brand name must not exceed 100 characters.");
      valid = false;
    }

    const trimmedSlug = (slug || normalizeSlug(trimmedName)).trim();
    if (!trimmedSlug) {
      setSlugError("Brand slug cannot be empty.");
      valid = false;
    } else if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      setSlugError("Slug must contain only lowercase letters, numbers, and hyphens.");
      valid = false;
    }

    const trimmedWebsite = website.trim();
    if (trimmedWebsite && !isValidUrl(trimmedWebsite)) {
      setWebsiteError("Please enter a valid URL including http:// or https://");
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
        logo: logoUrl.trim(),
        website: website.trim(),
        sortOrder: Number(sortOrder) || 1,
        isActive,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save brand. Please try again.";
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

      {/* 1. BRAND BASIC INFO SECTION */}
      <div className="space-y-4">
        {/* Brand Name */}
        <div className="space-y-1.5">
          <label htmlFor="brand-form-name" className="text-xs font-bold uppercase tracking-wider text-foreground block">
            Brand Name <span className="text-red-500">*</span>
          </label>
          <input
            id="brand-form-name"
            type="text"
            required
            autoFocus
            disabled={isSaving}
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. Nike, Adidas, Ayaan"
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

        {/* Brand Slug */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="brand-form-slug" className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Brand Slug
            </label>
            <span className="text-[10px] text-muted-foreground">
              {isSlugManuallyEdited ? "Customized manually" : "Auto-generated from name"}
            </span>
          </div>
          <input
            id="brand-form-slug"
            type="text"
            disabled={isSaving}
            value={slug}
            onChange={handleSlugChange}
            placeholder="e.g. nike-sportswear"
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

      {/* 2. LOGO UPLOAD SECTION */}
      <BrandLogoUploader
        logoUrl={logoUrl}
        onChange={setLogoUrl}
        brandName={name || "Brand"}
        disabled={isSaving}
      />

      {/* 3. BRAND ADVANCED SECTION (Collapsible) */}
      <div className="pt-2 border-t border-border/70">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-1 transition-colors cursor-pointer"
        >
          <span>{showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings (Website, Sort Order, Status)"}</span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-3 animate-in fade-in duration-150">
            {/* Website URL */}
            <div className="space-y-1.5">
              <label htmlFor="brand-form-website" className="text-xs font-bold uppercase tracking-wider text-foreground block">
                Official Website <span className="text-muted-foreground font-normal normal-case">(optional)</span>
              </label>
              <input
                id="brand-form-website"
                type="url"
                disabled={isSaving}
                value={website}
                onChange={handleWebsiteChange}
                placeholder="https://brandwebsite.com"
                className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1.5 transition-all ${
                  websiteError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-border focus:ring-foreground"
                }`}
              />
              {websiteError && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{websiteError}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sort Order */}
              <div className="space-y-1.5">
                <label htmlFor="brand-form-sort-order" className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  Sort Order
                </label>
                <input
                  id="brand-form-sort-order"
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
                    Active Brand
                  </span>
                </label>
                <span className="text-[10px] text-muted-foreground pl-6 mt-0.5">
                  Visible in storefront catalog and filters
                </span>
              </div>
            </div>
          </div>
        )}
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
          <span>{isSaving ? "Saving..." : initialBrand ? "Update Brand" : "Create Brand"}</span>
        </button>
      </div>
    </form>
  );
}
