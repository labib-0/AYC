import React from "react";
import { Search, X } from "lucide-react";
import OrderDateFilter, { DateFilterPreset } from "@/components/admin/orders/OrderDateFilter";

export interface RfqToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  datePreset: DateFilterPreset;
  dateFrom?: string;
  dateTo?: string;
  onDateChange: (preset: DateFilterPreset, dateFrom?: string, dateTo?: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onResetFilters: () => void;
  totalFiltered: number;
}

export default function RfqToolbar({
  search,
  onSearchChange,
  datePreset,
  dateFrom,
  dateTo,
  onDateChange,
  status,
  onStatusChange,
  sortBy,
  sortOrder,
  onSortChange,
  onResetFilters,
  totalFiltered,
}: RfqToolbarProps) {
  const currentSortKey = `${sortBy}:${sortOrder}`;

  const hasActiveFilters =
    search.trim() !== "" ||
    datePreset !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    status !== "all" ||
    currentSortKey !== "created_at:desc";

  const handleSortSelect = (val: string) => {
    const [field, order] = val.split(":");
    onSortChange(field || "created_at", (order as "asc" | "desc") || "desc");
  };

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center gap-3 relative z-20">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search RFQ #, Customer, Company, or Email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none transition-colors"
          id="input-search-rfqs"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filter Controls Row */}
      <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 w-full lg:w-auto shrink-0">
        {/* Reused OrderDateFilter */}
        <OrderDateFilter
          datePreset={datePreset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={onDateChange}
        />

        {/* Workflow Status Filter */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          id="select-rfq-status"
          aria-label="Filter by RFQ Status"
        >
          <option value="all">All RFQ Statuses</option>
          <option value="SUBMITTED">RFQ Received</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="QUOTATION_GENERATED">Quotation Generated</option>
          <option value="QUOTATION_APPROVED">Quotation Approved</option>
          <option value="PAID">Payment Paid</option>
        </select>

        {/* Sort Filter */}
        <select
          value={currentSortKey}
          onChange={(e) => handleSortSelect(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          id="select-rfq-sort"
          aria-label="Sort RFQs"
        >
          <option value="created_at:desc">Newest First</option>
          <option value="created_at:asc">Oldest First</option>
          <option value="units:desc">Total Units (High to Low)</option>
          <option value="units:asc">Total Units (Low to High)</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-2 text-xs rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
            id="btn-reset-rfq-filters"
          >
            <X size={12} />
            <span>Reset</span>
          </button>
        )}

        {/* Orders-style count presentation */}
        <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap pl-1">
          {totalFiltered} {totalFiltered === 1 ? "RFQ" : "RFQs"}
        </span>
      </div>
    </div>
  );
}
