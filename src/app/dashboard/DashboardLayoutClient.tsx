"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ChevronRight, Home, AlertCircle, Mail, RefreshCw } from "lucide-react";
import { authService } from "@/services/auth.service";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";
function getBreadcrumbLabel(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/dashboard/orders/")) return "Order Details";
  if (pathname.startsWith("/dashboard/orders")) return "Orders";
  if (pathname.startsWith("/dashboard/wishlist")) return "Saved Items";
  if (pathname.startsWith("/dashboard/rfq/")) return "RFQ Details";
  if (pathname.startsWith("/dashboard/rfq")) return "RFQ";
  if (pathname.startsWith("/dashboard/quotes/")) return "Quotation Details";
  if (pathname.startsWith("/dashboard/quotes")) return "Commercial Quotes";
  if (pathname.startsWith("/dashboard/company")) return "Company Profile";
  if (pathname.startsWith("/dashboard/addresses")) return "Address Book";
  if (pathname.startsWith("/dashboard/documents")) return "Document Center";
  if (pathname.startsWith("/dashboard/settings")) return "Profile & Security";
  if (pathname.startsWith("/dashboard/details")) return "Account Details";
  return "Customer Portal";
}

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    setResendMessage(null);
    setResendError(null);
    try {
      const res = await authService.resendVerificationEmail(user.email);
      setResendMessage(res?.message || "Verification link sent! Please check your inbox.");
      setTimeout(() => setResendMessage(null), 8000);
    } catch (err: any) {
      setResendError(err?.message || "Failed to resend verification link. Please try again.");
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (!loading && (!user || user.role !== "customer")) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ayaan_intended_destination", pathname);
        sessionStorage.setItem("ayaan_login_notice", "Please log in with a customer account to continue.");
      }
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}&notice=${encodeURIComponent("Please log in with a customer account to continue.")}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Accessing Customer Portal...
          </p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "customer") {
    return null;
  }

  const crumbLabel = getBreadcrumbLabel(pathname);
  const isOverview = pathname === "/dashboard";

  return (
    <div className="bg-slate-50/70 dark:bg-slate-950 min-h-screen overflow-x-hidden">
      <div className="max-w-[1728px] 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 py-4 sm:py-6">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 sm:mb-5"
        >
          <Link
            href="/"
            className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            <Home size={13} />
            <span>Home</span>
          </Link>
          <ChevronRight size={11} className="text-slate-300 dark:text-slate-600" />
          {isOverview ? (
            <span className="text-slate-900 dark:text-white font-semibold">Customer Portal</span>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Customer Portal
              </Link>
              <ChevronRight size={11} className="text-slate-300 dark:text-slate-600" />
              <span className="text-slate-900 dark:text-white font-semibold">
                {crumbLabel}
              </span>
            </>
          )}
        </nav>

        {/* Mobile nav bar (< lg) */}
        <DashboardMobileNav />

        {user && !user.email_verified_at && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Email Verification Required Before Placing Orders</p>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  Your account email (<strong>{user.email}</strong>) has not been verified yet. You can browse the catalog and save items, but email verification is required before placing an order.
                </p>
                {resendMessage && (
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">{resendMessage}</p>
                )}
                {resendError && (
                  <p className="text-destructive font-semibold mt-1">{resendError}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {resending ? <RefreshCw size={13} className="animate-spin" /> : <Mail size={13} />}
              <span>{resending ? "Sending..." : "Resend Link"}</span>
            </button>
          </div>
        )}

        {/* Main 2-column B2B workspace layout */}
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
          {/* Desktop sidebar */}
          <DashboardSidebar />

          {/* Content workspace */}
          <main className="flex-1 min-w-0 w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
