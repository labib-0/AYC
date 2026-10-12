"use client";

import React, { useState } from "react";
import { CustomerPurchasedProduct } from "@/services/admin";
import { Package, ShoppingBag, Search, X } from "lucide-react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { AdminPageSize, DEFAULT_ADMIN_PAGE_SIZE } from "@/types/admin-listing";
import { useAdminListing } from "@/hooks/useAdminListing";

export interface CustomerPurchasedProductsTableProps {
  products: CustomerPurchasedProduct[];
}

export default function CustomerPurchasedProductsTable({
  products,
}: CustomerPurchasedProductsTableProps) {
  const {
    search,
    setSearch,
    items: displayedProducts,
    totalItems,
    totalPages,
    page,
    perPage,
    setPage,
    setPerPage,
  } = useAdminListing<CustomerPurchasedProduct>({
    items: products,
    initialPageSize: DEFAULT_ADMIN_PAGE_SIZE,
    filterItem: (item, q) => {
      if (!q.trim()) return true;
      const term = q.toLowerCase().trim();
      return (
        item.product_name.toLowerCase().includes(term) ||
        (item.sku && item.sku.toLowerCase().includes(term)) ||
        item.order_number.toLowerCase().includes(term)
      );
    },
  });

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Package size={16} className="text-primary" />
          <span>Products Purchased ({products.length})</span>
        </h2>

        {/* Search input if items exist */}
        {products.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, SKU, order…"
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

      {products.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <ShoppingBag size={28} className="mx-auto text-muted-foreground/50 stroke-1" />
          <p className="font-medium text-foreground">No purchased products yet.</p>
          <p className="text-[11px]">
            Items will appear here once the customer completes commercial orders.
          </p>
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <p className="font-medium text-foreground">No matching products found</p>
          <p className="text-[11px]">No items match &quot;{search}&quot;.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/20 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
                <th className="py-2.5 px-3">Order Number</th>
                <th className="py-2.5 px-3">Order Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {displayedProducts.map((item, idx) => {
                const formattedDate = item.order_date
                  ? new Date(item.order_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground">
                      {item.product_name}
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
                      {item.sku || "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-foreground">
                      ${Number(item.unit_price || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                      ${Number(item.line_total || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-3 font-mono text-foreground font-semibold">
                      {item.order_number}
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
                      {formattedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {products.length > 0 && (
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          itemName="purchased products"
          idPrefix="cust-purchased-products-pagination"
        />
      )}
    </div>
  );
}
