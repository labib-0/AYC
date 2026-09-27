import React from "react";
import { FileText, Clock, FileSearch, CheckCircle2, FileCheck } from "lucide-react";
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
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
      label: "Received",
      value: metrics.received,
      icon: <Clock size={16} className="text-blue-500" />,
      active: activeStatusFilter === "SUBMITTED" || activeStatusFilter === "RFQ_RECEIVED",
      onClick: () =>
        onSelectStatusFilter(
          activeStatusFilter === "SUBMITTED" || activeStatusFilter === "RFQ_RECEIVED" ? "all" : "SUBMITTED"
        ),
      borderColor: "border-blue-500/30",
    },
    {
      label: "Under Review",
      value: metrics.underReview,
      icon: <FileSearch size={16} className="text-amber-500" />,
      active: activeStatusFilter === "UNDER_REVIEW",
      onClick: () =>
        onSelectStatusFilter(activeStatusFilter === "UNDER_REVIEW" ? "all" : "UNDER_REVIEW"),
      borderColor: "border-amber-500/30",
    },
    {
      label: "Approved",
      value: metrics.approved,
      icon: <CheckCircle2 size={16} className="text-emerald-500" />,
      active: activeStatusFilter === "APPROVED",
      onClick: () =>
        onSelectStatusFilter(activeStatusFilter === "APPROVED" ? "all" : "APPROVED"),
      borderColor: "border-emerald-500/30",
    },
    {
      label: "Quotation Generated",
      value: metrics.quotationGenerated,
      icon: <FileCheck size={16} className="text-indigo-500" />,
      active:
        activeStatusFilter === "QUOTATION_GENERATED" ||
        activeStatusFilter === "QUOTATION_APPROVED" ||
        activeStatusFilter === "PAID",
      onClick: () =>
        onSelectStatusFilter(
          activeStatusFilter === "QUOTATION_GENERATED" ? "all" : "QUOTATION_GENERATED"
        ),
      borderColor: "border-indigo-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
