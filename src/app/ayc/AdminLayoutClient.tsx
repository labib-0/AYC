"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/lib/AdminAuthContext";
import { AdminHeader, AdminSidebar, AdminFooter, AdminBreadcrumbs } from "@/components/admin/layout";
import AdminLoginPage from "./page";

function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminUser, loading, isAdmin, signOutAdmin } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Restore collapsed state preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ayc_sidebar_collapsed");
      if (saved === "true") {
        setSidebarCollapsed(true);
      }
    }
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("ayc_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const isLoginPage =
    pathname === "/ayc" ||
    pathname === "/ayc/login" ||
    pathname === "/admin/login" ||
    pathname === "/login";

  // 1. Initial Admin Session Loading Skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col">
        <header className="h-14 bg-card border-b border-border/80 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-6 w-32 bg-secondary animate-pulse rounded-xl" />
            <div className="h-5 w-16 bg-secondary animate-pulse rounded-full" />
          </div>
          <div className="h-8 w-28 bg-secondary animate-pulse rounded-full" />
        </header>
        <div className="flex-1 flex w-full min-w-0">
          <aside className="hidden md:block w-64 shrink-0 border-r border-border/80 bg-card p-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-secondary animate-pulse rounded-xl" />
            ))}
          </aside>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-4">
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
        onSignOut={async () => {
          await signOutAdmin();
          router.push("/ayc");
        }}
      />

      {/* Main Admin Workspace (Sidebar + Content) */}
      <div className="flex-1 flex w-full min-w-0 min-h-[calc(100vh-7rem)]">
        {/* Desktop Sidebar (Collapsible: w-64 expanded, w-16 collapsed) */}
        <div
          className={`hidden md:block shrink-0 transition-all duration-200 ${
            sidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
            <AdminSidebar
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={handleToggleCollapse}
            />
          </div>
        </div>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-ink/60 backdrop-blur-xs flex animate-in fade-in">
            <div className="w-72 max-w-[85vw] bg-card h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <AdminSidebar
                isMobileDrawer={true}
                onCloseDrawer={() => setMobileMenuOpen(false)}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation overlay"
            />
          </div>
        )}

        {/* Content Area with Breadcrumbs */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-4">
          <AdminBreadcrumbs />
          <div className="w-full min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Admin Minimal Footer */}
      <AdminFooter />
    </div>
  );
}

export default function AdminLayoutClient({
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
