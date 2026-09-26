"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { 
  FileText, 
  Search, 
  RotateCw, 
  ChevronRight, 
  ArrowUpRight,
  ShieldAlert,
  FileCheck,
  Package,
  Layers,
  Sparkles
} from "lucide-react";
import { adminOrderService } from "@/services/admin/order.service";
import { getAllQuotations } from "@/lib/services/quotations";
import { OrderRecord } from "@/services/order.service";
import { QuotationRecord, CommercialDocType } from "@/types/b2b";

interface DocumentHubItem {
  id: string;
  docNumber: string;
  docType: CommercialDocType;
  title: string;
  sourceType: "ORDER" | "QUOTATION";
  sourceId: string | number;
  sourceRef: string;
  companyName: string;
  buyerName: string;
  date: string;
  amount: number;
  currency: string;
  isAvailable: boolean;
  isGated: boolean;
  href: string;
}

const TYPE_BADGES: Record<CommercialDocType, { label: string; color: string }> = {
  PROFORMA_INVOICE: { label: "Proforma Invoice (PI)", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  ORDER_SHEET: { label: "Offer Sheet", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  COMMERCIAL_INVOICE: { label: "Commercial Invoice", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  PACKING_LIST: { label: "Packing List", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  QUOTATION: { label: "Commercial Quote", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  CHALAN: { label: "Delivery Chalan", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
};

export default function AdminDocumentsHubPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, quoteList] = await Promise.all([
        adminOrderService.getOrders({ per_page: 100 }),
        getAllQuotations(),
      ]);
      setOrders(orderRes.data || []);
      setQuotations(quoteList || []);
    } catch (err) {
      console.error("Failed to load documents data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derive document list from real orders and quotations
  const allDocuments: DocumentHubItem[] = useMemo(() => {
    const docs: DocumentHubItem[] = [];

    // 1. Documents derived from Orders
    for (const order of orders) {
      if (order.status === "cancelled") continue;

      const isPaid =
        order.payment_status === "paid" ||
        order.payment_status === "completed" ||
        ["confirmed", "processing", "shipped", "delivered", "fulfilled"].includes(order.status) ||
        order.payment_method === "net_30";

      const dateStr = (order.placed_at || order.created_at || new Date().toISOString()).split("T")[0];
      const company = order.shipping_company || order.shipping_name || "Valued Customer";
      const buyer = order.shipping_name || "Buyer";
      const totalAmount = order.total_amount || 0;
      const currency = order.currency || "USD";

      // Order Sheet (Always available)
      docs.push({
        id: `doc_ORDER_SHEET_order_${order.id}`,
        docNumber: `ORD-${order.order_number}`,
        docType: "ORDER_SHEET",
        title: "Commercial Order Sheet",
        sourceType: "ORDER",
        sourceId: order.id,
        sourceRef: `#${order.order_number}`,
        companyName: company,
        buyerName: buyer,
        date: dateStr,
        amount: totalAmount,
        currency,
        isAvailable: true,
        isGated: false,
        href: `/admin/documents/ORDER_SHEET/order_${order.id}`,
      });

      // Proforma Invoice (Always available)
      docs.push({
        id: `doc_PROFORMA_INVOICE_order_${order.id}`,
        docNumber: `PI-${order.order_number}`,
        docType: "PROFORMA_INVOICE",
        title: "Commercial Proforma Invoice",
        sourceType: "ORDER",
        sourceId: order.id,
        sourceRef: `#${order.order_number}`,
        companyName: company,
        buyerName: buyer,
        date: dateStr,
        amount: totalAmount,
        currency,
        isAvailable: true,
        isGated: false,
        href: `/admin/documents/PROFORMA_INVOICE/order_${order.id}`,
      });

      // Commercial Invoice (Gated until paid)
      docs.push({
        id: `doc_COMMERCIAL_INVOICE_order_${order.id}`,
        docNumber: `INV-${order.order_number}`,
        docType: "COMMERCIAL_INVOICE",
        title: "Export Commercial Invoice",
        sourceType: "ORDER",
        sourceId: order.id,
        sourceRef: `#${order.order_number}`,
        companyName: company,
        buyerName: buyer,
        date: dateStr,
        amount: totalAmount,
        currency,
        isAvailable: isPaid,
        isGated: !isPaid,
        href: `/admin/documents/COMMERCIAL_INVOICE/order_${order.id}`,
      });

      // Packing List (Gated until paid)
      docs.push({
        id: `doc_PACKING_LIST_order_${order.id}`,
        docNumber: `PL-${order.order_number}`,
        docType: "PACKING_LIST",
        title: "Commercial Packing List",
        sourceType: "ORDER",
        sourceId: order.id,
        sourceRef: `#${order.order_number}`,
        companyName: company,
        buyerName: buyer,
        date: dateStr,
        amount: totalAmount,
        currency,
        isAvailable: isPaid,
        isGated: !isPaid,
        href: `/admin/documents/PACKING_LIST/order_${order.id}`,
      });
    }

    // 2. Documents derived from Quotations
    for (const quote of quotations) {
      const dateStr = (quote.createdAt || new Date().toISOString()).split("T")[0];
      const company = quote.companyName || "Commercial Buyer";
      const buyer = quote.buyerName || "Buyer";
      const totalAmount = quote.grandTotal || 0;
      const currency = quote.currency || "USD";

      // Commercial Quotation
      docs.push({
        id: `doc_QUOTATION_${quote.id}`,
        docNumber: quote.quotationNumber,
        docType: "QUOTATION",
        title: "Official Commercial Quotation",
        sourceType: "QUOTATION",
        sourceId: quote.id,
        sourceRef: quote.quotationNumber,
        companyName: company,
        buyerName: buyer,
        date: dateStr,
        amount: totalAmount,
        currency,
        isAvailable: true,
        isGated: false,
        href: `/admin/documents/QUOTATION/${quote.id}`,
      });

      // Proforma Invoice from Quote
      docs.push({
        id: `doc_PROFORMA_INVOICE_${quote.id}`,
        docNumber: quote.proformaInvoiceId || `PI-${quote.quotationNumber}`,
        docType: "PROFORMA_INVOICE",
        title: "Proforma Invoice (PI)",
        sourceType: "QUOTATION",
        sourceId: quote.id,
        sourceRef: quote.quotationNumber,
        companyName: company,
        buyerName: buyer,
        date: dateStr,
        amount: totalAmount,
        currency,
        isAvailable: true,
        isGated: false,
        href: `/admin/documents/PROFORMA_INVOICE/${quote.id}`,
      });

      // Offer Sheet from Quote
      docs.push({
        id: `doc_ORDER_SHEET_${quote.id}`,
        docNumber: `ORD-${quote.quotationNumber}`,
        docType: "ORDER_SHEET",
        title: "Commercial Offer Sheet",
        sourceType: "QUOTATION",
        sourceId: quote.id,
        sourceRef: quote.quotationNumber,
        companyName: company,
        buyerName: buyer,
        date: dateStr,
        amount: totalAmount,
        currency,
        isAvailable: true,
        isGated: false,
        href: `/admin/documents/ORDER_SHEET/${quote.id}`,
      });
    }

    // Sort newest first
    return docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, quotations]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      // Type filter
      if (selectedType !== "ALL" && doc.docType !== selectedType) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDocNo = doc.docNumber.toLowerCase().includes(q);
        const matchesRef = doc.sourceRef.toLowerCase().includes(q);
        const matchesCompany = doc.companyName.toLowerCase().includes(q);
        const matchesBuyer = doc.buyerName.toLowerCase().includes(q);
        const matchesTitle = doc.title.toLowerCase().includes(q);
        return matchesDocNo || matchesRef || matchesCompany || matchesBuyer || matchesTitle;
      }

      return true;
    });
  }, [allDocuments, selectedType, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage, pageSize]);

  // Counts for KPIs
  const kpiCounts = useMemo(() => {
    return {
      total: allDocuments.length,
      pi: allDocuments.filter((d) => d.docType === "PROFORMA_INVOICE").length,
      offerSheets: allDocuments.filter((d) => d.docType === "ORDER_SHEET" || d.docType === "QUOTATION").length,
      ci: allDocuments.filter((d) => d.docType === "COMMERCIAL_INVOICE").length,
      pl: allDocuments.filter((d) => d.docType === "PACKING_LIST").length,
    };
  }, [allDocuments]);

  const handleFilterType = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Commercial Documents
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {allDocuments.length} Documents
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Access, view, print, and export official commercial export documentation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50 transition-colors border border-border/60 cursor-pointer"
          >
            <RotateCw size={13} className={loading ? "animate-spin text-primary" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => handleFilterType("ALL")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedType === "ALL" ? "bg-primary/10 border-primary" : "bg-card border-border/70 hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total Docs</span>
            <FileText size={14} />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">{kpiCounts.total}</div>
        </div>

        <div 
          onClick={() => handleFilterType("PROFORMA_INVOICE")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedType === "PROFORMA_INVOICE" ? "bg-blue-500/10 border-blue-500" : "bg-card border-border/70 hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Proforma (PI)</span>
            <FileCheck size={14} className="text-blue-500" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">{kpiCounts.pi}</div>
        </div>

        <div 
          onClick={() => handleFilterType("ORDER_SHEET")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedType === "ORDER_SHEET" ? "bg-amber-500/10 border-amber-500" : "bg-card border-border/70 hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Offer Sheets</span>
            <Sparkles size={14} className="text-amber-500" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">{kpiCounts.offerSheets}</div>
        </div>

        <div 
          onClick={() => handleFilterType("COMMERCIAL_INVOICE")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedType === "COMMERCIAL_INVOICE" ? "bg-emerald-500/10 border-emerald-500" : "bg-card border-border/70 hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Invoices (CI)</span>
            <Layers size={14} className="text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">{kpiCounts.ci}</div>
        </div>

        <div 
          onClick={() => handleFilterType("PACKING_LIST")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedType === "PACKING_LIST" ? "bg-purple-500/10 border-purple-500" : "bg-card border-border/70 hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Packing Lists</span>
            <Package size={14} className="text-purple-500" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">{kpiCounts.pl}</div>
        </div>
      </div>

      {/* Toolbar (Search + Type filter tabs) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-card border border-border/70 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by doc #, order #, company or buyer..."
            className="w-full pl-10 pr-4 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "All Types" },
            { id: "PROFORMA_INVOICE", label: "PI" },
            { id: "ORDER_SHEET", label: "Offer Sheet" },
            { id: "COMMERCIAL_INVOICE", label: "Invoice" },
            { id: "PACKING_LIST", label: "Packing List" },
            { id: "QUOTATION", label: "Quote" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedType === tab.id
                  ? "bg-foreground text-background"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-card border border-border/70 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-secondary/50 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText size={40} className="mx-auto text-muted-foreground/50" />
            <h3 className="text-sm font-bold text-foreground">No documents found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || selectedType !== "ALL"
                ? "No commercial documents match your current filter or search criteria."
                : "No commercial documents have been generated yet."}
            </p>
            {(searchQuery || selectedType !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedType("ALL");
                  setCurrentPage(1);
                }}
                className="text-xs font-bold text-primary hover:underline mt-1"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Document / Number</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Source Reference</th>
                  <th className="py-3 px-4">Buyer / Company</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4 text-right">Value (USD)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedDocs.map((item) => {
                  const badge = TYPE_BADGES[item.docType] || { label: item.docType, color: "bg-secondary text-muted-foreground border-border" };

                  return (
                    <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-secondary/70 flex items-center justify-center text-muted-foreground shrink-0">
                            <FileText size={15} />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-foreground block">
                              {item.docNumber}
                            </span>
                            <span className="text-[11px] text-muted-foreground block">
                              {item.title}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.sourceType === "ORDER" ? (
                          <Link
                            href={`/admin/orders/${item.sourceId}`}
                            className="font-mono font-semibold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <span>Order {item.sourceRef}</span>
                            <ArrowUpRight size={11} />
                          </Link>
                        ) : (
                          <Link
                            href={`/admin/quotations`}
                            className="font-mono font-semibold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <span>Quote {item.sourceRef}</span>
                            <ArrowUpRight size={11} />
                          </Link>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-foreground block">
                          {item.companyName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.buyerName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        {item.date}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                        ${Number(item.amount || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.isGated ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <ShieldAlert size={11} />
                            <span>Payment Pending</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span>Ready</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                        >
                          <span>View</span>
                          <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && filteredDocuments.length > 0 && (
          <div className="p-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * pageSize, filteredDocuments.length)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{filteredDocuments.length}</span> documents
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-foreground font-semibold disabled:opacity-40 hover:bg-secondary transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-foreground font-semibold disabled:opacity-40 hover:bg-secondary transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
