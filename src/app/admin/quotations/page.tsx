"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { getAllQuotations } from "@/lib/services/quotations";
import { QuotationRecord } from "@/types/b2b";
import {
  QuotationToolbar,
  QuotationTable,
  QuotationPagination,
} from "@/components/admin/quotations";
import { RefreshCw } from "lucide-react";

const PAGE_SIZE = 20;

export default function AdminQuotationsPage() {
  const pathname = usePathname();
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const isUnderAdmin = pathname.startsWith("/admin");
  const rfqBaseUrl = isUnderAdmin ? "/admin/rfq" : "/rfq";
  const documentBaseUrl = isUnderAdmin ? "/admin/documents" : "/documents";

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllQuotations();
      setQuotations(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load quotations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  // Filter and search
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const match =
          q.quotationNumber.toLowerCase().includes(query) ||
          q.rfqNumber.toLowerCase().includes(query) ||
          q.buyerName.toLowerCase().includes(query) ||
          q.companyName.toLowerCase().includes(query) ||
          q.destinationCountry.toLowerCase().includes(query);
        if (!match) return false;
      }
      return true;
    });
  }, [quotations, statusFilter, search]);

  // Reset page to 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Sliced page data
  const totalPages = Math.ceil(filteredQuotations.length / PAGE_SIZE) || 1;
  const paginatedQuotations = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredQuotations.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredQuotations, currentPage]);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
              Quotations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {quotations.length} Issued
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review issued commercial quotations and quotation status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadQuotations}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filter, Reset */}
      <QuotationToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        totalResults={filteredQuotations.length}
        onResetFilters={handleResetFilters}
        isLoading={loading}
      />

      {/* Quotation Table */}
      <QuotationTable
        quotations={paginatedQuotations}
        isLoading={loading}
        error={error}
        onRetry={loadQuotations}
        isFiltered={Boolean(search || statusFilter !== "all")}
        onResetFilters={handleResetFilters}
        rfqBaseUrl={rfqBaseUrl}
        documentBaseUrl={documentBaseUrl}
      />

      {/* Pagination */}
      {!loading && !error && filteredQuotations.length > 0 && (
        <QuotationPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredQuotations.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          isLoading={loading}
        />
      )}
    </div>
  );
}
