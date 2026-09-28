"use client";

import { Package, CheckCircle2, FileText, AlertTriangle, Clock } from "lucide-react";

interface ProductSummaryMetricsProps {
  total: number;
  published: number;
  draft: number;
  lowStock: number;
  purchasePricePending?: number;
  onPurchasePricePendingClick?: () => void;
}

export default function ProductSummaryMetrics({
  total,
  published,
  draft,
  lowStock,
  purchasePricePending,
  onPurchasePricePendingClick,
}: ProductSummaryMetricsProps) {
  const baseCard = "bg-card border border-border/60 rounded-xl px-4 py-3.5 flex items-center gap-3";

  const staticMetrics = [
    { label: "Total Products", value: total, icon: Package, color: "text-foreground" },
    { label: "Published", value: published, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Draft", value: draft, icon: FileText, color: "text-amber-600 dark:text-amber-400" },
    { label: "Low Stock", value: lowStock, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
  ];

  const cols = purchasePricePending !== undefined
    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
    : "grid grid-cols-2 sm:grid-cols-4 gap-3";

  return (
    <div className={cols}>
      {staticMetrics.map((m) => {
        const Icon = m.icon;
        return (
          <div key={m.label} className={baseCard}>
            <div className={`${m.color} shrink-0`}>
              <Icon size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                {m.label}
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground leading-tight">
                {m.value.toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}

      {purchasePricePending !== undefined && (
        <button
          type="button"
          onClick={onPurchasePricePendingClick}
          className={`${baseCard} text-left w-full transition-all hover:shadow-sm ${
            purchasePricePending > 0
              ? "border-amber-300 dark:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
              : "hover:bg-secondary/40"
          }`}
          title="Click to filter by Purchase Price Pending"
        >
          <div className={`shrink-0 ${purchasePricePending > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            <Clock size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] font-bold uppercase tracking-widest truncate ${purchasePricePending > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
              Price Pending
            </p>
            <p className="text-lg font-bold tabular-nums text-foreground leading-tight">
              {purchasePricePending.toLocaleString()}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
