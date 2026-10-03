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
  const handleToggleClick = (targetState: boolean) => {
    if (disabled || updating || loading) return;
    if (accessState && accessState.enabled === targetState) return;
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
      setSuccessNotice(actionMsg);
      showToast?.(actionMsg, "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to update Bangladesh storefront access. Please try again.";
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

  const isBlocked = Boolean(accessState?.enabled);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs transition-all">
        {/* Subtle background security accent */}
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-15 transition-colors ${
            isBlocked ? "bg-rose-500" : "bg-emerald-500"
          }`}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left Column: Title, Description, Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  isBlocked
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                }`}
              >
                {isBlocked ? (
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
              Block customer storefront access from Bangladesh IP addresses using Laravel application-level GeoIP security. Admin portal (
              <span className="font-mono text-foreground font-medium">/ayc</span>), REST APIs, and storage assets remain globally accessible.
            </p>

            {/* Real-time Status Badge */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Checking access status…</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      isBlocked
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isBlocked ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                      }`}
                    />
                    <span>
                      {isBlocked
                        ? "Storefront blocked in Bangladesh"
                        : "Storefront accessible in Bangladesh"}
                    </span>
                  </div>

                  {accessState?.driver && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      (GeoIP: {accessState.driver.split("\\").pop()})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Segmented ON / OFF Control */}
          <div className="flex flex-col sm:items-end gap-2 pt-2 sm:pt-0 shrink-0">
            <div
              className={`inline-flex items-center p-1 rounded-full border border-border bg-secondary/60 ${
                disabled || updating || loading ? "opacity-60 pointer-events-none" : ""
              }`}
              role="group"
              aria-label="Bangladesh Storefront Access Control"
            >
              {/* OFF = Storefront Accessible */}
              <button
                type="button"
                id="btn-bangladesh-access-off"
                onClick={() => handleToggleClick(false)}
                disabled={disabled || updating || loading}
                aria-pressed={!isBlocked}
                className={`relative px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  !isBlocked
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                OFF
              </button>

              {/* ON = Storefront Blocked */}
              <button
                type="button"
                id="btn-bangladesh-access-on"
                onClick={() => handleToggleClick(true)}
                disabled={disabled || updating || loading}
                aria-pressed={isBlocked}
                className={`relative px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isBlocked
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ON
              </button>
            </div>

            {updating && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin text-primary" />
                <span>Persisting security state…</span>
              </div>
            )}
          </div>
        </div>

        {/* Informational Message Banner */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successNotice && !error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            <div className="flex-1">{successNotice}</div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {pendingTargetState !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-0 duration-150"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  pendingTargetState
                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                }`}
              >
                {pendingTargetState ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
              </div>
              <div>
                <h4 id="confirm-modal-title" className="text-base font-bold text-foreground">
                  {pendingTargetState
                    ? "Enable Bangladesh Storefront Block?"
                    : "Disable Bangladesh Storefront Block?"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Authoritative security setting modification
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {pendingTargetState ? (
                <>
                  Turning this <strong className="text-foreground">ON</strong> will immediately block customer storefront page access for all visitors connecting from Bangladesh IP addresses (HTTP 403 regional notice).
                  <br />
                  <br />
                  <span className="text-foreground font-medium">Notice:</span> The admin portal (<code className="font-mono text-foreground font-semibold">/ayc</code>) and API endpoints will remain accessible.
                </>
              ) : (
                <>
                  Turning this <strong className="text-foreground">OFF</strong> will immediately restore normal storefront access for visitors in Bangladesh.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-bangladesh-toggle"
                onClick={handleCancelModal}
                disabled={updating}
                className="px-4 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-bangladesh-toggle"
                onClick={handleConfirmToggle}
                disabled={updating}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-opacity cursor-pointer flex items-center gap-2 ${
                  pendingTargetState
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {updating && <Loader2 size={13} className="animate-spin" />}
                <span>
                  {pendingTargetState ? "Confirm Block (ON)" : "Confirm Access (OFF)"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
