"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Menu, 
  X, 
  Store, 
  LogOut, 
  Bell, 
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { User } from "@/types/api";
import { getCustomerAppUrl } from "@/config/site-urls";

export interface AdminHeaderProps {
  user: User | null;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onSignOut: () => void;
}

export default function AdminHeader({
  user,
  mobileMenuOpen,
  onToggleMobileMenu,
  onSignOut,
}: AdminHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const storefrontUrl = getCustomerAppUrl();

  return (
    <header className="sticky top-0 z-40 h-14 bg-card/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0">
      {/* Left: Mobile Toggle & Admin Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
          aria-label="Toggle navigation sidebar"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link
          href="/ayc/dashboard"
          className="flex items-center gap-2.5 group focus:outline-none"
          aria-label="Ayaan Clothing Admin Portal Dashboard"
        >
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold font-mono text-sm tracking-tighter shadow-xs">
            AC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-wider text-foreground font-display uppercase">
                AYAAN CLOTHING
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                ADMIN
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium -mt-0.5 hidden sm:block">
              Internal Export Management System
            </p>
          </div>
        </Link>
      </div>

      {/* Right: Notifications, Admin User, Logout, and Storefront Link */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Environment Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
          <ShieldCheck size={13} />
          <span>Admin Workspace Active</span>
        </div>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors relative cursor-pointer"
            aria-label="View system notifications"
            title="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-card border border-border rounded-2xl shadow-xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <span className="text-xs font-bold text-foreground">Operational Alerts</span>
                <span className="text-[10px] font-semibold text-muted-foreground">Real-time sync</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Stock System Synchronized</p>
                    <p className="text-[10px] text-muted-foreground">Uttara Central Warehouse records up to date.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin User Profile Pill */}
        {user && (
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-border/80">
            <div className="w-8 h-8 rounded-xl bg-foreground text-background text-xs font-bold font-mono flex items-center justify-center shrink-0 shadow-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="hidden md:block text-left text-xs leading-tight">
              <p className="font-bold text-foreground truncate max-w-[130px]">
                {user.name || "Ayaan Admin"}
              </p>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                {user.role || "ADMINISTRATOR"}
              </span>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="p-2 rounded-xl border border-border/80 bg-card hover:bg-red-500/10 hover:border-red-500/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer ml-1"
              title="Sign Out of Admin Portal"
              aria-label="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}

        {/* View Customer Storefront External Link */}
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-secondary/70 hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xs"
          title="Open Customer Ecommerce Storefront in a new tab"
        >
          <Store size={14} className="text-primary" />
          <span className="hidden sm:inline">View Store</span>
          <ExternalLink size={11} className="text-muted-foreground" />
        </a>
      </div>
    </header>
  );
}
