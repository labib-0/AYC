"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import {
  getQuotationById,
  getQuotationByRfqId,
  buyerRespondToQuotation,
  getCommercialDocument,
} from "@/lib/services/quotations";
import { getRfqById } from "@/lib/services/rfq";
import { QuotationRecord, QuotationStatus, RfqRecord } from "@/types/b2b";
import { downloadCommercialDocumentPDF } from "@/lib/pdf-generator";
import { getWhatsAppUrl } from "@/config/business-profile";
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  ShieldAlert,
  Download,
  Printer,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Package,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

function formatUSD(amount: number): string {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getQuotationStatusBadge(status: QuotationStatus) {
  switch (status) {
    case "READY":
    case "SENT":
    case "VIEWED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50">
          <Clock size={12} />
          <span>READY FOR REVIEW</span>
        </span>
      );
    case "NEGOTIATION":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50">
          <MessageSquare size={12} />
          <span>IN NEGOTIATION</span>
        </span>
      );
    case "ACCEPTED":
    case "CONVERTED_TO_ORDER":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
          <CheckCircle2 size={12} />
          <span>ACCEPTED</span>
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50">
          <XCircle size={12} />
          <span>REJECTED</span>
        </span>
      );
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10">
          <AlertCircle size={12} />
          <span>EXPIRED</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}

