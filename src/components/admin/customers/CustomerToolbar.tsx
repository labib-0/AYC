import React from "react";
import { Search, X } from "lucide-react";

export interface CustomerToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  role: string;
  onRoleChange: (val: string) => void;
  b2bStatus: string;
  onB2bStatusChange: (val: string) => void;
  onResetFilters: () => void;
  totalFiltered: number;
}

export default function CustomerToolbar({
  search,
  onSearchChange,
  role,
  onRoleChange,
  b2bStatus,
  onB2bStatusChange,
  onResetFilters,
  totalFiltered,
}: CustomerToolbarProps) {
  const hasActiveFilters =
    search.trim() !== "" || role !== "all" || b2bStatus !== "all";

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-center gap-3">
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

      {/* Filter Selects */}
      <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 shrink-0">
        {/* Role Filter */}
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          id="select-customer-role"
          aria-label="Filter by Role"
        >
          <option value="all">All Roles</option>
          <option value="customer">Customer</option>
          <option value="sales">Sales Representative</option>
          <option value="admin">System Administrator</option>
        </select>

        {/* B2B Status Filter */}
        <select
          value={b2bStatus}
          onChange={(e) => onB2bStatusChange(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          id="select-customer-b2b-status"
          aria-label="Filter by B2B Status"
        >
          <option value="all">All B2B Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-2 text-xs rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
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
