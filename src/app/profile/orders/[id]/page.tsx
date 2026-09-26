"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getOrderById, cancelOrder, OrderRecord, OrderItemRecord } from "@/lib/services/orders";
import { uploadPaymentProof } from "@/lib/services/storage";
import {
  getOrderStatusPresentation,
  getOrderStatusKey,
  getPaymentPresentation,
  formatOrderDate,
} from "@/lib/order-status";
import BUSINESS_PROFILE, { getWhatsAppUrl } from "@/config/business-profile";
import {
  downloadProformaInvoicePDF,
  downloadProductOfferSheetPDF,
  downloadCommercialInvoicePDF,
} from "@/lib/pdf-generator";
import {
  ArrowLeft,
  Package,
  Truck,
  XCircle,
  CircleDot,
  CreditCard,
  MapPin,
  FileText,
  Upload,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Lock,
  AlertCircle,
  Clock,
  ChevronRight,
  Download,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return `$${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function SectionCard({
  title,
  icon: Icon,
  children,
  accent = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "bg-white dark:bg-slate-900 border rounded-2xl shadow-sm overflow-hidden",
        accent
          ? "border-amber-200 dark:border-amber-800/40"
          : "border-slate-200 dark:border-white/10",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5 px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100 dark:border-white/10">
        <Icon
          size={16}
          className={accent ? "text-amber-600" : "text-slate-400 dark:text-slate-500"}
        />
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </h2>
      </div>
      <div className="px-5 sm:px-6 py-4">{children}</div>
    </div>
  );
}

// ─── Tracking / progress ────────────────────────────────────────────────────────

const PROGRESS_STEPS = [
  { key: "placed", label: "Order Placed", desc: "Order confirmed and queued" },
  { key: "processing", label: "Processing", desc: "Preparing export packaging" },
  { key: "shipped", label: "Shipped", desc: "Handed to carrier for transit" },
  { key: "delivered", label: "Delivered", desc: "Delivered to consignee" },
];

function getProgressStep(order: OrderRecord): number {
  const key = getOrderStatusKey(order);
  if (key === "cancelled") return -1;
  if (key === "delivered") return 4;
  if (key === "shipped") return 3;
  if (key === "processing") return 2;
  return 1; // pending / placed
}

function OrderProgress({ order }: { order: OrderRecord }) {
  const isCancelled = order.status === "cancelled";
  const activeStep = getProgressStep(order);

  if (isCancelled) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
        <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-700 dark:text-red-400">Order Cancelled</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
            No further fulfilment or shipping updates will be processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop — horizontal stepper */}
      <div className="hidden sm:flex items-center">
        {PROGRESS_STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = activeStep >= stepNum;
          const isCurrent = activeStep === stepNum;

          return (
            <React.Fragment key={step.key}>
              {/* Step */}
              <div className="flex flex-col items-center text-center min-w-0 flex-1">
                <div
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
                    isCompleted
                      ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
                      : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <Check size={15} strokeWidth={3} />
                  ) : (
                    <span className="text-xs font-bold">{stepNum}</span>
                  )}
                </div>
                <p
                  className={[
                    "mt-2 text-[0.6875rem] font-bold uppercase tracking-wide leading-snug",
                    isCurrent
                      ? "text-amber-700 dark:text-amber-400"
                      : isCompleted
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-400 dark:text-slate-600",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                <p className="text-[0.625rem] text-slate-400 dark:text-slate-600 mt-0.5 px-1 leading-snug hidden md:block">
                  {step.desc}
                </p>
              </div>

              {/* Connector — not after last */}
              {idx < PROGRESS_STEPS.length - 1 && (
                <div
                  className={[
                    "h-0.5 flex-1 mx-1 shrink-0 transition-all",
                    activeStep > stepNum
                      ? "bg-amber-400"
                      : "bg-slate-200 dark:bg-white/10",
                  ].join(" ")}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile — vertical timeline */}
      <div className="flex flex-col sm:hidden gap-0">
        {PROGRESS_STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = activeStep >= stepNum;
          const isCurrent = activeStep === stepNum;
          const isLast = idx === PROGRESS_STEPS.length - 1;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Left: dot + line */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    isCompleted
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 dark:bg-white/5 text-slate-400",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <span className="text-[0.625rem] font-bold">{stepNum}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={[
                      "w-0.5 flex-1 my-1",
                      activeStep > stepNum
                        ? "bg-amber-300"
                        : "bg-slate-200 dark:bg-white/10",
                    ].join(" ")}
                  />
                )}
              </div>

              {/* Right: text */}
              <div className="pb-4 min-w-0">
                <p
                  className={[
                    "text-xs font-bold",
                    isCurrent
                      ? "text-amber-700 dark:text-amber-400"
                      : isCompleted
                      ? "text-slate-800 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-600",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                <p className="text-[0.6875rem] text-slate-400 dark:text-slate-600 mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Shipment tracking card ────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      aria-label="Copy tracking number"
    >
      {copied ? (
        <Check size={13} className="text-emerald-500" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
}

function ShipmentTrackingCard({ order }: { order: OrderRecord }) {
  const statusKey = getOrderStatusKey(order);
  const hasTracking = !!order.tracking_number;
  const snapshot = order.shipping_snapshot;

  // No tracking yet
  if (statusKey === "cancelled") return null;
  if (!hasTracking && (statusKey === "pending" || statusKey === "processing")) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
        <Clock size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Shipment tracking will be available once your order is dispatched.
        </p>
      </div>
    );
  }

  const trackingUrl =
    order.direct_tracking_url ||
    (order.tracking_number
      ? `https://www.aramex.com/track/results?mode=0&ShipmentNumber=${order.tracking_number}`
      : null);

  return (
    <div className="space-y-4">
      {/* Carrier info row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
            <Truck size={17} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[0.6875rem] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
              {order.shipping_method || "Shipping"}
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {order.carrier || "Carrier"}
            </p>
          </div>
        </div>

        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
          >
            <span>Track on Carrier Site</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* AWB row */}
      {order.tracking_number && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
          <span className="text-[0.6875rem] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 shrink-0">
            AWB
          </span>
          <span className="text-sm font-mono font-bold text-slate-900 dark:text-white flex-1">
            {order.tracking_number}
          </span>
          <CopyButton value={order.tracking_number} />
        </div>
      )}

      {/* Carrier status */}
      {order.carrier_status && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Status: <span className="font-semibold text-slate-700 dark:text-slate-300">{order.carrier_status}</span>
        </p>
      )}

      {/* Snapshot details */}
      {snapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {snapshot.carton_count != null && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[0.625rem] uppercase tracking-wider font-bold text-slate-400">Cartons</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {snapshot.carton_count} MC
              </p>
            </div>
          )}
          {snapshot.gross_weight != null && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[0.625rem] uppercase tracking-wider font-bold text-slate-400">Gross Weight</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {snapshot.gross_weight} kg
              </p>
            </div>
          )}
          {snapshot.cbm != null && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[0.625rem] uppercase tracking-wider font-bold text-slate-400">Volume (CBM)</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {snapshot.cbm} m³
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Order item ────────────────────────────────────────────────────────────────

function OrderDetailItem({ item }: { item: OrderItemRecord }) {
  const breakdown =
    typeof item.package_breakdown === "string"
      ? (() => {
          try {
            return JSON.parse(item.package_breakdown);
          } catch {
            return null;
          }
        })()
      : item.package_breakdown;

  return (
    <div className="flex items-start gap-4 py-4">
      {/* Product image — Canonical 3:4 */}
      <div className="w-16 sm:w-20 aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-100 dark:border-white/[0.06] shrink-0 p-1 flex items-center justify-center">
        {item.product_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.product_image_url}
            alt={item.product_name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
            <Package size={22} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
          {item.product_name}
        </p>
        {item.variant_title && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.variant_title}</p>
        )}

        {/* Package breakdown */}
        {Array.isArray(breakdown) && breakdown.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {breakdown.map((bd: any, i: number) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[0.625rem] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10"
              >
                {bd.color ? `${bd.color} ` : ""}{bd.size}: {bd.quantity}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold">{item.quantity} pcs</span>
          {item.unit_price > 0 && (
            <span className="text-slate-400 ml-1.5">
              @ {formatUSD(item.unit_price)} each
            </span>
          )}
        </p>
      </div>

      {/* Line total */}
      {item.line_total > 0 && (
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {formatUSD(item.line_total)}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────

function DocumentRow({
  label,
  href,
  locked,
  onDownload,
}: {
  label: string;
  href: string;
  locked?: boolean;
  onDownload?: () => void;
}) {
  if (locked) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
        <div className="flex items-center gap-2.5 text-slate-400 dark:text-slate-600">
          <Lock size={13} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className="text-[0.6875rem] text-slate-400 dark:text-slate-500 italic">
          Unlocks after payment
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
      <div className="flex items-center gap-2.5">
        <FileText size={13} className="text-amber-600" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded cursor-pointer transition-colors"
            title="Download PDF (A4)"
          >
            <Download size={11} />
            <span>PDF</span>
          </button>
        )}
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          <span>Open</span>
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function OrderDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Order placed by mistake");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    const data = await getOrderById(orderId, user?.id);
    if (data && data.user_id && user?.id && String(data.user_id) !== String(user.id)) {
      setOrder(null);
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, user?.id]);

  const handleCancel = async () => {
    if (!order || !user?.id) return;
    setIsCancelling(true);
    await cancelOrder(order.id, user.id, cancelReason);
    await fetchOrder();
    setIsCancelling(false);
    setCancelModalOpen(false);
  };

  const handleUploadReceipt = async (file: File) => {
    if (!order) return;
    setUploadingReceipt(true);
    try {
      const result = await uploadPaymentProof(file, order.id);
      if (result.url) {
        setReceiptSuccess(true);
        setTimeout(() => setReceiptSuccess(false), 4000);
      }
    } catch (_err) {
      // ignore
    } finally {
      setUploadingReceipt(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading order…</p>
      </div>
    );
  }

  // ── Not found ──
  if (!order) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-10 text-center">
        <AlertCircle size={36} className="text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
          Order Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          We couldn&apos;t find order &ldquo;{orderId}&rdquo;.
        </p>
        <Link
          href="/profile/orders"
          className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
        >
          <ArrowLeft size={13} />
          Back to Orders
        </Link>
      </div>
    );
  }

  // ── Derived state ──
  const statusKey = getOrderStatusKey(order);
  const statusPres = getOrderStatusPresentation(order);
  const paymentPres = getPaymentPresentation(order.payment_status);
  const StatusIcon = statusPres.icon;

  const isCancelled = statusKey === "cancelled";
  const isPaid =
    order.payment_status === "paid" ||
    ["confirmed", "processing", "shipped", "delivered", "fulfilled"].includes(order.status) ||
    order.payment_method === "net_30";

  const canCancel =
    !isCancelled &&
    statusKey !== "delivered" &&
    order.fulfillment_status === "unfulfilled";

  const items = order.items || [];
  const events = order.status_events || [];

  const whatsAppMsg = `Hello ${BUSINESS_PROFILE.name},\n\nI need help with my Order #${order.order_number}.\nStatus: ${statusPres.label}\nTotal: ${formatUSD(order.total_amount || 0)} USD`;

  return (
    <div className="space-y-5 sm:space-y-6">

      {/* ── Compact page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left: back + title */}
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/profile/orders"
            className="w-9 h-9 mt-0.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-sm transition-colors shrink-0"
            aria-label="Back to orders"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
                Order #{order.order_number}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
              >
                <StatusIcon size={11} />
                {statusPres.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Placed{" "}
              {formatOrderDate(order.placed_at || order.created_at)}
              {order.shipping_company && (
                <> · <span className="font-medium">{order.shipping_company}</span></>
              )}
            </p>
          </div>
        </div>

        {/* Right: payment badge */}
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider ${paymentPres.badgeClass}`}
          >
            <CreditCard size={11} />
            {paymentPres.label}
          </span>
          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold transition-all"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* ── Two-column layout on large screens ── */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">

        {/* ─── LEFT: main column ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6">

          {/* Fulfilment progress */}
          <SectionCard title="Order Progress" icon={CircleDot}>
            <OrderProgress order={order} />
          </SectionCard>

          {/* Shipment tracking */}
          {!isCancelled && (
            <SectionCard title="Shipment & Tracking" icon={Truck} accent>
              <ShipmentTrackingCard order={order} />
            </SectionCard>
          )}

          {/* Ordered products */}
          <SectionCard title={`Ordered Products (${items.length})`} icon={Package}>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No product details available.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {items.map((item, idx) => (
                  <OrderDetailItem key={item.id ?? idx} item={item} />
                ))}
              </div>
            )}

            {/* Pricing summary */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.08] space-y-2 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Products</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatUSD(order.subtotal || 0)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Shipping</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {order.shipping_cost === 0 ? "FREE" : formatUSD(order.shipping_cost || 0)}
                </span>
              </div>
              {(order.other_charges ?? 0) > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Other Charges</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatUSD(order.other_charges ?? 0)}
                  </span>
                </div>
              )}
              {(order.tax_amount || 0) > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Tax</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatUSD(order.tax_amount || 0)}
                  </span>
                </div>
              )}
              {(order.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                  <span>
                    {order.coupon_code || order.promo_code
                      ? `Discount (${order.coupon_code || order.promo_code})`
                      : "Discount"}
                  </span>
                  <span className="font-semibold font-mono">−{formatUSD(order.discount_amount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-3 border-t border-slate-200 dark:border-white/10">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
                <span className="text-base font-bold font-display text-slate-900 dark:text-white">
                  {formatUSD(order.total_amount || 0)}
                  <span className="text-xs font-normal text-slate-400 ml-1">USD</span>
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Activity log */}
          {events.length > 0 && (
            <SectionCard title="Activity Log" icon={Clock}>
              <div className="space-y-3">
                {events.map((evt, idx) => (
                  <div key={evt.id ?? idx} className="flex gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {evt.message ||
                          evt.event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                      <span className="text-slate-400 dark:text-slate-500">
                        {new Date(evt.created_at).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ─── RIGHT: side column ──────────────────────────────────────────── */}
        <div className="w-full lg:w-72 xl:w-80 space-y-5 shrink-0">

          {/* Shipping address */}
          <SectionCard title="Delivery Address & Consignee" icon={MapPin}>
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-sm text-slate-900 dark:text-white">{order.shipping_name}</p>
              {order.shipping_company && (
                <p className="text-slate-600 dark:text-slate-300 font-medium">{order.shipping_company}</p>
              )}
              <p className="text-slate-500 dark:text-slate-400 pt-1">{order.shipping_address1}</p>
              {order.shipping_address2 && (
                <p className="text-slate-500 dark:text-slate-400">{order.shipping_address2}</p>
              )}
              <p className="text-slate-500 dark:text-slate-400">
                {order.shipping_city}, {order.shipping_postal_code}
              </p>
              <p className="text-slate-500 dark:text-slate-400">{order.shipping_country_code}</p>
              {order.shipping_phone && (
                <p className="text-slate-700 dark:text-slate-300 pt-2 font-medium">
                  {order.shipping_phone}
                </p>
              )}

              {order.destination_port && (
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] text-[11px]">
                  <span className="text-slate-400">Destination Port: </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {order.destination_port}
                  </span>
                </div>
              )}

              {order.special_instructions && (
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] text-[11px]">
                  <span className="text-slate-400 block font-semibold">Special Instructions:</span>
                  <span className="text-slate-600 dark:text-slate-300 italic">
                    {order.special_instructions}
                  </span>
                </div>
              )}

              {order.third_party_notify?.name && (
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] text-[11px]">
                  <span className="text-slate-400 block font-semibold">Also Notify (3rd Party):</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {order.third_party_notify.name} {order.third_party_notify.address ? `(${order.third_party_notify.address})` : ""}
                  </span>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Payment */}
          <SectionCard title="Payment & Settlement" icon={CreditCard}>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Method</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {order.payment_details?.payment_method || order.payment_method?.replace(/_/g, " ") || "Bank Transfer"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider ${paymentPres.badgeClass}`}
                >
                  {order.payment_status === "paid" ? "● PAID" : paymentPres.label}
                </span>
              </div>

              {order.payment_status === "paid" ? (
                /* Confirmed Payment Info */
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Txn ID:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {order.payment_details?.transaction_id || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount Paid:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ${Number(order.payment_details?.payment_amount ?? order.total_amount).toFixed(2)} {order.currency || "USD"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Date:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {order.payment_details?.payment_date || formatOrderDate(order.payment_confirmed_at || "")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bank:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {order.payment_details?.bank_name || "Pubali Bank Limited"}
                    </span>
                  </div>
                  {order.payment_proof_url && (
                    <div className="pt-1 flex justify-end">
                      <a
                        href={order.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                      >
                        <ExternalLink size={11} />
                        <span>View Bank Receipt</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : order.payment_status === "payment_submitted" ? (
                /* Awaiting Verification */
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-[11px] text-blue-700 dark:text-blue-300">
                    <p className="font-bold">Awaiting Admin Verification</p>
                    <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                      Receipt submitted. Our accounts team will verify your payment credit.
                    </p>
                  </div>
                  {order.payment_proof_url && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Submitted Proof:</span>
                      <a
                        href={order.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold hover:underline"
                      >
                        <ExternalLink size={11} />
                        <span>View Slip</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                /* Unpaid: Receipt upload */
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                  <p className="text-slate-400 dark:text-slate-500 mb-2">
                    Attach a wire transfer receipt or bank document:
                  </p>
                  <label className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-semibold text-xs cursor-pointer transition-all">
                    <Upload size={13} />
                    <span>{uploadingReceipt ? "Uploading…" : "Upload Receipt"}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadReceipt(e.target.files[0]);
                      }}
                    />
                  </label>
                  {receiptSuccess && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                      <Check size={12} /> Receipt uploaded!
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Documents */}
          <SectionCard title="Commercial Documents" icon={FileText}>
            <div>
              {order.items && order.items.length > 1 ? (
                order.items.map((it, idx) => (
                  <DocumentRow
                    key={idx}
                    label={`Offer Sheet: ${it.product_name}`}
                    href={`/admin/documents/ORDER_SHEET/order_${order.id}`}
                    onDownload={() => {
                      downloadProductOfferSheetPDF(
                        {
                          name: it.product_name,
                          sku: it.sku,
                          price: it.unit_price,
                          moq: it.quantity,
                          imageUrl: it.product_image_url,
                          images: (it as any).product_images || (it as any).images || (it.product_image_url ? [it.product_image_url] : []),
                          packageBreakdown: it.package_breakdown,
                        },
                        {
                          name: order.shipping_name,
                          company: order.shipping_company,
                          email: order.email,
                          country: order.shipping_country_code,
                        },
                        it.quantity
                      );
                    }}
                  />
                ))
              ) : (
                <DocumentRow
                  label="Commercial Offer Sheet"
                  href={`/admin/documents/ORDER_SHEET/order_${order.id}`}
                  onDownload={() => {
                    if (order.items && order.items[0]) {
                      const it = order.items[0];
                      downloadProductOfferSheetPDF(
                        {
                          name: it.product_name,
                          sku: it.sku,
                          price: it.unit_price,
                          moq: it.quantity,
                          imageUrl: it.product_image_url,
                          images: (it as any).product_images || (it as any).images || (it.product_image_url ? [it.product_image_url] : []),
                          packageBreakdown: it.package_breakdown,
                        },
                        {
                          name: order.shipping_name,
                          company: order.shipping_company,
                          email: order.email,
                          country: order.shipping_country_code,
                        },
                        it.quantity
                      );
                    }
                  }}
                />
              )}
              <DocumentRow
                label="Proforma Invoice (P.I.)"
                href={`/admin/documents/PROFORMA_INVOICE/order_${order.id}`}
                onDownload={() => downloadProformaInvoicePDF(order)}
              />
              <DocumentRow
                label="Commercial Invoice"
                href={`/admin/documents/COMMERCIAL_INVOICE/order_${order.id}`}
                locked={!isPaid}
                onDownload={isPaid ? () => downloadCommercialInvoicePDF(order) : undefined}
              />
              <DocumentRow
                label="Packing List"
                href={`/admin/documents/PACKING_LIST/order_${order.id}`}
                locked={!isPaid}
              />
            </div>
          </SectionCard>

          {/* Support */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Need help with this order?
            </p>
            <a
              href={getWhatsAppUrl(whatsAppMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#1a9348] dark:text-[#25D366] font-bold text-xs transition-colors"
            >
              <MessageCircle size={14} />
              <span>WhatsApp Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Cancel modal ── */}
      {cancelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
              Cancel Order #{order.order_number}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure? This will mark the order as cancelled.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reason
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="Order placed by mistake">Order placed by mistake</option>
                <option value="Need to change shipping address">Need to change shipping address</option>
                <option value="Found better price elsewhere">Found better price elsewhere</option>
                <option value="Other reason">Other reason</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {isCancelling ? "Cancelling…" : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
