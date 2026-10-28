"use client";

import { CheckSquare, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal, FileText, Loader2, X } from "lucide-react";

interface ProductBulkActionsProps {
  selectedCount: number;
  onBulkPublish: () => void;
  onBulkUnpublish: () => void;
  onBulkAdjustStock?: () => void;
  onBulkOfferSheet?: () => void;
  onClearSelection: () => void;
  loading?: boolean;
  offerSheetLoading?: boolean;
}

export default function ProductBulkActions({
  selectedCount,
  onBulkPublish,
  onBulkUnpublish,
  onBulkAdjustStock,
  onBulkOfferSheet,
  onClearSelection,
  loading,
  offerSheetLoading,
}: ProductBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-foreground/5 border border-border/80 rounded-xl animate-[scaleIn_150ms_ease] flex-wrap">
      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
        <CheckSquare size={14} className="text-primary" />
        <span className="tabular-nums">{selectedCount}</span>
        <span className="text-muted-foreground font-medium">
          product{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>

      <div className="w-px h-5 bg-border/80 mx-1 hidden sm:block" />

      {onBulkOfferSheet && (
        <button
          type="button"
          id="btn-bulk-offer-sheet"
          onClick={onBulkOfferSheet}
          disabled={loading || offerSheetLoading}
          className="h-7 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-black dark:hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          title={`Download single merged PDF containing Offer Sheets for all ${selectedCount} selected product${selectedCount !== 1 ? "s" : ""}`}
        >
          {offerSheetLoading ? (
            <Loader2 size={12} className="animate-spin text-amber-400 dark:text-amber-600" />
          ) : (
            <FileText size={12} className="text-amber-400 dark:text-amber-600" />
          )}
          <span>Download Combined Offer Sheet</span>
        </button>
      )}

      <button
        onClick={onBulkPublish}
        disabled={loading}
        className="h-7 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowUpCircle size={12} />
        Publish
      </button>

      <button
        onClick={onBulkUnpublish}
        disabled={loading}
        className="h-7 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowDownCircle size={12} />
        Unpublish
      </button>

      {onBulkAdjustStock && (
        <button
          onClick={onBulkAdjustStock}
          disabled={loading}
          className="h-7 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          <SlidersHorizontal size={12} />
          Adjust Stock
        </button>
      )}

      <button
        onClick={onClearSelection}
        className="h-7 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-auto cursor-pointer"
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
