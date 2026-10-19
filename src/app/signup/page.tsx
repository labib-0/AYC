"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Lock, Mail, User, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Phone } from "lucide-react";
import BrandName from "@/components/common/BrandName";
import { sanitizeRedirectUrl } from "@/lib/safe-redirect";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationSentEmail, setVerificationSentEmail] = useState<string | null>(null);

  const maskEmail = (str: string) => {
    const [local, domain] = str.split("@");
    if (!domain) return str;
    if (local.length <= 2) return `${local}***@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  };

  const getRedirectUrl = (_targetUser?: any) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const rawTarget =
        params.get("returnUrl") ||
        params.get("redirect") ||
        sessionStorage.getItem("ayaan_intended_destination");

      if (rawTarget) {
        sessionStorage.removeItem("ayaan_intended_destination");
        return sanitizeRedirectUrl(rawTarget, "/dashboard", false);
      }
    }
    return "/dashboard";
  };

  const isRedirectingRef = React.useRef(false);
  // If already logged in, redirect to intended target or dashboard
  React.useEffect(() => {
    if (user && !isRedirectingRef.current) {
      isRedirectingRef.current = true;
      router.push(getRedirectUrl(user));
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName || !email || !password) {
      setError("Please fill in all required fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const res = await signUp(email, password, fullName, phone ? { phone } : undefined);
    setLoading(false);

    if (res.error) {
      const errMsg = typeof res.error === "string" ? res.error : res.error.message || "Failed to create account. Please try again.";
      setError(errMsg);
    } else if ((res as any)?.requires_verification) {
      setVerificationSentEmail((res as any)?.email || email);
    } else {
      router.push(getRedirectUrl(res.user));
    }
  };

  if (verificationSentEmail) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <Link href="/" className="inline-block mb-3">
              <BrandName className="text-2xl font-bold tracking-wider text-foreground" />
            </Link>
          </div>
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
            <Mail size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verify Your Email</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            We sent a secure verification link to{" "}
            <strong className="text-slate-900 dark:text-white font-semibold">
              {maskEmail(verificationSentEmail)}
            </strong>
            . Please open the link in <strong className="text-amber-600 dark:text-amber-400">this browser</strong> to complete your account setup.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 text-left mb-6 space-y-1.5">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Quick Tips:</p>
            <p>&bull; The verification link is time-limited and valid for 60 minutes.</p>
            <p>&bull; For security, please keep this browser open while checking your inbox.</p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full inline-block py-3 px-4 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors shadow-md text-sm"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-3">
            <BrandName className="text-2xl font-bold tracking-wider text-foreground" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-sans">
            Join AYAAN CLOTHING to track orders, manage purchases, and enjoy fast checkout.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Name"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-white/[0.04] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-white/[0.04] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-white/[0.04] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-1">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>Secure encryption & privacy guarantee</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            href={typeof window !== "undefined" && window.location.search ? `/login${window.location.search}` : "/login"}
            className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
