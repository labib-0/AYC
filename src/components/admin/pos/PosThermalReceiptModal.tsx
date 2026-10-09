"use client";

import React, { useState } from "react";
import { OrderRecord } from "@/services/order.service";
import { Printer, X, Check, FileText } from "lucide-react";

export interface PosThermalReceiptModalProps {
  isOpen: boolean;
  order: OrderRecord | null;
  cashierName?: string;
  onClose: () => void;
}

export function formatReceiptCurrency(amount: number | string | null | undefined, currency: string = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);
  const safeNum = isNaN(num) ? 0 : num;
  const safeCurrency = (currency || "USD").toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeNum);
  } catch {
    return `${safeCurrency} ${safeNum.toFixed(2)}`;
  }
}

export default function PosThermalReceiptModal({
  isOpen,
  order,
  cashierName,
  onClose,
}: PosThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("80mm");
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    setIsPrinting(true);
    // Give browser brief tick to apply any width-specific styles before native dialog
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 50);
  };

  const isWalkin =
    order.email === "walkin@ayaanclothing.com" ||
    order.shipping_name?.toLowerCase().includes("walk-in") ||
    Boolean((order.payment_details as any)?.is_walkin);

  const customerDisplayName = isWalkin
    ? "Walk-in Customer"
    : order.shipping_name || order.user?.name || "Customer";

  const placedDate = order.placed_at || order.created_at;
  const formattedDate = placedDate
    ? new Date(placedDate).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleString();

  const effectiveCashier =
    cashierName ||
    order.created_by_admin?.name ||
    "Authorized Cashier";

  const currency = order.currency || "USD";
  const totalAmount = Number(order.total_amount ?? 0);
  const paidAmount = Number(order.paid_amount ?? totalAmount);
  const balanceDue = Number(order.balance_due ?? 0);
  const tenderedAmount = order.payment_details?.tendered_amount != null
    ? Number(order.payment_details.tendered_amount)
    : null;
  const changeReturn = order.payment_details?.change_return != null
    ? Number(order.payment_details.change_return)
    : 0;

  const subtotal = Number(order.subtotal ?? 0);
  const discountAmount = Number(order.discount_amount ?? 0);
  const manualDiscountAmount = Number(order.manual_discount_amount ?? 0);
  const taxAmount = Number(order.tax_amount ?? 0);
  const shippingCost = Number(order.shipping_cost ?? 0);

  const is58 = paperWidth === "58mm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      id="pos-thermal-receipt-modal-backdrop"
    >
      {/* ── PRINT-ONLY STYLESHEET ─────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          /* Hide everything in the page by default */
          body * {
            visibility: hidden !important;
          }

          /* Show ONLY the printable thermal container */
          #pos-thermal-receipt-printable,
          #pos-thermal-receipt-printable * {
            visibility: visible !important;
          }

          #pos-thermal-receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${is58 ? "48mm" : "72mm"} !important;
            max-width: ${is58 ? "48mm" : "72mm"} !important;
            margin: 0 auto !important;
            padding: 2mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: "Courier New", Courier, monospace, -apple-system, BlinkMacSystemFont !important;
            font-size: ${is58 ? "9px" : "11px"} !important;
            line-height: 1.25 !important;
            box-shadow: none !important;
            border: none !important;
          }

          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
        }
      `}</style>

      {/* Main Modal Card */}
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header Bar with Width Toggle & Close */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-secondary/30 shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Thermal Receipt Preview</h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Order #{order.order_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 58mm / 80mm Width Selector */}
            <div className="inline-flex rounded-lg p-0.5 bg-background border border-border text-xs">
              <button
                type="button"
                onClick={() => setPaperWidth("58mm")}
                id="thermal-width-58"
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  is58
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth("80mm")}
                id="thermal-width-80"
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  !is58
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                80 mm
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              id="btn-close-thermal-preview"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body Screen Simulation */}
        <div className="p-4 overflow-y-auto flex-1 bg-secondary/10 flex justify-center items-start">
          <div
            id="pos-thermal-receipt-printable"
            className={`bg-white text-black font-mono transition-all duration-200 shadow-md p-4 rounded-xs border border-neutral-300 ${
              is58 ? "w-[240px] text-[10px]" : "w-[340px] text-[12px]"
            }`}
            style={{
              lineHeight: 1.35,
              color: "#000000",
              backgroundColor: "#ffffff",
            }}
          >
            {/* Header Branding */}
            <div className="text-center space-y-0.5 pb-2">
              <div className="font-extrabold text-sm tracking-wider uppercase">
                AYAAN CLOTHING
              </div>
              <div className="text-[10px] font-semibold text-neutral-800">
                Quality Knitwear & Apparel Export
              </div>
              <div className="text-[9px] text-neutral-600">
                House 12, Road 4, Sector 3, Uttara
              </div>
              <div className="text-[9px] text-neutral-600">
                Dhaka-1230, Bangladesh
              </div>
              <div className="text-[9px] text-neutral-600">
                Tel: +880 1711-000000 | VAT: 002391029-0101
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-neutral-400 my-2" />

            {/* Receipt Meta */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="font-bold">RECEIPT #:</span>
                <span className="font-bold">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span className="truncate max-w-[140px]">{effectiveCashier}</span>
              </div>
              <div className="flex justify-between">
                <span>CUSTOMER:</span>
                <span className="font-semibold truncate max-w-[140px]">
                  {customerDisplayName}
                </span>
              </div>
              {order.shipping_phone && !isWalkin && (
                <div className="flex justify-between">
                  <span>PHONE:</span>
                  <span>{order.shipping_phone}</span>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-neutral-400 my-2" />

            {/* Items Header */}
            <div className="font-bold text-[10px] pb-1">
              {is58 ? (
                <div className="flex justify-between">
                  <span>ITEM</span>
                  <span>TOTAL</span>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-1 text-[11px]">
                  <span className="col-span-6">ITEM / VARIANT</span>
                  <span className="col-span-3 text-right">QTY x PRICE</span>
                  <span className="col-span-3 text-right">TOTAL</span>
                </div>
              )}
            </div>
            <div className="border-t border-neutral-300 mb-1.5" />

            {/* Item Rows */}
            <div className="space-y-2">
              {(order.items || []).map((item, idx) => {
                const itemQty = Number(item.quantity);
                const itemPrice = Number(item.unit_price);
                const itemTotal = Number(item.line_total || itemQty * itemPrice);
                const variantDetails = [
                  item.size ? `Size: ${item.size}` : null,
                  item.color ? `Color: ${item.color}` : null,
                  item.variant_title && item.variant_title !== item.size
                    ? item.variant_title
                    : null,
                ]
                  .filter(Boolean)
                  .join(" | ");

                if (is58) {
                  return (
                    <div key={item.id || idx} className="text-[10px]">
                      <div className="font-bold leading-tight break-words">
                        {item.product_name}
                      </div>
                      {variantDetails && (
                        <div className="text-[9px] text-neutral-600 leading-tight">
                          {variantDetails}
                        </div>
                      )}
                      <div className="flex justify-between pt-0.5">
                        <span className="text-neutral-700">
                          {itemQty} x {formatReceiptCurrency(itemPrice, currency)}
                        </span>
                        <span className="font-bold">
                          {formatReceiptCurrency(itemTotal, currency)}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item.id || idx} className="grid grid-cols-12 gap-1 text-[11px] items-start">
                    <div className="col-span-6 pr-1">
                      <div className="font-bold leading-tight break-words">
                        {item.product_name}
                      </div>
                      {variantDetails && (
                        <div className="text-[9px] text-neutral-600 leading-tight">
                          {variantDetails}
                        </div>
                      )}
                      {item.sku && (
                        <div className="text-[8px] text-neutral-500 font-mono">
                          SKU: {item.sku}
                        </div>
                      )}
                    </div>
                    <div className="col-span-3 text-right text-neutral-700 text-[10px]">
                      {itemQty} x {formatReceiptCurrency(itemPrice, currency)}
                    </div>
                    <div className="col-span-3 text-right font-bold">
                      {formatReceiptCurrency(itemTotal, currency)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-neutral-400 my-2" />

            {/* Financial Summary */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatReceiptCurrency(subtotal, currency)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-neutral-800">
                  <span>DISCOUNT:</span>
                  <span>-{formatReceiptCurrency(discountAmount, currency)}</span>
                </div>
              )}

              {manualDiscountAmount > 0 && (
                <div className="flex justify-between text-neutral-800">
                  <span>
                    MANUAL DISC
                    {order.manual_discount_type ? ` (${order.manual_discount_type})` : ""}:
                  </span>
                  <span>-{formatReceiptCurrency(manualDiscountAmount, currency)}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>TAX / VAT:</span>
                  <span>+{formatReceiptCurrency(taxAmount, currency)}</span>
                </div>
              )}

              {shippingCost > 0 && (
                <div className="flex justify-between">
                  <span>FULFILLMENT:</span>
                  <span>+{formatReceiptCurrency(shippingCost, currency)}</span>
                </div>
              )}

              <div className="border-t border-neutral-800 my-1 pt-1 flex justify-between font-extrabold text-[12px]">
                <span>TOTAL DUE:</span>
                <span>{formatReceiptCurrency(totalAmount, currency)}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t-2 border-neutral-800 my-2" />

            {/* Payment Details */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="font-semibold">PAYMENT METHOD:</span>
                <span className="font-bold uppercase">
                  {order.payment_method?.replace("_", " ") || "POS CASH"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="font-semibold">AMOUNT PAID:</span>
                <span className="font-bold">
                  {formatReceiptCurrency(paidAmount, currency)}
                </span>
              </div>

              {tenderedAmount != null && (
                <div className="flex justify-between">
                  <span>CASH TENDERED:</span>
                  <span className="font-semibold">
                    {formatReceiptCurrency(tenderedAmount, currency)}
                  </span>
                </div>
              )}

              {changeReturn > 0 && (
                <div className="flex justify-between font-bold text-[11px] bg-neutral-100 p-0.5">
                  <span>CHANGE RETURNED:</span>
                  <span>{formatReceiptCurrency(changeReturn, currency)}</span>
                </div>
              )}

              {balanceDue > 0 && (
                <div className="flex justify-between font-bold text-red-600">
                  <span>BALANCE DUE:</span>
                  <span>{formatReceiptCurrency(balanceDue, currency)}</span>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-neutral-400 my-2.5" />

            {/* Footer Notice & Return Policy */}
            <div className="text-center space-y-1 text-[9px] text-neutral-700">
              <div className="font-bold">THANK YOU FOR YOUR PURCHASE!</div>
              <div>Exchange within 7 days with original receipt.</div>
              <div>Garments must be unworn with tags attached.</div>

              {/* Barcode representation */}
              <div className="pt-2 pb-1 flex flex-col items-center">
                <div
                  className="tracking-[4px] font-mono text-[10px] font-bold select-none"
                  style={{
                    letterSpacing: "4px",
                    fontFamily: "monospace",
                  }}
                >
                  ||||| |||| | ||||| || ||||
                </div>
                <div className="text-[8px] font-mono tracking-widest text-neutral-600">
                  *{order.order_number}*
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-card shrink-0">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Paper: <strong className="text-foreground font-mono">{paperWidth}</strong> •{" "}
            Currency: <strong className="text-foreground font-mono">{currency}</strong>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-border bg-background hover:bg-secondary font-bold text-xs text-foreground transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              id="btn-execute-thermal-print"
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Receipt ({paperWidth})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
