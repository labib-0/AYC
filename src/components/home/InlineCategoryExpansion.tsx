"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { categoryService, CategoryModel } from "@/services/category.service";
import { CategoryCard } from "./CategoryHighlights";

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

interface InlineCategoryExpansionProps {
  isOpen: boolean;
  className?: string;
}

export default function InlineCategoryExpansion({
  isOpen,
  className = "",
}: InlineCategoryExpansionProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryModel[]>(() => cachedCategories || []);

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

  const detailedCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        !AUDIENCE_IDS.has(String(c.id).toLowerCase()) &&
        !AUDIENCE_IDS.has(String(c.slug || "").toLowerCase()) &&
        !AUDIENCE_NAMES.has((c.name || "").toUpperCase()) &&
        c.is_active !== false
    );
  }, [categories]);

  const handleCategoryClick = (catName: string) => {
    router.push(
      "/search?category=" + encodeURIComponent(catName.toLowerCase()) + "&filterOpen=true"
    );
  };

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
        isOpen
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0 pointer-events-none"
      } ${className}`}
      aria-hidden={!isOpen}
    >
      <div className="overflow-hidden">
        <div className="pt-3.5 pb-4 sm:pt-4 sm:pb-5 my-2 sm:my-3 border-t border-b border-border/60">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 2xl:grid-cols-16 gap-1.5 sm:gap-2">
            {detailedCategories.map((category) => (
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
                isActive={false}
                onClick={() => handleCategoryClick(category.name)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
