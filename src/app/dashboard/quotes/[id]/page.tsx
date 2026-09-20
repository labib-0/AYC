"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { getRfqById, addRfqMessage } from "@/lib/services/rfq";
import { getQuotationByRfqId, buyerRespondToQuotation } from "@/lib/services/quotations";
import { RfqRecord, QuotationRecord } from "@/types/b2b";
import { 
  FileText, 
  ArrowLeft, 
  Package, 
  Globe2, 
  Clock, 
  CheckCircle2, 
  Send, 
  Building2, 
  Calendar, 
  DollarSign, 
  Printer, 
  ShieldCheck,
  AlertCircle,
  MessageSquare
} from "lucide-react";

export default function BuyerRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [rfq, setRfq] = useState<RfqRecord | null>(null);
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Negotiation / Reject Modal State
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  const refreshData = async () => {
    const rfqData = await getRfqById(id);
    setRfq(rfqData);
    if (rfqData) {
      const quoteData = await getQuotationByRfqId(rfqData.id);
      setQuotation(quoteData);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !rfq) return;

    setIsSending(true);
    await addRfqMessage(rfq.id, "buyer", rfq.buyerName, newMessage.trim());
    setNewMessage("");
    setIsSending(false);
    refreshData();
  };

  const handleAcceptQuote = async () => {
    if (!quotation) return;
    if (!confirm("Are you sure you want to accept this quotation and generate the official Proforma Invoice?")) return;

    const updated = await buyerRespondToQuotation(quotation.id, "accept");
    if (updated) {
      setActionSuccessMsg("Quotation accepted successfully! Your Proforma Invoice has been issued.");
      refreshData();
    }
  };

  const handleRequestChanges = async () => {
    if (!quotation || !revisionNotes.trim()) return;

    const updated = await buyerRespondToQuotation(quotation.id, "request_changes", revisionNotes.trim());
    if (updated) {
      setIsNegotiating(false);
      setRevisionNotes("");
      setActionSuccessMsg("Revision request submitted to Ayaan Clothing export sales desk.");
      refreshData();
    }
  };

  const handleRejectQuote = async () => {
    if (!quotation) return;
    const reason = prompt("Please enter the reason for rejection (optional):");
    if (reason === null) return;

    const updated = await buyerRespondToQuotation(quotation.id, "reject", reason);
    if (updated) {
      setActionSuccessMsg("Quotation marked as rejected.");
      refreshData();
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="w-full min-h-[60vh] py-20 text-center">
        <h2 className="text-xl font-bold uppercase">Quotation Request Not Found</h2>
        <Link href="/dashboard/quotes" className="text-primary hover:underline mt-2 inline-block text-xs font-bold uppercase">
          ← Back to My Quotes
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10 space-y-8">
        
        {/* Navigation & Header */}
        <div>
          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider mb-4"
          >
            <ArrowLeft size={13} />
            <span>Back to All Inquiries</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/70">
            <div>
              <div className="flex items-center gap-3 flex-wrap font-sans">
                <span className="font-sans font-bold tabular-nums text-xl sm:text-2xl text-foreground">
                  {rfq.rfqNumber}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {rfq.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-sans">
                {rfq.requestTitle || "Commercial Apparel Quote Request"} • Submitted on {new Date(rfq.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Print/Proforma Action */}
            {quotation?.proformaInvoiceId && (
              <Link
                href={`/admin/documents/PROFORMA_INVOICE/${quotation.id}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm self-start sm:self-auto"
              >
                <Printer size={14} />
                <span>View Proforma Invoice ({quotation.proformaInvoiceId})</span>
              </Link>
            )}
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* STATUS PROGRESS STEPPER */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Inquiry Progression
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider block">1. Submitted</span>
              <span className="text-xs font-bold">Request Received</span>
            </div>

            <div className={`p-3 rounded-xl border ${
              rfq.status !== "SUBMITTED" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                : "bg-secondary border-border text-muted-foreground"
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider block">2. Review</span>
              <span className="text-xs font-bold">{rfq.status === "SUBMITTED" ? "Pending Review" : "Sales Verified"}</span>
            </div>

            <div className={`p-3 rounded-xl border ${
              quotation 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                : "bg-secondary border-border text-muted-foreground"
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider block">3. Commercial Quote</span>
              <span className="text-xs font-bold">{quotation ? `${quotation.quotationNumber} Issued` : "In Preparation"}</span>
            </div>

            <div className={`p-3 rounded-xl border ${
              quotation?.status === "ACCEPTED" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                : "bg-secondary border-border text-muted-foreground"
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider block">4. Proforma Invoice</span>
              <span className="text-xs font-bold">{quotation?.status === "ACCEPTED" ? "PI Confirmed" : "Awaiting Acceptance"}</span>
            </div>
          </div>
        </div>

        {/* OFFICIAL QUOTATION REVIEW CARD (WHEN ISSUED BY SALES) */}
        {quotation && (
          <div className="bg-card border-2 border-primary/40 rounded-3xl p-6 sm:p-8 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full">
                    Official Commercial Offer
                  </span>
                  {quotation.revisionNumber > 1 && (
                    <span className="text-xs font-bold uppercase tracking-widest bg-secondary text-foreground px-2.5 py-0.5 rounded-full border border-border">
                      Revision {quotation.revisionNumber}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-foreground mt-2">
                  Commercial Quotation ({quotation.quotationNumber})
                </h2>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-muted-foreground block">Quotation Total:</span>
                <span className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  ${quotation.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} {quotation.currency}
                </span>
              </div>
            </div>

            {/* Commercial Terms & Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-secondary/40 border border-border/60 text-xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Price Terms</span>
                <span className="font-bold text-foreground">{quotation.incoterm || "FOB Chittagong"}</span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Payment Terms</span>
                <span className="font-bold text-foreground">{quotation.paymentTerms}</span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Delivery Lead Time</span>
                <span className="font-bold text-foreground">{quotation.deliveryEstimate || "14-21 days"}</span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Valid Until</span>
                <span className="font-bold text-foreground">{quotation.validUntil}</span>
              </div>
            </div>

            {/* Quotation Line Items */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-xs font-bold tracking-wider">
                    <th className="py-2.5">Item Description</th>
                    <th className="py-2.5">SKU</th>
                    <th className="py-2.5 text-right">Quantity</th>
                    <th className="py-2.5 text-right">Quoted Unit Price</th>
                    <th className="py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {quotation.items.map((item) => (
                    <tr key={item.id} className="font-medium text-foreground">
                      <td className="py-3 pr-2">
                        <span className="font-bold block">{item.productName}</span>
                        {item.variantTitle && (
                          <span className="text-xs text-muted-foreground">{item.variantTitle}</span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-muted-foreground">{item.sku}</td>
                      <td className="py-3 text-right font-bold">{item.quantity.toLocaleString()} pcs</td>
                      <td className="py-3 text-right font-bold text-primary">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-3 text-right font-bold">${item.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end pt-4 border-t border-border">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-bold text-foreground">${quotation.subtotal.toFixed(2)}</span>
                </div>
                {quotation.shippingFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Freight / Shipping:</span>
                    <span className="font-bold text-foreground">${quotation.shippingFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
                  <span>Grand Total:</span>
                  <span>${quotation.grandTotal.toFixed(2)} {quotation.currency}</span>
                </div>
              </div>
            </div>

            {/* Buyer Interactive Actions (When Quotation is READY / NEGOTIATION) */}
            {quotation.status !== "ACCEPTED" && quotation.status !== "REJECTED" && (
              <div className="pt-5 border-t border-border flex flex-wrap items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleRejectQuote}
                  className="px-5 py-2.5 rounded-full border border-destructive/40 text-destructive hover:bg-destructive/10 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Reject
                </button>

                <button
                  type="button"
                  onClick={() => setIsNegotiating(true)}
                  className="px-5 py-2.5 rounded-full border border-border text-foreground hover:bg-secondary font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Request Revision / Negotiate
                </button>

                <button
                  type="button"
                  onClick={handleAcceptQuote}
                  className="px-7 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-md active:scale-95 font-display flex items-center gap-2"
                >
                  <CheckCircle2 size={15} />
                  <span>Accept Quotation</span>
                </button>
              </div>
            )}

            {/* Negotiation Note Modal */}
            {isNegotiating && (
              <div className="p-4 rounded-2xl bg-secondary/70 border border-border space-y-3 animate-in fade-in">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  Specify Requested Price, Quantity or Terms Changes:
                </span>
                <textarea
                  rows={3}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="e.g. Can you offer $18.50/unit if we increase quantity to 400 pcs? Also prefer CIF Dubai terms."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNegotiating(false)}
                    className="px-4 py-1.5 rounded-full border border-border text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestChanges}
                    className="px-5 py-1.5 rounded-full bg-foreground text-background text-xs font-bold uppercase"
                  >
                    Submit Revision Request
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TWO COLUMN DETAILS: LINE ITEMS & THREADED MESSAGING */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Requested Line Items (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <Package size={18} className="text-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Originally Requested Line Items ({rfq.items.length})
                </h3>
              </div>

              <div className="space-y-3">
                {rfq.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-14 h-16 object-cover rounded-lg bg-secondary shrink-0 border border-border/40"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                          {item.brand} • {item.sku}
                        </span>
                        <h4 className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                          {item.productName}
                        </h4>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          Color: {item.selectedColor} • Size: {item.selectedSize}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-foreground block">
                        {item.quantity.toLocaleString()} pcs
                      </span>
                      <span className="text-xs text-muted-foreground">
                        MOQ: {item.moq} pcs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Destination & Buyer Notes */}
            <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3 text-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground pb-2 border-b border-border/60">
                Destination & Buyer Notes
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground block">Destination</span>
                  <span className="font-bold text-foreground">{rfq.destinationCity}, {rfq.destinationCountry}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground block">Target Delivery</span>
                  <span className="font-bold text-foreground">{rfq.targetDeliveryDate || "Flexible"}</span>
                </div>
              </div>
              {rfq.generalNotes && (
                <div className="pt-2 border-t border-border/40">
                  <span className="text-xs font-bold uppercase text-muted-foreground block">Instructions</span>
                  <p className="text-muted-foreground mt-0.5">{rfq.generalNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Threaded Clarification Messaging (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col h-[520px]">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60 mb-4">
                <MessageSquare size={18} className="text-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Clarification Messages
                </h3>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
                {rfq.messages && rfq.messages.length > 0 ? (
                  rfq.messages.map((msg) => {
                    const isBuyer = msg.senderRole === "buyer";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isBuyer ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <span className="font-bold text-foreground">{msg.senderName}</span>
                          <span>•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            isBuyer
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-secondary text-foreground rounded-bl-none border border-border/60"
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-12">
                    No clarification messages yet. You can post notes or questions here for the export sales team.
                  </p>
                )}
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-border flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message or inquiry..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-full border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className="p-2 rounded-full bg-foreground text-background disabled:opacity-40 transition-opacity cursor-pointer hover:opacity-90 shrink-0"
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
