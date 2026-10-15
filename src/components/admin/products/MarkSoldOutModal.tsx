"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, X, AlertTriangle } from "lucide-react";
import { B2BProductInput } from "@/types/b2b";

interface MarkSoldOutModalProps {
  open: boolean;
  product: B2BProductInput | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function MarkSoldOutModal({
  open,
  product,
  onConfirm,
  onCancel,
  loading = false,
}: MarkSoldOutModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState("Admin marked product as sold out");

  useEffect(() => {
    if (open) {
      setReason("Admin marked product as sold out");
      confirmRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onCancel, loading]);

  if (!open || !product) return null;

  const availableStock = product.availableStock !== undefined
    ? Number(product.availableStock)
    : Number(product.stock || 0);

  const identifier = product.productId || product.sku || (product as any).product_id || `#${product.id}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    onConfirm(reason.trim() || "Admin marked product as sold out");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sold-out-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] transition-opacity"
        onClick={loading ? undefined : onCancel}
      />

      {/* Modal Dialog */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
        <button
          onClick={loading ? undefined : onCancel}
          disabled={loading}
          className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
              <Ban size={20} className="text-amber-600 dark:text-amber-400" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 id="sold-out-modal-title" className="text-base font-bold text-foreground mb-1">
                Mark as Sold Out?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                This will immediately make the product unavailable for new purchases by setting its sellable stock to zero through the authoritative inventory service.
              </p>

              {/* Product Reference Card */}
              <div className="bg-secondary/70 border border-border/80 rounded-xl p-3 space-y-1.5 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-background border border-border/60">
                    {identifier}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Current Stock: <strong className="text-foreground">{availableStock.toLocaleString()} pcs</strong>
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground truncate" title={product.name}>
                  {product.name}
                </p>
              </div>

              {/* Information Notice */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed mb-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  The product remains published in the catalog with a <strong>Sold Out</strong> badge. Reversing this action later is done by adding stock via <strong>Adjust Stock</strong>.
                </span>
              </div>

              {/* Adjustment Reason */}
              <div className="space-y-1">
                <label htmlFor="sold-out-reason" className="block text-xs font-semibold text-foreground">
                  Audit Reason / Note:
                </label>
                <input
                  id="sold-out-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Admin marked product as sold out"
                  disabled={loading}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="submit"
              disabled={loading}
              id="btn-confirm-mark-sold-out"
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {loading && (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Confirm Sold Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
