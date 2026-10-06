"use client";

import React from "react";
import { Tag, Users, CheckCircle2, Clock, AlertTriangle, SearchX } from "lucide-react";
import { CouponPerformanceRecord } from "@/services/admin/coupon.service";

export interface SuperAdminCouponsOverviewTableProps {
  coupons: CouponPerformanceRecord[];
  loading?: boolean;
  search?: string;
  currency?: string;
}

export default function SuperAdminCouponsOverviewTable({
  coupons,
  loading = false,
  search,
  currency = "USD",
}: SuperAdminCouponsOverviewTableProps) {
  const currencySymbol = currency === "BDT" ? "৳" : currency === "EUR" ? "€" : "$";

  const formatAmount = (num: number) => {
    return `${currencySymbol}${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={10} />
          <span>Active</span>
        </span>
      );
    }
    if (status === "expired") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Clock size={10} />
          <span>Expired</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <AlertTriangle size={10} />
        <span>Inactive</span>
      </span>
    );
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
      {/* Table Section Header */}
      <div className="px-5 py-3.5 border-b border-border/80 flex items-center justify-between bg-secondary/15">
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            GLOBAL COUPON PERFORMANCE OVERVIEW
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Authoritative usage, sales generated, discounts given, and bound administrators
          </p>
        </div>
        <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-mono font-semibold text-muted-foreground border border-border/60">
          {coupons.length} {coupons.length === 1 ? "Coupon" : "Coupons"}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/30 text-muted-foreground font-mono font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">COUPON CODE</th>
              <th className="py-2.5 px-4 text-center">STATUS</th>
              <th className="py-2.5 px-4">TYPE & VALUE</th>
              <th className="py-2.5 px-4 text-center">USAGE LIMIT</th>
              <th className="py-2.5 px-4 text-center">USED / REMAINING</th>
              <th className="py-2.5 px-4 text-center">ORDERS</th>
              <th className="py-2.5 px-4 text-right">SALES VALUE</th>
              <th className="py-2.5 px-4 text-right">TOTAL DISCOUNT</th>
              <th className="py-2.5 px-4">BOUND ADMIN(S)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-28 bg-secondary/60 rounded-md" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="h-5 w-16 bg-secondary/50 rounded-full mx-auto" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-20 bg-secondary/50 rounded-md" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="h-4 w-12 bg-secondary/50 rounded-md mx-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="h-4 w-16 bg-secondary/50 rounded-md mx-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="h-4 w-10 bg-secondary/50 rounded-md mx-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-4 w-18 bg-secondary/60 rounded-md ml-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-4 w-16 bg-secondary/50 rounded-md ml-auto" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-24 bg-secondary/50 rounded-md" />
                  </td>
                </tr>
              ))
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="p-3 rounded-2xl bg-secondary/50 text-muted-foreground mb-2.5">
                      {search ? <SearchX size={22} /> : <Tag size={22} />}
                    </div>
                    <p className="font-bold text-foreground text-xs uppercase tracking-wide">
                      {search ? "NO MATCHING COUPONS" : "NO COUPONS CONFIGURED"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {search
                        ? "No coupons match your search query."
                        : "There are currently no discount coupons created in the system."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              coupons.map((c) => {
                const discountLabel =
                  c.discount_type === "percentage"
                    ? `${c.discount_value}% OFF`
                    : `$${Number(c.discount_value).toFixed(2)} OFF`;

                return (
                  <tr key={c.id} className="hover:bg-secondary/20 transition-colors group">
                    {/* Code */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-mono font-bold text-xs">
                        <Tag size={11} />
                        <span>{c.code}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {renderStatusBadge(c.status)}
                    </td>

                    {/* Type & Value */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground font-mono">
                        {discountLabel}
                      </div>
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {c.discount_type} discount
                      </div>
                    </td>

                    {/* Usage Limit */}
                    <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                      {c.usage_limit != null ? c.usage_limit.toLocaleString() : "Unlimited"}
                    </td>

                    {/* Used / Remaining */}
                    <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                      <span className="font-bold text-foreground">{c.usage_count}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {" "}/ {c.remaining_usage !== null ? `${c.remaining_usage} left` : "∞"}
                      </span>
                    </td>

                    {/* Orders */}
                    <td className="py-3 px-4 text-center font-bold font-mono text-foreground">
                      {c.orders_count}
                    </td>

                    {/* Sales Value */}
                    <td className="py-3 px-4 text-right font-bold font-mono text-foreground whitespace-nowrap">
                      {formatAmount(c.sales_value)}
                    </td>

                    {/* Total Discount */}
                    <td className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-400 font-mono whitespace-nowrap">
                      -{formatAmount(c.total_discount)}
                    </td>

                    {/* Bound Admin(s) */}
                    <td className="py-3 px-4">
                      {c.bound_admins && c.bound_admins.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.bound_admins.map((admin) => (
                            <span
                              key={admin.id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-foreground border border-border/70"
                              title={admin.email}
                            >
                              <Users size={10} className="text-primary" />
                              <span>{admin.name}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
