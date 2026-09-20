import React from "react";
import { CheckCircle2, Clock, XCircle, Shield, Briefcase, User as UserIcon, Award } from "lucide-react";

export interface CustomerStatusBadgeProps {
  type: "b2b" | "role";
  value: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export default function CustomerStatusBadge({
  type,
  value,
  size = "md",
  showIcon = true,
}: CustomerStatusBadgeProps) {
  const val = (value || "").toLowerCase();
  const paddingClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  if (type === "b2b") {
    let colorClasses = "bg-secondary text-foreground border-border";
    let icon = <Clock size={size === "sm" ? 11 : 13} />;
    let label = val.charAt(0).toUpperCase() + val.slice(1);

    switch (val) {
      case "approved":
        colorClasses = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
        icon = <CheckCircle2 size={size === "sm" ? 11 : 13} />;
        label = "B2B Approved";
        break;
      case "pending":
        colorClasses = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
        icon = <Clock size={size === "sm" ? 11 : 13} />;
        label = "Pending Verification";
        break;
      case "rejected":
        colorClasses = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
        icon = <XCircle size={size === "sm" ? 11 : 13} />;
        label = "B2B Rejected";
        break;
      case "none":
      default:
        colorClasses = "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30";
        icon = <UserIcon size={size === "sm" ? 11 : 13} />;
        label = "Standard Retail";
        break;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider border shrink-0 ${paddingClass} ${colorClasses}`}
      >
        {showIcon && icon}
        <span>{label}</span>
      </span>
    );
  }

  // Role Badge
  let colorClasses = "bg-secondary text-foreground border-border";
  let icon = <UserIcon size={size === "sm" ? 11 : 13} />;
  let label = val.replace(/_/g, " ").toUpperCase();

  switch (val) {
    case "b2b_buyer":
      colorClasses = "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
      icon = <Briefcase size={size === "sm" ? 11 : 13} />;
      label = "B2B Buyer";
      break;
    case "admin":
      colorClasses = "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30";
      icon = <Shield size={size === "sm" ? 11 : 13} />;
      label = "Admin";
      break;
    case "sales":
      colorClasses = "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30";
      icon = <Award size={size === "sm" ? 11 : 13} />;
      label = "Sales Rep";
      break;
    case "customer":
    default:
      colorClasses = "bg-secondary border border-border text-foreground";
      icon = <UserIcon size={size === "sm" ? 11 : 13} />;
      label = "Retail Customer";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider border shrink-0 ${paddingClass} ${colorClasses}`}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
}
