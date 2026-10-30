"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ArrowUpDown, Loader2 } from "lucide-react";
import { B2BProductInput } from "@/types/b2b";

interface ProductSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: B2BProductInput | null;
  currentPosition: number;
  totalProducts: number;
  minPosition?: number;
  maxPosition?: number;
  onSave: (product: B2BProductInput, newPosition: number) => Promise<void>;
}

export default function ProductSortModal({
  isOpen,
  onClose,
  product,
  currentPosition,
  totalProducts,
  minPosition = 1,
  maxPosition,
  onSave,
}: ProductSortModalProps) {
  const effectiveMax = maxPosition !== undefined && maxPosition > 0 ? maxPosition : totalProducts;
  const [requiredPosition, setRequiredPosition] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRequiredPosition("");
      setError(null);
      setIsSubmitting(false);
      // Auto-focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, currentPosition]);

  if (!isOpen || !product) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = requiredPosition.trim();
    if (!trimmed) {
      setError("Please enter a required position.");
      return;
    }

    const num = Number(trimmed);
    if (!Number.isInteger(num)) {
      setError("Required position must be a whole number.");
      return;
    }

    if (num < minPosition || num > effectiveMax) {
      setError(`Required position must be between ${minPosition} and ${effectiveMax}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(product, num);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update product position.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !isSubmitting) {
      onClose();
    }
  };

  return (
    <div
      data-testid="modal-sort-product"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sort-modal-title"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/70 bg-secondary/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ArrowUpDown size={16} />
            </div>
            <div>
              <h2 id="sort-modal-title" className="text-sm font-bold text-foreground">
                Sort Product Position
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Move product to an exact position in catalog
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-7 h-7 rounded-lg border border-border/60 bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Product Name */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Product
            </label>
            <div className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/60 text-xs font-bold text-foreground truncate">
              {product.name || product.productId || "(Untitled Product)"}
            </div>
          </div>

          {/* Current vs Required Position Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current Position (Read-Only) */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Current Position
              </label>
              <input
                type="text"
                readOnly
                value={currentPosition > 0 ? currentPosition : "—"}
                className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border/60 text-xs font-mono font-bold text-foreground/80 text-center select-all cursor-default"
                tabIndex={-1}
              />
            </div>

            {/* Required Position (Input) */}
            <div>
              <label
                htmlFor="input-required-position"
                className="text-[11px] font-bold uppercase tracking-wider text-foreground block mb-1"
              >
                Required Position
              </label>
              <input
                ref={inputRef}
                id="input-required-position"
                data-testid="input-sort-position"
                type="number"
                min={minPosition}
                max={effectiveMax}
                value={requiredPosition}
                onChange={(e) => {
                  setRequiredPosition(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                placeholder={`1 - ${effectiveMax}`}
                className="w-full px-3 py-2 rounded-xl bg-card border border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs font-mono font-bold text-foreground text-center tabular-nums transition-all outline-none"
              />
            </div>
          </div>

          <p className="text-[10.5px] text-muted-foreground">
            Valid range: <span className="font-semibold text-foreground">{minPosition}</span> to{" "}
            <span className="font-semibold text-foreground">{effectiveMax}</span>. Other products will shift automatically.
          </p>

          {/* Error Message */}
          {error && (
            <div
              data-testid="sort-modal-error"
              className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-[11px] text-red-600 dark:text-red-400 font-medium"
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
            <button
              type="button"
              data-testid="btn-cancel-sort"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="btn-save-sort"
              disabled={isSubmitting || !requiredPosition.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

