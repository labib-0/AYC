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
  // Form State - string-based to eliminate HTML5 number input leading zero bugs (e.g. "01000")
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<string>("10");
  const [minSpend, setMinSpend] = useState<string>("1000");
  const [maxDiscount, setMaxDiscount] = useState<string>("");
  const [usageLimit, setUsageLimit] = useState<string>("100");
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
        setDiscountValue(
          coupon.discount_value !== undefined && coupon.discount_value !== null
            ? String(coupon.discount_value)
            : "10"
        );
        setMinSpend(
          coupon.min_spend !== undefined && coupon.min_spend !== null
            ? String(coupon.min_spend)
            : "1000"
        );
        setMaxDiscount(
          coupon.max_discount !== undefined &&
            coupon.max_discount !== null &&
            Number(coupon.max_discount) > 0
            ? String(coupon.max_discount)
            : ""
        );
        setUsageLimit(
          coupon.usage_limit !== undefined &&
            coupon.usage_limit !== null &&
            Number(coupon.usage_limit) > 0
            ? String(coupon.usage_limit)
            : ""
        );
        setExpiresAt(coupon.expires_at ? coupon.expires_at.split("T")[0] : "");
        setIsActive(Boolean(coupon.is_active));
      } else {
        // Fresh Add form
        setCode("");
        setDiscountType("percentage");
        setDiscountValue("10");
        setMinSpend("1000");
        setMaxDiscount("");
        setUsageLimit("100");
        setExpiresAt("");
        setIsActive(true);
      }
      setErrors({});
    }
  }, [isOpen, coupon]);

  if (!isOpen) return null;

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field] && !prev.form) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.form;
      return next;
    });
  };

  const sanitizeNumericInput = (val: string, allowDecimals = true): string => {
    let clean = allowDecimals ? val.replace(/[^0-9.]/g, "") : val.replace(/[^0-9]/g, "");
    if (allowDecimals) {
      const parts = clean.split(".");
      if (parts.length > 2) {
        clean = parts[0] + "." + parts.slice(1).join("");
      }
    }
    // Strip accidental leading zeros before integers, e.g. "01000" -> "1000", but allow "0" or "0.5"
    if (/^0[0-9]/.test(clean)) {
      clean = clean.replace(/^0+/, "");
      if (clean === "") clean = "0";
    }
    return clean;
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      errs.code = "Coupon code is required.";
    } else if (cleanCode.length > 50) {
      errs.code = "Coupon code must not exceed 50 characters.";
    } else if (/\s/.test(cleanCode)) {
      errs.code = "Coupon code cannot contain spaces.";
    }

    const valNum = parseFloat(discountValue);
    if (isNaN(valNum) || valNum <= 0) {
      errs.discountValue = "Discount value must be greater than zero.";
    } else if (discountType === "percentage" && valNum > 100) {
      errs.discountValue = "Percentage discount cannot exceed 100%.";
    }

    const minNum = parseFloat(minSpend);
    if (isNaN(minNum) || minNum < 0) {
      errs.minSpend = "Minimum order subtotal must be $0 or greater.";
    }

    if (discountType === "percentage" && maxDiscount.trim() !== "") {
      const maxNum = parseFloat(maxDiscount);
      if (isNaN(maxNum) || maxNum < 0) {
        errs.maxDiscount = "Max discount cap cannot be negative.";
      }
    }

    if (usageLimit.trim() !== "") {
      const limitNum = parseInt(usageLimit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        errs.usageLimit = "Usage limit must be at least 1 or left blank for unlimited.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setErrors({});
    try {
      const parsedDiscountValue = parseFloat(discountValue);
      const parsedMinSpend = minSpend.trim() !== "" ? parseFloat(minSpend) : 0;
      const parsedMaxDiscount =
        discountType === "percentage" && maxDiscount.trim() !== "" && parseFloat(maxDiscount) > 0
          ? parseFloat(maxDiscount)
          : null;
      const parsedUsageLimit =
        usageLimit.trim() !== "" && parseInt(usageLimit, 10) > 0
          ? parseInt(usageLimit, 10)
          : null;

      const payload: Partial<CouponRecord> = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: parsedDiscountValue,
        min_spend: parsedMinSpend,
        max_discount: parsedMaxDiscount,
        usage_limit: parsedUsageLimit,
        expires_at: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
        is_active: isActive,
      };

      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      const apiErr = err as any;
      if (apiErr?.errors && typeof apiErr.errors === "object") {
        const fieldErrors: Record<string, string> = {};
        if (apiErr.errors.code?.[0]) fieldErrors.code = apiErr.errors.code[0];
        if (apiErr.errors.discount_type?.[0]) fieldErrors.discountType = apiErr.errors.discount_type[0];
        if (apiErr.errors.discount_value?.[0]) fieldErrors.discountValue = apiErr.errors.discount_value[0];
        if (apiErr.errors.min_spend?.[0]) fieldErrors.minSpend = apiErr.errors.min_spend[0];
        if (apiErr.errors.max_discount?.[0]) fieldErrors.maxDiscount = apiErr.errors.max_discount[0];
        if (apiErr.errors.usage_limit?.[0]) fieldErrors.usageLimit = apiErr.errors.usage_limit[0];
        if (apiErr.errors.expires_at?.[0]) fieldErrors.expiresAt = apiErr.errors.expires_at[0];
        fieldErrors.form = apiErr.message || "Please correct the highlighted fields.";
        setErrors(fieldErrors);
      } else {
        setErrors({ form: (err as Error)?.message || "Failed to save coupon." });
      }
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
                Configure discount type (Percentage or Flat Amount), minimum order subtotal, and redemption limits.
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
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
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
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                clearFieldError("code");
              }}
              placeholder="e.g. WHOLESALE10, BULK50"
              className={`w-full px-3 py-2 text-xs rounded-xl border bg-background font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-primary ${
                errors.code ? "border-red-500 ring-1 ring-red-500/40" : "border-border"
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
                onChange={(e) => {
                  const newType = e.target.value as CouponDiscountType;
                  setDiscountType(newType);
                  if (newType === "flat") {
                    setMaxDiscount("");
                  }
                  clearFieldError("discountType");
                  clearFieldError("discountValue");
                  clearFieldError("maxDiscount");
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                id="select-modal-discount-type"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount ($)</option>
              </select>
              {errors.discountType && <p className="text-[11px] text-red-500">{errors.discountType}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(e) => {
                    setDiscountValue(sanitizeNumericInput(e.target.value, true));
                    clearFieldError("discountValue");
                  }}
                  placeholder={discountType === "percentage" ? "10" : "50"}
                  className={`w-full pl-3 pr-8 py-2 text-xs rounded-xl border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.discountValue ? "border-red-500 ring-1 ring-red-500/40" : "border-border"
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={minSpend}
                  onChange={(e) => {
                    setMinSpend(sanitizeNumericInput(e.target.value, true));
                    clearFieldError("minSpend");
                  }}
                  placeholder="1000"
                  className={`w-full pl-7 pr-3 py-2 text-xs rounded-xl border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.minSpend ? "border-red-500 ring-1 ring-red-500/40" : "border-border"
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
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Max Discount Cap ($)</span>
                {discountType === "flat" && (
                  <span className="text-[10px] text-muted-foreground font-normal">N/A for Flat</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={discountType === "flat" ? "" : maxDiscount}
                  disabled={discountType === "flat"}
                  onChange={(e) => {
                    setMaxDiscount(sanitizeNumericInput(e.target.value, true));
                    clearFieldError("maxDiscount");
                  }}
                  placeholder={discountType === "flat" ? "N/A for Flat Amount" : "0 (Unlimited)"}
                  className={`w-full pl-7 pr-3 py-2 text-xs rounded-xl border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary ${
                    discountType === "flat"
                      ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                      : errors.maxDiscount
                      ? "border-red-500 ring-1 ring-red-500/40"
                      : "border-border"
                  }`}
                  id="input-max-discount"
                />
              </div>
              {errors.maxDiscount ? (
                <p className="text-[11px] text-red-500">{errors.maxDiscount}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  {discountType === "flat"
                    ? "Flat amount discounts apply directly without percentage capping."
                    : "Optional cap for percentage discounts."}
                </p>
              )}
            </div>
          </div>

          {/* Usage Limit & Expiration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Usage Limit</label>
              <input
                type="text"
                inputMode="numeric"
                value={usageLimit}
                onChange={(e) => {
                  setUsageLimit(sanitizeNumericInput(e.target.value, false));
                  clearFieldError("usageLimit");
                }}
                placeholder="0 (Unlimited)"
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary ${
                  errors.usageLimit ? "border-red-500 ring-1 ring-red-500/40" : "border-border"
                }`}
                id="input-usage-limit"
              />
              {errors.usageLimit ? (
                <p className="text-[11px] text-red-500">{errors.usageLimit}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Maximum total redemptions (leave blank for unlimited).</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Expiration Date</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => {
                  setExpiresAt(e.target.value);
                  clearFieldError("expiresAt");
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer ${
                  errors.expiresAt ? "border-red-500 ring-1 ring-red-500/40" : "border-border"
                }`}
                id="input-expires-at"
              />
              {errors.expiresAt ? (
                <p className="text-[11px] text-red-500">{errors.expiresAt}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Leave blank if the coupon does not expire.</p>
              )}
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
              className="px-4 py-2 text-xs rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-semibold transition-colors cursor-pointer disabled:opacity-50"
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
                  <span>{coupon ? "Updating Coupon..." : "Creating Coupon..."}</span>
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
