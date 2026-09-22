import React from "react";
import { Users, Briefcase, CheckCircle2, Clock } from "lucide-react";
import { CustomerSummaryMetrics } from "@/services/admin";

export interface CustomerKpisProps {
  metrics: CustomerSummaryMetrics | null;
  activeRoleFilter: string;
  activeB2bFilter: string;
  onSelectRoleFilter: (role: string) => void;
  onSelectB2bFilter: (b2bStatus: string) => void;
  isLoading?: boolean;
}

export default function CustomerKpis({
  metrics,
  activeRoleFilter,
  activeB2bFilter,
  onSelectRoleFilter,
  onSelectB2bFilter,
  isLoading = false,
}: CustomerKpisProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
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
      label: "Total Customers",
      value: metrics.totalCustomers,
      icon: <Users size={16} className="text-primary" />,
      active: activeRoleFilter === "all" && activeB2bFilter === "all",
      onClick: () => {
        onSelectRoleFilter("all");
        onSelectB2bFilter("all");
      },
      borderColor: "border-border/70",
    },
    {
      label: "Corporate Accounts",
      value: metrics.corporateAccounts ?? metrics.b2bAccounts ?? 0,
      icon: <Briefcase size={16} className="text-blue-500" />,
      active: activeRoleFilter === "corporate",
      onClick: () => onSelectRoleFilter(activeRoleFilter === "corporate" ? "all" : "corporate"),
      borderColor: "border-blue-500/30",
    },
    {
      label: "Approved B2B",
      value: metrics.approvedB2b,
      icon: <CheckCircle2 size={16} className="text-emerald-500" />,
      active: activeB2bFilter === "approved",
      onClick: () => onSelectB2bFilter(activeB2bFilter === "approved" ? "all" : "approved"),
      borderColor: "border-emerald-500/30",
    },
    {
      label: "Pending Review",
      value: metrics.pendingB2b,
      icon: <Clock size={16} className="text-amber-500" />,
      active: activeB2bFilter === "pending",
      onClick: () => onSelectB2bFilter(activeB2bFilter === "pending" ? "all" : "pending"),
      borderColor: "border-amber-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
