"use client";

import React from "react";
import Link from "next/link";
import { CustomerRecentOrder } from "@/services/admin";
import { ShoppingBag, Eye, ExternalLink, Search, X } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/orders";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { DEFAULT_ADMIN_PAGE_SIZE } from "@/types/admin-listing";
import { useAdminListing } from "@/hooks/useAdminListing";

export interface CustomerOrdersTableProps {
  orders: CustomerRecentOrder[];
  orderBaseUrl?: string;
}

export default function CustomerOrdersTable({
  orders,
  orderBaseUrl = "/ayc/orders",
}: CustomerOrdersTableProps) {
  const {
    search,
    setSearch,
    items: displayedOrders,
    totalItems,
    totalPages,
    page,
    perPage,
    setPage,
    setPerPage,
  } = useAdminListing<CustomerRecentOrder>({
    items: orders,
    initialPageSize: DEFAULT_ADMIN_PAGE_SIZE,
    filterItem: (item, q) => {
      if (!q.trim()) return true;
      const term = q.toLowerCase().trim();
      return (
        item.order_number.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term) ||
        item.payment_status.toLowerCase().includes(term)
      );
    },
  });

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <ShoppingBag size={16} className="text-primary" />
          <span>Recent Orders ({orders.length})</span>
        </h2>

        {orders.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order number, status…"
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

      {orders.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <ShoppingBag size={28} className="mx-auto text-muted-foreground/50 stroke-1" />
          <p className="font-medium text-foreground">No orders found.</p>
          <p className="text-[11px]">This customer has not placed any commercial orders yet.</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <p className="font-medium text-foreground">No matching orders</p>
          <p className="text-[11px]">No orders match &quot;{search}&quot;.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {displayedOrders.map((ord) => {
            const detailHref = `${orderBaseUrl}/${ord.id}`;
            const formattedDate = ord.created_at
              ? new Date(ord.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";

            return (
              <div
                key={ord.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-secondary/20 transition-colors rounded-xl px-2 -mx-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={detailHref}
                      className="font-mono font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1 text-sm"
                    >
                      <span>{ord.order_number}</span>
                      <ExternalLink size={12} className="text-muted-foreground" />
                    </Link>
                  </div>
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    Placed on {formattedDate}
                  </span>
                </div>

                <div className="flex items-center gap-3 sm:justify-end flex-wrap">
                  <div className="text-right">
                    <span className="font-mono font-bold text-foreground text-sm block">
                      ${Number(ord.total_amount || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase block">
                      USD
                    </span>
                  </div>

                  <PaymentStatusBadge status={ord.payment_status} size="sm" />
                  <OrderStatusBadge status={ord.status} size="sm" />

                  <Link
                    href={detailHref}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs transition-colors cursor-pointer"
                    title="View Order Details"
                  >
                    <Eye size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {orders.length > 0 && (
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          itemName="orders"
          idPrefix="cust-orders-pagination"
        />
      )}
    </div>
  );
}
