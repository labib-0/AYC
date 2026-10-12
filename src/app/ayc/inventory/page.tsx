"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Package, Loader2 } from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

function AdminInventoryRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const tabParam = params.get("tab");
    const statusParam = params.get("status");

    // Map former inventory stock control / low stock tabs to products availability filter
    if (tabParam === "stock-control" || statusParam === "LOW_STOCK") {
      params.delete("tab");
      params.delete("status");
      params.set("availability", "low_stock");
    } else if (statusParam === "OUT_OF_STOCK") {
      params.delete("status");
      params.set("availability", "out_of_stock");
    }

    const query = params.toString();
    const destination = `/ayc/products${query ? `?${query}` : ""}`;

    router.replace(destination);
  }, [router, searchParams]);

  const fallbackHref = "/ayc/products";

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center min-h-[320px] bg-card border border-border/70 rounded-2xl space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Package size={24} />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h2 className="text-base font-bold text-foreground">
          Inventory Consolidated into Products
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Inventory and stock management operations are now seamlessly integrated directly within the <strong>Products</strong> section.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
        <Loader2 size={14} className="animate-spin text-primary" />
        <span>Redirecting to Products...</span>
      </div>

      <Link
        href={fallbackHref}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xs"
      >
        <span>Go to Products</span>
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

export default function AdminInventoryPage() {
  return (
    <AdminPageGate permission="product.view" moduleName="Products">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Loading products...
          </div>
        }
      >
        <AdminInventoryRedirectContent />
      </Suspense>
    </AdminPageGate>
  );
}
