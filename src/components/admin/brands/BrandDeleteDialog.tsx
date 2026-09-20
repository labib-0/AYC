"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { BrandModel } from "@/services/brand.service";

interface BrandDeleteDialogProps {
  open: boolean;
  brand: BrandModel | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function BrandDeleteDialog({
  open,
  brand,
  onConfirm,
  onCancel,
  loading = false,
}: BrandDeleteDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      cancelBtnRef.current?.focus();
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

  if (!open || !brand) return null;

  const productCount = brand.products_count ?? 0;
  const hasProducts = productCount > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-delete-dialog-title"
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
          {hasProducts ? (
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <ShieldAlert size={20} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
              <AlertTriangle size={20} />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1.5">
            <h3
              id="brand-delete-dialog-title"
              className="text-sm font-bold text-foreground"
            >
              {hasProducts ? "Brand has associated products" : "Delete this brand?"}
            </h3>

            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                Brand: <strong className="text-foreground">{brand.name}</strong> ({brand.slug})
              </p>

              {hasProducts ? (
                <>
                  <p className="text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    {productCount} {productCount === 1 ? "product" : "products"} currently use this brand. Deleting it is blocked to prevent invalid catalog references.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Please reassign the associated products to another brand before deleting this brand record.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    This brand currently has <strong className="text-foreground">0 associated products</strong>.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    This action cannot be undone. The brand will be permanently removed from your catalog directory.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors cursor-pointer disabled:opacity-50"
          >
            {hasProducts ? "Close" : "Cancel"}
          </button>

          {!hasProducts && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              <span>{loading ? "Deleting..." : "Delete Brand"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
