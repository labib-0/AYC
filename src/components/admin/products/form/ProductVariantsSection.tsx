"use client";

import { useState } from "react";
import { Plus, X, Layers, AlertCircle, Check } from "lucide-react";

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
  { label: "Standard Letter (XS–3XL)", sizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
  { label: "Core Letter (S–XL)", sizes: ["S", "M", "L", "XL"] },
  { label: "Numeric Waist (28–38)", sizes: ["28", "30", "32", "34", "36", "38"] },
  { label: "Universal", sizes: ["ONE SIZE"] },
];

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
  const [customColor, setCustomColor] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [showMatrixPreview, setShowMatrixPreview] = useState(false);

  const toggleColor = (colorName: string) => {
    if (colors.includes(colorName)) {
      if (colors.length === 1) return; // keep at least 1
      onColorsChange(colors.filter((c) => c !== colorName));
    } else {
      onColorsChange([...colors, colorName]);
    }
  };

  const addCustomColor = () => {
    const trimmed = customColor.trim();
    if (trimmed && !colors.includes(trimmed)) {
      onColorsChange([...colors, trimmed]);
      setCustomColor("");
    }
  };

  const toggleSize = (sizeName: string) => {
    if (sizes.includes(sizeName)) {
      if (sizes.length === 1) return; // keep at least 1
      onSizesChange(sizes.filter((s) => s !== sizeName));
    } else {
      onSizesChange([...sizes, sizeName]);
    }
  };

  const addCustomSize = () => {
    const trimmed = customSize.trim();
    if (trimmed && !sizes.includes(trimmed)) {
      onSizesChange([...sizes, trimmed]);
      setCustomSize("");
    }
  };

  const totalVariantCombinations = colors.length * sizes.length;
  const avgStockPerVariant =
    totalVariantCombinations > 0 ? Math.floor(stock / totalVariantCombinations) : 0;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
            Variants & Stock Configuration
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure product colors, size range, and Uttara warehouse stock.
          </p>
        </div>
        <span className="text-xs font-bold text-muted-foreground tabular-nums">
          {totalVariantCombinations} Variant{totalVariantCombinations !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-5">
        {/* Total Stock Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
            Total Catalog Stock Units <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={stock || ""}
            onChange={(e) => onStockChange(parseInt(e.target.value, 10) || 0)}
            placeholder="500"
            className="w-full sm:w-64 h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors"
          />
          {errors.stock && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle size={12} />
              {errors.stock}
            </p>
          )}
        </div>

        {/* Colors Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Colors <span className="text-red-500">*</span> ({colors.length} selected)
            </label>
          </div>

          {/* Palette Swatches */}
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_PALETTE.map((p) => {
              const isSelected = colors.includes(p.name);
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => toggleColor(p.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-foreground text-background border-foreground shadow-xs scale-[1.02]"
                      : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: p.hex }}
                  />
                  <span>{p.name}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>

          {/* Custom Color Input */}
          <div className="flex items-center gap-2 pt-1 max-w-sm">
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomColor();
                }
              }}
              placeholder="Add custom color (e.g. Heather Grey)"
              className="flex-1 h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="button"
              onClick={addCustomColor}
              className="h-9 px-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0"
            >
              <Plus size={12} /> Add
            </button>
          </div>

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
              Sizes <span className="text-red-500">*</span> ({sizes.length} selected)
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
                  className="px-2 py-0.5 rounded-md border border-border bg-secondary/50 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {preset.label.split(" (")[0]}
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
                  className="hover:opacity-75 p-0.5"
                  aria-label={`Remove size ${s}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {/* Custom Size Input */}
          <div className="flex items-center gap-2 pt-1 max-w-sm">
            <input
              type="text"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSize();
                }
              }}
              placeholder="Add size (e.g. 4XL, 40, Youth S)"
              className="flex-1 h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="button"
              onClick={addCustomSize}
              className="h-9 px-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0"
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

        {/* Matrix Preview Toggle */}
        <div className="pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => setShowMatrixPreview(!showMatrixPreview)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
          >
            <Layers size={13} />
            {showMatrixPreview ? "Hide Variants Table Preview" : "View Generated Variants & SKUs"}
          </button>

          {showMatrixPreview && (
            <div className="mt-3 border border-border/80 rounded-xl overflow-hidden bg-card">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Variant Title</th>
                      <th className="px-3 py-2">SKU Preview</th>
                      <th className="px-3 py-2 text-right">Est. Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {colors.map((c) =>
                      sizes.map((s) => {
                        const vSku = `${sku || "AY-PROD"}-${c.substring(0, 3).toUpperCase()}-${s.toUpperCase()}`;
                        return (
                          <tr key={`${c}-${s}`} className="hover:bg-secondary/30">
                            <td className="px-3 py-2 font-semibold text-foreground">
                              {c} / {s}
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                              {vSku}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                              {avgStockPerVariant} pcs
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
