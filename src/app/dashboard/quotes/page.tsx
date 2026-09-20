"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllRfqs } from "@/lib/services/rfq";
import { RfqRecord } from "@/types/b2b";
import { 
  FileText, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Package, 
  Globe2,
  Plus
} from "lucide-react";

export default function BuyerQuotesPage() {
  const [rfqs, setRfqs] = useState<RfqRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getAllRfqs();
      setRfqs(data);
      setLoading(false);
    }
    load();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">SUBMITTED</span>;
      case "UNDER_REVIEW":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">UNDER REVIEW</span>;
      case "QUOTATION_PREPARED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">QUOTE READY</span>;
      case "ACCEPTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">ACCEPTED</span>;
      case "NEGOTIATION":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">IN NEGOTIATION</span>;
      case "REJECTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/15 text-destructive">REJECTED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-foreground">{status}</span>;
    }
  };

  return (
    <div className="w-full bg-background min-h-screen py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        
        {/* Header */}
        <div className="pb-6 border-b border-border/70 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={22} className="text-primary" />
              <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
                My Quotation Requests
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Track your B2B wholesale inquiries, export pricing, commercial quotes, and proforma invoices.
            </p>
          </div>

          <Link
            href="/rfq"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity self-start sm:self-auto shadow-sm"
          >
            <Plus size={14} />
            <span>New RFQ Request</span>
          </Link>
        </div>

        {/* Quotes List Table / Cards */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs uppercase tracking-wider font-bold">Loading inquiries...</p>
          </div>
        ) : rfqs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {rfqs.map((rfq) => (
              <div
                key={rfq.id}
                className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-foreground/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0 border border-border">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {rfq.rfqNumber}
                      </span>
                      {getStatusBadge(rfq.status)}
                    </div>
                    <h3 className="text-base font-bold text-foreground mt-1 truncate max-w-md">
                      {rfq.requestTitle || `${rfq.items.length} Products Inquiry`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                      <span className="flex items-center gap-1">
                        <Globe2 size={13} />
                        {rfq.destinationCity}, {rfq.destinationCountry}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package size={13} />
                        {rfq.items.reduce((acc, i) => acc + i.quantity, 0)} Total Pcs ({rfq.items.length} Lines)
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {new Date(rfq.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-center">
                  <Link
                    href={`/dashboard/quotes/${rfq.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <span>View RFQ Details</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
            <FileText size={36} className="mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="text-base font-bold uppercase text-foreground mb-1">
              No Quotation Requests Found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
              You haven&apos;t submitted any wholesale RFQ requests yet.
            </p>
            <Link
              href="/rfq"
              className="px-6 py-3 rounded-full bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Create Quote Request</span>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
