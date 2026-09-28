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

  // Filter out any audience items to keep pure product categories
  const productCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        !AUDIENCE_IDS.has(String(c.id).toLowerCase()) &&
        !AUDIENCE_IDS.has(String(c.slug || "").toLowerCase()) &&
        !AUDIENCE_NAMES.has((c.name || "").toUpperCase()) &&
        c.is_active !== false
    );
  }, [categories]);

  return (
    <section
      id="categories"
      className="pt-1 sm:pt-1.5 pb-2 sm:pb-3 bg-background scroll-mt-20 select-none"
      aria-label="Product Categories"
    >
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        {/* Section Heading */}
        <div className="mb-2 sm:mb-2.5 text-left flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-foreground leading-tight">
              CATEGORIES
            </h2>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5 sm:mt-1 font-sans leading-normal">
              Explore wholesale &amp; retail apparel by product category
            </p>
          </div>
        </div>

        {/* Text-Only Category Pills / Rounded Boxes */}
        {isLoading ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 animate-pulse">
            {[80, 110, 95, 125, 75, 100, 130, 90, 115, 85, 105, 120].map((width, idx) => (
              <div
                key={idx}
                className="h-9 sm:h-10 bg-secondary/60 rounded-xl"
                style={{ width: `${width}px` }}
              />
            ))}
          </div>
        ) : productCategories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5" role="list">
            {productCategories.map((cat) => {
              const categoryName = cat.name.trim();
              const categoryParam = encodeURIComponent(categoryName.toLowerCase());
              return (
                <Link
                  key={cat.id || cat.slug || categoryName}
                  href={`/search?category=${categoryParam}&filterOpen=true`}
                  role="listitem"
                  title={`Browse ${categoryName}`}
                  aria-label={`Browse ${categoryName} category`}
                  className="group inline-flex items-center justify-center px-3.5 py-2 sm:px-4.5 sm:py-2.5 rounded-xl border border-slate-900/20 dark:border-white/20 bg-card/90 dark:bg-card/60 hover:bg-secondary/70 dark:hover:bg-secondary/60 hover:border-slate-900/60 dark:hover:border-white/60 text-foreground/85 hover:text-foreground text-[11px] sm:text-[12.5px] font-sans font-bold uppercase tracking-wider leading-none shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 cursor-pointer text-center min-h-[36px] sm:min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
