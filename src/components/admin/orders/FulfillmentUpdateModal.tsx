import React, { useState, useEffect } from "react";
import { OrderRecord } from "@/services/order.service";
import { Truck, X } from "lucide-react";

export interface FulfillmentUpdateModalProps {
  isOpen: boolean;
  order: OrderRecord;
  onClose: () => void;
  onSave: (data: {
    fulfillment_status: string;
    carrier?: string;
    tracking_number?: string;
    note?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function FulfillmentUpdateModal({
  isOpen,
  order,
  onClose,
  onSave,
  isLoading = false,
}: FulfillmentUpdateModalProps) {
  const [fulfillmentStatus, setFulfillmentStatus] = useState("unfulfilled");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen && order) {
      setFulfillmentStatus(order.fulfillment_status || "unfulfilled");
      setCarrier(order.carrier || "");
      setTrackingNumber(order.tracking_number || "");
      setNote("");
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      fulfillment_status: fulfillmentStatus,
      carrier: carrier.trim() || undefined,
      tracking_number: trackingNumber.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fulfillment-modal-title"
    >
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-primary" />
            <h3
              id="fulfillment-modal-title"
              className="font-bold text-base uppercase tracking-tight text-foreground"
            >
              Update Fulfillment Details
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Fulfillment Status *
            </label>
            <select
              value={fulfillmentStatus}
              onChange={(e) => setFulfillmentStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground font-bold focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="unfulfilled">Unfulfilled</option>
              <option value="partial">Partial</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Carrier / Shipping Forwarder
            </label>
            <input
              type="text"
              placeholder="e.g. Aramex, DHL, FedEx, Maersk..."
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Tracking / AWB Number
            </label>
            <input
              type="text"
              placeholder="e.g. AWB-3928109283"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Internal Dispatch Note
            </label>
            <textarea
              rows={2}
              placeholder="Optional notes regarding dispatch, packaging, or handover..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
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
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              {isLoading ? "Saving..." : "Update Shipment Info"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
