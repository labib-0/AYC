"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/services/api-client";
import { useAuth } from "@/lib/AuthContext";
import BrandName from "@/components/common/BrandName";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { sanitizeRedirectUrl } from "@/lib/safe-redirect";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const executingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const error = searchParams.get("error");
    const rawRedirect = searchParams.get("redirect");
    const legacyToken = searchParams.get("token");
    const ticket = searchParams.get("ticket");

    if (error) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("ayaan_login_notice");
      }
      setErrorMessage(decodeURIComponent(error));
      const timer = setTimeout(() => {
        router.replace(`/login?error=${encodeURIComponent(error)}`);
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (executingRef.current) {
      return;
    }
    executingRef.current = true;

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ayaan_session_expired_message");
    }

    // Sanitize redirect target to prevent open redirect attacks and protect customer boundary
    let target = sanitizeRedirectUrl(rawRedirect, "/dashboard", false);

    const completeAuthentication = async () => {
      try {
        let tokenToSet: string | null = null;

        // Secure exchange handoff (HttpOnly cookie / session ticket)
        if (!legacyToken) {
          try {
            const res = await apiClient.post<any>("/auth/google/exchange", {
              ticket: ticket || undefined,
            });
            const authData = "data" in res && res.data ? res.data : res;
            if (authData?.user && authData.user.role !== "customer") {
              throw new Error("Google Sign-In is restricted to customer accounts only. Administrators must sign in using the admin login page at /ayc.");
            }
            if (authData?.token) {
              tokenToSet = authData.token;
              if (authData.redirect) {
                target = sanitizeRedirectUrl(authData.redirect, target, false);
              }
            } else {
              throw new Error(authData?.message || "Invalid authentication exchange response from server.");
            }
          } catch (exchangeErr: any) {
            // Graceful fallback: If exchange fails (e.g. ticket was consumed in an earlier request),
            // check if token is already established in apiClient.
            const existingToken = apiClient.getToken();
            if (existingToken) {
              tokenToSet = existingToken;
            } else {
              throw exchangeErr;
            }
          }
        } else {
          // Backward compatibility fallback if legacy token was provided
          tokenToSet = legacyToken;
        }

        if (!tokenToSet) {
          throw new Error("No authentication token received.");
        }

        // Register token in API client
        const token = tokenToSet;
        apiClient.setToken(token);
        if (isMounted) setIsSuccess(true);

        // Clear any stale login notice or expired session messages
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("ayaan_login_notice");
          sessionStorage.removeItem("ayaan_session_expired_message");
        }

        // Hydrate customer profile
        try {
          await refreshSession();
        } catch (refreshErr) {
          console.warn("Failed to refresh user profile post-OAuth:", refreshErr);
        }

        if (isMounted) {
          router.replace(target);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to store authentication token:", err);
        const msg = err?.message || "Google sign-in could not be completed. Please try again.";
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("ayaan_login_notice");
        }
        setErrorMessage(msg);
        setTimeout(() => {
          router.replace(`/login?error=${encodeURIComponent(msg)}`);
        }, 2500);
      }
    };

    completeAuthentication();

    return () => {
      isMounted = false;
    };
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
