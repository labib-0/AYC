"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  homepageService,
  BangladeshStorefrontAccessState,
} from "@/services/homepage.service";

export interface BangladeshStorefrontAccessCardProps {
  showToast?: (message: string, type: "success" | "error") => void;
  disabled?: boolean;
}

export default function BangladeshStorefrontAccessCard({
  showToast,
  disabled = false,
}: BangladeshStorefrontAccessCardProps) {
  const [accessState, setAccessState] = useState<BangladeshStorefrontAccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Confirmation modal state
  const [pendingTargetState, setPendingTargetState] = useState<boolean | null>(null);

  // Fetch real authoritative state from backend
  const fetchState = useCallback(async () => {
    try {
      setError(null);
      const data = await homepageService.getBangladeshStorefrontAccess();
      setAccessState(data);
      if (data?.error) {
        setError(data.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to retrieve access control status.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Click on toggle initiates confirmation
  const handleToggleClick = () => {
    if (disabled || updating) return;
    const currentEnabled = accessState ? accessState.enabled : true;
    const targetState = !currentEnabled;
    setPendingTargetState(targetState);
  };

  // User confirms the action in modal
  const handleConfirmToggle = async () => {
    if (pendingTargetState === null) return;
    const target = pendingTargetState;
    setPendingTargetState(null);
    setUpdating(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const updated = await homepageService.updateBangladeshStorefrontAccess(target);
      setAccessState(updated);
      const actionMsg = target
        ? "Bangladesh storefront access restricted. Customer storefront is now blocked in Bangladesh."
        : "Bangladesh storefront access restored. Customer storefront is now accessible in Bangladesh.";
      setSuccessNotice("Bangladesh storefront access updated. Traffic changes may take a short time to propagate.");
      showToast?.(actionMsg, "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to update Bangladesh storefront access. The Cloudflare configuration was not changed.";
      setError(msg);
      showToast?.(msg, "error");
      // Re-fetch authoritative state on error to guarantee UI integrity
      await fetchState();
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelModal = () => {
    setPendingTargetState(null);
  };

  const isCloudflareVerified = Boolean(
    accessState?.cloudflare_configured && !accessState?.error && accessState?.status !== "unverified"
  );
  const isBlocked = isCloudflareVerified ? Boolean(accessState?.enabled) : false;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm transition-all">
        {/* Subtle background security accent */}
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-15 transition-colors ${
            !isCloudflareVerified ? "bg-amber-500" : isBlocked ? "bg-rose-500" : "bg-emerald-500"
          }`}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left Column: Title, Description, Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  !isCloudflareVerified
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : isBlocked
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                }`}
              >
                {!isCloudflareVerified ? (
                  <AlertTriangle size={18} />
                ) : isBlocked ? (
                  <ShieldAlert size={18} />
                ) : (
                  <ShieldCheck size={18} />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-foreground">
                  Bangladesh Storefront Access
                </h3>
                <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border/50">
                  Security Control
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
              Block customer storefront access from Bangladesh IP addresses. Admin portal (
              <span className="font-mono text-foreground font-medium">/ayc</span>), REST APIs, and media assets remain globally accessible.
            </p>

            {/* Real-time Status Badge */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Verifying real-time edge rules…</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      !isCloudflareVerified
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        : isBlocked
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        !isCloudflareVerified
                          ? "bg-amber-500"
                          : isBlocked
                          ? "bg-rose-500 animate-pulse"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span>
                      {!isCloudflareVerified
                        ? "● Cloudflare Protection Not Verified"
                        : isBlocked
                        ? "● Storefront blocked in Bangladesh"
                        : "● Storefront accessible in Bangladesh"}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-muted-foreground">
                    [
                    {isCloudflareVerified
                      ? "Cloudflare Protection Active"
                      : "Cloudflare Protection Not Verified"}
                    ]
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Toggle Control */}
          <div className="flex items-center gap-3 sm:self-center shrink-0">
            {updating && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span>Updating…</span>
              </div>
            )}

            <button
              type="button"
              id="bangladesh-storefront-access-toggle"
              onClick={handleToggleClick}
              disabled={disabled || updating}
              className={`group relative inline-flex h-9 items-center rounded-xl p-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                isBlocked
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                  : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
              }`}
              title={
                !isCloudflareVerified
                  ? "Cloudflare protection not verified. Click to configure."
                  : isBlocked
                  ? "Click to disable Bangladesh storefront restriction"
                  : "Click to enable Bangladesh storefront restriction"
              }
            >
              <div className="flex items-center gap-2 px-3">
                <span className="text-xs font-mono font-bold tracking-wider">
                  {isBlocked ? "[ ON ]" : "[ OFF ]"}
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-lg bg-white/20 transition-transform ${
                    isBlocked ? "translate-x-0" : "translate-x-0"
                  }`}
                >
                  {updating ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isBlocked ? "bg-white" : "bg-muted-foreground"
                      }`}
                    />
                  )}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Success Notice / Propagation Note */}
        {successNotice && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">
              <span>{successNotice}</span>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-800 dark:text-rose-300">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* CONFIRMATION DIALOG MODAL                                            */}
      {/* ==================================================================== */}
      {pendingTargetState !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  pendingTargetState
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {pendingTargetState ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
              </div>
              <div>
                <h4 className="text-base font-display font-bold text-foreground">
                  {pendingTargetState
                    ? "Enable Bangladesh Storefront Block?"
                    : "Disable Bangladesh Storefront Block?"}
                </h4>
                <p className="text-xs text-muted-foreground font-mono">
                  Target Status: {pendingTargetState ? "BLOCK (ON)" : "ALLOW (OFF)"}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {pendingTargetState
                ? "Customer storefront requests from Bangladesh IP addresses will be blocked with the regional restriction page (HTTP 403). Admin portal and backend APIs will remain accessible."
                : "Customer storefront access from Bangladesh IP addresses will be restored. Visitors from Bangladesh will be able to browse the catalog and purchase products."}
            </p>

            <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5 text-xs text-muted-foreground">
              <Info size={14} className="shrink-0 text-primary" />
              <span>
                Changes apply immediately at the edge and origin reverse proxy.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelModal}
                disabled={updating}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={updating}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
                  pendingTargetState
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
