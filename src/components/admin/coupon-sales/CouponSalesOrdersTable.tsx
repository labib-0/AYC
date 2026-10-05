"use client";

import React from "react";
import { 
  ShoppingBag, 
  Eye, 
  Tag, 
  User as UserIcon, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Truck, 
  PackageCheck,
  SearchX
} from "lucide-react";
import { CouponSalesOrderRecord } from "@/services/admin/coupon.service";

export interface CouponSalesOrdersTableProps {
  orders: CouponSalesOrderRecord[];
  loading?: boolean;
  currentPage: number;
  lastPage: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onViewOrder: (order: CouponSalesOrderRecord) => void;
  search?: string;
}

export default function CouponSalesOrdersTable({
  orders,
  loading = false,
  currentPage,
  lastPage,
  totalItems,
  perPage,
  onPageChange,
  onViewOrder,
  search,
}: CouponSalesOrdersTableProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number, currency = "USD") => {
    const symbol = currency === "BDT" ? "৳" : currency === "EUR" ? "€" : "$";
    return `${symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderStatusBadge = (status: string, paymentStatus?: string) => {
    const s = (status || "").toLowerCase();
    const isPaid = paymentStatus === "paid";

    if (s === "delivered") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <PackageCheck size={11} />
          <span>Delivered</span>
        </span>
      );
    }
    if (s === "shipped") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <Truck size={11} />
          <span>Shipped</span>
        </span>
      );
    }
    if (s === "processing" || s === "confirmed" || isPaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={11} />
          <span>{s === "confirmed" ? "Confirmed" : s === "processing" ? "Processing" : "Paid"}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Clock size={11} />
        <span className="capitalize">{s || "Pending"}</span>
      </span>
    );
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
      {/* Table Section Header */}
      <div className="px-5 py-3.5 border-b border-border/80 flex items-center justify-between bg-secondary/15">
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            ATTRIBUTED ORDERS
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Orders generated using your assigned coupons
          </p>
        </div>
        <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-mono font-semibold text-muted-foreground border border-border/60">
          {totalItems} {totalItems === 1 ? "Order" : "Orders"}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/30 text-muted-foreground font-mono font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">ORDER</th>
              <th className="py-2.5 px-4">DATE</th>
              <th className="py-2.5 px-4">CUSTOMER</th>
              <th className="py-2.5 px-4">COUPON</th>
              <th className="py-2.5 px-4 text-right">DISCOUNT</th>
              <th className="py-2.5 px-4 text-right">TOTAL</th>
              <th className="py-2.5 px-4 text-center">STATUS</th>
              <th className="py-2.5 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              // Polished Table Skeletons to prevent layout shifts
              Array.from({ length: Math.min(5, perPage) }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-28 bg-secondary/60 rounded-md mb-1" />
                    <div className="h-3 w-16 bg-secondary/40 rounded-md" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3.5 w-20 bg-secondary/50 rounded-md" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3.5 w-32 bg-secondary/50 rounded-md" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-5 w-24 bg-secondary/60 rounded-lg" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-3.5 w-14 bg-secondary/50 rounded-md ml-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-4 w-18 bg-secondary/60 rounded-md ml-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="h-5 w-20 bg-secondary/50 rounded-full mx-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-6 w-14 bg-secondary/60 rounded-lg ml-auto" />
                  </td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-14 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="p-3 rounded-2xl bg-secondary/50 text-muted-foreground mb-2.5">
                      {search ? <SearchX size={22} /> : <ShoppingBag size={22} />}
                    </div>
                    <p className="font-bold text-foreground text-xs uppercase tracking-wide">
                      {search ? "NO MATCHING ORDERS" : "NO SALES YET"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {search
                        ? "No qualifying orders match your search criteria. Try a different query or reset filters."
                        : "No qualifying orders were found for the selected filters."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const couponCode = order.coupon_code || order.coupon?.code || "COUPON";
                const discountType = order.coupon?.discount_type;
                const discountVal = order.coupon?.discount_value;
                const discountAmount = Number(order.discount_amount || 0);
                const totalAmount = Number(order.total_amount || 0);
                const currency = order.currency || "USD";

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-secondary/20 transition-colors group"
                  >
                    {/* Order Reference */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-foreground">
                        {order.order_number}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        #{order.id}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-muted-foreground/80 shrink-0" />
                        <span>{formatDate(order.placed_at || order.created_at)}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded-md bg-secondary text-muted-foreground shrink-0">
                          <UserIcon size={11} />
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="font-medium text-foreground truncate">
                            {order.shipping_name || "Customer"}
                          </div>
                          {order.email && (
                            <div className="text-[10px] text-muted-foreground truncate font-mono">
                              {order.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Coupon Used */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                        <Tag size={11} />
                        <span className="font-mono font-bold">{couponCode}</span>
                        {discountVal !== undefined && (
                          <span className="text-[10px] opacity-75 font-mono">
                            ({discountType === "percentage" ? `${discountVal}%` : `$${discountVal}`})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-400 font-mono whitespace-nowrap">
                      -{formatCurrency(discountAmount, currency)}
                    </td>

                    {/* Order Total */}
                    <td className="py-3 px-4 text-right font-bold font-mono text-foreground whitespace-nowrap">
                      {formatCurrency(totalAmount, currency)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {renderStatusBadge(order.status, order.payment_status)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewOrder(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground border border-border/60 transition-all cursor-pointer shadow-2xs"
                        id={`btn-view-order-${order.id}`}
                        title="View order details"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-secondary/10">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{orders.length}</span> of{" "}
            <span className="font-semibold text-foreground">{totalItems}</span> orders
          </div>

          {lastPage > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                title="Previous page"
                id="btn-prev-page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-foreground font-mono">
                {currentPage} / {lastPage}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= lastPage || loading}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                title="Next page"
                id="btn-next-page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
