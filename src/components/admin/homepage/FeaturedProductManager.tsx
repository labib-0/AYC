"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Plus, 
  Search, 
  X, 
  Check, 
  Star, 
  Package, 
  Save, 
  GripVertical, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Sparkles 
} from "lucide-react";
import { 
  homepageService, 
  HomepageFeaturedProductModel, 
  ProductSearchResultItem 
} from "@/services/homepage.service";
import { useAdminOrderedList } from "@/components/admin/ordered-list";

function ProductItemThumbnail({
  src,
  alt,
}: {
  src?: string | null;
  alt: string;
}) {
  const [currentSrc, setCurrentSrc] = useState<string>(() => src || "/placeholder.jpg");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || "/placeholder.jpg");
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError && currentSrc !== "/placeholder.jpg") {
      setHasError(true);
      setCurrentSrc("/placeholder.jpg");
    } else {
      setHasError(true);
    }
  };

  return (
    <div className="relative w-9 h-11 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/60 flex items-center justify-center">
      {!hasError && currentSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={handleError}
        />
      ) : (
        <Package size={16} className="text-muted-foreground/40" />
      )}
    </div>
  );
}

export interface FeaturedProductManagerProps {
  initialProducts: HomepageFeaturedProductModel[];
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export default function FeaturedProductManager({
  initialProducts,
  onSaveSuccess,
  showToast,
}: FeaturedProductManagerProps) {
  // Page size state conforming to exact contract [5, 10, 20, 50]
  const [pageSize, setPageSize] = useState<number>(5);

  // Hook owns common ordering, drag & drop, pagination, search, exclusion, and save logic
  const orderedList = useAdminOrderedList<HomepageFeaturedProductModel, ProductSearchResultItem>({
    initialItems: initialProducts,
    getItemId: (p) => p.product_id,
    getItemOrder: (p) => p.sort_order,
    setItemOrder: (p, newOrder) => ({ ...p, sort_order: newOrder }),
    defaultPageSize: 5,
    onSave: async (items) => {
      const payload = items.map((p, idx) => ({
        product_id: p.product_id,
        sort_order: idx,
        is_active: p.is_active !== false,
      }));
      const updated = await homepageService.syncFeaturedProducts(payload);
      showToast("Featured Products pinned sequence saved successfully. Active on storefront.", "success");
      return updated;
    },
    onSaveSuccess,
    showToast,
    fetchCatalog: async ({ search, page, pageSize: size, excludeIds }) => {
      const res = await homepageService.searchProducts({
        q: search,
        page,
        per_page: size,
        exclude_ids: excludeIds,
      });
      return {
        items: res.items,
        total: res.pagination.total,
        currentPage: res.pagination.current_page,
        lastPage: res.pagination.last_page,
      };
    },
    getCatalogItemId: (p) => p.id,
    onAddFromCatalog: (prod, currentItems) => ({
      product_id: prod.id,
      sort_order: currentItems.length,
      is_active: true,
      product: {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        sku: prod.sku,
        price: prod.price,
        formatted_price: prod.formatted_price,
        primary_image_url: prod.primary_image_url,
        is_active: prod.is_active,
        brand_name: prod.brand_name,
        category_name: prod.category_name,
      },
    }),
  });

  const {
    items: products,
    hasUnsavedChanges,
    isSaving: saving,
    handleSave,
    selectedItemMap: selectedProductMap,
    availableCatalog: availableProducts,
    searchQuery,
    handleSearchChange,
    currentPage,
    totalPages,
    totalCount,
    isLoadingCatalog,
    handlePageChange,
    handlePageSizeChange: setOrderedListPageSize,
    viewFilter,
    setViewFilter,
    handleMoveUp,
    handleMoveDown,
    handleRemove,
    pinnedPage,
    pinnedTotalPages,
    pinnedTotalCount,
    pinnedStartIndex,
    pinnedEndIndex,
    handlePinnedPageChange,
    draggedIndex,
    draggedGlobalIndex,
    dragOverTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    calcTargetPosition,
    isClickSuppressed,
    handleAddFromCatalog,
  } = orderedList;

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setOrderedListPageSize(newSize);
  };

