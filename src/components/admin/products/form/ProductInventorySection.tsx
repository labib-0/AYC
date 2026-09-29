"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Warehouse as WarehouseIcon,
  AlertCircle,
  Building2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { adminInventoryService, Warehouse } from "@/services/admin/inventory.service";

interface ProductInventorySectionProps {
  isEdit: boolean;
  moq?: number;
  stock?: number;
  warehouseId?: number | string;
  onMoqChange: (moq: number | undefined) => void;
  onStockChange: (stock: number | undefined) => void;
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
}: ProductInventorySectionProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseFetchError, setWarehouseFetchError] = useState<string | null>(null);

  // Fetch active warehouses from backend — DO NOT auto-select
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

  // Authoritative dynamic calculations
  const effectiveMoq = Math.max(1, Number(moq) || 1);

  // Create Mode Metrics
  const initialStockQty = Math.max(0, Number(stock) || 0);
  const createReserved = 0;
  const createAvailable = Math.max(0, initialStockQty - createReserved);
  const createCompleteMoqs = Math.floor(createAvailable / effectiveMoq);

  // Edit Mode Metrics
  const editOnHand = onHandStock !== undefined ? Number(onHandStock) : initialStockQty;
  const editReserved = reservedStock !== undefined ? Number(reservedStock) : 0;
  const editAvailable = availableStock !== undefined ? Number(availableStock) : Math.max(0, editOnHand - editReserved);
  const editCompleteMoqs = Math.floor(editAvailable / effectiveMoq);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header */}
      <div className="border-b border-border/60 pb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <WarehouseIcon size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
              INVENTORY
            </h2>
          </div>
        </div>
      </div>

      {!isEdit ? (
        /* ========================================================================= */
        /* CREATE MODE: 3 Inputs + Compact Calculated Summary                        */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Initial Stock Units */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Initial Stock Units <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stock !== undefined ? stock : ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    onStockChange(val !== undefined && !isNaN(val) ? Math.max(0, val) : undefined);
                  }}
                  placeholder=""
                  className={`w-full h-10 px-3.5 pr-12 rounded-xl border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 transition-colors ${
                    errors.stock || errors.initial_stock
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-border focus:ring-ring/40"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PCS
                </span>
              </div>
              {(errors.stock || errors.initial_stock) && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.stock || errors.initial_stock}
                </p>
              )}
            </div>

            {/* 2. MOQ */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                MOQ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={moq !== undefined && moq > 0 ? moq : ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    onMoqChange(val !== undefined && !isNaN(val) ? Math.max(1, val) : undefined);
                  }}
                  placeholder=""
                  className={`w-full h-10 px-3.5 pr-12 rounded-xl border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 transition-colors ${
                    errors.moq
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-border focus:ring-ring/40"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PCS
                </span>
              </div>
              {errors.moq && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.moq}
                </p>
              )}
            </div>

            {/* 3. Initial Warehouse */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Initial Warehouse <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={warehouseId ? String(warehouseId) : ""}
                  onChange={(e) => onWarehouseChange(e.target.value)}
                  disabled={loadingWarehouses}
                  className={`w-full h-10 px-3.5 pr-8 rounded-xl border bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-2 transition-colors appearance-none cursor-pointer ${
                    errors.warehouse_id
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-border focus:ring-ring/40"
                  }`}
                >
                  <option value="">
                    {loadingWarehouses ? "Loading warehouses..." : "Select warehouse"}
                  </option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.city ? `(${wh.city})` : `(${wh.code})`}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Building2 size={13} />
                </div>
              </div>
              {errors.warehouse_id && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.warehouse_id}
                </p>
              )}
            </div>
          </div>

          {warehouseFetchError && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{warehouseFetchError} Default warehouse will be used upon submission.</span>
            </div>
          )}

          {/* Compact Calculated Summary */}
          <div className="bg-secondary/40 border border-border/70 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Available Stock:</span>
              <span className="font-bold text-foreground tabular-nums">
                {stock !== undefined ? `${createAvailable.toLocaleString()} PCS` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Reserved Stock:</span>
              <span className="font-bold text-muted-foreground tabular-nums">
                {stock !== undefined ? `${createReserved} PCS` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Complete MOQs Available:</span>
              <span className="font-black text-primary tabular-nums">
                {stock !== undefined && moq && moq > 0 ? createCompleteMoqs.toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* EDIT MODE: Compact Stock Metrics & Editable MOQ                           */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Calculated Summary */}
          <div className="bg-secondary/40 border border-border/70 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">On Hand Stock:</span>
              <span className="font-bold text-foreground tabular-nums">
                {editOnHand.toLocaleString()} PCS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Reserved Stock:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {editReserved.toLocaleString()} PCS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Available Stock:</span>
              <span className="font-bold text-foreground tabular-nums">
                {editAvailable.toLocaleString()} PCS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Complete MOQs Available:</span>
              <span className="font-black text-primary tabular-nums">
                {editCompleteMoqs.toLocaleString()}
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
                value={moq !== undefined && moq > 0 ? moq : ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  onMoqChange(val !== undefined && !isNaN(val) ? Math.max(1, val) : undefined);
                }}
                placeholder=""
                className={`w-full h-10 px-3.5 pr-12 rounded-xl border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 transition-colors ${
                  errors.moq
                    ? "border-red-500 focus:ring-red-500/30"
                    : "border-border focus:ring-ring/40"
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                PCS
              </span>
            </div>
            {errors.moq && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.moq}
              </p>
            )}
          </div>

          {/* Warehouse Breakdown (if available) */}
          {warehouseBreakdown && warehouseBreakdown.length > 0 && (
            <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
              <div className="px-4 py-2 bg-secondary/40 border-b border-border/60 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Warehouse Stock Distribution
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {warehouseBreakdown.length} Location{warehouseBreakdown.length !== 1 ? "s" : ""}
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
                        <td className="px-4 py-2 font-semibold text-foreground">
                          {wh.warehouse_name}
                        </td>
                        <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                          {wh.warehouse_code}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-foreground">
                          {wh.on_hand_quantity.toLocaleString()} pcs
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">
                          {wh.reserved_quantity.toLocaleString()} pcs
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-bold text-foreground">
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
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-900 dark:text-amber-200">
                To adjust physical warehouse stock, use audited Inventory Adjustments.
              </p>
            </div>
            <Link
              href="/admin/inventory"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <ExternalLink size={11} />
              Adjust Stock
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
