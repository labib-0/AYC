import React from "react";
import { OrderRecord } from "@/services/order.service";
import { Package, DollarSign, CreditCard, Truck } from "lucide-react";

export interface OrderSummaryMetricsProps {
  order: OrderRecord;
}

export default function OrderSummaryMetrics({ order }: OrderSummaryMetricsProps) {
  const totalUnits =
    order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) ||
    order.shipping_snapshot?.package_quantity ||
    0;

  const totalAmount = Number(order.total_amount || 0);
  const isPaid =
    order.payment_status === "paid" ||
    order.payment_details?.payment_status === "PAID";
  const rawPaid =
    order.paid_amount !== undefined && order.paid_amount !== null
      ? Number(order.paid_amount)
      : NaN;
  const paidAmount =
    !isNaN(rawPaid) && rawPaid > 0 ? rawPaid : isPaid ? totalAmount : 0;
  const rawBalance =
    order.balance_due !== undefined && order.balance_due !== null
      ? Number(order.balance_due)
      : NaN;
  const balanceDue = isPaid
    ? 0
    : !isNaN(rawBalance)
    ? rawBalance
    : Math.max(0, totalAmount - paidAmount);
  const currency = order.currency || "USD";

  const isFulfilled = ["shipped", "delivered"].includes(order.fulfillment_status);

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      id="order-summary-metrics-bar"
    >
      {/* 1. Total Units */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Package size={18} />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Total Units
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-foreground block truncate">
            {totalUnits.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground font-sans">
              pcs
            </span>
          </span>
        </div>
      </div>

      {/* 2. Order Total */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <DollarSign size={18} />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Order Total
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-foreground block truncate">
            ${totalAmount.toFixed(2)}{" "}
            <span className="text-xs font-normal text-muted-foreground font-sans">
              {currency}
            </span>
          </span>
        </div>
      </div>

      {/* 3. Payment Status */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isPaid
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          <CreditCard size={18} />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Payment Status
          </span>
          <span className="text-sm sm:text-base font-bold font-mono block truncate capitalize">
            {isPaid ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                Paid (${paidAmount.toFixed(2)})
              </span>
            ) : balanceDue > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                Pending (${balanceDue.toFixed(2)} due)
              </span>
            ) : (
              <span className="text-foreground uppercase">
                {order.payment_status}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* 4. Fulfillment Status */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isFulfilled
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <Truck size={18} />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Fulfillment
          </span>
          <span className="text-sm sm:text-base font-bold font-mono block truncate uppercase">
            {order.fulfillment_status === "unfulfilled" ? (
              <span className="text-muted-foreground">Unfulfilled</span>
            ) : order.fulfillment_status === "shipped" ? (
              <span className="text-purple-600 dark:text-purple-400">
                Dispatched
              </span>
            ) : order.fulfillment_status === "delivered" ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                Delivered
              </span>
            ) : (
              <span className="text-foreground">{order.fulfillment_status}</span>
            )}
            {order.carrier && (
              <span className="text-xs font-normal text-muted-foreground block truncate normal-case">
                via {order.carrier}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
