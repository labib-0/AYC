"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Mail,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  Inbox,
  ShoppingBag,
} from "lucide-react";
import BrandName from "@/components/common/BrandName";
import { apiClient } from "@/services/api-client";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/lib/AuthContext";
import { sanitizeRedirectUrl } from "@/lib/safe-redirect";

function maskEmail(str: string): string {
  if (!str || !str.includes("@")) return str || "";
  const [local, domain] = str.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { user, refreshSession } = useAuth();

  const statusParam = searchParams.get("status");
  const pendingParam = searchParams.get("pending");
  const idParam = searchParams.get("id");
  const hashParam = searchParams.get("hash");
  const tokenParam = searchParams.get("token");
  const expiresParam = searchParams.get("expires");
  const signatureParam = searchParams.get("signature");
  const emailParam = searchParams.get("email");
  const returnUrlParam = searchParams.get("returnUrl") || searchParams.get("redirect") || "/cart?openCheckout=true";
  const safeReturnUrl = sanitizeRedirectUrl(returnUrlParam, "/cart?openCheckout=true", false);

  const initialEmail = emailParam || user?.email || "";

  const [status, setStatus] = useState<
    "loading" | "pending" | "success" | "already_verified" | "different_browser" | "invalid_or_expired" | "error"
  >(() => {
    if (statusParam === "success") return "success";
    if (statusParam === "already_verified") return "already_verified";
    if (statusParam === "different_browser") return "different_browser";
    if (pendingParam === "1" || statusParam === "pending" || statusParam === "unverified") return "pending";
    if (idParam && (hashParam || tokenParam)) return "loading";
    if (emailParam && !statusParam && !idParam) return "pending";
    if (statusParam) return "invalid_or_expired";
    return "pending";
  });

  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // 60-second cooldown timer state
  const [cooldown, setCooldown] = useState<number>(() => {
    // When newly redirected from registration with pending=1, registration already dispatched an email
    if (pendingParam === "1") return 60;
    return 0;
  });

  // Manual status check states
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Cross-browser password verification state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Ticking cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Keep email synced if auth context or URL updates
  useEffect(() => {
    if (!resendEmail && (emailParam || user?.email)) {
      setResendEmail(emailParam || user?.email || "");
    }
  }, [emailParam, user?.email, resendEmail]);

  // If already verified according to AuthContext, reflect success
  useEffect(() => {
    if (user?.email_verified_at && (status === "pending" || status === "loading")) {
      setStatus("already_verified");
    }
  }, [user?.email_verified_at, status]);

  // Validate signed URL challenge directly from email link click
  useEffect(() => {
    if (status !== "loading") return;

    if (!idParam || !signatureParam || !expiresParam) {
      setStatus("invalid_or_expired");
      return;
    }

    let verifyUrl = `/auth/email/verify/${idParam}/${hashParam || "hash"}?expires=${encodeURIComponent(
      expiresParam
    )}&signature=${encodeURIComponent(signatureParam)}`;

      if (tokenParam) {
        verifyUrl += `&token=${encodeURIComponent(tokenParam)}`;
      }

      apiClient
        .get<{ data?: { already_verified?: boolean } }>(verifyUrl)
        .then((res) => {
          if (refreshSession) {
            refreshSession();
          }
          if (res?.data?.already_verified) {
            setStatus("already_verified");
          } else {
            setStatus("success");
          }
        })
        .catch((err: any) => {
          if (err?.status === 403 && (err?.data?.status === "different_browser" || err?.message?.includes("different browser"))) {
            setStatus("different_browser");
            if (err?.data?.email && !resendEmail) {
              setResendEmail(err.data.email);
            }
          } else {
            setStatus("invalid_or_expired");
          }
        });
  }, [idParam, hashParam, tokenParam, expiresParam, signatureParam, status, resendEmail, refreshSession]);

  // Explicit, rate-limited resend handler
  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resendEmail) {
      setResendError("Please enter your email address.");
      return;
    }
    if (cooldown > 0 || resending) {
      return;
    }

    setResending(true);
    setResendError(null);
    setResendMessage(null);

    try {
      const res = await authService.resendVerificationEmail(resendEmail.trim());
      if (res?.already_verified) {
        setStatus("already_verified");
        if (refreshSession) refreshSession();
        return;
      }
      setResendMessage(
        res?.message || "If an account exists with that email, a fresh verification link has been sent."
      );
      setCooldown(60);
    } catch (err: any) {
      const remSeconds = err?.data?.seconds_remaining || err?.response?.data?.seconds_remaining;
      if (remSeconds && typeof remSeconds === "number") {
        setCooldown(remSeconds);
      }
      const msg = err?.data?.message || err?.response?.data?.message || err?.message || "Failed to resend verification email. Please try again.";
      setResendError(msg);
    } finally {
      setResending(false);
    }
  };

  // Safe status checker (strictly non-mutating — NEVER dispatches email)
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setStatusNotice(null);
    try {
      if (refreshSession) {
        await refreshSession();
      }
      const res = await authService.getVerificationStatus(resendEmail ? resendEmail.trim() : undefined);
      if (res?.is_verified) {
        setStatus("success");
        if (refreshSession) refreshSession();
      } else {
        setStatusNotice("Verification link not clicked yet. Please open the email and click the verification link.");
        setTimeout(() => setStatusNotice(null), 6000);
      }
    } catch {
      setStatusNotice("Could not determine verification status. Please check your inbox or try again.");
      setTimeout(() => setStatusNotice(null), 6000);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Cross-browser password verification fallback
  const handlePasswordVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setPasswordError("Please enter your account password.");
      return;
    }
    if (!tokenParam || !idParam) {
      setPasswordError("Missing verification challenge. Please request a new link.");
      return;
    }

    setVerifyingPassword(true);
    setPasswordError(null);

    try {
      const res = await apiClient.post<any>("/auth/email/verify-with-credentials", {
        id: idParam,
        token: tokenParam,
        password,
      });

      if (refreshSession) {
        await refreshSession();
      }

      if (res?.data?.verified || res?.status === 200 || res?.success) {
        setStatus("success");
      } else {
        setStatus("success");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Password verification failed. Please try again.";
      setPasswordError(msg);
    } finally {
      setVerifyingPassword(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 text-center animate-in fade-in duration-200">
      <div className="mb-6">
        <Link href="/" className="inline-block mb-3">
          <BrandName className="text-2xl font-bold tracking-wider text-foreground" />
        </Link>
      </div>

      {/* ─── LOADING CHALLENGE ────────────────────────────────────────── */}
      {status === "loading" && (
        <div className="py-8">
          <RefreshCw className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verifying Email...</h2>
          <p className="text-sm text-slate-500 mt-2">Please wait while we confirm your security signature.</p>
        </div>
      )}

      {/* ─── PRIMARY VERIFICATION-PENDING SCREEN ─────────────────────── */}
      {status === "pending" && (
        <div className="py-2 text-left">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
            <Mail size={32} />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verify Your Email Address</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              A verification link has been sent to your email. Verifying your email secures your account and ensures you receive order updates.
            </p>
          </div>

          {resendEmail && (
            <div className="p-3.5 mb-5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Sent to:</span>
                <strong className="text-slate-900 dark:text-white truncate font-semibold" title={resendEmail}>
                  {maskEmail(resendEmail)}
                </strong>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                Pending
              </span>
            </div>
          )}

          <div className="p-4 mb-6 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <Inbox size={14} />
              <span>Next Steps:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
              <li>Open your email inbox and look for an email from <strong>AYAAN CLOTHING</strong>.</li>
              <li>Click the verification link inside to activate your account.</li>
              <li>Return here or to your cart to complete your commercial order.</li>
            </ol>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-amber-200/50 dark:border-amber-900/30">
              <span className="font-semibold text-amber-700 dark:text-amber-400">Notice:</span> Be sure to check your spam or junk folder if the email does not appear in your inbox within a couple of minutes.
            </p>
          </div>

          {statusNotice && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}

          {resendMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs">
              {resendMessage}
            </div>
          )}

          {resendError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
              {resendError}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checkingStatus}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {checkingStatus ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>{checkingStatus ? "Checking Status..." : "I've Verified My Email"}</span>
            </button>

            {/* Explicit Resend Action with 60s cooldown */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Didn&apos;t receive the email?</span>
                {cooldown > 0 && (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Resend in {cooldown}s
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleResend()}
                disabled={resending || cooldown > 0 || !resendEmail}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-xs border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <Mail size={13} />
                    <span>Resend available in {cooldown}s</span>
                  </>
                ) : (
                  <>
                    <Mail size={13} />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-3 text-center space-y-2">
              <Link
                href={safeReturnUrl}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ShoppingBag size={14} />
                <span>Return to Cart / Checkout</span>
              </Link>
              <div>
                <Link
                  href="/login"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Sign in with another account
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SUCCESS OR ALREADY VERIFIED ─────────────────────────────── */}
      {(status === "success" || status === "already_verified") && (
        <div className="py-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {status === "already_verified" ? "Email Already Verified" : "Email Successfully Verified"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            Your AYAAN CLOTHING account is active and verified. You have full access to our B2B catalog, custom RFQ inquiries, order placement, and commercial tracking.
          </p>
          <div className="space-y-3">
            <Link
              href={safeReturnUrl}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-md text-sm font-semibold"
            >
              <span>Continue to Checkout</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/products"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs text-sm"
            >
              <ShoppingBag size={16} />
              <span>Browse Catalog</span>
            </Link>
            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm"
            >
              <span>Go to Customer Dashboard</span>
            </Link>
          </div>
        </div>
      )}

      {/* ─── CROSS-BROWSER FALLBACK ──────────────────────────────────── */}
      {status === "different_browser" && (
        <div className="py-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
            <ShieldAlert size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Different Browser Detected</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            For your security, verification links are bound to the browser used to create your account. Please open the link in your original browser, or verify on this device using your password:
          </p>

          {passwordError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs text-left">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordVerification} className="space-y-3 text-left mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyingPassword}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors text-sm disabled:opacity-50"
            >
              {verifyingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck size={16} />}
              <span>{verifyingPassword ? "Verifying..." : "Verify on This Device"}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 space-y-2">
            <p>Alternatively, open the link in the browser where you started registration.</p>
            <Link
              href="/login"
              className="inline-block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      )}

      {/* ─── INVALID OR EXPIRED LINK ─────────────────────────────────── */}
      {(status === "invalid_or_expired" || status === "error") && (
        <div className="py-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
            <AlertCircle size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Link Expired or Invalid
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            This verification link is invalid or has expired (links expire after 60 minutes for security). Enter your email below to receive a fresh verification link.
          </p>

          {resendMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs">
              {resendMessage}
            </div>
          )}

          {resendError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
              {resendError}
            </div>
          )}

          <form onSubmit={handleResend} className="space-y-3 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={resending || cooldown > 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors text-sm disabled:opacity-50"
            >
              {resending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : cooldown > 0 ? (
                <Mail size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}
              <span>
                {resending
                  ? "Sending..."
                  : cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : "Request New Verification Link"}
              </span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-4 text-xs">
            <Link
              href="/login"
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Return to Sign In
            </Link>
            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
            <Link
              href={safeReturnUrl}
              className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
            >
              Back to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 text-center">
            <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500">Loading verification details...</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
