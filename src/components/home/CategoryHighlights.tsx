
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { categoryService, CategoryModel } from "@/services/category.service";
import { AudienceTiles } from "@/components/common/AudienceCard";
import { Check } from "lucide-react";

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
    <section id="categories" className="pt-1.5 sm:pt-2 pb-4 sm:pb-5 bg-background">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        
        {/* AUDIENCE Section Title */}
        <div className="mb-2.5 sm:mb-3.5 text-center md:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 sm:gap-2">
          <div>
            <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight">AUDIENCE</h2>
            <p className="section-subtitle mt-1 sm:mt-1.5">
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
            isExpanded ? "grid-rows-[1fr] opacity-100 mt-6 pt-5 border-t border-border/60" : "grid-rows-[0fr] opacity-0 mt-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 2xl:grid-cols-16 gap-1.5 sm:gap-2">
              {detailedCategories.map((category) => (
                <CategoryCard 
                  key={category.id} 
                  category={{ 
                    id: String(category.id),
                    name: category.name,
                    slug: category.slug || String(category.id),
                    image: category.image_url || category.image || "/categories/default.jpg"
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
    </section>
  );
}

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    image: string;
    description?: string;
    imageClass?: string;
  };
  variant?: "primary" | "compact";
  isActive?: boolean;
  onClick?: () => void;
}

export function CategoryCard({
  category,
  variant = "primary",
  isActive = false,
  onClick,
}: CategoryCardProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-300 block w-full text-left cursor-pointer ${
        isPrimary ? "aspect-[16/10]" : "aspect-[4/3]"
      } ${
        isActive
          ? "border-foreground ring-2 ring-foreground shadow-lg scale-[1.02]"
          : "border-border hover:border-foreground/40 shadow-xs hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Background Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={category.image}
        alt={category.name}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
          category.imageClass || "object-center"
        }`}
      />

      {/* Subtle Gradient Overlay for Text Legibility */}
      <div
        className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 ${
          isPrimary
            ? "from-black/80 via-black/25 to-black/5 group-hover:from-black/85"
            : "from-black/80 via-black/25 to-black/5 group-hover:from-black/90"
        } ${isActive ? "from-black/90 via-black/35" : ""}`}
      />

      {/* Active Selection Checkmark Badge */}
      {isActive && (
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-foreground text-background flex items-center justify-center shadow-md animate-in zoom-in-75">
          <Check size={11} strokeWidth={3} className="sm:w-3 sm:h-3" />
        </div>
      )}

      {/* Category Content */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col justify-end ${
          isPrimary ? "p-2.5 sm:p-3.5" : "p-2 sm:p-2.5"
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <h3
            className={`font-display font-bold uppercase tracking-tight text-white ${
              isPrimary
                ? "text-xs sm:text-sm md:text-base leading-tight"
                : "text-[11px] sm:text-xs font-semibold leading-tight"
            }`}
          >
            {category.name}
          </h3>
        </div>
      </div>
    </button>
  );
}
