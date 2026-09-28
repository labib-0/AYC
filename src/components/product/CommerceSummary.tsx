import React from "react";
import { formatPrice } from "@/lib/formatters";

export interface CommerceSummaryProps {
  totalAmount: number;
  quantity: number;
  unitPrice: number;
  activeTierName?: string;
  unitLabel?: string;
  className?: string;
}

/**
 * CommerceSummary
 * Dedicated commercial summary block for real-time estimated order totals.
 * Explicitly connects selected volume tier, unit price, and total price.
 */
export default function CommerceSummary({
  totalAmount,
  activeTierName,
  className = "",
}: CommerceSummaryProps) {
  return (
    <div
      className={`rounded-xl border border-border/80 bg-secondary/25 p-3 sm:p-3.5 flex flex-col justify-between space-y-1.5 transition-all ${className}`}
      aria-label="Order estimated commercial total"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-[11.5px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          Est. Total
        </span>
        {activeTierName && (
          <span className="text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {activeTierName}
          </span>
        )}
      </div>

      <div className="text-2xl sm:text-[26px] font-display font-extrabold text-foreground tabular-nums tracking-tight leading-tight">
        {formatPrice(totalAmount)}
      </div>
    </div>
  );
}
