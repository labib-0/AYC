"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getAllQuotations } from "@/lib/services/quotations";
import { getAllRfqs } from "@/lib/services/rfq";
import { QuotationRecord, QuotationStatus } from "@/types/b2b";
import {
  FileText,
  Search,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  MessageSquare,
  DollarSign,
  X,
  ExternalLink,
} from "lucide-react";

type QuoteFilter =
  | "all"
  | "ready"
  | "negotiation"
  | "accepted"
  | "rejected"
  | "expired";

const FILTER_TABS: { key: QuoteFilter; label: string }[] = [
  { key: "all", label: "All Quotations" },
  { key: "ready", label: "Ready / Review" },
  { key: "negotiation", label: "Negotiation" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
];

function formatUSD(amount: number): string {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getQuotationStatusBadge(status: QuotationStatus) {
  switch (status) {
    case "READY":
    case "SENT":
    case "VIEWED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50 animate-pulse">
          <Clock size={11} />
          <span>READY FOR REVIEW</span>
        </span>
      );
    case "NEGOTIATION":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50">
          <MessageSquare size={11} />
          <span>IN NEGOTIATION</span>
        </span>
      );
    case "ACCEPTED":
    case "CONVERTED_TO_ORDER":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
          <CheckCircle2 size={11} />
          <span>ACCEPTED</span>
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50">
          <XCircle size={11} />
          <span>REJECTED</span>
        </span>
      );
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10">
          <AlertCircle size={11} />
          <span>EXPIRED</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}

