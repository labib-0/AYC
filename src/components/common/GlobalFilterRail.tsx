"use client";

import React, { useState } from "react";
import { X, RotateCcw, Search } from "lucide-react";
import { BrandModel } from "@/services/brand.service";
import { CategoryModel } from "@/services/category.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";
import BrandLogoTile from "@/components/common/BrandLogoTile";
import {
  IconMen,
  IconWomen,
  IconBoys,
  IconGirls,
  IconUnisex,
} from "@/components/common/AudienceIcons";

export interface GlobalFilterRailProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBrands: string[];
  selectedDesignTypes?: string[];
  selectedAudiences: string[];
  selectedCategories: string[];
  onBrandsChange: (brands: string[]) => void;
  onDesignTypesChange?: (types: string[]) => void;
  onAudiencesChange: (audiences: string[]) => void;
  onCategoriesChange: (categories: string[]) => void;
  onClearAll: () => void;
  availableBrands: BrandModel[];
  availableCategories: CategoryModel[];
}

export const AUDIENCE_ROW_1 = [
  { key: "MEN", label: "Men", Icon: IconMen },
  { key: "WOMEN", label: "Women", Icon: IconWomen },
] as const;

export const AUDIENCE_ROW_2 = [
  { key: "BOYS", label: "Boys", Icon: IconBoys },
  { key: "GIRLS", label: "Girls", Icon: IconGirls },
  { key: "UNISEX", label: "Unisex", Icon: IconUnisex },
] as const;

export const DESIGN_TYPES = [
  { value: "ORIGINAL", display: "ORIGINAL", fullLabel: "Original" },
  { value: "MASTER COPY", display: "MASTER COPY", fullLabel: "Master Copy" },
] as const;

/**
 * Reusable bounded scroll container for Brand Logos (max 3 rows)
 */
