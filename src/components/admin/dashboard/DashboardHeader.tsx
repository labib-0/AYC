"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

interface DashboardHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export default function DashboardHeader({
  onRefresh,
  isLoading,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/70">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground font-sans">
          Dashboard
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-sans">
          Overview of your store operations and current activity.
        </p>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh dashboard data"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border/80 bg-card text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs active:scale-[0.98]"
        >
          <RefreshCw
            size={13}
            className={isLoading ? "animate-spin text-foreground" : "text-muted-foreground"}
          />
          <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>
    </div>
  );
}
