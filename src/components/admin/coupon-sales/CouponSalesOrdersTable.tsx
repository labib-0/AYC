"use client";

import React from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Eye, 
  Tag, 
  User as UserIcon, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck
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
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/30 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Order Ref</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Coupon Used</th>
              <th className="py-3 px-4 text-right">Discount</th>
              <th className="py-3 px-4 text-right">Order Total</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span>Loading coupon sales orders...</span>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="p-3 rounded-2xl bg-secondary/50 text-muted-foreground mb-2">
                      <ShoppingBag size={24} />
                    </div>
                    <p className="font-semibold text-foreground text-xs">
                      {search ? "No Orders Match Your Search" : "No Qualifying Orders Found"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {search
                        ? "Try adjusting your search terms or filter range."
                        : "Orders generated with your assigned coupons will automatically appear here."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const couponCode = order.coupon_code || order.coupon?.code || "COUPON";
                const discountType = order.coupon?.discount_type;
                const discountVal = order.coupon?.discount_value;

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
                        ID: #{order.id}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-muted-foreground/80" />
                        <span>{formatDate(order.placed_at || order.created_at)}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-secondary/60 text-muted-foreground shrink-0">
                          <UserIcon size={12} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {order.shipping_name || "Customer"}
                          </div>
                          {order.email && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              {order.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Coupon Used */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                        <Tag size={11} />
                        <span className="font-mono font-bold">{couponCode}</span>
                        {discountVal !== undefined && (
                          <span className="text-[10px] opacity-80">
                            ({discountType === "percentage" ? `${discountVal}%` : `$${discountVal}`})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-400">
                      -${Number(order.discount_amount || 0).toFixed(2)}
                    </td>

                    {/* Order Total */}
                    <td className="py-3 px-4 text-right font-bold font-mono text-foreground">
                      ${Number(order.total_amount || 0).toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(order.status, order.payment_status)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onViewOrder(order)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground border border-border/60 transition-all cursor-pointer shadow-2xs"
                        id={`btn-view-order-${order.id}`}
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
            <span className="font-semibold text-foreground">{totalItems}</span> qualifying orders
          </div>

          {lastPage > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-foreground">
                Page {currentPage} of {lastPage}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= lastPage}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                title="Next page"
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
