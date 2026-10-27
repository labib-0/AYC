import React from "react";
import { Search, Filter, X } from "lucide-react";

export interface CouponToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusFilterChange: (val: "all" | "active" | "inactive") => void;
  typeFilter: "all" | "percentage" | "flat";
  onTypeFilterChange: (val: "all" | "percentage" | "flat") => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export default function CouponToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  onResetFilters,
  hasActiveFilters,
}: CouponToolbarProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/80 p-3 sm:p-4 shadow-2xs space-y-3 min-w-0 w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search coupons by code..."
            className="w-full pl-9 pr-8 py-2 min-h-[38px] text-xs rounded-xl border border-border bg-background text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            id="input-search-coupons"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-1.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as "all" | "active" | "inactive")}
            className="flex-1 sm:flex-initial min-w-[110px] sm:min-w-0 px-3 py-2 min-h-[38px] text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            id="select-coupon-status"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as "all" | "percentage" | "flat")}
            className="flex-1 sm:flex-initial min-w-[110px] sm:min-w-0 px-3 py-2 min-h-[38px] text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            id="select-coupon-type"
          >
            <option value="all">All Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="flat">Flat Discount ($)</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 min-h-[38px] text-xs rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              title="Clear all filters"
            >
              <Filter size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
