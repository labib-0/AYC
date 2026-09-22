"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { CategoryCard } from "./CategoryHighlights";
import ProductCard from "../product/ProductCard";
import { INITIAL_MOCK_PRODUCTS } from "@/lib/mock-data/mock-products";
import { Product } from "@/types";
import { getProducts, toStorefrontProduct } from "@/lib/services/products";
import {
  AUDIENCE_CATEGORIES,
  filterProducts,
  getProductColor,
} from "@/lib/filters";
import { Sparkles, Check, X, Filter, RotateCcw } from "lucide-react";
import HorizontalCarousel from "@/components/common/HorizontalCarousel";
import {
  IconMen,
  IconWomen,
  IconBoys,
  IconGirls,
  IconUnisex,
} from "@/components/common/AudienceIcons";

type HotSalesCategory = "sweaters" | "towels" | null;

const hotSalesCategories = [
  {
    id: "hot-sweaters",
    name: "SWEATERS",
    slug: "sweaters",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800",
    description: "Premium warm knitwear and stylish sweaters on sale.",
  },
  {
    id: "hot-towels",
    name: "TOWELS",
    slug: "towels",
    image: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&q=80&w=800",
    description: "Ultra-absorbent luxury bath and hand towels on special discount.",
  },
];

const AUDIENCE_FILTERS = [
  { id: "MEN", label: "MEN", categoryId: "c_men", icon: IconMen },
  { id: "WOMEN", label: "WOMEN", categoryId: "c_women", icon: IconWomen },
  { id: "BOYS", label: "BOYS", categoryId: "c_boys", icon: IconBoys },
  { id: "GIRLS", label: "GIRLS", categoryId: "c_girls", icon: IconGirls },
  { id: "UNISEX", label: "UNISEX", categoryId: "c_unisex", icon: IconUnisex },
];

