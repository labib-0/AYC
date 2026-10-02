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
  Loader2
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
  // Selected Featured Products State
  const [products, setProducts] = useState<HomepageFeaturedProductModel[]>(initialProducts);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Available Products Pagination & Search State
  const [availableProducts, setAvailableProducts] = useState<ProductSearchResultItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync state if initialProducts changes externally
  useEffect(() => {
    setProducts(initialProducts);
    setHasUnsavedChanges(false);
  }, [initialProducts]);

  // Selected product IDs set for fast O(1) lookup
  const selectedProductIds = useMemo(() => {
    return new Set(products.map((p) => p.product_id));
  }, [products]);

  // Fetch paginated available products from backend
  const fetchAvailableProducts = useCallback(
    async (query: string, page: number, perPage: number) => {
      setIsLoadingAvailable(true);
      try {
        const res = await homepageService.searchProducts(query, page, perPage);
        setAvailableProducts(res.items || []);
        setCurrentPage(res.pagination?.current_page || 1);
        setTotalPages(res.pagination?.last_page || 1);
        setTotalCount(res.pagination?.total || 0);
      } catch (err) {
        console.error("Failed to fetch available products:", err);
        setAvailableProducts([]);
      } finally {
        setIsLoadingAvailable(false);
      }
    },
    []
  );

  // Load available products initially and on search/page/pageSize change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAvailableProducts(searchQuery, currentPage, pageSize);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, pageSize, fetchAvailableProducts]);

  // Handlers for available list controls
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

  // Add product to featured selection
  const handleAddProduct = (item: ProductSearchResultItem) => {
    const exists = products.some((p) => p.product_id === item.id);
    if (exists) return;

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
        moq: item.moq,
        status: item.status,
        brand: item.brand,
        images: item.images,
      },
    };

    setProducts((prev) => [...prev, newFeatured]);
    setHasUnsavedChanges(true);
  };

  // Remove product from featured list
  const handleRemove = (productId: number) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.product_id !== productId);
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Move product up in sort order
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

  // Move product down in sort order
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

  // HTML5 Drag and Drop Handlers
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

  // Save changes to Laravel API
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = products.map((p, idx) => ({
        product_id: p.product_id,
        sort_order: idx,
        is_active: p.is_active !== false,
      }));

      const updated = await homepageService.syncFeaturedProducts(payload);
      setProducts(updated);
      setHasUnsavedChanges(false);
      showToast("Featured products sequence saved successfully. Authoritative on storefront.", "success");
      if (onSaveSuccess) onSaveSuccess();
    } catch {
      showToast("Failed to save Featured products. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xs">
      {/* Section Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Star size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Featured Products (Admin Pinned)
            </h2>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Search and select products to pin at the top of the Featured Products section. Drag to define their exact display sequence.
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

      {/* Two-Column Management Layout: Available Products vs Selected Featured Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================================================================ */}
        {/* LEFT COLUMN: AVAILABLE PRODUCTS (Search + 5/10/20/50 Pagination)  */}
        {/* ================================================================ */}
        <div className="lg:col-span-6 flex flex-col space-y-3.5 p-4 rounded-xl border border-border/60 bg-secondary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-sans">
                Available Products
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-secondary text-muted-foreground border border-border/40">
                {totalCount} total
              </span>
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

          {/* Search Field */}
          <div className="relative">
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

          {/* Available Products List */}
          <div className="space-y-2 min-h-[260px] flex flex-col justify-between">
            <div className="space-y-1.5">
              {isLoadingAvailable ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                  <Loader2 size={20} className="animate-spin text-primary" />
                  <span className="text-xs">Loading available products...</span>
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed border-border/70 p-4 space-y-1">
                  <p className="text-xs font-semibold text-foreground">No products found</p>
                  <p className="text-[11px] text-muted-foreground">
                    {searchQuery ? `No matching products for "${searchQuery}".` : "No published products available in the catalog."}
                  </p>
                </div>
              ) : (
                availableProducts.map((item) => {
                  const isSelected = selectedProductIds.has(item.id);
                  const thumb = item.images && item.images.length > 0 ? item.images[0].image_url : null;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-card border border-border/70 hover:border-border transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ProductItemThumbnail src={thumb} alt={item.name} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate font-sans">{item.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono truncate">
                            <span>SKU: {item.sku || "N/A"}</span>
                            {item.brand && <span>• {item.brand.name}</span>}
                            <span>• ${Number(item.wholesale_price || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 shrink-0">
                          <Check size={11} />
                          <span>ADDED</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddProduct(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase tracking-wider border border-primary/20 transition-all cursor-pointer shrink-0 active:scale-95"
                        >
                          <Plus size={11} />
                          <span>SELECT</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoadingAvailable}
                    aria-label="Previous Page"
                    className="p-1 rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoadingAvailable}
                    aria-label="Next Page"
                    className="p-1 rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN: SELECTED FEATURED PRODUCTS (Numbered + Drag & Drop)*/}
        {/* ================================================================ */}
        <div className="lg:col-span-6 flex flex-col space-y-3.5 p-4 rounded-xl border border-border/60 bg-secondary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-sans">
                Selected Featured Products
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {products.length} pinned
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Admin-pinned products appear first in this exact order on the homepage default view. Drag to rearrange.
          </p>

          {/* Selected Products List */}
          <div className="space-y-2 min-h-[260px]">
            {products.length === 0 ? (
              <div className="py-14 text-center rounded-xl border-2 border-dashed border-border/70 p-6 space-y-2">
                <Star size={24} className="text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-bold text-foreground">No featured products pinned</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Click &quot;+ SELECT&quot; on any available product on the left to pin it to the homepage.
                </p>
              </div>
            ) : (
              products.map((item, index) => {
                const prod = item.product;
                const thumb = prod?.images && prod.images.length > 0 ? prod.images[0].image_url : null;
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={String(item.product_id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-card border transition-all ${
                      isDragging
                        ? "opacity-50 scale-[0.98] border-amber-500"
                        : isDragOver
                        ? "border-amber-500 ring-2 ring-amber-500/40 bg-amber-500/5"
                        : "border-border/80 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Drag Handle */}
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                        title="Drag to reorder"
                      >
                        <GripVertical size={15} />
                      </div>

                      {/* Display Order Sequence Number */}
                      <span className="w-5 h-5 rounded-md bg-secondary text-foreground text-[10px] font-mono font-bold flex items-center justify-center shrink-0 border border-border/50">
                        {index + 1}
                      </span>

                      {/* Thumbnail & Product Details */}
                      <ProductItemThumbnail src={thumb} alt={prod?.name || "Product"} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate font-sans">
                          {prod?.name || `Product #${item.product_id}`}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono truncate">
                          <span>Position {index + 1}</span>
                          {prod?.sku && <span>• SKU: {prod.sku}</span>}
                          {prod?.brand?.name && <span>• {prod.brand.name}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Order & Remove Controls */}
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
                      <button
                        type="button"
                        onClick={() => handleRemove(item.product_id)}
                        title="Remove from Featured"
                        className="p-1 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer ml-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
