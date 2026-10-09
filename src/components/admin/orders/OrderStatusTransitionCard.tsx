import React, { useState } from "react";
import { OrderRecord } from "@/services/order.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import OrderStatusBadge from "./OrderStatusBadge";
import { 
  Lock, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ShieldAlert, 
  FileCheck,
  PackageCheck
} from "lucide-react";

export interface OrderStatusTransitionCardProps {
  order: OrderRecord;
  onUpdateStatus: (newStatus: string, note?: string) => Promise<void>;
  isLoading?: boolean;
}

export default function OrderStatusTransitionCard({
  order,
  onUpdateStatus,
  isLoading = false,
}: OrderStatusTransitionCardProps) {
  const { can, isSuperAdmin } = useAdminAuth();
  const canUpdateStatus = isSuperAdmin || can("order.update_status");
  const canCancel = isSuperAdmin || can("order.cancel");

  const [cancelNote, setCancelNote] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  const isPaid = order.payment_status === "paid";
  const canonical = order.customer_status || (
    isPaid 
      ? (["shipped", "delivered"].includes(order.fulfillment_status) ? "ON_SHIPMENT" : "ORDER_CONFIRMED")
      : (order.payment_proof_url ? "WAITING_FOR_APPROVAL" : "PAYMENT_PENDING")
  );

  const isTerminal = ["cancelled", "refunded", "delivered"].includes(order.status);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelNote.trim()) return;
    await onUpdateStatus("cancelled", cancelNote.trim());
    setShowCancelForm(false);
  };

  const handleAdvanceToShipped = async () => {
    await onUpdateStatus("shipped", "Order dispatched with export carrier.");
  };

  const handleAdvanceToDelivered = async () => {
    await onUpdateStatus("delivered", "Delivery confirmed by consignee.");
  };

  if (!canUpdateStatus) {
    return (
      <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Order Lifecycle Control
          </h2>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2.5">
          <Lock size={15} className="text-amber-500 shrink-0" />
          <span>Lifecycle modification requires <code className="font-mono text-foreground font-semibold">order.update_status</code> authority.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4" id="admin-order-status-card">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Order Lifecycle Control
          </h2>
          <span className="text-[11px] text-muted-foreground block font-mono">
            Canonical: {canonical}
          </span>
        </div>
        <OrderStatusBadge status={order.status} size="sm" />
      </div>

      {isTerminal ? (
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60 text-xs text-muted-foreground space-y-1">
          <p className="font-bold uppercase text-foreground">Terminal Status Reached</p>
          <p>
            Order #{order.order_number} is marked as{" "}
            <strong className="text-foreground uppercase">{order.status}</strong>. Lifecycle complete under workflow rules.
          </p>
        </div>
      ) : !isPaid ? (
        /* UNPAID STATES: PAYMENT PENDING or WAITING FOR APPROVAL */
        <div className="space-y-4 text-xs">
          {canonical === "WAITING_FOR_APPROVAL" ? (
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-2">
              <div className="flex items-center gap-2 font-bold uppercase text-sky-600 dark:text-sky-400">
                <Clock size={16} />
                <span>Action: Payment Approval Required</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Customer uploaded payment proof. Payment approval is the authoritative gate that confirms this order and decrements warehouse inventory.
              </p>
              <a
                href="#admin-payment-verification-section"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold uppercase text-[11px] tracking-wider transition-opacity hover:opacity-90 shadow-xs cursor-pointer mt-1"
                id="btn-jump-to-payment-review"
              >
                <FileCheck size={14} />
                <span>Review & Approve Payment Below</span>
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 font-bold uppercase text-amber-600 dark:text-amber-400">
                <Clock size={16} />
                <span>Stage: Payment Pending</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Awaiting customer bank transfer and receipt upload. Confirmation is gated by payment approval to prevent premature inventory decrement.
              </p>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-secondary/30 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
            <Lock size={13} className="text-amber-500 shrink-0" />
            <span>Confirmation gate locked. Unpaid orders cannot be manually moved to confirmed or processing.</span>
          </div>

          {/* Cancellation Option for Unpaid Orders */}
          {canCancel && !showCancelForm && (
            <div className="pt-2 border-t border-border/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCancelForm(true)}
                className="text-[11px] font-bold text-destructive hover:underline cursor-pointer uppercase tracking-wider"
                id="btn-open-cancel-order"
              >
                Cancel This Order...
              </button>
            </div>
          )}
        </div>
      ) : canonical === "ORDER_CONFIRMED" || order.status === "processing" || order.status === "confirmed" ? (
        /* PAID STATE: ORDER CONFIRMED -> READY FOR SHIPMENT */
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center gap-2 font-bold uppercase text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} />
              <span>Order Confirmed & Paid</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Payment verified and inventory decremented. Order is ready for export packaging and shipment dispatch.
            </p>
          </div>

          {order.fulfillment_status !== "shipped" && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleAdvanceToShipped}
                disabled={isLoading}
                className="w-full py-2.5 rounded-full bg-foreground text-background font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs text-xs"
                id="btn-advance-to-shipped"
              >
                <Truck size={14} />
                <span>Mark as Dispatched (ON SHIPMENT)</span>
              </button>
              <p className="text-[10px] text-muted-foreground text-center">
                Or use the Carrier Logistics card below to create carrier shipments &amp; generate AWBs.
              </p>
            </div>
          )}

          {canCancel && !showCancelForm && (
            <div className="pt-2 border-t border-border/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCancelForm(true)}
                className="text-[11px] font-bold text-destructive hover:underline cursor-pointer uppercase tracking-wider"
                id="btn-open-cancel-order"
              >
                Cancel Confirmed Order...
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ON SHIPMENT STATE */
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1.5">
            <div className="flex items-center gap-2 font-bold uppercase text-purple-600 dark:text-purple-400">
              <Truck size={16} />
              <span>On Shipment</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Order has departed factory and is in transit with export carrier ({order.carrier || "Assigned Carrier"}).
            </p>
            {order.tracking_number && (
              <p className="font-mono font-bold text-foreground text-xs pt-1">
                AWB / Tracking: {order.tracking_number}
              </p>
            )}
          </div>

          {order.status !== "delivered" && (
            <button
              type="button"
              onClick={handleAdvanceToDelivered}
              disabled={isLoading}
              className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider disabled:opacity-40 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs text-xs"
              id="btn-advance-to-delivered"
            >
              <PackageCheck size={14} />
              <span>Confirm Consignee Delivery</span>
            </button>
          )}
        </div>
      )}

      {/* Inline Cancellation Form with Required Audit Note */}
      {showCancelForm && (
        <form onSubmit={handleCancelSubmit} className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs space-y-3">
          <div className="flex items-center justify-between font-bold text-destructive uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={14} />
              <span>Cancel Order #{order.order_number}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCancelForm(false)}
              className="text-muted-foreground hover:text-foreground text-[10px]"
            >
              Close
            </button>
          </div>
          <p className="text-muted-foreground text-[11px]">
            If inventory was previously decremented, cancellation will automatically restore stock to warehouse inventory.
          </p>
          <textarea
            required
            rows={2}
            value={cancelNote}
            onChange={(e) => setCancelNote(e.target.value)}
            placeholder="Administrative cancellation justification (required for audit log)..."
            className="w-full px-3 py-2 rounded-xl border border-destructive/30 bg-background text-foreground outline-none focus:ring-1 focus:ring-destructive"
            id="input-cancel-note"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCancelForm(false)}
              className="px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground text-[11px] uppercase font-bold"
            >
              Dismiss
            </button>
            <button
              type="submit"
              disabled={isLoading || !cancelNote.trim()}
              className="px-4 py-1.5 rounded-full bg-destructive text-destructive-foreground font-bold uppercase text-[11px] tracking-wider hover:opacity-90 disabled:opacity-50 cursor-pointer"
              id="btn-submit-order-cancellation"
            >
              Confirm Cancellation
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
