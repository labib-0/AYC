import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface OrderPaginationProps {
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  perPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function OrderPagination({
  currentPage,
  totalPages,
  totalOrders,
  perPage,
  onPageChange,
  isLoading = false,
}: OrderPaginationProps) {
  if (totalPages <= 1 && totalOrders <= perPage) {
    return null;
  }

  const startRecord = Math.min((currentPage - 1) * perPage + 1, totalOrders);
  const endRecord = Math.min(currentPage * perPage, totalOrders);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
      <div className="text-muted-foreground font-mono text-[11px]">
        Showing <strong className="text-foreground">{startRecord}</strong> to{" "}
        <strong className="text-foreground">{endRecord}</strong> of{" "}
        <strong className="text-foreground">{totalOrders}</strong> orders
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Previous Page"
          aria-label="Previous Page"
          id="btn-pagination-prev"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-2 text-muted-foreground font-mono">
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isCurrent = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-card hover:bg-secondary text-foreground"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Next Page"
          aria-label="Next Page"
          id="btn-pagination-next"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
