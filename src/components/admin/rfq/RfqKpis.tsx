import React from "react";
import { FileText, Clock, FileCheck, CheckCircle2, Package, CalendarClock } from "lucide-react";
import { DateQuickFilter } from "@/lib/rfq-datetime";

export interface RfqKpiCounts {
  total: number;
  needsReview: number;
  quoted: number;
  accepted: number;
  totalUnits: number;
}

export interface RfqTodaySummaryData {
  todayTotal: number;
  todayNew: number;
  latestRfqDateFormatted: string;
  latestRfqNumber?: string;
}

export interface RfqKpisProps {
  counts: RfqKpiCounts;
  todaySummary?: RfqTodaySummaryData;
  activeStatusFilter?: string;
  onSelectStatusFilter?: (status: string) => void;
  activeDateFilter?: DateQuickFilter;
  onSelectDateFilter?: (filter: DateQuickFilter) => void;
  isLoading?: boolean;
}

export default function RfqKpis({
  counts,
  todaySummary,
  activeStatusFilter,
  onSelectStatusFilter,
  activeDateFilter,
  onSelectDateFilter,
  isLoading,
}: RfqKpisProps) {
  const isTodayActive = activeDateFilter === "TODAY";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
      {/* 1. Today's Activity Tile */}
      <button
        type="button"
        disabled={isLoading || !onSelectDateFilter}
        onClick={() => {
          if (onSelectDateFilter) {
            onSelectDateFilter(isTodayActive ? "ALL" : "TODAY");
          }
        }}
        className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
          isTodayActive
            ? "bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/30 shadow-xs"
            : "bg-card border-border/70 hover:border-blue-500/40 hover:bg-secondary/10 shadow-2xs"
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Today&apos;s RFQs
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            Today
          </span>
        </div>

        {isLoading ? (
          <div className="h-7 w-12 bg-secondary animate-pulse rounded mt-1" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-display font-bold text-foreground tracking-tight">
              {todaySummary?.todayTotal ?? 0}
            </span>
            <CalendarClock size={16} className="text-blue-600 dark:text-blue-400 opacity-90 shrink-0" />
          </div>
        )}

        <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
          {todaySummary?.todayNew ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {todaySummary.todayNew} New
            </span>
          ) : (
            <span>0 New</span>
          )}
          <span className="mx-1">•</span>
          <span>Latest: {todaySummary?.latestRfqDateFormatted || "—"}</span>
        </div>

        {isTodayActive && (
          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-1 block">
            ● Filter Active
          </span>
        )}
      </button>

      {/* 2. Total Inquiries */}
      <button
        type="button"
        disabled={isLoading || !onSelectStatusFilter}
        onClick={() => {
          if (onSelectStatusFilter) onSelectStatusFilter("all");
          if (onSelectDateFilter && activeDateFilter === "TODAY") onSelectDateFilter("ALL");
        }}
        className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === "all" && !isTodayActive
            ? "bg-secondary/20 border-foreground/30 ring-1 ring-foreground/20 shadow-xs"
            : "bg-card border-border/70 hover:border-foreground/30 hover:bg-secondary/10 shadow-2xs"
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Total Inquiries
          </span>
          <FileText size={14} className="text-foreground opacity-70 shrink-0" />
        </div>

        {isLoading ? (
          <div className="h-7 w-12 bg-secondary animate-pulse rounded mt-1" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-display font-bold text-foreground tracking-tight">
              {counts.total}
            </span>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground mt-1 truncate">
          All-time inquiries
        </div>
      </button>

      {/* 3. Needs Review */}
      <button
        type="button"
        disabled={isLoading || !onSelectStatusFilter}
        onClick={() => {
          if (onSelectStatusFilter) {
            onSelectStatusFilter(activeStatusFilter === "UNDER_REVIEW" ? "all" : "UNDER_REVIEW");
          }
        }}
        className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === "UNDER_REVIEW"
            ? "bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/30 shadow-xs"
            : "bg-card border-border/70 hover:border-amber-500/40 hover:bg-secondary/10 shadow-2xs"
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Needs Review
          </span>
          <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
        </div>

        {isLoading ? (
          <div className="h-7 w-12 bg-secondary animate-pulse rounded mt-1" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-display font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {counts.needsReview}
            </span>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground mt-1 truncate">
          Action required
        </div>
      </button>

      {/* 4. Quoted */}
      <button
        type="button"
        disabled={isLoading || !onSelectStatusFilter}
        onClick={() => {
          if (onSelectStatusFilter) {
            onSelectStatusFilter(activeStatusFilter === "QUOTATION_PREPARED" ? "all" : "QUOTATION_PREPARED");
          }
        }}
        className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === "QUOTATION_PREPARED"
            ? "bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/30 shadow-xs"
            : "bg-card border-border/70 hover:border-purple-500/40 hover:bg-secondary/10 shadow-2xs"
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Quoted
          </span>
          <FileCheck size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
        </div>

        {isLoading ? (
          <div className="h-7 w-12 bg-secondary animate-pulse rounded mt-1" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-display font-bold text-purple-600 dark:text-purple-400 tracking-tight">
              {counts.quoted}
            </span>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground mt-1 truncate">
          Prepared / Sent
        </div>
      </button>

      {/* 5. Accepted */}
      <button
        type="button"
        disabled={isLoading || !onSelectStatusFilter}
        onClick={() => {
          if (onSelectStatusFilter) {
            onSelectStatusFilter(activeStatusFilter === "ACCEPTED" ? "all" : "ACCEPTED");
          }
        }}
        className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === "ACCEPTED"
            ? "bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-xs"
            : "bg-card border-border/70 hover:border-emerald-500/40 hover:bg-secondary/10 shadow-2xs"
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Accepted
          </span>
          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>

        {isLoading ? (
          <div className="h-7 w-12 bg-secondary animate-pulse rounded mt-1" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {counts.accepted}
            </span>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground mt-1 truncate">
          Won export orders
        </div>
      </button>

      {/* 6. Total Units */}
      <div className="p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-card text-left shadow-2xs">
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Total Units Req.
          </span>
          <Package size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
        </div>

        {isLoading ? (
          <div className="h-7 w-16 bg-secondary animate-pulse rounded mt-1" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-display font-bold text-foreground tracking-tight">
              {counts.totalUnits.toLocaleString()}
            </span>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground mt-1 truncate">
          Aggregate volume
        </div>
      </div>
    </div>
  );
}
