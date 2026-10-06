"use client";

import React from "react";
import Link from "next/link";
import { OrderRecord } from "@/services/order.service";
import { Package, Truck, CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";

interface OrderOverviewStripProps {
  orders: OrderRecord[];
  loading?: boolean;
}

export function OrderOverviewStrip({ orders, loading = false }: OrderOverviewStripProps) {
  const allCount = orders.length;
  const inDeliveryCount = orders.filter(
    (o) => o.status !== "cancelled" && o.fulfillment_status !== "delivered"
  ).length;
  const deliveredCount = orders.filter(
    (o) => o.fulfillment_status === "delivered" || o.status === "fulfilled"
  ).length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  const statItems = [
    {
      key: "all",
      label: "All Orders",
      count: allCount,
      href: "/dashboard/orders?tab=all",
      icon: Package,
      textColor: "text-slate-900 dark:text-white",
      iconColor: "text-slate-400 dark:text-slate-500",
      badgeColor: "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300",
    },
    {
      key: "shipped",
      label: "In Delivery",
      count: inDeliveryCount,
      href: "/dashboard/orders?tab=shipped",
      icon: Truck,
      textColor: "text-amber-600 dark:text-amber-400",
      iconColor: "text-amber-500 dark:text-amber-400",
      badgeColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    },
    {
      key: "delivered",
      label: "Delivered",
      count: deliveredCount,
      href: "/dashboard/orders?tab=delivered",
      icon: CheckCircle2,
      textColor: "text-emerald-600 dark:text-emerald-400",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      badgeColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: cancelledCount,
      href: "/dashboard/orders?tab=cancelled",
      icon: XCircle,
      textColor: "text-slate-600 dark:text-slate-400",
      iconColor: "text-slate-400 dark:text-slate-500",
      badgeColor: "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400",
    },
  ];

  return (
    <section
      aria-label="Order Overview"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs"
    >
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Order Overview
          </span>
          <span className="text-[0.625rem] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-medium">
            Live Status
          </span>
        </div>
        <Link
          href="/dashboard/orders"
          className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 transition-colors"
        >
          <span>Orders Workspace</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {statItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={[
                "group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all duration-150 cursor-pointer",
                index > 0 ? "sm:border-l-slate-100 dark:sm:border-l-white/10" : "",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 truncate transition-colors">
                  {item.label}
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold font-display tabular-nums mt-0.5 leading-tight ${item.textColor}`}
                >
                  {loading ? "—" : item.count}
                </p>
              </div>

              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.badgeColor}`}
              >
                <Icon size={16} className={item.iconColor} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
