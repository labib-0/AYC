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
  Percent,
  PanelTop,
  Files,
  Settings,
  ShieldCheck,
  KeyRound,
  Store,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from "lucide-react";

import { useAdminAuth } from "@/lib/AdminAuthContext";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
  badge?: string;
  permission?: string;
  fallbackPermission?: string;
  fallbackHref?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
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
      { label: "Products", href: "/ayc/products", icon: Package, permission: ADMIN_PERMISSIONS.PRODUCT_VIEW },
      { label: "Categories", href: "/ayc/categories", icon: Layers, permission: ADMIN_PERMISSIONS.CATEGORY_VIEW },
      { label: "Brands", href: "/ayc/brands", icon: Tag, permission: ADMIN_PERMISSIONS.BRAND_VIEW },
      { label: "Inventory", href: "/ayc/inventory", icon: Warehouse, permission: ADMIN_PERMISSIONS.INVENTORY_VIEW },
    ],
  },
  {
    title: "COMMERCE",
    items: [
      { label: "Orders & Fulfillment", href: "/ayc/orders", icon: ShoppingBag, permission: ADMIN_PERMISSIONS.ORDER_VIEW },
      { label: "RFQs", href: "/ayc/rfq", icon: FileText, permission: ADMIN_PERMISSIONS.RFQ_VIEW },
      { label: "POS", href: "/ayc/pos", icon: Store, permission: ADMIN_PERMISSIONS.POS_VIEW },
      { label: "Customers", href: "/ayc/customers", icon: Users, permission: ADMIN_PERMISSIONS.CUSTOMER_VIEW },
    ],
  },
  {
    title: "MARKETING",
    items: [
      { label: "Coupons", href: "/ayc/coupons", icon: Percent, permission: ADMIN_PERMISSIONS.COUPON_VIEW },
      { label: "Coupon Sales", href: "/ayc/coupon-sales", icon: TrendingUp, permission: ADMIN_PERMISSIONS.ANALYTICS_SALES_VIEW },
    ],
  },
  {
    title: "STOREFRONT",
    items: [
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
      {
        label: "Roles & Permissions",
        href: "/ayc/roles",
        icon: KeyRound,
        permission: ADMIN_PERMISSIONS.ROLE_VIEW,
        fallbackPermission: ADMIN_PERMISSIONS.PERMISSION_VIEW,
        fallbackHref: "/ayc/permissions",
      },
      { label: "Settings & Config", href: "/ayc/settings", icon: Settings, permission: ADMIN_PERMISSIONS.SETTINGS_VIEW },
    ],
  },
];

export interface AdminSidebarProps {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileDrawer?: boolean;
  onCloseDrawer?: () => void;
}

export default function AdminSidebar({
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  isMobileDrawer = false,
  onCloseDrawer,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { can, isSuperAdmin } = useAdminAuth();

  // Filter sections and items based on permissions
  const visibleSections = ADMIN_NAV_SECTIONS.map((section) => {
    const visibleItems = section.items.filter((item) => {
      if (!item.permission) return true;
      if (isSuperAdmin) return true;
      if (can(item.permission)) return true;
      if (item.fallbackPermission && can(item.fallbackPermission)) return true;
      return false;
    });
    return { ...section, items: visibleItems };
  }).filter((section) => section.items.length > 0);

  return (
    <aside
      className={`flex flex-col border-r border-border/80 bg-card p-3 sm:p-4 shrink-0 h-full overflow-y-auto transition-all duration-200 select-none ${
        isCollapsed ? "w-16 items-center" : "w-64"
      }`}
      aria-label="Admin Navigation Sidebar"
    >
      {/* Mobile Drawer Header with Close Button */}
      {isMobileDrawer && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/80 w-full">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold font-mono text-xs shadow-xs">
              AC
            </div>
            <span className="font-extrabold text-xs tracking-wider text-foreground uppercase">
              Admin Navigation
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseDrawer || onNavigate}
            className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <div className={`space-y-4 sm:space-y-5 flex-1 w-full ${isCollapsed ? "space-y-3" : ""}`}>
        {visibleSections.map((section, sIdx) => (
          <div key={section.title} className="space-y-1 w-full">
            {/* Section Header */}
            {isCollapsed ? (
              sIdx > 0 && <div className="h-px bg-border/50 my-2 mx-1 w-8 self-center" />
            ) : (
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 px-3 block mb-1 font-mono">
                {section.title}
              </span>
            )}

            <nav className="space-y-0.5 w-full">
              {section.items.map((item) => {
                const Icon = item.icon;
                const [itemPath, itemQuery] = item.href.split("?");
                const itemTab = itemQuery ? new URLSearchParams(itemQuery).get("tab") : null;

                // Determine active state with full nested route resolution
                let isActive = false;
                if (itemTab) {
                  isActive = pathname === itemPath && currentTab === itemTab;
                } else if (itemPath === "/ayc/settings" || itemPath === "/admin/settings") {
                  isActive = (pathname === "/ayc/settings" || pathname === "/admin/settings") && (!currentTab || currentTab !== "users");
                } else if (item.exact) {
                  isActive = pathname === item.href || (item.href === "/ayc/dashboard" && pathname === "/ayc");
                } else if (item.href === "/ayc/roles") {
                  isActive =
                    pathname.startsWith("/ayc/roles") ||
                    pathname.startsWith("/ayc/permissions") ||
                    pathname.startsWith("/admin/roles") ||
                    pathname.startsWith("/admin/permissions");
                } else if (item.href === "/ayc/rfq") {
                  isActive =
                    pathname.startsWith("/ayc/rfq") ||
                    pathname.startsWith("/ayc/rfq-quotes") ||
                    pathname.startsWith("/ayc/quotations") ||
                    pathname.startsWith("/admin/rfq");
                } else if (item.href === "/ayc/administrators") {
                  isActive =
                    pathname.startsWith("/ayc/administrators") ||
                    pathname.startsWith("/ayc/admins");
                } else {
                  isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                }

                // If user doesn't have role.view but has permission.view, route directly to permissions
                const effectiveHref =
                  item.href === "/ayc/roles" && !isSuperAdmin && !can(ADMIN_PERMISSIONS.ROLE_VIEW) && can(ADMIN_PERMISSIONS.PERMISSION_VIEW)
                    ? "/ayc/permissions"
                    : item.href;

                return (
                  <Link
                    key={item.label}
                    href={effectiveHref}
                    onClick={onNavigate}
                    title={isCollapsed ? item.label : undefined}
                    aria-label={item.label}
                    className={`flex items-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isCollapsed
                        ? "justify-center p-2.5 mx-auto w-10 h-10"
                        : "justify-between px-3 py-2"
                    } ${
                      isActive
                        ? "bg-foreground text-background shadow-xs font-extrabold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 min-w-0"}`}>
                      <Icon
                        size={15}
                        className={`shrink-0 ${isActive ? "text-background" : "text-muted-foreground"}`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-primary/20 text-primary font-mono ml-2">
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

      {/* Desktop Collapse / Expand Toggle Button at Footer */}
      {!isMobileDrawer && onToggleCollapse && (
        <div className="pt-3 mt-auto border-t border-border/60 w-full flex items-center justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer w-full ${
              isCollapsed ? "justify-center" : "justify-between px-3"
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {!isCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider">Collapse</span>
            )}
            {isCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
