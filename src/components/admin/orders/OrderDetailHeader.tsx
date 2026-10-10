import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { OrderRecord } from "@/services/order.service";
import OrderStatusBadge from "./OrderStatusBadge";
import PaymentStatusBadge from "./PaymentStatusBadge";
import FulfillmentStatusBadge from "./FulfillmentStatusBadge";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  Printer,
  Package,
  ChevronDown,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  Send,
  MoreHorizontal,
  DollarSign,
  Ban,
  FileCheck,
} from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface OrderDetailHeaderProps {
  order: OrderRecord;
  backHref?: string;
  onRefresh: () => void;
  isLoading?: boolean;
  onOpenPaymentReview?: () => void;
  onOpenAramexModal?: () => void;
  onOpenSeaQuoteModal?: () => void;
  onOpenFulfillmentModal?: () => void;
  onUpdateStatus?: (newStatus: string, note?: string) => Promise<void>;
  onOpenCancelModal?: () => void;
  onRefreshTracking?: () => void;
}

export default function OrderDetailHeader({
  order,
  backHref = "/ayc/orders",
  onRefresh,
  isLoading = false,
  onOpenPaymentReview,
  onOpenAramexModal,
  onOpenSeaQuoteModal,
  onOpenFulfillmentModal,
  onUpdateStatus,
  onOpenCancelModal,
  onRefreshTracking,
}: OrderDetailHeaderProps) {
  const { can, isSuperAdmin } = useAdminAuth();
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const canViewDocs = can("document.view");
  const canUpdateStatus = isSuperAdmin || can("order.update_status");
  const canCancel = isSuperAdmin || can("order.cancel");
  const canRefreshTracking = isSuperAdmin || can("tracking.refresh");

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (docRef.current && !docRef.current.contains(event.target as Node)) {
        setDocDropdownOpen(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setActionsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const customerName = order.shipping_name || order.user?.name || "Customer";
  const customerCompany = order.shipping_company || order.user?.company_name;

  const isPaid = order.payment_status === "paid";
  const isTerminal = ["cancelled", "refunded", "delivered"].includes(order.status);
  const hasAwb = Boolean(order.tracking_number);
  const isSea =
    order.transport_method?.toLowerCase() === "sea" ||
    order.shipping_method?.toLowerCase().includes("sea") ||
    order.shipping_snapshot?.mode === "sea";

  // Determine Primary Next Action
  let primaryAction: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    id: string;
    variant: "primary" | "emerald" | "default";
  } | null = null;

  if (!isTerminal) {
    if (!isPaid && order.payment_proof_url) {
      primaryAction = {
        label: "Review Payment Proof",
        icon: <FileCheck size={14} />,
        onClick: () => onOpenPaymentReview?.(),
        id: "btn-primary-review-payment",
        variant: "primary",
      };
    } else if (!isPaid) {
      primaryAction = {
        label: "Verify Payment",
        icon: <Clock size={14} />,
        onClick: () => onOpenPaymentReview?.(),
        id: "btn-primary-verify-payment",
        variant: "primary",
      };
    } else if (order.fulfillment_status !== "shipped" && order.fulfillment_status !== "delivered") {
      if (isSea) {
        primaryAction = {
          label: "Update Freight Quote",
          icon: <DollarSign size={14} />,
          onClick: () => onOpenSeaQuoteModal?.(),
          id: "btn-primary-sea-quote",
          variant: "primary",
        };
      } else {
        primaryAction = {
          label: "Create Aramex Shipment",
          icon: <Send size={14} />,
          onClick: () => onOpenAramexModal?.(),
          id: "btn-primary-create-shipment",
          variant: "primary",
        };
      }
    } else if (order.fulfillment_status === "shipped" && order.status !== "delivered") {
      primaryAction = {
        label: "Confirm Consignee Delivery",
        icon: <PackageCheck size={14} />,
        onClick: () => onUpdateStatus?.("delivered", "Delivery confirmed by consignee."),
        id: "btn-primary-confirm-delivery",
        variant: "emerald",
      };
    }
  }

  return (
    <div className="space-y-3 pb-2" id="admin-order-header-workspace">
      {/* Top Breadcrumb & Quick Controls */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          id="link-back-to-orders"
        >
          <ArrowLeft size={14} />
          <span>Back to Orders</span>
        </Link>

        {/* Global Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          title="Refresh Order"
          id="btn-refresh-order-detail"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin text-primary" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Main Header Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Order Title, Customer Name, Date & Clear Status Badges */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground truncate">
              Order #{order.order_number}
            </h1>
            {/* Authoritative Single Status */}
            <OrderStatusBadge status={order.status} size="md" />
          </div>

          {/* Customer & Date line */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {customerName}
              {customerCompany ? ` (${customerCompany})` : ""}
            </span>
            <span>•</span>
            <span className="font-mono">Placed on {formattedDate}</span>
          </div>

          {/* Clearly Labeled Separate Payment and Fulfillment Badges */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/50 border border-border text-[11px] font-medium">
              <span className="text-muted-foreground font-semibold uppercase">Payment:</span>
              <PaymentStatusBadge status={order.payment_status} size="sm" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/50 border border-border text-[11px] font-medium">
              <span className="text-muted-foreground font-semibold uppercase">Fulfillment:</span>
              <FulfillmentStatusBadge status={order.fulfillment_status} size="sm" />
            </div>
          </div>
        </div>

        {/* Right: Actions Cluster (Prominent Next Action + Documents Dropdown + Secondary Actions) */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Prominent Next Available Action Button */}
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={isLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                primaryAction.variant === "emerald"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
              id={primaryAction.id}
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {/* 8. Compact Documents Dropdown */}
          {canViewDocs && (
            <div className="relative" ref={docRef}>
              <button
                type="button"
                onClick={() => setDocDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                id="btn-documents-dropdown"
                aria-haspopup="true"
                aria-expanded={docDropdownOpen}
              >
                <FileText size={14} className="text-primary" />
                <span>Documents</span>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${docDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {docDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-card border border-border shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Commercial Documents
                  </div>

                  <Link
                    href={`/ayc/documents/INVOICE/order_${order.id}`}
                    onClick={() => setDocDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    id="doc-item-invoice"
                  >
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <FileText size={14} className="text-primary" />
                      <span>Sales Invoice</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">PDF</span>
                  </Link>

                  <Link
                    href={`/ayc/documents/ORDER_SHEET/order_${order.id}`}
                    onClick={() => setDocDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    id="doc-item-order-sheet"
                  >
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <FileText size={14} className="text-primary" />
                      <span>Order Sheet</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">B2B</span>
                  </Link>

                  <Link
                    href={`/ayc/documents/PROFORMA_INVOICE/order_${order.id}`}
                    onClick={() => setDocDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    id="doc-item-pi"
                  >
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <FileText size={14} className="text-primary" />
                      <span>Proforma Invoice (PI)</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">PI</span>
                  </Link>

                  <Link
                    href={`/ayc/documents/COMMERCIAL_INVOICE/order_${order.id}`}
                    onClick={() => setDocDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    id="doc-item-commercial-invoice"
                  >
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <Printer size={14} className="text-primary" />
                      <span>Commercial Invoice</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">Export</span>
                  </Link>

                  <Link
                    href={`/ayc/documents/PACKING_LIST/order_${order.id}`}
                    onClick={() => setDocDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    id="doc-item-packing-list"
                  >
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <Package size={14} className="text-primary" />
                      <span>Packing List</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">Cargo</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Secondary Actions Menu */}
          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setActionsDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
              id="btn-order-actions-dropdown"
              aria-haspopup="true"
              aria-expanded={actionsDropdownOpen}
            >
              <MoreHorizontal size={15} />
              <span className="hidden sm:inline">Actions</span>
              <ChevronDown size={14} className={`transition-transform ${actionsDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {actionsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-card border border-border shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Order Management
                </div>

                {/* Fulfillment Manual Edit */}
                {onOpenFulfillmentModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsDropdownOpen(false);
                      onOpenFulfillmentModal();
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors flex items-center gap-2 font-bold text-foreground cursor-pointer"
                  >
                    <Truck size={14} className="text-primary" />
                    <span>Edit Fulfillment / Carrier</span>
                  </button>
                )}

                {/* Live Tracking Refresh */}
                {hasAwb && canRefreshTracking && onRefreshTracking && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsDropdownOpen(false);
                      onRefreshTracking();
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors flex items-center gap-2 font-bold text-foreground cursor-pointer"
                  >
                    <RefreshCw size={14} className="text-primary" />
                    <span>Refresh Carrier Tracking</span>
                  </button>
                )}

                {/* Mark as Shipped (if confirmed/processing) */}
                {canUpdateStatus && isPaid && order.fulfillment_status !== "shipped" && order.status !== "delivered" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsDropdownOpen(false);
                      onUpdateStatus?.("shipped", "Order marked as dispatched by administrator.");
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors flex items-center gap-2 font-bold text-foreground cursor-pointer"
                  >
                    <Truck size={14} className="text-purple-600 dark:text-purple-400" />
                    <span>Mark as Dispatched</span>
                  </button>
                )}

                {/* Mark as Delivered */}
                {canUpdateStatus && order.fulfillment_status === "shipped" && order.status !== "delivered" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsDropdownOpen(false);
                      onUpdateStatus?.("delivered", "Delivery confirmed by administrator.");
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Mark as Delivered</span>
                  </button>
                )}

                {/* Destructive Action: Cancel Order */}
                {canCancel && !isTerminal && onOpenCancelModal && (
                  <>
                    <div className="my-1 border-t border-border/50" />
                    <button
                      type="button"
                      onClick={() => {
                        setActionsDropdownOpen(false);
                        onOpenCancelModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2 font-bold uppercase tracking-wider cursor-pointer"
                      id="btn-actions-cancel-order"
                    >
                      <Ban size={14} />
                      <span>Cancel Order...</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
