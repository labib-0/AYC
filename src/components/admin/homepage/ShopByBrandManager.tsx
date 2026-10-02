"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Plus, 
  Search, 
  X, 
  Check, 
  Tags, 
  Save,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles
} from "lucide-react";
import { 
  homepageService, 
  HomepageFeaturedBrandModel,
  HomepageBrandRecord
} from "@/services/homepage.service";
import { useAdminOrderedList } from "@/components/admin/ordered-list";

function BrandItemLogo({
  logo,
  alt,
  size = "md",
}: {
  logo?: string | null;
  alt: string;
  size?: "sm" | "md";
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [logo]);

  const containerClasses =
    size === "sm"
      ? "w-8 h-8 rounded-lg bg-secondary/50 border border-border/40 overflow-hidden relative shrink-0 flex items-center justify-center p-1"
      : "w-10 h-10 rounded-xl bg-secondary/40 border border-border/60 overflow-hidden relative shrink-0 flex items-center justify-center p-1.5";

  return (
    <div className={containerClasses}>
      {logo && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={alt}
          className="max-h-full max-w-full object-contain p-0.5"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      ) : (
        <Tags size={size === "sm" ? 14 : 18} className="text-muted-foreground" />
      )}
    </div>
  );
}

export interface ShopByBrandManagerProps {
  initialBrands: HomepageFeaturedBrandModel[];
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export default function ShopByBrandManager({
  initialBrands,
  onSaveSuccess,
  showToast,
}: ShopByBrandManagerProps) {
  // Page size state conforming to exact contract [5, 10, 20, 50]
  const [pageSize, setPageSize] = useState<number>(5);

  // Hook owns common ordering, drag & drop, pagination, search, exclusion, and save logic
  const orderedList = useAdminOrderedList<HomepageFeaturedBrandModel, HomepageBrandRecord>({
    initialItems: initialBrands,
    getItemId: (b) => b.brand_id,
    getItemOrder: (b) => b.sort_order,
    setItemOrder: (b, newOrder) => ({ ...b, sort_order: newOrder }),
    defaultPageSize: 5,
    onSave: async (items) => {
      const payload = items.map((b, idx) => ({
        brand_id: b.brand_id,
        sort_order: idx,
        is_active: b.is_active !== false,
      }));
      const updated = await homepageService.syncFeaturedBrands(payload);
      showToast("Shop By Brand sequence saved successfully. Active on storefront.", "success");
      return updated;
    },
    onSaveSuccess,
    showToast,
    fetchCatalog: async ({ search, page, pageSize: size, excludeIds }) => {
      const res = await homepageService.searchBrands({
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
    getCatalogItemId: (b) => b.id,
    onAddFromCatalog: (brand, currentItems) => ({
      brand_id: brand.id,
      sort_order: currentItems.length,
      is_active: true,
      brand: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logo_url: brand.logo_url || brand.logo,
        website: brand.website,
        sort_order: brand.sort_order,
        is_active: brand.is_active !== false,
      },
    }),
  });

  const {
    items: brands,
    hasUnsavedChanges,
    isSaving: saving,
    handleSave,
    selectedItemMap: selectedBrandMap,
    availableCatalog: availableBrands,
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
    pinnedPage,
    pinnedPageSize,
    pinnedTotalPages,
    pinnedTotalCount,
    pinnedStartIndex,
    pinnedEndIndex,
    handlePinnedPageChange,
    draggedIndex,
    draggedGlobalIndex,
    isPointerDragging,
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
    handleAddFromCatalog,
  } = orderedList;

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setOrderedListPageSize(newSize);
  };

  // Curated Pinned items
  const filteredPinnedBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const q = searchQuery.toLowerCase().trim();
    return brands.filter((item) => {
      const name = item.brand?.name?.toLowerCase() || "";
      const slug = item.brand?.slug?.toLowerCase() || "";
      return name.includes(q) || slug.includes(q);
    });
  }, [brands, searchQuery]);

  // Paginated visible pinned items (default page size: 5)
  const visiblePinnedBrands = useMemo(() => {
    return filteredPinnedBrands.slice(pinnedStartIndex, pinnedEndIndex);
  }, [filteredPinnedBrands, pinnedStartIndex, pinnedEndIndex]);

