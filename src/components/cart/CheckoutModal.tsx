"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { createOrder, OrderRecord } from "@/lib/services/orders";
import { shippingService, ShippingQuoteOption, ShipmentSpecs } from "@/services/shipping.service";
import { addressService, AddressFormData, getCountryName } from "@/lib/services/address.service";
import { UserAddress } from "@/types/api";
import AddressForm from "@/components/account/AddressForm";
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
  Building2,
  MapPin,
  Plus,
  Star,
  Anchor,
  Globe,
  Check,
  Pencil,
  Info,
} from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ShippingMode = "aramex" | "manual";
type TransportMethod = "air" | "sea" | "land";
type ServiceType = "door_to_door" | "door_to_port" | "port_to_door" | "port_to_port";

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const userId = String(user?.id || "guest");

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  // Active Shipping Destination State
  const [shippingName, setShippingName] = useState(user?.name || "");
  const [shippingCompany, setShippingCompany] = useState((user as any)?.company_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("US");

  // Shipping Service & Transport Method (Aramex SLI Alignment)
  const [transportMethod, setTransportMethod] = useState<TransportMethod>("air");
  const [shippingServiceType, setShippingServiceType] = useState<ServiceType>("door_to_door");
  const [destinationPort, setDestinationPort] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Third-Party Notification (Aramex SLI "Also Notify 3rd Party")
  const [showThirdPartyNotify, setShowThirdPartyNotify] = useState(false);
  const [thirdPartyName, setThirdPartyName] = useState("");
  const [thirdPartyAddress, setThirdPartyAddress] = useState("");

  // Submission & Quote States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  // Determine if Destination Port is required based on SLI rules
  const isPortRequired =
    shippingServiceType === "door_to_port" ||
    shippingServiceType === "port_to_port" ||
    transportMethod === "sea";

  // Address validation
  const isNameValid = shippingName.trim().length >= 2;
  const isCompanyValid = shippingCompany.trim().length >= 2;
  const isEmailValid = email.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPhoneValid = phone.trim().length >= 7 && /^\+?[0-9\s\-().]{7,25}$/.test(phone.trim());
  const isCountryValid = country.trim() !== "";
  const isCityValid = city.trim().length >= 2;
  const isAddressValid = address.trim().length >= 3;
  const isPortValid = !isPortRequired || destinationPort.trim().length >= 2;

  const isShippingValid =
    isNameValid &&
    isCompanyValid &&
    isEmailValid &&
    isPhoneValid &&
    isCountryValid &&
    isCityValid &&
    isAddressValid &&
    isPortValid;

  const applyAddressToState = useCallback((addr: UserAddress) => {
    setShippingName(addr.name || addr.contact_name || "");
    setShippingCompany(addr.company_name || "");
    setEmail(addr.email || user?.email || "");
    setPhone(addr.phone || user?.phone || "");
    setAddress(addr.address_line_1 || "");
    setAddress2(addr.address_line_2 || "");
    setCity(addr.city || "");
    setState(addr.state || "");
    setPostalCode(addr.postal_code || "");
    setCountry(addr.country_code || "US");
  }, [user]);

  // Load customer's saved addresses when modal opens
  const loadCustomerAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const list = await addressService.getAddresses(userId);
      setSavedAddresses(list);

      if (list.length > 0) {
        // Select default address or first address
        const defaultAddr = list.find((a) => a.is_default) || list[0];
        setSelectedAddressId(String(defaultAddr.id));
        applyAddressToState(defaultAddr);
        setIsAddingNewAddress(false);
      } else {
        // No saved addresses: show address entry form
        setIsAddingNewAddress(true);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingAddresses(false);
    }
  }, [userId, applyAddressToState]);

  useEffect(() => {
    if (isOpen) {
      loadCustomerAddresses();
      setError("");
      setConfirmedOrder(null);
      setIsSubmitAttempted(false);
    } else {
      setConfirmedOrder(null);
      setError("");
      setIsSubmitAttempted(false);
    }
  }, [isOpen, loadCustomerAddresses]);

  // Handle selecting a saved address card
  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(String(addr.id));
    applyAddressToState(addr);
    setIsAddingNewAddress(false);
    setError("");
  };

  // Handle saving a new address from checkout form
  const handleSaveNewAddress = async (formData: AddressFormData) => {
    try {
      const created = await addressService.saveAddress(userId, formData);

      const refreshed = await addressService.getAddresses(userId);
      setSavedAddresses(refreshed);
      setSelectedAddressId(String(created.id));
      applyAddressToState(created);
      setIsAddingNewAddress(false);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Could not save address. Please try again.");
    }
  };

  // Calculate Aramex quote when destination changes
  const fetchAramexQuote = useCallback(async () => {
    if (shippingMode !== "aramex" || transportMethod !== "air") return;
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
          setAramexError(
            "Unable to calculate Aramex shipping for this destination. Select 'Discuss Shipping Directly' or try again."
          );
        }
      } else {
        setAramexError(
          "Unable to calculate Aramex shipping right now. Please try again or select 'Discuss Shipping Directly'."
        );
      }
    } catch (err: any) {
      setAramexError(
        err?.message || "Aramex shipping quote unavailable. Try again or select 'Discuss Shipping Directly'."
      );
      setAramexQuote(null);
    } finally {
      setAramexLoading(false);
    }
  }, [shippingMode, transportMethod, items, country, city, postalCode, address]);

  useEffect(() => {
    if (!isOpen) return;
    if (shippingMode !== "aramex" || transportMethod !== "air") return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchAramexQuote();
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isOpen, shippingMode, transportMethod, country, city, postalCode, items, fetchAramexQuote]);

  if (!isOpen) return null;

  const aramexShippingCost =
    shippingMode === "aramex" && transportMethod === "air" && aramexQuote
      ? aramexQuote.amount || 0
      : 0;
  const total = subtotal + aramexShippingCost;

  // Handle Place Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitAttempted(true);
    setError("");

    if (!isShippingValid) {
      if (!isNameValid || !isCompanyValid || !isEmailValid || !isPhoneValid || !isCountryValid || !isCityValid || !isAddressValid) {
        setError("Please complete all required shipping destination fields (Contact, Company, Email, Phone, Address, City, Country).");
      } else if (!isPortValid) {
        setError("Destination Port is required for the selected shipping service/transportation method.");
      }
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (shippingMode === "aramex" && transportMethod === "air" && !aramexQuote) {
      setError("Aramex air shipping quote is required. Please wait for quote to calculate, or select 'Discuss Shipping Directly'.");
      return;
    }

    setLoading(true);

    try {
      const orderUserId = user?.id || `guest_${Date.now()}`;

      // Build shipping title
      let shippingMethodTitle = "Aramex Priority Air Express";
      let carrierTitle = "Aramex Express Air";

      if (transportMethod === "sea") {
        shippingMethodTitle = `Ocean Freight (${shippingServiceType.replace(/_/g, " ").toUpperCase()})`;
        carrierTitle = "Commercial Ocean Line";
      } else if (transportMethod === "land") {
        shippingMethodTitle = `Overland Cross-Border (${shippingServiceType.replace(/_/g, " ").toUpperCase()})`;
        carrierTitle = "Overland Freight Logistics";
      } else if (shippingMode === "manual") {
        shippingMethodTitle = `Custom Freight (${shippingServiceType.replace(/_/g, " ").toUpperCase()})`;
        carrierTitle = "Export Desk Freight Agreement";
      } else if (aramexQuote) {
        shippingMethodTitle = `${aramexQuote.service_name} (${shippingServiceType.replace(/_/g, " ").toUpperCase()})`;
        carrierTitle = aramexQuote.carrier;
      }

      // Complete consignee snapshot aligned with Aramex SLI
      const shippingSnapshot = {
        provider: shippingMode === "aramex" && transportMethod === "air" ? "aramex" : "ayaan_logistics",
        mode: transportMethod,
        shipping_method: shippingMethodTitle,
        carrier: carrierTitle,
        quoted_shipping_charge: aramexShippingCost > 0 ? aramexShippingCost : null,
        currency: "USD",
        package_quantity: shipmentSpecs?.package_quantity || items.reduce((s, i) => s + i.quantity, 0),
        carton_count: aramexQuote?.carton_count || shipmentSpecs?.carton_count || 1,
        carton_dimensions: shipmentSpecs?.carton_dimensions,
        gross_weight: aramexQuote?.gross_weight || shipmentSpecs?.gross_weight || 10.0,
        net_weight: shipmentSpecs?.net_weight,
        weight_unit: "kg",
        cbm: aramexQuote?.cbm || shipmentSpecs?.cbm || 0.072,
        total_cbm: shipmentSpecs?.total_cbm || 0.072,
        chargeable_weight: aramexQuote?.chargeable_weight,
        quote_reference_id: aramexQuote?.quote_id,
        quoted_at: aramexQuote?.quoted_at,
        is_provisional: Boolean(aramexQuote?.is_provisional),
        port_of_loading:
          transportMethod === "sea"
            ? "Chittagong Port (CTG), Bangladesh"
            : "Hazrat Shahjalal International Airport (DAC), Dhaka",
        destination_port: isPortRequired ? destinationPort.trim() : undefined,
        service_type: shippingServiceType,
        special_instructions: specialInstructions.trim() || undefined,
        third_party_notify:
          showThirdPartyNotify && thirdPartyName.trim()
            ? { name: thirdPartyName.trim(), address: thirdPartyAddress.trim() }
            : undefined,
        notes: specialInstructions.trim() || (shippingMode === "manual" ? "Freight to be confirmed separately by AYAAN CLOTHING export team." : undefined),
        destination: {
          name: shippingName.trim(),
          company_name: shippingCompany.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address1: address.trim(),
          address2: address2.trim() || undefined,
          city: city.trim(),
          region: state.trim() || undefined,
          postal_code: postalCode.trim(),
          country_code: country,
        },
      };

      const newOrder = await createOrder({
        userId: orderUserId,
        email: email.trim(),
        shippingName: shippingName.trim(),
        shippingCompany: shippingCompany.trim(),
        shippingPhone: phone.trim(),
        shippingAddress: address.trim(),
        shippingAddress2: address2.trim() || undefined,
        shippingCity: city.trim(),
        shippingRegion: state.trim() || undefined,
        shippingPostalCode: postalCode.trim(),
        shippingCountryCode: country,
        shippingMethod: shippingMethodTitle,
        carrier: carrierTitle,
        shippingCost: shippingMode === "aramex" && transportMethod === "air" ? aramexShippingCost : 0,
        shippingQuoteId: shippingMode === "aramex" ? aramexQuote?.quote_id : undefined,
        shippingSnapshot,
        paymentMethod: "proforma_invoice",
        transportMethod,
        shippingServiceType,
        destinationPort: isPortRequired ? destinationPort.trim() : undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        thirdPartyNotify:
          showThirdPartyNotify && thirdPartyName.trim()
            ? { name: thirdPartyName.trim(), address: thirdPartyAddress.trim() }
            : undefined,
        notes: specialInstructions.trim() || undefined,
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

  const manualShippingWhatsAppMsg = `Hello AYAAN CLOTHING,\n\nI would like to discuss commercial shipping options for my order.\n\nItems: ${totalItemQuantity} pcs\nMerchandise value: $${subtotal.toFixed(2)} USD\nConsignee: ${shippingCompany || shippingName}\nDestination: ${city || "—"}, ${country}\nService: ${shippingServiceType.replace(/_/g, " ").toUpperCase()}\nMethod: ${transportMethod.toUpperCase()}${isPortRequired && destinationPort ? `\nDestination Port: ${destinationPort}` : ""}\n\nPlease advise on export arrangements.`;

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
    } catch {
      setOfferSheetError("Unable to prepare the combined Offer Sheets PDF. Please try again.");
    } finally {
      setIsGeneratingOfferSheets(false);
    }
  };

  // ─── ORDER CONFIRMATION VIEW ────────────────────────────────────────────────
  if (confirmedOrder) {
    const isManual =
      confirmedOrder.shipping_snapshot?.mode === "manual" ||
      confirmedOrder.shipping_cost === 0;

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
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto font-sans">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-2 text-xs">
                <p className="text-foreground leading-relaxed">
                  Thank you! Your commercial export order has been recorded. <strong>No immediate online payment was required.</strong> Our export desk is reviewing your shipping specifications and will issue payment settlement details per your Proforma Invoice.
                </p>

                {/* Consignee Snapshot Recap */}
                <div className="pt-2.5 border-t border-border/60 text-muted-foreground space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Consignee:</span>
                    <span className="font-bold text-foreground">
                      {confirmedOrder.shipping_company ? `${confirmedOrder.shipping_company} (${confirmedOrder.shipping_name})` : confirmedOrder.shipping_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Destination:</span>
                    <span className="text-foreground">
                      {confirmedOrder.shipping_city}, {confirmedOrder.shipping_country_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service &amp; Method:</span>
                    <span className="text-foreground font-semibold">
                      {confirmedOrder.shipping_method}
                    </span>
                  </div>
                  {confirmedOrder.destination_port && (
                    <div className="flex justify-between">
                      <span>Destination Port:</span>
                      <span className="text-foreground font-mono font-bold">
                        {confirmedOrder.destination_port}
                      </span>
                    </div>
                  )}
                </div>

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
                      `$${(confirmedOrder.shipping_cost || 0).toFixed(2)} USD (${confirmedOrder.shipping_method})`
                    )}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-sm font-black text-foreground">
                  <span>{isManual ? "Merchandise Total (USD):" : "Grand Total (USD):"}</span>
                  <span className="text-primary">${confirmedOrder.total_amount.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Official Documents */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText size={15} className="text-primary" />
                  <span>Official Commercial Documents</span>
                </h3>

                <button
                  type="button"
                  onClick={() => downloadProformaInvoicePDF(confirmedOrder)}
                  className="w-full py-3 px-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Proforma Invoice (PI)
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        PDF with full consignee, Aramex SLI specifications &amp; bank wire info
                      </div>
                    </div>
                  </div>
                  <Download size={16} className="text-muted-foreground group-hover:text-foreground" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOfferSheets}
                  disabled={isGeneratingOfferSheets}
                  className="w-full py-3 px-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors flex items-center justify-between text-left cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                      {isGeneratingOfferSheets ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Download size={18} />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Product Offer Sheets
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        High-res export catalogue for ordered lines
                      </div>
                    </div>
                  </div>
                  <Download size={16} className="text-muted-foreground group-hover:text-foreground" />
                </button>

                {offerSheetError && (
                  <p className="text-[11px] text-destructive">{offerSheetError}</p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={getWhatsAppUrl(
                    `Hello AYAAN CLOTHING,\n\nI have confirmed Commercial Order #${confirmedOrder.order_number}.\n\nTotal: $${confirmedOrder.total_amount.toFixed(2)} USD\nConsignee: ${confirmedOrder.shipping_company || confirmedOrder.shipping_name}\nDestination: ${confirmedOrder.shipping_city}, ${confirmedOrder.shipping_country_code}\n\nPlease advise on next steps.`
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

  // ─── MAIN CHECKOUT FORM VIEW ────────────────────────────────────────────────
  return (
    <>
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs z-[220] animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div
          className="bg-card border border-border/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-foreground uppercase tracking-wide">
                Confirm Commercial Order
              </h2>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                Consignee destination, export shipping &amp; proforma invoice
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handlePlaceOrder} className="p-5 sm:p-6 space-y-6 max-h-[82vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* ─── 1. SHIPPING ADDRESS (CONSIGNEE) ─────────────────────────── */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Truck size={15} className="text-primary" />
                  <span>1. Shipping Address (Consignee)</span>
                </h3>

                {!isAddingNewAddress && savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {/* View A: New Address Form (Reusing shared AddressForm) */}
              {isAddingNewAddress ? (
                <div className="p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-amber-700/50 bg-amber-50/10 dark:bg-amber-950/10 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Plus size={14} className="text-amber-500" />
                      Add New Consignee Address
                    </span>
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewAddress(false)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel &amp; Use Saved
                      </button>
                    )}
                  </div>

                  <AddressForm
                    initialData={{
                      name: shippingName || user?.name || "",
                      contact_name: shippingName || user?.name || "",
                      company_name: shippingCompany || (user as any)?.company_name || "",
                      email: email || user?.email || "",
                      phone: phone || user?.phone || "",
                      address_line_1: address,
                      address_line_2: address2,
                      city,
                      state,
                      postal_code: postalCode,
                      country_code: country,
                      label: "Office",
                      is_default: savedAddresses.length === 0,
                    }}
                    onSubmit={handleSaveNewAddress}
                    onCancel={savedAddresses.length > 0 ? () => setIsAddingNewAddress(false) : undefined}
                    submitLabel="Save &amp; Use This Address"
                    showSaveToBookCheckbox={true}
                    saveToBookDefault={true}
                  />
                </div>
              ) : (
                /* View B: Selectable Saved Address Cards */
                <div className="space-y-2.5">
                  {savedAddresses.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
                      <p className="text-xs text-muted-foreground">No saved addresses found.</p>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewAddress(true)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Shipping Address</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => {
                        const isSelected = String(addr.id) === selectedAddressId;
                        const countryTitle = addr.country || getCountryName(addr.country_code);

                        return (
                          <div
                            key={addr.id}
                            onClick={() => handleSelectAddress(addr)}
                            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all relative flex flex-col justify-between ${
                              isSelected
                                ? "border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-500/50"
                                : "border-border/80 bg-card hover:border-foreground/40 hover:bg-secondary/20"
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground">
                                    {addr.label || "Address"}
                                  </span>
                                  {addr.is_default && (
                                    <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors">
                                  {isSelected && <Check size={12} className="text-amber-500 font-black" />}
                                </div>
                              </div>

                              <div className="text-xs">
                                <p className="font-bold text-foreground">
                                  {addr.name || addr.contact_name}
                                </p>
                                {addr.company_name && (
                                  <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                                    <Building2 size={10} className="shrink-0" />
                                    <span>{addr.company_name}</span>
                                  </p>
                                )}
                                <p className="text-muted-foreground text-[11px] pt-1">
                                  {addr.address_line_1}
                                  {addr.address_line_2 ? `, ${addr.address_line_2}` : ""}
                                </p>
                                <p className="text-muted-foreground text-[11px]">
                                  {addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.postal_code}
                                </p>
                                <p className="text-foreground text-[11px] font-semibold">
                                  {countryTitle}
                                </p>
                              </div>
                            </div>

                            {addr.phone && (
                              <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40 mt-2 font-mono">
                                {addr.phone}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr className="border-border/60" />

            {/* ─── 2. SHIPPING ARRANGEMENT (SERVICES & TRANSPORT METHOD) ──── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Plane size={15} className="text-primary" />
                <span>2. Shipping Service &amp; Transportation Method</span>
              </h3>

              {/* Transportation Method Selection (Air / Sea / Land) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Transportation Method *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "air" as TransportMethod, label: "Air Express", icon: Plane, desc: "Priority Air (3-5 days)" },
                    { id: "sea" as TransportMethod, label: "Ocean Cargo", icon: Anchor, desc: "LCL / FCL Container" },
                    { id: "land" as TransportMethod, label: "Overland Truck", icon: Truck, desc: "Cross-Border Road" },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = transportMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setTransportMethod(m.id);
                          if (m.id !== "air") {
                            setShippingMode("manual");
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-500/50"
                            : "border-border/80 bg-card hover:border-foreground/40 hover:bg-secondary/20"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Icon size={16} className={isSelected ? "text-amber-500" : "text-muted-foreground"} />
                          {isSelected && <Check size={14} className="text-amber-500" />}
                        </div>
                        <div className="mt-2">
                          <span className="text-xs font-bold text-foreground block">{m.label}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">{m.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service Required (Derived from Aramex SLI) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Service Type (Delivery Scope) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "door_to_door" as ServiceType, label: "Door to Door", note: "Standard premises delivery" },
                    { id: "door_to_port" as ServiceType, label: "Door to Port", note: "Delivered to airport/seaport" },
                    { id: "port_to_door" as ServiceType, label: "Port to Door", note: "Origin port to buyer door" },
                    { id: "port_to_port" as ServiceType, label: "Port to Port", note: "Port terminal to terminal" },
                  ].map((s) => {
                    const isSelected = shippingServiceType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setShippingServiceType(s.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-foreground bg-secondary font-bold text-foreground"
                            : "border-border/80 bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        <span className="text-xs block font-semibold leading-tight">{s.label}</span>
                        <span className="text-[10px] opacity-75 block mt-0.5">{s.note}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Destination Port (Rendered ONLY when required) */}
              {isPortRequired && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/40 space-y-1.5 animate-in fade-in">
                  <label htmlFor="destinationPort" className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Anchor size={13} className="text-amber-600 dark:text-amber-400" />
                      Destination Port / Terminal Code <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                      Required for Port Service / Ocean Freight
                    </span>
                  </label>
                  <input
                    id="destinationPort"
                    type="text"
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(e.target.value)}
                    placeholder="e.g. DXB, LHR, JFK, Port of Hamburg, Rotterdam, or Jebel Ali"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground font-medium outline-none focus:border-foreground transition-all"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Specify the airport IATA code or seaport name where cargo will be received.
                  </p>
                  {isSubmitAttempted && !isPortValid && (
                    <p className="text-[11px] text-destructive font-semibold">
                      Please enter the destination port / airport name.
                    </p>
                  )}
                </div>
              )}

              {/* Carrier Quote Options (When Air Freight is chosen) */}
              {transportMethod === "air" && shippingServiceType === "door_to_door" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* AIR — ARAMEX */}
                  <button
                    type="button"
                    onClick={() => setShippingMode("aramex")}
                    className={`p-3 rounded-xl text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      shippingMode === "aramex"
                        ? "border-2 border-foreground bg-secondary/30"
                        : "border-[1.5px] border-border/80 bg-card hover:border-foreground/50 hover:bg-secondary/10"
                    }`}
                  >
                    <div className="w-full space-y-1">
                      <div className="flex items-center justify-between w-full">
                        <span className={`font-semibold text-xs uppercase tracking-wide ${shippingMode === "aramex" ? "text-foreground" : "text-foreground/80"}`}>
                          AIR — ARAMEX PRIORITY
                        </span>
                        {shippingMode === "aramex" && <CheckCircle2 size={15} className="text-foreground shrink-0" />}
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
                        <span className="text-[11px] text-destructive text-right">
                          Quote error. <span onClick={(e) => { e.stopPropagation(); fetchAramexQuote(); }} className="underline cursor-pointer">Retry</span>
                        </span>
                      ) : aramexQuote ? (
                        <span className="font-bold text-sm text-foreground">
                          ${(aramexQuote.amount || 0).toFixed(2)} USD
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
                    className={`p-3 rounded-xl text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      shippingMode === "manual"
                        ? "border-2 border-foreground bg-secondary/30"
                        : "border-[1.5px] border-border/80 bg-card hover:border-foreground/50 hover:bg-secondary/10"
                    }`}
                  >
                    <div className="w-full space-y-1">
                      <div className="flex items-center justify-between w-full">
                        <span className={`font-semibold text-xs uppercase tracking-wide ${shippingMode === "manual" ? "text-foreground" : "text-foreground/80"}`}>
                          DISCUSS DIRECTLY
                        </span>
                        {shippingMode === "manual" && <CheckCircle2 size={15} className="text-foreground shrink-0" />}
                      </div>
                      <span className="text-[11px] text-muted-foreground block leading-snug">
                        Freight rates confirmed separately by our export team.
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
              )}

              {/* Ocean / Land / Port Notice */}
              {(transportMethod !== "air" || shippingServiceType !== "door_to_door") && (
                <div className="p-3 rounded-xl bg-secondary/40 border border-border text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    Commercial freight terms for {transportMethod.toUpperCase()} ({shippingServiceType.replace(/_/g, " ").toUpperCase()}) will be quoted per container / CBM volume on your Proforma Invoice.
                  </span>
                  <a
                    href={getWhatsAppUrl(manualShippingWhatsAppMsg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#25D366]/10 text-[#25D366] text-[11px] font-bold"
                  >
                    <MessageCircle size={12} />
                    Inquire
                  </a>
                </div>
              )}

              {/* Shipment Specs Summary */}
              {shippingMode === "aramex" && shipmentSpecs && (
                <div className="py-2 px-3 rounded-lg border border-border/60 bg-secondary/10 font-sans">
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-foreground font-medium flex items-center gap-2">
                      <Box size={14} className="text-muted-foreground" />
                      <span>
                        {totalItemQuantity} pcs · {shipmentSpecs.carton_count} cartons · {shipmentSpecs.gross_weight} kg · {shipmentSpecs.total_cbm} CBM
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border/60" />

            {/* ─── 3. SPECIAL INSTRUCTIONS & THIRD PARTY NOTIFY ────────────── */}
            <div className="space-y-3">
              {/* Special Instructions */}
              <div className="space-y-1">
                <label htmlFor="specialInstructions" className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Special Instructions / Remarks</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional · Aramex SLI Remarks</span>
                </label>
                <textarea
                  id="specialInstructions"
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Delivery between 9AM-5PM, deliver to warehouse bay 4, notify receiving dock before arrival"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border/80 bg-secondary/30 text-foreground outline-none focus:border-foreground transition-all"
                />
              </div>

              {/* Third-Party Notification (Optional & Collapsed by default) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowThirdPartyNotify((prev) => !prev)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
                >
                  {showThirdPartyNotify ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>Also Notify Third Party (Optional)</span>
                </button>

                {showThirdPartyNotify && (
                  <div className="mt-2.5 p-3.5 rounded-xl border border-border bg-secondary/20 space-y-2.5 animate-in fade-in">
                    <div className="text-[11px] text-muted-foreground">
                      Third-party broker or logistics agent to receive shipping arrival notices:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                          Third-Party Name / Broker
                        </label>
                        <input
                          type="text"
                          value={thirdPartyName}
                          onChange={(e) => setThirdPartyName(e.target.value)}
                          placeholder="e.g. Apex Customs Clearance Ltd"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                          Third-Party Address / Email
                        </label>
                        <input
                          type="text"
                          value={thirdPartyAddress}
                          onChange={(e) => setThirdPartyAddress(e.target.value)}
                          placeholder="e.g. broker@customs.com or Terminal Office"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-border/60" />

            {/* ─── 4. FINANCIAL SUMMARY ────────────────────────────────────── */}
            <div className="space-y-1.5 text-sm font-sans pt-1">
              <div className="flex justify-between text-muted-foreground font-medium">
                <span className="uppercase tracking-wide text-xs">Merchandise Total</span>
                <span className="text-foreground font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground font-medium">
                <span className="uppercase tracking-wide text-xs">Shipping</span>
                <span className="text-foreground font-semibold">
                  {shippingMode === "manual" || transportMethod !== "air" ? (
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
                  <span className="font-black text-lg text-foreground">
                    {formatPrice(shippingMode === "manual" || transportMethod !== "air" ? subtotal : total)}
                  </span>
                  {(shippingMode === "manual" || transportMethod !== "air") && (
                    <span className="block text-[11px] text-muted-foreground font-medium mt-0.5">
                      + freight charges
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 pt-1">
              <ShieldCheck size={14} className="text-foreground opacity-70 shrink-0" />
              <span>Commercial wholesale order · Proforma Invoice issued</span>
            </div>

            {/* ─── 5. FINAL CTA ───────────────────────────────────────────── */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (shippingMode === "aramex" && transportMethod === "air" && !aramexQuote)}
                className={`w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  loading || (shippingMode === "aramex" && transportMethod === "air" && !aramexQuote)
                    ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-foreground text-background hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
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

              {shippingMode === "aramex" && transportMethod === "air" && !aramexQuote && (
                <p className="text-center text-xs text-muted-foreground mt-2 font-medium">
                  Please wait for shipping quote or switch to &quot;Discuss Directly&quot;.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