export function BrandFilterGrid({
  brands,
  selectedBrands,
  onToggleBrand,
}: {
  brands: BrandModel[];
  selectedBrands: string[];
  onToggleBrand: (name: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Brand logos"
      tabIndex={0}
      className="max-h-[196px] sm:max-h-[198px] overflow-y-auto pr-1 subtle-scrollbar rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
    >
      <div className="grid grid-cols-3 gap-2">
        {brands.map((brand) => {
          const isSelected = selectedBrands.includes(brand.name);
          const rawLogo = brand.logo_url || brand.logo;
          const resolvedLogo = getBrandLogoUrl(brand.name, rawLogo) || rawLogo;

          return (
            <BrandLogoTile
              key={brand.id || brand.name}
              id={brand.id}
              name={brand.name}
              logoUrl={resolvedLogo}
              isSelected={isSelected}
              onClick={() => onToggleBrand(brand.name)}
              title={brand.name}
              ariaLabel={`${brand.name} brand`}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Reusable bounded scroll container for Product Categories (max 5 rows)
 */
export function ProductCategoryFilterScroll({
  categories,
  selectedCategories,
  onToggleCategory,
}: {
  categories: CategoryModel[];
  selectedCategories: string[];
  onToggleCategory: (name: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Product Categories"
      tabIndex={0}
      className="max-h-[188px] sm:max-h-[192px] overflow-y-auto pr-1 subtle-scrollbar flex flex-wrap gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 rounded-md"
    >
      {categories.map((cat) => {
        const isSelected = selectedCategories.includes(cat.name);
        return (
          <button
            key={cat.id || cat.name}
            type="button"
            onClick={() => onToggleCategory(cat.name)}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-sans transition-all duration-150 ease-out cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground whitespace-nowrap active:translate-y-0 ${
              isSelected
                ? "bg-foreground text-background border-foreground shadow-xs font-semibold hover:-translate-y-0.5"
                : "bg-card text-muted-foreground hover:text-foreground hover:border-slate-900/60 dark:hover:border-white/60 hover:bg-secondary/50 border-slate-900/25 dark:border-white/25 shadow-2xs font-medium hover:-translate-y-0.5"
            }`}
            aria-pressed={isSelected}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

export default function GlobalFilterRail({
  isOpen,
  onClose,
  selectedBrands,
  selectedDesignTypes = [],
  selectedAudiences,
  selectedCategories,
  onBrandsChange,
  onDesignTypesChange,
  onAudiencesChange,
  onCategoriesChange,
  onClearAll,
  availableBrands,
  availableCategories,
}: GlobalFilterRailProps) {
  const [brandSearchQuery, setBrandSearchQuery] = useState("");

  const totalActiveCount =
    selectedBrands.length +
    (selectedDesignTypes?.length || 0) +
    selectedAudiences.length +
    selectedCategories.length;

  const toggleBrand = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      onBrandsChange(selectedBrands.filter((b) => b !== brandName));
    } else {
      onBrandsChange([...selectedBrands, brandName]);
    }
  };

  const toggleDesignType = (dt: string) => {
    if (!onDesignTypesChange) return;
    if (selectedDesignTypes.includes(dt)) {
      onDesignTypesChange(selectedDesignTypes.filter((d) => d !== dt));
    } else {
      onDesignTypesChange([...selectedDesignTypes, dt]);
    }
  };

  const toggleAudience = (aud: string) => {
    if (selectedAudiences.includes(aud)) {
      onAudiencesChange(selectedAudiences.filter((a) => a !== aud));
    } else {
      onAudiencesChange([...selectedAudiences, aud]);
    }
  };

  const toggleCategory = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== catName));
    } else {
      onCategoriesChange([...selectedCategories, catName]);
    }
  };

  // Immediate case-insensitive partial match on brand name
  const filteredBrands = availableBrands.filter((b) =>
    b.name.toLowerCase().includes(brandSearchQuery.trim().toLowerCase())
  );

  const renderAudienceButton = ({
    key,
    label,
    Icon,
  }: {
    key: string;
    label: string;
    Icon: React.ComponentType<any>;
  }) => {
    const isSelected = selectedAudiences.includes(key);
    return (
      <button
        key={key}
        type="button"
        onClick={() => toggleAudience(key)}
        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground min-h-[46px] sm:min-h-[48px] select-none ${
          isSelected
            ? "bg-foreground text-background border-foreground shadow-xs font-bold"
            : "bg-card text-muted-foreground hover:text-foreground border-slate-900/25 dark:border-white/25 hover:border-slate-900/60 dark:hover:border-white/60 shadow-2xs"
        }`}
        aria-pressed={isSelected}
        aria-label={`Audience: ${label}`}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={isSelected ? 2.2 : 1.8} />
        <span className="text-[10.5px] sm:text-[11px] font-sans font-bold uppercase tracking-wider leading-none mt-1.5 truncate max-w-full">
          {label}
        </span>
      </button>
    );
  };

  // ── Shared Filter Content (Desktop + Mobile) ──────────────────────────────
  const filterContent = (
    <div className="space-y-4">
      {/* ── 1. BRAND — 3-Row Max Bounded Scroll + Brand Search (No Load More) ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans">
            BRAND
          </h3>
          {availableBrands.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {selectedBrands.length} / {availableBrands.length}
            </span>
          )}
        </div>

        {/* Compact Brand Search Input */}
        <div className="relative mb-2">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={brandSearchQuery}
            onChange={(e) => setBrandSearchQuery(e.target.value)}
            placeholder="Search brands..."
            className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-background border border-border/80 focus:border-foreground/40 rounded-lg pl-7 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 transition-all outline-none"
            aria-label="Search brands"
          />
          {brandSearchQuery && (
            <button
              type="button"
              onClick={() => setBrandSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
              aria-label="Clear brand search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Bounded Scrollable Brand Area (Max 3 visible rows, internal scrollbar) */}
        {filteredBrands.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground font-sans">
            No brands found.
          </p>
        ) : (
          <BrandFilterGrid
            brands={filteredBrands}
            selectedBrands={selectedBrands}
            onToggleBrand={toggleBrand}
          />
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* ── 2. AUDIENCE — Two Deliberate Rows with Prominent Icons ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans mb-2">
          AUDIENCE
        </h3>

        <div className="space-y-1.5 sm:space-y-2">
          {/* Row 1: MEN / WOMEN */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {AUDIENCE_ROW_1.map(renderAudienceButton)}
          </div>
          {/* Row 2: BOYS / GIRLS / UNISEX */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {AUDIENCE_ROW_2.map(renderAudienceButton)}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* ── 3. DESIGN TYPE — ORIGINAL / MASTER COPY with Equal Weight ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans mb-2">
          DESIGN TYPE
        </h3>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {DESIGN_TYPES.map(({ value, display, fullLabel }) => {
            const isSelected = selectedDesignTypes.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleDesignType(value)}
                className={`flex items-center justify-center py-2.5 px-3 rounded-xl border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground min-h-[40px] sm:min-h-[42px] select-none ${
                  isSelected
                    ? "bg-foreground text-background border-foreground shadow-xs font-bold"
                    : "bg-card text-muted-foreground hover:text-foreground border-slate-900/25 dark:border-white/25 hover:border-slate-900/60 dark:hover:border-white/60 shadow-2xs"
                }`}
                aria-pressed={isSelected}
                aria-label={`Design Type: ${fullLabel}`}
                title={`Design Type: ${fullLabel}`}
              >
                <span className="text-[10px] sm:text-[11px] font-sans font-extrabold uppercase tracking-wider leading-tight whitespace-nowrap">
                  {display}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* ── 4. PRODUCT CATEGORY — Bounded Scroll Area (Max 5 Rows, No Load More) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans">
            PRODUCT CATEGORY
          </h3>
          {availableCategories.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {availableCategories.length}
            </span>
          )}
        </div>

        {/* Bounded Category Viewport (Max ~5 Rows, Internal Scrollbar If Needed) */}
        <ProductCategoryFilterScroll
          categories={availableCategories}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
        />
      </div>
    </div>
  );

  // ── Panel Header (shared structure for desktop + mobile) ────────────────
  const panelHeader = (isMobile: boolean) => (
    <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border/60">
      {/* Left: X close + FILTERS title */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`${
            isMobile ? "w-7 h-7" : "w-6 h-6"
          } rounded-md hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground`}
          aria-label="Close filters"
        >
          <X size={isMobile ? 16 : 14} />
        </button>
        <span className="text-[13px] font-bold uppercase tracking-wider text-foreground font-sans">
          FILTERS
        </span>
        {totalActiveCount > 0 && (
          <span className="w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center font-mono">
            {totalActiveCount}
          </span>
        )}
      </div>

      {/* Right: CLEAR ALL */}
      {totalActiveCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <RotateCcw size={11} />
          <span>CLEAR ALL</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop Left Rail (lg: >= 1024px): Outer Column + Inner Sticky Panel ── */}
      <div className="filter-column hidden lg:block w-[280px] shrink-0">
        <aside
          className="filter-panel sticky top-[84px] w-full bg-card border border-border/80 rounded-2xl p-4 shadow-xs font-sans"
          aria-label="Product Filters"
        >
          {panelHeader(false)}
          {filterContent}
        </aside>
      </div>

      {/* ── Mobile / Tablet Drawer Modal (< lg: < 1024px) ── */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop Click Dismiss */}
          <div
            className="absolute inset-0"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="relative w-full sm:max-w-md max-h-[85vh] bg-background border border-border rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom duration-250">
            {panelHeader(true)}

            {/* Scrollable Filter Body (Mobile Modal Only) */}
            <div className="overflow-y-auto flex-1 py-1 no-scrollbar">
              {filterContent}
            </div>

            {/* Footer */}
            <div className="pt-3.5 mt-3 border-t border-border flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-full text-xs font-bold uppercase tracking-widest bg-foreground text-background hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm text-center"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
