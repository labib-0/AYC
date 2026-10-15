"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, AlertCircle, RefreshCw } from "lucide-react";
import { brandService, BrandModel } from "@/services/brand.service";
import { homepageService } from "@/services/homepage.service";
import {
  BrandToolbar,
  BrandStatusFilter,
  BrandTable,
  BrandModal,
  BrandStatusDialog,
  BrandDeleteDialog,
  BrandPagination,
} from "@/components/admin/brands";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { PermissionGate } from "@/components/admin/auth/PermissionGate";
import { DEFAULT_ADMIN_PAGE_SIZE, AdminPageSize } from "@/types/admin-listing";
import { useTableReorder, TableReorderBanner } from "@/components/admin/ordered-list";

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BrandStatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<AdminPageSize>(DEFAULT_ADMIN_PAGE_SIZE);

  // Dialog & Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandModel | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatusBrand, setTargetStatusBrand] = useState<BrandModel | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetDeleteBrand, setTargetDeleteBrand] = useState<BrandModel | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Brands
  const loadBrands = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await brandService.getBrands({ isAdmin: true, all: true });
      setBrands(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load brands. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // Search & Filter Handlers (Resets page to 1)
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: BrandStatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setCurrentPage(1);
    setPerPage("all");
    addToast(
      "success",
      `Filters cleared. Showing all ${brands.length} brands in manual sequence. Reordering enabled.`
    );
  };

  // Filtered & Paginated Brands
  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      // Search matching name or slug
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q);

      // Status matching
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && b.is_active !== false) ||
        (statusFilter === "INACTIVE" && b.is_active === false) ||
        (statusFilter === "LANDING" && Boolean(b.is_featured_on_landing));

      return matchesSearch && matchesStatus;
    });
  }, [brands, search, statusFilter]);

  // Statistics for Toolbar
  const activeCount = useMemo(() => brands.filter((b) => b.is_active !== false).length, [brands]);
  const inactiveCount = useMemo(() => brands.filter((b) => b.is_active === false).length, [brands]);
  const landingCount = useMemo(() => brands.filter((b) => Boolean(b.is_featured_on_landing)).length, [brands]);

  // Pagination Calculations
  const isAll = perPage === "all";
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(filteredBrands.length / (perPage as number)));
  const startIndex = isAll ? 0 : (currentPage - 1) * (perPage as number);
  const paginatedBrands = useMemo(() => {
    if (isAll) return filteredBrands;
    return filteredBrands.slice(startIndex, startIndex + (perPage as number));
  }, [filteredBrands, startIndex, perPage, isAll]);

  const isFiltered = Boolean(search.trim() || statusFilter !== "ALL");
  const isReorderEligible = !isFiltered && isAll && !loading && !error && brands.length > 0;

  // Persistent Reordering Hook
  const reorder = useTableReorder<BrandModel>({
    items: brands,
    onItemsChange: setBrands,
    getItemId: (b) => b.id,
    getItemTitle: (b) => b.name,
    isReorderDisabled: !isReorderEligible,
    disabledReason:
      "Reordering is disabled while search or status filters are active. Clear filters to return to manual sequence.",
    currentPage,
    pageSize: perPage,
    onPageChange: setCurrentPage,
    onPersistOrder: async (newItems) => {
      const updated = await brandService.reorderBrands(
        newItems.map((b, idx) => ({ id: b.id, sort_order: idx + 1 }))
      );
      if (typeof window !== "undefined") {
        homepageService.invalidateStorefrontCache();
        window.dispatchEvent(new CustomEvent("ayaan:homepage-updated"));
      }
      return updated;
    },
    showToast: (message, type) => addToast(type, message),
  });

  // Determine next available sort order for brand creation
  const nextSortOrder = useMemo(() => {
    if (brands.length === 0) return 1;
    const maxOrder = Math.max(...brands.map((b) => b.sort_order || 0));
    return maxOrder + 1;
  }, [brands]);

  // Modal Actions
  const handleOpenCreate = () => {
    setEditingBrand(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (brand: BrandModel) => {
    setEditingBrand(brand);
    setModalOpen(true);
  };

  const handleBrandSaved = (_saved: BrandModel) => {
    if (editingBrand) {
      addToast("success", "Brand updated successfully.");
    } else {
      addToast("success", "Brand created successfully.");
    }
    loadBrands(true);
  };

  // Status Toggle Dialog Actions
  const handlePromptToggleStatus = (brand: BrandModel) => {
    setTargetStatusBrand(brand);
    setStatusDialogOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!targetStatusBrand) return;

    setStatusLoading(true);
    const newStatus = targetStatusBrand.is_active === false; // If currently false, activate (true)
    try {
      await brandService.updateBrand(targetStatusBrand.id, {
        is_active: newStatus,
      });
      addToast(
        "success",
        newStatus ? "Brand activated successfully." : "Brand deactivated successfully."
      );
      setStatusDialogOpen(false);
      setTargetStatusBrand(null);
      await loadBrands(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update brand status.";
      addToast("error", msg);
    } finally {
      setStatusLoading(false);
    }
  };

  // Delete Dialog Actions
  const handlePromptDelete = (brand: BrandModel) => {
    setTargetDeleteBrand(brand);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetDeleteBrand) return;

    setDeleteLoading(true);
    try {
      await brandService.deleteBrand(targetDeleteBrand.id);
      addToast("success", "Brand deleted successfully.");
      setDeleteDialogOpen(false);
      setTargetDeleteBrand(null);

      // Reload brands
      const updatedBrands = await brandService.getBrands({ isAdmin: true, all: true });
      setBrands(updatedBrands);

      // Check if current page became empty after deletion
      const remainingFiltered = updatedBrands.filter((b) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          b.name.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "ACTIVE" && b.is_active !== false) ||
          (statusFilter === "INACTIVE" && b.is_active === false);

        return matchesSearch && matchesStatus;
      });

      const newTotalPages = perPage === "all" ? 1 : Math.ceil(remainingFiltered.length / (perPage as number));
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete brand.";
      addToast("error", msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AdminPageGate permission="brand.view" moduleName="Brands">
      <div className="space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
              Brands
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage your clothing brands, logos and availability.
            </p>
          </div>

          <PermissionGate permission="brand.create">
            <button
              type="button"
              id="btn-add-brand"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Brand</span>
            </button>
          </PermissionGate>
        </div>

        {/* ── Error State with Retry ── */}
        {error ? (
          <div className="p-6 rounded-2xl bg-card border border-destructive/30 space-y-3 text-center">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Unable to load brands</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => loadBrands()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-foreground transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Brand Management Toolbar ── */}
            <BrandToolbar
              search={search}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              totalBrands={brands.length}
              activeCount={activeCount}
              inactiveCount={inactiveCount}
              landingCount={landingCount}
              onRefresh={() => loadBrands(true)}
              isRefreshing={isRefreshing}
            />

            {/* ── Reorder Status & Filter Guard Banner ── */}
            <TableReorderBanner
              isSaving={reorder.isSaving}
              isReorderDisabled={false}
              hideDisabledBanner={true}
              onClearFilters={handleClearFilters}
              isReady={isReorderEligible}
              readyMessage={`All ${brands.length} brands loaded in manual sequence. Drag handles and Move Up / Down actions are enabled.`}
            />

            {/* ── Brand Table & Responsive Mobile Cards ── */}
            <BrandTable
              brands={paginatedBrands}
              loading={loading}
              isFiltered={isFiltered}
              onEdit={handleOpenEdit}
              onToggleStatus={handlePromptToggleStatus}
              onDelete={handlePromptDelete}
              onAddBrand={handleOpenCreate}
              onClearFilters={handleClearFilters}
              startIndex={startIndex}
              showReorderControls={isReorderEligible}
              isReorderDisabled={!isReorderEligible}
              disabledReason={reorder.disabledReason}
              onPointerDown={isReorderEligible ? reorder.handlePointerDown : undefined}
              onMoveUp={isReorderEligible ? reorder.moveUp : undefined}
              onMoveDown={isReorderEligible ? reorder.moveDown : undefined}
              isFirstItem={reorder.isFirstItem}
              isLastItem={reorder.isLastItem}
              getRowVisualClass={isReorderEligible ? reorder.getRowVisualClass : undefined}
            />

            {/* ── Brand Pagination ── */}
            {!loading && (
              <BrandPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredBrands.length}
                perPage={perPage}
                onPageChange={setCurrentPage}
                onPerPageChange={(newSize) => {
                  setPerPage(newSize);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}

        {/* ── Add / Edit Brand Modal ── */}
        <BrandModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          brand={editingBrand}
          onSuccess={handleBrandSaved}
          defaultSortOrder={nextSortOrder}
        />

        {/* ── Status Change Confirmation Dialog ── */}
        <BrandStatusDialog
          open={statusDialogOpen}
          brand={targetStatusBrand}
          onConfirm={handleConfirmToggleStatus}
          onCancel={() => {
            setStatusDialogOpen(false);
            setTargetStatusBrand(null);
          }}
          loading={statusLoading}
        />

        {/* ── Safe Delete Confirmation Dialog ── */}
        <BrandDeleteDialog
          open={deleteDialogOpen}
          brand={targetDeleteBrand}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setTargetDeleteBrand(null);
          }}
          loading={deleteLoading}
        />

        {/* ── Toast Feedback Notifications ── */}
        <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}
