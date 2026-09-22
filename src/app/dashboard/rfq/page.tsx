"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getAllRfqs } from "@/lib/services/rfq";
import { RfqRecord, RfqStatus } from "@/types/b2b";
import {
  FileText,
  Search,
  Plus,
  ChevronRight,
  ArrowRight,
  Globe2,
  Calendar,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

type RfqFilter =
  | "all"
  | "submitted"
  | "under_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "closed";

const FILTER_TABS: { key: RfqFilter; label: string }[] = [
  { key: "all", label: "All RFQs" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "quoted", label: "Quoted" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "closed", label: "Closed" },
];

function getStatusBadge(status: RfqStatus) {
  switch (status) {
    case "SUBMITTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50">
          <Clock size={11} />
          <span>SUBMITTED</span>
        </span>
      );
    case "UNDER_REVIEW":
    case "NEED_INFORMATION":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
          <AlertCircle size={11} />
          <span>UNDER REVIEW</span>
        </span>
      );
    case "QUOTATION_PREPARED":
    case "SENT_TO_BUYER":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50">
          <CheckCircle2 size={11} />
          <span>QUOTED</span>
        </span>
      );
    case "NEGOTIATION":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50">
          <MessageSquare size={11} />
          <span>NEGOTIATION</span>
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
    case "CANCELLED":
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10">
          <XCircle size={11} />
          <span>CLOSED</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
          {status}
        </span>
      );
  }
}

