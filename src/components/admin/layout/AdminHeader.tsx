"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  Menu, 
  X, 
  Store, 
  LogOut, 
  Bell, 
  ShieldCheck,
  ExternalLink,
  CheckCheck
} from "lucide-react";
import { User } from "@/types/api";
import { getCustomerAppUrl } from "@/config/site-urls";
import { adminNotificationService, AdminNotificationItem } from "@/services/admin";

export interface AdminHeaderProps {
  user: User | null;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onSignOut: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function AdminHeader({
  user,
  mobileMenuOpen,
  onToggleMobileMenu,
  onSignOut,
}: AdminHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const storefrontUrl = getCustomerAppUrl();

  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await adminNotificationService.getNotifications(10);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Fetch initial unread count on mount
  useEffect(() => {
    let isMounted = true;
    adminNotificationService.getUnreadCount().then((count) => {
      if (isMounted) setUnreadCount(count);
    }).catch(() => {
      if (isMounted) setUnreadCount(0);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load notification details when popover opens
  useEffect(() => {
    if (showNotifications) {
      loadNotifications();
    }
  }, [showNotifications, loadNotifications]);

  // Click outside and Escape key handler for popover dismissal
  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifications]);

  const handleMarkAllAsRead = async () => {
    await adminNotificationService.markAllAsRead();
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  };

  const handleItemClick = async (notif: AdminNotificationItem) => {
    if (!notif.read_at) {
      await adminNotificationService.markAsRead(notif.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    }
    setShowNotifications(false);
  };

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
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors relative cursor-pointer"
            aria-label="View system notifications"
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card"
                aria-label={`${unreadCount} unread notifications`}
              />
            )}
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
              role="region"
              aria-label="Notifications panel"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* List / Empty State */}
              <div className="max-h-80 overflow-y-auto divide-y divide-border/50 text-xs">
                {loadingNotifications ? (
                  <div className="py-8 px-4 text-center text-muted-foreground text-xs">
                    Loading notifications...
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notif) => {
                    const isUnread = !notif.read_at;
                    const orderId = notif.data?.order_id;
                    const message =
                      notif.data?.message ||
                      (notif.data?.order_number
                        ? `Order update: ${notif.data.order_number}`
                        : "System Notification");
                    const relativeTime = formatRelativeTime(notif.created_at);

                    const content = (
                      <div
                        key={notif.id}
                        onClick={() => handleItemClick(notif)}
                        className={`p-3.5 flex items-start gap-3 hover:bg-secondary/40 transition-colors cursor-pointer ${
                          isUnread ? "bg-primary/5" : ""
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isUnread
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          <Bell size={13} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p
                            className={`text-xs leading-snug line-clamp-2 ${
                              isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {message}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {relativeTime && <span>{relativeTime}</span>}
                            {Boolean(notif.data?.status) && (
                              <span className="uppercase font-mono text-[9px] px-1.5 py-0.5 rounded bg-secondary">
                                {String(notif.data?.status)}
                              </span>
                            )}
                          </div>
                        </div>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        )}
                      </div>
                    );

                    return orderId ? (
                      <Link
                        key={notif.id}
                        href={`/ayc/orders/${orderId}`}
                        onClick={() => handleItemClick(notif)}
                        className="block"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    );
                  })
                ) : (
                  <div className="py-8 px-4 text-center space-y-2">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                      <Bell size={16} />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No notifications</p>
                    <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto">
                      You have no pending alerts or unread notifications.
                    </p>
                  </div>
                )}
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
