import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PromotionPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function PromotionPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PromotionPaginationProps) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border border-border/80 rounded-2xl shadow-2xs text-xs text-muted-foreground">
      <div>
        Showing <span className="font-semibold text-foreground">{start}</span> to{" "}
        <span className="font-semibold text-foreground">{end}</span> of{" "}
        <span className="font-semibold text-foreground">{totalItems}</span> promotions
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors cursor-pointer"
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="px-3 py-1 font-mono text-xs font-semibold text-foreground bg-secondary rounded-lg">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors cursor-pointer"
          title="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
