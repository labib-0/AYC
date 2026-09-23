import React from "react";
import Link from "next/link";
import { RfqRecord } from "@/types/b2b";
import RfqTableRow from "./RfqTableRow";
import RfqStatusBadge from "./RfqStatusBadge";
import { FileText, RotateCcw, AlertTriangle, Globe2, Clock } from "lucide-react";
import { formatRfqDateTime } from "@/lib/rfq-datetime";

export interface RfqTableProps {
  rfqs: RfqRecord[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  isFiltered?: boolean;
  onResetFilters?: () => void;
  detailBaseUrl?: string;
}

export default function RfqTable({
  rfqs,
  isLoading,
  error,
  onRetry,
  isFiltered,
  onResetFilters,
  detailBaseUrl = "/rfq",
}: RfqTableProps) {
  // 1. Error State
  if (error) {
    return (
      <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-base font-bold text-foreground">Unable to load RFQs</h3>
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
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary animate-pulse shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-secondary animate-pulse rounded" />
                  <div className="h-3 w-48 bg-secondary animate-pulse rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-secondary animate-pulse rounded-full" />
              <div className="h-4 w-16 bg-secondary animate-pulse rounded hidden sm:block" />
              <div className="h-8 w-16 bg-secondary animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Empty States
  if (rfqs.length === 0) {
    if (isFiltered) {
      return (
        <div className="bg-card border border-border/70 rounded-2xl p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
            <FileText size={22} />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            No RFQs found for this date and time range.
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your date selection, time period, status filter, or search keywords.
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
          <FileText size={22} />
        </div>
        <h3 className="text-sm font-bold text-foreground">No RFQs yet.</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Wholesale quotation requests will appear here when prospective buyers submit inquiries.
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
                <th className="py-3 px-4">RFQ Ref</th>
                <th className="py-3 px-3">Buyer</th>
                <th className="py-3 px-3">Company</th>
                <th className="py-3 px-3">Destination</th>
                <th className="py-3 px-3 text-center">Items</th>
                <th className="py-3 px-3 text-right">Total Units</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Submitted Date &amp; Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rfqs.map((rfq) => (
                <RfqTableRow
                  key={rfq.id}
                  rfq={rfq}
                  detailBaseUrl={detailBaseUrl}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="md:hidden space-y-3">
        {rfqs.map((rfq) => {
          const detailHref = `${detailBaseUrl}/${rfq.id}`;
          const totalUnits = (rfq.items || []).reduce(
            (sum, it) => sum + (it.quantity || 0),
            0
          );
          const formattedDateTime = formatRfqDateTime(rfq.createdAt);

          return (
            <div
              key={rfq.id}
              className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={detailHref}
                    className="font-mono font-bold text-foreground text-sm hover:text-primary transition-colors block"
                  >
                    {rfq.rfqNumber}
                  </Link>
                  <span className="text-xs text-muted-foreground font-medium">
                    {rfq.buyerName} • {rfq.companyName}
                  </span>
                </div>
                <RfqStatusBadge status={rfq.status} size="sm" />
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Globe2 size={13} className="text-primary" />
                  <span>{rfq.destinationCountry}</span>
                </div>

                <div className="text-right font-mono font-bold text-foreground">
                  {totalUnits.toLocaleString()} pcs
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Items: {rfq.items?.length || 1}</span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Clock size={11} className="text-muted-foreground" />
                  {formattedDateTime}
                </span>
              </div>

              <div className="pt-2 border-t border-border/40">
                <Link
                  href={detailHref}
                  className="w-full py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider text-center transition-colors block"
                >
                  View Inquiry Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
