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
      className={`rounded-lg border border-border/80 bg-secondary/25 p-2 sm:p-2.5 flex flex-col justify-between space-y-1 transition-all ${className}`}
      aria-label="Order estimated commercial total"
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          Est. Total
        </span>
        {activeTierName && (
          <span className="text-[9.5px] font-display font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
            {activeTierName}
          </span>
        )}
      </div>

      <div className="text-xl sm:text-[22px] font-display font-extrabold text-foreground tabular-nums tracking-tight leading-tight">
        {formatPrice(totalAmount)}
      </div>
    </div>
  );
}
