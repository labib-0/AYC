import React, { useState, useEffect } from "react";
import { OrderRecord } from "@/services/order.service";
import { Ship, X } from "lucide-react";

export interface OceanFreightQuoteModalProps {
  isOpen: boolean;
  order: OrderRecord;
  onClose: () => void;
  onSaveQuote: (data: {
    amount: number;
    quote_reference?: string;
    carrier?: string;
    valid_until?: string;
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function OceanFreightQuoteModal({
  isOpen,
  order,
  onClose,
  onSaveQuote,
  isLoading = false,
}: OceanFreightQuoteModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [quoteReference, setQuoteReference] = useState<string>("");
  const [carrier, setCarrier] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (isOpen && order) {
      setAmount(order.shipping_cost ? String(order.shipping_cost) : "");
      setQuoteReference(
        order.shipping_quote_id ||
          order.shipping_snapshot?.quote_reference_id ||
          `QT-SEA-${Date.now().toString().slice(-6)}`
      );
      setCarrier(order.carrier || order.shipping_snapshot?.carrier || "");
      setValidUntil(
        new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
      );
      setNotes(
        order.shipping_snapshot?.notes || "Ocean freight tariff confirmed."
      );
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    await onSaveQuote({
      amount: numAmount,
      quote_reference: quoteReference.trim() || undefined,
      carrier: carrier.trim() || undefined,
      valid_until: validUntil || undefined,
      notes: notes.trim() || undefined,
    });
  };

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
      aria-labelledby="sea-freight-quote-title"
    >
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Ship size={18} className="text-primary" />
            <h3
              id="sea-freight-quote-title"
              className="font-bold text-base uppercase tracking-tight text-foreground"
            >
              Ocean Freight Quotation
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
          {/* Packaging Snapshot Specs */}
          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 text-muted-foreground text-[11px] space-y-1">
            <div className="font-bold text-foreground">Authoritative Physical Packaging Specs:</div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
              <div>Pieces: <strong className="text-foreground">{totalPieces} pcs</strong></div>
              <div>Cartons: <strong className="text-foreground">{snapshot?.carton_count || 1} ctn</strong></div>
              <div>Volume: <strong className="text-foreground">{snapshot?.cbm || 0.072} CBM</strong></div>
              <div>Gross Wt: <strong className="text-foreground">{snapshot?.gross_weight || 20} kg</strong></div>
              <div>Net Wt: <strong className="text-foreground">{snapshot?.net_weight || 18} kg</strong></div>
              <div>Port: <strong className="text-foreground">{order.destination_port || "Destination Port"}</strong></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-muted-foreground mb-1 text-[11px]">
                Quoted Freight (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250.00"
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-mono font-bold focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-muted-foreground mb-1 text-[11px]">
                Quote / Booking Reference
              </label>
              <input
                type="text"
                value={quoteReference}
                onChange={(e) => setQuoteReference(e.target.value)}
                placeholder="QT-SEA-2026-001"
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-muted-foreground mb-1 text-[11px]">
                Carrier / Freight Line
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Ocean line / forwarder name..."
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-muted-foreground mb-1 text-[11px]">
                Quote Validity Date
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-muted-foreground mb-1 text-[11px]">
              Booking Notes &amp; Terms
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Container booking terms, port charges, etc..."
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
              {isLoading ? "Saving Quote..." : "Save Freight Quote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
