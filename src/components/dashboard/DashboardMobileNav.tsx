"use client";

import React, { useRef, useEffect, useState } from "react";
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
  Settings,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
}

const MOBILE_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Orders", href: "/dashboard/orders", icon: Package, exact: false },
  { label: "RFQs", href: "/dashboard/rfq", icon: FileText, exact: false },
  { label: "Quotes", href: "/dashboard/quotes", icon: FileText, exact: false },
  { label: "Reorder", href: "/dashboard/reorder", icon: RefreshCw, exact: false },
  { label: "Documents", href: "/dashboard/documents", icon: FolderOpen, exact: false },
  { label: "Addresses", href: "/dashboard/addresses", icon: MapPin, exact: false },
  { label: "Company", href: "/dashboard/company", icon: Building2, exact: false },
  { label: "Security", href: "/dashboard/settings", icon: Settings, exact: false },
];

export function DashboardMobileNav() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const isLinkActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
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
    <div className="lg:hidden mb-4">
      {/* Buyer Quick Badge */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-xl p-3 mb-2.5 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user?.name || "Customer"}
            </p>
            <p className="text-[0.625rem] text-slate-500 dark:text-slate-400 truncate">
              {user?.company_name || "Direct Customer"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Horizontal Nav Chips */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
      >
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = isLinkActive(item);

          return (
            <Link
              key={item.href}
              ref={active ? activeRef : undefined}
              href={item.href}
              className={[
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 h-[36px]",
                active
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:border-slate-300",
              ].join(" ")}
            >
              <Icon size={14} className={active ? "text-white" : "text-slate-400"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Sign Out Modal */}
      {showSignOutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-xs w-full shadow-xl border border-slate-200 dark:border-white/10 text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Sign Out of Portal?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              You will need to sign in again to access wholesale pricing and orders.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                className="flex-1 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
