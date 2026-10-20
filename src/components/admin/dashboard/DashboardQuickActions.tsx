"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ShoppingBag, Warehouse } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export default function DashboardQuickActions() {
  const pathname = usePathname();
  const { can, isSuperAdmin } = useAdminAuth();
  const isUnderAdminPath = pathname.startsWith("/ayc") || pathname.startsWith("/admin");

  const addProductHref = isUnderAdminPath ? "/ayc/products/new" : "/products/new";
  const ordersHref = isUnderAdminPath ? "/ayc/orders" : "/orders";
  const inventoryHref = isUnderAdminPath ? "/ayc/inventory" : "/inventory";

  const canAddProduct = isSuperAdmin || can("product.create");
  const canReviewOrders = isSuperAdmin || can("order.view");
  const canManageInventory = isSuperAdmin || can("inventory.view");

  if (!canAddProduct && !canReviewOrders && !canManageInventory) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
        Quick Actions:
      </span>

      {canAddProduct && (
        <Link
          href={addProductHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all shadow-2xs hover:-translate-y-0.5"
        >
          <Plus size={13} className="text-primary" />
          <span>Add New Product</span>
        </Link>
      )}

      {canReviewOrders && (
        <Link
          href={ordersHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all shadow-2xs hover:-translate-y-0.5"
        >
          <ShoppingBag size={13} className="text-muted-foreground" />
          <span>Review Orders</span>
        </Link>
      )}

      {canManageInventory && (
        <Link
          href={inventoryHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all shadow-2xs hover:-translate-y-0.5"
        >
          <Warehouse size={13} className="text-muted-foreground" />
          <span>Manage Inventory</span>
        </Link>
      )}
    </div>
  );
}
