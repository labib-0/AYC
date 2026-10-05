"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  adminCouponService, 
  CouponSalesSummary, 
  CouponSalesOrderRecord,
  CouponSalesOrdersResponse 
} from "@/services/admin/coupon.service";
import {
  CouponSalesSummaryCards,
  CouponSalesFilterToolbar,
  CouponSalesOrdersTable,
  CouponSalesOrderDetailDrawer,
} from "@/components/admin/coupon-sales";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { TrendingUp, ShieldAlert, Sparkles } from "lucide-react";

export default function CouponSalesPage() {
  const [summary, setSummary] = useState<CouponSalesSummary | null>(null);
  const [ordersResponse, setOrdersResponse] = useState<CouponSalesOrdersResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters State
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Selected Order for Modal View
  const [selectedOrder, setSelectedOrder] = useState<CouponSalesOrderRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 1. Load Summary
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await adminCouponService.getCouponSalesSummary({
        coupon_id: selectedCouponId || undefined,
        date_filter: dateFilter,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search || undefined,
      });
      setSummary(data);
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to load sales summary.", "error");
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedCouponId, dateFilter, startDate, endDate, search, showToast]);

  // 2. Load Orders
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await adminCouponService.getCouponSalesOrders({
        coupon_id: selectedCouponId || undefined,
        date_filter: dateFilter,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search || undefined,
        page,
        per_page: 20,
      });
      setOrdersResponse(data);
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to load coupon orders.", "error");
    } finally {
      setLoadingOrders(false);
    }
  }, [selectedCouponId, dateFilter, startDate, endDate, search, page, showToast]);

  // Trigger loads on filter change
  useEffect(() => {
    loadSummary();
    loadOrders();
  }, [loadSummary, loadOrders]);

  // Refresh Action
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadSummary(), loadOrders()]);
      showToast("Sales metrics and orders refreshed.", "success");
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to refresh data.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewOrder = (order: CouponSalesOrderRecord) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const hasBindings = summary?.has_bindings ?? true;

  return (
    <AdminPageGate permission="analytics.sales.view" moduleName="Coupon Sales Dashboard">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold uppercase tracking-tight text-foreground">
                Coupon Sales Reporting
              </h1>
              <p className="text-xs text-muted-foreground">
                Performance, revenue, and order visibility attributed strictly to your assigned coupons.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 text-foreground border border-border/70 text-xs font-semibold">
              <Sparkles size={13} className="text-primary" />
              <span>Strict Data Scoping Active</span>
            </div>
          </div>
        </div>

        {/* Section 24: Unassigned Empty State */}
        {!hasBindings && !loadingSummary ? (
          <div className="p-12 text-center bg-card border border-border/80 rounded-3xl shadow-2xs max-w-lg mx-auto my-8">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 w-fit mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-base font-display font-bold uppercase tracking-tight text-foreground">
              No Coupons Assigned
            </h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Your administrator account is not currently assigned to any promotional sales coupons.
              Please contact your Super Administrator to bind coupons to your profile.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Summary Cards */}
            <CouponSalesSummaryCards summary={summary} loading={loadingSummary} />

            {/* 2. Filter Toolbar */}
            <CouponSalesFilterToolbar
              boundCoupons={summary?.bound_coupons || []}
              selectedCouponId={selectedCouponId}
              onSelectCouponId={(id) => {
                setSelectedCouponId(id);
                setPage(1);
              }}
              dateFilter={dateFilter}
              onDateFilterChange={(df) => {
                setDateFilter(df);
                setPage(1);
              }}
              startDate={startDate}
              onStartDateChange={(sd) => {
                setStartDate(sd);
                setPage(1);
              }}
              endDate={endDate}
              onEndDateChange={(ed) => {
                setEndDate(ed);
                setPage(1);
              }}
              search={search}
              onSearchChange={(s) => {
                setSearch(s);
                setPage(1);
              }}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />

            {/* 3. Orders Table */}
            <CouponSalesOrdersTable
              orders={ordersResponse?.data || []}
              loading={loadingOrders}
              currentPage={ordersResponse?.current_page || 1}
              lastPage={ordersResponse?.last_page || 1}
              totalItems={ordersResponse?.total || 0}
              perPage={ordersResponse?.per_page || 20}
              onPageChange={(p) => setPage(p)}
              onViewOrder={handleViewOrder}
              search={search}
            />

            {/* 4. Order Detail Drawer */}
            <CouponSalesOrderDetailDrawer
              order={selectedOrder}
              isOpen={isDetailOpen}
              onClose={() => {
                setIsDetailOpen(false);
                setSelectedOrder(null);
              }}
            />
          </>
        )}

        {/* 5. Toasts */}
        <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}
