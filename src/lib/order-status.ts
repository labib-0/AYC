import { OrderRecord } from "@/lib/services/orders";
import {
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  CircleDot,
} from "lucide-react";

// Unified order status presentation — used across Orders list, detail, tracking
export type OrderStatusKey =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "unknown";

export interface OrderStatusPresentation {
  key: OrderStatusKey;
  label: string;
  icon: React.ElementType;
  /** Tailwind classes for badge background + text */
  badgeClass: string;
  /** Tailwind classes for icon tint */
  iconClass: string;
  /** Short description for empty-state / subtitle use */
  description: string;
}

const STATUS_MAP: Record<OrderStatusKey, OrderStatusPresentation> = {
  pending: {
    key: "pending",
    label: "To Pay",
    icon: CreditCard,
    badgeClass:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
    iconClass: "text-amber-600 dark:text-amber-400",
    description: "Awaiting payment confirmation.",
  },
  processing: {
    key: "processing",
    label: "Processing",
    icon: CircleDot,
    badgeClass:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50",
    iconClass: "text-blue-600 dark:text-blue-400",
    description: "Order is being prepared.",
  },
  shipped: {
    key: "shipped",
    label: "Shipped",
    icon: Truck,
    badgeClass:
      "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50",
    iconClass: "text-purple-600 dark:text-purple-400",
    description: "Order is on its way.",
  },
  delivered: {
    key: "delivered",
    label: "Delivered",
    icon: CheckCircle2,
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    description: "Successfully delivered.",
  },
  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    badgeClass:
      "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50",
    iconClass: "text-red-600 dark:text-red-400",
    description: "Order was cancelled.",
  },
  unknown: {
    key: "unknown",
    label: "Processing",
    icon: Clock,
    badgeClass:
      "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
    iconClass: "text-slate-400",
    description: "Status updating.",
  },
};

/** Derive the normalized status key from an OrderRecord */
export function getOrderStatusKey(order: OrderRecord): OrderStatusKey {
  if (order.status === "cancelled") return "cancelled";
  if (
    order.fulfillment_status === "delivered" ||
    order.status === "delivered" ||
    order.status === "fulfilled"
  )
    return "delivered";
  if (
    order.fulfillment_status === "shipped" ||
    order.status === "shipped"
  )
    return "shipped";
  if (
    order.payment_status === "pending" &&
    order.fulfillment_status === "unfulfilled"
  )
    return "pending";
  if (
    order.status === "processing" ||
    order.fulfillment_status === "processing" ||
    order.status === "confirmed" ||
    order.status === "pending"
  )
    return "processing";
  return "unknown";
}

/** Returns full status presentation for an order */
export function getOrderStatusPresentation(
  order: OrderRecord
): OrderStatusPresentation {
  const key = getOrderStatusKey(order);
  return STATUS_MAP[key] ?? STATUS_MAP.unknown;
}

/** Payment status presentation */
export interface PaymentPresentation {
  label: string;
  badgeClass: string;
}

export function getPaymentPresentation(
  paymentStatus: string
): PaymentPresentation {
  switch (paymentStatus) {
    case "paid":
      return {
        label: "Paid",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
      };
    case "failed":
      return {
        label: "Failed",
        badgeClass:
          "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50",
      };
    case "refunded":
      return {
        label: "Refunded",
        badgeClass:
          "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
      };
    default:
      return {
        label: "Pending",
        badgeClass:
          "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
      };
  }
}

/** Format order date for display */
export function formatOrderDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Format USD cents to display string */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
