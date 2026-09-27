import React from "react";
import { Clock, FileSearch, CheckCircle2, FileCheck, Check, DollarSign, AlertCircle } from "lucide-react";

export interface RfqStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export default function RfqStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: RfqStatusBadgeProps) {
  const s = (status || "").toUpperCase();

  let colorClasses = "bg-secondary text-foreground border-border";
  let icon = <AlertCircle size={size === "sm" ? 11 : 13} />;
  let label = s.replace(/_/g, " ");

  switch (s) {
    case "SUBMITTED":
    case "RFQ_RECEIVED":
      colorClasses = "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30";
      icon = <Clock size={size === "sm" ? 11 : 13} />;
      label = "RFQ Received";
      break;

    case "UNDER_REVIEW":
      colorClasses = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      icon = <FileSearch size={size === "sm" ? 11 : 13} />;
      label = "Under Review";
      break;

    case "APPROVED":
      colorClasses = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      icon = <CheckCircle2 size={size === "sm" ? 11 : 13} />;
      label = "Approved";
      break;

    case "QUOTATION_GENERATED":
    case "QUOTATION_PREPARED":
    case "SENT_TO_BUYER":
      colorClasses = "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30";
      icon = <FileCheck size={size === "sm" ? 11 : 13} />;
      label = "Quotation Generated";
      break;

    case "QUOTATION_APPROVED":
    case "ACCEPTED":
      colorClasses = "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30";
      icon = <Check size={size === "sm" ? 11 : 13} />;
      label = "Quotation Approved";
      break;

    case "PAID":
      colorClasses = "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 font-bold";
      icon = <DollarSign size={size === "sm" ? 11 : 13} />;
      label = "Payment Paid";
      break;

    default:
      colorClasses = "bg-secondary text-muted-foreground border-border/60";
      icon = <Clock size={size === "sm" ? 11 : 13} />;
      label = s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
      break;
  }

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border ${colorClasses} ${sizeClasses}`}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
}
