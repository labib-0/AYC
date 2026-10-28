"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Plus, SlidersHorizontal, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { B2BProductInput } from "@/types/b2b";
import {
  getProducts,
  getProductStatistics,
  deleteProduct,
  togglePublishStatus,
  reorderProducts,
  markProductSoldOut,
} from "@/lib/services/products";
import { brandService } from "@/services/brand.service";
import { categoryService } from "@/services/category.service";
import { productDraftService } from "@/lib/services/product-draft.service";
import { toggleProductStorefrontVisibility, toggleProductFeatured, toggleProductPin } from "@/services/product.service";
import { homepageService } from "@/services/homepage.service";
import { sortBrandsAlphabetically } from "@/lib/brand-sort";
import { apiClient } from "@/services/api-client";

// Authoritative featured-pin detection (strictly pinned products, independent of promotional tags)
export const isProductPinned = (p: B2BProductInput): boolean => {
  const featUntil = p.featuredUntil || (p as any).featured_until;
  const isExpired = featUntil ? new Date(featUntil).getTime() <= Date.now() : false;
  return Boolean(
    (p as any).is_pinned ??
    (p as any).isPinned ??
    p.isFeatured ??
    (p as any).is_featured ??
    (p as any).featured
  ) && !isExpired;
};

import {
  ProductSummaryMetrics,
  ProductSearchFilters,
  ProductTable,
  ProductPagination,
  ProductBulkActions,
  DeleteProductModal,
  MarkSoldOutModal,
  ProductOfferSheetModal,
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
  const router = useRouter();
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
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [globalMetrics, setGlobalMetrics] = useState({
    total: 0,
    published: 0,
    draft: 0,
    lowStock: 0,
    purchasePricePending: 0,
    featured: 0,
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

  // ── Pinning in-flight tracking (prevents duplicate clicks) ──
  const [pinningIds, setPinningIds] = useState<Set<string>>(new Set());

  // ── Modals ──
  const [deleteTarget, setDeleteTarget] = useState<B2BProductInput | null>(null);
  const [soldOutTarget, setSoldOutTarget] = useState<B2BProductInput | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Inventory Integration Modals ──
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryRecord | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryRecord | null>(null);

  // ── Offer Sheet Preview Modal State ──
  const [offerSheetProduct, setOfferSheetProduct] = useState<B2BProductInput | null>(null);
  const [bulkOfferSheetLoading, setBulkOfferSheetLoading] = useState(false);

  const handleViewOfferSheet = useCallback((product: B2BProductInput) => {
    setOfferSheetProduct(product);
  }, []);

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
      setMetricsLoading(true);
      const stats = await getProductStatistics();

      // Check if an unsynced local draft exists in this admin workspace session
      const localDraft = productDraftService.getDraft("new");
      const hasLocalDraft = Boolean(
        localDraft?.data && (localDraft.data.name?.trim() || localDraft.data.productId?.trim())
      );
      if (hasLocalDraft) {
        stats.total = Number(stats.total) + 1;
        stats.draft = Number(stats.draft) + 1;
      }

      setGlobalMetrics({
        total: stats.total,
        published: stats.published,
        draft: stats.draft,
        lowStock: stats.lowStock,
        purchasePricePending: stats.purchasePricePending,
        featured: stats.featured || 0,
      });
    } catch {
      // Fallback
    } finally {
      setMetricsLoading(false);
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
        status: filters.status !== "all" && filters.status !== "featured" ? filters.status : undefined,
        is_featured: filters.status === "featured" ? true : undefined,
        category: filters.category !== "all" ? filters.category : undefined,
        purchase_price_status: filters.purchasePriceStatus !== "all" ? filters.purchasePriceStatus : undefined,
        availability: filters.availability && filters.availability !== "all" ? (filters.availability as any) : undefined,
      }, abortController.signal);

      // Discard stale responses if a newer search request has been triggered
      if (currentRequestId !== searchRequestIdRef.current) {
        return;
      }

      // Apply featured filter locally as safeguard
      let filtered = data;
      if (filters.status === "featured") {
        filtered = filtered.filter((p) => Boolean(p.isFeatured));
      }
      if (filters.designType !== "all") {
        const dtLower = filters.designType.toLowerCase();
        filtered = filtered.filter((p) => {
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

      // Deduplicate products to prevent duplicate records from being counted
      const seenIds = new Set<string>();
      const deduplicated: B2BProductInput[] = [];
      for (const p of filtered) {
        const key = String(p.id || p.productId);
        if (!seenIds.has(key)) {
          seenIds.add(key);
          deduplicated.push(p);
        }
      }

      // Priority ordering: Featured-pinned products appear first in saved manual order, followed by non-pinned products in relative manual order
      const pinnedGroup = deduplicated.filter(isProductPinned);
      const nonPinnedGroup = deduplicated.filter((p) => !isProductPinned(p));
      const orderedCatalog = [...pinnedGroup, ...nonPinnedGroup];

      setAllProducts(orderedCatalog);
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
  const isAll = perPage === "all";
  const totalProducts = allProducts.length;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalProducts / (perPage as number)));
  const safePage = isAll ? 1 : Math.min(currentPage, totalPages);
  const startIdx = isAll ? 0 : (safePage - 1) * (perPage as number);
  const pageProducts = isAll ? allProducts : allProducts.slice(startIdx, startIdx + (perPage as number));

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.brand !== "all" ||
    filters.audience !== "all" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.designType !== "all" ||
    filters.purchasePriceStatus !== "all" ||
    Boolean(filters.availability && filters.availability !== "all");

  // Reordering is ONLY enabled when ALL conditions are satisfied:
  // 1. Total Products summary tile is selected
  // 2. No search query is active
  // 3. No catalog filters are active
  // 4. Listing is in authoritative manual-order sorting mode
  // 5. Page-size is set to "all" (complete sequence loaded)
  // 6. Complete, unfiltered sequence has finished loading (!loading && !error && totalProducts > 0)
  const isReorderEligible = !hasActiveFilters && isAll && !loading && !error && totalProducts > 0;

  // Boundary tracking for Pinned vs Non-Pinned groups
  const pinnedCount = useMemo(() => allProducts.filter(isProductPinned).length, [allProducts]);

  // Persistent Reordering Hook
  const reorder = useTableReorder<B2BProductInput>({
    items: allProducts,
    onItemsChange: (newItems) => {
      const pinned = newItems.filter(isProductPinned);
      const nonPinned = newItems.filter((p) => !isProductPinned(p));
      setAllProducts([...pinned, ...nonPinned]);
    },
    getItemId: (p) => p.id,
    getItemTitle: (p) => p.name,
    isReorderDisabled: !isReorderEligible, // isReorderDisabled: hasActiveFilters
    disabledReason:
      "Reordering is disabled while search or catalog filters are active. Clear filters to return to manual sequence.",
    currentPage: safePage,
    pageSize: perPage,
    onPageChange: setCurrentPage,
    onPersistOrder: async (newItems) => {
      const pinned = newItems.filter(isProductPinned);
      const nonPinned = newItems.filter((p) => !isProductPinned(p));
      const safeSequence = [...pinned, ...nonPinned];
      await reorderProducts(
        safeSequence.map((p, idx) => ({ id: p.id, sort_order: idx + 1 }))
      );
      if (typeof window !== "undefined") {
        homepageService.invalidateStorefrontCache();
        window.dispatchEvent(new CustomEvent("ayaan:homepage-updated"));
      }
      return safeSequence;
    },
    showToast: (message, type) => addToast(type, message),
  });

  // Guarded group boundary controls
  const customIsFirstItem = useCallback(
    (globalIdx: number) => {
      // First item of non-pinned group cannot move up into pinned group
      if (pinnedCount > 0 && globalIdx === pinnedCount) {
        return true;
      }
      return globalIdx === 0;
    },
    [pinnedCount]
  );

  const customIsLastItem = useCallback(
    (globalIdx: number) => {
      // Last item of pinned group cannot move down into non-pinned group
      if (pinnedCount > 0 && globalIdx === pinnedCount - 1) {
        return true;
      }
      return globalIdx === allProducts.length - 1;
    },
    [pinnedCount, allProducts.length]
  );

  const handleMoveUp = useCallback(
    async (globalIdx: number) => {
      if (pinnedCount > 0 && globalIdx === pinnedCount) {
        // Guard boundary: non-pinned product cannot move above pinned group
        return;
      }
      await reorder.moveUp(globalIdx);
    },
    [pinnedCount, reorder]
  );

  const handleMoveDown = useCallback(
    async (globalIdx: number) => {
      if (pinnedCount > 0 && globalIdx === pinnedCount - 1) {
        // Guard boundary: pinned product cannot move below into non-pinned group
        return;
      }
      await reorder.moveDown(globalIdx);
    },
    [pinnedCount, reorder]
  );

  // ── Status Filter Click from Summary Cards ──
  const handleStatusFilterClick = (targetStatus: "all" | "published" | "draft" | "featured") => {
    setFilters((prev) => ({
      ...prev,
      status: targetStatus,
      ...(targetStatus === "all" ? { availability: "all", purchasePriceStatus: "all" } : {}),
    }));
  };

  // ── Pin / Unpin Product Handler ──
  const handleToggleFeatured = async (product: B2BProductInput) => {
    if (pinningIds.has(product.id)) {
      return; // In-flight request protection
    }
    const isPinned = isProductPinned(product);
    const nextPinned = !isPinned;

    setPinningIds((prev) => new Set(prev).add(product.id));

    // Save previous state for rollback on error
    const previousProducts = [...allProducts];

    // Optimistically update UI
    const updatedProducts = allProducts.map((p) => {
      if (p.id === product.id) {
        return {
          ...p,
          isPinned: nextPinned,
          is_pinned: nextPinned,
          isFeatured: nextPinned,
          is_featured: nextPinned,
        };
      }
      return p;
    });

    // Re-partition pinned first and non-pinned
    const pinnedGroup = updatedProducts.filter(isProductPinned);
    const nonPinnedGroup = updatedProducts.filter((p) => !isProductPinned(p));
    setAllProducts([...pinnedGroup, ...nonPinnedGroup]);

    try {
      await toggleProductPin(product.id, nextPinned);
      addToast(
        "success",
        `Product "${product.name || product.productId}" is now ${nextPinned ? "pinned" : "unpinned"}.`
      );
      if (typeof window !== "undefined") {
        homepageService.invalidateStorefrontCache();
        window.dispatchEvent(new CustomEvent("ayaan:homepage-updated"));
      }
      Promise.all([loadProducts(), loadGlobalMetrics()]).catch(() => {});
    } catch (err: any) {
      // Restore previous state on failure
      setAllProducts(previousProducts);
      addToast("error", err?.message || `Failed to ${nextPinned ? "pin" : "unpin"} product.`);
    } finally {
      setPinningIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
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

  const handleBulkOfferSheet = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkOfferSheetLoading(true);
    addToast(
      "success",
      `Checking Offer Sheet readiness for ${ids.length} selected product${ids.length !== 1 ? "s" : ""}...`
    );

    try {
      const baseUrl = apiClient.getBaseUrl();
      const token = apiClient.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const numericIds = ids.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));

      // 1. Initial readiness check (with check_only flag, which automatically queues background jobs for any pending items)
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 20;

      while (!isReady && attempts < maxAttempts) {
        attempts++;
        const checkRes = await fetch(`${baseUrl}/products/bulk-offer-sheet`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            product_ids: numericIds,
            check_only: true,
          }),
        });

        if (!checkRes.ok) {
          const errData = await checkRes.json().catch(() => null);
          throw new Error(errData?.message || `Readiness check failed (HTTP ${checkRes.status})`);
        }

        const checkJson = await checkRes.json();
        const data = checkJson?.data || {};

        if (data.status === "ready") {
          isReady = true;
          break;
        }

        if (attempts === 1) {
          addToast(
            "success",
            `Generating latest Offer Sheets for ${data.pending_ids?.length || 1} product(s)... Merging when ready.`
          );
        }

        // Wait 1.5s between poll checks
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // 2. Fetch merged PDF binary
      const pdfHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/pdf",
      };
      if (token) {
        pdfHeaders["Authorization"] = `Bearer ${token}`;
      }

      const mergeRes = await fetch(`${baseUrl}/products/bulk-offer-sheet`, {
        method: "POST",
        headers: pdfHeaders,
        body: JSON.stringify({
          product_ids: numericIds,
        }),
      });

      if (!mergeRes.ok) {
        const errData = await mergeRes.json().catch(() => null);
        throw new Error(errData?.message || `Failed to download combined Offer Sheet (HTTP ${mergeRes.status})`);
      }

      const blob = await mergeRes.blob();
      if (blob.size === 0) {
        throw new Error("Received empty combined PDF document from server.");
      }

      // Extract filename from disposition or construct clean name
      const disposition = mergeRes.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
      const filename = filenameMatch?.[1]
        ? decodeURIComponent(filenameMatch[1])
        : `AYC_Combined_Offer_Sheets_${numericIds.length}_Products_${new Date().toISOString().slice(0, 10)}.pdf`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      addToast("success", `Combined Offer Sheet successfully downloaded (${(blob.size / 1024 / 1024).toFixed(2)} MB).`);
    } catch (err: any) {
      console.error("[AYC] Bulk Offer Sheet error:", err);
      addToast("error", err?.message || "Failed to generate combined Offer Sheet.");
    } finally {
      setBulkOfferSheetLoading(false);
    }
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
    setCurrentPage(1);
    setPerPage("all");
    addToast(
      "success",
      `Filters cleared. Showing all ${allProducts.length} products in manual sequence. Reordering enabled.`
    );
  };

  // ── Inventory Integration Actions ──
  const inventoryRecords: InventoryRecord[] = allProducts.map(mapProductToInventoryRecord);

  const handleToggleLowStockFilter = () => {
    setFilters((prev) => ({
      ...prev,
      availability: prev.availability === "low_stock" ? "all" : "low_stock",
    }));
  };

  const handleOpenRowAdjust = (product: B2BProductInput) => {
    const pid = product.productId || product.id;
    router.push(`/ayc/inventory?productId=${encodeURIComponent(String(pid))}`);
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
        featured={globalMetrics.featured}
        activeStatus={filters.status}
        loading={metricsLoading}
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
        onBulkOfferSheet={handleBulkOfferSheet}
        offerSheetLoading={bulkOfferSheetLoading}
        onBulkPublish={handleBulkPublish}
        onBulkUnpublish={handleBulkUnpublish}
        onBulkAdjustStock={canAdjustStock ? handleOpenBulkAdjust : undefined}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Reorder Status & Filter Guard Banner */}
      <TableReorderBanner
        isSaving={reorder.isSaving}
        isReorderDisabled={false}
        hideDisabledBanner={true}
        onClearFilters={handleClearFilters}
        isReady={isReorderEligible}
        readyMessage={`All ${totalProducts} products loaded in manual sequence. Drag handles and Move Up / Down actions are enabled.`}
      />

      {/* Product Table with integrated pagination footer */}
      <ProductTable
        products={pageProducts}
        loading={loading}
        error={error}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onTogglePublish={handleTogglePublish}
        onToggleStorefrontVisibility={handleToggleStorefrontVisibility}
        onToggleFeatured={handleToggleFeatured}
        pinningIds={pinningIds}
        onDelete={(p) => setDeleteTarget(p)}
        onMarkSoldOut={canMarkSoldOut ? (p) => setSoldOutTarget(p) : undefined}
        onAdjustStock={canAdjustStock ? handleOpenRowAdjust : undefined}
        onViewStockHistory={canViewHistory ? handleOpenRowHistory : undefined}
        onViewOfferSheet={handleViewOfferSheet}
        onRetry={loadProducts}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        startIndex={startIdx}
        showReorderControls={isReorderEligible}
        isReorderDisabled={!isReorderEligible}
        disabledReason={reorder.disabledReason}
        onPointerDown={isReorderEligible ? reorder.handlePointerDown : undefined}
        onMoveUp={isReorderEligible ? handleMoveUp : undefined}
        onMoveDown={isReorderEligible ? handleMoveDown : undefined}
        isFirstItem={customIsFirstItem}
        isLastItem={customIsLastItem}
        getRowVisualClass={isReorderEligible ? reorder.getRowVisualClass : undefined}
        pagination={
          !loading && !error && allProducts.length > 0 ? (
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
          ) : undefined
        }
      />

      {/* Delete Modal */}
      <DeleteProductModal
        open={deleteTarget !== null}
        productName={deleteTarget?.name || ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
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

      {/* Product Offer Sheet Preview Modal */}
      <ProductOfferSheetModal
        isOpen={offerSheetProduct !== null}
        onClose={() => setOfferSheetProduct(null)}
        product={offerSheetProduct}
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
