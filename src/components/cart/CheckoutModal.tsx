"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { createOrder, OrderRecord } from "@/lib/services/orders";
import { shippingService, ShippingQuoteOption, ShipmentSpecs } from "@/services/shipping.service";
import {
  addressService,
  AddressFormData,
  getCountryName,
  validateAddressFields,
} from "@/lib/services/address.service";
import { UserAddress } from "@/types/api";
import AddressForm from "@/components/account/AddressForm";
import { getWhatsAppUrl, getCommercialOrderWhatsAppMessage } from "@/config/business-profile";
import { formatPrice } from "@/lib/formatters";
import {
  downloadProformaInvoicePDF,
  downloadCombinedProductOfferSheetsPDF,
} from "@/lib/pdf-generator";
import { CouponRecord } from "@/services/admin/coupon.service";
import { validateCoupon } from "@/lib/coupon";
import { sanitizeRedirectUrl } from "@/lib/safe-redirect";
import { trackOrderSuccessConversion } from "@/lib/analytics/google-ads";
import {
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plane,
  MessageCircle,
  Package,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
  Building2,
  MapPin,
  Plus,
  Star,
  Globe,
  Check,
  Pencil,
  Info,
  Tag,
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
  const {
    items: allCartItems,
    selectedItems,
    selectedSubtotal,
    subtotal: allSubtotal,
    clearCart,
    removeFromCart,
    stockViolations,
    revalidateCart,
  } = useCart();
  const items = selectedItems.length > 0 ? selectedItems : allCartItems;
  const subtotal = selectedItems.length > 0 ? selectedSubtotal : allSubtotal;
  const { user, loading: authLoading } = useAuth();
  const userId = String(user?.id || "guest");

  useEffect(() => {
    if (isOpen) {
      // Do not redirect while auth state is resolving or hydrating
      if (authLoading) return;

      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
      // Never trigger login redirect while on transient authentication callback routes
      if (currentPath.startsWith("/auth/")) {
        return;
      }

      if (!user || user.role !== "customer") {
        onClose();
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ayaan_open_checkout", "true");
          sessionStorage.setItem("ayaan_login_notice", "Please log in with a customer account to continue to checkout.");
          const rawReturnUrl = currentPath.startsWith("/login") || currentPath.startsWith("/signup") || currentPath.startsWith("/auth/")
            ? "/cart?openCheckout=true"
            : (currentPath === "/cart" ? "/cart?openCheckout=true" : currentPath);
          const returnUrl = sanitizeRedirectUrl(rawReturnUrl, "/cart?openCheckout=true", false);
          router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}&notice=${encodeURIComponent("Please log in with a customer account to continue to checkout.")}`);
        }
        return;
      }
      revalidateCart();
    }
  }, [isOpen, user, authLoading, onClose, router, revalidateCart]);

  // Stable ref to the latest authenticated user — used in submit handler and address mapping
  // so we never read stale user data regardless of when React batches the state update.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Stable ref to the currently selected saved address — the canonical source of truth
  // for the submit handler so it always reads the live selection, not potentially stale
  // individual field state values.
  const selectedAddressRef = useRef<UserAddress | null>(null);

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Address form sheet — rendered OUTSIDE the checkout <form> to avoid nested-form
  // HTML violations (which caused the browser to bubble AddressForm submits to the
  // checkout form, triggering checkout validation on every address save).
  // mode: null = sheet closed | "add" = creating new | "edit" = editing existing
  const [addressFormMode, setAddressFormMode] = useState<null | "add" | "edit">(null);
  const [addressFormTarget, setAddressFormTarget] = useState<UserAddress | null>(null);
  const [addressFormSaving, setAddressFormSaving] = useState(false);
  const [addressFormError, setAddressFormError] = useState("");

  // Keep the legacy flag in sync so we can re-use it in loadCustomerAddresses
  // (when no saved addresses exist, the sheet opens in "add" mode automatically).
  const isAddingNewAddress = addressFormMode !== null;

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

  // Shipping Service — internal defaults (not customer-facing selectors)
  const transportMethod: TransportMethod = "air";          // always air for Aramex; land ignored
  const shippingServiceType: ServiceType = "door_to_door"; // default service scope
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Submission & Quote States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("ayaan_test_confirmed_order");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return null;
  });

  const [shippingMode, setShippingMode] = useState<ShippingMode>("manual");
  const [aramexEnabled, setAramexEnabled] = useState<boolean>(false);
  const [aramexQuote, setAramexQuote] = useState<ShippingQuoteOption | null>(null);
  const [shipmentSpecs, setShipmentSpecs] = useState<ShipmentSpecs | null>(null);
  const [aramexLoading, setAramexLoading] = useState(false);
  const [aramexError, setAramexError] = useState<string | null>(null);

  const [isGeneratingOfferSheets, setIsGeneratingOfferSheets] = useState(false);
  const [offerSheetError, setOfferSheetError] = useState<string | null>(null);

  // Promo Code / Coupon State
  const [appliedCoupon, setAppliedCoupon] = useState<CouponRecord | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── SUBMISSION LOCK (synchronous ref to prevent double-click race) ─────────
  // React state updates are asynchronous and batched, so `loading` alone cannot
  // guard against rapid consecutive clicks that enter handlePlaceOrder before
  // setLoading(true) flushes. This ref is set synchronously at the very top of
  // handlePlaceOrder and cleared in the finally block, ensuring only one
  // submission pipeline can execute at a time.
  const isSubmittingRef = useRef(false);

  // ─── NORMALIZED SHIPPING DESTINATION ──────────────────────────────────────
  // Build a single canonical object that represents the shipping destination
  // from current state. This is the SINGLE SOURCE OF TRUTH used by both the
  // live validation indicators and the submit handler.
  //
  // When a saved address is selected (!isAddingNewAddress && selectedAddressRef),
  // prefer the saved address fields directly so they are never lost to
  // React batching delays. Fall back to individual field state for the new-
  // address form path.
  const resolveShippingDestination = useCallback(() => {
    const savedAddr = selectedAddressRef.current;
    const currentUser = userRef.current;

    if (!isAddingNewAddress && savedAddr) {
      // Saved-address path: derive everything from the selected address object.
      // Email and phone fall back to the authenticated user's account values
      // when not explicitly stored on the address record.
      return {
        name: (savedAddr.name || savedAddr.contact_name || "").trim(),
        company: (savedAddr.company_name || "").trim(),
        email: (savedAddr.email || currentUser?.email || "").trim(),
        phone: (savedAddr.phone || currentUser?.phone || "").trim(),
        address: (savedAddr.address_line_1 || "").trim(),
        address2: (savedAddr.address_line_2 || "").trim(),
        city: (savedAddr.city || "").trim(),
        state: (savedAddr.state || "").trim(),
        postalCode: (savedAddr.postal_code || "").trim(),
        country: (savedAddr.country_code || "US").trim(),
      };
    }

    // New-address form path: use individual field state.
    return {
      name: shippingName.trim(),
      company: shippingCompany.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      address2: address2.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
    };
  }, [
    isAddingNewAddress,
    shippingName, shippingCompany, email, phone,
    address, address2, city, state, postalCode, country,
  ]);

  // Per-field validation helpers (used both for inline indicators and submit)
  const validateShippingDestination = useCallback((dest: ReturnType<typeof resolveShippingDestination>) => {
    const res = validateAddressFields({
      name: dest.name,
      company_name: dest.company,
      email: dest.email,
      phone: dest.phone,
      address_line_1: dest.address,
      address_line_2: dest.address2,
      city: dest.city,
      state: dest.state,
      postal_code: dest.postalCode,
      country_code: dest.country,
    });
    return res.missingFields;
  }, []);

  // Derive live validation state for UI indicators from current state/ref
  // (used by the form to show real-time field highlights)
  const isNameValid = shippingName.trim().length >= 2;
  const isCompanyValid = shippingCompany.trim().length === 0 || shippingCompany.trim().length >= 2;
  const isEmailValid = email.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPhoneValid = phone.trim().length >= 7 && /^\+?[0-9\s\-().]{7,25}$/.test(phone.trim());
  const isCountryValid = country.trim() !== "";
  const isCityValid = city.trim().length >= 2;
  const isAddressValid = address.trim().length >= 3;
  const isShippingValid =
    isNameValid &&
    isCompanyValid &&
    isEmailValid &&
    isPhoneValid &&
    isCountryValid &&
    isCityValid &&
    isAddressValid;

  const applyAddressToState = useCallback((addr: UserAddress) => {
    // Always write the selected address to the ref first so that the submit
    // handler can read it synchronously without waiting for state batching.
    selectedAddressRef.current = addr;

    // Use the ref for the current user so we always get the most up-to-date
    // auth profile even if user state hasn't propagated yet in this render cycle.
    const currentUser = userRef.current;
    setShippingName(addr.name || addr.contact_name || "");
    setShippingCompany(addr.company_name || "");
    setEmail(addr.email || currentUser?.email || "");
    setPhone(addr.phone || currentUser?.phone || "");
    setAddress(addr.address_line_1 || "");
    setAddress2(addr.address_line_2 || "");
    setCity(addr.city || "");
    setState(addr.state || "");
    setPostalCode(addr.postal_code || "");
    setCountry(addr.country_code || "US");
  }, []);

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
        setAddressFormMode(null); // ensure sheet is closed
      } else {
        // No saved addresses: open add sheet automatically
        setAddressFormMode("add");
        setAddressFormTarget(null);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingAddresses(false);
    }
  }, [userId, applyAddressToState]);

  useEffect(() => {
    if (isOpen) {
      setError("");
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem("ayaan_test_confirmed_order");
        if (stored) {
          try {
            setConfirmedOrder(JSON.parse(stored));
            setAddressFormMode(null);
            return;
          } catch {
            // ignore
          }
        }
      }
      loadCustomerAddresses();
      setConfirmedOrder(null);
      setIsSubmitAttempted(false);
    } else {
      // Clear the selected-address ref and close address sheet on modal close.
      selectedAddressRef.current = null;
      setAddressFormMode(null);
      setAddressFormTarget(null);
      setConfirmedOrder(null);
      setError("");
      setIsSubmitAttempted(false);
    }
  }, [isOpen, loadCustomerAddresses]);

  // Prevent background page scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close the address sheet without saving
  const handleCloseAddressSheet = useCallback(() => {
    setAddressFormMode(null);
    setAddressFormTarget(null);
    setAddressFormError("");
  }, []);

  // Handle keyboard accessibility (Escape to close modal or address sheet)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (addressFormMode !== null) {
          handleCloseAddressSheet();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, addressFormMode, onClose, handleCloseAddressSheet]);

  // Revalidate applied coupon when subtotal changes (e.g. cart quantity modified)
  useEffect(() => {
    if (appliedCoupon && subtotal > 0) {
      const result = validateCoupon(appliedCoupon.code, subtotal);
      if (!result.isValid) {
        setAppliedCoupon(null);
        setPromoError(result.error);
      }
    }
  }, [subtotal, appliedCoupon]);

  // Handle selecting a saved address card
  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(String(addr.id));
    // Write to ref immediately — submit handler reads this directly so
    // there is no dependency on React state flush timing.
    selectedAddressRef.current = addr;
    applyAddressToState(addr);
    setError("");
  };

  // Open the address sheet in Edit mode for the given address
  const handleOpenEditAddress = (addr: UserAddress, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click (select) from firing
    setAddressFormMode("edit");
    setAddressFormTarget(addr);
    setAddressFormError("");
  };

  // Open the address sheet in Add mode
  const handleOpenAddAddress = () => {
    setAddressFormMode("add");
    setAddressFormTarget(null);
    setAddressFormError("");
  };

  // Unified save handler for both CREATE and EDIT paths.
  // Called by the AddressForm rendered inside the floating sheet (NOT inside
  // the checkout <form>), so it never triggers checkout submission.
  const handleSaveAddress = async (formData: AddressFormData) => {
    setAddressFormSaving(true);
    setAddressFormError("");
    try {
      if (addressFormMode === "edit" && addressFormTarget) {
        // UPDATE existing address
        const updated = await addressService.saveAddress(
          userId,
          formData,
          addressFormTarget.id
        );
        const refreshed = await addressService.getAddresses(userId);
        setSavedAddresses(refreshed);

        // If the edited address was the currently selected one, sync checkout state.
        if (String(addressFormTarget.id) === selectedAddressId) {
          setSelectedAddressId(String(updated.id));
          applyAddressToState(updated);
        }
      } else {
        // CREATE new address
        const created = await addressService.saveAddress(userId, formData);
        const refreshed = await addressService.getAddresses(userId);
        setSavedAddresses(refreshed);
        // Auto-select the new address
        setSelectedAddressId(String(created.id));
        applyAddressToState(created);
      }

      setAddressFormMode(null);
      setAddressFormTarget(null);
      setError("");
    } catch (err: any) {
      setAddressFormError(err?.message || "Could not save address. Please try again.");
    } finally {
      setAddressFormSaving(false);
    }
  };

  // Synchronize dynamic carrier settings (Aramex enabled/disabled)
  useEffect(() => {
    if (!isOpen) return;
    shippingService.getSettings().then((settings) => {
      const enabled = Boolean(settings.aramex_enabled);
      setAramexEnabled(enabled);
      if (!enabled && shippingMode === "aramex") {
        setShippingMode("manual");
      }
    }).catch(() => {
      setAramexEnabled(false);
      setShippingMode("manual");
    });
  }, [isOpen, shippingMode]);

  // Calculate Aramex quote when destination changes (best-effort; does not block submit)
  const fetchAramexQuote = useCallback(async () => {
    if (!aramexEnabled || shippingMode !== "aramex") return;
    if (!country || items.length === 0) return;

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
            "Aramex shipping estimate unavailable for this destination. You may still proceed — our export team will confirm rates."
          );
        }
      } else {
        setAramexError(
          "Aramex shipping estimate unavailable right now. You may still proceed — our export team will confirm rates."
        );
      }
    } catch (err: any) {
      setAramexError(
        err?.message || "Aramex shipping estimate unavailable. You may still proceed — our export team will confirm rates."
      );
      setAramexQuote(null);
    } finally {
      setAramexLoading(false);
    }
  }, [aramexEnabled, shippingMode, items, country, city, postalCode, address]);

  useEffect(() => {
    if (!isOpen) return;
    if (!aramexEnabled || shippingMode !== "aramex") return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchAramexQuote();
    }, 500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isOpen, aramexEnabled, shippingMode, country, city, postalCode, items, fetchAramexQuote]);

  if (!isOpen) return null;

  // Coupon discount calculation (strictly capped at merchandise subtotal)
  const discountAmount = appliedCoupon
    ? (validateCoupon(appliedCoupon.code, subtotal).isValid
        ? (validateCoupon(appliedCoupon.code, subtotal) as any).discountAmount
        : 0)
    : 0;
  const merchandiseAfterDiscount = Math.max(0, subtotal - discountAmount);

  const aramexShippingCost =
    shippingMode === "aramex" && transportMethod === "air" && aramexQuote
      ? aramexQuote.amount || 0
      : 0;
  const total = merchandiseAfterDiscount + aramexShippingCost;

  // Apply Promo Code Handler
  const handleApplyCoupon = () => {
    if (promoLoading) return;
    const trimmed = promoInput.trim();
    if (!trimmed) {
      setPromoError("Please enter a promo code.");
      return;
    }

    setPromoLoading(true);
    setPromoError("");

    try {
      const result = validateCoupon(trimmed, subtotal);
      if (result.isValid) {
        setAppliedCoupon(result.coupon);
        setPromoError("");
      } else {
        setPromoError(result.error);
      }
    } catch {
      setPromoError("Unable to validate promo code. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  };

  // Remove Promo Code Handler
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setPromoError("");
    setPromoInput("");
  };

  // Handle Place Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Synchronous submission lock ──────────────────────────────────────────
    // Must be checked BEFORE any async work. React state (loading) is batched
    // and cannot prevent concurrent entry into this handler on rapid clicks.
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;

    setIsSubmitAttempted(true);
    setError("");

    // Build the normalized shipping destination as a single canonical object.
    // This ensures validation and the order payload both use the SAME data,
    // avoiding any React state-batching race where the state setters from
    // applyAddressToState haven't flushed yet when the user clicks Submit.
    const dest = resolveShippingDestination();
    const missingFields = validateShippingDestination(dest);

    if (missingFields.length > 0) {
      const fieldList = missingFields.join(", ");
      setError(
        missingFields.length === 1
          ? `Please complete the required field: ${fieldList}.`
          : `Please complete the following required shipping destination fields: ${fieldList}.`
      );
      isSubmittingRef.current = false;
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      isSubmittingRef.current = false;
      return;
    }

    // Revalidate coupon before order placement
    let finalDiscountAmount = 0;
    let finalCouponCode: string | undefined = undefined;

    if (appliedCoupon) {
      const valResult = validateCoupon(appliedCoupon.code, subtotal);
      if (valResult.isValid) {
        finalDiscountAmount = valResult.discountAmount;
        finalCouponCode = valResult.code;
      } else {
        setError(`Promo code error: ${valResult.error}`);
        setAppliedCoupon(null);
        setPromoError(valResult.error);
        isSubmittingRef.current = false;
        return;
      }
    }

    if (shippingMode === "aramex" && !aramexEnabled) {
      setError("Aramex Priority Air Express is currently unavailable. Please select Discuss Directly to proceed.");
      isSubmittingRef.current = false;
      return;
    }

    const liveViolations = await revalidateCart();
    if (liveViolations.length > 0) {
      setError(liveViolations[0].message || "Some items exceed available stock. Please reduce the quantity.");
      isSubmittingRef.current = false;
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        setError("Please log in to continue to checkout.");
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ayaan_open_checkout", "true");
          sessionStorage.setItem("ayaan_login_notice", "Please log in to continue to checkout.");
        }
        onClose();
        const currentPath = typeof window !== "undefined" ? (window.location.pathname + window.location.search) : "/cart?openCheckout=true";
        const returnUrl = currentPath.startsWith("/login") || currentPath.startsWith("/signup") ? "/cart?openCheckout=true" : (currentPath === "/cart" ? "/cart?openCheckout=true" : currentPath);
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}&notice=${encodeURIComponent("Please log in to continue to checkout.")}`);
        return;
      }
      const orderUserId = String(user.id);

      // Build shipping title based on selected option (ARAMEX or DISCUSS DIRECTLY)
      let shippingMethodTitle: string;
      let carrierTitle: string;

      if (shippingMode === "manual") {
        shippingMethodTitle = "Discuss Directly — Freight Arranged by Export Team";
        carrierTitle = "AYAAN CLOTHING Export Desk";
      } else if (aramexQuote) {
        shippingMethodTitle = `Aramex — ${aramexQuote.service_name}`;
        carrierTitle = aramexQuote.carrier;
      } else {
        shippingMethodTitle = "Aramex — Priority Air";
        carrierTitle = "Aramex Express";
      }

      // Consignee snapshot
      // All destination fields are sourced from `dest` — the normalized, already-validated
      // shipping destination object — so the snapshot is always consistent with what was
      // validated, never reading potentially stale individual React state variables.
      const shippingSnapshot = {
        provider: shippingMode === "aramex" ? "aramex" : "ayaan_logistics",
        mode: "air" as string,
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
        is_provisional: shippingMode === "aramex" ? Boolean(aramexQuote?.is_provisional ?? true) : false,
        port_of_loading: "Hazrat Shahjalal International Airport (DAC), Dhaka",
        service_type: shippingServiceType,
        special_instructions: specialInstructions.trim() || undefined,
        notes: specialInstructions.trim() || (shippingMode === "manual" ? "Freight to be confirmed separately by AYAAN CLOTHING export team." : undefined),
        destination: {
          name: dest.name,
          company_name: dest.company,
          phone: dest.phone,
          email: dest.email,
          address1: dest.address,
          address2: dest.address2 || undefined,
          city: dest.city,
          region: dest.state || undefined,
          postal_code: dest.postalCode,
          country_code: dest.country,
        },
      };

      const newOrder = await createOrder({
        userId: orderUserId,
        email: dest.email,
        shippingName: dest.name,
        shippingCompany: dest.company,
        shippingPhone: dest.phone,
        shippingAddress: dest.address,
        shippingAddress2: dest.address2 || undefined,
        shippingCity: dest.city,
        shippingRegion: dest.state || undefined,
        shippingPostalCode: dest.postalCode,
        shippingCountryCode: dest.country,
        shippingMethod: shippingMethodTitle,
        carrier: carrierTitle,
        shippingCost: shippingMode === "aramex" ? aramexShippingCost : 0,
        shippingQuoteId: shippingMode === "aramex" ? aramexQuote?.quote_id : undefined,
        shippingSnapshot,
        couponCode: finalCouponCode,
        promoCode: finalCouponCode,
        discountAmount: finalDiscountAmount,
        paymentMethod: "proforma_invoice",
        transportMethod: "air",
        shippingServiceType,
        destinationPort: undefined,
        specialInstructions: specialInstructions.trim() || undefined,
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
          pricingMode: item.pricing_mode || (item as any).pricingMode,
          pricing_mode: item.pricing_mode || (item as any).pricingMode,
          packageBreakdown: item.packageBreakdown,
        })),
      });

      // If all cart items were checked out, clear cart completely;
      // if only a subset was selected, remove only the checked out items so unselected items remain for later
      if (items.length >= allCartItems.length) {
        clearCart();
      } else {
        await Promise.all(
          items.map((it) => removeFromCart(it.product.id, it.size, it.id))
        );
      }
      setAppliedCoupon(null);
      setPromoInput("");
      setConfirmedOrder(newOrder);

      // Google Ads Conversion Tracking (Canonical order success state)
      // Note: Configured as "Submit lead form conversion page" (AW-18504838697/kNbLCMPd86EdEKnc5fdE).
      trackOrderSuccessConversion(newOrder);
    } catch (err: any) {
      if (err?.status === 401 || err?.isAuthError) {
        setError("Please log in to continue to checkout.");
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ayaan_open_checkout", "true");
          sessionStorage.setItem("ayaan_login_notice", "Please log in to continue to checkout.");
        }
        onClose();
        const currentPath = typeof window !== "undefined" ? (window.location.pathname + window.location.search) : "/cart?openCheckout=true";
        const returnUrl = currentPath.startsWith("/login") || currentPath.startsWith("/signup") ? "/cart?openCheckout=true" : (currentPath === "/cart" ? "/cart?openCheckout=true" : currentPath);
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}&notice=${encodeURIComponent("Please log in to continue to checkout.")}`);
        return;
      }
      const errData = err?.data?.data || err?.data;
      if (err?.data?.error_code === "INSUFFICIENT_STOCK" || errData?.available_quantity !== undefined) {
        const prod = errData?.product_name || "item";
        const sz = errData?.size && errData.size !== "Assorted" ? ` — Size ${errData.size}` : "";
        const req = errData?.requested_quantity;
        const av = errData?.available_quantity;
        setError(`Insufficient stock for ${prod}${sz}. Requested: ${req}, Available: ${av}. Please reduce the quantity.`);
        revalidateCart();
      } else if (err?.data?.error_code === "INVALID_MOQ_MULTIPLE" || errData?.code === "INVALID_MOQ_MULTIPLE") {
        const prod = errData?.product_name || "item";
        const req = errData?.requested_quantity;
        const moq = errData?.moq;
        setError(`Order quantity for ${prod} (${req} pcs) must be an exact multiple of the MOQ (${moq} pcs).`);
        revalidateCart();
      } else if (err?.data?.error_code === "BELOW_MOQ" || errData?.code === "BELOW_MOQ") {
        const prod = errData?.product_name || "item";
        const moq = errData?.moq;
        setError(`Order quantity for ${prod} is below the minimum order quantity (${moq} pcs).`);
        revalidateCart();
      } else {
        setError(err?.message || "Failed to confirm order. Please try again.");
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const totalItemQuantity = items.reduce((s, i) => s + i.quantity, 0);

  const manualShippingWhatsAppMsg = `Hello AYAAN CLOTHING,\n\nI would like to discuss shipping arrangements for my order.\n\nItems: ${totalItemQuantity} pcs\nMerchandise value: $${subtotal.toFixed(2)} USD\nConsignee: ${shippingCompany || shippingName}\nDestination: ${city || "—"}, ${country}\n\nPlease advise on export arrangements.`;

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
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-placed-heading"
            className="bg-card border border-border/80 w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90dvh,840px)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Pinned) */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-amber-500/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="order-placed-heading" className="text-base sm:text-lg font-bold font-display text-foreground">
                      Order Placed
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
                      Payment Pending
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono font-bold">
                    Ref: #{confirmedOrder.order_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close order confirmation modal"
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Independently Scrollable) */}
            <div className="p-5 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto font-sans">
              <div className="p-4 sm:p-5 rounded-2xl bg-secondary/30 border border-border space-y-3 text-xs">
                <p className="text-foreground leading-relaxed text-xs sm:text-[13px]">
                  Your order has been placed and is awaiting payment. Open your order to enter your payment details. You may also upload payment proof to help our team verify your payment.
                </p>

                {/* Consignee Snapshot Recap */}
                <div className="pt-2.5 border-t border-border/60 text-muted-foreground space-y-1.5">
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-muted-foreground font-medium shrink-0">Consignee:</span>
                    <span className="font-bold text-foreground text-right break-words min-w-0">
                      {confirmedOrder.shipping_company ? `${confirmedOrder.shipping_company} (${confirmedOrder.shipping_name})` : confirmedOrder.shipping_name}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-muted-foreground font-medium shrink-0">Destination:</span>
                    <span className="text-foreground text-right break-words min-w-0">
                      {confirmedOrder.shipping_city}, {confirmedOrder.shipping_country_code}
                    </span>
                  </div>
                  {confirmedOrder.destination_port && (
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-muted-foreground font-medium shrink-0">Destination Port:</span>
                      <span className="text-foreground font-mono font-bold text-right break-words min-w-0">
                        {confirmedOrder.destination_port}
                      </span>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="pt-2.5 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground font-medium shrink-0">
                      Merchandise Value ({confirmedOrder.items?.length || 0} items):
                    </span>
                    <span className="font-semibold text-foreground font-mono text-right shrink-0">
                      ${confirmedOrder.subtotal.toFixed(2)} USD
                    </span>
                  </div>
                  {confirmedOrder.discount_amount > 0 && (
                    <div className="flex items-center justify-between gap-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="shrink-0">Discount ({confirmedOrder.coupon_code || confirmedOrder.promo_code || "Promo"}):</span>
                      <span className="font-bold font-mono text-right shrink-0">-${confirmedOrder.discount_amount.toFixed(2)} USD</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-muted-foreground font-medium shrink-0">Shipping Arrangement:</span>
                    <span className="font-semibold text-foreground text-right break-words min-w-0">
                      {isManual ? (
                        <span className="text-amber-600 dark:text-amber-400">To be confirmed separately</span>
                      ) : (
                        `$${(confirmedOrder.shipping_cost || 0).toFixed(2)} USD (${confirmedOrder.shipping_method})`
                      )}
                    </span>
                  </div>
                </div>

                {/* Final Displayed Total */}
                <div className="pt-2.5 border-t border-border flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isManual ? "Merchandise Total (USD):" : "Grand Total (USD):"}
                  </span>
                  <span className="text-base sm:text-lg font-black text-primary font-mono text-right shrink-0">
                    ${confirmedOrder.total_amount.toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Commercial Documents */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText size={14} className="text-primary" />
                    <span>Commercial Documents</span>
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => downloadProformaInvoicePDF(confirmedOrder)}
                  className="w-full h-13 px-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText size={16} />
                    </div>
                    <span className="text-xs font-bold text-foreground truncate">
                      Proforma Invoice (PI)
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-secondary transition-colors shrink-0">
                    <Download size={16} />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOfferSheets}
                  disabled={isGeneratingOfferSheets}
                  className="w-full h-13 px-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors flex items-center justify-between text-left cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText size={16} />
                    </div>
                    <span className="text-xs font-bold text-foreground truncate">
                      Product Offer Sheets
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-secondary transition-colors shrink-0">
                    {isGeneratingOfferSheets ? (
                      <RefreshCw size={16} className="animate-spin text-primary" />
                    ) : (
                      <Download size={16} />
                    )}
                  </div>
                </button>

                {offerSheetError && (
                  <p className="text-[11px] text-destructive">{offerSheetError}</p>
                )}
              </div>
            </div>

            {/* Modal Footer (Pinned Actions) */}
            <div className="shrink-0 px-5 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-card/95 backdrop-blur-xs pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={getWhatsAppUrl(getCommercialOrderWhatsAppMessage(confirmedOrder))}
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
                      router.push(`/dashboard/orders/${confirmedOrder.id}`);
                    } else {
                      router.push(`/search`);
                    }
                  }}
                  className="py-3 px-4 rounded-xl border border-amber-500/40 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <span>{user ? "View Order & Submit Payment" : "Continue Browsing"}</span>
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
  const selectedAddress = savedAddresses.find((a) => String(a.id) === selectedAddressId) || null;
  const selectedAddressValidation = selectedAddress
    ? validateAddressFields({
        name: selectedAddress.name || selectedAddress.contact_name,
        company_name: selectedAddress.company_name,
        email: selectedAddress.email || user?.email,
        phone: selectedAddress.phone || user?.phone,
        address_line_1: selectedAddress.address_line_1,
        address_line_2: selectedAddress.address_line_2,
        city: selectedAddress.city,
        state: selectedAddress.state,
        postal_code: selectedAddress.postal_code,
        country_code: selectedAddress.country_code,
      })
    : null;

  const hasConfirmedShipping =
    shippingMode === "aramex" && Boolean(aramexQuote) && aramexShippingCost > 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs z-[220] animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden">
        <form
          id="checkout-order-form"
          onSubmit={handlePlaceOrder}
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-modal-title"
          className="bg-card border border-border/80 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90dvh,840px)] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header (Pinned) */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-card shrink-0">
            <div>
              <h2 id="checkout-modal-title" className="text-base sm:text-lg font-bold font-display text-foreground uppercase tracking-wide">
                Confirm Commercial Order
              </h2>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                Consignee destination, export shipping &amp; proforma invoice
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close checkout modal"
              className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body (Independently Scrollable) */}
          <div className="p-5 sm:p-6 space-y-5 sm:space-y-6 flex-1 min-h-0 overflow-y-auto pb-32 sm:pb-8">
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
                  <MapPin size={15} className="text-primary" />
                  <span>1. Shipping Address (Consignee)</span>
                </h3>

                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {/* Selectable Saved Address Cards */}
              <div className="space-y-2.5">
                {loadingAddresses ? (
                  <div className="py-6 flex items-center justify-center text-xs text-muted-foreground gap-2">
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Loading addresses…</span>
                  </div>
                ) : savedAddresses.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
                    <p className="text-xs text-muted-foreground">No saved addresses found.</p>
                    <button
                      type="button"
                      onClick={handleOpenAddAddress}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Shipping Address</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => {
                        const isSelected = String(addr.id) === selectedAddressId;
                        const countryTitle = addr.country || getCountryName(addr.country_code);
                        const validation = validateAddressFields({
                          name: addr.name || addr.contact_name,
                          company_name: addr.company_name,
                          email: addr.email || user?.email,
                          phone: addr.phone || user?.phone,
                          address_line_1: addr.address_line_1,
                          address_line_2: addr.address_line_2,
                          city: addr.city,
                          state: addr.state,
                          postal_code: addr.postal_code,
                          country_code: addr.country_code,
                        });

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
                            <div className="space-y-2">
                              {/* Card header: label + default badge + edit button + select indicator */}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground shrink-0">
                                    {addr.label || "Address"}
                                  </span>
                                  {addr.is_default && (
                                    <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Edit button — type="button" prevents checkout form submit */}
                                  <button
                                    type="button"
                                    aria-label={`Edit address: ${addr.label || addr.name}`}
                                    onClick={(e) => handleOpenEditAddress(addr, e)}
                                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/60 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                  >
                                    <Pencil size={10} />
                                    <span>Edit</span>
                                  </button>
                                  <div className="w-4 h-4 rounded-full border flex items-center justify-center transition-colors">
                                    {isSelected && <Check size={12} className="text-amber-500 font-black" />}
                                  </div>
                                </div>
                              </div>

                              {/* Structured Address Fields with explicit roles */}
                              <div className="text-xs space-y-1">
                                <p className="font-bold text-foreground">
                                  {addr.name || addr.contact_name}
                                </p>
                                {addr.company_name && (
                                  <p className="text-muted-foreground text-[11px] flex items-center gap-1 font-medium">
                                    <Building2 size={11} className="shrink-0 text-muted-foreground" />
                                    <span>{addr.company_name}</span>
                                  </p>
                                )}
                                <div className="pt-1 text-[11px] text-muted-foreground space-y-0.5">
                                  <p>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Street: </span>
                                    <span className="text-foreground">{addr.address_line_1}</span>
                                  </p>
                                  {addr.address_line_2 && (
                                    <p>
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Area / Unit: </span>
                                      <span className="text-foreground">{addr.address_line_2}</span>
                                    </p>
                                  )}
                                </div>
                                <div className="pt-1 text-[11px] grid grid-cols-2 gap-x-2 gap-y-1">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider block">City</span>
                                    <span className="text-foreground font-medium">{addr.city}</span>
                                  </div>
                                  {addr.state && (
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider block">State / Region</span>
                                      <span className="text-foreground font-medium">{addr.state}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider block">Postal Code</span>
                                    <span className="text-foreground font-mono font-medium">
                                      {addr.postal_code || <span className="text-amber-600 dark:text-amber-400 font-bold font-sans">Missing</span>}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider block">Country</span>
                                    <span className="text-foreground font-semibold">{countryTitle}</span>
                                  </div>
                                </div>
                                {!validation.isValid && (
                                  <div className="pt-1.5 mt-1 border-t border-amber-500/20 text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                    <AlertCircle size={10} className="shrink-0" />
                                    <span>Needs attention: {validation.missingFields.join(", ")}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/40 mt-2 flex items-center justify-between">
                              <span className="font-mono">
                                {addr.phone ? `Tel: ${addr.phone}` : <span className="text-amber-600 dark:text-amber-400 font-bold font-sans">No Phone</span>}
                              </span>
                              {addr.email && <span className="truncate max-w-[120px] text-muted-foreground/80">{addr.email}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Notice if selected address has missing fields */}
                    {selectedAddress && selectedAddressValidation && !selectedAddressValidation.isValid && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2.5 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>
                            Selected address requires updates: <strong>{selectedAddressValidation.missingFields.join(", ")}</strong>.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditAddress(selectedAddress, e)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shrink-0 transition-colors cursor-pointer shadow-xs"
                        >
                          Edit Address
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <hr className="border-border/60" />

            {/* ─── 2. SHIPPING SERVICE ─────────────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Plane size={15} className="text-primary" />
                <span>2. Shipping Service &amp; Transportation Method</span>
              </h3>

              {/* Two-option selector: ARAMEX | DISCUSS DIRECTLY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Option 1 — ARAMEX */}
                <button
                  type="button"
                  disabled={!aramexEnabled}
                  onClick={() => aramexEnabled && setShippingMode("aramex")}
                  className={`p-3.5 rounded-xl text-left transition-all relative flex flex-col justify-between ${
                    !aramexEnabled
                      ? "border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02] text-slate-400 dark:text-slate-500 cursor-not-allowed select-none"
                      : shippingMode === "aramex"
                      ? "border-2 border-foreground bg-secondary/30 cursor-pointer"
                      : "border-[1.5px] border-border/80 bg-card hover:border-foreground/50 hover:bg-secondary/10 cursor-pointer"
                  }`}
                >
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <Plane size={15} className={aramexEnabled && shippingMode === "aramex" ? "text-foreground" : "text-slate-400 dark:text-slate-500"} />
                        <span className={`font-bold text-xs uppercase tracking-wide ${
                          aramexEnabled && shippingMode === "aramex" ? "text-foreground" : "text-slate-400 dark:text-slate-500"
                        }`}>
                          ARAMEX
                        </span>
                      </div>
                      {!aramexEnabled ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                          Currently Unavailable
                        </span>
                      ) : shippingMode === "aramex" && (
                        <CheckCircle2 size={15} className="text-foreground shrink-0" />
                      )}
                    </div>
                  </div>

                  {aramexEnabled && (
                    <div className="flex justify-end w-full mt-2 min-h-[20px] items-center">
                      {shippingMode === "aramex" && aramexLoading ? (
                        <span className="text-[11px] text-foreground font-semibold flex items-center gap-1">
                          <RefreshCw size={11} className="animate-spin" /> Calculating...
                        </span>
                      ) : shippingMode === "aramex" && aramexError ? (
                        <span className="text-[11px] text-muted-foreground text-right">
                          Est. on order{" "}
                          <span
                            onClick={(e) => { e.stopPropagation(); fetchAramexQuote(); }}
                            className="underline cursor-pointer"
                          >
                            Retry
                          </span>
                        </span>
                      ) : aramexQuote ? (
                        <span className="font-bold text-sm text-foreground font-mono">
                          {formatPrice(aramexQuote.amount || 0)} USD
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Est. on confirmation</span>
                      )}
                    </div>
                  )}
                </button>

                {/* Option 2 — DISCUSS DIRECTLY */}
                <button
                  type="button"
                  onClick={() => setShippingMode("manual")}
                  className={`p-3.5 rounded-xl text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    shippingMode === "manual"
                      ? "border-2 border-foreground bg-secondary/30"
                      : "border-[1.5px] border-border/80 bg-card hover:border-foreground/50 hover:bg-secondary/10"
                  }`}
                >
                  <div className="w-full space-y-1.5">
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-bold text-xs uppercase tracking-wide ${
                        shippingMode === "manual" ? "text-foreground" : "text-foreground/80"
                      }`}>
                        Discuss Directly
                      </span>
                      {shippingMode === "manual" && <CheckCircle2 size={15} className="text-foreground shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Our export team will discuss shipping arrangements and freight charges with you after your order is placed.
                    </p>
                  </div>
                  <div className="flex justify-between w-full mt-2.5 min-h-[20px] items-center gap-1">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      Freight to be confirmed
                    </span>
                    {shippingMode === "manual" && (
                      <a
                        href={getWhatsAppUrl(manualShippingWhatsAppMsg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#25D366]/10 text-[#25D366] text-[10px] font-bold uppercase tracking-wider hover:bg-[#25D366]/20 transition-colors"
                      >
                        Inquire
                      </a>
                    )}
                  </div>
                </button>
              </div>

              {/* Aramex shipment specs summary (when quote calculated) */}
              {shippingMode === "aramex" && shipmentSpecs && (
                <div className="py-2 px-3 rounded-lg border border-border/60 bg-secondary/10 font-sans">
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-foreground font-medium flex items-center gap-2">
                      <Package size={14} className="text-muted-foreground" />
                      <span>
                        {totalItemQuantity} pcs · {shipmentSpecs.carton_count} cartons · {shipmentSpecs.gross_weight} kg · {shipmentSpecs.total_cbm} CBM
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border/60" />

            {/* ─── 3. SPECIAL INSTRUCTIONS ─────────────────────────────────── */}
            <div className="space-y-1.5">
              <label htmlFor="specialInstructions" className="text-xs font-semibold text-foreground">
                Special Instructions
              </label>
              <textarea
                id="specialInstructions"
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder=""
                className="w-full px-3 py-2 text-xs rounded-xl border border-border/80 bg-secondary/30 text-foreground outline-none focus:border-foreground transition-all"
              />
            </div>

            <hr className="border-border/60" />

            {/* ─── 4. PROMO / COUPON CODE ─────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="promoCodeInput"
                  className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5"
                >
                  <Tag size={14} className="text-primary" />
                  <span>Promo Code</span>
                </label>
                {appliedCoupon && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check size={12} />
                    <span>Applied ✓</span>
                  </span>
                )}
              </div>

              {appliedCoupon ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Tag size={15} />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-mono font-bold text-foreground tracking-wide">
                        {appliedCoupon.code}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {appliedCoupon.discount_type === "percentage"
                          ? `${appliedCoupon.discount_value}% Discount Applied`
                          : `$${appliedCoupon.discount_value} Discount Applied`}
                        {appliedCoupon.max_discount ? ` (up to $${appliedCoupon.max_discount})` : ""}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    aria-label={`Remove promo code ${appliedCoupon.code}`}
                    className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        id="promoCodeInput"
                        name="promoCode"
                        type="text"
                        placeholder=""
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value);
                          if (promoError) setPromoError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        disabled={promoLoading || loading}
                        aria-invalid={Boolean(promoError)}
                        aria-describedby={promoError ? "promoErrorText" : undefined}
                        className={`w-full px-3.5 py-2.5 text-xs font-mono uppercase rounded-xl border bg-secondary/30 text-foreground placeholder:text-muted-foreground placeholder:normal-case placeholder:font-sans outline-none transition-all disabled:opacity-50 ${
                          promoError
                            ? "border-destructive focus:ring-1 focus:ring-destructive"
                            : "border-border/80 focus:border-foreground"
                        }`}
                      />
                      {promoInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setPromoInput("");
                            setPromoError("");
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!promoInput.trim() || promoLoading || loading}
                      className="px-4 py-2.5 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-2xs"
                    >
                      {promoLoading ? (
                        <span className="flex items-center gap-1">
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Checking...</span>
                        </span>
                      ) : (
                        <span>Apply</span>
                      )}
                    </button>
                  </div>

                  {promoError && (
                    <p id="promoErrorText" className="text-[11px] text-destructive font-medium flex items-center gap-1 animate-in fade-in">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{promoError}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <hr className="border-border/60" />

            {/* ─── 5. PRICING SUMMARY ────────────────────────────────────── */}
            <div className="space-y-2.5 text-xs font-sans pt-1">
              {/* Merchandise Subtotal */}
              <div className="flex justify-between items-center text-muted-foreground font-medium">
                <span>Merchandise Subtotal</span>
                <span className="text-foreground font-semibold font-mono text-sm">{formatPrice(subtotal)} USD</span>
              </div>

              {/* Discount if applicable */}
              {discountAmount > 0 && appliedCoupon && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>
                    Discount ({appliedCoupon.code}
                    {appliedCoupon.discount_type === "percentage" ? ` · ${appliedCoupon.discount_value}%` : ""})
                  </span>
                  <span className="font-semibold font-mono text-sm">-{formatPrice(discountAmount)} USD</span>
                </div>
              )}

              {/* Shipping & Freight */}
              <div className="flex justify-between items-start text-muted-foreground font-medium">
                <div>
                  <span>Shipping &amp; Freight</span>
                  {!hasConfirmedShipping && (
                    <span className="block text-[11px] text-muted-foreground/75 font-normal">
                      Freight excluded from current amount
                    </span>
                  )}
                </div>
                <div className="text-right">
                  {hasConfirmedShipping ? (
                    <span className="text-foreground font-semibold font-mono text-sm">
                      {formatPrice(aramexShippingCost)} USD
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs">
                      To be confirmed
                    </span>
                  )}
                </div>
              </div>

              {/* Order Total Divider & Row */}
              <div className="pt-2.5 border-t border-border flex justify-between items-baseline">
                <div>
                  <span className="font-bold text-foreground text-sm uppercase tracking-wide">
                    Order Total
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-base text-foreground font-mono">
                    {formatPrice(hasConfirmedShipping ? total : merchandiseAfterDiscount)} USD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── MODAL FOOTER (Pinned & Visible) ─────────────────────────── */}
          <div className="shrink-0 px-5 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-card/95 backdrop-blur-xs space-y-2.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
            {stockViolations.length > 0 && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle size={15} className="shrink-0" />
                <span>
                  {stockViolations[0]?.message || "Some items in your cart exceed currently available stock. Please reduce quantities to proceed."}
                </span>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center sm:text-left leading-relaxed">
              Proforma Invoice generated after order confirmation.
            </p>

            <button
              type="submit"
              disabled={loading || stockViolations.length > 0}
              className={`w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                loading || stockViolations.length > 0
                  ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                  : "bg-foreground text-background hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  <span>Confirm Order</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      {/* ─── ADDRESS FORM SHEET ────────────────────────────────────────────────
           Rendered here — OUTSIDE the checkout <form> — as a sibling overlay.
           This prevents any nested-form HTML violation. The AddressForm's own
           <form onSubmit> is completely independent of the checkout <form>.
           z-[240] sits above the checkout modal z-[230].
      ──────────────────────────────────────────────────────────────────────── */}
      {addressFormMode !== null && (
        <>
          {/* Backdrop — clicking closes sheet without saving */}
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-[238] animate-in fade-in"
            onClick={handleCloseAddressSheet}
          />
          <div className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
            <div
              className="bg-card border border-border/80 w-full max-w-xl rounded-t-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${addressFormMode === "edit" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"}`}>
                    {addressFormMode === "edit" ? <Pencil size={16} /> : <Plus size={16} />}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      {addressFormMode === "edit" ? "Edit Address" : "Add New Address"}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      {addressFormMode === "edit"
                        ? `Editing: ${addressFormTarget?.label || addressFormTarget?.name || "Address"}`
                        : "New consignee shipping address"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close address form"
                  onClick={handleCloseAddressSheet}
                  className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sheet body — scrollable */}
              <div className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto">
                {addressFormError && (
                  <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs font-medium flex items-start gap-2 animate-in fade-in">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{addressFormError}</span>
                  </div>
                )}

                <AddressForm
                  key={addressFormMode === "edit" ? String(addressFormTarget?.id) : "new"}
                  initialData={
                    addressFormMode === "edit" && addressFormTarget
                      ? {
                          label: addressFormTarget.label || "Office",
                          name: addressFormTarget.name || addressFormTarget.contact_name || "",
                          contact_name: addressFormTarget.contact_name || addressFormTarget.name || "",
                          company_name: addressFormTarget.company_name || "",
                          email: addressFormTarget.email || user?.email || "",
                          phone: addressFormTarget.phone || user?.phone || "",
                          address_line_1: addressFormTarget.address_line_1,
                          address_line_2: addressFormTarget.address_line_2 || "",
                          city: addressFormTarget.city,
                          state: addressFormTarget.state || "",
                          postal_code: addressFormTarget.postal_code,
                          country_code: addressFormTarget.country_code,
                          country: addressFormTarget.country || "",
                          is_default: addressFormTarget.is_default,
                        }
                      : {
                          name: user?.name || "",
                          contact_name: user?.name || "",
                          company_name: (user as any)?.company_name || "",
                          email: user?.email || "",
                          phone: user?.phone || "",
                          label: "Office",
                          country_code: "US",
                          is_default: savedAddresses.length === 0,
                        }
                  }
                  onSubmit={handleSaveAddress}
                  onCancel={handleCloseAddressSheet}
                  isSubmitting={addressFormSaving}
                  submitLabel={addressFormMode === "edit" ? "Save Changes" : "Save & Use This Address"}
                  cancelLabel="Cancel"
                  showSaveToBookCheckbox={false}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
