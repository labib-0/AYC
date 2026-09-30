"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getUserOrders, OrderRecord } from "@/lib/services/orders";
import { productService } from "@/services/product.service";
import { useCart } from "@/lib/CartContext";
import { Product } from "@/types";
import {
  RotateCcw,
  Search,
  Package,
  ShoppingBag,
  Check,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";

interface ReorderProduct {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  brand: string;
  brandLogo?: string;
  previouslyPurchasedQty: number;
  lastOrderDate?: string;
  currentUnitPrice: number;
  moq: number;
  catalogProduct?: Product;
}

function formatUSD(amount: number): string {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CustomerReorderPage() {
  const { user } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [catalogMap, setCatalogMap] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "quantity" | "priceAsc" | "priceDesc">("recent");

  // Per-item quantity input state
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  const loadReorderData = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [userOrders, catalogRes] = await Promise.all([
        getUserOrders(user.id),
        productService.getProducts({ limit: 100 }),
      ]);

      // Data isolation: only customer's own orders
      const ownedOrders = userOrders.filter(
        (o) =>
          (o.user_id && String(o.user_id) === String(user.id)) ||
          (o.email && user.email && o.email.toLowerCase() === user.email.toLowerCase())
      );

      setOrders(ownedOrders);

      // Map catalog products for fast lookup
      const cMap = new Map<string, Product>();
      if (Array.isArray(catalogRes)) {
        for (const p of (catalogRes as any[])) {
          cMap.set(String(p.id), p);
          if (p.slug) cMap.set(p.slug.toLowerCase(), p);
          cMap.set(p.name.toLowerCase(), p);
        }
      }
      setCatalogMap(cMap);
    } catch (err: any) {
      console.error("Failed to load reorder data:", err);
      const isAuth = err?.status === 401;
      const isNetwork = err?.status === 0;
      if (isAuth) {
        setError("Your session has expired. Please sign in again to access your order history.");
      } else if (isNetwork) {
        setError("Network connection error. Please check your connection and click Retry Loading.");
      } else {
        setError(err?.message || "Unable to load previous purchases. Please click Retry Loading.");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadReorderData();
  }, [loadReorderData]);

  // Aggregate past order items
  const reorderProducts: ReorderProduct[] = useMemo(() => {
    const map = new Map<string, ReorderProduct>();

    for (const order of orders) {
      if (!order.items) continue;

      for (const item of order.items) {
        const key = item.product_id ? String(item.product_id) : item.product_name.toLowerCase();

        // Match against current catalog
        const catalogMatch =
          (item.product_id ? catalogMap.get(String(item.product_id)) : null) ||
          (item.product_slug ? catalogMap.get(item.product_slug.toLowerCase()) : null) ||
          catalogMap.get(item.product_name.toLowerCase());

        const moq = catalogMatch?.moq || 50;
        const currentPrice =
          catalogMatch?.wholesalePrice ||
          catalogMatch?.price ||
          item.unit_price ||
          15;

        const existing = map.get(key);
        if (existing) {
          existing.previouslyPurchasedQty += item.quantity || 1;
          if (
            order.created_at &&
            (!existing.lastOrderDate || new Date(order.created_at) > new Date(existing.lastOrderDate))
          ) {
            existing.lastOrderDate = order.created_at;
          }
        } else {
          map.set(key, {
            id: key,
            name: item.product_name,
            slug: catalogMatch?.slug || item.product_slug,
            imageUrl: catalogMatch?.images?.[0] || item.product_image_url,
            brand: catalogMatch?.brand || "Ayaan Export",
            brandLogo: catalogMatch?.brandLogo,
            previouslyPurchasedQty: item.quantity || 1,
            lastOrderDate: order.created_at || order.placed_at,
            currentUnitPrice: currentPrice,
            moq,
            catalogProduct: catalogMatch,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [orders, catalogMap]);

  // Initialize quantity selectors to valid MOQ
  useEffect(() => {
    setSelectedQuantities((prev) => {
      const next = { ...prev };
      for (const p of reorderProducts) {
        if (!next[p.id]) {
          // Set initial quantity to previous quantity if >= MOQ, otherwise set to MOQ
          next[p.id] = Math.max(p.previouslyPurchasedQty, p.moq);
        }
      }
      return next;
    });
  }, [reorderProducts]);

  // Handle quantity adjustment with MOQ enforcement
  const handleQuantityChange = (productId: string, newQty: number, moq: number) => {
    // Cannot set below MOQ
    const validQty = Math.max(newQty, moq);
    setSelectedQuantities((prev) => ({
      ...prev,
      [productId]: validQty,
    }));
  };

  // Add to cart action (using existing cart service)
  const handleAddToCart = async (item: ReorderProduct) => {
    const qty = selectedQuantities[item.id] || Math.max(item.previouslyPurchasedQty, item.moq);

    // Rule: Do not silently change quantity to an invalid MOQ
    if (qty < item.moq) {
      showToast(`Minimum wholesale order quantity is ${item.moq} pcs for ${item.name}.`, "error");
      return;
    }

    setAddingId(item.id);

    const productPayload: Product = item.catalogProduct || {
      id: item.id,
      name: item.name,
      slug: item.slug || item.id,
      price: item.currentUnitPrice,
      wholesalePrice: item.currentUnitPrice,
      categoryId: "apparel",
      images: item.imageUrl ? [item.imageUrl] : [],
      sizes: ["Standard Assorted"],
      moq: item.moq,
      brand: item.brand,
    };

    try {
      await addToCart(productPayload, "Standard Assorted", qty);
      setAddedIds((prev) => new Set(prev).add(item.id));
      setIsCartOpen(true);
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 3000);
    } catch (err: any) {
      console.error("Failed to add reorder item to cart:", err);
    } finally {
      setAddingId(null);
    }
  };

  // Search and sort filtering
  const filteredProducts = useMemo(() => {
    let result = [...reorderProducts];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "quantity":
          return b.previouslyPurchasedQty - a.previouslyPurchasedQty;
        case "priceAsc":
          return a.currentUnitPrice - b.currentUnitPrice;
        case "priceDesc":
          return b.currentUnitPrice - a.currentUnitPrice;
        case "recent":
        default:
          return (
            new Date(b.lastOrderDate || 0).getTime() -
            new Date(a.lastOrderDate || 0).getTime()
          );
      }
    });

    return result;
  }, [reorderProducts, searchQuery, sortBy]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toastMsg.type === "success"
              ? "bg-slate-900 text-white border-slate-800 dark:bg-slate-800 dark:border-white/10"
              : "bg-red-600 text-white border-red-500"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Quick Reorder Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Replenishment
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Repeat previous wholesale orders with verified MOQ validation and current FOB pricing
          </p>
        </div>

        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs self-start sm:self-center"
        >
          <span>Browse Full Catalog</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Control Bar: Search & Sort */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Filter past purchases by product name or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            <option value="recent">Most Recently Ordered</option>
            <option value="quantity">Highest Quantity Purchased</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-6 text-center">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => loadReorderData()}
            disabled={loading}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw size={12} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Retrying..." : "Retry Loading"}</span>
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs animate-pulse space-y-3"
            >
              <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-10 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <RotateCcw size={28} />
          </div>
          {searchQuery ? (
            <>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No past purchases match &ldquo;{searchQuery}&rdquo;
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Try searching for a different style name or clear your search query.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No Previous Wholesale Purchases
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                Once you place commercial orders, your purchased styles will automatically appear here for fast 1-click replenishment.
              </p>
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
              >
                <span>Explore Wholesale Catalog</span>
                <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredProducts.map((item) => {
            const currentQty =
              selectedQuantities[item.id] ||
              Math.max(item.previouslyPurchasedQty, item.moq);
            const isBelowMoq = item.previouslyPurchasedQty < item.moq;
            const isAdding = addingId === item.id;
            const isAdded = addedIds.has(item.id);

            return (
              <div
                key={item.id}
                className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Product Image & Brand Header — Canonical 3:4 */}
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-white/5 mb-3.5 flex items-center justify-center p-1">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-contain group-hover:scale-103 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                        <Package size={36} />
                      </div>
                    )}

                    {/* Brand Logo / Tag */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[0.6875rem] font-bold">
                      {item.brandLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.brandLogo}
                          alt={item.brand}
                          className="w-3.5 h-3.5 object-contain"
                        />
                      ) : null}
                      <span>{item.brand}</span>
                    </div>

                    {/* MOQ Chip */}
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-[0.625rem] font-mono font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                      MOQ: {item.moq} pcs
                    </div>
                  </div>

                  {/* Product Name */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {item.name}
                  </h3>

                  {/* Order History & Pricing Specs */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Previously Purchased:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.previouslyPurchasedQty} pcs
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Wholesale MOQ:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.moq} pcs / lot
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-900 dark:text-white font-bold pt-1 border-t border-slate-200/60 dark:border-white/10">
                      <span>Current Unit Price:</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        {item.currentUnitPrice > 0 ? `${formatUSD(item.currentUnitPrice)} / pc` : "Price on Request"}
                      </span>
                    </div>
                  </div>

                  {/* MOQ Explanation Rule */}
                  {isBelowMoq && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex items-start gap-2 text-[0.6875rem] text-amber-800 dark:text-amber-300">
                      <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-600" />
                      <p className="leading-snug">
                        Previous order was <strong>{item.previouslyPurchasedQty} pcs</strong>. Current wholesale MOQ is <strong>{item.moq} pcs</strong>. Reorder quantity is adjusted to meet the minimum.
                      </p>
                    </div>
                  )}
                </div>

                {/* Quantity Selector & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                  {/* Quantity Stepper (Packages) */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        Reorder Quantity:
                      </span>
                      <span className="text-[10.5px] text-slate-500 font-medium tabular-nums">
                        MOQ: {item.moq} pcs
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(
                            item.id,
                            Math.max(item.moq, currentQty - item.moq),
                            item.moq
                          )
                        }
                        disabled={currentQty <= item.moq}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>

                      <span className="w-20 text-center font-bold font-mono text-xs text-slate-900 dark:text-white">
                        {currentQty.toLocaleString()} pcs
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(
                            item.id,
                            currentQty + item.moq,
                            item.moq
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Actions: VIEW PRODUCT + ADD TO CART */}
                  <div className="flex gap-2">
                    {item.slug ? (
                      <Link
                        href={`/products/${item.slug}`}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold text-center transition-colors"
                      >
                        View Product
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      disabled={isAdding}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                        isAdded
                          ? "bg-emerald-600 text-white shadow-emerald-500/20"
                          : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/10"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={14} strokeWidth={3} />
                          <span>Added to Cart!</span>
                        </>
                      ) : isAdding ? (
                        <span>Adding...</span>
                      ) : (
                        <>
                          <ShoppingBag size={13} />
                          <span>Add to Cart ({currentQty} pcs)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
