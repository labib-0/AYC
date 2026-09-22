"use client";

import React, { useState } from "react";
import Link from "next/link";
import { OrderRecord, OrderItemRecord } from "@/lib/services/orders";
import { useCart } from "@/lib/CartContext";
import { Product } from "@/types";
import { RefreshCw, ArrowRight, Check, ShoppingBag, AlertCircle, Package } from "lucide-react";

interface ReorderPreviewProps {
  orders: OrderRecord[];
  catalogProducts?: Product[];
}

interface ReorderItem {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  brand?: string;
  brandLogo?: string;
  previousQuantity: number;
  currentUnitPrice: number;
  moq: number;
  rawProduct?: Product;
}

export function DashboardReorderPreview({ orders, catalogProducts = [] }: ReorderPreviewProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  // Extract unique items from past orders
  const reorderMap = new Map<string, ReorderItem>();

  for (const order of orders) {
    if (!order.items) continue;
    for (const item of order.items) {
      const key = item.product_id || item.product_name;
      const matchedCatalog = catalogProducts.find(
        (p) => String(p.id) === String(item.product_id) || p.name.toLowerCase() === item.product_name.toLowerCase()
      );

      const moq = matchedCatalog?.moq || 50;
      const currentPrice = matchedCatalog?.wholesalePrice || matchedCatalog?.price || item.unit_price || 15;
      const existing = reorderMap.get(key);

      if (existing) {
        existing.previousQuantity += item.quantity || 1;
      } else {
        reorderMap.set(key, {
          id: key,
          name: item.product_name,
          slug: matchedCatalog?.slug || item.product_slug,
          imageUrl: item.product_image_url || matchedCatalog?.images?.[0],
          brand: matchedCatalog?.brand || "Ayaan Export",
          brandLogo: matchedCatalog?.brandLogo,
          previousQuantity: item.quantity || 1,
          currentUnitPrice: currentPrice,
          moq,
          rawProduct: matchedCatalog,
        });
      }
    }
  }

  const items = Array.from(reorderMap.values()).slice(0, 4);

  const handleAddToCart = async (item: ReorderItem) => {
    setAddingId(item.id);
    const qtyToAdd = Math.max(item.previousQuantity, item.moq);

    const productObj: Product = item.rawProduct || {
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
      await addToCart(productObj, "Standard Assorted", qtyToAdd);
      setAddedId(item.id);
      setTimeout(() => {
        setAddedId(null);
      }, 2500);
      setIsCartOpen(true);
    } catch {
      // Handled by cart context
    } finally {
      setAddingId(null);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xs p-5 sm:p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Quick Reorder Shelf
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Verified Purchases
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            1-click replenishment of your previously ordered export styles
          </p>
        </div>
        <Link
          href="/dashboard/reorder"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          <span>All Reorder Items</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const isBelowMoq = item.previousQuantity < item.moq;
          const reorderQty = Math.max(item.previousQuantity, item.moq);
          const isAdding = addingId === item.id;
          const isAdded = addedId === item.id;

          return (
            <div
              key={item.id}
              className="group rounded-xl border border-slate-200/80 dark:border-white/10 p-3.5 hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col justify-between bg-slate-50/40 dark:bg-white/[0.01]"
            >
              <div>
                {/* Image */}
                <div className="aspect-square rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 mb-3 relative">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                      <Package size={28} />
                    </div>
                  )}
                  {item.brand && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[0.625rem] font-bold bg-black/60 backdrop-blur-xs text-white">
                      {item.brand}
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {item.name}
                </h3>

                <div className="mt-2 space-y-1 text-[0.6875rem]">
                  <div className="flex justify-between text-slate-500">
                    <span>Last Ordered:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.previousQuantity} pcs
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Wholesale MOQ:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.moq} pcs
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold pt-1 border-t border-slate-200/60 dark:border-white/5">
                    <span>Current Price:</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      ${Number(item.currentUnitPrice).toFixed(2)}/pc
                    </span>
                  </div>
                </div>

                {isBelowMoq && (
                  <p className="mt-2 text-[0.625rem] text-amber-600 dark:text-amber-400 flex items-center gap-1 leading-tight">
                    <AlertCircle size={10} className="shrink-0" />
                    <span>Applies MOQ minimum ({item.moq} pcs)</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 flex gap-2">
                {item.slug ? (
                  <Link
                    href={`/products/${item.slug}`}
                    className="flex-1 py-1.5 px-2 rounded-lg text-center text-[0.6875rem] font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    View
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleAddToCart(item)}
                  disabled={isAdding}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center text-[0.6875rem] font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer ${
                    isAdded
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check size={12} strokeWidth={3} />
                      <span>Added!</span>
                    </>
                  ) : isAdding ? (
                    <span>Adding...</span>
                  ) : (
                    <>
                      <RefreshCw size={11} />
                      <span>Reorder ({reorderQty})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
