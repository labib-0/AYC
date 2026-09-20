import React from "react";
import { CheckCircle2, Clock, AlertTriangle, RotateCcw } from "lucide-react";

export interface PaymentStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export default function PaymentStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: PaymentStatusBadgeProps) {
  const s = (status || "").toLowerCase();

  let colorClasses = "bg-secondary text-foreground border-border";
  let icon = <Clock size={size === "sm" ? 11 : 13} />;
  let label = s.charAt(0).toUpperCase() + s.slice(1);

  switch (s) {
    case "paid":
      colorClasses = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      icon = <CheckCircle2 size={size === "sm" ? 11 : 13} />;
      label = "Paid";
      break;
    case "pending":
      colorClasses = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      icon = <Clock size={size === "sm" ? 11 : 13} />;
      label = "Pending";
      break;
    case "failed":
      colorClasses = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      icon = <AlertTriangle size={size === "sm" ? 11 : 13} />;
      label = "Failed";
      break;
    case "refunded":
      colorClasses = "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30";
      icon = <RotateCcw size={size === "sm" ? 11 : 13} />;
      label = "Refunded";
      break;
  }

  const paddingClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider border shrink-0 ${paddingClass} ${colorClasses}`}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
}
