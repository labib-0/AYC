"use client";

import React from "react";
import Link from "next/link";
import { Package, FileText, RefreshCw, Bookmark, ArrowRight } from "lucide-react";

interface KPICardsProps {
  ordersCount: number;
  quotesCount: number;
  reorderCount: number;
  savedCount: number;
  loading?: boolean;
}

export function DashboardKPICards({
  ordersCount,
  quotesCount,
  reorderCount,
  savedCount,
  loading = false,
}: KPICardsProps) {
  const cards = [
    {
      title: "Wholesale Orders",
      value: ordersCount,
      label: ordersCount === 1 ? "Order Placed" : "Orders Placed",
      href: "/dashboard/orders",
      icon: Package,
      iconBg: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
      accent: "hover:border-blue-300 dark:hover:border-blue-700",
      cta: "View order history",
    },
    {
      title: "Active Quotes & RFQs",
      value: quotesCount,
      label: quotesCount === 1 ? "Active Request" : "Active Requests",
      href: "/dashboard/quotes",
      icon: FileText,
      iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
      accent: "hover:border-amber-300 dark:hover:border-amber-700",
      cta: "Review inquiries",
    },
    {
      title: "Reorder Ready",
      value: reorderCount,
      label: reorderCount === 1 ? "Purchased Product" : "Purchased Products",
      href: "/dashboard/reorder",
      icon: RefreshCw,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      accent: "hover:border-emerald-300 dark:hover:border-emerald-700",
      cta: "Fast replenishment",
    },
    {
      title: "Saved Wholesale Items",
      value: savedCount,
      label: savedCount === 1 ? "Saved Item" : "Saved Items",
      href: "/profile",
      icon: Bookmark,
      iconBg: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
      accent: "hover:border-purple-300 dark:hover:border-purple-700",
      cta: "View saved items",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Link
            key={card.title}
            href={card.href}
            className={`group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between ${card.accent}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                  {card.title}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                  <Icon size={16} />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                {loading ? (
                  <div className="h-8 w-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {card.value}
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              <span>{card.cta}</span>
              <ArrowRight size={13} className="transform group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
