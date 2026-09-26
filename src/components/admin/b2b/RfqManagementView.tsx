"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { getAllRfqs } from "@/lib/services/rfq";
import { RfqRecord } from "@/types/b2b";
import RfqKpis, { RfqKpiCounts } from "@/components/admin/rfq/RfqKpis";
import RfqToolbar from "@/components/admin/rfq/RfqToolbar";
import RfqTable from "@/components/admin/rfq/RfqTable";
import RfqPagination from "@/components/admin/rfq/RfqPagination";
import { RefreshCw } from "lucide-react";
import {
  DateQuickFilter,
  TimeQuickFilter,
  RfqSortOrder,
  isRfqMatchingDateTime,
  sortRfqsByTimestamp,
  getTodayRfqSummary,
} from "@/lib/rfq-datetime";

const PAGE_SIZE = 20;

export default function RfqManagementView() {
  const pathname = usePathname();
  const [rfqs, setRfqs] = useState<RfqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  // Date & Time Filters State
  const [dateFilter, setDateFilter] = useState<DateQuickFilter>("ALL");
  const [customDate, setCustomDate] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeQuickFilter>("ALL");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  // Sorting State (Default: newest first)
  const [sortOrder, setSortOrder] = useState<RfqSortOrder>("newest");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const detailBaseUrl = pathname.startsWith("/admin") ? "/admin/rfq" : "/rfq";

  // Fetch RFQs
  const loadRfqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRfqs();
      setRfqs(data);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load RFQs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRfqs();
  }, [loadRfqs]);

  // Compute KPI counts across all RFQs
  const kpiCounts: RfqKpiCounts = useMemo(() => {
    const total = rfqs.length;
    const needsReview = rfqs.filter(
      (r) =>
        r.status === "SUBMITTED" ||
        r.status === "UNDER_REVIEW" ||
        r.status === "NEED_INFORMATION"
    ).length;
    const quoted = rfqs.filter(
      (r) =>
        r.status === "QUOTATION_PREPARED" ||
        r.status === "SENT_TO_BUYER" ||
        r.status === "NEGOTIATION"
    ).length;
    const accepted = rfqs.filter((r) => r.status === "ACCEPTED").length;
    const totalUnits = rfqs.reduce(
      (sum, r) =>
        sum +
        (r.items || []).reduce(
          (itemSum, it) => itemSum + (it.quantity || 0),
          0
        ),
      0
    );

    return { total, needsReview, quoted, accepted, totalUnits };
  }, [rfqs]);

  // Compute Today's Activity Summary
  const todaySummary = useMemo(() => {
    return getTodayRfqSummary(rfqs);
  }, [rfqs]);

  // Extract unique available countries for the filter dropdown
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    rfqs.forEach((r) => {
      if (r.destinationCountry) {
        set.add(r.destinationCountry);
      }
    });
    return Array.from(set).sort();
  }, [rfqs]);

  // Filter, Search, Date/Time Filter, and Sorting
  const filteredRfqs = useMemo(() => {
    const matched = rfqs.filter((rfq) => {
      // 1. Status Filter
      if (statusFilter !== "all" && rfq.status !== statusFilter) {
        return false;
      }
      // 2. Country Filter
      if (
        countryFilter !== "all" &&
        rfq.destinationCountry.toLowerCase() !== countryFilter.toLowerCase()
      ) {
        return false;
      }
      // 3. Search Term
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          rfq.rfqNumber.toLowerCase().includes(q) ||
          rfq.buyerName.toLowerCase().includes(q) ||
          rfq.companyName.toLowerCase().includes(q) ||
          rfq.destinationCountry.toLowerCase().includes(q);
        if (!match) return false;
      }
      // 4. Date & Time Filtering
      const dateTimeMatches = isRfqMatchingDateTime(rfq, {
        dateFilter,
        customDate,
        timeFilter,
        timeFrom,
        timeTo,
        sortOrder,
      });
      if (!dateTimeMatches) return false;

      return true;
    });

    // 5. Sort by Timestamp (Newest first vs Oldest first)
    return sortRfqsByTimestamp(matched, sortOrder);
  }, [
    rfqs,
    statusFilter,
    countryFilter,
    search,
    dateFilter,
    customDate,
    timeFilter,
    timeFrom,
    timeTo,
    sortOrder,
  ]);

  // Is any filter active?
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

  // Reset pagination to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    countryFilter,
    dateFilter,
    customDate,
    timeFilter,
    timeFrom,
    timeTo,
    sortOrder,
  ]);

  // Slice for current page
  const totalPages = Math.ceil(filteredRfqs.length / PAGE_SIZE) || 1;
  const paginatedRfqs = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredRfqs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRfqs, currentPage]);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCountryFilter("all");
    setDateFilter("ALL");
    setCustomDate("");
    setTimeFilter("ALL");
    setTimeFrom("");
    setTimeTo("");
    setSortOrder("newest");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Subheader Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <span className="text-xs font-semibold text-muted-foreground">
            Review wholesale requests, buyer requirements, and quotation activity with precise filters.
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadRfqs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards & Today's RFQ Activity Tile */}
      <RfqKpis
        counts={kpiCounts}
        todaySummary={todaySummary}
        activeStatusFilter={statusFilter}
        onSelectStatusFilter={(status) => setStatusFilter(status)}
        activeDateFilter={dateFilter}
        onSelectDateFilter={(df) => setDateFilter(df)}
        isLoading={loading}
      />

      {/* Toolbar: Search, Filters, Date & Time Tiles, Sort, Reset */}
      <RfqToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        countryFilter={countryFilter}
        onCountryFilterChange={setCountryFilter}
        availableCountries={availableCountries}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        customDate={customDate}
        onCustomDateChange={setCustomDate}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        timeFrom={timeFrom}
        onTimeFromChange={setTimeFrom}
        timeTo={timeTo}
        onTimeToChange={setTimeTo}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        totalResults={filteredRfqs.length}
        onResetFilters={handleResetFilters}
        isLoading={loading}
      />

      {/* RFQ Data Table & Mobile Cards */}
      <RfqTable
        rfqs={paginatedRfqs}
        isLoading={loading}
        error={error}
        onRetry={loadRfqs}
        isFiltered={isFiltered}
        onResetFilters={handleResetFilters}
        detailBaseUrl={detailBaseUrl}
      />

      {/* Pagination */}
      {!loading && !error && filteredRfqs.length > 0 && (
        <RfqPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRfqs.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          isLoading={loading}
        />
      )}
    </div>
  );
}
