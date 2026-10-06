"use client";

import React from "react";
import { 
  Search, 
  RefreshCw, 
  Calendar, 
  Tag, 
  X, 
  Download, 
  RotateCcw, 
  ArrowUpDown,
  Users,
  CheckCircle2
} from "lucide-react";

export interface BoundCouponItem {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
}

export interface CouponSalesFilterToolbarProps {
  boundCoupons: BoundCouponItem[];
  selectedCouponId: number | null;
  onSelectCouponId: (id: number | null) => void;
  dateFilter: string;
  onDateFilterChange: (filter: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  orderStatus?: string;
  onOrderStatusChange?: (status: string) => void;
  isSuperAdmin?: boolean;
  eligibleAdmins?: Array<{ id: number; name: string; email: string }>;
  selectedAdminId?: number | null;
  onSelectAdminId?: (id: number | null) => void;
  onReset: () => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  isRefreshing?: boolean;
  isExporting?: boolean;
}

export default function CouponSalesFilterToolbar({
  boundCoupons,
  selectedCouponId,
  onSelectCouponId,
  dateFilter,
  onDateFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  orderStatus = "all",
  onOrderStatusChange,
  isSuperAdmin = false,
  eligibleAdmins = [],
  selectedAdminId = null,
  onSelectAdminId,
  onReset,
  onRefresh,
  onExportCsv,
  isRefreshing = false,
  isExporting = false,
}: CouponSalesFilterToolbarProps) {
  const dateOptions = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "This Week", value: "this_week" },
    { label: "This Month", value: "this_month" },
    { label: "Last Month", value: "last_month" },
    { label: "Custom Range", value: "custom" },
  ];

  const sortOptions = [
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" },
    { label: "Highest Order Value", value: "highest_value" },
    { label: "Lowest Order Value", value: "lowest_value" },
  ];

  const statusOptions = [
    { label: "All Statuses", value: "all" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Processing", value: "processing" },
    { label: "Shipped", value: "shipped" },
    { label: "Delivered", value: "delivered" },
    { label: "Paid", value: "paid" },
  ];

  const isFiltered = Boolean(
    selectedCouponId !== null ||
    selectedAdminId !== null ||
    (orderStatus && orderStatus !== "all") ||
    (dateFilter && dateFilter !== "all") ||
    search ||
    startDate ||
    endDate ||
    (sort && sort !== "newest")
  );

  return (
    <div className="space-y-3 p-4 bg-card border border-border/80 rounded-2xl shadow-2xs">
      {/* Primary Filter Bar: Coupon Selector, Admin Selector, Status, Date Range, Search & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left Controls: Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Coupon Filter Dropdown */}
          <div className="relative inline-flex items-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs font-medium focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
              <Tag size={13} className="text-primary shrink-0" />
              <select
                value={selectedCouponId !== null ? String(selectedCouponId) : "all"}
                onChange={(e) => {
                  const val = e.target.value;
                  onSelectCouponId(val === "all" ? null : Number(val));
                }}
                className="bg-transparent text-foreground text-xs font-semibold focus:outline-hidden cursor-pointer pr-2"
                id="select-coupon-filter"
                aria-label="Filter by coupon"
              >
                <option value="all" className="bg-card text-foreground">
                  {isSuperAdmin ? `All Coupons (${boundCoupons.length})` : `All Assigned (${boundCoupons.length})`}
                </option>
                {boundCoupons.map((c) => {
                  const discountLabel =
                    c.discount_type === "percentage"
                      ? `${c.discount_value}% OFF`
                      : `$${Number(c.discount_value).toFixed(2)} OFF`;
                  return (
                    <option key={c.id} value={String(c.id)} className="bg-card text-foreground">
                      {c.code} ({discountLabel})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Super Admin: Filter by Bound Administrator (Section 22) */}
          {isSuperAdmin && eligibleAdmins.length > 0 && onSelectAdminId && (
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs font-medium focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                <Users size={13} className="text-primary shrink-0" />
                <select
                  value={selectedAdminId !== null ? String(selectedAdminId) : "all"}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSelectAdminId(val === "all" ? null : Number(val));
                  }}
                  className="bg-transparent text-foreground text-xs font-semibold focus:outline-hidden cursor-pointer pr-2"
                  id="select-admin-filter"
                  aria-label="Filter by assigned administrator"
                >
                  <option value="all" className="bg-card text-foreground">
                    All Admins ({eligibleAdmins.length})
                  </option>
                  {eligibleAdmins.map((a) => (
                    <option key={a.id} value={String(a.id)} className="bg-card text-foreground">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Order Status Dropdown */}
          {onOrderStatusChange && (
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs font-medium focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                <CheckCircle2 size={13} className="text-muted-foreground shrink-0" />
                <select
                  value={orderStatus}
                  onChange={(e) => onOrderStatusChange(e.target.value)}
                  className="bg-transparent text-foreground text-xs font-medium focus:outline-hidden cursor-pointer pr-2"
                  id="select-status-filter"
                  aria-label="Filter by order status"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Date Filter Dropdown */}
          <div className="relative inline-flex items-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs font-medium focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
              <Calendar size={13} className="text-muted-foreground shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => onDateFilterChange(e.target.value)}
                className="bg-transparent text-foreground text-xs font-medium focus:outline-hidden cursor-pointer pr-2"
                id="select-date-filter"
                aria-label="Filter by date range"
              >
                {dateOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Server-side Sort Dropdown */}
          <div className="relative inline-flex items-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs font-medium focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
              <ArrowUpDown size={13} className="text-muted-foreground shrink-0" />
              <select
                value={sort}
                onChange={(e) => onSortChange(e.target.value)}
                className="bg-transparent text-foreground text-xs font-medium focus:outline-hidden cursor-pointer pr-2"
                id="select-sort-order"
                aria-label="Sort orders"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-1 bg-secondary/20 border border-border rounded-xl px-2 py-1 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="bg-transparent text-foreground text-xs focus:outline-hidden"
                  aria-label="Start date"
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">to</span>
              <div className="flex items-center gap-1 bg-secondary/20 border border-border rounded-xl px-2 py-1 text-xs">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="bg-transparent text-foreground text-xs focus:outline-hidden"
                  aria-label="End date"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Controls: Search, Reset, Export & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search order #, customer, coupon..."
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-xl border border-border bg-secondary/20 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              id="input-coupon-sales-search"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Reset all filters to default"
              id="btn-coupon-sales-reset"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Export filtered qualifying orders to CSV"
            id="btn-coupon-sales-export-csv"
          >
            <Download size={13} className={isExporting ? "animate-bounce" : ""} />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Refresh sales data"
            aria-label="Refresh sales data"
            id="btn-coupon-sales-refresh"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-primary" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
