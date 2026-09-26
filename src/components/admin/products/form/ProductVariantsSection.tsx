"use client";

import { useState, useEffect } from "react";
import { Plus, X, Layers, AlertCircle, Check, Pipette } from "lucide-react";

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

export const QUICK_CUSTOM_PALETTE = [
  { name: "Heather Grey", hex: "#D9D9D9" },
  { name: "Burgundy", hex: "#800020" },
  { name: "Sage Green", hex: "#9CAF88" },
  { name: "Coral", hex: "#FF7F50" },
  { name: "Khaki", hex: "#C3B091" },
  { name: "Indigo", hex: "#4B0082" },
  { name: "Dusty Rose", hex: "#DCAE96" },
  { name: "Slate", hex: "#708090" },
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

interface CustomColorItem {
  name: string;
  hex: string;
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
  // Custom Color State
  const [customColorsList, setCustomColorsList] = useState<CustomColorItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("ayaan_admin_custom_colors");
        if (stored) return JSON.parse(stored);
      } catch {
        // Fallback
      }
    }
    return [];
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerHex, setPickerHex] = useState("#D9D9D9");
  const [pickerName, setPickerName] = useState("");
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Custom Size Input State
  const [customSize, setCustomSize] = useState("");
  const [showMatrixPreview, setShowMatrixPreview] = useState(false);

  // Sync custom colors into state if any current color isn't in predefined
  useEffect(() => {
    colors.forEach((c) => {
      const isPredefined = PREDEFINED_PALETTE.some(
        (p) => p.name.toLowerCase() === c.toLowerCase()
      );
      const isCustomKnown = customColorsList.some(
        (cc) => cc.name.toLowerCase() === c.toLowerCase()
      );
      if (!isPredefined && !isCustomKnown) {
        // Add default entry for this color
        const newItem: CustomColorItem = { name: c, hex: "#6B7280" };
        setCustomColorsList((prev) => [...prev, newItem]);
      }
    });
  }, [colors, customColorsList]);

  // Save custom colors to localStorage when updated
  const saveCustomColor = (name: string, hex: string) => {
    const next = [...customColorsList.filter((c) => c.name.toLowerCase() !== name.toLowerCase()), { name, hex }];
    setCustomColorsList(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ayaan_admin_custom_colors", JSON.stringify(next));
      } catch {
        // Ignore
      }
    }
  };

  const getColorHex = (colorName: string): string => {
    const predefined = PREDEFINED_PALETTE.find(
      (p) => p.name.toLowerCase() === colorName.toLowerCase()
    );
    if (predefined) return predefined.hex;
    const custom = customColorsList.find(
      (c) => c.name.toLowerCase() === colorName.toLowerCase()
    );
    if (custom) return custom.hex;
    return "#6B7280";
  };

  const toggleColor = (colorName: string) => {
    if (colors.includes(colorName)) {
      if (colors.length === 1) return; // keep at least 1
      onColorsChange(colors.filter((c) => c !== colorName));
    } else {
      onColorsChange([...colors, colorName]);
    }
  };

  const handleAddCustomColor = () => {
    setPickerError(null);
    const trimmedName = pickerName.trim();
    if (!trimmedName) {
      setPickerError("Please enter a name for the color (e.g. Heather Grey).");
      return;
    }

    // Check if color name already exists in predefined
    const predefinedMatch = PREDEFINED_PALETTE.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (predefinedMatch) {
      if (!colors.includes(predefinedMatch.name)) {
        onColorsChange([...colors, predefinedMatch.name]);
      }
      setShowColorPicker(false);
      setPickerName("");
      return;
    }

    // Save custom color and select it
    saveCustomColor(trimmedName, pickerHex);
    if (!colors.includes(trimmedName)) {
      onColorsChange([...colors, trimmedName]);
    }

    setShowColorPicker(false);
    setPickerName("");
  };

  const toggleSize = (sizeName: string) => {
    if (sizes.includes(sizeName)) {
      if (sizes.length === 1) return; // keep at least 1
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
  const avgStockPerVariant =
    totalVariantCombinations > 0 ? Math.floor(stock / totalVariantCombinations) : 0;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
            Variants &amp; Stock Configuration
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure product colors, size range, and warehouse inventory.
          </p>
        </div>
        <span className="text-xs font-bold text-muted-foreground tabular-nums">
          {totalVariantCombinations} Variant{totalVariantCombinations !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-5">
        {/* Total Stock Summary / Variant Allocation Note */}
        <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Total Stock: {stock.toLocaleString()} pcs
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Allocated across {totalVariantCombinations} matrix variant{totalVariantCombinations !== 1 ? "s" : ""} (~{avgStockPerVariant} pcs/variant). Configured in Inventory &amp; MOQ section.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-background px-2.5 py-1 rounded-md border border-border/50">
            Synced with Inventory
          </span>
        </div>

        {/* Colors Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Colors <span className="text-red-500">*</span> ({colors.length} selected)
            </label>

            <button
              type="button"
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setPickerError(null);
              }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={12} />
              {showColorPicker ? "Close Color Picker" : "Add Custom Color"}
            </button>
          </div>

          {/* Palette Swatches (Predefined + Custom) */}
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

            {/* Custom Created Colors */}
            {customColorsList.map((c) => {
              const isSelected = colors.includes(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggleColor(c.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-foreground text-background border-foreground shadow-xs scale-[1.02]"
                      : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 shrink-0 shadow-2xs"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>

          {/* Visual Color Selection Interface (Picker Popover Card) */}
          {showColorPicker && (
            <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3.5 max-w-md animate-in fade-in slide-in-from-top-2 duration-150 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Pipette size={14} className="text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Custom Color Palette &amp; Picker
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowColorPicker(false)}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Quick swatch suggestions */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Quick Palette Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CUSTOM_PALETTE.map((qp) => (
                    <button
                      key={qp.name}
                      type="button"
                      onClick={() => {
                        setPickerHex(qp.hex);
                        if (!pickerName) setPickerName(qp.name);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-background text-[11px] font-medium text-foreground hover:border-primary transition-colors"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: qp.hex }}
                      />
                      <span>{qp.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Color Input and Color Name */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Visual Picker */}
                <div className="sm:col-span-4 flex items-center gap-2">
                  <label className="relative flex items-center cursor-pointer">
                    <input
                      type="color"
                      value={pickerHex}
                      onChange={(e) => setPickerHex(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-border bg-transparent p-0.5"
                      title="Choose custom color visually"
                    />
                  </label>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                      Hex Value
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {pickerHex.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Color Name */}
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    value={pickerName}
                    onChange={(e) => setPickerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomColor();
                      }
                    }}
                    placeholder="Color Name (e.g. Heather Grey)"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>

              {pickerError && (
                <p className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {pickerError}
                </p>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomColor}
                  className="px-4 py-1.5 rounded-lg bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1 shadow-xs"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                    style={{ backgroundColor: pickerHex }}
                  />
                  <span>Add Color</span>
                </button>
              </div>
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
                            <td className="px-3 py-2 font-semibold text-foreground flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: getColorHex(c) }}
                              />
                              <span>
                                {c} / {s}
                              </span>
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

