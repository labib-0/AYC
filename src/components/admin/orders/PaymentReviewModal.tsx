import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export interface PaymentReviewModalProps {
  isOpen: boolean;
  action: "approve" | "reject";
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
  isLoading?: boolean;
}

export default function PaymentReviewModal({
  isOpen,
  action,
  onClose,
  onConfirm,
  isLoading = false,
}: PaymentReviewModalProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNote("");
    }
  }, [isOpen, action]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(note.trim());
  };

  const isApprove = action === "approve";

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-review-modal-title"
    >
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 size={18} className="text-emerald-500" />
            ) : (
              <XCircle size={18} className="text-rose-500" />
            )}
            <h3
              id="payment-review-modal-title"
              className="font-bold text-base uppercase tracking-tight text-foreground"
            >
              {isApprove ? "Approve Payment Proof" : "Reject Payment Proof"}
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
          <p className="text-muted-foreground leading-relaxed">
            {isApprove
              ? "Approving this receipt confirms fund receipt in bank accounts. The order payment status will be marked as PAID and order status will advance to PROCESSING."
              : "Rejecting this receipt will mark payment status as FAILED and notify the administration log."}
          </p>

          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Reviewer Audit Note {isApprove ? "(Optional)" : "(Required)"}
            </label>
            <textarea
              rows={3}
              required={!isApprove}
              placeholder={
                isApprove
                  ? "Verified credit in Bank Account ref #..."
                  : "State reason for rejection (e.g. amount mismatch, illegible document)..."
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none transition-colors"
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
              className={`px-6 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider transition-opacity shadow-sm cursor-pointer ${
                isApprove
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isLoading ? "Saving..." : `Confirm ${isApprove ? "Approval" : "Rejection"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
