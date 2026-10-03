"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  LayoutDashboard,
  Package, 
  Tag, 
  Layers, 
  Warehouse,
  ShoppingBag,
  Users,
  FileText, 
  FileCheck, 
  Percent,
  PanelTop,
  Files,
  Settings,
  ShieldCheck,
  KeyRound,
  ChevronRight,
  PlusCircle,
  TrendingUp,
  Boxes
} from "lucide-react";

import { useAdminAuth } from "@/lib/AdminAuthContext";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";

export interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    exact?: boolean;
    badge?: string;
    permission?: string;
  }[];
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/ayc/dashboard", icon: LayoutDashboard, exact: true, permission: ADMIN_PERMISSIONS.ANALYTICS_DASHBOARD_VIEW },
    ],
  },
  {
    title: "CATALOG",
    items: [
      { label: "Products Catalog", href: "/ayc/products", icon: Package, permission: ADMIN_PERMISSIONS.PRODUCT_VIEW },
      { label: "Category Taxonomy", href: "/ayc/categories", icon: Layers, permission: ADMIN_PERMISSIONS.CATEGORY_VIEW },
      { label: "Brands Directory", href: "/ayc/brands", icon: Tag, permission: ADMIN_PERMISSIONS.BRAND_VIEW },
      { label: "Inventory & Stock", href: "/ayc/inventory", icon: Warehouse, permission: ADMIN_PERMISSIONS.INVENTORY_VIEW },
    ],
  },
  {
    title: "COMMERCE",
    items: [
      { label: "Orders & Fulfillment", href: "/ayc/orders", icon: ShoppingBag, permission: ADMIN_PERMISSIONS.ORDER_VIEW },
      { label: "Customer Accounts", href: "/ayc/customers", icon: Users, permission: ADMIN_PERMISSIONS.CUSTOMER_VIEW },
      { label: "RFQ", href: "/ayc/rfq", icon: FileText, permission: ADMIN_PERMISSIONS.RFQ_VIEW },
    ],
  },
  {
    title: "MARKETING",
    items: [
      { label: "Coupons", href: "/ayc/coupons", icon: Percent, permission: ADMIN_PERMISSIONS.COUPON_VIEW },
      { label: "Homepage", href: "/ayc/homepage", icon: PanelTop, permission: ADMIN_PERMISSIONS.HOMEPAGE_VIEW },
    ],
  },
  {
    title: "DOCUMENTS",
    items: [
      { label: "Commercial Documents", href: "/ayc/documents", icon: Files, permission: ADMIN_PERMISSIONS.DOCUMENT_VIEW },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { label: "Administrators", href: "/ayc/administrators", icon: ShieldCheck, permission: ADMIN_PERMISSIONS.ADMIN_VIEW },
      { label: "RBAC Roles", href: "/ayc/roles", icon: Layers, permission: ADMIN_PERMISSIONS.ROLE_VIEW },
      { label: "Permissions Matrix", href: "/ayc/permissions", icon: KeyRound, permission: ADMIN_PERMISSIONS.PERMISSION_VIEW },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Settings & Config", href: "/ayc/settings", icon: Settings, permission: ADMIN_PERMISSIONS.SETTINGS_VIEW },
    ],
  },
];

export interface AdminSidebarProps {
  onNavigate?: () => void;
}

export default function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { can, isSuperAdmin } = useAdminAuth();

  const visibleSections = ADMIN_NAV_SECTIONS.map((section) => {
    const visibleItems = section.items.filter((item) => {
      if (!item.permission) return true;
      return isSuperAdmin || can(item.permission);
    });
    return { ...section, items: visibleItems };
  }).filter((section) => section.items.length > 0);

  return (
    <aside className="flex flex-col w-64 border-r border-border/80 bg-card p-4 space-y-6 shrink-0 h-full overflow-y-auto">
      {/* Navigation Sections */}
      <div className="space-y-5">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 px-3 block mb-1.5 font-mono">
              {section.title}
            </span>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const [itemPath, itemQuery] = item.href.split("?");
                const itemTab = itemQuery ? new URLSearchParams(itemQuery).get("tab") : null;

                let isActive = false;
                if (itemTab) {
                  isActive = pathname === itemPath && currentTab === itemTab;
                } else if (itemPath === "/ayc/settings" || itemPath === "/admin/settings") {
                  isActive = (pathname === "/ayc/settings" || pathname === "/admin/settings") && (!currentTab || currentTab !== "users");
                } else if (item.exact) {
                  isActive = pathname === item.href || (item.href === "/ayc/dashboard" && pathname === "/ayc");
                } else {
                  isActive = pathname === item.href ||
                    pathname.startsWith(item.href + "/") ||
                    (item.href === "/ayc/rfq" && (pathname.startsWith("/ayc/rfq") || pathname.startsWith("/ayc/rfq-quotes") || pathname.startsWith("/ayc/quotations") || pathname.startsWith("/admin/rfq")));
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? "bg-foreground text-background shadow-xs font-extrabold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className={isActive ? "text-background" : "text-muted-foreground"} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-primary/20 text-primary font-mono">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Operational Shortcuts */}
      {(can("product.create") || can("inventory.view") || can("order.view")) && (
        <div className="pt-4 border-t border-border/60 space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 px-3 block font-mono">
            OPERATIONS
          </span>
          <div className="space-y-1">
            {can("product.create") && (
              <Link
                href="/ayc/products/new"
                onClick={onNavigate}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle size={13} className="text-primary" />
                  <span>Add Product</span>
                </div>
                <ChevronRight size={12} />
              </Link>
            )}
            {can("inventory.view") && (
              <Link
                href="/ayc/inventory"
                onClick={onNavigate}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Boxes size={13} className="text-emerald-500" />
                  <span>Stock Control</span>
                </div>
                <ChevronRight size={12} />
              </Link>
            )}
            {can("order.view") && (
              <Link
                href="/ayc/orders"
                onClick={onNavigate}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-amber-500" />
                  <span>Pending Orders</span>
                </div>
                <ChevronRight size={12} />
              </Link>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
