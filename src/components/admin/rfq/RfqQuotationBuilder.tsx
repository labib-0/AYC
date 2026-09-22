import React, { useState, useEffect } from "react";
import { RfqRecord, QuotationItem } from "@/types/b2b";
import { X, DollarSign, Package, Truck, AlertCircle } from "lucide-react";

export interface RfqQuotationBuilderProps {
  isOpen: boolean;
  rfq: RfqRecord;
  onClose: () => void;
  onSubmit: (quotationData: {
    items: QuotationItem[];
    subtotal: number;
    discountTotal: number;
    shippingFee: number;
    taxAmount: number;
    grandTotal: number;
    paymentTerms: string;
    shippingTerms: string;
    incoterm: "FOB" | "CIF" | "EXW" | "DDP" | "CFR";
    deliveryEstimate: string;
    validUntil: string;
    adminNotes: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function RfqQuotationBuilder({
  isOpen,
  rfq,
  onClose,
  onSubmit,
  isLoading = false,
}: RfqQuotationBuilderProps) {
  // Line items quoted prices
  const [prices, setPrices] = useState<{ [itemId: string]: number }>({});
  const [shippingFee, setShippingFee] = useState<number>(350);
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState(
    "30% Advance T/T, 70% against Bill of Lading (B/L) copy"
  );
  const [shippingTerms, setShippingTerms] = useState(
    rfq.shippingPort
      ? `FOB Chittagong Port to ${rfq.shippingPort}`
      : "FOB Chittagong Port"
  );
  const [incoterm, setIncoterm] = useState<"FOB" | "CIF" | "EXW" | "DDP" | "CFR">("FOB");
  const [deliveryEstimate, setDeliveryEstimate] = useState("14-18 working days from deposit");
  const [validUntil, setValidUntil] = useState(() =>
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Initialize line items prices from RFQ
  useEffect(() => {
    if (isOpen && rfq.items) {
      const initPrices: { [itemId: string]: number } = {};
      rfq.items.forEach((item) => {
        initPrices[item.id] = item.unitPrice || item.targetPrice || 15;
      });
      setPrices(initPrices);
      setError(null);
    }
  }, [isOpen, rfq]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Real-time calculations
  const lineItems: QuotationItem[] = (rfq.items || []).map((item) => {
    const unitPrice = Number(prices[item.id] ?? item.unitPrice ?? 15);
    const lineTotal = (item.quantity || 0) * unitPrice;
    return {
      id: `qi_${item.id}`,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      variantTitle: `${item.selectedColor || "Standard"} / ${item.selectedSize || "Standard"}`,
      quantity: item.quantity,
      unitPrice,
      discountAmount: 0,
      lineTotal,
    };
  });

  const subtotal = lineItems.reduce((acc, it) => acc + it.lineTotal, 0);
  const grandTotal = Math.max(0, subtotal - Number(discountTotal || 0) + Number(shippingFee || 0));

  const handlePriceChange = (itemId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setPrices((prev) => ({ ...prev, [itemId]: num }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      setError("RFQ contains no line items to quote.");
      return;
    }
    if (grandTotal <= 0) {
      setError("Grand total must be greater than zero.");
      return;
    }

    try {
      setError(null);
      await onSubmit({
        items: lineItems,
        subtotal,
        discountTotal: Number(discountTotal || 0),
        shippingFee: Number(shippingFee || 0),
        taxAmount: 0,
        grandTotal,
        paymentTerms,
        shippingTerms,
        incoterm,
        deliveryEstimate,
        validUntil,
        adminNotes,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to generate quotation.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quotation-builder-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col my-8 animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 id="quotation-builder-title" className="text-lg font-bold text-foreground flex items-center gap-2">
              <DollarSign size={20} className="text-primary" />
              <span>Commercial Quotation Builder</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate official export quotation for <strong className="text-foreground">{rfq.buyerName}</strong> ({rfq.companyName}) • Ref: {rfq.rfqNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
            className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Line Items Pricing Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package size={13} className="text-primary" />
              <span>1. Line Items Commercial Quoted Pricing</span>
            </h3>

            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Variant</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right w-32">Quoted Unit ($)</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rfq.items.map((it) => {
                    const priceVal = prices[it.id] ?? it.unitPrice ?? 15;
                    const lTot = (it.quantity || 0) * priceVal;

                    return (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-foreground block truncate max-w-[200px]">
                            {it.productName}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {it.sku}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-muted-foreground">
                          {it.selectedColor || "Standard"} / {it.selectedSize || "Standard"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium">
                          {it.quantity.toLocaleString()} pcs
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="relative inline-block w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={priceVal}
                              onChange={(e) => handlePriceChange(it.id, e.target.value)}
                              disabled={isLoading}
                              className="w-full pl-6 pr-2 py-1 text-xs text-right font-mono font-bold rounded-lg border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                          ${lTot.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Logistics & Commercial Terms */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Truck size={13} className="text-primary" />
              <span>2. Commercial Terms & Incoterms</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Incoterm */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                  Incoterm
                </label>
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value as "FOB" | "CIF" | "EXW" | "DDP" | "CFR")}
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="FOB">FOB — Free On Board</option>
                  <option value="CIF">CIF — Cost, Insurance and Freight</option>
                  <option value="CFR">CFR — Cost and Freight</option>
                  <option value="EXW">EXW — Ex Works</option>
                  <option value="DDP">DDP — Delivered Duty Paid</option>
                </select>
              </div>

              {/* Delivery Estimate */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                  Delivery Lead Time
                </label>
                <input
                  type="text"
                  value={deliveryEstimate}
                  onChange={(e) => setDeliveryEstimate(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Shipping Terms */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                  Shipping Terms / Port
                </label>
                <input
                  type="text"
                  value={shippingTerms}
                  onChange={(e) => setShippingTerms(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Payment Terms */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Validity Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                  Offer Valid Until
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Special Admin Notes */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                  Special Quotation Remarks
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Additional commercial conditions or packing specifications..."
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-secondary/20 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Financial Totals Breakdown */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Items Subtotal:</span>
              <span className="font-mono text-foreground font-semibold">
                ${subtotal.toFixed(2)} USD
              </span>
            </div>

            <div className="flex justify-between items-center text-muted-foreground">
              <span>Freight / Shipping Fee:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={isLoading}
                  className="w-24 px-2 py-0.5 text-right text-xs font-mono font-semibold rounded border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
                <span className="text-muted-foreground text-[10px]">USD</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-muted-foreground">
              <span>Commercial Discount:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-muted-foreground">-$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discountTotal}
                  onChange={(e) => setDiscountTotal(Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={isLoading}
                  className="w-24 px-2 py-0.5 text-right text-xs font-mono font-semibold rounded border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
                <span className="text-muted-foreground text-[10px]">USD</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border/60 text-sm font-bold text-foreground">
              <span>Grand Total Payable:</span>
              <span className="text-base font-display font-bold text-primary">
                ${grandTotal.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading || grandTotal <= 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs uppercase tracking-wider transition-opacity shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isLoading && <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
              <span>Save & Issue Quotation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
