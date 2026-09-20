"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  adminCustomerService, 
  CustomerRecord, 
  CustomerSummaryMetrics 
} from "@/services/admin";
import {
  CustomerListHeader,
  CustomerKpis,
  CustomerToolbar,
  CustomerTable,
  CustomerPagination,
} from "@/components/admin/customers";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";

const PER_PAGE = 20;

export default function AdminCustomersPage() {
  // Data State
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [metrics, setMetrics] = useState<CustomerSummaryMetrics | null>(null);
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
  const [role, setRole] = useState("all");
  const [b2bStatus, setB2bStatus] = useState("all");

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
      const [custRes, summaryRes] = await Promise.all([
        adminCustomerService.getCustomers({
          page,
          per_page: PER_PAGE,
          search: search.trim() || undefined,
          role: role !== "all" ? role : undefined,
          b2b_approval_status: b2bStatus !== "all" ? b2bStatus : undefined,
        }),
        adminCustomerService.getCustomerSummary(),
      ]);

      setCustomers(custRes.data);
      setTotal(custRes.total);
      setTotalPages(custRes.last_page);
      setMetrics(summaryRes);
    } catch (err: any) {
      console.error("Failed to load customers:", err);
      setError(err?.message || "Unable to load customer directory.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, search, role, b2bStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    addToast("success", "Customer directory refreshed successfully.");
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleChange = (val: string) => {
    setRole(val);
    setPage(1);
  };

  const handleB2bStatusChange = (val: string) => {
    setB2bStatus(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setRole("all");
    setB2bStatus("all");
    setPage(1);
  };

  const hasFilters = search.trim() !== "" || role !== "all" || b2bStatus !== "all";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <CustomerListHeader onRefresh={handleRefresh} isLoading={isRefreshing} />

      {/* 2. KPI Metrics */}
      <CustomerKpis
        metrics={metrics}
        activeRoleFilter={role}
        activeB2bFilter={b2bStatus}
        onSelectRoleFilter={handleRoleChange}
        onSelectB2bFilter={handleB2bStatusChange}
        isLoading={loading && !metrics}
      />

      {/* 3. Search & Filters Toolbar */}
      <CustomerToolbar
        search={search}
        onSearchChange={handleSearchChange}
        role={role}
        onRoleChange={handleRoleChange}
        b2bStatus={b2bStatus}
        onB2bStatusChange={handleB2bStatusChange}
        onResetFilters={handleResetFilters}
        totalFiltered={total}
      />

      {/* 4. Customer Table */}
      <CustomerTable
        customers={customers}
        isLoading={loading}
        isError={Boolean(error)}
        errorMessage={error || undefined}
        onRetry={() => loadData()}
        hasFilters={hasFilters}
        onResetFilters={handleResetFilters}
        detailBaseUrl="/admin/customers"
      />

      {/* 5. Pagination */}
      {!loading && !error && customers.length > 0 && (
        <CustomerPagination
          currentPage={page}
          totalPages={totalPages}
          totalCustomers={total}
          perPage={PER_PAGE}
          onPageChange={(p) => setPage(p)}
          isLoading={loading}
        />
      )}

      {/* 6. Toast Notifications */}
      <ProductToast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
