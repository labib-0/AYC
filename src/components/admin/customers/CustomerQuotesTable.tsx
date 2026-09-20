import React from "react";
import { CustomerRecentQuote } from "@/services/admin";
import { FileText } from "lucide-react";

export interface CustomerQuotesTableProps {
  quotes: CustomerRecentQuote[];
}

export default function CustomerQuotesTable({ quotes }: CustomerQuotesTableProps) {
  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <span>Recent RFQs &amp; Quotations ({quotes.length})</span>
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          Wholesale Pipeline
        </span>
      </div>

      {quotes.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <FileText size={28} className="mx-auto text-muted-foreground/50 stroke-1" />
          <p className="font-medium text-foreground">No quotations found.</p>
          <p className="text-[11px]">No wholesale quotation requests recorded for this customer.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {quotes.map((q) => {
            const formattedDate = q.created_at
              ? new Date(q.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";

            return (
              <div
                key={q.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-foreground block">
                    {q.rfq_number}
                  </span>
                  {q.request_title && (
                    <span className="text-muted-foreground text-[11px] block truncate max-w-xs">
                      {q.request_title}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    Created on {formattedDate}
                  </span>
                </div>

                <div className="sm:text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary border border-border text-foreground">
                    {q.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
