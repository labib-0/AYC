import React from "react";
import { Search, RotateCcw, Filter } from "lucide-react";

export interface QuotationToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  totalResults: number;
  onResetFilters: () => void;
  isLoading?: boolean;
}

export default function QuotationToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalResults,
  onResetFilters,
  isLoading,
}: QuotationToolbarProps) {
  const isFiltered = Boolean(search || statusFilter !== "all");

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by Quote #, RFQ Ref, Buyer, or Company..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={isLoading}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer font-medium disabled:opacity-50"
            >
              <option value="all">Status: All</option>
              <option value="READY">Issued</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="NEGOTIATION">In Negotiation</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Reset all filters"
              className="p-2.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Filter status row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-primary" />
          <span>
            Showing <strong className="text-foreground">{totalResults}</strong> commercial quotations
          </span>
          {isFiltered && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              Filtered
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-primary hover:underline text-xs font-bold"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
