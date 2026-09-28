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
    <div className="space-y-1" id={id}>
      <div className="flex items-center gap-2">
        <div className="flex items-center h-8 sm:h-8.5 border border-border/90 rounded-md bg-card shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
          {/* Decrement Button */}
          <button
            type="button"
            onClick={onDecrement}
            disabled={isDecrementDisabled}
            className="w-8 sm:w-8.5 h-full flex items-center justify-center text-foreground hover:bg-secondary/70 active:bg-secondary transition-colors cursor-pointer select-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            aria-label={`Decrease quantity by ${stepAmount}`}
            title={isDecrementDisabled ? `Minimum order quantity is ${moq} ${unitLabel}` : undefined}
          >
            <Minus size={13} strokeWidth={2.5} />
          </button>

          {/* Quantity Display */}
          <div
            className="min-w-16 px-2.5 py-0.5 flex items-center justify-center border-x border-border/60"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="font-display font-bold text-[13px] sm:text-[14px] text-foreground tabular-nums select-none leading-none">
              {quantity.toLocaleString()}
            </span>
          </div>

          {/* Increment Button */}
          <button
            type="button"
            onClick={onIncrement}
            disabled={isIncrementDisabled}
            className="w-8 sm:w-8.5 h-full flex items-center justify-center text-foreground hover:bg-secondary/70 active:bg-secondary transition-colors cursor-pointer select-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            aria-label={`Increase quantity by ${stepAmount}`}
            title={
              isIncrementDisabled && maxStock
                ? `Maximum available stock is ${maxStock.toLocaleString()} ${unitLabel}`
                : undefined
            }
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
        </div>

        <span className="text-[11px] sm:text-[11.5px] font-sans font-semibold text-muted-foreground uppercase tracking-wider">
          {unitLabel.toUpperCase()}
        </span>
      </div>

      {helperText ? (
        <div className="text-[11px] sm:text-[11.5px] font-sans text-muted-foreground/85 leading-tight">
          {helperText}
        </div>
      ) : null}
    </div>
  );
}
