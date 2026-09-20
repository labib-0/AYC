import React from "react";
import { QuotationStatus } from "@/types/b2b";

export interface QuotationStatusBadgeProps {
  status: QuotationStatus | string;
  size?: "sm" | "md";
  className?: string;
}

export default function QuotationStatusBadge({
  status,
  size = "md",
  className = "",
}: QuotationStatusBadgeProps) {
  const s = String(status || "").toUpperCase();

  const sizeClass =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  switch (s) {
    case "READY":
    case "SENT":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20 ${sizeClass} ${className}`}
        >
          Issued
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
    case "NEGOTIATION":
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 ${sizeClass} ${className}`}
        >
          Revising
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
    default:
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-secondary text-foreground border border-border ${sizeClass} ${className}`}
        >
          {status}
        </span>
      );
  }
}
