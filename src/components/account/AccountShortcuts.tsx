"use client";

import React from "react";
import Link from "next/link";
import { MapPin, FileText, UserCheck, ChevronRight } from "lucide-react";

export function AccountShortcuts() {
  const shortcuts = [
    {
      label: "Shipping Addresses",
      desc: "Manage delivery addresses & defaults",
      href: "/dashboard/addresses",
      icon: MapPin,
      badge: "Manage",
    },
    {
      label: "Commercial Documents",
      desc: "Order sheets, invoices & packing lists",
      href: "/dashboard/documents",
      icon: FileText,
      badge: "View",
    },
    {
      label: "Account Details",
      desc: "Name, contact info & password settings",
      href: "/dashboard/settings",
      icon: UserCheck,
      badge: "Security",
    },
  ];

  return (
    <section aria-label="Account Shortcuts">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-700/50 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all duration-150 flex items-center justify-between gap-3 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/5 group-hover:bg-amber-50 dark:group-hover:bg-amber-950/40 text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center justify-center shrink-0 transition-colors">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate transition-colors leading-tight">
                    {item.label}
                  </p>
                  <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0">
                <ChevronRight size={14} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
