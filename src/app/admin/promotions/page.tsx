"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  adminPromotionService, 
  PromotionRecord, 
  CouponRecord 
} from "@/services/admin/promotion.service";
import {
  PromotionHeader,
  PromotionTabs,
  PromotionToolbar,
  PromotionTable,
  PromotionModal,
  PromotionDeleteDialog,
  PromotionPagination,
  CouponToolbar,
  CouponTable,
  CouponModal,
  CouponDeleteDialog,
  CouponPagination,
} from "@/components/admin/promotions";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";

const PER_PAGE = 20;

export default function AdminPromotionsPage() {
  const [activeTab, setActiveTab] = useState<"promotions" | "coupons">("promotions");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // --------------------------------------------------------------------------
  // Promotions State
  // --------------------------------------------------------------------------
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [promoSearch, setPromoSearch] = useState("");
  const [promoStatusFilter, setPromoStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [promoTypeFilter, setPromoTypeFilter] = useState("all");
  const [promoPage, setPromoPage] = useState(1);

  // Promotion Modals State
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionRecord | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<PromotionRecord | null>(null);
  const [isDeletingPromo, setIsDeletingPromo] = useState(false);

  // --------------------------------------------------------------------------
  // Coupons State
  // --------------------------------------------------------------------------
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [couponLoading, setCouponLoading] = useState(true);
  const [couponSearch, setCouponSearch] = useState("");
  const [couponStatusFilter, setCouponStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [couponTypeFilter, setCouponTypeFilter] = useState<"all" | "percentage" | "flat">("all");
  const [couponPage, setCouponPage] = useState(1);

  // Coupon Modals State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRecord | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<CouponRecord | null>(null);
  const [isDeletingCoupon, setIsDeletingCoupon] = useState(false);

  // Refresh UX
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Promotions
  const loadPromotions = useCallback(async () => {
    setPromoLoading(true);
    try {
      const data = await adminPromotionService.getPromotions();
      setPromotions(data);
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to load promotions.", "error");
    } finally {
      setPromoLoading(false);
    }
  }, [showToast]);

  // Fetch Coupons
  const loadCoupons = useCallback(async () => {
    setCouponLoading(true);
    try {
      const data = await adminPromotionService.getCoupons();
      setCoupons(data);
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to load coupons.", "error");
    } finally {
      setCouponLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPromotions();
    loadCoupons();
  }, [loadPromotions, loadCoupons]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === "promotions") {
      await loadPromotions();
    } else {
      await loadCoupons();
    }
    setIsRefreshing(false);
    showToast("Data refreshed successfully.", "success");
  };

  // --------------------------------------------------------------------------
  // Promotions Filtering & Pagination Logic
  // --------------------------------------------------------------------------
  const filteredPromotions = useMemo(() => {
    return promotions.filter((promo) => {
      // Search
      if (promoSearch.trim()) {
        const query = promoSearch.toLowerCase();
        const matchesTitle = promo.title.toLowerCase().includes(query);
        const matchesSubtitle = promo.subtitle?.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesSubtitle) return false;
      }

      // Status
      if (promoStatusFilter === "active" && !promo.is_active) return false;
      if (promoStatusFilter === "inactive" && promo.is_active) return false;

      // Type
      if (promoTypeFilter !== "all" && promo.type !== promoTypeFilter) return false;

      return true;
    });
  }, [promotions, promoSearch, promoStatusFilter, promoTypeFilter]);

  const promoTotalPages = Math.ceil(filteredPromotions.length / PER_PAGE) || 1;
  const paginatedPromotions = useMemo(() => {
    const start = (promoPage - 1) * PER_PAGE;
    return filteredPromotions.slice(start, start + PER_PAGE);
  }, [filteredPromotions, promoPage]);

  const handlePromoSearchChange = (val: string) => {
    setPromoSearch(val);
    setPromoPage(1);
  };

  const handlePromoStatusFilterChange = (val: "all" | "active" | "inactive") => {
    setPromoStatusFilter(val);
    setPromoPage(1);
  };

  const handlePromoTypeFilterChange = (val: string) => {
    setPromoTypeFilter(val);
    setPromoPage(1);
  };

  const handleResetPromoFilters = () => {
    setPromoSearch("");
    setPromoStatusFilter("all");
    setPromoTypeFilter("all");
    setPromoPage(1);
  };

  // Promotion CRUD Handlers
  const handleOpenAddPromo = () => {
    setEditingPromo(null);
    setIsPromoModalOpen(true);
  };

  const handleOpenEditPromo = (promo: PromotionRecord) => {
    setEditingPromo(promo);
    setIsPromoModalOpen(true);
  };

  const handleSavePromo = async (data: Partial<PromotionRecord>) => {
    if (editingPromo) {
      await adminPromotionService.updatePromotion(editingPromo.id, data);
      showToast("Promotion updated successfully.", "success");
    } else {
      await adminPromotionService.createPromotion(data);
      showToast("Promotion created successfully.", "success");
    }
    await loadPromotions();
  };

  const handleTogglePromoActive = async (promo: PromotionRecord) => {
    try {
      await adminPromotionService.updatePromotion(promo.id, { is_active: !promo.is_active });
      showToast(
        `Promotion ${!promo.is_active ? "activated" : "deactivated"} successfully.`,
        "success"
      );
      await loadPromotions();
    } catch {
      showToast("Unable to update promotion status.", "error");
    }
  };

  const handleConfirmDeletePromo = async () => {
    if (!deletingPromo) return;
    setIsDeletingPromo(true);
    try {
      await adminPromotionService.deletePromotion(deletingPromo.id);
      showToast("Promotion deleted successfully.", "success");
      setDeletingPromo(null);
      await loadPromotions();
    } catch {
      showToast("Unable to delete promotion.", "error");
    } finally {
      setIsDeletingPromo(false);
    }
  };

  // --------------------------------------------------------------------------
  // Coupons Filtering & Pagination Logic
  // --------------------------------------------------------------------------
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      // Search
      if (couponSearch.trim()) {
        const query = couponSearch.toLowerCase();
        if (!coupon.code.toLowerCase().includes(query)) return false;
      }

      // Status
      if (couponStatusFilter === "active" && !coupon.is_active) return false;
      if (couponStatusFilter === "inactive" && coupon.is_active) return false;

      // Type
      if (couponTypeFilter !== "all" && coupon.discount_type !== couponTypeFilter) return false;

      return true;
    });
  }, [coupons, couponSearch, couponStatusFilter, couponTypeFilter]);

  const couponTotalPages = Math.ceil(filteredCoupons.length / PER_PAGE) || 1;
  const paginatedCoupons = useMemo(() => {
    const start = (couponPage - 1) * PER_PAGE;
    return filteredCoupons.slice(start, start + PER_PAGE);
  }, [filteredCoupons, couponPage]);

  const handleCouponSearchChange = (val: string) => {
    setCouponSearch(val);
    setCouponPage(1);
  };

  const handleCouponStatusFilterChange = (val: "all" | "active" | "inactive") => {
    setCouponStatusFilter(val);
    setCouponPage(1);
  };

  const handleCouponTypeFilterChange = (val: "all" | "percentage" | "flat") => {
    setCouponTypeFilter(val);
    setCouponPage(1);
  };

  const handleResetCouponFilters = () => {
    setCouponSearch("");
    setCouponStatusFilter("all");
    setCouponTypeFilter("all");
    setCouponPage(1);
  };

  // Coupon CRUD Handlers
  const handleOpenAddCoupon = () => {
    setEditingCoupon(null);
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (coupon: CouponRecord) => {
    setEditingCoupon(coupon);
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = async (data: Partial<CouponRecord>) => {
    if (editingCoupon) {
      await adminPromotionService.updateCoupon(editingCoupon.id, data);
      showToast("Coupon updated successfully.", "success");
    } else {
      await adminPromotionService.createCoupon(data);
      showToast("Coupon created successfully.", "success");
    }
    await loadCoupons();
  };

  const handleToggleCouponActive = async (coupon: CouponRecord) => {
    try {
      await adminPromotionService.updateCoupon(coupon.id, { is_active: !coupon.is_active });
      showToast(
        `Coupon ${!coupon.is_active ? "activated" : "deactivated"} successfully.`,
        "success"
      );
      await loadCoupons();
    } catch {
      showToast("Unable to update coupon status.", "error");
    }
  };

  const handleConfirmDeleteCoupon = async () => {
    if (!deletingCoupon) return;
    setIsDeletingCoupon(true);
    try {
      await adminPromotionService.deleteCoupon(deletingCoupon.id);
      showToast("Coupon deleted successfully.", "success");
      setDeletingCoupon(null);
      await loadCoupons();
    } catch {
      showToast("Unable to delete coupon.", "error");
    } finally {
      setIsDeletingCoupon(false);
    }
  };

  const hasActivePromoFilters = Boolean(
    promoSearch || promoStatusFilter !== "all" || promoTypeFilter !== "all"
  );

  const hasActiveCouponFilters = Boolean(
    couponSearch || couponStatusFilter !== "all" || couponTypeFilter !== "all"
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />

      {/* Header with Title and Add Action */}
      <PromotionHeader
        activeTab={activeTab}
        onAddPromotion={handleOpenAddPromo}
        onAddCoupon={handleOpenAddCoupon}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Dual Tab Switcher */}
      <PromotionTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        promotionsCount={promotions.length}
        couponsCount={coupons.length}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Tab 1: PROMOTIONS                                                  */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "promotions" && (
        <div className="space-y-4">
          <PromotionToolbar
            search={promoSearch}
            onSearchChange={handlePromoSearchChange}
            statusFilter={promoStatusFilter}
            onStatusFilterChange={handlePromoStatusFilterChange}
            typeFilter={promoTypeFilter}
            onTypeFilterChange={handlePromoTypeFilterChange}
            onResetFilters={handleResetPromoFilters}
            hasActiveFilters={hasActivePromoFilters}
          />

          <PromotionTable
            promotions={paginatedPromotions}
            loading={promoLoading}
            search={promoSearch}
            hasActiveFilters={hasActivePromoFilters}
            onEdit={handleOpenEditPromo}
            onToggleActive={handleTogglePromoActive}
            onDelete={(promo) => setDeletingPromo(promo)}
            onAddPromotion={handleOpenAddPromo}
            onResetFilters={handleResetPromoFilters}
          />

          <PromotionPagination
            currentPage={promoPage}
            totalPages={promoTotalPages}
            totalItems={filteredPromotions.length}
            pageSize={PER_PAGE}
            onPageChange={setPromoPage}
          />

          {/* Promotion Add/Edit Modal */}
          <PromotionModal
            isOpen={isPromoModalOpen}
            onClose={() => {
              setIsPromoModalOpen(false);
              setEditingPromo(null);
            }}
            promotion={editingPromo}
            onSave={handleSavePromo}
          />

          {/* Promotion Delete Confirmation Dialog */}
          <PromotionDeleteDialog
            isOpen={Boolean(deletingPromo)}
            promotion={deletingPromo}
            onClose={() => setDeletingPromo(null)}
            onConfirmDelete={handleConfirmDeletePromo}
            isDeleting={isDeletingPromo}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Tab 2: COUPONS                                                     */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "coupons" && (
        <div className="space-y-4">
          <CouponToolbar
            search={couponSearch}
            onSearchChange={handleCouponSearchChange}
            statusFilter={couponStatusFilter}
            onStatusFilterChange={handleCouponStatusFilterChange}
            typeFilter={couponTypeFilter}
            onTypeFilterChange={handleCouponTypeFilterChange}
            onResetFilters={handleResetCouponFilters}
            hasActiveFilters={hasActiveCouponFilters}
          />

          <CouponTable
            coupons={paginatedCoupons}
            loading={couponLoading}
            search={couponSearch}
            hasActiveFilters={hasActiveCouponFilters}
            onEdit={handleOpenEditCoupon}
            onToggleActive={handleToggleCouponActive}
            onDelete={(coupon) => setDeletingCoupon(coupon)}
            onAddCoupon={handleOpenAddCoupon}
            onResetFilters={handleResetCouponFilters}
          />

          <CouponPagination
            currentPage={couponPage}
            totalPages={couponTotalPages}
            totalItems={filteredCoupons.length}
            pageSize={PER_PAGE}
            onPageChange={setCouponPage}
          />

          {/* Coupon Add/Edit Modal */}
          <CouponModal
            isOpen={isCouponModalOpen}
            onClose={() => {
              setIsCouponModalOpen(false);
              setEditingCoupon(null);
            }}
            coupon={editingCoupon}
            onSave={handleSaveCoupon}
          />

          {/* Coupon Delete Confirmation Dialog */}
          <CouponDeleteDialog
            isOpen={Boolean(deletingCoupon)}
            coupon={deletingCoupon}
            onClose={() => setDeletingCoupon(null)}
            onConfirmDelete={handleConfirmDeleteCoupon}
            isDeleting={isDeletingCoupon}
          />
        </div>
      )}
    </div>
  );
}
