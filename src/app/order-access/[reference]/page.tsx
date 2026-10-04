"use client";

import React, { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { orderService, OrderRecord } from "@/services/order.service";
import BrandName from "@/components/common/BrandName";
import {
  Lock,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  LogIn,
  LogOut,
  ShoppingBag,
} from "lucide-react";

interface Props {
  params: Promise<{ reference: string }>;
}

export default function OrderAccessGatewayPage({ params }: Props) {
  const resolvedParams = use(params);
  const rawReference = resolvedParams.reference || "";
  const cleanRef = decodeURIComponent(rawReference).trim().replace(/^#/, "");

  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [resolvingOrder, setResolvingOrder] = useState(true);
  const [orderNotFound, setOrderNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Resolve order record from mock/api data
  const resolveOrder = useCallback(async () => {
    if (!cleanRef) {
      setOrderNotFound(true);
      setResolvingOrder(false);
      return;
    }

    setResolvingOrder(true);
    setOrderNotFound(false);
    setErrorMessage(null);

    try {
      const found = await orderService.getOrderById(cleanRef);
      if (!found) {
        setOrder(null);
        setOrderNotFound(true);
      } else {
        setOrder(found);
        setOrderNotFound(false);
      }
    } catch (err: any) {
      console.warn("Failed to resolve commercial order:", err);
      setOrder(null);
      setOrderNotFound(true);
    } finally {
      setResolvingOrder(false);
    }
  }, [cleanRef]);

  useEffect(() => {
    resolveOrder();
  }, [resolveOrder]);

  // 2. Perform Role-Aware Redirection & Ownership Verification
  useEffect(() => {
    // Wait until both order resolution and auth verification are settled
    if (resolvingOrder || authLoading) return;
    if (!order || !user) return;

    // Reset authorization flag
    setUnauthorized(false);

    // Flow A: Admin User
    if (user.role === "admin") {
      setRedirecting(true);
      const configuredAdminUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL;
      if (configuredAdminUrl) {
        const base = configuredAdminUrl.replace(/\/$/, "");
        const adminPath = base.endsWith("/ayc") ? `${base}/orders/${order.id}` : `${base}/ayc/orders/${order.id}`;
        window.location.replace(adminPath);
        return;
      }

      if (typeof window !== "undefined" && window.location.port === "3001") {
        router.replace(`/orders/${order.id}`);
        return;
      }

      router.replace(`/ayc/orders/${order.id}`);
      return;
    }

    // Flow B: Customer / B2B Buyer
    // Enforce strict customer ownership check: order.user_id or order.email must match current authenticated user
    const orderUserId = order.user_id ? String(order.user_id) : null;
    const currentUserId = user.id ? String(user.id) : null;
    const orderEmail = order.email ? order.email.toLowerCase().trim() : null;
    const userEmail = user.email ? user.email.toLowerCase().trim() : null;

    const isOwner =
      (orderUserId && currentUserId && orderUserId === currentUserId) ||
      (orderEmail && userEmail && orderEmail === userEmail);

    if (!isOwner) {
      // Access denied: do NOT redirect, do NOT reveal order sensitive details
      setUnauthorized(true);
      setRedirecting(false);
      return;
    }

    // Customer owns order: route to customer order details
    setRedirecting(true);
    router.replace(`/dashboard/orders/${order.id}`);
  }, [order, user, resolvingOrder, authLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    setUnauthorized(false);
    setRedirecting(false);
  };

  // ─── STATE A: LOADING / RESOLVING ──────────────────────────────────────────
  if (resolvingOrder || authLoading || redirecting) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-8 shadow-xl text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-base font-bold font-display text-foreground">
              {redirecting
                ? "Directing to Commercial Order..."
                : resolvingOrder
                ? "Resolving Commercial Order..."
                : "Verifying Authentication & Role Access..."}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Ref: #{cleanRef || "—"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {redirecting
              ? "Access verified. Opening secure order workspace..."
              : "Verifying role permissions and order ownership..."}
          </p>
        </div>
      </div>
    );
  }

  // ─── STATE B: ORDER NOT FOUND ──────────────────────────────────────────────
  if (orderNotFound || !order) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-8 shadow-xl text-center space-y-5 animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-foreground">
              Commercial Order Not Found
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-sans">
              We could not find commercial export order{" "}
              <strong className="font-mono text-foreground">#{cleanRef}</strong> in our system.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 text-xs text-muted-foreground text-left space-y-1 font-sans">
            <p className="font-bold text-foreground">Possible reasons:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>The order reference was mistyped or incomplete.</li>
              <li>The order was created in another environment.</li>
              <li>The order reference has expired or was removed.</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/"
              className="flex-1 py-3 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <ShoppingBag size={14} />
              <span>Storefront</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE C: UNAUTHORIZED CUSTOMER (Ownership Mismatch) ────────────────────
  if (unauthorized) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-destructive/30 rounded-3xl p-8 shadow-xl text-center space-y-5 animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-foreground">
              Order Not Available
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-sans">
              Commercial Order <strong className="font-mono text-foreground">#{cleanRef}</strong> is
              not associated with your current customer account.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 text-xs text-muted-foreground text-left font-sans">
            <span className="font-bold text-foreground">Active Account:</span>{" "}
            <span className="font-mono text-[11px] text-foreground">{user?.email || "Unknown"}</span>
            <p className="mt-1 text-[11px]">
              For commercial confidentiality, order specifications are only accessible to the purchasing consignee or authorized export administrators.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-3 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Switch Account / Sign Out</span>
            </button>
            <Link
              href="/dashboard/orders"
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>View My Orders</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE D: NOT AUTHENTICATED (Prompt Sign In) ───────────────────────────
  const redirectTarget = `/order-access/${encodeURIComponent(cleanRef)}`;
  const loginUrl = `/login?returnUrl=${encodeURIComponent(redirectTarget)}&notice=${encodeURIComponent("Please log in to continue.")}`;

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
        <div className="text-center">
          <div className="inline-block mb-3">
            <BrandName className="text-xl font-bold tracking-wider text-foreground" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Lock size={22} />
          </div>
          <h1 className="text-xl font-bold font-display text-foreground">
            Commercial Order Access
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-sans">
            Authentication is required to view commercial specifications and documents for order{" "}
            <strong className="font-mono text-foreground">#{cleanRef}</strong>.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href={loginUrl}
            className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <LogIn size={15} />
            <span>Sign In to Access Order</span>
          </Link>

          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