export default function CustomerRfqListPage() {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<RfqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<RfqFilter>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadRfqs() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const data = await getAllRfqs();
        if (!isMounted) return;

        // Strict customer ownership filtering
        const customerRfqs = data.filter(
          (r) =>
            (r.userId && String(r.userId) === String(user.id)) ||
            (r.buyerEmail && user.email && r.buyerEmail.toLowerCase() === user.email.toLowerCase())
        );

        setRfqs(customerRfqs);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to load customer RFQs:", err);
        setError("Unable to load RFQ requests. Please refresh or check connection.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRfqs();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const matchesFilter = (rfq: RfqRecord, filter: RfqFilter): boolean => {
    switch (filter) {
      case "all":
        return true;
      case "submitted":
        return rfq.status === "SUBMITTED";
      case "under_review":
        return rfq.status === "UNDER_REVIEW" || rfq.status === "NEED_INFORMATION";
      case "quoted":
        return (
          rfq.status === "QUOTATION_PREPARED" ||
          rfq.status === "SENT_TO_BUYER" ||
          Boolean(rfq.quotationId)
        );
      case "accepted":
        return rfq.status === "ACCEPTED" || rfq.status === "CONVERTED_TO_ORDER";
      case "rejected":
        return rfq.status === "REJECTED";
      case "closed":
        return (
          rfq.status === "CANCELLED" ||
          rfq.status === "EXPIRED" ||
          rfq.status === "CONVERTED_TO_ORDER"
        );
      default:
        return true;
    }
  };

  const filteredRfqs = useMemo(() => {
    return rfqs.filter((rfq) => {
      if (!matchesFilter(rfq, activeFilter)) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.trim().toLowerCase();
      const numMatch = (rfq.rfqNumber || "").toLowerCase().includes(q);
      const idMatch = (rfq.id || "").toLowerCase().includes(q);
      const titleMatch = (rfq.requestTitle || "").toLowerCase().includes(q);
      const countryMatch = (rfq.destinationCountry || "").toLowerCase().includes(q);
      const cityMatch = (rfq.destinationCity || "").toLowerCase().includes(q);

      return numMatch || idMatch || titleMatch || countryMatch || cityMatch;
    });
  }, [rfqs, activeFilter, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts: Record<RfqFilter, number> = {
      all: rfqs.length,
      submitted: 0,
      under_review: 0,
      quoted: 0,
      accepted: 0,
      rejected: 0,
      closed: 0,
    };

    for (const rfq of rfqs) {
      for (const tab of FILTER_TABS) {
        if (tab.key !== "all" && matchesFilter(rfq, tab.key)) {
          counts[tab.key]++;
        }
      }
    }

    return counts;
  }, [rfqs]);

  return (
    <div className="space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Requests for Quotation (RFQs)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Commercial sourcing inquiries, custom tech packs, and factory volume pricing requests
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-100 transition-colors"
          >
            <span>View Prepared Quotes</span>
            <ArrowRight size={13} />
          </Link>
          <Link
            href="/rfq"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs"
          >
            <Plus size={14} />
            <span>Submit New RFQ</span>
          </Link>
        </div>
      </div>

      {/* Control Bar: Search & Status Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by RFQ number, title, destination country/city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
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
                    ? "bg-amber-500 text-white shadow-xs font-bold"
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
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredRfqs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-10 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText size={26} />
          </div>

          {searchQuery || activeFilter !== "all" ? (
            <>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No RFQs match your filter criteria
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Try clearing your search query or switching to another status tab.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No RFQ Inquiries Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                Submit custom garment specifications, target FOB price targets, and packaging requirements directly to our factory merchandising team.
              </p>
              <Link
                href="/rfq"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
              >
                <Plus size={14} />
                <span>Submit Your First RFQ</span>
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
                  <th className="py-3.5 px-5">RFQ #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Items / Styles</th>
                  <th className="py-3.5 px-4">Total Units</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredRfqs.map((rfq) => {
                  const dateStr = rfq.createdAt
                    ? new Date(rfq.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recent";

                  const totalUnits =
                    rfq.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                  const itemsCount = rfq.items?.length || 0;
                  const destination = `${rfq.destinationCity || "Global"}, ${rfq.destinationCountry}`;

                  return (
                    <tr
                      key={rfq.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* RFQ # */}
                      <td className="py-4 px-5">
                        <Link
                          href={`/dashboard/rfq/${rfq.id}`}
                          className="font-mono font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        >
                          {rfq.rfqNumber || `RFQ #${rfq.id.toString().slice(-8)}`}
                        </Link>
                        {rfq.requestTitle && (
                          <p className="text-[0.6875rem] text-slate-500 truncate max-w-xs mt-0.5">
                            {rfq.requestTitle}
                          </p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                        {dateStr}
                      </td>

                      {/* Items */}
                      <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{itemsCount}</span>{" "}
                        {itemsCount === 1 ? "style" : "styles"}
                      </td>

                      {/* Total Units */}
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        {totalUnits > 0 ? `${totalUnits.toLocaleString()} pcs` : "Flexible"}
                      </td>

                      {/* Destination */}
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                        {destination}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {getStatusBadge(rfq.status)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {rfq.quotationId && (
                            <Link
                              href={`/dashboard/quotes/${rfq.quotationId}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 transition-colors"
                            >
                              <span>Quote</span>
                            </Link>
                          )}
                          <Link
                            href={`/dashboard/rfq/${rfq.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          >
                            <span>Inspect</span>
                            <ChevronRight size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-white/5">
            {filteredRfqs.map((rfq) => {
              const dateStr = rfq.createdAt
                ? new Date(rfq.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recent";

              const totalUnits =
                rfq.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
              const itemsCount = rfq.items?.length || 0;
              const destination = `${rfq.destinationCity || "Global"}, ${rfq.destinationCountry}`;

              return (
                <div key={rfq.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/rfq/${rfq.id}`}
                      className="font-mono font-bold text-xs text-slate-900 dark:text-white hover:text-amber-600 transition-colors"
                    >
                      {rfq.rfqNumber || `RFQ #${rfq.id.toString().slice(-8)}`}
                    </Link>
                    <span className="text-[0.6875rem] text-slate-400">{dateStr}</span>
                  </div>

                  {rfq.requestTitle && (
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1">
                      {rfq.requestTitle}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                    <div>
                      <span className="text-slate-400">Items: </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {itemsCount} styles
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Units: </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {totalUnits > 0 ? `${totalUnits.toLocaleString()} pcs` : "Flexible"}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 truncate">
                    Destination: <span className="font-medium text-slate-700 dark:text-slate-300">{destination}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-white/5">
                    <div>{getStatusBadge(rfq.status)}</div>

                    <div className="flex items-center gap-2">
                      {rfq.quotationId && (
                        <Link
                          href={`/dashboard/quotes/${rfq.quotationId}`}
                          className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          View Quote
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/rfq/${rfq.id}`}
                        className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400"
                      >
                        <span>Details</span>
                        <ChevronRight size={13} />
                      </Link>
                    </div>
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
