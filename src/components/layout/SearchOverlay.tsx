"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Clock, ArrowRight, TrendingUp, Search, X } from "lucide-react";
import { Product } from "@/types";
import { getProducts, toStorefrontProduct } from "@/lib/services/products";
import { formatPrice } from "@/lib/formatters";
import ProductBrandLogoOverlay from "@/components/common/ProductBrandLogoOverlay";
import ProductPromotionBadges from "@/components/common/ProductPromotionBadges";

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectTerm: (term: string) => void;
  variant?: "desktop" | "mobile";
  className?: string;
}

const DEFAULT_RECENT = ["Sweater", "Hoodie", "T-Shirt", "Jacket"];
const TRENDING_SEARCHES = [
  "Oversized T-Shirt",
  "Denim Jacket",
  "Summer Collection",
  "Linen Shirt",
  "Sweaters",
  "Polo Shirt",
];

export default function SearchOverlay({
  isOpen,
  onClose,
  searchQuery,
  onSelectTerm,
  variant = "desktop",
  className = "",
}: SearchOverlayProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const dbList = await getProducts();
        if (dbList && dbList.length > 0) {
          setAllProducts(dbList.map(toStorefrontProduct));
        }
      } catch (err) {
        console.error("Failed to load products for search dropdown:", err);
      }
    }
    load();
  }, []);

  // Persistent recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENT);

  // Load recent searches from localStorage on mount & when opened
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem("ayaan_recent_searches");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentSearches(parsed.slice(0, 5));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [isOpen]);

  // Remove a single recent search item
  const handleRemoveRecentItem = (termToRemove: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter(
        (item) => item.toLowerCase() !== termToRemove.toLowerCase()
      );
      try {
        localStorage.setItem("ayaan_recent_searches", JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  };

  // Filtered/trending products
  const q = searchQuery.toLowerCase().trim();

  const displayedProducts = useMemo(() => {
    if (!q) {
      return allProducts.filter((p) => p.isHot || p.isNew).slice(0, 3);
    }
    const matches = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
        (p.categoryId && p.categoryId.toLowerCase().includes(q))
    );
    return matches.slice(0, 3);
  }, [allProducts, q]);

  const matchingTrending = useMemo(() => {
    if (!q) return TRENDING_SEARCHES.slice(0, 4);
    return TRENDING_SEARCHES.filter((t) => t.toLowerCase().includes(q)).slice(0, 4);
  }, [q]);

  if (!isOpen) return null;

  // ── DESKTOP DROPDOWN LAYOUT ──────────────────────────────────────────────
  if (variant === "desktop") {
    return (
      <div
        data-search-overlay="true"
        className={`absolute top-[calc(100%+0.5rem)] left-0 right-0 w-full xl:w-[103%] xl:-left-[1.5%] z-50 bg-white dark:bg-[#0b1329] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] border border-slate-200/90 dark:border-white/10 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 select-none ${className}`}
      >
        <div className="flex divide-x divide-slate-100 dark:divide-white/10">
          {/* Left Column: Recent & Trending Searches (Roomier ~220-240px width) */}
          <div className="w-[215px] xl:w-[235px] shrink-0 p-4 xl:p-4.5 flex flex-col gap-4 bg-slate-50/60 dark:bg-slate-900/40">
            {/* Active Query Quick Action */}
            {q && (
              <button
                type="button"
                onClick={() => onSelectTerm(searchQuery)}
                className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[13px] font-bold transition-colors group cursor-pointer text-left"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search size={13} className="shrink-0" />
                  <span className="truncate">Search &quot;{searchQuery}&quot;</span>
                </span>
                <ArrowRight size={12} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="mb-2 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Recent Searches
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => onSelectTerm(term)}
                      className="group/item relative flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/80 text-left text-[13px] font-medium text-foreground transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate pr-5">
                        <Clock size={12.5} className="text-muted-foreground/70 shrink-0" />
                        <span className="truncate">{term}</span>
                      </span>

                      {/* Individual Hover Delete (×) Control */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveRecentItem(term, e)}
                        className="absolute right-1.5 p-1 rounded-md opacity-0 group-hover/item:opacity-100 hover:bg-slate-300/50 dark:hover:bg-slate-700/60 text-muted-foreground/80 hover:text-foreground transition-all duration-150 cursor-pointer"
                        aria-label={`Remove ${term} from recent searches`}
                        title="Remove from history"
                      >
                        <X size={12} strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            <div>
              <div className="mb-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Trending
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {matchingTrending.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => onSelectTerm(term)}
                    className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/80 text-left text-[13px] font-medium text-foreground transition-colors group cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <TrendingUp size={12.5} className="text-amber-500 shrink-0" />
                      <span className="truncate">{term}</span>
                    </span>
                    <ArrowRight size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Trending Products or Matching Products (Roomier layout) */}
          <div className="flex-1 p-4 xl:p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {q ? "Matching Products" : "Trending Products"}
                </span>
                {q && displayedProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectTerm(searchQuery)}
                    className="text-[13px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    View all
                  </button>
                )}
              </div>

              {displayedProducts.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {displayedProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={onClose}
                      className="group relative flex flex-col bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-white/10 p-2 transition-all duration-150 text-left hover:shadow-xs hover:border-foreground/30"
                    >
                      {/* Compact Image — Canonical 3:4 */}
                      <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.images?.[0] || "/placeholder.jpg"}
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
                        {/* Promotional Badges (Compact) */}
                        <ProductPromotionBadges
                          product={product}
                          variant="card"
                          className="!top-1.5 !left-1.5"
                        />
                      </div>

                      {/* Product Name */}
                      <span className="text-[13px] font-semibold text-foreground line-clamp-1 leading-tight mb-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </span>

                      {/* Price & MOQ */}
                      <div className="flex items-baseline justify-between gap-1 mt-auto pt-0.5">
                        <span className="text-[13px] font-bold text-foreground tabular-nums">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                          MOQ {product.moq || 10}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-[13px] text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                  <Search size={22} className="text-muted-foreground/40 mb-1" />
                  <p className="font-semibold text-foreground">No preview matches for &quot;{searchQuery}&quot;</p>
                  <p className="text-[11.5px]">Try searching by product name, category, or brand</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MOBILE DROPDOWN LAYOUT ───────────────────────────────────────────────
  return (
    <div
      data-search-overlay="true"
      className={`absolute top-full left-0 right-0 px-2.5 sm:px-4 pt-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150 select-none ${className}`}
    >
      <div className="w-full bg-white dark:bg-[#0b1329] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] border border-slate-200/90 dark:border-white/10 overflow-hidden max-h-[72vh] overflow-y-auto flex flex-col">
        {/* Active Query Quick Action (Mobile) */}
        {q && (
          <div className="p-3.5 border-b border-slate-100 dark:border-white/10 bg-amber-500/10">
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
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Recent Searches
            </span>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((term) => (
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

        {/* Trending Searches (Mobile) */}
        <div className="p-3.5 border-b border-slate-100 dark:border-white/10">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Trending Searches
          </span>
          <div className="flex flex-wrap gap-1.5">
            {matchingTrending.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onSelectTerm(term)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium text-foreground transition-colors cursor-pointer"
              >
                <TrendingUp size={11} className="text-amber-500" />
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Products (Mobile) */}
        <div className="p-3.5">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-2.5">
            {q ? "Matching Products" : "Trending Products"}
          </span>
          {displayedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {displayedProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  onClick={onClose}
                  className="group relative flex flex-col bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-white/10 p-2 text-left"
                >
                  <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 mb-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.images?.[0] || "/placeholder.jpg"}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg";
                      }}
                    />
                    <ProductBrandLogoOverlay
                      brandName={product.brand}
                      brandLogo={product.brandLogo}
                      size="thumb"
                      className="!top-1.5 !right-1.5"
                    />
                    <ProductPromotionBadges
                      product={product}
                      variant="card"
                      className="!top-1.5 !left-1.5"
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground line-clamp-1 leading-tight mb-1">
                    {product.name}
                  </span>
                  <div className="flex items-baseline justify-between gap-1 mt-auto">
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {formatPrice(product.price)}
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
      </div>
    </div>
  );
}

export { SearchOverlay as SearchDropdown };
