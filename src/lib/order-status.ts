import { OrderRecord } from "@/lib/services/orders";
import {
  Truck,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
} from "lucide-react";

/**
 * Authoritative Canonical Customer Order Lifecycle States.
 *
 * Exactly 5 stages:
 * 1. ORDER PLACED (ORDER_PLACED)
 * 2. PAYMENT PENDING (PAYMENT_PENDING)
 * 3. WAITING FOR APPROVAL (WAITING_FOR_APPROVAL)
 * 4. ORDER CONFIRMED (ORDER_CONFIRMED)
 * 5. ON SHIPMENT (ON_SHIPMENT)
 */
export type CanonicalCustomerStatus =
  | "ORDER_PLACED"
  | "PAYMENT_PENDING"
  | "WAITING_FOR_APPROVAL"
  | "ORDER_CONFIRMED"
  | "ON_SHIPMENT";

export type OrderStatusKey =
  | CanonicalCustomerStatus
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "unknown";

export interface OrderStatusPresentation {
  key: CanonicalCustomerStatus;
  label: string;
  icon: React.ElementType;
  /** Tailwind classes for badge background + text + border */
  badgeClass: string;
  /** Tailwind classes for icon tint */
  iconClass: string;
  /** Customer-facing clear description */
  description: string;
}

const CANONICAL_STATUS_MAP: Record<CanonicalCustomerStatus, OrderStatusPresentation> = {
  ORDER_PLACED: {
    key: "ORDER_PLACED",
    label: "Order Placed",
    icon: Package,
    badgeClass:
      "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
    iconClass: "text-slate-600 dark:text-slate-400",
    description: "Order recorded successfully. Awaiting payment instructions.",
  },
  PAYMENT_PENDING: {
    key: "PAYMENT_PENDING",
    label: "Payment Pending",
    icon: CreditCard,
    badgeClass:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
    iconClass: "text-amber-600 dark:text-amber-400",
    description: "Order placed. Awaiting payment submission.",
  },
  WAITING_FOR_APPROVAL: {
    key: "WAITING_FOR_APPROVAL",
    label: "Waiting for Approval",
    icon: Clock,
    badgeClass:
      "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50",
    iconClass: "text-sky-600 dark:text-sky-400",
    description: "Payment submitted. We are waiting for payment approval.",
  },
  ORDER_CONFIRMED: {
    key: "ORDER_CONFIRMED",
    label: "Order Confirmed",
    icon: CheckCircle2,
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    description: "Payment approved. Order confirmed for export production.",
  },
  ON_SHIPMENT: {
    key: "ON_SHIPMENT",
    label: "On Shipment",
    icon: Truck,
    badgeClass:
      "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50",
    iconClass: "text-purple-600 dark:text-purple-400",
    description: "Order is in shipment with carrier.",
  },
};

/**
 * Derive the authoritative canonical customer status from an OrderRecord.
 * Prioritizes the backend's authoritative `customer_status` attribute,
 * and maintains an identical compatibility mapping for legacy/mock records.
 */
