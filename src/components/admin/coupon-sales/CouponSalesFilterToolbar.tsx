"use client";

import React from "react";
import { Search, RefreshCw, Calendar, Tag, X } from "lucide-react";

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
  onRefresh: () => void;
  isRefreshing?: boolean;
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
  onRefresh,
  isRefreshing = false,
}: CouponSalesFilterToolbarProps) {
  const dateOptions = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "this_week" },
    { label: "This Month", value: "this_month" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="space-y-3 p-4 bg-card border border-border/80 rounded-2xl shadow-2xs">
      {/* 1. Bound Coupons Selector (Pills) */}
      {boundCoupons.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0">
            <Tag size={13} className="text-primary" />
            <span>Scope Filter:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => onSelectCouponId(null)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCouponId === null
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              All Assigned ({boundCoupons.length})
            </button>
            {boundCoupons.map((c) => {
              const isSelected = selectedCouponId === c.id;
              const discountText =
                c.discount_type === "percentage"
                  ? `${c.discount_value}% OFF`
                  : `$${Number(c.discount_value).toFixed(2)} OFF`;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCouponId(isSelected ? null : c.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "bg-secondary/40 text-foreground hover:bg-secondary/80 border border-border/60"
                  }`}
                >
                  <span className="font-mono font-bold">{c.code}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                  }`}>
                    {discountText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Secondary Row: Search, Date Filter & Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-border/60">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search order #, customer, coupon..."
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-border bg-secondary/20 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            id="input-coupon-sales-search"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Date Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Pills */}
          <div className="flex items-center p-0.5 rounded-xl bg-secondary/50 border border-border/70">
            {dateOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDateFilterChange(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  dateFilter === opt.value
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-1 bg-secondary/20 border border-border rounded-xl px-2 py-1 text-xs">
                <Calendar size={12} className="text-muted-foreground" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="bg-transparent text-foreground text-xs focus:outline-hidden"
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">to</span>
              <div className="flex items-center gap-1 bg-secondary/20 border border-border rounded-xl px-2 py-1 text-xs">
                <Calendar size={12} className="text-muted-foreground" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="bg-transparent text-foreground text-xs focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Refresh sales data"
            aria-label="Refresh sales data"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-primary" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
