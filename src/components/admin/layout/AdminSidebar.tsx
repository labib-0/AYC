"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ChevronRight,
  PlusCircle,
  TrendingUp,
  Boxes
} from "lucide-react";

export interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    exact?: boolean;
    badge?: string;
  }[];
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "CATALOG",
    items: [
      { label: "Products Catalog", href: "/admin/products", icon: Package },
      { label: "Category Taxonomy", href: "/admin/categories", icon: Layers },
      { label: "Brands Directory", href: "/admin/brands", icon: Tag },
      { label: "Inventory & Stock", href: "/admin/inventory", icon: Warehouse },
    ],
  },
  {
    title: "COMMERCE",
    items: [
      { label: "Orders & Fulfillment", href: "/admin/orders", icon: ShoppingBag },
      { label: "Customer Accounts", href: "/admin/customers", icon: Users },
      { label: "B2B RFQs & Inquiries", href: "/admin/rfq", icon: FileText },
      { label: "Commercial Quotes", href: "/admin/quotations", icon: FileCheck },
    ],
  },
  {
    title: "MARKETING",
    items: [
      { label: "Promotions & Coupons", href: "/admin/promotions", icon: Percent },
      { label: "Homepage & Banners", href: "/admin/homepage", icon: PanelTop },
    ],
  },
  {
    title: "DOCUMENTS",
    items: [
      { label: "Commercial Documents", href: "/admin/documents", icon: Files },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Settings & Config", href: "/admin/settings", icon: Settings },
    ],
  },
];

export interface AdminSidebarProps {
  onNavigate?: () => void;
}

export default function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 border-r border-border/80 bg-card p-4 space-y-6 shrink-0 h-full overflow-y-auto">
      {/* Navigation Sections */}
      <div className="space-y-5">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 px-3 block mb-1.5 font-mono">
              {section.title}
            </span>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");

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
      <div className="pt-4 border-t border-border/60 space-y-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 px-3 block font-mono">
          OPERATIONS
        </span>
        <div className="space-y-1">
          <Link
            href="/admin/products/new"
            onClick={onNavigate}
            className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <PlusCircle size={13} className="text-primary" />
              <span>Add Product</span>
            </div>
            <ChevronRight size={12} />
          </Link>
          <Link
            href="/admin/inventory"
            onClick={onNavigate}
            className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Boxes size={13} className="text-emerald-500" />
              <span>Stock Control</span>
            </div>
            <ChevronRight size={12} />
          </Link>
          <Link
            href="/admin/orders"
            onClick={onNavigate}
            className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-amber-500" />
              <span>Pending Orders</span>
            </div>
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
