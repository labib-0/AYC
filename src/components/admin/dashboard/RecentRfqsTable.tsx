"use client";

import React from "react";
import Link from "next/link";
import { FileText, ArrowUpRight, Inbox } from "lucide-react";
import { DashboardMetrics } from "@/services/admin/dashboard.service";

interface RecentRfqsTableProps {
  rfqs: DashboardMetrics["recent_rfqs"];
}

export default function RecentRfqsTable({ rfqs }: RecentRfqsTableProps) {
  const getRfqBadge = (status: string) => {
    const s = (status || "PENDING").toUpperCase();
    let bg = "bg-secondary text-muted-foreground border-border";

    if (s === "ACCEPTED" || s === "APPROVED" || s === "COMPLETED") {
      bg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    } else if (s === "QUOTED" || s === "QUOTATION_PREPARED" || s === "IN_REVIEW") {
      bg = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    } else if (s === "REJECTED" || s === "CANCELLED" || s === "EXPIRED") {
      bg = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    } else if (s === "PENDING" || s === "SUBMITTED" || s === "DRAFT") {
      bg = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }

    const cleanLabel = s.replace(/_/g, " ");

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border font-sans ${bg}`}
      >
        {cleanLabel}
      </span>
    );
  };

  return (
    <div className="bg-card border border-border/80 rounded-xl shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Table Header / Title */}
      <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-sans">
            Recent RFQs
          </h2>
        </div>
        <Link
          href="/ayc/rfq"
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 font-sans"
        >
          <span>View All</span>
          <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-x-auto">
        {rfqs && rfqs.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3.5">RFQ Number</th>
                <th className="py-2.5 px-3.5">Company</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rfqs.map((rfq) => {
                const dateDisplay = rfq.created_at
                  ? new Date(rfq.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <tr
                    key={rfq.id || rfq.rfq_number}
                    className="hover:bg-secondary/40 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 font-mono font-medium text-foreground whitespace-nowrap">
                      <Link
                        href={`/ayc/rfq/${rfq.id}`}
                        className="hover:text-primary transition-colors inline-block"
                      >
                        {rfq.rfq_number}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3.5 text-foreground/90 max-w-[180px] truncate font-sans">
                      <span className="block truncate font-medium">
                        {rfq.company_name || rfq.buyer_name || "Enterprise Buyer"}
                      </span>
                      {rfq.buyer_name && rfq.company_name && (
                        <span className="block text-[10px] text-muted-foreground truncate">
                          Attn: {rfq.buyer_name}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {getRfqBadge(rfq.status)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-muted-foreground whitespace-nowrap text-[11px] font-sans">
                      {dateDisplay}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <Inbox size={24} strokeWidth={1.5} className="text-muted-foreground/60 mb-1" />
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground font-sans">
              No recent RFQs.
            </p>
            <p className="text-[11px] text-muted-foreground font-sans">
              Incoming enterprise quotation requests will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
