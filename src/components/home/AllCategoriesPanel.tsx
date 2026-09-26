"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { categoryService, CategoryModel } from "@/services/category.service";
import {
  ProductCategoryTile,
  PRODUCT_CATEGORY_GRID_CLASSES,
} from "@/components/common/ProductCategoryTile";
import {
  IconMen,
  IconWomen,
  IconBoys,
  IconGirls,
  IconUnisex,
} from "@/components/common/AudienceIcons";


const AUDIENCE_IDS = new Set([
  "c_men",
  "c_women",
  "c_boys",
  "c_girls",
  "c_unisex",
  "men",
  "women",
  "boys",
  "girls",
  "unisex",
]);
const AUDIENCE_NAMES = new Set(["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"]);

export const AUDIENCES = [
  { key: "MEN", label: "Men", Icon: IconMen },
  { key: "WOMEN", label: "Women", Icon: IconWomen },
  { key: "BOYS", label: "Boys", Icon: IconBoys },
  { key: "GIRLS", label: "Girls", Icon: IconGirls },
  { key: "UNISEX", label: "Unisex", Icon: IconUnisex },
];

export const DESIGN_TYPES = [
  { value: "ORIGINAL", display: "ORIGINAL", fullLabel: "Original" },
  { value: "MASTER COPY", display: "MASTER COPY", fullLabel: "Master Copy" },
] as const;

export interface AllCategoriesPanelProps {
  isOpen: boolean;
  className?: string;
  id?: string;
  selectedAudiences?: string[];
  selectedDesignTypes?: string[];
  selectedCategories?: string[];
  onSelectAudience?: (audienceName: string) => void;
  onSelectDesignType?: (designType: string) => void;
  onSelectCategory?: (categoryName: string) => void;
}

/**
 * AllCategoriesPanel
 * 
 * Shared expanded category navigation & filter panel reused across:
 * - Shop By Brand
 * - Featured Products
 * 
 * Visual Hierarchy (Three Clean Rows):
 * ROW 1: AUDIENCE
 *        [ MEN ] [ WOMEN ] [ BOYS ] [ GIRLS ] [ UNISEX ]
 * ─────────────────────────────────────────────────────────
 * ROW 2: DESIGN TYPE
 *        [ ORIGINAL ] [ MASTER COPY ]
 * ─────────────────────────────────────────────────────────
 * ROW 3: PRODUCT CATEGORIES
 *        [ Dynamic Category Tiles (~10-12 per row on desktop) ]
 */
