"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { categoryService, CategoryModel } from "@/services/category.service";

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

function normalizeCategoryLabel(name: string): string {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "sweter" || lower === "sweater") return "Sweaters";
  if (lower === "sportwear") return "Sportswear";
  if (lower === "trouser" || lower === "trousers-1") return "Trousers";
  if (lower === "bodycon") return "Bodycon";
  if (lower === "long pant") return "Long Pants";
  if (lower === "long dress") return "Long Dress";
  if (lower === "knit top") return "Knit Tops";
  if (lower === "winter sets") return "Winter Sets";
  if (lower === "women's dresses") return "Women's Dresses";
  if (lower === "caps / hats") return "Caps / Hats";
  if (lower === "2 pc sets") return "2 pc Sets";
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
  return trimmed;
}

export default function CategoriesSection() {
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        const cats = await categoryService.getCategories({ is_active: true, all: true });
        if (isMounted) {
          setCategories(cats || []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load storefront categories:", err);
        if (isMounted) {
          setCategories([]);
          setIsLoading(false);
        }
      }
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

  // Filter out any audience items, consolidate labels, and sort cleanly
  const productCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ id: string | number; name: string; sort_order: number }> = [];

    for (const c of categories) {
      if (
        AUDIENCE_IDS.has(String(c.id).toLowerCase()) ||
        AUDIENCE_IDS.has(String(c.slug || "").toLowerCase()) ||
        AUDIENCE_NAMES.has((c.name || "").toUpperCase()) ||
        c.is_active === false
      ) {
        continue;
      }
      const rawName = (c.name || "").trim();
      if (!rawName) continue;
      const cleanLabel = normalizeCategoryLabel(rawName);
      const norm = cleanLabel.toLowerCase();
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);

      list.push({
        id: c.id,
        name: cleanLabel,
        sort_order: c.landing_sort_order ?? c.sort_order ?? 99,
      });
    }

    // Sort by sort_order ascending, then alphabetical by name
    return list.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  return (
    <section
      id="categories"
      className="pt-1.5 sm:pt-2 pb-2.5 sm:pb-3.5 bg-background scroll-mt-20 select-none"
      aria-label="Product Categories"
    >
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        {/* Section Heading */}
        <div className="mb-2 sm:mb-2.5 text-left flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <div>
            <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight text-foreground leading-none">
              CATEGORIES
            </h2>
          </div>
        </div>

        {/* Text-Only Category Pills / Rounded Boxes */}
        {isLoading ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1 animate-pulse">
            {[80, 110, 95, 125, 75, 100, 130, 90, 115, 85, 105, 120].map((width, idx) => (
              <div
                key={idx}
                className="h-9 sm:h-10 bg-secondary/60 rounded-xl"
                style={{ width: `${width}px` }}
              />
            ))}
          </div>
        ) : productCategories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-0.5" role="list">
            {/* ALL CATEGORIES Pill - Elevated Primary Hierarchy */}
            <Link
              href="/search?filterOpen=true"
              role="listitem"
              title="Browse all categories"
              aria-label="Browse all categories"
              className="group inline-flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-foreground bg-foreground text-background hover:bg-foreground/90 text-[11px] sm:text-[12px] font-sans font-bold uppercase tracking-wider leading-none shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 cursor-pointer text-center min-h-[38px] sm:min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="whitespace-nowrap">ALL CATEGORIES</span>
            </Link>

            {productCategories.map((cat) => {
              const categoryName = cat.name.trim();
              const categoryParam = encodeURIComponent(categoryName.toLowerCase());
              return (
                <Link
                  key={cat.id || categoryName}
                  href={`/search?category=${categoryParam}&filterOpen=true`}
                  role="listitem"
                  title={`Browse ${categoryName}`}
                  aria-label={`Browse ${categoryName} category`}
                  className="group inline-flex items-center justify-center px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl border border-border/80 bg-card hover:bg-secondary/70 hover:border-foreground/30 text-foreground/85 hover:text-foreground text-[11px] sm:text-[12px] font-sans font-medium tracking-normal leading-none shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 cursor-pointer text-center min-h-[38px] sm:min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="whitespace-nowrap">{categoryName}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
