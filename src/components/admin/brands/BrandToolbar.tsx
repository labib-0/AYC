"use client";

import React from "react";
import { Search, X, RefreshCw } from "lucide-react";

export type BrandStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

interface BrandToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: BrandStatusFilter;
  onStatusFilterChange: (status: BrandStatusFilter) => void;
  totalBrands: number;
  activeCount: number;
  inactiveCount: number;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export default function BrandToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalBrands,
  activeCount,
  inactiveCount,
  onRefresh,
  isRefreshing = false,
}: BrandToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-3 shadow-xs">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          id="brand-search-input"
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search brands..."
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1.5 focus:ring-foreground transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filter and Refresh Controls */}
      <div className="flex items-center gap-2">
        {/* Status Filter */}
        <div className="flex items-center rounded-xl bg-secondary/60 p-0.5 border border-border/60">
          <button
            type="button"
            onClick={() => onStatusFilterChange("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All <span className="opacity-60 tabular-nums">({totalBrands})</span>
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "ACTIVE"
                ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active <span className="opacity-60 tabular-nums">({activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange("INACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "INACTIVE"
                ? "bg-card text-stone-700 dark:text-stone-300 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Inactive <span className="opacity-60 tabular-nums">({inactiveCount})</span>
          </button>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          title="Refresh brands list"
          aria-label="Refresh brands"
        >
          <RefreshCw
            size={14}
            className={isRefreshing ? "animate-spin text-foreground" : ""}
          />
        </button>
      </div>
    </div>
  );
}