export default function AllCategoriesPanel({
  isOpen,
  className = "",
  id,
  selectedAudiences = [],
  selectedDesignTypes = [],
  selectedCategories = [],
  onSelectAudience,
  onSelectDesignType,
  onSelectCategory,
}: AllCategoriesPanelProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryModel[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = () => {
      categoryService.getCategories({ is_active: true, all: true })
        .then((cats) => {
          if (isMounted) {
            setCategories(cats || []);
          }
        })
        .catch((err) => {
          console.error("Failed to load storefront categories:", err);
          if (isMounted) setCategories([]);
        });
    };

    loadCategories();

    const handleUpdate = () => loadCategories();
    window.addEventListener("ayaan:homepage-updated", handleUpdate);
    window.addEventListener("ayaan:data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("ayaan:homepage-updated", handleUpdate);
      window.removeEventListener("ayaan:data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Filter out any audience-classified items from product categories
  const detailedCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        !AUDIENCE_IDS.has(String(c.id).toLowerCase()) &&
        !AUDIENCE_IDS.has(String(c.slug || "").toLowerCase()) &&
        !AUDIENCE_NAMES.has((c.name || "").toUpperCase()) &&
        c.is_active !== false
    );
  }, [categories]);

  const handleAudienceClick = (audName: string) => {
    if (onSelectAudience) {
      onSelectAudience(audName);
      return;
    }
    router.push(
      "/search?audience=" + encodeURIComponent(audName.toLowerCase()) + "&filterOpen=true"
    );
  };

  const handleDesignTypeClick = (dtValue: string) => {
    if (onSelectDesignType) {
      onSelectDesignType(dtValue);
      return;
    }
    router.push(
      "/search?designType=" + encodeURIComponent(dtValue.toLowerCase()) + "&filterOpen=true"
    );
  };

  const handleCategoryClick = (catName: string) => {
    if (onSelectCategory) {
      onSelectCategory(catName);
      return;
    }
    router.push(
      "/search?category=" + encodeURIComponent(catName.toLowerCase()) + "&filterOpen=true"
    );
  };

  return (
    <div
      id={id}
      className={`grid transition-[grid-template-rows,opacity] duration-400 ease-in-out ${
        isOpen
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0 pointer-events-none"
      } ${className}`}
      aria-hidden={!isOpen}
    >
      <div className="overflow-hidden">
        <div className="p-3.5 sm:p-5 my-2 sm:my-3 border-y border-border/60 bg-secondary/15 dark:bg-card/30 rounded-2xl shadow-xs">
          
          {/* ═══════════════════════════════════════════════════════════════════
              ROW 1: AUDIENCE
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-[13px] font-sans font-bold uppercase tracking-wider text-muted-foreground text-left">
              AUDIENCE
            </h3>

            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap sm:flex-nowrap">
              {AUDIENCES.map(({ key, label, Icon }) => {
                const isSelected = selectedAudiences.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleAudienceClick(key)}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4.5 rounded-xl border transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-sans font-bold uppercase tracking-wider min-h-[38px] sm:min-h-[42px] ${
                      isSelected
                        ? "bg-foreground text-background border-foreground shadow-xs font-bold"
                        : "bg-card text-foreground/80 hover:text-foreground border-border/80 hover:border-foreground/40 shadow-2xs"
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Audience: ${label}`}
                  >
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" strokeWidth={isSelected ? 2.2 : 1.75} />
                    <span className="leading-none whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DIVIDER 1 */}
          <div className="my-3 sm:my-3.5 border-t border-border/50" />

          {/* ═══════════════════════════════════════════════════════════════════
              ROW 2: DESIGN TYPE
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-[13px] font-sans font-bold uppercase tracking-wider text-muted-foreground text-left">
              DESIGN TYPE
            </h3>

            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap sm:flex-nowrap">
              {DESIGN_TYPES.map(({ value, display, fullLabel }) => {
                const isSelected =
                  selectedDesignTypes.includes(value) ||
                  (value === "MASTER COPY" && selectedDesignTypes.includes("REPLICA"));
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleDesignTypeClick(value)}
                    className={`flex items-center justify-center py-2 px-4 sm:px-6 rounded-xl border transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-sans font-bold uppercase tracking-wider min-h-[38px] sm:min-h-[42px] ${
                      isSelected
                        ? "bg-foreground text-background border-foreground shadow-xs font-bold"
                        : "bg-card text-foreground/80 hover:text-foreground border-border/80 hover:border-foreground/40 shadow-2xs"
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Design Type: ${fullLabel}`}
                    title={`Design Type: ${fullLabel}`}
                  >
                    <span className="leading-none whitespace-nowrap">{display}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DIVIDER 2 */}
          <div className="my-3 sm:my-3.5 border-t border-border/50" />

          {/* ═══════════════════════════════════════════════════════════════════
              ROW 3: PRODUCT CATEGORIES
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-2.5">
            <h3 className="text-xs sm:text-[13px] font-sans font-bold uppercase tracking-wider text-muted-foreground text-left">
              PRODUCT CATEGORIES
            </h3>

            <div
              role="region"
              aria-label="Product Categories"
              className="max-h-[340px] sm:max-h-[400px] overflow-y-auto pr-1 no-scrollbar"
            >
              <div className={PRODUCT_CATEGORY_GRID_CLASSES}>
                {detailedCategories.map((category) => {
                  const isSelected = selectedCategories.includes(category.name);
                  return (
                    <ProductCategoryTile
                      key={category.id}
                      category={category}
                      variant="compact"
                      isActive={isSelected}
                      onClick={() => handleCategoryClick(category.name)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
