import React from "react";
import { Users, ShoppingBag, DollarSign } from "lucide-react";
import { CustomerSummaryMetrics } from "@/services/admin";

export interface CustomerKpisProps {
  metrics: CustomerSummaryMetrics | null;
  isLoading?: boolean;
}

export default function CustomerKpis({
  metrics,
  isLoading = false,
}: CustomerKpisProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-border/60 bg-card/60 animate-pulse space-y-2.5"
          >
            <div className="w-20 h-3 bg-secondary rounded" />
            <div className="w-16 h-6 bg-secondary rounded" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Total Customers",
      value: metrics.totalCustomers.toLocaleString(),
      icon: <Users size={18} className="text-primary" />,
      borderColor: "border-border/70",
    },
    {
      label: "Total Orders",
      value: metrics.totalOrders.toLocaleString(),
      icon: <ShoppingBag size={18} className="text-blue-500" />,
      borderColor: "border-blue-500/30",
    },
    {
      label: "Total Spent",
      value: `$${Number(metrics.totalSpent || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD`,
      icon: <DollarSign size={18} className="text-emerald-500" />,
      borderColor: "border-emerald-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`p-5 rounded-2xl border bg-card/80 shadow-xs ${item.borderColor}`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {item.label}
            </span>
            <span className="shrink-0 p-1.5 rounded-lg bg-secondary/60">{item.icon}</span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground truncate">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
