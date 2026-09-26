"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ProductCategoryTile } from "@/components/common/ProductCategoryTile";
import { getCategoryImageUrl } from "@/lib/category-images";
import ProductCard from "../product/ProductCard";
import { Product } from "@/types";
import { getProducts, toStorefrontProduct } from "@/lib/services/products";
import {
  filterProducts,
} from "@/lib/filters";
import {
  Sparkles,
  X,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Loader2,
} from "lucide-react";
import HorizontalCarousel from "@/components/common/HorizontalCarousel";
import {
  IconMen,
  IconWomen,
  IconBoys,
  IconGirls,
  IconUnisex,
} from "@/components/common/AudienceIcons";
import GlobalFilterRail from "@/components/common/GlobalFilterRail";
import { brandService, BrandModel } from "@/services/brand.service";
import { categoryService, CategoryModel } from "@/services/category.service";
import {
  notifyExplorerActive,
  subscribeToExplorerActive,
} from "@/lib/services/explorer-coordinator";
import { homepageService } from "@/services/homepage.service";

export interface HotSaleCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
}

export const AUDIENCE_FILTERS = [
  { id: "MEN", label: "MEN", categoryId: "c_men", icon: IconMen },
  { id: "WOMEN", label: "WOMEN", categoryId: "c_women", icon: IconWomen },
  { id: "BOYS", label: "BOYS", categoryId: "c_boys", icon: IconBoys },
  { id: "GIRLS", label: "GIRLS", categoryId: "c_girls", icon: IconGirls },
  { id: "UNISEX", label: "UNISEX", categoryId: "c_unisex", icon: IconUnisex },
];

const INITIAL_PRODUCT_LIMIT = 21;
const LOAD_MORE_BATCH_LIMIT = 21;

