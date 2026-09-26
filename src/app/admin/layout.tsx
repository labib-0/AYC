"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/lib/AdminAuthContext";
import { AdminHeader, AdminSidebar, AdminFooter } from "@/components/admin/layout";
import AdminLoginPage from "./login/page";

function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { adminUser, loading, isAdmin, signOutAdmin } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login" || pathname === "/login";

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
  // Unauthenticated visitors always receive the ONE dedicated Admin Login page
  if (!isAdmin) {
    return <AdminLoginPage />;
  }

  // If on login page but already authenticated as admin, AdminLoginPage handles redirection
  if (isLoginPage) {
    return <AdminLoginPage />;
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
