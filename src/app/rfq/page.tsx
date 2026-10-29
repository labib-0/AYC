"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRfq } from "@/lib/RfqContext";
import { useAuth } from "@/lib/AuthContext";
import { createRfq } from "@/lib/services/rfq";
import { securityService } from "@/services/security.service";
import HoneypotField from "@/components/common/HoneypotField";
import { 
  FileText, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Globe2, 
  Package, 
  Sparkles,
  MessageCircle,
  Plus,
  X
} from "lucide-react";
import BUSINESS_PROFILE, { getWhatsAppUrl } from "@/config/business-profile";

const COUNTRIES = [
  "United Arab Emirates",
  "Saudi Arabia",
  "United Kingdom",
  "United States",
  "Germany",
  "France",
  "Canada",
  "Australia",
  "Qatar",
  "Kuwait",
  "Bangladesh",
  "Italy",
  "Spain",
  "Netherlands",
];

export default function RfqPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { rfqItems, addToRfq, removeFromRfq, updateRfqItemQuantity, clearRfq } = useRfq();

  // Authentication Guard: Customers only must log in to submit or view the RFQ form
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "customer")) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ayaan_intended_destination", "/rfq");
        sessionStorage.setItem("ayaan_login_notice", "Please log in with a customer account to submit an RFQ.");
      }
      router.push(`/login?returnUrl=${encodeURIComponent("/rfq")}&notice=${encodeURIComponent("Please log in with a customer account to submit an RFQ.")}`);
    }
  }, [user, authLoading, router]);

  // Form State
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("Wholesale Distributor");
  const [website] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("United States");
  const [destinationCity, setDestinationCity] = useState("");
  const [shippingPort, setShippingPort] = useState("");
  const [targetDeliveryDate, setTargetDeliveryDate] = useState("");
  const [requestTitle, setRequestTitle] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [formToken, setFormToken] = useState<string | null>(null);

  useEffect(() => {
    securityService.getFormToken("rfq-create").then(setFormToken);
  }, []);

  // Custom Item Specification State
  const [customItemName, setCustomItemName] = useState("");
  const [customItemQty, setCustomItemQty] = useState<number>(100);
  const [customItemTargetPrice, setCustomItemTargetPrice] = useState<string>("");
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  // Automatically prefill customer profile when signed in
  useEffect(() => {
    if (user) {
      if (user.name && !buyerName) setBuyerName(user.name);
      if (user.email && !buyerEmail) setBuyerEmail(user.email);
      if (user.phone && !buyerPhone) setBuyerPhone(user.phone);
      if (user.company_name && !companyName) setCompanyName(user.company_name);
      if (user.tax_id && !taxNumber) setTaxNumber(user.tax_id);
    }
  }, [user]);

  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRfqNumber, setSubmittedRfqNumber] = useState<string | null>(null);
  const [submittedRfqId, setSubmittedRfqId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAddCustomProduct = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customItemName.trim()) return;

    addToRfq(
      {
        id: `custom_${Date.now()}`,
        name: customItemName.trim(),
        slug: "custom-garment-order",
        brand: "Custom OEM/ODM",
        sku: `OEM-${Date.now().toString(36).toUpperCase()}`,
        moq: 50,
        wholesalePrice: customItemTargetPrice ? parseFloat(customItemTargetPrice) : 0,
      } as any,
      Math.max(50, customItemQty || 100),
      {
        targetPrice: customItemTargetPrice ? parseFloat(customItemTargetPrice) : undefined,
        buyerNotes: "Custom buyer apparel manufacturing specification",
      }
    );

    setCustomItemName("");
    setCustomItemQty(100);
    setCustomItemTargetPrice("");
    setShowCustomModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Synchronous submission lock to prevent duplicate RFQ creation
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }
    isSubmittingRef.current = true;

    if (!user) {
      isSubmittingRef.current = false;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ayaan_intended_destination", "/rfq");
        sessionStorage.setItem("ayaan_login_notice", "Please log in to submit an RFQ.");
      }
      router.push(`/login?returnUrl=${encodeURIComponent("/rfq")}&notice=${encodeURIComponent("Please log in to submit an RFQ.")}`);
      return;
    }

    let finalItems = [...rfqItems];
    if (finalItems.length === 0) {
      if (customItemName.trim()) {
        finalItems = [
          {
            id: `item_custom_${Date.now()}`,
            productId: "",
            productName: customItemName.trim(),
            productSlug: "custom-garment-order",
            brand: "Custom OEM/ODM",
            sku: `OEM-${Date.now().toString(36).toUpperCase()}`,
            image: "/placeholder.jpg",
            quantity: Math.max(50, customItemQty || 100),
            moq: 50,
            unitPrice: customItemTargetPrice ? parseFloat(customItemTargetPrice) : 0,
            targetPrice: customItemTargetPrice ? parseFloat(customItemTargetPrice) : undefined,
            buyerNotes: generalNotes.trim() || undefined,
          },
        ];
      } else {
        setErrorMsg("Please add at least one product or specify your custom garment requirement.");
        isSubmittingRef.current = false;
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
    }

    // Required field validation
    if (!buyerName.trim() || !buyerEmail.trim() || !companyName.trim() || !destinationCity.trim()) {
      setErrorMsg("Please fill in all required fields (Name, Email, Company, Destination City).");
      isSubmittingRef.current = false;
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail.trim())) {
      setErrorMsg("Please enter a valid work email address.");
      isSubmittingRef.current = false;
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // Item quantity constraint validation
    const invalidQtyItem = finalItems.find((item) => !item.quantity || item.quantity <= 0);
    if (invalidQtyItem) {
      setErrorMsg("All quotation line items must specify a valid quantity greater than zero.");
      isSubmittingRef.current = false;
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createRfq({
        userId: String(user.id),
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        buyerPhone: buyerPhone.trim(),
        companyName: companyName.trim(),
        businessType,
        website,
        taxNumber: taxNumber.trim(),
        destinationCountry,
        destinationCity: destinationCity.trim(),
        shippingPort: shippingPort.trim(),
        targetDeliveryDate,
        requestTitle: requestTitle.trim() || `${finalItems.reduce((acc, i) => acc + i.quantity, 0)} Pcs Apparel for ${destinationCity.trim()}`,
        generalNotes: generalNotes.trim(),
        items: finalItems,
        formToken: formToken || undefined,
        website_url_hp: honeypot,
      } as any);

      setSubmittedRfqNumber(created.rfqNumber);
      setSubmittedRfqId(created.id);
      clearRfq();
      setCustomItemName("");
    } catch (err: any) {
      if (err?.status === 401 || err?.isAuthError) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ayaan_intended_destination", "/rfq");
          sessionStorage.setItem("ayaan_login_notice", "Please log in to submit an RFQ.");
        }
        router.push(`/login?returnUrl=${encodeURIComponent("/rfq")}&notice=${encodeURIComponent("Please log in to submit an RFQ.")}`);
        return;
      }
      // Preserve form values on failure, display clear actionable message
      const rawError = err?.message || "Failed to submit quotation request. Please verify your details and try again.";
      const displayError = rawError.includes("Automated form submission detected")
        ? "Your quotation request could not be verified. Please ensure browser autofill is not modifying security fields, or refresh the page and try again."
        : rawError;
      setErrorMsg(displayError);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Unauthenticated or Loading State
  if (authLoading || !user) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">
            Verifying Customer Account...
          </p>
        </div>
      </div>
    );
  }

  // Success Confirmation Screen
  if (submittedRfqNumber) {
    return (
      <div className="w-full min-h-[70vh] py-16 px-4 flex items-center justify-center bg-background">
        <div className="max-w-xl w-full bg-card border border-border/80 rounded-3xl p-8 sm:p-12 text-center shadow-xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={36} />
          </div>
          <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
            Commercial Inquiry Received
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground mt-3 mb-2">
            Quote Request Submitted
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your wholesale inquiry has been registered in our export sales system. Reference Number:
          </p>

          <div className="bg-secondary/60 border border-border/60 rounded-2xl p-4 mb-8 font-sans">
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block mb-1">
              Official Reference
            </span>
            <span className="text-2xl font-sans font-bold tabular-nums tracking-wider text-foreground">
              {submittedRfqNumber}
            </span>
          </div>

          <p className="text-xs font-sans text-muted-foreground leading-relaxed mb-8">
            Our international sales desk is reviewing your order specifications, MOQ compliance, and destination freight requirements. An official commercial quotation will be issued to your account.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-sans">
            <a
              href={getWhatsAppUrl(`Hello ${BUSINESS_PROFILE.name},\n\nI have submitted RFQ #${submittedRfqNumber}.\nPlease review our request.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 border border-[#25D366]/30 font-semibold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} />
              <span>Connect on WhatsApp</span>
            </a>
            <Link
              href={`/dashboard/quotes/${submittedRfqId}`}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-foreground text-background font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Track Request Status
            </Link>
            <Link
              href="/search"
              className="w-full sm:w-auto px-6 py-3 rounded-full border border-border text-foreground font-semibold text-xs uppercase tracking-wider hover:bg-secondary transition-colors"
            >
              Browse Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        
        {/* Page Header */}
        <div className="pb-6 border-b border-border/70 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={22} className="text-primary" />
              <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
                Request For Quotation (RFQ)
              </h1>
            </div>
            <p className="text-xs sm:text-sm font-sans text-muted-foreground mt-1">
              Direct commercial quote for bulk apparel export, custom manufacturing, and wholesale distribution.
            </p>
          </div>

          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-foreground hover:underline uppercase tracking-wider"
          >
            <span>My Quote Requests</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {errorMsg && (
          <div data-testid="rfq-error-banner" className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-sans font-medium flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
          <HoneypotField value={honeypot} onChange={setHoneypot} />
          
          {/* LEFT COLUMN: MULTI-PRODUCT LINE ITEMS (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-foreground" />
                  <h2 className="text-sm font-display font-semibold uppercase tracking-wider text-foreground">
                    Selected Products ({rfqItems.length})
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    id="btn-add-custom-garment"
                  >
                    <Plus size={13} />
                    <span>Add Custom Garment</span>
                  </button>
                  {rfqItems.length > 0 && (
                    <button
                      type="button"
                      onClick={clearRfq}
                      className="text-xs font-bold text-destructive hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {rfqItems.length > 0 ? (
                <div className="space-y-4">
                  {rfqItems.map((item) => {
                    const isBelowMoq = item.quantity < item.moq;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-border/70 bg-secondary/25 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                      >
                        {/* Thumbnail & Name */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="w-16 aspect-[3/4] object-contain rounded-lg bg-secondary/40 shrink-0 border border-border/50 p-1"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                              {item.brand} • SKU: {item.sku}
                            </span>
                            <h3 className="text-sm font-bold text-foreground truncate max-w-[220px] sm:max-w-xs">
                              {item.productName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>MOQ: <strong className="text-foreground">{item.moq} pcs</strong></span>
                            </div>
                            <span className="text-xs text-muted-foreground block mt-0.5">
                              Wholesale Est: ${item.unitPrice?.toFixed(2)}/pc · {item.quantity.toLocaleString()} pcs total
                            </span>
                          </div>
                        </div>

                        {/* Quantity & Actions */}
                        <div className="flex sm:flex-col items-end gap-2 self-stretch sm:self-auto justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-muted-foreground">Qty (PCS):</label>
                            <div className="flex items-center border border-border rounded-lg h-7 bg-card">
                              <button
                                type="button"
                                className="w-7 h-full flex items-center justify-center hover:bg-secondary rounded-l-lg transition-colors font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                onClick={() => updateRfqItemQuantity(item.id, Math.max(item.moq, item.quantity - item.moq))}
                                disabled={item.quantity <= item.moq}
                                aria-label="Decrease quantity"
                              >−</button>
                              <span className="px-2 text-center text-xs font-bold tabular-nums">
                                {item.quantity.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                className="w-7 h-full flex items-center justify-center hover:bg-secondary rounded-r-lg transition-colors font-bold text-xs cursor-pointer"
                                onClick={() => updateRfqItemQuantity(item.id, item.quantity + item.moq)}
                                aria-label="Increase quantity"
                              >+</button>
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">pcs</span>
                          </div>

                          {isBelowMoq && (
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle size={11} />
                              Below MOQ ({item.moq})
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => removeFromRfq(item.id)}
                            className="text-xs text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                            title="Remove from RFQ"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl border border-dashed border-border/80 bg-secondary/15 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Custom Apparel or Bulk Manufacturing Requirement
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Do not have items from our online catalog? Enter your custom garment requirements, fabric composition, or private label specs below.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                      <div className="sm:col-span-7 space-y-1">
                        <label htmlFor="custom_item_name" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Garment / Apparel Description *
                        </label>
                        <input
                          type="text"
                          id="custom_item_name"
                          name="custom_item_name"
                          placeholder="e.g. 100% Combed Cotton T-Shirt, 240 GSM, Custom Wash"
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label htmlFor="custom_item_qty" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Target Qty (PCS)
                        </label>
                        <input
                          type="number"
                          id="custom_item_qty"
                          name="custom_item_qty"
                          min={50}
                          step={50}
                          value={customItemQty}
                          onChange={(e) => setCustomItemQty(Math.max(1, parseInt(e.target.value) || 100))}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label htmlFor="custom_item_price" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Target $/Pc
                        </label>
                        <input
                          type="number"
                          id="custom_item_price"
                          name="custom_item_price"
                          step={0.1}
                          placeholder="$3.50"
                          value={customItemTargetPrice}
                          onChange={(e) => setCustomItemTargetPrice(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        Minimum commercial production batch: 50 pcs
                      </span>
                      <button
                        type="button"
                        id="btn-add-custom-line-item"
                        onClick={handleAddCustomProduct}
                        disabled={!customItemName.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
                      >
                        <Plus size={13} />
                        <span>Add To Line Items</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-center py-4">
                    <span className="text-xs text-muted-foreground">
                      Prefer selecting existing styles?{" "}
                      <Link href="/search" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
                        <span>Browse Export Catalog</span>
                        <ArrowRight size={12} />
                      </Link>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* General Buyer Instructions & Notes */}
            <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Custom Specifications & Export Notes
              </h2>

              <div className="space-y-1.5">
                <label htmlFor="rfq_request_title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Request Title / Reference Name
                </label>
                <input
                  type="text"
                  id="rfq_request_title"
                  name="request_title"
                  placeholder="e.g. 500 Nike T-Shirts for Dubai Retail Chain"
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="rfq_general_notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Size Breakdown, Color Assortment & Custom Packaging Instructions
                </label>
                <textarea
                  rows={4}
                  id="rfq_general_notes"
                  name="general_notes"
                  placeholder="e.g. Please supply size breakdown: S: 100, M: 200, L: 200. Custom polybag packaging with barcode stickers required."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: BUYER & DESTINATION DETAILS (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <Building2 size={18} className="text-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Buyer & Company Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="rfq_buyer_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    id="rfq_buyer_name"
                    name="buyer_name"
                    autoComplete="name"
                    placeholder="e.g. Tariq Al-Mansoor"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="rfq_company_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Company / Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    id="rfq_company_name"
                    name="company_name"
                    autoComplete="organization"
                    placeholder="e.g. Gulf Apparel Trading LLC"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="rfq_buyer_email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    id="rfq_buyer_email"
                    name="buyer_email"
                    autoComplete="email"
                    placeholder="buyer@company.com"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="rfq_buyer_phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    id="rfq_buyer_phone"
                    name="buyer_phone"
                    autoComplete="tel"
                    placeholder="+971 50 123 4567"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="rfq_business_type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Business Type
                  </label>
                  <select
                    id="rfq_business_type"
                    name="business_type"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="Wholesale Distributor">Wholesale Distributor</option>
                    <option value="Retail Chain">Retail Chain</option>
                    <option value="Brand / Label Importer">Brand / Label Importer</option>
                    <option value="E-Commerce Seller">E-Commerce Seller</option>
                    <option value="Corporate Buying Agent">Corporate Buying Agent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="rfq_tax_number" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tax / VAT ID (Optional)
                  </label>
                  <input
                    type="text"
                    id="rfq_tax_number"
                    name="tax_number"
                    placeholder="e.g. TRN-10029381"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Destination & Logistics */}
            <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <Globe2 size={18} className="text-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Destination & Shipping Requirements
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label htmlFor="rfq_destination_country" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Destination Country *
                  </label>
                  <select
                    id="rfq_destination_country"
                    name="destination_country"
                    autoComplete="country-name"
                    value={destinationCountry}
                    onChange={(e) => setDestinationCountry(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="rfq_destination_city" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Destination City *
                  </label>
                  <input
                    type="text"
                    required
                    id="rfq_destination_city"
                    name="destination_city"
                    autoComplete="address-level2"
                    placeholder="e.g. Dubai"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="rfq_shipping_port" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Discharge Port / Airport
                  </label>
                  <input
                    type="text"
                    id="rfq_shipping_port"
                    name="shipping_port"
                    placeholder="e.g. Jebel Ali / DXB Air"
                    value={shippingPort}
                    onChange={(e) => setShippingPort(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="rfq_target_delivery_date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Target Delivery Date
                  </label>
                  <input
                    type="date"
                    id="rfq_target_delivery_date"
                    name="target_delivery_date"
                    value={targetDeliveryDate}
                    onChange={(e) => setTargetDeliveryDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-border/60">
                {errorMsg && (
                  <div data-testid="rfq-submit-error-banner" className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-sans font-medium flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <button
                  type="submit"
                  id="btn-submit-rfq"
                  disabled={isSubmitting || (rfqItems.length === 0 && !customItemName.trim())}
                  className="w-full py-3.5 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all duration-200 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2 font-display"
                >
                  <FileText size={16} />
                  <span>
                    {isSubmitting
                      ? "Submitting Inquiry..."
                      : rfqItems.length === 0 && customItemName.trim()
                      ? "Submit Custom Quotation Request"
                      : "Submit Quotation Request"}
                  </span>
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2.5">
                  Free non-binding B2B quote. Official commercial invoice prepared by {BUSINESS_PROFILE.name} exports.
                </p>
              </div>
            </div>

          </div>

        </form>

        {/* Custom Item Modal */}
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Add Custom Apparel Item
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-full cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label htmlFor="modal_custom_item_name" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Garment Name / Fabric Description *
                  </label>
                  <input
                    type="text"
                    required
                    id="modal_custom_item_name"
                    name="modal_custom_item_name"
                    placeholder="e.g. 100% Cotton Heavyweight Fleece Hoodie"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="modal_custom_item_qty" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Target Quantity (PCS)
                    </label>
                    <input
                      type="number"
                      id="modal_custom_item_qty"
                      name="modal_custom_item_qty"
                      min={50}
                      step={50}
                      value={customItemQty}
                      onChange={(e) => setCustomItemQty(Math.max(1, parseInt(e.target.value) || 100))}
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="modal_custom_item_price" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Target Price / Pc ($)
                    </label>
                    <input
                      type="number"
                      id="modal_custom_item_price"
                      name="modal_custom_item_price"
                      step={0.1}
                      placeholder="$8.50"
                      value={customItemTargetPrice}
                      onChange={(e) => setCustomItemTargetPrice(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomProduct}
                  disabled={!customItemName.trim()}
                  className="px-5 py-2 rounded-full bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
