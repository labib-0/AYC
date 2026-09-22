import React from "react";
import { Package, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { InventorySummary, LOW_STOCK_THRESHOLD } from "@/services/admin/inventory.service";

export interface InventoryKpisProps {
  summary: InventorySummary;
  selectedStatus?: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  onSelectStatus?: (status: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK") => void;
  isLoading?: boolean;
}

export default function InventoryKpis({
  summary,
  selectedStatus = "ALL",
  onSelectStatus,
  isLoading = false,
}: InventoryKpisProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl border border-border/70 bg-card shadow-xs animate-pulse space-y-2"
          >
            <div className="h-3.5 w-24 bg-secondary rounded" />
            <div className="h-7 w-16 bg-secondary rounded-lg" />
            <div className="h-3 w-32 bg-secondary rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      id: "ALL" as const,
      label: "Total Items",
      value: summary.totalItems,
      subtitle: `${summary.totalQuantity.toLocaleString()} total units`,
      icon: Package,
      iconColor: "text-foreground",
      activeRing: "ring-2 ring-foreground/20 border-foreground/40",
      badge: "Catalog",
      badgeColor: "bg-secondary text-foreground",
    },
    {
      id: "IN_STOCK" as const,
      label: "In Stock",
      value: summary.inStock,
      subtitle: `≥ ${LOW_STOCK_THRESHOLD} units threshold`,
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      activeRing: "ring-2 ring-emerald-500/30 border-emerald-500/50",
      badge: "Optimal",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    },
    {
      id: "LOW_STOCK" as const,
      label: "Low Stock",
      value: summary.lowStock,
      subtitle: `< ${LOW_STOCK_THRESHOLD} units alert`,
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      activeRing: "ring-2 ring-amber-500/30 border-amber-500/50",
      badge: "Action Req.",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    },
    {
      id: "OUT_OF_STOCK" as const,
      label: "Out of Stock",
      value: summary.outOfStock,
      subtitle: "0 available units",
      icon: XCircle,
      iconColor: "text-rose-500",
      activeRing: "ring-2 ring-rose-500/30 border-rose-500/50",
      badge: "Depleted",
      badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = selectedStatus === c.id;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              if (onSelectStatus) {
                // Clicking active status toggles back to ALL
                onSelectStatus(isSelected && c.id !== "ALL" ? "ALL" : c.id);
              }
            }}
            className={`p-4 rounded-2xl border bg-card text-left transition-all shadow-xs cursor-pointer group relative overflow-hidden ${
              isSelected
                ? `${c.activeRing} bg-secondary/15`
                : "border-border/70 hover:border-foreground/30 hover:bg-secondary/10"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.badgeColor}`}>
                {c.badge}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
                {c.value.toLocaleString()}
              </span>
              <Icon size={18} className={`${c.iconColor} shrink-0`} />
            </div>

            <p className="text-[11px] text-muted-foreground mt-1">
              {c.subtitle}
            </p>

            {isSelected && c.id !== "ALL" && (
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider mt-1 block">
                ● Filter Active (click to reset)
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
