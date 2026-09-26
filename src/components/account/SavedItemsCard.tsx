"use client";

import React from "react";
import Link from "next/link";
import { useWishlist } from "@/lib/WishlistContext";
import { useCart } from "@/lib/CartContext";
import { Heart, Trash2, ArrowRight, ShoppingCart } from "lucide-react";

export function SavedItemsCard() {
  const { items: wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart, setIsCartOpen } = useCart();

  const previewItems = wishlistItems.slice(0, 3);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center">
              <Heart size={13} className="fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white leading-tight">
                Saved Items
              </h2>
            </div>
            {wishlistItems.length > 0 && (
              <span className="text-[0.625rem] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold">
                {wishlistItems.length}
              </span>
            )}
          </div>
          <Link
            href="/#categories"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Catalog
          </Link>
        </div>

        {/* Content */}
        {wishlistItems.length === 0 ? (
          /* Content-driven compact inline empty state */
          <div className="py-6 sm:py-7 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-400 flex items-center justify-center mb-2.5">
              <Heart size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No saved products</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px] leading-relaxed">
              Bookmark export styles from the catalog for later review or wholesale order planning.
            </p>
            <Link
              href="/#categories"
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05] text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all active:scale-95"
            >
              <span>Explore Catalog</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          /* Compact saved items list */
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {previewItems.map((item) => (
              <div
                key={item.id}
                className="py-3 first:pt-3 last:pb-1 flex items-center justify-between gap-3 group"
              >
                <Link
                  href={`/products/${item.product.slug}`}
                  className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity"
                >
                  <img
                    src={item.product.images[0] || "/placeholder.jpg"}
                    alt={item.product.name}
                    className="w-10 aspect-[3/4] rounded-lg object-contain object-center bg-slate-100 dark:bg-white/5 shrink-0 border border-slate-100 dark:border-white/5 p-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                      {item.product.name}
                    </p>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                      ${item.product.price.toFixed(2)}
                    </p>
                    <span className="text-[0.625rem] text-slate-400 block truncate">
                      {item.product.brand || "Ayaan Export"}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(item.product, "One Size", 1);
                      setIsCartOpen(true);
                    }}
                    title="Add to cart"
                    className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    <ShoppingCart size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(item.product_id)}
                    title="Remove from saved"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {wishlistItems.length > 3 && (
        <div className="pt-3 mt-2 border-t border-slate-100 dark:border-white/10 text-right">
          <span className="text-xs text-slate-400">
            +{wishlistItems.length - 3} more saved items
          </span>
        </div>
      )}
    </div>
  );
}
