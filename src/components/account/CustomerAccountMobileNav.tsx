"use client";

import React, { useRef, useEffect } from "react";
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
} from "lucide-react";

const mobileNav = [
  { label: "Overview", href: "/profile", icon: LayoutDashboard, exact: true },
  { label: "Orders", href: "/profile/orders", icon: Package, exact: false },
  { label: "Saved Items", href: "/profile/wishlist", icon: Heart, exact: false },
  { label: "Addresses", href: "/profile/addresses", icon: MapPin, exact: false },
  { label: "Documents", href: "/profile/documents", icon: FileText, exact: false },
];

export function CustomerAccountMobileNav() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active chip into view on mount / path change
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetLeft - 16;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [pathname]);

  const handleConfirmSignOut = async () => {
    await signOut();
    setShowSignOutConfirm(false);
    router.push("/");
  };

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "AY";

  return (
    <div className="lg:hidden">
      {/* Compact user greeting bar */}
      <div className="flex items-center gap-3 mb-3 px-0.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold text-xs shadow-sm uppercase shrink-0 select-none">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-snug">
            {user?.name || "Ayaan Buyer"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {user?.email || ""}
          </p>
        </div>
      </div>

      {/* Scrollable nav chip row */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1"
        role="navigation"
        aria-label="Account navigation"
      >
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              ref={isActive ? activeRef : undefined}
              className={[
                "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-150 shrink-0",
                isActive
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05]",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                size={13}
                className={
                  isActive
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-400"
                }
              />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Sign Out chip — separated by a subtle divider feel */}
        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 mx-1" />
        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 transition-all duration-150 shrink-0"
        >
          <LogOut size={13} className="text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>

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
    </div>
  );
}
