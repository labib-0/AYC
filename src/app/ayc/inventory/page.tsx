"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, SlidersHorizontal, Warehouse } from "lucide-react";
import {
  adminInventoryService,
  InventoryRecord,
  InventorySummary,
} from "@/services/admin/inventory.service";
import {
  InventoryHeader,
  InventoryKpis,
  InventoryToolbar,
  StockFilterStatus,
  InventoryTable,
  InventoryPagination,
  StockAdjustmentModal,
  InventoryHistoryModal,
} from "@/components/admin/inventory";
import ProductToast, {
  ToastMessage,
} from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

const PER_PAGE = 20;

function AdminInventoryContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Data State
  const [inventories, setInventories] = useState<InventoryRecord[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalItems: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalQuantity: 0,
  });
  const [total, setTotal] = useState(0);

  // UX & Loading State
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StockFilterStatus>(
    tabParam === "stock-control" ? "LOW_STOCK" : "ALL"
  );

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryRecord | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryRecord | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Inventory and Summary Data
  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      try {
        const [invRes, summaryRes] = await Promise.all([
          adminInventoryService.getInventory({
            page,
            per_page: PER_PAGE,
            search: search.trim() || undefined,
            status,
          }),
          adminInventoryService.getInventorySummary(),
        ]);

        setInventories(invRes.data);
        setTotal(invRes.total);
        setSummary(summaryRes);
      } catch (err: unknown) {
        setError(
          (err as Error)?.message || "Failed to load inventory records. Please retry."
        );
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, search, status]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle URL tab changes
  useEffect(() => {
    if (tabParam === "stock-control" && status === "ALL") {
      setStatus("LOW_STOCK");
    }
  }, [tabParam, status]);

  // Filter Handlers
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (newStatus: StockFilterStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setPage(1);
  };

  // Adjust Stock Handlers
  const handleOpenGlobalAdjust = () => {
    setAdjustingItem(null);
    setIsAdjustModalOpen(true);
  };

  const handleOpenRowAdjust = (record: InventoryRecord) => {
    setAdjustingItem(record);
    setIsAdjustModalOpen(true);
  };

  // History Handler
  const handleOpenHistory = (record: InventoryRecord) => {
    setHistoryItem(record);
    setIsHistoryModalOpen(true);
  };

  const handleMutationSuccess = (message: string) => {
    addToast("success", message);
    loadData(true);
  };

  const isStockControlActive = status === "LOW_STOCK" || status === "OUT_OF_STOCK";

  return (
    <AdminPageGate permission="inventory.view" moduleName="Inventory Management">
      <div className="space-y-5">
        {/* 1. Page Header */}
        <InventoryHeader
          onAdjustStock={handleOpenGlobalAdjust}
          onRefresh={() => loadData(true)}
          isLoading={isRefreshing || loading}
        />

        {/* 1.1 Integrated Stock Control & View Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "ALL", label: "All Inventory", count: summary.totalItems },
            {
              id: "STOCK_CONTROL",
              label: "Stock Control & Alerts",
              count: summary.lowStock + summary.outOfStock,
              isAmber: true,
              icon: SlidersHorizontal
            },
            { id: "LOW_STOCK", label: "Low Stock", count: summary.lowStock },
            { id: "OUT_OF_STOCK", label: "Out of Stock", count: summary.outOfStock, isRed: true },
          ].map((tab) => {
            const isTabActive =
              tab.id === "STOCK_CONTROL"
                ? isStockControlActive
                : status === tab.id;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "STOCK_CONTROL") {
                    handleStatusChange("LOW_STOCK");
                  } else {
                    handleStatusChange(tab.id as StockFilterStatus);
                  }
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                  isTabActive
                    ? tab.isAmber
                      ? "bg-amber-500 text-amber-950 font-extrabold ring-2 ring-amber-500/30"
                      : tab.isRed
                      ? "bg-rose-500 text-white font-extrabold ring-2 ring-rose-500/30"
                      : "bg-foreground text-background font-extrabold"
                    : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
                id={`btn-tab-inventory-${tab.id.toLowerCase()}`}
              >
                {TabIcon && <TabIcon size={13} className={isTabActive ? "text-amber-950" : "text-amber-500"} />}
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isTabActive
                        ? tab.isAmber
                          ? "bg-amber-950/20 text-amber-950 font-extrabold"
                          : tab.isRed
                          ? "bg-white/20 text-white font-extrabold"
                          : "bg-background/20 text-background font-extrabold"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Stock Control Context Banner when alert tab active */}
        {isStockControlActive && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-medium flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Warehouse size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Stock Control Filter Active:</strong> Showing items needing replenishment or warehouse reconciliation at Uttara Central Warehouse.
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenGlobalAdjust}
              className="px-3 py-1 rounded-lg bg-amber-500 text-amber-950 text-xs font-bold hover:bg-amber-400 transition-colors cursor-pointer shrink-0"
            >
              Adjust Stock Now
            </button>
          </div>
        )}

        {/* Error Banner with Retry */}
        {error && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadData(false)}
              className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* 2. Dynamic KPI Summary */}
        <InventoryKpis
          summary={summary}
          selectedStatus={status}
          onSelectStatus={(st) => handleStatusChange(st)}
          isLoading={loading && inventories.length === 0}
        />

        {/* 3. Search & Status Toolbar with Uttara Warehouse Indicator */}
        <InventoryToolbar
          search={search}
          onSearchChange={handleSearchChange}
          status={status}
          onStatusChange={handleStatusChange}
          onResetFilters={handleResetFilters}
          totalResults={total}
        />

        {/* 4. Inventory Data Table */}
        <InventoryTable
          records={inventories}
          isLoading={loading}
          search={search}
          status={status}
          onAdjust={handleOpenRowAdjust}
          onViewHistory={handleOpenHistory}
          onResetFilters={handleResetFilters}
        />

        {/* 5. Real Pagination Controls */}
        <InventoryPagination
          currentPage={page}
          perPage={PER_PAGE}
          totalItems={total}
          onPageChange={(newPage) => setPage(newPage)}
        />

        {/* 6. Stock Adjustment Modal (Global + Row-preselected) */}
        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          inventoryItem={adjustingItem}
          allItems={inventories}
          onSuccess={handleMutationSuccess}
        />

        {/* 7. Inventory History Audit Trail Modal */}
        <InventoryHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          inventoryItem={historyItem}
        />

        {/* Application Toasts */}
        <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}

export default function AdminInventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
          Loading inventory and stock control records...
        </div>
      }
    >
      <AdminInventoryContent />
    </Suspense>
  );
}
