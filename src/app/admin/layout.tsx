"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  ShieldAlert, 
  UserCheck, 
  Store, 
  Lock,
  Loader2
} from "lucide-react";
import { AdminAuthProvider, useAdminAuth } from "@/lib/AdminAuthContext";
import { AdminHeader, AdminSidebar, AdminFooter } from "@/components/admin/layout";
import { getCustomerAppUrl } from "@/config/site-urls";

function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminUser, loading, isAdmin, signInAdmin, signOutAdmin } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);

  const storefrontUrl = getCustomerAppUrl();
  const isLoginPage = pathname === "/admin/login";

  // If currently on the dedicated /admin/login page, render it directly without the shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 1. Initial Admin Session Loading Skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col">
        <header className="h-14 bg-card border-b border-border/80 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-32 bg-secondary animate-pulse rounded-xl" />
            <div className="h-5 w-16 bg-secondary animate-pulse rounded-full" />
          </div>
          <div className="h-8 w-28 bg-secondary animate-pulse rounded-full" />
        </header>
        <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
          <aside className="hidden md:block w-64 border-r border-border/80 bg-card p-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-secondary animate-pulse rounded-xl" />
            ))}
          </aside>
          <main className="flex-1 p-6 space-y-4">
            <div className="h-8 w-48 bg-secondary animate-pulse rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-secondary animate-pulse rounded-2xl" />
              ))}
            </div>
            <div className="h-72 bg-secondary animate-pulse rounded-2xl" />
          </main>
        </div>
      </div>
    );
  }

  // 2. Authentication Guard: Restrict access if not logged in with Admin role
  if (!isAdmin) {
    const handleQuickAdminLogin = async () => {
      setAuthChecking(true);
      try {
        await signInAdmin("admin@ayaanclothing.com", "admin123");
      } finally {
        setAuthChecking(false);
      }
    };

    return (
      <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col justify-between">
        {/* Guard Top Bar */}
        <header className="sticky top-0 z-40 bg-card border-b border-border/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold font-mono text-sm tracking-tighter shadow-xs">
              AC
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-foreground uppercase font-display">
              AYAAN CLOTHING ADMIN
            </span>
          </div>
          <a
            href={storefrontUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Store size={13} />
            <span>Storefront</span>
          </a>
        </header>

        {/* Challenge Modal / Card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground font-display uppercase tracking-wide">
                Admin Authentication Required
              </h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Access to the wholesale catalog management portal, orders desk, and system settings is restricted to authorized administrators.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                disabled={authChecking}
                className="w-full h-11 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-md"
              >
                {authChecking ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={14} />
                    <span>Quick Sign In as Admin</span>
                  </>
                )}
              </button>

              <Link
                href="/admin/login"
                className="block w-full py-2.5 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Go to Admin Login Page
              </Link>

              <a
                href={storefrontUrl}
                className="block text-xs font-semibold text-muted-foreground hover:text-foreground pt-1"
              >
                &larr; Return to Customer Storefront
              </a>
            </div>
          </div>
        </div>

        <AdminFooter />
      </div>
    );
  }

  // 3. Authenticated Admin Shell
  return (
    <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col justify-between">
      {/* Top Admin Bar */}
      <AdminHeader
        user={adminUser}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onSignOut={signOutAdmin}
      />

      {/* Main Admin Workspace (Sidebar + Content) */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto min-h-[calc(100vh-120px)]">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-ink/60 backdrop-blur-xs flex animate-in fade-in">
            <div className="w-64 bg-card h-full shadow-2xl flex flex-col">
              <AdminSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>

      {/* Admin Minimal Footer */}
      <AdminFooter />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminAuthProvider>
  );
}
