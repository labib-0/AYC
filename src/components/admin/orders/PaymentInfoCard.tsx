import React from "react";
import { OrderRecord } from "@/services/order.service";
import PaymentStatusBadge from "./PaymentStatusBadge";
import { CreditCard, FileCheck } from "lucide-react";

export interface PaymentInfoCardProps {
  order: OrderRecord;
  onOpenProofModal?: () => void;
}

export default function PaymentInfoCard({
  order,
  onOpenProofModal,
}: PaymentInfoCardProps) {
  const methodFormatted =
    order.payment_method === "pos_cash"
      ? "Cash in Hand (POS In-Store)"
      : order.payment_method === "mobile_banking"
      ? "Mobile Banking (bKash / Nagad)"
      : order.payment_method === "bank_transfer"
      ? "Direct Bank TT (Swift / Wire)"
      : order.payment_method === "net_30"
      ? "Net 30 Commercial Credit"
      : order.payment_method === "stripe" || order.payment_method === "card"
      ? "Credit / Debit Card (Online)"
      : order.payment_method ? order.payment_method.replace(/_/g, " ").toUpperCase() : "N/A";

  const isPos = (order as any).order_source === "pos";
  const paidAmount = Number((order as any).paid_amount ?? (order.payment_status === "paid" ? order.total_amount : 0));
  const balanceDue = Number((order as any).balance_due ?? Math.max(0, Number(order.total_amount || 0) - paidAmount));
  const paymentDetails = (order as any).payment_details || {};
  const paymentRef = paymentDetails?.reference || paymentDetails?.transaction_id;

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <CreditCard size={16} className="text-primary" />
          <span>Payment Details</span>
        </h2>
        <PaymentStatusBadge status={order.payment_status} size="md" />
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider">
            Payment Method
          </span>
          <span className="font-bold text-foreground text-sm block mt-0.5 flex items-center gap-2">
            {methodFormatted}
            {isPos && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                POS
              </span>
            )}
          </span>
        </div>

        {paymentRef && (
          <div>
            <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider">
              Payment Reference / Trx ID
            </span>
            <span className="font-mono font-medium text-foreground text-xs block mt-0.5">
              {paymentRef}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-mono tracking-wider">
              Paid Amount
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block mt-0.5">
              ${paidAmount.toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-mono tracking-wider">
              Balance Due
            </span>
            <span className={`font-mono font-bold text-sm block mt-0.5 ${balanceDue > 0 ? "text-rose-500" : "text-foreground"}`}>
              ${balanceDue.toFixed(2)}
            </span>
          </div>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider">
            Grand Total
          </span>
          <span className="font-mono font-bold text-foreground text-base block mt-0.5">
            ${Number(order.total_amount || 0).toFixed(2)} {order.currency || "USD"}
          </span>
        </div>

        {order.payment_proof_url && (
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-emerald-500 shrink-0" />
              <span className="text-muted-foreground font-medium">Receipt Proof Attached</span>
            </div>
            {onOpenProofModal && (
              <button
                type="button"
                onClick={onOpenProofModal}
                className="px-2.5 py-1 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-bold uppercase text-[11px] tracking-wider transition-colors cursor-pointer"
              >
                Review Proof
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