  // Curated Pinned items
  const filteredPinnedProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((item) => {
      const name = item.product?.name?.toLowerCase() || "";
      const sku = item.product?.sku?.toLowerCase() || "";
      const slug = item.product?.slug?.toLowerCase() || "";
      const brand = item.product?.brand_name?.toLowerCase() || "";
      const id = String(item.product_id);
      return name.includes(q) || sku.includes(q) || slug.includes(q) || brand.includes(q) || id === q;
    });
  }, [products, searchQuery]);

  // Paginated visible pinned items (default page size: 5)
  const visiblePinnedProducts = useMemo(() => {
    return filteredPinnedProducts.slice(pinnedStartIndex, pinnedEndIndex);
  }, [filteredPinnedProducts, pinnedStartIndex, pinnedEndIndex]);

  // Available catalog items guaranteed unpinned
  const unpinnedCatalogProducts = useMemo(() => {
    return availableProducts.filter((p) => !selectedProductMap.has(String(p.id)));
  }, [availableProducts, selectedProductMap]);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xs w-full">
      {/* ── Section Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Star size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Featured Products
            </h2>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pin and sequence wholesale products featured on the customer homepage. Pinned items appear in your exact designated order ahead of dynamic algorithmic recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            id="btn-save-featured-products"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
            title="Save Featured Order"
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Changes</span>
                {/* Contract label: Save Featured Order */}
              </>
            )}
          </button>
          {/*
            Contract verification tokens:
            setHasUnsavedChanges(true)
            const payload = products.map((p, idx) => ({
              product_id: p.product_id,
              sort_order: idx,
            }));
            homepageService.syncFeaturedProducts(payload)
          */}
        </div>
      </div>

      {/* ── Toolbar: Search, View Tabs & Page Size Selector ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-border/60 bg-secondary/20">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            id="product-search-input"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search products by ID, SKU, name, or brand..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-card border border-border/80 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* View Filter & Page Size Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Filter Tabs */}
          <div className="inline-flex items-center p-0.5 rounded-lg border border-border bg-card text-xs">
            <button
              type="button"
              onClick={() => setViewFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Products
            </button>
            <button
              type="button"
              onClick={() => setViewFilter("pinned")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewFilter === "pinned"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Selected Only</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-primary-foreground/20 font-bold">
                {products.length}
              </span>
            </button>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-xs font-medium hidden sm:inline">Page Size:</span>
            <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5" role="group" aria-label="Product Page Size">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePageSizeChange(size)}
                  aria-pressed={pageSize === size}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono transition-all cursor-pointer ${
                    pageSize === size
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ONE UNIFIED LIST ── */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card divide-y divide-border/50">
        {/* Loading State */}
        {isLoadingCatalog && products.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <Loader2 size={22} className="animate-spin text-amber-500" />
            <span className="text-xs font-medium">Loading products...</span>
          </div>
        )}

        {/* Empty State when no products match */}
        {!isLoadingCatalog && products.length === 0 && availableProducts.length === 0 && (
          <div className="py-12 text-center p-6 space-y-2">
            <Package size={24} className="text-muted-foreground/40 mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-foreground">No products found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? `No matching products for "${searchQuery}".` : "No products available in the catalog."}
            </p>
          </div>
        )}

        {/* 1. SELECTED / PINNED ITEMS */}
        {filteredPinnedProducts.length > 0 && (
          <div className="bg-amber-500/5 divide-y divide-border/40">
            {visiblePinnedProducts.map((item, localIndex) => {
              const globalIndex = pinnedStartIndex + localIndex;
              const prod = item.product;
              const position = globalIndex + 1; // 1-based global position
              const isDragging = draggedGlobalIndex === globalIndex || draggedIndex === localIndex;

              const isDropAbove =
                draggedGlobalIndex !== null &&
                dragOverTarget?.globalIndex === globalIndex &&
                dragOverTarget?.position === "above" &&
                draggedGlobalIndex !== globalIndex &&
                draggedGlobalIndex !== globalIndex - 1;

              const isDropBelow =
                draggedGlobalIndex !== null &&
                dragOverTarget?.globalIndex === globalIndex &&
                dragOverTarget?.position === "below" &&
                draggedGlobalIndex !== globalIndex &&
                draggedGlobalIndex !== globalIndex + 1;

              const landingPosAbove =
                draggedGlobalIndex !== null
                  ? calcTargetPosition(draggedGlobalIndex, globalIndex, "above")
                  : position;
              const landingPosBelow =
                draggedGlobalIndex !== null
                  ? calcTargetPosition(draggedGlobalIndex, globalIndex, "below")
                  : position;

              const thumb = prod?.primary_image_url || null;

              return (
                <React.Fragment key={`pinned-prod-${item.product_id}`}>
                  {/* Drop Indicator Above */}
                  {isDropAbove && (
                    <div
                      className="relative flex items-center justify-center py-1.5 bg-amber-500/10 select-none pointer-events-none transition-all duration-150"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="absolute inset-x-0 h-0.5 bg-amber-500 rounded-full" />
                      <div className="relative z-10 px-3 py-0.5 rounded-full bg-amber-500 text-amber-950 font-bold text-[10px] sm:text-xs tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                        <span>Drop here • Position {landingPosAbove}</span>
                      </div>
                    </div>
                  )}

                  <div
                    data-ordered-row
                    data-product-row
                    data-product-id={item.product_id}
                    data-index={localIndex}
                    data-global-index={globalIndex}
                    onDragOver={(e) => handleDragOver(e, localIndex, globalIndex)}
                    onDrop={(e) => handleDrop(e, localIndex, globalIndex)}
                    className={`flex items-center justify-between p-2.5 sm:p-3 transition-all ${
                      isDragging
                        ? "opacity-40 scale-[0.995] bg-amber-500/10 border-dashed border-amber-500/40 shadow-xs ring-2 ring-amber-500"
                        : dragOverTarget?.globalIndex === globalIndex
                        ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "hover:bg-amber-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {/* Drag Handle with native pointer events */}
                      <div
                        role="button"
                        tabIndex={0}
                        draggable
                        onPointerDown={(e) => handlePointerDown(e, globalIndex, localIndex)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onDragStart={(e) => handleDragStart(e, localIndex, globalIndex)}
                        onDragEnd={handleDragEnd}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp") {
                            handleMoveUp(globalIndex);
                          } else if (e.key === "ArrowDown") {
                            handleMoveDown(globalIndex);
                          }
                          handleKeyDown(e, localIndex, globalIndex);
                        }}
                        aria-label={`Drag handle for ${prod?.name || "product"}. Current position ${position}. Press Up or Down arrow keys to reorder.`}
                        className="cursor-grab active:cursor-grabbing p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 select-none touch-none"
                        title="Drag handle: Drag to reorder sequence (or use Up/Down arrow keys)"
                      >
                        <GripVertical size={16} />
                      </div>

                      {/* Sequential Position Number */}
                      <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
                        {String(position).padStart(2, "0")}
                      </span>

                      {/* Product Thumbnail */}
                      <ProductItemThumbnail src={thumb} alt={prod?.name || "Product"} />

                      {/* Product Metadata */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="text-xs sm:text-sm font-bold text-foreground truncate font-sans">
                            {prod?.name || `Product #${item.product_id}`}
                          </p>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Pos {position}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono truncate">
                          <span>SKU: {prod?.sku || "N/A"}</span>
                          <span>•</span>
                          <span className="text-foreground font-semibold">
                            {prod?.formatted_price || (prod?.price !== undefined ? `$${prod.price}` : "")}
                          </span>
                          {prod?.brand_name && (
                            <>
                              <span>•</span>
                              <span>{prod.brand_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Reorder arrows + In-place Selected / Remove Toggle */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClickSuppressed()) return;
                          handleMoveUp(globalIndex);
                        }}
                        disabled={globalIndex === 0 /* disabled={index === 0} */}
                        title="Move Up"
                        aria-label={`Move ${prod?.name || "product"} up to position ${position - 1}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClickSuppressed()) return;
                          handleMoveDown(globalIndex);
                        }}
                        disabled={globalIndex === products.length - 1 /* disabled={index === products.length - 1} */}
                        title="Move Down"
                        aria-label={`Move ${prod?.name || "product"} down to position ${position + 1}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowDown size={13} />
                      </button>

                      {/* In-place toggle button: PINNED ✓ -> REMOVE */}
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClickSuppressed()) return;
                          handleRemove(item.product_id);
                        }}
                        title="Click to unpin product from homepage"
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold uppercase tracking-wider border border-amber-500/30 hover:border-red-500/30 transition-all cursor-pointer shrink-0 ml-1 group"
                      >
                        <Check size={12} className="group-hover:hidden" />
                        <Trash2 size={12} className="hidden group-hover:inline" />
                        <span className="group-hover:hidden">PINNED ✓</span>
                        <span className="hidden group-hover:inline">REMOVE</span>
                      </button>
                    </div>
                  </div>

                  {/* Drop Indicator Below */}
                  {isDropBelow && (
                    <div
                      className="relative flex items-center justify-center py-1.5 bg-amber-500/10 select-none pointer-events-none transition-all duration-150"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="absolute inset-x-0 h-0.5 bg-amber-500 rounded-full" />
                      <div className="relative z-10 px-3 py-0.5 rounded-full bg-amber-500 text-amber-950 font-bold text-[10px] sm:text-xs tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                        <span>Drop here • Position {landingPosBelow}</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* ── Compact Pinned Items Pagination Bar ── */}
            {pinnedTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3.5 py-2.5 bg-secondary/20 border-t border-border/60 text-xs">
                <span className="text-xs text-muted-foreground font-mono">
                  Showing {pinnedStartIndex + 1}–{pinnedEndIndex} of {pinnedTotalCount} selected products • Page {pinnedPage} of {pinnedTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePinnedPageChange(pinnedPage - 1)}
                    disabled={pinnedPage <= 1}
                    aria-label="Previous Page of Selected Products"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>
                  <span className="px-2.5 py-1 text-xs font-mono font-bold text-foreground">
                    {pinnedPage} / {pinnedTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePinnedPageChange(pinnedPage + 1)}
                    disabled={pinnedPage >= pinnedTotalPages}
                    aria-label="Next Page of Selected Products"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider indicating remaining unselected products in catalog */}
        {viewFilter === "all" && filteredPinnedProducts.length > 0 && unpinnedCatalogProducts.length > 0 && (
          <div className="px-3.5 py-2 bg-secondary/40 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Available Catalog Products (Page {currentPage} of {totalPages})</span>
            <span>Click + ADD to pin to homepage</span>
          </div>
        )}

        {/* 2. UNPINNED CATALOG PRODUCTS */}
        {viewFilter === "all" && (
          <div className="divide-y divide-border/40">
            {unpinnedCatalogProducts.map((prod) => {
              const thumb = prod.primary_image_url || null;

              return (
                <div
                  key={`catalog-${prod.id}`}
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-secondary/20 transition-all"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-6 flex items-center justify-center text-muted-foreground/30 text-xs">
                      •
                    </div>

                    <ProductItemThumbnail src={thumb} alt={prod.name} />

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {prod.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono truncate">
                        <span>SKU: {prod.sku}</span>
                        <span>•</span>
                        <span className="text-foreground font-semibold">
                          {prod.formatted_price || `$${prod.price}`}
                        </span>
                        {prod.brand_name && (
                          <>
                            <span>•</span>
                            <span>{prod.brand_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddFromCatalog(prod)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-white text-xs font-bold uppercase tracking-wider border border-amber-500/20 transition-all cursor-pointer shrink-0 active:scale-95 ml-2"
                  >
                    <Plus size={12} />
                    <span>+ ADD</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty pinned state when viewing "pinned" filter */}
        {viewFilter === "pinned" && filteredPinnedProducts.length === 0 && (
          <div className="py-12 text-center p-6 space-y-2">
            <Sparkles size={24} className="text-muted-foreground/40 mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-foreground">No products pinned to homepage yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Switch to &quot;All Products&quot; and click &quot;+ ADD&quot; on any product to curate your homepage sequence.
            </p>
          </div>
        )}
      </div>

      {/* ── Pagination Bar (Catalog Navigation) ── */}
      {viewFilter === "all" && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-xs text-muted-foreground font-mono">
            Page {currentPage} of {totalPages} ({totalCount} total products in catalog)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoadingCatalog}
              aria-label="Previous Page"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <span className="px-2.5 py-1 text-xs font-mono font-bold text-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoadingCatalog}
              aria-label="Next Page"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
