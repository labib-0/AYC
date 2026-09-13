"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { createOrder, OrderRecord } from "@/lib/services/orders";
import { shippingService, ShippingQuoteOption, ShipmentSpecs } from "@/services/shipping.service";
import { getWhatsAppUrl } from "@/config/business-profile";
import { formatPrice } from "@/lib/formatters";
import {
  downloadProformaInvoicePDF,
  downloadCombinedProductOfferSheetsPDF,
} from "@/lib/pdf-generator";
import {
  X,
  Truck,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Plane,
  MessageCircle,
  Box,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ShippingMode = "aramex" | "manual";

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const [shippingName, setShippingName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [touched, setTouched] = useState({
    shippingName: false,
    email: false,
    phone: false,
    country: false,
  });
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);

  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  const [shippingMode, setShippingMode] = useState<ShippingMode>("aramex");
  const [aramexQuote, setAramexQuote] = useState<ShippingQuoteOption | null>(null);
  const [shipmentSpecs, setShipmentSpecs] = useState<ShipmentSpecs | null>(null);
  const [aramexLoading, setAramexLoading] = useState(false);
  const [aramexError, setAramexError] = useState<string | null>(null);

  const [isGeneratingOfferSheets, setIsGeneratingOfferSheets] = useState(false);
  const [offerSheetError, setOfferSheetError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isNameValid = shippingName.trim() !== "";
  const isEmailValid = email.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPhoneValid = phone.trim() !== "";
  const isCountryValid = country.trim() !== "";
  const isRequiredFormValid = isNameValid && isEmailValid && isPhoneValid && isCountryValid;

  useEffect(() => {
    if (!isOpen) {
      setConfirmedOrder(null);
      setError("");
      setTouched({ shippingName: false, email: false, phone: false, country: false });
      setIsSubmitAttempted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (user && isOpen) {
      if (!shippingName && user.name) setShippingName(user.name);
      if (!email && user.email) setEmail(user.email);
      if (!phone && user.phone) setPhone(user.phone);
    }
  }, [user, isOpen]);

  const fetchAramexQuote = useCallback(async () => {
    if (shippingMode !== "aramex") return;
    if (!country || items.length === 0) return;
    if (!city.trim() && !postalCode.trim()) return;

    setAramexLoading(true);
    setAramexError(null);

    try {
      const response = await shippingService.getShippingQuotes({
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
        country_code: country,
        city: city.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        address1: address.trim() || undefined,
        shipping_mode: "air",
      });

      if (response && response.quotes && response.quotes.length > 0) {
        setShipmentSpecs(response.shipment_specs);
        const airQuote = response.quotes.find((q) => q.mode === "air" && q.is_available);
        if (airQuote) {
          setAramexQuote(airQuote);
        } else {
          setAramexQuote(null);
          setAramexError("Unable to calculate Aramex shipping for this destination. Select 'Discuss Shipping Directly' or try again.");
        }
      } else {
        setAramexError("Unable to calculate Aramex shipping right now. Please try again or select 'Discuss Shipping Directly'.");
      }
    } catch (err: any) {
      setAramexError(err?.message || "Aramex shipping quote unavailable. Try again or select 'Discuss Shipping Directly'.");
      setAramexQuote(null);
    } finally {
      setAramexLoading(false);
    }
  }, [shippingMode, items, country, city, postalCode, address]);

  useEffect(() => {
    if (!isOpen) return;
    if (shippingMode !== "aramex") return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchAramexQuote();
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isOpen, shippingMode, country, city, postalCode, items, fetchAramexQuote]);

  if (!isOpen) return null;

  const aramexShippingCost = shippingMode === "aramex" && aramexQuote ? (aramexQuote.amount || 0) : 0;
  const total = subtotal + aramexShippingCost;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitAttempted(true);
    setError("");

    if (!isRequiredFormValid) {
      if (!isNameValid) document.getElementById("shippingName")?.focus();
      else if (!isEmailValid) document.getElementById("email")?.focus();
      else if (!isPhoneValid) document.getElementById("phone")?.focus();
      else if (!isCountryValid) document.getElementById("country")?.focus();
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (shippingMode === "aramex" && !aramexQuote) {
      setError("Aramex shipping quote is required. Please wait for the quote to load, or select 'Discuss Shipping Directly'.");
      return;
    }

    setLoading(true);

    try {
      const userId = user?.id || `guest_${Date.now()}`;

      const shippingSnapshot =
        shippingMode === "aramex" && aramexQuote
          ? {
              provider: "aramex",
              mode: "air",
              shipping_method: aramexQuote.service_name,
              carrier: aramexQuote.carrier,
              quoted_shipping_charge: aramexQuote.amount,
              currency: "USD",
              package_quantity: shipmentSpecs?.package_quantity || items.reduce((s, i) => s + i.quantity, 0),
              carton_count: aramexQuote.carton_count || shipmentSpecs?.carton_count || 1,
              carton_dimensions: shipmentSpecs?.carton_dimensions,
              gross_weight: aramexQuote.gross_weight || shipmentSpecs?.gross_weight || 10.0,
              net_weight: shipmentSpecs?.net_weight,
              weight_unit: "kg",
              cbm: aramexQuote.cbm || shipmentSpecs?.cbm || 0.072,
              total_cbm: shipmentSpecs?.total_cbm || 0.072,
              chargeable_weight: aramexQuote.chargeable_weight,
              quote_reference_id: aramexQuote.quote_id,
              quoted_at: aramexQuote.quoted_at,
              is_provisional: Boolean(aramexQuote.is_provisional),
              port_of_loading: "Hazrat Shahjalal International Airport (DAC), Dhaka",
              notes: aramexQuote.notes,
            }
          : {
              provider: "manual",
              mode: "manual",
              shipping_method: "Discuss Shipping Directly",
              carrier: null,
              quoted_shipping_charge: null,
              currency: "USD",
              notes: "Freight to be confirmed separately by AYAAN CLOTHING team.",
            };

      const newOrder = await createOrder({
        userId,
        email: email.trim(),
        shippingName: shippingName.trim(),
        shippingPhone: phone.trim(),
        shippingAddress: address.trim(),
        shippingCity: city.trim(),
        shippingPostalCode: postalCode.trim(),
        shippingCountryCode: country,
        shippingMethod: shippingMode === "aramex" ? (aramexQuote?.service_name || "Aramex Priority Air Express") : "Manual — Discuss Shipping Directly",
        carrier: shippingMode === "aramex" ? (aramexQuote?.carrier || "Aramex Express Air") : undefined,
        shippingCost: shippingMode === "aramex" ? aramexShippingCost : 0,
        shippingQuoteId: shippingMode === "aramex" ? aramexQuote?.quote_id : undefined,
        shippingSnapshot,
        paymentMethod: "proforma_invoice",
        items: items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productSlug: item.product.slug,
          productImage: item.product.images[0],
          sku: item.product.sku,
          variantTitle: item.size && item.size !== "Assorted" ? `Size: ${item.size}` : "Assorted Package",
          unitPrice: item.unitPrice || item.product.price,
          quantity: item.quantity,
          packageBreakdown: item.packageBreakdown,
        })),
      });

      clearCart();
      setConfirmedOrder(newOrder);
    } catch (err: any) {
      setError(err?.message || "Failed to confirm order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalItemQuantity = items.reduce((s, i) => s + i.quantity, 0);

  const manualShippingWhatsAppMsg = `Hello AYAAN CLOTHING,\n\nI would like to discuss shipping options for my order.\n\nItems: ${totalItemQuantity} pcs\nMerchandise value: $${subtotal.toFixed(2)} USD\nDestination: ${city || "—"}, ${country}\n\nPlease advise on shipping arrangements.`;

  const handleDownloadOfferSheets = async () => {
    if (!confirmedOrder) return;
    setIsGeneratingOfferSheets(true);
    setOfferSheetError(null);
    try {
      await downloadCombinedProductOfferSheetsPDF(confirmedOrder, {
        name: confirmedOrder.shipping_name,
        company: confirmedOrder.shipping_company,
        email: confirmedOrder.email,
        country: confirmedOrder.shipping_country_code,
      });
    } catch (err) {
      setOfferSheetError("Unable to prepare the combined Offer Sheets PDF. Please try again.");
    } finally {
      setIsGeneratingOfferSheets(false);
    }
  };

  if (confirmedOrder) {
    const isManual =
      confirmedOrder.shipping_snapshot?.mode === "manual" ||
      !confirmedOrder.shipping_cost;

    return (
      <>
        <div
          className="fixed inset-0 bg-ink/60 backdrop-blur-xs z-[220] animate-in fade-in"
          onClick={onClose}
        />
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="bg-card border border-border/80 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-emerald-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-foreground">
                    Order Confirmed!
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono font-bold">
                    Ref: #{confirmedOrder.order_number}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto font-sans">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-2 text-xs">
                <p className="text-foreground leading-relaxed">
                  Thank you! Your commercial export order has been recorded. <strong>No online payment was required.</strong> Our export desk is reviewing your order specifications and will issue payment settlement details per your Proforma Invoice.
                </p>
                <div className="pt-2.5 border-t border-border/60 flex items-center justify-between font-bold text-foreground">
                  <span>Merchandise Value ({confirmedOrder.items?.length || 0} items):</span>
                  <span>${confirmedOrder.subtotal.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Shipping Arrangement:</span>
                  <span className="font-semibold text-foreground">
                    {isManual ? (
                      <span className="text-amber-600 dark:text-amber-400">To be confirmed separately</span>
                    ) : (
                      `$${(confirmedOrder.shipping_cost || 0).toFixed(2)} USD (Aramex Priority Air)`
                    )}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-sm font-black text-foreground">
                  <span>{isManual ? "Merchandise Total (USD):" : "Grand Total (USD):"}</span>
                  <span className="text-primary">${confirmedOrder.total_amount.toFixed(2)} USD</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText size={15} className="text-primary" />
                  <span>Official Documents</span>
                </h3>

                <button
                  type="button"
                  onClick={() => downloadProformaInvoicePDF(confirmedOrder)}
                  className="w-full p-4 rounded-2xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-between hover:opacity-95 transition-all shadow-md cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                    <div className="text-left">
                      <span className="block font-bold">Download Proforma Invoice (PDF)</span>
                      <span className="block text-[10px] opacity-80 normal-case font-normal">
                        Order-level commercial P.I. • Itemized breakdown &amp; export terms
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={16} />
                </button>

                {confirmedOrder.items && confirmedOrder.items.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/40 mt-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText size={14} className="text-foreground/70" />
                      <span>Product Offer Sheets</span>
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium mb-2 leading-tight">
                      One PDF containing offer sheets for all products in this order.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadOfferSheets}
                      disabled={isGeneratingOfferSheets}
                      className="w-full p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary text-foreground text-xs font-bold flex items-center justify-between transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isGeneratingOfferSheets ? (
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                        ) : (
                          <FileText size={14} className="text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">
                          {isGeneratingOfferSheets ? "Preparing Offer Sheets..." : "DOWNLOAD ALL OFFER SHEETS (PDF)"}
                        </span>
                      </div>
                      {!isGeneratingOfferSheets && (
                        <span className="text-[10px] text-muted-foreground font-bold shrink-0 font-mono ml-2 flex items-center gap-1">
                          <Download size={12} />
                        </span>
                      )}
                    </button>
                    {offerSheetError && (
                      <p className="text-[10px] text-destructive font-medium mt-1">
                        {offerSheetError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={getWhatsAppUrl(
                    `Hello AYAAN CLOTHING,\n\nI have confirmed Order #${confirmedOrder.order_number}.\n\nTotal: $${confirmedOrder.total_amount.toFixed(2)} USD\nDestination: ${confirmedOrder.shipping_city}, ${confirmedOrder.shipping_country_code}\n\nPlease advise on next steps.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>Contact on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (user) {
                      router.push(`/profile/orders/${confirmedOrder.id}`);
                    } else {
                      router.push(`/search`);
                    }
                  }}
                  className="py-3 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>{user ? "View in Dashboard" : "Continue Browsing"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs z-[220] animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="bg-card border border-border/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
            <div>
              <h2 className="text-lg font-bold font-display text-foreground uppercase tracking-wide">
                Confirm Commercial Order
              </h2>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                Confirm destination, shipping and order total
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handlePlaceOrder} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Destination Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Truck size={16} className="text-primary" />
                <span>1. Destination Details</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label htmlFor="shippingName" className="block text-xs font-semibold text-muted-foreground mb-1">
                    Contact / Company Name *
                  </label>
                  <input
                    id="shippingName"
                    type="text"
                    value={shippingName}
                    onBlur={() => setTouched(prev => ({ ...prev, shippingName: true }))}
                    onChange={(e) => setShippingName(e.target.value)}
                    placeholder="John Doe / Global Retail Ltd"
                    className={`w-full h-11 px-3 text-sm rounded-md bg-secondary/30 outline-none transition-all ${
                       (!isNameValid && (touched.shippingName || isSubmitAttempted))
                       ? "border-2 border-destructive"
                       : "border-[1.5px] border-border/80 focus:border-2 focus:border-foreground"
                    }`}
                  />
                  {(!isNameValid && (touched.shippingName || isSubmitAttempted)) && (
                    <span className="text-destructive text-[11px] mt-1 block">Company name is required.</span>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-muted-foreground mb-1">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="buyer@example.com"
                    className={`w-full h-11 px-3 text-sm rounded-md bg-secondary/30 outline-none transition-all ${
                       (!isEmailValid && (touched.email || isSubmitAttempted))
                       ? "border-2 border-destructive"
                       : "border-[1.5px] border-border/80 focus:border-2 focus:border-foreground"
                    }`}
                  />
                  {(!isEmailValid && (touched.email || isSubmitAttempted)) && (
                    <span className="text-destructive text-[11px] mt-1 block">
                      {email.trim() === "" ? "Email address is required." : "Enter a valid email address."}
                    </span>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-muted-foreground mb-1">
                    Phone / Mobile *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 0192"
                    className={`w-full h-11 px-3 text-sm rounded-md bg-secondary/30 outline-none transition-all ${
                       (!isPhoneValid && (touched.phone || isSubmitAttempted))
                       ? "border-2 border-destructive"
                       : "border-[1.5px] border-border/80 focus:border-2 focus:border-foreground"
                    }`}
                  />
                  {(!isPhoneValid && (touched.phone || isSubmitAttempted)) && (
                    <span className="text-destructive text-[11px] mt-1 block">Phone number is required.</span>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label htmlFor="country" className="block text-xs font-semibold text-muted-foreground mb-1">
                    Destination Country *
                  </label>
                  <select
                    id="country"
                    value={country}
                    onBlur={() => setTouched(prev => ({ ...prev, country: true }))}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`w-full h-11 px-3 text-sm rounded-md bg-secondary/30 outline-none transition-all font-semibold ${
                       (!isCountryValid && (touched.country || isSubmitAttempted))
                       ? "border-2 border-destructive"
                       : "border-[1.5px] border-border/80 focus:border-2 focus:border-foreground"
                    }`}
                  >
                    <option value="" disabled>Select country</option>
                    <option value="US">United States (US)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="DE">Germany (DE)</option>
                    <option value="FR">France (FR)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="AU">Australia (AU)</option>
                    <option value="AE">United Arab Emirates (AE)</option>
                    <option value="SA">Saudi Arabia (SA)</option>
                    <option value="NL">Netherlands (NL)</option>
                    <option value="IT">Italy (IT)</option>
                  </select>
                  {(!isCountryValid && (touched.country || isSubmitAttempted)) && (
                    <span className="text-destructive text-[11px] mt-1 block">Select a destination country.</span>
                  )}
                </div>

                {/* Address (Optional) */}
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-xs font-semibold text-muted-foreground mb-1">
                    Street Address
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Fashion Ave, Suite 400"
                    className="w-full h-11 px-3 text-sm rounded-md border-[1.5px] border-border/80 bg-secondary/30 focus:border-2 focus:border-foreground outline-none transition-all"
                  />
                </div>

                {/* City & Postal (Optional) */}
                <div>
                  <label htmlFor="city" className="block text-xs font-semibold text-muted-foreground mb-1">
                    City
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New York"
                    className="w-full h-11 px-3 text-sm rounded-md border-[1.5px] border-border/80 bg-secondary/30 focus:border-2 focus:border-foreground outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="postalCode" className="block text-xs font-semibold text-muted-foreground mb-1">
                    Postal / Zip Code
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="10001"
                    className="w-full h-11 px-3 text-sm font-mono rounded-md border-[1.5px] border-border/80 bg-secondary/30 focus:border-2 focus:border-foreground outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <hr className="border-border/60" />

            {/* 2. Shipping Arrangement */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Plane size={16} className="text-primary" />
                <span>2. Shipping Arrangement</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                {/* AIR — ARAMEX */}
                <button
                  type="button"
                  onClick={() => setShippingMode("aramex")}
                  className={`p-3 rounded-lg text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    shippingMode === "aramex"
                      ? "border-2 border-foreground bg-secondary/30"
                      : "border-[1.5px] border-border/80 bg-card hover:border-foreground/50 hover:bg-secondary/10"
                  }`}
                >
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-semibold text-sm uppercase tracking-wide ${shippingMode === "aramex" ? "text-foreground" : "text-foreground/80"}`}>
                        AIR — ARAMEX
                      </span>
                      {shippingMode === "aramex" && <CheckCircle2 size={16} className="text-foreground shrink-0" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground block leading-snug">
                      Priority Air Express · 3–5 business days
                    </span>
                  </div>
                  
                  <div className="flex justify-end w-full mt-2">
                    {shippingMode === "aramex" && aramexLoading ? (
                      <span className="text-[11px] text-foreground font-semibold flex items-center gap-1">
                        <RefreshCw size={12} className="animate-spin" /> Calculating...
                      </span>
                    ) : shippingMode === "aramex" && aramexError ? (
                      <span className="text-[11px] text-destructive text-right">Error quoting. <span onClick={(e) => { e.stopPropagation(); fetchAramexQuote(); }} className="underline cursor-pointer">Retry</span></span>
                    ) : aramexQuote ? (
                      <span className="font-bold text-sm text-foreground">
                        ${(aramexQuote.amount || 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground text-right">Select to quote</span>
                    )}
                  </div>
                </button>

                {/* DISCUSS DIRECTLY */}
                <button
                  type="button"
                  onClick={() => setShippingMode("manual")}
                  className={`p-3 rounded-lg text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    shippingMode === "manual"
                      ? "border-2 border-foreground bg-secondary/30"
                      : "border-[1.5px] border-border/80 bg-card hover:border-foreground/50 hover:bg-secondary/10"
                  }`}
                >
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-semibold text-sm uppercase tracking-wide ${shippingMode === "manual" ? "text-foreground" : "text-foreground/80"}`}>
                        DISCUSS DIRECTLY
                      </span>
                      {shippingMode === "manual" && <CheckCircle2 size={16} className="text-foreground shrink-0" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground block leading-snug">
                      Shipping cost confirmed separately with our export team.
                    </span>
                  </div>
                  <div className="flex justify-end w-full mt-2 h-[20px] items-center">
                    {shippingMode === "manual" && (
                      <a
                        href={getWhatsAppUrl(manualShippingWhatsAppMsg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#25D366]/10 text-[#25D366] text-[10px] font-bold uppercase tracking-wider hover:bg-[#25D366]/20 transition-colors"
                      >
                        <MessageCircle size={12} />
                        Inquire on WhatsApp
                      </a>
                    )}
                  </div>
                </button>
              </div>

              {/* Shipment Specs Summary */}
              {shippingMode === "aramex" && shipmentSpecs && (
                <div className="py-2 px-3 rounded-lg border border-border/60 bg-secondary/10 font-sans mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-foreground font-medium flex items-center gap-2">
                      <Box size={14} className="text-muted-foreground" />
                      <span>{totalItemQuantity} pcs · {shipmentSpecs.carton_count} cartons · {shipmentSpecs.gross_weight} kg · {shipmentSpecs.total_cbm} CBM</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border/60" />

            {/* 3. Financial Summary */}
            <div className="space-y-1.5 text-sm font-sans pt-1">
              <div className="flex justify-between text-muted-foreground font-medium">
                <span className="uppercase tracking-wide text-xs">Merchandise Total</span>
                <span className="text-foreground font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground font-medium">
                <span className="uppercase tracking-wide text-xs">Shipping</span>
                <span className="text-foreground font-semibold">
                  {shippingMode === "manual" ? (
                    <span className="text-amber-600 dark:text-amber-400">TO BE CONFIRMED</span>
                  ) : aramexLoading ? (
                    <span className="text-xs">CALCULATING...</span>
                  ) : aramexQuote ? (
                    formatPrice(aramexShippingCost)
                  ) : (
                    <span>—</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-end pt-3 mt-2 border-t border-border">
                <span className="font-bold text-foreground text-sm uppercase tracking-wide">Order Total</span>
                <div className="text-right">
                  <span className="font-black text-lg text-foreground">{formatPrice(shippingMode === "manual" ? subtotal : total)}</span>
                  {shippingMode === "manual" && (
                    <span className="block text-[11px] text-muted-foreground font-medium mt-0.5">
                      + shipping
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 pt-2">
              <ShieldCheck size={14} className="text-foreground opacity-70 shrink-0" />
              <span>✓ Commercial order · Proforma Invoice</span>
            </div>

            {/* 4. Final CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isRequiredFormValid || loading || (shippingMode === "aramex" && !aramexQuote)}
                className={`w-full h-12 rounded-lg font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isRequiredFormValid && !(shippingMode === "aramex" && !aramexQuote)
                    ? "bg-foreground text-background shadow-md hover:opacity-90 cursor-pointer hover:-translate-y-0.5 focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
                    : "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm Order &amp; Generate Proforma</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              
              {(!isRequiredFormValid || (shippingMode === "aramex" && !aramexQuote)) && (
                <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
                  {(!isRequiredFormValid) ? "Complete the required fields to continue." : "Please wait for shipping quote."}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
