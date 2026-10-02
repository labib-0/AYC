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
    getCatalogItemId: (item) => item.id,
    onAddFromCatalog: (item, currentItems) => ({
      product_id: item.id,
      sort_order: currentItems.length,
      is_active: true,
      product: {
        id: item.id,
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        wholesale_price: item.wholesale_price,
        images: item.images,
        brand: item.brand,
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
    moveUp,
    moveDown,
    handleMoveUp,
    handleMoveDown,
    handleRemove,
    draggedIndex,
    dragOverTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleKeyDown,
    calcTargetPosition,
    handleAddFromCatalog: handleAddProduct,
  } = orderedList;

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setOrderedListPageSize(newSize);
  };

  // Curated Pinned products
  const filteredPinnedProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((item) => {
      const name = item.product?.name?.toLowerCase() || "";
      const sku = item.product?.sku?.toLowerCase() || "";
      const brand = item.product?.brand?.name?.toLowerCase() || "";
      const idStr = String(item.product_id);
      return name.includes(q) || sku.includes(q) || brand.includes(q) || idStr === q;
    });
  }, [products, searchQuery]);

  // Available catalog products guaranteed unpinned
  const unpinnedCatalogProducts = useMemo(() => {
    return availableProducts.filter((p) => !selectedProductMap.has(String(p.id)));
  }, [availableProducts, selectedProductMap]);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xs">
      {/* ── Section Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Featured Products (Landing Page)
            </h2>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage Admin-pinned featured products in one unified list. Pinned products appear first in this exact order on the homepage default view.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            id="btn-save-featured-products"
            aria-label="Save Featured Order"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Featured Order</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Toolbar: Search, View Tabs & Page Size Selector ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 bg-secondary/20">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            id="product-search-input"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search products by name, SKU, ID, or brand..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
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
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewFilter === "pinned"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Pinned Only</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-primary-foreground/20">
                {products.length}
              </span>
            </button>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[11px] font-medium hidden sm:inline">Page Size:</span>
            <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5" role="group" aria-label="Product Page Size">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePageSizeChange(size)}
                  aria-pressed={pageSize === size}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
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
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="text-xs">Loading products...</span>
          </div>
        )}

        {/* Empty State when no products match at all */}
        {!isLoadingCatalog && products.length === 0 && availableProducts.length === 0 && (
          <div className="py-12 text-center p-6 space-y-2">
            <Package size={24} className="text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-bold text-foreground">No products found</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? `No matching products for "${searchQuery}".` : "No published products found in the catalog."}
            </p>
          </div>
        )}

        {/* 1. SELECTED / PINNED ITEMS */}
        {filteredPinnedProducts.length > 0 && (
          <div className="bg-amber-500/5 divide-y divide-border/40">
            {filteredPinnedProducts.map((item, index) => {
              const prod = item.product;
              const position = index + 1;
              const thumb = prod?.images && prod.images.length > 0 ? prod.images[0].image_url : null;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverTarget?.index === index;

              const isDropAbove =
                draggedIndex !== null &&
                dragOverTarget?.index === index &&
                dragOverTarget?.position === "above" &&
                draggedIndex !== index &&
                draggedIndex !== index - 1;

              const isDropBelow =
                draggedIndex !== null &&
                dragOverTarget?.index === index &&
                dragOverTarget?.position === "below" &&
                draggedIndex !== index &&
                draggedIndex !== index + 1;

              const landingPosAbove = draggedIndex !== null ? calcTargetPosition(draggedIndex, index, "above") : position;
              const landingPosBelow = draggedIndex !== null ? calcTargetPosition(draggedIndex, index, "below") : position;

              return (
                <React.Fragment key={`pinned-fragment-${item.product_id}`}>
                  {isDropAbove && (
                    <div
                      className="relative flex items-center justify-center py-1.5 bg-amber-500/10 select-none pointer-events-none transition-all duration-150"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="absolute inset-x-0 h-0.5 bg-amber-500 rounded-full" />
                      <div className="relative z-10 px-3 py-0.5 rounded-full bg-amber-500 text-amber-950 font-bold text-[10px] tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-950/70 animate-pulse" />
                        <span>Drop here • Position {landingPosAbove}</span>
                      </div>
                    </div>
                  )}

                  <div
                    data-product-row
                    data-product-id={item.product_id}
                    data-index={index}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center justify-between p-2.5 sm:p-3 transition-all ${
                      isDragging
                        ? "opacity-40 scale-[0.995] bg-amber-500/10 border-dashed border-amber-500/40 shadow-xs ring-1 ring-amber-500/30"
                        : isDragOver
                        ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "hover:bg-amber-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Drag Handle */}
                      <div
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        aria-label={`Drag handle for ${prod?.name || "product"}. Current position ${position}. Press Up or Down arrow keys to reorder.`}
                        className="cursor-grab active:cursor-grabbing p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 select-none"
                        title="Drag handle: Drag to reorder sequence (or use Up/Down arrow keys)"
                      >
                        <GripVertical size={16} />
                      </div>

                      {/* Sequential Position Number */}
                      <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-500/30">
                        {String(position).padStart(2, "0")}
                      </span>

                      {/* Product Thumbnail */}
                      <ProductItemThumbnail src={thumb} alt={prod?.name || "Product"} />

                      {/* Product Metadata */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="text-xs font-bold text-foreground truncate font-sans">
                            {prod?.name || `Product #${item.product_id}`}
                          </p>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Pos {position}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono truncate">
                          {prod?.sku && <span>SKU: {prod.sku}</span>}
                          {prod?.brand?.name && <span>• {prod.brand.name}</span>}
                          {prod?.wholesale_price !== undefined && (
                            <span>• ${Number(prod.wholesale_price).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Reorder arrows + In-place Selected / Remove Toggle */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        title={index === 0 ? "First position" : `Move up to position ${position - 1}`}
                        aria-label={`Move ${prod?.name || "product"} up to position ${position - 1}`}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === products.length - 1}
                        title={index === products.length - 1 ? "Last position" : `Move down to position ${position + 1}`}
                        aria-label={`Move ${prod?.name || "product"} down to position ${position + 1}`}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowDown size={13} />
                      </button>

                      {/* PINNED ✓ button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.product_id)}
                        title={`Click to unpin ${prod?.name || "product"} from Featured Products`}
                        aria-label={`Unpin ${prod?.name || "product"} from Featured Products`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30 hover:border-red-500/30 transition-all cursor-pointer shrink-0 ml-1 group"
                      >
                        <Check size={11} className="group-hover:hidden" />
                        <Trash2 size={11} className="hidden group-hover:inline" />
                        <span className="group-hover:hidden">PINNED ✓</span>
                        <span className="hidden group-hover:inline">UNPIN</span>
                      </button>
                    </div>
                  </div>

                  {isDropBelow && (
                    <div
                      className="relative flex items-center justify-center py-1.5 bg-amber-500/10 select-none pointer-events-none transition-all duration-150"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="absolute inset-x-0 h-0.5 bg-amber-500 rounded-full" />
                      <div className="relative z-10 px-3 py-0.5 rounded-full bg-amber-500 text-amber-950 font-bold text-[10px] tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-950/70 animate-pulse" />
                        <span>Drop here • Position {landingPosBelow}</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Helper divider when both pinned items and catalog items are shown */}
        {viewFilter === "all" && filteredPinnedProducts.length > 0 && unpinnedCatalogProducts.length > 0 && (
          <div className="px-3 py-1.5 bg-secondary/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Available Catalog Products (Page {currentPage} of {totalPages})</span>
            <span>Click + PIN to feature on homepage</span>
          </div>
        )}

        {/* 2. UNPINNED CATALOG ITEMS */}
        {viewFilter === "all" && (
          <div className="divide-y divide-border/40">
            {unpinnedCatalogProducts.map((item) => {
              const thumb = item.images && item.images.length > 0 ? item.images[0].image_url : null;

              return (
                <div
                  key={`catalog-${item.id}`}
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-secondary/20 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 flex items-center justify-center text-muted-foreground/30 text-xs">
                      •
                    </div>

                    <ProductItemThumbnail src={thumb} alt={item.name} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate font-sans">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono truncate">
                        <span>SKU: {item.sku || "N/A"}</span>
                        {item.brand && <span>• {item.brand.name}</span>}
                        <span>• ${Number(item.wholesale_price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* + PIN Action */}
                  <button
                    type="button"
                    onClick={() => handleAddProduct(item)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase tracking-wider border border-primary/20 transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    <Plus size={11} />
                    <span>+ PIN</span>
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
            <p className="text-xs font-bold text-foreground">No featured products pinned yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Switch to &quot;All Products&quot; and click &quot;+ PIN&quot; on any product to feature it on the homepage.
            </p>
          </div>
        )}
      </div>

      {/* ── Pagination Bar (Catalog Navigation) ── */}
      {viewFilter === "all" && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-[11px] text-muted-foreground font-mono">
            Page {currentPage} of {totalPages} ({totalCount} total catalog products)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoadingCatalog}
              aria-label="Previous Page"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <span className="px-2 py-1 text-[11px] font-mono font-bold text-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoadingCatalog}
              aria-label="Next Page"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
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
