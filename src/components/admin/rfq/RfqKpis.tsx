import React from "react";
import { FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
import { RfqSummaryMetrics } from "@/services/admin/rfq.service";

export interface RfqKpisProps {
  metrics: RfqSummaryMetrics | null;
  activeStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  isLoading?: boolean;
}

export default function RfqKpis({
  metrics,
  activeStatusFilter,
  onSelectStatusFilter,
  isLoading = false,
}: RfqKpisProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-border/60 bg-card/60 animate-pulse space-y-2.5"
          >
            <div className="w-16 h-3 bg-secondary rounded" />
            <div className="w-12 h-6 bg-secondary rounded" />
          </div>
        ))}
      </div>
    );
  }

  const rejectedCount = metrics.rejected ?? 0;
  const pendingCount = metrics.pending !== undefined 
    ? metrics.pending 
    : Math.max(0, (metrics.totalRfqs || 0) - (metrics.approved || 0) - rejectedCount);

  const isPendingActive =
    activeStatusFilter === "PENDING" ||
    activeStatusFilter === "SUBMITTED" ||
    activeStatusFilter === "RFQ_RECEIVED" ||
    activeStatusFilter === "UNDER_REVIEW";

  const isApprovedActive = activeStatusFilter === "APPROVED";
  const isRejectedActive = activeStatusFilter === "REJECTED" || activeStatusFilter === "CANCELLED";

  const items = [
    {
      label: "Total RFQs",
      value: metrics.totalRfqs,
      icon: <FileText size={16} className="text-primary" />,
      active: activeStatusFilter === "all",
      onClick: () => onSelectStatusFilter("all"),
      borderColor: "border-border/70",
    },
    {
      label: "RFQ Pending",
      value: pendingCount,
      icon: <Clock size={16} className="text-amber-500" />,
      active: isPendingActive,
      onClick: () => onSelectStatusFilter(isPendingActive ? "all" : "PENDING"),
      borderColor: "border-amber-500/30",
    },
    {
      label: "RFQ Approved",
      value: metrics.approved,
      icon: <CheckCircle2 size={16} className="text-emerald-500" />,
      active: isApprovedActive,
      onClick: () => onSelectStatusFilter(isApprovedActive ? "all" : "APPROVED"),
      borderColor: "border-emerald-500/30",
    },
    {
      label: "RFQ Rejected",
      value: rejectedCount,
      icon: <XCircle size={16} className="text-rose-500" />,
      active: isRejectedActive,
      onClick: () => onSelectStatusFilter(isRejectedActive ? "all" : "REJECTED"),
      borderColor: "border-rose-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {items.map((item, idx) => (
        <button
          key={idx}
          type="button"
          onClick={item.onClick}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            item.active
              ? "bg-card border-primary ring-2 ring-primary/20 shadow-sm"
              : `bg-card/70 hover:bg-card hover:border-foreground/30 ${item.borderColor}`
          }`}
          data-testid={`kpi-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {item.label}
            </span>
            <div className="p-1 rounded-md bg-secondary/60 shrink-0">
              {item.icon}
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">
            {item.value}
          </div>
        </button>
      ))}
    </div>
  );
}
