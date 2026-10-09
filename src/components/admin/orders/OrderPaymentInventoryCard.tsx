import React, { useState } from "react";
import { OrderRecord } from "@/services/order.service";
import PaymentStatusBadge from "./PaymentStatusBadge";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Check,
  Calendar,
} from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface PaymentVerificationDetails {
  payment_method?: string;
  transaction_id?: string;
  payer_name?: string;
  bank_name?: string;
  account_number?: string;
  payment_amount?: number;
  payment_date?: string;
  note?: string;
}

export interface OrderPaymentInventoryCardProps {
  order: OrderRecord;
  onApprove: (details: PaymentVerificationDetails) => Promise<void>;
  onReject: (note: string) => Promise<void>;
  isLoading?: boolean;
}

export default function OrderPaymentInventoryCard({
  order,
  onApprove,
  onReject,
  isLoading = false,
}: OrderPaymentInventoryCardProps) {
  const { can, isSuperAdmin } = useAdminAuth();
  const canVerifyPayment = isSuperAdmin || can("payment.receipt.verify");
  const canRejectPayment = isSuperAdmin || can("payment.receipt.reject");

  // Approval Form State
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Lightbox Modal State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setZoomLevel(1);

  const isPaid =
    order.payment_status === "paid" ||
    order.payment_details?.payment_status === "PAID";

  const totalAmount = Number(order.total_amount || 0);
  const rawPaid =
    order.paid_amount !== undefined && order.paid_amount !== null
      ? Number(order.paid_amount)
      : NaN;
  const paidAmount =
    !isNaN(rawPaid) && rawPaid > 0 ? rawPaid : isPaid ? totalAmount : 0;
  const rawBalance =
    order.balance_due !== undefined && order.balance_due !== null
      ? Number(order.balance_due)
      : NaN;
  const balanceDue = isPaid
    ? 0
    : !isNaN(rawBalance)
    ? rawBalance
    : Math.max(0, totalAmount - paidAmount);

  const receiptUrl = order.payment_proof_url || order.payment_details?.receipt_url;
  const hasProof = Boolean(receiptUrl);
  const isTerminal = ["cancelled", "refunded"].includes(order.status);
  const isUnderReview = !isPaid && hasProof && !isTerminal;

  // Form Fields Prefill
  const [paymentMethod, setPaymentMethod] = useState(
    order.payment_method || "bank_transfer"
  );
  const [transactionId, setTransactionId] = useState(
    order.payment_details?.transaction_id || ""
  );
  const [payerName, setPayerName] = useState(
    order.payment_details?.payer_name || order.shipping_name || order.user?.name || ""
  );
  const [bankName, setBankName] = useState(
    order.payment_details?.bank_name || "Pubali Bank Limited"
  );
  const [accountNumber, setAccountNumber] = useState(
    order.payment_details?.account_number || "0123456789"
  );
  const [paymentAmount, setPaymentAmount] = useState<number | string>(
    order.payment_details?.payment_amount || totalAmount
  );
  const [paymentDate, setPaymentDate] = useState(
    order.payment_details?.payment_date || new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState(
    order.payment_details?.notes || "Payment verified and order confirmed by accounts team."
  );

  // Authoritative Inventory Inspection
  const isDecremented =
    Boolean(order.payment_details?.inventory_decremented) ||
    (isPaid && ["processing", "confirmed", "shipped", "delivered"].includes(order.status));

  const stockItems = (order.items || []).map((item) => {
    const ordered = Number(item.quantity || 0);
    const available = item.current_stock !== undefined ? Number(item.current_stock) : null;
    const isConflict = available !== null && available < ordered;
    const shortfall = isConflict ? ordered - (available || 0) : 0;
    return {
      ...item,
      ordered,
      available,
      isConflict,
      shortfall,
    };
  });

  const hasStockConflict = !isDecremented && stockItems.some((i) => i.isConflict);

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onApprove({
      payment_method: paymentMethod,
      transaction_id: transactionId.trim(),
      payer_name: payerName.trim(),
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      payment_amount: Number(paymentAmount),
      payment_date: paymentDate,
      note: note.trim(),
    });
    setShowApprovalForm(false);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    await onReject(rejectReason.trim());
    setShowRejectBox(false);
  };

  const methodFormatted =
    order.payment_method === "pos_cash"
      ? "Cash in Hand (POS)"
      : order.payment_method === "mobile_banking"
      ? "Mobile Banking (bKash / Nagad)"
      : order.payment_method === "bank_transfer"
      ? "Direct Bank Wire (TT)"
      : order.payment_method === "net_30"
      ? "Net 30 Commercial Credit"
      : order.payment_method === "stripe" || order.payment_method === "card"
      ? "Credit / Debit Card (Online)"
      : order.payment_method
      ? order.payment_method.replace(/_/g, " ").toUpperCase()
      : "Not Specified";

  return (
    <div
      className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-6"
      id="admin-payment-inventory-section"
    >
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Payment Details &amp; Inventory Gate
            </h2>
            <p className="text-xs text-muted-foreground">
              Verification audit trail, receipt proof inspection, and warehouse stock allocation.
            </p>
          </div>
        </div>
        <PaymentStatusBadge status={order.payment_status} size="md" />
      </div>

      {/* 2. Compact Financial & Transaction Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Payment Method
          </span>
          <span className="font-bold text-foreground text-xs block truncate">
            {methodFormatted}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Reference / Trx ID
          </span>
          <span className="font-mono font-bold text-foreground text-xs block truncate">
            {order.payment_details?.transaction_id ||
              (order.payment_details as Record<string, unknown> | null | undefined)?.reference as string ||
              (isPaid ? "TRX-VERIFIED" : "Pending")}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Paid Amount
          </span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs block">
            ${paidAmount.toFixed(2)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Balance Due
          </span>
          <span
            className={`font-mono font-bold text-xs block ${
              balanceDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            }`}
          >
            ${balanceDue.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 3. Submitted Proof & Verification Result */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <FileCheck size={15} className="text-primary" />
            <span>Customer Proof &amp; Verification Status</span>
          </span>
          {isPaid && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Check size={12} />
              <span>Verified &amp; Paid</span>
            </span>
          )}
        </div>

        {/* State A: Payment Already Verified */}
        {isPaid ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                <CheckCircle2 size={16} />
                <span>Payment Verified and Approved</span>
              </div>
              {order.payment_details?.confirmed_at && (
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(order.payment_details.confirmed_at).toLocaleString()}
                </span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed text-[11px]">
              This order has been verified. Grand total of{" "}
              <strong className="text-foreground">
                ${totalAmount.toFixed(2)} {order.currency || "USD"}
              </strong>{" "}
              was marked as settled
              {order.payment_details?.confirmed_by_name
                ? ` by ${order.payment_details.confirmed_by_name}`
                : ""}
              .
            </p>

            {receiptUrl && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-card hover:bg-secondary text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                  id="btn-view-verified-receipt"
                >
                  <FileCheck size={13} />
                  <span>Inspect Verified Receipt Proof</span>
                </button>
              </div>
            )}
          </div>
        ) : isUnderReview ? (
          /* State B: Proof Uploaded, Awaiting Admin Approval */
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold uppercase text-sky-600 dark:text-sky-400">
                  <Clock size={16} />
                  <span>Customer Uploaded Payment Receipt — Action Required</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  The customer submitted proof of bank transfer. Review the attached document against bank accounts and confirm order to decrement warehouse stock.
                </p>
              </div>

              {receiptUrl && (
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                  id="btn-view-proof-lightbox"
                >
                  <ZoomIn size={13} className="text-primary" />
                  <span>Inspect Receipt</span>
                </button>
              )}
            </div>

            {/* Quick Action Buttons for Payment Proof */}
            {canVerifyPayment && !showApprovalForm && !showRejectBox && (
              <div className="flex items-center gap-2 pt-2 border-t border-sky-500/20">
                <button
                  type="button"
                  onClick={() => setShowApprovalForm(true)}
                  disabled={isLoading || hasStockConflict}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-wider text-xs hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-xs cursor-pointer"
                  id="btn-open-payment-approval-form"
                >
                  <CheckCircle2 size={14} />
                  <span>Approve &amp; Confirm Order</span>
                </button>

                {canRejectPayment && (
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(true)}
                    disabled={isLoading}
                    className="px-3.5 py-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
                    id="btn-open-reject-proof"
                  >
                    Reject Receipt
                  </button>
                )}
              </div>
            )}

            {/* Inline Approval Form */}
            {showApprovalForm && (
              <form
                onSubmit={handleApproveSubmit}
                className="p-4 rounded-2xl bg-card border border-border/80 space-y-3 pt-3 mt-2"
                id="form-approve-payment"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="font-bold uppercase text-foreground text-xs">
                    Confirm Payment Verification &amp; Stock Decrement
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowApprovalForm(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="bank_transfer">Direct Bank Wire (TT)</option>
                      <option value="mobile_banking">Mobile Banking (bKash / Nagad)</option>
                      <option value="pos_cash">Cash in Hand (POS)</option>
                      <option value="stripe">Credit / Debit Card</option>
                      <option value="net_30">Net 30 Commercial Credit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      Transaction / TT Ref <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. TT-984719-2026"
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      Payer Account / Name
                    </label>
                    <input
                      type="text"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="e.g. Export Consignee Co."
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Pubali Bank Ltd"
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 0123456789"
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      Verified Amount (USD) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                    Audit Verification Note
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Audit note for system event log..."
                    className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setShowApprovalForm(false)}
                    className="px-3 py-1.5 rounded-xl border border-border text-xs uppercase font-bold text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !transactionId.trim()}
                    className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 shadow-xs cursor-pointer"
                    id="btn-submit-approve-payment"
                  >
                    {isLoading ? "Verifying..." : "Confirm & Decrement Stock"}
                  </button>
                </div>
              </form>
            )}

            {/* Inline Rejection Box */}
            {showRejectBox && (
              <form
                onSubmit={handleRejectSubmit}
                className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 space-y-3 pt-3 mt-2"
                id="form-reject-payment"
              >
                <div className="flex items-center justify-between pb-2 border-b border-destructive/20">
                  <span className="font-bold uppercase text-destructive text-xs">
                    Reject Submitted Payment Proof
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                    Rejection Reason <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Specify why receipt was rejected (e.g., blurred slip, incorrect amount, missing stamp)..."
                    className="w-full px-3 py-2 rounded-xl border border-destructive/30 bg-background text-foreground text-xs outline-hidden focus:ring-1 focus:ring-destructive resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(false)}
                    className="px-3 py-1.5 rounded-xl border border-border text-xs uppercase font-bold text-muted-foreground"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !rejectReason.trim()}
                    className="px-4 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-xs"
                    id="btn-submit-reject-payment"
                  >
                    {isLoading ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* State C: Unpaid and No Receipt Uploaded Yet */
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold uppercase text-muted-foreground">
              <Clock size={15} />
              <span>Awaiting Customer Payment Proof</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Customer has not submitted wire transfer proof. Confirmation is gated by payment approval to prevent premature inventory decrement.
            </p>
          </div>
        )}
      </div>

      {/* 4. State-Aware Inventory Allocation & Decrement Gate */}
      <div
        className="p-4 rounded-2xl bg-secondary/20 border border-border/70 space-y-3 text-xs"
        id="admin-inventory-gate-section"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-foreground">
            <Building2 size={16} className="text-primary" />
            <span>
              {isDecremented
                ? "Warehouse Inventory Allocation (Fulfilled)"
                : "Pre-Approval Warehouse Stock Gate"}
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Facility: WH-UTTARA-01 (Export Center)
          </span>
        </div>

        {/* State 1: Decremented / Allocated (Fixes the critical 600 vs 300 inconsistency!) */}
        {isDecremented ? (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>✓ Inventory Allocated &amp; Decremented</span>
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed text-foreground/80">
              Ordered line items were atomically decremented from warehouse inventory upon payment verification. Current warehouse numbers below represent post-deduction available stock balance.
            </p>
          </div>
        ) : isPaid && !isDecremented ? (
          /* State 1B: State Inconsistency / Integrity Warning */
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase">
              <ShieldAlert size={15} className="shrink-0" />
              <span>Data Integrity Notice: Decrement Record Pending</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Order status is marked paid, but inventory decrement flag is not recorded. Please cross-reference warehouse ledger.
            </p>
          </div>
        ) : hasStockConflict ? (
          /* State 2: Unpaid with True Stock Conflict */
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
              <AlertTriangle size={15} className="shrink-0" />
              <span>Stock Conflict Detected — Confirmation Blocked</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-95">
              Required inventory is not currently available in warehouse WH-UTTARA-01. Payment approval will not decrement negative stock. Replenish inventory before confirming.
            </p>
          </div>
        ) : (
          /* State 3: Unpaid with Verified Stock Ready */
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={15} className="shrink-0" />
            <span className="font-bold">
              ✓ All required line items verified available in warehouse inventory.
            </span>
          </div>
        )}

        {/* Stock Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 px-2 whitespace-nowrap">Line Item</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">
                  {isDecremented ? "Allocated Qty" : "Required Qty"}
                </th>
                <th className="py-2 px-2 text-right whitespace-nowrap">
                  {isDecremented ? "Remaining WH Balance" : "Current WH Stock"}
                </th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {stockItems.map((item, idx) => {
                const isShort = !isDecremented && item.isConflict;
                return (
                  <tr key={item.id || idx} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-2 px-2">
                      <span className="font-bold text-foreground block truncate max-w-xs">
                        {item.product_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {item.variant_title || item.color || item.size || item.sku || "Standard Variant"}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-foreground">
                      {item.ordered} pcs
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {item.available !== null ? (
                        <span
                          className={
                            isShort
                              ? "text-destructive font-bold"
                              : "text-foreground font-medium"
                          }
                        >
                          {item.available} pcs
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-[11px]">
                      {isDecremented ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Check size={12} />
                          <span>Allocated</span>
                        </span>
                      ) : isShort ? (
                        <span className="text-destructive font-bold uppercase">
                          Short ({item.shortfall} pcs)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          Ready
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Lightbox Modal for Receipt Image */}
      {isLightboxOpen && receiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-primary" />
                <span className="font-bold text-sm uppercase text-foreground">
                  Payment Proof Inspection
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw size={14} />
                </button>
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-border text-primary hover:text-primary/80 cursor-pointer"
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer ml-2"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-secondary/30 min-h-[350px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptUrl}
                alt="Payment Receipt"
                style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
                className="max-h-[70vh] object-contain rounded-xl shadow-md cursor-grab"
              />
            </div>

            <div className="p-3 border-t border-border/50 bg-secondary/10 flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
              <span className="font-mono truncate max-w-xs">{receiptUrl}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
