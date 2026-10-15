"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, AlertCircle, RefreshCw } from "lucide-react";
import { categoryService, CategoryModel } from "@/services/category.service";
import {
  AudienceReference,
  CategoryToolbar,
  CategoryStatusFilter,
  CategoryTable,
  CategoryModal,
  CategoryStatusDialog,
  CategoryDeleteDialog,
  CategoryPagination,
} from "@/components/admin/categories";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { PermissionGate } from "@/components/admin/auth/PermissionGate";
import { DEFAULT_ADMIN_PAGE_SIZE, AdminPageSize } from "@/types/admin-listing";
import { useTableReorder, TableReorderBanner } from "@/components/admin/ordered-list";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<AdminPageSize>(DEFAULT_ADMIN_PAGE_SIZE);

  // Dialog & Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryModel | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatusCategory, setTargetStatusCategory] = useState<CategoryModel | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetDeleteCategory, setTargetDeleteCategory] = useState<CategoryModel | null>(null);
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

  // Fetch Categories
  const loadCategories = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await categoryService.getCategories({ isAdmin: true, all: true });
      setCategories(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load product categories. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Search & Filter Handlers (Resets page to 1)
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: CategoryStatusFilter) => {
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
      `Filters cleared. Showing all ${categories.length} categories in manual sequence. Reordering enabled.`
    );
  };

  // Filtered & Paginated Categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      // Search matching name or slug
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q);

      // Status matching
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && c.is_active !== false) ||
        (statusFilter === "INACTIVE" && c.is_active === false);

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  // Statistics for Toolbar
  const activeCount = useMemo(() => categories.filter((c) => c.is_active !== false).length, [categories]);
  const inactiveCount = useMemo(() => categories.filter((c) => c.is_active === false).length, [categories]);

  // Pagination Calculations
  const isAll = perPage === "all";
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(filteredCategories.length / (perPage as number)));
  const startIndex = isAll ? 0 : (currentPage - 1) * (perPage as number);
  const paginatedCategories = useMemo(() => {
    if (isAll) return filteredCategories;
    return filteredCategories.slice(startIndex, startIndex + (perPage as number));
  }, [filteredCategories, startIndex, perPage, isAll]);

  const isFiltered = Boolean(search.trim() || statusFilter !== "ALL");

  // Persistent Reordering Hook
  const reorder = useTableReorder<CategoryModel>({
    items: categories,
    onItemsChange: setCategories,
    getItemId: (c) => c.id,
    getItemTitle: (c) => c.name,
    isReorderDisabled: isFiltered,
    disabledReason:
      "Reordering is disabled while search or status filters are active. Clear filters to return to manual sequence.",
    currentPage,
    pageSize: perPage,
    onPageChange: setCurrentPage,
    onPersistOrder: async (newItems) => {
      const updated = await categoryService.reorderCategories(
        newItems.map((c, idx) => ({ id: c.id, sort_order: idx + 1 }))
      );
      return updated;
    },
    showToast: (message, type) => addToast(type, message),
  });

  // Determine next available sort order for category creation
  const nextSortOrder = useMemo(() => {
    if (categories.length === 0) return 1;
    const maxOrder = Math.max(...categories.map((c) => c.sort_order || 0));
    return maxOrder + 1;
  }, [categories]);

  // Modal Actions
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (category: CategoryModel) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  const handleCategorySaved = (_saved: CategoryModel) => {
    if (editingCategory) {
      addToast("success", "Category updated successfully.");
    } else {
      addToast("success", "Category created successfully.");
    }
    loadCategories(true);
  };

  // Status Toggle Dialog Actions
  const handlePromptToggleStatus = (category: CategoryModel) => {
    setTargetStatusCategory(category);
    setStatusDialogOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!targetStatusCategory) return;

    setStatusLoading(true);
    const newStatus = targetStatusCategory.is_active === false; // If currently false, activate (true)
    try {
      await categoryService.updateCategory(targetStatusCategory.id, {
        is_active: newStatus,
      });
      addToast(
        "success",
        newStatus ? "Category activated successfully." : "Category deactivated successfully."
      );
      setStatusDialogOpen(false);
      setTargetStatusCategory(null);
      await loadCategories(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update category status.";
      addToast("error", msg);
    } finally {
      setStatusLoading(false);
    }
  };

  // Delete Dialog Actions
  const handlePromptDelete = (category: CategoryModel) => {
    setTargetDeleteCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetDeleteCategory) return;

    setDeleteLoading(true);
    try {
      await categoryService.deleteCategory(targetDeleteCategory.id);
      addToast("success", "Category deleted successfully.");
      setDeleteDialogOpen(false);
      setTargetDeleteCategory(null);

      // Reload categories
      const updatedCategories = await categoryService.getCategories({ isAdmin: true, all: true });
      setCategories(updatedCategories);

      // Check if current page became empty after deletion
      const remainingFiltered = updatedCategories.filter((c) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "ACTIVE" && c.is_active !== false) ||
          (statusFilter === "INACTIVE" && c.is_active === false);

        return matchesSearch && matchesStatus;
      });

      const newTotalPages = perPage === "all" ? 1 : Math.ceil(remainingFiltered.length / (perPage as number));
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete category.";
      addToast("error", msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AdminPageGate permission="category.view" moduleName="Product Categories">
      <div className="space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
              Product Categories
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage the product categories used across your catalog.
            </p>
          </div>

          <PermissionGate permission="category.create">
            <button
              type="button"
              id="btn-add-category"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Category</span>
            </button>
          </PermissionGate>
        </div>

        {/* ── Read-Only Fixed Audience Reference ── */}
        <AudienceReference />

        {/* ── Error State with Retry ── */}
        {error ? (
          <div className="p-6 rounded-2xl bg-card border border-destructive/30 space-y-3 text-center">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Unable to load product categories</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => loadCategories()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-foreground transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Category Management Toolbar ── */}
            <CategoryToolbar
              search={search}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              totalCategories={categories.length}
              activeCount={activeCount}
              inactiveCount={inactiveCount}
              onRefresh={() => loadCategories(true)}
              isRefreshing={isRefreshing}
            />

            {/* ── Reorder Status & Filter Guard Banner ── */}
            <TableReorderBanner
              isSaving={reorder.isSaving}
              isReorderDisabled={reorder.isReorderDisabled}
              disabledReason={reorder.disabledReason}
              onClearFilters={handleClearFilters}
              isReady={!isFiltered && perPage === "all"}
              readyMessage={`All ${categories.length} categories loaded in manual sequence. Drag handles and Move Up / Down actions are enabled.`}
            />

            {/* ── Category Table & Responsive Mobile Cards ── */}
            <CategoryTable
              categories={paginatedCategories}
              loading={loading}
              isFiltered={isFiltered}
              onEdit={handleOpenEdit}
              onToggleStatus={handlePromptToggleStatus}
              onDelete={handlePromptDelete}
              onAddCategory={handleOpenCreate}
              onClearFilters={handleClearFilters}
              startIndex={startIndex}
              isReorderDisabled={reorder.isReorderDisabled}
              disabledReason={reorder.disabledReason}
              onPointerDown={reorder.handlePointerDown}
              onMoveUp={reorder.moveUp}
              onMoveDown={reorder.moveDown}
              isFirstItem={reorder.isFirstItem}
              isLastItem={reorder.isLastItem}
              getRowVisualClass={reorder.getRowVisualClass}
            />

            {/* ── Category Pagination ── */}
            {!loading && (
              <CategoryPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredCategories.length}
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

        {/* ── Add / Edit Category Modal ── */}
        <CategoryModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingCategory(null);
          }}
          category={editingCategory}
          onSuccess={handleCategorySaved}
          defaultSortOrder={nextSortOrder}
        />

        {/* ── Status Change Confirmation Dialog ── */}
        <CategoryStatusDialog
          open={statusDialogOpen}
          category={targetStatusCategory}
          onConfirm={handleConfirmToggleStatus}
          onCancel={() => {
            setStatusDialogOpen(false);
            setTargetStatusCategory(null);
          }}
          loading={statusLoading}
        />

        {/* ── Safe Delete Confirmation Dialog ── */}
        <CategoryDeleteDialog
          open={deleteDialogOpen}
          category={targetDeleteCategory}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setTargetDeleteCategory(null);
          }}
          loading={deleteLoading}
        />

        {/* ── Toast Feedback Notifications ── */}
        <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}
