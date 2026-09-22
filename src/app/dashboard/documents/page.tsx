"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { orderService } from "@/services/order.service";
import { getAllQuotations, getCommercialDocument } from "@/lib/services/quotations";
import { downloadCommercialDocumentPDF } from "@/lib/pdf-generator";
import { CommercialDocument, CommercialDocType } from "@/types/b2b";
import {
  FolderOpen,
  FileText,
  Download,
  Eye,
  Search,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
  Lock,
  Printer,
  X,
  ExternalLink,
  Receipt,
  FileSpreadsheet,
  PackageCheck,
  CheckCircle2,
} from "lucide-react";
import ProformaInvoiceDocument from "@/components/admin/documents/ProformaInvoiceDocument";
import CommercialInvoiceDocument from "@/components/admin/documents/CommercialInvoiceDocument";
import OfferSheetDocument from "@/components/admin/documents/OfferSheetDocument";
import PackingListDocument from "@/components/admin/documents/PackingListDocument";
import QuotationDocument from "@/components/admin/documents/QuotationDocument";

// ─── Document Item Model ──────────────────────────────────────────────────────

interface CustomerDocumentItem {
  id: string;
  docType: CommercialDocType;
  typeName: string;
  reference: string;
  relatedLabel: string;
  relatedHref: string;
  date: string;
  amount?: number;
  currency: string;
  isGated?: boolean;
  gatedReason?: string;
  sourceId: string;
}

// ─── Document Preview Modal ───────────────────────────────────────────────────

interface DocumentPreviewModalProps {
  doc: CommercialDocument | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDownloadPDF: (doc: CommercialDocument) => Promise<void>;
  isDownloading: boolean;
}

