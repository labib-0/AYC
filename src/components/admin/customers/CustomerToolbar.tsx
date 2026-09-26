import React from "react";
import { Search, X } from "lucide-react";

export interface CustomerToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  onResetFilters: () => void;
  totalFiltered: number;
}

export default function CustomerToolbar({
  search,
  onSearchChange,
  onResetFilters,
  totalFiltered,
}: CustomerToolbarProps) {
  const hasActiveFilters = search.trim() !== "";

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search by Name, Email, Company, or Phone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none transition-colors"
          id="input-search-customers"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-1.5 text-xs rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
            id="btn-reset-customer-filters"
          >
            <X size={12} />
            <span>Reset</span>
          </button>
        )}

        <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap pl-1">
          {totalFiltered} {totalFiltered === 1 ? "customer" : "customers"}
        </span>
      </div>
    </div>
  );
}