export default function HotSales() {
  const [activeCategory, setActiveCategory] = useState<HotSalesCategory>(null);
  
  // Sweaters specific filters: Audience
  const [sweaterAudiences, setSweaterAudiences] = useState<string[]>([]);
  
  // Towels specific filters: Color
  const [towelColors, setTowelColors] = useState<string[]>(["ALL"]);

  const collectionSectionRef = useRef<HTMLDivElement>(null);
  const [allProducts, setAllProducts] = useState<Product[]>(() =>
    INITIAL_MOCK_PRODUCTS.map(toStorefrontProduct)
  );

  useEffect(() => {
    async function load() {
      const dbList = await getProducts();
      if (dbList && dbList.length > 0) {
        setAllProducts(dbList.map(toStorefrontProduct));
      }
    }
    load();
  }, []);

  // All towel products to extract available real colors
  const allTowelProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      return name.includes("towel") || sku.includes("-twl-");
    });
  }, [allProducts]);

  // Real available towel colors extracted from active dataset
  const availableTowelColors = useMemo(() => {
    const raw = allTowelProducts.map(getProductColor).filter(Boolean);
    return Array.from(new Set(raw));
  }, [allTowelProducts]);

  // Handle tile click (toggle active category)
  const handleTileClick = (cat: "sweaters" | "towels") => {
    if (activeCategory === cat) {
      setActiveCategory(null);
    } else {
      setActiveCategory(cat);
      setTimeout(() => {
        collectionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
    }
  };

  // Toggle sweater audience
  const handleSweaterAudienceToggle = (audId: string) => {
    setSweaterAudiences((prev) => {
      if (prev.includes(audId)) {
        return prev.filter((a) => a !== audId);
      } else {
        return [...prev, audId];
      }
    });
  };

  // Toggle towel color
  const handleTowelColorToggle = (colorName: string) => {
    if (colorName === "ALL") {
      setTowelColors(["ALL"]);
      return;
    }

    setTowelColors((prev) => {
      const withoutAll = prev.filter((c) => c !== "ALL");
      if (withoutAll.includes(colorName)) {
        const next = withoutAll.filter((c) => c !== colorName);
        return next.length === 0 ? ["ALL"] : next;
      } else {
        return [...withoutAll, colorName];
      }
    });
  };

  // Reset filters for current active category
  const handleClearFilters = () => {
    if (activeCategory === "sweaters") {
      setSweaterAudiences([]);
    } else if (activeCategory === "towels") {
      setTowelColors(["ALL"]);
    }
  };

  // Dynamic Collection Title
  const collectionTitle = useMemo(() => {
    if (activeCategory === "sweaters") {
      if (sweaterAudiences.length === 0) {
        return "SWEATERS";
      }
      if (sweaterAudiences.length === 1) {
        const aud = sweaterAudiences[0];
        if (aud === "MEN") return "MEN'S SWEATERS";
        if (aud === "WOMEN") return "WOMEN'S SWEATERS";
        if (aud === "BOYS") return "BOYS' SWEATERS";
        if (aud === "GIRLS") return "GIRLS' SWEATERS";
        return `${aud} SWEATERS`;
      }
      return `${sweaterAudiences.join(" + ")} SWEATERS`;
    }

    if (activeCategory === "towels") {
      const specificColors = towelColors.filter((c) => c !== "ALL");
      if (specificColors.length === 0) {
        return "TOWELS";
      }
      if (specificColors.length === 1) {
        return `${specificColors[0].toUpperCase()} TOWELS`;
      }
      return `${specificColors.map((c) => c.toUpperCase()).join(" + ")} TOWELS`;
    }

    return "HOT SALES COLLECTION";
  }, [activeCategory, sweaterAudiences, towelColors]);

  // Filtered Products for the active Hot Sales category
  const filteredProducts = useMemo(() => {
    if (activeCategory === "sweaters") {
      return filterProducts({
        products: allProducts,
        categoryNames: ["Sweaters"],
        audienceIds: sweaterAudiences,
      });
    }

    if (activeCategory === "towels") {
      return filterProducts({
        products: allProducts,
        categoryNames: ["Towels"],
        colors: towelColors,
      });
    }

    return [];
  }, [activeCategory, allProducts, sweaterAudiences, towelColors]);

  const hasActiveFilters =
    (activeCategory === "sweaters" && sweaterAudiences.length > 0) ||
    (activeCategory === "towels" && !towelColors.includes("ALL") && towelColors.length > 0);

  return (
    <section id="hot-sales" className="pb-7 sm:pb-9 bg-background scroll-mt-20">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        
        {/* Section Heading */}
        <div className="mb-3.5 sm:mb-5 text-center md:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight">HOT SALES</h2>
            <p className="section-subtitle mt-1 sm:mt-1.5">
              Limited-run deals on seasonal knitwear and luxury textiles
            </p>
          </div>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="inline-flex items-center gap-1 text-xs font-sans font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors self-center sm:self-auto cursor-pointer"
            >
              <X size={13} />
              Close View
            </button>
          )}
        </div>
        
        {/* 
          Hot Sales Tiles (exact compact category tile geometry matching expanded category grid)
        */}
        <HorizontalCarousel trackClassName="gap-2.5 sm:gap-3.5 pb-2 pt-1">
          {hotSalesCategories.map((category) => (
            <div key={category.id} className="w-[calc(50%-5px)] sm:w-[calc(25%-9px)] md:w-[calc(16.666%-10px)] lg:w-[calc(12.5%-11px)] shrink-0 snap-start">
              <CategoryCard
                category={category}
                variant="compact"
                isActive={activeCategory === category.slug}
                onClick={() => handleTileClick(category.slug as any)}
              />
            </div>
          ))}
        </HorizontalCarousel>

        {/* 
          HOT SALES COLLECTION SHOWCASE & CONTEXTUAL FILTERS
          - SWEATERS: Audience filter (MEN, WOMEN, BOYS, GIRLS, UNISEX)
          - TOWELS: Color filter (ALL, White, Grey, Beige, Blue, Black)
        */}
        {activeCategory && (
          <div
            ref={collectionSectionRef}
            className="mt-12 pt-8 border-t border-border/70 animate-in fade-in duration-300"
          >
            {/* COLLECTION TITLE & COUNT */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight">
                    {collectionTitle}
                  </h3>
                  <Sparkles size={16} className="text-primary hidden sm:inline-block" />
                </div>
                <p className="section-subtitle mt-1 sm:mt-1.5">
                  {activeCategory === "sweaters"
                    ? "Cozy seasonal knitwear, cardigans, and pullovers"
                    : "Ultra-absorbent luxury cotton bath sheets, spa, and hand towels"}
                </p>
              </div>

              {/* Product Count Indicator */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-3.5 py-1.5 rounded-full bg-secondary text-foreground text-xs font-bold uppercase tracking-wider border border-border">
                  {filteredProducts.length} Product{filteredProducts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* CONTEXTUAL FILTER CONTAINER */}
            <div className="bg-secondary/40 border border-border/60 rounded-2xl p-4 sm:p-5 mb-8 space-y-3 shadow-sm">
              
              {/* SWEATERS CONTEXT: AUDIENCE FILTER PILLS */}
              {activeCategory === "sweaters" && (
                <div className="flex flex-col gap-2">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
                    AUDIENCE:
                  </span>
                  <div className="overflow-x-auto no-scrollbar py-1">
                    <div className="flex items-center gap-2 min-w-max">
                      {AUDIENCE_FILTERS.map((aud) => {
                        const Icon = aud.icon;
                        const isSelected = sweaterAudiences.includes(aud.id);

                        return (
                          <button
                            key={aud.id}
                            type="button"
                            onClick={() => handleSweaterAudienceToggle(aud.id)}
                            className={`inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/[0.08] text-primary ring-1 ring-primary/30 shadow-xs font-bold"
                                : "bg-card hover:bg-secondary/70 text-foreground/80 hover:text-foreground border border-border/80 hover:border-foreground/30 shadow-2xs"
                            }`}
                          >
                            <span>{aud.label}</span>
                            <Icon size={17} strokeWidth={1.35} className={`shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TOWELS CONTEXT: COLOR FILTER PILLS */}
              {activeCategory === "towels" && (
                <div className="flex flex-col gap-2">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
                    COLOR:
                  </span>
                  <div className="overflow-x-auto no-scrollbar py-1">
                    <div className="flex items-center gap-2 min-w-max">
                      {/* ALL Option */}
                      <button
                        type="button"
                        onClick={() => handleTowelColorToggle("ALL")}
                        className={`px-3.5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                          towelColors.includes("ALL")
                            ? "bg-foreground text-background shadow-sm ring-1 ring-foreground"
                            : "bg-card hover:bg-card/80 text-foreground/80 border border-border/80 hover:border-foreground/40"
                        }`}
                      >
                        ALL
                      </button>

                      {/* Real Available Colors */}
                      {availableTowelColors.map((colorName) => {
                        const isSelected = towelColors.includes(colorName);

                        return (
                          <button
                            key={colorName}
                            type="button"
                            onClick={() => handleTowelColorToggle(colorName)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? "bg-foreground text-background shadow-sm ring-1 ring-foreground"
                                : "bg-card hover:bg-card/80 text-foreground/80 border border-border/80 hover:border-foreground/40"
                            }`}
                          >
                            <span>{colorName}</span>
                            {isSelected && <Check size={12} strokeWidth={3} className="ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Active Filter Badges & Reset Trigger */}
              {hasActiveFilters && (
                <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium mr-1">Active filters:</span>

                  {/* Sweater Audience Badges */}
                  {activeCategory === "sweaters" &&
                    sweaterAudiences.map((aud) => (
                      <span
                        key={`badge-swt-${aud}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-foreground font-semibold"
                      >
                        <span>{aud}</span>
                        <button
                          type="button"
                          onClick={() => handleSweaterAudienceToggle(aud)}
                          className="hover:text-destructive transition-colors ml-0.5 p-0.5"
                          title={`Remove ${aud}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}

                  {/* Towel Color Badges */}
                  {activeCategory === "towels" &&
                    !towelColors.includes("ALL") &&
                    towelColors.map((col) => (
                      <span
                        key={`badge-twl-${col}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-foreground font-semibold"
                      >
                        <span>{col}</span>
                        <button
                          type="button"
                          onClick={() => handleTowelColorToggle(col)}
                          className="hover:text-destructive transition-colors ml-0.5 p-0.5"
                          title={`Remove ${col}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}

                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-xs font-bold text-destructive hover:underline ml-2 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* PRODUCT GRID / EMPTY STATE */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1440px]:grid-cols-6 2xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border/70 rounded-2xl p-8 sm:p-14 text-center max-w-lg mx-auto my-6 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-secondary/80 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <Filter size={24} />
                </div>
                <h4 className="text-lg font-bold font-display uppercase mb-2">
                  No Products Found
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                  No {activeCategory} match your selected filter criteria. Try clearing or changing your filters.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-6 py-2.5 bg-foreground text-background text-xs font-semibold uppercase tracking-wider rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
