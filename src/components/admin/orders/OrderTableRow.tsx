import React from "react";
import Link from "next/link";
import { OrderRecord } from "@/services/order.service";
import OrderStatusBadge from "./OrderStatusBadge";
import PaymentStatusBadge from "./PaymentStatusBadge";
import FulfillmentStatusBadge from "./FulfillmentStatusBadge";
import { Eye, FileCheck } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface OrderTableRowProps {
  order: OrderRecord;
  detailBaseUrl?: string;
  onReviewPaymentProof?: (order: OrderRecord) => void;
}

export default function OrderTableRow({
  order,
  detailBaseUrl = "/admin/orders",
  onReviewPaymentProof,
}: OrderTableRowProps) {
  const { can } = useAdminAuth();
  const customerName = order.shipping_name || order.user?.name || "Guest";
  const companyName = order.shipping_company || order.user?.company_name || null;
  const itemCount = order.items?.length || 0;
  const totalPieces = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  
  const createdDate = order.placed_at || order.created_at;
  const formattedDate = createdDate
    ? new Date(createdDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const hasPendingProof =
    Boolean(order.payment_proof_url) && order.payment_status === "pending";

  const detailHref = `${detailBaseUrl}/${order.id}`;

  return (
    <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors text-xs">
      {/* 1. Order Number */}
      <td className="py-3 px-4">
        {can("order.view") ? (
          <Link
            href={detailHref}
            className="font-mono font-bold text-foreground hover:text-primary transition-colors block"
          >
            {order.order_number}
          </Link>
        ) : (
          <span className="font-mono font-bold text-foreground block">
            {order.order_number}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground block font-mono">
          {formattedDate}
        </span>
      </td>

      {/* 2. Customer */}
      <td className="py-3 px-4">
        <span className="font-bold text-foreground block truncate max-w-[140px]">
          {customerName}
        </span>
        <span className="text-[10px] text-muted-foreground block truncate max-w-[140px]">
          {order.email}
        </span>
      </td>

      {/* 3. Company */}
      <td className="py-3 px-4">
        {companyName ? (
          <span className="text-foreground font-medium block truncate max-w-[130px]">
            {companyName}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* 4. Items */}
      <td className="py-3 px-4">
        <span className="font-mono font-bold text-foreground">
          {itemCount} {itemCount === 1 ? "line" : "lines"}
        </span>
        {totalPieces > 0 && (
          <span className="text-[10px] text-muted-foreground block font-mono">
            {totalPieces} pcs
          </span>
        )}
      </td>

      {/* 5. Total */}
      <td className="py-3 px-4">
        <span className="font-mono font-bold text-foreground text-sm block">
          ${Number(order.total_amount || 0).toFixed(2)}
        </span>
        <span className="text-[10px] text-muted-foreground block uppercase font-mono">
          {order.currency || "USD"}
        </span>
      </td>

      {/* 6. Payment Status */}
      <td className="py-3 px-4">
        <PaymentStatusBadge status={order.payment_status} size="sm" />
      </td>

      {/* 7. Fulfillment Status */}
      <td className="py-3 px-4">
        <FulfillmentStatusBadge status={order.fulfillment_status} size="sm" />
      </td>

      {/* 8. Order Status */}
      <td className="py-3 px-4">
        <OrderStatusBadge status={order.status} size="sm" />
      </td>

      {/* 9. Date */}
      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
        {formattedDate}
      </td>

      {/* 10. Actions */}
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 justify-end">
          {hasPendingProof &&
            onReviewPaymentProof &&
            (can("payment.receipt.verify") || can("payment.receipt.view")) && (
              <button
                type="button"
                onClick={() => onReviewPaymentProof(order)}
                className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                title="Review Payment Proof"
              >
                <FileCheck size={14} />
              </button>
            )}

          {can("order.view") && (
            <Link
              href={detailHref}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              title="View Order Details"
            >
              <Eye size={12} className="text-muted-foreground" />
              <span>View</span>
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}