export default function CustomerQuotesListPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuoteFilter>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadQuotations() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const [allQuotes, allRfqs] = await Promise.all([
          getAllQuotations(),
          getAllRfqs(),
        ]);

        if (!isMounted) return;

        // Determine user's owned RFQ IDs for cross-referencing
        const userRfqIds = new Set(
          allRfqs
            .filter(
              (r) =>
                (r.userId && String(r.userId) === String(user.id)) ||
                (r.buyerEmail && user.email && r.buyerEmail.toLowerCase() === user.email.toLowerCase())
            )
            .map((r) => r.id)
        );

        // Strict customer ownership filtering
        const ownedQuotes = allQuotes.filter(
          (q) =>
            (q.buyerEmail && user.email && q.buyerEmail.toLowerCase() === user.email.toLowerCase()) ||
            userRfqIds.has(q.rfqId)
        );

        setQuotations(ownedQuotes);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to load quotations:", err);
        setError("Unable to load commercial quotations. Please refresh.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadQuotations();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const matchesFilter = (quote: QuotationRecord, filter: QuoteFilter): boolean => {
    switch (filter) {
      case "all":
        return true;
      case "ready":
        return (
          quote.status === "READY" ||
          quote.status === "SENT" ||
          quote.status === "VIEWED"
        );
      case "negotiation":
        return quote.status === "NEGOTIATION";
      case "accepted":
        return quote.status === "ACCEPTED" || quote.status === "CONVERTED_TO_ORDER";
      case "rejected":
        return quote.status === "REJECTED";
      case "expired":
        return quote.status === "EXPIRED";
      default:
        return true;
    }
  };

  const filteredQuotes = useMemo(() => {
    return quotations.filter((quote) => {
      if (!matchesFilter(quote, activeFilter)) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.trim().toLowerCase();
      const numMatch = (quote.quotationNumber || "").toLowerCase().includes(q);
      const rfqMatch = (quote.rfqNumber || "").toLowerCase().includes(q);
      const destMatch = (quote.destinationCountry || "").toLowerCase().includes(q);

      return numMatch || rfqMatch || destMatch;
    });
  }, [quotations, activeFilter, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts: Record<QuoteFilter, number> = {
      all: quotations.length,
      ready: 0,
      negotiation: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    };

    for (const q of quotations) {
      for (const tab of FILTER_TABS) {
        if (tab.key !== "all" && matchesFilter(q, tab.key)) {
          counts[tab.key]++;
        }
      }
    }

    return counts;
  }, [quotations]);

  return (
    <div className="space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Commercial Quotations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official export pricing, proforma invoices, Incoterms, and factory payment agreements
          </p>
        </div>

        <Link
          href="/dashboard/rfq"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors self-start sm:self-center"
        >
          <span>View RFQ Inquiries</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by quote # (e.g. QT-2026...), RFQ #, destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count = tabCounts[tab.key];

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "bg-purple-600 text-white shadow-xs font-bold"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100",
                ].join(" ")}
              >
                <span>{tab.label}</span>
                <span
                  className={[
                    "px-1.5 py-0.2 rounded-md text-[0.625rem]",
                    isActive
                      ? "bg-black/20 text-white"
                      : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table / Cards */}
      {error ? (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-6 text-center">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 shadow-2xs space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-10 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
            <DollarSign size={28} />
          </div>

          {searchQuery || activeFilter !== "all" ? (
            <>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No quotations match your filters
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Try searching for a different quotation or RFQ reference.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No Commercial Quotations Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                When you submit an RFQ, our sales export department will calculate unit pricing, container freight, and issue an official quotation here.
              </p>
              <Link
                href="/rfq"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
              >
                <span>Submit an RFQ</span>
                <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-white/5 text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-5">Quote #</th>
                  <th className="py-3.5 px-4">RFQ #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Grand Total USD</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Valid Until</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredQuotes.map((quote) => {
                  const dateStr = quote.createdAt
                    ? new Date(quote.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recent";

                  const destination = `${quote.destinationCity || ""}, ${quote.destinationCountry}`;

                  return (
                    <tr
                      key={quote.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Quote # */}
                      <td className="py-4 px-5">
                        <Link
                          href={`/dashboard/quotes/${quote.id}`}
                          className="font-mono font-bold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        >
                          {quote.quotationNumber}
                        </Link>
                        {quote.revisionNumber && quote.revisionNumber > 1 && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[0.625rem] font-mono bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                            Rev {quote.revisionNumber}
                          </span>
                        )}
                      </td>

                      {/* RFQ # */}
                      <td className="py-4 px-4 font-mono text-slate-500 dark:text-slate-400">
                        <Link
                          href={`/dashboard/rfq/${quote.rfqId}`}
                          className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline"
                        >
                          {quote.rfqNumber || quote.rfqId}
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                        {dateStr}
                      </td>

                      {/* Destination */}
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                        {destination}
                      </td>

                      {/* Grand Total USD */}
                      <td className="py-4 px-4 font-black text-slate-900 dark:text-white">
                        {formatUSD(quote.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {getQuotationStatusBadge(quote.status)}
                      </td>

                      {/* Valid Until */}
                      <td className="py-4 px-4 text-slate-500 dark:text-slate-400 text-[0.6875rem]">
                        {quote.validUntil || "30 Days from issuance"}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/dashboard/quotes/${quote.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                        >
                          <span>View Quote</span>
                          <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-white/5">
            {filteredQuotes.map((quote) => {
              const dateStr = quote.createdAt
                ? new Date(quote.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recent";

              return (
                <div key={quote.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/quotes/${quote.id}`}
                      className="font-mono font-bold text-xs text-slate-900 dark:text-white hover:text-purple-600 transition-colors"
                    >
                      {quote.quotationNumber}
                    </Link>
                    <span className="text-[0.6875rem] text-slate-400">{dateStr}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      RFQ: <Link href={`/dashboard/rfq/${quote.rfqId}`} className="font-mono font-medium hover:underline text-slate-700 dark:text-slate-300">{quote.rfqNumber || quote.rfqId}</Link>
                    </span>
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {formatUSD(quote.grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                    <div>{getQuotationStatusBadge(quote.status)}</div>

                    <Link
                      href={`/dashboard/quotes/${quote.id}`}
                      className="inline-flex items-center gap-0.5 text-xs font-bold text-purple-600 dark:text-purple-400"
                    >
                      <span>View Quote</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
