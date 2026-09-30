import React from "react";
import { formatPrice } from "@/lib/formatters";

export interface PricingTierOptionProps {
  id?: string;
  name: string;
  quantityRange: string;
  unitPrice: number;
  estimatedTotal?: number;
  discountPercent?: number;
  badgeLabel?: string;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * PricingTierOption
 * Selectable commerce row for volume pricing tiers.
 * Provides clear interactive visual affordances: radio indicator, active ring/tint,
 * hover elevation, and responsive price alignment.
 */
export default function PricingTierOption({
  id,
  name,
  quantityRange,
  unitPrice,
  estimatedTotal,
  discountPercent,
  badgeLabel,
  isSelected,
  onSelect,
  disabled = false,
}: PricingTierOptionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  const totalAria = estimatedTotal && estimatedTotal > 0 ? `, ${formatPrice(estimatedTotal)} total` : "";

  return (
    <button
      type="button"
      id={id}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${name} tier: ${quantityRange} at ${unitPrice > 0 ? `${formatPrice(unitPrice)} per piece` : "Price on Request"}${totalAria}`}
      disabled={disabled}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`group w-full grid grid-cols-[30%_35%_35%] items-center px-2.5 sm:px-3 py-1.5 rounded-md cursor-pointer transition-all duration-150 text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
        isSelected
          ? "bg-secondary/50 ring-1 ring-foreground/60 border border-foreground/20 shadow-xs"
          : "hover:bg-secondary/30 text-muted-foreground"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {/* Col 1: Selection Indicator + Tier Name */}
      <div className="flex items-center gap-2 min-w-0 pr-1">
        <span
          className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? "border-foreground bg-foreground text-background"
              : "border-muted-foreground/50 bg-background group-hover:border-foreground/70"
          }`}
          aria-hidden="true"
        >
          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-background shrink-0" />}
        </span>
        <span
          className={`text-[11px] sm:text-[11.5px] uppercase tracking-wider truncate font-display ${
            isSelected ? "font-bold text-foreground" : "font-medium text-foreground/80 group-hover:text-foreground"
          }`}
        >
          {name}
        </span>
      </div>

      {/* Col 2: Quantity Range */}
      <div className="text-[11px] sm:text-[11.5px] font-sans tabular-nums pr-1">
        <span className={isSelected ? "font-semibold text-foreground" : "text-muted-foreground"}>
          {quantityRange}
        </span>
      </div>

      {/* Col 3: Unit Price + Optional Estimated Total */}
      <div className="flex flex-col items-end justify-center text-right pr-0.5">
        <div className="flex items-center justify-end gap-1.5">
          {badgeLabel ? (
            <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/80 text-foreground border border-border/60 tabular-nums shrink-0">
              {badgeLabel}
            </span>
          ) : null}
          <span
            className={`tabular-nums text-[11.5px] sm:text-[12.5px] font-display whitespace-nowrap ${
              isSelected ? "font-extrabold text-foreground" : "font-semibold text-foreground/85"
            }`}
          >
            {unitPrice > 0 ? formatPrice(unitPrice) : "Price on Request"}
          </span>
        </div>
        {estimatedTotal !== undefined && estimatedTotal > 0 && (
          <span className="text-[9.5px] sm:text-[10px] font-sans text-muted-foreground/90 tabular-nums leading-none mt-0.5">
            {formatPrice(estimatedTotal)} total
          </span>
        )}
      </div>
    </button>
  );
}
