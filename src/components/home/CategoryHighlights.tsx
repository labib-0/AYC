
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <section id="categories" className="pt-1 sm:pt-1.5 pb-2.5 sm:pb-3.5 bg-background">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        
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
            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-[repeat(16,minmax(0,1fr))] min-[1800px]:grid-cols-[repeat(18,minmax(0,1fr))] gap-1 sm:gap-1.5">
              {detailedCategories.map((category) => (
                <CategoryCard 
                  key={category.id} 
                  category={{ 
                    id: String(category.id),
                    name: category.name,
                    slug: category.slug || String(category.id),
                    image: category.image_url || category.image || "/categories/default.jpg"
                  }} 
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
  href?: string;
  variant?: "primary" | "compact";
  isActive?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
}

export function CategoryCard({
  category,
  href,
  variant = "primary",
  isActive = false,
  onClick,
}: CategoryCardProps) {
  const isPrimary = variant === "primary";

  const cardClasses = `group relative overflow-hidden transition-all duration-200 block w-full text-left cursor-pointer ${
    isPrimary
      ? "aspect-[16/10] rounded-xl sm:rounded-2xl border"
      : "aspect-[4/3] rounded-lg sm:rounded-xl border"
  } ${
    isActive
      ? "border-foreground ring-1.5 ring-foreground shadow-xs scale-[1.02]"
      : "border-border/80 hover:border-foreground/40 shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
  }`;

  const innerContent = (
    <>
      {/* Background Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={category.image}
        alt={`Wholesale ${category.name} apparel collection`}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
          category.imageClass || "object-center"
        }`}
      />

      {/* Subtle Gradient Overlay for Text Legibility */}
      <div
        className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 ${
          isPrimary
            ? "from-black/80 via-black/25 to-black/5 group-hover:from-black/85"
            : "from-black/85 via-black/25 to-transparent group-hover:from-black/90"
        } ${isActive ? "from-black/90 via-black/35" : ""}`}
      />

      {/* Active Selection Checkmark Badge */}
      {isActive && (
        <div className={`absolute rounded-full bg-foreground text-background flex items-center justify-center shadow-xs animate-in zoom-in-75 ${
          isPrimary
            ? "top-2 right-2 sm:top-2.5 sm:right-2.5 w-5 h-5 sm:w-5.5 sm:h-5.5"
            : "top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-4.5 sm:h-4.5"
        }`}>
          <Check size={isPrimary ? 11 : 10} strokeWidth={isPrimary ? 3 : 2.5} className={isPrimary ? "sm:w-3 sm:h-3" : "sm:w-2.5 sm:h-2.5"} />
        </div>
      )}

      {/* Category Content */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col justify-end ${
          isPrimary ? "p-2.5 sm:p-3.5" : "p-1.5 sm:p-2.5"
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <h3
            className={`font-sans font-bold uppercase tracking-tight text-white ${
              isPrimary
                ? "text-xs sm:text-sm md:text-base leading-tight font-display"
                : "text-[10.5px] sm:text-[11.5px] md:text-[12px] leading-tight line-clamp-1"
            }`}
            title={category.name}
          >
            {category.name}
          </h3>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClasses} onClick={onClick} title={category.name}>
        {innerContent}
      </Link>
    );
  }

  return (
    <button type="button" className={cardClasses} onClick={onClick} title={category.name}>
      {innerContent}
    </button>
  );
}
