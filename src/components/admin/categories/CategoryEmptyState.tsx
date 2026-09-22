"use client";

import React from "react";
import { Layers, Plus, FilterX } from "lucide-react";

interface CategoryEmptyStateProps {
  isFiltered: boolean;
  onAddCategory?: () => void;
  onClearFilters?: () => void;
}

export default function CategoryEmptyState({
  isFiltered,
  onAddCategory,
  onClearFilters,
}: CategoryEmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="py-16 px-4 text-center space-y-3 bg-card border border-border/70 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
          <FilterX size={22} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">
            No categories match your current search or filter.
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search terms or status filter to view available categories.
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
        <Layers size={22} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">No product categories yet</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Add a category to start organizing your catalog.
        </p>
      </div>
      {onAddCategory && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAddCategory}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Category</span>
          </button>
        </div>
      )}
    </div>
  );
}
