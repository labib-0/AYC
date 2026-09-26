import React from "react";
import { Plus, RefreshCw } from "lucide-react";

export interface CouponHeaderProps {
  onAddCoupon: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export default function CouponHeader({
  onAddCoupon,
  onRefresh,
  isRefreshing = false,
}: CouponHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
          Coupons
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
          Manage wholesale discount codes, order thresholds, and redemption limits.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={onAddCoupon}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-sm cursor-pointer"
          id="btn-add-coupon"
        >
          <Plus size={15} />
          <span>Add Coupon</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2.5 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          title="Refresh coupon data"
          aria-label="Refresh coupon data"
          id="btn-refresh-coupons"
        >
          <RefreshCw size={15} className={isRefreshing ? "animate-spin text-primary" : ""} />
        </button>
      </div>
    </div>
  );
}
