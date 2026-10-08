"use client";

import React, { useState } from "react";
import { OrderRecord } from "@/services/order.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import PaymentStatusBadge from "./PaymentStatusBadge";
import {
  FileCheck,
  ExternalLink,
  Download,
  Lock,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  CreditCard,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
} from "lucide-react";

export interface PaymentVerificationDetails {
  payment_method: string;
  transaction_id: string;
  payer_name: string;
  bank_name: string;
  account_number: string;
  payment_amount: number;
  payment_date: string;
  note: string;
}

export interface PaymentProofReviewProps {
  order: OrderRecord;
  onApprove: (details: PaymentVerificationDetails) => Promise<void>;
  onReject: (note: string) => Promise<void>;
  isLoading?: boolean;
}

export default function PaymentProofReview({
  order,
  onApprove,
  onReject,
  isLoading = false,
}: PaymentProofReviewProps) {
  const { can, isSuperAdmin } = useAdminAuth();
  const canVerify = isSuperAdmin || can("payment.receipt.verify");
  const canReject = isSuperAdmin || can("payment.receipt.reject");
  const canViewReceipt = isSuperAdmin || can("payment.receipt.view");
  const canDownloadReceipt = isSuperAdmin || can("payment.receipt.download");

  // Extract latest payment submission if present
  const latestPayment = Array.isArray(order.payments) && order.payments.length > 0
    ? order.payments[order.payments.length - 1]
    : null;

  const receiptUrl = latestPayment?.receipt_url || order.payment_details?.receipt_url || order.payment_proof_url;
  const receiptOriginalName = latestPayment?.receipt_original_name || order.payment_details?.receipt_original_name || "Payment_Receipt";
  const receiptMimeType = latestPayment?.receipt_mime_type || "";
  const uploadDate = latestPayment?.submitted_at || latestPayment?.created_at || order.created_at;

  const isPdf = Boolean(
    receiptUrl?.toLowerCase().includes(".pdf") ||
    receiptOriginalName?.toLowerCase().endsWith(".pdf") ||
    receiptMimeType.includes("pdf")
  );

  // Form State for Admin Payment Verification
  const [paymentMethod, setPaymentMethod] = useState(
    latestPayment?.payment_method || order.payment_details?.payment_method || order.payment_method || "Bank Transfer"
  );
  const [transactionId, setTransactionId] = useState(
    () => latestPayment?.transaction_id || order.payment_details?.transaction_id || `TXN_${order.id || "SETTLEMENT"}`
  );
  const [payerName, setPayerName] = useState(
    latestPayment?.payer_name || order.payment_details?.payer_name || order.shipping_name || order.user?.name || "Customer"
  );
  const [bankName, setBankName] = useState(
    latestPayment?.bank_name || order.payment_details?.bank_name || "Pubali Bank Limited"
  );
  const [accountNumber, setAccountNumber] = useState(
    latestPayment?.account_number || order.payment_details?.account_number || "M/S AYAAN CLOTHING"
  );
  const [paymentAmount, setPaymentAmount] = useState<number>(
    Number(latestPayment?.amount ?? order.payment_details?.payment_amount ?? order.total_amount ?? 0)
  );
  const [paymentDate, setPaymentDate] = useState(
    latestPayment?.payment_date || order.payment_details?.payment_date || new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState(
    order.payment_details?.notes || latestPayment?.notes || "Payment verified against bank receipt credit."
  );

  // Rejection modal / inline state
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Lightbox modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setZoomLevel(1);

  const isPaid = order.payment_status === "paid" || order.payment_details?.payment_status === "PAID";

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
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    await onReject(rejectReason.trim());
    setShowRejectBox(false);
  };

  // Authoritative Inventory Inspection before approval
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
  const hasStockConflict = stockItems.some((i) => i.isConflict);

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-6" id="admin-payment-verification-section">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} className="text-primary" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Payment Verification & Inventory Decrement Gate
            </h2>
            <span className="text-[11px] text-muted-foreground block">
              Authoritative payment approval — decrements warehouse inventory upon confirmation
            </span>
          </div>
        </div>
        <PaymentStatusBadge status={order.payment_status} size="md" />
      </div>

      {/* Prominent Order & Payment Metadata Summary Header */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-2xl bg-secondary/20 border border-border/60 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Order Number</span>
          <span className="font-mono font-bold text-foreground text-xs">{order.order_number}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Customer</span>
          <span className="font-bold text-foreground truncate block" title={order.shipping_name || order.user?.name || "Customer"}>
            {order.shipping_name || order.user?.name || "Customer"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Order Date</span>
          <span className="font-mono text-foreground text-[11px]">
            {new Date(order.placed_at || order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Amount</span>
          <span className="font-mono font-black text-foreground text-xs">
            ${Number(order.total_amount || 0).toFixed(2)} {order.currency || "USD"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Payment Method</span>
          <span className="font-bold text-foreground truncate block">{order.payment_method || "Bank Transfer"}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Canonical Status</span>
          <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-[11px]">
            {order.customer_status || (isPaid ? "ORDER_CONFIRMED" : receiptUrl ? "WAITING_FOR_APPROVAL" : "PAYMENT_PENDING")}
          </span>
        </div>
      </div>

      {/* Authoritative Inventory Availability Pre-Approval Checklist */}
      <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-3 text-xs" id="admin-inventory-availability-check">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-primary" />
            <span className="font-bold uppercase tracking-wider text-foreground">
              Pre-Approval Inventory Availability Check
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Warehouse: WH-UTTARA-01 (Export Center)
          </span>
        </div>

        {hasStockConflict ? (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2.5 text-xs text-destructive">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-black uppercase tracking-wider">
                Stock Conflict Detected — Payment Confirmation Blocked
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Required inventory is no longer available in the warehouse. Payment approval will not decrement negative stock. Please replenish inventory or resolve quantities before confirming.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={15} className="shrink-0" />
            <span className="font-bold">
              ✓ All required order line items are verified available in warehouse stock.
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 px-2">Line Item</th>
                <th className="py-2 px-2 text-right">Required Qty</th>
                <th className="py-2 px-2 text-right">Current Available</th>
                <th className="py-2 px-2 text-right">Inventory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {stockItems.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-2 px-2">
                    <span className="font-bold text-foreground block truncate max-w-xs">{item.product_name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {item.variant_title || item.color || item.size || item.sku || "Standard Variant"}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-foreground">
                    {item.ordered} pcs
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    {item.available !== null ? (
                      <span className={item.isConflict ? "font-bold text-destructive" : "font-bold text-foreground"}>
                        {item.available} pcs
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Checked on decrement</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {item.isConflict ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-destructive/15 text-destructive border border-destructive/30">
                        <XCircle size={11} />
                        <span>Shortfall: {item.shortfall} pcs</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 size={11} />
                        <span>Available</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STATE A: ALREADY CONFIRMED & PAID */}
      {isPaid ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-sm uppercase">
              <CheckCircle2 size={18} />
              <span>✓ Payment Verified</span>
            </div>
            <p className="text-muted-foreground">
              Payment confirmed by{" "}
              <strong className="text-foreground">
                {order.payment_details?.confirmed_by_name || "Authorized Admin"}
              </strong>{" "}
              {order.payment_confirmed_at ? (
                <>on {new Date(order.payment_confirmed_at).toLocaleString()}</>
              ) : order.payment_details?.confirmed_at ? (
                <>on {new Date(order.payment_details.confirmed_at).toLocaleString()}</>
              ) : null}
              .
            </p>
          </div>

          {/* Confirmed Snapshot Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-2xl bg-secondary/30 border border-border/60 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Payment Status</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">PAID</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Payment Method</span>
              <span className="font-bold text-foreground">{order.payment_details?.payment_method || order.payment_method || "Bank Transfer"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Transaction ID</span>
              <span className="font-mono font-bold text-primary">{order.payment_details?.transaction_id || "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Payer / Remitter</span>
              <span className="font-bold text-foreground">{order.payment_details?.payer_name || order.shipping_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Bank Name</span>
              <span className="font-bold text-foreground">{order.payment_details?.bank_name || "Pubali Bank Limited"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Account / Ref</span>
              <span className="font-bold text-foreground">{order.payment_details?.account_number || "M/S AYAAN CLOTHING"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Payment Date</span>
              <span className="font-bold text-foreground">{order.payment_details?.payment_date || new Date().toISOString().split("T")[0]}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Amount Verified</span>
              <span className="font-mono font-black text-foreground text-sm">
                ${Number(order.payment_details?.payment_amount ?? order.total_amount).toFixed(2)} {order.currency || "USD"}
              </span>
            </div>
            {order.payment_details?.notes && (
              <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t border-border/40">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Audit Notes</span>
                <span className="text-muted-foreground italic">{order.payment_details.notes}</span>
              </div>
            )}
          </div>

          {/* Receipt Preview if available */}
          {receiptUrl && (
            <div className="pt-2 flex items-center justify-between text-xs border-t border-border/50">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-emerald-500" />
                <span className="text-muted-foreground font-medium">Customer Payment Receipt Attached</span>
                <span className="text-[11px] text-muted-foreground/80 font-mono">({receiptOriginalName})</span>
              </div>
              <div className="flex items-center gap-2">
                {canViewReceipt && (
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-bold uppercase text-[11px] tracking-wider transition-colors cursor-pointer"
                    id="btn-view-receipt-confirmed"
                  >
                    View Receipt
                  </button>
                )}
                {canDownloadReceipt && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={receiptOriginalName}
                    className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Download / Open Original"
                  >
                    <Download size={14} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STATE B: PENDING VERIFICATION */
        <div className="space-y-6">
          {/* 1. CUSTOMER PAYMENT RECEIPT */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Customer Payment Receipt</span>
            </h3>

            {receiptUrl ? (
              !canViewReceipt ? (
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border text-xs flex items-center gap-3">
                  <Lock size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    Customer payment receipt is attached ({receiptOriginalName}), but viewing is restricted. (Requires &apos;payment.receipt.view&apos; permission)
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-border bg-secondary/30 flex flex-col sm:flex-row items-center gap-4">
                  {/* Visual Thumbnail */}
                  {isPdf ? (
                    <div className="w-24 h-24 rounded-xl bg-destructive/10 border border-destructive/20 flex flex-col items-center justify-center text-destructive shrink-0">
                      <FileText size={28} />
                      <span className="text-[10px] font-bold mt-1 uppercase">PDF File</span>
                    </div>
                  ) : (
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="relative group block rounded-xl overflow-hidden border border-border bg-background shrink-0 w-24 h-24 cursor-pointer"
                    title="Click to zoom / inspect receipt"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptUrl}
                      alt="Customer Receipt Preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-foreground text-xs font-bold transition-opacity">
                      <ZoomIn size={18} />
                    </div>
                  </button>
                )}

                {/* Metadata & Actions */}
                <div className="flex-1 space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-foreground block truncate" title={receiptOriginalName}>
                      {receiptOriginalName}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Uploaded on: {uploadDate ? new Date(uploadDate).toLocaleString() : "Recent"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground font-bold uppercase text-[11px] tracking-wider transition-colors cursor-pointer"
                      id="btn-view-receipt-pending"
                    >
                      <ZoomIn size={12} />
                      <span>View Receipt</span>
                    </button>
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground font-bold uppercase text-[11px] tracking-wider transition-colors"
                    >
                      <ExternalLink size={12} />
                      <span>Open New Tab</span>
                    </a>
                    {canDownloadReceipt && (
                      <a
                        href={receiptUrl}
                        download={receiptOriginalName}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground font-bold uppercase text-[11px] tracking-wider transition-colors"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
              )
            ) : (
              /* NO PAYMENT RECEIPT UPLOADED */
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black uppercase text-xs">
                  <AlertTriangle size={16} />
                  <span>No Payment Receipt Uploaded</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  The customer has not yet uploaded a bank transfer slip or payment receipt for this order. Do not assume payment has been made simply because the order exists.
                </p>
              </div>
            )}
          </div>

          {/* 2. ADMIN PAYMENT DETAILS & CONFIRMATION FORM */}
          <form onSubmit={handleApproveSubmit} className="space-y-4 pt-2 border-t border-border/60">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Payment Verification Details
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Review and verify bank settlement parameters before confirming order payment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CreditCard size={11} />
                  <span>Payment Method</span>
                </label>
                <input
                  type="text"
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
                  id="input-verify-payment-method"
                />
              </div>

              {/* Transaction ID */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <FileText size={11} />
                  <span>Transaction ID / Ref</span>
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/30 font-mono text-foreground font-bold outline-none focus:ring-1 focus:ring-primary"
                  id="input-verify-transaction-id"
                />
              </div>

              {/* Payer / Remitter Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <User size={11} />
                  <span>Payer / Account Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
                  id="input-verify-payer-name"
                />
              </div>

              {/* Bank Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Building2 size={11} />
                  <span>Bank Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
                  id="input-verify-bank-name"
                />
              </div>

              {/* Account Number / Beneficiary Ref */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Building2 size={11} />
                  <span>Account / Beneficiary Ref</span>
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
                  id="input-verify-account-number"
                />
              </div>

              {/* Payment Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <DollarSign size={11} />
                  <span>Payment Amount ({order.currency || "USD"})</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/30 font-mono font-bold text-foreground outline-none focus:ring-1 focus:ring-primary"
                  id="input-verify-payment-amount"
                />
              </div>

              {/* Payment Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar size={11} />
                  <span>Payment Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
                  id="input-verify-payment-date"
                />
              </div>

              {/* Verification Notes */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Verification Notes / Bank Audit Log
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Verified against Pubali Bank TT credit."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
                  id="input-verify-notes"
                />
              </div>
            </div>

            {/* Confirmation Controls */}
            <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {canVerify ? (
                  <button
                    type="submit"
                    disabled={isLoading || hasStockConflict}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider transition-colors shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    id="btn-confirm-payment-order"
                    title={hasStockConflict ? "Cannot approve: Stock conflict detected" : "Approve payment and decrement inventory"}
                  >
                    <CheckCircle2 size={16} />
                    <span>{isLoading ? "Processing..." : hasStockConflict ? "Stock Conflict — Approval Locked" : "Confirm Payment & Order"}</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary/50 border border-border text-muted-foreground text-xs font-medium">
                    <Lock size={13} className="text-amber-500" />
                    <span>Verification requires <code className="font-mono text-foreground">payment.receipt.verify</code></span>
                  </div>
                )}

                {canReject && (
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(!showRejectBox)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer"
                    id="btn-toggle-reject-box"
                  >
                    <XCircle size={15} />
                    <span>Reject Payment</span>
                  </button>
                )}
              </div>

              <span className="text-[11px] text-muted-foreground italic">
                Rule: Order is marked PAID strictly after admin confirmation.
              </span>
            </div>
          </form>

          {/* Inline Rejection Box */}
          {showRejectBox && (
            <form onSubmit={handleRejectSubmit} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-3 animate-in fade-in-0">
              <div className="flex items-center justify-between">
                <span className="font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <XCircle size={15} />
                  <span>Reject Submitted Payment Proof</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                required
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify rejection reason (e.g. illegible slip, amount discrepancy, uncredited wire)..."
                className="w-full px-3 py-2 rounded-xl border border-rose-500/30 bg-background text-foreground outline-none focus:ring-1 focus:ring-rose-500"
                id="input-reject-reason"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground text-[11px] uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !rejectReason.trim()}
                  className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-bold uppercase text-[11px] tracking-wider hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
                  id="btn-submit-payment-rejection"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 3. INTERACTIVE RECEIPT LIGHTBOX MODAL */}
      {isLightboxOpen && receiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in-0"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between pb-3 mb-2 border-b border-border/80 text-xs">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-primary" />
              <span className="font-bold text-foreground truncate max-w-md">
                {receiptOriginalName}
              </span>
            </div>

            {/* Lightbox Controls */}
            <div className="flex items-center gap-2">
              {!isPdf && (
                <>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground"
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="font-mono text-muted-foreground text-[11px] px-1">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground"
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomReset}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground"
                    title="Reset Zoom"
                  >
                    <RotateCcw size={16} />
                  </button>
                </>
              )}
              {canDownloadReceipt && (
                <a
                  href={receiptUrl}
                  download={receiptOriginalName}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground"
                  title="Download Receipt"
                >
                  <Download size={16} />
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsLightboxOpen(false);
                  setZoomLevel(1);
                }}
                className="p-1.5 rounded-lg bg-secondary hover:bg-destructive hover:text-white transition-colors text-foreground cursor-pointer"
                title="Close Lightbox"
                id="btn-close-receipt-lightbox"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Lightbox Content Viewer */}
          <div className="w-full max-w-4xl max-h-[80vh] overflow-auto rounded-2xl border border-border bg-secondary/30 flex items-center justify-center p-4">
            {isPdf ? (
              <iframe
                src={receiptUrl}
                title="PDF Receipt Viewer"
                className="w-full h-[70vh] rounded-xl border border-border"
              />
            ) : (
              <div className="transition-transform duration-200 ease-out" style={{ transform: `scale(${zoomLevel})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptUrl}
                  alt="Customer Payment Receipt"
                  className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
