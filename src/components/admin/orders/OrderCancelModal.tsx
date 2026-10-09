import React, { useState } from "react";
import { OrderRecord } from "@/services/order.service";
import { AlertTriangle, X, ShieldAlert } from "lucide-react";

export interface OrderCancelModalProps {
  isOpen: boolean;
  order: OrderRecord;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export default function OrderCancelModal({
  isOpen,
  order,
  onClose,
  onConfirm,
  isLoading = false,
}: OrderCancelModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await onConfirm(reason.trim());
    setReason("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="bg-card border border-destructive/30 rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 text-destructive font-bold uppercase tracking-wider text-sm">
            <ShieldAlert size={18} />
            <span>Cancel Order #{order.order_number}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
          <div className="flex items-center gap-2 font-bold uppercase">
            <AlertTriangle size={15} className="shrink-0" />
            <span>Destructive Action</span>
          </div>
          <p className="leading-relaxed opacity-95 text-[11px]">
            Cancelling this order is permanent. If warehouse inventory was previously decremented upon payment confirmation, cancelling will automatically restore stock to the warehouse inventory.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="cancel-reason-input"
              className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Cancellation Justification <span className="text-destructive">*</span>
            </label>
            <textarea
              id="cancel-reason-input"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for administrative cancellation (required for system audit log)..."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-destructive outline-hidden resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold uppercase tracking-wider hover:bg-secondary transition-colors cursor-pointer"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
              id="btn-confirm-cancel-order"
            >
              {isLoading ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
