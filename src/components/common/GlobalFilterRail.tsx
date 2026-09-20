"use client";

import React, { useState } from "react";
import { X, RotateCcw, Tag } from "lucide-react";
import { BrandModel } from "@/services/brand.service";
import { CategoryModel } from "@/services/category.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";
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
  selectedAudiences: string[];
  selectedCategories: string[];
  onBrandsChange: (brands: string[]) => void;
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

export default function GlobalFilterRail({
  isOpen,
  onClose,
  selectedBrands,
  selectedAudiences,
  selectedCategories,
  onBrandsChange,
  onAudiencesChange,
  onCategoriesChange,
  onClearAll,
  availableBrands,
  availableCategories,
}: GlobalFilterRailProps) {
  const [brandImgErrors, setBrandImgErrors] = useState<Record<string, boolean>>({});

  const totalActiveCount =
    selectedBrands.length + selectedAudiences.length + selectedCategories.length;

  const toggleBrand = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      onBrandsChange(selectedBrands.filter((b) => b !== brandName));
    } else {
      onBrandsChange([...selectedBrands, brandName]);
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

  const handleBrandImgError = (brandName: string) => {
    setBrandImgErrors((prev) => ({ ...prev, [brandName]: true }));
  };

  // ── Shared Filter Content (Desktop + Mobile) ──────────────────────────────
  const filterContent = (
    <div className="space-y-5">
      {/* ── 1. BRAND — Visual Square Logo Tile Grid (3 per row) ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans mb-2.5">
          BRAND
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {availableBrands.map((brand) => {
            const isSelected = selectedBrands.includes(brand.name);
            const rawLogo = brand.logo_url || brand.logo;
            const resolvedLogo = getBrandLogoUrl(brand.name, rawLogo) || rawLogo;
            const hasValidLogo = Boolean(
              resolvedLogo &&
                resolvedLogo.trim() !== "" &&
                !resolvedLogo.includes("pexels.com") &&
                !brandImgErrors[brand.name]
            );

            return (
              <button
                key={brand.id || brand.name}
                type="button"
                onClick={() => toggleBrand(brand.name)}
                className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground aspect-square active:translate-y-0 active:scale-[0.99] ${
                  isSelected
                    ? "border-foreground ring-1.5 ring-foreground/30 bg-secondary/90 dark:bg-secondary/80 shadow-xs hover:bg-secondary hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
                    : "border-slate-900/25 dark:border-white/25 bg-card shadow-2xs hover:border-slate-900/70 dark:hover:border-white/70 hover:bg-secondary/60 dark:hover:bg-secondary/50 hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                }`}
                aria-pressed={isSelected}
                aria-label={`${brand.name} brand`}
              >
                {/* Logo Area */}
                <div className="h-7 w-full flex items-center justify-center overflow-hidden">
                  {hasValidLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvedLogo}
                      alt={`${brand.name} logo`}
                      className="max-h-6 max-w-[56px] w-auto h-auto object-contain"
                      loading="lazy"
                      decoding="async"
                      onError={() => handleBrandImgError(brand.name)}
                    />
                  ) : (
                    <Tag size={16} strokeWidth={1.5} className="text-muted-foreground/50" />
                  )}
                </div>

                {/* Brand Name */}
                <span
                  className={`text-[12px] font-sans font-semibold uppercase tracking-wider text-center truncate w-full leading-tight mt-1 ${
                    isSelected
                      ? "text-foreground font-bold"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  title={brand.name}
                >
                  {brand.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* ── 2. AUDIENCE — Icon Tiles (2 columns) ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans mb-2.5">
          AUDIENCE
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {AUDIENCES.map(({ key, label, Icon }) => {
            const isSelected = selectedAudiences.includes(key);
            const isUnisex = key === "UNISEX";

            const buttonNode = (
              <button
                key={key}
                type="button"
                onClick={() => toggleAudience(key)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-sans font-semibold uppercase tracking-wider transition-all duration-200 ease-out cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground active:translate-y-0 ${
                  isUnisex ? "w-[calc(50%-0.25rem)]" : "w-full"
                } ${
                  isSelected
                    ? "bg-foreground text-background border-foreground shadow-xs font-bold hover:-translate-y-0.5"
                    : "bg-card text-muted-foreground hover:text-foreground hover:border-slate-900/60 dark:hover:border-white/60 hover:bg-secondary/50 border-slate-900/25 dark:border-white/25 shadow-2xs hover:-translate-y-0.5"
                }`}
                aria-pressed={isSelected}
              >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  <Icon size={14} />
                </div>
                <span className="truncate">{label}</span>
              </button>
            );

            if (isUnisex) {
              return (
                <div key={key} className="col-span-2 flex justify-center">
                  {buttonNode}
                </div>
              );
            }

            return buttonNode;
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* ── 3. PRODUCT CATEGORY — Dynamic Compact Chips ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 font-sans mb-2.5">
          PRODUCT CATEGORY
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {availableCategories.map((cat) => {
            const isSelected = selectedCategories.includes(cat.name);
            return (
              <button
                key={cat.id || cat.name}
                type="button"
                onClick={() => toggleCategory(cat.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all duration-200 ease-out cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground whitespace-nowrap active:translate-y-0 ${
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
        <span
          className={`${
            isMobile ? "text-sm" : "text-xs"
          } font-bold uppercase tracking-wider text-foreground font-sans`}
        >
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
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
          className="filter-panel sticky top-[84px] w-full bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs font-sans"
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
