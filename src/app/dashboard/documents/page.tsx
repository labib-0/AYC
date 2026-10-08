"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { orderService } from "@/services/order.service";
import { getCommercialDocument } from "@/lib/services/quotations";
import { downloadCommercialDocumentPDF } from "@/lib/pdf-generator";
import {
  CommercialDocument,
  CommercialDocType,
  OrderDocumentGroup,
  OrderDocumentItem,
} from "@/types/b2b";
import {
  FolderOpen,
  FileText,
  Download,
  Eye,
  Search,
  AlertCircle,
  Loader2,
  Printer,
  X,
  ExternalLink,
  Receipt,
  FileSpreadsheet,
  PackageCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import ProformaInvoiceDocument from "@/components/admin/documents/ProformaInvoiceDocument";
import CommercialInvoiceDocument from "@/components/admin/documents/CommercialInvoiceDocument";
import OfferSheetDocument from "@/components/admin/documents/OfferSheetDocument";
import PackingListDocument from "@/components/admin/documents/PackingListDocument";
import QuotationDocument from "@/components/admin/documents/QuotationDocument";
import { getOrderStatusPresentation } from "@/lib/order-status";

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
            {error ||
              "Unable to generate or render this document. It may require payment confirmation or export clearance."}
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

// ─── Helper Badge Functions ───────────────────────────────────────────────────

function getDocTypeBadge(type: CommercialDocType, badgeCode?: string) {
  switch (type) {
    case "PROFORMA_INVOICE":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 px-2.5 py-1 rounded-lg">
          <Receipt size={12} className="shrink-0" />
          <span className="font-mono text-[10px] bg-sky-200/60 dark:bg-sky-900 px-1 py-0.2 rounded font-black">
            {badgeCode || "PI"}
          </span>
          <span>Proforma Invoice</span>
        </span>
      );
    case "COMMERCIAL_INVOICE":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg">
          <Receipt size={12} className="shrink-0" />
          <span className="font-mono text-[10px] bg-emerald-200/60 dark:bg-emerald-900 px-1 py-0.2 rounded font-black">
            {badgeCode || "CI"}
          </span>
          <span>Commercial Invoice</span>
        </span>
      );
    case "PACKING_LIST":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-2.5 py-1 rounded-lg">
          <PackageCheck size={12} className="shrink-0" />
          <span className="font-mono text-[10px] bg-purple-200/60 dark:bg-purple-900 px-1 py-0.2 rounded font-black">
            {badgeCode || "PL"}
          </span>
          <span>Packing List</span>
        </span>
      );
    case "ORDER_SHEET":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2.5 py-1 rounded-lg">
          <FileSpreadsheet size={12} className="shrink-0" />
          <span className="font-mono text-[10px] bg-indigo-200/60 dark:bg-indigo-900 px-1 py-0.2 rounded font-black">
            {badgeCode || "OS"}
          </span>
          <span>Order Sheet</span>
        </span>
      );
    case "INVOICE":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded-lg">
          <Receipt size={12} className="shrink-0" />
          <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.2 rounded font-black">
            {badgeCode || "INV"}
          </span>
          <span>Order Invoice</span>
        </span>
      );
    case "QUOTATION":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-lg">
          <FileText size={12} className="shrink-0" />
          <span className="font-mono text-[10px] bg-amber-200/60 dark:bg-amber-900 px-1 py-0.2 rounded font-black">
            {badgeCode || "QT"}
          </span>
          <span>Commercial Quotation</span>
        </span>
      );
  }
}

