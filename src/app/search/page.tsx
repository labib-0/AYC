"use client";

/**
 * /search — Infinite Scroll Product Listing
 *
 * Architecture:
 *  - Server-side pagination via GET /api/v1/products?page=N&per_page=24
 *  - IntersectionObserver sentinel triggers next-page fetches automatically
 *  - AbortController + generation counter prevents stale/race-condition appends
 *  - Duplicate product IDs are tracked and filtered at render time
 *  - URL stays in sync (?page=N) for crawlable paginated URLs
 *  - Filter/sort/query changes reset the list and restart from page 1
 */

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { ProductSkeletonRow } from "@/components/product/ProductCardSkeleton";
import { Product } from "@/types";
import { toStorefrontProduct } from "@/lib/services/products";
import { productService } from "@/services/product.service";
import { brandService, BrandModel } from "@/services/brand.service";
import { categoryService, CategoryModel } from "@/services/category.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";
import GlobalFilterRail from "@/components/common/GlobalFilterRail";
import {
  X,
  Filter,
  Sparkles,
  Search,
  SlidersHorizontal,
  Check,
  AlertCircle,
  RotateCcw,
  ChevronDown,
} from "lucide-react";


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PER_PAGE = 24;

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "popular",    label: "Most Popular" },
  { value: "name_asc",   label: "Name A → Z" },
  { value: "name_desc",  label: "Name Z → A" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router      = useRouter();

  // ── URL params ──────────────────────────────────────────────────────────
  const query               = searchParams.get("query") || "";
  const initialBrandParam   = searchParams.get("brand") || "";
  const initialDesignTypeParam = searchParams.get("designType") || searchParams.get("design_type") || "";
  const initialAudienceParam= searchParams.get("audience") || "";
  const initialCategoryParam= searchParams.get("category") || "";
  const initialSortParam    = (searchParams.get("sort") || "newest") as SortValue;
  const initialPageParam    = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const initialFilterOpen   = searchParams.get("filterOpen") === "true";

  // ── Filter state (4 Distinct Dimensions: Brand, Design Type, Audience, Category) ──
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() =>
    initialBrandParam ? initialBrandParam.split(",").map((s) => s.trim()).filter(Boolean) : []
  );
  const [selectedDesignTypes, setSelectedDesignTypes] = useState<string[]>(() => {
    if (!initialDesignTypeParam) return [];
    return initialDesignTypeParam
      .toUpperCase()
      .split(",")
      .map((s) => {
        const item = s.trim();
        if (item === "REPLICA" || item === "MASTER_COPY" || item === "MC") return "MASTER COPY";
        return item;
      })
      .filter(Boolean);
  });
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(() =>
    initialAudienceParam
      ? initialAudienceParam.toUpperCase().split(",").map((s) => s.trim()).filter(Boolean)
      : []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    initialCategoryParam ? initialCategoryParam.split(",").map((s) => s.trim()).filter(Boolean) : []
  );
  const [sort, setSort] = useState<SortValue>(initialSortParam);
  const [isFilterOpen, setIsFilterOpen] = useState(initialFilterOpen);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // ── Infinite scroll state ────────────────────────────────────────────────
  const [products,    setProducts]    = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(0);   // 0 = not yet fetched
  const [lastPage,    setLastPage]    = useState(1);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);  // initial load
  const [loadingMore, setLoadingMore] = useState(false); // subsequent pages
  const [error,       setError]       = useState<string | null>(null);

  // Duplicate guard
  const loadedIdsRef = useRef<Set<string>>(new Set());
  // Generation counter: increments on every filter/query/sort change
  const genRef = useRef(0);
  // Sentinel div observed by IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Active AbortController for the current in-flight request
  const abortRef = useRef<AbortController | null>(null);

  // ── Available live brands and product categories ──────────────────────────
  const [liveBrands, setLiveBrands] = useState<BrandModel[]>([]);
  const [liveCategories, setLiveCategories] = useState<CategoryModel[]>([]);

  useEffect(() => {
    async function loadTaxonomies() {
      try {
        const [bData, cData] = await Promise.all([
          brandService.getBrands(),
          categoryService.getCategories(),
        ]);
        setLiveBrands(bData);
        setLiveCategories(cData);
      } catch (err) {
        console.error("Failed to load search taxonomies:", err);
      }
    }
    loadTaxonomies();
  }, []);

  const availableBrands = useMemo(() => {
    return liveBrands.map((b) => b.name);
  }, [liveBrands]);

  const availableCategories = useMemo(() => {
    return liveCategories.map((c) => c.name);
  }, [liveCategories]);

  // ── URL sync helper ───────────────────────────────────────────────────────
  const updateUrl = useCallback(
    (brands: string[], designTypes: string[], audiences: string[], categories: string[], sortVal: SortValue, page: number) => {
      const params = new URLSearchParams();
      if (query)             params.set("query",    query);
      if (brands.length)     params.set("brand",    brands.join(","));
      if (designTypes.length)params.set("designType", designTypes.join(","));
      if (audiences.length)  params.set("audience", audiences.map((a) => a.toLowerCase()).join(","));
      if (categories.length) params.set("category", categories.map((c) => c.toLowerCase()).join(","));
      if (sortVal !== "newest") params.set("sort", sortVal);
      if (page > 1)          params.set("page",     page.toString());
      if (isFilterOpen)      params.set("filterOpen", "true");
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [query, router, isFilterOpen]
  );

  const handleFilterToggle = () => {
    const newFilterState = !isFilterOpen;
    setIsFilterOpen(newFilterState);
    const params = new URLSearchParams(searchParams.toString());
    if (newFilterState) params.set("filterOpen", "true");
    else params.delete("filterOpen");
    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  // ── Core fetch function ───────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (page: number, gen: number) => {
      // Abort any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const isFirstPage = page === 1;
      if (isFirstPage) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
        setError(null);
      }

      try {
        const result = await productService.getProductsPaginated(
          {
            q:           query || undefined,
            brand:       selectedBrands.join(",") || undefined,
            design_type: selectedDesignTypes.join(",") || undefined,
            audience:    selectedAudiences.join(",") || undefined,
            category:    selectedCategories.join(",") || undefined,
            sort,
            page,
            per_page:    PER_PAGE,
          },
          controller.signal
        );

        // Discard stale responses (generation changed while request was in flight)
        if (gen !== genRef.current) return;

        const newProducts = result.data
          .map(toStorefrontProduct)
          .filter((p) => {
            if (loadedIdsRef.current.has(p.id)) return false;
            loadedIdsRef.current.add(p.id);
            return true;
          });

        setProducts((prev) => (isFirstPage ? newProducts : [...prev, ...newProducts]));
        setCurrentPage(result.meta.current_page);
        setLastPage(result.meta.last_page);
        setTotal(result.meta.total);

        // Sync URL
        updateUrl(selectedBrands, selectedDesignTypes, selectedAudiences, selectedCategories, sort, result.meta.current_page);
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.message === "AbortError") return;
        if (gen !== genRef.current) return;
        setError("Couldn't load products. Please try again.");
      } finally {
        if (gen === genRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, selectedBrands, selectedDesignTypes, selectedAudiences, selectedCategories, sort]
  );

  // ── Reset & reload on filter/sort/query change ────────────────────────────
  const resetAndReload = useCallback(
    (brands: string[], designTypes: string[], audiences: string[], categories: string[], sortVal: SortValue) => {
      genRef.current += 1;
      loadedIdsRef.current = new Set();
      setProducts([]);
      setCurrentPage(0);
      setLastPage(1);
      setTotal(0);
      setError(null);

      // Build params for fetchPage using latest filter values
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const gen = genRef.current;

      setLoading(true);

      productService
        .getProductsPaginated(
          {
            q:           query || undefined,
            brand:       brands.join(",") || undefined,
            design_type: designTypes.join(",") || undefined,
            audience:    audiences.join(",") || undefined,
            category:    categories.join(",") || undefined,
            sort:        sortVal,
            page:        1,
            per_page:    PER_PAGE,
          },
          controller.signal
        )
        .then((result) => {
          if (gen !== genRef.current) return;
          const newProducts = result.data
            .map(toStorefrontProduct)
            .filter((p) => {
              if (loadedIdsRef.current.has(p.id)) return false;
              loadedIdsRef.current.add(p.id);
              return true;
            });
          setProducts(newProducts);
          setCurrentPage(result.meta.current_page);
          setLastPage(result.meta.last_page);
          setTotal(result.meta.total);
          updateUrl(brands, designTypes, audiences, categories, sortVal, 1);
        })
        .catch((err) => {
          if (err?.name === "AbortError" || err?.message === "AbortError") return;
          if (gen !== genRef.current) return;
          setError("Couldn't load products. Please try again.");
        })
        .finally(() => {
          if (gen === genRef.current) {
            setLoading(false);
            setLoadingMore(false);
          }
        });
    },
    [query, updateUrl]
  );

  // ── Initial load (on mount and when query changes) ────────────────────────
  useEffect(() => {
    genRef.current += 1;
    loadedIdsRef.current = new Set();
    const gen = genRef.current;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setProducts([]);
    setCurrentPage(0);
    setLastPage(1);
    setTotal(0);
    setError(null);
    setLoading(true);

    productService
      .getProductsPaginated(
        {
          q:           query || undefined,
          brand:       selectedBrands.join(",") || undefined,
          design_type: selectedDesignTypes.join(",") || undefined,
          audience:    selectedAudiences.join(",") || undefined,
          category:    selectedCategories.join(",") || undefined,
          sort,
          page:        initialPageParam,
          per_page:    PER_PAGE,
        },
        controller.signal
      )
      .then((result) => {
        if (gen !== genRef.current) return;
        const newProducts = result.data
          .map(toStorefrontProduct)
          .filter((p) => {
            if (loadedIdsRef.current.has(p.id)) return false;
            loadedIdsRef.current.add(p.id);
            return true;
          });
        setProducts(newProducts);
        setCurrentPage(result.meta.current_page);
        setLastPage(result.meta.last_page);
        setTotal(result.meta.total);
      })
      .catch((err) => {
        if (err?.name === "AbortError" || err?.message === "AbortError") return;
        if (gen !== genRef.current) return;
        setError("Couldn't load products. Please try again.");
      })
      .finally(() => {
        if (gen === genRef.current) setLoading(false);
      });

    return () => {
      controller.abort();
    };
    // Only re-run on query change (filters have their own handlers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── IntersectionObserver: auto-load next page ─────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          isFilterOpen &&
          !loading &&
          !loadingMore &&
          !error &&
          currentPage > 0 &&
          currentPage < lastPage
        ) {
          const nextPage = currentPage + 1;
          const gen = genRef.current;
          setLoadingMore(true);

          productService
            .getProductsPaginated(
              {
                q:        query || undefined,
                brand:    selectedBrands.join(",") || undefined,
                audience: selectedAudiences.join(",") || undefined,
                category: selectedCategories.join(",") || undefined,
                sort,
                page:     nextPage,
                per_page: PER_PAGE,
              },
              undefined // no abort for sequential scroll loads
            )
            .then((result) => {
              if (gen !== genRef.current) return;
              const newProducts = result.data
                .map(toStorefrontProduct)
                .filter((p) => {
                  if (loadedIdsRef.current.has(p.id)) return false;
                  loadedIdsRef.current.add(p.id);
                  return true;
                });
              setProducts((prev) => [...prev, ...newProducts]);
              setCurrentPage(result.meta.current_page);
              setLastPage(result.meta.last_page);
              setTotal(result.meta.total);
              updateUrl(selectedBrands, selectedDesignTypes, selectedAudiences, selectedCategories, sort, result.meta.current_page);
            })
            .catch((err) => {
              if (err?.name === "AbortError") return;
              if (gen !== genRef.current) return;
              setError("Couldn't load more products.");
            })
            .finally(() => {
              if (gen === genRef.current) setLoadingMore(false);
            });
        }
      },
      { rootMargin: "600px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, loadingMore, error, currentPage, lastPage, query, selectedBrands, selectedAudiences, sort, updateUrl, isFilterOpen]);

  // ── Retry failed page ─────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    const nextPage = currentPage < lastPage ? currentPage + 1 : currentPage;
    fetchPage(nextPage, genRef.current);
  }, [currentPage, lastPage, fetchPage]);

  // ── Filter toggle handlers ────────────────────────────────────────────────
  const handleBrandToggle = useCallback(
    (brands: string[]) => {
      setSelectedBrands(brands);
      resetAndReload(brands, selectedDesignTypes, selectedAudiences, selectedCategories, sort);
    },
    [selectedDesignTypes, selectedAudiences, selectedCategories, sort, resetAndReload]
  );

  const handleDesignTypeToggle = useCallback(
    (designTypes: string[]) => {
      setSelectedDesignTypes(designTypes);
      resetAndReload(selectedBrands, designTypes, selectedAudiences, selectedCategories, sort);
    },
    [selectedBrands, selectedAudiences, selectedCategories, sort, resetAndReload]
  );

  const handleAudienceToggle = useCallback(
    (audiences: string[]) => {
      setSelectedAudiences(audiences);
      resetAndReload(selectedBrands, selectedDesignTypes, audiences, selectedCategories, sort);
    },
    [selectedBrands, selectedDesignTypes, selectedCategories, sort, resetAndReload]
  );

  const handleCategoryToggle = useCallback(
    (categories: string[]) => {
      setSelectedCategories(categories);
      resetAndReload(selectedBrands, selectedDesignTypes, selectedAudiences, categories, sort);
    },
    [selectedBrands, selectedDesignTypes, selectedAudiences, sort, resetAndReload]
  );

  const handleSortChange = useCallback(
    (newSort: SortValue) => {
      setSort(newSort);
      setIsSortOpen(false);
      resetAndReload(selectedBrands, selectedDesignTypes, selectedAudiences, selectedCategories, newSort);
    },
    [selectedBrands, selectedDesignTypes, selectedAudiences, selectedCategories, resetAndReload]
  );

  const handleClearFilters = useCallback(() => {
    setSelectedBrands([]);
    setSelectedDesignTypes([]);
    setSelectedAudiences([]);
    setSelectedCategories([]);
    resetAndReload([], [], [], [], sort);
  }, [sort, resetAndReload]);

  const handleClearSearch = useCallback(() => {
    router.push("/");
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFilterOpen(false);
        setIsSortOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const activeFilterCount =
    selectedBrands.length +
    selectedDesignTypes.length +
    selectedAudiences.length +
    selectedCategories.length;
  const hasActiveFilters  = activeFilterCount > 0;
  const hasMore           = currentPage < lastPage;
  const isEndOfResults    = currentPage >= lastPage && currentPage > 0 && products.length > 0;

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  // ── Initial loading skeleton (full grid) ──────────────────────────────────
  if (loading) {
    return (
      <div className="w-full bg-background min-h-[70vh] py-6 sm:py-8">
        <div className="mx-auto w-full max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/70 mb-6">
            <div className="space-y-2">
              <div className="h-7 bg-secondary/60 rounded-full w-64 animate-pulse" />
              <div className="h-4 bg-secondary/40 rounded-full w-48 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col lg:flex-row items-start gap-6 xl:gap-8 w-full">
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1440px]:grid-cols-6 2xl:grid-cols-6 gap-3.5 sm:gap-5">
                <ProductSkeletonRow count={12} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full render ───────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-background min-h-[70vh] py-6 sm:py-8">
      <div className="mx-auto w-full max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/70 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
                {query.trim()
                  ? `SEARCH RESULTS — ${total.toLocaleString()} PRODUCT${total !== 1 ? "S" : ""}`
                  : selectedBrands.length === 1
                  ? `${selectedBrands[0].toUpperCase()} COLLECTION — ${total.toLocaleString()} PRODUCT${total !== 1 ? "S" : ""}`
                  : `ALL PRODUCTS — ${total.toLocaleString()} PRODUCT${total !== 1 ? "S" : ""}`}
              </h1>
              <Sparkles size={18} className="text-primary hidden sm:inline-block" />
            </div>
            {query.trim() && (
              <p className="section-subtitle mt-1 sm:mt-1.5">
                Showing wholesale &amp; retail products matching{" "}
                <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>
              </p>
            )}
            {products.length > 0 && total > PER_PAGE && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {products.length.toLocaleString()} of {total.toLocaleString()} loaded
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Filter Toggle Button (Desktop & Tablet) */}
            <button
              type="button"
              onClick={handleFilterToggle}
              aria-label={isFilterOpen ? "Close filters" : "Open filters"}
              aria-expanded={isFilterOpen}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-sans font-bold uppercase tracking-wider border transition-all duration-200 cursor-pointer ${
                isFilterOpen || hasActiveFilters
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "bg-secondary/70 hover:bg-secondary text-foreground border-border/80"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>FILTERS</span>
              {hasActiveFilters && (
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                    isFilterOpen
                      ? "bg-background text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSortOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border text-xs font-bold uppercase tracking-wider text-foreground bg-card hover:bg-secondary transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                <span>{currentSortLabel}</span>
                <ChevronDown size={13} className={`transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
              </button>
              {isSortOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-border/80 rounded-xl shadow-xl z-40 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSortChange(opt.value)}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                        sort === opt.value
                          ? "text-primary bg-primary/[0.07]"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {query.trim() && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-foreground hover:bg-secondary text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer self-start sm:self-auto active:scale-95 shadow-sm"
              >
                <X size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className={
            isFilterOpen
              ? "grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 xl:gap-8 w-full"
              : "w-full"
          }>

          {isFilterOpen && (
            <GlobalFilterRail
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              selectedBrands={selectedBrands}
              selectedDesignTypes={selectedDesignTypes}
              selectedAudiences={selectedAudiences}
              selectedCategories={selectedCategories}
              onBrandsChange={handleBrandToggle}
              onDesignTypesChange={handleDesignTypeToggle}
              onAudiencesChange={handleAudienceToggle}
              onCategoriesChange={handleCategoryToggle}
              onClearAll={handleClearFilters}
              availableBrands={liveBrands}
              availableCategories={liveCategories}
            />
          )}

          {/* Product grid area */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-4">

            {/* Product grid */}
            {products.length > 0 ? (
              <div className={`grid gap-3 sm:gap-3.5 xl:gap-4 transition-all duration-200 ${
                  isFilterOpen
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6"
                }`}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}

                {/* Loading more — skeleton cards inline with grid */}
                {loadingMore && <ProductSkeletonRow count={isFilterOpen ? 5 : 6} />}
              </div>
            ) : (
              /* Empty state */
              <div className="w-full py-16 px-4 text-center bg-card rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center my-6 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground mb-3.5">
                  <Search size={24} />
                </div>
                <h3 className="text-lg font-bold uppercase font-display mb-1 text-foreground">
                  No Products Found
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
                  {query.trim() ? (
                    <>No products match &ldquo;{query}&rdquo; with your selected filters. Try changing your search or filters.</>
                  ) : (
                    <>No products match your selected filter criteria. Try clearing one or more filters.</>
                  )}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {hasActiveFilters && query.trim() ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleClearFilters();
                        handleClearSearch();
                      }}
                      className="px-6 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-wider rounded-full hover:opacity-90 transition-opacity cursor-pointer active:scale-95 shadow-xs"
                    >
                      Clear All Criteria
                    </button>
                  ) : hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="px-6 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-wider rounded-full hover:opacity-90 transition-opacity cursor-pointer active:scale-95 shadow-xs"
                    >
                      Clear Filters
                    </button>
                  ) : query.trim() ? (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="px-6 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-wider rounded-full hover:opacity-90 transition-opacity cursor-pointer active:scale-95 shadow-xs"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="px-6 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-wider rounded-full hover:opacity-90 transition-opacity cursor-pointer active:scale-95 shadow-xs"
                    >
                      Reset All
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error / retry state */}
            {error && !loadingMore && (
              <div className="flex flex-col items-center gap-3 py-8 text-center animate-in fade-in">
                <div className="flex items-center gap-2 text-sm text-destructive font-semibold">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-border text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition-colors cursor-pointer active:scale-95 shadow-sm"
                >
                  <RotateCcw size={13} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Sentinel — triggers next page when it enters the viewport */}
            {hasMore && !error && (
              <div
                ref={sentinelRef}
                className="w-full h-4 mt-2"
                aria-hidden="true"
              />
            )}

            {/* Fallback button when filter is closed (auto pagination OFF) */}
            {!isFilterOpen && hasMore && !error && !loading && (
               <div className="flex justify-center py-8">
                  <button
                    type="button"
                    onClick={handleRetry} // triggers next page
                    className="px-8 py-3 rounded-full text-xs font-sans font-bold uppercase tracking-widest bg-foreground text-background hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-sm"
                  >
                    LOAD MORE
                  </button>
               </div>
            )}

            {/* End of results indicator */}
            {isEndOfResults && !hasMore && (
              <div className="flex items-center justify-center gap-3 py-10">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3">
                  End of results — {total.toLocaleString()} products
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Sort dropdown backdrop */}
      {isSortOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsSortOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export (wrapped in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[60vh] flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-3 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Loading Search Results...
            </p>
          </div>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}

