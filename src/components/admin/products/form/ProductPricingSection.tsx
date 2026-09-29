"use client";

import { AlertCircle, TrendingDown, Sparkles, Flame, Star, Clock } from "lucide-react";

interface ProductPricingSectionProps {
  wholesalePrice?: number;
  moq?: number;
  bulkThreshold?: number;
  bulkPrice?: number;
  fullStockPrice?: number;
  costPrice?: number;
  purchasePriceUpdated?: boolean | null;
  isNew?: boolean;
  newUntil?: string | null;
  isHot?: boolean;
  hotUntil?: string | null;
  isFeatured?: boolean;
  featuredUntil?: string | null;
  isPreorder?: boolean;
  estimatedDeliveryDate?: string | null;
  errors: Record<string, string>;
  onWholesalePriceChange: (val: number | undefined) => void;
  onMoqChange: (val: number) => void;
  onBulkThresholdChange: (val: number | undefined) => void;
  onBulkPriceChange: (val: number | undefined) => void;
  onFullStockPriceChange: (val: number | undefined) => void;
  onCostPriceChange: (val: number | undefined) => void;
  onIsNewChange: (val: boolean, until?: string | null) => void;
  onIsHotChange: (val: boolean, until?: string | null) => void;
  onIsFeaturedChange: (val: boolean, until?: string | null) => void;
  onIsPreorderChange?: (val: boolean, date?: string | null) => void;
}

