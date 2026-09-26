"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, Lock } from "lucide-react";
import { CommercialDocument } from "@/types/b2b";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface DocumentToolbarProps {
  doc: CommercialDocument;
  onPrint: () => void;
  onDownloadPDF: () => void;
  isDownloading?: boolean;
}

export default function DocumentToolbar({
  doc,
  onPrint,
  onDownloadPDF,
  isDownloading = false,
}: DocumentToolbarProps) {
  const { can, isSuperAdmin } = useAdminAuth();
  const canDownload = isSuperAdmin || can("document.download");
  const canPrint = isSuperAdmin || can("document.print");

  const backHref = doc.orderNumber 
    ? `/admin/orders/${doc.order_id || doc.orderNumber}`
    : doc.quotationNumber 
    ? `/admin/rfq-quotes?tab=quotes` 
    : `/admin/documents`;

  const backLabel = doc.orderNumber
    ? `Back to Order #${doc.orderNumber}`
    : doc.quotationNumber
    ? "Back to Quotations"
    : "Back to Documents";

  return (
    <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={13} />
          <span>{backLabel}</span>
        </Link>
        <span className="text-muted-foreground/40">•</span>
        <Link
          href="/admin/documents"
          className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          Documents Hub
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {doc.is_gated && (
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-500/20">
            <Lock size={12} />
            <span>Draft Preview (Payment Pending)</span>
          </span>
        )}

        {canDownload && (
          <button
            type="button"
            onClick={onDownloadPDF}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md cursor-pointer"
          >
            <Download size={14} />
            <span>{isDownloading ? "Generating PDF..." : "Download PDF (A4)"}</span>
          </button>
        )}

        {canPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-md cursor-pointer"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        )}
      </div>
    </div>
  );
}
