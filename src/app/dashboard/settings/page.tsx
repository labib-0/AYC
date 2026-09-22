"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Building2,
} from "lucide-react";

// ─── Sign Out Confirmation Modal ──────────────────────────────────────────────

interface SignOutModalProps {
  isOpen: boolean;
  isLoggingOut: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function SignOutModal({
  isOpen,
  isLoggingOut,
  onClose,
  onConfirm,
}: SignOutModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoggingOut) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoggingOut]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={() => {
        if (!isLoggingOut) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/40">
            <LogOut size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3
              id="signout-modal-title"
              className="text-base font-bold font-display text-slate-900 dark:text-white"
            >
              Sign Out of B2B Portal?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Your active workspace session will be closed. You can sign back in anytime with your commercial credentials.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <span>Sign Out</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, updateProfile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  // Personal Info Form State
  const [personalData, setPersonalData] = useState({
    name: "",
    phone: "",
  });
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalSuccess, setPersonalSuccess] = useState<string | null>(null);
  const [personalError, setPersonalError] = useState<string | null>(null);

  // Security Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Logout Modal State
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      setPersonalData({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPersonal(true);
    setPersonalError(null);
    setPersonalSuccess(null);

    if (!personalData.name.trim()) {
      setPersonalError("Full Name is required.");
      setSavingPersonal(false);
      return;
    }

    try {
      const res = await updateProfile({
        name: personalData.name.trim(),
        phone: personalData.phone.trim(),
      });

      if (res?.error) {
        setPersonalError(
          typeof res.error === "string" ? res.error : "Failed to update profile information."
        );
      } else {
        setPersonalSuccess("Personal contact information updated successfully.");
        setTimeout(() => setPersonalSuccess(null), 4000);
      }
    } catch (err: any) {
      setPersonalError(err?.message || "Failed to update personal details.");
    } finally {
      setSavingPersonal(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters in length.");
      setSavingPassword(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match. Please re-enter.");
      setSavingPassword(false);
      return;
    }

    try {
      const res = await updateProfile({
        ...user,
        password: passwordData.newPassword,
      } as any);

      if (res?.error) {
        setPasswordError(
          typeof res.error === "string" ? res.error : "Failed to update password."
        );
      } else {
        setPasswordSuccess("Password updated successfully.");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => setPasswordSuccess(null), 4000);
      }
    } catch (err: any) {
      setPasswordError(err?.message || "An unexpected error occurred while updating password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setShowSignOutModal(false);
      router.push("/login");
    } catch {
      setIsLoggingOut(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 w-40 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4 animate-pulse">
          <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="h-10 w-full bg-slate-100 dark:bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
          Session Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Please log in to manage your security and account preferences.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
          Account Settings &amp; Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal credentials, contact details, and active authentication session.
        </p>
      </div>

      {/* 1. Personal Information */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-slate-100 dark:border-white/10 pb-4">
          <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-amber-500" />
            <span>Personal Information</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your representative contact name and telephone for order updates.
          </p>
        </div>

        {personalSuccess && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {personalSuccess}
            </span>
          </div>
        )}

        {personalError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center gap-2.5 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-xs font-semibold text-red-800 dark:text-red-200">
              {personalError}
            </span>
          </div>
        )}

        <form onSubmit={handlePersonalSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="personal_name"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="personal_name"
                  type="text"
                  required
                  value={personalData.name}
                  onChange={(e) =>
                    setPersonalData((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Your Full Name"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Direct Phone */}
            <div className="space-y-1.5">
              <label
                htmlFor="personal_phone"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Phone / Mobile
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="personal_phone"
                  type="tel"
                  value={personalData.phone}
                  onChange={(e) =>
                    setPersonalData((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="+1 (555) 019-2834"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Email (Read only) */}
            <div className="sm:col-span-2 space-y-1.5">
              <label
                htmlFor="personal_email"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="personal_email"
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Email address is linked to your authenticated buyer identity.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPersonal}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {savingPersonal ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Security & Password */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-slate-100 dark:border-white/10 pb-4">
          <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Password &amp; Security</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Update your commercial buyer portal password (minimum 6 characters).
          </p>
        </div>

        {passwordSuccess && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {passwordSuccess}
            </span>
          </div>
        )}

        {passwordError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center gap-2.5 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-xs font-semibold text-red-800 dark:text-red-200">
              {passwordError}
            </span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="new_password"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="new_password"
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirm_password"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="confirm_password"
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Session & Sign Out */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Active Session</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Signed in as <strong className="text-slate-700 dark:text-slate-300">{user.email}</strong> ({user.company_name || "Commercial Buyer"}).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSignOutModal(true)}
          className="px-5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Sign Out Modal */}
      <SignOutModal
        isOpen={showSignOutModal}
        isLoggingOut={isLoggingOut}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleSignOutConfirm}
      />
    </div>
  );
}
