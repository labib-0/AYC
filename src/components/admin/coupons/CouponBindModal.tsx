"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Shield, Tag, UserCheck, Loader2, Check, AlertCircle } from "lucide-react";
import { adminCouponService, CouponRecord } from "@/services/admin/coupon.service";

export interface CouponBindModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBindSuccess: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

interface EligibleAdmin {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function CouponBindModal({
  isOpen,
  onClose,
  onBindSuccess,
  showToast,
}: CouponBindModalProps) {
  const [adminSearch, setAdminSearch] = useState("");
  const [couponSearch, setCouponSearch] = useState("");

  const [admins, setAdmins] = useState<EligibleAdmin[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);

  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);

  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Admins
  const fetchAdmins = useCallback(async (query: string) => {
    setLoadingAdmins(true);
    try {
      const data = await adminCouponService.getEligibleAdmins(query);
      setAdmins(data);
    } catch {
      // Fallback
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  // Fetch Coupons
  const fetchCoupons = useCallback(async (query: string) => {
    setLoadingCoupons(true);
    try {
      const data = await adminCouponService.getCoupons({ search: query, status: "active" });
      setCoupons(data);
    } catch {
      // Fallback
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  // Load initial data on open
  useEffect(() => {
    if (isOpen) {
      setSelectedAdminId(null);
      setSelectedCouponId(null);
      setAdminSearch("");
      setCouponSearch("");
      setError(null);
      fetchAdmins("");
      fetchCoupons("");
    }
  }, [isOpen, fetchAdmins, fetchCoupons]);

  // Debounced search for admins
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchAdmins(adminSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [adminSearch, isOpen, fetchAdmins]);

  // Debounced search for coupons
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchCoupons(couponSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [couponSearch, isOpen, fetchCoupons]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminId || !selectedCouponId) {
      setError("Please select both an administrator and a coupon.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await adminCouponService.bindAdmin(selectedCouponId, selectedAdminId);
      showToast("Coupon successfully bound to administrator.", "success");
      onBindSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to create coupon-admin binding.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAdmin = admins.find((a) => a.id === selectedAdminId);
  const selectedCoupon = coupons.find((c) => c.id === selectedCouponId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Shield size={18} />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-display font-bold uppercase tracking-tight text-foreground">
                Bind Coupon to Administrator
              </h2>
              <p className="text-xs text-muted-foreground">
                Grant sales attribution and order visibility scope for this coupon to a specific admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Select Admin */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center justify-between">
              <span>1. Select Administrator</span>
              {selectedAdmin && (
                <span className="text-[11px] text-primary lowercase font-medium">
                  selected: {selectedAdmin.name} ({selectedAdmin.email})
                </span>
              )}
            </label>

            {/* Admin Search Bar */}
            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Search admin by name or email..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              {loadingAdmins && (
                <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Admin Selection Cards */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 border border-border/60 rounded-xl p-1.5 bg-secondary/10">
              {admins.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  {loadingAdmins ? "Loading administrators..." : "No eligible administrators found."}
                </div>
              ) : (
                admins.map((adm) => {
                  const isSelected = selectedAdminId === adm.id;
                  return (
                    <button
                      key={adm.id}
                      type="button"
                      onClick={() => {
                        setSelectedAdminId(adm.id);
                        setError(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "hover:bg-secondary/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCheck size={14} className={isSelected ? "text-primary-foreground" : "text-muted-foreground"} />
                        <span className="truncate">{adm.name}</span>
                        <span className={`text-[11px] truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          ({adm.email})
                        </span>
                      </div>
                      {isSelected && <Check size={14} className="shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 2: Select Coupon */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center justify-between">
              <span>2. Select Coupon</span>
              {selectedCoupon && (
                <span className="text-[11px] text-primary lowercase font-medium">
                  selected: {selectedCoupon.code}
                </span>
              )}
            </label>

            {/* Coupon Search Bar */}
            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                placeholder="Search coupon by code (e.g. AYC-SUMMER)..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              {loadingCoupons && (
                <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Coupon Selection Cards */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-border/60 rounded-xl p-1.5 bg-secondary/10">
              {coupons.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  {loadingCoupons ? "Loading coupons..." : "No active coupons found."}
                </div>
              ) : (
                coupons.map((c) => {
                  const isSelected = selectedCouponId === c.id;
                  const discountStr = c.discount_type === "percentage" 
                    ? `${c.discount_value}% OFF` 
                    : `$${Number(c.discount_value).toFixed(2)} OFF`;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCouponId(c.id);
                        setError(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "hover:bg-secondary/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Tag size={13} className={isSelected ? "text-primary-foreground" : "text-primary"} />
                        <span className="font-mono font-bold">{c.code}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          isSelected ? "bg-white/20 text-white" : "bg-secondary text-secondary-foreground"
                        }`}>
                          {discountStr}
                        </span>
                        {c.min_spend && (
                          <span className={`text-[10px] ${isSelected ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                            Min: ${c.min_spend}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={14} className="shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedAdminId || !selectedCouponId || submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
              id="btn-confirm-binding"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Binding...</span>
                </>
              ) : (
                <span>Confirm Binding</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
