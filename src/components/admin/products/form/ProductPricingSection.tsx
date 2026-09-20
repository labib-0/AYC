"use client";

import { AlertCircle, TrendingDown, Sparkles, Flame, Star } from "lucide-react";

interface ProductPricingSectionProps {
  wholesalePrice: number;
  moq: number;
  bulkThreshold: number;
  bulkPrice: number;
  fullStockPrice?: number;
  msrpPrice?: number;
  costPrice?: number;
  isNew?: boolean;
  isHot?: boolean;
  isFeatured?: boolean;
  errors: Record<string, string>;
  onWholesalePriceChange: (val: number) => void;
  onMoqChange: (val: number) => void;
  onBulkThresholdChange: (val: number) => void;
  onBulkPriceChange: (val: number) => void;
  onFullStockPriceChange: (val: number | undefined) => void;
  onMsrpPriceChange: (val: number | undefined) => void;
  onCostPriceChange: (val: number | undefined) => void;
  onIsNewChange: (val: boolean) => void;
  onIsHotChange: (val: boolean) => void;
  onIsFeaturedChange: (val: boolean) => void;
}

export default function ProductPricingSection({
  wholesalePrice,
  moq,
  bulkThreshold,
  bulkPrice,
  fullStockPrice,
  msrpPrice,
  costPrice,
  isNew,
  isHot,
  isFeatured,
  errors,
  onWholesalePriceChange,
  onMoqChange,
  onBulkThresholdChange,
  onBulkPriceChange,
  onFullStockPriceChange,
  onMsrpPriceChange,
  onCostPriceChange,
  onIsNewChange,
  onIsHotChange,
  onIsFeaturedChange,
}: ProductPricingSectionProps) {
  const inputClass = (hasError?: boolean) =>
    `w-full h-10 pl-8 pr-3.5 rounded-xl border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors tabular-nums ${
      hasError
        ? "border-red-500 focus:ring-red-500/30"
        : "border-border focus:ring-ring/40"
    }`;

  const plainInputClass = (hasError?: boolean) =>
    `w-full h-10 px-3.5 rounded-xl border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors tabular-nums ${
      hasError
        ? "border-red-500 focus:ring-red-500/30"
        : "border-border focus:ring-ring/40"
    }`;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
            Pricing & B2B Volume Tiers
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            All prices are denominated in USD ($). Tiered wholesale structure.
          </p>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-foreground">
          USD ($)
        </span>
      </div>

      <div className="space-y-4">
        {/* Primary Wholesale Price & MOQ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Wholesale Unit Price */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Wholesale Unit Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={wholesalePrice || ""}
                onChange={(e) => onWholesalePriceChange(parseFloat(e.target.value) || 0)}
                placeholder="25.00"
                className={inputClass(Boolean(errors.wholesalePrice))}
              />
            </div>
            {errors.wholesalePrice && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.wholesalePrice}
              </p>
            )}
          </div>

          {/* Minimum Order Quantity (MOQ) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Minimum Order Quantity (MOQ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={moq || ""}
              onChange={(e) => onMoqChange(parseInt(e.target.value, 10) || 0)}
              placeholder="10"
              className={plainInputClass(Boolean(errors.moq))}
            />
            {errors.moq && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.moq}
              </p>
            )}
          </div>
        </div>

        {/* Volume Tier: Bulk Threshold & Bulk Price */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Volume Discount Tier
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Bulk Quantity Threshold (pcs)
              </label>
              <input
                type="number"
                step="1"
                min={moq + 1}
                value={bulkThreshold || ""}
                onChange={(e) => onBulkThresholdChange(parseInt(e.target.value, 10) || 0)}
                placeholder="100"
                className={plainInputClass(Boolean(errors.bulkThreshold))}
              />
              {errors.bulkThreshold && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.bulkThreshold}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Bulk Tier Unit Price ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={bulkPrice || ""}
                  onChange={(e) => onBulkPriceChange(parseFloat(e.target.value) || 0)}
                  placeholder="20.00"
                  className={inputClass(Boolean(errors.bulkPrice))}
                />
              </div>
              {errors.bulkPrice && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.bulkPrice}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Optional Secondary Pricing Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Full Stock Price */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Full-Stock Price ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fullStockPrice ?? ""}
                onChange={(e) =>
                  onFullStockPriceChange(e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="18.00"
                className={inputClass()}
              />
            </div>
          </div>

          {/* MSRP / Retail Price */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              MSRP / Retail RRP ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={msrpPrice ?? ""}
                onChange={(e) =>
                  onMsrpPriceChange(e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="49.99"
                className={inputClass()}
              />
            </div>
          </div>

          {/* Cost Price */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Manufacturing Cost ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice ?? ""}
                onChange={(e) =>
                  onCostPriceChange(e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="12.50"
                className={inputClass()}
              />
            </div>
          </div>
        </div>

        {/* Promotion Flags (Separated from publication state) */}
        <div className="pt-3 border-t border-border/60">
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
            Storefront Promotion Badges
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* New Arrival */}
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                isNew
                  ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                  : "border-border hover:bg-secondary/60 text-foreground"
              }`}
            >
              <input
                type="checkbox"
                checked={Boolean(isNew)}
                onChange={(e) => onIsNewChange(e.target.checked)}
                className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500 accent-blue-600"
              />
              <Sparkles size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold">New Arrival</p>
                <p className="text-[10px] text-muted-foreground">Adds &ldquo;NEW&rdquo; badge</p>
              </div>
            </label>

            {/* Hot Sale */}
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                isHot
                  ? "bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-900 dark:text-orange-200"
                  : "border-border hover:bg-secondary/60 text-foreground"
              }`}
            >
              <input
                type="checkbox"
                checked={Boolean(isHot)}
                onChange={(e) => onIsHotChange(e.target.checked)}
                className="w-4 h-4 rounded border-border text-orange-600 focus:ring-orange-500 accent-orange-600"
              />
              <Flame size={14} className="text-orange-600 dark:text-orange-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold">Hot Sale</p>
                <p className="text-[10px] text-muted-foreground">Adds &ldquo;HOT&rdquo; badge</p>
              </div>
            </label>

            {/* Featured Product */}
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                isFeatured
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                  : "border-border hover:bg-secondary/60 text-foreground"
              }`}
            >
              <input
                type="checkbox"
                checked={Boolean(isFeatured)}
                onChange={(e) => onIsFeaturedChange(e.target.checked)}
                className="w-4 h-4 rounded border-border text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <Star size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold">Featured</p>
                <p className="text-[10px] text-muted-foreground">Highlights in homepage</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
