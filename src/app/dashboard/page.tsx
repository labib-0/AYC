"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useWishlist } from "@/lib/WishlistContext";
import { getUserOrders, OrderRecord } from "@/lib/services/orders";
import { getAllRfqs } from "@/lib/services/rfq";
import { productService } from "@/services/product.service";
import { RfqRecord } from "@/types/b2b";
import { Product } from "@/types";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardKPICards } from "@/components/dashboard/DashboardKPICards";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardRecentOrders } from "@/components/dashboard/DashboardRecentOrders";
import { DashboardOpenRfqs } from "@/components/dashboard/DashboardOpenRfqs";
import { DashboardReorderPreview } from "@/components/dashboard/DashboardReorderPreview";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { totalWishlistItems } = useWishlist();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [rfqs, setRfqs] = useState<RfqRecord[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      if (!user) return;
      setLoading(true);

      try {
        const [ordersData, allRfqs, productsRes] = await Promise.all([
          getUserOrders(user.id),
          getAllRfqs(),
          productService.getProducts({ limit: 40 }),
        ]);

        if (!isMounted) return;

        // Data isolation: only customer-owned orders
        const customerOrders = ordersData.filter(
          (o) =>
            (o.user_id && String(o.user_id) === String(user.id)) ||
            (o.email && user.email && o.email.toLowerCase() === user.email.toLowerCase())
        );

        // Data isolation: only customer-owned RFQs
        const customerRfqs = allRfqs.filter(
          (r) =>
            (r.userId && String(r.userId) === String(user.id)) ||
            (r.buyerEmail && user.email && r.buyerEmail.toLowerCase() === user.email.toLowerCase())
        );

        setOrders(customerOrders);
        setRfqs(customerRfqs);
        setCatalogProducts((productsRes as any) || []);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Calculate unique past-ordered products for Reorder count
  const uniquePurchasedProductIds = new Set<string>();
  for (const o of orders) {
    if (o.items) {
      for (const item of o.items) {
        if (item.product_id) uniquePurchasedProductIds.add(String(item.product_id));
        else if (item.product_name) uniquePurchasedProductIds.add(item.product_name);
      }
    }
  }

  // Calculate open / active quotes & RFQs (non-terminal status)
  const activeQuotesCount = rfqs.filter(
    (r) => r.status !== "REJECTED" && r.status !== "CANCELLED"
  ).length;

  return (
    <div className="space-y-2">
      {/* Header Banner */}
      <DashboardHeader user={user} />

      {/* KPI Cards */}
      <DashboardKPICards
        ordersCount={orders.length}
        quotesCount={activeQuotesCount}
        reorderCount={uniquePurchasedProductIds.size}
        savedCount={totalWishlistItems}
        loading={loading}
      />

      {/* Quick Actions Shortcuts */}
      <DashboardQuickActions />

      {/* Reorder Shelf Preview (if user has orders) */}
      <DashboardReorderPreview orders={orders} catalogProducts={catalogProducts} />

      {/* Recent Orders Grid/Table */}
      <DashboardRecentOrders orders={orders} loading={loading} />

      {/* Open RFQs & Quotations */}
      <DashboardOpenRfqs rfqs={rfqs} loading={loading} />
    </div>
  );
}
