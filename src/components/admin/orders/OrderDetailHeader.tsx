import React from "react";
import Link from "next/link";
import { OrderRecord } from "@/services/order.service";
import OrderStatusBadge from "./OrderStatusBadge";
import PaymentStatusBadge from "./PaymentStatusBadge";
import FulfillmentStatusBadge from "./FulfillmentStatusBadge";
import { ArrowLeft, RefreshCw, FileText, Printer, Package } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface OrderDetailHeaderProps {
  order: OrderRecord;
  backHref?: string;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function OrderDetailHeader({
  order,
  backHref = "/ayc/orders",
  onRefresh,
  isLoading = false,
}: OrderDetailHeaderProps) {
  const { can } = useAdminAuth();
  const createdDate = order.placed_at || order.created_at;
  const formattedDate = createdDate
    ? new Date(createdDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      })
    : "—";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
      {/* Back Link & Title */}
      <div className="space-y-1.5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          id="link-back-to-orders"
        >
          <ArrowLeft size={14} />
          <span>Back to Orders</span>
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
            Order #{order.order_number}
          </h1>

          <div className="flex items-center gap-2 flex-wrap">
            <OrderStatusBadge status={order.status} size="md" />
            <PaymentStatusBadge status={order.payment_status} size="md" />
            <FulfillmentStatusBadge status={order.fulfillment_status} size="md" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-mono">
          Placed on {formattedDate}
        </p>
      </div>

      {/* Commercial Document Action Bar & Refresh */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {can("document.view") && (
          <>
            <Link
              href={`/ayc/documents/ORDER_SHEET/order_${order.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/80 border border-border text-foreground hover:bg-secondary text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              title="Commercial Order Sheet"
              id="btn-doc-order-sheet"
            >
              <FileText size={13} className="text-primary" />
              <span>Order Sheet</span>
            </Link>

            <Link
              href={`/ayc/documents/PROFORMA_INVOICE/order_${order.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/80 border border-border text-foreground hover:bg-secondary text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              title="Proforma Invoice"
              id="btn-doc-pi"
            >
              <FileText size={13} className="text-primary" />
              <span>PI</span>
            </Link>

            <Link
              href={`/ayc/documents/COMMERCIAL_INVOICE/order_${order.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              title="Commercial Invoice"
              id="btn-doc-commercial-invoice"
            >
              <Printer size={13} />
              <span>Commercial Invoice</span>
            </Link>

            <Link
              href={`/ayc/documents/PACKING_LIST/order_${order.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/80 border border-border text-foreground hover:bg-secondary text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              title="Packing List"
              id="btn-doc-packing-list"
            >
              <Package size={13} className="text-primary" />
              <span>Packing List</span>
            </Link>
          </>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          title="Refresh Order"
          aria-label="Refresh Order"
          id="btn-refresh-order-detail"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-primary" : ""} />
        </button>
      </div>
    </div>
  );
}
