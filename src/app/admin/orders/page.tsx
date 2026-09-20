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
} from "@/components/admin/orders";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";

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
        }),
        adminOrderService.getOrderSummary(),
      ]);

      setOrders(orderRes.data);
      setTotal(orderRes.total);
      setTotalPages(orderRes.last_page);
      setMetrics(summaryRes);
    } catch (err: any) {
      console.error("Failed to load orders:", err);
      setError(err?.message || "Unable to load orders. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, search, status, paymentStatus, fulfillmentStatus]);

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

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setPaymentStatus("all");
    setFulfillmentStatus("all");
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
    } catch (err: any) {
      addToast("error", err?.message || "Failed to approve payment proof.");
    } finally {
      setActionLoading(false);
    }
  };

  const hasFilters =
    search.trim() !== "" ||
    status !== "all" ||
    paymentStatus !== "all" ||
    fulfillmentStatus !== "all";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
  );
}
