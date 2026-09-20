import React from "react";
import { Package, Truck, CheckCircle2, Clock, RotateCcw } from "lucide-react";

export interface FulfillmentStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export default function FulfillmentStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: FulfillmentStatusBadgeProps) {
  const s = (status || "").toLowerCase();

  let colorClasses = "bg-secondary text-foreground border-border";
  let icon = <Package size={size === "sm" ? 11 : 13} />;
  let label = s.charAt(0).toUpperCase() + s.slice(1);

  switch (s) {
    case "unfulfilled":
      colorClasses = "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30";
      icon = <Clock size={size === "sm" ? 11 : 13} />;
      label = "Unfulfilled";
      break;
    case "processing":
    case "partial":
      colorClasses = "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
      icon = <Package size={size === "sm" ? 11 : 13} />;
      label = s === "partial" ? "Partial" : "Processing";
      break;
    case "shipped":
      colorClasses = "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30";
      icon = <Truck size={size === "sm" ? 11 : 13} />;
      label = "Shipped";
      break;
    case "fulfilled":
    case "delivered":
      colorClasses = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      icon = <CheckCircle2 size={size === "sm" ? 11 : 13} />;
      label = s === "delivered" ? "Delivered" : "Fulfilled";
      break;
    case "returned":
      colorClasses = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      icon = <RotateCcw size={size === "sm" ? 11 : 13} />;
      label = "Returned";
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
