"use client";

import React from "react";
import { Tag, Plus, FilterX } from "lucide-react";

interface BrandEmptyStateProps {
  isFiltered: boolean;
  onAddBrand?: () => void;
  onClearFilters?: () => void;
}

export default function BrandEmptyState({
  isFiltered,
  onAddBrand,
  onClearFilters,
}: BrandEmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="py-16 px-4 text-center space-y-3 bg-card border border-border/70 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
          <FilterX size={22} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">No brands found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No brands match your current search or filter criteria.
          </p>
        </div>
        {onClearFilters && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onClearFilters}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-foreground uppercase tracking-wider transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="py-16 px-4 text-center space-y-4 bg-card border border-border/70 rounded-2xl">
      <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
        <Tag size={22} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">No brands yet</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Add your first brand to start organizing your catalog and logo assets.
        </p>
      </div>
      {onAddBrand && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAddBrand}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Brand</span>
          </button>
        </div>
      )}
    </div>
  );
}
