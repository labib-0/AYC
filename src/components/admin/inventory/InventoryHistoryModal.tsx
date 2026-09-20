import React from "react";
import { X, History, Clock, ArrowUpRight, ArrowDownRight, User, FileText } from "lucide-react";
import { InventoryRecord, InventoryAdjustment } from "@/services/admin/inventory.service";

export interface InventoryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItem: InventoryRecord | null;
}

export default function InventoryHistoryModal({
  isOpen,
  onClose,
  inventoryItem,
}: InventoryHistoryModalProps) {
  if (!isOpen || !inventoryItem) return null;

  const product = inventoryItem.variant?.product;
  const variant = inventoryItem.variant;
  const warehouse = inventoryItem.warehouse;
  const adjustments: InventoryAdjustment[] = inventoryItem.adjustments || [];

  // Sort descending by created_at (most recent first)
  const sortedAdjustments = [...adjustments].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 my-8 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <History size={18} />
            </div>
            <div>
              <h3
                id="history-modal-title"
                className="font-display font-bold text-lg uppercase tracking-tight text-foreground"
              >
                Stock Adjustment History
              </h3>
              <p className="text-xs text-muted-foreground">
                Verified audit trail of stock revisions and reasons.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Close history modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Reference Card */}
        <div className="p-3.5 rounded-2xl border border-border/70 bg-secondary/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                typeof product?.images?.[0] === "string"
                  ? product.images[0]
                  : (product?.images?.[0] as any)?.image_url || "/placeholder.jpg"
              }
              alt={product?.name || "Product"}
              className="w-12 h-14 object-cover rounded-lg bg-secondary shrink-0 border border-border/60"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-foreground text-xs truncate">
                {product?.name || "Catalog Product"}
              </h4>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                SKU: {variant?.sku || inventoryItem.id}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {warehouse?.name} ({warehouse?.code})
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
              Current Stock
            </span>
            <span className="text-xl font-display font-bold text-foreground tabular-nums">
              {inventoryItem.quantity.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Adjustments Timeline / List */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {sortedAdjustments.length === 0 ? (
            <div className="p-8 text-center border border-border/60 rounded-2xl bg-secondary/10">
              <Clock size={24} className="mx-auto text-muted-foreground mb-2" />
              <p className="font-bold text-xs text-foreground">
                No stock adjustments have been recorded.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Any future quantity adjustments will appear here with user, reason, and delta logging.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50 border border-border/70 rounded-2xl overflow-hidden bg-card">
              {sortedAdjustments.map((adj) => {
                const isPositive = adj.adjustment_amount > 0;
                const formattedDate = new Date(adj.created_at).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <div key={adj.id} className="p-3.5 hover:bg-secondary/20 transition-colors text-xs space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            isPositive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {isPositive ? (
                            <>
                              <ArrowUpRight size={13} />
                              <span>+{adj.adjustment_amount}</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight size={13} />
                              <span>{adj.adjustment_amount}</span>
                            </>
                          )}
                        </span>

                        <span className="font-bold text-foreground">
                          {adj.reason}
                        </span>
                      </div>

                      <span className="text-[11px] text-muted-foreground whitespace-nowrap font-medium">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Stock Progression & User */}
                    <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground pt-1">
                      <div className="flex items-center gap-2">
                        <span>
                          Previous: <strong className="text-foreground">{adj.previous_quantity}</strong>
                        </span>
                        <span>→</span>
                        <span>
                          Result: <strong className="text-foreground">{adj.resulting_quantity ?? (adj.previous_quantity + adj.adjustment_amount)}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <User size={12} className="text-muted-foreground" />
                        <span>Admin ({adj.admin_user?.name || (adj as any).user?.name || "Ayaan Admin"})</span>
                      </div>
                    </div>

                    {/* Notes if available */}
                    {adj.notes && (
                      <div className="p-2 rounded-lg bg-secondary/30 text-[11px] text-muted-foreground flex items-start gap-1.5 border border-border/50">
                        <FileText size={12} className="shrink-0 mt-0.5" />
                        <span>{adj.notes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
