"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  adminOrderService, 
  OrderSummaryMetrics 
} from "@/services/admin";
import { OrderRecord } from "@/services/order.service";
import {
  OrderListHeader,
  OrderKpis,
  OrderToolbar,
  OrderTable,
  OrderPagination,
  PaymentReviewModal,
  DateFilterPreset,
} from "@/components/admin/orders";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

const PER_PAGE = 20;

export default function AdminOrdersPage() {
  // Data State
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [metrics, setMetrics] = useState<OrderSummaryMetrics | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UX & Loading State
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Filter & Pagination State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [fulfillmentStatus, setFulfillmentStatus] = useState("all");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);

  // Sync initial filters from URL params if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const initialPreset = params.get("date_preset");
    const initialFrom = params.get("date_from") || params.get("start_date");
    const initialTo = params.get("date_to") || params.get("end_date");
    const initialSearch = params.get("search");
    const initialStatus = params.get("status");
    const initialPayment = params.get("payment_status");
    const initialFulfillment = params.get("fulfillment_status");
    const initialPage = params.get("page");

    if (initialPreset && ["all", "today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month", "custom"].includes(initialPreset)) {
      setDatePreset(initialPreset as DateFilterPreset);
    }
    if (initialFrom) setDateFrom(initialFrom);
    if (initialTo) setDateTo(initialTo);
    if (initialSearch) setSearch(initialSearch);
    if (initialStatus) setStatus(initialStatus);
    if (initialPayment) setPaymentStatus(initialPayment);
    if (initialFulfillment) setFulfillmentStatus(initialFulfillment);
    if (initialPage && !isNaN(Number(initialPage))) setPage(Number(initialPage));
  }, []);

  // Update URL without full page reload when filters change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (paymentStatus !== "all") params.set("payment_status", paymentStatus);
    if (fulfillmentStatus !== "all") params.set("fulfillment_status", fulfillmentStatus);
    if (datePreset !== "all") params.set("date_preset", datePreset);
    if (datePreset === "custom") {
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
    }
    if (page > 1) params.set("page", String(page));

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [search, status, paymentStatus, fulfillmentStatus, datePreset, dateFrom, dateTo, page]);

  // Payment Proof Quick Review Modal State
  const [reviewOrder, setReviewOrder] = useState<OrderRecord | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const addToast = (type: "success" | "error", message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setLoading(true);
    setError(null);

    try {
      const [orderRes, summaryRes] = await Promise.all([
        adminOrderService.getOrders({
          page,
          per_page: PER_PAGE,
          search: search.trim() || undefined,
          status: status !== "all" ? status : undefined,
          payment_status: paymentStatus !== "all" ? paymentStatus : undefined,
          fulfillment_status: fulfillmentStatus !== "all" ? fulfillmentStatus : undefined,
          date_preset: datePreset !== "all" ? datePreset : undefined,
          date_from: datePreset === "custom" ? dateFrom : undefined,
          date_to: datePreset === "custom" ? dateTo : undefined,
        }),
        adminOrderService.getOrderSummary(),
      ]);

      setOrders(orderRes.data);
      setTotal(orderRes.total);
      setTotalPages(orderRes.last_page);
      setMetrics(summaryRes);
    } catch (err: unknown) {
      console.error("Failed to load orders:", err);
      setError((err as Error)?.message || "Unable to load orders. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, search, status, paymentStatus, fulfillmentStatus, datePreset, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    addToast("success", "Orders refreshed successfully.");
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  const handlePaymentStatusChange = (val: string) => {
    setPaymentStatus(val);
    setPage(1);
  };

  const handleFulfillmentStatusChange = (val: string) => {
    setFulfillmentStatus(val);
    setPage(1);
  };

  const handleDateChange = (preset: DateFilterPreset, from?: string, to?: string) => {
    setDatePreset(preset);
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setPaymentStatus("all");
    setFulfillmentStatus("all");
    setDatePreset("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  const handleOpenReviewProof = (order: OrderRecord) => {
    setReviewOrder(order);
    setIsReviewModalOpen(true);
  };

  const handleConfirmPaymentProof = async (note: string) => {
    if (!reviewOrder) return;
    setActionLoading(true);

    try {
      await adminOrderService.reviewPaymentProof(reviewOrder.id, "approve", note);
      addToast("success", `Payment proof for Order #${reviewOrder.order_number} approved.`);
      setIsReviewModalOpen(false);
      setReviewOrder(null);
      await loadData(true);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to approve payment proof.");
    } finally {
      setActionLoading(false);
    }
  };

  const hasFilters =
    search.trim() !== "" ||
    status !== "all" ||
    paymentStatus !== "all" ||
    fulfillmentStatus !== "all" ||
    datePreset !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  return (
    <AdminPageGate permission="order.view" moduleName="Orders Management">
      <div className="space-y-6 w-full max-w-full">
        {/* 1. Header */}
        <OrderListHeader onRefresh={handleRefresh} isLoading={isRefreshing} />

        {/* 2. KPI Metrics */}
        <OrderKpis
          metrics={metrics}
          activeStatusFilter={status}
          activePaymentFilter={paymentStatus}
          onSelectStatusFilter={handleStatusChange}
          onSelectPaymentFilter={handlePaymentStatusChange}
          isLoading={loading && !metrics}
        />

        {/* 3. Search & Filters Toolbar */}
        <OrderToolbar
          search={search}
          onSearchChange={handleSearchChange}
          datePreset={datePreset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateChange={handleDateChange}
          status={status}
          onStatusChange={handleStatusChange}
          paymentStatus={paymentStatus}
          onPaymentStatusChange={handlePaymentStatusChange}
          fulfillmentStatus={fulfillmentStatus}
          onFulfillmentStatusChange={handleFulfillmentStatusChange}
          onResetFilters={handleResetFilters}
          totalFiltered={total}
        />

        {/* 4. Orders Table */}
        <OrderTable
          orders={orders}
          isLoading={loading}
          isError={Boolean(error)}
          errorMessage={error || undefined}
          onRetry={() => loadData()}
          hasFilters={hasFilters}
          onResetFilters={handleResetFilters}
          detailBaseUrl="/admin/orders"
          onReviewPaymentProof={handleOpenReviewProof}
        />

        {/* 5. Pagination */}
        {!loading && !error && orders.length > 0 && (
          <OrderPagination
            currentPage={page}
            totalPages={totalPages}
            totalOrders={total}
            perPage={PER_PAGE}
            onPageChange={(p) => setPage(p)}
            isLoading={loading}
          />
        )}

        {/* 6. Quick Payment Proof Review Modal */}
        {reviewOrder && (
          <PaymentReviewModal
            isOpen={isReviewModalOpen}
            action="approve"
            onClose={() => {
              setIsReviewModalOpen(false);
              setReviewOrder(null);
            }}
            onConfirm={handleConfirmPaymentProof}
            isLoading={actionLoading}
          />
        )}

        {/* 7. Toast Alerts */}
        <ProductToast toasts={toasts} onDismiss={removeToast} />
      </div>
    </AdminPageGate>
  );
}
