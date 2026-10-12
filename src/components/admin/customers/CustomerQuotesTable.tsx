"use client";

import React from "react";
import { CustomerRecentQuote } from "@/services/admin";
import { FileText, Search, X } from "lucide-react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { DEFAULT_ADMIN_PAGE_SIZE } from "@/types/admin-listing";
import { useAdminListing } from "@/hooks/useAdminListing";

export interface CustomerQuotesTableProps {
  quotes: CustomerRecentQuote[];
}

export default function CustomerQuotesTable({ quotes }: CustomerQuotesTableProps) {
  const {
    search,
    setSearch,
    items: displayedQuotes,
    totalItems,
    totalPages,
    page,
    perPage,
    setPage,
    setPerPage,
  } = useAdminListing<CustomerRecentQuote>({
    items: quotes,
    initialPageSize: DEFAULT_ADMIN_PAGE_SIZE,
    filterItem: (item, q) => {
      if (!q.trim()) return true;
      const term = q.toLowerCase().trim();
      return (
        item.rfq_number.toLowerCase().includes(term) ||
        (item.request_title && item.request_title.toLowerCase().includes(term)) ||
        item.status.toLowerCase().includes(term)
      );
    },
  });

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <span>Recent RFQs &amp; Quotations ({quotes.length})</span>
        </h2>

        {quotes.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search RFQ number, title…"
              className="w-full h-8 pl-8 pr-7 rounded-lg border border-border bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <FileText size={28} className="mx-auto text-muted-foreground/50 stroke-1" />
          <p className="font-medium text-foreground">No quotations found.</p>
          <p className="text-[11px]">No wholesale quotation requests recorded for this customer.</p>
        </div>
      ) : displayedQuotes.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <p className="font-medium text-foreground">No matching quotations</p>
          <p className="text-[11px]">No quotations match &quot;{search}&quot;.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {displayedQuotes.map((q) => {
            const formattedDate = q.created_at
              ? new Date(q.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";

            return (
              <div
                key={q.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-foreground block">
                    {q.rfq_number}
                  </span>
                  {q.request_title && (
                    <span className="text-muted-foreground text-[11px] block truncate max-w-xs">
                      {q.request_title}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    Created on {formattedDate}
                  </span>
                </div>

                <div className="sm:text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary border border-border text-foreground">
                    {q.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {quotes.length > 0 && (
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          itemName="quotations"
          idPrefix="cust-quotes-pagination"
        />
      )}
    </div>
  );
}
