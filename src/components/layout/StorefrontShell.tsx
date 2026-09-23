"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MiniCart from "@/components/cart/MiniCart";
import ProductQuickAddModal from "@/components/product/ProductQuickAddModal";

export default function StorefrontShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  // On Admin routes: isolate completely by rendering ONLY the admin hierarchy without customer shell
  if (isAdminRoute) {
    return <main className="min-h-screen bg-background text-foreground">{children}</main>;
  }

  // On Storefront routes: render full customer ecommerce layout
  return (
    <>
      <Header />
      <MiniCart />
      <ProductQuickAddModal />
      <main className="min-h-screen pb-safe">{children}</main>
      <Footer />
    </>
  );
}
