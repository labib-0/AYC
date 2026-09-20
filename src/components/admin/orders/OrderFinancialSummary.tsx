import React from "react";
import { OrderRecord } from "@/services/order.service";
import { DollarSign } from "lucide-react";

export interface OrderFinancialSummaryProps {
  order: OrderRecord;
}

export default function OrderFinancialSummary({ order }: OrderFinancialSummaryProps) {
  const subtotal = Number(order.subtotal || 0);
  const shippingCost = Number(order.shipping_cost || 0);
  const otherCharges = Number(order.other_charges || 0);
  const taxAmount = Number(order.tax_amount || 0);
  const discountAmount = Number(order.discount_amount || 0);
  const totalAmount = Number(order.total_amount || 0);
  const currency = order.currency || "USD";

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2 pb-3 border-b border-border/60">
        <DollarSign size={16} className="text-primary" />
        <span>Financial Summary</span>
      </h2>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Goods Value (Subtotal)</span>
          <span className="font-mono font-bold text-foreground">
            ${subtotal.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-muted-foreground">
          <span>Shipping / Freight</span>
          <span className="font-mono font-bold text-foreground">
            {shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)}`}
          </span>
        </div>

        {otherCharges > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Other Charges / Documentation</span>
            <span className="font-mono font-bold text-foreground">
              ${otherCharges.toFixed(2)}
            </span>
          </div>
        )}

        {taxAmount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Taxes &amp; Duties</span>
            <span className="font-mono font-bold text-foreground">
              ${taxAmount.toFixed(2)}
            </span>
          </div>
        )}

        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Discount Applied</span>
            <span className="font-mono font-bold">
              -${discountAmount.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center font-bold text-base text-foreground pt-3 border-t border-border/60">
          <span>Total Payable</span>
          <span className="font-mono text-primary text-lg">
            ${totalAmount.toFixed(2)} <span className="text-xs font-sans text-muted-foreground uppercase">{currency}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
