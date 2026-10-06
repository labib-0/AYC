"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function CustomerDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Customer Dashboard Exception:", error);
    }
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xs">
        <AlertCircle size={28} />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h1 className="text-xl font-bold font-display text-foreground uppercase tracking-wide">
          Account Portal Error
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          An error occurred while loading your customer account records. You may retry the action or return to the storefront.
        </p>
      </div>

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
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Home size={14} />
          <span>Storefront</span>
        </Link>
      </div>
    </div>
  );
}
