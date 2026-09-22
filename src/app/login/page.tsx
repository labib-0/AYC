"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";

import BrandName from "@/components/common/BrandName";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getRedirectUrl = (targetUser?: any) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const target = params.get("redirect");
      if (target && target.startsWith("/") && !target.startsWith("//")) {
        return target;
      }
    }
    const u = targetUser || user;
    if (u?.role === "admin") return "/admin";
    return "/dashboard";
  };

  // If already logged in, redirect to target or role-based dashboard
  React.useEffect(() => {
    if (user) {
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
      const errMsg = typeof res.error === "string" ? res.error : res.error.message || "Failed to sign in. Please verify your credentials.";
      setError(errMsg);
    } else {
      router.push(getRedirectUrl(res.user));
    }
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
            disabled={loading}
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

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/signup"
            className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
