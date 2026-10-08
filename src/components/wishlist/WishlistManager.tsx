"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useWishlist } from "@/lib/WishlistContext";
import { useCart } from "@/lib/CartContext";
import {
  Heart,
  Trash2,
  ShoppingCart,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  Package,
  ExternalLink,
  RefreshCw,
  X,
  AlertTriangle,
} from "lucide-react";
import { Product } from "@/types";

interface FeedbackState {
  type: "success" | "warning" | "error";
  title: string;
  message: string;
  addedCount: number;
  unavailableItems: Array<{ id?: string; name?: string; reason?: string }>;
}

export default function WishlistManager({ isStorefront = false }: { isStorefront?: boolean }) {
  const { items, removeFromWishlist, loading, refreshWishlist, addSelectedToCart } = useWishlist();
  const { addToCart, setIsCartOpen } = useCart();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "in_stock" | "unavailable">("all");
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Helper to determine if a product is purchasable/eligible for cart
  const isItemEligible = (item: { product?: Product }) => {
    const product = item.product;
    if (!product) return false;
    const isSoldOut = Boolean(product.isSoldOut ?? (product as any).is_sold_out);
    const availableStock =
      product.availableStock !== undefined
        ? Number(product.availableStock)
        : Number(product.stock ?? 0);
    const isPreorder = Boolean(product.isPreorder ?? (product as any).is_preorder);
    const isOutOfStock = !isPreorder && (availableStock <= 0 || (product.in_stock === false && availableStock <= 0));
    const hasPrice = Boolean(
      (product.price !== undefined && product.price !== null && Number(product.price) > 0) ||
      (product.wholesalePrice !== undefined && product.wholesalePrice !== null && Number(product.wholesalePrice) > 0) ||
      ((product as any).wholesale_price !== undefined && Number((product as any).wholesale_price) > 0) ||
      ((product as any).has_valid_price)
    );

    return !isSoldOut && !isOutOfStock && hasPrice;
  };

  // Helper for stock state label
  const getItemStockInfo = (item: { product?: Product }) => {
    const product = item.product;
    if (!product) {
      return {
        label: "Unavailable",
        type: "unavailable",
        badgeClass: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10",
      };
    }
    const isSoldOut = Boolean(product.isSoldOut ?? (product as any).is_sold_out);
    const availableStock =
      product.availableStock !== undefined
        ? Number(product.availableStock)
        : Number(product.stock ?? 0);
    const isPreorder = Boolean(product.isPreorder ?? (product as any).is_preorder);
    const isOutOfStock = !isPreorder && (availableStock <= 0 || (product.in_stock === false && availableStock <= 0));
    const moq = Math.max(1, product.moq || 10);

    if (isSoldOut) {
      return {
        label: "Sold Out",
        type: "sold_out",
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
      };
    }
    if (isOutOfStock) {
      return {
        label: "Out of Stock",
        type: "out_of_stock",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      };
    }
    if (isPreorder) {
      return {
        label: "Pre-Order",
        type: "preorder",
        badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
      };
    }
    if (availableStock <= moq * 2) {
      return {
        label: `Low Stock (${availableStock} left)`,
        type: "low_stock",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      };
    }
    return {
      label: `In Stock (${availableStock} units)`,
      type: "in_stock",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    };
  };

  // Filtered lists
  const eligibleItems = useMemo(() => items.filter(isItemEligible), [items]);
  const unavailableItemsList = useMemo(() => items.filter((i) => !isItemEligible(i)), [items]);

  const displayedItems = useMemo(() => {
    if (filterTab === "in_stock") return eligibleItems;
    if (filterTab === "unavailable") return unavailableItemsList;
    return items;
  }, [filterTab, items, eligibleItems, unavailableItemsList]);

  // Select-All calculations:
  // "Select All means: Select all currently eligible Wishlist products that can be purchased.
  // Do NOT select unavailable products for cart submission."
  const allEligibleSelected = useMemo(() => {
    if (eligibleItems.length === 0) return false;
    return eligibleItems.every((item) => selectedIds.includes(String(item.id)));
  }, [eligibleItems, selectedIds]);

  const someEligibleSelected = useMemo(() => {
    if (eligibleItems.length === 0) return false;
    return (
      !allEligibleSelected &&
      eligibleItems.some((item) => selectedIds.includes(String(item.id)))
    );
  }, [eligibleItems, selectedIds, allEligibleSelected]);

  // Sync indeterminate state on DOM checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someEligibleSelected;
    }
  }, [someEligibleSelected]);

  // Handlers
  const handleToggleSelectAll = () => {
    if (allEligibleSelected) {
      // Deselect all
      setSelectedIds([]);
    } else {
      // Select only eligible items
      setSelectedIds(eligibleItems.map((item) => String(item.id)));
    }
  };

  const handleToggleItem = (itemId: string, eligible: boolean) => {
    if (!eligible) return; // Unavailable items cannot be selected for cart
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleBulkAddToCart = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsBulkAdding(true);
      setFeedback(null);

      const result = await addSelectedToCart(selectedIds);

      const addedCount = result.data?.added_count ?? result.data?.added?.length ?? 0;
      const unavailableCount = result.data?.unavailable_count ?? result.data?.unavailable?.length ?? 0;

      if (addedCount > 0 && unavailableCount === 0) {
        setFeedback({
          type: "success",
          title: "Added to Cart",
          message: `${addedCount} ${addedCount === 1 ? "product" : "products"} added to cart.`,
          addedCount,
          unavailableItems: [],
        });
        // Clear selection for successfully added items
        setSelectedIds([]);
        setIsCartOpen(true);
      } else if (addedCount > 0 && unavailableCount > 0) {
        const unavList = (result.data?.unavailable || []).map((u: any) => ({
          id: u.wishlist_item_id,
          name: u.product_name,
          reason: u.reason,
        }));
        setFeedback({
          type: "warning",
          title: "Partial Addition",
          message: `${addedCount} ${addedCount === 1 ? "product" : "products"} added. ${unavailableCount} ${
            unavailableCount === 1 ? "product is" : "products are"
          } currently unavailable.`,
          addedCount,
          unavailableItems: unavList,
        });
        // Retain only un-added items in selection
        const addedWishlistIds = new Set((result.data?.added || []).map((a: any) => String(a.wishlist_item_id)));
        setSelectedIds((prev) => prev.filter((id) => !addedWishlistIds.has(id)));
        setIsCartOpen(true);
      } else {
        const unavList = (result.data?.unavailable || []).map((u: any) => ({
          id: u.wishlist_item_id,
          name: u.product_name,
          reason: u.reason,
        }));
        setFeedback({
          type: "error",
          title: "Items Unavailable",
          message: result.message || "Selected products could not be added to cart because they are currently unavailable.",
          addedCount: 0,
          unavailableItems: unavList,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        title: "Cart Addition Failed",
        message: err?.message || "Failed to add selected items to cart. Please try again.",
        addedCount: 0,
        unavailableItems: [],
      });
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handleSingleAddToCart = (product: Product) => {
    const effectiveMoq = Math.max(1, product.moq || 10);
    addToCart(product, "Universal Package", effectiveMoq);
    setIsCartOpen(true);
  };

  // Loading skeleton
  if (loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0">
            <Heart size={22} className="fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white leading-tight">
                Customer Wishlist
              </h1>
              <span
                id="wishlist-total-count"
                className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold"
              >
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Saved wholesale styles remain here even when out-of-stock or sold-out. Automatically purchasable when restocked.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => refreshWishlist()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            title="Refresh availability"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95"
          >
            <span>Browse Catalog</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* 2. Feedback Notification Banner */}
      {feedback && (
        <div
          data-testid="wishlist-feedback"
          className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
              : feedback.type === "warning"
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200"
              : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            ) : feedback.type === "warning" ? (
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-bold">{feedback.message}</p>
              {feedback.unavailableItems.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 list-disc list-inside text-[11px] opacity-90">
                  {feedback.unavailableItems.map((u, idx) => (
                    <li key={idx}>
                      <span className="font-semibold">{u.name || "Item"}</span>: {u.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {feedback.addedCount > 0 && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="font-bold underline hover:opacity-80 transition-opacity"
              >
                View Cart
              </button>
            )}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Dismiss feedback"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Empty State */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-10 sm:p-14 shadow-xs text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-400 flex items-center justify-center mb-3">
            <Heart size={28} />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Your wishlist is empty</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
            Click the heart icon on any product in the catalog to bookmark export styles for wholesale orders or inventory planning.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all shadow-sm active:scale-95"
          >
            <span>Explore Wholesale Catalog</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <>
          {/* 4. Multi-Select Control Bar & Filter Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  filterTab === "all"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("in_stock")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  filterTab === "in_stock"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                In Stock ({eligibleItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("unavailable")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  filterTab === "unavailable"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                Unavailable ({unavailableItemsList.length})
              </button>
            </div>

            {/* Right: Multi-select Action Bar */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
              {/* Select All Checkbox */}
              <label
                className={`inline-flex items-center gap-2 text-xs font-semibold select-none ${
                  eligibleItems.length === 0
                    ? "text-slate-400 dark:text-slate-600 cursor-not-allowed"
                    : "text-slate-700 dark:text-slate-300 cursor-pointer"
                }`}
              >
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  id="wishlist-select-all"
                  aria-label="Select all eligible items"
                  checked={allEligibleSelected}
                  disabled={eligibleItems.length === 0}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 disabled:opacity-40 cursor-pointer"
                />
                <span>Select All ({eligibleItems.length} purchasable)</span>
              </label>

              {/* Selected Count Indicator */}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {selectedIds.length} Selected
              </span>

              {/* Add Selected to Cart CTA */}
              <button
                type="button"
                id="wishlist-add-selected-btn"
                onClick={handleBulkAddToCart}
                disabled={selectedIds.length === 0 || isBulkAdding}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  selectedIds.length > 0 && !isBulkAdding
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-95 cursor-pointer"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                }`}
              >
                {isBulkAdding ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Adding to Cart...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={14} />
                    <span>
                      {selectedIds.length === 0
                        ? "Add Selected to Cart"
                        : selectedIds.length === 1
                        ? "Add 1 to Cart"
                        : `Add ${selectedIds.length} to Cart`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 5. Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
            {displayedItems.map((item) => {
              const product = item.product;
              const isEligible = isItemEligible(item);
              const isSelected = selectedIds.includes(String(item.id));
              const stockInfo = getItemStockInfo(item);

              const coverImage = product?.images?.[0] || "/placeholder.jpg";
              const effectiveMoq = Math.max(1, product?.moq || 10);
              const price =
                Number(product?.price) ||
                Number(product?.wholesalePrice) ||
                Number((product as any)?.wholesale_price) ||
                0;

              return (
                <div
                  key={item.id}
                  data-wishlist-item-id={item.id}
                  data-product-id={product?.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-all ${
                    isSelected
                      ? "border-amber-500 dark:border-amber-500 ring-1 ring-amber-500/20"
                      : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  } ${!isEligible ? "opacity-90 bg-slate-50/50 dark:bg-slate-900/50" : ""}`}
                >
                  <div>
                    {/* Top Image + Checkbox + Badges + Delete */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 mb-3 border border-slate-100 dark:border-white/5">
                      {/* Item Checkbox */}
                      <div className="absolute top-2 left-2 z-20">
                        <label
                          className={`w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-md shadow-xs transition-all ${
                            isEligible
                              ? "bg-white/95 dark:bg-slate-900/95 cursor-pointer"
                              : "bg-slate-200/80 dark:bg-slate-800/80 cursor-not-allowed opacity-60"
                          }`}
                          title={
                            isEligible
                              ? isSelected
                                ? "Deselect item"
                                : "Select for bulk cart addition"
                              : "Unavailable items cannot be selected for Cart"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isEligible}
                            onChange={() => handleToggleItem(String(item.id), isEligible)}
                            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 disabled:opacity-40 cursor-pointer"
                            aria-label={`Select ${product?.name || "item"} for cart`}
                          />
                        </label>
                      </div>

                      {/* Stock / Sold Out Badge */}
                      <div className="absolute bottom-2 left-2 z-10">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-xs ${stockInfo.badgeClass}`}
                        >
                          {stockInfo.label}
                        </span>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeFromWishlist(item.product_id)}
                        className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-500 hover:text-red-500 hover:bg-white dark:hover:bg-slate-900 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                        title="Remove from saved"
                        aria-label="Remove item from wishlist"
                      >
                        <Trash2 size={13} />
                      </button>

                      {/* Product Thumbnail */}
                      <Link
                        href={product?.slug ? `/products/${product.slug}` : "#"}
                        className="block w-full h-full"
                      >
                        <img
                          src={coverImage}
                          alt={product?.name || "Saved Product"}
                          className={`w-full h-full object-contain p-2 transition-transform duration-300 hover:scale-105 ${
                            !isEligible ? "grayscale-[0.35]" : ""
                          }`}
                        />
                      </Link>
                    </div>

                    {/* Brand & SKU */}
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                      <span>{product?.brand || "Ayaan Export"}</span>
                      {product?.sku && <span className="font-mono text-[10px] opacity-80">SKU: {product.sku}</span>}
                    </div>

                    {/* Product Name */}
                    <Link
                      href={product?.slug ? `/products/${product.slug}` : "#"}
                      className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-2 leading-snug mb-3 block"
                    >
                      {product?.name || "Product details unavailable"}
                    </Link>

                    {/* Price & MOQ specs */}
                    <div className="flex items-center justify-between text-xs py-2 border-t border-slate-100 dark:border-white/5 mb-3.5">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Unit Price</span>
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {price > 0 ? `$${price.toFixed(2)}` : "Price on Request"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Minimum Order</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {effectiveMoq} units
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div>
                    {!isEligible ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed">
                        <AlertCircle size={13} />
                        <span>Unavailable for purchase</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-action="add-to-cart"
                        onClick={() => handleSingleAddToCart(product!)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                      >
                        <ShoppingCart size={14} />
                        <span>Add to Cart ({effectiveMoq} MOQ)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
