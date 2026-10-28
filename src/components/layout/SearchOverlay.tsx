"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Clock, ArrowRight, Search, X, Loader2 } from "lucide-react";
import { brandService, BrandModel } from "@/services/brand.service";
import { productService, SearchSuggestionsProductItem } from "@/services/product.service";
import { searchHistoryService } from "@/services/search-history.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";
import { formatPrice } from "@/lib/formatters";
import ProductBrandLogoOverlay from "@/components/common/ProductBrandLogoOverlay";

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectTerm: (term: string) => void;
  onSelectBrand?: (brandName: string) => void;
  variant?: "desktop" | "mobile";
  className?: string;
}

export default function SearchOverlay({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  onSelectTerm,
  onSelectBrand,
  variant = "desktop",
  className = "",
}: SearchOverlayProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingBrands, setTrendingBrands] = useState<BrandModel[]>([]);
  const [matchingProducts, setMatchingProducts] = useState<SearchSuggestionsProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // References for request cancellation & debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequestIdRef = useRef<number>(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Position boundary clamp: Ensure dropdown never overflows past right viewport edge
  useEffect(() => {
    if (!isOpen || variant !== "desktop") return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const clampToViewport = () => {
      // Reset any previous transform to measure natural right edge
      overlay.style.transform = "";
      const rect = overlay.getBoundingClientRect();
      const maxRight = window.innerWidth - 16;
      if (rect.right > maxRight) {
        const overflow = rect.right - maxRight;
        overlay.style.transform = `translateX(-${overflow}px)`;
      }
    };

    clampToViewport();
    window.addEventListener("resize", clampToViewport, { passive: true });
    return () => window.removeEventListener("resize", clampToViewport);
  }, [isOpen, variant]);

  // ── 1. Hydrate Recent Searches ─────────────────────────────────────────────
  const refreshRecentSearches = useCallback(async () => {
    try {
      const recents = await searchHistoryService.getRecentSearches();
      setRecentSearches(recents);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Synchronous quick load
      setRecentSearches(searchHistoryService.getRecentSearchesSync());
      // Background full sync with backend / cache
      refreshRecentSearches();
    }
  }, [isOpen, refreshRecentSearches]);

  useEffect(() => {
    const handleUpdate = () => {
      setRecentSearches(searchHistoryService.getRecentSearchesSync());
    };
    if (typeof window !== "undefined") {
      window.addEventListener("ayaan:recent-searches-updated", handleUpdate);
      return () => {
        window.removeEventListener("ayaan:recent-searches-updated", handleUpdate);
      };
    }
  }, []);

  // ── 2. Load Storefront-Visible Brands in Authoritative Admin Sort Order ────
  useEffect(() => {
    let isMounted = true;
    async function loadBrands() {
      try {
        const brands = await brandService.getBrands({ all: false });
        if (!isMounted) return;

        // Authoritative admin sort order: sort_order ASC, name ASC
        // Only storefront-eligible active brands with products (or published)
        const eligible = brands
          .filter((b) => b.is_active !== false && (b.products_count === undefined || b.products_count > 0))
          .sort((a, b) => {
            const orderDiff = (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
            if (orderDiff !== 0) return orderDiff;
            return a.name.localeCompare(b.name);
          });

        // Strictly capped at a maximum of 3 brand cards in the initial desktop state
        setTrendingBrands(eligible.slice(0, 3));
      } catch (err) {
        console.error("Failed to load brands for search dropdown:", err);
      }
    }
    loadBrands();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── 3. Debounced Multi-Dimensional Live Product Search ──────────────────────
  const trimmedQ = searchQuery.trim();

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!trimmedQ) {
      setMatchingProducts([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    debounceTimerRef.current = setTimeout(async () => {
      const requestId = ++currentRequestIdRef.current;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await productService.getSearchSuggestions(trimmedQ, {
          signal: controller.signal,
        });

        // Discard if stale response from an earlier request
        if (requestId !== currentRequestIdRef.current) return;

        setMatchingProducts(res.products || []);
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
          return;
        }
        if (requestId === currentRequestIdRef.current) {
          setMatchingProducts([]);
        }
      } finally {
        if (requestId === currentRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, 280); // 280ms optimal debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [trimmedQ]);

  // ── 4. Handlers ────────────────────────────────────────────────────────────
  const handleRemoveRecentItem = async (termToRemove: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = await searchHistoryService.removeSearch(termToRemove);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await searchHistoryService.clearAll();
    setRecentSearches([]);
  };

  const handleBrandClick = (brandName: string) => {
    setSearchQuery(brandName);
    if (onSelectBrand) {
      onSelectBrand(brandName);
    } else {
      onSelectTerm(brandName);
    }
  };

  // Filter matching recent searches when typing
  const matchingRecentSearches = useMemo(() => {
    if (!trimmedQ) return recentSearches;
    const lower = trimmedQ.toLowerCase();
    return recentSearches.filter((t) => t.toLowerCase().includes(lower));
  }, [recentSearches, trimmedQ]);

  if (!isOpen) return null;

  // ───────────────────────────────────────────────────────────────────────────
  // DESKTOP DROPDOWN LAYOUT
  // ───────────────────────────────────────────────────────────────────────────
  if (variant === "desktop") {
    return (
      <div
        ref={overlayRef}
        data-search-overlay="true"
        className={`absolute top-[calc(100%+0.5rem)] left-0 w-full min-w-[min(100vw-2rem,580px)] lg:min-w-[min(100vw-2rem,620px)] xl:min-w-[min(100vw-2rem,660px)] max-w-[calc(100vw-2rem)] z-50 bg-white dark:bg-[#0b1329] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] border border-slate-200/90 dark:border-white/10 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 select-none ${className}`}
      >
        <div className="flex divide-x divide-slate-100 dark:divide-white/10 min-h-[220px]">
          {/* Left Column: Recent Searches & Active Query Action */}
          <div className="w-[190px] xl:w-[215px] shrink-0 p-3.5 xl:p-4 flex flex-col gap-3 bg-slate-50/70 dark:bg-slate-900/50">
            {/* Active Query Quick Action Button */}
            {trimmedQ && (
              <button
                type="button"
                onClick={() => onSelectTerm(searchQuery)}
                className="w-full flex items-center justify-between py-1.5 xl:py-2 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs xl:text-[13px] font-bold transition-colors group cursor-pointer text-left focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-amber-500"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search size={13} className="shrink-0" />
                  <span className="truncate">Search &quot;{searchQuery}&quot;</span>
                </span>
                <ArrowRight size={12} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Recent Searches Panel */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Searches
                </span>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllRecent}
                    className="text-[10px] xl:text-[10.5px] font-semibold text-muted-foreground/70 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Clear"
                  >
                    Clear
                  </button>
                )}
              </div>

              {matchingRecentSearches.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {matchingRecentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => onSelectTerm(term)}
                      className="group/item relative flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/80 text-left text-xs xl:text-[13px] font-medium text-foreground transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate pr-6">
                        <Clock size={12} className="text-muted-foreground/70 shrink-0" />
                        <span className="truncate">{term}</span>
                      </span>

                      {/* Individual Delete Control (×) */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveRecentItem(term, e)}
                        className="absolute right-1.5 p-1 rounded-md opacity-0 group-hover/item:opacity-100 hover:bg-slate-300/50 dark:hover:bg-slate-700/60 text-muted-foreground/80 hover:text-foreground transition-all duration-150 cursor-pointer focus-visible:opacity-100"
                        aria-label={`Remove ${term}`}
                        title="Remove"
                      >
                        <X size={12} strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 px-1 text-left text-xs text-muted-foreground/60 italic">
                  {trimmedQ ? "No matching searches" : "No recent searches"}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Trending Brands (Empty Query) OR Matching Products (Active Query) */}
          <div className="flex-1 min-w-0 p-3.5 xl:p-4 flex flex-col justify-between">
            {!trimmedQ ? (
              // ── EMPTY QUERY STATE: TRENDING BRANDS (Admin-ordered, capped at 3) ────
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Trending Brands
                  </span>
                  <Link
                    href="/products"
                    onClick={onClose}
                    className="text-xs xl:text-[12px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    All Brands
                  </Link>
                </div>

                {trendingBrands.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 xl:gap-2.5">
                    {trendingBrands.map((brand) => {
                      const logoUrl = getBrandLogoUrl(brand.name, brand.logo_url || brand.logo);
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => handleBrandClick(brand.name)}
                          className="group relative flex flex-col items-center justify-center p-2.5 xl:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/90 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 transition-all duration-150 cursor-pointer text-center hover:border-amber-500/40 dark:hover:border-amber-500/40 hover:shadow-xs focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-amber-500 min-w-0"
                          title={`Discover ${brand.name} collection`}
                        >
                          {/* Brand Logo Container */}
                          <div className="relative w-12 h-10 xl:w-14 xl:h-12 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 flex items-center justify-center p-1.5 mb-2 overflow-hidden shadow-xs group-hover:scale-105 transition-transform duration-200">
                            {logoUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={logoUrl}
                                alt={brand.name}
                                className="max-h-full max-w-full object-contain filter dark:brightness-110"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <span className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                {brand.name.slice(0, 2)}
                              </span>
                            )}
                          </div>

                          {/* Brand Name */}
                          <span className="text-xs xl:text-[12.5px] font-bold text-foreground truncate w-full leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {brand.name}
                          </span>

                          {/* Product Count / Discover Tag */}
                          <span className="text-[10px] xl:text-[10.5px] font-medium text-muted-foreground mt-0.5 truncate w-full">
                            {brand.products_count ? `${brand.products_count} Products` : "Explore"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    Discover our verified manufacturer brands
                  </div>
                )}
              </div>
            ) : (
              // ── ACTIVE QUERY STATE: DYNAMIC PRODUCT MATCHES ────────────────────────
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    Matching Products
                    {isLoading && <Loader2 size={12} className="animate-spin text-amber-500" />}
                    {!isLoading && matchingProducts.length > 0 && (
                      <span className="text-muted-foreground/70 font-normal">({matchingProducts.length})</span>
                    )}
                  </span>
                  {matchingProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectTerm(searchQuery)}
                      className="text-xs xl:text-[12.5px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      View all results
                    </button>
                  )}
                </div>

                {isLoading && matchingProducts.length === 0 ? (
                  <div className="grid grid-cols-3 gap-2 xl:gap-2.5 py-1">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="flex flex-col bg-slate-100/70 dark:bg-slate-800/40 rounded-xl p-2 animate-pulse h-[160px]"
                      />
                    ))}
                  </div>
                ) : matchingProducts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 xl:gap-2.5">
                    {matchingProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        onClick={onClose}
                        className="group relative flex flex-col bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-white/10 p-2 transition-all duration-150 text-left hover:shadow-xs hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-amber-500 min-w-0"
                      >
                        {/* Compact Image — Canonical 3:4 */}
                        <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 mb-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.image || "/placeholder.jpg"}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg";
                            }}
                          />
                          {/* Actual Brand Logo Overlay (Compact) */}
                          <ProductBrandLogoOverlay
                            brandName={product.brand}
                            brandLogo={product.brandLogo}
                            size="thumb"
                            className="!top-1.5 !right-1.5"
                          />
                        </div>

                        {/* Product Name */}
                        <span className="text-xs xl:text-[13px] font-semibold text-foreground truncate leading-tight mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {product.name}
                        </span>

                        {/* Price & MOQ */}
                        <div className="flex items-baseline justify-between gap-1 mt-auto pt-0.5">
                          {product.has_valid_price && product.price > 0 ? (
                            <span className="text-xs xl:text-[13px] font-bold text-foreground tabular-nums truncate">
                              {formatPrice(product.price)}
                            </span>
                          ) : (
                            <span className="text-[11px] xl:text-[12px] font-semibold text-muted-foreground truncate">
                              Price on Request
                            </span>
                          )}
                          <span className="text-[10px] xl:text-[11px] font-medium text-muted-foreground uppercase tracking-tight shrink-0">
                            MOQ {product.moq || 10}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  // ZERO MATCHES STATE
                  <div className="py-10 text-center text-xs xl:text-[13px] text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                    <Search size={22} className="text-muted-foreground/40 mb-1" />
                    <p className="font-semibold text-foreground">
                      No matching products found for &quot;{searchQuery}&quot;
                    </p>
                    <p className="text-[11px] xl:text-[11.5px] max-w-xs">
                      Try searching by product name, category, or brand.
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelectTerm(searchQuery)}
                      className="mt-2 text-xs xl:text-[12px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      View all results &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MOBILE DROPDOWN LAYOUT
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div
      data-search-overlay="true"
      className={`absolute top-full left-0 right-0 px-2.5 sm:px-4 pt-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150 select-none ${className}`}
    >
      <div className="w-full bg-white dark:bg-[#0b1329] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] border border-slate-200/90 dark:border-white/10 overflow-hidden max-h-[72vh] overflow-y-auto flex flex-col">
        {/* Active Query Quick Action (Mobile) */}
        {trimmedQ && (
          <div className="p-3 border-b border-slate-100 dark:border-white/10 bg-amber-500/10">
            <button
              type="button"
              onClick={() => onSelectTerm(searchQuery)}
              className="w-full flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-bold cursor-pointer text-left"
            >
              <span className="flex items-center gap-2 truncate">
                <Search size={14} className="shrink-0" />
                <span className="truncate">Search &quot;{searchQuery}&quot;</span>
              </span>
              <ArrowRight size={13} className="shrink-0" />
            </button>
          </div>
        )}

        {/* Recent Searches (Mobile) */}
        {recentSearches.length > 0 && (
          <div className="p-3.5 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block">
                Recent Searches
              </span>
              <button
                type="button"
                onClick={handleClearAllRecent}
                className="text-[10px] font-semibold text-muted-foreground/70 hover:text-rose-500"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchingRecentSearches.map((term) => (
                <div
                  key={term}
                  onClick={() => onSelectTerm(term)}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium text-foreground transition-colors cursor-pointer"
                >
                  <Clock size={11} className="text-muted-foreground/70" />
                  <span>{term}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveRecentItem(term, e)}
                    className="p-0.5 ml-0.5 text-muted-foreground/70 hover:text-foreground rounded-full hover:bg-slate-300/60 dark:hover:bg-slate-700/60 transition-colors"
                    aria-label={`Remove ${term}`}
                    title="Remove"
                  >
                    <X size={11} strokeWidth={2.2} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty Query: Trending Brands (Mobile) */}
        {!trimmedQ && trendingBrands.length > 0 && (
          <div className="p-3.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-2.5">
              Trending Brands
            </span>
            <div className="grid grid-cols-3 gap-2">
              {trendingBrands.map((brand) => {
                const logoUrl = getBrandLogoUrl(brand.name, brand.logo_url || brand.logo);
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => handleBrandClick(brand.name)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-center cursor-pointer"
                  >
                    <div className="w-12 h-10 rounded-md bg-white dark:bg-slate-800 border border-slate-200/50 flex items-center justify-center p-1 mb-1.5">
                      {logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={logoUrl}
                          alt={brand.name}
                          className="max-h-full max-w-full object-contain filter dark:brightness-110"
                          loading="lazy"
                        />
                      ) : (
                        <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200">
                          {brand.name.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-foreground line-clamp-1">
                      {brand.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Query: Matching Products (Mobile) */}
        {trimmedQ && (
          <div className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block">
                Matching Products
              </span>
              {matchingProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectTerm(searchQuery)}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400"
                >
                  View all
                </button>
              )}
            </div>

            {isLoading && matchingProducts.length === 0 ? (
              <div className="py-6 flex items-center justify-center text-amber-500">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : matchingProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {matchingProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onClick={onClose}
                    className="flex flex-col bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-white/10 p-2 text-left"
                  >
                    <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 mb-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image || "/placeholder.jpg"}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg";
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground line-clamp-1 mb-1">
                      {product.name}
                    </span>
                    <div className="flex items-baseline justify-between gap-1 mt-auto">
                      <span className="text-xs font-bold text-foreground tabular-nums">
                        {product.has_valid_price && product.price > 0 ? formatPrice(product.price) : "Price on Request"}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">
                        MOQ {product.moq || 10}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No matching preview products
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { SearchOverlay as SearchDropdown };
