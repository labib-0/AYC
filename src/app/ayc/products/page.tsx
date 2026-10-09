"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { B2BProductInput } from "@/types/b2b";
import {
  getProducts,
  getProductStatistics,
  deleteProduct,
  duplicateProduct,
  togglePublishStatus,
} from "@/lib/services/products";
import { brandService } from "@/services/brand.service";
import { categoryService } from "@/services/category.service";
import { productDraftService } from "@/lib/services/product-draft.service";
import { toggleProductStorefrontVisibility } from "@/services/product.service";

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
import { LOW_STOCK_THRESHOLD } from "@/services/admin/inventory.service";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { PermissionGate } from "@/components/admin/auth/PermissionGate";

const ITEMS_PER_PAGE = 20;

function AdminProductsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial status filter from URL if present
  const initialStatusParam = searchParams.get("status");
  const initialStatus =
    initialStatusParam === "draft" || initialStatusParam === "published"
      ? initialStatusParam
      : "all";

  // ── Data State ──
  const [allProducts, setAllProducts] = useState<B2BProductInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Global Authoritative Catalog Metrics ──
  const [globalMetrics, setGlobalMetrics] = useState({
    total: 0,
    published: 0,
    draft: 0,
    lowStock: 0,
    purchasePricePending: 0,
  });

  // ── Filter State ──
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    brand: "all",
    audience: "all",
    status: initialStatus,
    category: "all",
    designType: "all",
    purchasePriceStatus: "all",
    availability: "all",
  });

  // ── Sync URL with Status Filter ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentParams = new URLSearchParams(window.location.search);
    if (filters.status && filters.status !== "all") {
      currentParams.set("status", filters.status);
    } else {
      currentParams.delete("status");
    }
    const queryString = currentParams.toString();
    const targetUrl = `${pathname}${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState(null, "", targetUrl);
  }, [filters.status, pathname]);

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

  // ── Load Global Metrics (Always reflects the authoritative entire catalog) ──
  const loadGlobalMetrics = useCallback(async () => {
    try {
      const stats = await getProductStatistics();
      setGlobalMetrics({
        total: stats.total,
        published: stats.published,
        draft: stats.draft,
        lowStock: stats.lowStock,
        purchasePricePending: stats.purchasePricePending,
      });
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    loadGlobalMetrics();
  }, [loadGlobalMetrics]);

  // ── Load Reference Data ──
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const brands = await brandService.getBrands({ all: true, isAdmin: true });
        setBrandsList(brands.map((b) => ({ id: String(b.id), name: b.name })));
      } catch {
        // Use empty list
      }

      try {
        const cats = await categoryService.getCategories({ all: true });
        setCategoriesList(cats.map((c) => ({ id: String(c.id), name: c.name })));
      } catch {
        // Use empty list
      }
    }
    loadReferenceData();
  }, []);

  // ── Load Products (Respects backend filtering e.g. status=draft) ──
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProducts({
        isAdmin: true,
        all: true,
        search: filters.search || undefined,
        brand: filters.brand !== "all" ? filters.brand : undefined,
        audience: filters.audience !== "all" ? filters.audience : undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        category: filters.category !== "all" ? filters.category : undefined,
        purchase_price_status: filters.purchasePriceStatus !== "all" ? filters.purchasePriceStatus : undefined,
        availability: filters.availability && filters.availability !== "all" ? (filters.availability as any) : undefined,
      });

      // Apply design type filter locally
      let filtered = data;
      if (filters.designType !== "all") {
        const dtLower = filters.designType.toLowerCase();
        filtered = data.filter((p) => {
          const rawDt = ((p.designType || p.productType || "ORIGINAL") as string).toUpperCase();
          const pDt = (rawDt === "MASTER COPY" || rawDt === "REPLICA" || rawDt === "MC") ? "MASTER COPY" : "ORIGINAL";
          if (dtLower === "master_copy" || dtLower === "replica" || dtLower === "mc") {
            return pDt === "MASTER COPY";
          }
          return pDt === "ORIGINAL";
        });
      }

      // Apply availability filter locally as safeguard
      if (filters.availability && filters.availability !== "all") {
        const avail = filters.availability;
        filtered = filtered.filter((p) => {
          const isPreorder = Boolean(p.isPreorder || (p as any).is_preorder);
          const isSoldOut = Boolean(p.isSoldOut || (p as any).is_sold_out);
          if (avail === "preorder") return isPreorder;
          if (avail === "sold_out") return isSoldOut;
          if (avail === "ready_stock") return !isPreorder && !isSoldOut;
          return true;
        });
      }

      // Include unsynced local draft if present and matching status
      const localDraft = productDraftService.getDraft("new");
      if (localDraft?.data && (localDraft.data.name?.trim() || localDraft.data.productId?.trim())) {
        const d = localDraft.data;
        const exists = data.some((p) => (d.productId && p.productId === d.productId) || (d.name && p.name === d.name));
        if (!exists && (filters.status === "all" || filters.status === "draft")) {
          const pseudoDraft: B2BProductInput = {
            id: "draft_local_new",
            name: d.name || "(Untitled Draft)",
            slug: d.slug || "draft-local-new",
            sku: d.sku || "DRAFT-LOCAL",
            productId: d.productId || "DRAFT-LOCAL",
            brand: d.brand || "General",
            status: "draft",
            wholesalePrice: d.wholesalePrice || 0,
            stock: d.stock || 0,
            moq: d.moq || 1,
            colors: d.colors || ["Standard"],
            sizes: d.sizes || ["Assorted"],
            images: d.images || ["/placeholder.jpg"],
            categoryName: d.categoryName || "Apparel",
            categoryId: d.categoryId || "c_tops",
            audience: (d.audience || "UNISEX") as any,
          };
          filtered = [pseudoDraft, ...filtered];
        }
      }

      setAllProducts(filtered);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
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

  // ── Pagination Calculation ──
  const totalProducts = allProducts.length;
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
    filters.designType !== "all" ||
    filters.purchasePriceStatus !== "all" ||
    Boolean(filters.availability && filters.availability !== "all");

  // ── Status Filter Click from Summary Cards ──
  const handleStatusFilterClick = (targetStatus: "all" | "published" | "draft") => {
    setFilters((prev) => ({
      ...prev,
      status: targetStatus,
    }));
  };

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
      await Promise.all([loadProducts(), loadGlobalMetrics()]);
    } catch {
      addToast("error", "Failed to update product status.");
    }
  };

  const handleToggleStorefrontVisibility = async (product: B2BProductInput) => {
    const isHidden = Boolean(product.isHiddenFromStorefront || (product as any).is_hidden_from_storefront);
    try {
      await toggleProductStorefrontVisibility(product.id, !isHidden);
      addToast(
        "success",
        `Product is now ${!isHidden ? "hidden from" : "visible on"} storefront.`
      );
      await loadProducts();
    } catch {
      addToast("error", "Failed to update storefront visibility.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      const isLocalDraft =
        deleteTarget.id === "draft_local_new" ||
        deleteTarget.id.startsWith("draft_");

      if (isLocalDraft) {
        productDraftService.clearDraft("new");
        if (deleteTarget.id !== "draft_local_new") {
          productDraftService.clearDraft(deleteTarget.id);
        }
        addToast("success", "Draft product discarded.");
        setDeleteTarget(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          return next;
        });
        await Promise.all([loadProducts(), loadGlobalMetrics()]);
        return;
      }

      await deleteProduct(deleteTarget.id);
      productDraftService.clearDraft(deleteTarget.id);
      addToast("success", "Product deleted successfully.");
      setDeleteTarget(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      await Promise.all([loadProducts(), loadGlobalMetrics()]);
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        "Failed to delete product. Please try again.";
      addToast("error", msg);
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
      await Promise.all([loadProducts(), loadGlobalMetrics()]);
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
    await Promise.all([loadProducts(), loadGlobalMetrics()]);
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
    await Promise.all([loadProducts(), loadGlobalMetrics()]);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      brand: "all",
      audience: "all",
      status: "all",
      category: "all",
      designType: "all",
      purchasePriceStatus: "all",
      availability: "all",
    });
  };

  const isUnderAdminPath = pathname.startsWith("/ayc") || pathname.startsWith("/admin");
  const addProductHref = isUnderAdminPath ? "/ayc/products/new" : "/products/new";

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
        <PermissionGate permission="product.create">
          <Link
            href={addProductHref}
            id="btn-add-product-contextual"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </Link>
        </PermissionGate>
      </div>

      {/* Summary Metrics (Clickable Draft and other status cards) */}
      <ProductSummaryMetrics
        total={globalMetrics.total}
        published={globalMetrics.published}
        draft={globalMetrics.draft}
        lowStock={globalMetrics.lowStock}
        purchasePricePending={globalMetrics.purchasePricePending}
        activeStatus={filters.status}
        onStatusClick={handleStatusFilterClick}
        onPurchasePricePendingClick={() =>
          setFilters((f) => ({
            ...f,
            purchasePriceStatus: f.purchasePriceStatus === "pending" ? "all" : "pending",
          }))
        }
        isPricePendingActive={filters.purchasePriceStatus === "pending"}
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
        onToggleStorefrontVisibility={handleToggleStorefrontVisibility}
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

export default function AdminProductsPage() {
  return (
    <AdminPageGate permission="product.view" moduleName="Product Catalog">
      <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading products catalog...</div>}>
        <AdminProductsContent />
      </Suspense>
    </AdminPageGate>
  );
}
