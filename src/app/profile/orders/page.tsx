"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getUserOrders, cancelOrder, OrderRecord, OrderItemRecord } from "@/lib/services/orders";
import {
  getOrderStatusPresentation,
  getOrderStatusKey,
  getPaymentPresentation,
  formatOrderDate,
  formatCents,
} from "@/lib/order-status";
import {
  Package,
  Search,
  ChevronRight,
  Truck,
  X,
  ExternalLink,
} from "lucide-react";
import { getWhatsAppUrl } from "@/config/business-profile";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "all" | "pending" | "processing" | "shipped" | "delivered" | "cancelled";

interface TabConfig {
  key: TabKey;
  label: string;
}

const TABS: TabConfig[] = [
  { key: "all", label: "All Orders" },
  { key: "pending", label: "To Pay" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function OrderStatusBadge({ order }: { order: OrderRecord }) {
  const pres = getOrderStatusPresentation(order);
  const Icon = pres.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider ${pres.badgeClass}`}
    >
      <Icon size={11} />
      {pres.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const pres = getPaymentPresentation(status);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold uppercase tracking-wider ${pres.badgeClass}`}
    >
      {pres.label}
    </span>
  );
}

function OrderItemRow({ item }: { item: OrderItemRecord }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Product image — Canonical 4:5 */}
      <div className="w-14 sm:w-16 aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 shrink-0 border border-slate-100 dark:border-white/5 p-0.5 flex items-center justify-center">
        {item.product_image_url ? (
          <img
            src={item.product_image_url}
            alt={item.product_name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <Package size={18} />
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-snug">
          {item.product_name}
        </p>
        {item.variant_title && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {item.variant_title}
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {item.quantity} pcs
          </span>
          {item.unit_price_cents > 0 && (
            <span className="ml-1.5 text-slate-400">
              @ {formatCents(item.unit_price_cents)} each
            </span>
          )}
        </p>
      </div>

      {/* Line total */}
      {item.line_total_cents > 0 && (
        <div className="shrink-0 text-right">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatCents(item.line_total_cents)}
          </span>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onCancel,
  cancellingId,
}: {
  order: OrderRecord;
  onCancel: (id: string) => void;
  cancellingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = order.items || [];
  const PREVIEW_COUNT = 2;
  const shownItems = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const hiddenCount = items.length - PREVIEW_COUNT;
  const statusKey = getOrderStatusKey(order);
  const canCancel =
    statusKey !== "cancelled" &&
    statusKey !== "delivered" &&
    order.fulfillment_status === "unfulfilled";
  const hasTracking =
    !!order.tracking_number || !!order.direct_tracking_url;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* ── Order header ── */}
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 dark:border-white/10 flex flex-wrap items-start justify-between gap-3">
        {/* Left: id + date + shipping */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Order
            </span>
            <span className="font-display font-bold text-sm text-slate-900 dark:text-white tracking-tight">
              #{order.order_number}
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatOrderDate(order.placed_at || order.created_at)}
            </span>
            {order.shipping_method && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Truck size={11} className="text-slate-400" />
                  {order.shipping_method}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: status badges */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <PaymentBadge status={order.payment_status} />
          <OrderStatusBadge order={order} />
        </div>
      </div>

      {/* ── Product items ── */}
      {items.length > 0 && (
        <div className="px-5 sm:px-6 divide-y divide-slate-100 dark:divide-white/[0.06]">
          {shownItems.map((item, idx) => (
            <OrderItemRow key={item.id ?? idx} item={item} />
          ))}
          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-left transition-colors"
            >
              + {hiddenCount} more item{hiddenCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* ── Footer: total + actions ── */}
      <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] flex flex-wrap items-center justify-between gap-3">
        {/* Order total */}
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
            Total
          </span>
          <span className="text-base font-bold font-display text-slate-900 dark:text-white">
            {formatCents(order.total_cents)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canCancel && (
            <button
              type="button"
              disabled={cancellingId === order.id}
              onClick={() => onCancel(order.id)}
              className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {cancellingId === order.id ? "Cancelling…" : "Cancel"}
            </button>
          )}

          {hasTracking && statusKey === "shipped" && (
            <a
              href={
                order.direct_tracking_url ||
                getWhatsAppUrl(`Track Order ${order.order_number}`)
              }
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Truck size={13} />
              Track
            </a>
          )}

          <Link
            href={`/profile/orders/${order.id}`}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span>View Details</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

function OrdersContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;

  const validTabs: TabKey[] = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];
  const initialTab: TabKey = tabParam && validTabs.includes(tabParam) ? tabParam : "all";

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);

  // Sync tab with URL search parameter if it changes
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchOrders = async () => {
    if (user?.id) {
      setLoading(true);
      const data = await getUserOrders(user.id);
      setOrders(data);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    if (user?.id) {
      await cancelOrder(orderId, user.id, "Buyer requested cancellation");
      await fetchOrders();
    }
    setCancellingId(null);
  };

  // Tab counts
  const tabCounts = useMemo<Record<TabKey, number>>(() => ({
    all: orders.length,
    pending: orders.filter((o) => getOrderStatusKey(o) === "pending").length,
    processing: orders.filter((o) => getOrderStatusKey(o) === "processing").length,
    shipped: orders.filter((o) => getOrderStatusKey(o) === "shipped").length,
    delivered: orders.filter((o) => getOrderStatusKey(o) === "delivered").length,
    cancelled: orders.filter((o) => getOrderStatusKey(o) === "cancelled").length,
  }), [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Tab filter
    if (activeTab !== "all") {
      result = result.filter((o) => getOrderStatusKey(o) === activeTab);
    }

    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((o) => {
        const matchNumber = o.order_number.toLowerCase().includes(q);
        const matchItems = o.items?.some((i) =>
          i.product_name.toLowerCase().includes(q)
        );
        return matchNumber || matchItems;
      });
    }

    // Sort newest first
    return [...result].sort(
      (a, b) =>
        new Date(b.placed_at || b.created_at).getTime() -
        new Date(a.placed_at || a.created_at).getTime()
    );
  }, [orders, activeTab, searchQuery]);

  // Empty state copy
  const emptyMessage = searchQuery
    ? {
        title: "No matching orders",
        sub: `No orders match "${searchQuery}". Try a different order ID or product name.`,
        showReset: true,
      }
    : activeTab === "all"
    ? {
        title: "No orders yet",
        sub: "Browse the catalog to start your first purchase.",
        showReset: false,
      }
    : {
        title: `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} orders`,
        sub: "Orders in this category will appear here.",
        showReset: false,
      };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
          Orders
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage and track your purchases.
        </p>
      </div>

      {/* ── Status tabs ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab strip — horizontally scrollable on mobile */}
        <div
          className="flex items-center gap-0 overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-white/10"
          role="tablist"
          aria-label="Order status filters"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px",
                  isActive
                    ? "border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.03]",
                ].join(" ")}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={[
                      "px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold leading-none",
                      isActive
                        ? "bg-amber-500 text-white"
                        : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-white/10">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID or product name…"
              className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Results area ── */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading orders…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-8 sm:py-10 flex flex-col items-center justify-center text-center px-6 gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600">
              <Package size={20} />
            </div>
            <div>
              <p className="text-sm font-bold font-display text-slate-900 dark:text-white">
                {emptyMessage.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
                {emptyMessage.sub}
              </p>
            </div>
            {emptyMessage.showReset && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Clear search
              </button>
            )}
            {!emptyMessage.showReset && activeTab === "all" && (
              <Link
                href="/#categories"
                className="mt-1 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
              >
                Browse Catalog
              </Link>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onCancel={(id) => setOrderToCancel(id)}
                cancellingId={cancellingId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-4 font-sans">
            <h3 className="text-base font-display font-bold uppercase text-slate-900 dark:text-white">
              Cancel Wholesale Order
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = orderToCancel;
                  setOrderToCancel(null);
                  if (id) await handleCancelOrder(id);
                }}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading orders…</p>
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
