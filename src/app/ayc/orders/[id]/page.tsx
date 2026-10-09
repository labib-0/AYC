"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminOrderService } from "@/services/admin";
import { OrderRecord } from "@/services/order.service";
import {
  OrderDetailHeader,
  OrderSummaryMetrics,
  OrderItemsTable,
  OrderFinancialSummary,
  OrderPaymentInventoryCard,
  OrderCustomerDeliveryCard,
  CarrierFulfillmentCard,
  OceanFreightQuoteModal,
  FulfillmentUpdateModal,
  AramexShipmentDialog,
  OrderCancelModal,
  OrderStatusHistory,
} from "@/components/admin/orders";
import type { PaymentVerificationDetails } from "@/components/admin/orders/OrderPaymentInventoryCard";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Data & Loading State
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modal States
  const [isSeaQuoteModalOpen, setIsSeaQuoteModalOpen] = useState(false);
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const [isAramexDialogOpen, setIsAramexDialogOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const addToast = (type: "success" | "error", message: string) => {
    const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
  };

  const removeToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  const loadOrder = useCallback(
    async (isSilentRefresh = false) => {
      if (!isSilentRefresh) setLoading(true);
      setError(null);

      try {
        const data = await adminOrderService.getOrderById(id);
        setOrder(data);
      } catch (err: unknown) {
        setError((err as Error)?.message || "Could not retrieve order details.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrder(true);
    addToast("success", "Order details refreshed.");
  };

  // 1. Order Status Update
  const handleUpdateStatus = async (newStatus: string, note?: string) => {
    if (!order) return;
    setActionLoading(true);

    try {
      const updated = await adminOrderService.updateOrderStatus(order.id, newStatus, note);
      setOrder(updated);
      addToast("success", `Order status updated to ${newStatus.toUpperCase()}.`);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Unable to update order status.");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Cancellation Handler
  const handleCancelOrder = async (reason: string) => {
    if (!order) return;
    setActionLoading(true);

    try {
      const updated = await adminOrderService.updateOrderStatus(order.id, "cancelled", reason);
      setOrder(updated);
      setIsCancelModalOpen(false);
      addToast("success", `Order #${order.order_number} has been cancelled.`);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Unable to cancel order.");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Fulfillment Details Update
  const handleSaveFulfillment = async (data: {
    fulfillment_status: string;
    carrier?: string;
    tracking_number?: string;
    note?: string;
  }) => {
    if (!order) return;
    setActionLoading(true);

    try {
      const updated = await adminOrderService.updateFulfillment(
        order.id,
        data.fulfillment_status,
        data.tracking_number,
        data.carrier,
        data.note
      );
      setOrder(updated);
      setIsFulfillmentModalOpen(false);
      addToast("success", "Fulfillment updated successfully.");
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to update fulfillment.");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Aramex Shipment Creation
  const handleConfirmAramexShipment = async () => {
    if (!order) return;
    setActionLoading(true);

    try {
      const result = await adminOrderService.createAramexShipment(order.id);
      if (result.order) {
        setOrder(result.order);
      } else {
        await loadOrder(true);
      }
      setIsAramexDialogOpen(false);
      addToast(
        "success",
        `Aramex shipment created successfully! AWB: ${result.tracking_number || "Generated"}.`
      );
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to create Aramex shipment.");
      await loadOrder(true);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Carrier Tracking Refresh
  const handleRefreshTracking = async () => {
    if (!order || !order.tracking_number) return;
    setActionLoading(true);

    try {
      const result = await adminOrderService.refreshTracking(order.id);
      if (result.order) {
        setOrder(result.order);
      }
      addToast(
        "success",
        `Carrier tracking refreshed: ${result.tracking?.status || "Updated"}.`
      );
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to refresh live tracking.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Payment Verification Workflow (Approve / Reject)
  const handleApprovePayment = async (details: PaymentVerificationDetails) => {
    if (!order) return;
    setActionLoading(true);

    try {
      const updated = await adminOrderService.reviewPaymentProof(
        order.id,
        "approve",
        details.note,
        details
      );
      setOrder(updated);
      addToast("success", "Payment verified and order confirmed! Inventory decremented.");
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Payment verification failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (note: string) => {
    if (!order) return;
    setActionLoading(true);

    try {
      const updated = await adminOrderService.reviewPaymentProof(
        order.id,
        "reject",
        note
      );
      setOrder(updated);
      addToast("success", "Submitted payment marked as rejected.");
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Payment rejection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Ocean Freight Quote Save
  const handleSaveSeaQuote = async (data: {
    amount: number;
    quote_reference?: string;
    carrier?: string;
    valid_until?: string;
    notes?: string;
  }) => {
    if (!order) return;
    setActionLoading(true);

    try {
      const result = await adminOrderService.updateShippingQuote(order.id, data);
      setOrder(result.order);
      setIsSeaQuoteModalOpen(false);
      addToast("success", `Freight quote saved: $${data.amount.toFixed(2)} USD.`);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to update freight quote.");
    } finally {
      setActionLoading(false);
    }
  };

  // Scroll to payment verification section
  const handleScrollToPaymentReview = () => {
    const el = document.getElementById("admin-payment-inventory-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs text-muted-foreground font-medium">
          Loading order workspace...
        </span>
      </div>
    );
  }

  // Not Found / Error State
  if (error || !order) {
    return (
      <div className="p-8 bg-card border border-destructive/30 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
        <AlertTriangle size={36} className="text-destructive mx-auto" />
        <h2 className="text-lg font-bold uppercase text-foreground">Order Not Found</h2>
        <p className="text-xs text-muted-foreground">
          {error || "Could not retrieve the requested order record."}
        </p>
        <Link
          href="/ayc/orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Back to Orders</span>
        </Link>
      </div>
    );
  }

  return (
    <AdminPageGate permission="order.view" moduleName="Order Details">
      <div className="space-y-6 w-full max-w-full" id="admin-order-workspace">
        {/* 1. Order Header: Title, Customer, Placed Date, Status Badges, Prominent Next Action & Documents Dropdown */}
        <OrderDetailHeader
          order={order}
          backHref="/ayc/orders"
          onRefresh={handleRefresh}
          isLoading={isRefreshing || actionLoading}
          onOpenPaymentReview={handleScrollToPaymentReview}
          onOpenAramexModal={() => setIsAramexDialogOpen(true)}
          onOpenSeaQuoteModal={() => setIsSeaQuoteModalOpen(true)}
          onOpenFulfillmentModal={() => setIsFulfillmentModalOpen(true)}
          onUpdateStatus={handleUpdateStatus}
          onOpenCancelModal={() => setIsCancelModalOpen(true)}
          onRefreshTracking={handleRefreshTracking}
        />

        {/* 2. Compact Order Summary: 4 scannable summary metrics */}
        <OrderSummaryMetrics order={order} />

        {/* 3. Main Action-Oriented Two-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT / PRIMARY COLUMN (2 cols on lg): Items, Consolidated Payment & Inventory, Fulfillment & Dispatch */}
          <div className="lg:col-span-2 space-y-6">
            {/* 3. Order Items Table */}
            <OrderItemsTable items={order.items || []} />

            {/* 4. Payment & Inventory Section (Consolidated & State-Aware) */}
            <OrderPaymentInventoryCard
              order={order}
              onApprove={handleApprovePayment}
              onReject={handleRejectPayment}
              isLoading={actionLoading}
            />

            {/* 6. Fulfillment & Dispatch Logistics */}
            <CarrierFulfillmentCard
              order={order}
              onOpenSeaQuoteModal={() => setIsSeaQuoteModalOpen(true)}
              onOpenFulfillmentModal={() => setIsFulfillmentModalOpen(true)}
              onOpenAramexShipmentDialog={() => setIsAramexDialogOpen(true)}
              onRefreshTracking={handleRefreshTracking}
              actionLoading={actionLoading}
            />
          </div>

          {/* RIGHT / SIDEBAR COLUMN (1 col on lg): Financial Summary, Consolidated Customer & Delivery, Expandable Audit History */}
          <div className="space-y-6">
            {/* 7. Payment & Financial Summary */}
            <OrderFinancialSummary order={order} />

            {/* 5. Customer & Delivery (Consolidated) */}
            <OrderCustomerDeliveryCard order={order} />

            {/* 9. Activity & Audit History (Expandable) */}
            <OrderStatusHistory events={order.status_events || []} defaultOpen={false} />
          </div>
        </div>

        {/* Interactive Modals */}
        {/* A. Ocean Freight Quote Modal */}
        <OceanFreightQuoteModal
          isOpen={isSeaQuoteModalOpen}
          order={order}
          onClose={() => setIsSeaQuoteModalOpen(false)}
          onSaveQuote={handleSaveSeaQuote}
          isLoading={actionLoading}
        />

        {/* B. Manual Fulfillment Update Modal */}
        <FulfillmentUpdateModal
          isOpen={isFulfillmentModalOpen}
          order={order}
          onClose={() => setIsFulfillmentModalOpen(false)}
          onSave={handleSaveFulfillment}
          isLoading={actionLoading}
        />

        {/* C. Aramex Export Shipment Confirmation Dialog */}
        <AramexShipmentDialog
          isOpen={isAramexDialogOpen}
          order={order}
          onClose={() => setIsAramexDialogOpen(false)}
          onConfirm={handleConfirmAramexShipment}
          isLoading={actionLoading}
        />

        {/* D. Order Cancellation Modal */}
        <OrderCancelModal
          isOpen={isCancelModalOpen}
          order={order}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancelOrder}
          isLoading={actionLoading}
        />

        {/* Global Toast Notifications */}
        <ProductToast toasts={toasts} onDismiss={removeToast} />
      </div>
    </AdminPageGate>
  );
}
