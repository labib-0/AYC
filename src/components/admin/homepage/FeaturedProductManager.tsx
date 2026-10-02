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

interface FeaturedProductManagerProps {
  initialProducts: HomepageFeaturedProductModel[];
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export default function FeaturedProductManager({
  initialProducts,
  onSaveSuccess,
  showToast,
}: FeaturedProductManagerProps) {
  // Selected / Pinned Featured Products State (Authoritative Admin Sequence)
  const [products, setProducts] = useState<HomepageFeaturedProductModel[]>(initialProducts);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Unified List Pagination & Search State
  const [availableProducts, setAvailableProducts] = useState<ProductSearchResultItem[]>([]);
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

  // Sync state if initialProducts changes externally
  useEffect(() => {
    setProducts(initialProducts);
    setHasUnsavedChanges(false);
  }, [initialProducts]);

  // Selected product IDs map for fast O(1) lookup & position retrieval
  const selectedProductMap = useMemo(() => {
    const map = new Map<number | string, number>();
    products.forEach((p, idx) => {
      map.set(p.product_id, idx + 1);
    });
    return map;
  }, [products]);

  // Fetch paginated catalog products from backend
  const fetchCatalogProducts = useCallback(
    async (query: string, page: number, perPage: number) => {
      setIsLoadingCatalog(true);
      try {
        const res = await homepageService.searchProducts(query, page, perPage);
        setAvailableProducts(res.items || []);
        setCurrentPage(res.pagination?.current_page || 1);
        setTotalPages(res.pagination?.last_page || 1);
        setTotalCount(res.pagination?.total || 0);
      } catch (err) {
        console.error("Failed to fetch products via search endpoint:", err);
        setAvailableProducts([]);
      } finally {
        setIsLoadingCatalog(false);
      }
    },
    []
  );

  // Load catalog products on search/page/pageSize change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalogProducts(searchQuery, currentPage, pageSize);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, pageSize, fetchCatalogProducts]);

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

  // Add / Pin product in-place directly in the unified list
  const handleAddProduct = (item: ProductSearchResultItem) => {
    if (selectedProductMap.has(item.id)) return;

    const newFeatured: HomepageFeaturedProductModel = {
      product_id: item.id,
      sort_order: products.length,
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
    };

    setProducts((prev) => [...prev, newFeatured]);
    setHasUnsavedChanges(true);
  };

  // Unpin / Remove product from homepage selection in-place
  const handleRemove = (productId: number | string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => String(p.product_id) !== String(productId));
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Move product up in sequence
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setProducts((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Move product down in sequence
  const handleMoveDown = (index: number) => {
    if (index >= products.length - 1) return;
    setProducts((prev) => {
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

    setProducts((prev) => {
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

  // Filtered pinned products when searching
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

  // Catalog items for the current page that are NOT already pinned
  const unpinnedCatalogProducts = useMemo(() => {
    return availableProducts.filter((p) => !selectedProductMap.has(p.id));
  }, [availableProducts, selectedProductMap]);

  // Save changes to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = products.map((p, idx) => ({
        product_id: p.product_id,
        sort_order: idx,
      }));

      const updated = await homepageService.syncFeaturedProducts(payload);
      setProducts(updated);
      setHasUnsavedChanges(false);
      showToast("Featured Products pinned sequence saved successfully. Active on storefront.", "success");
      if (onSaveSuccess) onSaveSuccess();
    } catch {
      showToast("Failed to save Featured Products selection. Please try again.", "error");
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

        {/* 1. SELECTED / PINNED ITEMS (Always visible in-place at top of unified list with drag handle & position) */}
        {filteredPinnedProducts.length > 0 && (
          <div className="bg-amber-500/5 divide-y divide-border/40">
            {filteredPinnedProducts.map((item) => {
              // Real index in the authoritative products array
              const index = products.findIndex((p) => String(p.product_id) === String(item.product_id));
              const prod = item.product;
              const position = index + 1;
              const thumb = prod?.images && prod.images.length > 0 ? prod.images[0].image_url : null;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={`pinned-${item.product_id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-2.5 sm:p-3 transition-all ${
                    isDragging
                      ? "opacity-50 scale-[0.99] bg-amber-500/10"
                      : isDragOver
                      ? "bg-amber-500/15 ring-2 ring-amber-500/40"
                      : "hover:bg-amber-500/10"
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
                    <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-500/30">
                      {position}
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
                      disabled={index === products.length - 1}
                      title="Move Down"
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <ArrowDown size={13} />
                    </button>

                    {/* PINNED ✓ button (clicking directly unpins it) */}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.product_id)}
                      title="Click to unpin from Featured Products"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30 hover:border-red-500/30 transition-all cursor-pointer shrink-0 ml-1 group"
                    >
                      <Check size={11} className="group-hover:hidden" />
                      <Trash2 size={11} className="hidden group-hover:inline" />
                      <span className="group-hover:hidden">PINNED ✓</span>
                      <span className="hidden group-hover:inline">UNPIN</span>
                    </button>
                  </div>
                </div>
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

        {/* 2. UNPINNED CATALOG ITEMS (Shown in-place directly in the same list) */}
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
                    {/* Placeholder space to align with drag handle & position */}
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
