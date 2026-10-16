"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminRfqService, isRfqApproved } from "@/services/admin/rfq.service";
import { RfqRecord } from "@/types/b2b";
import RfqStatusBadge, { isRfqRejected } from "@/components/admin/rfq/RfqStatusBadge";
import RfqShippingCard from "@/components/admin/rfq/RfqShippingCard";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { 
  ArrowLeft, 
  RefreshCw, 
  Package, 
  CheckCircle2, 
  Clock, 
  User, 
  Building, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  AlertTriangle,
  Image as ImageIcon,
  FileText,
  DollarSign,
  ShieldCheck,
  Trash2,
  XCircle
} from "lucide-react";

export default function AdminRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAdminAuth();

  // Core Data State
  const [rfq, setRfq] = useState<RfqRecord | null>(null);

  // Approval Note Input State (preserved on failure or editing)
  const [approvalNoteInput, setApprovalNoteInput] = useState<string>("");

  // Modal & Action State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  // UX & Loading State
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error", message: string) => {
    const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
  };

  const removeToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  // Load RFQ details
  const loadData = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setLoading(true);
    setError(null);

    try {
      const rfqData = await adminRfqService.getRfqById(id);
      if (!rfqData) {
        setError("RFQ not found or has been removed.");
        return;
      }
      setRfq(rfqData);

      // If RFQ is already approved, pre-populate or display existing note
      if (rfqData.approvalNote && !approvalNoteInput) {
        setApprovalNoteInput(rfqData.approvalNote);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load RFQ details.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id, approvalNoteInput]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    addToast("success", "RFQ details refreshed.");
  };

  // Approve RFQ Action (RFQ Pending -> RFQ Approved)
  const handleApproveRfq = async () => {
    if (!rfq) return;

    if (!can("rfq.update_status")) {
      addToast("error", "You do not have permission to approve RFQs.");
      return;
    }

    setActionLoading(true);
    try {
      const noteToSend = approvalNoteInput.trim() || undefined;
      const updated = await adminRfqService.approveRfq(rfq.id, noteToSend);
      setRfq(updated);
      addToast("success", "RFQ approved successfully.");
    } catch (err: unknown) {
      // Do not discard entered note if validation fails
      addToast("error", (err as Error)?.message || "Failed to approve RFQ.");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject RFQ Action (RFQ Pending/Approved -> RFQ Rejected)
  const handleRejectRfq = async () => {
    if (!rfq) return;

    if (!can("rfq.update_status")) {
      addToast("error", "You do not have permission to reject RFQs.");
      return;
    }

    setActionLoading(true);
    try {
      const noteToSend = rejectReasonInput.trim() || approvalNoteInput.trim() || "RFQ rejected by administration";
      const updated = await adminRfqService.rejectRfq(rfq.id, noteToSend);
      setRfq(updated);
      setShowRejectModal(false);
      setRejectReasonInput("");
      addToast("success", "RFQ has been rejected.");
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to reject RFQ.");
    } finally {
      setActionLoading(false);
    }
  };

  // Permanently Delete RFQ Action
  const handleDeleteRfq = async () => {
    if (!rfq) return;

    setDeleteLoading(true);
    try {
      await adminRfqService.deleteRfq(rfq.id);
      addToast("success", `RFQ ${rfq.rfqNumber} permanently deleted.`);
      setShowDeleteModal(false);
      setTimeout(() => {
        router.push("/ayc/rfq");
      }, 400);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to delete RFQ.");
      setDeleteLoading(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs text-muted-foreground font-medium">
          Loading RFQ details...
        </span>
      </div>
    );
  }

  // Not Found / Error State
  if (error || !rfq) {
    return (
      <div className="p-8 bg-card border border-destructive/30 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
        <AlertTriangle size={36} className="text-destructive mx-auto" />
        <h2 className="text-lg font-bold uppercase text-foreground">RFQ Not Found</h2>
        <p className="text-xs text-muted-foreground">
          {error || "Could not retrieve the requested RFQ record."}
        </p>
        <Link
          href="/ayc/rfq"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Back to RFQs</span>
        </Link>
      </div>
    );
  }

  const isApproved = isRfqApproved(rfq.status);
  const isRejected = isRfqRejected(rfq.status);

  const createdDate = rfq.createdAt
    ? new Date(rfq.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const approvedDate = rfq.approvedAt || (isApproved ? rfq.updatedAt : null);
  const formattedApprovedDate = approvedDate
    ? new Date(approvedDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Computed summary metrics
  const totalUnits = (rfq.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
  const targetSubtotal = (rfq.items || []).reduce((sum, it) => {
    const unitPrice = Number(it.targetPrice ?? it.unitPrice ?? 0);
    return sum + unitPrice * (it.quantity || 0);
  }, 0);

  return (
    <AdminPageGate permission="rfq.view" moduleName="RFQ Details">
      <div className="space-y-8 w-full max-w-full">
        {/* 1. Header with RFQ Number, Status, and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
          <div className="space-y-1">
            <Link
              href="/ayc/rfq"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ArrowLeft size={14} />
              <span>Back to RFQs</span>
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
                {rfq.rfqNumber}
              </h1>
              <RfqStatusBadge status={rfq.status} />
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Submitted on {createdDate} • ID: {rfq.id}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="Refresh details"
              id="btn-refresh-rfq-detail"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-primary" : ""} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={actionLoading || deleteLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="Permanently delete RFQ"
              id="btn-delete-rfq-header"
            >
              <Trash2 size={14} />
              <span>Delete RFQ</span>
            </button>
          </div>
        </div>

        {/* 2. Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT COLUMN (2 Cols on lg): Requested Items & Buyer Inquiries */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Requested Products & Package Assortment */}
            <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Package size={16} className="text-primary" />
                  <span>Requested Line Items ({rfq.items?.length || 0})</span>
                </h2>
                <span className="text-xs font-mono text-muted-foreground">
                  {totalUnits.toLocaleString()} units total
                </span>
              </div>

              <div className="divide-y divide-border/60">
                {(rfq.items || []).map((item, idx) => {
                  let breakdown: Array<{ size: string; quantity: number }> | null = null;
                  if (item.package_breakdown) {
                    try {
                      breakdown =
                        typeof item.package_breakdown === "string"
                          ? JSON.parse(item.package_breakdown)
                          : item.package_breakdown;
                    } catch {
                      breakdown = null;
                    }
                  }

                  const targetPrice = Number(item.targetPrice ?? item.unitPrice ?? 0);
                  const lineTotal = targetPrice * (item.quantity || 0);

                  return (
                    <div key={item.id || `item-${idx}`} className="py-4 flex items-start sm:items-center gap-4 text-xs">
                      {/* Thumbnail Image — Canonical 3:4 */}
                      <div className="w-14 aspect-[3/4] rounded-xl bg-secondary shrink-0 border border-border/50 overflow-hidden flex items-center justify-center relative">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="w-full h-full object-contain p-0.5"
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon size={18} className="text-muted-foreground/50" />
                        )}
                      </div>

                      {/* Product Details & Package Assortment */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="font-bold text-foreground block truncate text-sm">
                          {item.productName}
                        </span>

                        <div className="flex items-center gap-2 flex-wrap text-muted-foreground font-mono text-[11px]">
                          <span>SKU: {item.sku || "—"}</span>
                          {item.selectedSize && <span>• Size: {item.selectedSize}</span>}
                          {item.selectedColor && <span>• Color: {item.selectedColor}</span>}
                          {item.brand && <span>• Brand: {item.brand}</span>}
                        </div>

                        {/* Wholesale Package Assortment / Size Matrix */}
                        {Array.isArray(breakdown) && breakdown.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                            <span className="text-muted-foreground font-bold uppercase">Size Matrix:</span>
                            {breakdown.map((bd, bIdx) => (
                              <span
                                key={bIdx}
                                className="bg-secondary/80 px-1.5 py-0.5 rounded border border-border/60 font-mono text-muted-foreground"
                              >
                                {bd.size}: <strong className="text-foreground">{bd.quantity}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-muted-foreground font-mono text-xs pt-0.5">
                          Target: ${targetPrice.toFixed(2)} × {item.quantity} units = <span className="font-bold text-foreground">${lineTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-foreground text-sm block">
                          {item.quantity.toLocaleString()} pcs
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Shipping & Destination Requirements */}
            <RfqShippingCard rfq={rfq} />

            {/* Section 3: Buyer Inquiries & Request Notes */}
            {rfq.requestTitle && !rfq.generalNotes && (
              <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-3">
                <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span>Buyer Inquiries & Requirements</span>
                  </h2>
                </div>

                <div className="text-xs">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider block text-[11px]">
                    Request Title
                  </span>
                  <span className="font-medium text-foreground block mt-0.5">
                    {rfq.requestTitle}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (1 Col on lg): RFQ Workflow Panel, Customer Info, Target Summary */}
          <div className="space-y-6">
            {/* Section 4: RFQ Workflow Panel (Pending, Approved, Rejected) */}
            <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" />
                  <span>RFQ Workflow</span>
                </h2>
                <RfqStatusBadge status={rfq.status} size="sm" />
              </div>

              {isRejected ? (
                /* ── REJECTED STATE ── */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                      <XCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>RFQ Rejected</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-400">
                      This quotation inquiry has been declined by administration.
                    </p>
                  </div>

                  {/* Recorded Rejection / Note */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-foreground">
                      Rejection Reason / Note
                    </span>
                    <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 text-xs text-foreground italic leading-relaxed whitespace-pre-wrap">
                      &ldquo;{rfq.approvalNote || approvalNoteInput || "No rejection note recorded."}&rdquo;
                    </div>
                  </div>

                  {/* Re-open / Approve Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApproveRfq}
                      disabled={actionLoading || !can("rfq.update_status")}
                      className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm text-center flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      id="btn-reapprove-rfq"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Approving RFQ...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Re-evaluate & Approve RFQ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : isApproved ? (
                /* ── APPROVED STATE ── */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>RFQ Approved</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                      This RFQ has been reviewed and approved by administration.
                    </p>
                  </div>

                  {/* Approval Metadata */}
                  <div className="space-y-2 p-3 rounded-2xl bg-secondary/30 border border-border/60 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span className="uppercase font-bold tracking-wider">Approved Date</span>
                      <span className="font-mono text-foreground font-medium">
                        {formattedApprovedDate || createdDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span className="uppercase font-bold tracking-wider">Approved By</span>
                      <span className="font-medium text-foreground">
                        {rfq.approvedBy || "Administrator"}
                      </span>
                    </div>
                  </div>

                  {/* Display Saved Approval Note */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-foreground">
                      Approval Note
                    </span>
                    {rfq.approvalNote || approvalNoteInput ? (
                      <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 text-xs text-foreground italic leading-relaxed whitespace-pre-wrap">
                        &ldquo;{rfq.approvalNote || approvalNoteInput}&rdquo;
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-secondary/20 border border-border/40 text-xs text-muted-foreground italic">
                        No approval note was recorded.
                      </div>
                    )}
                  </div>

                  {/* Reject RFQ Button if re-evaluating */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading || !can("rfq.update_status")}
                      className="w-full py-2.5 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-50"
                      id="btn-reject-rfq-approved"
                    >
                      <XCircle size={14} />
                      <span>Reject This RFQ</span>
                    </button>
                  </div>

                  {/* Context Note: RFQ Separation from Commercial Orders */}
                  <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                    Formal commercial quotations, Proforma Invoices, and confirmed orders are processed independently in the Quotations and Orders modules.
                  </div>
                </div>
              ) : (
                /* ── PENDING STATE ── */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                      <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>RFQ Pending Review</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                      This inquiry is awaiting administrative approval. Review requested quantities and target specifications before approving.
                    </p>
                  </div>

                  {/* Approval / Rejection Note Input Field */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-approval-note"
                      className="block text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Approval Note
                    </label>
                    <textarea
                      id="input-approval-note"
                      rows={3}
                      value={approvalNoteInput}
                      onChange={(e) => setApprovalNoteInput(e.target.value)}
                      placeholder="Add an optional note about this RFQ approval..."
                      className="w-full p-3 text-xs rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Optional note stored with approval/rejection audit records.
                    </p>
                  </div>

                  {/* Dual Action Buttons: Approve (Primary) & Reject (Secondary) */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleApproveRfq}
                      disabled={actionLoading || !can("rfq.update_status")}
                      className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm text-center flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      id="btn-approve-rfq"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Approving RFQ...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Approve RFQ</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading || !can("rfq.update_status")}
                      className="w-full py-2 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-50"
                      id="btn-reject-rfq"
                    >
                      <XCircle size={14} />
                      <span>Reject RFQ</span>
                    </button>

                    {!can("rfq.update_status") && (
                      <p className="text-[10px] text-destructive text-center mt-1">
                        You do not have permission to update RFQ status.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Customer Information Card */}
            <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <User size={16} className="text-primary" />
                  <span>Customer Information</span>
                </h2>
                {rfq.userId && (
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/50">
                    ID: {rfq.userId}
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider">
                    Contact Name
                  </span>
                  <span className="font-bold text-foreground text-sm block mt-0.5">
                    {rfq.buyerName || "Guest Buyer"}
                  </span>
                </div>

                {rfq.companyName && (
                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Building size={12} />
                      <span>Company / Organization</span>
                    </span>
                    <span className="font-medium text-foreground block mt-0.5">
                      {rfq.companyName}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <Mail size={12} />
                    <span>Email Address</span>
                  </span>
                  <a
                    href={`mailto:${rfq.buyerEmail}`}
                    className="text-foreground hover:text-primary transition-colors block mt-0.5 font-mono"
                  >
                    {rfq.buyerEmail}
                  </a>
                </div>

                {rfq.buyerPhone && (
                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Phone size={12} />
                      <span>Phone Number</span>
                    </span>
                    <span className="font-mono text-foreground block mt-0.5">
                      {rfq.buyerPhone}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <Globe size={12} />
                    <span>Destination</span>
                  </span>
                  <span className="text-foreground block mt-0.5">
                    {[rfq.destinationCity, rfq.destinationCountry].filter(Boolean).join(", ") || "Global"}
                  </span>
                </div>

                {rfq.targetDeliveryDate && (
                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Calendar size={12} />
                      <span>Target Delivery</span>
                    </span>
                    <span className="text-foreground block mt-0.5 font-mono">
                      {new Date(rfq.targetDeliveryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Target Value Summary Card */}
            <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2 pb-3 border-b border-border/60">
                <DollarSign size={16} className="text-primary" />
                <span>Target Value Summary</span>
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Line Items</span>
                  <span className="font-mono font-bold text-foreground">
                    {rfq.items?.length || 0}
                  </span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Total Quantity</span>
                  <span className="font-mono font-bold text-foreground">
                    {totalUnits.toLocaleString()} pcs
                  </span>
                </div>

                <div className="pt-2 border-t border-border/60 flex justify-between text-sm">
                  <span className="font-bold text-foreground">Estimated Target Total</span>
                  <span className="font-mono font-bold text-foreground text-base">
                    ${targetSubtotal.toFixed(2)} USD
                  </span>
                </div>

                <div className="pt-2 text-[10px] text-muted-foreground leading-normal border-t border-border/40">
                  Values represent buyer requested targets. Commercial quotations and confirmed orders are created separately.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-card border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold uppercase tracking-tight text-foreground">
                    Permanently Delete RFQ?
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {rfq.rfqNumber}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete this quotation inquiry? All associated line items, specifications, and history records will be permanently removed. <strong className="text-foreground">This action cannot be undone.</strong>
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRfq}
                  disabled={deleteLoading}
                  className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  id="btn-confirm-delete-rfq"
                >
                  {deleteLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Confirmation Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-card border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <XCircle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold uppercase tracking-tight text-foreground">
                    Reject Quotation Request
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {rfq.rfqNumber}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Please provide an optional reason or note explaining why this quotation request is being rejected. This note will be recorded in the RFQ audit history.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Rejection Reason / Note
                </label>
                <textarea
                  rows={3}
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="e.g. MOQ requirements not met, destination port unsupported, or requested garments unavailable..."
                  className="w-full p-3 text-xs rounded-2xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-rose-500 outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectRfq}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  id="btn-confirm-reject-rfq"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={13} />
                      <span>Reject RFQ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Alerts */}
        <ProductToast toasts={toasts} onDismiss={removeToast} />
      </div>
    </AdminPageGate>
  );
}
