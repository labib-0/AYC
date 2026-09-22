import React, { useState, useEffect } from "react";
import { X, Tag, Loader2, Save } from "lucide-react";
import { CouponRecord } from "@/services/admin/promotion.service";

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
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minSpend, setMinSpend] = useState<number>(0);
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
        setDiscountType(coupon.discount_type || "percentage");
        setDiscountValue(coupon.discount_value ?? 10);
        setMinSpend(coupon.min_spend ?? 0);
        setMaxDiscount(coupon.max_discount ?? 0);
        setUsageLimit(coupon.usage_limit ?? 100);
        setExpiresAt(coupon.expires_at ? coupon.expires_at.split("T")[0] : "");
        setIsActive(Boolean(coupon.is_active));
      } else {
        // Fresh Add form
        setCode("");
        setDiscountType("percentage");
        setDiscountValue(10);
        setMinSpend(0);
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
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      errs.code = "Coupon code is required.";
    } else if (cleanCode.length > 30) {
      errs.code = "Coupon code must not exceed 30 characters.";
    } else if (/\s/.test(cleanCode)) {
      errs.code = "Coupon code cannot contain spaces.";
    }

    if (discountValue <= 0) {
      errs.value = "Discount value must be greater than 0.";
    } else if (discountType === "percentage" && discountValue > 100) {
      errs.value = "Percentage discount cannot exceed 100%.";
    }

    if (minSpend < 0) {
      errs.minSpend = "Minimum spend cannot be negative.";
    }

    if (usageLimit < 0) {
      errs.usageLimit = "Usage limit cannot be negative.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_spend: minSpend > 0 ? Number(minSpend) : undefined,
        max_discount: maxDiscount > 0 ? Number(maxDiscount) : undefined,
        usage_limit: usageLimit > 0 ? Number(usageLimit) : undefined,
        expires_at: expiresAt ? `${expiresAt}T23:59:59Z` : undefined,
        is_active: isActive,
      });
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
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Tag size={18} />
            </div>
            <div>
              <h2 id="coupon-modal-title" className="text-base sm:text-lg font-bold text-foreground">
                {coupon ? "Edit Coupon" : "Create Coupon"}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Configure promo discount code, redemption rules, and expiration.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errors.form && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              {errors.form}
            </div>
          )}

          {/* Coupon Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground">
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                UPPERCASE NO SPACES
              </span>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME10 or BULK500"
              disabled={saving}
              className={`w-full px-3 py-2 text-xs rounded-xl border bg-background text-foreground font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary ${
                errors.code ? "border-red-500" : "border-border"
              }`}
            />
            {errors.code && <p className="text-[10px] text-red-500 mt-1">{errors.code}</p>}
          </div>

          {/* Type & Discount Value Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                disabled={saving}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary cursor-pointer outline-none"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($ USD)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0.01}
                  step={discountType === "percentage" ? "1" : "0.01"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  disabled={saving}
                  className={`w-full px-3 py-2 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary outline-none ${
                    errors.value ? "border-red-500" : "border-border"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                  {discountType === "percentage" ? "%" : "$"}
                </span>
              </div>
              {errors.value && <p className="text-[10px] text-red-500 mt-1">{errors.value}</p>}
            </div>
          </div>

          {/* Min Spend & Max Discount Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Minimum Spend ($ USD)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={minSpend}
                onChange={(e) => setMinSpend(Number(e.target.value))}
                placeholder="0 for no minimum"
                disabled={saving}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Usage Limit (Count)
              </label>
              <input
                type="number"
                min={0}
                value={usageLimit}
                onChange={(e) => setUsageLimit(Number(e.target.value))}
                placeholder="0 for unlimited"
                disabled={saving}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Leave blank if the coupon does not have an expiration date.
            </p>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/60">
            <div>
              <span className="text-xs font-bold text-foreground block">
                Coupon Status
              </span>
              <span className="text-[11px] text-muted-foreground">
                Active coupons can be redeemed by eligible wholesale buyers at checkout.
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? "bg-emerald-600" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2.5">
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
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
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
