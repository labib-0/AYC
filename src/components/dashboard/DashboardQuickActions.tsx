"use client";

import React from "react";
import Link from "next/link";
import { Search, RefreshCw, FilePlus, Package, ArrowUpRight } from "lucide-react";

export function DashboardQuickActions() {
  const actions = [
    {
      title: "Explore Catalog",
      description: "Search export-grade garments with volume tier pricing.",
      href: "/search",
      icon: Search,
      badge: "Catalog",
      iconColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Quick Reorder",
      description: "Replenish previous wholesale purchases with 1-click MOQ validation.",
      href: "/dashboard/reorder",
      icon: RefreshCw,
      badge: "Fast Replenish",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Request Custom RFQ",
      description: "Submit custom specs, packaging, tech packs, or target FOB prices.",
      href: "/rfq",
      icon: FilePlus,
      badge: "Custom Quote",
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Manage Orders",
      description: "Inspect shipments, proforma invoices, tracking, and payment proofs.",
      href: "/dashboard/orders",
      icon: Package,
      badge: "Shipments",
      iconColor: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Buyer Actions & Tools
        </h2>
        <span className="text-xs text-slate-400">Direct shortcuts</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;

          return (
            <Link
              key={act.title}
              href={act.href}
              className="group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-600 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${act.bgColor}`}>
                    <Icon size={18} className={act.iconColor} />
                  </div>
                  <span className="text-[0.625rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {act.badge}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {act.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {act.description}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                <span>Access</span>
                <ArrowUpRight size={13} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
