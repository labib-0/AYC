import React from "react";
import Link from "next/link";
import { QuotationRecord } from "@/types/b2b";
import QuotationTableRow from "./QuotationTableRow";
import QuotationStatusBadge from "./QuotationStatusBadge";
import { FileCheck, RotateCcw, AlertTriangle, Printer } from "lucide-react";

export interface QuotationTableProps {
  quotations: QuotationRecord[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  isFiltered?: boolean;
  onResetFilters?: () => void;
  rfqBaseUrl?: string;
  documentBaseUrl?: string;
}

export default function QuotationTable({
  quotations,
  isLoading,
  error,
  onRetry,
  isFiltered,
  onResetFilters,
  rfqBaseUrl = "/rfq",
  documentBaseUrl = "/documents",
}: QuotationTableProps) {
  // 1. Error State
  if (error) {
    return (
      <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-base font-bold text-foreground">Unable to load quotations</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  // 2. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="bg-card border border-border/70 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/60">
          <div className="h-4 w-32 bg-secondary animate-pulse rounded" />
        </div>
        <div className="divide-y divide-border/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-secondary animate-pulse rounded" />
                <div className="h-3 w-48 bg-secondary animate-pulse rounded" />
              </div>
              <div className="h-6 w-20 bg-secondary animate-pulse rounded-full" />
              <div className="h-4 w-20 bg-secondary animate-pulse rounded" />
              <div className="h-8 w-16 bg-secondary animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Empty States
  if (quotations.length === 0) {
    if (isFiltered) {
      return (
        <div className="bg-card border border-border/70 rounded-2xl p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
            <FileCheck size={22} />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            No quotations match your current filters.
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search terms or status filter.
          </p>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-secondary hover:bg-card text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="bg-card border border-border/70 rounded-2xl p-10 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <FileCheck size={22} />
        </div>
        <h3 className="text-sm font-bold text-foreground">No quotations yet.</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Issued commercial quotations will appear here when generated from wholesale RFQs.
        </p>
      </div>
    );
  }

  // 4. Data View: Table on Desktop, Stacked Cards on Mobile
  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block bg-card border border-border/70 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-secondary/40 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-4">Quote Ref</th>
                <th className="py-3 px-3">RFQ Reference</th>
                <th className="py-3 px-3">Buyer & Company</th>
                <th className="py-3 px-3">Destination</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Valid Until</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {quotations.map((quote) => (
                <QuotationTableRow
                  key={quote.id}
                  quotation={quote}
                  rfqBaseUrl={rfqBaseUrl}
                  documentBaseUrl={documentBaseUrl}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="md:hidden space-y-3">
        {quotations.map((quote) => {
          const documentHref = `${documentBaseUrl}/QUOTATION/${quote.id}`;
          const formattedDate = quote.validUntil
            ? new Date(quote.validUntil).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "—";

          return (
            <div
              key={quote.id}
              className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={documentHref}
                    target="_blank"
                    className="font-mono font-bold text-foreground text-sm hover:text-primary transition-colors block"
                  >
                    {quote.quotationNumber}
                  </Link>
                  <span className="text-xs text-muted-foreground font-medium">
                    {quote.buyerName} • {quote.companyName}
                  </span>
                </div>
                <QuotationStatusBadge status={quote.status} size="sm" />
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                <span className="text-muted-foreground font-mono">
                  Ref: {quote.rfqNumber}
                </span>

                <span className="font-mono font-bold text-foreground text-sm">
                  ${Number(quote.grandTotal || 0).toFixed(2)} USD
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Destination: {quote.destinationCountry}</span>
                <span>Valid: {formattedDate}</span>
              </div>

              <div className="pt-2 border-t border-border/40">
                <Link
                  href={documentHref}
                  target="_blank"
                  className="w-full py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer size={13} />
                  <span>View Commercial Document</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
