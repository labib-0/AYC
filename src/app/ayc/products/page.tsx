"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus, SlidersHorizontal, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { B2BProductInput } from "@/types/b2b";
import {
  getProducts,
  getProductStatistics,
  deleteProduct,
  duplicateProduct,
  togglePublishStatus,
  reorderProducts,
  markProductSoldOut,
} from "@/lib/services/products";
import { brandService } from "@/services/brand.service";
import { categoryService } from "@/services/category.service";
import { productDraftService } from "@/lib/services/product-draft.service";
import { toggleProductStorefrontVisibility } from "@/services/product.service";
import { sortBrandsAlphabetically } from "@/lib/brand-sort";

import {
  ProductSummaryMetrics,
  ProductSearchFilters,
  ProductTable,
  ProductPagination,
  ProductBulkActions,
  DeleteProductModal,
  DuplicateProductModal,
  MarkSoldOutModal,
  ProductToast,
} from "@/components/admin/products";
import type { ProductFilters, ToastMessage } from "@/components/admin/products";
import {
  adminInventoryService,
  InventoryRecord,
  LOW_STOCK_THRESHOLD,
} from "@/services/admin/inventory.service";
import {
  StockAdjustmentModal,
  InventoryHistoryModal,
} from "@/components/admin/inventory";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { PermissionGate } from "@/components/admin/auth/PermissionGate";
import { DEFAULT_ADMIN_PAGE_SIZE, AdminPageSize } from "@/types/admin-listing";
import { useTableReorder, TableReorderBanner } from "@/components/admin/ordered-list";

function mapProductToInventoryRecord(product: B2BProductInput): InventoryRecord {
  const parsedId =
    typeof product.id === "number"
      ? product.id
      : parseInt(String(product.id).replace(/\D/g, ""), 10) || 1;
  const stock =
    product.availableStock !== undefined
      ? Number(product.availableStock)
      : Number(product.stock || 0);

  return {
    id: parsedId,
    product_id: typeof product.id === "number" ? product.id : (parsedId || null),
    warehouse_id: 1,
    quantity: stock,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku || product.productId || "—",
      wholesale_price: product.wholesalePrice,
      brand: product.brand,
      category: product.categoryName,
      images: product.images,
    },
    warehouse: {
      id: 1,
      name: "Uttara Warehouse",
      code: "WH-UTTARA-01",
      city: "Dhaka",
      country_code: "BD",
    },
  };
}


function AdminProductsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can, isSuperAdmin } = useAdminAuth();
  const canAdjustStock = isSuperAdmin || can("inventory.adjust") || can("product.edit");
  const canViewHistory = isSuperAdmin || can("inventory.audit") || can("inventory.view") || can("product.view");
  const canMarkSoldOut = isSuperAdmin || can("inventory.adjust") || can("product.edit");

  // Read initial status filter from URL if present
  const initialStatusParam = searchParams.get("status");
  const initialStatus =
    initialStatusParam === "draft" || initialStatusParam === "published"
      ? initialStatusParam
      : "all";

  // Initial availability parameter from URL or redirect
  const tabParam = searchParams.get("tab");
  const availParam = searchParams.get("availability");
  const stockControlParam = searchParams.get("stock_control");
  const initialAvailability =
    tabParam === "stock-control" || availParam === "low_stock" || stockControlParam === "true"
      ? "low_stock"
      : (availParam || "all");

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
    availability: initialAvailability,
  });

  // ── Sync URL with Status & Availability Filter ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentParams = new URLSearchParams(window.location.search);
    if (filters.status && filters.status !== "all") {
      currentParams.set("status", filters.status);
    } else {
      currentParams.delete("status");
    }
    if (filters.availability && filters.availability !== "all") {
      currentParams.set("availability", filters.availability);
    } else {
      currentParams.delete("availability");
    }
    const queryString = currentParams.toString();
    const targetUrl = `${pathname}${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState(null, "", targetUrl);
  }, [filters.status, filters.availability, pathname]);

  // Handle URL redirect query params from former /ayc/inventory
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    const currentAvail = searchParams.get("availability");
    const currentStockControl = searchParams.get("stock_control");
    if (currentTab === "stock-control" || currentAvail === "low_stock" || currentStockControl === "true") {
      setFilters((prev) => ({ ...prev, availability: "low_stock" }));
    }
  }, [searchParams]);

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<AdminPageSize>(DEFAULT_ADMIN_PAGE_SIZE);

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Modals ──
  const [deleteTarget, setDeleteTarget] = useState<B2BProductInput | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<B2BProductInput | null>(null);
  const [soldOutTarget, setSoldOutTarget] = useState<B2BProductInput | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Inventory Integration Modals ──
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryRecord | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryRecord | null>(null);

  // ── Bulk Stock Adjustment State ──
  const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
  const [bulkDeltaQuantity, setBulkDeltaQuantity] = useState("50");
  const [bulkDeltaSign, setBulkDeltaSign] = useState<"+" | "-">("+");
  const [bulkReason, setBulkReason] = useState("New Stock Received");
  const [bulkNotes, setBulkNotes] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // ── Toast ──
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  // ── Reference Data ──
  const [brandsList, setBrandsList] = useState<Array<{ id: string; name: string }>>([]);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string }>>([]);

  // ── Search Request In-Flight Management (Protects against stale overwrites) ──
  const searchRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        setBrandsList(sortBrandsAlphabetically(brands.map((b) => ({ id: String(b.id), name: b.name }))));
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

  // ── Load Products (Respects backend filtering e.g. status=draft with stale-request protection) ──
  const loadProducts = useCallback(async () => {
    const currentRequestId = ++searchRequestIdRef.current;

    // Abort previous pending network request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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
      }, abortController.signal);

      // Discard stale responses if a newer search request has been triggered
      if (currentRequestId !== searchRequestIdRef.current) {
        return;
      }

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
          const stock =
            p.availableStock !== undefined
              ? Number(p.availableStock)
              : Number(p.stock || 0);
          if (avail === "preorder") return isPreorder;
          if (avail === "sold_out") return isSoldOut || stock <= 0;
          if (avail === "low_stock") return stock > 0 && stock < LOW_STOCK_THRESHOLD;
          if (avail === "out_of_stock") return stock <= 0;
          if (avail === "ready_stock") return !isPreorder && !isSoldOut && stock >= LOW_STOCK_THRESHOLD;
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
      if ((err as any)?.name === "AbortError" || abortController.signal.aborted) {
        return;
      }
      if (currentRequestId === searchRequestIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load products.");
      }
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setLoading(false);
      }
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
  const totalPages = Math.max(1, Math.ceil(totalProducts / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const pageProducts = allProducts.slice(startIdx, startIdx + perPage);

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.brand !== "all" ||
    filters.audience !== "all" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.designType !== "all" ||
    filters.purchasePriceStatus !== "all" ||
    Boolean(filters.availability && filters.availability !== "all");

  // Persistent Reordering Hook
  const reorder = useTableReorder<B2BProductInput>({
    items: allProducts,
    onItemsChange: setAllProducts,
    getItemId: (p) => p.id,
    getItemTitle: (p) => p.name,
    isReorderDisabled: hasActiveFilters,
    disabledReason:
      "Reordering is disabled while search or catalog filters are active. Clear filters to return to manual sequence.",
    currentPage: safePage,
    pageSize: perPage,
    onPageChange: setCurrentPage,
    onPersistOrder: async (newItems) => {
      await reorderProducts(
        newItems.map((p, idx) => ({ id: p.id, sort_order: idx + 1 }))
      );
    },
    showToast: (message, type) => addToast(type, message),
  });

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

  const handleMarkSoldOutConfirm = async (reason?: string) => {
    if (!soldOutTarget) return;
    setModalLoading(true);
    try {
      await markProductSoldOut(soldOutTarget.id, reason);
      addToast("success", `"${soldOutTarget.name}" has been marked as sold out.`);
      setSoldOutTarget(null);
      await Promise.all([loadProducts(), loadGlobalMetrics()]);
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        "Failed to mark product as sold out. Please try again.";
      addToast("error", msg);
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

  // ── Inventory Integration Actions ──
  const inventoryRecords: InventoryRecord[] = allProducts.map(mapProductToInventoryRecord);

  const handleToggleLowStockFilter = () => {
    setFilters((prev) => ({
      ...prev,
      availability: prev.availability === "low_stock" ? "all" : "low_stock",
    }));
  };

  const handleOpenGlobalAdjust = () => {
    setAdjustingItem(null);
    setIsAdjustModalOpen(true);
  };

  const handleOpenRowAdjust = (product: B2BProductInput) => {
    setAdjustingItem(mapProductToInventoryRecord(product));
    setIsAdjustModalOpen(true);
  };

  const handleOpenRowHistory = (product: B2BProductInput) => {
    setHistoryItem(mapProductToInventoryRecord(product));
    setIsHistoryModalOpen(true);
  };

  const handleMutationSuccess = (message: string) => {
    addToast("success", message);
    Promise.all([loadProducts(), loadGlobalMetrics()]);
  };

  const handleOpenBulkAdjust = () => {
    setBulkError(null);
    setBulkDeltaQuantity("50");
    setBulkDeltaSign("+");
    setBulkReason("New Stock Received");
    setBulkNotes("");
    setIsBulkAdjustOpen(true);
  };

  const handleBulkAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawDelta = parseInt(bulkDeltaQuantity, 10);
    if (isNaN(rawDelta) || rawDelta <= 0) {
      setBulkError("Please enter a valid positive quantity delta.");
      return;
    }
    if (!bulkReason.trim()) {
      setBulkError("Please specify a reason for this inventory adjustment.");
      return;
    }

    const signedDelta = bulkDeltaSign === "+" ? rawDelta : -rawDelta;
    const selectedProducts = allProducts.filter((p) => selectedIds.has(p.id));

    if (signedDelta < 0) {
      const invalidProduct = selectedProducts.find((p) => {
        const curStock =
          p.availableStock !== undefined
            ? Number(p.availableStock)
            : Number(p.stock || 0);
        return curStock + signedDelta < 0;
      });
      if (invalidProduct) {
        setBulkError(
          `Adjustment would reduce stock below zero for ${invalidProduct.name} (Current: ${invalidProduct.stock || 0}).`
        );
        return;
      }
    }

    setIsBulkSubmitting(true);
    setBulkError(null);
    let updatedCount = 0;

    try {
      for (const product of selectedProducts) {
        const parsedId =
          typeof product.id === "number"
            ? product.id
            : parseInt(String(product.id).replace(/\D/g, ""), 10) || 1;
        await adminInventoryService.adjustInventory({
          product_id: product.id,
          inventory_id: parsedId,
          adjustment_amount: signedDelta,
          reason: bulkReason.trim(),
          notes: bulkNotes.trim() || undefined,
        });
        updatedCount++;
      }

      addToast(
        "success",
        `Successfully adjusted stock (${bulkDeltaSign}${rawDelta} units) across ${updatedCount} products.`
      );
      setIsBulkAdjustOpen(false);
      setSelectedIds(new Set());
      await Promise.all([loadProducts(), loadGlobalMetrics()]);
    } catch (err: unknown) {
      setBulkError(
        (err as Error)?.message ||
          "Failed to complete bulk adjustment. Please verify input."
      );
    } finally {
      setIsBulkSubmitting(false);
    }
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
            Manage your wholesale product catalog and warehouse inventory.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canAdjustStock && (
            <button
              type="button"
              id="btn-products-adjust-stock"
              onClick={handleOpenGlobalAdjust}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-secondary border border-border/80 text-foreground hover:bg-secondary/80 transition-all shadow-xs shrink-0 cursor-pointer"
              title="Record verified stock adjustments"
            >
              <SlidersHorizontal size={14} className="text-primary" />
              <span>Adjust Stock</span>
            </button>
          )}
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
        onLowStockClick={handleToggleLowStockFilter}
        isLowStockActive={filters.availability === "low_stock"}
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
        onBulkAdjustStock={canAdjustStock ? handleOpenBulkAdjust : undefined}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Reorder Status & Filter Guard Banner */}
      <TableReorderBanner
        isSaving={reorder.isSaving}
        isReorderDisabled={reorder.isReorderDisabled}
        disabledReason={reorder.disabledReason}
        onClearFilters={handleClearFilters}
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
        onMarkSoldOut={canMarkSoldOut ? (p) => setSoldOutTarget(p) : undefined}
        onAdjustStock={canAdjustStock ? handleOpenRowAdjust : undefined}
        onViewStockHistory={canViewHistory ? handleOpenRowHistory : undefined}
        onRetry={loadProducts}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        startIndex={startIdx}
        isReorderDisabled={reorder.isReorderDisabled}
        disabledReason={reorder.disabledReason}
        onPointerDown={reorder.handlePointerDown}
        onMoveUp={reorder.moveUp}
        onMoveDown={reorder.moveDown}
        isFirstItem={reorder.isFirstItem}
        isLastItem={reorder.isLastItem}
        getRowVisualClass={reorder.getRowVisualClass}
      />

      {/* Pagination */}
      <ProductPagination
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={totalProducts}
        perPage={perPage}
        onPageChange={setCurrentPage}
        onPerPageChange={(newSize) => {
          setPerPage(newSize);
          setCurrentPage(1);
        }}
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

      {/* Mark as Sold Out Modal */}
      <MarkSoldOutModal
        open={soldOutTarget !== null}
        product={soldOutTarget}
        onConfirm={handleMarkSoldOutConfirm}
        onCancel={() => setSoldOutTarget(null)}
        loading={modalLoading}
      />

      {/* Stock Adjustment Modal (Row-preselected or Global Item Picker) */}
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        inventoryItem={adjustingItem}
        allItems={inventoryRecords}
        onSuccess={handleMutationSuccess}
      />

      {/* Stock Movement History Audit Trail Modal */}
      <InventoryHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        inventoryItem={historyItem}
      />

      {/* Bulk Stock Adjustment Modal */}
      {isBulkAdjustOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-stock-adjust-title"
        >
          <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 my-8 animate-in zoom-in-95 text-xs">
            <div className="flex items-start justify-between pb-3 border-b border-border/60">
              <div>
                <h3
                  id="bulk-stock-adjust-title"
                  className="font-display font-bold text-base uppercase tracking-tight text-foreground"
                >
                  Bulk Adjust Stock ({selectedIds.size} Products)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Record unified inventory revisions across all selected products.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkAdjustOpen(false)}
                disabled={isBulkSubmitting}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {bulkError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            <form onSubmit={handleBulkAdjustSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Adjustment Delta *
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex p-1 bg-secondary/40 rounded-xl border border-border/60">
                    <button
                      type="button"
                      onClick={() => setBulkDeltaSign("+")}
                      disabled={isBulkSubmitting}
                      className={`px-3 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        bulkDeltaSign === "+"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkDeltaSign("-")}
                      disabled={isBulkSubmitting}
                      className={`px-3 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        bulkDeltaSign === "-"
                          ? "bg-rose-500 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      - Deduct
                    </button>
                  </div>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="e.g. 50"
                    value={bulkDeltaQuantity}
                    onChange={(e) => setBulkDeltaQuantity(e.target.value)}
                    disabled={isBulkSubmitting}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-display font-bold text-base focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Reason for Adjustment *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {[
                    "New Stock Received",
                    "Factory Shipment Arrival",
                    "Physical Audit Correction",
                    "Damaged Goods Write-off",
                    "Customer Return Restock",
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBulkReason(r)}
                      disabled={isBulkSubmitting}
                      className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-all cursor-pointer ${
                        bulkReason === r
                          ? "bg-foreground text-background border-foreground shadow-2xs"
                          : "bg-secondary/30 border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Or enter custom reason..."
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  disabled={isBulkSubmitting}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Batch adjustment reference or audit note..."
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  disabled={isBulkSubmitting}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsBulkAdjustOpen(false)}
                  disabled={isBulkSubmitting}
                  className="px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkSubmitting || !bulkReason.trim() || !bulkDeltaQuantity}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                >
                  {isBulkSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Updating Stock...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Confirm Bulk Adjustment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
