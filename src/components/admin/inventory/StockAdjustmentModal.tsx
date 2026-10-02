import React, { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import {
  adminInventoryService,
  InventoryRecord,
  getInventoryProduct,
  getInventorySku,
  getInventoryImageUrl,
} from "@/services/admin/inventory.service";

export interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItem: InventoryRecord | null;
  allItems: InventoryRecord[];
  onSuccess: (message: string) => void;
}

const COMMON_REASONS = [
  "New Stock Received",
  "Factory Shipment Arrival",
  "Damaged Goods Write-off",
  "Physical Audit Correction",
  "Customer Return Restock",
  "Order Cancellation Return",
  "Sample Distribution",
];

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  inventoryItem,
  allItems,
  onSuccess,
}: StockAdjustmentModalProps) {
  const { can, isSuperAdmin } = useAdminAuth();
  const canAdjust = isSuperAdmin || can("inventory.adjust");
  // If no specific item was passed (global button), allow user to pick one
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [mode, setMode] = useState<"set" | "delta">("delta");
  const [targetQuantity, setTargetQuantity] = useState<string>("0");
  const [deltaQuantity, setDeltaQuantity] = useState<string>("0");
  const [deltaSign, setDeltaSign] = useState<"+" | "-">("+");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize state when modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      if (inventoryItem) {
        setSelectedItemId(String(inventoryItem.id));
        setTargetQuantity(String(inventoryItem.quantity));
      } else if (allItems.length > 0) {
        setSelectedItemId(String(allItems[0].id));
        setTargetQuantity(String(allItems[0].quantity));
      }
      setMode("delta");
      setDeltaQuantity("0");
      setDeltaSign("+");
      setReason("");
      setNotes("");
      setErrorMessage(null);
    }
  }, [isOpen, inventoryItem, allItems]);

  if (!isOpen) return null;

  // Active item to adjust
  const activeRecord =
    inventoryItem ||
    allItems.find((item) => String(item.id) === selectedItemId) ||
    allItems[0];

  const currentQuantity = activeRecord ? activeRecord.quantity : 0;

  // Calculate projected new quantity
  let projectedQuantity = currentQuantity;
  if (mode === "set") {
    const parsed = parseInt(targetQuantity, 10);
    projectedQuantity = isNaN(parsed) ? 0 : parsed;
  } else {
    const rawDelta = parseInt(deltaQuantity, 10);
    const validDelta = isNaN(rawDelta) ? 0 : Math.abs(rawDelta);
    projectedQuantity =
      deltaSign === "+"
        ? currentQuantity + validDelta
        : currentQuantity - validDelta;
  }

  const isInvalidNegative = projectedQuantity < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) {
      setErrorMessage("No inventory item selected.");
      return;
    }

    if (!reason.trim()) {
      setErrorMessage("Please select or enter a reason for this adjustment.");
      return;
    }

    if (isInvalidNegative) {
      setErrorMessage("Adjustment would result in negative stock. Please enter a valid quantity.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === "set") {
        const newQty = parseInt(targetQuantity, 10);
        if (isNaN(newQty) || newQty < 0) {
          throw new Error("Target quantity must be a non-negative number.");
        }

        await adminInventoryService.adjustInventory({
          inventory_id: activeRecord.id,
          new_quantity: newQty,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        });

        onSuccess(
          `Stock set to ${newQty.toLocaleString()} units for ${activeRecord.variant?.sku || "item"}.`
        );
      } else {
        const rawDelta = parseInt(deltaQuantity, 10);
        const absDelta = isNaN(rawDelta) ? 0 : Math.abs(rawDelta);
        const signedDelta = deltaSign === "+" ? absDelta : -absDelta;

        if (signedDelta === 0) {
          throw new Error("Adjustment delta cannot be zero.");
        }

        await adminInventoryService.adjustInventory({
          inventory_id: activeRecord.id,
          adjustment_amount: signedDelta,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        });

        const signPrefix = signedDelta > 0 ? `+${signedDelta}` : `${signedDelta}`;
        onSuccess(
          `Stock adjusted (${signPrefix} units) for ${activeRecord.variant?.sku || "item"}.`
        );
      }

      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Failed to adjust stock. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const product = getInventoryProduct(activeRecord);
  const variant = activeRecord?.variant;
  const warehouse = activeRecord?.warehouse;
  const sku = getInventorySku(activeRecord);
  const imageUrl = getInventoryImageUrl(activeRecord);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjust-title"
    >
      <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 my-8 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border/60">
          <div>
            <h3
              id="stock-adjust-title"
              className="font-display font-bold text-lg uppercase tracking-tight text-foreground"
            >
              Adjust Inventory Stock
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record auditable quantity changes with verified reason tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Item Selector (shown if opened globally) */}
          {!inventoryItem && (
            <div className="space-y-1.5">
              <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                Select Product / Variant *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  const selected = allItems.find(
                    (item) => String(item.id) === e.target.value
                  );
                  if (selected) {
                    setTargetQuantity(String(selected.quantity));
                  }
                }}
                disabled={isSubmitting || allItems.length === 0}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                {allItems.length === 0 ? (
                  <option value="">No inventory items in database</option>
                ) : (
                  allItems.map((item) => {
                    const itemProduct = getInventoryProduct(item);
                    const itemSku = getInventorySku(item);
                    return (
                      <option key={item.id} value={String(item.id)}>
                        {itemProduct?.name || "Product"} — {itemSku} (
                        {item.warehouse?.name || "Uttara"}, Stock: {item.quantity})
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          )}

          {/* Item Summary Card */}
          {activeRecord && (
            <div className="p-3.5 rounded-2xl border border-border/70 bg-secondary/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={product?.name || "Product"}
                  className="w-12 aspect-[3/4] object-contain p-0.5 rounded-lg bg-secondary/60 shrink-0 border border-border/60"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg";
                  }}
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground text-xs truncate">
                    {product?.name || "—"}
                  </h4>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    SKU: {sku}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {warehouse?.name || "Uttara"} ({warehouse?.code || "WH-UTT-01"})
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                  Current Stock
                </span>
                <span className="text-xl font-display font-bold text-foreground tabular-nums">
                  {currentQuantity.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Adjustment Mode Selector */}
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
              Adjustment Type *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/40 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setMode("delta")}
                disabled={isSubmitting}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  mode === "delta"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Add / Subtract Stock
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("set");
                  setTargetQuantity(String(currentQuantity));
                }}
                disabled={isSubmitting}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  mode === "set"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Set Absolute Qty
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          {mode === "delta" ? (
            <div className="space-y-1.5">
              <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                Stock Quantity Delta *
              </label>
              <div className="flex items-center gap-2">
                <div className="flex p-1 bg-secondary/40 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setDeltaSign("+")}
                    disabled={isSubmitting}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                      deltaSign === "+"
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Add units"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeltaSign("-")}
                    disabled={isSubmitting}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                      deltaSign === "-"
                        ? "bg-rose-500 text-white shadow-xs"
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
            className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
              isInvalidNegative
                ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                : "bg-secondary/40 border-border/70 text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Previous:</span>
              <span className="font-bold tabular-nums">{currentQuantity.toLocaleString()}</span>
              <ArrowRight size={13} className="text-muted-foreground" />
              <span className="text-muted-foreground font-medium">New Stock:</span>
              <span className="font-display font-bold text-sm tabular-nums">
                {projectedQuantity.toLocaleString()}
              </span>
            </div>

            {isInvalidNegative && (
              <span className="font-bold uppercase tracking-wider text-[10px]">
                Invalid Negative Result
              </span>
            )}
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                Reason for Adjustment *
              </label>
            </div>

            {/* Quick Chips */}
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
              required
              placeholder="Or enter custom reason..."
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
              placeholder="e.g. Received 120 units from Savar factory with QC inspection pass."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canAdjust || isInvalidNegative || !reason.trim() || !activeRecord}
              title={!canAdjust ? "Requires 'inventory.adjust' permission" : undefined}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : !canAdjust ? (
                <>
                  <Lock size={14} className="text-amber-300" />
                  <span>Adjustment Unauthorized</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Confirm Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
