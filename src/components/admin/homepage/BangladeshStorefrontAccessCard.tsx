"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Loader2,
  AlertTriangle,
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

  // Fetch authoritative state from backend
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
        ? "Storefront access is restricted in Bangladesh."
        : "Storefront is currently accessible.";
      setSuccessNotice(actionMsg);
      showToast?.(actionMsg, "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to update access control. Please try again.";
      setError(msg);
      showToast?.(msg, "error");
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
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left Column: Title, Description, Concise Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                  isBlocked
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                }`}
              >
                {isBlocked ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                Storefront Access
              </h2>
            </div>

            <p className="text-xs text-muted-foreground">
              Restrict storefront access from Bangladesh
            </p>

            {/* Concise Status Indicator */}
            <div className="pt-0.5">
              {loading ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Checking status…</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isBlocked ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                  <span className="text-xs font-medium text-foreground">
                    {isBlocked
                      ? "Storefront access is restricted in Bangladesh."
                      : "Storefront is currently accessible."}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Segmented ON / OFF Control */}
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <div
              className={`inline-flex items-center p-1 rounded-full border border-border bg-secondary/60 ${
                disabled || updating || loading ? "opacity-60 pointer-events-none" : ""
              }`}
              role="group"
              aria-label="Storefront Access"
            >
              {/* OFF = Storefront Accessible */}
              <button
                type="button"
                id="btn-bangladesh-access-off"
                onClick={() => handleToggleClick(false)}
                disabled={disabled || updating || loading}
                aria-pressed={!isBlocked}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  !isBlocked
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                OFF
              </button>

              {/* ON = Storefront Restricted */}
              <button
                type="button"
                id="btn-bangladesh-access-on"
                onClick={() => handleToggleClick(true)}
                disabled={disabled || updating || loading}
                aria-pressed={isBlocked}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  isBlocked
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ON
              </button>
            </div>

            {updating && (
              <Loader2 size={13} className="animate-spin text-primary" />
            )}
          </div>
        </div>

        {/* Notices */}
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successNotice && !error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
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
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  pendingTargetState
                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                }`}
              >
                {pendingTargetState ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
              </div>
              <div>
                <h4 id="confirm-modal-title" className="text-sm sm:text-base font-bold text-foreground">
                  {pendingTargetState
                    ? "Block the customer storefront for visitors from Bangladesh?"
                    : "Allow the customer storefront for visitors from Bangladesh?"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Storefront Access Setting
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {pendingTargetState ? (
                <>
                  Turning this <strong className="text-foreground">ON</strong> will restrict storefront access for visitors from Bangladesh. Admin portal access remains unaffected.
                </>
              ) : (
                <>
                  Turning this <strong className="text-foreground">OFF</strong> will restore customer storefront access for visitors in Bangladesh.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-bangladesh-toggle"
                onClick={handleCancelModal}
                disabled={updating}
                className="px-3.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-bangladesh-toggle"
                onClick={handleConfirmToggle}
                disabled={updating}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white shadow-xs transition-opacity cursor-pointer flex items-center gap-1.5 ${
                  pendingTargetState
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {updating && <Loader2 size={12} className="animate-spin" />}
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
