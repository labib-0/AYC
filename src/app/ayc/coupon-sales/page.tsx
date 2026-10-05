"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  adminCouponService, 
  CouponSalesSummary, 
  CouponSalesOrderRecord,
  CouponSalesOrdersResponse,
  downloadBlob
} from "@/services/admin/coupon.service";
import {
  CouponSalesSummaryCards,
  CouponSalesFilterToolbar,
  CouponSalesOrdersTable,
  CouponSalesOrderDetailDrawer,
} from "@/components/admin/coupon-sales";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { TrendingUp, ShieldAlert, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

function CouponSalesDashboardContent() {
  const searchParams = useSearchParams();

  // Read initial filter values from URL query string if present (Section 8)
  const initialCoupon = searchParams.get("coupon") ? Number(searchParams.get("coupon")) : null;
  const initialDate = searchParams.get("date") || "all";
  const initialStartDate = searchParams.get("from") || "";
  const initialEndDate = searchParams.get("to") || "";
  const initialSearch = searchParams.get("search") || "";
  const initialSort = searchParams.get("sort") || "newest";
  const initialPage = searchParams.get("page") ? Math.max(1, Number(searchParams.get("page"))) : 1;

  const [summary, setSummary] = useState<CouponSalesSummary | null>(null);
  const [ordersResponse, setOrdersResponse] = useState<CouponSalesOrdersResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters State
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(initialCoupon);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  // Selected Order for Modal View
  const [selectedOrder, setSelectedOrder] = useState<CouponSalesOrderRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Section 8: Synchronize URL Query Parameters with Active Filters
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();

    if (selectedCouponId !== null) params.set("coupon", String(selectedCouponId));
    if (dateFilter && dateFilter !== "all") params.set("date", dateFilter);
    if (startDate) params.set("from", startDate);
    if (endDate) params.set("to", endDate);
    if (search) params.set("search", search);
    if (sort && sort !== "newest") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));

    const queryString = params.toString();
    const targetUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", targetUrl);
  }, [selectedCouponId, dateFilter, startDate, endDate, search, sort, page]);

  // 1. Load Summary
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setApiError(null);
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
      const message = (err as Error)?.message || "Failed to load coupon sales summary.";
      setApiError(message);
      showToast(message, "error");
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedCouponId, dateFilter, startDate, endDate, search, showToast]);

  // 2. Load Orders
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setApiError(null);
    try {
      const data = await adminCouponService.getCouponSalesOrders({
        coupon_id: selectedCouponId || undefined,
        date_filter: dateFilter,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search || undefined,
        sort,
        page,
        per_page: 20,
      });
      setOrdersResponse(data);
    } catch (err: unknown) {
      const message = (err as Error)?.message || "Failed to load coupon orders.";
      setApiError(message);
      showToast(message, "error");
    } finally {
      setLoadingOrders(false);
    }
  }, [selectedCouponId, dateFilter, startDate, endDate, search, sort, page, showToast]);

  // Trigger loads on filter/sort/page change
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

  // Section 7: Reset Filters Action
  const handleResetFilters = () => {
    setSelectedCouponId(null);
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
    setSearch("");
    setSort("newest");
    setPage(1);
    showToast("Filters reset to default view.", "success");
  };

  // Section 15: CSV Export Action
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const blob = await adminCouponService.exportCouponSalesCsv({
        coupon_id: selectedCouponId || undefined,
        date_filter: dateFilter,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search || undefined,
        sort,
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `coupon-sales-orders-${dateStr}.csv`;
      downloadBlob(blob, filename);
      showToast("CSV export downloaded successfully.", "success");
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to export CSV.", "error");
    } finally {
      setIsExporting(false);
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
        {/* Section 2: Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold uppercase tracking-tight text-foreground">
                COUPON SALES
              </h1>
              <p className="text-xs text-muted-foreground">
                Your coupon performance and attributed orders.
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

        {/* Section 20: Safe Error State Banner with Retry */}
        {apiError && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Section 18 & 24: Unassigned Empty State */}
        {!hasBindings && !loadingSummary ? (
          <div className="p-12 text-center bg-card border border-border/80 rounded-3xl shadow-2xs max-w-lg mx-auto my-8">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 w-fit mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-base font-display font-bold uppercase tracking-tight text-foreground font-mono">
              NO COUPONS ASSIGNED
            </h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              You are not currently assigned to any sales coupons. Please contact your Super Administrator to bind coupons to your account.
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
              sort={sort}
              onSortChange={(s) => {
                setSort(s);
                setPage(1);
              }}
              onReset={handleResetFilters}
              onRefresh={handleRefresh}
              onExportCsv={handleExportCsv}
              isRefreshing={isRefreshing}
              isExporting={isExporting}
            />

            {/* 3. Attributed Orders Table */}
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

export default function CouponSalesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-secondary/50 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-secondary/40 rounded-2xl" />
            ))}
          </div>
          <div className="h-16 bg-secondary/30 rounded-2xl" />
          <div className="h-80 bg-secondary/20 rounded-2xl" />
        </div>
      }
    >
      <CouponSalesDashboardContent />
    </Suspense>
  );
}