function DocumentPreviewModal({
  doc,
  loading,
  error,
  onClose,
  onDownloadPDF,
  isDownloading,
}: DocumentPreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Generating official commercial document preview...
          </p>
        </div>
      );
    }

    if (error || !doc) {
      return (
        <div className="py-16 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Document Unavailable
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || "Unable to generate or render this document. It may require payment confirmation or export clearance."}
          </p>
        </div>
      );
    }

    switch (doc.docType) {
      case "PROFORMA_INVOICE":
        return <ProformaInvoiceDocument doc={doc} />;
      case "COMMERCIAL_INVOICE":
        return <CommercialInvoiceDocument doc={doc} />;
      case "ORDER_SHEET":
        return <OfferSheetDocument doc={doc} />;
      case "PACKING_LIST":
        return <PackingListDocument doc={doc} />;
      case "QUOTATION":
      case "CHALAN":
      default:
        return <QuotationDocument doc={doc} />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h3
                id="document-preview-title"
                className="text-sm font-bold font-display text-slate-900 dark:text-white truncate"
              >
                {doc ? doc.title : "Commercial Document Preview"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {doc ? `Reference: ${doc.docNumber}` : "Official Export Documentation"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {doc && (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadPDF(doc)}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all active:scale-[0.98] shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer ml-1"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/30 dark:bg-slate-900/50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Document Center Page ────────────────────────────────────────────────

export default function DocumentCenterPage() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState<CustomerDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CommercialDocument | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  // Fetch only customer-owned documents
  useEffect(() => {
    let isMounted = true;

    async function loadCustomerDocuments() {
      if (!user) return;
      try {
        setLoading(true);

        const items: CustomerDocumentItem[] = [];

        // 1. Fetch Orders strictly owned by logged in customer
        const userOrders = await orderService.getUserOrders(user.id);

        for (const order of userOrders) {
          const orderNumClean = String(order.order_number).replace(/\D/g, "").slice(-4) || String(order.id);
          const isPaid = order.payment_status === "paid" || order.payment_status === "completed";

          // Proforma Invoice (always available)
          items.push({
            id: `doc_PI_${order.id}`,
            docType: "PROFORMA_INVOICE",
            typeName: "Proforma Invoice",
            reference: `PI-2026-${orderNumClean}`,
            relatedLabel: `Order #${order.order_number}`,
            relatedHref: `/dashboard/orders/${order.id}`,
            date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            amount: order.total_amount,
            currency: order.currency || "USD",
            sourceId: order.id,
          });

          // Order / Offer Sheet
          items.push({
            id: `doc_OS_${order.id}`,
            docType: "ORDER_SHEET",
            typeName: "Order Sheet",
            reference: `ORD-2026-${orderNumClean}`,
            relatedLabel: `Order #${order.order_number}`,
            relatedHref: `/dashboard/orders/${order.id}`,
            date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            amount: order.subtotal || order.total_amount,
            currency: order.currency || "USD",
            sourceId: order.id,
          });

          // Commercial Invoice & Packing List (require payment)
          if (isPaid) {
            items.push({
              id: `doc_CI_${order.id}`,
              docType: "COMMERCIAL_INVOICE",
              typeName: "Commercial Invoice",
              reference: `INV-2026-${orderNumClean}`,
              relatedLabel: `Order #${order.order_number}`,
              relatedHref: `/dashboard/orders/${order.id}`,
              date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
              amount: order.total_amount,
              currency: order.currency || "USD",
              sourceId: order.id,
            });

            items.push({
              id: `doc_PL_${order.id}`,
              docType: "PACKING_LIST",
              typeName: "Packing List",
              reference: `PL-2026-${orderNumClean}`,
              relatedLabel: `Order #${order.order_number}`,
              relatedHref: `/dashboard/orders/${order.id}`,
              date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
              currency: order.currency || "USD",
              sourceId: order.id,
            });
          }
        }

        // 2. Fetch Quotations strictly owned by logged in customer
        const allQuotes = await getAllQuotations();
        const customerQuotes = allQuotes.filter((q) => {
          const matchesEmail = user.email && q.buyerEmail.toLowerCase() === user.email.toLowerCase();
          const matchesCompany =
            user.company_name &&
            q.companyName &&
            q.companyName.toLowerCase().trim() === user.company_name.toLowerCase().trim();
          return Boolean(matchesEmail || matchesCompany);
        });

        for (const quote of customerQuotes) {
          // Official Commercial Quotation
          items.push({
            id: `doc_QT_${quote.id}`,
            docType: "QUOTATION",
            typeName: "Commercial Quotation",
            reference: quote.quotationNumber,
            relatedLabel: quote.rfqNumber ? `RFQ #${quote.rfqNumber}` : `Quote #${quote.quotationNumber}`,
            relatedHref: `/dashboard/quotes/${quote.id}`,
            date: quote.createdAt ? quote.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            amount: quote.grandTotal,
            currency: quote.currency || "USD",
            sourceId: quote.id,
          });

          // Proforma Invoice if accepted or issued
          if (quote.status === "ACCEPTED" || quote.proformaInvoiceId) {
            items.push({
              id: `doc_PI_Q_${quote.id}`,
              docType: "PROFORMA_INVOICE",
              typeName: "Proforma Invoice",
              reference: quote.proformaInvoiceId || `PI-2026-${quote.quotationNumber.split("-")[2] || "0001"}`,
              relatedLabel: `RFQ #${quote.rfqNumber || quote.quotationNumber}`,
              relatedHref: `/dashboard/quotes/${quote.id}`,
              date: quote.createdAt ? quote.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
              amount: quote.grandTotal,
              currency: quote.currency || "USD",
              sourceId: quote.id,
            });
          }
        }

        // Sort documents by date descending
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (isMounted) {
          setDocuments(items);
        }
      } catch (err) {
        console.error("Failed to load customer documents:", err);
        if (isMounted) {
          showToast("Failed to load commercial documents.", "error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCustomerDocuments();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Filters
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Type filter
      if (selectedTypeFilter !== "ALL") {
        if (selectedTypeFilter === "INVOICES" && doc.docType !== "PROFORMA_INVOICE" && doc.docType !== "COMMERCIAL_INVOICE") {
          return false;
        }
        if (selectedTypeFilter === "QUOTATIONS" && doc.docType !== "QUOTATION" && doc.docType !== "ORDER_SHEET") {
          return false;
        }
        if (selectedTypeFilter === "PACKING" && doc.docType !== "PACKING_LIST") {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = doc.reference.toLowerCase().includes(q);
        const matchesRelated = doc.relatedLabel.toLowerCase().includes(q);
        const matchesType = doc.typeName.toLowerCase().includes(q);
        if (!matchesRef && !matchesRelated && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [documents, selectedTypeFilter, searchQuery]);

  // Handle View Document
  const handleView = async (item: CustomerDocumentItem) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewDoc(null);

    try {
      const doc = await getCommercialDocument(
        item.docType,
        item.sourceId,
        user ? { userId: user.id, email: user.email } : undefined
      );
      if (!doc) {
        setPreviewError("The requested document could not be found or is not available.");
      } else {
        setPreviewDoc(doc);
      }
    } catch (err: any) {
      setPreviewError(err?.message || "Failed to load document content.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle Download PDF
  const handleDownloadPDF = async (item: CustomerDocumentItem) => {
    setDownloadingId(item.id);
    try {
      const doc = await getCommercialDocument(
        item.docType,
        item.sourceId,
        user ? { userId: user.id, email: user.email } : undefined
      );
      if (doc) {
        await downloadCommercialDocumentPDF(doc);
        showToast(`Downloaded ${doc.title} (${doc.docNumber}).`);
      } else {
        showToast("Document could not be found for PDF export.", "error");
      }
    } catch (err: any) {
      showToast("PDF generation failed. Please try again.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const getDocTypeBadge = (type: CommercialDocType) => {
    switch (type) {
      case "PROFORMA_INVOICE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 px-2 py-0.5 rounded-md">
            <Receipt size={11} />
            <span>Proforma Invoice</span>
          </span>
        );
      case "COMMERCIAL_INVOICE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
            <Receipt size={11} />
            <span>Commercial Invoice</span>
          </span>
        );
      case "PACKING_LIST":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-md">
            <PackageCheck size={11} />
            <span>Packing List</span>
          </span>
        );
      case "ORDER_SHEET":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-md">
            <FileSpreadsheet size={11} />
            <span>Order Sheet</span>
          </span>
        );
      case "QUOTATION":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
            <FileText size={11} />
            <span>Quotation</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toastMsg.type === "success"
              ? "bg-slate-900 text-white border-slate-800 dark:bg-slate-800 dark:border-white/10"
              : "bg-red-600 text-white border-red-500"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Commercial Document Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access, view, and download official export documentation, Proforma Invoices, Offer Sheets, and Commercial Invoices.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All Documents" },
            { id: "INVOICES", label: "Invoices (PI & CI)" },
            { id: "QUOTATIONS", label: "Quotes & Offers" },
            { id: "PACKING", label: "Packing Lists" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedTypeFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTypeFilter === pill.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference or order..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredDocuments.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <FolderOpen size={26} />
          </div>
          <div>
            <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
              No Documents Found
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {searchQuery.trim() || selectedTypeFilter !== "ALL"
                ? "No commercial documents match your search criteria or active filters."
                : "Official export documentation will appear here as orders and quotations are created."}
            </p>
          </div>
          {(searchQuery.trim() || selectedTypeFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedTypeFilter("ALL");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Documents Table (Desktop) */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Document</th>
                <th className="py-3.5 px-5">Reference</th>
                <th className="py-3.5 px-5">Related Order / RFQ</th>
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5">Amount</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {filteredDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Document Type */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      {getDocTypeBadge(doc.docType)}
                    </div>
                  </td>

                  {/* Reference */}
                  <td className="py-4 px-5 font-bold font-mono text-slate-900 dark:text-white">
                    {doc.reference}
                  </td>

                  {/* Related Order / RFQ */}
                  <td className="py-4 px-5">
                    <Link
                      href={doc.relatedHref}
                      className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      <span>{doc.relatedLabel}</span>
                      <ExternalLink size={11} className="opacity-60" />
                    </Link>
                  </td>

                  {/* Date */}
                  <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
                    {doc.date}
                  </td>

                  {/* Amount */}
                  <td className="py-4 px-5 font-semibold text-slate-900 dark:text-white">
                    {doc.amount !== undefined ? (
                      `$${doc.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} ${doc.currency}`
                    ) : (
                      <span className="text-slate-400 font-normal">N/A</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-4 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleView(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(doc)}
                        disabled={downloadingId === doc.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Document Cards (lg:hidden) */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="lg:hidden space-y-3.5">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div>{getDocTypeBadge(doc.docType)}</div>
                <span className="text-[11px] text-slate-400">{doc.date}</span>
              </div>

              <div>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block">
                  {doc.reference}
                </span>
                <Link
                  href={doc.relatedHref}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors mt-0.5"
                >
                  <span>{doc.relatedLabel}</span>
                  <ExternalLink size={10} className="opacity-60" />
                </Link>
              </div>

              {doc.amount !== undefined && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                  <span className="text-slate-500">Document Total:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${doc.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {doc.currency}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleView(doc)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <Eye size={13} />
                  <span>View</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPDF(doc)}
                  disabled={downloadingId === doc.id}
                  className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloadingId === doc.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Document Preview Modal */}
      {previewOpen && (
        <DocumentPreviewModal
          doc={previewDoc}
          loading={previewLoading}
          error={previewError}
          onClose={() => {
            setPreviewOpen(false);
            setPreviewDoc(null);
            setPreviewError(null);
          }}
          onDownloadPDF={async (doc) => {
            await downloadCommercialDocumentPDF(doc);
            showToast(`Downloaded ${doc.title} (${doc.docNumber}).`);
          }}
          isDownloading={downloadingId !== null}
        />
      )}
    </div>
  );
}
