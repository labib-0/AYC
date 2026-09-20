import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { getStockStatus, StockStatus, LOW_STOCK_THRESHOLD } from "@/services/admin/inventory.service";

export interface StockStatusBadgeProps {
  quantity: number;
  className?: string;
  size?: "sm" | "md";
}

export default function StockStatusBadge({
  quantity,
  className = "",
  size = "sm",
}: StockStatusBadgeProps) {
  const status: StockStatus = getStockStatus(quantity);

  const sizeClasses = size === "sm" 
    ? "text-[10px] px-2 py-0.5 gap-1" 
    : "text-xs px-2.5 py-1 gap-1.5";

  const iconSize = size === "sm" ? 11 : 13;

  if (status === "OUT_OF_STOCK") {
    return (
      <span
        className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 ${sizeClasses} ${className}`}
        title="Out of stock — 0 units available"
      >
        <XCircle size={iconSize} className="shrink-0" />
        <span>Out of Stock</span>
      </span>
    );
  }

  if (status === "LOW_STOCK") {
    return (
      <span
        className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 ${sizeClasses} ${className}`}
        title={`Low stock alert — below threshold of ${LOW_STOCK_THRESHOLD} units`}
      >
        <AlertTriangle size={iconSize} className="shrink-0" />
        <span>Low Stock (&lt;{LOW_STOCK_THRESHOLD})</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ${sizeClasses} ${className}`}
      title="Sufficient stock available"
    >
      <CheckCircle2 size={iconSize} className="shrink-0" />
      <span>In Stock</span>
    </span>
  );
}
