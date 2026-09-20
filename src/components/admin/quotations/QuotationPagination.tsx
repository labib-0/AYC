import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface QuotationPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function QuotationPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isLoading,
}: QuotationPaginationProps) {
  if (totalItems <= pageSize && currentPage === 1) {
    return null;
  }

  const start = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const end = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const midStart = Math.max(2, currentPage - 1);
      const midEnd = Math.min(totalPages - 1, currentPage + 1);
      for (let i = midStart; i <= midEnd; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-2">
      <div>
        Showing <strong className="text-foreground">{start}</strong> to{" "}
        <strong className="text-foreground">{end}</strong> of{" "}
        <strong className="text-foreground">{totalItems}</strong> quotations
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          aria-label="Previous Page"
          className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, i) => {
            if (p === "...") {
              return (
                <span key={`dots-${i}`} className="px-2 py-1 text-xs">
                  …
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(Number(p))}
                disabled={isLoading}
                className={`min-w-[32px] h-8 rounded-xl font-mono text-xs font-bold transition-colors ${
                  isCurrent
                    ? "bg-foreground text-background"
                    : "border border-border bg-card hover:bg-secondary text-foreground"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          aria-label="Next Page"
          className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
