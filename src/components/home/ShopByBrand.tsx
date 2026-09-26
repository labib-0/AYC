"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { brandService, BrandModel } from "@/services/brand.service";
import { categoryService, CategoryModel } from "@/services/category.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";
import { ChevronDown, LayoutGrid, SlidersHorizontal, RotateCcw, X, Loader2 } from "lucide-react";
import AllCategoriesPanel from "./AllCategoriesPanel";
import BrandLogoTile from "@/components/common/BrandLogoTile";
import ProductCard from "../product/ProductCard";
import GlobalFilterRail from "@/components/common/GlobalFilterRail";
import { Product } from "@/types";
import {
  getFeaturedProducts,
} from "@/lib/services/products";
import {
  notifyExplorerActive,
  subscribeToExplorerActive,
} from "@/lib/services/explorer-coordinator";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  logo?: string;
  sort_order?: number;
}

const INITIAL_BRAND_TILES_DISPLAY_COUNT = 28; // 14 columns x 2 rows = 28 brands
const INITIAL_BRAND_PRODUCTS_LIMIT = 21; // Exactly 21 products initially
const CONTINUOUS_BATCH_LIMIT = 21; // Next batch limit

export default function ShopByBrand() {
  const [dbBrands, setDbBrands] = useState<Brand[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BRAND_TILES_DISPLAY_COUNT);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);

  // Metadata for filter options
  const [availableBrands, setAvailableBrands] = useState<BrandModel[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryModel[]>([]);

  // Filter Selection State
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedDesignTypes, setSelectedDesignTypes] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Modes & Filter Rail
  const [hasLoadedMore, setHasLoadedMore] = useState<boolean>(false);
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Products & Pagination State
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronization refs
  const generationRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);
  const isContinuousModeRef = useRef<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const expansionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isContinuousModeRef.current = isContinuousMode;
  }, [isContinuousMode]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1800) {
      setVisibleCount(32); // 16 columns x 2 rows = 32 brands on very wide desktop
    }
  }, []);

  // Load brands and categories metadata - strictly from Laravel Backend
  const loadMetadata = useCallback(async () => {
    try {
      const [landingBrandsData, allCatalogBrands, categoriesData] = await Promise.all([
        brandService.getLandingBrands(),
        brandService.getBrands({ is_active: true, all: true }),
        categoryService.getCategories({ is_active: true, all: true }),
      ]);

      if (landingBrandsData && landingBrandsData.length > 0) {
        const formatted: Brand[] = landingBrandsData.map((b: BrandModel) => ({
          id: String(b.slug || b.id),
          name: b.name,
          slug: b.slug,
          logo_url: b.logo_url || b.logo || (b.slug ? `/brands/${b.slug}.svg` : undefined),
          logo: b.logo || b.logo_url || (b.slug ? `/brands/${b.slug}.svg` : undefined),
          sort_order: b.landing_sort_order ?? b.sort_order,
        }));
        setDbBrands(formatted);
      } else {
        setDbBrands([]);
      }

      if (allCatalogBrands) {
        setAvailableBrands(allCatalogBrands);
      }
      if (categoriesData) {
        setAvailableCategories(categoriesData);
      }
    } catch (err) {
      console.error("Failed to load storefront brands and metadata:", err);
      setDbBrands([]);
    }
  }, []);

  useEffect(() => {
    loadMetadata();

    const handleUpdate = () => loadMetadata();
    window.addEventListener("ayaan:homepage-updated", handleUpdate);
    window.addEventListener("ayaan:data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("ayaan:homepage-updated", handleUpdate);
      window.removeEventListener("ayaan:data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadMetadata]);

  // All brands for Shop By Brand section come strictly from database landing brands
  const allBrands = dbBrands;

  const visibleBrands = useMemo(() => {
    return allBrands.slice(0, visibleCount);
  }, [allBrands, visibleCount]);

  // Handle Filter Update
  const handleFilterUpdate = async (
    brands: string[],
    designTypes: string[],
    audiences: string[],
    categories: string[]
  ) => {
    setSelectedBrands(brands);
    setSelectedDesignTypes(designTypes);
    setSelectedAudiences(audiences);
    setSelectedCategories(categories);

    if (brands.length === 0) {
      setProducts([]);
      setTotalCount(0);
      setHasMore(false);
      setIsFilterOpen(false);
      setIsContinuousMode(false);
      isContinuousModeRef.current = false;
      setHasLoadedMore(false);
      return;
    }

    // CRITICAL GLOBAL RULE: On ANY filter or selection change, reset to manual mode with max 21 products!
    setHasLoadedMore(false);
    setIsContinuousMode(false);
    isContinuousModeRef.current = false;

    generationRef.current += 1;
    const currentGen = generationRef.current;

    setIsLoadingInitial(true);
    setError(null);

    // Initial limit is strictly 21 products!
    const limit = INITIAL_BRAND_PRODUCTS_LIMIT;

    try {
      const result = await getFeaturedProducts({
        tab: "all",
        offset: 0,
        limit,
        brands,
        designTypes,
        audiences,
        categories,
      });

      if (generationRef.current !== currentGen) return;

      setProducts(result.products);
      setTotalCount(result.total);
      setHasMore(result.hasMore);
    } catch {
      if (generationRef.current !== currentGen) return;
      setError("Unable to load brand products. Please try again.");
    } finally {
      if (generationRef.current === currentGen) {
        setIsLoadingInitial(false);
      }
    }
  };

  // Brand tile click handler: Multi-selection with inline expansion, NO REDIRECTION
  const handleBrandClick = (brandName: string) => {
    const isAlreadySelected = selectedBrands.includes(brandName);
    const nextBrands = isAlreadySelected
      ? selectedBrands.filter((b) => b !== brandName)
      : [...selectedBrands, brandName];

    setSelectedBrands(nextBrands);

    if (nextBrands.length === 0) {
      handleClearAll();
      return;
    }

    notifyExplorerActive("shop-by-brand", "open");
    handleFilterUpdate(nextBrands, selectedDesignTypes, selectedAudiences, selectedCategories);

    if (selectedBrands.length === 0 && nextBrands.length > 0) {
      requestAnimationFrame(() => {
        expansionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };

  // First Load More Click: Loads next batch, activates continuous mode, and opens filter rail on left
  const handleLoadMoreClick = async () => {
    if (isLoadingRef.current || isContinuousMode || !hasMore) return;
    notifyExplorerActive("shop-by-brand", "load-more");

    isLoadingRef.current = true;
    setIsLoadingMore(true);
    setError(null);

    const currentOffset = products.length;
    const currentGen = generationRef.current;

    try {
      const result = await getFeaturedProducts({
        tab: "all",
        offset: currentOffset,
        limit: CONTINUOUS_BATCH_LIMIT,
        brands: selectedBrands,
        designTypes: selectedDesignTypes,
        audiences: selectedAudiences,
        categories: selectedCategories,
      });

      if (generationRef.current !== currentGen) return;

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const fresh = result.products.filter((p) => !existingIds.has(p.id));
        return [...prev, ...fresh];
      });

      setTotalCount(result.total);
      setHasMore(result.hasMore);

      // Transition to continuous auto-pagination and open filter rail
      setHasLoadedMore(true);
      setIsContinuousMode(true);
      isContinuousModeRef.current = true;
      setIsFilterOpen(true);
    } catch {
      if (generationRef.current === currentGen) {
        setError("Unable to load more products. Please try again.");
      }
    } finally {
      if (generationRef.current === currentGen) {
        setIsLoadingMore(false);
        isLoadingRef.current = false;
      }
    }
  };

  // Continuous auto-pagination handler (IntersectionObserver)
  const loadNextBatch = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || !isContinuousModeRef.current) return;

    isLoadingRef.current = true;
    setIsLoadingMore(true);
    setError(null);

    const currentOffset = products.length;
    const currentGen = generationRef.current;

    try {
      const result = await getFeaturedProducts({
        tab: "all",
        offset: currentOffset,
        limit: CONTINUOUS_BATCH_LIMIT,
        brands: selectedBrands,
        designTypes: selectedDesignTypes,
        audiences: selectedAudiences,
        categories: selectedCategories,
      });

      if (generationRef.current !== currentGen || !isContinuousModeRef.current) return;

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const fresh = result.products.filter((p) => !existingIds.has(p.id));
        return [...prev, ...fresh];
      });

      setTotalCount(result.total);
      setHasMore(result.hasMore);
    } catch {
      if (generationRef.current === currentGen) {
        setError("Unable to load additional products. Please try again.");
      }
    } finally {
      if (generationRef.current === currentGen) {
        setIsLoadingMore(false);
        isLoadingRef.current = false;
      }
    }
  }, [hasMore, products.length, selectedBrands, selectedDesignTypes, selectedAudiences, selectedCategories]);

  // Observer: Active ONLY when continuous mode is enabled
  useEffect(() => {
    if (!isContinuousMode || !hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingRef.current && isContinuousModeRef.current) {
          loadNextBatch();
        }
      },
      {
        root: null,
        rootMargin: "350px 0px",
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [isContinuousMode, hasMore, loadNextBatch]);

  // Filter rail close handler: Auto-pagination MUST stop, Load More returns
  const handleCloseFilter = () => {
    setIsFilterOpen(false);
    setIsContinuousMode(false);
    isContinuousModeRef.current = false;
  };

  const handleToggleFilters = () => {
    if (isFilterOpen) {
      handleCloseFilter();
    } else {
      setIsFilterOpen(true);
      setIsContinuousMode(true);
      isContinuousModeRef.current = true;
    }
  };

  // Clear / Reset all filters and collapse inline area
  const handleClearAll = () => {
    setSelectedBrands([]);
    setSelectedDesignTypes([]);
    setSelectedAudiences([]);
    setSelectedCategories([]);
    setProducts([]);
    setTotalCount(0);
    setHasMore(false);
    setIsFilterOpen(false);
    setIsContinuousMode(false);
    isContinuousModeRef.current = false;
    setHasLoadedMore(false);
    setIsAllCategoriesOpen(false);
  };

  // Subscribe to explorer coordination: Close Shop By Brand expansion when another section is active
  useEffect(() => {
    return subscribeToExplorerActive((detail) => {
      if (detail.activeSection !== "shop-by-brand") {
        handleClearAll();
      }
    });
  }, []);

  const removeSingleFilter = (
    type: "brand" | "designType" | "audience" | "category",
    val: string
  ) => {
    if (type === "brand") {
      const next = selectedBrands.filter((b) => b !== val);
      if (next.length === 0) {
        handleClearAll();
      } else {
        handleFilterUpdate(next, selectedDesignTypes, selectedAudiences, selectedCategories);
      }
    } else if (type === "designType") {
      handleFilterUpdate(
        selectedBrands,
        selectedDesignTypes.filter((d) => d !== val),
        selectedAudiences,
        selectedCategories
      );
    } else if (type === "audience") {
      handleFilterUpdate(
        selectedBrands,
        selectedDesignTypes,
        selectedAudiences.filter((a) => a !== val),
        selectedCategories
      );
    } else {
      handleFilterUpdate(
        selectedBrands,
        selectedDesignTypes,
        selectedAudiences,
        selectedCategories.filter((c) => c !== val)
      );
    }
  };

  const handleAllCategoriesClick = () => {
    setIsAllCategoriesOpen((prev) => !prev);
  };

  const totalActiveFilters =
    selectedBrands.length +
    selectedDesignTypes.length +
    selectedAudiences.length +
    selectedCategories.length;

  return (
    <section
      id="brands"
      className="pt-1.5 sm:pt-2 pb-1.5 sm:pb-2 bg-background scroll-mt-20 select-none"
      aria-label="Shop By Brand"
    >
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        
        {/* Left-Aligned Section Heading with ALL CATEGORIES Action */}
        <div className="mb-2.5 sm:mb-3.5 flex items-center justify-between gap-2">
          {/* Left-Aligned Heading */}
          <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight text-foreground leading-none">
            SHOP BY BRAND
          </h2>

          {/* Action: ALL CATEGORIES */}
          <button
            type="button"
            onClick={handleAllCategoriesClick}
            aria-expanded={isAllCategoriesOpen}
            aria-controls="shop-by-brand-categories"
            className={`inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[13px] font-sans font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground ${
              isAllCategoriesOpen
                ? "bg-foreground text-background border border-foreground shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/60 hover:border-foreground/30"
            }`}
            aria-label="All Categories"
          >
            <LayoutGrid
              size={13}
              className={
                isAllCategoriesOpen
                  ? "text-background"
                  : "text-foreground/70 group-hover:text-foreground transition-colors"
              }
            />
            <span>ALL CATEGORIES</span>
          </button>
        </div>

        {/* ── Inline Expanded Category Panel (Shared AllCategoriesPanel) ── */}
        <AllCategoriesPanel
          isOpen={isAllCategoriesOpen}
          id="shop-by-brand-categories"
          selectedAudiences={selectedAudiences}
          selectedDesignTypes={selectedDesignTypes}
          selectedCategories={selectedCategories}
          onSelectAudience={(aud) => {
            const next = selectedAudiences.includes(aud)
              ? selectedAudiences.filter((a) => a !== aud)
              : [...selectedAudiences, aud];
            handleFilterUpdate(selectedBrands, selectedDesignTypes, next, selectedCategories);
          }}
          onSelectDesignType={(dt) => {
            const next = selectedDesignTypes.includes(dt)
              ? selectedDesignTypes.filter((d) => d !== dt)
              : [...selectedDesignTypes, dt];
            handleFilterUpdate(selectedBrands, next, selectedAudiences, selectedCategories);
          }}
          onSelectCategory={(cat) => {
            const next = selectedCategories.includes(cat)
              ? selectedCategories.filter((c) => c !== cat)
              : [...selectedCategories, cat];
            handleFilterUpdate(selectedBrands, selectedDesignTypes, selectedAudiences, next);
          }}
        />

        {/* 
          Compact Responsive Brand Navigation Grid:
          - Interactive filter controls (button type="button")
          - NO redirection
          - Multi-selection support with visual highlight
        */}
        {visibleBrands.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-[repeat(14,minmax(0,1fr))] min-[1800px]:grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5 sm:gap-2">
            {visibleBrands.map((brand) => {
              const logoUrl = brand.logo_url || brand.logo || getBrandLogoUrl(brand.name);
              const isSelected = selectedBrands.includes(brand.name);

              return (
                <BrandLogoTile
                  key={brand.id}
                  id={brand.id}
                  name={brand.name}
                  logoUrl={logoUrl}
                  isSelected={isSelected}
                  onClick={() => handleBrandClick(brand.name)}
                  title={brand.name}
                  ariaLabel={isSelected ? `Deselect ${brand.name}` : `Filter by ${brand.name}`}
                />
              );
            })}
          </div>
        ) : null}

        {/* 
          Centered Minimal Down-Arrow Load More Control for Brands:
        */}
        {visibleCount < allBrands.length && (
          <div className="flex justify-center mt-2 sm:mt-2.5">
            <button
              type="button"
              onClick={() => setVisibleCount(allBrands.length)}
              className="inline-flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors group cursor-pointer focus-visible:outline-none"
              aria-label="Load more brands"
            >
              <div className="w-6.5 h-6.5 rounded-full border border-border/80 group-hover:border-foreground/50 bg-card group-hover:bg-secondary/70 flex items-center justify-center transition-all shadow-2xs group-hover:shadow-xs">
                <ChevronDown size={13} className="transition-transform duration-200 group-hover:translate-y-0.5 text-foreground/70 group-hover:text-foreground" />
              </div>
              <span className="text-[9.5px] font-bold uppercase tracking-widest font-sans">
                LOAD MORE
              </span>
            </button>
          </div>
        )}

        {/* 
          ── INLINE PRODUCT AREA EXPANSION (Part 4, 6, 7, 8, 9, 10, 11, 12) ──
          Expands directly below the Shop By Brand section when brand(s) are selected.
        */}
        {selectedBrands.length > 0 && (
          <div
            id="brand-product-expansion"
            ref={expansionRef}
            className="mt-6 pt-6 border-t border-border/60 transition-all duration-300"
          >
            {/* Expansion Header & Controls Bar */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
                    {selectedBrands.length === 1
                      ? `${selectedBrands[0]} COLLECTION`
                      : `SELECTED BRANDS (${selectedBrands.length})`}
                  </h3>
                  <span className="text-xs sm:text-[13px] font-medium text-muted-foreground font-sans whitespace-nowrap">
                    Showing <span className="font-bold text-foreground">{products.length}</span> of {totalCount} items
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleFilters}
                  aria-label={isFilterOpen ? "Close filters" : "Open filters"}
                  aria-expanded={isFilterOpen}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-sans font-bold uppercase tracking-wider border transition-all duration-200 cursor-pointer ${
                    isFilterOpen || totalActiveFilters > 0
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "bg-secondary/70 hover:bg-secondary text-foreground border-border/80"
                  }`}
                >
                  <SlidersHorizontal size={13} />
                  <span>FILTERS</span>
                  {totalActiveFilters > 0 && (
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                        isFilterOpen ? "bg-background text-foreground" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {totalActiveFilters}
                    </span>
                  )}
                </button>

                {/* Close View / Reset Button */}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-sans font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/60 transition-colors cursor-pointer"
                  aria-label="Close brand products view"
                >
                  <X size={13} />
                  <span>Close View</span>
                </button>
              </div>
            </div>

            {/* Active Filter Badges Strip */}
            {totalActiveFilters > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5 pb-3 border-b border-border/60">
                <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider font-sans mr-1">
                  Active Filters:
                </span>

                {selectedBrands.map((b) => (
                  <span
                    key={`b-${b}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-secondary text-foreground border border-border/80"
                  >
                    <span>{b}</span>
                    <button
                      type="button"
                      onClick={() => removeSingleFilter("brand", b)}
                      aria-label={`Remove brand ${b}`}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedAudiences.map((a) => (
                  <span
                    key={`a-${a}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-secondary text-foreground border border-border/80"
                  >
                    <span>Audience: {a}</span>
                    <button
                      type="button"
                      onClick={() => removeSingleFilter("audience", a)}
                      aria-label={`Remove audience ${a}`}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedDesignTypes.map((d) => (
                  <span
                    key={`d-${d}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-secondary text-foreground border border-border/80"
                  >
                    <span>Design: {d}</span>
                    <button
                      type="button"
                      onClick={() => removeSingleFilter("designType", d)}
                      aria-label={`Remove design type ${d}`}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedCategories.map((c) => (
                  <span
                    key={`c-${c}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-secondary text-foreground border border-border/80"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => removeSingleFilter("category", c)}
                      aria-label={`Remove category ${c}`}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[12px] font-semibold text-primary hover:underline cursor-pointer ml-1"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Main Layout: Desktop Filter Rail (Left) + Product Grid (Right) */}
            <div
              className={
                isFilterOpen
                  ? "grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-6 xl:gap-8"
                  : "w-full"
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
                  selectedCategories={selectedCategories}
                  onBrandsChange={(b) =>
                    handleFilterUpdate(b, selectedDesignTypes, selectedAudiences, selectedCategories)
                  }
                  onDesignTypesChange={(d) =>
                    handleFilterUpdate(selectedBrands, d, selectedAudiences, selectedCategories)
                  }
                  onAudiencesChange={(a) =>
                    handleFilterUpdate(selectedBrands, selectedDesignTypes, a, selectedCategories)
                  }
                  onCategoriesChange={(c) =>
                    handleFilterUpdate(selectedBrands, selectedDesignTypes, selectedAudiences, c)
                  }
                  onClearAll={handleClearAll}
                  availableBrands={availableBrands}
                  availableCategories={availableCategories}
                />
              )}

              {/* Product Grid Area */}
              <div className="product-column flex-1 min-w-0 w-full">
                {isLoadingInitial ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                    <span className="text-[13px] font-semibold uppercase tracking-wider font-sans">
                      Updating brand products...
                    </span>
                  </div>
                ) : products.length > 0 ? (
                  <div
                    className={`grid gap-3 sm:gap-3.5 xl:gap-4 transition-all duration-200 ${
                      isFilterOpen
                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5"
                        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6"
                    }`}
                  >
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-4 border border-dashed border-border/80 rounded-2xl">
                    <p className="text-[13px] font-bold uppercase tracking-wider text-foreground mb-1 font-sans">
                      NO PRODUCTS FOUND
                    </p>
                    <p className="text-[13px] text-muted-foreground mb-4 font-sans">
                      Try selecting different brands or clearing your filters.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-5 py-2.5 rounded-full text-[13px] font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}

                {/* State 1: Manual Load More Mode (!isContinuousMode) */}
                {!isContinuousMode && (
                  <div className="w-full pt-8 sm:pt-10 flex flex-col items-center justify-center">
                    {error ? (
                      <div className="flex flex-col items-center gap-3 py-2">
                        <span className="text-[13px] font-semibold text-destructive font-sans">
                          {error}
                        </span>
                        <button
                          type="button"
                          onClick={handleLoadMoreClick}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold uppercase tracking-wider bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
                        >
                          <RotateCcw size={14} />
                          <span>Retry</span>
                        </button>
                      </div>
                    ) : hasMore ? (
                      <button
                        type="button"
                        onClick={handleLoadMoreClick}
                        disabled={isLoadingMore}
                        aria-label="Load more brand products"
                        className={`px-8 py-3 rounded-full text-[13px] font-sans font-bold uppercase tracking-widest transition-all duration-200 shadow-sm ${
                          isLoadingMore
                            ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-80"
                            : "bg-foreground text-background hover:opacity-90 active:scale-[0.98] cursor-pointer"
                        }`}
                      >
                        {isLoadingMore ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>LOADING…</span>
                          </span>
                        ) : (
                          <span>LOAD MORE ↓</span>
                        )}
                      </button>
                    ) : products.length > 0 ? (
                      <div className="text-center py-4">
                        <div className="w-12 h-0.5 bg-border/80 mx-auto mb-3" />
                        <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground font-sans">
                          All {products.length} products loaded
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* State 2: Continuous Auto-Pagination Sentinel (isContinuousMode === true) */}
                {isContinuousMode && (
                  <div
                    ref={sentinelRef}
                    className="w-full py-8 flex flex-col items-center justify-center"
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2.5 text-muted-foreground py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                        <span className="text-[13px] font-semibold uppercase tracking-wider font-sans">
                          Loading more products...
                        </span>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center gap-2.5 py-2">
                        <span className="text-[13px] font-semibold text-destructive font-sans">
                          {error}
                        </span>
                        <button
                          type="button"
                          onClick={loadNextBatch}
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-semibold uppercase tracking-wider bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>Retry</span>
                        </button>
                      </div>
                    ) : !hasMore && products.length > 0 ? (
                      <div className="text-center py-4">
                        <div className="w-12 h-0.5 bg-border/80 mx-auto mb-3" />
                        <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground font-sans">
                          All {products.length} products loaded
                        </p>
                      </div>
                    ) : null}
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
