"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { sortBrandsAlphabetically } from "@/lib/brand-sort";

export interface ProductFilters {
  search: string;
  brand: string;
  audience: string;
  status: string;
  category: string;
  designType: string;
  purchasePriceStatus: string;
  availability: string;
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
  { value: "featured", label: "Featured" },
];

const AVAILABILITIES = [
  { value: "all", label: "All Availability" },
  { value: "ready_stock", label: "Ready Stock" },
  { value: "low_stock", label: "Low Stock (< 200 pcs)" },
  { value: "out_of_stock", label: "Out of Stock (0 pcs)" },
  { value: "preorder", label: "Pre-Order" },
  { value: "sold_out", label: "Sold Out" },
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
  const [inputValue, setInputValue] = useState(filters.search);

  // Sync internal input value if external filters.search changes
  useEffect(() => {
    setInputValue(filters.search);
  }, [filters.search]);

  // Debounce search update (approx 300ms) to prevent race conditions and excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== filters.search) {
        onFilterChange({ ...filters, search: inputValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, filters, onFilterChange]);

  // Deterministically alphabetize brands for administrative selection
  const sortedBrands = useMemo(() => sortBrandsAlphabetically(brands), [brands]);

  const hasActiveFilters =
    filters.brand !== "all" ||
    filters.audience !== "all" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.designType !== "all" ||
    filters.purchasePriceStatus !== "all" ||
    (filters.availability && filters.availability !== "all") ||
    filters.search.trim() !== "";

  const activeFilterCount = [
    filters.brand !== "all",
    filters.audience !== "all",
    filters.status !== "all",
    filters.category !== "all",
    filters.designType !== "all",
    filters.purchasePriceStatus !== "all",
    filters.availability && filters.availability !== "all",
  ].filter(Boolean).length;

  const update = (key: keyof ProductFilters, value: string) => {
    onFilterChange({ ...filters, search: inputValue, [key]: value });
  };

  const clearAll = () => {
    setInputValue("");
    onFilterChange({
      search: "",
      brand: "all",
      audience: "all",
      status: "all",
      category: "all",
      designType: "all",
      purchasePriceStatus: "all",
      availability: "all",
    });
  };

  const selectClasses =
    "h-9 px-3 rounded-lg border border-border/80 bg-card text-xs font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer shadow-2xs hover:bg-secondary/40";

  return (
    <div className="space-y-2.5">
      {/* Search & Filter Row */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] sm:min-w-[280px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search products by name, SKU, brand, supplier, or Product ID…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full h-9 pl-9 pr-9 rounded-lg border border-border/80 bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shadow-2xs"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue("");
                onFilterChange({ ...filters, search: "" });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Primary Filters */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <select
            value={filters.brand}
            onChange={(e) => update("brand", e.target.value)}
            className={`${selectClasses} min-w-[125px]`}
            aria-label="Filter by brand"
          >
            <option value="all">All Brands</option>
            {sortedBrands.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={filters.audience}
            onChange={(e) => update("audience", e.target.value)}
            className={`${selectClasses} min-w-[120px]`}
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
            className={`${selectClasses} min-w-[115px]`}
            aria-label="Filter by status"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={filters.availability || "all"}
            onChange={(e) => update("availability", e.target.value)}
            className={`${selectClasses} min-w-[135px] ${filters.availability && filters.availability !== "all" ? "border-primary text-primary font-bold" : ""}`}
            aria-label="Filter by availability"
          >
            {AVAILABILITIES.map((av) => (
              <option key={av.value} value={av.value}>
                {av.label}
              </option>
            ))}
          </select>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`h-9 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              showAdvanced || activeFilterCount > 3
                ? "bg-foreground text-background border-foreground"
                : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary bg-card"
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
              type="button"
              onClick={clearAll}
              className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>
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
