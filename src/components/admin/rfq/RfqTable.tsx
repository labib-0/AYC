import React from "react";
import Link from "next/link";
import { RfqRecord } from "@/types/b2b";
import RfqTableRow from "./RfqTableRow";
import RfqStatusBadge from "./RfqStatusBadge";
import { FileText, AlertCircle, RefreshCw } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface RfqTableProps {
  rfqs: RfqRecord[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  hasFilters: boolean;
  onResetFilters: () => void;
  detailBaseUrl?: string;
}

export default function RfqTable({
  rfqs,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  hasFilters,
  onResetFilters,
  detailBaseUrl = "/admin/rfq",
}: RfqTableProps) {
  const { can } = useAdminAuth();

  // Error State
  if (isError) {
    return (
      <div className="p-8 bg-card border border-destructive/30 rounded-3xl text-center space-y-4 max-w-md mx-auto my-8">
        <AlertCircle size={36} className="text-destructive mx-auto" />
        <h3 className="text-base font-bold uppercase text-foreground">
          Unable to load RFQs
        </h3>
        <p className="text-xs text-muted-foreground">
          {errorMessage || "An unexpected error occurred while fetching RFQs."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
        >
          <RefreshCw size={13} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="bg-card border border-border/70 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/60">
          <div className="h-4 w-40 bg-secondary/80 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-border/50">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 w-28 bg-secondary rounded" />
                <div className="h-3 w-20 bg-secondary/60 rounded" />
              </div>
              <div className="space-y-2 hidden sm:block">
                <div className="h-4 w-32 bg-secondary rounded" />
                <div className="h-3 w-24 bg-secondary/60 rounded" />
              </div>
              <div className="h-5 w-16 bg-secondary rounded" />
              <div className="h-5 w-20 bg-secondary rounded" />
              <div className="h-8 w-14 bg-secondary rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State: Filters return nothing
  if (rfqs.length === 0 && hasFilters) {
    return (
      <div className="p-12 bg-card border border-border/70 rounded-3xl text-center space-y-3 shadow-xs">
        <FileText size={36} className="text-muted-foreground mx-auto stroke-1" />
        <h3 className="text-base font-bold text-foreground">
          No RFQs match your current filters.
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Try clearing your search query or changing the status filters to view more RFQs.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <span>Clear Filters</span>
        </button>
      </div>
    );
  }

  // Empty State: Absolutely no RFQs
  if (rfqs.length === 0) {
    return (
      <div className="p-12 bg-card border border-border/70 rounded-3xl text-center space-y-3 shadow-xs">
        <FileText size={40} className="text-muted-foreground mx-auto stroke-1" />
        <h3 className="text-base font-bold text-foreground">No RFQs yet.</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Customer RFQs will appear here once submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop / Tablet Table */}
      <div className="hidden md:block bg-card border border-border/70 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/20 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4">RFQ #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Total Units</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
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

      {/* Mobile Card Stack */}
      <div className="md:hidden space-y-3">
        {rfqs.map((rfq) => {
          const detailHref = `${detailBaseUrl}/${rfq.id}`;
          const customerName = rfq.buyerName || "Guest Buyer";
          const companyName = rfq.companyName || null;
          const totalUnits = (rfq.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
          const createdDate = rfq.createdAt;
          const formattedDate = createdDate
            ? new Date(createdDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "—";

          return (
            <div
              key={rfq.id}
              className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  {can("rfq.view") ? (
                    <Link
                      href={detailHref}
                      className="font-mono font-bold text-foreground text-sm hover:text-primary transition-colors"
                    >
                      {rfq.rfqNumber}
                    </Link>
                  ) : (
                    <span className="font-mono font-bold text-foreground text-sm">
                      {rfq.rfqNumber}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    {formattedDate}
                  </span>
                </div>
                <RfqStatusBadge status={rfq.status} size="sm" />
              </div>

              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-foreground block">{customerName}</span>
                {companyName && (
                  <span className="text-muted-foreground text-[11px] block truncate">
                    {companyName}
                  </span>
                )}
                <span className="text-muted-foreground text-[10px] block truncate">
                  {rfq.buyerEmail}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block">
                    {rfq.items?.length || 0} {(rfq.items?.length || 0) === 1 ? "line" : "lines"}
                  </span>
                  <span className="font-bold font-mono text-sm text-foreground">
                    {totalUnits.toLocaleString()} pcs
                  </span>
                </div>

                {can("rfq.view") && (
                  <Link
                    href={detailHref}
                    className="py-1.5 px-3 rounded-full border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider text-center transition-colors"
                  >
                    View Details
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
