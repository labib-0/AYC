"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRfqById, addRfqMessage, updateRfqStatus } from "@/lib/services/rfq";
import { createQuotation, getQuotationByRfqId } from "@/lib/services/quotations";
import { RfqRecord, QuotationRecord, RfqStatus, QuotationItem } from "@/types/b2b";
import {
  RfqHeader,
  RfqBuyerCard,
  RfqShippingCard,
  RfqItemsTable,
  RfqStatusDialog,
  RfqMessageThread,
  RfqMessageComposer,
  RfqQuotationBuilder,
  RfqTimeline,
} from "@/components/admin/rfq";
import { MessageSquare, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

export default function AdminRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();

  const [rfq, setRfq] = useState<RfqRecord | null>(null);
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog & Modal States
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [quotationSaving, setQuotationSaving] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const isUnderAdmin = pathname.startsWith("/admin");
  const backHref = isUnderAdmin ? "/admin/rfq" : "/rfq";
  const customerBaseUrl = isUnderAdmin ? "/admin/customers" : "/customers";
  const documentBaseUrl = isUnderAdmin ? "/admin/documents" : "/documents";

  // Data Loading
  const loadRfqDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRfqById(id);
      setRfq(data);
      if (data) {
        const q = await getQuotationByRfqId(data.id);
        setQuotation(q);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load RFQ.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRfqDetail();
  }, [loadRfqDetail]);

  // Handler: Status Update
  const handleUpdateStatus = async (newStatus: RfqStatus, note?: string) => {
    if (!rfq) return;
    setStatusUpdating(true);
    try {
      const updated = await updateRfqStatus(
        rfq.id,
        newStatus,
        "Ayaan Export Admin",
        note
      );
      if (updated) {
        setRfq(updated);
        showToast(`RFQ status updated to ${newStatus.replace(/_/g, " ")}`);
      }
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Unable to update RFQ status.", "error");
      throw err;
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handler: Send Message
  const handleSendMessage = async (text: string) => {
    if (!rfq) return;
    setMessageSending(true);
    try {
      const msg = await addRfqMessage(
        rfq.id,
        "admin",
        "Ayaan Export Sales",
        text
      );
      if (msg) {
        // Re-read RFQ to get updated messages array
        const updated = await getRfqById(rfq.id);
        if (updated) {
          setRfq(updated);
        }
        showToast("Message sent successfully.");
      }
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Unable to send message.", "error");
      throw err;
    } finally {
      setMessageSending(false);
    }
  };

  // Handler: Create Quotation
  const handleCreateQuotation = async (formData: {
    items: QuotationItem[];
    subtotal: number;
    discountTotal: number;
    shippingFee: number;
    taxAmount: number;
    grandTotal: number;
    paymentTerms: string;
    shippingTerms: string;
    incoterm: "FOB" | "CIF" | "EXW" | "DDP" | "CFR";
    deliveryEstimate: string;
    validUntil: string;
    adminNotes: string;
  }) => {
    if (!rfq) return;
    setQuotationSaving(true);
    try {
      const newQuote = await createQuotation({
        rfqId: rfq.id,
        rfqNumber: rfq.rfqNumber,
        userId: rfq.userId,
        buyerName: rfq.buyerName,
        buyerEmail: rfq.buyerEmail,
        buyerPhone: rfq.buyerPhone,
        companyName: rfq.companyName,
        destinationCountry: rfq.destinationCountry,
        destinationCity: rfq.destinationCity,
        currency: "USD",
        currencySymbol: "$",
        ...formData,
      });

      setQuotation(newQuote);

      // Refresh RFQ state to reflect updated status and quotationId
      const refreshedRfq = await getRfqById(rfq.id);
      if (refreshedRfq) {
        setRfq(refreshedRfq);
      }

      showToast(`Quotation ${newQuote.quotationNumber} issued successfully.`);
    } catch (err: unknown) {
      showToast((err as Error)?.message || "Unable to generate quotation.", "error");
      throw err;
    } finally {
      setQuotationSaving(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <AdminPageGate permission="rfq.view">
        <div className="space-y-6">
          <div className="h-6 w-36 bg-secondary animate-pulse rounded" />
          <div className="h-10 w-64 bg-secondary animate-pulse rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-card border border-border/70 rounded-3xl animate-pulse" />
              <div className="h-48 bg-card border border-border/70 rounded-3xl animate-pulse" />
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-card border border-border/70 rounded-3xl animate-pulse" />
              <div className="h-48 bg-card border border-border/70 rounded-3xl animate-pulse" />
            </div>
          </div>
        </div>
      </AdminPageGate>
    );
  }

  // 2. Not Found State
  if (!rfq || error) {
    return (
      <AdminPageGate permission="rfq.view">
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-secondary text-muted-foreground flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">RFQ Not Found</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              The requested wholesale inquiry reference &ldquo;{id}&rdquo; could not be found or has been removed.
            </p>
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <ArrowLeft size={14} />
            <span>Back to All Inquiries</span>
          </Link>
        </div>
      </AdminPageGate>
    );
  }

  return (
    <AdminPageGate permission="rfq.view">
      <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in slide-in-from-bottom duration-200 ${
            toastMessage.type === "success"
              ? "bg-card border-primary/40 text-foreground"
              : "bg-destructive text-destructive-foreground border-destructive"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={16} className="text-primary" />
          ) : (
            <AlertTriangle size={16} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Detail Header */}
      <RfqHeader
        rfq={rfq}
        quotation={quotation}
        backHref={backHref}
        onOpenStatusDialog={() => setIsStatusDialogOpen(true)}
        onOpenQuotationBuilder={() => setIsQuoteModalOpen(true)}
        onRefresh={loadRfqDetail}
        isLoading={loading || statusUpdating}
        documentBaseUrl={documentBaseUrl}
      />

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Items, Messaging, Audit Timeline) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Requested Items Table */}
          <RfqItemsTable items={rfq.items || []} />

          {/* Export Messaging Card */}
          <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare size={15} className="text-primary" />
                <span>Export Communication Thread ({rfq.messages?.length || 0})</span>
              </h2>
            </div>

            {/* Conversation Messages */}
            <RfqMessageThread
              messages={rfq.messages || []}
              buyerName={rfq.buyerName}
            />

            {/* Message Composer */}
            <RfqMessageComposer
              onSendMessage={handleSendMessage}
              isLoading={messageSending}
            />
          </div>

          {/* Activity Audit Timeline */}
          <RfqTimeline events={rfq.history || []} />
        </div>

        {/* Right Column (Buyer Profile & Shipping Logistics) */}
        <div className="space-y-6">
          {/* Buyer Profile */}
          <RfqBuyerCard rfq={rfq} customerBaseUrl={customerBaseUrl} />

          {/* Shipping & Destination Logistics */}
          <RfqShippingCard rfq={rfq} />
        </div>
      </div>

      {/* Status Update Custom Modal Dialog */}
      <RfqStatusDialog
        isOpen={isStatusDialogOpen}
        currentStatus={rfq.status}
        rfqNumber={rfq.rfqNumber}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={handleUpdateStatus}
        isLoading={statusUpdating}
      />

      {/* Quotation Builder Modal */}
      <RfqQuotationBuilder
        isOpen={isQuoteModalOpen}
        rfq={rfq}
        onClose={() => setIsQuoteModalOpen(false)}
        onSubmit={handleCreateQuotation}
        isLoading={quotationSaving}
      />
    </div>
    </AdminPageGate>
  );
}
