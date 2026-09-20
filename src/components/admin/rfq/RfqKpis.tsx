import React from "react";
import { FileText, Clock, FileCheck, CheckCircle2, Package } from "lucide-react";

export interface RfqKpiCounts {
  total: number;
  needsReview: number;
  quoted: number;
  accepted: number;
  totalUnits: number;
}

export interface RfqKpisProps {
  counts: RfqKpiCounts;
  activeStatusFilter?: string;
  onSelectStatusFilter?: (status: string) => void;
  isLoading?: boolean;
}

export default function RfqKpis({
  counts,
  activeStatusFilter,
  onSelectStatusFilter,
  isLoading,
}: RfqKpisProps) {
  const cards = [
    {
      id: "all",
      label: "Total Inquiries",
      value: counts.total,
      icon: FileText,
      color: "text-foreground",
      border: "border-border/70",
      activeBg: "bg-primary/5 border-primary/40",
      filterValue: "all",
    },
    {
      id: "needsReview",
      label: "Needs Review",
      value: counts.needsReview,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/30",
      activeBg: "bg-amber-500/10 border-amber-500/50",
      filterValue: "UNDER_REVIEW",
    },
    {
      id: "quoted",
      label: "Quoted / In Progress",
      value: counts.quoted,
      icon: FileCheck,
      color: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/30",
      activeBg: "bg-purple-500/10 border-purple-500/50",
      filterValue: "QUOTATION_PREPARED",
    },
    {
      id: "accepted",
      label: "Accepted",
      value: counts.accepted,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/30",
      activeBg: "bg-emerald-500/10 border-emerald-500/50",
      filterValue: "ACCEPTED",
    },
    {
      id: "units",
      label: "Total Units Req.",
      value: counts.totalUnits.toLocaleString(),
      icon: Package,
      color: "text-blue-600 dark:text-blue-400",
      border: "border-blue-500/30",
      activeBg: "bg-blue-500/10 border-blue-500/50",
      filterValue: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = Boolean(card.filterValue && onSelectStatusFilter);
        const isActive = card.filterValue && activeStatusFilter === card.filterValue;

        return (
          <button
            key={card.id}
            type="button"
            disabled={!isClickable || isLoading}
            onClick={() => {
              if (card.filterValue && onSelectStatusFilter) {
                onSelectStatusFilter(card.filterValue);
              }
            }}
            className={`p-4 rounded-2xl bg-card border text-left transition-all ${
              card.border
            } ${isActive ? card.activeBg + " shadow-sm ring-1 ring-primary/40" : "shadow-xs hover:border-border"} ${
              isClickable ? "cursor-pointer" : "cursor-default"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">
                {card.label}
              </span>
              <Icon size={16} className={`${card.color} opacity-80 shrink-0`} />
            </div>

            {isLoading ? (
              <div className="h-7 w-16 bg-secondary animate-pulse rounded mt-2" />
            ) : (
              <div className="mt-1">
                <span className={`text-2xl font-display font-bold ${card.color} tracking-tight`}>
                  {card.value}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