export default function HotSales() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Unified Filter State for all Hot Sale products
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedDesignTypes, setSelectedDesignTypes] = useState<string[]>([]);

  // Pagination & Display State (Max 21 Initial Products)
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_PRODUCT_LIMIT);
  const [hasLoadedMore, setHasLoadedMore] = useState<boolean>(false);
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Metadata for filter options
  const [availableBrands, setAvailableBrands] = useState<BrandModel[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryModel[]>([]);

  const collectionSectionRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function load() {
      const dbList = await getProducts();
      if (dbList && dbList.length > 0) {
        setAllProducts(dbList.map(toStorefrontProduct));
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [brandsData, categoriesData] = await Promise.all([
          brandService.getBrands(),
          categoryService.getCategories(),
        ]);
        if (brandsData && brandsData.length > 0) {
          setAvailableBrands(brandsData);
        }
        if (categoriesData && categoriesData.length > 0) {
          setAvailableCategories(categoriesData);
        }
      } catch {
        // Fallbacks preserved gracefully
      }
    }
    loadMetadata();
  }, []);

  const [curatedCategories, setCuratedCategories] = useState<HotSaleCategory[]>([]);

  // Synchronize Hot Sale categories from Laravel backend API
  useEffect(() => {
    let isMounted = true;

    const loadCurated = async () => {
      try {
        const data = await homepageService.getStorefrontHomepageData();
        if (!isMounted) return;
        if (data.hot_sale_categories && data.hot_sale_categories.length > 0) {
          const mapped: HotSaleCategory[] = data.hot_sale_categories.map((item) => {
            const cat = item.category;
            const slug = cat?.slug || "";
            return {
              id: `hot-${slug || item.category_id}`,
              name: (cat?.name || slug).toUpperCase(),
              slug: slug,
              image: cat?.image_url || (slug ? getCategoryImageUrl(slug) : "/placeholder.jpg"),
              description: cat?.description || `Explore our hot sale collection of ${cat?.name || slug}.`,
            };
          });
          setCuratedCategories(mapped);
        } else {
          setCuratedCategories([]);
        }
      } catch (err) {
        console.warn("Could not load backend hot sale categories:", err);
        setCuratedCategories([]);
      }
    };

    loadCurated();

    const handleUpdate = () => loadCurated();
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

  // Generic active item lookup
  const activeItem = useMemo(() => {
    if (!activeCategory) return null;
    return (
      curatedCategories.find(
        (c) => c.slug === activeCategory || c.id === activeCategory
      ) || null
    );
  }, [activeCategory, curatedCategories]);

  // Generic canonical category resolution from backend item
  const targetCategoryName = useMemo(() => {
    if (!activeItem) return "";
    return activeItem.name;
  }, [activeItem]);

  // Shared Selection Handler for all Hot Sale items (Section 3 & 4)
  const handleHotSaleProductSelect = (categorySlug: string) => {
    if (activeCategory === categorySlug) {
      // Toggle off if clicking the already open category
      setActiveCategory(null);
      setSelectedAudiences([]);
      setSelectedBrands([]);
      setSelectedDesignTypes([]);
      setVisibleCount(INITIAL_PRODUCT_LIMIT);
      setHasLoadedMore(false);
      setIsContinuousMode(false);
      setIsFilterOpen(false);
    } else {
      // Switch to new category with clean state reset (Section 13)
      setActiveCategory(categorySlug);
      setSelectedAudiences([]);
      setSelectedBrands([]);
      setSelectedDesignTypes([]);
      setVisibleCount(INITIAL_PRODUCT_LIMIT);
      setHasLoadedMore(false);
      setIsContinuousMode(false);
      setIsFilterOpen(false);
      notifyExplorerActive("hot-sale", "open");

      setTimeout(() => {
        collectionSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 150);
    }
  };

  // Toggle Audience Filter (Shared across ALL products)
  const handleAudienceToggle = (audId: string) => {
    setSelectedAudiences((prev) => {
      if (prev.includes(audId)) {
        return prev.filter((a) => a !== audId);
      } else {
        return [...prev, audId];
      }
    });
    // CRITICAL GLOBAL RULE: On ANY filter change, reset to manual mode with max 21 products!
    setVisibleCount(INITIAL_PRODUCT_LIMIT);
    setHasLoadedMore(false);
    setIsContinuousMode(false);
  };

  const handleBrandsChange = (brands: string[]) => {
    setSelectedBrands(brands);
    setVisibleCount(INITIAL_PRODUCT_LIMIT);
    setHasLoadedMore(false);
    setIsContinuousMode(false);
  };

  const handleDesignTypesChange = (types: string[]) => {
    setSelectedDesignTypes(types);
    setVisibleCount(INITIAL_PRODUCT_LIMIT);
    setHasLoadedMore(false);
    setIsContinuousMode(false);
  };

  const handleAudiencesChange = (audiences: string[]) => {
    setSelectedAudiences(audiences);
    setVisibleCount(INITIAL_PRODUCT_LIMIT);
    setHasLoadedMore(false);
    setIsContinuousMode(false);
  };

  // Reset all filters for the current collection
  const handleClearFilters = () => {
    setSelectedAudiences([]);
    setSelectedBrands([]);
    setSelectedDesignTypes([]);
    setVisibleCount(INITIAL_PRODUCT_LIMIT);
    setHasLoadedMore(false);
    setIsContinuousMode(false);
  };

  // Dynamic Collection Title (Generic without hardcoding)
  const collectionTitle = useMemo(() => {
    if (!activeItem) return "HOT SALES COLLECTION";

    const baseName = activeItem.name;

    if (selectedAudiences.length === 0) {
      return baseName;
    }

    if (selectedAudiences.length === 1) {
      const aud = selectedAudiences[0];
      if (aud === "MEN") return `MEN'S ${baseName}`;
      if (aud === "WOMEN") return `WOMEN'S ${baseName}`;
      if (aud === "BOYS") return `BOYS' ${baseName}`;
      if (aud === "GIRLS") return `GIRLS' ${baseName}`;
      return `${aud} ${baseName}`;
    }

    return `${selectedAudiences.join(" + ")} ${baseName}`;
  }, [activeItem, selectedAudiences]);

  // Generic Product Filtering for any active Hot Sales product
  const filteredProducts = useMemo(() => {
    if (!activeCategory || !targetCategoryName) return [];

    return filterProducts({
      products: allProducts,
      categoryNames: [targetCategoryName],
      audienceIds: selectedAudiences,
      brandIds: selectedBrands,
    });
  }, [activeCategory, targetCategoryName, allProducts, selectedAudiences, selectedBrands]);

  // Initial Product Display Limit (Max 21 products)
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const hasMore = filteredProducts.length > displayedProducts.length;

  // Load More Click (Activates Continuous Mode & Filter Rail on first click)
  const handleLoadMoreClick = () => {
    setVisibleCount((prev) => prev + LOAD_MORE_BATCH_LIMIT);
    setHasLoadedMore(true);
    setIsContinuousMode(true);
    setIsFilterOpen(true);
    notifyExplorerActive("hot-sale", "load-more");
  };

  // Filter Rail Close Handler: Auto-pagination stops, manual Load More returns if products remain
  const handleCloseFilter = () => {
    setIsFilterOpen(false);
    setIsContinuousMode(false);
  };

  // Toggle Filters Handler: Opens filter rail without prematurely starting auto-pagination
  const handleToggleFilters = () => {
    if (isFilterOpen) {
      handleCloseFilter();
    } else {
      setIsFilterOpen(true);
      notifyExplorerActive("hot-sale", "filter");
    }
  };

  // Subscribe to explorer coordination: Close Hot Sale when another section becomes active
  useEffect(() => {
    return subscribeToExplorerActive((detail) => {
      if (detail.activeSection !== "hot-sale") {
        setActiveCategory(null);
        setSelectedAudiences([]);
        setSelectedBrands([]);
        setSelectedDesignTypes([]);
        setVisibleCount(INITIAL_PRODUCT_LIMIT);
        setHasLoadedMore(false);
        setIsContinuousMode(false);
        setIsFilterOpen(false);
      }
    });
  }, []);

  // IntersectionObserver for Continuous Auto-Pagination (Section 14)
  useEffect(() => {
    if (!isContinuousMode || !hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setVisibleCount((prev) => prev + LOAD_MORE_BATCH_LIMIT);
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isContinuousMode, hasMore]);

  const totalActiveFilters =
    selectedAudiences.length + selectedBrands.length + selectedDesignTypes.length;
  const hasActiveFilters = totalActiveFilters > 0;

  return (
    <section id="hot-sales" className="pt-1.5 sm:pt-2 pb-5 sm:pb-7 bg-background scroll-mt-20">
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        
        {/* Section Heading */}
        <div className="mb-3.5 sm:mb-5 text-left flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight">HOT SALE</h2>
            <p className="section-subtitle mt-1 sm:mt-1.5">
              Limited-run deals on seasonal knitwear and luxury textiles
            </p>
          </div>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="inline-flex items-center gap-1 text-xs font-sans font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto cursor-pointer"
            >
              <X size={13} />
              Close View
            </button>
          )}
        </div>
        
        {/* 
          Hot Sales Tiles (exact compact category tile geometry matching expanded category grid)
        */}
        {curatedCategories.length > 0 ? (
          <HorizontalCarousel trackClassName="gap-2.5 sm:gap-3.5 pb-2 pt-1">
            {curatedCategories.map((category) => (
              <div key={category.id} className="w-[calc(50%-5px)] sm:w-[calc(25%-9px)] md:w-[calc(16.666%-10px)] lg:w-[calc(12.5%-11px)] shrink-0 snap-start">
                <ProductCategoryTile
                  category={category}
                  variant="compact"
                  isActive={activeCategory === category.slug}
                  onClick={() => handleHotSaleProductSelect(category.slug)}
                />
              </div>
            ))}
          </HorizontalCarousel>
        ) : null}

        {/* 
          HOT SALES COLLECTION SHOWCASE & CONTEXTUAL FILTERS
          Uniform behavior for ALL products:
          1. Audience controls displayed first
          2. Matching products displayed inline on homepage
          3. Max 21 initial display limit
          4. Load more button when total > 21
          5. Auto-pagination and filter rail support
        */}
        {activeCategory && (
          <div
            ref={collectionSectionRef}
            className="mt-12 pt-8 border-t border-border/70 animate-in fade-in duration-300"
          >
            {/* COLLECTION TITLE & CONTROLS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight">
                    {collectionTitle}
                  </h3>
                  <Sparkles size={16} className="text-primary hidden sm:inline-block" />
                </div>
                <p className="section-subtitle mt-1 sm:mt-1.5">
                  {activeItem?.description || "Special limited-run discount collection."}
                </p>
              </div>

              {/* Action Controls & Product Count */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-3.5 py-1.5 rounded-full bg-secondary text-foreground text-xs font-bold uppercase tracking-wider border border-border">
                  {displayedProducts.length === filteredProducts.length
                    ? `${filteredProducts.length} Product${filteredProducts.length !== 1 ? "s" : ""}`
                    : `Showing ${displayedProducts.length} of ${filteredProducts.length} Products`}
                </span>

                {/* Close View Action */}
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-sans font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/60 transition-colors cursor-pointer"
                >
                  <X size={12} />
                  <span>Close View</span>
                </button>
              </div>
            </div>

            {/* CONTEXTUAL FILTER CONTAINER: AUDIENCE CONTROLS + FILTERS TOGETHER */}
            <div className="bg-secondary/40 border border-border/60 rounded-2xl p-4 sm:p-5 mb-8 space-y-3 shadow-sm">
              <div className="flex flex-col gap-2">
                {/* Header row: AUDIENCE on the left, FILTERS on the right */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
                    AUDIENCE:
                  </span>

                  {/* Compact FILTERS Control */}
                  <button
                    type="button"
                    onClick={handleToggleFilters}
                    aria-label={isFilterOpen ? "Close filters" : "Open filters"}
                    aria-expanded={isFilterOpen}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-sans font-bold uppercase tracking-wider border transition-all duration-200 cursor-pointer ${
                      isFilterOpen || totalActiveFilters > 0
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : "bg-card hover:bg-secondary/70 text-foreground border-border/80 hover:border-foreground/30 shadow-2xs"
                    }`}
                  >
                    <SlidersHorizontal size={12} />
                    <span>FILTERS</span>
                    {totalActiveFilters > 0 && (
                      <span
                        className={`w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold flex items-center justify-center ${
                          isFilterOpen
                            ? "bg-background text-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {totalActiveFilters}
                      </span>
                    )}
                  </button>
                </div>

                {/* Audience Selection Row */}
                <div className="overflow-x-auto no-scrollbar py-1">
                  <div className="flex items-center gap-2 min-w-max">
                    {AUDIENCE_FILTERS.map((aud) => {
                      const Icon = aud.icon;
                      const isSelected = selectedAudiences.includes(aud.id);

                      return (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => handleAudienceToggle(aud.id)}
                          className={`inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/[0.08] text-primary ring-1 ring-primary/30 shadow-xs font-bold"
                              : "bg-card hover:bg-secondary/70 text-foreground/80 hover:text-foreground border border-border/80 hover:border-foreground/30 shadow-2xs"
                          }`}
                        >
                          <span>{aud.label}</span>
                          <Icon
                            size={17}
                            strokeWidth={1.35}
                            className={`shrink-0 ${
                              isSelected ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Active Filter Badges & Reset Trigger */}
              {hasActiveFilters && (
                <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium mr-1">Active filters:</span>

                  {selectedAudiences.map((aud) => (
                    <span
                      key={`badge-aud-${aud}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-foreground font-semibold"
                    >
                      <span>{aud}</span>
                      <button
                        type="button"
                        onClick={() => handleAudienceToggle(aud)}
                        className="hover:text-destructive transition-colors ml-0.5 p-0.5"
                        title={`Remove ${aud}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  {selectedBrands.map((b) => (
                    <span
                      key={`badge-br-${b}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-foreground font-semibold"
                    >
                      <span>{b}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedBrands((prev) => prev.filter((item) => item !== b))}
                        className="hover:text-destructive transition-colors ml-0.5 p-0.5"
                        title={`Remove ${b}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  {selectedDesignTypes.map((dt) => (
                    <span
                      key={`badge-dt-${dt}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-foreground font-semibold"
                    >
                      <span>{dt}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDesignTypes((prev) => prev.filter((item) => item !== dt))}
                        className="hover:text-destructive transition-colors ml-0.5 p-0.5"
                        title={`Remove ${dt}`}
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

            {/* PRODUCT GRID & FILTER RAIL (Section 10, 11, 14) */}
            <div
              className={
                isFilterOpen
                  ? "grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-6 xl:gap-8"
                  : ""
              }
            >
              {/* Desktop Left Rail and Mobile Drawer */}
              {isFilterOpen && (
                <GlobalFilterRail
                  isOpen={isFilterOpen}
                  onClose={handleCloseFilter}
                  selectedBrands={selectedBrands}
                  selectedDesignTypes={selectedDesignTypes}
                  selectedAudiences={selectedAudiences}
                  selectedCategories={[]}
                  onBrandsChange={handleBrandsChange}
                  onDesignTypesChange={handleDesignTypesChange}
                  onAudiencesChange={handleAudiencesChange}
                  onCategoriesChange={() => {}}
                  onClearAll={handleClearFilters}
                  availableBrands={availableBrands}
                  availableCategories={availableCategories}
                />
              )}

              {/* Product Grid / Empty State */}
              <div className="min-w-0">
                {displayedProducts.length > 0 ? (
                  <>
                    <div
                      className={`grid gap-3 sm:gap-3.5 xl:gap-4 transition-all duration-200 ${
                        isFilterOpen
                          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5"
                          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6"
                      }`}
                    >
                      {displayedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>

                    {/* Manual Mode Load More Button (Before First Click) */}
                    {!isContinuousMode && hasMore && (
                      <div className="flex justify-center mt-8 sm:mt-10">
                        <button
                          type="button"
                          onClick={handleLoadMoreClick}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border/80 hover:border-foreground/50 bg-card hover:bg-secondary/70 text-foreground text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer"
                        >
                          <span>LOAD MORE</span>
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}

                    {/* Continuous Auto-Pagination Sentinel */}
                    {isContinuousMode && hasMore && (
                      <div ref={sentinelRef} className="flex justify-center py-6">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <Loader2 size={16} className="animate-spin text-primary" />
                          <span>Loading more products...</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-card border border-border/70 rounded-2xl p-8 sm:p-14 text-center max-w-lg mx-auto my-6 shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-secondary/80 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                      <Filter size={24} />
                    </div>
                    <h4 className="text-lg font-bold font-display uppercase mb-2">
                      No Products Found
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                      No products match your selected filter criteria. Try clearing or changing your filters.
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
            </div>

          </div>
        )}

      </div>
    </section>
  );
}
