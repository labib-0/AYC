"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export interface ProductFilters {
  search: string;
  brand: string;
  audience: string;
  status: string;
  category: string;
  designType: string;
  purchasePriceStatus: string;
}

interface ProductSearchFiltersProps {
  filters: ProductFilters;
  onFilterChange: (filters: ProductFilters) => void;
  brands: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

const AUDIENCES = [
  { value: "all", label: "All Audiences" },
  { value: "MEN", label: "Men" },
  { value: "WOMEN", label: "Women" },
  { value: "BOYS", label: "Boys" },
  { value: "GIRLS", label: "Girls" },
  { value: "UNISEX", label: "Unisex" },
];

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

const PURCHASE_PRICE_STATUSES = [
  { value: "all", label: "All Purchase Prices" },
  { value: "pending", label: "Purchase Price Pending" },
  { value: "updated", label: "Purchase Price Updated" },
];

const DESIGN_TYPES = [
  { value: "all", label: "All Design Types" },
  { value: "original", label: "Original" },
  { value: "master_copy", label: "Master Copy" },
];

export default function ProductSearchFilters({
  filters,
  onFilterChange,
  brands,
  categories,
}: ProductSearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters =
    filters.brand !== "all" ||
    filters.audience !== "all" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.designType !== "all" ||
    filters.purchasePriceStatus !== "all" ||
    filters.search.trim() !== "";

  const activeFilterCount = [
    filters.brand !== "all",
    filters.audience !== "all",
    filters.status !== "all",
    filters.category !== "all",
    filters.designType !== "all",
    filters.purchasePriceStatus !== "all",
  ].filter(Boolean).length;

  const update = (key: keyof ProductFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onFilterChange({
      search: "",
      brand: "all",
      audience: "all",
      status: "all",
      category: "all",
      designType: "all",
      purchasePriceStatus: "all",
    });
  };

  const selectClasses =
    "h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors appearance-none cursor-pointer";

  return (
    <div className="space-y-3">
      {/* Search Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search products by name, SKU, or Product ID…"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full h-9 pl-9 pr-9 rounded-lg border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => update("search", "")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Primary Filters */}
        <select
          value={filters.brand}
          onChange={(e) => update("brand", e.target.value)}
          className={selectClasses}
          aria-label="Filter by brand"
        >
          <option value="all">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={filters.audience}
          onChange={(e) => update("audience", e.target.value)}
          className={selectClasses}
          aria-label="Filter by audience"
        >
          {AUDIENCES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className={selectClasses}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-9 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${
            showAdvanced || activeFilterCount > 3
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
          aria-label="Toggle advanced filters"
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">More</span>
          {activeFilterCount > 0 && (
            <span className="w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800/50 transition-colors flex items-center gap-1.5"
          >
            <X size={13} />
            Clear Filters
          </button>
        )}
      </div>

      {/* Advanced Filters Row */}
      {showAdvanced && (
        <div className="flex items-center gap-3 flex-wrap pl-0 sm:pl-0">
          <select
            value={filters.category}
            onChange={(e) => update("category", e.target.value)}
            className={selectClasses}
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filters.designType}
            onChange={(e) => update("designType", e.target.value)}
            className={selectClasses}
            aria-label="Filter by design type"
          >
            {DESIGN_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <select
            value={filters.purchasePriceStatus}
            onChange={(e) => update("purchasePriceStatus", e.target.value)}
            className={`${selectClasses} ${filters.purchasePriceStatus === "pending" ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700" : ""}`}
            aria-label="Filter by purchase price status"
          >
            {PURCHASE_PRICE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
