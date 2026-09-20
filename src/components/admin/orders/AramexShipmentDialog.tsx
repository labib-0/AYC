import React from "react";
import { OrderRecord } from "@/services/order.service";
import { Send, X, AlertTriangle } from "lucide-react";

export interface AramexShipmentDialogProps {
  isOpen: boolean;
  order: OrderRecord;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export default function AramexShipmentDialog({
  isOpen,
  order,
  onClose,
  onConfirm,
  isLoading = false,
}: AramexShipmentDialogProps) {
  if (!isOpen) return null;

  const snapshot = order.shipping_snapshot;
  const totalPieces =
    snapshot?.package_quantity ||
    order.items?.reduce((s, i) => s + (i.quantity || 0), 0) ||
    0;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aramex-shipment-dialog-title"
    >
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-primary" />
            <h3
              id="aramex-shipment-dialog-title"
              className="font-bold text-base uppercase tracking-tight text-foreground"
            >
              Create Aramex Export Shipment
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Are you sure you want to generate the official Aramex export AWB and dispatch record for Order{" "}
            <strong className="text-foreground font-mono">#{order.order_number}</strong>?
          </p>

          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-bold uppercase">Consignee:</span>
              <span className="font-bold text-foreground">{order.shipping_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-bold uppercase">Destination:</span>
              <span className="font-bold text-foreground font-mono">
                {order.shipping_city}, {order.shipping_country_code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-bold uppercase">Packages:</span>
              <span className="font-mono text-foreground">
                {snapshot?.carton_count || 1} ctn ({totalPieces} pcs)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-bold uppercase">Gross Weight:</span>
              <span className="font-mono text-foreground">
                {snapshot?.gross_weight || 20} kg
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2 text-[11px]">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              This will assign a live tracking number and generate the official commercial shipping label.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-full border border-border text-xs font-bold uppercase tracking-wider hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              {isLoading ? "Dispatching..." : "Confirm Shipment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
