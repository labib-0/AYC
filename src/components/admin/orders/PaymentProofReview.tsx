import React from "react";
import { OrderRecord } from "@/services/order.service";
import PaymentStatusBadge from "./PaymentStatusBadge";
import { FileCheck, ExternalLink } from "lucide-react";

export interface PaymentProofReviewProps {
  order: OrderRecord;
  onApprove: () => void;
  onReject: () => void;
}

export default function PaymentProofReview({
  order,
  onApprove,
  onReject,
}: PaymentProofReviewProps) {
  if (!order.payment_proof_url) return null;

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <FileCheck size={18} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Offline Payment Proof Attached
          </h2>
        </div>
        <PaymentStatusBadge status={order.payment_status} size="md" />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Receipt Lightbox / Thumbnail Link */}
        <a
          href={order.payment_proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative group block rounded-2xl overflow-hidden border border-border bg-secondary shrink-0 w-36 h-36"
          title="Open payment proof in new tab"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={order.payment_proof_url}
            alt="Payment Proof Receipt"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-foreground text-xs font-bold transition-opacity">
            <ExternalLink size={18} />
          </div>
        </a>

        {/* Action Controls & Description */}
        <div className="space-y-3 flex-1 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Buyer submitted receipt verification. Review the document carefully against bank deposits before approving.
          </p>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onApprove}
              className="px-4 py-2 rounded-full bg-emerald-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
              id="btn-approve-payment-proof"
            >
              Approve Payment
            </button>
            <button
              type="button"
              onClick={onReject}
              className="px-4 py-2 rounded-full bg-rose-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
              id="btn-reject-payment-proof"
            >
              Reject Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
