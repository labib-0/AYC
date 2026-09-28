"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Package,
  FileText,
  RefreshCw,
  FolderOpen,
  MapPin,
  Building2,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Settings,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: string;
}

const OVERVIEW_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
];

const BUYING_NAV: NavItem[] = [
  { label: "Orders", href: "/dashboard/orders", icon: Package, exact: false },
  { label: "RFQ", href: "/dashboard/rfq", icon: FileText, exact: false },
  { label: "Quick Reorder", href: "/dashboard/reorder", icon: RefreshCw, exact: false },
];

const ACCOUNT_NAV: NavItem[] = [
  { label: "Documents", href: "/dashboard/documents", icon: FolderOpen, exact: false },
  { label: "Addresses", href: "/dashboard/addresses", icon: MapPin, exact: false },
  { label: "Company Profile", href: "/dashboard/company", icon: Building2, exact: false },
  { label: "Profile & Security", href: "/dashboard/settings", icon: Settings, exact: false },
];

export function DashboardSidebar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "AY";

  const handleConfirmSignOut = async () => {
    await signOut();
    setShowSignOutConfirm(false);
    router.push("/");
  };

  const isLinkActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-[250px] shrink-0 self-start">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden sticky top-24 w-full">
          {/* Company / Buyer identity banner */}
          <div className="p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center text-white font-bold text-sm shadow-xs uppercase shrink-0 select-none ring-2 ring-white dark:ring-slate-800"
                aria-label="Buyer initials"
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name || "Customer"}
                </p>
                <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {user?.company_name || "Direct Customer"}
                </p>
                <div className="mt-1 inline-flex items-center gap-1 text-[0.625rem] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck size={11} />
                  <span>Verified Account</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Groups */}
          <div className="p-2 space-y-4">
            {/* Overview section */}
            <div>
              <p className="px-3 pb-1 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Overview
              </p>
              <nav className="flex flex-col gap-0.5" aria-label="Overview navigation">
                {OVERVIEW_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isLinkActive(item);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 h-[40px]",
                        active
                          ? "bg-amber-500 text-white font-semibold shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white",
                      ].join(" ")}
                      aria-current={active ? "page" : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={16}
                          className={
                            active
                              ? "text-white shrink-0"
                              : "text-slate-400 dark:text-slate-500 shrink-0"
                          }
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {active ? (
                        <ChevronRight size={14} className="text-white/80 shrink-0" />
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Buying section */}
            <div>
              <p className="px-3 pb-1 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Sourcing & Buying
              </p>
              <nav className="flex flex-col gap-0.5" aria-label="Sourcing navigation">
                {BUYING_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isLinkActive(item);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 h-[40px]",
                        active
                          ? "bg-amber-500 text-white font-semibold shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white",
                      ].join(" ")}
                      aria-current={active ? "page" : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={16}
                          className={
                            active
                              ? "text-white shrink-0"
                              : "text-slate-400 dark:text-slate-500 shrink-0"
                          }
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {active ? (
                        <ChevronRight size={14} className="text-white/80 shrink-0" />
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Account & Company section */}
            <div>
              <p className="px-3 pb-1 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Company & Settings
              </p>
              <nav className="flex flex-col gap-0.5" aria-label="Account navigation">
                {ACCOUNT_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isLinkActive(item);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 h-[38px]",
                        active
                          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-semibold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white",
                      ].join(" ")}
                      aria-current={active ? "page" : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={15}
                          className={
                            active
                              ? "text-amber-600 dark:text-amber-400 shrink-0"
                              : "text-slate-400 dark:text-slate-500 shrink-0"
                          }
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ExternalLink size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sign out */}
          <div className="p-2 pt-1 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 text-left h-[40px] cursor-pointer"
            >
              <LogOut size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200 dark:border-white/10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <LogOut size={22} />
            </div>
            <h3
              id="signout-dialog-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Sign Out of Portal?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Are you sure you want to sign out of your wholesale account? You will need to log in again to manage orders.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