export default function ProductPricingSection({
  wholesalePrice,
  moq = 0,
  bulkThreshold,
  bulkPrice,
  fullStockPrice,
  costPrice,
  purchasePriceUpdated,
  isNew,
  newUntil,
  isHot,
  hotUntil,
  isFeatured,
  featuredUntil,
  isPreorder,
  estimatedDeliveryDate,
  errors,
  onWholesalePriceChange,
  onMoqChange: _onMoqChange,
  onBulkThresholdChange,
  onBulkPriceChange,
  onFullStockPriceChange,
  onCostPriceChange,
  onIsNewChange,
  onIsHotChange,
  onIsFeaturedChange,
  onIsPreorderChange,
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

  // Helper to format ISO date to readable label
  const formatDatePreview = (isoString?: string | null) => {
    if (!isoString) return "Active indefinitely (until changed)";
    try {
      const d = new Date(isoString);
      return `Expires ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    } catch {
      return "Scheduled";
    }
  };

  const getDaysFromNow = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };

  const getIsoFromDateInput = (val: string): string => {
    const d = new Date(`${val}T23:59:59`);
    return d.toISOString();
  };

  const getDateInputValue = (isoString?: string | null): string => {
    if (!isoString) return "";
    try {
      return isoString.split("T")[0] || "";
    } catch {
      return "";
    }
  };

  const hasCostPrice = costPrice !== undefined && costPrice !== null && !isNaN(costPrice) && costPrice > 0;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
          PRICING
        </h2>
        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-foreground">
          USD ($)
        </span>
      </div>

      <div className="space-y-4">
        {/* Primary Wholesale Price & Derived MOQ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Wholesale Price */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Wholesale Price ($) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={wholesalePrice ?? ""}
                onChange={(e) => onWholesalePriceChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder=""
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
              Minimum Order Quantity (MOQ)
            </label>
            <div className="h-10 px-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                {moq > 0 ? `${moq} PCS` : "—"}
              </span>
              {moq > 0 && (
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground bg-background px-2 py-0.5 rounded border border-border/60">
                  Auto-derived
                </span>
              )}
            </div>
            {errors.moq && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.moq}
              </p>
            )}
          </div>
        </div>

        {/* Bulk Price */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Bulk Price
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground mb-1">
                Minimum Qty <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min={moq > 0 ? moq + 1 : 1}
                  value={bulkThreshold ?? ""}
                  onChange={(e) => onBulkThresholdChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder=""
                  className={plainInputClass(Boolean(errors.bulkThreshold))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PCS
                </span>
              </div>
              {errors.bulkThreshold && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.bulkThreshold}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground mb-1">
                Unit Price ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={bulkPrice ?? ""}
                  onChange={(e) => onBulkPriceChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder=""
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

        {/* Full Stock Price */}
        <div className="p-4 rounded-xl bg-card border border-border/90 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
            Full Stock Price ($) <span className="text-red-500">*</span>
          </label>
          <div className="relative max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={fullStockPrice ?? ""}
              onChange={(e) =>
                onFullStockPriceChange(e.target.value ? parseFloat(e.target.value) : undefined)
              }
              placeholder=""
              className={inputClass(Boolean(errors.fullStockPrice || errors.full_stock_price))}
            />
          </div>
          {(errors.fullStockPrice || errors.full_stock_price) && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle size={12} />
              {errors.fullStockPrice || errors.full_stock_price}
            </p>
          )}
        </div>

        {/* Purchase Price (Internal COGS) */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Purchase Price ($)
              <span className="ml-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                Internal
              </span>
            </label>
            {!hasCostPrice ? (
              <span className="text-[10px] font-medium text-muted-foreground">
                Not set
              </span>
            ) : purchasePriceUpdated === true ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                ✓ Updated
              </span>
            ) : purchasePriceUpdated === false ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending
              </span>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground">
                Set
              </span>
            )}
          </div>
          <div className="relative max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={costPrice ?? ""}
              onChange={(e) =>
                onCostPriceChange(e.target.value ? parseFloat(e.target.value) : undefined)
              }
              placeholder=""
              className={inputClass()}
            />
          </div>
        </div>


        {/* Promotional Badges with Independent Scheduling */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Storefront Promotional Badges
            </label>
            <span className="text-[11px] text-muted-foreground">
              Independently schedulable duration
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* 1. New Arrival Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                isNew
                  ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800/80"
                  : "bg-card border-border hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(isNew)}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      onIsNewChange(enabled, enabled ? (newUntil || getDaysFromNow(7)) : null);
                    }}
                    className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-foreground">New Arrival</span>
                  </div>
                </label>
                {isNew && (
                  <span className="text-[10px] font-sans font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    {formatDatePreview(newUntil)}
                  </span>
                )}
              </div>

              {isNew && (
                <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-800/40 space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                      Active:
                    </span>
                    <button
                      type="button"
                      onClick={() => onIsNewChange(true, getDaysFromNow(7))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border border-blue-300 dark:border-blue-700 bg-card hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => onIsNewChange(true, getDaysFromNow(14))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border border-blue-300 dark:border-blue-700 bg-card hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      14 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => onIsNewChange(true, getDaysFromNow(30))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border border-blue-300 dark:border-blue-700 bg-card hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => onIsNewChange(true, null)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                        !newUntil
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "border-blue-300 dark:border-blue-700 bg-card hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      }`}
                    >
                      Until I change it
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] text-muted-foreground">Or custom end date:</span>
                    <input
                      type="date"
                      value={getDateInputValue(newUntil)}
                      onChange={(e) => {
                        if (e.target.value) {
                          onIsNewChange(true, getIsoFromDateInput(e.target.value));
                        }
                      }}
                      className="h-7 px-2 text-[11px] rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Hot Sale Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                isHot
                  ? "bg-orange-50/60 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800/80"
                  : "bg-card border-border hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(isHot)}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      onIsHotChange(enabled, enabled ? hotUntil : null);
                    }}
                    className="w-4 h-4 rounded border-border text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Flame size={14} className="text-orange-600 dark:text-orange-400 shrink-0" />
                    <span className="text-xs font-bold text-foreground">Hot Sale</span>
                  </div>
                </label>
                {isHot && (
                  <span className="text-[10px] font-sans font-semibold text-orange-700 dark:text-orange-300 bg-orange-100/80 dark:bg-orange-900/50 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                    {formatDatePreview(hotUntil)}
                  </span>
                )}
              </div>

              {isHot && (
                <div className="mt-3 pt-3 border-t border-orange-200/60 dark:border-orange-800/40 space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                      Active:
                    </span>
                    <button
                      type="button"
                      onClick={() => onIsHotChange(true, getDaysFromNow(7))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border border-orange-300 dark:border-orange-700 bg-card hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => onIsHotChange(true, getDaysFromNow(14))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border border-orange-300 dark:border-orange-700 bg-card hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                    >
                      14 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => onIsHotChange(true, getDaysFromNow(30))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border border-orange-300 dark:border-orange-700 bg-card hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                    >
                      30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => onIsHotChange(true, null)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                        !hotUntil
                          ? "bg-orange-600 text-white border-orange-600 shadow-2xs"
                          : "border-orange-300 dark:border-orange-700 bg-card hover:bg-orange-100 dark:hover:bg-orange-900/50"
                      }`}
                    >
                      Until I change it
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] text-muted-foreground">Or custom end date:</span>
                    <input
                      type="date"
                      value={getDateInputValue(hotUntil)}
                      onChange={(e) => {
                        if (e.target.value) {
                          onIsHotChange(true, getIsoFromDateInput(e.target.value));
                        }
                      }}
                      className="h-7 px-2 text-[11px] rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Featured Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                isFeatured
                  ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80"
                  : "bg-card border-border hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(isFeatured)}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      onIsFeaturedChange(enabled, enabled ? (featuredUntil || getDaysFromNow(14)) : null);
                    }}
                    className="w-4 h-4 rounded border-border text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Star size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-foreground">Featured Product</span>
                  </div>
                </label>
                {isFeatured && (
                  <span className="text-[10px] font-sans font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {formatDatePreview(featuredUntil)}
                  </span>
                )}
              </div>

              {isFeatured && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                      Active:
                    </span>
                    <button
                      type="button"
                      onClick={() => onIsFeaturedChange(true, getDaysFromNow(7))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 bg-card hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => onIsFeaturedChange(true, getDaysFromNow(14))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 bg-card hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      14 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => onIsFeaturedChange(true, getDaysFromNow(30))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 bg-card hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => onIsFeaturedChange(true, null)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                        !featuredUntil
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "border-emerald-300 dark:border-emerald-700 bg-card hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                      }`}
                    >
                      Until I change it
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] text-muted-foreground">Or custom end date:</span>
                    <input
                      type="date"
                      value={getDateInputValue(featuredUntil)}
                      onChange={(e) => {
                        if (e.target.value) {
                          onIsFeaturedChange(true, getIsoFromDateInput(e.target.value));
                        }
                      }}
                      className="h-7 px-2 text-[11px] rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Preorder Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                isPreorder
                  ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800/80"
                  : "bg-card border-border hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(isPreorder)}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      onIsPreorderChange?.(enabled, enabled ? (estimatedDeliveryDate || getDaysFromNow(30).split("T")[0]) : null);
                    }}
                    className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold text-foreground">PRE-ORDER</span>
                  </div>
                </label>
                {isPreorder && (
                  <span className="text-[10px] font-sans font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {estimatedDeliveryDate ? `Est. delivery: ${new Date(estimatedDeliveryDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : "Delivery date required"}
                  </span>
                )}
              </div>

              {isPreorder && (
                <div className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/40 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <span>ESTIMATED DELIVERY DATE</span>
                      <span className="text-red-500 text-xs">* Required</span>
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground mr-0.5">Presets:</span>
                      <button
                        type="button"
                        onClick={() => onIsPreorderChange?.(true, getDaysFromNow(14).split("T")[0])}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-indigo-300 dark:border-indigo-700 bg-card hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        +14 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => onIsPreorderChange?.(true, getDaysFromNow(30).split("T")[0])}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-indigo-300 dark:border-indigo-700 bg-card hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        +30 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => onIsPreorderChange?.(true, getDaysFromNow(60).split("T")[0])}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-indigo-300 dark:border-indigo-700 bg-card hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        +60 Days
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={estimatedDeliveryDate ? estimatedDeliveryDate.split("T")[0] : ""}
                      onChange={(e) => {
                        onIsPreorderChange?.(true, e.target.value || null);
                      }}
                      className={`h-8 px-2.5 text-xs rounded-lg border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        errors.estimatedDeliveryDate ? "border-red-500 ring-1 ring-red-500/30" : "border-border"
                      }`}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Expected delivery date to customer
                    </span>
                  </div>
                  {errors.estimatedDeliveryDate && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle size={12} />
                      {errors.estimatedDeliveryDate}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
