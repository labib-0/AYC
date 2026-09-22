"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import {
  adminInventoryService,
  InventoryRecord,
  Warehouse,
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
  WarehouseManagementModal,
} from "@/components/admin/inventory";
import ProductToast, {
  ToastMessage,
} from "@/components/admin/products/ProductToast";

const PER_PAGE = 20;

export default function AdminInventoryPage() {
  // Data State
  const [inventories, setInventories] = useState<InventoryRecord[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalItems: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalQuantity: 0,
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);

  // UX & Loading State
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StockFilterStatus>("ALL");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryRecord | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryRecord | null>(null);

  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

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
        const warehouseParam =
          selectedWarehouse !== "all" ? selectedWarehouse : undefined;

        const [invRes, summaryRes, whRes] = await Promise.all([
          adminInventoryService.getInventory({
            page,
            per_page: PER_PAGE,
            search: search.trim() || undefined,
            warehouse_id: warehouseParam,
            status,
          }),
          adminInventoryService.getInventorySummary(warehouseParam),
          adminInventoryService.getWarehouses(),
        ]);

        setInventories(invRes.data);
        setTotal(invRes.total);
        setSummary(summaryRes);
        setWarehouses(whRes);
      } catch (err: unknown) {
        setError(
          (err as Error)?.message || "Failed to load inventory records. Please retry."
        );
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, search, status, selectedWarehouse]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter Handlers
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (newStatus: StockFilterStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleWarehouseChange = (whId: string) => {
    setSelectedWarehouse(whId);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setSelectedWarehouse("all");
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

  // Warehouse Management Handler
  const handleOpenWarehouseModal = () => {
    setIsWarehouseModalOpen(true);
  };

  const handleMutationSuccess = (message: string) => {
    addToast("success", message);
    loadData(true);
  };

  return (
    <div className="space-y-5">
      {/* 1. Page Header */}
      <InventoryHeader
        onAdjustStock={handleOpenGlobalAdjust}
        onManageWarehouses={handleOpenWarehouseModal}
        onRefresh={() => loadData(true)}
        isLoading={isRefreshing || loading}
      />

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

      {/* 3. Search, Status & Warehouse Toolbar */}
      <InventoryToolbar
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
        warehouses={warehouses}
        selectedWarehouse={selectedWarehouse}
        onSelectWarehouse={handleWarehouseChange}
        onResetFilters={handleResetFilters}
        totalResults={total}
      />

      {/* 4. Inventory Data Table */}
      <InventoryTable
        records={inventories}
        isLoading={loading}
        search={search}
        status={status}
        selectedWarehouse={selectedWarehouse}
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

      {/* 8. Warehouse Management Modal */}
      <WarehouseManagementModal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        warehouses={warehouses}
        onRefresh={() => loadData(true)}
        onSuccess={handleMutationSuccess}
      />

      {/* Application Toasts */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
