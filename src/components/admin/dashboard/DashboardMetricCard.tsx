"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

export interface DashboardMetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "warning" | "success" | "info";
  subtext?: string;
  href?: string;
}

export default function DashboardMetricCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  subtext,
  href,
}: DashboardMetricCardProps) {
  const content = (
    <div
      className={`p-4 rounded-xl bg-card border transition-all duration-200 shadow-2xs flex flex-col justify-between ${
        variant === "warning"
          ? "border-amber-500/30 hover:border-amber-500/50 bg-amber-500/[0.02]"
          : "border-border/80 hover:border-border"
      } ${href ? "group cursor-pointer hover:-translate-y-0.5" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-sans truncate">
          {label}
        </span>
        <div
          className={`p-1.5 rounded-lg shrink-0 ${
            variant === "warning"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : variant === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-secondary text-muted-foreground group-hover:text-foreground"
          }`}
        >
          <Icon size={14} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {subtext && (
          <p
            className={`text-[11px] font-sans truncate ${
              variant === "warning"
                ? "text-amber-600/90 dark:text-amber-400/90 font-medium"
                : "text-muted-foreground"
            }`}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
