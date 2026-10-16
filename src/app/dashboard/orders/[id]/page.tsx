"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getOrderById, OrderRecord, OrderItemRecord } from "@/lib/services/orders";
import { uploadPaymentProof, PaymentSubmissionDetails } from "@/lib/services/storage";
import {
  getOrderStatusPresentation,
  getCanonicalCustomerStatus,
  CANONICAL_TIMELINE_STAGES,
  getCanonicalStepIndex,
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
  Loader2,
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



export default function CustomerOrderDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);



  // Payment proof upload & structured submission
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentDetails, setPaymentDetails] = useState("");
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
      if (data.payment_details) {
        if (data.payment_details.payer_name) setPaymentPayer(data.payment_details.payer_name);
        if (data.payment_details.payment_amount !== undefined) setPaymentAmount(String(data.payment_details.payment_amount));
        if (data.payment_details.payment_date) setPaymentDate(data.payment_details.payment_date);
        if (data.payment_details.transaction_id) setPaymentTxnId(data.payment_details.transaction_id);
        if (data.payment_details.bank_name) setPaymentBank(data.payment_details.bank_name);
        if (data.payment_details.payment_method) setPaymentMethod(data.payment_details.payment_method);
        if (data.payment_details.notes) setPaymentNotes(data.payment_details.notes);
        if (data.payment_details.payment_details) setPaymentDetails(data.payment_details.payment_details);
      } else {
        if (!paymentPayer) setPaymentPayer(data.shipping_name || "");
        if (!paymentAmount) setPaymentAmount(String(data.total_amount || ""));
        if (!paymentDate) setPaymentDate(new Date().toISOString().split("T")[0]);
      }
    } catch (err: any) {
      console.error("Failed to fetch order:", err);
      setError("Unable to load order details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Live refresh when tab gains focus or becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchOrder();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // Live update interval every 15s to automatically catch Admin payment approval
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchOrder();
      }
    }, 15000);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      clearInterval(interval);
    };
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Client-side file size validation: max 10MB (10 * 1024 * 1024)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setReceiptError("File exceeds 10MB limit. Please upload a smaller receipt image or PDF.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    // Client-side file format validation: jpg, jpeg, png, webp, pdf
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];
    const extMatch = file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i);
    if (!validMimes.includes(file.type.toLowerCase()) && !extMatch) {
      setReceiptError("Invalid file type. Allowed formats: JPG, PNG, WebP, PDF.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setReceiptError(null);
    setSelectedFile(file);
  };

  const handleSubmitPaymentDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order) return;

    // Check if user has provided either a new file, new details, or has existing details to update
    const hasExistingEvidence = Boolean(
      order.payment_details?.payment_details ||
      order.payment_details?.transaction_id ||
      order.payment_proof_url
    );

    if (!selectedFile && !paymentDetails.trim() && !paymentTxnId.trim() && !hasExistingEvidence) {
      setReceiptError("Please select a payment receipt file or enter your payment details.");
      return;
    }

    setUploadingReceipt(true);
    setReceiptError(null);

    try {
      const details: PaymentSubmissionDetails = {
        payment_details: paymentDetails.trim() || undefined,
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
        // Refresh immediately using returned order record or refetch
        if (result.order) {
          setOrder(result.order as OrderRecord);
        }
        await fetchOrder();
      }
    } catch (err: any) {
      console.error("Receipt upload error:", err);
      setReceiptError(err.message || "Failed to submit payment details.");
    } finally {
      setUploadingReceipt(false);
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
  const canonicalStatus = getCanonicalCustomerStatus(order);
  const statusPres = getOrderStatusPresentation(order);
  const paymentPres = getPaymentPresentation(order.payment_status);
  const StatusIcon = statusPres.icon;
  const activeStep = getCanonicalStepIndex(canonicalStatus);

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
                `Hello, I am inquiring about wholesale order ${order.order_number} (${statusPres.label}).`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle size={14} />
              <span>WhatsApp Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─── 2. CANONICAL LIFECYCLE TIMELINE ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <CircleDot size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Canonical Order Lifecycle
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
            >
              <StatusIcon size={12} className={statusPres.iconClass} />
              {statusPres.label}
            </span>
          </div>
        </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CANONICAL_TIMELINE_STAGES.map((step) => {
              const isCompleted = activeStep > step.stepNumber;
              const isCurrent = activeStep === step.stepNumber;

              return (
                <div
                  key={step.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/20 shadow-xs"
                      : isCompleted
                      ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-800/50"
                      : "bg-slate-50/50 dark:bg-slate-800/20 border-dashed border-slate-200 dark:border-white/10 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[0.625rem] font-mono font-bold text-slate-400 dark:text-slate-500">
                      STAGE 0{step.stepNumber}
                    </span>
                    {isCompleted ? (
                      <Check size={14} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                    ) : isCurrent ? (
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    ) : null}
                  </div>
                  <p
                    className={`text-xs font-bold ${
                      isCurrent
                        ? "text-amber-800 dark:text-amber-300"
                        : isCompleted
                        ? "text-emerald-800 dark:text-emerald-300"
                        : "text-slate-400 dark:text-slate-500"
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
                  {order.payment_details?.payment_date
                    ? formatOrderDate(order.payment_details.payment_date)
                    : formatOrderDate(order.payment_confirmed_at || order.placed_at || order.created_at)}
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
        ) : canonicalStatus === "WAITING_FOR_APPROVAL" || order.payment_status === "payment_submitted" ? (
          /* 6.2 WAITING FOR APPROVAL STATE */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 text-xs space-y-1">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-bold uppercase text-xs">
                <Clock size={16} />
                <span>Waiting for Approval</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Payment proof submitted successfully. We are now waiting for payment approval.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-slate-500 font-medium">Submitted Receipt &amp; Details:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Check size={14} className="text-sky-500" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {order.payment_details?.transaction_id ? `Txn: ${order.payment_details.transaction_id}` : "Receipt on File"}
                  </span>
                  {order.payment_details?.payment_amount && (
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      (${Number(order.payment_details.payment_amount).toFixed(2)})
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">
                    Submitted: {order.payment_details?.payment_date || formatOrderDate(order.updated_at)}
                  </span>
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
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  id="btn-toggle-replace-receipt"
                >
                  {showSubmitForm ? "Hide Form" : "Update / Replace Receipt"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 6.3 PAYMENT PENDING STATE */
          <div className="space-y-4">
            {order.payment_status === "failed" && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold uppercase text-xs">
                  <AlertCircle size={16} />
                  <span>Payment Proof Verification Unsuccessful</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Previous payment proof was not approved. Please review your wire transaction details and submit a corrected payment proof below.
                </p>
                {order.payment_details?.notes && (
                  <p className="text-red-700 dark:text-red-400 text-[11px] font-semibold pt-0.5">
                    Accounts note: &quot;{order.payment_details.notes}&quot;
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <p className="text-slate-500">Payment Instrument:</p>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5 text-sm uppercase">
                {order.payment_method || "Commercial Bank Wire / Swift"}
              </p>

              <div className="mt-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1.5">
                <p className="font-bold text-amber-800 dark:text-amber-400 text-xs">
                  Your order has been placed. Please complete payment and submit your payment proof for approval.
                </p>
                <p className="text-[0.6875rem] text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                  Please wire funds using order reference{" "}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{order.order_number}</span> to our verified export account at Pubali Bank Limited.
                </p>
              </div>
            </div>

            {/* Quick Upload / Form Toggle — now always shows the structured form */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                  Payment Receipt &amp; Verification
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSubmitForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-xs font-bold transition-colors cursor-pointer"
                id="btn-open-payment-form"
              >
                <Upload size={14} />
                <span>Submit Payment Details &amp; Proof</span>
              </button>
            </div>
          </div>
        </div>
        )}

        {/* 6.4 STRUCTURED PAYMENT SUBMISSION FORM */}
        {(showSubmitForm || order.payment_status === "pending") && order.payment_status !== "paid" && (
          <form onSubmit={handleSubmitPaymentDetails} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/30 space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider">
                {order.payment_proof_url ? "Update Payment Receipt & Details" : "Submit Payment Details & Receipt"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Attach a payment receipt or bank slip (JPG, PNG, WebP, PDF up to 10MB) or enter transaction details for finance verification.
              </p>
            </div>

            {/* Payment Details */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                Payment Details / Transfer Info {!selectedFile && !order.payment_proof_url && <span className="text-red-500">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Transferred via Pubali Bank TT, Ref: TXN-987654321, Amount: $4,255.00, Date: 2026-09-25, Sender: ABC Fashion Ltd. — or attach your wire receipt below."
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none focus:border-amber-500 resize-none"
                id="customer-payment-details"
              />
              <p className="text-[10px] text-slate-400">
                Include: payment method, transaction/reference ID, amount, date, sender/bank name, or explanation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Receipt File */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Payment Receipt / Slip — <span className="text-slate-400 font-normal">(JPG, PNG, WebP, PDF — Max 10MB)</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                  id="input-customer-receipt-upload"
                />
                {selectedFile && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </p>
                )}
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
              <div className="flex items-center gap-2">
                {showSubmitForm && (
                  <button
                    type="button"
                    onClick={() => { setShowSubmitForm(false); setReceiptError(null); }}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={uploadingReceipt || (!selectedFile && !paymentDetails.trim() && !paymentTxnId.trim() && !order.payment_details)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase text-xs tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  id="btn-submit-payment-details"
                >
                  {uploadingReceipt ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>
                    {uploadingReceipt
                      ? "Uploading Receipt..."
                      : order.payment_proof_url
                      ? "Update Payment Receipt"
                      : "Submit Payment Details"}
                  </span>
                </button>
              </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* 1. Offer Sheet */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <FileText size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Offer Sheet</p>
                <p className="text-[0.6875rem] text-slate-500">Product specifications & commercial offer</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadOfferSheet()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Download size={12} />
              <span>Download PDF</span>
            </button>
          </div>

          {/* 2. Proforma Invoice (PI) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <FileText size={18} className="text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Proforma Invoice (PI)</p>
                <p className="text-[0.6875rem] text-slate-500">Provisional terms & payment instructions</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadProformaInvoicePDF(order)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Download size={12} />
              <span>Download PDF</span>
            </button>
          </div>

          {/* 3. Commercial Invoice (CI) (unlocked after payment) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {order.payment_status === "paid" ? (
                <FileText size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Lock size={18} className="text-slate-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Commercial Invoice (CI)</p>
                <p className="text-[0.6875rem] text-slate-500">
                  {order.payment_status === "paid" ? "Final commercial & export declaration" : "Unlocks after payment confirmation"}
                </p>
              </div>
            </div>
            {order.payment_status === "paid" ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/ayc/documents/COMMERCIAL_INVOICE/order_${order.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ExternalLink size={12} />
                  <span>View</span>
                </Link>
                <button
                  type="button"
                  onClick={() => downloadCommercialInvoicePDF(order)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                  id="btn-download-commercial-invoice-sec8"
                >
                  <Download size={12} />
                  <span>PDF</span>
                </button>
              </div>
            ) : (
              <span className="text-[0.625rem] text-slate-400 italic text-center py-1">Available upon payment verification</span>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}
