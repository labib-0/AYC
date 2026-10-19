"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import BrandName from "@/components/common/BrandName";
import { apiClient } from "@/services/api-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statusParam = searchParams.get("status");
  const idParam = searchParams.get("id");
  const hashParam = searchParams.get("hash");
  const tokenParam = searchParams.get("token");
  const expiresParam = searchParams.get("expires");
  const signatureParam = searchParams.get("signature");
  const emailParam = searchParams.get("email");

  const [status, setStatus] = useState<
    "loading" | "success" | "already_verified" | "different_browser" | "invalid_or_expired" | "unverified" | "error"
  >(
    statusParam === "success"
      ? "success"
      : statusParam === "already_verified"
      ? "already_verified"
      : statusParam === "different_browser"
      ? "different_browser"
      : statusParam === "unverified"
      ? "unverified"
      : statusParam
      ? "invalid_or_expired"
      : idParam && (hashParam || tokenParam)
      ? "loading"
      : "invalid_or_expired"
  );

  const [resendEmail, setResendEmail] = useState(emailParam || "");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // Cross-browser password verification state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    // If URL contains signed parameters, verify via API directly
    if (idParam && expiresParam && signatureParam && status === "loading") {
      let verifyUrl = `/auth/email/verify/${idParam}/${hashParam || "hash"}?expires=${encodeURIComponent(
        expiresParam
      )}&signature=${encodeURIComponent(signatureParam)}`;

      if (tokenParam) {
        verifyUrl += `&token=${encodeURIComponent(tokenParam)}`;
      }

      apiClient
        .get<{ data?: { already_verified?: boolean } }>(verifyUrl)
        .then((res) => {
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
    }
  }, [idParam, hashParam, tokenParam, expiresParam, signatureParam, status, resendEmail]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) {
      setResendError("Please enter your email address.");
      return;
    }

    setResending(true);
    setResendError(null);
    setResendMessage(null);

    try {
      const res = await apiClient.post<any>("/auth/email/verification-notification", {
        email: resendEmail.trim(),
      });
      setResendMessage(
        res?.message || "If an account exists with that email, a new verification link has been sent."
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to resend verification email. Please try again.";
      setResendError(msg);
    } finally {
      setResending(false);
    }
  };

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
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 text-center">
      <div className="mb-6">
        <Link href="/" className="inline-block mb-3">
          <BrandName className="text-2xl font-bold tracking-wider text-foreground" />
        </Link>
      </div>

      {status === "loading" && (
        <div className="py-8">
          <RefreshCw className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verifying Email...</h2>
          <p className="text-sm text-slate-500 mt-2">Please wait while we confirm your security signature.</p>
        </div>
      )}

      {(status === "success" || status === "already_verified") && (
        <div className="py-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {status === "already_verified" ? "Email Already Verified" : "Email Successfully Verified"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            Your AYAAN CLOTHING account is active and verified. You have full access to our B2B catalog, custom RFQ inquiries, order tracking, and account management.
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors shadow-md"
            >
              <span>Go to Customer Dashboard</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="w-full inline-block py-2.5 px-4 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      )}

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

      {(status === "invalid_or_expired" || status === "unverified") && (
        <div className="py-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
            <AlertCircle size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {status === "unverified" ? "Email Verification Required" : "Link Expired or Invalid"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {status === "unverified"
              ? "Please verify your email address to access your complete customer account. Enter your email below to request a new link."
              : "This verification link is invalid or has expired (links expire after 60 minutes for security). Enter your email below to receive a fresh verification link."}
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
              disabled={resending}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors text-sm disabled:opacity-50"
            >
              {resending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck size={16} />}
              <span>{resending ? "Sending..." : "Resend Verification Link"}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
            <Link
              href="/login"
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Return to Sign In
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
