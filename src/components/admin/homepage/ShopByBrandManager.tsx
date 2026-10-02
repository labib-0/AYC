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
import { brandService } from "@/services/brand.service";

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

interface ShopByBrandManagerProps {
  initialBrands: HomepageFeaturedBrandModel[];
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export default function ShopByBrandManager({
  initialBrands,
  onSaveSuccess,
  showToast,
}: ShopByBrandManagerProps) {
  // Selected / Pinned Homepage Brands State (Authoritative Admin Sequence)
  const [brands, setBrands] = useState<HomepageFeaturedBrandModel[]>(initialBrands);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Unified List Pagination & Search State
  const [availableBrands, setAvailableBrands] = useState<HomepageBrandRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // View Filter: "all" (Pinned + Paginated Catalog) or "pinned" (Curated Sequence Only)
  const [viewFilter, setViewFilter] = useState<"all" | "pinned">("all");

  // Drag and Drop State (for pinned items)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync state if initialBrands changes externally
  useEffect(() => {
    setBrands(initialBrands);
    setHasUnsavedChanges(false);
  }, [initialBrands]);

  // Selected brand IDs set and map for fast O(1) lookup & position retrieval
  const selectedBrandMap = useMemo(() => {
    const map = new Map<string, number>();
    brands.forEach((b, idx) => {
      map.set(String(b.brand_id), idx + 1);
    });
    return map;
  }, [brands]);

  // Fetch paginated catalog brands from backend
  const fetchCatalogBrands = useCallback(
    async (query: string, page: number, perPage: number) => {
      setIsLoadingCatalog(true);
      try {
        const res = await homepageService.searchBrands(query, page, perPage);
        setAvailableBrands(res.items || []);
        setCurrentPage(res.pagination?.current_page || 1);
        setTotalPages(res.pagination?.last_page || 1);
        setTotalCount(res.pagination?.total || 0);
      } catch (err) {
        console.warn("Failed to fetch brands via search endpoint, falling back to brandService:", err);
        try {
          const all = await brandService.getBrands({ all: true, isAdmin: true });
          const q = query.trim().toLowerCase();
          const filtered = all.filter((b) => {
            if (b.is_active === false) return false;
            if (!q) return true;
            return b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
          });
          const start = (page - 1) * perPage;
          setAvailableBrands(filtered.slice(start, start + perPage));
          setTotalPages(Math.max(1, Math.ceil(filtered.length / perPage)));
          setTotalCount(filtered.length);
          setCurrentPage(page);
        } catch {
          setAvailableBrands([]);
        }
      } finally {
        setIsLoadingCatalog(false);
      }
    },
    []
  );

  // Load catalog brands on search/page/pageSize change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalogBrands(searchQuery, currentPage, pageSize);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, pageSize, fetchCatalogBrands]);

  // Handlers for search, page, and page size controls
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Add / Pin brand in-place directly in the unified list
  const handleAddBrand = (brand: HomepageBrandRecord) => {
    const brandIdStr = String(brand.id);
    if (selectedBrandMap.has(brandIdStr)) return;

    const newItem: HomepageFeaturedBrandModel = {
      brand_id: brand.id,
      sort_order: brands.length,
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
    };

    setBrands((prev) => [...prev, newItem]);
    setHasUnsavedChanges(true);
  };

  // Unpin / Remove brand from homepage selection in-place
  const handleRemove = (brandId: string | number) => {
    setBrands((prev) => {
      const next = prev.filter((b) => String(b.brand_id) !== String(brandId));
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Move brand up in sequence
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setBrands((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Move brand down in sequence
  const handleMoveDown = (index: number) => {
    if (index >= brands.length - 1) return;
    setBrands((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // HTML5 Drag and Drop Handlers for selected items
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setBrands((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Filtered pinned brands when searching
  const filteredPinnedBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const q = searchQuery.toLowerCase().trim();
    return brands.filter((item) => {
      const name = item.brand?.name?.toLowerCase() || "";
      const slug = item.brand?.slug?.toLowerCase() || "";
      return name.includes(q) || slug.includes(q);
    });
  }, [brands, searchQuery]);

  // Catalog items for the current page that are NOT already pinned
  const unpinnedCatalogBrands = useMemo(() => {
    return availableBrands.filter((b) => !selectedBrandMap.has(String(b.id)));
  }, [availableBrands, selectedBrandMap]);

  // Save changes to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = brands.map((b, idx) => ({
        brand_id: b.brand_id,
        sort_order: idx,
        is_active: b.is_active !== false,
      }));

      const updated = await homepageService.syncFeaturedBrands(payload);
      setBrands(updated);
      setHasUnsavedChanges(false);
      showToast("Shop By Brand sequence saved successfully. Active on storefront.", "success");
      if (onSaveSuccess) onSaveSuccess();
    } catch {
      showToast("Failed to save Shop By Brand selection. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

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
              Shop By Brand (Landing Page)
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

        {/* 1. SELECTED / PINNED ITEMS (Always visible in-place at top of unified list with drag handle & position) */}
        {filteredPinnedBrands.length > 0 && (
          <div className="bg-primary/5 divide-y divide-border/40">
            {filteredPinnedBrands.map((item) => {
              // Real index in the authoritative brands array
              const index = brands.findIndex((b) => String(b.brand_id) === String(item.brand_id));
              const brand = item.brand;
              const position = index + 1;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={`pinned-${item.brand_id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-2.5 sm:p-3 transition-all ${
                    isDragging
                      ? "opacity-50 scale-[0.99] bg-primary/10"
                      : isDragOver
                      ? "bg-primary/15 ring-2 ring-primary/40"
                      : "hover:bg-primary/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Drag Handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/70 hover:text-foreground transition-colors shrink-0"
                      title="Drag to reorder sequence"
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
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="Move Up"
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === brands.length - 1}
                      title="Move Down"
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <ArrowDown size={13} />
                    </button>

                    {/* PINNED ✓ button (clicking directly unpins it) */}
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
              );
            })}
          </div>
        )}

        {/* Helper divider when both pinned items and catalog items are shown */}
        {viewFilter === "all" && filteredPinnedBrands.length > 0 && unpinnedCatalogBrands.length > 0 && (
          <div className="px-3 py-1.5 bg-secondary/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Available Catalog Brands (Page {currentPage} of {totalPages})</span>
            <span>Click + ADD to pin to homepage</span>
          </div>
        )}

        {/* 2. UNPINNED CATALOG ITEMS (Shown in-place directly in the same list) */}
        {viewFilter === "all" && (
          <div className="divide-y divide-border/40">
            {unpinnedCatalogBrands.map((brand) => {
              return (
                <div
                  key={`catalog-${brand.id}`}
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-secondary/20 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Placeholder space to align with drag handle & position */}
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

                  {/* + ADD / + PIN Action */}
                  <button
                    type="button"
                    onClick={() => handleAddBrand(brand)}
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
