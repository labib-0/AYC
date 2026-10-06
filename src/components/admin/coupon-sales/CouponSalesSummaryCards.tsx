"use client";

import React from "react";
import { ShoppingBag, DollarSign, Percent, Tag, CheckCircle2, Users, Flame } from "lucide-react";
import { CouponSalesSummary } from "@/services/admin/coupon.service";

export interface CouponSalesSummaryCardsProps {
  summary: CouponSalesSummary | null;
  loading?: boolean;
}

export default function CouponSalesSummaryCards({
  summary,
  loading = false,
}: CouponSalesSummaryCardsProps) {
  const currency = summary?.currency || "USD";
  const currencySymbol = currency === "BDT" ? "৳" : currency === "EUR" ? "€" : "$";
  const isSuperAdmin = Boolean(summary?.is_super_admin);

  const formatAmount = (num?: number) => {
    const val = Number(num || 0);
    return `${currencySymbol}${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const primaryCards = [
    {
      title: "TOTAL ORDERS",
      value: summary ? summary.total_orders.toLocaleString() : "0",
      description: isSuperAdmin ? "Global qualifying coupon orders" : "Attributed qualifying sales",
      icon: ShoppingBag,
    },
    {
      title: "TOTAL SALES",
      value: summary ? formatAmount(summary.total_sales) : `${currencySymbol}0.00`,
      description: isSuperAdmin ? "Authoritative global revenue" : "Authoritative revenue generated",
      icon: DollarSign,
    },
    {
      title: "TOTAL DISCOUNT",
      value: summary ? formatAmount(summary.total_discounts) : `${currencySymbol}0.00`,
      description: isSuperAdmin ? "Total savings granted via coupons" : "Savings via assigned coupons",
      icon: Percent,
    },
    {
      title: isSuperAdmin ? "TOTAL COUPONS" : "COUPONS",
      value: summary
        ? (isSuperAdmin ? (summary.total_coupons ?? summary.bound_coupons_count) : summary.bound_coupons_count).toString()
        : "0",
      description: isSuperAdmin
        ? `${summary?.total_active_coupons ?? 0} active • ${summary?.total_inactive_coupons ?? 0} inactive`
        : "Active coupons in scope",
      icon: Tag,
    },
  ];

  return (
    <div className="space-y-3.5">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {primaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs transition-all hover:border-border"
            >
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  {card.title}
                </span>
                <div className="p-1.5 rounded-lg bg-secondary/70 text-foreground border border-border/60">
                  <Icon size={14} className="text-primary" />
                </div>
              </div>
              <div className="text-2xl font-display font-bold tracking-tight text-foreground">
                {loading ? (
                  <div className="h-7 w-24 bg-secondary/60 animate-pulse rounded-md" />
                ) : (
                  card.value
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Super Admin Extended Metrics Bar (Section 8) */}
      {isSuperAdmin && summary && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-secondary/25 border border-border/70 rounded-2xl text-xs">
          <div className="flex items-center gap-2.5 px-3 py-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={13} />
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider font-mono block">
                USED COUPONS
              </span>
              <span className="font-semibold text-foreground">
                {summary.total_used_coupons ?? 0} coupons redeemed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Flame size={13} />
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider font-mono block">
                REMAINING USAGE
              </span>
              <span className="font-semibold text-foreground">
                {summary.total_remaining_usage !== undefined
                  ? `${summary.total_remaining_usage.toLocaleString()} uses available`
                  : "Unlimited"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Users size={13} />
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider font-mono block">
                BOUND ADMINISTRATORS
              </span>
              <span className="font-semibold text-foreground">
                {summary.eligible_admins?.length ?? 0} assigned agents
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
