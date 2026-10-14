"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { OFFICIAL_AYC_SITE_LOGO_PATH } from "@/lib/site-logo";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  Layers,
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
    ],
  },
  {
    title: "COMMERCE",
    items: [
      { label: "Orders", href: "/ayc/orders", icon: ShoppingBag, permission: ADMIN_PERMISSIONS.ORDER_VIEW },
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
      className={`flex flex-col border-r border-border/80 bg-card shrink-0 h-full select-none transition-all duration-200 overflow-hidden ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      aria-label="Admin Navigation Sidebar"
    >
      {/* 1. Mobile Drawer Header with Close Button */}
      {isMobileDrawer && (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/80 shrink-0 w-full">
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
              <Image
                src={OFFICIAL_AYC_SITE_LOGO_PATH}
                alt="Ayaan Clothing"
                width={24}
                height={24}
                className="w-full h-full object-contain pointer-events-none"
              />
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

      {/* 2. Desktop Rail Top Header (Pinned, NEVER scrolls) */}
      {!isMobileDrawer && onToggleCollapse && (
        <div
          className={`h-11 border-b border-border/60 shrink-0 flex items-center bg-card/60 ${
            isCollapsed ? "justify-center px-1" : "justify-between px-3.5"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 font-mono truncate">
                Navigation
              </span>
            </div>
          )}

          <button
            type="button"
            id={isCollapsed ? "admin-sidebar-expand-btn-top" : "admin-sidebar-collapse-btn-top"}
            onClick={onToggleCollapse}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex items-center justify-center rounded-lg border border-border/60 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isCollapsed ? "w-9 h-9" : "p-1.5"
            }`}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={15} />}
          </button>
        </div>
      )}

      {/* 3. Central Scrollable Navigation Items */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden subtle-scrollbar w-full ${
          isCollapsed ? "px-2 py-3 space-y-3" : "p-3 sm:p-4 space-y-4 sm:space-y-5"
        }`}
      >
        {visibleSections.map((section, sIdx) => (
          <div key={section.title} className="space-y-1 w-full">
            {/* Section Header */}
            {isCollapsed ? (
              sIdx > 0 && <div className="h-px bg-border/50 my-2 mx-auto w-6" />
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

      {/* 4. Desktop Rail Bottom Footer (Pinned, NEVER scrolls) */}
      {!isMobileDrawer && onToggleCollapse && (
        <div
          className={`border-t border-border/60 shrink-0 bg-card p-2 w-full flex items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <button
            type="button"
            id={isCollapsed ? "admin-sidebar-expand-btn-bottom" : "admin-sidebar-collapse-btn-bottom"}
            onClick={onToggleCollapse}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex items-center rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-border/40 hover:border-border transition-colors cursor-pointer ${
              isCollapsed ? "justify-center w-10 h-10" : "justify-between px-3 py-2 w-full"
            }`}
          >
            {!isCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider">Collapse Sidebar</span>
            )}
            {isCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
