"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, ArrowUpRight, Inbox } from "lucide-react";
import { DashboardMetrics } from "@/services/admin/dashboard.service";

interface RecentOrdersTableProps {
  orders: DashboardMetrics["recent_orders"];
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const getStatusBadge = (status: string) => {
    const s = (status || "pending").toLowerCase();
    let bg = "bg-secondary text-muted-foreground border-border";

    if (s === "delivered" || s === "completed" || s === "paid") {
      bg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    } else if (s === "processing" || s === "shipped") {
      bg = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    } else if (s === "cancelled" || s === "failed" || s === "rejected") {
      bg = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    } else if (s === "pending" || s === "unpaid") {
      bg = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border font-sans ${bg}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="bg-card border border-border/80 rounded-xl shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Table Header / Title */}
      <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <ShoppingBag size={14} className="text-muted-foreground" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-sans">
            Recent Orders
          </h2>
        </div>
        <Link
          href="/ayc/orders"
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 font-sans"
        >
          <span>View All</span>
          <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-x-auto">
        {orders && orders.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3.5">Order Number</th>
                <th className="py-2.5 px-3.5">Buyer / Company</th>
                <th className="py-2.5 px-3.5 text-right">Amount</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {orders.map((order) => {
                const buyerDisplay =
                  order.company ||
                  order.user?.name ||
                  order.user?.email ||
                  "Valued Buyer";
                const dateDisplay = order.created_at
                  ? new Date(order.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <tr
                    key={order.id || order.order_number}
                    className="hover:bg-secondary/40 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 font-mono font-medium text-foreground whitespace-nowrap">
                      <Link
                        href={`/ayc/orders/${order.id}`}
                        className="hover:text-primary transition-colors inline-block"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3.5 text-foreground/90 max-w-[160px] truncate font-sans">
                      <span className="block truncate font-medium">{buyerDisplay}</span>
                      {order.user?.email && order.user.email !== buyerDisplay && (
                        <span className="block text-[10px] text-muted-foreground truncate">
                          {order.user.email}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-right text-foreground whitespace-nowrap tabular-nums">
                      ${Number(order.total_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-muted-foreground whitespace-nowrap text-[11px] font-sans">
                      {dateDisplay}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <Inbox size={24} strokeWidth={1.5} className="text-muted-foreground/60 mb-1" />
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground font-sans">
              No recent orders.
            </p>
            <p className="text-[11px] text-muted-foreground font-sans">
              New customer and B2B orders will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
