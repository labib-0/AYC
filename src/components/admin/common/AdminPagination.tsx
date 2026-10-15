"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminPageSize, calculatePaginationRange, formatRecordCount } from "@/types/admin-listing";
import PageSizeSelector from "./PageSizeSelector";

export interface AdminPaginationProps {
  currentPage: number;
  totalPages?: number;
  totalItems: number;
  perPage: AdminPageSize | number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: AdminPageSize) => void;
  itemName?: string; // e.g. "products", "orders", "categories"
  showPageSizeSelector?: boolean;
  className?: string;
  idPrefix?: string;
}

/**
 * AYC Admin — Global Standard Pagination Component
 * Renders:
 * 1. Accurate record count range ("Showing 1–5 of 104 products" or "Showing all 101 products")
 * 2. Standard page-size selector (5 default, 10, 20, 50, All)
 * 3. Previous/Next navigation and ellipsis-aware page buttons (hidden when All is selected)
 */
export default function AdminPagination({
  currentPage,
  totalPages: propTotalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  itemName = "records",
  showPageSizeSelector = true,
  className = "",
  idPrefix = "admin-pagination",
}: AdminPaginationProps) {
  const isAll = perPage === "all";

  const { from, to, totalPages: calculatedTotalPages, safePage } = calculatePaginationRange(
    currentPage,
    perPage,
    totalItems
  );

  const effectiveTotalPages = propTotalPages !== undefined ? Math.max(1, propTotalPages) : calculatedTotalPages;

  // Generate numbered pages with ellipsis
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (effectiveTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= effectiveTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (safePage > 3) pages.push("ellipsis");

      const start = Math.max(2, safePage - 1);
      const end = Math.min(effectiveTotalPages - 1, safePage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (safePage < effectiveTotalPages - 2) pages.push("ellipsis");

      pages.push(effectiveTotalPages);
    }

    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 border-t border-border/50 ${className}`}
    >
      {/* Left: Record Count & Page Size Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-xs text-muted-foreground font-medium tabular-nums">
          {totalItems <= 0 ? (
            <span>Showing <span className="font-bold text-foreground">0</span> of <span className="font-bold text-foreground">0</span> {itemName}</span>
          ) : isAll ? (
            <span>
              Showing all <span className="font-bold text-foreground">{totalItems.toLocaleString()}</span> {itemName}
            </span>
          ) : (
            <span>
              Showing <span className="font-bold text-foreground">{from}</span>–
              <span className="font-bold text-foreground">{to}</span> of{" "}
              <span className="font-bold text-foreground">{totalItems.toLocaleString()}</span> {itemName}
            </span>
          )}
        </p>

        {showPageSizeSelector && onPerPageChange && (
          <PageSizeSelector
            id={`${idPrefix}-page-size`}
            value={perPage}
            onChange={onPerPageChange}
          />
        )}
      </div>

      {/* Right: Navigation Controls (hidden in 'All' mode since every item is on the single page) */}
      {!isAll && (
        <div className="flex items-center gap-1">
          {/* Previous */}
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Page Numbers */}
          {effectiveTotalPages > 1 ? (
            getPageNumbers().map((p, idx) =>
              p === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    p === safePage
                      ? "bg-foreground text-background"
                      : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  aria-current={p === safePage ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )
          ) : (
            <button
              type="button"
              disabled
              className="h-8 w-8 rounded-lg text-xs font-bold bg-foreground text-background cursor-default"
              aria-current="page"
            >
              1
            </button>
          )}

          {/* Next */}
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= effectiveTotalPages}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