  // Available catalog items guaranteed unpinned
  const unpinnedCatalogBrands = useMemo(() => {
    return availableBrands.filter((b) => !selectedBrandMap.has(String(b.id)));
  }, [availableBrands, selectedBrandMap]);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xs">
      {/* ── Section Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Tags size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Shop by Brand
            </h2>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage curated brands in one unified list. Select, pin, and drag items to define their exact sequence on the customer homepage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            id="btn-save-shop-by-brand"
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
                <span>Save Changes</span>
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
            id="brand-search-input"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search brands by name or slug..."
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
              All Brands
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
              <span>Selected Only</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-primary-foreground/20">
                {brands.length}
              </span>
            </button>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[11px] font-medium hidden sm:inline">Page Size:</span>
            <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5" role="group" aria-label="Brand Page Size">
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
        {isLoadingCatalog && brands.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="text-xs">Loading brands...</span>
          </div>
        )}

        {/* Empty State when no brands match at all */}
        {!isLoadingCatalog && brands.length === 0 && availableBrands.length === 0 && (
          <div className="py-12 text-center p-6 space-y-2">
            <Tags size={24} className="text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-bold text-foreground">No brands found</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? `No matching brands for "${searchQuery}".` : "No active brands found in the catalog."}
            </p>
          </div>
        )}

        {/* 1. SELECTED / PINNED ITEMS */}
        {filteredPinnedBrands.length > 0 && (
          <div className="bg-primary/5 divide-y divide-border/40">
            {visiblePinnedBrands.map((item, localIndex) => {
              const brand = item.brand;
              const globalIndex = pinnedStartIndex + localIndex;
              const position = globalIndex + 1;
              const isDragging = (draggedGlobalIndex !== null ? draggedGlobalIndex === globalIndex : draggedIndex === globalIndex) || (isPointerDragging && draggedGlobalIndex === globalIndex);
              const isDragOver = dragOverTarget?.index === globalIndex;

              const isDropAbove =
                draggedIndex !== null &&
                dragOverTarget?.index === globalIndex &&
                dragOverTarget?.position === "above" &&
                draggedIndex !== globalIndex &&
                draggedIndex !== globalIndex - 1;

              const isDropBelow =
                draggedIndex !== null &&
                dragOverTarget?.index === globalIndex &&
                dragOverTarget?.position === "below" &&
                draggedIndex !== globalIndex &&
                draggedIndex !== globalIndex + 1;

              const landingPosAbove =
                draggedIndex !== null ? calcTargetPosition(draggedIndex, globalIndex, "above") : position;
              const landingPosBelow =
                draggedIndex !== null ? calcTargetPosition(draggedIndex, globalIndex, "below") : position;

              return (
                <React.Fragment key={`pinned-fragment-${item.brand_id}`}>
                  {isDropAbove && (
                    <div
                      className="relative flex items-center justify-center py-1.5 bg-primary/10 select-none pointer-events-none transition-all duration-150"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="absolute inset-x-0 h-0.5 bg-primary rounded-full" />
                      <div className="relative z-10 px-3 py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                        <span>Drop here • Position {landingPosAbove}</span>
                      </div>
                    </div>
                  )}

                  <div
                    data-ordered-row
                    data-brand-id={item.brand_id}
                    data-index={globalIndex}
                    onDragOver={(e) => handleDragOver(e, globalIndex)}
                    onDrop={(e) => handleDrop(e, globalIndex)}
                    className={`flex items-center justify-between p-2.5 sm:p-3 transition-all ${
                      isDragging
                        ? "opacity-50 scale-[0.99] bg-primary/10 ring-2 ring-primary"
                        : isDragOver
                        ? "bg-primary/15 ring-2 ring-primary/40"
                        : "hover:bg-primary/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Drag Handle with native pointer events */}
                      <div
                        role="button"
                        tabIndex={0}
                        draggable
                        onPointerDown={(e) => handlePointerDown(e, globalIndex, localIndex)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onDragStart={(e) => handleDragStart(e, globalIndex)}
                        onDragEnd={handleDragEnd}
                        onKeyDown={(e) => handleKeyDown(e, globalIndex)}
                        aria-label={`Drag handle for ${brand?.name || "brand"}. Current position ${position}. Press Up or Down arrow keys to reorder.`}
                        className="cursor-grab active:cursor-grabbing p-1.5 rounded-md text-muted-foreground/70 hover:text-foreground transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 select-none touch-none"
                        title="Drag handle: Drag to reorder sequence (native pointer events or use Up/Down arrow keys)"
                      >
                        <GripVertical size={15} />
                      </div>

                      {/* Sequential Position Number */}
                      <span className="w-5 h-5 rounded-md bg-primary/20 text-primary font-mono font-bold text-[10px] flex items-center justify-center shrink-0 border border-primary/30">
                        {position}
                      </span>

                      {/* Brand Logo & Name */}
                      <BrandItemLogo logo={brand?.logo_url || brand?.logo} alt={brand?.name || "Brand"} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="text-xs font-bold text-foreground truncate font-sans">
                            {brand?.name || `Brand #${item.brand_id}`}
                          </p>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-primary/15 text-primary">
                            Pos {position}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {brand?.slug || `id: ${item.brand_id}`}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Reorder arrows + In-place Selected / Remove Toggle */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => moveUp(globalIndex)}
                        disabled={globalIndex === 0}
                        title="Move Up"
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(globalIndex)}
                        disabled={globalIndex === brands.length - 1}
                        title="Move Down"
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowDown size={13} />
                      </button>

                      {/* PINNED ✓ button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.brand_id)}
                        title="Click to remove from homepage curation"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30 hover:border-red-500/30 transition-all cursor-pointer shrink-0 ml-1 group"
                      >
                        <Check size={11} className="group-hover:hidden" />
                        <Trash2 size={11} className="hidden group-hover:inline" />
                        <span className="group-hover:hidden">PINNED ✓</span>
                        <span className="hidden group-hover:inline">REMOVE</span>
                      </button>
                    </div>
                  </div>

                  {isDropBelow && (
                    <div
                      className="relative flex items-center justify-center py-1.5 bg-primary/10 select-none pointer-events-none transition-all duration-150"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="absolute inset-x-0 h-0.5 bg-primary rounded-full" />
                      <div className="relative z-10 px-3 py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                        <span>Drop here • Position {landingPosBelow}</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Pinned Brands Pagination */}
            {pinnedTotalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-t border-border/50 text-xs">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Showing {pinnedStartIndex + 1}–{Math.min(pinnedEndIndex, filteredPinnedBrands.length)} of {filteredPinnedBrands.length} selected brands • Page {pinnedPage} of {pinnedTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePinnedPageChange(pinnedPage - 1)}
                    disabled={pinnedPage <= 1}
                    aria-label="Previous Selected Brands Page"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold text-foreground">
                    {pinnedPage} / {pinnedTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePinnedPageChange(pinnedPage + 1)}
                    disabled={pinnedPage >= pinnedTotalPages}
                    aria-label="Next Selected Brands Page"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Helper divider when both pinned items and catalog items are shown */}
        {viewFilter === "all" && filteredPinnedBrands.length > 0 && unpinnedCatalogBrands.length > 0 && (
          <div className="px-3 py-1.5 bg-secondary/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Available Catalog Brands (Page {currentPage} of {totalPages})</span>
            <span>Click + ADD to pin to homepage</span>
          </div>
        )}

        {/* 2. UNPINNED CATALOG ITEMS */}
        {viewFilter === "all" && (
          <div className="divide-y divide-border/40">
            {unpinnedCatalogBrands.map((brand) => {
              return (
                <div
                  key={`catalog-${brand.id}`}
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-secondary/20 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 flex items-center justify-center text-muted-foreground/30 text-xs">
                      •
                    </div>

                    <BrandItemLogo logo={brand.logo_url || brand.logo} alt={brand.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate font-sans">
                        {brand.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {brand.slug}
                      </p>
                    </div>
                  </div>

                  {/* + ADD Action */}
                  <button
                    type="button"
                    onClick={() => handleAddFromCatalog(brand)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase tracking-wider border border-primary/20 transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    <Plus size={11} />
                    <span>+ ADD</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty pinned state when viewing "pinned" filter */}
        {viewFilter === "pinned" && filteredPinnedBrands.length === 0 && (
          <div className="py-12 text-center p-6 space-y-2">
            <Sparkles size={24} className="text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-bold text-foreground">No brands pinned yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Switch to &quot;All Brands&quot; and click &quot;+ ADD&quot; on any brand to curate your homepage.
            </p>
          </div>
        )}
      </div>

      {/* ── Pagination Bar (Catalog Navigation) ── */}
      {viewFilter === "all" && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-[11px] text-muted-foreground font-mono">
            Page {currentPage} of {totalPages} ({totalCount} total catalog brands)
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
