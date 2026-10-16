import React from "react";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

export interface RfqStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

/**
 * Determine if the RFQ status represents an approved state.
 */
export function isRfqApproved(status?: string): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return [
    "APPROVED",
    "QUOTATION_GENERATED",
    "QUOTATION_APPROVED",
    "QUOTATION_PREPARED",
    "SENT_TO_BUYER",
    "ACCEPTED",
    "PAID",
  ].includes(s);
}

/**
 * Determine if the RFQ status represents a rejected state.
 */
export function isRfqRejected(status?: string): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return ["REJECTED", "CANCELLED", "DECLINED"].includes(s);
}

export default function RfqStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: RfqStatusBadgeProps) {
  const approved = isRfqApproved(status);
  const rejected = isRfqRejected(status);

  let colorClasses = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  let label = "RFQ Pending";
  let icon = <Clock size={size === "sm" ? 11 : 13} className="text-amber-600 dark:text-amber-400 shrink-0" />;
  let dataStatus = "PENDING";

  if (approved) {
    colorClasses = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    label = "RFQ Approved";
    icon = <CheckCircle2 size={size === "sm" ? 11 : 13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
    dataStatus = "APPROVED";
  } else if (rejected) {
    colorClasses = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
    label = "RFQ Rejected";
    icon = <XCircle size={size === "sm" ? 11 : 13} className="text-rose-600 dark:text-rose-400 shrink-0" />;
    dataStatus = "REJECTED";
  }

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border ${colorClasses} ${sizeClasses}`}
      data-testid="rfq-status-badge"
      data-status={dataStatus}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
}
