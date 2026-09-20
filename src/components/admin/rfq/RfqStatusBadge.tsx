import React from "react";
import { RfqStatus } from "@/types/b2b";

export interface RfqStatusBadgeProps {
  status: RfqStatus | string;
  size?: "sm" | "md";
  className?: string;
}

export default function RfqStatusBadge({
  status,
  size = "md",
  className = "",
}: RfqStatusBadgeProps) {
  const s = String(status || "").toUpperCase();

  const sizeClass =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  switch (s) {
    case "SUBMITTED":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20 ${sizeClass} ${className}`}
        >
          New Inquiry
        </span>
      );
    case "UNDER_REVIEW":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 ${sizeClass} ${className}`}
        >
          Under Review
        </span>
      );
    case "NEED_INFORMATION":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/20 ${sizeClass} ${className}`}
        >
          Need Info
        </span>
      );
    case "QUOTATION_PREPARED":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20 ${sizeClass} ${className}`}
        >
          Quote Ready
        </span>
      );
    case "SENT_TO_BUYER":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 ${sizeClass} ${className}`}
        >
          Quote Sent
        </span>
      );
    case "NEGOTIATION":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 ${sizeClass} ${className}`}
        >
          Negotiating
        </span>
      );
    case "ACCEPTED":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 ${sizeClass} ${className}`}
        >
          Accepted
        </span>
      );
    case "REJECTED":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-destructive/15 text-destructive border border-destructive/25 ${sizeClass} ${className}`}
        >
          Rejected
        </span>
      );
    case "EXPIRED":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-muted text-muted-foreground border border-border ${sizeClass} ${className}`}
        >
          Expired
        </span>
      );
    case "CONVERTED_TO_ORDER":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/20 ${sizeClass} ${className}`}
        >
          Converted Order
        </span>
      );
    case "CANCELLED":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-secondary text-muted-foreground border border-border ${sizeClass} ${className}`}
        >
          Cancelled
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-secondary text-foreground border border-border ${sizeClass} ${className}`}
        >
          {status || "Unknown"}
        </span>
      );
  }
}
