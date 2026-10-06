"use client";

import React from "react";
import Link from "next/link";
import { OrderRecord } from "@/services/order.service";
import { formatOrderDate, formatCents, getOrderStatusPresentation } from "@/lib/order-status";
import { Package, ChevronRight, ArrowRight, Truck } from "lucide-react";

interface RecentOrdersCardProps {
  orders: OrderRecord[];
  loading?: boolean;
}

export function RecentOrdersCard({ orders, loading = false }: RecentOrdersCardProps) {
  const recentList = orders.slice(0, 4);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/10">
          <div>
            <h2 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white leading-tight">
              Recent Orders
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Recent purchase activity and shipment tracking
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading recent orders…</p>
          </div>
        ) : orders.length === 0 ? (
          /* Content-driven compact inline empty state */
          <div className="py-6 sm:py-7 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-2.5">
              <Package size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No orders yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
              Start browsing the catalog to place your first wholesale or export purchase.
            </p>
            <Link
              href="/#categories"
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs uppercase tracking-wider shadow-xs transition-all active:scale-95"
            >
              <span>Browse Catalog</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          /* Compact order rows */
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {recentList.map((order) => {
              const statusPres = getOrderStatusPresentation(order);
              const itemCount = order.items?.length || 1;
              const hasTracking = !!order.tracking_number || !!order.direct_tracking_url;

              return (
                <div
                  key={order.id}
                  className="py-3.5 first:pt-3 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-xs sm:text-sm font-bold font-display text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      >
                        #{order.order_number}
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
                      >
                        {statusPres.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span>{formatOrderDate(order.placed_at || order.created_at)}</span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                      {order.shipping_method && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="flex items-center gap-1 text-slate-400 truncate max-w-[140px]">
                            <Truck size={10} />
                            {order.shipping_method}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                    <div className="text-left sm:text-right">
                      <span className="text-[0.625rem] uppercase tracking-wider text-slate-400 block leading-none">
                        Total
                      </span>
                      <span className="text-xs sm:text-sm font-bold font-display text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                        {formatCents(order.total_cents)}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
                    >
                      <span>{hasTracking ? "Track" : "Details"}</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {orders.length > 4 && (
        <div className="pt-3 mt-2 border-t border-slate-100 dark:border-white/10 text-right">
          <Link
            href="/dashboard/orders"
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
          >
            <span>View all {orders.length} orders</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
