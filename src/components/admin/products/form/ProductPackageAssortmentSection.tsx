"use client";

import { useState, useMemo } from "react";
import { Package, AlertCircle } from "lucide-react";
import { PackageAllocation } from "@/types";

const UNIVERSAL_PACKAGE_NAME = "Universal Package";

interface ProductPackageAssortmentSectionProps {
  colors: string[];
  sizes: string[];
  allocations: PackageAllocation[];
  moq: number;
  onAllocationsChange: (allocations: PackageAllocation[]) => void;
  onSyncMoq?: (newMoq: number) => void;
  errors?: Record<string, string>;
}

export default function ProductPackageAssortmentSection({
  colors,
  sizes,
  allocations,
  moq,
  onAllocationsChange,
  errors = {},
}: ProductPackageAssortmentSectionProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  // Lookup map: `${color}__${size}` -> number | undefined
  // undefined means unconfigured (displays "—"), 0 means intentionally excluded, >0 means exact units in package
  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    allocations.forEach((a) => {
      const c = a.color || "";
      const s = a.size || "";
      if (c && s && typeof a.quantity === "number") {
        map.set(`${c}__${s}`, a.quantity);
      }
    });
    return map;
  }, [allocations]);

  // Handle direct cell text typing
  const handleCellChange = (color: string, size: string, rawVal: string) => {
    setValidationError(null);
    const trimmed = rawVal.trim();

    // 1. If empty, remove the allocation (mark as unconfigured "—")
    if (trimmed === "" || trimmed === "—") {
      const next = allocations.filter(
        (a) => !(a.color === color && a.size === size)
      );
      onAllocationsChange(next);
      return;
    }

    // 2. Validate whole non-negative integer
    const parsed = Number(trimmed);
    if (!/^\d+$/.test(trimmed) || isNaN(parsed) || parsed < 0) {
      setValidationError(`Invalid quantity for ${color} / ${size}: must be a whole non-negative integer (e.g. 0, 1, 2).`);
      return;
    }

    if (parsed > 100000) {
      setValidationError(`Quantity for ${color} / ${size} cannot exceed 100,000.`);
      return;
    }

    // 3. Update or insert the allocation
    updateAllocationQuantity(color, size, parsed);
  };

  // Helper to update or insert allocation for universal package
  const updateAllocationQuantity = (color: string, size: string, quantity: number) => {
    const existingIndex = allocations.findIndex(
      (a) => a.color === color && a.size === size
    );

    if (existingIndex >= 0) {
      const next = [...allocations];
      next[existingIndex] = {
        ...next[existingIndex],
        package_name: next[existingIndex].package_name || UNIVERSAL_PACKAGE_NAME,
        quantity,
      };
      onAllocationsChange(next);
    } else {
      const next = [
        ...allocations,
        {
          package_name: UNIVERSAL_PACKAGE_NAME,
          color,
          size,
          quantity,
          product_variant_id: null,
        },
      ];
      onAllocationsChange(next);
    }
  };

  // Stepper: Increment quantity
  const handleIncrement = (color: string, size: string) => {
    setValidationError(null);
    const key = `${color}__${size}`;
    const currentVal = cellMap.get(key);

    if (typeof currentVal !== "number") {
      // Unconfigured -> becomes 1
      updateAllocationQuantity(color, size, 1);
    } else {
      updateAllocationQuantity(color, size, currentVal + 1);
    }
  };

  // Stepper: Decrement quantity
  const handleDecrement = (color: string, size: string) => {
    setValidationError(null);
    const key = `${color}__${size}`;
    const currentVal = cellMap.get(key);

    if (typeof currentVal !== "number") {
      // Unconfigured -> becomes 0 (intentionally excluded)
      updateAllocationQuantity(color, size, 0);
    } else if (currentVal > 0) {
      updateAllocationQuantity(color, size, currentVal - 1);
    }
  };

  // Clear all configured cells
  const handleClearAllCells = () => {
    setValidationError(null);
    onAllocationsChange([]);
  };

  // Calculate Display Summaries (SUM of manual cells ONLY - never derived backwards)
  const summaries = useMemo(() => {
    const colorTotals: Record<string, number> = {};
    const sizeTotals: Record<string, number> = {};
    let totalPackageUnits = 0;
    let configuredCellCount = 0;

    colors.forEach((c) => {
      colorTotals[c] = 0;
    });
    sizes.forEach((s) => {
      sizeTotals[s] = 0;
    });

    colors.forEach((c) => {
      sizes.forEach((s) => {
        const key = `${c}__${s}`;
        const val = cellMap.get(key);
        if (typeof val === "number") {
          configuredCellCount++;
          colorTotals[c] += val;
          sizeTotals[s] += val;
          totalPackageUnits += val;
        }
      });
    });

    const totalPossibleCells = colors.length * sizes.length;
    const unconfiguredCount = totalPossibleCells - configuredCellCount;

    return {
      colorTotals,
      sizeTotals,
      totalPackageUnits,
      configuredCellCount,
      unconfiguredCount,
      totalPossibleCells,
    };
  }, [colors, sizes, cellMap]);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header */}
      <div className="border-b border-border/60 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Package size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
                Package Assortment Configuration
              </h2>
              <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground/80 border border-border/60">
                Universal Package
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter the exact units of each Color &amp; Size in ONE package. Minimum Order Quantity (MOQ) is derived automatically.
            </p>
          </div>
        </div>

        {/* Action & Total summary badge */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleClearAllCells}
            className="text-[11px] font-sans font-medium text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            Clear Cells
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-background border border-border/80 flex items-center gap-2 shadow-2xs">
            <span className="text-[11px] font-sans font-semibold text-muted-foreground uppercase">
              Package Total (MOQ):
            </span>
            <span className="text-xs font-mono font-bold text-primary tabular-nums">
              {summaries.totalPackageUnits} PCS
            </span>
          </div>
        </div>
      </div>

      {/* Validation Banners */}
      {validationError && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {errors.package_allocations && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errors.package_allocations}</span>
        </div>
      )}

      {/* Structured Matrix Table with Direct Typing + Steppers */}
      <div className="overflow-x-auto rounded-xl border border-border/80 bg-background shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-secondary/40 border-b border-border/80 font-sans text-foreground/80">
              <th className="py-2.5 px-3.5 font-bold uppercase tracking-wider text-[11px] w-36">
                Color
              </th>
              {sizes.map((s) => (
                <th
                  key={s}
                  className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] text-center min-w-[110px]"
                >
                  {s}
                </th>
              ))}
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] text-right w-28 bg-secondary/60">
                Color Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {colors.map((color) => {
              const rowTotal = summaries.colorTotals[color] || 0;
              return (
                <tr key={color} className="hover:bg-secondary/10 transition-colors">
                  {/* Color Label */}
                  <td className="py-2 px-3.5 font-semibold text-foreground">
                    <span className="truncate max-w-[140px] block">{color}</span>
                  </td>

                  {/* Size Input Cells with [ − ] [ quantity ] [ + ] and direct editing */}
                  {sizes.map((size) => {
                    const key = `${color}__${size}`;
                    const rawVal = cellMap.get(key);
                    const displayVal = typeof rawVal === "number" ? String(rawVal) : "";
                    const isUnconfigured = typeof rawVal !== "number";

                    return (
                      <td key={size} className="py-1.5 px-2 text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* Decrement Button */}
                          <button
                            type="button"
                            onClick={() => handleDecrement(color, size)}
                            className="w-6 h-7 rounded-md border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-bold flex items-center justify-center transition-colors cursor-pointer select-none active:scale-95 disabled:opacity-40"
                            title={`Decrease ${color} / ${size}`}
                            aria-label={`Decrease ${color} ${size}`}
                          >
                            −
                          </button>

                          {/* Direct Editable Quantity Input */}
                          <input
                            type="text"
                            inputMode="numeric"
                            value={displayVal}
                            placeholder="—"
                            onChange={(e) => handleCellChange(color, size, e.target.value)}
                            className={`w-11 h-7 text-center text-xs font-mono font-bold rounded-md border transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                              isUnconfigured
                                ? "bg-secondary/20 border-dashed border-border/80 text-muted-foreground placeholder:text-muted-foreground/50"
                                : rawVal === 0
                                ? "bg-secondary/40 border-border text-muted-foreground"
                                : "bg-background border-border text-foreground font-black shadow-2xs"
                            }`}
                            title={
                              isUnconfigured
                                ? "Unconfigured cell. Type a number or use +/- buttons."
                                : `${color} / ${size}: ${rawVal} pcs in this package.`
                            }
                          />

                          {/* Increment Button */}
                          <button
                            type="button"
                            onClick={() => handleIncrement(color, size)}
                            className="w-6 h-7 rounded-md border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-bold flex items-center justify-center transition-colors cursor-pointer select-none active:scale-95"
                            title={`Increase ${color} / ${size}`}
                            aria-label={`Increase ${color} ${size}`}
                          >
                            +
                          </button>
                        </div>
                      </td>
                    );
                  })}

                  {/* Row Total */}
                  <td className="py-2 px-3 text-right font-mono font-bold text-foreground bg-secondary/20 tabular-nums">
                    {rowTotal} pcs
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer Summary Row (Size Totals & Grand Total) */}
          <tfoot>
            <tr className="bg-secondary/50 border-t-2 border-border font-bold text-[11px] text-foreground font-sans">
              <td className="py-2.5 px-3.5 uppercase tracking-wider">Size Totals</td>
              {sizes.map((size) => (
                <td key={size} className="py-2.5 px-2 text-center font-mono tabular-nums text-foreground/90">
                  {summaries.sizeTotals[size] || 0}
                </td>
              ))}
              <td className="py-2.5 px-3 text-right font-mono font-black text-xs text-primary tabular-nums bg-secondary/80">
                {summaries.totalPackageUnits} PCS
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

