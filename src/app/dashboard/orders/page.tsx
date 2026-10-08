"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getUserOrders, OrderRecord } from "@/lib/services/orders";
import {
  CanonicalCustomerStatus,
  getOrderStatusPresentation,
  getCanonicalCustomerStatus,
  formatOrderDate,
} from "@/lib/order-status";
import {
  Package,
  Search,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

type OrderFilter = "all" | CanonicalCustomerStatus;

const FILTER_TABS: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "All Orders" },
  { key: "ORDER_PLACED", label: "Order Placed" },
  { key: "PAYMENT_PENDING", label: "Payment Pending" },
  { key: "WAITING_FOR_APPROVAL", label: "Waiting for Approval" },
  { key: "ORDER_CONFIRMED", label: "Order Confirmed" },
  { key: "ON_SHIPMENT", label: "On Shipment" },
];

function formatUSD(amount: number): string {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");

  const loadOrders = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getUserOrders(user.id);

      // Data isolation: ensure customer only sees their own orders
      const ownedOrders = data.filter(
        (o) =>
          (o.user_id && String(o.user_id) === String(user.id)) ||
          (o.email && user.email && o.email.toLowerCase() === user.email.toLowerCase())
      );

      setOrders(ownedOrders);
    } catch (err: any) {
      console.error("Failed to load customer orders:", err);
      const isAuth = err?.status === 401;
      const isNetwork = err?.status === 0;
      if (isAuth) {
        setError("Your session has expired. Please sign in again to access your orders.");
      } else if (isNetwork) {
        setError("Network connection error. Please check your connection and click Retry Loading.");
      } else {
        setError(err?.message || "Unable to load orders. Please click Retry Loading.");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Match order with selected filter tab using canonical status
  const matchesFilter = (order: OrderRecord, filter: OrderFilter): boolean => {
    if (filter === "all") return true;
    const canonical = getCanonicalCustomerStatus(order);
    return canonical === filter;
  };

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesTab = matchesFilter(order, activeFilter);
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;

      const query = searchQuery.trim().toLowerCase();
      const orderNum = (order.order_number || "").toLowerCase();
      const idMatch = (order.id || "").toLowerCase();
      const canonical = getCanonicalCustomerStatus(order).toLowerCase().replace(/_/g, " ");

      return orderNum.includes(query) || idMatch.includes(query) || canonical.includes(query);
    });
  }, [orders, activeFilter, searchQuery]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const counts: Record<OrderFilter, number> = {
      all: orders.length,
      ORDER_PLACED: 0,
      PAYMENT_PENDING: 0,
      WAITING_FOR_APPROVAL: 0,
      ORDER_CONFIRMED: 0,
      ON_SHIPMENT: 0,
    };

    for (const order of orders) {
      const canonical = getCanonicalCustomerStatus(order);
      if (counts[canonical] !== undefined) {
        counts[canonical]++;
      }
    }

    return counts;
  }, [orders]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Wholesale Orders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor production, export shipments, invoices, and reorder previous lots
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href="/dashboard/reorder"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Quick Reorder</span>
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs"
          >
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number or status..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
        </div>

        {/* Canonical Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count = tabCounts[tab.key] || 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "bg-amber-500 text-white shadow-xs font-bold"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100",
                ].join(" ")}
              >
                <span>{tab.label}</span>
                <span
                  className={[
                    "px-1.5 py-0.2 rounded-md text-[0.625rem]",
                    isActive
                      ? "bg-black/20 text-white"
                      : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Content Area */}
      {error ? (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-6 text-center">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => loadOrders()}
            disabled={loading}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw size={12} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Retrying..." : "Retry Loading"}</span>
          </button>
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 shadow-2xs">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-10 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Package size={26} />
          </div>
          {searchQuery || activeFilter !== "all" ? (
            <>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No orders match your filter criteria
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Try searching for a different order number or clear your status filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No Wholesale Orders Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                You haven&apos;t placed any wholesale export orders yet. Browse our verified B2B catalog or submit an RFQ to begin.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="/search"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Explore Catalog
                </Link>
                <Link
                  href="/rfq"
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-white/5 text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-5">Order #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Items / Units</th>
                  <th className="py-3.5 px-4">Total USD</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredOrders.map((order) => {
                  const statusPres = getOrderStatusPresentation(order);
                  const StatusIcon = statusPres.icon;
                  const totalUnits =
                    order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
                  const itemsCount = order.items?.length || 0;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Order # */}
                      <td className="py-4 px-5">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="font-mono font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        >
                          {order.order_number}
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                        {formatOrderDate(order.created_at || order.placed_at)}
                      </td>

                      {/* Items / Units */}
                      <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{itemsCount}</span>{" "}
                        {itemsCount === 1 ? "style" : "styles"}
                        {totalUnits > 0 && (
                          <span className="text-slate-400 dark:text-slate-500 ml-1">
                            ({totalUnits} pcs)
                          </span>
                        )}
                      </td>

                      {/* Total USD */}
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        {formatUSD(order.total_amount)}
                      </td>

                      {/* Canonical Customer Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
                        >
                          <StatusIcon size={12} className={statusPres.iconClass} />
                          {statusPres.label}
                        </span>
                      </td>

                      {/* View Action */}
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
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

          {/* Mobile Card Layout */}
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-white/5">
            {filteredOrders.map((order) => {
              const statusPres = getOrderStatusPresentation(order);
              const StatusIcon = statusPres.icon;
              const totalUnits =
                order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
              const itemsCount = order.items?.length || 0;

              return (
                <div key={order.id} className="p-4 space-y-3">
                  {/* Top: Order # & Date */}
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-mono font-bold text-xs text-slate-900 dark:text-white hover:text-amber-600 transition-colors"
                    >
                      {order.order_number}
                    </Link>
                    <span className="text-[0.6875rem] text-slate-400">
                      {formatOrderDate(order.created_at || order.placed_at)}
                    </span>
                  </div>

                  {/* Middle: Items & Total */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      {itemsCount} styles ({totalUnits} pcs)
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {formatUSD(order.total_amount)}
                    </span>
                  </div>

                  {/* Exactly One Canonical Status Badge */}
                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
                    >
                      <StatusIcon size={12} className={statusPres.iconClass} />
                      {statusPres.label}
                    </span>

                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700"
                    >
                      <span>View</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
