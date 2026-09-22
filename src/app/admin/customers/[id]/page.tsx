"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminCustomerService, CustomerDetail } from "@/services/admin";
import {
  CustomerDetailHeader,
  CustomerProfileCard,
  CustomerB2BCard,
  CustomerRoleDialog,
  CustomerOrdersTable,
  CustomerQuotesTable,
  CustomerAddressesCard,
} from "@/components/admin/customers";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Data & Loading State
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Role Change Modal State
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

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

  // B2B Configuration Save
  const handleSaveB2B = async (data: {
    b2b_approval_status: string;
    b2b_payment_terms: string;
    tax_id?: string;
    b2b_credit_limit: number;
  }) => {
    if (!customer) return;
    setActionLoading(true);

    try {
      await adminCustomerService.updateCustomer(customer.id, {
        b2b_approval_status: data.b2b_approval_status,
        b2b_payment_terms: data.b2b_payment_terms,
        tax_id: data.tax_id,
        b2b_credit_limit: data.b2b_credit_limit,
      });

      addToast("success", "Customer information updated successfully.");
      await loadCustomer(true);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Unable to update customer information.");
    } finally {
      setActionLoading(false);
    }
  };

  // Role Change Save
  const handleConfirmRoleChange = async (newRole: string) => {
    if (!customer) return;
    setActionLoading(true);

    try {
      await adminCustomerService.updateCustomer(customer.id, { role: newRole });
      setIsRoleDialogOpen(false);
      addToast("success", `Customer role updated successfully to ${newRole.toUpperCase()}.`);
      await loadCustomer(true);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Unable to change customer role.");
    } finally {
      setActionLoading(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs text-muted-foreground font-medium">
          Loading customer account details...
        </span>
      </div>
    );
  }

  // Not Found / Error State
  if (error || !customer) {
    return (
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
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Header */}
      <CustomerDetailHeader
        customer={customer}
        backHref="/admin/customers"
        onOpenRoleDialog={() => setIsRoleDialogOpen(true)}
        onRefresh={handleRefresh}
        isLoading={isRefreshing}
      />

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN (2 Cols on lg): Profile, B2B Configuration, Saved Addresses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Overview */}
          <CustomerProfileCard customer={customer} />

          {/* B2B Commercial Account Configuration */}
          <CustomerB2BCard
            customer={customer}
            onSaveB2B={handleSaveB2B}
            isLoading={actionLoading}
          />

          {/* Saved Delivery Addresses */}
          <CustomerAddressesCard addresses={customer.addresses || []} />
        </div>

        {/* RIGHT COLUMN (1 Col on lg): Recent Orders & Recent Quotes */}
        <div className="space-y-6">
          {/* Recent Orders linked to Phase 7 Orders */}
          <CustomerOrdersTable
            orders={customer.recent_orders || []}
            orderBaseUrl="/admin/orders"
          />

          {/* Recent Quotes */}
          <CustomerQuotesTable quotes={customer.recent_quotes || []} />
        </div>
      </div>

      {/* 3. Role Change Dialog */}
      <CustomerRoleDialog
        isOpen={isRoleDialogOpen}
        customerName={customer.name}
        currentRole={customer.role}
        onClose={() => setIsRoleDialogOpen(false)}
        onConfirm={handleConfirmRoleChange}
        isLoading={actionLoading}
      />

      {/* 4. Global Toast Notifications */}
      <ProductToast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
