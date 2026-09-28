"use client";

import React from "react";
import Link from "next/link";
import { RfqRecord } from "@/types/b2b";
import { FileText, ArrowRight, ChevronRight, Clock, Plus } from "lucide-react";

interface OpenRfqsProps {
  rfqs: RfqRecord[];
  loading?: boolean;
}

export function DashboardOpenRfqs({ rfqs, loading = false }: OpenRfqsProps) {
  const activeRfqs = rfqs.slice(0, 4);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
            SUBMITTED
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
            UNDER REVIEW
          </span>
        );
      case "QUOTATION_PREPARED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 animate-pulse">
            QUOTE READY
          </span>
        );
      case "ACCEPTED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            ACCEPTED
          </span>
        );
      case "NEGOTIATION":
        return (
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
            NEGOTIATION
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 shadow-2xs mb-8">
        <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xs overflow-hidden mb-8">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-white/10">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            RFQs & Quotations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Commercial sourcing inquiries, custom tech packs, and factory volume estimates
          </p>
        </div>
        <Link
          href="/dashboard/rfq"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          <span>View All RFQs ({rfqs.length})</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {activeRfqs.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No Active RFQs or Quotations
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Need custom fabric specs, container packaging, or volume discounts? Request a commercial quotation.
          </p>
          <Link
            href="/rfq"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
          >
            <Plus size={14} />
            <span>Submit RFQ</span>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {activeRfqs.map((rfq) => {
            const dateStr = rfq.createdAt
              ? new Date(rfq.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recent";

            return (
              <div
                key={rfq.id}
                className="p-4 sm:px-6 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {rfq.rfqNumber || `RFQ #${rfq.id.toString().slice(-8)}`}
                    </span>
                    {getStatusBadge(rfq.status)}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                    {rfq.requestTitle || rfq.items?.[0]?.productName || "Custom Manufacturing RFQ"}
                  </p>
                  <div className="flex items-center gap-3 text-[0.6875rem] text-slate-400">
                    <span>
                      Target Qty: {rfq.items?.[0]?.quantity || rfq.items?.reduce((s, it) => s + (it.quantity || 0), 0) || "Flexible"} pcs
                    </span>
                    <span>•</span>
                    <span>Date: {dateStr}</span>
                    {rfq.quotationId && (
                      <>
                        <span>•</span>
                        <Link
                          href={`/dashboard/quotes/${rfq.quotationId}`}
                          className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
                        >
                          Quotation Available
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/rfq/${rfq.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span>Inspect</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
