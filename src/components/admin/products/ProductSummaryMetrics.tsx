"use client";

import { Package, CheckCircle2, FileText, AlertTriangle } from "lucide-react";

interface ProductSummaryMetricsProps {
  total: number;
  published: number;
  draft: number;
  lowStock: number;
}

const METRICS = [
  { key: "total", label: "Total Products", icon: Package, color: "text-foreground" },
  { key: "published", label: "Published", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
  { key: "draft", label: "Draft", icon: FileText, color: "text-amber-600 dark:text-amber-400" },
  { key: "lowStock", label: "Low Stock", icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
] as const;

export default function ProductSummaryMetrics({
  total,
  published,
  draft,
  lowStock,
}: ProductSummaryMetricsProps) {
  const values: Record<string, number> = { total, published, draft, lowStock };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {METRICS.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.key}
            className="bg-card border border-border/60 rounded-xl px-4 py-3.5 flex items-center gap-3"
          >
            <div className={`${m.color} shrink-0`}>
              <Icon size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                {m.label}
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground leading-tight">
                {values[m.key].toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