export function getCanonicalCustomerStatus(order: OrderRecord): CanonicalCustomerStatus {
  // 1. Authoritative backend customer_status attribute
  if (order.customer_status) {
    const raw = String(order.customer_status).toUpperCase().replace(/[\s-]/g, "_");
    if (
      raw === "ORDER_PLACED" ||
      raw === "PAYMENT_PENDING" ||
      raw === "WAITING_FOR_APPROVAL" ||
      raw === "ORDER_CONFIRMED" ||
      raw === "ON_SHIPMENT"
    ) {
      return raw as CanonicalCustomerStatus;
    }
  }

  // 2. Compatibility mapping for legacy records
  const fulfillment = String(order.fulfillment_status || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();
  const payment = String(order.payment_status || "").toLowerCase();

  // ON SHIPMENT: Active shipment/fulfillment underway
  if (
    ["shipped", "delivered", "fulfilled", "partially_shipped"].includes(fulfillment) ||
    ["shipped", "delivered", "completed", "partially_shipped", "on_shipment"].includes(status) ||
    (Boolean(order.tracking_number) && Boolean(order.carrier_status))
  ) {
    return "ON_SHIPMENT";
  }

  // ORDER CONFIRMED: Payment approved / order officially confirmed
  if (
    payment === "paid" ||
    Boolean((order as any).payment_confirmed_at) ||
    ["confirmed", "in_production", "ready_to_ship", "order_confirmed"].includes(status) ||
    (status === "processing" && (payment === "paid" || Boolean((order as any).trade_terms)))
  ) {
    return "ORDER_CONFIRMED";
  }

  // WAITING FOR APPROVAL: Customer uploaded payment proof / pending verification
  if (
    payment === "payment_submitted" ||
    (Boolean(order.payment_proof_url) && !["paid", "failed"].includes(payment))
  ) {
    return "WAITING_FOR_APPROVAL";
  }

  // ORDER PLACED: Initial placement state before payment flow initiation
  if (["order_placed", "placed"].includes(status)) {
    return "ORDER_PLACED";
  }

  // PAYMENT PENDING: Default for unpaid placed orders or pending re-submission
  return "PAYMENT_PENDING";
}

/** Unified key accessor used across existing storefront components */
export function getOrderStatusKey(order: OrderRecord): CanonicalCustomerStatus {
  return getCanonicalCustomerStatus(order);
}

/** Returns full canonical status presentation for an order */
export function getOrderStatusPresentation(order: OrderRecord): OrderStatusPresentation {
  const canonical = getCanonicalCustomerStatus(order);
  return CANONICAL_STATUS_MAP[canonical];
}

/** Canonical 5-stage lifecycle timeline definitions */
export interface CanonicalTimelineStage {
  key: CanonicalCustomerStatus;
  label: string;
  desc: string;
  stepNumber: number;
}

export const CANONICAL_TIMELINE_STAGES: readonly CanonicalTimelineStage[] = [
  {
    key: "ORDER_PLACED",
    label: "Order Placed",
    desc: "Order recorded & queued",
    stepNumber: 1,
  },
  {
    key: "PAYMENT_PENDING",
    label: "Payment Pending",
    desc: "Awaiting payment submission",
    stepNumber: 2,
  },
  {
    key: "WAITING_FOR_APPROVAL",
    label: "Waiting for Approval",
    desc: "Payment submitted, under review",
    stepNumber: 3,
  },
  {
    key: "ORDER_CONFIRMED",
    label: "Order Confirmed",
    desc: "Payment approved, export confirmed",
    stepNumber: 4,
  },
  {
    key: "ON_SHIPMENT",
    label: "On Shipment",
    desc: "In transit with export carrier",
    stepNumber: 5,
  },
] as const;

/**
 * Returns the 1-based current step index for the canonical progress bar (1 to 5).
 */
export function getCanonicalStepIndex(status: CanonicalCustomerStatus): number {
  switch (status) {
    case "ORDER_PLACED":
      return 1;
    case "PAYMENT_PENDING":
      return 2;
    case "WAITING_FOR_APPROVAL":
      return 3;
    case "ORDER_CONFIRMED":
      return 4;
    case "ON_SHIPMENT":
      return 5;
    default:
      return 1;
  }
}

/** Payment status presentation */
export interface PaymentPresentation {
  label: string;
  badgeClass: string;
}

export function getPaymentPresentation(paymentStatus: string): PaymentPresentation {
  switch (paymentStatus?.toLowerCase()) {
    case "paid":
      return {
        label: "Paid",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
      };
    case "payment_submitted":
      return {
        label: "Payment Submitted",
        badgeClass:
          "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50",
      };
    case "failed":
      return {
        label: "Payment Rejected / Failed",
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
        label: "Payment Pending",
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
