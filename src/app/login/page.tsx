"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/services/api-client";
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";

import BrandName from "@/components/common/BrandName";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError) {
        setError(urlError);
        setSessionNotice(null);
        sessionStorage.removeItem("ayaan_login_notice");
      } else {
        const urlNotice = params.get("notice");
        if (urlNotice) {
          setSessionNotice(urlNotice);
        } else {
          const storedNotice = sessionStorage.getItem("ayaan_login_notice");
          if (storedNotice) {
            setSessionNotice(storedNotice);
            sessionStorage.removeItem("ayaan_login_notice");
          } else {
            const msg = sessionStorage.getItem("ayaan_session_expired_message");
            if (msg) {
              setSessionNotice(msg);
              sessionStorage.removeItem("ayaan_session_expired_message");
            }
          }
        }
      }
    }
  }, []);

  const getRedirectUrl = (targetUser?: any) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const rawTarget =
        params.get("returnUrl") ||
        params.get("redirect") ||
        sessionStorage.getItem("ayaan_intended_destination");

      if (rawTarget && rawTarget.startsWith("/") && !rawTarget.startsWith("//") && !rawTarget.includes(":")) {
        sessionStorage.removeItem("ayaan_intended_destination");
        return rawTarget;
      }
    }
    const u = targetUser || user;
    if (u && u.role !== "customer") {
      return "/login";
    }
    return "/dashboard";
  };

  const isRedirectingRef = React.useRef(false);
  // If already logged in as customer, redirect to target or customer dashboard
  React.useEffect(() => {
    if (user && user.role === "customer" && !isRedirectingRef.current) {
      isRedirectingRef.current = true;
      router.push(getRedirectUrl(user));
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);

    if (res.error) {
      const errMsg = typeof res.error === "string" ? res.error : res.error.message || "These credentials cannot be used for customer login.";
      setError(errMsg);
    } else if (res.user && res.user.role === "customer") {
      router.push(getRedirectUrl(res.user));
    } else {
      setError("These credentials cannot be used for customer login.");
    }
  };

  const handleGoogleSignIn = () => {
    setError("");
    setSessionNotice(null);
    setGoogleLoading(true);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ayaan_login_notice");
      sessionStorage.removeItem("ayaan_session_expired_message");
    }
    let target = getRedirectUrl();
    if (target === "/ayc" || target.startsWith("/ayc") || target === "/admin" || target.startsWith("/admin")) {
      target = "/dashboard";
    }
    const apiBase = apiClient.getBaseUrl();
    window.location.href = `${apiBase}/auth/google/redirect?redirect=${encodeURIComponent(target)}`;
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-3">
            <BrandName className="text-2xl font-bold tracking-wider text-foreground" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-sans">
            Sign in to access your orders, track purchases, and manage your profile.
          </p>
        </div>

        {sessionNotice && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-sm flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{sessionNotice}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
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

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Social Authentication — Customer Google Sign-In */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
              Or continue with
            </span>
          </div>
        </div>

        <button
          type="button"
          id="customer-google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-800 dark:text-white font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-amber-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
        </button>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account yet?{" "}
          <Link
            href={typeof window !== "undefined" && window.location.search ? `/signup${window.location.search}` : "/signup"}
            className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}

