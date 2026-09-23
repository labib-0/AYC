import React from "react";
import {
  Search,
  RotateCcw,
  Filter,
  Calendar,
  Clock,
  ArrowUpDown,
  CalendarDays,
} from "lucide-react";
import {
  DateQuickFilter,
  TimeQuickFilter,
  RfqSortOrder,
} from "@/lib/rfq-datetime";

export interface RfqToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  countryFilter: string;
  onCountryFilterChange: (value: string) => void;
  availableCountries: string[];
  // Date Filtering
  dateFilter: DateQuickFilter;
  onDateFilterChange: (filter: DateQuickFilter) => void;
  customDate: string;
  onCustomDateChange: (date: string) => void;
  // Time Filtering
  timeFilter: TimeQuickFilter;
  onTimeFilterChange: (filter: TimeQuickFilter) => void;
  timeFrom: string;
  onTimeFromChange: (time: string) => void;
  timeTo: string;
  onTimeToChange: (time: string) => void;
  // Sorting
  sortOrder: RfqSortOrder;
  onSortOrderChange: (order: RfqSortOrder) => void;
  // Summary & Actions
  totalResults: number;
  onResetFilters: () => void;
  isLoading?: boolean;
}

const DATE_OPTIONS: { id: DateQuickFilter; label: string }[] = [
  { id: "ALL", label: "All Dates" },
  { id: "TODAY", label: "Today" },
  { id: "YESTERDAY", label: "Yesterday" },
  { id: "LAST_7_DAYS", label: "7 Days" },
  { id: "LAST_30_DAYS", label: "30 Days" },
  { id: "CUSTOM", label: "Custom Date" },
];

const TIME_OPTIONS: { id: TimeQuickFilter; label: string; desc?: string }[] = [
  { id: "ALL", label: "All Day" },
  { id: "MORNING", label: "Morning", desc: "06:00–12:00" },
  { id: "AFTERNOON", label: "Afternoon", desc: "12:00–17:00" },
  { id: "EVENING", label: "Evening", desc: "17:00–24:00" },
  { id: "CUSTOM", label: "Custom Time" },
];

export default function RfqToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  countryFilter,
  onCountryFilterChange,
  availableCountries,
  dateFilter,
  onDateFilterChange,
  customDate,
  onCustomDateChange,
  timeFilter,
  onTimeFilterChange,
  timeFrom,
  onTimeFromChange,
  timeTo,
  onTimeToChange,
  sortOrder,
  onSortOrderChange,
  totalResults,
  onResetFilters,
  isLoading,
}: RfqToolbarProps) {
  const isFiltered = Boolean(
    search ||
      statusFilter !== "all" ||
      countryFilter !== "all" ||
      dateFilter !== "ALL" ||
      customDate ||
      timeFilter !== "ALL" ||
      timeFrom ||
      timeTo ||
      sortOrder !== "newest"
  );

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* ── Row 1: Search, Status, Country, Sort Order ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="relative lg:col-span-4 w-full">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search RFQ #, buyer, company, country..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={isLoading}
            className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
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
        <div className="lg:col-span-3 w-full">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer font-medium disabled:opacity-50"
          >
            <option value="all">Status: All Statuses</option>
            <option value="SUBMITTED">New Inquiry</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="NEED_INFORMATION">Need Info</option>
            <option value="QUOTATION_PREPARED">Quote Ready</option>
            <option value="SENT_TO_BUYER">Quote Sent</option>
            <option value="NEGOTIATION">Negotiating</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Country Filter */}
        <div className="lg:col-span-2 w-full">
          <select
            value={countryFilter}
            onChange={(e) => onCountryFilterChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer font-medium disabled:opacity-50"
          >
            <option value="all">Country: All</option>
            {availableCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div className="lg:col-span-2 w-full">
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value as RfqSortOrder)}
              disabled={isLoading}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer font-medium disabled:opacity-50"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>
        </div>

        {/* Reset Button */}
        <div className="lg:col-span-1 flex justify-end">
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Reset all filters"
              className="w-full lg:w-auto p-2.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: Date & Time Filter Controls ─────────────────────────── */}
      <div className="pt-3 border-t border-border/50 space-y-3">
        {/* Date Filter Section */}
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0 min-w-[70px]">
            <Calendar size={13} className="text-primary" />
            <span>Date:</span>
          </div>

          {/* Quick Date Tiles */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {DATE_OPTIONS.map((opt) => {
              const isSelected = dateFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    onDateFilterChange(opt.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-2xs ring-1 ring-primary/30"
                      : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border/50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}

            {/* Custom Date Input */}
            {dateFilter === "CUSTOM" && (
              <div className="flex items-center gap-1.5 ml-1 animate-in fade-in duration-200">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => onCustomDateChange(e.target.value)}
                  disabled={isLoading}
                  aria-label="Select custom date"
                  className="px-3 py-1.5 text-xs rounded-xl border border-primary/50 bg-card text-foreground focus:ring-1 focus:ring-primary outline-none transition-all font-medium cursor-pointer"
                />
                {customDate && (
                  <button
                    type="button"
                    onClick={() => onCustomDateChange("")}
                    className="text-muted-foreground hover:text-foreground text-xs px-1"
                    title="Clear date"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Time Filter Section */}
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0 min-w-[70px]">
            <Clock size={13} className="text-blue-500" />
            <span>Time:</span>
          </div>

          {/* Quick Time Tiles */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {TIME_OPTIONS.map((opt) => {
              const isSelected = timeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    onTimeFilterChange(opt.id);
                  }}
                  title={opt.desc}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-2xs ring-1 ring-blue-600/30"
                      : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border/50"
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.desc && (
                    <span className="ml-1 text-[10px] opacity-75 font-normal hidden sm:inline">
                      ({opt.desc})
                    </span>
                  )}
                </button>
              );
            })}

            {/* Custom Time Range (From / To) */}
            {timeFilter === "CUSTOM" && (
              <div className="flex flex-wrap items-center gap-2 ml-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[11px] font-bold text-muted-foreground">From:</span>
                  <input
                    type="time"
                    value={timeFrom}
                    onChange={(e) => onTimeFromChange(e.target.value)}
                    disabled={isLoading}
                    aria-label="Start time"
                    className="px-2.5 py-1 text-xs rounded-xl border border-blue-500/50 bg-card text-foreground focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[11px] font-bold text-muted-foreground">To:</span>
                  <input
                    type="time"
                    value={timeTo}
                    onChange={(e) => onTimeToChange(e.target.value)}
                    disabled={isLoading}
                    aria-label="End time"
                    className="px-2.5 py-1 text-xs rounded-xl border border-blue-500/50 bg-card text-foreground focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer"
                  />
                </div>
                {(timeFrom || timeTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      onTimeFromChange("");
                      onTimeToChange("");
                    }}
                    className="text-muted-foreground hover:text-foreground text-xs px-1"
                    title="Clear time range"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Status & Reset Row ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-3 border-t border-border/50">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={12} className="text-primary shrink-0" />
          <span>
            Showing <strong className="text-foreground">{totalResults}</strong> matching RFQs
          </span>
          {isFiltered && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              Filtered
            </span>
          )}
          {sortOrder === "oldest" && (
            <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-medium flex items-center gap-1">
              <ArrowUpDown size={10} />
              <span>Oldest First</span>
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-primary hover:underline text-xs font-bold cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
