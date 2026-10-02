"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminCustomerService, CustomerDetail } from "@/services/admin";
import {
  CustomerDetailHeader,
  CustomerProfileCard,
  CustomerPurchasedProductsTable,
  CustomerOrdersTable,
  CustomerQuotesTable,
  CustomerAddressesCard,
} from "@/components/admin/customers";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AlertTriangle, ArrowLeft, Trash2, X } from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

export default function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // Data & Loading State
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const addToast = (type: "success" | "error", message: string) => {
    const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
  };

  const removeToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  const loadCustomer = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setLoading(true);
    setError(null);

    try {
      const data = await adminCustomerService.getCustomerById(id);
      setCustomer(data);
    } catch (err: unknown) {
      setError((err as Error)?.message || "The requested customer account could not be found.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCustomer(true);
    addToast("success", "Customer details refreshed.");
  };

  const handleDeleteConfirm = async () => {
    if (!customer) return;
    setIsDeleting(true);

    try {
      await adminCustomerService.deleteCustomer(customer.id);
      setIsDeleteDialogOpen(false);
      addToast(
        "success",
        `Customer "${customer.name}" was successfully deleted while preserving historical orders.`
      );
      setTimeout(() => {
        router.push("/admin/customers");
      }, 1000);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to delete customer account.");
      setIsDeleting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <AdminPageGate permission="customer.view">
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs text-muted-foreground font-medium">
            Loading customer account details...
          </span>
        </div>
      </AdminPageGate>
    );
  }

  // Not Found / Error State
  if (error || !customer) {
    return (
      <AdminPageGate permission="customer.view">
        <div className="p-8 bg-card border border-destructive/30 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
          <AlertTriangle size={36} className="text-destructive mx-auto" />
          <h2 className="text-lg font-bold uppercase text-foreground">Customer Not Found</h2>
          <p className="text-xs text-muted-foreground">
            {error || "The requested customer account could not be found."}
          </p>
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Back to Customers</span>
          </Link>
        </div>
      </AdminPageGate>
    );
  }

  return (
    <AdminPageGate permission="customer.view">
      <div className="space-y-8 w-full max-w-full">
      {/* 1. Header */}
      <CustomerDetailHeader
        customer={customer}
        backHref="/admin/customers"
        onRefresh={handleRefresh}
        onDeleteCustomer={() => setIsDeleteDialogOpen(true)}
        isLoading={isRefreshing}
      />

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN (2 Cols on lg): Profile, Purchased Products, Saved Addresses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Overview */}
          <CustomerProfileCard customer={customer} />

          {/* Purchased Products Breakdown */}
          <CustomerPurchasedProductsTable
            products={customer.purchased_products || []}
          />

          {/* Saved Delivery Addresses */}
          <CustomerAddressesCard addresses={customer.addresses || []} />
        </div>

        {/* RIGHT COLUMN (1 Col on lg): Recent Orders & Recent Quotes */}
        <div className="space-y-6">
          {/* Recent Orders */}
          <CustomerOrdersTable
            orders={customer.recent_orders || []}
            orderBaseUrl="/admin/orders"
          />

          {/* Recent Quotes */}
          <CustomerQuotesTable quotes={customer.recent_quotes || []} />
        </div>
      </div>

      {/* 3. Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-destructive">
                <Trash2 size={18} />
                <h3
                  id="delete-dialog-title"
                  className="font-bold text-base uppercase tracking-tight text-foreground"
                >
                  Delete Customer Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
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
                <strong className="text-foreground">{customer.name}</strong> (
                <span className="font-mono">{customer.email}</span>)?
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
                onClick={() => setIsDeleteDialogOpen(false)}
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

      {/* 4. Global Toast Notifications */}
      <ProductToast toasts={toasts} onDismiss={removeToast} />
    </div>
    </AdminPageGate>
  );
}
