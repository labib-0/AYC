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
import { Trash2, AlertTriangle, X } from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

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

  // Customer Deletion State
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        }),
        adminCustomerService.getCustomerSummary(),
      ]);

      setCustomers(custRes.data);
      setTotal(custRes.total);
      setTotalPages(custRes.last_page);
      setMetrics(summaryRes);
    } catch (err: unknown) {
      console.error("Failed to load customers:", err);
      setError((err as Error)?.message || "Unable to load customer directory.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, search]);

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

  const handleResetFilters = () => {
    setSearch("");
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);

    try {
      await adminCustomerService.deleteCustomer(customerToDelete.id);
      addToast(
        "success",
        `Customer "${customerToDelete.name}" was successfully deleted while preserving historical orders.`
      );
      setCustomerToDelete(null);
      await loadData(true);
    } catch (err: unknown) {
      addToast(
        "error",
        (err as Error)?.message || "Failed to delete customer account."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const hasFilters = search.trim() !== "";

  return (
    <AdminPageGate permission="customer.view" moduleName="Customers Management">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* 1. Header */}
        <CustomerListHeader onRefresh={handleRefresh} isLoading={isRefreshing} />

      {/* 2. Real Backend Metrics */}
      <CustomerKpis
        metrics={metrics}
        isLoading={loading && !metrics}
      />

      {/* 3. Search Toolbar */}
      <CustomerToolbar
        search={search}
        onSearchChange={handleSearchChange}
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
        onDeleteCustomer={(c) => setCustomerToDelete(c)}
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

      {/* 6. Delete Confirmation Modal */}
      {customerToDelete && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-customer-dialog-title"
        >
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-destructive">
                <Trash2 size={18} />
                <h3
                  id="delete-customer-dialog-title"
                  className="font-bold text-base uppercase tracking-tight text-foreground"
                >
                  Delete Customer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeleting}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Are you sure you want to delete customer account{" "}
                <strong className="text-foreground">{customerToDelete.name}</strong> (
                <span className="font-mono">{customerToDelete.email}</span>)?
              </p>

              <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 flex items-start gap-2 text-[11px] text-foreground">
                <AlertTriangle size={15} className="shrink-0 text-amber-500 mt-0.5" />
                <span>
                  This soft-deletes the customer profile. All historical commercial orders, invoices, line items, and transaction logs are securely preserved for accounting and compliance.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-full border border-border text-xs font-bold uppercase tracking-wider hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity shadow-sm cursor-pointer flex items-center gap-1.5"
                id="btn-confirm-delete-customer"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Toast Notifications */}
      <ProductToast toasts={toasts} onDismiss={removeToast} />
      </div>
    </AdminPageGate>
  );
}
