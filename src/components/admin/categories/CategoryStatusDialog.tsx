"use client";

import React, { useEffect, useRef } from "react";
import { Power, X } from "lucide-react";
import { CategoryModel } from "@/services/category.service";

interface CategoryStatusDialogProps {
  open: boolean;
  category: CategoryModel | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function CategoryStatusDialog({
  open,
  category,
  onConfirm,
  onCancel,
  loading = false,
}: CategoryStatusDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmBtnRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel, loading]);

  if (!open || !category) return null;

  const isCurrentlyActive = category.is_active !== false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-status-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!loading) onCancel();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150 z-10">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isCurrentlyActive
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            }`}
          >
            <Power size={20} />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <h3
              id="category-status-dialog-title"
              className="text-sm font-bold text-foreground"
            >
              {isCurrentlyActive ? "Deactivate Category?" : "Activate Category?"}
            </h3>

            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                Category: <strong className="text-foreground">{category.name}</strong>
              </p>
              <p>
                {isCurrentlyActive
                  ? "Products using this category will retain their category relationship, but the category will be marked inactive and hidden from storefront filters."
                  : "This category will be marked active and become visible across storefront navigation and category filters."}
              </p>
            </div>
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
              isCurrentlyActive
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            <span>
              {loading
                ? isCurrentlyActive
                  ? "Deactivating..."
                  : "Activating..."
                : isCurrentlyActive
                ? "Deactivate"
                : "Activate"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
