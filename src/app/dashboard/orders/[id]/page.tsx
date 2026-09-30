"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getOrderById, cancelOrder, OrderRecord, OrderItemRecord } from "@/lib/services/orders";
import { uploadPaymentProof, PaymentSubmissionDetails } from "@/lib/services/storage";
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
  ShieldAlert,
  Download,
  ChevronRight,
  RotateCcw,
  Clock,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

function formatUSD(amount: number): string {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const PROGRESS_STEPS = [
  { key: "placed", label: "Order Placed", desc: "Order confirmed & queued" },
  { key: "processing", label: "Processing", desc: "Packaging & export preparation" },
  { key: "shipped", label: "Shipped", desc: "Handed to carrier / transit" },
  { key: "delivered", label: "Delivered", desc: "Cleared customs & delivered" },
];

function getProgressStep(order: OrderRecord): number {
  const key = getOrderStatusKey(order);
  if (key === "cancelled") return -1;
  if (key === "delivered") return 4;
  if (key === "shipped") return 3;
  if (key === "processing") return 2;
  return 1;
}

export default function CustomerOrderDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Cancellation modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Order placed by mistake");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Payment proof upload & structured submission
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentTxnId, setPaymentTxnId] = useState("");
  const [paymentPayer, setPaymentPayer] = useState("");
  const [paymentBank, setPaymentBank] = useState("Pubali Bank Limited");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Tracking copy
  const [copiedTracking, setCopiedTracking] = useState(false);

  const fetchOrder = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      const data = await getOrderById(orderId, user.id);

      if (!data) {
        setOrder(null);
        setLoading(false);
        return;
      }

      // Customer Ownership Validation
      const isOwner =
        (data.user_id && String(data.user_id) === String(user.id)) ||
        (data.email && user.email && data.email.toLowerCase() === user.email.toLowerCase());

      if (!isOwner) {
        setUnauthorized(true);
        setOrder(null);
        setLoading(false);
        return;
      }

      setOrder(data);
      if (!paymentPayer) setPaymentPayer(data.shipping_name || "");
      if (!paymentAmount) setPaymentAmount(String(data.total_amount || ""));
      if (!paymentDate) setPaymentDate(new Date().toISOString().split("T")[0]);
    } catch (err: any) {
      console.error("Failed to fetch order:", err);
      setError("Unable to load order details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId, user]);

  const handleCopyTracking = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleSubmitPaymentDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order) return;

    setUploadingReceipt(true);
    setReceiptError(null);

    try {
      const details: PaymentSubmissionDetails = {
        payment_method: paymentMethod || "Bank Transfer",
        transaction_id: paymentTxnId.trim() || undefined,
        payer_name: paymentPayer.trim() || order.shipping_name,
        bank_name: paymentBank.trim() || "Pubali Bank Limited",
        payment_amount: paymentAmount ? parseFloat(paymentAmount) : order.total_amount,
        payment_date: paymentDate || new Date().toISOString().split("T")[0],
        notes: paymentNotes.trim() || undefined,
      };

      const result = await uploadPaymentProof(selectedFile, order.id, details);
      if (result) {
        setReceiptSuccess(true);
        setSelectedFile(null);
        setShowSubmitForm(false);
        await fetchOrder();
      }
    } catch (err: any) {
      console.error("Receipt upload error:", err);
      setReceiptError(err.message || "Failed to submit payment details.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    setSelectedFile(file);
    setUploadingReceipt(true);
    setReceiptError(null);

    try {
      const details: PaymentSubmissionDetails = {
        payment_method: paymentMethod || "Bank Transfer",
        transaction_id: paymentTxnId.trim() || undefined,
        payer_name: paymentPayer.trim() || order.shipping_name,
        bank_name: paymentBank.trim() || "Pubali Bank Limited",
        payment_amount: paymentAmount ? parseFloat(paymentAmount) : order.total_amount,
        payment_date: paymentDate || new Date().toISOString().split("T")[0],
        notes: paymentNotes.trim() || undefined,
      };

      const result = await uploadPaymentProof(file, order.id, details);
      if (result) {
        setReceiptSuccess(true);
        await fetchOrder();
      }
    } catch (err: any) {
      console.error("Receipt upload error:", err);
      setReceiptError(err.message || "Failed to upload payment proof.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !user) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const success = await cancelOrder(order.id, user.id, cancelReason);
      if (success) {
        setCancelModalOpen(false);
        await fetchOrder();
      } else {
        setCancelError("Unable to cancel this order. Please contact customer support.");
      }
    } catch (err) {
      console.error("Cancel order error:", err);
      setCancelError("An unexpected error occurred. Please contact customer support.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadOfferSheet = (item?: OrderItemRecord) => {
    if (!order) return;
    const targetItem = item || order.items?.[0];
    if (!targetItem) return;

    downloadProductOfferSheetPDF(
      {
        name: targetItem.product_name,
        sku: targetItem.sku,
        price: targetItem.unit_price,
        moq: targetItem.quantity,
        imageUrl: targetItem.product_image_url,
        images: (targetItem as any).product_images || (targetItem as any).images || (targetItem.product_image_url ? [targetItem.product_image_url] : []),
        packageBreakdown: targetItem.package_breakdown,
      },
      {
        name: order.shipping_name,
        company: order.shipping_company,
        email: order.email,
        country: order.shipping_country_code,
      },
      targetItem.quantity
    );
  };

  // State: Loading
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl animate-pulse" />
        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // State: Unauthorized / Not Allowed
  if (unauthorized) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
          403 — Unauthorized Access
        </span>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-3">
          Order Access Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          This order belongs to a different buyer account. Under Ayaan Clothing strict B2B privacy rules, customer orders are fully isolated and cannot be accessed without proper authorization.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Return to Your Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  // State: Not Found
  if (!order) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Package size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Order Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
          The requested wholesale order <span className="font-mono font-semibold">{orderId}</span> could not be located.
        </p>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Order List</span>
        </Link>
      </div>
    );
  }

  // Presentation status
  const statusPres = getOrderStatusPresentation(order);
  const paymentPres = getPaymentPresentation(order.payment_status);
  const StatusIcon = statusPres.icon;
  const activeStep = getProgressStep(order);
  const isCancelled = order.status === "cancelled";
  const canCancel =
    (order.status === "pending" || order.status === "processing") &&
    order.payment_status !== "paid" &&
    order.fulfillment_status !== "shipped" &&
    order.fulfillment_status !== "delivered";

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 1. ORDER HEADER ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to All Orders</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {order.order_number}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
              >
                <StatusIcon size={12} />
                {statusPres.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              <span>Placed: {formatOrderDate(order.created_at || order.placed_at)}</span>
              <span>•</span>
              <span>Buyer: {order.shipping_name}</span>
              {order.shipping_company && (
                <>
                  <span>•</span>
                  <span>{order.shipping_company}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={getWhatsAppUrl(
                `Hello, I am inquiring about wholesale order ${order.order_number} (${order.status}).`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle size={14} />
              <span>WhatsApp Support</span>
            </a>

            <Link
              href="/dashboard/reorder"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs"
            >
              <RotateCcw size={13} />
              <span>Reorder Items</span>
            </Link>

            {canCancel && (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer border border-red-200 dark:border-red-800/40"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. STATUS STEPPER & BADGES ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <CircleDot size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fulfillment Status & Timeline
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider ${paymentPres.badgeClass}`}
            >
              Payment: {paymentPres.label}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              Fulfillment: {order.fulfillment_status || "unfulfilled"}
            </span>
          </div>
        </div>

        {isCancelled ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
            <XCircle size={22} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">Order Cancelled</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
                This commercial order was cancelled. No manufacturing or freight charges apply.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PROGRESS_STEPS.map((step, idx) => {
              const stepNum = idx + 1;
              const isCompleted = activeStep >= stepNum;
              const isCurrent = activeStep === stepNum;

              return (
                <div
                  key={step.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60"
                      : isCompleted
                      ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/10"
                      : "bg-transparent border-dashed border-slate-200 dark:border-white/5 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[0.625rem] font-mono font-bold text-slate-400">
                      STEP 0{stepNum}
                    </span>
                    {isCompleted ? (
                      <Check size={14} className="text-amber-600 dark:text-amber-400" strokeWidth={3} />
                    ) : null}
                  </div>
                  <p
                    className={`text-xs font-bold ${
                      isCurrent
                        ? "text-amber-700 dark:text-amber-400"
                        : isCompleted
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[0.625rem] text-slate-500 dark:text-slate-400 mt-0.5">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3. ORDER PRODUCTS (Historical Values Only) ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Purchased Export Products ({order.items?.length || 0} styles)
            </h2>
          </div>
          <span className="text-[0.6875rem] text-slate-400">
            Historical contract pricing locked
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => {
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
                <div key={item.id || idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-16 aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0 p-1 flex items-center justify-center">
                      {item.product_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.product_image_url}
                          alt={item.product_name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                          <Package size={22} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.product_name}
                      </h3>
                      {item.variant_title && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.variant_title}
                        </p>
                      )}
                      {item.sku && (
                        <p className="text-[0.6875rem] font-mono text-slate-400">
                          SKU: {item.sku}
                        </p>
                      )}

                      {/* Package assortment */}
                      {Array.isArray(breakdown) && breakdown.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {breakdown.map((bd: any, i: number) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.2 rounded text-[0.625rem] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {bd.color ? `${bd.color} ` : ""}{bd.size}: {bd.quantity}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing and quantities - strictly historical! */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-right shrink-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span>{item.quantity} pcs @ </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatUSD(item.unit_price)}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {formatUSD(item.line_total || item.unit_price * item.quantity)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 py-4">No product line items found.</p>
          )}
        </div>
      </div>

      {/* ─── 4. FINANCIAL SUMMARY ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <CreditCard size={16} className="text-amber-600 dark:text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Commercial Financial Summary
          </h2>
        </div>

        <div className="max-w-md ml-auto space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>FOB Products Subtotal</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatUSD(order.subtotal)}
            </span>
          </div>

          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Shipping & Freight Charges ({order.carrier || "Export Freight"})</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatUSD(order.shipping_cost)}
            </span>
          </div>

          {Number(order.tax_amount) > 0 && (
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Export Duties & Taxes</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatUSD(order.tax_amount)}
              </span>
            </div>
          )}

          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span>
                {order.coupon_code || order.promo_code
                  ? `Discount (${order.coupon_code || order.promo_code})`
                  : "Volume Discount / Concession"}
              </span>
              <span className="font-semibold font-mono">-{formatUSD(order.discount_amount)}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-baseline">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Grand Total (USD)
            </span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">
              {formatUSD(order.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 5. SHIPPING INFORMATION (Historical Snapshot Preserved) ───────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <MapPin size={16} className="text-amber-600 dark:text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Consignee & Shipping Destination
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Consignee Details
            </p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {order.shipping_name}
            </p>
            {order.shipping_company && (
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {order.shipping_company}
              </p>
            )}
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {order.shipping_address1}
              {order.shipping_address2 ? `, ${order.shipping_address2}` : ""}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              {order.shipping_city}
              {order.shipping_region ? `, ${order.shipping_region}` : ""}{" "}
              {order.shipping_postal_code}
            </p>
            <p className="text-slate-600 dark:text-slate-400 font-semibold">
              {order.shipping_country_code}
            </p>
            {order.shipping_phone && (
              <p className="text-slate-500 mt-1">Tel: {order.shipping_phone}</p>
            )}
          </div>

          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Shipping Specifications
            </p>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500">Method:</span>
                <span className="font-semibold">{order.shipping_method || "Air Freight Express"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500">Assigned Carrier:</span>
                <span className="font-semibold">{order.carrier || "DHL / Aramex International"}</span>
              </div>
              {order.shipping_snapshot && (
                <>
                  {order.shipping_snapshot.carton_count != null && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                      <span className="text-slate-500">Carton Count:</span>
                      <span className="font-semibold">{order.shipping_snapshot.carton_count} ctn</span>
                    </div>
                  )}
                  {order.shipping_snapshot.gross_weight != null && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                      <span className="text-slate-500">Gross Weight:</span>
                      <span className="font-semibold">{order.shipping_snapshot.gross_weight} kg</span>
                    </div>
                  )}
                  {order.shipping_snapshot.cbm != null && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                      <span className="text-slate-500">CBM Volume:</span>
                      <span className="font-semibold">{order.shipping_snapshot.cbm} m³</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. PAYMENT INFORMATION ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Payment &amp; Settlement Details
            </h2>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider ${paymentPres.badgeClass}`}
          >
            {order.payment_status === "paid" ? "● PAID" : paymentPres.label}
          </span>
        </div>

        {/* 6.1 CONFIRMED PAID STATE */}
        {order.payment_status === "paid" ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-1">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-xs">
                <Check size={16} />
                <span>Payment Confirmed &amp; Verified</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                Your payment has been verified by the accounts team. The confirmed transaction details below are recorded in your official commercial documentation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Status</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">● PAID</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Method</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {order.payment_details?.payment_method || order.payment_method || "Bank Wire Transfer"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Transaction ID</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {order.payment_details?.transaction_id || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payer / Remitter</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {order.payment_details?.payer_name || order.shipping_name}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Name</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {order.payment_details?.bank_name || "Pubali Bank Limited"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Date</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {order.payment_details?.payment_date || formatOrderDate(order.payment_confirmed_at || "")}
                </span>
              </div>
              <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount Verified</span>
                  <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                    ${Number(order.payment_details?.payment_amount ?? order.total_amount).toFixed(2)} {order.currency || "USD"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {order.payment_proof_url && (
                    <a
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>View Receipt</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadCommercialInvoicePDF(order)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                    id="btn-generate-commercial-invoice-hero"
                  >
                    <Download size={14} />
                    <span>Generate Commercial Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : order.payment_status === "payment_submitted" ? (
          /* 6.2 PAYMENT SUBMITTED STATE */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-xs space-y-1">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold uppercase text-xs">
                <Clock size={16} />
                <span>Payment Submitted — Awaiting Admin Verification</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                We have received your payment proof and details. Our accounts team will review and verify the credit with our bank. Once approved, your order status will be marked as PAID and your official Commercial Invoice will unlock.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-slate-500 font-medium">Submitted Receipt &amp; Details:</p>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-blue-500" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {order.payment_details?.transaction_id ? `Txn: ${order.payment_details.transaction_id}` : "Receipt on File"}
                  </span>
                  {order.payment_details?.payment_amount && (
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      (${Number(order.payment_details.payment_amount).toFixed(2)})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {order.payment_proof_url && (
                  <a
                    href={order.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    <ExternalLink size={12} />
                    <span>View Submitted Proof</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(!showSubmitForm)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {showSubmitForm ? "Hide Form" : "Upload Additional Slip"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 6.3 PENDING STATE */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <p className="text-slate-500">Payment Instrument:</p>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5 text-sm uppercase">
                {order.payment_method || "Commercial Bank Wire / Swift"}
              </p>

              <div className="mt-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1">
                <p className="font-bold text-amber-800 dark:text-amber-400 text-xs">
                  Awaiting Bank Wire Transfer
                </p>
                <p className="text-[0.6875rem] text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                  Please wire funds using the order reference{" "}
                  <span className="font-mono font-bold">{order.order_number}</span> to our verified export bank account (Pubali Bank Limited).
                </p>
              </div>
            </div>

            {/* Quick Upload / Form Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                  Payment Receipt &amp; Verification
                </p>
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(!showSubmitForm)}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {showSubmitForm ? "Quick Slip Upload" : "Enter Payment Details"}
                </button>
              </div>

              {!showSubmitForm ? (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/15 rounded-xl p-4 cursor-pointer hover:border-amber-500 transition-colors bg-slate-50/50 dark:bg-white/[0.01]">
                    <Upload size={20} className="text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {uploadingReceipt ? "Submitting receipt..." : "Upload Bank Wire Receipt"}
                    </span>
                    <span className="text-[0.625rem] text-slate-400 mt-0.5">
                      JPG, PNG, WEBP, PDF (Max 10MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleUploadReceipt}
                      disabled={uploadingReceipt}
                      className="hidden"
                      id="input-customer-receipt-upload"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* 6.4 STRUCTURED PAYMENT SUBMISSION FORM (Active when form toggled or needed) */}
        {(showSubmitForm || (order.payment_status === "pending" && !order.payment_proof_url)) && order.payment_status !== "paid" && (
          <form onSubmit={handleSubmitPaymentDetails} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/30 space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider">
                Submit Payment Details &amp; Receipt
              </h3>
              <p className="text-[11px] text-slate-500">
                Provide transfer details so our finance team can verify and confirm your payment promptly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Receipt File */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Payment Receipt / Slip (JPG, PNG, PDF)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                />
              </div>

              {/* Transaction ID */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Transaction ID / Swift Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN123456789"
                  value={paymentTxnId}
                  onChange={(e) => setPaymentTxnId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-xs outline-none focus:border-amber-500"
                  id="customer-payment-txn-id"
                />
              </div>

              {/* Payer / Remitter Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Payer / Company Name
                </label>
                <input
                  type="text"
                  placeholder="Company or Individual"
                  value={paymentPayer}
                  onChange={(e) => setPaymentPayer(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none focus:border-amber-500"
                  id="customer-payment-payer"
                />
              </div>

              {/* Bank Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pubali Bank Limited"
                  value={paymentBank}
                  onChange={(e) => setPaymentBank(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none focus:border-amber-500"
                  id="customer-payment-bank"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Payment Amount ({order.currency || "USD"})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-xs outline-none focus:border-amber-500"
                  id="customer-payment-amount"
                />
              </div>

              {/* Payment Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none focus:border-amber-500"
                  id="customer-payment-date"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Additional Notes
                </label>
                <input
                  type="text"
                  placeholder="Wire reference or branch details"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none focus:border-amber-500"
                  id="customer-payment-notes"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400 italic">
                Rule: Order is marked PAID strictly after admin confirmation.
              </span>
              <button
                type="submit"
                disabled={uploadingReceipt}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase text-xs tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                id="btn-submit-payment-details"
              >
                <Check size={14} />
                <span>{uploadingReceipt ? "Submitting..." : "Submit Payment Details"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Success / Error Messages */}
        {receiptSuccess && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <Check size={14} /> Payment details submitted successfully! Status updated to Awaiting Verification.
          </p>
        )}
        {receiptError && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
            <AlertCircle size={14} /> {receiptError}
          </p>
        )}
      </div>

      {/* ─── 7. TRACKING ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Freight Tracking & Logistics
            </h2>
          </div>
          {order.tracking_number && (
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              AWB #{order.tracking_number}
            </span>
          )}
        </div>

        {order.tracking_number ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Carrier: <span className="font-bold text-slate-900 dark:text-white">{order.carrier || "DHL Express"}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                    {order.tracking_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyTracking(order.tracking_number || "")}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy tracking number"
                  >
                    {copiedTracking ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {order.direct_tracking_url && (
                <a
                  href={order.direct_tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-center"
                >
                  <span>Track on Carrier Website</span>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>

            {/* Tracking Status Events Timeline */}
            {order.status_events && order.status_events.length > 0 && (
              <div className="pt-2">
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Event Milestones
                </p>
                <div className="space-y-2">
                  {order.status_events.map((evt) => (
                    <div
                      key={evt.id}
                      className="text-xs p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 flex items-start justify-between gap-3"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white capitalize">
                          {evt.event_type.replace(/_/g, " ")}
                        </span>
                        {evt.message && (
                          <p className="text-slate-500 dark:text-slate-400 text-[0.6875rem] mt-0.5">
                            {evt.message}
                          </p>
                        )}
                      </div>
                      <span className="text-[0.625rem] text-slate-400 shrink-0">
                        {new Date(evt.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <Clock size={20} className="mx-auto text-slate-400 mb-1.5" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Air Waybill Not Yet Issued
            </p>
            <p className="mt-0.5">
              Tracking number will appear automatically once cargo is inspected, packaged, and handed over to freight forwarding.
            </p>
          </div>
        )}
      </div>

      {/* ─── 8. DOCUMENTS ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Commercial Export Documents
            </h2>
          </div>
          <span className="text-[0.6875rem] text-slate-400">Standard ISO A4 format</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Proforma Invoice */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText size={18} className="text-amber-600" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Proforma Invoice</p>
                <p className="text-[0.6875rem] text-slate-500">Official commercial invoice quote</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadProformaInvoicePDF(order)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Download size={12} />
              <span>PDF</span>
            </button>
          </div>

          {/* Product Offer Sheet */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText size={18} className="text-amber-600" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Product Spec Sheet</p>
                <p className="text-[0.6875rem] text-slate-500">Style specs and package assortment</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadOfferSheet()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Download size={12} />
              <span>PDF</span>
            </button>
          </div>

          {/* Commercial Invoice (unlocked after payment) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {order.payment_status === "paid" ? (
                <FileText size={18} className="text-emerald-600" />
              ) : (
                <Lock size={18} className="text-slate-400" />
              )}
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Commercial Invoice</p>
                <p className="text-[0.6875rem] text-slate-500">
                  {order.payment_status === "paid" ? "Final customs documentation" : "Unlocks after payment"}
                </p>
              </div>
            </div>
            {order.payment_status === "paid" ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/documents/COMMERCIAL_INVOICE/order_${order.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ExternalLink size={12} />
                  <span>View</span>
                </Link>
                <button
                  type="button"
                  onClick={() => downloadCommercialInvoicePDF(order)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                  id="btn-download-commercial-invoice-sec8"
                >
                  <Download size={12} />
                  <span>Download PDF</span>
                </button>
              </div>
            ) : (
              <span className="text-[0.625rem] text-slate-400 italic">Available after payment confirmation</span>
            )}
          </div>

          {/* Packing List */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText size={18} className="text-blue-600" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Export Packing List</p>
                <p className="text-[0.6875rem] text-slate-500">Carton breakdown & dimensions</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadOfferSheet()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Download size={12} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── CANCEL ORDER MODAL ─────────────────────────────────────────────── */}
      {cancelModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <XCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center">
              Request Order Cancellation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
              Order: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{order.order_number}</span>
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reason for cancellation:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Order placed by mistake">Order placed by mistake</option>
                <option value="Changed order specifications or quantities">
                  Changed order specifications or quantities
                </option>
                <option value="Switching shipping destination / freight forwarder">
                  Switching shipping destination / freight forwarder
                </option>
                <option value="Other commercial reason">Other commercial reason</option>
              </select>
            </div>

            {cancelError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
