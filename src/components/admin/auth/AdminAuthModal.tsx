"use client";

import React, { useState } from "react";
import { Lock, Mail, AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export default function AdminAuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Authentication Required",
  message = "Your administrator session has expired or is required to publish this product. All entered configuration and draft data have been preserved.",
}: AdminAuthModalProps) {
  const { signInAdmin } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signInAdmin(email, password);
      if (res?.error) {
        setError(res.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to authenticate administrator.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-md bg-card border border-border/90 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auth-modal-title"
      >
        {/* Header Icon + Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-2xs">
            <KeyRound size={22} />
          </div>
          <h2 id="admin-auth-modal-title" className="text-base sm:text-lg font-bold font-display text-foreground uppercase tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-foreground uppercase tracking-wider block mb-1">
              Admin Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ayaanclothing.com"
                required
                disabled={loading}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-foreground uppercase tracking-wider block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-bold uppercase tracking-wider transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In & Continue</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
