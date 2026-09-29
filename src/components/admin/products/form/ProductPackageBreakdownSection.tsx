"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, X, AlertCircle, Check, ChevronUp, ChevronDown, EyeOff, Eye } from "lucide-react";
import { PackageAllocation } from "@/types";

export const PREDEFINED_PALETTE = [
  { name: "Black" },
  { name: "White" },
  { name: "Navy" },
  { name: "Blue" },
  { name: "Red" },
  { name: "Green" },
  { name: "Yellow" },
  { name: "Orange" },
  { name: "Purple" },
  { name: "Pink" },
  { name: "Brown" },
  { name: "Grey" },
  { name: "Beige" },
  { name: "Maroon" },
  { name: "Olive" },
  { name: "Charcoal" },
  { name: "Teal" },
];

export const SIZE_PRESETS = [
  { label: "Standard Letter", sizes: ["S", "M", "L", "XL"] },
  { label: "Core Letter", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Numeric Waist", sizes: ["28", "30", "32", "34", "36", "38"] },
  { label: "Universal", sizes: ["ONE SIZE"] },
];

export function parseSizesInput(input: string): string[] {
  if (!input || !input.trim()) return [];
  let rawTokens: string[] = [];
  if (input.includes(",")) {
    rawTokens = input.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    rawTokens = input.trim().split(/\s+/).filter(Boolean);
  }
  return rawTokens.map((token) => {
    const trimmed = token.trim();
    if (/^(xs|s|m|l|xl|xxl|xxxl|[2-9]xl)$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    return trimmed;
  });
}

const UNIVERSAL_PACKAGE_NAME = "Universal Package";

interface ProductPackageBreakdownSectionProps {
  isHiddenFromStorefront: boolean;
  onIsHiddenFromStorefrontChange: (hidden: boolean) => void;
  colors: string[];
  sizes: string[];
  allocations: PackageAllocation[];
  stock: number;
  errors: Record<string, string>;
  onColorsChange: (colors: string[]) => void;
  onSizesChange: (sizes: string[]) => void;
  onAllocationsChange: (allocations: PackageAllocation[]) => void;
}

export default function ProductPackageBreakdownSection({
  isHiddenFromStorefront,
  onIsHiddenFromStorefrontChange,
  colors,
  sizes,
  allocations,
  stock,
  errors,
  onColorsChange,
  onSizesChange,
  onAllocationsChange,
}: ProductPackageBreakdownSectionProps) {
  // Collapse UI state (convenience only, never affects product visibility or publishing)
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Custom Color Names List (saved to localStorage for reuse)
  const [customColorsList, setCustomColorsList] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("ayaan_admin_custom_colors");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.map((item) => (typeof item === "string" ? item : item.name)).filter(Boolean);
          }
        }
      } catch {
        // Fallback
      }
    }
    return [];
  });

  const [showAddCustomColor, setShowAddCustomColor] = useState(false);
  const [customColorInput, setCustomColorInput] = useState("");
  const [customColorError, setCustomColorError] = useState<string | null>(null);

  // Custom Size Input State
  const [customSizeInput, setCustomSizeInput] = useState("");

  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync custom colors into state
  useEffect(() => {
    colors.forEach((c) => {
      const isPredefined = PREDEFINED_PALETTE.some(
        (p) => p.name.toLowerCase() === c.toLowerCase()
      );
      const isCustomKnown = customColorsList.some(
        (cc) => cc.toLowerCase() === c.toLowerCase()
      );
      if (!isPredefined && !isCustomKnown) {
        setCustomColorsList((prev) => [...prev, c]);
      }
    });
  }, [colors, customColorsList]);

  const saveCustomColorName = (name: string) => {
    const next = [...customColorsList.filter((c) => c.toLowerCase() !== name.toLowerCase()), name];
    setCustomColorsList(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ayaan_admin_custom_colors", JSON.stringify(next));
      } catch {
        // Ignore
      }
    }
  };

  const toggleColor = (colorName: string) => {
    if (colors.includes(colorName)) {
      onColorsChange(colors.filter((c) => c !== colorName));
    } else {
      onColorsChange([...colors, colorName]);
    }
  };

  const handleAddCustomColor = () => {
    setCustomColorError(null);
    const trimmedName = customColorInput.trim();
    if (!trimmedName) {
      setCustomColorError("Please enter a color name.");
      return;
    }

    const predefinedMatch = PREDEFINED_PALETTE.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    const resolvedName = predefinedMatch ? predefinedMatch.name : trimmedName;

    if (!colors.includes(resolvedName)) {
      onColorsChange([...colors, resolvedName]);
    }

    if (!predefinedMatch) {
      saveCustomColorName(resolvedName);
    }

    setShowAddCustomColor(false);
    setCustomColorInput("");
  };

  const toggleSize = (sizeName: string) => {
    if (sizes.includes(sizeName)) {
      onSizesChange(sizes.filter((s) => s !== sizeName));
    } else {
      onSizesChange([...sizes, sizeName]);
    }
  };

  const handleAddSizes = () => {
    const parsed = parseSizesInput(customSizeInput);
    if (parsed.length > 0) {
      const merged = [...sizes];
      parsed.forEach((s) => {
        if (!merged.includes(s)) {
          merged.push(s);
        }
      });
      onSizesChange(merged);
      setCustomSizeInput("");
    }
  };

  // Matrix cell map
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

  const handleCellChange = (color: string, size: string, rawVal: string) => {
    setValidationError(null);
    const trimmed = rawVal.trim();

    if (trimmed === "" || trimmed === "—") {
      const next = allocations.filter(
        (a) => !(a.color === color && a.size === size)
      );
      onAllocationsChange(next);
      return;
    }

    const parsed = Number(trimmed);
    if (!/^\d+$/.test(trimmed) || isNaN(parsed) || parsed < 0) {
      setValidationError(`Invalid quantity for ${color} / ${size}: must be a whole non-negative integer.`);
      return;
    }

    if (parsed > 100000) {
      setValidationError(`Quantity for ${color} / ${size} cannot exceed 100,000.`);
      return;
    }

    updateAllocationQuantity(color, size, parsed);
  };

  const handleIncrement = (color: string, size: string) => {
    setValidationError(null);
    const key = `${color}__${size}`;
    const currentVal = cellMap.get(key);

    if (typeof currentVal !== "number") {
      updateAllocationQuantity(color, size, 1);
    } else {
      updateAllocationQuantity(color, size, currentVal + 1);
    }
  };

  const handleDecrement = (color: string, size: string) => {
    setValidationError(null);
    const key = `${color}__${size}`;
    const currentVal = cellMap.get(key);

    if (typeof currentVal !== "number") {
      updateAllocationQuantity(color, size, 0);
    } else if (currentVal > 0) {
      updateAllocationQuantity(color, size, currentVal - 1);
    }
  };

  const handleClearAllCells = () => {
    setValidationError(null);
    onAllocationsChange([]);
  };

  // Summaries
  const summaries = useMemo(() => {
    const colorTotals: Record<string, number> = {};
    const sizeTotals: Record<string, number> = {};
    let totalPackageUnits = 0;

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
          colorTotals[c] += val;
          sizeTotals[s] += val;
          totalPackageUnits += val;
        }
      });
    });

    return {
      colorTotals,
      sizeTotals,
      totalPackageUnits,
    };
  }, [colors, sizes, cellMap]);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs" id="section-package-breakdown">
      {/* 11 & 12. Minimal Header: PACKAGE BREAKDOWN + [HIDE FROM STOREFRONT] + [COLLAPSE] */}
      <div className="border-b border-border/60 pb-3 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
          PACKAGE BREAKDOWN
        </h2>

        <div className="flex items-center gap-2">
          {/* A. HIDE FROM STOREFRONT (Real Product Visibility Control) */}
          <button
            type="button"
            id="toggle-storefront-visibility-btn"
            onClick={() => onIsHiddenFromStorefrontChange(!isHiddenFromStorefront)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
              isHiddenFromStorefront
                ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                : "bg-secondary text-foreground border-border hover:bg-secondary/80"
            }`}
            title={
              isHiddenFromStorefront
                ? "Product is currently hidden from customer storefront. Click to make eligible for storefront visibility."
                : "Product is eligible for storefront visibility. Click to hide from customer storefront."
            }
          >
            {isHiddenFromStorefront ? (
              <>
                <EyeOff size={13} className="shrink-0 text-amber-700 dark:text-amber-400" />
                <span>HIDDEN FROM STOREFRONT</span>
              </>
            ) : (
              <>
                <Eye size={13} className="shrink-0 text-muted-foreground" />
                <span>HIDE FROM STOREFRONT</span>
              </>
            )}
          </button>

          {/* B. COLLAPSE (Purely UI Convenience) */}
          <button
            type="button"
            id="collapse-package-breakdown-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
            title={isCollapsed ? "Expand section" : "Collapse section"}
            aria-label={isCollapsed ? "Expand Package Breakdown section" : "Collapse Package Breakdown section"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Section Content (hidden only when collapsed) */}
      {!isCollapsed && (
        <div className="space-y-6">
          {/* COLORS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                COLORS ({colors.length})
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowAddCustomColor(!showAddCustomColor);
                  setCustomColorError(null);
                }}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                {showAddCustomColor ? "Cancel" : "Add Custom Color"}
              </button>
            </div>

            {/* Active Selected Color Pills (Text tags with remove X - NO dots/picker) */}
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {colors.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-foreground text-background border border-foreground shadow-xs"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => toggleColor(c)}
                      className="hover:opacity-75 p-0.5 cursor-pointer"
                      aria-label={`Remove color ${c}`}
                      title={`Remove ${c}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Preset Color Names (Text buttons only, no dots) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_PALETTE.map((p) => {
                  const isSelected = colors.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => toggleColor(p.name)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-secondary text-foreground border-foreground/50 shadow-2xs font-bold"
                          : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      <span>{p.name}</span>
                      {isSelected && <Check size={12} className="text-primary shrink-0" />}
                    </button>
                  );
                })}

                {/* Previously Saved Custom Colors (Text Buttons) */}
                {customColorsList
                  .filter((c) => !PREDEFINED_PALETTE.some((p) => p.name.toLowerCase() === c.toLowerCase()))
                  .map((c) => {
                    const isSelected = colors.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleColor(c)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-secondary text-foreground border-foreground/50 shadow-2xs font-bold"
                            : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        <span>{c}</span>
                        {isSelected && <Check size={12} className="text-primary shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Add Custom Color Name Input */}
            {showAddCustomColor && (
              <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-2 max-w-md shadow-xs">
                <label className="text-[11px] font-bold uppercase tracking-wider text-foreground block">
                  Custom Color Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customColorInput}
                    onChange={(e) => setCustomColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomColor();
                      }
                    }}
                    placeholder="e.g. Wine Red"
                    className="flex-1 h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomColor}
                    className="h-9 px-4 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                {customColorError && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    {customColorError}
                  </p>
                )}
              </div>
            )}

            {errors.colors && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.colors}
              </p>
            )}
          </div>

          {/* SIZES */}
          <div className="space-y-2.5 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                SIZES ({sizes.length})
              </label>

              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Presets:
                </span>
                {SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onSizesChange(preset.sizes)}
                    className="px-2 py-0.5 rounded-md border border-border bg-secondary/50 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    title={`Select ${preset.sizes.join(", ")}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Size Pills */}
            {sizes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-foreground text-background border border-foreground shadow-xs"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => toggleSize(s)}
                      className="hover:opacity-75 p-0.5 cursor-pointer"
                      aria-label={`Remove size ${s}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Multi-Size Custom Input */}
            <div className="flex items-center gap-2 pt-1 max-w-md">
              <input
                type="text"
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSizes();
                  }
                }}
                placeholder="Add size(s) e.g. S, M, L, XL or 4XL, 5XL"
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="button"
                onClick={handleAddSizes}
                className="h-9 px-3.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {errors.sizes && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.sizes}
              </p>
            )}
          </div>

          {/* PACKAGE MATRIX */}
          <div className="pt-4 border-t border-border/60 space-y-3">
            {colors.length === 0 || sizes.length === 0 ? (
              <div className="py-4 px-3 text-center rounded-xl bg-secondary/20 border border-border/60">
                <p className="text-xs text-muted-foreground font-medium">
                  Add colors and sizes above to configure the package matrix.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    PACKAGE MATRIX
                  </span>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleClearAllCells}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Clear Cells
                    </button>
                    <div className="px-3 py-1 rounded-lg bg-secondary border border-border/80 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Package Total:
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                        {summaries.totalPackageUnits} PCS
                      </span>
                    </div>
                  </div>
                </div>

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

                {/* Matrix Table */}
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
                            <td className="py-2 px-3.5 font-semibold text-foreground">
                              <span className="truncate max-w-[140px] block">{color}</span>
                            </td>

                            {sizes.map((size) => {
                              const key = `${color}__${size}`;
                              const rawVal = cellMap.get(key);
                              const displayVal = typeof rawVal === "number" ? String(rawVal) : "";
                              const isUnconfigured = typeof rawVal !== "number";

                              return (
                                <td key={size} className="py-1.5 px-2 text-center">
                                  <div className="inline-flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDecrement(color, size)}
                                      className="w-6 h-7 rounded-md border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-bold flex items-center justify-center transition-colors cursor-pointer select-none active:scale-95 disabled:opacity-40"
                                      title={`Decrease ${color} / ${size}`}
                                      aria-label={`Decrease ${color} ${size}`}
                                    >
                                      −
                                    </button>

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
                                    />

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

                            <td className="py-2 px-3 text-right font-mono font-bold text-foreground bg-secondary/20 tabular-nums">
                              {rowTotal} pcs
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
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
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
