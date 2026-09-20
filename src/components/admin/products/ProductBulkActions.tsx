"use client";

import { CheckSquare, ArrowUpCircle, ArrowDownCircle, X } from "lucide-react";

interface ProductBulkActionsProps {
  selectedCount: number;
  onBulkPublish: () => void;
  onBulkUnpublish: () => void;
  onClearSelection: () => void;
  loading?: boolean;
}

export default function ProductBulkActions({
  selectedCount,
  onBulkPublish,
  onBulkUnpublish,
  onClearSelection,
  loading,
}: ProductBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-foreground/5 border border-border/80 rounded-xl animate-[scaleIn_150ms_ease]">
      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
        <CheckSquare size={14} className="text-primary" />
        <span className="tabular-nums">{selectedCount}</span>
        <span className="text-muted-foreground font-medium">
          product{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>

      <div className="w-px h-5 bg-border/80 mx-1" />

      <button
        onClick={onBulkPublish}
        disabled={loading}
        className="h-7 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
      >
        <ArrowUpCircle size={12} />
        Publish
      </button>

      <button
        onClick={onBulkUnpublish}
        disabled={loading}
        className="h-7 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
      >
        <ArrowDownCircle size={12} />
        Unpublish
      </button>

      <button
        onClick={onClearSelection}
        className="h-7 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-auto"
        aria-label="Clear selection"
      >
        <X size={14} />
      </button>

      <style jsx>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
