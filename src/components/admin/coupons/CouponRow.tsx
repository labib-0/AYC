import React from "react";
import { 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Tag 
} from "lucide-react";
import { CouponRecord } from "@/services/admin/coupon.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface CouponRowProps {
  coupon: CouponRecord;
  onEdit: (coupon: CouponRecord) => void;
  onToggleActive: (coupon: CouponRecord) => void;
  onDelete: (coupon: CouponRecord) => void;
}

export default function CouponRow({
  coupon,
  onEdit,
  onToggleActive,
  onDelete,
}: CouponRowProps) {
  const { can } = useAdminAuth();
  const isExpired = coupon.expires_at ? new Date(coupon.expires_at) < new Date() : false;
  const isPercentage = coupon.discount_type === "percentage";

  return (
    <tr className="border-b border-border/60 hover:bg-secondary/20 transition-colors">
      {/* 1. Code */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-secondary text-foreground">
            <Tag size={13} />
          </div>
          <span className="font-mono font-bold text-xs text-foreground tracking-wider px-2 py-0.5 rounded bg-secondary/80 border border-border/80">
            {coupon.code}
          </span>
        </div>
      </td>

      {/* 2. Type */}
      <td className="py-3 px-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-foreground border border-border/60">
          {isPercentage ? "Percentage" : "Flat Discount"}
        </span>
      </td>

      {/* 3. Discount Value */}
      <td className="py-3 px-4 whitespace-nowrap text-xs font-bold text-foreground">
        {isPercentage ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            {coupon.discount_value}%
          </span>
        ) : (
          <span className="text-emerald-600 dark:text-emerald-400">
            ${coupon.discount_value}
          </span>
        )}
      </td>

      {/* 4. Minimum Order */}
      <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-foreground font-semibold">
        ${coupon.min_spend ? Number(coupon.min_spend).toFixed(2) : "0.00"}
      </td>

      {/* 5. Usage */}
      <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-muted-foreground">
        <span className="text-foreground font-semibold">{coupon.usage_count ?? 0}</span>
        <span> / {coupon.usage_limit ? coupon.usage_limit : "∞"}</span>
      </td>

      {/* 6. Expiry */}
      <td className="py-3 px-4 whitespace-nowrap text-xs text-muted-foreground">
        {coupon.expires_at ? (
          <span className={isExpired ? "text-red-500 font-medium" : ""}>
            {new Date(coupon.expires_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            {isExpired && " (Expired)"}
          </span>
        ) : (
          <span>No expiry</span>
        )}
      </td>

      {/* 7. Status */}
      <td className="py-3 px-4 whitespace-nowrap">
        {(can("coupon.activate") || can("coupon.deactivate") || can("coupon.edit")) ? (
          <button
            type="button"
            onClick={() => onToggleActive(coupon)}
            className="inline-flex items-center gap-1.5 cursor-pointer focus:outline-none"
            title={`Click to ${coupon.is_active ? "deactivate" : "activate"}`}
          >
            {coupon.is_active ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={11} />
                <span>Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <XCircle size={11} />
                <span>Inactive</span>
              </span>
            )}
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5">
            {coupon.is_active ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={11} />
                <span>Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <XCircle size={11} />
                <span>Inactive</span>
              </span>
            )}
          </div>
        )}
      </td>

      {/* 8. Actions */}
      <td className="py-3 px-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5">
          {can("coupon.edit") && (
            <button
              type="button"
              onClick={() => onEdit(coupon)}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Edit coupon"
            >
              <Edit2 size={13} />
            </button>
          )}

          {can("coupon.delete") && (
            <button
              type="button"
              onClick={() => onDelete(coupon)}
              className="p-1.5 rounded-lg border border-red-500/20 bg-card hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
              title="Delete coupon"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
