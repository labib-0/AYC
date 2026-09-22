"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, RotateCcw, ChevronDown } from "lucide-react";
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

const AUDIENCES = [
  { key: "MEN", label: "Men", Icon: IconMen },
  { key: "WOMEN", label: "Women", Icon: IconWomen },
  { key: "BOYS", label: "Boys", Icon: IconBoys },
  { key: "GIRLS", label: "Girls", Icon: IconGirls },
  { key: "UNISEX", label: "Unisex", Icon: IconUnisex },
];

const DESIGN_TYPES = [
  { value: "ORIGINAL", display: "ORIGINAL", fullLabel: "Original" },
  { value: "MASTER COPY", display: "MC", fullLabel: "Master Copy" },
] as const;

const INITIAL_BRAND_COUNT = 9; // 3 columns x 3 rows = 9 initial brand tiles
const BRAND_BATCH_SIZE = 9; // +3 rows per click
const INITIAL_CATEGORY_COUNT = 30; // Initial comfortable batch for category scroll region
const CATEGORY_BATCH_SIZE = 20; // Incremental slice as user scrolls

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
  const [visibleBrandCount, setVisibleBrandCount] = useState<number>(INITIAL_BRAND_COUNT);
  const [isLoadingMoreBrands, setIsLoadingMoreBrands] = useState(false);
  const [visibleCategoryCount, setVisibleCategoryCount] = useState<number>(INITIAL_CATEGORY_COUNT);
  const categorySentinelRef = useRef<HTMLDivElement>(null);

  // If any selected brand is beyond the initial 9, expand visible count in multiples of 9
  useEffect(() => {
    if (selectedBrands.length > 0 && availableBrands.length > 0) {
      const maxIdx = availableBrands.reduce((acc, b, idx) => {
        return selectedBrands.includes(b.name) ? Math.max(acc, idx) : acc;
      }, -1);
      if (maxIdx >= visibleBrandCount) {
        const neededCount = Math.ceil((maxIdx + 1) / BRAND_BATCH_SIZE) * BRAND_BATCH_SIZE;
        setVisibleBrandCount(Math.min(neededCount, availableBrands.length));
      }
    }
  }, [selectedBrands, availableBrands, visibleBrandCount]);

  // If any selected category is beyond initial count, expand visible category count
  useEffect(() => {
    if (selectedCategories.length > 0 && availableCategories.length > 0) {
      const maxIdx = availableCategories.reduce((acc, c, idx) => {
        return selectedCategories.includes(c.name) ? Math.max(acc, idx) : acc;
      }, -1);
      if (maxIdx >= visibleCategoryCount) {
        const neededCount = Math.ceil((maxIdx + 1) / CATEGORY_BATCH_SIZE) * CATEGORY_BATCH_SIZE;
        setVisibleCategoryCount(Math.min(neededCount, availableCategories.length));
      }
    }
  }, [selectedCategories, availableCategories, visibleCategoryCount]);

  // Internal IntersectionObserver on sentinel inside the Category scroll container (independent from page sentinel)
  useEffect(() => {
    const sentinel = categorySentinelRef.current;
    if (!sentinel || visibleCategoryCount >= availableCategories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCategoryCount((prev) => Math.min(prev + CATEGORY_BATCH_SIZE, availableCategories.length));
        }
      },
      { rootMargin: "40px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCategoryCount, availableCategories.length]);

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

  const handleLoadMoreBrands = () => {
    if (isLoadingMoreBrands || visibleBrandCount >= availableBrands.length) return;
    setIsLoadingMoreBrands(true);
    setVisibleBrandCount((prev) => Math.min(prev + BRAND_BATCH_SIZE, availableBrands.length));
    setIsLoadingMoreBrands(false);
  };

  const visibleBrands = availableBrands.slice(0, visibleBrandCount);
  const hasMoreBrands = visibleBrandCount < availableBrands.length;
  const visibleCategories = availableCategories.slice(0, visibleCategoryCount);
  const hasMoreCategories = visibleCategoryCount < availableCategories.length;

  // ── Shared Filter Content (Desktop + Mobile) ──────────────────────────────
  const filterContent = (
    <div className="space-y-4">
      {/* ── 1. BRAND — 3-Column Visual Brand Grid (3 rows = 9 initial) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans">
            BRAND
          </h3>
          {availableBrands.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {Math.min(visibleBrandCount, availableBrands.length)}/{availableBrands.length}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {visibleBrands.map((brand) => {
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
                onClick={() => toggleBrand(brand.name)}
                title={brand.name}
                ariaLabel={`${brand.name} brand`}
              />
            );
          })}
        </div>

        {/* Centered Minimal Down-Arrow Load More Control (appends +9 brands = 3 rows) */}
        {hasMoreBrands && (
          <div className="flex justify-center mt-2.5">
            <button
              type="button"
              onClick={handleLoadMoreBrands}
              disabled={isLoadingMoreBrands}
              className="inline-flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors group cursor-pointer focus-visible:outline-none"
              aria-label="Load more brands"
            >
              <div className="w-6.5 h-6.5 rounded-full border border-border/80 group-hover:border-foreground/50 bg-card group-hover:bg-secondary/70 flex items-center justify-center transition-all shadow-2xs group-hover:shadow-xs">
                <ChevronDown
                  size={13}
                  className="transition-transform duration-200 group-hover:translate-y-0.5 text-foreground/70 group-hover:text-foreground"
                />
              </div>
              <span className="text-[9.5px] font-bold uppercase tracking-widest font-sans">
                LOAD MORE
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* ── 2. AUDIENCE — Separate Compact Section ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans mb-2">
          AUDIENCE
        </h3>

        <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
          {AUDIENCES.map(({ key, label, Icon }) => {
            const isSelected = selectedAudiences.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleAudience(key)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-foreground min-h-[38px] select-none ${
                  isSelected
                    ? "bg-foreground text-background border-foreground shadow-2xs font-bold"
                    : "bg-card text-muted-foreground hover:text-foreground border-slate-900/25 dark:border-white/25 hover:border-slate-900/60 dark:hover:border-white/60 shadow-2xs"
                }`}
                aria-pressed={isSelected}
                aria-label={`Audience: ${label}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={isSelected ? 2.2 : 1.75} />
                <span className="text-[9.5px] font-sans font-bold uppercase tracking-tight leading-none mt-1 truncate max-w-full">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* ── 3. DESIGN TYPE — Separate Compact Section ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans mb-2">
          DESIGN TYPE
        </h3>

        <div className="grid grid-cols-2 gap-1.5">
          {DESIGN_TYPES.map(({ value, display, fullLabel }) => {
            const isSelected = selectedDesignTypes.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleDesignType(value)}
                className={`flex items-center justify-center py-2 px-2 rounded-lg border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-foreground min-h-[36px] select-none ${
                  isSelected
                    ? "bg-foreground text-background border-foreground shadow-2xs font-bold"
                    : "bg-card text-muted-foreground hover:text-foreground border-slate-900/25 dark:border-white/25 hover:border-slate-900/60 dark:hover:border-white/60 shadow-2xs"
                }`}
                aria-pressed={isSelected}
                aria-label={`Design Type: ${fullLabel}`}
                title={`Design Type: ${fullLabel}`}
              >
                <span className="text-[10.5px] font-sans font-extrabold uppercase tracking-wider leading-tight">
                  {display}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* ── 4. PRODUCT CATEGORY — Controlled Scroll Area ── */}
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

        {/* Controlled Category Viewport with Internal Vertical Scrolling */}
        <div
          role="region"
          aria-label="Product Categories"
          tabIndex={0}
          className="max-h-[260px] sm:max-h-[280px] overflow-y-auto pr-1 flex flex-wrap gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 rounded-md"
        >
          {visibleCategories.map((cat) => {
            const isSelected = selectedCategories.includes(cat.name);
            return (
              <button
                key={cat.id || cat.name}
                type="button"
                onClick={() => toggleCategory(cat.name)}
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
          {hasMoreCategories && (
            <div ref={categorySentinelRef} className="w-full h-2 pointer-events-none" aria-hidden="true" />
          )}
        </div>
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
