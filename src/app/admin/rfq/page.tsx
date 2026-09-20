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

const PAGE_SIZE = 20;

export default function AdminRfqPage() {
  const pathname = usePathname();
  const [rfqs, setRfqs] = useState<RfqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const detailBaseUrl = pathname.startsWith("/admin") ? "/admin/rfq" : "/rfq";

  // Fetch RFQs
  const loadRfqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRfqs();
      setRfqs(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load RFQs.");
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
      (r) => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW" || r.status === "NEED_INFORMATION"
    ).length;
    const quoted = rfqs.filter(
      (r) => r.status === "QUOTATION_PREPARED" || r.status === "SENT_TO_BUYER" || r.status === "NEGOTIATION"
    ).length;
    const accepted = rfqs.filter((r) => r.status === "ACCEPTED").length;
    const totalUnits = rfqs.reduce(
      (sum, r) => sum + (r.items || []).reduce((itemSum, it) => itemSum + (it.quantity || 0), 0),
      0
    );

    return { total, needsReview, quoted, accepted, totalUnits };
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

  // Filter and search
  const filteredRfqs = useMemo(() => {
    return rfqs.filter((rfq) => {
      if (statusFilter !== "all" && rfq.status !== statusFilter) {
        return false;
      }
      if (
        countryFilter !== "all" &&
        rfq.destinationCountry.toLowerCase() !== countryFilter.toLowerCase()
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          rfq.rfqNumber.toLowerCase().includes(q) ||
          rfq.buyerName.toLowerCase().includes(q) ||
          rfq.companyName.toLowerCase().includes(q) ||
          rfq.destinationCountry.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rfqs, statusFilter, countryFilter, search]);

  // Reset pagination to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, countryFilter]);

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
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
              RFQ & Inquiries
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {rfqs.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review wholesale requests, buyer requirements and quotation activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadRfqs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <RfqKpis
        counts={kpiCounts}
        activeStatusFilter={statusFilter}
        onSelectStatusFilter={(status) => setStatusFilter(status)}
        isLoading={loading}
      />

      {/* Toolbar: Search, Filters, Reset */}
      <RfqToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        countryFilter={countryFilter}
        onCountryFilterChange={setCountryFilter}
        availableCountries={availableCountries}
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
        isFiltered={Boolean(search || statusFilter !== "all" || countryFilter !== "all")}
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
