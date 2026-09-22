"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { categoryService, CategoryModel } from "@/services/category.service";
import { mockStore } from "@/lib/mock-data/mock-store";
import { CategoryCard } from "./CategoryHighlights";
import {
  IconMen,
  IconWomen,
  IconBoys,
  IconGirls,
  IconUnisex,
} from "@/components/common/AudienceIcons";

let cachedCategories: CategoryModel[] | null = null;
let fetchPromise: Promise<CategoryModel[]> | null = null;

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
  { value: "MASTER COPY", display: "MC", fullLabel: "Master Copy" },
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
 * Visual Hierarchy (Phase 23B):
 * ROW 1: AUDIENCE (left)                                   DESIGN TYPE (right)
 * ROW 2: [ MEN ][ WOMEN ][ BOYS ][ GIRLS ][ UNISEX ]        [ ORIGINAL ][ MC ]
 * ─────────────────────────────────────────────────────────────────────────────
 * ROW 3: PRODUCT CATEGORIES
 * ROW 4: [ Dynamic Category Tiles... ]
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

  // Instant render from cache or mock store
  const [categories, setCategories] = useState<CategoryModel[]>(() => {
    if (cachedCategories && cachedCategories.length > 0) return cachedCategories;
    try {
      const mockCats = mockStore.getCategories();
      if (mockCats && mockCats.length > 0) {
        cachedCategories = mockCats;
        return mockCats;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  useEffect(() => {
    if (cachedCategories && cachedCategories.length > 0) {
      setCategories(cachedCategories);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = categoryService.getCategories();
    }

    fetchPromise
      .then((cats) => {
        if (cats && cats.length > 0) {
          cachedCategories = cats;
          setCategories(cats);
        }
      })
      .catch((err) => {
        console.error("Failed to load storefront categories:", err);
      });
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
        <div className="pt-3 pb-3.5 sm:pt-3.5 sm:pb-4 my-2 sm:my-2.5 border-y border-border/60 bg-secondary/10 dark:bg-card/25 rounded-2xl px-3 sm:px-4 shadow-2xs">
          
          {/* ═══════════════════════════════════════════════════════════════════
              ROW 1: SECTION HEADERS (AUDIENCE left, DESIGN TYPE right)
              ROW 2: FILTER CONTROLS (5 Audience left, 2 Design Type right)
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-2 mb-3">
            
            {/* ROW 1: AUDIENCE Header (Left) */}
            <div className="order-1 text-left">
              <h3 className="text-[12px] sm:text-[13px] font-sans font-bold uppercase tracking-wider text-muted-foreground">
                AUDIENCE
              </h3>
            </div>

            {/* ROW 1: DESIGN TYPE Header (Right) */}
            <div className="order-3 sm:order-2 text-left sm:text-right">
              <h3 className="text-[12px] sm:text-[13px] font-sans font-bold uppercase tracking-wider text-muted-foreground">
                DESIGN TYPE
              </h3>
            </div>

            {/* ROW 2: AUDIENCE Controls (Left — 5 Compact Tiles in 1 horizontal row) */}
            <div className="order-2 sm:order-3 flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
              {AUDIENCES.map(({ key, label, Icon }) => {
                const isSelected = selectedAudiences.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleAudienceClick(key)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-lg border transition-all duration-150 cursor-pointer select-none text-[11px] sm:text-[12px] font-sans font-bold uppercase tracking-wider min-h-[36px] sm:min-h-[38px] ${
                      isSelected
                        ? "bg-foreground text-background border-foreground shadow-2xs font-bold"
                        : "bg-card text-muted-foreground hover:text-foreground border-slate-900/25 dark:border-white/25 hover:border-slate-900/60 dark:hover:border-white/60 shadow-2xs"
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Audience: ${label}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={isSelected ? 2.2 : 1.75} />
                    <span className="leading-none whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* ROW 2: DESIGN TYPE Controls (Right — 2 Compact Tiles Right-aligned) */}
            <div className="order-4 flex items-center justify-start sm:justify-end gap-1.5 sm:gap-2">
              {DESIGN_TYPES.map(({ value, display, fullLabel }) => {
                const isSelected =
                  selectedDesignTypes.includes(value) ||
                  (value === "MASTER COPY" && selectedDesignTypes.includes("REPLICA"));
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleDesignTypeClick(value)}
                    className={`flex items-center justify-center py-1.5 px-3 sm:px-3.5 rounded-lg border transition-all duration-150 cursor-pointer select-none text-[11px] sm:text-[12px] font-sans font-extrabold uppercase tracking-wider min-h-[36px] sm:min-h-[38px] ${
                      isSelected
                        ? "bg-foreground text-background border-foreground shadow-2xs font-bold"
                        : "bg-card text-muted-foreground hover:text-foreground border-slate-900/25 dark:border-white/25 hover:border-slate-900/60 dark:hover:border-white/60 shadow-2xs"
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

          {/* ═══════════════════════════════════════════════════════════════════
              DIVIDER
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="my-2.5 sm:my-3 border-t border-border/40" />

          {/* ═══════════════════════════════════════════════════════════════════
              ROW 3: CATEGORY HEADER (PRODUCT CATEGORIES)
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[12px] sm:text-[13px] font-sans font-bold uppercase tracking-wider text-muted-foreground">
              PRODUCT CATEGORIES
            </h3>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              ROW 4+: CATEGORY TILES (Dynamic, with internal scrolling if large)
              ═══════════════════════════════════════════════════════════════════ */}
          <div
            role="region"
            aria-label="Product Categories"
            className="max-h-[360px] sm:max-h-[420px] overflow-y-auto pr-0.5 no-scrollbar"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 2xl:grid-cols-16 gap-1.5 sm:gap-2">
              {detailedCategories.map((category) => {
                const isSelected = selectedCategories.includes(category.name);
                return (
                  <CategoryCard
                    key={category.id}
                    category={{
                      id: String(category.id),
                      name: category.name,
                      slug: category.slug || String(category.id),
                      image:
                        category.image_url ||
                        category.image ||
                        "/categories/default.jpg",
                    }}
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
  );
}
