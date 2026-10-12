"use client";

import React, { useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { AdminPageSize } from "@/types/admin-listing";
import PageSizeSelector from "./PageSizeSelector";

export interface AdminListingToolbarProps {
  // Search state & controls
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
  placeholder?: string;
  searchId?: string;

  // Page Size state & controls
  perPage?: number;
  onPerPageChange?: (perPage: AdminPageSize) => void;
  showPageSizeSelector?: boolean;

  // Filter slots & actions
  children?: React.ReactNode;
  rightActions?: React.ReactNode;

  // Clear filters
  hasActiveFilters?: boolean;
  onClearAllFilters?: () => void;

  // Status
  isLoading?: boolean;
  className?: string;
}

/**
 * AYC Admin — Global Reusable Listing Toolbar
 * Provides standardized search with 300ms debouncing, clear action,
 * page size selector, and module-specific filter slots.
 */
export default function AdminListingToolbar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  placeholder = "Search records…",
  searchId = "admin-listing-search",
  perPage,
  onPerPageChange,
  showPageSizeSelector = false,
  children,
  rightActions,
  hasActiveFilters = false,
  onClearAllFilters,
  isLoading = false,
  className = "",
}: AdminListingToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearchSubmit) {
      e.preventDefault();
      onSearchSubmit();
    }
  };

  const handleClearSearch = () => {
    onSearchChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            ref={inputRef}
            id={searchId}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-9 pl-9 pr-9 rounded-lg border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors"
          />
          {isLoading ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Loader2 size={13} className="text-muted-foreground animate-spin" />
            </div>
          ) : searchValue ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear search query"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        {/* Module Specific Filters (Children) */}
        {children}

        {/* Top Page Size Selector (Optional) */}
        {showPageSizeSelector && perPage !== undefined && onPerPageChange && (
          <PageSizeSelector
            id={`${searchId}-top-per-page`}
            value={perPage}
            onChange={onPerPageChange}
          />
        )}

        {/* Clear All Filters Button */}
        {hasActiveFilters && onClearAllFilters && (
          <button
            type="button"
            onClick={onClearAllFilters}
            className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <X size={13} />
            <span>Reset</span>
          </button>
        )}

        {/* Right Actions Slot (e.g. Add, Export) */}
        {rightActions && <div className="ml-auto flex items-center gap-2">{rightActions}</div>}
      </div>
    </div>
  );
}
