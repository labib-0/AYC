"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  X, 
  ExternalLink, 
  Tag, 
  User, 
  Calendar, 
  CreditCard, 
  Package, 
  AlertCircle,
  Loader2,
  DollarSign
} from "lucide-react";
import { adminCouponService, CouponSalesOrderRecord } from "@/services/admin/coupon.service";

export interface CouponSalesOrderDetailDrawerProps {
  order: CouponSalesOrderRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CouponSalesOrderDetailDrawer({
  order,
  isOpen,
  onClose,
}: CouponSalesOrderDetailDrawerProps) {
  const [fullOrder, setFullOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !order) {
      setFullOrder(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    adminCouponService
      .getCouponSalesOrder(order.id)
      .then((data) => {
        if (isMounted) setFullOrder(data);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError((err as Error)?.message || "Failed to load order details.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const displayOrder = fullOrder || order;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Package size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-bold uppercase tracking-tight text-foreground font-mono">
                  {displayOrder.order_number}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-secondary text-secondary-foreground border border-border">
                  {displayOrder.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Attributed coupon sale details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/ayc/orders/${order.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground border border-border/60 transition-colors"
              title="Open full order management view"
            >
              <span>Full Order Page</span>
              <ExternalLink size={12} />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 size={20} className="animate-spin text-primary" />
              <span className="text-xs">Loading order details...</span>
            </div>
          ) : (
            <>
              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-secondary/20 border border-border/70">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Subtotal</div>
                  <div className="text-sm font-semibold font-mono text-foreground mt-0.5">
                    ${Number(displayOrder.subtotal || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Coupon Discount</div>
                  <div className="text-sm font-semibold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                    -${Number(displayOrder.discount_amount || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Shipping Cost</div>
                  <div className="text-sm font-semibold font-mono text-foreground mt-0.5">
                    ${Number(displayOrder.shipping_cost || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-primary">Final Total</div>
                  <div className="text-sm font-bold font-mono text-primary mt-0.5">
                    ${Number(displayOrder.total_amount || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Attribution & Coupon Info */}
              <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Tag size={13} className="text-primary" />
                  <span>Attributed Coupon</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="font-mono font-bold text-sm text-foreground bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                    {displayOrder.coupon_code || displayOrder.coupon?.code || "COUPON"}
                  </span>
                  {displayOrder.coupon?.discount_type && (
                    <span className="text-xs px-2 py-1 rounded-lg bg-secondary text-secondary-foreground font-medium">
                      {displayOrder.coupon.discount_type === "percentage"
                        ? `${displayOrder.coupon.discount_value}% OFF`
                        : `$${displayOrder.coupon.discount_value} OFF`}
                    </span>
                  )}
                  {displayOrder.coupon?.min_spend && (
                    <span className="text-xs text-muted-foreground">
                      (Min Spend: ${displayOrder.coupon.min_spend})
                    </span>
                  )}
                </div>
              </div>

              {/* Customer & Shipping Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 mb-2">
                    <User size={13} className="text-primary" />
                    <span>Customer Details</span>
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {displayOrder.shipping_name || "Customer Information"}
                  </div>
                  {displayOrder.email && (
                    <div className="text-xs text-muted-foreground">
                      {displayOrder.email}
                    </div>
                  )}
                  {displayOrder.shipping_phone && (
                    <div className="text-xs text-muted-foreground">
                      Phone: {displayOrder.shipping_phone}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 mb-2">
                    <Calendar size={13} className="text-primary" />
                    <span>Order Timing & Payment</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Date: {displayOrder.placed_at || displayOrder.created_at || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Payment Method: <span className="uppercase font-semibold text-foreground">{displayOrder.payment_method || "Card"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Payment Status: <span className="capitalize font-semibold text-foreground">{displayOrder.payment_status || "Pending"}</span>
                  </div>
                </div>
              </div>

              {/* Line Items (if permitted and loaded) */}
              {Array.isArray(displayOrder.items) && displayOrder.items.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Order Items ({displayOrder.items.length})
                  </div>
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/30 text-muted-foreground font-semibold">
                        <tr>
                          <th className="py-2 px-3">Product</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Price</th>
                          <th className="py-2 px-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {displayOrder.items.map((it: any) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 font-medium text-foreground">
                              {it.product_name || "Product Item"}
                              {it.variant_title && (
                                <span className="text-[11px] text-muted-foreground ml-1.5">
                                  ({it.variant_title})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-mono">
                              {it.quantity}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              ${Number(it.unit_price || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                              ${Number(it.line_total || it.unit_price * it.quantity || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-border bg-secondary/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
