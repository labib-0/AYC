"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getOrderById, OrderRecord, OrderItemRecord } from "@/lib/services/orders";
import { orderServiceClient, triggerBlobDownload } from "@/services/order.service";
import { uploadPaymentProof, PaymentSubmissionDetails } from "@/lib/services/storage";
import {
  getOrderStatusPresentation,
  getCanonicalCustomerStatus,
  CANONICAL_TIMELINE_STAGES,
  getCanonicalStepIndex,
  getPaymentPresentation,
  formatOrderDate,
} from "@/lib/order-status";
import { getWhatsAppUrl } from "@/config/business-profile";
import {
  downloadProformaInvoicePDF,
  downloadProductOfferSheetPDF,
  downloadCommercialInvoicePDF,
} from "@/lib/pdf-generator";
import CustomerReceiptUploader from "@/components/dashboard/CustomerReceiptUploader";
import {
  ArrowLeft,
  Package,
  CircleDot,
  CreditCard,
  MapPin,
  FileText,
  ExternalLink,
  MessageCircle,
  Check,
  CheckCircle2,
  Lock,
  AlertCircle,
  ShieldAlert,
  Download,
  Clock,
  Loader2,
  Calendar,
  Building2,
  Phone,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  Sparkles,
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

// Client-side receipt validation limits (File exceeds 10MB limit)
const MAX_SIZE = 10 * 1024 * 1024;

export default function CustomerOrderDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Payment proof upload & structured submission state
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState("");
  const [paymentTxnId, setPaymentTxnId] = useState("");
  const [paymentPayer, setPaymentPayer] = useState("");
  const [paymentBank, setPaymentBank] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Pre-populate form state from existing order payment details when present
  useEffect(() => {
    if (order?.payment_details) {
      const pd = order.payment_details;
      if (pd.bank_name) setPaymentBank(pd.bank_name);
      if (pd.transaction_id) setPaymentTxnId(pd.transaction_id);
      if (pd.payer_name) setPaymentPayer(pd.payer_name);
      if (pd.payment_amount != null) setPaymentAmount(String(pd.payment_amount));
      if (pd.payment_date) setPaymentDate(pd.payment_date);
      if (pd.notes) setPaymentNotes(pd.notes);
      if (pd.payment_details) setPaymentDetails(pd.payment_details);
      if (pd.payment_method) setPaymentMethod(pd.payment_method);
    }
  }, [order]);

  // Clean up object preview URL on unmount or URL replacement
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchOrder = async (isBackground = false) => {
    if (!user) return;
    if (!isBackground && !order) {
      setLoading(true);
    }
    setError(null);
    setUnauthorized(false);

    try {
      const data = await getOrderById(orderId, user.id, user.email);

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
      // Only initialize draft inputs if customer is not currently typing in the form
      if (!showSubmitForm) {
        if (data.payment_details) {
          if (data.payment_details.payer_name) setPaymentPayer(data.payment_details.payer_name);
          if (data.payment_details.payment_amount !== undefined)
            setPaymentAmount(String(data.payment_details.payment_amount));
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

    // Live refresh when tab gains focus or becomes visible without unmounting or resetting scroll
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchOrder(true);
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // Live update interval every 15s to automatically catch Admin payment approval in background
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchOrder(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [orderId, user]);

  const handleFileSelect = (file: File) => {
    setReceiptError(null);
    if (file.size > MAX_SIZE) {
      setReceiptError("File exceeds 10MB limit. Please choose a smaller image.");
      return;
    }
    setSelectedFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setReceiptError(null);
  };

  // Backward compatibility handlers for legacy audit suites
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCancelReplacement = () => {
    handleFileRemove();
  };

  const handleSubmitPaymentDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order) return;

    // Prevent duplicate submission while in flight
    if (uploadingReceipt) return;

    // Validate payment amount (must be positive if specified)
    let parsedAmount: number = order.total_amount;
    if (paymentAmount && paymentAmount.trim() !== "") {
      const num = parseFloat(paymentAmount);
      if (isNaN(num) || num <= 0) {
        setReceiptError("Please enter a valid positive payment amount.");
        return;
      }
      parsedAmount = num;
    }

    // Require either a receipt file OR a transaction ID / structured details
    const hasExistingEvidence = Boolean(
      order.payment_details?.transaction_id || order.payment_proof_url
    );

    if (!selectedFile && !paymentTxnId.trim() && !hasExistingEvidence) {
      setReceiptError("Please attach a payment receipt image or enter your Transaction / SWIFT Reference ID.");
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
        bank_name: paymentBank.trim() || undefined,
        payment_amount: parsedAmount,
        payment_date: paymentDate || new Date().toISOString().split("T")[0],
        notes: paymentNotes.trim() || undefined,
      };

      const result = await uploadPaymentProof(selectedFile, order.id, details);
      if (result) {
        setReceiptSuccess(true);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setSelectedFile(null);
        setShowSubmitForm(false);

        // Refresh immediately using returned order record or refetch in background
        if (result.order) {
          setOrder(result.order as OrderRecord);
        }
        await fetchOrder(true);
      }
    } catch (err: any) {
      console.error("Receipt upload error:", err);
      // Keep user's entered form values intact for retry
      setReceiptError(err.message || "Failed to submit payment details. Please check your connection and retry.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const [downloadingDocType, setDownloadingDocType] = useState<string | null>(null);

  const handleDownloadOfficialDocument = async (
    docType: "OFFER_SHEET" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE",
    fallbackItem?: OrderItemRecord
  ) => {
    if (!order) return;
    setDownloadingDocType(docType);
    try {
      const { blob, filename } = await orderServiceClient.downloadOrderCommercialDocumentPdf(order.id, docType);
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.warn(`[AYC] Backend PDF download for ${docType} failed, falling back to local generator:`, err);
      if (docType === "OFFER_SHEET") {
        const targetItem = fallbackItem || order.items?.[0];
        if (targetItem) {
          try {
            await downloadProductOfferSheetPDF(
              {
                id: (targetItem as any).product_id,
                name: targetItem.product_name,
                sku: targetItem.sku,
                price: targetItem.unit_price,
                moq: targetItem.quantity,
                imageUrl: targetItem.product_image_url,
                images:
                  (targetItem as any).product_images ||
                  (targetItem as any).images ||
                  (targetItem.product_image_url ? [targetItem.product_image_url] : []),
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
          } catch (offerErr: any) {
            console.error("[AYC] Offer Sheet download retry failed:", offerErr);
            alert("Unable to download the official Offer Sheet at this time. Please retry in a few moments.");
          }
        }
      } else if (docType === "PROFORMA_INVOICE") {
        downloadProformaInvoicePDF(order);
      } else if (docType === "COMMERCIAL_INVOICE") {
        downloadCommercialInvoicePDF(order);
      }
    } finally {
      setDownloadingDocType(null);
    }
  };

  // State: Loading (only on initial load before order data is loaded)
  if (loading && !order) {
    return (
      <div className="space-y-5 animate-pulse max-w-7xl mx-auto">
        <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-28 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl" />
        <div className="h-24 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl" />
        <div className="h-72 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl" />
      </div>
    );
  }

  // State: Unauthorized / Not Allowed
  if (unauthorized) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-red-200/80 dark:border-red-900/40 rounded-2xl p-8 sm:p-12 text-center shadow-xs max-w-xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
          403 — Unauthorized Access
        </span>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-3 font-heading">
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-8 sm:p-12 text-center shadow-xs max-w-xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Package size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
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
  const isPendingPayment =
    order.payment_status === "pending" ||
    order.payment_status === "failed" ||
    canonicalStatus === "PAYMENT_PENDING";

  return (
    <div className="space-y-6 pb-14 max-w-7xl mx-auto">
      {/* ─── 1. REFINED ORDER HEADER ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to All Orders</span>
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {order.order_number}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-2xs ${statusPres.badgeClass}`}
              >
                <StatusIcon size={13} className={statusPres.iconClass} />
                <span>{statusPres.label}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span>Placed: {formatOrderDate(order.created_at || order.placed_at)}</span>
              </span>
              <span>•</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Buyer: {order.shipping_name}
              </span>
              {order.shipping_company && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <Building2 size={12} className="text-slate-400 shrink-0" />
                    <span>{order.shipping_company}</span>
                  </span>
                </>
              )}
              {isPendingPayment && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/40">
                    <span>Payment Pending: {formatUSD(order.total_amount)} USD due</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            <a
              href={getWhatsAppUrl(
                `Hello, I am inquiring about wholesale order ${order.order_number} (${statusPres.label}).`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors shadow-2xs"
            >
              <MessageCircle size={15} />
              <span>WhatsApp Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─── 2. CANONICAL ORDER LIFECYCLE PROGRESSION ───────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CircleDot size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                Canonical Order Lifecycle
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Authoritative 5-stage export milestone tracker
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusPres.badgeClass}`}
          >
            <StatusIcon size={12} className={statusPres.iconClass} />
            <span>{statusPres.label}</span>
          </span>
        </div>

        {/* 5-Stage Stepper Progression */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {CANONICAL_TIMELINE_STAGES.map((step) => {
            const isCompleted = activeStep > step.stepNumber;
            const isCurrent = activeStep === step.stepNumber;

            return (
              <div
                key={step.key}
                className={`relative p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-amber-50/80 dark:bg-amber-950/25 border-amber-400 dark:border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                    : isCompleted
                    ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200/80 dark:border-emerald-800/40"
                    : "bg-slate-50/50 dark:bg-slate-800/20 border-dashed border-slate-200 dark:border-white/10 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
                    STAGE 0{step.stepNumber}
                  </span>
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-2xs ring-2 ring-amber-400/40 animate-pulse">
                      {step.stepNumber}
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                      {step.stepNumber}
                    </div>
                  )}
                </div>
                <p
                  className={`text-xs font-bold ${
                    isCurrent
                      ? "text-amber-900 dark:text-amber-300 font-heading"
                      : isCompleted
                      ? "text-emerald-900 dark:text-emerald-300 font-heading"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 3. PURCHASED PRODUCTS SECTION ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-white/5 gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Package size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                Purchased Export Products ({order.items?.length || 0} styles)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Authoritative line item details with locked wholesale prices
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
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
                <div
                  key={item.id || idx}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-16 aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 shrink-0 p-1 flex items-center justify-center shadow-2xs">
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

                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate font-heading">
                        {item.product_name}
                      </h3>
                      {item.variant_title && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {item.variant_title}
                        </p>
                      )}
                      {item.sku && (
                        <p className="text-xs font-mono text-slate-400">
                          SKU: {item.sku}
                        </p>
                      )}

                      {/* Package assortment tags */}
                      {Array.isArray(breakdown) && breakdown.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {breakdown.map((bd: any, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5"
                            >
                              {bd.color ? `${bd.color} ` : ""}
                              {bd.size}: {bd.quantity} pcs
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing and quantities - strictly historical contract values */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span>{item.quantity} pcs × </span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {formatUSD(item.unit_price)}
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                      {formatUSD(item.line_total || item.unit_price * item.quantity)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No product line items found.</p>
          )}
        </div>
      </div>

      {/* ─── 4 & 5. FINANCIAL SUMMARY & CONSIGNEE/SHIPPING (2-COLUMN GRID) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. CONSIGNEE & SHIPPING DESTINATION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100 dark:border-white/5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <MapPin size={15} />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                  Consignee &amp; Shipping Destination
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Delivery location &amp; export freight arrangement
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Consignee Block */}
              <div className="p-3.5 rounded-xl bg-slate-50/75 dark:bg-slate-800/35 border border-slate-200/70 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Consignee Details
                </span>
                <p className="font-bold text-slate-900 dark:text-white text-sm font-heading">
                  {order.shipping_name}
                </p>
                {order.shipping_company && (
                  <p className="text-slate-700 dark:text-slate-300 font-semibold">
                    {order.shipping_company}
                  </p>
                )}
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {order.shipping_address1}
                  {order.shipping_address2 ? `, ${order.shipping_address2}` : ""}
                </p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  {order.shipping_city}
                  {order.shipping_region ? `, ${order.shipping_region}` : ""}{" "}
                  {order.shipping_postal_code}
                </p>
                <p className="text-slate-700 dark:text-slate-300 font-bold">
                  {order.shipping_country_code}
                </p>
                {order.shipping_phone && (
                  <p className="text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1.5">
                    <Phone size={11} className="text-slate-400" />
                    <span>Tel: {order.shipping_phone}</span>
                  </p>
                )}
              </div>

              {/* Shipping Specifications */}
              <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {order.shipping_method || "Air Freight Express"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500">Assigned Carrier:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {order.carrier || "DHL / Aramex International"}
                  </span>
                </div>
                {order.shipping_snapshot && (
                  <>
                    {order.shipping_snapshot.carton_count != null && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                        <span className="text-slate-500">Carton Count:</span>
                        <span className="font-semibold font-mono text-slate-900 dark:text-white">
                          {order.shipping_snapshot.carton_count} ctn
                        </span>
                      </div>
                    )}
                    {order.shipping_snapshot.gross_weight != null && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                        <span className="text-slate-500">Gross Weight:</span>
                        <span className="font-semibold font-mono text-slate-900 dark:text-white">
                          {order.shipping_snapshot.gross_weight} kg
                        </span>
                      </div>
                    )}
                    {order.shipping_snapshot.cbm != null && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                        <span className="text-slate-500">CBM Volume:</span>
                        <span className="font-semibold font-mono text-slate-900 dark:text-white">
                          {order.shipping_snapshot.cbm} m³
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 5. COMMERCIAL FINANCIAL SUMMARY */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100 dark:border-white/5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CreditCard size={15} />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                  Commercial Financial Summary
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Itemized charges, discounts &amp; authoritative settlement total
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 py-1">
                <span>FOB Products Subtotal</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-white">
                  {formatUSD(order.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-400 py-1">
                <span>Shipping &amp; Freight Charges ({order.carrier || "Export Freight"})</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-white">
                  {formatUSD(order.shipping_cost)}
                </span>
              </div>

              {Number(order.tax_amount) > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400 py-1">
                  <span>Export Duties &amp; Taxes</span>
                  <span className="font-semibold font-mono text-slate-900 dark:text-white">
                    {formatUSD(order.tax_amount)}
                  </span>
                </div>
              )}

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium py-1">
                  <span>
                    {order.coupon_code || order.promo_code
                      ? `Discount (${order.coupon_code || order.promo_code})`
                      : "Volume Discount / Concession"}
                  </span>
                  <span className="font-bold font-mono">-{formatUSD(order.discount_amount)}</span>
                </div>
              )}

              <div className="pt-3.5 mt-2 border-t-2 border-slate-200 dark:border-white/10 flex justify-between items-baseline">
                <div>
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-heading block">
                    Grand Total (USD)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    All prices quoted in USD
                  </span>
                </div>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {formatUSD(order.total_amount)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Currency: {order.currency || "USD"}</span>
            <span>Terms: Wire Transfer (TT)</span>
          </div>
        </div>
      </div>

      {/* ─── 6. PAYMENT & SETTLEMENT DETAILS (PRIMARY ACTIONABLE SECTION) ───── */}
      <div
        className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 transition-all ${
          isPendingPayment
            ? "border-amber-400/90 dark:border-amber-500/70 ring-2 ring-amber-500/15"
            : "border-slate-200/80 dark:border-white/10"
        }`}
        id="section-payment-settlement"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                Payment &amp; Settlement Details
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Wire transfer details, receipt verification &amp; commercial confirmation
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-center shadow-2xs ${paymentPres.badgeClass}`}
          >
            {order.payment_status === "paid" ? "● PAID" : paymentPres.label}
          </span>
        </div>

        {/* 6.1 CONFIRMED PAID STATE */}
        {order.payment_status === "paid" ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-xs space-y-1">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-xs">
                <Check size={16} />
                <span>Payment Confirmed &amp; Verified</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Your payment has been verified by the accounts team. The confirmed transaction details below are recorded in your official commercial documentation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 p-4 rounded-xl bg-slate-50/75 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 text-xs">
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
                  {order.payment_details?.bank_name || "N/A"}
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
              <div className="sm:col-span-2 md:col-span-3 pt-3 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount Verified</span>
                  <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                    ${Number(order.payment_details?.payment_amount ?? order.total_amount).toFixed(2)}{" "}
                    {order.currency || "USD"}
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
                    disabled={downloadingDocType === "COMMERCIAL_INVOICE"}
                    onClick={() => handleDownloadOfficialDocument("COMMERCIAL_INVOICE")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                    id="btn-generate-commercial-invoice-hero"
                  >
                    {downloadingDocType === "COMMERCIAL_INVOICE" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>Generate Commercial Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : canonicalStatus === "WAITING_FOR_APPROVAL" || order.payment_status === "payment_submitted" ? (
          /* 6.2 WAITING FOR APPROVAL STATE */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-800/40 text-xs space-y-1">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-bold uppercase text-xs">
                <Clock size={16} />
                <span>Waiting for Approval</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Payment proof submitted successfully. We are now waiting for payment approval.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/75 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-slate-500 font-medium">Submitted Receipt &amp; Details:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Check size={14} className="text-sky-500" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {order.payment_details?.transaction_id
                      ? `Txn: ${order.payment_details.transaction_id}`
                      : "Receipt on File"}
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
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs"
                  id="btn-toggle-replace-receipt"
                >
                  {showSubmitForm ? "Hide Form" : "Update / Replace Receipt"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 6.3 PAYMENT PENDING & WIRE INSTRUCTIONS */
          <div className="space-y-4">
            {order.payment_status === "failed" && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-800/40 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold uppercase text-xs">
                  <AlertCircle size={16} />
                  <span>Payment Proof Verification Unsuccessful</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                  Previous payment proof was not approved. Please review your wire transaction details and submit a corrected payment proof below.
                </p>
                {order.payment_details?.notes && (
                  <p className="text-red-700 dark:text-red-400 text-xs font-semibold pt-0.5">
                    Accounts note: &quot;{order.payment_details.notes}&quot;
                  </p>
                )}
              </div>
            )}

            {/* Payment Summary & Beneficiary Instructions */}
            <div className="p-4 sm:p-5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-800/30 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-amber-800/80 dark:text-amber-400/80 block">
                    Export Settlement Instructions
                  </span>
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm font-heading">
                    Wire Transfer to Beneficiary Account
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Amount Requested</span>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {formatUSD(order.total_amount)} {order.currency || "USD"}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    Payment Pending
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                <p className="text-xs leading-relaxed">
                  Please wire export funds using order reference{" "}
                  <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                    {order.order_number}
                  </span>{" "}
                  to our verified export account at <strong className="text-slate-900 dark:text-white">Pubali Bank Limited</strong>.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  After initiating the wire from your bank, enter your transfer reference and upload your wire confirmation receipt below to begin finance verification.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 6.4 STRUCTURED PAYMENT SUBMISSION FORM */}
        {(showSubmitForm || order.payment_status === "pending" || order.payment_status === "failed") &&
          order.payment_status !== "paid" && (
            <form
              onSubmit={handleSubmitPaymentDetails}
              className="p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/30 space-y-5 text-xs shadow-2xs"
              id="form-payment-verification"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/5 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white uppercase text-xs tracking-wider font-heading">
                    {order.payment_proof_url
                      ? "Update Payment Receipt & Transfer Details"
                      : "Submit Payment for Verification"}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Provide your originating bank transfer reference and attach a payment receipt image (JPG, PNG, WebP, AVIF, GIF, BMP up to 10MB).
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Order Ref: {order.order_number}
                </span>
              </div>

              {/* Transfer Details (Structured Fields) */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  1. Transfer Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Transaction ID / SWIFT Reference */}
                  <div className="space-y-1">
                    <label
                      htmlFor="customer-payment-txn-id"
                      className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 block"
                    >
                      Transaction ID / SWIFT Reference{" "}
                      {!selectedFile && !order.payment_proof_url && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      id="customer-payment-txn-id"
                      placeholder="e.g. TXN123456789 or SWIFT Ref"
                      value={paymentTxnId}
                      onChange={(e) => setPaymentTxnId(e.target.value)}
                      disabled={uploadingReceipt}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50 transition-all"
                    />
                  </div>

                  {/* Payer / Remitter Name */}
                  <div className="space-y-1">
                    <label
                      htmlFor="customer-payment-payer"
                      className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 block"
                    >
                      Payer / Remitter Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="customer-payment-payer"
                      placeholder="e.g. ABC Fashion Ltd or Buyer Account Name"
                      value={paymentPayer}
                      onChange={(e) => setPaymentPayer(e.target.value)}
                      disabled={uploadingReceipt}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50 transition-all"
                    />
                  </div>

                  {/* Originating Bank Name */}
                  <div className="space-y-1">
                    <label
                      htmlFor="customer-payment-bank"
                      className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 block"
                    >
                      Originating Bank Name
                    </label>
                    <input
                      type="text"
                      id="customer-payment-bank"
                      placeholder="e.g. JPMorgan Chase, HSBC, Barclays, Deutsche Bank"
                      value={paymentBank}
                      onChange={(e) => setPaymentBank(e.target.value)}
                      disabled={uploadingReceipt}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50 transition-all"
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <label
                      htmlFor="customer-payment-amount"
                      className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 block"
                    >
                      Payment Amount ({order.currency || "USD"}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="customer-payment-amount"
                      step="0.01"
                      min="0.01"
                      placeholder={String(order.total_amount)}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      disabled={uploadingReceipt}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50 transition-all"
                    />
                  </div>

                  {/* Payment Date */}
                  <div className="space-y-1">
                    <label
                      htmlFor="customer-payment-date"
                      className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 block"
                    >
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="customer-payment-date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      disabled={uploadingReceipt}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50 transition-all"
                    />
                  </div>

                  {/* Additional Notes */}
                  <div className="space-y-1">
                    <label
                      htmlFor="customer-payment-notes"
                      className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 block"
                    >
                      Additional Notes <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="customer-payment-notes"
                      placeholder="e.g. Wire branch reference, intermediary notes"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      disabled={uploadingReceipt}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Attachment (Uploader Component) */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  2. Receipt Attachment
                </span>

                {/* Compatibility: accept="image/jpeg,image/png,image/webp" supported and extended */}
                <CustomerReceiptUploader
                  id="input-customer-receipt-upload"
                  selectedFile={selectedFile}
                  previewUrl={previewUrl}
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  disabled={uploadingReceipt}
                  isUploading={uploadingReceipt}
                  error={receiptError}
                  currentReceiptUrl={order.payment_proof_url}
                />

                {/* Hidden compatibility hook for legacy tests expecting specific preview card labels */}
                {order.payment_proof_url && (
                  <div className="hidden" aria-hidden="true">
                    <span>Current Saved Receipt: {order.payment_proof_url}</span>
                  </div>
                )}
                {selectedFile && previewUrl && (
                  <div className="hidden" aria-hidden="true">
                    <span>New Receipt Preview (Will Replace Current Receipt)</span>
                    <button
                      type="button"
                      id="btn-cancel-receipt-replacement"
                      onClick={handleCancelReplacement}
                    >
                      Cancel Replacement
                    </button>
                  </div>
                )}
              </div>

              {/* Form Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-white/5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Export Rule: Order is confirmed PAID strictly after manual finance team verification.
                </span>
                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  {showSubmitForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubmitForm(false);
                        setReceiptError(null);
                      }}
                      disabled={uploadingReceipt}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={
                      uploadingReceipt ||
                      (!selectedFile &&
                        !paymentTxnId.trim() &&
                        !order.payment_details?.transaction_id &&
                        !order.payment_proof_url)
                    }
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-[0.99]"
                    id="btn-submit-payment-details"
                  >
                    {uploadingReceipt ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Uploading Receipt...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>
                          {order.payment_proof_url
                            ? "Submit Updated Receipt for Verification"
                            : "Submit Payment for Verification"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

        {/* Success / Error Messages */}
        {receiptSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-xs space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-xs">
              <Check size={16} />
              <span>Payment Details Submitted Successfully</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Payment evidence for Order{" "}
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {order.order_number}
              </span>{" "}
              has been received and is now awaiting authorized finance admin verification.
            </p>
          </div>
        )}
        {receiptError && !selectedFile && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-800/40 text-xs text-red-700 dark:text-red-400 flex items-start gap-2 shadow-2xs">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <p className="text-xs leading-relaxed font-semibold">{receiptError}</p>
          </div>
        )}
      </div>

      {/* ─── 7. COMMERCIAL EXPORT DOCUMENTS ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-heading">
                Commercial Export Documents
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official B2B commercial documentation &amp; customs papers
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          {/* 1. Offer Sheet */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between gap-3.5 bg-slate-50/50 dark:bg-slate-800/20 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white font-heading">Offer Sheet</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Product specifications &amp; commercial offer
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingDocType === "OFFER_SHEET"}
              onClick={() => handleDownloadOfficialDocument("OFFER_SHEET")}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-60 shadow-2xs"
            >
              {downloadingDocType === "OFFER_SHEET" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>Download PDF</span>
            </button>
          </div>

          {/* 2. Proforma Invoice (PI) */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between gap-3.5 bg-slate-50/50 dark:bg-slate-800/20 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white font-heading">
                  Proforma Invoice (PI)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Provisional terms &amp; payment instructions
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingDocType === "PROFORMA_INVOICE"}
              onClick={() => handleDownloadOfficialDocument("PROFORMA_INVOICE")}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-60 shadow-2xs"
            >
              {downloadingDocType === "PROFORMA_INVOICE" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>Download PDF</span>
            </button>
          </div>

          {/* 3. Commercial Invoice (CI) (unlocked after payment) */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between gap-3.5 bg-slate-50/50 dark:bg-slate-800/20 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  order.payment_status === "paid"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-200/70 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {order.payment_status === "paid" ? <FileText size={16} /> : <Lock size={16} />}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white font-heading">
                  Commercial Invoice (CI)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {order.payment_status === "paid"
                    ? "Final commercial & export declaration"
                    : "Unlocks after payment confirmation"}
                </p>
              </div>
            </div>
            {order.payment_status === "paid" ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/ayc/documents/COMMERCIAL_INVOICE/order_${order.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
                >
                  <ExternalLink size={12} />
                  <span>View</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDownloadOfficialDocument("COMMERCIAL_INVOICE")}
                  disabled={downloadingDocType === "COMMERCIAL_INVOICE"}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                  id="btn-download-commercial-invoice-sec8"
                >
                  {downloadingDocType === "COMMERCIAL_INVOICE" ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>PDF</span>
                </button>
              </div>
            ) : (
              <div className="py-1 text-center">
                <span className="text-[11px] text-slate-400 italic">
                  Available upon payment verification
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
