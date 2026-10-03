"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminOrderService } from "@/services/admin";
import { OrderRecord } from "@/services/order.service";
import {
  OrderDetailHeader,
  OrderItemsTable,
  OrderFinancialSummary,
  CustomerInfoCard,
  ShippingInfoCard,
  PaymentInfoCard,
  PaymentProofReview,
  PaymentReviewModal,
  CarrierFulfillmentCard,
  OceanFreightQuoteModal,
  FulfillmentUpdateModal,
  AramexShipmentDialog,
  OrderStatusTransitionCard,
  OrderStatusHistory,
} from "@/components/admin/orders";
import type { PaymentVerificationDetails } from "@/components/admin/orders/PaymentProofReview";
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
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");

  const [isSeaQuoteModalOpen, setIsSeaQuoteModalOpen] = useState(false);
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const [isAramexDialogOpen, setIsAramexDialogOpen] = useState(false);

  const addToast = (type: "success" | "error", message: string) => {
    const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
  };

  const removeToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  const loadOrder = useCallback(async (isSilentRefresh = false) => {
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
  }, [id]);

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

  // 2. Fulfillment Details Update
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

  // 3. Aramex Shipment Creation
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

  // 4. Carrier Tracking Refresh
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

  // 5. Payment Verification Workflow (Approve / Reject)
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
      addToast("success", "Payment verified and order confirmed! Order is now marked as PAID.");
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

  const handleOpenReviewModal = (action: "approve" | "reject") => {
    setReviewAction(action);
    setIsReviewModalOpen(true);
  };

  const handleConfirmPaymentProof = async (note: string) => {
    if (!order) return;
    setActionLoading(true);

    try {
      const updated = await adminOrderService.reviewPaymentProof(
        order.id,
        reviewAction,
        note
      );
      setOrder(updated);
      setIsReviewModalOpen(false);
      addToast("success", `Payment proof ${reviewAction}d successfully.`);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Payment proof review failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Ocean Freight Quote Save
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
      addToast(
        "success",
        `Freight quote saved: $${data.amount.toFixed(2)} USD.`
      );
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to update freight quote.");
    } finally {
      setActionLoading(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs text-muted-foreground font-medium">
          Loading order details...
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
      <div className="space-y-8 w-full max-w-full">
      {/* 1. Detail Header & Commercial Document Links */}
      <OrderDetailHeader
        order={order}
        backHref="/ayc/orders"
        onRefresh={handleRefresh}
        isLoading={isRefreshing}
      />

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN (2 Cols on lg): Items, Carrier Logistics, Payment Proof, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table */}
          <OrderItemsTable items={order.items || []} />

          {/* Carrier & Dispatch Logistics */}
          <CarrierFulfillmentCard
            order={order}
            onOpenSeaQuoteModal={() => setIsSeaQuoteModalOpen(true)}
            onOpenFulfillmentModal={() => setIsFulfillmentModalOpen(true)}
            onOpenAramexShipmentDialog={() => setIsAramexDialogOpen(true)}
            onRefreshTracking={handleRefreshTracking}
            actionLoading={actionLoading}
          />

          {/* Payment Verification Section */}
          <PaymentProofReview
            order={order}
            onApprove={handleApprovePayment}
            onReject={handleRejectPayment}
            isLoading={actionLoading}
          />

          {/* Chronological Audit Events Timeline */}
          <OrderStatusHistory events={order.status_events || []} />
        </div>

        {/* RIGHT COLUMN (1 Col on lg): Status Transition, Financial Summary, Payment, Customer, Shipping */}
        <div className="space-y-6">
          {/* Order Status Transition Control */}
          <OrderStatusTransitionCard
            order={order}
            onUpdateStatus={handleUpdateStatus}
            isLoading={actionLoading}
          />

          {/* Financial Summary */}
          <OrderFinancialSummary order={order} />

          {/* Payment Details Card */}
          <PaymentInfoCard
            order={order}
            onOpenProofModal={
              order.payment_proof_url ? () => handleOpenReviewModal("approve") : undefined
            }
          />

          {/* Customer Information Card */}
          <CustomerInfoCard order={order} />

          {/* Shipping & Destination Details Card */}
          <ShippingInfoCard order={order} />
        </div>
      </div>

      {/* 3. Interactive Application Modals (No Native Dialogs) */}
      {/* A. Payment Proof Review Modal */}
      <PaymentReviewModal
        isOpen={isReviewModalOpen}
        action={reviewAction}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={handleConfirmPaymentProof}
        isLoading={actionLoading}
      />

      {/* B. Ocean Freight Quote Modal */}
      <OceanFreightQuoteModal
        isOpen={isSeaQuoteModalOpen}
        order={order}
        onClose={() => setIsSeaQuoteModalOpen(false)}
        onSaveQuote={handleSaveSeaQuote}
        isLoading={actionLoading}
      />

      {/* C. Manual Fulfillment Update Modal */}
      <FulfillmentUpdateModal
        isOpen={isFulfillmentModalOpen}
        order={order}
        onClose={() => setIsFulfillmentModalOpen(false)}
        onSave={handleSaveFulfillment}
        isLoading={actionLoading}
      />

      {/* D. Aramex Export Shipment Confirmation Dialog */}
      <AramexShipmentDialog
        isOpen={isAramexDialogOpen}
        order={order}
        onClose={() => setIsAramexDialogOpen(false)}
        onConfirm={handleConfirmAramexShipment}
        isLoading={actionLoading}
      />

      {/* 4. Global Toast Notifications */}
      <ProductToast toasts={toasts} onDismiss={removeToast} />
      </div>
    </AdminPageGate>
  );
}
