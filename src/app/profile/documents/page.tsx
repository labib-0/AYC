"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { FileText, Package, Lock, ChevronRight, Search, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getUserOrders, OrderRecord } from "@/lib/services/orders";
import { formatOrderDate } from "@/lib/order-status";

// ─── Types ─────────────────────────────────────────────────────────────────────

type DocType = "ORDER_SHEET" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST";

interface DocumentEntry {
  type: DocType;
  label: string;
  orderId: string;
  orderNumber: string;
  date: string;
  available: boolean;
  href: string;
}

const DOC_META: Record<DocType, { label: string; alwaysAvailable: boolean }> = {
  ORDER_SHEET: { label: "Commercial Offer Sheet", alwaysAvailable: true },
  PROFORMA_INVOICE: { label: "Proforma Invoice (P.I.)", alwaysAvailable: true },
  COMMERCIAL_INVOICE: { label: "Commercial Invoice", alwaysAvailable: false },
  PACKING_LIST: { label: "Packing List", alwaysAvailable: false },
};

// ─── Derive document list from orders ──────────────────────────────────────────

function ordersToDocuments(orders: OrderRecord[]): DocumentEntry[] {
  const docs: DocumentEntry[] = [];

  for (const order of orders) {
    if (order.status === "cancelled") continue;

    const isPaid =
      order.payment_status === "paid" ||
      ["confirmed", "processing", "shipped", "delivered", "fulfilled"].includes(order.status) ||
      order.payment_method === "net_30";

    const date = order.placed_at || order.created_at;

    for (const [typeKey, meta] of Object.entries(DOC_META) as [DocType, (typeof DOC_META)[DocType]][]) {
      const available = meta.alwaysAvailable || isPaid;
      docs.push({
        type: typeKey,
        label: meta.label,
        orderId: order.id,
        orderNumber: order.order_number,
        date,
        available,
        href: `/ayc/documents/${typeKey}/order_${order.id}`,
      });
    }
  }

  // Newest first
  return docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function DocStatusBadge({ available }: { available: boolean }) {
  if (available) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[0.6875rem] font-bold border border-emerald-200 dark:border-emerald-800/40 uppercase tracking-wider">
        Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-500 text-[0.6875rem] font-bold border border-slate-200 dark:border-white/[0.06] uppercase tracking-wider">
      <Lock size={9} />
      Pending
    </span>
  );
}

// ─── Desktop document row ──────────────────────────────────────────────────────

function DocRow({ doc }: { doc: DocumentEntry }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[2fr_1.5fr_auto_auto] items-center gap-3 sm:gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-white/[0.06] last:border-0">
      {/* Document type */}
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText size={14} className={doc.available ? "text-amber-600 shrink-0" : "text-slate-300 dark:text-slate-700 shrink-0"} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Order #{doc.orderNumber}
          </p>
        </div>
      </div>

      {/* Order ref — visible on sm+ only; on mobile it's in the name row */}
      <div className="hidden sm:block min-w-0">
        <Link
          href={`/profile/orders/${doc.orderId}`}
          className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline truncate"
        >
          #{doc.orderNumber}
        </Link>
        <p className="text-xs text-slate-400">{formatOrderDate(doc.date)}</p>
      </div>

      {/* Status */}
      <DocStatusBadge available={doc.available} />

      {/* Action */}
      {doc.available ? (
        <Link
          href={doc.href}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-amber-50 dark:hover:bg-amber-950/20 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 transition-all"
        >
          Open
          <ChevronRight size={11} />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 dark:text-slate-700 cursor-not-allowed">
          <Lock size={11} />
          Locked
        </span>
      )}
    </div>
  );
}

// ─── Mobile doc card ───────────────────────────────────────────────────────────

function DocCard({ doc }: { doc: DocumentEntry }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={14} className={doc.available ? "text-amber-600 shrink-0" : "text-slate-300 dark:text-slate-700 shrink-0"} />
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{doc.label}</p>
        </div>
        <DocStatusBadge available={doc.available} />
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
        <p>
          Order{" "}
          <Link href={`/profile/orders/${doc.orderId}`} className="text-amber-600 dark:text-amber-400 hover:underline font-medium">
            #{doc.orderNumber}
          </Link>
        </p>
        <p>{formatOrderDate(doc.date)}</p>
      </div>
      {doc.available ? (
        <Link
          href={doc.href}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold transition-all"
        >
          Open Document
          <ChevronRight size={12} />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-600 text-xs font-bold cursor-not-allowed">
          <Lock size={12} />
          Unlocks after payment
        </span>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    getUserOrders(user.id).then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, [user?.id]);

  const allDocs = useMemo(() => ordersToDocuments(orders), [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allDocs;
    return allDocs.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.orderNumber.toLowerCase().includes(q)
    );
  }, [allDocs, search]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Documents
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Access your order and commercial documents.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm flex items-center justify-center py-14">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading documents…</p>
          </div>
        </div>
      ) : allDocs.length === 0 ? (
        /* Empty state */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center py-8 sm:py-10 px-6">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center mb-3">
            <FileText size={20} className="text-slate-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">No documents yet</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
            Documents associated with your orders will appear here once orders are placed.
          </p>
          <Link
            href="/profile/orders"
            className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm"
          >
            <Package size={13} />
            View Orders
          </Link>
        </div>
      ) : (
        /* Document list */
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by document type or order number…"
              className="w-full pl-9 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No documents match &ldquo;{search}&rdquo;.</p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table — hidden on mobile */}
              <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                {/* Table head */}
                <div className="grid grid-cols-[2fr_1.5fr_auto_auto] gap-4 px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Document</span>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Order</span>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Status</span>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 text-right">Action</span>
                </div>
                {filtered.map((doc, i) => (
                  <DocRow key={`${doc.orderId}-${doc.type}`} doc={doc} />
                ))}
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {filtered.map((doc) => (
                  <DocCard key={`${doc.orderId}-${doc.type}`} doc={doc} />
                ))}
              </div>

              <p className="text-xs text-slate-400 text-right">
                {filtered.length} document{filtered.length !== 1 ? "s" : ""}
                {search && ` matching "${search}"`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
