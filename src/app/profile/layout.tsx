"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ChevronRight, Home } from "lucide-react";
import { CustomerAccountSidebar } from "@/components/account/CustomerAccountSidebar";
import { CustomerAccountMobileNav } from "@/components/account/CustomerAccountMobileNav";

function getBreadcrumbLabel(pathname: string): string {
  if (pathname === "/profile") return "Overview";
  if (pathname.startsWith("/profile/orders/")) return "Order Details";
  if (pathname.startsWith("/profile/orders")) return "Orders";
  if (pathname.startsWith("/profile/addresses")) return "Addresses";
  if (pathname.startsWith("/profile/documents")) return "Documents";
  if (pathname.startsWith("/profile/details")) return "Account Details";
  return "Account";
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ayaan_intended_destination", pathname);
        sessionStorage.setItem("ayaan_login_notice", "Please log in to continue.");
      }
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}&notice=${encodeURIComponent("Please log in to continue.")}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const crumbLabel = getBreadcrumbLabel(pathname);
  const isOverview = pathname === "/profile";

  return (
    <div className="bg-slate-50/70 dark:bg-slate-950 min-h-screen">
      <div className="max-w-[1728px] 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 py-4 sm:py-6">

        {/* Breadcrumb */}
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
            <span className="text-slate-900 dark:text-white font-semibold">Account</span>
          ) : (
            <>
              <Link
                href="/profile"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Account
              </Link>
              <ChevronRight size={11} className="text-slate-300 dark:text-slate-600" />
              <span className="text-slate-900 dark:text-white font-semibold">
                {crumbLabel}
              </span>
            </>
          )}
        </nav>

        {/* Mobile nav (shown on < lg) */}
        <div className="mb-4 sm:mb-5">
          <CustomerAccountMobileNav />
        </div>

        {/* Main layout — compact 230px sidebar & spacious content workspace */}
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
          {/* Desktop sidebar */}
          <CustomerAccountSidebar />

          {/* Content workspace */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>

      </div>
    </div>
  );
}
