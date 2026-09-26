"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Warehouse as WarehouseIcon,
  Package,
  Layers,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Info,
  Building2,
} from "lucide-react";
import { adminInventoryService, Warehouse } from "@/services/admin/inventory.service";

interface ProductInventorySectionProps {
  isEdit: boolean;
  moq: number;
  stock: number;
  warehouseId?: number | string;
  onMoqChange: (moq: number) => void;
  onStockChange: (stock: number) => void;
  onWarehouseChange: (warehouseId: number | string) => void;
  errors: Record<string, string>;
  onHandStock?: number;
  reservedStock?: number;
  availableStock?: number;
  warehouseBreakdown?: Array<{
    warehouse_id: number;
    warehouse_name: string;
    warehouse_code: string;
    on_hand_quantity: number;
    reserved_quantity: number;
    available_quantity: number;
  }>;
  productId?: string | number;
}

export default function ProductInventorySection({
  isEdit,
  moq,
  stock,
  warehouseId,
  onMoqChange,
  onStockChange,
  onWarehouseChange,
  errors,
  onHandStock,
  reservedStock,
  availableStock,
  warehouseBreakdown,
  productId,
}: ProductInventorySectionProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseFetchError, setWarehouseFetchError] = useState<string | null>(null);

  // Fetch real active warehouses from backend
  useEffect(() => {
    let isMounted = true;
    async function loadWarehouses() {
      setLoadingWarehouses(true);
      setWarehouseFetchError(null);
      try {
        const list = await adminInventoryService.getWarehouses();
        if (isMounted) {
          const activeOnly = list.filter((w) => w.is_active !== false);
          setWarehouses(activeOnly);

          // If no warehouse selected yet and we have warehouses, auto-select the first one
          if (!warehouseId && activeOnly.length > 0) {
            onWarehouseChange(activeOnly[0].id);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load warehouses:", err);
          setWarehouseFetchError("Failed to load active warehouses.");
        }
      } finally {
        if (isMounted) setLoadingWarehouses(false);
      }
    }

    loadWarehouses();
    return () => {
      isMounted = false;
    };
  }, []);

  // Ensure warehouseId auto-selects if empty when warehouses change
  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      onWarehouseChange(warehouses[0].id);
    }
  }, [warehouseId, warehouses, onWarehouseChange]);

  // Dynamic calculations
  const effectiveMoq = Math.max(1, Number(moq) || 1);

  // Create Mode Metrics
  const initialStockQty = Math.max(0, Number(stock) || 0);
  const createCompleteMoqs = Math.floor(initialStockQty / effectiveMoq);
  const createRemainder = initialStockQty % effectiveMoq;

  // Edit Mode Metrics
  const editOnHand = onHandStock !== undefined ? Number(onHandStock) : initialStockQty;
  const editReserved = reservedStock !== undefined ? Number(reservedStock) : 0;
  const editAvailable = availableStock !== undefined ? Number(availableStock) : Math.max(0, editOnHand - editReserved);
  const editCompleteMoqs = Math.floor(editAvailable / effectiveMoq);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xs">
      {/* Header */}
      <div className="border-b border-border/60 pb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <WarehouseIcon size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
              Inventory &amp; MOQ Configuration
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? "Authoritative warehouse inventory metrics and minimum order requirements."
                : "Allocate initial warehouse stock and define Minimum Order Quantity (MOQ)."}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary text-foreground/80 border border-border/60 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Single Source of Truth
        </span>
      </div>

      {/* Mode-Specific Content */}
      {!isEdit ? (
        /* ========================================================================= */
        /* CREATE MODE: Initial Stock, Warehouse Selector, MOQ, Live MOQs Preview    */
        /* ========================================================================= */
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Product MOQ */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Product MOQ (Minimum Order) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={moq || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onMoqChange(isNaN(val) ? 1 : Math.max(1, val));
                  }}
                  placeholder="50"
                  className={`w-full h-10 px-3.5 rounded-xl border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 transition-colors ${
                    errors.moq
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-border focus:ring-ring/40"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PCS
                </span>
              </div>
              {errors.moq ? (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.moq}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Smallest batch a B2B customer can purchase (must be ≥ 1).
                </p>
              )}
            </div>

            {/* 2. Initial Stock */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Initial Stock Units <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stock === 0 ? "0" : stock || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onStockChange(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  placeholder="250"
                  className={`w-full h-10 px-3.5 rounded-xl border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 transition-colors ${
                    errors.stock || errors.initial_stock
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-border focus:ring-ring/40"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PCS
                </span>
              </div>
              {errors.stock || errors.initial_stock ? (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.stock || errors.initial_stock}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Physical units on hand at product creation.
                </p>
              )}
            </div>

            {/* 3. Warehouse Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Initial Warehouse Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={warehouseId ? String(warehouseId) : ""}
                  onChange={(e) => onWarehouseChange(e.target.value)}
                  disabled={loadingWarehouses || warehouses.length === 0}
                  className={`w-full h-10 px-3.5 rounded-xl border bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-2 transition-colors appearance-none cursor-pointer ${
                    errors.warehouse_id
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-border focus:ring-ring/40"
                  }`}
                >
                  {loadingWarehouses && <option value="">Loading warehouses...</option>}
                  {!loadingWarehouses && warehouses.length === 0 && (
                    <option value="">No active warehouses found</option>
                  )}
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code}) {wh.city ? `— ${wh.city}` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Building2 size={13} />
                </div>
              </div>
              {errors.warehouse_id ? (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.warehouse_id}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Warehouse where initial stock is booked &amp; audited.
                </p>
              )}
            </div>
          </div>

          {warehouseFetchError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{warehouseFetchError} Default warehouse will be used upon submission.</span>
            </div>
          )}

          {/* Dynamic Live Calculation Preview Card */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <Package size={15} className="text-primary" />
                <span>Live Stock &amp; Complete MOQs Availability Calculation</span>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-background border border-border text-foreground/80">
                Formula: floor(Available Stock / MOQ)
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* On Hand */}
              <div className="p-3 rounded-xl bg-card border border-border/80 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  On Hand Stock
                </span>
                <span className="text-base font-bold tabular-nums text-foreground mt-0.5">
                  {initialStockQty.toLocaleString()} pcs
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">Physical Units</span>
              </div>

              {/* Reserved */}
              <div className="p-3 rounded-xl bg-card border border-border/80 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Reserved Stock
                </span>
                <span className="text-base font-bold tabular-nums text-muted-foreground mt-0.5">
                  0 pcs
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">Unallocated Orders</span>
              </div>

              {/* Available */}
              <div className="p-3 rounded-xl bg-card border border-border/80 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Available Stock
                </span>
                <span className="text-base font-bold tabular-nums text-foreground mt-0.5">
                  {initialStockQty.toLocaleString()} pcs
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  100% Available
                </span>
              </div>

              {/* Available Complete MOQs */}
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex flex-col shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Complete MOQs Available
                </span>
                <span className="text-lg font-black tabular-nums text-primary mt-0.5">
                  {createCompleteMoqs}{" "}
                  <span className="text-xs font-semibold">MOQ{createCompleteMoqs !== 1 ? "s" : ""}</span>
                </span>
                <span className="text-[10px] text-primary/80 font-medium mt-1">
                  {createCompleteMoqs > 0 ? "Ready for Orders" : "Out of Stock"}
                </span>
              </div>
            </div>

            {/* Explanation Note */}
            <div className="text-xs text-foreground/80 flex items-start gap-2 pt-1 border-t border-border/40">
              <Info size={14} className="text-primary shrink-0 mt-0.5" />
              <span>
                {initialStockQty === 0 ? (
                  <span className="text-muted-foreground">
                    Initial stock is 0. This product will be created as <strong>Out of Stock</strong> until stock is added via an audited inventory adjustment.
                  </span>
                ) : createRemainder === 0 ? (
                  <span>
                    <strong>{initialStockQty.toLocaleString()} pcs</strong> initial stock ÷ <strong>{effectiveMoq} pcs</strong> MOQ ={" "}
                    <strong className="text-primary font-bold">{createCompleteMoqs} complete MOQs</strong> available immediately for wholesale customers.
                  </span>
                ) : (
                  <span>
                    <strong>{initialStockQty.toLocaleString()} pcs</strong> initial stock ÷ <strong>{effectiveMoq} pcs</strong> MOQ ={" "}
                    <strong className="text-primary font-bold">{createCompleteMoqs} complete MOQs</strong> available (with{" "}
                    <strong>{createRemainder} pcs</strong> unbundled partial stock).
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* EDIT MODE: Read-Only Stock Metrics, Editable MOQ, Audit Safeguard Callout */
        /* ========================================================================= */
        <div className="space-y-5">
          {/* Read-Only Inventory Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/80 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                On Hand Stock
              </span>
              <span className="text-base font-bold tabular-nums text-foreground mt-0.5">
                {editOnHand.toLocaleString()} pcs
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">Physical count</span>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/80 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Reserved Stock
              </span>
              <span className="text-base font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                {editReserved.toLocaleString()} pcs
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">Committed to orders</span>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/80 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Available Stock
              </span>
              <span className="text-base font-bold tabular-nums text-foreground mt-0.5">
                {editAvailable.toLocaleString()} pcs
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                Net available
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Available Complete MOQs
              </span>
              <span className="text-lg font-black tabular-nums text-primary mt-0.5">
                {editCompleteMoqs}{" "}
                <span className="text-xs font-semibold">MOQ{editCompleteMoqs !== 1 ? "s" : ""}</span>
              </span>
              <span className="text-[10px] text-primary/80 font-medium mt-1">
                {editCompleteMoqs > 0 ? "Orderable" : "Out of Stock"}
              </span>
            </div>
          </div>

          {/* Editable MOQ Input */}
          <div className="max-w-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Product MOQ (Minimum Order) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={moq || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onMoqChange(isNaN(val) ? 1 : Math.max(1, val));
                }}
                placeholder="50"
                className={`w-full h-10 px-3.5 rounded-xl border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 transition-colors ${
                  errors.moq
                    ? "border-red-500 focus:ring-red-500/30"
                    : "border-border focus:ring-ring/40"
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                PCS
              </span>
            </div>
            {errors.moq ? (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.moq}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                Updating MOQ dynamically recalculates customer complete MOQ availability ({editCompleteMoqs} available).
              </p>
            )}
          </div>

          {/* Warehouse Breakdown (if available) */}
          {warehouseBreakdown && warehouseBreakdown.length > 0 && (
            <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
              <div className="px-4 py-2.5 bg-secondary/40 border-b border-border/60 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Warehouse Stock Distribution
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {warehouseBreakdown.length} Warehouse Location{warehouseBreakdown.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                    <tr>
                      <th className="px-4 py-2">Warehouse</th>
                      <th className="px-4 py-2">Code</th>
                      <th className="px-4 py-2 text-right">On Hand</th>
                      <th className="px-4 py-2 text-right">Reserved</th>
                      <th className="px-4 py-2 text-right font-bold text-foreground">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {warehouseBreakdown.map((wh) => (
                      <tr key={wh.warehouse_id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-foreground">
                          {wh.warehouse_name}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {wh.warehouse_code}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                          {wh.on_hand_quantity.toLocaleString()} pcs
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400">
                          {wh.reserved_quantity.toLocaleString()} pcs
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-foreground">
                          {wh.available_quantity.toLocaleString()} pcs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Integrity Safeguard Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Audited Stock Safeguard Active
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Physical warehouse inventory cannot be directly overwritten in this product form to prevent un-audited discrepancies. To adjust, restock, or count physical inventory, use the audited Inventory Adjustment workflow.
              </p>
              <div className="pt-1.5">
                <Link
                  href="/admin/inventory"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                >
                  <ExternalLink size={12} />
                  Go to Inventory Adjustments
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
