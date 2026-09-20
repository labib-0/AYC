"use client";

import React from "react";
import Link from "next/link";
import { Plus, ShoppingBag, Warehouse, ArrowRight } from "lucide-react";

export default function DashboardQuickActions() {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
        Quick Actions:
      </span>

      <Link
        href="/admin/products/new"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all shadow-2xs hover:-translate-y-0.5"
      >
        <Plus size={13} className="text-primary" />
        <span>Add New Product</span>
      </Link>

      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all shadow-2xs hover:-translate-y-0.5"
      >
        <ShoppingBag size={13} className="text-muted-foreground" />
        <span>Review Orders</span>
      </Link>

      <Link
        href="/admin/inventory"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all shadow-2xs hover:-translate-y-0.5"
      >
        <Warehouse size={13} className="text-muted-foreground" />
        <span>Manage Inventory</span>
      </Link>
    </div>
  );
}
