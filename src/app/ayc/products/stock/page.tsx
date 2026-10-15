"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  SlidersHorizontal,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Warehouse,
  Boxes,
  Loader2,
  PackageX,
  RefreshCw,
  RotateCcw,
  Check,
} from "lucide-react";
import { B2BProductInput } from "@/types/b2b";
import { getProducts } from "@/lib/services/products";
import { brandService } from "@/services/brand.service";
import { categoryService } from "@/services/category.service";
import { sortBrandsAlphabetically } from "@/lib/brand-sort";
import {
  ProductSearchFilters,
  ProductPagination,
  ProductToast,
} from "@/components/admin/products";
import type { ProductFilters, ToastMessage } from "@/components/admin/products";
import {
  adminInventoryService,
  InventoryAdjustment,
  LOW_STOCK_THRESHOLD,
  getStockStatus,
} from "@/services/admin/inventory.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { DEFAULT_ADMIN_PAGE_SIZE, AdminPageSize } from "@/types/admin-listing";

const COMMON_REASONS = [
  "New Stock Received",
  "Factory Shipment Arrival",
  "Damaged Goods Write-off",
  "Physical Audit Correction",
  "Customer Return Restock",
  "Order Cancellation Return",
  "Sample Distribution",
];

function FullPageStockManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, isSuperAdmin } = useAdminAuth();
  const canAdjustStock = isSuperAdmin || can("inventory.adjust") || can("product.edit");

  // ── Reference Data ──
  const [brandsList, setBrandsList] = useState<Array<{ id: string; name: string }>>([]);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string }>>([]);

  // ── Filters & Search ──
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    brand: "all",
    audience: "all",
    status: "all",
    category: "all",
    designType: "all",
    purchasePriceStatus: "all",
    availability: "all",
  });

  // ── Products List & Pagination ──
  const [allProducts, setAllProducts] = useState<B2BProductInput[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<AdminPageSize | number>(DEFAULT_ADMIN_PAGE_SIZE);

  // ── Stale Request Management ──
  const searchRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Selected Product for Adjustment & History ──
  const [selectedProduct, setSelectedProduct] = useState<B2BProductInput | null>(null);
  const selectedProductRef = useRef<B2BProductInput | null>(null);
  selectedProductRef.current = selectedProduct;

  // ── Stock Adjustment Form State ──
  const [adjustmentMode, setAdjustmentMode] = useState<"delta" | "set">("delta");
  const [deltaSign, setDeltaSign] = useState<"+" | "-">("+");
  const [deltaQuantity, setDeltaQuantity] = useState<string>("50");
  const [targetQuantity, setTargetQuantity] = useState<string>("0");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  // ── Stock Movement History ──
  const [historyList, setHistoryList] = useState<InventoryAdjustment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // ── Toasts ──
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef<number>(0);

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
        const brands = await brandService.getBrands({ all: true, isAdmin: true });
        setBrandsList(sortBrandsAlphabetically(brands.map((b) => ({ id: String(b.id), name: b.name }))));
      } catch {
        // Fallback
      }
      try {
        const cats = await categoryService.getCategories({ all: true });
        setCategoriesList(cats.map((c) => ({ id: String(c.id), name: c.name })));
      } catch {
        // Fallback
      }
    }
    loadReferenceData();
  }, []);

  // ── Load Products with Stale Request Protection ──
  const loadProducts = useCallback(async () => {
    const currentRequestId = ++searchRequestIdRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const data = await getProducts(
        {
          isAdmin: true,
          all: true,
          search: filters.search || undefined,
          brand: filters.brand !== "all" ? filters.brand : undefined,
          audience: filters.audience !== "all" ? filters.audience : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          category: filters.category !== "all" ? filters.category : undefined,
          availability: filters.availability && filters.availability !== "all" ? (filters.availability as any) : undefined,
        },
        abortController.signal
      );

      if (currentRequestId !== searchRequestIdRef.current) {
        return;
      }

      // Local filtering safeguard
      let filtered = data;
      if (filters.availability && filters.availability !== "all") {
        const avail = filters.availability;
        filtered = filtered.filter((p) => {
          const isPreorder = Boolean(p.isPreorder || (p as any).is_preorder);
          const isSoldOut = Boolean(p.isSoldOut || (p as any).is_sold_out);
          const stock = p.availableStock !== undefined ? Number(p.availableStock) : Number(p.stock || 0);
          if (avail === "preorder") return isPreorder;
          if (avail === "sold_out") return isSoldOut || stock <= 0;
          if (avail === "low_stock") return stock > 0 && stock < LOW_STOCK_THRESHOLD;
          if (avail === "out_of_stock") return stock <= 0;
          if (avail === "ready_stock") return !isPreorder && !isSoldOut && stock >= LOW_STOCK_THRESHOLD;
          return true;
        });
      }

      setAllProducts(filtered);

      // Handle product selection from searchParams or preserve existing selection
      const paramPid = searchParams.get("productId") || searchParams.get("id");
      if (paramPid) {
        const matched = filtered.find(
          (p) =>
            String(p.productId || "").toLowerCase() === paramPid.toLowerCase() ||
            String(p.id).toLowerCase() === paramPid.toLowerCase() ||
            String(p.sku || "").toLowerCase() === paramPid.toLowerCase()
        );
        if (matched) {
          handleSelectProduct(matched, false);
          return;
        }
      }

      // If already selected, refresh selected product with latest stock data
      if (selectedProductRef.current) {
        const refreshed = filtered.find(
          (p) =>
            p.id === selectedProductRef.current?.id ||
            p.productId === selectedProductRef.current?.productId
        );
        if (refreshed) {
          setSelectedProduct(refreshed);
          setTargetQuantity(String(refreshed.availableStock ?? refreshed.stock ?? 0));
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message === "AbortError") {
        return;
      }
      setError("Failed to load products for inventory management. Please retry.");
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters, searchParams]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ── Fetch Movement History for Selected Product ──
  const fetchProductHistory = useCallback(async (product: B2BProductInput) => {
    setLoadingHistory(true);
    try {
      const prodId = product.id || product.productId;
      if (prodId) {
        const hist = await adminInventoryService.getProductStockHistory(prodId);
        setHistoryList(Array.isArray(hist) ? hist : []);
      } else {
        setHistoryList([]);
      }
    } catch (err) {
      console.warn("Failed to fetch product stock history:", err);
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // ── Handle Selecting a Product ──
  const handleSelectProduct = (product: B2BProductInput, updateUrl: boolean = true) => {
    setSelectedProduct(product);
    const currStock = Number(product.availableStock ?? product.stock ?? 0);
    setTargetQuantity(String(currStock));
    setDeltaQuantity("50");
    setDeltaSign("+");
    setReason("");
    setNotes("");
    setAdjustmentError(null);
    setIsConfirmOpen(false);

    if (updateUrl) {
      const pid = product.productId || product.id;
      const url = new URL(window.location.href);
      url.searchParams.set("productId", String(pid));
      window.history.replaceState({}, "", url.toString());
    }

    fetchProductHistory(product);
  };

  // ── Pagination Calculation ──
  const totalProducts = allProducts.length;
  const isAll = perPage === "all";
  const numPerPage = isAll ? Math.max(1, totalProducts) : Number(perPage);
  const totalPages = Math.max(1, Math.ceil(totalProducts / numPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = isAll ? 0 : (safePage - 1) * numPerPage;
  const paginatedProducts = isAll ? allProducts : allProducts.slice(startIdx, startIdx + numPerPage);

  // ── Projected Quantity Calculation ──
  const currentStock = Number(selectedProduct?.availableStock ?? selectedProduct?.stock ?? 0);
  let projectedStock = currentStock;

  if (adjustmentMode === "set") {
    const parsed = parseInt(targetQuantity, 10);
    projectedStock = isNaN(parsed) ? 0 : parsed;
  } else {
    const rawDelta = parseInt(deltaQuantity, 10);
    const validDelta = isNaN(rawDelta) ? 0 : Math.abs(rawDelta);
    projectedStock = deltaSign === "+" ? currentStock + validDelta : currentStock - validDelta;
  }

  const isInvalidNegative = projectedStock < 0;

  // ── Stock Adjustment Submission ──
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setAdjustmentError("Please select a product to adjust stock.");
      return;
    }
    if (!canAdjustStock) {
      setAdjustmentError("You lack permission to adjust inventory stock.");
      return;
    }
    if (!reason.trim()) {
      setAdjustmentError("Please select or enter a verified reason for this stock adjustment.");
      return;
    }
    if (isInvalidNegative) {
      setAdjustmentError(`Cannot reduce stock below zero. Current stock is ${currentStock}.`);
      return;
    }

    // If confirmation has not been explicitly approved, show confirmation
    if (!isConfirmOpen) {
      setIsConfirmOpen(true);
      return;
    }

    setIsSubmitting(true);
    setAdjustmentError(null);

    try {
      const prodId = selectedProduct.id || selectedProduct.productId;
      const parsedPid = typeof selectedProduct.id === "number" ? selectedProduct.id : parseInt(String(selectedProduct.id).replace(/\D/g, ""), 10) || undefined;

      if (adjustmentMode === "set") {
        const newQty = parseInt(targetQuantity, 10);
        if (isNaN(newQty) || newQty < 0) {
          throw new Error("Target stock quantity must be a non-negative integer.");
        }

        await adminInventoryService.adjustInventory({
          product_id: prodId,
          inventory_id: parsedPid,
          new_quantity: newQty,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        });

        addToast(
          "success",
          `Stock set to ${newQty.toLocaleString()} units for ${selectedProduct.name} (${selectedProduct.sku || selectedProduct.productId}).`
        );
      } else {
        const rawDelta = parseInt(deltaQuantity, 10);
        const absDelta = isNaN(rawDelta) ? 0 : Math.abs(rawDelta);
        const signedDelta = deltaSign === "+" ? absDelta : -absDelta;

        if (signedDelta === 0) {
          throw new Error("Adjustment delta cannot be zero.");
        }

        await adminInventoryService.adjustInventory({
          product_id: prodId,
          inventory_id: parsedPid,
          adjustment_amount: signedDelta,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        });

        const signPrefix = signedDelta > 0 ? `+${signedDelta}` : `${signedDelta}`;
        addToast(
          "success",
          `Stock adjusted (${signPrefix} units) for ${selectedProduct.name} (${selectedProduct.sku || selectedProduct.productId}).`
        );
      }

      setIsConfirmOpen(false);
      // Reload products list and refresh selected product & history
      await loadProducts();
      if (selectedProduct) {
        await fetchProductHistory(selectedProduct);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to adjust inventory stock. Please try again.";
      setAdjustmentError(msg);
      addToast("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* ── Top Header & Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            <Link href="/ayc/dashboard" className="hover:text-foreground transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-muted-foreground/80">Catalog</span>
            <span>/</span>
            <Link href="/ayc/products" className="hover:text-foreground transition-colors">
              Products
            </Link>
            <span>/</span>
            <span className="text-foreground font-extrabold" aria-current="page">
              Stock Management
            </span>
          </nav>

          <h1 className="text-xl sm:text-2xl font-bold font-display uppercase tracking-tight text-foreground">
            Inventory Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search products, inspect real-time warehouse inventory, record verified adjustments, and audit movement history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/ayc/products"
            id="btn-back-to-products"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-secondary/60 border border-border/80 text-foreground hover:bg-secondary transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Return to main Products catalog table"
          >
            <ArrowLeft size={14} className="text-muted-foreground" />
            <span>Back to Products</span>
          </Link>

          <button
            type="button"
            onClick={() => loadProducts()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-card border border-border/80 text-muted-foreground hover:text-foreground transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Refresh inventory data"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-primary" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Section 2: Reusable Product Search & Filters ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes size={16} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Search & Filter Products
            </span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {loading ? "Searching..." : `${totalProducts} products available`}
          </span>
        </div>

        <ProductSearchFilters
          filters={filters}
          onFilterChange={(f) => {
            setFilters(f);
            setCurrentPage(1);
          }}
          brands={brandsList}
          categories={categoriesList}
        />
      </div>

      {/* ── Section 3: Full-Width Search Results Table ── */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Catalog Inventory List
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary font-semibold text-muted-foreground">
              Showing {paginatedProducts.length} of {totalProducts}
            </span>
          </div>

          {selectedProduct && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Selected:</span>
              <span className="font-bold text-foreground">{selectedProduct.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">({selectedProduct.sku || selectedProduct.productId})</span>
            </div>
          )}
        </div>

        {error ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle size={24} />
            </div>
            <p className="text-xs text-destructive font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => loadProducts()}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : loading && allProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 size={24} className="animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">Loading catalog products and warehouse stock...</p>
          </div>
        ) : allProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <PackageX size={32} className="text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">No products match your search criteria</p>
            <p className="text-xs text-muted-foreground">Try adjusting search query or clearing active filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse" id="table-inventory-products">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-3 py-3 w-16 text-center">Image</th>
                  <th className="px-3 py-3 w-28 text-center">ID</th>
                  <th className="px-4 py-3 min-w-[200px]">Product Name</th>
                  <th className="px-3 py-3 w-32">SKU</th>
                  <th className="px-3 py-3 w-28">Brand</th>
                  <th className="px-3 py-3 w-28">Category</th>
                  <th className="px-3 py-3 w-36">Location</th>
                  <th className="px-3 py-3 w-24 text-right">Physical</th>
                  <th className="px-3 py-3 w-28 text-right">Available</th>
                  <th className="px-3 py-3 w-20 text-right">MOQ</th>
                  <th className="px-4 py-3 w-32 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id || (p.productId && selectedProduct?.productId === p.productId);
                  const physStock = Number(p.onHandStock ?? p.stock ?? 0);
                  const availStock = Number(p.availableStock ?? p.stock ?? 0);
                  const status = getStockStatus(availStock);
                  const imgUrl = Array.isArray(p.images) && p.images[0] ? p.images[0] : "/placeholder.jpg";
                  const pid = p.productId || p.id;
                  const warehouseName = p.warehouseBreakdown?.[0]?.warehouse_name || "Uttara (WH-UTT-01)";

                  return (
                    <tr
                      key={p.id || p.productId}
                      id={`inventory-row-${p.productId || p.id}`}
                      onClick={() => handleSelectProduct(p)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "hover:bg-secondary/40"
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="w-10 h-13 mx-auto rounded-lg overflow-hidden bg-secondary/60 border border-border/60 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={p.name}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg";
                            }}
                          />
                        </div>
                      </td>

                      {/* Product ID */}
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-muted-foreground">
                        <span title={`Product ID: ${pid}`} className="truncate max-w-[100px] inline-block">
                          {pid}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-foreground text-xs leading-snug group-hover:text-primary transition-colors">
                          <span title={p.name}>{p.name}</span>
                        </div>
                        {p.designType && (
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            {p.designType}
                          </span>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="px-3 py-2.5 font-mono text-xs text-foreground">
                        <span title={`SKU: ${p.sku}`}>{p.sku || "—"}</span>
                      </td>

                      {/* Brand */}
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <span title={p.brand}>{p.brand || "—"}</span>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <span title={p.categoryName}>{p.categoryName || "—"}</span>
                      </td>

                      {/* Location */}
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <span className="flex items-center gap-1 text-[11px]" title={warehouseName}>
                          <Warehouse size={12} className="shrink-0 text-muted-foreground/70" />
                          <span className="truncate max-w-[120px]">{warehouseName}</span>
                        </span>
                      </td>

                      {/* Physical Stock */}
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-muted-foreground">
                        {physStock.toLocaleString()}
                      </td>

                      {/* Available Stock & Status Badge */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="tabular-nums font-bold text-foreground">
                          {availStock.toLocaleString()}
                        </div>
                        <div className="mt-0.5">
                          {status === "OUT_OF_STOCK" || p.isSoldOut ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                              Sold Out
                            </span>
                          ) : status === "LOW_STOCK" ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              In Stock
                            </span>
                          )}
                        </div>
                      </td>

                      {/* MOQ */}
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground font-semibold">
                        {p.moq || 50}
                      </td>

                      {/* Action Button */}
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          id={`btn-adjust-${p.productId || p.id}`}
                          onClick={() => {
                            handleSelectProduct(p);
                            const el = document.getElementById("adjustment-workspace");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-secondary hover:bg-secondary/80 text-foreground border border-border/60"
                          }`}
                          title="Open stock adjustment workspace for this product"
                        >
                          <SlidersHorizontal size={12} />
                          <span>{isSelected ? "Active" : "Adjust"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {!loading && !error && allProducts.length > 0 && (
          <div className="p-4 border-t border-border/60">
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
          </div>
        )}
      </div>

      {/* ── Section 4 & 5: Stock Adjustment Interface & Audit History ── */}
      <div id="adjustment-workspace" className="scroll-mt-6">
        {!selectedProduct ? (
          <div className="bg-card border border-dashed border-border/80 rounded-2xl p-8 text-center space-y-2">
            <SlidersHorizontal size={28} className="text-muted-foreground mx-auto" />
            <h3 className="text-sm font-bold uppercase tracking-tight text-foreground">
              No Product Selected
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Select any product from the table above or click <span className="font-semibold text-foreground">&quot;Adjust&quot;</span> on a row to open its stock adjustment controls and inspect verified movement logs.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── Left Column (Col 7): Adjustment Form ── */}
            <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-start justify-between pb-3 border-b border-border/60">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Verified Adjustment
                  </span>
                  <h3 className="font-display font-bold text-base sm:text-lg uppercase tracking-tight text-foreground">
                    Adjust Stock: {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Record auditable inventory corrections with reason codes and live preview.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
                  title="Close adjustment workspace"
                >
                  Deselect
                </button>
              </div>

              {/* Selected Product Identity Card */}
              <div className="p-3.5 rounded-2xl border border-border/70 bg-secondary/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-16 rounded-xl overflow-hidden bg-secondary border border-border/60 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={Array.isArray(selectedProduct.images) && selectedProduct.images[0] ? selectedProduct.images[0] : "/placeholder.jpg"}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain p-0.5"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg";
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-foreground text-xs truncate">
                      {selectedProduct.name}
                    </h4>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      SKU: {selectedProduct.sku || "—"} | PID: {selectedProduct.productId || selectedProduct.id}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Warehouse size={11} className="text-muted-foreground/70" />
                      <span>{selectedProduct.warehouseBreakdown?.[0]?.warehouse_name || "Uttara Warehouse (WH-UTT-01)"}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                    Current Stock
                  </span>
                  <span className="text-xl font-display font-bold text-foreground tabular-nums">
                    {currentStock.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    MOQ: {selectedProduct.moq || 50}
                  </span>
                </div>
              </div>

              {adjustmentError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{adjustmentError}</span>
                </div>
              )}

              <form onSubmit={handleAdjustmentSubmit} className="space-y-4 text-xs">
                {/* Adjustment Mode Selector */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                    Adjustment Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/40 rounded-xl border border-border/60">
                    <button
                      type="button"
                      id="btn-mode-delta"
                      onClick={() => setAdjustmentMode("delta")}
                      disabled={isSubmitting}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        adjustmentMode === "delta"
                          ? "bg-foreground text-background shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Add / Subtract Stock
                    </button>
                    <button
                      type="button"
                      id="btn-mode-set"
                      onClick={() => {
                        setAdjustmentMode("set");
                        setTargetQuantity(String(currentStock));
                      }}
                      disabled={isSubmitting}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        adjustmentMode === "set"
                          ? "bg-foreground text-background shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Set Absolute Qty
                    </button>
                  </div>
                </div>

                {/* Quantity Input */}
                {adjustmentMode === "delta" ? (
                  <div className="space-y-1.5">
                    <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                      Stock Quantity Delta *
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex p-1 bg-secondary/40 rounded-xl border border-border/60">
                        <button
                          type="button"
                          id="btn-delta-add"
                          onClick={() => setDeltaSign("+")}
                          disabled={isSubmitting}
                          className={`px-3 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            deltaSign === "+"
                              ? "bg-emerald-500 text-white shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Add units"
                        >
                          + Add
                        </button>
                        <button
                          type="button"
                          id="btn-delta-subtract"
                          onClick={() => setDeltaSign("-")}
                          disabled={isSubmitting}
                          className={`px-3 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            deltaSign === "-"
                              ? "bg-rose-500 text-white shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Deduct units"
                        >
                          - Deduct
                        </button>
                      </div>
                      <input
                        type="number"
                        id="input-delta-quantity"
                        min={1}
                        required
                        placeholder="e.g. 50"
                        value={deltaQuantity}
                        onChange={(e) => setDeltaQuantity(e.target.value)}
                        disabled={isSubmitting}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-display font-bold text-base focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                      New Target Stock Quantity *
                    </label>
                    <input
                      type="number"
                      id="input-target-quantity"
                      min={0}
                      required
                      value={targetQuantity}
                      onChange={(e) => setTargetQuantity(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-display font-bold text-base focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                )}

                {/* Live Preview Box */}
                <div
                  id="stock-live-preview"
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    isInvalidNegative
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                      : "bg-secondary/40 border-border/70 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Previous Stock:</span>
                    <span className="font-bold tabular-nums">{currentStock.toLocaleString()}</span>
                    <ArrowRight size={13} className="text-muted-foreground" />
                    <span className="text-muted-foreground font-medium">New Stock:</span>
                    <span className="font-display font-bold text-sm tabular-nums text-primary">
                      {projectedStock.toLocaleString()}
                    </span>
                  </div>

                  {isInvalidNegative && (
                    <span className="font-bold uppercase tracking-wider text-[10px] text-destructive">
                      Cannot reduce stock below zero
                    </span>
                  )}
                </div>

                {/* Reason Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                    Reason for Adjustment *
                  </label>

                  {/* Quick Reason Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {COMMON_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        disabled={isSubmitting}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-all cursor-pointer ${
                          reason === r
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
                    id="input-adjustment-reason"
                    required
                    placeholder="Select a reason chip above or enter a custom reason..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                {/* Optional Notes */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    id="input-adjustment-notes"
                    placeholder="e.g. Received shipment from Savar factory with QC inspection pass."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
                  />
                </div>

                {/* Explicit Confirmation Step Dialog */}
                {isConfirmOpen && (
                  <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle size={15} />
                      <span>Confirm Verified Stock Adjustment</span>
                    </div>
                    <p className="text-xs text-foreground">
                      Are you sure you want to change stock from{" "}
                      <span className="font-bold">{currentStock.toLocaleString()}</span> to{" "}
                      <span className="font-bold text-primary">{projectedStock.toLocaleString()}</span>?
                    </p>
                    <div className="text-[11px] text-muted-foreground">
                      Reason: <span className="font-semibold text-foreground">{reason}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsConfirmOpen(false)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-secondary cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        id="btn-confirm-adjustment"
                        disabled={isSubmitting}
                        className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? "Committing..." : "Yes, Commit Adjustment"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Submit Button (when confirmation step is not yet active) */}
                {!isConfirmOpen && (
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                    <button
                      type="submit"
                      id="btn-submit-adjustment"
                      disabled={isSubmitting || !canAdjustStock || isInvalidNegative || !reason.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Updating Stock...</span>
                        </>
                      ) : !canAdjustStock ? (
                        <>
                          <Lock size={14} />
                          <span>Unauthorized</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Review & Confirm Adjustment</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* ── Right Column (Col 5): Stock Movement History ── */}
            <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-primary" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
                    Stock Movement History
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {historyList.length} records
                </span>
              </div>

              {loadingHistory ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 size={20} className="animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted-foreground">Loading audit logs...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="p-8 text-center space-y-2 border border-dashed border-border/60 rounded-xl">
                  <History size={24} className="text-muted-foreground mx-auto" />
                  <p className="text-xs font-semibold text-foreground">No historical adjustments recorded</p>
                  <p className="text-[11px] text-muted-foreground">
                    All future stock adjustments made for this product will appear in this verified ledger.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {historyList.map((hist) => {
                    const isPositive = hist.adjustment_amount > 0;
                    const dateFormatted = new Date(hist.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={hist.id}
                        className="p-3 rounded-xl border border-border/70 bg-secondary/20 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-display font-bold tabular-nums px-2 py-0.5 rounded-md text-[11px] ${
                              isPositive
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isPositive ? `+${hist.adjustment_amount}` : `${hist.adjustment_amount}`} units
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {dateFormatted}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                          <span>Previous: {hist.previous_quantity}</span>
                          <ArrowRight size={10} />
                          <span className="font-semibold text-foreground">Result: {hist.resulting_quantity}</span>
                        </div>

                        <div className="font-semibold text-foreground text-[11px]">
                          Reason: <span className="font-normal text-muted-foreground">{hist.reason}</span>
                        </div>

                        {hist.notes && (
                          <div className="text-[11px] text-muted-foreground bg-secondary/40 p-1.5 rounded-lg border border-border/40">
                            Note: {hist.notes}
                          </div>
                        )}

                        {hist.admin_user && (
                          <div className="text-[10px] text-muted-foreground/80 flex items-center justify-between pt-1 border-t border-border/40">
                            <span>Admin: {hist.admin_user.name}</span>
                            <span className="font-mono text-[9px]">ID #{hist.id}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function AdminStockManagementPage() {
  return (
    <AdminPageGate permission="product.view" moduleName="Stock Management">
      <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading stock management workspace...</div>}>
        <FullPageStockManagementContent />
      </Suspense>
    </AdminPageGate>
  );
}
