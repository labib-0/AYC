"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, LayoutDashboard } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
        <AlertTriangle size={28} />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h1 className="text-xl font-bold font-display text-foreground uppercase tracking-wide">
          Admin Page Not Found
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The requested administrative view or record does not exist or has been relocated within the management portal.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <LayoutDashboard size={14} />
          <span>Admin Dashboard</span>
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );
}
