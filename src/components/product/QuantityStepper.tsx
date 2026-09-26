import React from "react";
import { Minus, Plus } from "lucide-react";

export interface QuantityStepperProps {
  id?: string;
  quantity: number;
  moq: number;
  step?: number;
  maxStock?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  isDecrementDisabled: boolean;
  isIncrementDisabled: boolean;
  unitLabel?: string;
  helperText?: string;
}

/**
 * QuantityStepper
 * Dedicated B2B commerce stepper control.
 * Features tactile increment/decrement controls, high-contrast borders,
 * prominent tabular numbers, and accessible states.
 */
export default function QuantityStepper({
  id = "quantity-stepper",
  quantity,
  moq,
  step,
  maxStock,
  onIncrement,
  onDecrement,
  isDecrementDisabled,
  isIncrementDisabled,
  unitLabel = "pcs",
  helperText,
}: QuantityStepperProps) {
  const stepAmount = step || moq;

  return (
    <div className="space-y-1.5" id={id}>
      <div className="flex items-center gap-2">
        <div className="flex items-center h-10 border border-border/90 rounded-lg bg-card shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
          {/* Decrement Button */}
          <button
            type="button"
            onClick={onDecrement}
            disabled={isDecrementDisabled}
            className="w-10 h-full flex items-center justify-center text-foreground hover:bg-secondary/70 active:bg-secondary transition-colors cursor-pointer select-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            aria-label={`Decrease quantity by ${stepAmount}`}
            title={isDecrementDisabled ? `Minimum order quantity is ${moq} ${unitLabel}` : undefined}
          >
            <Minus size={15} strokeWidth={2.5} />
          </button>

          {/* Quantity Display (Prominent Package Count with Total Pieces) */}
          <div
            className="min-w-24 px-3 py-1 flex flex-col items-center justify-center border-x border-border/60"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="font-display font-bold text-[14px] sm:text-[15px] text-foreground tabular-nums select-none leading-none">
              {moq > 0 ? `${Math.round(quantity / moq)} ${Math.round(quantity / moq) === 1 ? "pkg" : "pkgs"}` : quantity.toLocaleString()}
            </span>
            {moq > 1 && (
              <span className="text-[10.5px] font-sans font-medium text-muted-foreground tabular-nums select-none leading-none mt-0.5">
                {quantity.toLocaleString()} pcs
              </span>
            )}
          </div>

          {/* Increment Button */}
          <button
            type="button"
            onClick={onIncrement}
            disabled={isIncrementDisabled}
            className="w-10 h-full flex items-center justify-center text-foreground hover:bg-secondary/70 active:bg-secondary transition-colors cursor-pointer select-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            aria-label={`Increase quantity by ${stepAmount}`}
            title={
              isIncrementDisabled && maxStock
                ? `Maximum available stock is ${maxStock.toLocaleString()} ${unitLabel}`
                : undefined
            }
          >
            <Plus size={15} strokeWidth={2.5} />
          </button>
        </div>

        <span className="text-[12px] font-sans font-semibold text-muted-foreground uppercase tracking-wider">
          {moq > 0 ? "Packages" : unitLabel}
        </span>
      </div>

      <div className="text-[11px] sm:text-[11.5px] font-sans text-muted-foreground/85 leading-tight">
        {helperText || `Multiples of ${moq} ${unitLabel}`}
      </div>
    </div>
  );
}
