"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export function getAdminBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Base root
  const items: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/ayc/dashboard" },
  ];

  if (pathname === "/ayc" || pathname === "/ayc/dashboard") {
    items[0].isCurrent = true;
    return items;
  }

  // Catalog
  if (pathname === "/ayc/products") {
    items.push({ label: "Catalog" });
    items.push({ label: "Products", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/products/new") {
    items.push({ label: "Catalog" });
    items.push({ label: "Products", href: "/ayc/products" });
    items.push({ label: "Add Product", isCurrent: true });
    return items;
  }
  if (pathname.startsWith("/ayc/products/") && pathname.endsWith("/edit")) {
    items.push({ label: "Catalog" });
    items.push({ label: "Products", href: "/ayc/products" });
    items.push({ label: "Edit Product", isCurrent: true });
    return items;
  }
  if (pathname.startsWith("/ayc/products/")) {
    items.push({ label: "Catalog" });
    items.push({ label: "Products", href: "/ayc/products" });
    items.push({ label: "Product Details", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/categories") {
    items.push({ label: "Catalog" });
    items.push({ label: "Categories", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/brands") {
    items.push({ label: "Catalog" });
    items.push({ label: "Brands", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/inventory") {
    items.push({ label: "Catalog" });
    items.push({ label: "Inventory", isCurrent: true });
    return items;
  }

  // Commerce
  if (pathname === "/ayc/orders") {
    items.push({ label: "Commerce" });
    items.push({ label: "Orders & Fulfillment", isCurrent: true });
    return items;
  }
  if (pathname.startsWith("/ayc/orders/")) {
    const orderId = pathname.replace("/ayc/orders/", "");
    items.push({ label: "Commerce" });
    items.push({ label: "Orders & Fulfillment", href: "/ayc/orders" });
    items.push({ label: `Order #${orderId}`, isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/rfq") {
    items.push({ label: "Commerce" });
    items.push({ label: "RFQs", isCurrent: true });
    return items;
  }
  if (pathname.startsWith("/ayc/rfq/")) {
    const rfqId = pathname.replace("/ayc/rfq/", "");
    items.push({ label: "Commerce" });
    items.push({ label: "RFQs", href: "/ayc/rfq" });
    items.push({ label: `RFQ #${rfqId}`, isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/rfq-quotes" || pathname === "/ayc/quotations") {
    items.push({ label: "Commerce" });
    items.push({ label: "RFQs", href: "/ayc/rfq" });
    items.push({ label: "Quotations", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/pos") {
    items.push({ label: "Commerce" });
    items.push({ label: "POS", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/customers") {
    items.push({ label: "Commerce" });
    items.push({ label: "Customers", isCurrent: true });
    return items;
  }
  if (pathname.startsWith("/ayc/customers/")) {
    const custId = pathname.replace("/ayc/customers/", "");
    items.push({ label: "Commerce" });
    items.push({ label: "Customers", href: "/ayc/customers" });
    items.push({ label: `Customer #${custId}`, isCurrent: true });
    return items;
  }

  // Marketing
  if (pathname === "/ayc/coupons") {
    items.push({ label: "Marketing" });
    items.push({ label: "Coupons", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/coupon-sales") {
    items.push({ label: "Marketing" });
    items.push({ label: "Coupon Sales", isCurrent: true });
    return items;
  }

  // Storefront
  if (pathname === "/ayc/homepage") {
    items.push({ label: "Storefront" });
    items.push({ label: "Homepage", isCurrent: true });
    return items;
  }

  // Documents
  if (pathname === "/ayc/documents") {
    items.push({ label: "Documents" });
    items.push({ label: "Commercial Documents", isCurrent: true });
    return items;
  }
  if (pathname.startsWith("/ayc/documents/")) {
    const parts = pathname.replace("/ayc/documents/", "").split("/");
    const docType = parts[0] ? parts[0].toUpperCase() : "DOC";
    const docId = parts[1] || "";
    items.push({ label: "Documents" });
    items.push({ label: "Commercial Documents", href: "/ayc/documents" });
    items.push({ label: `${docType} #${docId}`, isCurrent: true });
    return items;
  }

  // Administration
  if (pathname === "/ayc/administrators" || pathname === "/ayc/admins") {
    items.push({ label: "Administration" });
    items.push({ label: "Administrators", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/roles") {
    items.push({ label: "Administration" });
    items.push({ label: "Roles & Permissions", href: "/ayc/roles" });
    items.push({ label: "Roles", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/permissions") {
    items.push({ label: "Administration" });
    items.push({ label: "Roles & Permissions", href: "/ayc/roles" });
    items.push({ label: "Permissions Matrix", isCurrent: true });
    return items;
  }
  if (pathname === "/ayc/settings") {
    items.push({ label: "Administration" });
    items.push({ label: "Settings & Config", isCurrent: true });
    return items;
  }

  // Fallback for unmapped routes
  const cleanPath = pathname.replace("/ayc/", "").replace("/", " ");
  items.push({ label: cleanPath || "Page", isCurrent: true });
  return items;
}

export default function AdminBreadcrumbs() {
  const pathname = usePathname();

  // Don't render on login pages
  if (
    pathname === "/ayc/login" ||
    pathname === "/admin/login" ||
    pathname === "/login"
  ) {
    return null;
  }

  const breadcrumbs = getAdminBreadcrumbs(pathname);

  // If on Dashboard root, render compact indicator
  if (pathname === "/ayc" || pathname === "/ayc/dashboard") {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-foreground">
          <Home size={13} className="text-primary" />
          <span>Dashboard Overview</span>
        </span>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs text-muted-foreground pb-1">
      <Link
        href="/ayc/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors p-1 -m-1 rounded-md"
        title="Go to Dashboard"
      >
        <Home size={13} className="text-primary" />
        <span className="sr-only sm:not-sr-only text-[11px] font-bold uppercase tracking-wider">
          Admin
        </span>
      </Link>

      {breadcrumbs.slice(1).map((crumb, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={12} className="text-muted-foreground/60 shrink-0" />
          {crumb.isCurrent ? (
            <span
              className="font-bold text-foreground truncate max-w-[200px] sm:max-w-none text-[11px] uppercase tracking-wider"
              aria-current="page"
            >
              {crumb.label}
            </span>
          ) : crumb.href ? (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors truncate max-w-[150px] sm:max-w-none text-[11px] font-semibold uppercase tracking-wider"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-muted-foreground/80 text-[11px] font-semibold uppercase tracking-wider">
              {crumb.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
