"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { categoryService, CategoryModel } from "@/services/category.service";
import { AudienceTiles } from "@/components/common/AudienceCard";
import {
  ProductCategoryTile,
  CategoryCard,
  PRODUCT_CATEGORY_GRID_CLASSES,
} from "@/components/common/ProductCategoryTile";

export { ProductCategoryTile, CategoryCard };
export type { ProductCategoryTileProps, ProductCategoryTileProps as CategoryCardProps } from "@/components/common/ProductCategoryTile";

export default function CategoryHighlights() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<CategoryModel[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const cats = await categoryService.getCategories();
        if (cats && cats.length > 0) {
          setDynamicCategories(cats);
        }
      } catch (err) {
        console.error("Failed to load storefront categories:", err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const handleExpandAllCategories = () => {
      setIsExpanded(true);
      setTimeout(() => {
        const prodCat = document.getElementById("product-categories-grid");
        if (prodCat) {
          prodCat.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
          const catSec = document.getElementById("categories");
          catSec?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    };

    window.addEventListener("expand-all-categories", handleExpandAllCategories);
    return () => window.removeEventListener("expand-all-categories", handleExpandAllCategories);
  }, []);

  const detailedCategories = useMemo(() => {
    const audienceIds = new Set(["c_men", "c_women", "c_boys", "c_girls", "c_unisex", "men", "women", "boys", "girls", "unisex"]);
    const audienceNames = new Set(["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"]);

    const productOnlyCats = dynamicCategories.filter(
      (c) =>
        !audienceIds.has(String(c.id).toLowerCase()) &&
        !audienceIds.has(String(c.slug || "").toLowerCase()) &&
        !audienceNames.has((c.name || "").toUpperCase()) &&
        c.is_active !== false
    );

    return productOnlyCats;
  }, [dynamicCategories]);

  const handleAudienceToggle = (audienceName: string) => {
    router.push("/search?audience=" + audienceName.toLowerCase() + "&filterOpen=true");
  };

  const handleCategoryClick = (catName: string) => {
    router.push("/search?category=" + encodeURIComponent(catName.toLowerCase()) + "&filterOpen=true");
  };

  return (
    <section id="categories" className="pt-1 sm:pt-1.5 pb-2.5 sm:pb-3.5 bg-background">
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        
        {/* AUDIENCE Section Title */}
        <div className="mb-2 sm:mb-2.5 text-left flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-foreground leading-tight">
              AUDIENCE
            </h2>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5 sm:mt-1 font-sans leading-normal">
              Select one or multiple audiences to explore tailored collections
            </p>
          </div>
        </div>

        {/* Clean Icon-Based Audience Tiles (+ ALL CATEGORIES 6th tile on mobile/tablet) */}
        <AudienceTiles
          selectedAudiences={[]}
          onToggle={handleAudienceToggle}
          isAllCategoriesOpen={isExpanded}
          onToggleAllCategories={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded) {
              setTimeout(() => {
                const prodCat = document.getElementById("product-categories-grid");
                prodCat?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }, 100);
            }
          }}
        />

        {/* Expanded Detailed Categories Grid (toggled by clicking the 6th ALL CATEGORIES tile) */}
        <div
          id="product-categories-grid"
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
            isExpanded ? "grid-rows-[1fr] opacity-100 mt-3 pt-2.5 border-t border-border/60" : "grid-rows-[0fr] opacity-0 mt-0"
          }`}
        >
          <div className="overflow-hidden">
            <div
              role="region"
              aria-label="Product Categories"
              className="max-h-[340px] sm:max-h-[400px] overflow-y-auto pr-1 no-scrollbar"
            >
              <div className={PRODUCT_CATEGORY_GRID_CLASSES}>
                {detailedCategories.map((category) => (
                  <ProductCategoryTile 
                    key={category.id} 
                    category={category} 
                    href={`/search?category=${encodeURIComponent(category.name)}`}
                    variant="compact"
                    isActive={false}
                    onClick={() => handleCategoryClick(category.name)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
