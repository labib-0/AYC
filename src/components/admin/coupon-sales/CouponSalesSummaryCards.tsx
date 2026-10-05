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
  const currency = summary?.currency || "USD";
  const currencySymbol = currency === "BDT" ? "৳" : currency === "EUR" ? "€" : "$";

  const formatAmount = (num?: number) => {
    const val = Number(num || 0);
    return `${currencySymbol}${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const cards = [
    {
      title: "TOTAL ORDERS",
      value: summary ? summary.total_orders.toLocaleString() : "0",
      description: "Attributed qualifying sales",
      icon: ShoppingBag,
    },
    {
      title: "TOTAL SALES",
      value: summary ? formatAmount(summary.total_sales) : `${currencySymbol}0.00`,
      description: "Authoritative revenue generated",
      icon: DollarSign,
    },
    {
      title: "TOTAL DISCOUNT",
      value: summary ? formatAmount(summary.total_discounts) : `${currencySymbol}0.00`,
      description: "Savings via assigned coupons",
      icon: Percent,
    },
    {
      title: "COUPONS",
      value: summary ? summary.bound_coupons_count.toString() : "0",
      description: "Active coupons in scope",
      icon: Tag,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((card, idx) => {
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
  );
}
