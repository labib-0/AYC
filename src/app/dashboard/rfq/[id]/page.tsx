"use client";

import React, { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getRfqById, addRfqMessage } from "@/lib/services/rfq";
import { getQuotationByRfqId } from "@/lib/services/quotations";
import { RfqRecord, QuotationRecord, RfqStatus, RfqMessage } from "@/types/b2b";
import { getWhatsAppUrl } from "@/config/business-profile";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  MapPin,
  Calendar,
  Send,
  Package,
  ShieldAlert,
  MessageSquare,
  DollarSign,
  User,
  Info,
  ChevronRight,
  ExternalLink,
  MessageCircle,
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

function getStatusBadge(status: RfqStatus) {
  switch (status) {
    case "SUBMITTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50">
          <Clock size={12} />
          <span>SUBMITTED</span>
        </span>
      );
    case "UNDER_REVIEW":
    case "NEED_INFORMATION":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
          <AlertCircle size={12} />
          <span>UNDER REVIEW</span>
        </span>
      );
    case "QUOTATION_PREPARED":
    case "SENT_TO_BUYER":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50">
          <CheckCircle2 size={12} />
          <span>QUOTATION PREPARED</span>
        </span>
      );
    case "NEGOTIATION":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50">
          <MessageSquare size={12} />
          <span>IN NEGOTIATION</span>
        </span>
      );
    case "ACCEPTED":
    case "CONVERTED_TO_ORDER":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
          <CheckCircle2 size={12} />
          <span>ACCEPTED</span>
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50">
          <XCircle size={12} />
          <span>REJECTED</span>
        </span>
      );
    case "CANCELLED":
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10">
          <XCircle size={12} />
          <span>CLOSED</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
          {status}
        </span>
      );
  }
}

