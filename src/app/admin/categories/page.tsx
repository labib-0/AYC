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

const PER_PAGE = 20;

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

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
  const totalPages = Math.ceil(filteredCategories.length / PER_PAGE);
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * PER_PAGE;
    return filteredCategories.slice(startIndex, startIndex + PER_PAGE);
  }, [filteredCategories, currentPage]);

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

      const newTotalPages = Math.ceil(remainingFiltered.length / PER_PAGE);
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

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Category</span>
        </button>
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

          {/* ── Category Table & Responsive Mobile Cards ── */}
          <CategoryTable
            categories={paginatedCategories}
            loading={loading}
            isFiltered={Boolean(search || statusFilter !== "ALL")}
            onEdit={handleOpenEdit}
            onToggleStatus={handlePromptToggleStatus}
            onDelete={handlePromptDelete}
            onAddCategory={handleOpenCreate}
            onClearFilters={handleClearFilters}
          />

          {/* ── Category Pagination ── */}
          {!loading && filteredCategories.length > 0 && (
            <CategoryPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCategories.length}
              perPage={PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* ── Add / Edit Category Modal ── */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
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
  );
}
