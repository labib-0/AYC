"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  adminRfqService, 
  RfqSummaryMetrics 
} from "@/services/admin/rfq.service";
import { RfqRecord } from "@/types/b2b";
import {
  RfqListHeader,
  RfqKpis,
  RfqToolbar,
  RfqTable,
  RfqPagination,
} from "@/components/admin/rfq";
import { DateFilterPreset } from "@/components/admin/orders/OrderDateFilter";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

const PER_PAGE = 20;

export default function AdminRfqPage() {
  // Data State
  const [rfqs, setRfqs] = useState<RfqRecord[]>([]);
  const [metrics, setMetrics] = useState<RfqSummaryMetrics | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UX & Loading State
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Filter & Pagination State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Sync initial filters from URL params if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const initialPreset = params.get("date_preset");
    const initialFrom = params.get("date_from") || params.get("from_date");
    const initialTo = params.get("date_to") || params.get("to_date");
    const initialSearch = params.get("search");
    const initialStatus = params.get("status");
    const initialSortBy = params.get("sort_by");
    const initialSortOrder = params.get("sort_order");
    const initialPage = params.get("page");

    if (
      initialPreset &&
      ["all", "today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month", "custom"].includes(
        initialPreset
      )
    ) {
      setDatePreset(initialPreset as DateFilterPreset);
    }
    if (initialFrom) setDateFrom(initialFrom);
    if (initialTo) setDateTo(initialTo);
    if (initialSearch) setSearch(initialSearch);
    if (initialStatus) setStatus(initialStatus);
    if (initialSortBy) setSortBy(initialSortBy);
    if (initialSortOrder === "asc" || initialSortOrder === "desc") setSortOrder(initialSortOrder);
    if (initialPage && !isNaN(Number(initialPage))) setPage(Number(initialPage));
  }, []);

  // Update URL without full page reload when filters change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (datePreset !== "all") params.set("date_preset", datePreset);
    if (datePreset === "custom") {
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
    }
    if (sortBy !== "created_at") params.set("sort_by", sortBy);
    if (sortOrder !== "desc") params.set("sort_order", sortOrder);
    if (page > 1) params.set("page", String(page));

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [search, status, datePreset, dateFrom, dateTo, sortBy, sortOrder, page]);

  const addToast = (type: "success" | "error", message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setLoading(true);
    setError(null);

    try {
      const [rfqRes, summaryRes] = await Promise.all([
        adminRfqService.getRfqs({
          page,
          per_page: PER_PAGE,
          search: search.trim() || undefined,
          status: status !== "all" ? status : undefined,
          date_preset: datePreset !== "all" ? datePreset : undefined,
          date_from: datePreset === "custom" ? dateFrom : undefined,
          date_to: datePreset === "custom" ? dateTo : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
        adminRfqService.getRfqSummary(),
      ]);

      setRfqs(rfqRes.data);
      setTotal(rfqRes.total);
      setTotalPages(rfqRes.last_page);
      setMetrics(summaryRes);
    } catch (err: unknown) {
      console.error("Failed to load RFQs:", err);
      setError((err as Error)?.message || "Unable to load RFQs. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, search, status, datePreset, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    addToast("success", "RFQs refreshed successfully.");
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  const handleDateChange = (preset: DateFilterPreset, from?: string, to?: string) => {
    setDatePreset(preset);
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  };

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setDatePreset("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  };

  const hasFilters =
    search.trim() !== "" ||
    status !== "all" ||
    datePreset !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    sortBy !== "created_at" ||
    sortOrder !== "desc";

  return (
    <AdminPageGate permission="rfq.view" moduleName="RFQ Management">
      <div className="space-y-6 w-full max-w-full">
        {/* 1. Header */}
        <RfqListHeader onRefresh={handleRefresh} isLoading={isRefreshing} />

        {/* 2. KPI Metrics */}
        <RfqKpis
          metrics={metrics}
          activeStatusFilter={status}
          onSelectStatusFilter={handleStatusChange}
          isLoading={loading && !metrics}
        />

        {/* 3. Search & Filters Toolbar */}
        <RfqToolbar
          search={search}
          onSearchChange={handleSearchChange}
          datePreset={datePreset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateChange={handleDateChange}
          status={status}
          onStatusChange={handleStatusChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onResetFilters={handleResetFilters}
          totalFiltered={total}
        />

        {/* 4. RFQ Table */}
        <RfqTable
          rfqs={rfqs}
          isLoading={loading}
          isError={Boolean(error)}
          errorMessage={error || undefined}
          onRetry={() => loadData()}
          hasFilters={hasFilters}
          onResetFilters={handleResetFilters}
          detailBaseUrl="/ayc/rfq"
        />

        {/* 5. Pagination */}
        {!loading && !error && rfqs.length > 0 && (
          <RfqPagination
            currentPage={page}
            totalPages={totalPages}
            totalRfqs={total}
            perPage={PER_PAGE}
            onPageChange={(p) => setPage(p)}
            isLoading={loading}
          />
        )}

        {/* 6. Toast Alerts */}
        <ProductToast toasts={toasts} onDismiss={removeToast} />
      </div>
    </AdminPageGate>
  );
}
