"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, SlidersHorizontal, RotateCcw, X, LayoutGrid } from "lucide-react";
import ProductCard from "../product/ProductCard";
import GlobalFilterRail from "@/components/common/GlobalFilterRail";
import AllCategoriesPanel from "./AllCategoriesPanel";
import { Product } from "@/types";
import {
  getFeaturedProducts,
  getInitialFeaturedProducts,
} from "@/lib/services/products";
import { brandService, BrandModel } from "@/services/brand.service";
import { categoryService, CategoryModel } from "@/services/category.service";

type Tab = "best-deals" | "new-arrivals";

const DESKTOP_INITIAL_LIMIT = 15; // 5 columns x 3 rows = 15 products
const FIRST_LOAD_MORE_LIMIT = 25; // +25 products loaded upon first explicit click
const CONTINUOUS_BATCH_LIMIT = 25; // +25 products on EVERY subsequent automatic pagination request

export default function FeaturedProducts() {
  const searchParams = useSearchParams();
  const sectionRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);

  // ── State Machine: Modes & Filter (Section 17) ───────────────────────────
  // Mode A: Manual Load More (isContinuousMode = false)
  // Mode B: Continuous Auto-Pagination (isContinuousMode = true)
  const [hasLoadedMore, setHasLoadedMore] = useState<boolean>(false);
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>("best-deals");

  // ── Filter Selection State (Preserved across filter open/close) ──────────
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedDesignTypes, setSelectedDesignTypes] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Metadata for filter options
  const [availableBrands, setAvailableBrands] = useState<BrandModel[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryModel[]>([]);

  // ── Products & Pagination State ──────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>(() =>
    getInitialFeaturedProducts("best-deals", DESKTOP_INITIAL_LIMIT)
  );
  const [totalCount, setTotalCount] = useState<number>(() =>
    getInitialFeaturedProducts("best-deals", 9999).length
  );
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Request race-condition protection & async synchronization refs
  const generationRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);
  const isContinuousModeRef = useRef<boolean>(false);

  useEffect(() => {
    isContinuousModeRef.current = isContinuousMode;
  }, [isContinuousMode]);

  // Backward compatibility alias
  const isPaginationActive = isContinuousMode;

  // Active tab ref for stale response protection
  const activeTabRef = useRef<Tab>("best-deals");
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // ── Load Filter Metadata (Dynamic Brands & Categories) ───────────────────
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
        // Fallbacks are preserved gracefully
      }
    }
    loadMetadata();
  }, []);

  // ── Adjust Initial Product Count Responsively on Client Mount ───────────
  useEffect(() => {
    if (typeof window === "undefined" || isContinuousModeRef.current || hasLoadedMore) return;

    let targetLimit = DESKTOP_INITIAL_LIMIT;
    if (window.innerWidth < 640) {
      targetLimit = 6; // Mobile: 2 cols x 3 rows = 6
    } else if (window.innerWidth < 1024) {
      targetLimit = 9; // Tablet: 3 cols x 3 rows = 9
    }

    const fullList = getInitialFeaturedProducts(activeTabRef.current, 9999);
    setTotalCount(fullList.length);
    setProducts(fullList.slice(0, targetLimit));
    setHasMore(fullList.length > targetLimit);
  }, [hasLoadedMore]);

  // ── Load More Click: First click activates Continuous Mode; subsequent clicks in manual mode reactivate it ──
  const handleLoadMoreClick = async () => {
    if (isLoadingRef.current || isContinuousMode || !hasMore) return;

    isLoadingRef.current = true;
    setIsLoadingMore(true);
    setError(null);

    const currentTab = activeTab;
    const currentOffset = products.length;
    const currentGen = generationRef.current;

    try {
      const result = await getFeaturedProducts({
        tab: currentTab,
        offset: currentOffset,
        limit: FIRST_LOAD_MORE_LIMIT,
        brands: selectedBrands,
        designTypes: selectedDesignTypes,
        audiences: selectedAudiences,
        categories: selectedCategories,
      });

      if (
        generationRef.current !== currentGen ||
        activeTabRef.current !== currentTab
      ) {
        return;
      }

      // Append next batch (+25 products) with duplicate protection
      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const fresh = result.products.filter((p) => !existingIds.has(p.id));
        return [...prev, ...fresh];
      });

      setTotalCount(result.total);
      setHasMore(result.hasMore);

      // ── CRITICAL STATE TRANSITIONS (Sections 1, 3, 5, 10, 11, 15, 17) ──────
      // 1. Mark that user has loaded more
      setHasLoadedMore(true);
      // 2. Activate continuous mode (auto-pagination = ON)
      setIsContinuousMode(true);
      isContinuousModeRef.current = true;
      // 3. Open filter rail automatically ONCE (visible + sticky + 6-col grid)
      setIsFilterOpen(true);
    } catch {
      if (
        generationRef.current === currentGen &&
        activeTabRef.current === currentTab
      ) {
        setError("Unable to load more products. Please try again.");
      }
    } finally {
      if (
        generationRef.current === currentGen &&
        activeTabRef.current === currentTab
      ) {
        setIsLoadingMore(false);
        isLoadingRef.current = false;
      }
    }
  };

  // Backward compatibility alias
  const handleFirstLoadMore = handleLoadMoreClick;

  // ── Continuous Progressive Auto-Pagination (Active ONLY when isContinuousMode is true) ──
  const loadNextBatch = useCallback(
    async () => {
      if (
        isLoadingRef.current ||
        !hasMore ||
        !isContinuousModeRef.current
      ) {
        return;
      }

      isLoadingRef.current = true;
      setIsLoadingMore(true);
      setError(null);

      const currentTab = activeTabRef.current;
      const currentOffset = products.length;
      const currentGen = generationRef.current;

      try {
        const result = await getFeaturedProducts({
          tab: currentTab,
          offset: currentOffset,
          limit: CONTINUOUS_BATCH_LIMIT,
          brands: selectedBrands,
          designTypes: selectedDesignTypes,
          audiences: selectedAudiences,
          categories: selectedCategories,
        });

        if (
          generationRef.current !== currentGen ||
          activeTabRef.current !== currentTab ||
          !isContinuousModeRef.current
        ) {
          return;
        }

        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = result.products.filter((p) => !existingIds.has(p.id));
          return [...prev, ...fresh];
        });

        setTotalCount(result.total);
        setHasMore(result.hasMore);
      } catch {
        if (
          generationRef.current === currentGen &&
          activeTabRef.current === currentTab
        ) {
          setError("Unable to load additional products. Please try again.");
        }
      } finally {
        if (
          generationRef.current === currentGen &&
          activeTabRef.current === currentTab
        ) {
          setIsLoadingMore(false);
          isLoadingRef.current = false;
        }
      }
    },
    [hasMore, products.length, selectedBrands, selectedDesignTypes, selectedAudiences, selectedCategories]
  );

  // ── IntersectionObserver: Active ONLY when isContinuousMode is true ────
  useEffect(() => {
    // Observer MUST NOT run when continuous mode is inactive or no more products
    if (!isContinuousMode || !hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry.isIntersecting &&
          !isLoadingRef.current &&
          isContinuousModeRef.current
        ) {
          loadNextBatch();
        }
      },
      {
        root: null, // Viewport
        rootMargin: "350px 0px", // Preload 350px before reaching bottom
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [isContinuousMode, hasMore, loadNextBatch]);

  // ── Filter Rail Close & Toggle Handlers (Sections 13, 16, 17) ─────────────
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

  // ── Filter Changes Handler ───────────────────────────────────────────────
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

    generationRef.current += 1;
    const currentGen = generationRef.current;

    setIsLoadingInitial(true);
    setError(null);

    let limit = DESKTOP_INITIAL_LIMIT;
    if (typeof window !== "undefined") {
      if (window.innerWidth < 640) limit = 6;
      else if (window.innerWidth < 1024) limit = 9;
    }
    if (isContinuousMode) {
      limit += FIRST_LOAD_MORE_LIMIT;
    }

    try {
      const result = await getFeaturedProducts({
        tab: activeTab,
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
      setError("Unable to filter products. Please try again.");
    } finally {
      if (generationRef.current === currentGen) {
        setIsLoadingInitial(false);
      }
    }
  };

  const handleClearAllFilters = () => {
    handleFilterUpdate([], [], [], []);
  };

  const removeSingleFilter = (
    type: "brand" | "designType" | "audience" | "category",
    val: string
  ) => {
    if (type === "brand") {
      handleFilterUpdate(
        selectedBrands.filter((b) => b !== val),
        selectedDesignTypes,
        selectedAudiences,
        selectedCategories
      );
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

  // ── Tab Click Handler (Best Deals ↔ New Arrivals) ────────────────────────
  const handleTabClick = async (tab: Tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    generationRef.current += 1;
    const currentGen = generationRef.current;

    setError(null);
    setIsLoadingMore(false);
    isLoadingRef.current = false;

    let initialCount = DESKTOP_INITIAL_LIMIT;
    if (typeof window !== "undefined") {
      if (window.innerWidth < 640) initialCount = 6;
      else if (window.innerWidth < 1024) initialCount = 9;
    }

    if (!isContinuousMode) {
      // Pagination inactive: reset initial static products, stay inactive
      const fullList = getInitialFeaturedProducts(
        tab,
        9999,
        selectedBrands,
        selectedAudiences,
        selectedCategories,
        selectedDesignTypes
      );
      setProducts(fullList.slice(0, initialCount));
      setTotalCount(fullList.length);
      setHasMore(fullList.length > initialCount);
    } else {
      // Pagination active: reload batch for the new tab with expanded limit
      setIsLoadingInitial(true);
      try {
        const result = await getFeaturedProducts({
          tab,
          offset: 0,
          limit: initialCount + FIRST_LOAD_MORE_LIMIT,
          brands: selectedBrands,
          designTypes: selectedDesignTypes,
          audiences: selectedAudiences,
          categories: selectedCategories,
        });

        if (generationRef.current !== currentGen) return;

        setProducts(result.products);
        setTotalCount(result.total);
        setHasMore(result.hasMore);
      } catch {
        if (generationRef.current !== currentGen) return;
        setError("Unable to load products. Please try again.");
      } finally {
        if (generationRef.current === currentGen) {
          setIsLoadingInitial(false);
        }
      }
    }
  };

  // ── URL Param / Custom Event Activation ──────────────────────────────────
  useEffect(() => {
    const scrollToFeatured = () => {
      requestAnimationFrame(() => {
        if (sectionRef.current) {
          sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    };

    const tabParam = searchParams.get("tab");
    if (tabParam === "new-arrivals") {
      handleTabClick("new-arrivals");
      scrollToFeatured();
    }

    const handleActivateEvent = () => {
      handleTabClick("new-arrivals");
      scrollToFeatured();
    };

    window.addEventListener("activate-new-arrivals", handleActivateEvent);
    return () => {
      window.removeEventListener("activate-new-arrivals", handleActivateEvent);
    };
  }, [searchParams]);

  const totalActiveFilters =
    selectedBrands.length +
    selectedDesignTypes.length +
    selectedAudiences.length +
    selectedCategories.length;

  const handleAllCategoriesClick = () => {
    setIsAllCategoriesOpen((prev) => !prev);
  };

  return (
    <section
      id="featured"
      ref={sectionRef}
      className="pt-1.5 sm:pt-2 pb-8 sm:pb-12 bg-background scroll-mt-20"
    >
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* ── Header & Main Controls Bar ── */}
        <div className="mb-6 md:mb-8 flex flex-col gap-3 sm:gap-4">
          {/* Top Heading: Title */}
          <div>
            <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight">
              FEATURED PRODUCTS
            </h2>
          </div>

          {/* Sub Row: Tabs on Left, Filters + Counter + ALL CATEGORIES on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              {/* Tab 1: BEST DEALS */}
              <button
                type="button"
                onClick={() => handleTabClick("best-deals")}
                className={`px-4 py-2 rounded-full text-[13px] font-sans font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === "best-deals"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Best Deals
              </button>

              {/* Tab 2: NEW ARRIVALS */}
              <button
                type="button"
                onClick={() => handleTabClick("new-arrivals")}
                className={`px-4 py-2 rounded-full text-[13px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeTab === "new-arrivals"
                    ? "bg-foreground text-background shadow-[0_0_14px_rgba(255,255,255,0.22)] ring-1 ring-primary/40"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                New Arrivals
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5 self-start sm:self-auto">
              {/* Product Counter */}
              <div className="text-[13px] font-medium text-muted-foreground font-sans whitespace-nowrap">
                Showing{" "}
                <span className="font-bold text-foreground">
                  {products.length}
                </span>{" "}
                of {totalCount} items
              </div>

              {/* Action Buttons Group: [FILTERS] [ALL CATEGORIES] */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Filter Toggle Button: ALWAYS VISIBLE */}
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
                        isFilterOpen
                          ? "bg-background text-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {totalActiveFilters}
                    </span>
                  )}
                </button>

                {/* Action: ALL CATEGORIES */}
                <button
                  type="button"
                  onClick={handleAllCategoriesClick}
                  aria-expanded={isAllCategoriesOpen}
                  aria-controls="featured-products-categories"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[13px] font-sans font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground ${
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
            </div>
          </div>
        </div>

        {/* ── Inline Expanded Category Panel (Shared AllCategoriesPanel) ── */}
        <AllCategoriesPanel
          isOpen={isAllCategoriesOpen}
          id="featured-products-categories"
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

        {/* ── Active Filter Badges Strip ── */}
        {totalActiveFilters > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 pb-3 border-b border-border/60">
            <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider font-sans mr-1">
              Active Filters:
            </span>

            {selectedBrands.map((b) => (
              <span
                key={`b-${b}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-secondary text-foreground border border-border/80"
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

            {selectedDesignTypes.map((d) => (
              <span
                key={`d-${d}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-secondary text-foreground border border-border/80"
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

            {selectedAudiences.map((a) => (
              <span
                key={`a-${a}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-secondary text-foreground border border-border/80"
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

            {selectedCategories.map((c) => (
              <span
                key={`c-${c}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-secondary text-foreground border border-border/80"
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
              onClick={handleClearAllFilters}
              className="text-[13px] font-semibold text-primary hover:underline cursor-pointer ml-1"
            >
              Clear All
            </button>
          </div>
        )}

        {/* ── Main Layout: Desktop Filter Rail + Product Grid ── */}
        <div
          className={
            isFilterOpen
              ? "featured-products-layout filter-open grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-6 xl:gap-8"
              : "featured-products-layout filter-closed w-full"
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
              onClearAll={handleClearAllFilters}
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
                  Updating products...
                </span>
              </div>
            ) : products.length > 0 ? (
              /*
                RESPONSIVE GRID SYSTEM (PHASE 21):
                - Filter Closed:
                  Large Desktop (>= 1440px / 2xl): 7 columns
                  Desktop (xl): 6 columns
                  Laptop (lg): 5 columns
                  Tablet (md): 4 columns
                  Small Tablet (sm): 3 columns
                  Mobile: 2 columns
                - Filter Open:
                  Large Desktop (>= 1440px / 2xl): 6 columns beside 280px filter rail
                  Desktop (xl): 5 columns
                  Laptop (lg): 4 columns
                  Tablet/Mobile: 2-3 columns with mobile drawer overlay
                - Product image ratio: strictly 3:4 preserved across all cards
              */
              <div
                className={`grid gap-3 sm:gap-3.5 xl:gap-4 transition-all duration-200 ${
                  isFilterOpen
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1440px]:grid-cols-6 2xl:grid-cols-6"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 min-[1440px]:grid-cols-7 2xl:grid-cols-7"
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
                  Try changing or clearing your filters.
                </p>
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="px-5 py-2.5 rounded-full text-[13px] font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* ── State 1: Manual Load More Mode (!isContinuousMode) (Sections 2, 9, 13, 21, 22, 23) ── */}
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
                    aria-label="Load more featured products"
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
                      <span>LOAD MORE</span>
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

            {/* ── State 2: Continuous Auto-Pagination Sentinel (isContinuousMode === true) (Sections 6, 7, 8, 9, 21) ── */}
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
    </section>
  );
}