function getOrderStatusBadge(order: any) {
  const statusPres = getOrderStatusPresentation(order);
  const StatusIcon = statusPres.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusPres.badgeClass}`}
    >
      <StatusIcon size={11} className={statusPres.iconClass} />
      <span>{statusPres.label}</span>
    </span>
  );
}

// ─── Main Document Center Page ────────────────────────────────────────────────

export default function DocumentCenterPage() {
  const { user } = useAuth();

  const [orderGroups, setOrderGroups] = useState<OrderDocumentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Expand / collapse map: orderId -> boolean
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalOrders, setTotalOrders] = useState<number>(0);

  // Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CommercialDocument | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load customer document groups
  const loadDocumentGroups = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await orderService.getCustomerDocumentGroups({
        search: debouncedSearch,
        filter: selectedTypeFilter,
        page: currentPage,
        per_page: 10,
        userId: user.id,
      });

      const groups = res.data || [];
      setOrderGroups(groups);

      if (res.meta) {
        setTotalPages(res.meta.last_page || 1);
        setTotalOrders(res.meta.total_orders ?? groups.length);
      } else {
        setTotalPages(1);
        setTotalOrders(groups.length);
      }

      // Auto-expand orders when searching or when there are <= 5 orders
      setExpandedOrders((prev) => {
        const nextState = { ...prev };
        for (const g of groups) {
          if (nextState[g.order.id] === undefined) {
            // Default to expanded
            nextState[g.order.id] = true;
          } else if (debouncedSearch.trim() !== "") {
            // Keep matching search expanded
            nextState[g.order.id] = true;
          }
        }
        return nextState;
      });
    } catch (err) {
      console.error("Failed to load customer document groups:", err);
      showToast("Failed to load commercial documents.", "error");
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearch, selectedTypeFilter, currentPage, showToast]);

  useEffect(() => {
    loadDocumentGroups();
  }, [loadDocumentGroups]);

  // Toggle order expansion
  const toggleOrder = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Expand all / Collapse all toggle
  const allExpanded = useMemo(() => {
    if (orderGroups.length === 0) return false;
    return orderGroups.every((g) => expandedOrders[g.order.id] !== false);
  }, [orderGroups, expandedOrders]);

  const toggleAll = () => {
    const nextVal = !allExpanded;
    const nextState: Record<string, boolean> = {};
    for (const g of orderGroups) {
      nextState[g.order.id] = nextVal;
    }
    setExpandedOrders(nextState);
  };

  // Highlight check for matched search
  const isDocMatchedBySearch = useCallback(
    (doc: OrderDocumentItem, query: string) => {
      if (!query.trim()) return false;
      const q = query.toLowerCase().trim();
      const strippedQ = q.replace(/^(pi|ci|inv|ord|pl|qt)[-_ ]+/i, "").replace(/^(202[4-9])[-_ ]+/i, "");

      const matchRef = doc.reference.toLowerCase().includes(q) || (Boolean(strippedQ) && doc.reference.toLowerCase().includes(strippedQ));
      const matchType = doc.type_name.toLowerCase().includes(q);
      const matchBadge = doc.badge_code.toLowerCase() === q;
      return matchRef || matchType || matchBadge;
    },
    []
  );

  // Handle View Document in modal
  const handleView = async (item: OrderDocumentItem) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewDoc(null);

    try {
      const doc = await getCommercialDocument(
        item.doc_type,
        item.source_id,
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
  const handleDownloadPDF = async (item: OrderDocumentItem) => {
    setDownloadingId(item.id);
    try {
      const doc = await getCommercialDocument(
        item.doc_type,
        item.source_id,
        user ? { userId: user.id, email: user.email } : undefined
      );
      if (doc) {
        await downloadCommercialDocumentPDF(doc);
        showToast(`Downloaded ${doc.title} (${doc.docNumber}).`);
      } else {
        showToast("Document could not be found for PDF export.", "error");
      }
    } catch (_err) {
      showToast("PDF generation failed. Please try again.", "error");
    } finally {
      setDownloadingId(null);
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
            Access, view, and download official export documentation, Proforma Invoices, Offer Sheets, and Commercial Invoices grouped by order.
          </p>
        </div>
      </div>

      {/* Search Bar & Filter Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Prominent Smart Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, order ID, invoice ID or document reference..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Pills & View Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-white/5">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "All Documents" },
              { id: "INVOICES", label: "Invoices (PI & CI)" },
              { id: "QUOTATIONS", label: "Quotes & Offers" },
              { id: "PACKING", label: "Packing Lists" },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setSelectedTypeFilter(pill.id);
                  setCurrentPage(1);
                }}
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

          {/* Quick stats and Expand All Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {orderGroups.length > 0 && (
              <>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {totalOrders} {totalOrders === 1 ? "order" : "orders"} found
                </span>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <ChevronsUpDown size={13} />
                  <span>{allExpanded ? "Collapse All" : "Expand All"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 animate-pulse shadow-xs"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-5 w-44 bg-slate-200 dark:bg-white/10 rounded" />
                  <div className="h-4 w-72 bg-slate-100 dark:bg-white/5 rounded" />
                </div>
                <div className="h-8 w-24 bg-slate-100 dark:bg-white/5 rounded-xl" />
              </div>
              <div className="h-16 w-full bg-slate-50 dark:bg-white/[0.02] rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty States */}
      {!loading && orderGroups.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <FolderOpen size={26} />
          </div>
          <div>
            <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
              {debouncedSearch.trim()
                ? "No matching orders found"
                : selectedTypeFilter !== "ALL"
                ? "No orders match the selected filter"
                : "No commercial documents available yet"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {debouncedSearch.trim() ? (
                <>
                  No orders or documents match &quot;<span className="font-semibold">{debouncedSearch}</span>&quot;. Try searching by customer name, order ID, invoice ID, or document reference.
                </>
              ) : selectedTypeFilter !== "ALL" ? (
                "Try switching to \"All Documents\" to view your other commercial documents."
              ) : (
                "Official export documentation will appear here once orders or quotations are placed."
              )}
            </p>
          </div>
          {(debouncedSearch.trim() || selectedTypeFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setDebouncedSearch("");
                setSelectedTypeFilter("ALL");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              Reset Filters &amp; Search
            </button>
          )}
        </div>
      )}

      {/* Order-Wise Document Groups */}
      {!loading && orderGroups.length > 0 && (
        <div className="space-y-4">
          {orderGroups.map((group) => {
            const order = group.order;
            const isExpanded = expandedOrders[order.id] !== false;
            const hasMatchedDoc = debouncedSearch.trim()
              ? group.documents.some((d) => isDocMatchedBySearch(d, debouncedSearch))
              : false;

            const orderDetailHref = order.is_quote
              ? `/dashboard/quotes/${order.id}`
              : `/dashboard/orders/${order.id}`;

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-xs overflow-hidden ${
                  hasMatchedDoc
                    ? "border-amber-500/40 ring-1 ring-amber-500/20"
                    : "border-slate-200/90 dark:border-white/10"
                }`}
              >
                {/* ── Order Summary Card Header ── */}
                <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    {/* Top Row: Order Badge & Status */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        {order.is_quote ? `QUOTE #${order.order_number}` : `ORDER #${order.order_number}`}
                      </span>

                      {getOrderStatusBadge(order)}

                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        <FolderOpen size={11} />
                        <span>{group.documents.length} {group.documents.length === 1 ? "Document" : "Documents"}</span>
                      </span>

                      {hasMatchedDoc && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 px-2 py-0.5 rounded-md">
                          <Sparkles size={10} />
                          <span>Matched Query</span>
                        </span>
                      )}
                    </div>

                    {/* Sub Row: Customer Name · Date · Total Amount */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-slate-200">
                        {order.customer_name}
                      </span>
                      {order.company_name && order.company_name !== order.customer_name && (
                        <>
                          <span>({order.company_name})</span>
                        </>
                      )}
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {order.order_date_formatted || order.order_date}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ${order.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {order.currency}
                      </span>
                    </div>
                  </div>

                  {/* Header Actions: View Order + Expand/Collapse */}
                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    <Link
                      href={orderDetailHref}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <ShoppingBag size={13} />
                      <span>{order.is_quote ? "View Quote" : "View Order"}</span>
                      <ExternalLink size={11} className="opacity-60" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleOrder(order.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Collapse documents" : "Expand documents"}
                    >
                      <span>{isExpanded ? "Collapse" : "Expand"}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* ── Collapsible Documents List ── */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                      <span className="flex items-center gap-1.5">
                        <FolderOpen size={13} className="text-amber-500" />
                        <span>Documents</span>
                      </span>
                      <span className="text-[11px] font-normal normal-case">
                        {group.documents.length} available
                      </span>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Document Type</th>
                            <th className="py-2.5 px-3">Reference</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                          {group.documents.map((doc) => {
                            const isMatch = isDocMatchedBySearch(doc, debouncedSearch);
                            return (
                              <tr
                                key={doc.id}
                                className={`transition-colors ${
                                  isMatch
                                    ? "bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-l-amber-500"
                                    : "hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                                }`}
                              >
                                {/* Document Type */}
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    {getDocTypeBadge(doc.doc_type, doc.badge_code)}
                                    {isMatch && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                                        ★ Matched Search
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Reference */}
                                <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                  {doc.reference}
                                </td>

                                {/* Date */}
                                <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                                  {doc.date_formatted || doc.date}
                                </td>

                                {/* Amount */}
                                <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                  {doc.amount !== undefined && doc.amount !== null ? (
                                    `$${doc.amount.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })} ${doc.currency}`
                                  ) : (
                                    <span className="text-slate-400 font-normal">—</span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleView(doc)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                                    >
                                      <Eye size={12} />
                                      <span>View</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDownloadPDF(doc)}
                                      disabled={downloadingId === doc.id}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {downloadingId === doc.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        <Download size={12} />
                                      )}
                                      <span>PDF</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View (md:hidden) */}
                    <div className="md:hidden space-y-2.5 pt-1">
                      {group.documents.map((doc) => {
                        const isMatch = isDocMatchedBySearch(doc, debouncedSearch);
                        return (
                          <div
                            key={doc.id}
                            className={`p-3 rounded-xl border space-y-2.5 transition-all ${
                              isMatch
                                ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30"
                                : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/5"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              {getDocTypeBadge(doc.doc_type, doc.badge_code)}
                              <span className="text-[11px] text-slate-400 font-mono">
                                {doc.date_formatted || doc.date}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {doc.reference}
                              </span>
                              {doc.amount !== undefined && doc.amount !== null && (
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  ${doc.amount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  {doc.currency}
                                </span>
                              )}
                            </div>

                            {isMatch && (
                              <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 w-fit">
                                ★ Matched Search
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                              <button
                                type="button"
                                onClick={() => handleView(doc)}
                                className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadPDF(doc)}
                                disabled={downloadingId === doc.id}
                                className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {downloadingId === doc.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Download size={12} />
                                )}
                                <span>PDF</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Order-Based Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-white/10">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> of{" "}
                <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
