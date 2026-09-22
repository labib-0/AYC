import React from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { CouponRecord } from "@/services/admin/promotion.service";

export interface CouponDeleteDialogProps {
  isOpen: boolean;
  coupon: CouponRecord | null;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export default function CouponDeleteDialog({
  isOpen,
  coupon,
  onClose,
  onConfirmDelete,
  isDeleting,
}: CouponDeleteDialogProps) {
  if (!isOpen || !coupon) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-delete-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="p-3 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertTriangle size={24} />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1.5">
          <h2 id="coupon-delete-title" className="text-base sm:text-lg font-bold text-foreground">
            Delete Coupon?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Are you sure you want to delete coupon <strong className="font-mono text-foreground">{coupon.code}</strong>? Buyers will no longer be able to apply this discount at checkout.
          </p>
        </div>

        {coupon.usage_count > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
            Note: This coupon has been redeemed <strong className="font-mono">{coupon.usage_count}</strong> times in previous orders. Historical order totals will not be affected.
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={13} />
                <span>Delete Coupon</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
