"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function StorefrontRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Storefront Root Exception:", error);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xs">
        <AlertTriangle size={28} />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h1 className="text-xl font-bold font-display text-foreground uppercase tracking-wide">
          Something went wrong
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We encountered an unexpected error while loading this page. You can retry the request or return to the homepage.
        </p>
      </div>

      {error?.digest && (
        <p className="text-[11px] font-mono text-muted-foreground/70">
          Ref: {error.digest}
        </p>
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
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Home size={14} />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
