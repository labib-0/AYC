"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MiniCart from "@/components/cart/MiniCart";
import ProductQuickAddModal from "@/components/product/ProductQuickAddModal";
import GlobalToast from "@/components/common/GlobalToast";
import GlobalPageViewTracker from "@/components/analytics/GlobalPageViewTracker";

interface StorefrontShellProps {
  children: React.ReactNode;
  isAdminHost?: boolean;
}

export default function StorefrontShell({
  children,
  isAdminHost = false,
}: StorefrontShellProps) {
  const pathname = usePathname();

  // Check client-side host and port
  const isClientAdmin = typeof window !== "undefined" && (
    window.location.port === "3001" ||
    window.location.hostname.startsWith("admin.") ||
    window.location.hostname === "admin.localhost"
  );

  const isAdminRoute =
    isAdminHost ||
    isClientAdmin ||
    pathname?.startsWith("/ayc") ||
    pathname?.startsWith("/admin");

  // On Admin routes: isolate completely by rendering ONLY the admin hierarchy without customer shell
  if (isAdminRoute) {
    return <main className="min-h-screen bg-background text-foreground">{children}</main>;
  }

  // On Storefront routes: render full customer ecommerce layout
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <GlobalPageViewTracker />
      <Header />
      <MiniCart />
      <ProductQuickAddModal />
      <main className="flex-1 min-h-[60vh] pb-safe">{children}</main>
      <Footer />
      <GlobalToast />
    </div>
  );
}
