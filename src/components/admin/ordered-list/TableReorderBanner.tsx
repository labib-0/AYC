"use client";

import React from "react";
import { AlertCircle, Loader2, FilterX } from "lucide-react";

export interface TableReorderBannerProps {
  isSaving?: boolean;
  isReorderDisabled?: boolean;
  disabledReason?: string;
  onClearFilters?: () => void;
  className?: string;
}

export function TableReorderBanner({
  isSaving = false,
  isReorderDisabled = false,
  disabledReason = "Reordering is disabled while search or filters are active.",
  onClearFilters,
  className = "",
}: TableReorderBannerProps) {
  if (isSaving) {
    return (
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium shadow-2xs ${className}`}
        role="status"
        aria-live="polite"
      >
        <Loader2 size={14} className="animate-spin shrink-0" />
        <span>Saving updated sequence to database...</span>
      </div>
    );
  }

  if (isReorderDisabled) {
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-400 ${className}`}
        role="alert"
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{disabledReason}</span>
        </div>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-card hover:bg-amber-500/15 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            <FilterX size={12} />
            <span>Clear Filters to Reorder</span>
          </button>
        )}
      </div>
    );
  }

  return null;
}
