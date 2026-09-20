import React from "react";
import { ShoppingBag, Clock, PackageCheck, Truck, CheckCircle2 } from "lucide-react";
import { OrderSummaryMetrics } from "@/services/admin";

export interface OrderKpisProps {
  metrics: OrderSummaryMetrics | null;
  activeStatusFilter: string;
  activePaymentFilter: string;
  onSelectStatusFilter: (status: string) => void;
  onSelectPaymentFilter: (paymentStatus: string) => void;
  isLoading?: boolean;
}

export default function OrderKpis({
  metrics,
  activeStatusFilter,
  activePaymentFilter,
  onSelectStatusFilter,
  onSelectPaymentFilter,
  isLoading = false,
}: OrderKpisProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-border/60 bg-card/60 animate-pulse space-y-2.5"
          >
            <div className="w-16 h-3 bg-secondary rounded" />
            <div className="w-12 h-6 bg-secondary rounded" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Total Orders",
      value: metrics.totalOrders,
      icon: <ShoppingBag size={16} className="text-primary" />,
      active: activeStatusFilter === "all" && activePaymentFilter === "all",
      onClick: () => {
        onSelectStatusFilter("all");
        onSelectPaymentFilter("all");
      },
      borderColor: "border-border/70",
    },
    {
      label: "Pending Action",
      value: metrics.pending,
      icon: <Clock size={16} className="text-amber-500" />,
      active: activeStatusFilter === "pending",
      onClick: () => onSelectStatusFilter(activeStatusFilter === "pending" ? "all" : "pending"),
      borderColor: "border-amber-500/30",
    },
    {
      label: "Processing",
      value: metrics.processing + metrics.confirmed,
      icon: <PackageCheck size={16} className="text-blue-500" />,
      active: activeStatusFilter === "processing",
      onClick: () => onSelectStatusFilter(activeStatusFilter === "processing" ? "all" : "processing"),
      borderColor: "border-blue-500/30",
    },
    {
      label: "Fulfilled / Shipped",
      value: metrics.shipped + metrics.delivered,
      icon: <Truck size={16} className="text-indigo-500" />,
      active: activeStatusFilter === "shipped",
      onClick: () => onSelectStatusFilter(activeStatusFilter === "shipped" ? "all" : "shipped"),
      borderColor: "border-indigo-500/30",
    },
    {
      label: "Paid Orders",
      value: metrics.paid,
      icon: <CheckCircle2 size={16} className="text-emerald-500" />,
      active: activePaymentFilter === "paid",
      onClick: () => onSelectPaymentFilter(activePaymentFilter === "paid" ? "all" : "paid"),
      borderColor: "border-emerald-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {items.map((item, idx) => (
        <button
          key={idx}
          type="button"
          onClick={item.onClick}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            item.active
              ? "bg-card border-primary ring-2 ring-primary/20 shadow-sm"
              : `bg-card/70 hover:bg-card hover:border-foreground/30 ${item.borderColor}`
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {item.label}
            </span>
            <span className="shrink-0">{item.icon}</span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {item.value}
          </div>
        </button>
      ))}
    </div>
  );
}
