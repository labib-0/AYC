"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/services/api-client";
import { useAuth } from "@/lib/AuthContext";
import BrandName from "@/components/common/BrandName";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");
    const rawRedirect = searchParams.get("redirect");

    if (error) {
      setErrorMessage(decodeURIComponent(error));
      const timer = setTimeout(() => {
        router.replace(`/login?error=${encodeURIComponent(error)}`);
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (!token) {
      setErrorMessage("No authentication token provided.");
      const timer = setTimeout(() => {
        router.replace("/login");
      }, 2500);
      return () => clearTimeout(timer);
    }

    // Sanitize redirect target to prevent open redirect attacks
    let target = "/dashboard";
    if (rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") && !rawRedirect.startsWith("/\\") && !rawRedirect.includes("\\")) {
      target = rawRedirect;
    }

    // Complete token registration and session hydration
    try {
      apiClient.setToken(token);
      setIsSuccess(true);

      refreshSession()
        .then(() => {
          router.replace(target);
        })
        .catch((err) => {
          console.warn("Failed to refresh user profile post-OAuth:", err);
          router.replace(target);
        });
    } catch (err: any) {
      console.error("Failed to store authentication token:", err);
      setErrorMessage(err?.message || "Failed to finalize session.");
    }
  }, [searchParams, router, refreshSession]);

  if (errorMessage) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertCircle size={26} />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-2">
            Sign-In Error
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            {errorMessage}
          </p>
          <Link
            href="/login"
            className="inline-block py-2.5 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm rounded-xl transition-all"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-4">
          <BrandName className="text-2xl font-bold tracking-wider text-foreground" />
        </div>

        {isSuccess ? (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-200">
              <CheckCircle2 size={26} />
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-1.5">
              Authenticated
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Redirecting you to your account...
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <div className="w-9 h-9 border-3 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-1.5">
              Completing Sign-In
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verifying your Google credentials and preparing your dashboard...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
