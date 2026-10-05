"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Package,
  MapPin,
  FileText,
  Heart,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const primaryNav = [
  { label: "Overview", href: "/profile", icon: LayoutDashboard, exact: true },
  { label: "Orders", href: "/profile/orders", icon: Package, exact: false },
  { label: "Saved Items", href: "/profile/wishlist", icon: Heart, exact: false },
  { label: "Addresses", href: "/profile/addresses", icon: MapPin, exact: false },
  { label: "Documents", href: "/profile/documents", icon: FileText, exact: false },
];

export function CustomerAccountSidebar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);

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

  return (
    <>
      <aside className="hidden lg:flex flex-col w-[230px] shrink-0 self-start">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden sticky top-24 w-full">
          {/* User identity block */}
          <div className="px-4 pt-4 pb-3.5 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold text-xs shadow-xs uppercase shrink-0 select-none"
                aria-label="Account avatar"
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {user?.name || "Ayaan Buyer"}
                </p>
                <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {user?.email || ""}
                </p>
                <div className="mt-1 inline-flex items-center gap-1 text-[0.625rem] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck size={10} />
                  <span>Verified Account</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary navigation */}
          <nav className="p-2 flex flex-col gap-0.5" aria-label="Account navigation">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 h-[40px]",
                    isActive
                      ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    size={16}
                    className={
                      isActive
                        ? "text-amber-600 dark:text-amber-400 shrink-0"
                        : "text-slate-400 dark:text-slate-500 shrink-0"
                    }
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sign out — separated */}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                <LogOut size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                  Log Out
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to log out of your Ayaan Clothing account?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