export default function CustomerQuotationDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const quoteId = resolvedParams.id;
  const { user } = useAuth();

  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [rfq, setRfq] = useState<RfqRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [revisionNotes, setRevisionNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const showActionError = (msg: string) => {
    setActionErrorMsg(msg);
    setTimeout(() => {
      setActionErrorMsg((cur) => (cur === msg ? null : cur));
    }, 4500);
  };

  const fetchQuotationData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      // Find quote by quotation ID or fallback by RFQ ID
      let data = await getQuotationById(quoteId);
      if (!data) {
        data = await getQuotationByRfqId(quoteId);
      }

      if (!data) {
        setQuotation(null);
        setLoading(false);
        return;
      }

      // Check linked RFQ to verify ownership if buyerEmail is missing or for verification
      const linkedRfq = data.rfqId ? await getRfqById(data.rfqId) : null;
      setRfq(linkedRfq);

      const isOwner =
        (data.buyerEmail && user.email && data.buyerEmail.toLowerCase() === user.email.toLowerCase()) ||
        (linkedRfq && linkedRfq.userId && String(linkedRfq.userId) === String(user.id)) ||
        (linkedRfq && linkedRfq.buyerEmail && user.email && linkedRfq.buyerEmail.toLowerCase() === user.email.toLowerCase());

      if (!isOwner) {
        setUnauthorized(true);
        setQuotation(null);
        setLoading(false);
        return;
      }

      setQuotation(data);
    } catch (err: any) {
      console.error("Failed to load quotation:", err);
      setError("Unable to load quotation details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotationData();
  }, [quoteId, user]);

  // Actions
  const handleConfirmAccept = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      const updated = await buyerRespondToQuotation(quotation.id, "accept");
      if (updated) {
        setShowAcceptModal(false);
        setActionSuccessMsg(
          `Quotation accepted! Proforma Invoice ${updated.proformaInvoiceId || "P.I."} has been generated.`
        );
        await fetchQuotationData();
      }
    } catch (err: any) {
      showActionError("Failed to accept quotation. Please contact your sales representative.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmNegotiate = async () => {
    if (!quotation || !revisionNotes.trim()) return;
    setActionLoading(true);
    try {
      const updated = await buyerRespondToQuotation(
        quotation.id,
        "request_changes",
        revisionNotes.trim()
      );
      if (updated) {
        setShowNegotiateModal(false);
        setRevisionNotes("");
        setActionSuccessMsg(
          "Revision request sent! Our sales team has been notified to review requested changes."
        );
        await fetchQuotationData();
      }
    } catch (err: any) {
      showActionError("Failed to submit change request. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      const updated = await buyerRespondToQuotation(
        quotation.id,
        "reject",
        rejectReason.trim()
      );
      if (updated) {
        setShowRejectModal(false);
        setRejectReason("");
        setActionSuccessMsg("Quotation declined.");
        await fetchQuotationData();
      }
    } catch (err: any) {
      showActionError("Failed to decline quotation. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadQuotationPDF = async () => {
    if (!quotation || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const doc = await getCommercialDocument("QUOTATION", quotation.id);
      if (doc) {
        await downloadCommercialDocumentPDF(doc);
      } else {
        showActionError("Document data unavailable for PDF download.");
      }
    } catch (err: any) {
      console.error("PDF download error:", err);
      showActionError("Failed to generate PDF document.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadPI = async () => {
    if (!quotation || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const doc = await getCommercialDocument("PROFORMA_INVOICE", quotation.id);
      if (doc) {
        await downloadCommercialDocumentPDF(doc);
      } else {
        showActionError("Proforma invoice unavailable.");
      }
    } catch (err: any) {
      console.error("PI PDF download error:", err);
      showActionError("Failed to generate PI PDF document.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // State: Loading
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl animate-pulse" />
        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // State: Unauthorized / Not Allowed
  if (unauthorized) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
          403 — Unauthorized Access
        </span>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-3">
          Quotation Access Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          This commercial quotation is private and belongs to another buyer account. Commercial quotations contain binding FOB pricing agreements and cannot be viewed without proper credentials.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Return to Your Quotations</span>
          </Link>
        </div>
      </div>
    );
  }

  // State: Not Found
  if (!quotation) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <DollarSign size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Quotation Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
          The requested quotation <span className="font-mono font-semibold">{quoteId}</span> could not be located.
        </p>
        <Link
          href="/dashboard/quotes"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Quotation List</span>
        </Link>
      </div>
    );
  }

  const dateStr = quotation.createdAt
    ? new Date(quotation.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recent";

  const isReviewable =
    quotation.status === "READY" ||
    quotation.status === "SENT" ||
    quotation.status === "VIEWED" ||
    quotation.status === "NEGOTIATION";

  const isAccepted = quotation.status === "ACCEPTED" || quotation.status === "CONVERTED_TO_ORDER";

  return (
    <div className="space-y-6 pb-12">
      {/* Action Success Alert */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Error Alert */}
      {actionErrorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between text-xs text-red-800 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span className="font-semibold">{actionErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionErrorMsg(null)}
            className="text-red-600 hover:text-red-800 font-bold ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── 1. QUOTATION HEADER ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/dashboard/quotes"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-purple-600 transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to All Quotations</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {quotation.quotationNumber}
              </h1>
              {quotation.revisionNumber && quotation.revisionNumber > 1 && (
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  Revision {quotation.revisionNumber}
                </span>
              )}
              {getQuotationStatusBadge(quotation.status)}
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              <span>Date: {dateStr}</span>
              {quotation.rfqNumber && (
                <>
                  <span>•</span>
                  <span>
                    Linked RFQ:{" "}
                    <Link
                      href={`/dashboard/rfq/${quotation.rfqId}`}
                      className="font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 underline"
                    >
                      {quotation.rfqNumber}
                    </Link>
                  </span>
                </>
              )}
              {quotation.proformaInvoiceId && (
                <>
                  <span>•</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    P.I. #{quotation.proformaInvoiceId}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Top Document & WhatsApp Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={getWhatsAppUrl(
                `Inquiring regarding Quotation ${quotation.quotationNumber} for ${quotation.companyName}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle size={14} />
              <span>Discuss on WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleDownloadQuotationPDF}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs cursor-pointer"
            >
              <Download size={13} />
              <span>{isDownloadingPdf ? "Generating..." : "Download Quotation PDF"}</span>
            </button>
          </div>
        </div>

        {/* Accepted Banner */}
        {isAccepted && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  Quotation Confirmed & Accepted by Buyer
                </p>
                <p className="text-emerald-700/80 dark:text-emerald-400/80 text-[0.6875rem]">
                  Proforma Invoice <span className="font-mono font-bold">{quotation.proformaInvoiceId || "P.I."}</span> issued. Ready for swift wire deposit and manufacturing.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadPI}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Download size={12} />
              <span>Download Proforma Invoice</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── 2. BUYER / COMPANY ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <Building2 size={16} className="text-purple-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Client & Consignee Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Buyer / Representative:</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
              {quotation.buyerName}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Company / Importer:</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
              {quotation.companyName}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Billing Email:</span>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
              {quotation.buyerEmail}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Destination:</span>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
              {quotation.destinationCity ? `${quotation.destinationCity}, ` : ""}{quotation.destinationCountry}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. PRODUCT ITEMS, QUANTITIES & UNIT PRICES ─────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-purple-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Contract Product Specifications ({quotation.items?.length || 0} items)
            </h2>
          </div>
          <span className="text-[0.6875rem] text-slate-400">
            Historical quoted FOB contract values locked
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {quotation.items && quotation.items.length > 0 ? (
            quotation.items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.productName}
                  </h3>
                  {item.variantTitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.variantTitle}
                    </p>
                  )}
                  {item.sku && (
                    <p className="text-[0.6875rem] font-mono text-slate-400">
                      SKU: {item.sku}
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-right shrink-0">
                  <div className="text-xs text-slate-500">
                    <span>{item.quantity.toLocaleString()} pcs @ </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatUSD(item.unitPrice)}
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {formatUSD(item.lineTotal || item.unitPrice * item.quantity)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-4">No quotation items recorded.</p>
          )}
        </div>
      </div>

      {/* ─── 4. FINANCIAL SUMMARY (Historical Values) ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <DollarSign size={16} className="text-purple-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quotation Financial Breakdown
          </h2>
        </div>

        <div className="max-w-md ml-auto space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>FOB Products Subtotal</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatUSD(quotation.subtotal)}
            </span>
          </div>

          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Shipping & Freight Charges ({quotation.shippingTerms || "FOB Dhaka"})</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatUSD(quotation.shippingFee)}
            </span>
          </div>

          {Number(quotation.discountTotal) > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Volume Commercial Discount</span>
              <span className="font-semibold">-{formatUSD(quotation.discountTotal)}</span>
            </div>
          )}

          {Number(quotation.taxAmount) > 0 && (
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Export Taxes / Duties</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatUSD(quotation.taxAmount)}
              </span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-baseline">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Grand Total ({quotation.currency || "USD"})
            </span>
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">
              {formatUSD(quotation.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 5. COMMERCIAL TERMS & VALIDITY ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <FileText size={16} className="text-purple-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Export Commercial Terms, Payment & Validity
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
          <div>
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
              Payment Terms
            </span>
            <p className="font-bold text-slate-900 dark:text-white mt-1">
              {quotation.paymentTerms || "100% Advance T/T or L/C at Sight"}
            </p>
          </div>

          <div>
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
              Shipping Terms & Incoterm
            </span>
            <p className="font-bold text-slate-900 dark:text-white mt-1">
              {quotation.incoterm || "FOB"} • {quotation.shippingTerms || "Dhaka Sea / Air Cargo"}
            </p>
          </div>

          <div>
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
              Validity
            </span>
            <p className="font-bold text-slate-900 dark:text-white mt-1">
              {quotation.validUntil || "30 Days from issuance"}
            </p>
          </div>
        </div>

        {quotation.adminNotes && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
              Commercial Notes & Agreements
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-white/5">
              {quotation.adminNotes}
            </p>
          </div>
        )}
      </div>

      {/* ─── 6. DOCUMENT ACTION ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-purple-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Commercial Document Access
            </h2>
          </div>
          <span className="text-[0.6875rem] text-slate-400">Standard ISO A4 Printable Documents</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Official Quotation Document */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Commercial Quotation</p>
              <p className="text-[0.6875rem] text-slate-500">Official contract quote sheet</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadQuotationPDF}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 transition-colors cursor-pointer"
            >
              <Download size={12} />
              <span>PDF</span>
            </button>
          </div>

          {/* Proforma Invoice */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Proforma Invoice</p>
              <p className="text-[0.6875rem] text-slate-500">
                {isAccepted ? "Official P.I. for wire" : "Unlocks after acceptance"}
              </p>
            </div>
            {isAccepted ? (
              <button
                type="button"
                onClick={handleDownloadPI}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors cursor-pointer"
              >
                <Download size={12} />
                <span>PDF</span>
              </button>
            ) : (
              <span className="text-[0.625rem] text-slate-400 italic">Locked</span>
            )}
          </div>

          {/* Portal Viewer */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Portal Document Viewer</p>
              <p className="text-[0.6875rem] text-slate-500">Printable web viewer</p>
            </div>
            <Link
              href={`/ayc/documents/QUOTATION/${quotation.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <span>Open</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 7. BUYER ACTIONS (ACCEPT / NEGOTIATE / REJECT) ──────────────────── */}
      {isReviewable && (
        <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Buyer Quotation Response
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review export terms and proceed to Proforma Invoice, request changes, or decline.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                Decline Quote
              </button>

              <button
                type="button"
                onClick={() => setShowNegotiateModal(true)}
                className="px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
              >
                Request Revision
              </button>

              <button
                type="button"
                onClick={() => setShowAcceptModal(true)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Accept Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ACCEPT CONFIRMATION MODAL ───────────────────────────────────────── */}
      {showAcceptModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center">
              Accept Commercial Quotation?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
              You are approving Quote <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{quotation.quotationNumber}</span> for <span className="font-bold text-slate-900 dark:text-white">{formatUSD(quotation.grandTotal)}</span>.
            </p>
            <p className="text-[0.6875rem] text-slate-500 text-center mt-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl">
              An official Proforma Invoice (P.I.) with bank swift deposit coordinates will be generated immediately.
            </p>

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {actionLoading ? "Accepting..." : "Confirm & Issue P.I."}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REQUEST REVISION MODAL ─────────────────────────────────────────── */}
      {showNegotiateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center">
              Request Quotation Revision
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
              Specify requested adjustments (target price, quantities, Incoterm, or freight method).
            </p>

            <div className="mt-4">
              <textarea
                rows={3}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="E.g., Could we adjust the target FOB price to $13.50/pc for 5,000 units? Also please quote CIF Chittagong instead of FOB."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowNegotiateModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmNegotiate}
                disabled={actionLoading || !revisionNotes.trim()}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Submitting..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DECLINE QUOTATION MODAL ────────────────────────────────────────── */}
      {showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <XCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center">
              Decline Quotation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
              Please let us know why you are declining this quotation:
            </p>

            <div className="mt-4">
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="FOB price exceeds budget">FOB price exceeds budget</option>
                <option value="Lead time / delivery date too late">Lead time / delivery date too late</option>
                <option value="Selected another supplier">Selected another supplier</option>
                <option value="Project cancelled">Project cancelled</option>
                <option value="Other commercial reason">Other commercial reason</option>
              </select>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {actionLoading ? "Declining..." : "Decline Quotation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
