import React from "react";
import { Search, Filter, X } from "lucide-react";

export interface CouponToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusFilterChange: (val: "all" | "active" | "inactive") => void;
  typeFilter: "all" | "percentage" | "fixed";
  onTypeFilterChange: (val: "all" | "percentage" | "fixed") => void;
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
    <div className="bg-card rounded-2xl border border-border/80 p-3 sm:p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search coupons by code..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            id="input-search-coupons"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as "all" | "active" | "inactive")}
            className="px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            id="select-coupon-status"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as "all" | "percentage" | "fixed")}
            className="px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            id="select-coupon-type"
          >
            <option value="all">All Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
