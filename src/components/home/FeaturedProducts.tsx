"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, SlidersHorizontal, RotateCcw, X, ArrowDown } from "lucide-react";
import ProductCard from "../product/ProductCard";
import GlobalFilterRail from "@/components/common/GlobalFilterRail";
import { Product } from "@/types";
import {
  getFeaturedProducts,
} from "@/lib/services/products";
import { brandService, BrandModel } from "@/services/brand.service";
import { categoryService, CategoryModel } from "@/services/category.service";
import {
  notifyExplorerActive,
  subscribeToExplorerActive,
} from "@/lib/services/explorer-coordinator";


const INITIAL_PRODUCT_LIMIT = 21; // Maximum 21 products displayed initially
const FIRST_LOAD_MORE_LIMIT = 21; // Next batch loaded upon first explicit click
const CONTINUOUS_BATCH_LIMIT = 21; // Batch size on every subsequent automatic pagination request

export default function FeaturedProducts() {
  const searchParams = useSearchParams();
  const sectionRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── State Machine: Modes & Filter (Section 17) ───────────────────────────
  // Mode A: Manual Load More (isContinuousMode = false)
  // Mode B: Continuous Auto-Pagination (isContinuousMode = true)
  const [hasLoadedMore, setHasLoadedMore] = useState<boolean>(false);
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // ── Filter Selection State (Preserved across filter open/close) ──────────
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedDesignTypes, setSelectedDesignTypes] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Metadata for filter options
  const [availableBrands, setAvailableBrands] = useState<BrandModel[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryModel[]>([]);

  // ── Products & Pagination State (Max 21 Initial Products) ───────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
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

  // ── Ensure Initial Product Count matches INITIAL_PRODUCT_LIMIT (21) on Client Mount ───────────
  useEffect(() => {
    if (isContinuousModeRef.current || hasLoadedMore) return;

    const loadProducts = () => {
      setIsLoadingInitial(true);
      getFeaturedProducts({
        tab: "all",
        offset: 0,
        limit: INITIAL_PRODUCT_LIMIT,
        brands: selectedBrands,
        designTypes: selectedDesignTypes,
        audiences: selectedAudiences,
        categories: selectedCategories,
      })
        .then((result) => {
          if (isContinuousModeRef.current || hasLoadedMore) return;
          setProducts(result.products);
          setTotalCount(result.total);
          setHasMore(result.hasMore && result.total > result.products.length);
        })
        .catch((err) => {
          console.error("Failed to load initial featured products:", err);
          setProducts([]);
          setTotalCount(0);
          setHasMore(false);
        })
        .finally(() => {
          setIsLoadingInitial(false);
        });
    };

    loadProducts();

    const handleUpdate = () => {
      if (!isContinuousModeRef.current && !hasLoadedMore) {
        loadProducts();
      }
    };

    window.addEventListener("ayaan:homepage-updated", handleUpdate);
    window.addEventListener("ayaan:data-updated", handleUpdate);

    return () => {
      window.removeEventListener("ayaan:homepage-updated", handleUpdate);
      window.removeEventListener("ayaan:data-updated", handleUpdate);
    };
  }, [hasLoadedMore]);

  // ── Load More Click: First click activates Continuous Mode; subsequent clicks in manual mode reactivate it ──
  const handleLoadMoreClick = async () => {
    if (isLoadingRef.current || isContinuousMode || !hasMore) return;
    notifyExplorerActive("featured", "load-more");

    isLoadingRef.current = true;
    setIsLoadingMore(true);
    setError(null);

    const currentOffset = products.length;
    const currentGen = generationRef.current;

    try {
      const result = await getFeaturedProducts({
        tab: "all",
        offset: currentOffset,
        limit: FIRST_LOAD_MORE_LIMIT,
        brands: selectedBrands,
        designTypes: selectedDesignTypes,
        audiences: selectedAudiences,
        categories: selectedCategories,
      });

      if (generationRef.current !== currentGen) {
        return;
      }

      // Append next batch with duplicate protection
      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const fresh = result.products.filter((p) => !existingIds.has(p.id));
        const next = [...prev, ...fresh];
        setHasMore(result.hasMore && result.total > next.length);
        return next;
      });

      setTotalCount(result.total);

      // ── CRITICAL STATE TRANSITIONS (Sections 1, 2, 3, 4, 8) ────────────────
      // 1. Mark that user has loaded more
      setHasLoadedMore(true);
      // 2. Activate continuous mode (auto-pagination = ON)
      setIsContinuousMode(true);
      isContinuousModeRef.current = true;
      // 3. SEPARATION OF STATES: NEVER trigger filter rail on Load More (Sections 1, 2, 3)
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

        if (
          generationRef.current !== currentGen ||
          !isContinuousModeRef.current
        ) {
          return;
        }

        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = result.products.filter((p) => !existingIds.has(p.id));
          const next = [...prev, ...fresh];
          setHasMore(result.hasMore && result.total > next.length);
          return next;
        });

        setTotalCount(result.total);
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

  // ── Filter Rail Close & Toggle Handlers (Sections 1, 2, 3, 20) ─────────────
  const handleCloseFilter = () => {
    setIsFilterOpen(false);
  };

  const handleToggleFilters = () => {
    setIsFilterOpen((prev) => {
      const next = !prev;
      if (next) {
        notifyExplorerActive("featured", "filter");
      }
      return next;
    });
  };

  // ── Jump to Certificate section and STOP auto-pagination (Sections 5, 6, 7, 8) ──
  const handleJumpToCertificate = () => {
    // 1. Immediately STOP future auto-pagination
    setIsContinuousMode(false);
    isContinuousModeRef.current = false;

    // 2. Smoothly scroll directly to the existing Certificate section
    const certElement =
      document.getElementById("certificate") ||
      document.getElementById("certificates");

    if (certElement) {
      certElement.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.hash = "#certificate";
    }
  };

  // ── Filter Changes Handler ───────────────────────────────────────────────
  const handleFilterUpdate = async (
    brands: string[],
    designTypes: string[],
    audiences: string[],
    categories: string[]
  ) => {
    notifyExplorerActive("featured", "filter");
    setSelectedBrands(brands);
    setSelectedDesignTypes(designTypes);
    setSelectedAudiences(audiences);
    setSelectedCategories(categories);

    // CRITICAL GLOBAL RULE: On ANY filter or selection change, reset to manual mode with max 21 products!
    setHasLoadedMore(false);
    setIsContinuousMode(false);
    isContinuousModeRef.current = false;

    generationRef.current += 1;
    const currentGen = generationRef.current;

    setIsLoadingInitial(true);
    setError(null);

    const limit = INITIAL_PRODUCT_LIMIT;

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
      setHasMore(result.hasMore && result.total > result.products.length);
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
    setIsContinuousMode(false);
    isContinuousModeRef.current = false;
    setHasLoadedMore(false);
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
    if (tabParam === "new-arrivals" || tabParam === "featured") {
      scrollToFeatured();
    }

    const handleActivateEvent = () => {
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

  // Subscribe to explorer coordinator: Keep Featured in collapsed/default state when another section is active
  useEffect(() => {
    return subscribeToExplorerActive((detail) => {
      if (detail.activeSection !== "featured") {
        setIsFilterOpen(false);
        setIsContinuousMode(false);
        isContinuousModeRef.current = false;
        setHasLoadedMore(false);
        setProducts((prev) => (prev.length > INITIAL_PRODUCT_LIMIT ? prev.slice(0, INITIAL_PRODUCT_LIMIT) : prev));
      }
    });
  }, []);

  return (
    <section
      id="featured"
      ref={sectionRef}
      className="pt-1.5 sm:pt-2 pb-8 sm:pb-12 bg-background scroll-mt-20"
    >
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        {/* ── Header & Main Controls Bar ── */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Top Heading: Title */}
          <div>
            <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight text-foreground leading-none">
              FEATURED PRODUCTS
            </h2>
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

            {/* Action Buttons Group: [FILTERS] */}
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

              {/* Clear All Filters Button */}
              {totalActiveFilters > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-sans font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/60 transition-colors cursor-pointer"
                  aria-label="Clear all active filters"
                >
                  <X size={12} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

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
                  {totalActiveFilters > 0 ? "NO MATCHING PRODUCTS FOUND" : "NO FEATURED PRODUCTS YET"}
                </p>
                <p className="text-[13px] text-muted-foreground mb-4 font-sans">
                  {totalActiveFilters > 0
                    ? "Try changing or clearing your active filters."
                    : "No products have been featured on the landing page yet."}
                </p>
                {totalActiveFilters > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="px-5 py-2.5 rounded-full text-[13px] font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    Clear All Filters
                  </button>
                )}
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
                ) : hasMore && totalCount > products.length ? (
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

      {/* ── Floating Down Arrow: active ONLY during auto-pagination (Sections 5, 6, 7, 8) ── */}
      {isContinuousMode && (
        <button
          type="button"
          onClick={handleJumpToCertificate}
          aria-label="Scroll down to Certificate section"
          title="Scroll down to Certificate"
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-foreground text-background shadow-lg hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer border border-border/40 group"
        >
          <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-y-0.5" />
        </button>
      )}
    </section>
  );
}

