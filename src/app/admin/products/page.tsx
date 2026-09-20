"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { B2BProductInput } from "@/types/b2b";
import {
  getProducts,
  deleteProduct,
  duplicateProduct,
  togglePublishStatus,
} from "@/lib/services/products";
import { getBrands } from "@/lib/services/brands";
import { mockStore } from "@/lib/mock-data/mock-store";

import {
  ProductSummaryMetrics,
  ProductSearchFilters,
  ProductTable,
  ProductPagination,
  ProductBulkActions,
  DeleteProductModal,
  DuplicateProductModal,
  ProductToast,
} from "@/components/admin/products";
import type { ProductFilters, ToastMessage } from "@/components/admin/products";

const ITEMS_PER_PAGE = 20;
const LOW_STOCK_THRESHOLD = 100;

export default function AdminProductsPage() {
  // ── Data State ──
  const [allProducts, setAllProducts] = useState<B2BProductInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter State ──
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    brand: "all",
    audience: "all",
    status: "all",
    category: "all",
    designType: "all",
  });

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Modals ──
  const [deleteTarget, setDeleteTarget] = useState<B2BProductInput | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<B2BProductInput | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Toast ──
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  // ── Reference Data ──
  const [brandsList, setBrandsList] = useState<Array<{ id: string; name: string }>>([]);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string }>>([]);

  // ── Helpers ──
  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = `toast_${++toastIdRef.current}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Load Reference Data ──
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const brands = await getBrands({ all: true, isAdmin: true });
        setBrandsList(brands.map((b) => ({ id: b.id, name: b.name })));
      } catch {
        // Use empty list
      }

      try {
        const cats = mockStore.getCategories();
        setCategoriesList(cats.map((c) => ({ id: String(c.id), name: c.name })));
      } catch {
        // Use empty list
      }
    }
    loadReferenceData();
  }, []);

  // ── Load Products ──
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProducts({
        isAdmin: true,
        search: filters.search || undefined,
        brand: filters.brand !== "all" ? filters.brand : undefined,
        audience: filters.audience !== "all" ? filters.audience : undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        category: filters.category !== "all" ? filters.category : undefined,
      });

      // Apply design type filter locally (not in ProductService)
      let filtered = data;
      if (filters.designType !== "all") {
        const dtLower = filters.designType.toLowerCase();
        filtered = data.filter((p) => {
          const pName = (p.name || "").toLowerCase();
          const pDesc = (p.description || p.shortDescription || "").toLowerCase();
          if (dtLower === "replica") {
            return pName.includes("replica") || pDesc.includes("replica");
          }
          // "original" = everything that's NOT a replica
          return !pName.includes("replica") && !pDesc.includes("replica");
        });
      }

      setAllProducts(filtered);
    } catch (err: any) {
      setError(err?.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filters]);

  // ── Computed Values ──
  const totalProducts = allProducts.length;
  const publishedCount = allProducts.filter((p) => p.status === "published").length;
  const draftCount = allProducts.filter((p) => p.status === "draft").length;
  const lowStockCount = allProducts.filter((p) => p.stock < LOW_STOCK_THRESHOLD).length;

  const totalPages = Math.max(1, Math.ceil(totalProducts / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const pageProducts = allProducts.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.brand !== "all" ||
    filters.audience !== "all" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.designType !== "all";

  // ── Selection Handlers ──
  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(pageProducts.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // ── Actions ──
  const handleTogglePublish = async (product: B2BProductInput) => {
    const newStatus = product.status === "published" ? "draft" : "published";
    try {
      await togglePublishStatus(product.id, newStatus);
      addToast("success", `Product ${newStatus === "published" ? "published" : "unpublished"}.`);
      await loadProducts();
    } catch {
      addToast("error", "Failed to update product status.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      await deleteProduct(deleteTarget.id);
      addToast("success", "Product deleted.");
      setDeleteTarget(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      await loadProducts();
    } catch {
      addToast("error", "Failed to delete product.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateTarget) return;
    setModalLoading(true);
    try {
      await duplicateProduct(duplicateTarget.id);
      addToast("success", "Product duplicated.");
      setDuplicateTarget(null);
      await loadProducts();
    } catch {
      addToast("error", "Failed to duplicate product.");
    } finally {
      setModalLoading(false);
    }
  };

  // ── Bulk Actions ──
  const handleBulkPublish = async () => {
    const ids = Array.from(selectedIds);
    let successCount = 0;
    for (const id of ids) {
      try {
        await togglePublishStatus(id, "published");
        successCount++;
      } catch {
        // Continue with rest
      }
    }
    addToast(
      "success",
      `${successCount} product${successCount !== 1 ? "s" : ""} published.`
    );
    setSelectedIds(new Set());
    await loadProducts();
  };

  const handleBulkUnpublish = async () => {
    const ids = Array.from(selectedIds);
    let successCount = 0;
    for (const id of ids) {
      try {
        await togglePublishStatus(id, "draft");
        successCount++;
      } catch {
        // Continue with rest
      }
    }
    addToast(
      "success",
      `${successCount} product${successCount !== 1 ? "s" : ""} unpublished.`
    );
    setSelectedIds(new Set());
    await loadProducts();
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      brand: "all",
      audience: "all",
      status: "all",
      category: "all",
      designType: "all",
    });
  };

  const pathname = usePathname();
  const isUnderAdminPath = pathname.startsWith("/admin");
  const addProductHref = isUnderAdminPath ? "/admin/products/new" : "/products/new";

  return (
    <div className="space-y-5 max-w-full">
      {/* Page Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Products</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your wholesale product catalog.
          </p>
        </div>
        <Link
          href={addProductHref}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-colors shrink-0"
        >
          <Plus size={14} />
          Add Product
        </Link>
      </div>

      {/* Summary Metrics */}
      <ProductSummaryMetrics
        total={totalProducts}
        published={publishedCount}
        draft={draftCount}
        lowStock={lowStockCount}
      />

      {/* Search & Filters */}
      <ProductSearchFilters
        filters={filters}
        onFilterChange={setFilters}
        brands={brandsList}
        categories={categoriesList}
      />

      {/* Bulk Actions */}
      <ProductBulkActions
        selectedCount={selectedIds.size}
        onBulkPublish={handleBulkPublish}
        onBulkUnpublish={handleBulkUnpublish}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Product Table */}
      <ProductTable
        products={pageProducts}
        loading={loading}
        error={error}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onTogglePublish={handleTogglePublish}
        onDuplicate={(p) => setDuplicateTarget(p)}
        onDelete={(p) => setDeleteTarget(p)}
        onRetry={loadProducts}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Pagination */}
      <ProductPagination
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={totalProducts}
        perPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      {/* Delete Modal */}
      <DeleteProductModal
        open={deleteTarget !== null}
        productName={deleteTarget?.name || ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={modalLoading}
      />

      {/* Duplicate Modal */}
      <DuplicateProductModal
        open={duplicateTarget !== null}
        productName={duplicateTarget?.name || ""}
        onConfirm={handleDuplicateConfirm}
        onCancel={() => setDuplicateTarget(null)}
        loading={modalLoading}
      />

      {/* Toast Notifications */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
