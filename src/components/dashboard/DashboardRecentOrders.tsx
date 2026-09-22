"use client";

import React from "react";
import Link from "next/link";
import { OrderRecord } from "@/lib/services/orders";
import {
  getOrderStatusPresentation,
  getPaymentPresentation,
  formatOrderDate,
} from "@/lib/order-status";
import { Package, ChevronRight, ArrowRight, Clock, AlertCircle } from "lucide-react";

interface RecentOrdersProps {
  orders: OrderRecord[];
  loading?: boolean;
}

function formatUSD(amount: number): string {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DashboardRecentOrders({ orders, loading = false }: RecentOrdersProps) {
  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 shadow-2xs mb-8">
        <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xs overflow-hidden mb-8">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-white/10">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Recent Wholesale Orders
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active shipments and commercial transactions
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          <span>View All ({orders.length})</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {recentOrders.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <Package size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No Wholesale Orders Placed Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Browse our ready-to-ship and made-to-order B2B catalog to place your first export order.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
          >
            <span>Explore Catalog</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5 text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items / Units</th>
                  <th className="py-3 px-4">Total USD</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {recentOrders.map((order) => {
                  const statusPres = getOrderStatusPresentation(order);
                  const paymentPres = getPaymentPresentation(order.payment_status);
                  const StatusIcon = statusPres.icon;
                  const totalUnits =
                    order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
                  const itemsCount = order.items?.length || 0;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {formatOrderDate(order.created_at || order.placed_at)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{itemsCount}</span>{" "}
                        {itemsCount === 1 ? "style" : "styles"}
                        {totalUnits > 0 && (
                          <span className="text-slate-400 dark:text-slate-500 ml-1">
                            ({totalUnits} pcs)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatUSD(order.total_amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${paymentPres.badgeClass}`}
                        >
                          {paymentPres.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
                        >
                          <StatusIcon size={11} />
                          {statusPres.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 px-2.5 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        >
                          <span>View</span>
                          <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
            {recentOrders.map((order) => {
              const statusPres = getOrderStatusPresentation(order);
              const paymentPres = getPaymentPresentation(order.payment_status);
              const StatusIcon = statusPres.icon;
              const totalUnits =
                order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block p-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {order.order_number}
                    </span>
                    <span className="text-[0.6875rem] text-slate-400">
                      {formatOrderDate(order.created_at || order.placed_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs mb-3">
                    <span className="text-slate-600 dark:text-slate-400">
                      {order.items?.length || 0} styles ({totalUnits} pcs)
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatUSD(order.total_amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
                      >
                        <StatusIcon size={10} />
                        {statusPres.label}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-semibold uppercase tracking-wider ${paymentPres.badgeClass}`}
                      >
                        {paymentPres.label}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <span>Details</span>
                      <ChevronRight size={13} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
