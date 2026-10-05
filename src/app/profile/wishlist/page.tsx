"use client";

import React from "react";
import Link from "next/link";
import { useWishlist } from "@/lib/WishlistContext";
import { useCart } from "@/lib/CartContext";
import { Heart, Trash2, ShoppingCart, ArrowRight, Package, AlertCircle } from "lucide-react";
import ProductBadge from "@/components/common/ProductBadge";

export default function CustomerWishlistPage() {
  const { items, removeFromWishlist, loading } = useWishlist();
  const { addToCart, setIsCartOpen } = useCart();

  if (loading && items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-8 sm:p-12 shadow-xs text-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading your saved items...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0">
            <Heart size={20} className="fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white leading-tight">
                Saved Items
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Items saved to your wholesale wishlist. Products remain here even when out of stock or sold out.
            </p>
          </div>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all active:scale-95 shrink-0"
        >
          <span>Continue Browsing</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* 2. Items List */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-10 sm:p-14 shadow-xs text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-400 flex items-center justify-center mb-3">
            <Heart size={24} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {items.map((item) => {
            const product = item.product;
            const isSoldOut = Boolean(product?.isSoldOut ?? (product as any)?.is_sold_out);
            const availableStock = product?.availableStock !== undefined 
              ? Number(product.availableStock) 
              : Number(product?.stock ?? 0);
            const isPreorder = Boolean(product?.isPreorder ?? (product as any)?.is_preorder);
            const isOutOfStock = !isPreorder && (availableStock <= 0 || product?.in_stock === false);
            const isUnavailable = isSoldOut || isOutOfStock;

            const coverImage = product?.images?.[0] || "/placeholder.jpg";
            const effectiveMoq = Math.max(1, product?.moq || 10);
            const price = product?.price || product?.wholesalePrice || product?.standardPrice || 0;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20 ${
                  isUnavailable ? "opacity-90" : ""
                }`}
              >
                <div>
                  {/* Top Image + Badges */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 mb-3 border border-slate-100 dark:border-white/5">
                    <Link href={`/products/${product.slug}`} className="block w-full h-full">
                      <img
                        src={coverImage}
                        alt={product.name}
                        className={`w-full h-full object-contain p-2 transition-transform duration-300 hover:scale-105 ${
                          isUnavailable ? "grayscale-[0.35]" : ""
                        }`}
                      />
                    </Link>

                    {/* Stock / Sold Out Badge */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      {isSoldOut ? (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                          Sold Out
                        </span>
                      ) : isOutOfStock ? (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-600 text-white shadow-xs">
                          Out of Stock
                        </span>
                      ) : isPreorder ? (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-xs">
                          Pre-Order
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                          Ready Stock
                        </span>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(item.product_id)}
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-500 hover:text-red-500 hover:bg-white dark:hover:bg-slate-900 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                      title="Remove from saved"
                      aria-label="Remove item from wishlist"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Brand & Title */}
                  <div className="mb-2">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      {product.brand || "Ayaan Export"}
                    </span>
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-2 leading-snug mt-0.5"
                    >
                      {product.name}
                    </Link>
                  </div>

                  {/* Pricing & MOQ Info */}
                  <div className="flex items-center justify-between text-xs py-1.5 border-t border-slate-100 dark:border-white/5 mb-3">
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

                {/* Purchase CTA / Sold Out CTA */}
                <div>
                  {isUnavailable ? (
                    <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed">
                      <AlertCircle size={13} />
                      <span>{isSoldOut ? "Sold Out — Cannot Purchase" : "Out of Stock — Cannot Purchase"}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(product, "Universal Package", effectiveMoq);
                        setIsCartOpen(true);
                      }}
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
      )}
    </div>
  );
}
