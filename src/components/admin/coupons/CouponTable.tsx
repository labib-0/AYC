import React from "react";
import { Tag, SearchX } from "lucide-react";
import { CouponRecord } from "@/services/admin/coupon.service";
import CouponRow from "./CouponRow";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface CouponTableProps {
  coupons: CouponRecord[];
  loading: boolean;
  search: string;
  hasActiveFilters: boolean;
  onEdit: (coupon: CouponRecord) => void;
  onToggleActive: (coupon: CouponRecord) => void;
  onDelete: (coupon: CouponRecord) => void;
  onAddCoupon: () => void;
  onResetFilters: () => void;
}

export default function CouponTable({
  coupons,
  loading,
  search,
  hasActiveFilters,
  onEdit,
  onToggleActive,
  onDelete,
  onAddCoupon,
  onResetFilters,
}: CouponTableProps) {
  const { can } = useAdminAuth();
  // 1. Loading Skeleton
  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-secondary/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Filtered Empty State
  if (coupons.length === 0 && (search || hasActiveFilters)) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
        <div className="p-3 rounded-full bg-secondary text-muted-foreground">
          <SearchX size={24} />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">
          No coupons match your current filters
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Try adjusting your search query, status filter, or coupon discount type.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-colors cursor-pointer"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  // 3. Unfiltered Empty State
  if (coupons.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <Tag size={24} />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">
          No coupons yet
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Create percentage or flat discount coupons with minimum order requirements.
        </p>
        {can("coupon.create") && (
          <button
            type="button"
            onClick={onAddCoupon}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
          >
            Create First Coupon
          </button>
        )}
      </div>
    );
  }

  // 4. Main Table
  return (
    <div className="bg-card rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="py-3 px-4">Coupon Code</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Discount</th>
              <th className="py-3 px-4">Min. Order</th>
              <th className="py-3 px-4">Usage</th>
              <th className="py-3 px-4">Expires</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <CouponRow
                key={coupon.id}
                coupon={coupon}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="md:hidden divide-y divide-border/60">
        {coupons.map((coupon) => {
          const isPercentage = coupon.discount_type === "percentage";
          return (
            <div key={coupon.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="font-mono font-bold text-xs text-foreground tracking-wider px-2 py-0.5 rounded bg-secondary border border-border">
                    {coupon.code}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {isPercentage ? "Percentage" : "Flat Discount"}
                  </p>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block">
                    {isPercentage
                      ? `${coupon.discount_value}%`
                      : `$${coupon.discount_value}`}
                  </span>
                  {coupon.is_active ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-secondary/30 p-2.5 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Min. Order</span>
                  <span className="font-mono font-medium text-foreground">
                    ${coupon.min_spend ? Number(coupon.min_spend).toFixed(2) : "0.00"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Usage</span>
                  <span className="font-mono font-medium text-foreground">
                    {coupon.usage_count ?? 0} / {coupon.usage_limit ? coupon.usage_limit : "∞"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span>
                  {coupon.expires_at ? `Expires: ${new Date(coupon.expires_at).toLocaleDateString()}` : "No expiry"}
                </span>

                <div className="flex items-center gap-1.5">
                  {(can("coupon.activate") || can("coupon.deactivate") || can("coupon.edit")) && (
                    <button
                      type="button"
                      onClick={() => onToggleActive(coupon)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold cursor-pointer"
                    >
                      {coupon.is_active ? "Deactivate" : "Activate"}
                    </button>
                  )}
                  {can("coupon.edit") && (
                    <button
                      type="button"
                      onClick={() => onEdit(coupon)}
                      className="p-1 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Edit"
                    >
                      Edit
                    </button>
                  )}
                  {can("coupon.delete") && (
                    <button
                      type="button"
                      onClick={() => onDelete(coupon)}
                      className="p-1 rounded-lg border border-red-500/20 bg-card hover:bg-red-500/10 text-red-600 dark:text-red-400 cursor-pointer"
                      title="Delete"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
