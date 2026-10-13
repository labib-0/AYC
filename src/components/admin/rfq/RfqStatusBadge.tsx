import React from "react";
import { Clock, CheckCircle2 } from "lucide-react";

export interface RfqStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

/**
 * Determine if the RFQ status represents an approved state.
 * Any non-approved status (e.g. SUBMITTED, RFQ_RECEIVED, UNDER_REVIEW, PENDING)
 * maps to RFQ Pending.
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

export default function RfqStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: RfqStatusBadgeProps) {
  const approved = isRfqApproved(status);

  const colorClasses = approved
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";

  const icon = approved ? (
    <CheckCircle2 size={size === "sm" ? 11 : 13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
  ) : (
    <Clock size={size === "sm" ? 11 : 13} className="text-amber-600 dark:text-amber-400 shrink-0" />
  );

  const label = approved ? "RFQ Approved" : "RFQ Pending";

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border ${colorClasses} ${sizeClasses}`}
      data-testid="rfq-status-badge"
      data-status={approved ? "APPROVED" : "PENDING"}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
}
