"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  adminCouponService, 
  CouponAdminBindingRecord 
} from "@/services/admin/coupon.service";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  Tag, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  ShieldAlert
} from "lucide-react";
import CouponBindModal from "./CouponBindModal";

export interface CouponAdminBindingsSectionProps {
  showToast: (message: string, type: "success" | "error") => void;
}

export default function CouponAdminBindingsSection({
  showToast,
}: CouponAdminBindingsSectionProps) {
  const [bindings, setBindings] = useState<CouponAdminBindingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBindModalOpen, setIsBindModalOpen] = useState(false);

  // Unbinding state
  const [unbindingId, setUnbindingId] = useState<number | null>(null);
  const [confirmUnbindId, setConfirmUnbindId] = useState<number | null>(null);

  const loadBindings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminCouponService.getBindings();
      setBindings(data);
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to load coupon bindings.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBindings();
  }, [loadBindings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await adminCouponService.getBindings();
      setBindings(data);
      showToast("Coupon bindings refreshed.", "success");
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to refresh bindings.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUnbind = async (bindingId: number) => {
    setUnbindingId(bindingId);
    try {
      await adminCouponService.unbindAdmin(bindingId);
      setBindings((prev) => prev.filter((b) => b.id !== bindingId));
      setConfirmUnbindId(null);
      showToast("Administrator unbound from coupon successfully.", "success");
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Failed to unbind coupon.", "error");
    } finally {
      setUnbindingId(null);
    }
  };

  // Filter bindings by search query
  const filteredBindings = useMemo(() => {
    if (!search.trim()) return bindings;
    const q = search.toLowerCase().trim();
    return bindings.filter((b) => {
      const couponCode = b.coupon?.code?.toLowerCase() || "";
      const adminName = (b.adminUser?.name || b.admin_user?.name || "").toLowerCase();
      const adminEmail = (b.adminUser?.email || b.admin_user?.email || "").toLowerCase();
      return couponCode.includes(q) || adminName.includes(q) || adminEmail.includes(q);
    });
  }, [bindings, search]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-card border border-border rounded-xl shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by admin name/email or coupon code..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            id="input-search-bindings"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsBindModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
            id="btn-open-bind-modal"
          >
            <Plus size={14} />
            <span>Bind Coupon</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Refresh bindings"
            aria-label="Refresh bindings"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-primary" : ""} />
          </button>
        </div>
      </div>

      {/* Bindings Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-secondary/30 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Administrator</th>
                <th className="py-2.5 px-4">Coupon</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Bound At</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span>Loading coupon bindings...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBindings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="p-3 rounded-2xl bg-secondary/50 text-muted-foreground mb-2">
                        <Tag size={24} />
                      </div>
                      <p className="font-semibold text-foreground text-xs">No Coupon Bindings Found</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {search ? "No bindings match your search query." : "Bind a coupon to an administrator to grant scoped sales attribution."}
                      </p>
                      {!search && (
                        <button
                          type="button"
                          onClick={() => setIsBindModalOpen(true)}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-opacity"
                        >
                          <Plus size={13} />
                          <span>Create First Binding</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBindings.map((binding) => {
                  const admin = binding.adminUser || binding.admin_user;
                  const coupon = binding.coupon;
                  const isUnbinding = unbindingId === binding.id;
                  const isConfirming = confirmUnbindId === binding.id;

                  // Determine coupon status badge
                  const isActive = coupon?.is_active ?? true;
                  const isExpired = coupon?.expires_at ? new Date(coupon.expires_at) < new Date() : false;

                  return (
                    <tr 
                      key={binding.id}
                      className="hover:bg-secondary/20 transition-colors group"
                    >
                      {/* Admin Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                            <UserCheck size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {admin?.name || `Admin #${binding.admin_user_id}`}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {admin?.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coupon Column */}
                      <td className="py-3 px-4">
                        {coupon ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">
                              {coupon.code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                              {coupon.discount_type === "percentage" 
                                ? `${coupon.discount_value}% OFF`
                                : `$${Number(coupon.discount_value).toFixed(2)} OFF`}
                            </span>
                            {coupon.min_spend && (
                              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                (min: ${coupon.min_spend})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-mono">
                            Coupon #{binding.coupon_id}
                          </span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock size={11} />
                            <span>Expired</span>
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={11} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                            <XCircle size={11} />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Bound At Column */}
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(binding.created_at)}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4 text-right">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <span className="text-[10px] text-destructive font-medium hidden sm:inline">Confirm?</span>
                            <button
                              type="button"
                              onClick={() => handleUnbind(binding.id)}
                              disabled={isUnbinding}
                              className="px-2 py-1 text-[11px] font-bold rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                              id={`btn-confirm-unbind-${binding.id}`}
                            >
                              {isUnbinding ? <Loader2 size={12} className="animate-spin" /> : "Unbind"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmUnbindId(null)}
                              disabled={isUnbinding}
                              className="px-2 py-1 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmUnbindId(binding.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all cursor-pointer"
                            title="Unbind administrator from this coupon"
                            id={`btn-unbind-${binding.id}`}
                          >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Unbind</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bind Modal */}
      <CouponBindModal
        isOpen={isBindModalOpen}
        onClose={() => setIsBindModalOpen(false)}
        onBindSuccess={loadBindings}
        showToast={showToast}
      />
    </div>
  );
}
