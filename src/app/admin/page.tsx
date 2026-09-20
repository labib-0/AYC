"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Package, 
  CheckCircle2, 
  ShoppingBag, 
  Clock, 
  Users, 
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { adminDashboardService, DashboardMetrics } from "@/services/admin/dashboard.service";
import {
  DashboardHeader,
  DashboardMetricCard,
  DashboardQuickActions,
  RecentOrdersTable,
  RecentRfqsTable,
} from "@/components/admin/dashboard";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await adminDashboardService.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  // ── Loading Skeleton State ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/70">
          <div className="space-y-1.5">
            <div className="h-6 w-36 bg-secondary/80 rounded-md animate-pulse" />
            <div className="h-3.5 w-64 bg-secondary/60 rounded-md animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-secondary/70 rounded-lg animate-pulse" />
        </div>

        {/* Quick Actions Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-secondary/60 rounded-md animate-pulse" />
          <div className="h-7 w-32 bg-secondary/70 rounded-lg animate-pulse" />
          <div className="h-7 w-28 bg-secondary/70 rounded-lg animate-pulse" />
        </div>

        {/* KPI Cards Skeleton (6 cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 p-4 rounded-xl bg-card border border-border/70 shadow-2xs space-y-2 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 bg-secondary/80 rounded" />
                <div className="h-5 w-5 bg-secondary/80 rounded-md" />
              </div>
              <div className="h-6 w-12 bg-secondary rounded" />
            </div>
          ))}
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          <div className="h-64 rounded-xl bg-card border border-border/70 shadow-2xs animate-pulse" />
          <div className="h-64 rounded-xl bg-card border border-border/70 shadow-2xs animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Error State with Retry ────────────────────────────────────────────────
  if (error || !metrics) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl bg-card border border-destructive/30 shadow-xs text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle size={20} />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground font-sans">
            Unable to load dashboard data.
          </h2>
          <p className="text-xs text-muted-foreground font-sans">
            {error || "Could not retrieve operational metrics. Please check connection."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchMetrics(false)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <RotateCcw size={13} />
          <span>RETRY</span>
        </button>
      </div>
    );
  }

  // ── Operational Dashboard ────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* 1. Dashboard Page Header */}
      <DashboardHeader
        onRefresh={() => fetchMetrics(true)}
        isLoading={refreshing}
      />

      {/* 2. Quick Actions Strip */}
      <DashboardQuickActions />

      {/* 3. Primary KPI Area (6 Compact Cards) */}
      <section aria-label="Key Performance Indicators">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <DashboardMetricCard
            label="TOTAL PRODUCTS"
            value={metrics.total_products}
            icon={Package}
            href="/admin/products"
            subtext="Catalog items"
          />

          <DashboardMetricCard
            label="PUBLISHED PRODUCTS"
            value={metrics.active_products}
            icon={CheckCircle2}
            variant="success"
            href="/admin/products"
            subtext="Live on storefront"
          />

          <DashboardMetricCard
            label="TOTAL ORDERS"
            value={metrics.total_orders}
            icon={ShoppingBag}
            href="/admin/orders"
            subtext="All-time volume"
          />

          <DashboardMetricCard
            label="PENDING ORDERS"
            value={metrics.pending_orders}
            icon={Clock}
            variant={metrics.pending_orders > 0 ? "warning" : "default"}
            href="/admin/orders"
            subtext="Awaiting review"
          />

          <DashboardMetricCard
            label="TOTAL CUSTOMERS"
            value={metrics.total_customers}
            icon={Users}
            href="/admin/customers"
            subtext="Buyer accounts"
          />

          <DashboardMetricCard
            label="LOW STOCK"
            value={metrics.low_stock_items}
            icon={AlertTriangle}
            variant={metrics.low_stock_items > 0 ? "warning" : "default"}
            href="/admin/inventory"
            subtext="<100 units left"
          />
        </div>
      </section>

      {/* 4. Operational Tables Grid: Recent Orders & Recent RFQs */}
      <section
        aria-label="Recent Store Operations"
        className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch"
      >
        {/* Recent Orders Table */}
        <RecentOrdersTable orders={metrics.recent_orders} />

        {/* Recent RFQs Table */}
        <RecentRfqsTable rfqs={metrics.recent_rfqs} />
      </section>
    </div>
  );
}
