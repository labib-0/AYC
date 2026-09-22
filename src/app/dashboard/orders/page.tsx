"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getUserOrders, OrderRecord } from "@/lib/services/orders";
import {
  getOrderStatusPresentation,
  getOrderStatusKey,
  getPaymentPresentation,
  formatOrderDate,
} from "@/lib/order-status";
import {
  Package,
  Search,
  ChevronRight,
  Truck,
  X,
  ArrowRight,
  Filter,
  CreditCard,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";

type OrderFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

const FILTER_TABS: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "All Orders" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

function formatUSD(amount: number): string {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getFulfillmentBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "delivered":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50";
    case "shipped":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50";
    case "processing":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10";
  }
}

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const data = await getUserOrders(user.id);
        if (!isMounted) return;

        // Data isolation: ensure customer only sees their own orders
        const ownedOrders = data.filter(
          (o) =>
            (o.user_id && String(o.user_id) === String(user.id)) ||
            (o.email && user.email && o.email.toLowerCase() === user.email.toLowerCase())
        );

        setOrders(ownedOrders);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to load customer orders:", err);
        setError("Unable to load orders. Please refresh or check your connection.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Match order with selected filter tab
  const matchesFilter = (order: OrderRecord, filter: OrderFilter): boolean => {
    if (filter === "all") return true;

    const normalizedKey = getOrderStatusKey(order);
    const rawStatus = (order.status || "").toLowerCase();
    const rawFulfillment = (order.fulfillment_status || "").toLowerCase();

    switch (filter) {
      case "pending":
        return (
          normalizedKey === "pending" ||
          rawStatus === "pending" ||
          (order.payment_status || "").toLowerCase() === "pending"
        );
      case "confirmed":
        return rawStatus === "confirmed";
      case "processing":
        return normalizedKey === "processing" || rawStatus === "processing" || rawFulfillment === "processing";
      case "shipped":
        return normalizedKey === "shipped" || rawStatus === "shipped" || rawFulfillment === "shipped";
      case "delivered":
        return (
          normalizedKey === "delivered" ||
          rawStatus === "delivered" ||
          rawStatus === "fulfilled" ||
          rawFulfillment === "delivered"
        );
      case "cancelled":
        return normalizedKey === "cancelled" || rawStatus === "cancelled";
      default:
        return true;
    }
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

      return orderNum.includes(query) || idMatch.includes(query);
    });
  }, [orders, activeFilter, searchQuery]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const counts: Record<OrderFilter, number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const order of orders) {
      for (const tab of FILTER_TABS) {
        if (tab.key !== "all" && matchesFilter(order, tab.key)) {
          counts[tab.key]++;
        }
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
            placeholder="Search by order number (e.g. AYN-2026...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count = tabCounts[tab.key];

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
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Retry Loading
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
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Fulfillment Status</th>
                  <th className="py-3.5 px-4">Order Status</th>
                  <th className="py-3.5 px-5 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredOrders.map((order) => {
                  const statusPres = getOrderStatusPresentation(order);
                  const paymentPres = getPaymentPresentation(order.payment_status);
                  const StatusIcon = statusPres.icon;
                  const totalUnits =
                    order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
                  const itemsCount = order.items?.length || 0;
                  const fulfillmentStatus = order.fulfillment_status || "unfulfilled";

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

                      {/* Items */}
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

                      {/* Payment Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${paymentPres.badgeClass}`}
                        >
                          {paymentPres.label}
                        </span>
                      </td>

                      {/* Fulfillment Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider border ${getFulfillmentBadgeClass(
                            fulfillmentStatus
                          )}`}
                        >
                          {fulfillmentStatus}
                        </span>
                      </td>

                      {/* Order Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
                        >
                          <StatusIcon size={11} />
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
              const paymentPres = getPaymentPresentation(order.payment_status);
              const StatusIcon = statusPres.icon;
              const totalUnits =
                order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
              const itemsCount = order.items?.length || 0;
              const fulfillmentStatus = order.fulfillment_status || "unfulfilled";

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

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-semibold uppercase tracking-wider border ${getFulfillmentBadgeClass(
                        fulfillmentStatus
                      )}`}
                    >
                      {fulfillmentStatus}
                    </span>
                  </div>

                  {/* Bottom: View Details */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-end">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700"
                    >
                      <span>Inspect Order & Invoices</span>
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
