"use client";

import { useState, useEffect } from "react";
import { Plus, X, AlertCircle, Check } from "lucide-react";

export const PREDEFINED_PALETTE = [
  { name: "Black", hex: "#111827", dark: true },
  { name: "White", hex: "#FFFFFF", dark: false },
  { name: "Navy", hex: "#1E3A8A", dark: true },
  { name: "Blue", hex: "#2563EB", dark: true },
  { name: "Red", hex: "#DC2626", dark: true },
  { name: "Green", hex: "#16A34A", dark: true },
  { name: "Yellow", hex: "#EAB308", dark: false },
  { name: "Orange", hex: "#EA580C", dark: true },
  { name: "Purple", hex: "#9333EA", dark: true },
  { name: "Pink", hex: "#EC4899", dark: true },
  { name: "Brown", hex: "#78350F", dark: true },
  { name: "Grey", hex: "#6B7280", dark: true },
  { name: "Beige", hex: "#D4C5B9", dark: false },
  { name: "Maroon", hex: "#881337", dark: true },
  { name: "Olive", hex: "#556B2F", dark: true },
  { name: "Charcoal", hex: "#374151", dark: true },
  { name: "Teal", hex: "#0D9488", dark: true },
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
    // Intelligently uppercase standard letter abbreviation tokens (s, m, l, xl, 4xl, etc.)
    if (/^(xs|s|m|l|xl|xxl|xxxl|[2-9]xl)$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    return trimmed;
  });
}

interface ProductVariantsSectionProps {
  colors: string[];
  sizes: string[];
  stock: number;
  sku: string;
  errors: Record<string, string>;
  onColorsChange: (colors: string[]) => void;
  onSizesChange: (sizes: string[]) => void;
  onStockChange: (stock: number) => void;
}

export default function ProductVariantsSection({
  colors,
  sizes,
  stock,
  sku,
  errors,
  onColorsChange,
  onSizesChange,
  onStockChange,
}: ProductVariantsSectionProps) {
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

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customColorInput, setCustomColorInput] = useState("");
  const [customColorError, setCustomColorError] = useState<string | null>(null);

  // Custom Size Input State
  const [customSize, setCustomSize] = useState("");

  // Sync custom colors into state if any current color isn't in predefined
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

  // Save custom colors to localStorage when updated
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
      setCustomColorError("Please enter a color name (e.g. Wine Red).");
      return;
    }

    // Check if color name already exists in predefined
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

    setShowAddCustom(false);
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
    const parsed = parseSizesInput(customSize);
    if (parsed.length > 0) {
      const merged = [...sizes];
      parsed.forEach((s) => {
        if (!merged.includes(s)) {
          merged.push(s);
        }
      });
      onSizesChange(merged);
      setCustomSize("");
    }
  };

  const totalVariantCombinations = colors.length * sizes.length;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
          VARIANTS
        </h2>
        <span className="text-xs font-bold text-muted-foreground tabular-nums">
          {totalVariantCombinations} Variant{totalVariantCombinations !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-5">

        {/* Colors Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              COLORS ({colors.length} selected)
            </label>

            <button
              type="button"
              onClick={() => {
                setShowAddCustom(!showAddCustom);
                setCustomColorError(null);
              }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} />
              {showAddCustom ? "Cancel" : "Add Custom Color"}
            </button>
          </div>

          {/* Active Selected Color Pills (Text tags with remove X) */}
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

          {/* Preset Color Names (Clean text buttons, no dots) */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Preset Colors:
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

          {/* Add Custom Color Name Input (No color picker, no hex, no dots) */}
          {showAddCustom && (
            <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-2 max-w-md animate-in fade-in slide-in-from-top-1 duration-150 shadow-xs">
              <label className="text-[11px] font-bold uppercase tracking-wider text-foreground block">
                Enter Custom Color Name
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
                  placeholder="Color Name (e.g. Wine Red)"
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

        {/* Sizes Selector */}
        <div className="space-y-2.5 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              SIZES ({sizes.length} selected)
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

          {/* Multi-Size Custom Input (Comma or Space separated) */}
          <div className="flex items-center gap-2 pt-1 max-w-md">
            <input
              type="text"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSizes();
                }
              }}
              placeholder="Add size(s) e.g. S, M, L, XL or 4XL, 5XL, 6XL"
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
      </div>
    </div>
  );
}

