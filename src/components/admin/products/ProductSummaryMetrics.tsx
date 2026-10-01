"use client";

import { Package, CheckCircle2, FileText, AlertTriangle, Clock } from "lucide-react";

interface ProductSummaryMetricsProps {
  total: number;
  published: number;
  draft: number;
  lowStock: number;
  purchasePricePending?: number;
  activeStatus?: string;
  onStatusClick?: (status: "all" | "published" | "draft") => void;
  onPurchasePricePendingClick?: () => void;
  isPricePendingActive?: boolean;
}

export default function ProductSummaryMetrics({
  total,
  published,
  draft,
  lowStock,
  purchasePricePending,
  activeStatus = "all",
  onStatusClick,
  onPurchasePricePendingClick,
  isPricePendingActive = false,
}: ProductSummaryMetricsProps) {
  const baseCard =
    "border rounded-xl px-4 py-3.5 flex items-center gap-3 transition-all duration-150 text-left w-full cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const isTotalActive = activeStatus === "all" && !isPricePendingActive;
  const isPublishedActive = activeStatus === "published";
  const isDraftActive = activeStatus === "draft";

  const cards = [
    {
      id: "all" as const,
      label: "Total Products",
      value: total,
      icon: Package,
      color: "text-foreground",
      isActive: isTotalActive,
      activeClasses: "bg-secondary border-foreground/30 shadow-xs",
      defaultClasses: "bg-card border-border/60 hover:bg-secondary/40 hover:border-border",
      title: "View all products",
      onClick: () => onStatusClick?.("all"),
    },
    {
      id: "published" as const,
      label: "Published",
      value: published,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      isActive: isPublishedActive,
      activeClasses:
        "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-xs",
      defaultClasses: "bg-card border-border/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/15 hover:border-emerald-300 dark:hover:border-emerald-800",
      title: isPublishedActive ? "Click to clear Published filter" : "Filter by Published products",
      onClick: () => onStatusClick?.(isPublishedActive ? "all" : "published"),
    },
    {
      id: "draft" as const,
      label: "Draft",
      value: draft,
      icon: FileText,
      color: "text-amber-600 dark:text-amber-400",
      isActive: isDraftActive,
      activeClasses:
        "bg-amber-500/15 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-xs font-semibold",
      defaultClasses: "bg-card border-border/60 hover:bg-amber-500/10 dark:hover:bg-amber-950/20 hover:border-amber-400 dark:hover:border-amber-700",
      title: isDraftActive ? "Click to clear Draft filter" : "Filter to ONLY Draft products",
      onClick: () => onStatusClick?.(isDraftActive ? "all" : "draft"),
    },
    {
      id: "low_stock" as const,
      label: "Low Stock",
      value: lowStock,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      isActive: false,
      activeClasses: "bg-card border-border/60",
      defaultClasses: "bg-card border-border/60 hover:bg-secondary/40",
      title: "Products below low stock threshold",
      onClick: undefined,
    },
  ];

  const cols =
    purchasePricePending !== undefined
      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      : "grid grid-cols-2 sm:grid-cols-4 gap-3";

  return (
    <div className={cols} role="region" aria-label="Product Catalog Metrics and Filters">
      {cards.map((c) => {
        const Icon = c.icon;
        const Component = c.onClick ? "button" : "div";

        return (
          <Component
            key={c.label}
            type={c.onClick ? "button" : undefined}
            onClick={c.onClick}
            title={c.title}
            aria-pressed={c.onClick ? c.isActive : undefined}
            className={`${baseCard} ${c.isActive ? c.activeClasses : c.defaultClasses} ${
              !c.onClick ? "cursor-default" : ""
            }`}
          >
            <div className={`${c.color} shrink-0`}>
              <Icon size={18} strokeWidth={c.isActive ? 2.5 : 2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p
                  className={`text-[11px] font-bold uppercase tracking-widest truncate ${
                    c.isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {c.label}
                </p>
                {c.isActive && c.id !== "all" && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Active
                  </span>
                )}
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground leading-tight mt-0.5">
                {c.value.toLocaleString()}
              </p>
            </div>
          </Component>
        );
      })}

      {purchasePricePending !== undefined && (
        <button
          type="button"
          onClick={onPurchasePricePendingClick}
          aria-pressed={isPricePendingActive}
          className={`${baseCard} ${
            isPricePendingActive
              ? "bg-amber-500/15 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-xs"
              : purchasePricePending > 0
              ? "border-amber-300 dark:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 bg-card"
              : "border-border/60 bg-card hover:bg-secondary/40"
          }`}
          title={isPricePendingActive ? "Click to clear Price Pending filter" : "Click to filter by Purchase Price Pending"}
        >
          <div
            className={`shrink-0 ${
              isPricePendingActive || purchasePricePending > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            }`}
          >
            <Clock size={18} strokeWidth={isPricePendingActive ? 2.5 : 2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p
                className={`text-[11px] font-bold uppercase tracking-widest truncate ${
                  isPricePendingActive || purchasePricePending > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                Price Pending
              </p>
              {isPricePendingActive && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active
                </span>
              )}
            </div>
            <p className="text-lg font-bold tabular-nums text-foreground leading-tight mt-0.5">
              {purchasePricePending.toLocaleString()}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
