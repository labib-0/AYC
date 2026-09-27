"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminRfqService } from "@/services/admin/rfq.service";
import { RfqRecord, QuotationRecord } from "@/types/b2b";
import RfqStatusBadge from "@/components/admin/rfq/RfqStatusBadge";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { 
  ArrowLeft, 
  RefreshCw, 
  Package, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  Lock, 
  Unlock, 
  ExternalLink, 
  User, 
  Building, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  AlertTriangle,
  Clock,
  FileCheck,
  ChevronRight,
  Image as ImageIcon
} from "lucide-react";

export default function AdminRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Core Data State
  const [rfq, setRfq] = useState<RfqRecord | null>(null);
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);

  // UX & Loading State
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Quotation Editor State (for custom unit prices and manual shipping fee)
  const [quotedPrices, setQuotedPrices] = useState<Record<string, number>>({});
  const [quotedQuantities, setQuotedQuantities] = useState<Record<string, number>>({});
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState<string>("");

  const addToast = (type: "success" | "error", message: string) => {
    const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
  };

  const removeToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  // Load RFQ and linked Quotation
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

      // Attempt to load associated quotation if quotationId exists or check backend
      if (rfqData.quotationId) {
        try {
          const { getStoredQuotations } = await import("@/lib/services/quotations");
          const { apiClient } = await import("@/services/api-client");
          let qRecord: QuotationRecord | null = null;
          try {
            const res = await apiClient.get<any>(`/admin/quotations/${rfqData.quotationId}`);
            qRecord = res?.data || res;
          } catch {
            const allQuotes = getStoredQuotations();
            qRecord = allQuotes.find(
              (q) => q.id === rfqData.quotationId || q.quotationNumber === rfqData.quotationId
            ) || null;
          }

          if (qRecord) {
            setQuotation(qRecord);
            setShippingFee(Number(qRecord.shippingFee || 0));
            const initialPrices: Record<string, number> = {};
            const initialQtys: Record<string, number> = {};
            (qRecord.items || []).forEach((it) => {
              initialPrices[it.productId || it.id] = Number(it.unitPrice || 0);
              initialQtys[it.productId || it.id] = Number(it.quantity || 1);
            });
            setQuotedPrices(initialPrices);
            setQuotedQuantities(initialQtys);
          }
        } catch (qErr) {
          console.warn("Could not load quotation details:", qErr);
        }
      } else {
        // Initialize default quotation form values from RFQ items
        const initialPrices: Record<string, number> = {};
        const initialQtys: Record<string, number> = {};
        (rfqData.items || []).forEach((it) => {
          initialPrices[it.productId || it.id] = Number(it.targetPrice || it.unitPrice || 0);
          initialQtys[it.productId || it.id] = Number(it.quantity || 1);
        });
        setQuotedPrices(initialPrices);
        setQuotedQuantities(initialQtys);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load RFQ details.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    addToast("success", "RFQ details refreshed.");
  };

  // Workflow Action 1: Review RFQ (SUBMITTED -> UNDER_REVIEW)
  const handleReviewRfq = async () => {
    if (!rfq) return;
    setActionLoading(true);
    try {
      const updated = await adminRfqService.reviewRfq(rfq.id);
      setRfq(updated);
      addToast("success", "RFQ status updated to UNDER REVIEW.");
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Unable to update RFQ to review status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Workflow Action 2: Approve RFQ (UNDER_REVIEW -> APPROVED)
  const handleApproveRfq = async () => {
    if (!rfq) return;
    setActionLoading(true);
    try {
      const updated = await adminRfqService.approveRfq(rfq.id);
      setRfq(updated);
      addToast("success", "RFQ has been APPROVED. You may now generate a formal quotation.");
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Unable to approve RFQ.");
    } finally {
      setActionLoading(false);
    }
  };

  // Workflow Action 3: Generate Quotation
  const handleGenerateQuotation = async () => {
    if (!rfq) return;
    setActionLoading(true);
    try {
      const itemsPayload = (rfq.items || []).map((it) => {
        const itemKey = it.productId || it.id;
        const customPrice = quotedPrices[itemKey] !== undefined ? quotedPrices[itemKey] : Number(it.unitPrice || 0);
        const qty = quotedQuantities[itemKey] !== undefined ? quotedQuantities[itemKey] : Number(it.quantity || 1);
        return {
          product_id: it.productId,
          product_name: it.productName,
          sku: it.sku,
          quantity: qty,
          unit_price: customPrice,
          package_breakdown: it.package_breakdown,
        };
      });

      const newQuote = await adminRfqService.createQuotation({
        rfq_id: rfq.id,
        buyer_name: rfq.buyerName,
        buyer_email: rfq.buyerEmail,
        buyer_phone: rfq.buyerPhone,
        company_name: rfq.companyName,
        destination_country: rfq.destinationCountry,
        destination_city: rfq.destinationCity,
        shipping_fee: Number(shippingFee || 0),
        admin_notes: adminNotes || undefined,
        items: itemsPayload,
      });

      setQuotation(newQuote);
      await loadData(true);
      addToast("success", `Quotation #${newQuote.quotationNumber || newQuote.id} generated successfully.`);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to generate quotation.");
    } finally {
      setActionLoading(false);
    }
  };

  // Workflow Action 4: Approve Quotation (Snapshots values, generates PI)
  const handleApproveQuotation = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      const approved = await adminRfqService.approveQuotation(quotation.id);
      setQuotation(approved);
      await loadData(true);
      addToast("success", "Quotation APPROVED! Commercial values snapshotted. Proforma Invoice & Offer Sheet are now available.");
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to approve quotation.");
    } finally {
      setActionLoading(false);
    }
  };

  // Workflow Action 5: Mark Payment as Paid (PENDING -> PAID)
  const handleMarkPaymentPaid = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      const updated = await adminRfqService.updatePaymentStatus(quotation.id, "PAID");
      setQuotation(updated);
      await loadData(true);
      addToast("success", "Payment marked as PAID. Commercial Invoice generation is now unlocked!");
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to mark payment as paid.");
    } finally {
      setActionLoading(false);
    }
  };

  // Computed Quotation Values
  const lineSubtotal = (rfq?.items || []).reduce((sum, it) => {
    const itemKey = it.productId || it.id;
    const price = quotedPrices[itemKey] !== undefined ? quotedPrices[itemKey] : Number(it.unitPrice || 0);
    const qty = quotedQuantities[itemKey] !== undefined ? quotedQuantities[itemKey] : Number(it.quantity || 1);
    return sum + price * qty;
  }, 0);

  const grandTotal = lineSubtotal + Number(shippingFee || 0);

  // Workflow stage resolution
  const statusStr = (rfq?.status || "").toUpperCase();
  const quoteStatusStr = (quotation?.status || "").toUpperCase();
  const isQuoteApproved =
    statusStr === "QUOTATION_APPROVED" ||
    statusStr === "PAID" ||
    quoteStatusStr === "APPROVED" ||
    quoteStatusStr === "ACCEPTED" ||
    quoteStatusStr === "PAID";
  const isPaid = statusStr === "PAID" || quoteStatusStr === "PAID";

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
          href="/admin/rfq"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Back to RFQs</span>
        </Link>
      </div>
    );
  }

  const createdDate = rfq.createdAt
    ? new Date(rfq.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <AdminPageGate permission="rfq.view" moduleName="RFQ Details">
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* 1. Header matching OrderDetailHeader */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
          <div className="space-y-1">
            <Link
              href="/admin/rfq"
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
          </div>
        </div>

        {/* 2. Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT COLUMN (2 Cols on lg): Items, Quotation Editor/Snapshot, Documents */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Requested Products & Existing Package Breakdown */}
            <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Package size={16} className="text-primary" />
                  <span>Requested Line Items ({rfq.items?.length || 0})</span>
                </h2>
                <span className="text-xs font-mono text-muted-foreground">
                  {(rfq.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0).toLocaleString()} units total
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

                      {/* Product Details & Package Breakdown */}
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

                        {/* Wholesale Package Breakdown / Size Matrix */}
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
                          Target: ${Number(item.targetPrice || item.unitPrice || 0).toFixed(2)} × {item.quantity} units
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

            {/* Section 2: Quotation Generation & Authoritative Value Authority */}
            {(statusStr === "APPROVED" || statusStr === "QUOTATION_GENERATED" || isQuoteApproved) && (
              <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <DollarSign size={16} className="text-primary" />
                      <span>Commercial Quotation Values</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isQuoteApproved
                        ? "Authoritative quotation values are locked and snapshotted."
                        : "Define custom Admin unit prices and manual shipping fee."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isQuoteApproved ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                        <Lock size={12} />
                        <span>Snapshot Locked</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                        <Unlock size={12} />
                        <span>Editable</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Line Items Pricing Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-secondary/20 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Custom Unit Price ($)</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(rfq.items || []).map((it) => {
                        const itemKey = it.productId || it.id;
                        const currentPrice =
                          quotedPrices[itemKey] !== undefined
                            ? quotedPrices[itemKey]
                            : Number(it.targetPrice || it.unitPrice || 0);
                        const currentQty =
                          quotedQuantities[itemKey] !== undefined
                            ? quotedQuantities[itemKey]
                            : Number(it.quantity || 1);
                        const itemLineTotal = currentPrice * currentQty;

                        return (
                          <tr key={itemKey}>
                            <td className="py-3 px-3">
                              <span className="font-bold text-foreground block">{it.productName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{it.sku}</span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {isQuoteApproved ? (
                                <span className="font-mono font-bold text-foreground">{currentQty} pcs</span>
                              ) : (
                                <input
                                  type="number"
                                  min={1}
                                  value={currentQty}
                                  onChange={(e) =>
                                    setQuotedQuantities({
                                      ...quotedQuantities,
                                      [itemKey]: Math.max(1, Number(e.target.value) || 1),
                                    })
                                  }
                                  className="w-20 px-2 py-1 text-right text-xs font-mono font-bold rounded-lg border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                                />
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {isQuoteApproved ? (
                                <span className="font-mono font-bold text-foreground">
                                  ${currentPrice.toFixed(2)}
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1 justify-end">
                                  <span className="text-muted-foreground font-mono">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={currentPrice}
                                    onChange={(e) =>
                                      setQuotedPrices({
                                        ...quotedPrices,
                                        [itemKey]: Math.max(0, Number(e.target.value) || 0),
                                      })
                                    }
                                    className="w-24 px-2 py-1 text-right text-xs font-mono font-bold rounded-lg border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                                    placeholder="3.85"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                              ${itemLineTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Section 9: Manual Shipping Fee Field */}
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-foreground block">
                      Manual Shipping Fee
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Admin manually defines the authoritative freight charge.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-foreground">$</span>
                    {isQuoteApproved ? (
                      <span className="text-sm font-mono font-bold text-foreground">
                        {Number(shippingFee || 0).toFixed(2)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={shippingFee}
                        onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value) || 0))}
                        className="w-28 px-3 py-1.5 text-right text-xs font-mono font-bold rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                        placeholder="75.00"
                        id="input-shipping-fee"
                      />
                    )}
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">USD</span>
                  </div>
                </div>

                {/* Quotation Totals Calculation */}
                <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 text-muted-foreground">
                    <div>Product Subtotal: <strong className="font-mono text-foreground">${lineSubtotal.toFixed(2)}</strong></div>
                    <div>Manual Shipping Fee: <strong className="font-mono text-foreground">${Number(shippingFee || 0).toFixed(2)}</strong></div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Authoritative Quotation Total
                    </span>
                    <span className="text-xl sm:text-2xl font-display font-bold text-foreground font-mono">
                      ${grandTotal.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Quotation Action Buttons */}
                {!isQuoteApproved && (
                  <div className="pt-3 border-t border-border/50 flex items-center justify-end gap-3">
                    {!quotation ? (
                      <button
                        type="button"
                        onClick={handleGenerateQuotation}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                        id="btn-generate-quotation"
                      >
                        <FileCheck size={14} />
                        <span>Generate Quotation</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApproveQuotation}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                        id="btn-approve-quotation"
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve Quotation</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Commercial Documents & Payment Gate */}
            {isQuoteApproved && (
              <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-6">
                <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span>Commercial Documents</span>
                  </h2>
                  <span className="text-xs font-mono text-muted-foreground">
                    PI #{quotation?.proformaInvoiceId || `PI-${quotation?.quotationNumber || rfq.id}`}
                  </span>
                </div>

                {/* Approved Documents: PI & Offer Sheet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-border/80 bg-secondary/20 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                      Proforma Invoice (PI)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Authoritative commercial invoice for advance payment processing.
                    </p>
                    <Link
                      href={`/admin/documents/proforma_invoice/${quotation?.id || rfq.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:underline pt-1"
                    >
                      <span>Generate PI</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>

                  <div className="p-4 rounded-2xl border border-border/80 bg-secondary/20 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                      Official Offer Sheet
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Complete product specification and FOB terms sheet.
                    </p>
                    <Link
                      href={`/admin/documents/offer_sheet/${quotation?.id || rfq.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:underline pt-1"
                    >
                      <span>Generate Offer Sheet</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>

                {/* Payment Status & Commercial Invoice Gating */}
                <div className="p-4 rounded-2xl border border-border/80 bg-secondary/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                        Payment Status
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Payment must be verified as PAID before commercial invoice can be generated.
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
                          <CheckCircle2 size={13} />
                          <span>PAID</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold uppercase">
                          <Clock size={13} />
                          <span>PENDING</span>
                        </span>
                      )}

                      {!isPaid && (
                        <button
                          type="button"
                          onClick={handleMarkPaymentPaid}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                          id="btn-mark-payment-paid"
                        >
                          <DollarSign size={13} />
                          <span>Mark Paid</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Commercial Invoice Section */}
                  <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                        Commercial Invoice
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {isPaid
                          ? "Payment verified. Commercial invoice generation unlocked."
                          : "Locked: strictly gated until payment status is marked Paid."}
                      </span>
                    </div>

                    {isPaid ? (
                      <Link
                        href={`/admin/documents/commercial_invoice/${quotation?.id || rfq.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                        id="btn-generate-commercial-invoice"
                      >
                        <FileCheck size={13} />
                        <span>Generate Commercial Invoice</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-muted-foreground border border-border text-xs font-bold uppercase tracking-wider opacity-60 cursor-not-allowed"
                        title="Payment required"
                      >
                        <Lock size={12} />
                        <span>Commercial Invoice Locked</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (1 Col on lg): Workflow Progression, Customer Info, Financial Summary */}
          <div className="space-y-6">
            {/* Section 15: Minimal Workflow Progression Card */}
            <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/60">
                RFQ Workflow
              </h2>

              <div className="space-y-2.5 text-xs">
                {[
                  { id: "SUBMITTED", label: "1. RFQ Received", active: true },
                  {
                    id: "UNDER_REVIEW",
                    label: "2. RFQ Under Review",
                    active: statusStr !== "SUBMITTED" && statusStr !== "RFQ_RECEIVED",
                  },
                  {
                    id: "APPROVED",
                    label: "3. RFQ Approved",
                    active:
                      statusStr !== "SUBMITTED" &&
                      statusStr !== "RFQ_RECEIVED" &&
                      statusStr !== "UNDER_REVIEW",
                  },
                  {
                    id: "QUOTATION_GENERATED",
                    label: "4. Quotation Generation",
                    active: Boolean(quotation),
                  },
                  {
                    id: "QUOTATION_APPROVED",
                    label: "5. Quotation Approved",
                    active: isQuoteApproved,
                  },
                  {
                    id: "PI_OFFER_SHEET",
                    label: "6. PI + Offer Sheet",
                    active: isQuoteApproved,
                  },
                  {
                    id: "PAID",
                    label: "7. Payment Paid",
                    active: isPaid,
                  },
                  {
                    id: "COMMERCIAL_INVOICE",
                    label: "8. Commercial Invoice",
                    active: isPaid,
                  },
                ].map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${
                      step.active
                        ? "bg-primary/10 border-primary/30 text-foreground font-bold"
                        : "bg-secondary/20 border-border/40 text-muted-foreground"
                    }`}
                  >
                    <span>{step.label}</span>
                    {step.active ? (
                      <CheckCircle2 size={14} className="text-primary" />
                    ) : (
                      <ChevronRight size={14} className="text-muted-foreground/40" />
                    )}
                  </div>
                ))}
              </div>

              {/* Contextual Single Workflow Action Button */}
              <div className="pt-3 border-t border-border/50">
                {(statusStr === "SUBMITTED" || statusStr === "RFQ_RECEIVED") && (
                  <button
                    type="button"
                    onClick={handleReviewRfq}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-sm text-center block"
                    id="btn-workflow-review"
                  >
                    Review RFQ
                  </button>
                )}

                {statusStr === "UNDER_REVIEW" && (
                  <button
                    type="button"
                    onClick={handleApproveRfq}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm text-center block"
                    id="btn-workflow-approve"
                  >
                    Approve RFQ
                  </button>
                )}

                {statusStr === "APPROVED" && !quotation && (
                  <button
                    type="button"
                    onClick={handleGenerateQuotation}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-sm text-center block"
                    id="btn-workflow-generate-quote"
                  >
                    Generate Quotation
                  </button>
                )}

                {statusStr === "QUOTATION_GENERATED" && quotation && !isQuoteApproved && (
                  <button
                    type="button"
                    onClick={handleApproveQuotation}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm text-center block"
                    id="btn-workflow-approve-quote"
                  >
                    Approve Quotation
                  </button>
                )}

                {isQuoteApproved && !isPaid && (
                  <button
                    type="button"
                    onClick={handleMarkPaymentPaid}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-sm text-center block"
                    id="btn-workflow-mark-paid"
                  >
                    Mark Payment as Paid
                  </button>
                )}

                {isPaid && (
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-center font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={15} />
                    <span>Workflow Completed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information Card (matching CustomerInfoCard.tsx) */}
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

            {/* Financial Summary Card (matching OrderFinancialSummary.tsx) */}
            <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2 pb-3 border-b border-border/60">
                <DollarSign size={16} className="text-primary" />
                <span>Financial Summary</span>
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Goods Value (Subtotal)</span>
                  <span className="font-mono font-bold text-foreground">
                    ${lineSubtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping / Freight</span>
                  <span className="font-mono font-bold text-foreground">
                    {shippingFee === 0 ? "FREE" : `$${Number(shippingFee).toFixed(2)}`}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/60 flex justify-between text-sm">
                  <span className="font-bold text-foreground">Quotation Total</span>
                  <span className="font-mono font-bold text-foreground text-base">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 text-[11px]">
                  <span className="text-muted-foreground uppercase font-bold">Payment Status</span>
                  {isPaid ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">PAID</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold uppercase">PENDING</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Alerts */}
        <ProductToast toasts={toasts} onDismiss={removeToast} />
      </div>
    </AdminPageGate>
  );
}
