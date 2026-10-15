"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  adminCouponService, 
  CouponRecord 
} from "@/services/admin/coupon.service";
import {
  CouponHeader,
  CouponToolbar,
  CouponTable,
  CouponModal,
  CouponDeleteDialog,
  CouponPagination,
  CouponAdminBindingsSection,
} from "@/components/admin/coupons";
import { Tag, UserCheck } from "lucide-react";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { DEFAULT_ADMIN_PAGE_SIZE, AdminPageSize } from "@/types/admin-listing";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "percentage" | "flat">("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<AdminPageSize>(DEFAULT_ADMIN_PAGE_SIZE);
  const [activeTab, setActiveTab] = useState<"coupons" | "bindings">("coupons");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Coupon Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRecord | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<CouponRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminCouponService.getCoupons();
      setCoupons(data);
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to load coupons.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await adminCouponService.getCoupons();
      setCoupons(data);
      showToast("Coupons refreshed.", "success");
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to refresh coupons.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter & Pagination
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "inactive" && c.is_active) return false;
      if (typeFilter !== "all") {
        const isPerc = c.discount_type === "percentage";
        if (typeFilter === "percentage" && !isPerc) return false;
        if (typeFilter === "flat" && isPerc) return false;
      }
      if (search) {
        const q = search.toLowerCase().trim();
        if (!c.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [coupons, statusFilter, typeFilter, search]);

  const isAll = perPage === "all";
  const numericPerPage = isAll ? Math.max(1, filteredCoupons.length) : Number(perPage) || 5;

  const paginatedCoupons = useMemo(() => {
    if (isAll) return filteredCoupons;
    const start = (page - 1) * numericPerPage;
    return filteredCoupons.slice(start, start + numericPerPage);
  }, [filteredCoupons, page, numericPerPage, isAll]);

  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(filteredCoupons.length / numericPerPage));

  // Handlers
  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon: CouponRecord) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<CouponRecord>) => {
    if (editingCoupon) {
      await adminCouponService.updateCoupon(editingCoupon.id, data);
      showToast(`Coupon ${data.code || editingCoupon.code} updated.`, "success");
    } else {
      await adminCouponService.createCoupon(data);
      showToast(`Coupon ${data.code} created successfully.`, "success");
    }
    await loadCoupons();
  };

  const handleToggleActive = async (coupon: CouponRecord) => {
    try {
      await adminCouponService.updateCoupon(coupon.id, { is_active: !coupon.is_active });
      showToast(`Coupon ${coupon.code} marked ${!coupon.is_active ? "active" : "inactive"}.`, "success");
      await loadCoupons();
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to toggle status.", "error");
    }
  };

  const handleOpenDelete = (coupon: CouponRecord) => {
    setDeletingCoupon(coupon);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCoupon) return;
    setIsDeleting(true);
    try {
      await adminCouponService.deleteCoupon(deletingCoupon.id);
      showToast(`Coupon ${deletingCoupon.code} deleted.`, "success");
      setDeletingCoupon(null);
      await loadCoupons();
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to delete coupon.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || statusFilter !== "all" || typeFilter !== "all");

  return (
    <AdminPageGate permission="coupon.view" moduleName="Coupons Management">
      <div className="space-y-6">
        {/* 1. Header */}
        <CouponHeader
          onAddCoupon={handleOpenAdd}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* 2. Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-secondary/50 border border-border/70 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("coupons")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "coupons"
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
            id="tab-all-coupons"
          >
            <Tag size={13} />
            <span>All Coupons ({coupons.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bindings")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "bindings"
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
            id="tab-admin-bindings"
          >
            <UserCheck size={13} />
            <span>Admin Bindings</span>
          </button>
        </div>

        {activeTab === "coupons" ? (
          <>
            {/* 3. Filters & Search */}
            <CouponToolbar
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              statusFilter={statusFilter}
              onStatusFilterChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              typeFilter={typeFilter}
              onTypeFilterChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {/* 4. Table */}
            <CouponTable
              coupons={paginatedCoupons}
              loading={loading}
              search={search}
              hasActiveFilters={hasActiveFilters}
              onEdit={handleOpenEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleOpenDelete}
              onAddCoupon={handleOpenAdd}
              onResetFilters={handleResetFilters}
            />

            {/* 5. Pagination */}
            <CouponPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredCoupons.length}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={(newSize) => {
                setPerPage(newSize);
                setPage(1);
              }}
            />

            {/* 6. Modals */}
            <CouponModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              coupon={editingCoupon}
              onSave={handleSave}
            />

            <CouponDeleteDialog
              isOpen={Boolean(deletingCoupon)}
              coupon={deletingCoupon}
              onClose={() => setDeletingCoupon(null)}
              onConfirmDelete={handleConfirmDelete}
              isDeleting={isDeleting}
            />
          </>
        ) : (
          /* 7. Coupon Admin Bindings Section */
          <CouponAdminBindingsSection showToast={showToast} />
        )}

        {/* 8. Toasts */}
        <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}
