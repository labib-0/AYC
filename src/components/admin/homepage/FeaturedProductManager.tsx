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
    <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/60 flex items-center justify-center">
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
        <Package size={20} className="text-muted-foreground/40" />
      )}
    </div>
  );
}

interface FeaturedProductManagerProps {
  initialProducts: HomepageFeaturedProductModel[];
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function FeaturedProductManager({
  initialProducts,
  onSaveSuccess,
  showToast,
}: FeaturedProductManagerProps) {
  const [products, setProducts] = useState<HomepageFeaturedProductModel[]>(initialProducts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResultItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCatalogCount, setTotalCatalogCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync state if initialProducts changes externally
  useEffect(() => {
    setProducts(initialProducts);
    setHasUnsavedChanges(false);
  }, [initialProducts]);

  // Execute backend paginated search
  const performSearch = async (query: string, page: number = 1) => {
    setIsSearching(true);
    try {
      const res = await homepageService.searchProducts(query, page, 10);
      setSearchResults(res.items);
      setCurrentPage(res.pagination.current_page);
      setTotalPages(res.pagination.last_page);
      setTotalCatalogCount(res.pagination.total);
    } catch (err) {
      console.error("Failed to search products:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setModalSearch("");
    performSearch("", 1);
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

  // Remove product from featured list (does NOT delete product)
  const handleRemove = (productId: number) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.product_id !== productId);
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Add product from search modal
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
        categories: item.categories,
        images: item.images,
      },
    };

    setProducts((prev) => [...prev, newFeatured]);
    setHasUnsavedChanges(true);
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
      showToast("Featured products order saved successfully. Active on storefront.", "success");
      if (onSaveSuccess) onSaveSuccess();
    } catch {
      showToast("Failed to save Featured products order. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedProductIds = useMemo(() => {
    return new Set(products.map((p) => p.product_id));
  }, [products]);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xs">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Star size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Featured Products
            </h2>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 font-mono">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manually select and sequence products displayed in the storefront FEATURED PRODUCTS section.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
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

      {/* Selected Products List */}
      {products.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-border/70 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
            <Package size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">No Featured Products selected</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Select key apparel products from your catalog to showcase in the top merchandising tier.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus size={14} />
            <span>Add First Product</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {products.map((item, index) => {
            const p = item.product;
            const imgSrc =
              p?.images?.[0]?.image_url ||
              (Array.isArray(p?.images) && typeof p.images[0] === "string" ? p.images[0] : "") ||
              "/placeholder.jpg";
            const brandName = p?.brand?.name || p?.brand || "Ayaan Apparel";
            const catName = p?.categories?.[0]?.name || p?.categoryName || "Apparel";
            const rawPrice = Number(p?.wholesale_price || p?.price || 0);
            const price = rawPrice > 0 ? `$${rawPrice.toFixed(2)} / pc` : "Price on Request";
            const isFirst = index === 0;
            const isLast = index === products.length - 1;
            const positionFormatted = String(index + 1).padStart(2, "0");

            return (
              <div
                key={item.product_id}
                className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card hover:bg-secondary/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Position Badge */}
                  <span className="w-7 h-7 rounded-lg bg-secondary text-foreground text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {positionFormatted}
                  </span>

                  {/* Thumbnail */}
                  <ProductItemThumbnail
                    src={imgSrc}
                    alt={p?.name || "Product"}
                  />

                  {/* Details */}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                        {brandName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        • {catName}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {p?.name || `Product #${item.product_id}`}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-foreground">{price}</span>
                      <span className="text-muted-foreground">MOQ {p?.moq || 10} pcs</span>
                      {p?.sku && <span className="text-[11px] text-muted-foreground hidden md:inline">({p.sku})</span>}
                    </div>
                  </div>
                </div>

                {/* Actions: Reorder & Remove */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={isFirst}
                    title="Move Up"
                    className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <ArrowUp size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={isLast}
                    title="Move Down"
                    className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <ArrowDown size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.product_id)}
                    title="Remove from Featured"
                    className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors cursor-pointer ml-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginated Product Search Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/80">
              <div className="flex items-center gap-2">
                <Star size={18} className="text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Select Featured Product
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-border/60 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by product name, SKU, brand, or category..."
                    value={modalSearch}
                    onChange={(e) => {
                      setModalSearch(e.target.value);
                      performSearch(e.target.value, 1);
                    }}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Modal Product List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isSearching ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={18} className="animate-spin text-primary" />
                  <span>Searching published catalog...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No products found matching your search.
                </div>
              ) : (
                searchResults.map((item) => {
                  const isSelected = selectedProductIds.has(item.id);
                  const imgSrc = item.images?.[0]?.image_url || "/placeholder.jpg";
                  const rawPrice = Number(item.wholesale_price || (item as any).price || 0);
                  const price = rawPrice > 0 ? `$${rawPrice.toFixed(2)} / pc` : "Price on Request";
                  const brandName = item.brand?.name || "Ayaan Apparel";

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "border-primary/40 bg-primary/5 opacity-70"
                          : "border-border/70 bg-card hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProductItemThumbnail
                          src={imgSrc}
                          alt={item.name}
                        />
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                            {brandName}
                          </span>
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                            <span className="font-bold text-foreground">{price}</span>
                            <span>• MOQ {item.moq} pcs</span>
                            <span className="hidden sm:inline">({item.sku})</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary px-2.5 py-1 rounded-lg bg-primary/10">
                            <Check size={12} />
                            <span>Added</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddProduct(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Pagination & Footer */}
            <div className="p-4 border-t border-border/80 flex items-center justify-between bg-muted/10">
              <span className="text-xs text-muted-foreground font-mono">
                Page {currentPage} of {totalPages} ({totalCatalogCount} products)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => performSearch(modalSearch, currentPage - 1)}
                  disabled={currentPage <= 1 || isSearching}
                  className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => performSearch(modalSearch, currentPage + 1)}
                  disabled={currentPage >= totalPages || isSearching}
                  className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="ml-2 px-4 py-1.5 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
