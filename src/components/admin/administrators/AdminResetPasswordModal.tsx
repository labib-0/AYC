"use client";

import React, { useState } from "react";
import { X, KeyRound, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { AdminUserRecord } from "@/services/admin/admin-user.service";

export interface AdminResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminUserRecord | null;
  onReset: (adminId: number | string, newPassword: string) => Promise<void>;
}

export default function AdminResetPasswordModal({
  isOpen,
  onClose,
  admin,
  onReset,
}: AdminResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !admin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await onReset(admin.id, password);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <KeyRound size={16} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                Reset Administrator Password
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Target: <strong className="text-foreground">{admin.name}</strong> ({admin.email})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
                New Password (min 8 chars) *
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Resetting the password will immediately revoke all active sessions and Sanctum auth tokens for this administrator.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              {submitting ? "Resetting..." : "Confirm Password Reset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