export default function CustomerRfqDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const rfqId = resolvedParams.id;
  const { user } = useAuth();

  const [rfq, setRfq] = useState<RfqRecord | null>(null);
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Message composer state
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [messageSentSuccess, setMessageSentSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchRfqData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      const data = await getRfqById(rfqId);

      if (!data) {
        setRfq(null);
        setLoading(false);
        return;
      }

      // Customer Ownership Validation
      const isOwner =
        (data.userId && String(data.userId) === String(user.id)) ||
        (data.buyerEmail && user.email && data.buyerEmail.toLowerCase() === user.email.toLowerCase());

      if (!isOwner) {
        setUnauthorized(true);
        setRfq(null);
        setLoading(false);
        return;
      }

      setRfq(data);

      // Check linked quotation
      const quoteData = await getQuotationByRfqId(data.id);
      setQuotation(quoteData);
    } catch (err: any) {
      console.error("Failed to load RFQ:", err);
      setError("Unable to load RFQ details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqData();
  }, [rfqId, user]);

  // Handle message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfq || !user || isSending) return;

    const trimmed = newMessage.trim();
    if (!trimmed) {
      setComposerError("Message cannot be empty.");
      return;
    }

    setIsSending(true);
    setComposerError(null);

    try {
      const result = await addRfqMessage(
        rfq.id,
        "buyer",
        user.name || "Buyer",
        trimmed
      );

      if (result) {
        setNewMessage("");
        setMessageSentSuccess(true);
        setTimeout(() => setMessageSentSuccess(false), 2500);

        // Refresh rfq to get updated message history
        const updated = await getRfqById(rfq.id);
        if (updated) {
          setRfq(updated);
        }

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        setComposerError("Failed to send message. Please try again.");
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setComposerError(err.message || "Failed to submit message.");
    } finally {
      setIsSending(false);
    }
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
          RFQ Access Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          This Request for Quote belongs to another company or buyer account. Customer inquiries are strictly isolated to protect proprietary commercial pricing and tech pack designs.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard/rfq"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Return to Your RFQs</span>
          </Link>
        </div>
      </div>
    );
  }

  // State: Not Found
  if (!rfq) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <FileText size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          RFQ Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
          The requested RFQ inquiry <span className="font-mono font-semibold">{rfqId}</span> could not be located.
        </p>
        <Link
          href="/dashboard/rfq"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to RFQ List</span>
        </Link>
      </div>
    );
  }

  const dateStr = rfq.createdAt
    ? new Date(rfq.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recent";

  // Filter public messages only (never expose admin internal notes)
  const publicMessages = (rfq.messages || []).filter(
    (m) => m.senderRole === "buyer" || m.senderRole === "admin" || m.senderRole === "sales"
  );

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 1. RFQ HEADER ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/dashboard/rfq"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to All RFQs</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {rfq.rfqNumber || `RFQ #${rfq.id.toString().slice(-8)}`}
              </h1>
              {getStatusBadge(rfq.status)}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              Submitted on {dateStr} • Contact: {rfq.buyerName} ({rfq.companyName})
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <a
              href={getWhatsAppUrl(
                `Inquiring regarding RFQ ${rfq.rfqNumber || rfq.id} for ${rfq.companyName}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle size={14} />
              <span>Direct WhatsApp</span>
            </a>

            {quotation && (
              <Link
                href={`/dashboard/quotes/${quotation.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs"
              >
                <span>View Quotation ({formatUSD(quotation.grandTotal)})</span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. REQUEST INFORMATION ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <Building2 size={16} className="text-amber-600 dark:text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Commercial Buyer & Company Profile
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Buyer Name:</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
              {rfq.buyerName}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Company Name:</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
              {rfq.companyName}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Email Address:</span>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
              {rfq.buyerEmail}
            </p>
          </div>

          {rfq.buyerPhone && (
            <div>
              <span className="text-slate-400 font-medium">Contact Phone:</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                {rfq.buyerPhone}
              </p>
            </div>
          )}

          {rfq.businessType && (
            <div>
              <span className="text-slate-400 font-medium">Business Structure:</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 capitalize">
                {rfq.businessType}
              </p>
            </div>
          )}

          {rfq.taxNumber && (
            <div>
              <span className="text-slate-400 font-medium">VAT / Tax ID:</span>
              <p className="font-mono text-slate-900 dark:text-white mt-0.5">
                {rfq.taxNumber}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. PRODUCTS / QUANTITIES ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Requested Styles & Target Specifications ({rfq.items?.length || 0})
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Total Units:{" "}
            {rfq.items?.reduce((s, it) => s + (it.quantity || 0), 0)?.toLocaleString() || 0} pcs
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {rfq.items && rfq.items.length > 0 ? (
            rfq.items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-16 aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0 p-1 flex items-center justify-center">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                        <Package size={24} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {item.productName}
                    </h3>
                    {item.brand && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        {item.brand}
                      </p>
                    )}
                    {item.sku && (
                      <p className="text-[0.6875rem] font-mono text-slate-400">
                        SKU: {item.sku}
                      </p>
                    )}

                    {/* Specs / Notes */}
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[0.6875rem] text-slate-500">
                      {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                      {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                      {item.assortedSizesNotes && (
                        <span className="italic">Sizes: {item.assortedSizesNotes}</span>
                      )}
                      {item.assortedColorsNotes && (
                        <span className="italic">Colors: {item.assortedColorsNotes}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-right shrink-0">
                  <div className="text-xs text-slate-500">
                    <span>Requested Quantity:</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {item.quantity?.toLocaleString() || 0} pcs
                  </div>
                  {item.targetPrice ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Target: <span className="font-bold text-emerald-600">{formatUSD(item.targetPrice)}</span>/pc
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-4">No product styles specified in this RFQ.</p>
          )}
        </div>
      </div>

      {/* ─── 4. SHIPPING REQUIREMENTS ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <MapPin size={16} className="text-amber-600 dark:text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Logistics & Freight Destination
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Destination Country & City:</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
              {rfq.destinationCity ? `${rfq.destinationCity}, ` : ""}{rfq.destinationCountry}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Preferred Sea / Air Port:</span>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
              {rfq.shippingPort || "Standard Port of Destination"}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Target Delivery Date:</span>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
              {rfq.targetDeliveryDate || "Flexible / Ready for Production"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 5. BUYER NOTES ─────────────────────────────────────────────────── */}
      {rfq.generalNotes && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-white/5">
            <Info size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Buyer Notes & Custom Specifications
            </h2>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-white/5">
            {rfq.generalNotes}
          </p>
        </div>
      )}

      {/* ─── 6. MESSAGE THREAD & COMPOSER ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Commercial Communication & Message Thread
            </h2>
          </div>
          <span className="text-[0.6875rem] text-slate-400">
            {publicMessages.length} message{publicMessages.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Message Thread History */}
        <div className="space-y-3 mb-5 max-h-[360px] overflow-y-auto pr-1">
          {publicMessages.length > 0 ? (
            publicMessages.map((msg) => {
              const isBuyer = msg.senderRole === "buyer";
              const timeStr = msg.createdAt
                ? new Date(msg.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBuyer ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 text-[0.625rem] text-slate-400 mb-1 px-1">
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      {isBuyer ? (msg.senderName || "You (Buyer)") : (msg.senderName || "Ayaan Sales Team")}
                    </span>
                    <span>•</span>
                    <span>{timeStr}</span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isBuyer
                        ? "bg-amber-500 text-slate-950 font-medium rounded-tr-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-xs border border-slate-200 dark:border-white/10"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.message}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/20 rounded-xl">
              No communication messages yet. You can post inquiries, requested amendments, or questions below.
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Customer Message Composer */}
        <form onSubmit={handleSendMessage} className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Reply to Factory Merchandising Team:
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                if (composerError) setComposerError(null);
              }}
              placeholder="Type your message, spec adjustments, delivery requirements, or questions..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all resize-none"
            />
          </div>

          {composerError && (
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
              {composerError}
            </p>
          )}

          {messageSentSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} /> Message delivered to sales representative.
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[0.625rem] text-slate-400">
              Commercial communications are logged for contract verification.
            </span>

            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {isSending ? (
                <span>Sending...</span>
              ) : (
                <>
                  <Send size={13} />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── 7. QUOTATION ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Formal Commercial Quotation
            </h2>
          </div>
          {quotation && (
            <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              {quotation.status}
            </span>
          )}
        </div>

        {quotation ? (
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Quotation #{quotation.quotationNumber} (Rev {quotation.revisionNumber || 1})
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                <span>Grand Total: <strong className="text-purple-700 dark:text-purple-300">{formatUSD(quotation.grandTotal)}</strong></span>
                <span>•</span>
                <span>Incoterm: {quotation.incoterm || "FOB Dhaka"}</span>
                <span>•</span>
                <span>Valid until: {quotation.validUntil}</span>
              </div>
            </div>

            <Link
              href={`/dashboard/quotes/${quotation.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-center"
            >
              <span>Inspect Quotation</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/20 rounded-xl">
            <Clock size={22} className="mx-auto text-slate-400 mb-1.5" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Quotation Under Preparation
            </p>
            <p className="mt-0.5 max-w-sm mx-auto">
              Our factory export department is preparing FOB costs, material lead times, and freight estimates. You will receive an official quotation here shortly.
            </p>
          </div>
        )}
      </div>

      {/* ─── 8. TIMELINE ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <Calendar size={16} className="text-amber-600 dark:text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Inquiry History & Milestone Timeline
          </h2>
        </div>

        {rfq.history && rfq.history.length > 0 ? (
          <div className="space-y-3">
            {rfq.history.map((hist) => {
              const timeStr = hist.createdAt
                ? new Date(hist.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={hist.id}
                  className="flex items-start justify-between gap-3 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Status changed to <span className="text-amber-600 dark:text-amber-400 uppercase font-mono">{hist.status}</span> by {hist.actorName}
                    </p>
                    {hist.note && (
                      <p className="text-slate-500 dark:text-slate-400 text-[0.6875rem]">
                        {hist.note}
                      </p>
                    )}
                  </div>

                  <span className="text-[0.625rem] text-slate-400 shrink-0">
                    {timeStr}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-2">No milestone events recorded yet.</p>
        )}
      </div>
    </div>
  );
}
