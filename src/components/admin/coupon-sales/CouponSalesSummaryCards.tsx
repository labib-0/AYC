"use client";

import React from "react";
import { ShoppingBag, DollarSign, Percent, Tag } from "lucide-react";
import { CouponSalesSummary } from "@/services/admin/coupon.service";

export interface CouponSalesSummaryCardsProps {
  summary: CouponSalesSummary | null;
  loading?: boolean;
}

export default function CouponSalesSummaryCards({
  summary,
  loading = false,
}: CouponSalesSummaryCardsProps) {
  const cards = [
    {
      title: "TOTAL ORDERS",
      value: summary ? summary.total_orders.toLocaleString() : "0",
      description: "Qualifying completed or confirmed orders",
      icon: ShoppingBag,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "TOTAL SALES",
      value: summary ? `$${summary.total_sales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00",
      description: "Authoritative order value attributed",
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "TOTAL DISCOUNTS",
      value: summary ? `$${summary.total_discounts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00",
      description: "Savings provided by bound coupons",
      icon: Percent,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "ASSIGNED COUPONS",
      value: summary ? summary.bound_coupons_count.toString() : "0",
      description: "Coupons bound to your reporting scope",
      icon: Tag,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs transition-all hover:border-border"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl ${card.bg} ${card.color} ${card.border} border`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="text-2xl font-display font-bold tracking-tight text-foreground">
              {loading ? (
                <div className="h-7 w-24 bg-secondary/60 animate-pulse rounded-md" />
              ) : (
                card.value
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
