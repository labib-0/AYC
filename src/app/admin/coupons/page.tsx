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
} from "@/components/admin/coupons";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";

const PER_PAGE = 20;

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "percentage" | "flat">("all");
  const [page, setPage] = useState(1);
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
      if (typeFilter !== "all" && c.discount_type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        if (!c.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [coupons, statusFilter, typeFilter, search]);

  const paginatedCoupons = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filteredCoupons.slice(start, start + PER_PAGE);
  }, [filteredCoupons, page]);

  const totalPages = Math.ceil(filteredCoupons.length / PER_PAGE);

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
    <div className="space-y-6">
      {/* 1. Header */}
      <CouponHeader
        onAddCoupon={handleOpenAdd}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Filters & Search */}
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

      {/* 3. Table */}
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

      {/* 4. Pagination */}
      <CouponPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={filteredCoupons.length}
        pageSize={PER_PAGE}
        onPageChange={setPage}
      />

      {/* 5. Modals */}
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

      {/* 6. Toasts */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
