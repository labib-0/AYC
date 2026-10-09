import React from "react";
import { OrderRecord } from "@/services/order.service";
import { DollarSign, Tag } from "lucide-react";

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

  const couponCode = (order as any).coupon_code || (order as any).coupon?.code || order.promo_code;
  const couponObj = (order as any).coupon;
  const couponDiscountType = couponObj?.discount_type || couponObj?.type;
  const couponDiscountVal = couponObj?.discount_value ?? couponObj?.value;
  const couponBadge = couponDiscountVal
    ? couponDiscountType === "percentage"
      ? `${couponDiscountVal}% OFF`
      : `$${Number(couponDiscountVal).toFixed(2)} OFF`
    : null;

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

        {/* Section 14: Coupon Attribution */}
        {couponCode && (
          <div className="p-3 my-2 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Tag size={12} className="text-primary" />
                <span>Coupon Attribution:</span>
              </span>
              <span className="font-mono font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
                {couponCode}
              </span>
            </div>
            {couponBadge && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Discount Rate:</span>
                <span className="font-medium text-foreground">{couponBadge}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Attributed Discount:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                -${discountAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Section: Manual Admin Discount (POS Phase 2) */}
        {(order as any).manual_discount_amount > 0 && (
          <div className="p-3 my-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Tag size={12} className="text-amber-500" />
                <span>Admin Manual Discount:</span>
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                -${Number((order as any).manual_discount_amount).toFixed(2)}
              </span>
            </div>
            {(order as any).manual_discount_value != null && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Override Value:</span>
                <span className="font-mono font-medium text-foreground">
                  {(order as any).manual_discount_type === "percentage"
                    ? `${(order as any).manual_discount_value}%`
                    : `$${Number((order as any).manual_discount_value).toFixed(2)}`}
                </span>
              </div>
            )}
            {(order as any).manual_discount_reason && (
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-amber-500/10">
                <span className="font-medium text-foreground">Reason: </span>
                <span className="italic">{(order as any).manual_discount_reason}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center font-bold text-base text-foreground pt-3 border-t border-border/60">
          <span>Grand Total</span>
          <span className="font-mono text-primary text-lg">
            ${totalAmount.toFixed(2)} <span className="text-xs font-sans text-muted-foreground uppercase">{currency}</span>
          </span>
        </div>

        {/* Payment Tracking: Paid vs Balance Due */}
        <div className="pt-2 border-t border-border/40 space-y-1.5 text-xs">
          {(() => {
            const isPaid =
              order.payment_status === "paid" ||
              order.payment_details?.payment_status === "PAID";
            const rawPaid =
              (order as any).paid_amount !== undefined && (order as any).paid_amount !== null
                ? Number((order as any).paid_amount)
                : NaN;
            const paidAmount =
              !isNaN(rawPaid) && rawPaid > 0 ? rawPaid : isPaid ? totalAmount : 0;
            const rawBalance =
              (order as any).balance_due !== undefined && (order as any).balance_due !== null
                ? Number((order as any).balance_due)
                : NaN;
            const balanceDue = isPaid
              ? 0
              : !isNaN(rawBalance)
              ? rawBalance
              : Math.max(0, totalAmount - paidAmount);

            return (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid Amount</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ${paidAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Balance Due</span>
                  <span
                    className={`font-mono font-bold ${
                      balanceDue > 0 ? "text-rose-500" : "text-foreground"
                    }`}
                  >
                    ${balanceDue.toFixed(2)}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
