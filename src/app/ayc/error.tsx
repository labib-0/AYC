"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Portal Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 shadow-xs">
        <AlertOctagon size={28} />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h1 className="text-xl font-bold font-display text-foreground uppercase tracking-wide">
          Admin Interface Exception
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          An unexpected error occurred while rendering this administrative view. You may retry the action or return to the main dashboard.
        </p>
      </div>

      {error?.message && (
        <div className="p-3 rounded-xl bg-secondary/50 border border-border text-left font-mono text-[11px] text-muted-foreground max-w-lg overflow-x-auto">
          {error.message}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <RotateCcw size={14} />
          <span>Retry</span>
        </button>
        <Link
          href="/ayc/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <LayoutDashboard size={14} />
          <span>Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
