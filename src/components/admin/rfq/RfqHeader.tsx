import React from "react";
import Link from "next/link";
import { RfqRecord, QuotationRecord } from "@/types/b2b";
import RfqStatusBadge from "./RfqStatusBadge";
import { ArrowLeft, RefreshCw, DollarSign, Printer, CheckCircle2, Clock } from "lucide-react";
import { formatRfqDateTime } from "@/lib/rfq-datetime";

export interface RfqHeaderProps {
  rfq: RfqRecord;
  quotation?: QuotationRecord | null;
  backHref?: string;
  onOpenStatusDialog: () => void;
  onOpenQuotationBuilder: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
  documentBaseUrl?: string;
}

export default function RfqHeader({
  rfq,
  quotation,
  backHref = "/rfq",
  onOpenStatusDialog,
  onOpenQuotationBuilder,
  onRefresh,
  isLoading,
  documentBaseUrl = "/admin/documents",
}: RfqHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Top back breadcrumb */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to All Inquiries</span>
        </Link>
      </div>

      {/* Main Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {rfq.rfqNumber}
            </h1>
            <RfqStatusBadge status={rfq.status} />
            {quotation && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                <CheckCircle2 size={12} />
                <span>Quoted ({quotation.quotationNumber})</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span>
              Inquiry from <strong className="text-foreground">{rfq.buyerName}</strong> ({rfq.companyName})
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} className="text-muted-foreground/80" />
              <span>Created:</span>
              <strong className="text-foreground font-medium">{formatRfqDateTime(rfq.createdAt)}</strong>
            </span>
            {rfq.updatedAt && rfq.updatedAt !== rfq.createdAt && (
              <>
                <span>•</span>
                <span>
                  Last Updated: <strong className="text-foreground font-medium">{formatRfqDateTime(rfq.updatedAt)}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh RFQ Data"
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={onOpenStatusDialog}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <span>Update Status</span>
          </button>

          {quotation ? (
            <Link
              href={`${documentBaseUrl}/QUOTATION/${quotation.id}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              <Printer size={14} />
              <span>View Quotation ({quotation.quotationNumber})</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={onOpenQuotationBuilder}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs uppercase tracking-wider transition-opacity shadow-xs cursor-pointer disabled:opacity-50"
            >
              <DollarSign size={14} />
              <span>Generate Quotation</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
