import React, { useState, useEffect } from "react";
import { X, Tag, Loader2, Save } from "lucide-react";
import { CouponRecord, CouponDiscountType } from "@/services/admin/coupon.service";

export interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: CouponRecord | null;
  onSave: (data: Partial<CouponRecord>) => Promise<void>;
}

export default function CouponModal({
  isOpen,
  onClose,
  coupon,
  onSave,
}: CouponModalProps) {
  // Form State
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minSpend, setMinSpend] = useState<number>(500);
  const [maxDiscount, setMaxDiscount] = useState<number>(0);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  // UX State
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (coupon) {
        setCode(coupon.code || "");
        setDiscountType(coupon.discount_type === "percentage" ? "percentage" : "flat");
        setDiscountValue(coupon.discount_value ?? 10);
        setMinSpend(coupon.min_spend ?? 500);
        setMaxDiscount(coupon.max_discount ?? 0);
        setUsageLimit(coupon.usage_limit ?? 100);
        setExpiresAt(coupon.expires_at ? coupon.expires_at.split("T")[0] : "");
        setIsActive(Boolean(coupon.is_active));
      } else {
        // Fresh Add form
        setCode("");
        setDiscountType("percentage");
        setDiscountValue(10);
        setMinSpend(500);
        setMaxDiscount(0);
        setUsageLimit(100);
        setExpiresAt("");
        setIsActive(true);
      }
      setErrors({});
    }
  }, [isOpen, coupon]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!code.trim()) {
      errs.code = "Coupon code is required.";
    } else if (code.trim().length > 30) {
      errs.code = "Coupon code must not exceed 30 characters.";
    } else if (/\s/.test(code)) {
      errs.code = "Coupon code cannot contain spaces.";
    }

    if (discountValue <= 0) {
      errs.discountValue = "Discount value must be greater than zero.";
    } else if (discountType === "percentage" && discountValue > 100) {
      errs.discountValue = "Percentage discount cannot exceed 100%.";
    }

    if (minSpend <= 0) {
      errs.minSpend = "Minimum order requirement must be greater than $0.";
    }

    if (usageLimit < 0) {
      errs.usageLimit = "Usage limit cannot be negative.";
    }

    if (maxDiscount < 0) {
      errs.maxDiscount = "Max discount cap cannot be negative.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload: Partial<CouponRecord> = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_spend: Number(minSpend),
        max_discount: maxDiscount > 0 ? Number(maxDiscount) : undefined,
        usage_limit: usageLimit > 0 ? Number(usageLimit) : undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        is_active: isActive,
      };

      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      setErrors({ form: (err as Error)?.message || "Failed to save coupon." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/80 bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Tag size={18} />
            </div>
            <div>
              <h2 id="coupon-modal-title" className="text-sm sm:text-base font-bold text-foreground">
                {coupon ? "Edit Coupon" : "Create Coupon"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Configure discount type (Percentage or Flat), mandatory minimum order, and limits.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errors.form && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              {errors.form}
            </div>
          )}

          {/* Coupon Code */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>
                Coupon Code <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">Uppercase, alphanumeric</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WHOLESALE10, BULK50"
              className={`w-full px-3 py-2 text-xs rounded-xl border bg-background font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-primary ${
                errors.code ? "border-red-500" : "border-border"
              }`}
              id="input-coupon-code"
            />
            {errors.code && <p className="text-[11px] text-red-500">{errors.code}</p>}
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                id="select-modal-discount-type"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount ($)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className={`w-full pl-3 pr-8 py-2 text-xs rounded-xl border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.discountValue ? "border-red-500" : "border-border"
                  }`}
                  id="input-discount-value"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                  {discountType === "percentage" ? "%" : "$"}
                </span>
              </div>
              {errors.discountValue && <p className="text-[11px] text-red-500">{errors.discountValue}</p>}
            </div>
          </div>

          {/* Min Spend (Mandatory) & Max Discount (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Min. Order Subtotal ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={minSpend}
                  onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)}
                  className={`w-full pl-7 pr-3 py-2 text-xs rounded-xl border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.minSpend ? "border-red-500" : "border-border"
                  }`}
                  id="input-min-spend"
                />
              </div>
              {errors.minSpend ? (
                <p className="text-[11px] text-red-500">{errors.minSpend}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Order subtotal must meet or exceed this amount.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Max Discount Cap ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0 (Unlimited)"
                  className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  id="input-max-discount"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Optional cap for percentage discounts.</p>
            </div>
          </div>

          {/* Usage Limit & Expiration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Usage Limit</label>
              <input
                type="number"
                min="0"
                step="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(parseInt(e.target.value, 10) || 0)}
                placeholder="0 (Unlimited)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                id="input-usage-limit"
              />
              <p className="text-[10px] text-muted-foreground">Maximum total redemptions.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Expiration Date</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                id="input-expires-at"
              />
              <p className="text-[10px] text-muted-foreground">Leave blank if the coupon does not expire.</p>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Coupon Status
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Active coupons can be redeemed by wholesale buyers at checkout.
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
                id="checkbox-coupon-active"
              />
              <div className="w-9 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              id="btn-save-coupon"
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>{coupon ? "Update Coupon" : "Create Coupon"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
