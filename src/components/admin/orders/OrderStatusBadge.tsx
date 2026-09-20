import React from "react";
import { 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  RotateCcw, 
  PackageCheck,
  AlertCircle 
} from "lucide-react";

export interface OrderStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export default function OrderStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: OrderStatusBadgeProps) {
  const s = (status || "").toLowerCase();

  let colorClasses = "bg-secondary text-foreground border-border";
  let icon = <AlertCircle size={size === "sm" ? 11 : 13} />;
  let label = s.charAt(0).toUpperCase() + s.slice(1);

  switch (s) {
    case "pending":
      colorClasses = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      icon = <Clock size={size === "sm" ? 11 : 13} />;
      label = "Pending";
      break;
    case "confirmed":
      colorClasses = "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30";
      icon = <CheckCircle2 size={size === "sm" ? 11 : 13} />;
      label = "Confirmed";
      break;
    case "processing":
      colorClasses = "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
      icon = <Clock size={size === "sm" ? 11 : 13} />;
      label = "Processing";
      break;
    case "shipped":
      colorClasses = "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30";
      icon = <Truck size={size === "sm" ? 11 : 13} />;
      label = "Shipped";
      break;
    case "delivered":
    case "fulfilled":
      colorClasses = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      icon = <PackageCheck size={size === "sm" ? 11 : 13} />;
      label = "Delivered";
      break;
    case "cancelled":
      colorClasses = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      icon = <XCircle size={size === "sm" ? 11 : 13} />;
      label = "Cancelled";
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
