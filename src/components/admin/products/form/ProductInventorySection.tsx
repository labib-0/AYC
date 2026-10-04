"use client";

import { useState, useEffect } from "react";
import {
  Warehouse as WarehouseIcon,
  AlertCircle,
  Building2,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  Lock,
  X,
  Plus,
} from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import {
  adminInventoryService,
  Warehouse,
  InventoryAdjustmentResult,
} from "@/services/admin/inventory.service";
import { handleNumberInputWheel } from "@/components/common/GlobalNumberInputWheelGuard";

export interface WarehouseStockItem {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  on_hand_quantity: number;
  available_quantity: number;
  inventory_id?: number;
}

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
  availableStock?: number;
  warehouseBreakdown?: WarehouseStockItem[];
  productId?: string | number;
  productName?: string;
  productSku?: string;
  variants?: Array<{
    id?: string | number;
    sku?: string;
    title?: string;
    color?: string;
    size?: string;
    stock?: number;
  }>;
  onStockAdjusted?: (newStockData: {
    stock: number;
    onHandStock: number;
    availableStock: number;
    availableMoqs: number;
    warehouseBreakdown: WarehouseStockItem[];
  }) => void;
}

const COMMON_REASONS = [
  "New Stock Received",
  "Factory Shipment Arrival",
  "Physical Audit Correction",
  "Damaged Goods Write-off",
  "Customer Return Restock",
  "Sample Distribution",
];

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
  availableStock,
  warehouseBreakdown,
  productId,
  productName,
  productSku,
  variants = [],
  onStockAdjusted,
}: ProductInventorySectionProps) {
  const { can, isSuperAdmin } = useAdminAuth();
  const canAdjust = isSuperAdmin || can("inventory.adjust");

  // Reference warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseFetchError, setWarehouseFetchError] = useState<string | null>(null);

  // Local state for authoritative edit metrics to allow instant refresh after adjustments
  const [localOnHand, setLocalOnHand] = useState<number | undefined>(onHandStock);
  const [localAvailable, setLocalAvailable] = useState<number | undefined>(availableStock);
  const [localBreakdown, setLocalBreakdown] = useState<WarehouseStockItem[] | undefined>(warehouseBreakdown);

  // Sync props when initial data loads or changes
  useEffect(() => {
    setLocalOnHand(onHandStock);
  }, [onHandStock]);

  useEffect(() => {
    setLocalAvailable(availableStock);
  }, [availableStock]);

  useEffect(() => {
    setLocalBreakdown(warehouseBreakdown);
  }, [warehouseBreakdown]);

  // Modal State for stock adjustments
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetWarehouseId, setAdjustTargetWarehouseId] = useState<string>("");
  const [adjustTargetVariantId, setAdjustTargetVariantId] = useState<string>("");
  const [adjustInventoryId, setAdjustInventoryId] = useState<number | undefined>(undefined);
  const [adjustMode, setAdjustMode] = useState<"set" | "delta">("delta");
  const [targetQuantity, setTargetQuantity] = useState<string>("0");
  const [deltaQuantity, setDeltaQuantity] = useState<string>("0");
  const [deltaSign, setDeltaSign] = useState<"+" | "-">("+");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState<boolean>(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [adjustmentSuccessMsg, setAdjustmentSuccessMsg] = useState<string | null>(null);

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
  const createAvailable = initialStockQty;
  const createCompleteMoqs = Math.floor(createAvailable / effectiveMoq);

  // Edit Mode Metrics
  const editOnHand = localOnHand !== undefined ? Number(localOnHand) : initialStockQty;
  const editAvailable = localAvailable !== undefined ? Number(localAvailable) : editOnHand;
  const editCompleteMoqs = Math.floor(editAvailable / effectiveMoq);

  // Open adjustment modal handler
  const handleOpenAdjustModal = (targetWarehouse?: WarehouseStockItem) => {
    setAdjustmentError(null);
    setAdjustmentSuccessMsg(null);
    setAdjustMode("delta");
    setDeltaQuantity("");
    setDeltaSign("+");
    setReason("");
    setNotes("");
    setAdjustTargetVariantId("");

    if (targetWarehouse) {
      setAdjustTargetWarehouseId(String(targetWarehouse.warehouse_id));
      setAdjustInventoryId(targetWarehouse.inventory_id);
      setTargetQuantity(String(targetWarehouse.available_quantity));
    } else if (localBreakdown && localBreakdown.length > 0) {
      setAdjustTargetWarehouseId(String(localBreakdown[0].warehouse_id));
      setAdjustInventoryId(localBreakdown[0].inventory_id);
      setTargetQuantity(String(localBreakdown[0].available_quantity));
    } else if (warehouses.length > 0) {
      setAdjustTargetWarehouseId(String(warehouses[0].id));
      setAdjustInventoryId(undefined);
      setTargetQuantity(String(editAvailable));
    } else {
      setAdjustTargetWarehouseId("");
      setAdjustInventoryId(undefined);
      setTargetQuantity(String(editAvailable));
    }

    setIsAdjustModalOpen(true);
  };

  // Determine current stock of the currently selected target in modal
  const resolveModalTargetCurrentStock = (): number => {
    // If a variant is selected
    if (adjustTargetVariantId) {
      const v = variants.find((item) => String(item.id) === String(adjustTargetVariantId));
      if (v && v.stock !== undefined) return Number(v.stock);
    }

    // If a warehouse is selected
    if (adjustTargetWarehouseId) {
      if (localBreakdown && localBreakdown.length > 0) {
        const wh = localBreakdown.find((item) => String(item.warehouse_id) === String(adjustTargetWarehouseId));
        return wh ? Number(wh.available_quantity) : 0;
      }
    }

    return editAvailable;
  };

  const modalCurrentStock = resolveModalTargetCurrentStock();

  // Calculate projected new quantity for live preview
  let projectedQuantity = modalCurrentStock;
  if (adjustMode === "set") {
    const parsed = parseInt(targetQuantity, 10);
    projectedQuantity = isNaN(parsed) ? 0 : parsed;
  } else {
    const rawDelta = parseInt(deltaQuantity, 10);
    const validDelta = isNaN(rawDelta) ? 0 : Math.abs(rawDelta);
    projectedQuantity = deltaSign === "+" ? modalCurrentStock + validDelta : modalCurrentStock - validDelta;
  }

  const isInvalidNegative = projectedQuantity < 0;

  // Granular validation checks for button & submission
  const parsedDelta = parseInt(deltaQuantity, 10);
  const isDeltaValid = !isNaN(parsedDelta) && parsedDelta > 0;
  const parsedTarget = parseInt(targetQuantity, 10);
  const isTargetValid = !isNaN(parsedTarget) && parsedTarget >= 0;
  const isQuantityValid = adjustMode === "delta" ? isDeltaValid : isTargetValid;
  const hasValidWarehouse = Boolean(adjustTargetWarehouseId);
  const hasValidReason = Boolean(reason.trim());
  const isAdjustmentFormValid = hasValidWarehouse && hasValidReason && isQuantityValid && !isInvalidNegative;

  // Handle Adjustment Submit
  const handleConfirmAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adjustTargetWarehouseId) {
      setAdjustmentError("Please select a target warehouse.");
      return;
    }

    if (adjustMode === "delta") {
      const rawDelta = parseInt(deltaQuantity, 10);
      if (isNaN(rawDelta) || rawDelta <= 0) {
        setAdjustmentError("Please enter a valid adjustment quantity greater than 0.");
        return;
      }
    } else {
      const newQty = parseInt(targetQuantity, 10);
      if (isNaN(newQty) || newQty < 0) {
        setAdjustmentError("New target quantity must be a non-negative integer (0 or more).");
        return;
      }
    }

    if (!reason.trim()) {
      setAdjustmentError("Please select or enter a reason for this inventory adjustment.");
      return;
    }

    if (isInvalidNegative) {
      setAdjustmentError("Adjustment would result in negative stock. Please enter a valid quantity.");
      return;
    }

    setIsSubmittingAdjustment(true);
    setAdjustmentError(null);

    try {
      const whId = adjustTargetWarehouseId ? parseInt(adjustTargetWarehouseId, 10) : undefined;
      const vId = adjustTargetVariantId ? parseInt(adjustTargetVariantId, 10) : undefined;
      const pId = productId ? (typeof productId === "number" ? productId : parseInt(String(productId), 10) || productId) : undefined;

      const payload: any = {
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      };

      // Prioritize variant ID when explicitly adjusting variant inventory
      if (vId) {
        payload.variant_id = vId;
        if (whId) payload.warehouse_id = whId;
      } else if (adjustInventoryId) {
        payload.inventory_id = adjustInventoryId;
        if (whId) payload.warehouse_id = whId;
      } else if (pId) {
        payload.product_id = pId;
        if (whId) payload.warehouse_id = whId;
      } else if (whId) {
        payload.warehouse_id = whId;
      }

      if (adjustMode === "set") {
        const newQty = parseInt(targetQuantity, 10);
        if (isNaN(newQty) || newQty < 0) {
          throw new Error("Target quantity must be a non-negative integer.");
        }
        payload.new_quantity = newQty;
      } else {
        const rawDelta = parseInt(deltaQuantity, 10);
        const absDelta = isNaN(rawDelta) ? 0 : Math.abs(rawDelta);
        const signedDelta = deltaSign === "+" ? absDelta : -absDelta;
        if (signedDelta === 0) {
          throw new Error("Adjustment delta cannot be zero.");
        }
        payload.adjustment_amount = signedDelta;
      }

      const result: InventoryAdjustmentResult | null = await adminInventoryService.adjustInventory(payload);

      if (result) {
        // Authoritative values returned by backend
        const newStock = result.product_stock ?? projectedQuantity;
        const newOnHand = result.on_hand_stock ?? newStock;
        const newAvailable = result.available_stock ?? newOnHand;
        const newMoqs = result.available_moqs ?? Math.floor(newAvailable / effectiveMoq);
        const newBreakdown = (result.warehouse_breakdown as WarehouseStockItem[]) || localBreakdown || [];

        // Update local state immediately
        setLocalOnHand(newOnHand);
        setLocalAvailable(newAvailable);
        setLocalBreakdown(newBreakdown);
        onStockChange(newStock);

        // Notify parent form
        if (onStockAdjusted) {
          onStockAdjusted({
            stock: newStock,
            onHandStock: newOnHand,
            availableStock: newAvailable,
            availableMoqs: newMoqs,
            warehouseBreakdown: newBreakdown,
          });
        }

        setAdjustmentSuccessMsg(
          `Inventory adjusted successfully! Updated available stock: ${newAvailable.toLocaleString()} PCS.`
        );
        setIsAdjustModalOpen(false);
      } else {
        throw new Error("No response received from inventory service.");
      }
    } catch (err: unknown) {
      setAdjustmentError((err as Error)?.message || "Failed to adjust inventory. Please verify input and retry.");
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  return (
    <div className="bg-card border border-border/70 rounded-xl p-3 sm:p-4 space-y-2.5 shadow-2xs">
      {/* Header */}
      <div className="border-b border-border/50 pb-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <WarehouseIcon size={13} />
          </div>
          <h2 className="text-xs font-bold text-foreground tracking-wider uppercase">
            INVENTORY
          </h2>
        </div>

        {/* Existing Product: Visible Working Adjust Stock Action */}
        {isEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="admin-product-adjust-stock-btn"
              onClick={() => handleOpenAdjustModal()}
              disabled={!canAdjust}
              title={!canAdjust ? "Requires 'inventory.adjust' permission" : "Record audited inventory stock adjustment"}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
            >
              {!canAdjust ? (
                <>
                  <Lock size={11} className="text-amber-200" />
                  <span>Adjust Stock (Locked)</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={11} />
                  <span>Adjust Stock</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {adjustmentSuccessMsg && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-medium">{adjustmentSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setAdjustmentSuccessMsg(null)}
            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {!isEdit ? (
        /* ========================================================================= */
        /* ADD PRODUCT: Compact 3-Column Inputs + Compact Calculated Summary          */
        /* ========================================================================= */
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
            {/* 1. Initial Stock Units */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                INITIAL STOCK UNITS <span className="text-red-500">*</span>
                <span className="sr-only">Initial Stock Units</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stock !== undefined ? stock : ""}
                  onWheel={handleNumberInputWheel}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    onStockChange(val !== undefined && !isNaN(val) ? Math.max(0, val) : undefined);
                  }}
                  placeholder="0"
                  className={`w-full h-8.5 sm:h-9 px-3 pr-11 rounded-lg border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-1 transition-colors ${
                    errors.stock || errors.initial_stock
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-border focus:ring-ring/40"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pointer-events-none">
                  PCS
                </span>
              </div>
              {(errors.stock || errors.initial_stock) && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={11} />
                  {errors.stock || errors.initial_stock}
                </p>
              )}
            </div>

            {/* 2. MOQ */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                MOQ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={moq !== undefined && moq > 0 ? moq : ""}
                  onWheel={handleNumberInputWheel}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    onMoqChange(val !== undefined && !isNaN(val) ? Math.max(1, val) : undefined);
                  }}
                  placeholder="0"
                  className={`w-full h-8.5 sm:h-9 px-3 pr-11 rounded-lg border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-1 transition-colors ${
                    errors.moq
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-border focus:ring-ring/40"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pointer-events-none">
                  PCS
                </span>
              </div>
              {errors.moq && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={11} />
                  {errors.moq}
                </p>
              )}
            </div>

            {/* 3. Initial Warehouse */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                INITIAL WAREHOUSE <span className="text-red-500">*</span>
                <span className="sr-only">Initial Warehouse</span>
              </label>
              <div className="relative">
                <select
                  value={warehouseId ? String(warehouseId) : ""}
                  onChange={(e) => onWarehouseChange(e.target.value)}
                  disabled={loadingWarehouses}
                  className={`w-full h-8.5 sm:h-9 px-3 pr-8 rounded-lg border bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 transition-colors appearance-none cursor-pointer ${
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
                  <AlertCircle size={11} />
                  {errors.warehouse_id}
                </p>
              )}
            </div>
          </div>

          {warehouseFetchError && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle size={12} className="shrink-0" />
              <span>{warehouseFetchError} Please choose an active warehouse before publishing.</span>
            </div>
          )}

          {/* Compact Calculated Summary */}
          <div className="bg-secondary/30 border border-border/60 rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">On Hand Stock:</span>
              <span className="font-bold text-foreground tabular-nums">
                {stock !== undefined ? `${initialStockQty.toLocaleString()} PCS` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Available Stock:</span>
              <span className="font-bold text-foreground tabular-nums">
                {stock !== undefined ? `${createAvailable.toLocaleString()} PCS` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Complete MOQs Available:</span>
              <span className="font-black text-primary tabular-nums">
                {stock !== undefined && moq && moq > 0 ? createCompleteMoqs.toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* EDIT PRODUCT: Compact Summary Bar, Product MOQ, Warehouse Distribution    */
        /* ========================================================================= */
        <div className="space-y-2.5">
          {/* Authoritative Horizontal Stock Metrics Summary Bar */}
          <div className="bg-secondary/30 border border-border/60 rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">
                On Hand<span className="hidden sm:inline"> Stock</span>:
              </span>
              <span className="font-bold text-foreground tabular-nums">
                {editOnHand.toLocaleString()} PCS
              </span>
              <span className="sr-only">On Hand Stock</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">
                Available<span className="hidden sm:inline"> Stock</span>:
              </span>
              <span className="font-bold text-foreground tabular-nums">
                {editAvailable.toLocaleString()} PCS
              </span>
              <span className="sr-only">Available Stock</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">
                Complete MOQs<span className="hidden sm:inline"> Available</span>:
              </span>
              <span className="font-black text-primary tabular-nums">
                {editCompleteMoqs.toLocaleString()}
              </span>
              <span className="sr-only">Complete MOQs Available</span>
            </div>
          </div>

          {/* Product MOQ (Minimum Order) */}
          <div className="max-w-xs space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              PRODUCT MOQ (MINIMUM ORDER) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={moq !== undefined && moq > 0 ? moq : ""}
                onWheel={handleNumberInputWheel}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  onMoqChange(val !== undefined && !isNaN(val) ? Math.max(1, val) : undefined);
                }}
                placeholder="1"
                className={`w-full h-8 sm:h-8.5 px-3 pr-11 rounded-lg border bg-card text-xs font-semibold text-foreground tabular-nums focus:outline-none focus:ring-1 transition-colors ${
                  errors.moq
                    ? "border-red-500 focus:ring-red-500/30"
                    : "border-border focus:ring-ring/40"
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pointer-events-none">
                PCS
              </span>
            </div>
            {errors.moq && (
              <p className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
                <AlertCircle size={11} />
                {errors.moq}
              </p>
            )}
          </div>

          {/* Warehouse Stock Distribution (Compact Table) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                Warehouse Distribution
                <span className="sr-only">Warehouse Stock Distribution</span>
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {localBreakdown && localBreakdown.length > 0
                  ? `${localBreakdown.length} ${localBreakdown.length === 1 ? "Warehouse" : "Warehouses"}`
                  : "0 Registered Warehouses"}
              </span>
            </div>

            <div className="border border-border/70 rounded-lg overflow-hidden bg-card">
              {localBreakdown && localBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                      <tr>
                        <th className="px-3 py-1.5 font-bold">Warehouse</th>
                        <th className="px-3 py-1.5 font-bold">Code</th>
                        <th className="px-3 py-1.5 text-right font-bold">On Hand</th>
                        <th className="px-3 py-1.5 text-right font-bold text-foreground">Available</th>
                        <th className="px-3 py-1.5 text-right font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {localBreakdown.map((wh) => (
                        <tr key={wh.warehouse_id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-3 py-1.5 font-medium text-foreground">
                            {wh.warehouse_name}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
                            {wh.warehouse_code}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-foreground">
                            {wh.on_hand_quantity.toLocaleString()} PCS
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-bold text-foreground">
                            {wh.available_quantity.toLocaleString()} PCS
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(wh)}
                              disabled={!canAdjust}
                              title={!canAdjust ? "Requires 'inventory.adjust' permission" : `Adjust stock at ${wh.warehouse_name}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-card hover:bg-secondary text-foreground text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                            >
                              <SlidersHorizontal size={9} />
                              <span>Adjust</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center space-y-1">
                  <p className="text-xs text-muted-foreground">
                    No warehouse inventory records currently registered for this product.
                  </p>
                  {canAdjust && (
                    <button
                      type="button"
                      onClick={() => handleOpenAdjustModal()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus size={11} />
                      <span>Initialize Warehouse Stock</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-PAGE STOCK ADJUSTMENT MODAL (Authoritative Audited Inventory Workflow) */}
      {/* ========================================================================= */}
      {isAdjustModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-edit-stock-adjust-title"
        >
          <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-2xl space-y-3.5 my-6 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-2 border-b border-border/60">
              <div>
                <h3
                  id="product-edit-stock-adjust-title"
                  className="font-display font-bold text-base uppercase tracking-tight text-foreground"
                >
                  Adjust Product Stock
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Record auditable inventory adjustment using authoritative warehouse services.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                disabled={isSubmittingAdjustment}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {adjustmentError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{adjustmentError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAdjustment} noValidate className="space-y-3 text-xs">
              {/* Product Info Summary */}
              <div className="p-2.5 rounded-xl border border-border/70 bg-secondary/20 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground text-xs truncate">
                    {productName || "—"}
                  </h4>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    SKU: {productSku || "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                    Current Available
                  </span>
                  <span className="text-lg font-display font-bold text-foreground tabular-nums">
                    {modalCurrentStock.toLocaleString()} PCS
                  </span>
                </div>
              </div>

              {/* Warehouse Target Selector */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Target Warehouse *
                </label>
                <select
                  value={adjustTargetWarehouseId}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    setAdjustTargetWarehouseId(chosenId);
                    if (!adjustTargetVariantId) {
                      const found = localBreakdown?.find((item) => String(item.warehouse_id) === chosenId);
                      setAdjustInventoryId(found?.inventory_id);
                      if (found) {
                        setTargetQuantity(String(found.available_quantity));
                      } else {
                        setTargetQuantity("0");
                      }
                    }
                  }}
                  disabled={isSubmittingAdjustment || warehouses.length === 0}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary/20 text-foreground focus:ring-1 focus:ring-primary outline-none"
                >
                  {warehouses.length === 0 ? (
                    <option value="">No active warehouses configured</option>
                  ) : (
                    warehouses.map((wh) => (
                      <option key={wh.id} value={String(wh.id)}>
                        {wh.name} ({wh.code}) {wh.city ? `— ${wh.city}` : ""}
                      </option>
                    ))
                  )}
                </select>
                {!hasValidWarehouse && (
                  <p className="text-[10px] text-amber-500 font-medium">Please select a target warehouse.</p>
                )}
              </div>

              {/* Variant Target Selector (if product has variants) */}
              {variants.length > 0 && (
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Target Variant (Optional)
                  </label>
                  <select
                    value={adjustTargetVariantId}
                    onChange={(e) => {
                      const chosenVariant = e.target.value;
                      setAdjustTargetVariantId(chosenVariant);
                      if (chosenVariant) {
                        setAdjustInventoryId(undefined);
                      }
                      const found = variants.find((v) => String(v.id) === chosenVariant);
                      if (found && found.stock !== undefined) {
                        setTargetQuantity(String(found.stock));
                      }
                    }}
                    disabled={isSubmittingAdjustment}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary/20 text-foreground focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">All / Product Level Inventory</option>
                    {variants.map((v) => (
                      <option key={v.id || v.sku} value={String(v.id || "")}>
                        {v.title || `${v.color || "Standard"} / ${v.size || "Standard"}`} (Stock: {v.stock ?? 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Adjustment Mode Selector */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-secondary/30 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setAdjustMode("delta")}
                    disabled={isSubmittingAdjustment}
                    className={`py-1 px-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      adjustMode === "delta"
                        ? "bg-foreground text-background shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Add / Subtract Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustMode("set");
                      setTargetQuantity(String(modalCurrentStock));
                    }}
                    disabled={isSubmittingAdjustment}
                    className={`py-1 px-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      adjustMode === "set"
                        ? "bg-foreground text-background shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Set Absolute Qty
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              {adjustMode === "delta" ? (
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Stock Quantity Delta *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex p-0.5 bg-secondary/30 rounded-lg border border-border/60">
                      <button
                        type="button"
                        onClick={() => setDeltaSign("+")}
                        disabled={isSubmittingAdjustment}
                        className={`px-2.5 py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
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
                        onClick={() => setDeltaSign("-")}
                        disabled={isSubmittingAdjustment}
                        className={`px-2.5 py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
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
                      min={1}
                      placeholder="e.g. 50"
                      value={deltaQuantity}
                      onWheel={handleNumberInputWheel}
                      onChange={(e) => setDeltaQuantity(e.target.value)}
                      disabled={isSubmittingAdjustment}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-secondary/20 text-foreground font-display font-bold text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  {!isDeltaValid && (
                    <p className="text-[10px] text-amber-500 font-medium">Please enter a valid quantity of 1 or more.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    New Target Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={targetQuantity}
                    onWheel={handleNumberInputWheel}
                    onChange={(e) => setTargetQuantity(e.target.value)}
                    disabled={isSubmittingAdjustment}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-secondary/20 text-foreground font-display font-bold text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                  {!isTargetValid && (
                    <p className="text-[10px] text-amber-500 font-medium">Please enter a non-negative quantity (0 or more).</p>
                  )}
                </div>
              )}

              {/* Live Preview Box */}
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                  isInvalidNegative
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    : "bg-secondary/30 border-border/70 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Previous:</span>
                  <span className="font-bold tabular-nums">{modalCurrentStock.toLocaleString()}</span>
                  <ArrowRight size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">New Stock:</span>
                  <span className="font-display font-bold text-xs sm:text-sm tabular-nums">
                    {projectedQuantity.toLocaleString()}
                  </span>
                </div>

                {isInvalidNegative && (
                  <span className="font-bold uppercase tracking-wider text-[9px]">
                    Invalid Negative Result
                  </span>
                )}
              </div>

              {/* Reason Selection */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Reason for Adjustment *
                </label>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {COMMON_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      disabled={isSubmittingAdjustment}
                      className={`text-[9px] px-2 py-0.5 rounded-md font-semibold border transition-all cursor-pointer ${
                        reason === r
                          ? "bg-foreground text-background border-foreground shadow-2xs"
                          : "bg-secondary/20 border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Or enter custom reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmittingAdjustment}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary/20 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
                />
                {!hasValidReason && (
                  <p className="text-[10px] text-amber-500 font-medium">Reason for adjustment is required.</p>
                )}
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Received shipment with physical verification stamp."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmittingAdjustment}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary/20 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isSubmittingAdjustment}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment || !canAdjust || !isAdjustmentFormValid}
                  title={!canAdjust ? "Requires 'inventory.adjust' permission" : !isAdjustmentFormValid ? "Please complete all required fields" : undefined}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
                >
                  {isSubmittingAdjustment ? (
                    <>
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : !canAdjust ? (
                    <>
                      <Lock size={12} className="text-amber-300" />
                      <span>Adjustment Unauthorized</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} />
                      <span>Confirm Adjustment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
