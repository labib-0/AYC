"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Store,
  Search,
  User as UserIcon,
  UserPlus,
  Package,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  Receipt,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Warehouse as WarehouseIcon,
  Banknote,
  Landmark,
  ShieldCheck,
  Copy,
  Check,
  Tag,
  Percent,
  Printer,
  X,
  Sparkles,
  ShoppingBag,
  Coins,
  ArrowRight,
  FileText,
  Truck,
  PackageCheck,
  Settings,
} from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import BUSINESS_PROFILE from "@/config/business-profile";
import {
  siteSettingsService,
  DEFAULT_BUSINESS_SETTINGS,
} from "@/services/site-settings.service";
import {
  posService,
  PosCustomer,
  PosProduct,
  PosVariant,
  PosWarehouse,
  PosCalculationPreview,
  PosSaleItemPayload,
} from "@/services/admin/pos.service";
import { categoryService, CategoryModel } from "@/services/category.service";
import { OrderRecord } from "@/services/order.service";
import { adminOrderService } from "@/services/admin/order.service";
import {
  getOrderStatusPresentation,
  getPaymentPresentation,
  getCanonicalCustomerStatus,
} from "@/lib/order-status";
import { AdminPagination, PageSizeSelector } from "@/components/admin/common";
import { DEFAULT_ADMIN_PAGE_SIZE, AdminPageSize } from "@/types/admin-listing";

function formatCurrency(amount: number | string | null | undefined, currency: string = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);
  const safeNum = isNaN(num) ? 0 : num;
  const safeCurrency = (currency || "USD").toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeNum);
  } catch {
    return `${safeCurrency} ${safeNum.toFixed(2)}`;
  }
}

interface CartLineItem {
  id: string; // unique line id
  product: PosProduct;
  variant?: PosVariant | null;
  size?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

function generatePosIdempotencyKey(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export default function AdminPosPage() {
  const { adminUser, can } = useAdminAuth();

  // ── Global POS State ──────────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Quick Add Customer Modal State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [quickAddEmail, setQuickAddEmail] = useState("");
  const [quickAddCompany, setQuickAddCompany] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  // ── Catalog & Search State ────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<PosProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [productCurrentPage, setProductCurrentPage] = useState<number>(1);
  const [productPerPage, setProductPerPage] = useState<AdminPageSize>(DEFAULT_ADMIN_PAGE_SIZE);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [warehouses, setWarehouses] = useState<PosWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isApprovingPayment, setIsApprovingPayment] = useState(false);
  const [isUpdatingHandover, setIsUpdatingHandover] = useState(false);
  const [orderActionFeedback, setOrderActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Active product being configured
  const [activeProduct, setActiveProduct] = useState<PosProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [addQuantity, setAddQuantity] = useState<number>(1);

  // ── Cart & Line Items ─────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [previewTotals, setPreviewTotals] = useState<PosCalculationPreview | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // ── Discounts State ───────────────────────────────────────────────────────
  const [couponCodeInput, setCouponCodeInput] = useState<string>("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);
  const [showCouponInput, setShowCouponInput] = useState<boolean>(false);

  const [manualDiscountType, setManualDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [manualDiscountValue, setManualDiscountValue] = useState<string>("");
  const [manualDiscountReason, setManualDiscountReason] = useState<string>("");
  const [appliedManualDiscount, setAppliedManualDiscount] = useState<{
    type: "percentage" | "fixed";
    value: number;
    reason: string;
  } | null>(null);
  const [manualDiscountError, setManualDiscountError] = useState<string | null>(null);
  const [showManualDiscountForm, setShowManualDiscountForm] = useState<boolean>(false);
  const [isApplyingManualDiscount, setIsApplyingManualDiscount] = useState<boolean>(false);

  // ── Payment (Cash & Bank) State ───────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<"pos_cash" | "bank_transfer">("pos_cash");
  const [cashPaymentNote, setCashPaymentNote] = useState<string>("");
  const [bankPaymentReference, setBankPaymentReference] = useState<string>("");
  const [bankPaymentNote, setBankPaymentNote] = useState<string>("");
  const [selectedBankProfileId, setSelectedBankProfileId] = useState<string>("profile_usd_default");
  const [bankProfiles, setBankProfiles] = useState<any[]>(DEFAULT_BUSINESS_SETTINGS.bank_profiles || []);
  const [companyBanking, setCompanyBanking] = useState<any>(DEFAULT_BUSINESS_SETTINGS.banking || BUSINESS_PROFILE.banking);

  // Resolved active company bank profile for Commercial Invoice wire instructions
  const activeBankProfile = useMemo(() => {
    const found = bankProfiles.find((p) => p.id === selectedBankProfileId);
    if (found) return found;
    if (bankProfiles.length > 0) return bankProfiles[0];
    return {
      id: "profile_usd_default",
      name: companyBanking?.bank_name ? `${companyBanking.bank_name} (${companyBanking.currency || "USD"} Account)` : "Pubali Bank Limited (USD Account)",
      bank_name: companyBanking?.bank_name || BUSINESS_PROFILE.banking.bankName || "Pubali Bank Limited",
      account_title: companyBanking?.account_name || companyBanking?.account_title || BUSINESS_PROFILE.banking.accountTitle || "M/S AYAAN  CLOTHING",
      account_number: companyBanking?.account_number || companyBanking?.account_no || BUSINESS_PROFILE.banking.accountNo || "1788-901-044316",
      swift_code: companyBanking?.swift_code || BUSINESS_PROFILE.banking.swiftCode || "PUBABDDH210",
      branch_name: companyBanking?.branch_name || companyBanking?.branch || BUSINESS_PROFILE.banking.branch || "Nawabpur Road Branch",
      bank_address: companyBanking?.branch_name || companyBanking?.bank_address || BUSINESS_PROFILE.banking.bankAddress || "Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh",
      currency: companyBanking?.currency || "USD",
    };
  }, [bankProfiles, selectedBankProfileId, companyBanking]);

  // ── Checkout & Submission ─────────────────────────────────────────────────
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderRecord | null>(null);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

  // ── Initial Data Loading ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [whs, cats, bizSettings] = await Promise.all([
          posService.getWarehouses(),
          categoryService.getCategories({ all: true }).catch(() => []),
          siteSettingsService.getBusinessSettings().catch(() => DEFAULT_BUSINESS_SETTINGS),
        ]);
        if (mounted) {
          if (whs.length > 0) {
            setWarehouses(whs);
            setSelectedWarehouseId(whs[0].id);
          }
          if (Array.isArray(cats)) {
            setCategories(cats);
          }
          if (bizSettings) {
            if (bizSettings.banking) {
              setCompanyBanking(bizSettings.banking);
            }
            if (Array.isArray(bizSettings.bank_profiles) && bizSettings.bank_profiles.length > 0) {
              setBankProfiles(bizSettings.bank_profiles);
              const defProf = bizSettings.bank_profiles.find((p: any) => p.is_default) || bizSettings.bank_profiles[0];
              if (defProf?.id) {
                setSelectedBankProfileId(defProf.id);
              }
            }
          }
        }
        const initialProducts = await posService.searchProducts("", whs[0]?.id || null, 50);
        if (mounted) {
          setProductResults(initialProducts);
        }
      } catch (err) {
        console.error("Failed to load initial POS data:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Customer search with debounce (default 5 records)
  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true);
      try {
        const results = await posService.searchCustomers(customerSearch.trim(), 5);
        setCustomerResults(results);
        setShowCustomerDropdown(true);
      } catch (err) {
        console.error("Customer search error:", err);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Product search and category filter with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearchingProducts(true);
      try {
        const results = await posService.searchProducts(
          productSearch.trim(),
          selectedWarehouseId,
          50,
          selectedCategoryId ? Number(selectedCategoryId) : null
        );
        setProductResults(results);
      } catch (err) {
        console.error("Product search error:", err);
      } finally {
        setIsSearchingProducts(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [productSearch, selectedWarehouseId, selectedCategoryId]);

  // Reset product page when search or category filter changes
  useEffect(() => {
    setProductCurrentPage(1);
  }, [productSearch, selectedWarehouseId, selectedCategoryId]);

  const isProductAll = productPerPage === "all";
  const numericProductPerPage = isProductAll ? Math.max(1, productResults.length) : Number(productPerPage) || 5;
  const productTotalPages = isProductAll ? 1 : Math.max(1, Math.ceil(productResults.length / numericProductPerPage));

  useEffect(() => {
    if (productCurrentPage > productTotalPages) {
      setProductCurrentPage(productTotalPages);
    }
  }, [productCurrentPage, productTotalPages]);

  const paginatedProducts = useMemo(() => {
    if (isProductAll) return productResults;
    const start = (productCurrentPage - 1) * numericProductPerPage;
    return productResults.slice(start, start + numericProductPerPage);
  }, [productResults, productCurrentPage, numericProductPerPage, isProductAll]);

  // Sync activeProduct selection defaults
  useEffect(() => {
    if (activeProduct) {
      if (activeProduct.has_variants && activeProduct.variants.length > 0) {
        const firstInStock = activeProduct.variants.find((v) => v.stock > 0 && v.is_active);
        setSelectedVariantId(firstInStock ? firstInStock.id : activeProduct.variants[0].id);
      } else {
        setSelectedVariantId(null);
      }
      setAddQuantity(activeProduct.moq || 1);
    }
  }, [activeProduct]);

  // Live recalculation preview whenever cart, customer, discounts, or payment change
  useEffect(() => {
    if (!selectedCustomer || cart.length === 0) {
      setPreviewTotals(null);
      return;
    }

    let isCurrent = true;
    const recalculate = async () => {
      setIsCalculating(true);
      try {
        const payloadItems: PosSaleItemPayload[] = cart.map((item) => ({
          product_id: item.product.id,
          variant_id: item.variant?.id ?? null,
          size: item.size ?? null,
          quantity: item.quantity,
        }));

        const isCash = paymentMethod === "pos_cash";

        const preview = await posService.calculatePreview({
          customer_id: selectedCustomer.id,
          items: payloadItems,
          shipping_cost: 0,
          shipping_method: "POS In-Store Handover",
          coupon_code: appliedCouponCode || undefined,
          manual_discount: appliedManualDiscount
            ? {
                type: appliedManualDiscount.type,
                value: appliedManualDiscount.value,
                reason: appliedManualDiscount.reason,
              }
            : undefined,
          payment_method: paymentMethod,
          tendered_amount: undefined,
          paid_amount: isCash ? undefined : 0,
          payment_reference: !isCash && bankPaymentReference.trim() ? bankPaymentReference.trim() : undefined,
          payment_note: isCash ? (cashPaymentNote.trim() || undefined) : (bankPaymentNote.trim() || undefined),
          bank_profile_id: !isCash ? (activeBankProfile?.id || undefined) : undefined,
          bank_name: !isCash ? (activeBankProfile?.bank_name || undefined) : undefined,
        });

        if (isCurrent) {
          setPreviewTotals(preview);
        }
      } catch (err: any) {
        console.error("Calculation error:", err);
        const msg = err?.response?.data?.message || err?.message;
        if (
          appliedCouponCode &&
          msg &&
          (msg.toLowerCase().includes("coupon") || msg.toLowerCase().includes("minimum spend"))
        ) {
          setCouponError(msg);
          setAppliedCouponCode(null);
        }
      } finally {
        if (isCurrent) setIsCalculating(false);
      }
    };

    recalculate();

    return () => {
      isCurrent = false;
    };
  }, [
    cart,
    selectedCustomer,
    appliedCouponCode,
    appliedManualDiscount,
    paymentMethod,
    cashPaymentNote,
    bankPaymentReference,
    bankPaymentNote,
    activeBankProfile,
  ]);

  // ── Customer Handlers ─────────────────────────────────────────────────────

  const handleSelectCustomer = (cust: PosCustomer) => {
    setSelectedCustomer(cust);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
    setSubmissionError(null);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setPreviewTotals(null);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName.trim()) {
      setQuickAddError("Customer name is required.");
      return;
    }
    if (!quickAddPhone.trim()) {
      setQuickAddError("Phone number is required.");
      return;
    }

    setIsQuickAdding(true);
    setQuickAddError(null);

    try {
      const createdOrMatched = await posService.quickCreateCustomer({
        name: quickAddName.trim(),
        phone: quickAddPhone.trim(),
        email: quickAddEmail.trim() || undefined,
        company_name: quickAddCompany.trim() || undefined,
      });

      setSelectedCustomer(createdOrMatched);
      setShowQuickAddModal(false);
      setQuickAddName("");
      setQuickAddPhone("");
      setQuickAddEmail("");
      setQuickAddCompany("");
      setSubmissionError(null);
    } catch (err: any) {
      console.error("Quick add customer failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to register customer. Please verify inputs.";
      setQuickAddError(msg);
    } finally {
      setIsQuickAdding(false);
    }
  };

  // ── Cart & Item Handlers ──────────────────────────────────────────────────

  const addOrIncrementProduct = (
    product: PosProduct,
    variant: PosVariant | null = null,
    qtyToAdd?: number
  ): boolean => {
    if (product.is_sold_out || product.total_available_stock <= 0) {
      setSubmissionError(`'${product.name}' is currently sold out.`);
      return false;
    }

    const step = product.moq > 1 ? product.moq : 1;
    const quantity = qtyToAdd ?? step;

    // Check MOQ rules
    if (product.moq > 1) {
      if (quantity < product.moq) {
        setSubmissionError(`Minimum order quantity for '${product.name}' is ${product.moq} pcs.`);
        return false;
      }
      if (quantity % product.moq !== 0) {
        setSubmissionError(`Quantity must be an exact multiple of the MOQ (${product.moq} pcs).`);
        return false;
      }
    }

    // Check variant stock or product stock
    const maxStock = variant ? variant.stock : product.total_available_stock;

    // Check if line item already exists
    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.variant?.id === variant?.id
    );

    if (existingIndex >= 0) {
      const existingItem = cart[existingIndex];
      const newQty = existingItem.quantity + quantity;

      if (newQty > maxStock) {
        setSubmissionError(`Insufficient stock for '${product.name}'. Max available: ${maxStock} pcs.`);
        return false;
      }

      // Recalculate price tier for updated quantity
      let effectivePrice = variant?.price ?? product.unit_price;
      if (product.pricing_tiers?.length > 0) {
        for (const tier of product.pricing_tiers) {
          if (
            newQty >= tier.min_quantity &&
            (tier.max_quantity == null || newQty <= tier.max_quantity)
          ) {
            effectivePrice = tier.unit_price;
            break;
          }
        }
      }

      const updated = [...cart];
      updated[existingIndex] = {
        ...existingItem,
        quantity: newQty,
        unit_price: effectivePrice,
        line_total: Math.round(effectivePrice * newQty * 100) / 100,
      };
      setCart(updated);
      return true;
    } else {
      // New line item
      if (quantity > maxStock) {
        setSubmissionError(`Insufficient stock for '${product.name}'. Available: ${maxStock} pcs, Requested: ${quantity} pcs.`);
        return false;
      }

      let effectivePrice = variant?.price ?? product.unit_price;
      if (product.pricing_tiers?.length > 0) {
        for (const tier of product.pricing_tiers) {
          if (
            quantity >= tier.min_quantity &&
            (tier.max_quantity == null || quantity <= tier.max_quantity)
          ) {
            effectivePrice = tier.unit_price;
            break;
          }
        }
      }

      const lineId = `${product.id}_${variant?.id || "base"}_${Date.now()}`;
      const sizeLabel = variant?.size || variant?.title || "Assorted";
      const newLine: CartLineItem = {
        id: lineId,
        product,
        variant,
        size: sizeLabel,
        quantity,
        unit_price: effectivePrice,
        line_total: Math.round(effectivePrice * quantity * 100) / 100,
      };

      setCart((prev) => [...prev, newLine]);
      return true;
    }
  };

  const handleAddToCart = () => {
    if (!activeProduct) return;

    let chosenVariant: PosVariant | null = null;
    if (activeProduct.has_variants && !activeProduct.has_package_allocations) {
      if (!selectedVariantId) {
        setSubmissionError("Please select a variant option.");
        return;
      }
      chosenVariant = activeProduct.variants.find((v) => v.id === selectedVariantId) || null;
      if (!chosenVariant) {
        setSubmissionError("Invalid variant selected.");
        return;
      }
    }

    const success = addOrIncrementProduct(activeProduct, chosenVariant, addQuantity);
    if (success) {
      setActiveProduct(null);
      setSubmissionError(null);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  };

  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const handleUpdateQuantity = (lineId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id !== lineId) return item;
          const step = item.product.moq > 1 ? item.product.moq : 1;
          const newQty = item.quantity + delta * step;
          if (newQty <= 0) return null;

          const maxAvail = item.variant ? item.variant.stock : item.product.total_available_stock;
          if (newQty > maxAvail) {
            setSubmissionError(`Cannot exceed available stock of ${maxAvail} pcs.`);
            return item;
          }

          let unitPrice = item.variant?.price ?? item.product.unit_price;
          if (item.product.pricing_tiers?.length > 0) {
            for (const tier of item.product.pricing_tiers) {
              if (
                newQty >= tier.min_quantity &&
                (tier.max_quantity == null || newQty <= tier.max_quantity)
              ) {
                unitPrice = tier.unit_price;
                break;
              }
            }
          }

          return {
            ...item,
            quantity: newQty,
            unit_price: unitPrice,
            line_total: Math.round(unitPrice * newQty * 100) / 100,
          };
        })
        .filter(Boolean) as CartLineItem[];
    });
  };

  const handleRemoveLine = (lineId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== lineId));
  };

  // ── Discount Handlers ─────────────────────────────────────────────────────

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    if (!selectedCustomer || cart.length === 0) {
      setCouponError("Select a customer and add items before applying coupon.");
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);
    const code = couponCodeInput.trim().toUpperCase();

    try {
      const payloadItems: PosSaleItemPayload[] = cart.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id ?? null,
        size: item.size ?? null,
        quantity: item.quantity,
      }));

      const preview = await posService.calculatePreview({
        customer_id: selectedCustomer.id,
        items: payloadItems,
        coupon_code: code,
        manual_discount: appliedManualDiscount
          ? {
              type: appliedManualDiscount.type,
              value: appliedManualDiscount.value,
              reason: appliedManualDiscount.reason,
            }
          : undefined,
        shipping_cost: 0,
        shipping_method: "POS In-Store Handover",
        payment_method: paymentMethod,
      });

      setAppliedCouponCode(code);
      setPreviewTotals(preview);
      setCouponCodeInput("");
      setCouponError(null);
      setShowCouponInput(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid or ineligible coupon code for this sale.";
      setCouponError(msg);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode(null);
    setCouponError(null);
  };

  const handleApplyManualDiscount = async () => {
    if (!can(ADMIN_PERMISSIONS.POS_DISCOUNT)) {
      setManualDiscountError("You lack permission to apply manual discounts (pos.discount).");
      return;
    }
    const val = parseFloat(manualDiscountValue);
    if (isNaN(val) || val <= 0) {
      setManualDiscountError("Please enter a valid positive discount amount.");
      return;
    }
    if (manualDiscountType === "percentage" && val > 100) {
      setManualDiscountError("Percentage discount cannot exceed 100%.");
      return;
    }
    if (!manualDiscountReason.trim()) {
      setManualDiscountError("A reason is mandatory for manual discount override.");
      return;
    }
    if (!selectedCustomer || cart.length === 0) {
      setManualDiscountError("Select a customer and add items first.");
      return;
    }

    setManualDiscountError(null);
    setIsApplyingManualDiscount(true);
    try {
      const payloadItems: PosSaleItemPayload[] = cart.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id ?? null,
        size: item.size ?? null,
        quantity: item.quantity,
      }));

      const preview = await posService.calculatePreview({
        customer_id: selectedCustomer.id,
        items: payloadItems,
        coupon_code: appliedCouponCode || undefined,
        manual_discount: {
          type: manualDiscountType,
          value: val,
          reason: manualDiscountReason.trim(),
        },
        shipping_cost: 0,
        shipping_method: "POS In-Store Handover",
        payment_method: paymentMethod,
      });

      setAppliedManualDiscount({
        type: manualDiscountType,
        value: val,
        reason: manualDiscountReason.trim(),
      });
      setPreviewTotals(preview);
      setShowManualDiscountForm(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to apply manual discount.";
      setManualDiscountError(msg);
    } finally {
      setIsApplyingManualDiscount(false);
    }
  };

  const handleRemoveManualDiscount = () => {
    setAppliedManualDiscount(null);
    setManualDiscountError(null);
    setManualDiscountValue("");
    setManualDiscountReason("");
  };

  // ── Checkout & Settlement ─────────────────────────────────────────────────

  const subtotal = previewTotals
    ? previewTotals.subtotal
    : cart.reduce((sum, item) => sum + item.line_total, 0);
  const couponDiscountAmount = previewTotals?.coupon_discount_amount ?? 0;
  const manualDiscountAmount = previewTotals?.manual_discount_amount ?? 0;
  const totalDiscount =
    previewTotals?.discount_amount ?? couponDiscountAmount + manualDiscountAmount;
  const taxAmount = previewTotals ? previewTotals.tax_amount : 0;
  const grandTotal = previewTotals
    ? previewTotals.total_amount
    : Math.max(0, subtotal - totalDiscount + taxAmount);
  const totalPcs = previewTotals
    ? previewTotals.total_quantity
    : cart.reduce((sum, item) => sum + item.quantity, 0);

  // Cash settlement computation
  const isCash = paymentMethod === "pos_cash";

  const handleCompleteSale = async () => {
    if (!selectedCustomer) {
      setSubmissionError("Please select or assign a customer for this sale.");
      return;
    }
    if (cart.length === 0) {
      setSubmissionError("The POS cart is empty. Add products before completing sale.");
      return;
    }
    if (!can(ADMIN_PERMISSIONS.POS_CREATE)) {
      setSubmissionError("Your account lacks permission to create POS orders (pos.create).");
      return;
    }
    if (!selectedCustomer || !selectedCustomer.id) {
      setSubmissionError("A valid customer must be selected or registered before completing checkout.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const idempotencyKey = generatePosIdempotencyKey();

    try {
      const payloadItems: PosSaleItemPayload[] = cart.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id ?? null,
        size: item.size ?? null,
        quantity: item.quantity,
      }));

      const order = await posService.completeSale({
        customer_id: selectedCustomer.id,
        items: payloadItems,
        warehouse_id: selectedWarehouseId,
        payment_method: paymentMethod,
        paid_amount: isCash ? grandTotal : 0.00,
        tendered_amount: isCash ? grandTotal : undefined,
        payment_reference: isCash ? undefined : (bankPaymentReference.trim() || undefined),
        payment_note: isCash ? (cashPaymentNote.trim() || undefined) : (bankPaymentNote.trim() || undefined),
        bank_profile_id: isCash ? undefined : (activeBankProfile?.id || selectedBankProfileId),
        bank_name: isCash ? undefined : (activeBankProfile?.bank_name || undefined),
        coupon_code: appliedCouponCode || undefined,
        manual_discount: appliedManualDiscount
          ? {
              type: appliedManualDiscount.type,
              value: appliedManualDiscount.value,
              reason: appliedManualDiscount.reason,
            }
          : undefined,
        shipping_cost: 0,
        shipping_method: "POS In-Store Handover",
        notes: orderNotes.trim() || undefined,
        idempotency_key: idempotencyKey,
      });

      setCreatedOrder(order);
      // Clean terminal state on successful sale
      setCart([]);
      setSelectedCustomer(null);
      setPreviewTotals(null);
      setAppliedCouponCode(null);
      setAppliedManualDiscount(null);
      setCashPaymentNote("");
      setBankPaymentReference("");
      setBankPaymentNote("");
      setOrderNotes("");
    } catch (err: any) {
      console.error("POS transaction failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to complete POS sale transaction. Please check stock and retry.";
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyOrderNumber = () => {
    if (!createdOrder) return;
    navigator.clipboard.writeText(createdOrder.order_number);
    setCopiedOrderNumber(true);
    setTimeout(() => setCopiedOrderNumber(false), 2000);
  };

  const handleApprovePayment = async () => {
    if (!createdOrder) return;
    setIsApprovingPayment(true);
    setOrderActionFeedback(null);
    try {
      const updated = await adminOrderService.reviewPaymentProof(
        createdOrder.id,
        "approve",
        `Payment verified and approved via POS counter by ${adminUser?.name || "Cashier Admin"}`
      );
      setCreatedOrder(updated);
      setOrderActionFeedback({
        type: "success",
        message: "Payment approved successfully! Order status confirmed and physical inventory decremented atomically.",
      });
    } catch (err: any) {
      setOrderActionFeedback({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to approve payment.",
      });
    } finally {
      setIsApprovingPayment(false);
    }
  };

  const handleMarkHandedOver = async () => {
    if (!createdOrder) return;
    setIsUpdatingHandover(true);
    setOrderActionFeedback(null);
    try {
      const updated = await adminOrderService.updateOrderStatus(
        createdOrder.id,
        "delivered",
        `Direct customer pickup/handover confirmed at POS counter by ${adminUser?.name || "Cashier Admin"}`
      );
      setCreatedOrder(updated);
      setOrderActionFeedback({
        type: "success",
        message: "Order marked as Handed Over / Delivered to customer.",
      });
    } catch (err: any) {
      setOrderActionFeedback({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to update order status.",
      });
    } finally {
      setIsUpdatingHandover(false);
    }
  };

  const handleResetForNewSale = () => {
    setCreatedOrder(null);
    setOrderActionFeedback(null);
    setCart([]);
    setSelectedCustomer(null);
    setPreviewTotals(null);
    setSubmissionError(null);
    setAppliedCouponCode(null);
    setAppliedManualDiscount(null);
    setCashPaymentNote("");
    setBankPaymentReference("");
    setBankPaymentNote("");
    setPaymentMethod("pos_cash");
    setOrderNotes("");
  };

  return (
    <AdminPageGate permission={ADMIN_PERMISSIONS.POS_VIEW} moduleName="Point of Sale (POS)">
      <div className="p-3 sm:p-5 max-w-[1720px] mx-auto min-h-screen w-full min-w-0">
        {/* ── TOP HEADER: Terminal Identification & Operator Status ────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/70 mb-5 min-w-0">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0 mt-0.5 sm:mt-0">
              <Store size={20} className="sm:w-[22px] sm:h-[22px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
                  POS Cashier Terminal
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                  Active
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug break-words">
                In-Store Checkout • Cash Tender &amp; Change • Customer Record Association
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs bg-secondary/50 border border-border/80 px-2.5 sm:px-3 py-1.5 rounded-xl min-w-0 max-w-full">
              <ShieldCheck size={14} className="text-primary shrink-0" />
              <span className="text-muted-foreground shrink-0">Cashier:</span>
              <span className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-none" title={adminUser?.name || "Admin"}>
                {adminUser?.name || "Admin"}
              </span>
            </div>

            {warehouses.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-secondary/50 border border-border/80 px-2 sm:px-2.5 py-1.5 rounded-xl min-w-0 max-w-full">
                <WarehouseIcon size={14} className="text-muted-foreground shrink-0" />
                <select
                  value={selectedWarehouseId || ""}
                  onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                  className="bg-transparent text-foreground font-medium text-xs focus:outline-none cursor-pointer truncate max-w-[140px] sm:max-w-[200px]"
                  aria-label="Select Warehouse"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id} className="bg-background text-foreground">
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── ERROR BANNER ────────────────────────────────────────────────────── */}
        {submissionError && (
          <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="text-xs flex-1">
              <span className="font-bold">Transaction Alert: </span>
              <span>{submissionError}</span>
            </div>
            <button
              onClick={() => setSubmissionError(null)}
              className="text-destructive/70 hover:text-destructive p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── COHESIVE 2-COLUMN WORKSPACE: 60% Catalog | 40% Checkout Terminal ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0">
          {/* ══════════════════════════════════════════════════════════════════════
              LEFT COLUMN (~60%): Product Search, Category Pills & Catalog Grid
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-4 min-w-0 max-w-full">
            {/* Search Bar & Product Catalog Filter */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3 min-w-0">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={handleProductSearchKeyDown}
                  placeholder="Search products by name, SKU, or category…"
                  className="w-full pl-10 pr-9 py-2.5 bg-background border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
                  id="pos-product-search-input"
                  autoFocus
                />
                {productSearch && (
                  <button
                    onClick={() => {
                      setProductSearch("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
                {isSearchingProducts && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Category Filter Pills */}
              {categories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 subtle-scrollbar text-xs max-w-full">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategoryId === null
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    All Items
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        String(selectedCategoryId) === String(cat.id)
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inline Product Configuration Panel (when product clicked) */}
            {activeProduct && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/30 shadow-sm space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={activeProduct.image_url}
                      alt={activeProduct.name}
                      className="w-12 h-12 rounded-lg object-cover border border-primary/20 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
                        {activeProduct.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-mono break-words sm:truncate">
                        SKU: {activeProduct.sku} • Base: ${Number(activeProduct.unit_price).toFixed(2)} • Stock: {activeProduct.total_available_stock} pcs
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveProduct(null)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Variant Chips */}
                {activeProduct.has_variants && !activeProduct.has_package_allocations && (
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5 uppercase font-mono tracking-wider">
                      Select Variant / Size:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {activeProduct.variants.map((v) => {
                        const vDisabled = v.stock <= 0 || !v.is_active;
                        const isVSelected = selectedVariantId === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={vDisabled}
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                              vDisabled
                                ? "bg-secondary/30 border-border/40 opacity-40 cursor-not-allowed"
                                : isVSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                                : "bg-card border-border hover:bg-secondary/40 text-foreground"
                            }`}
                          >
                            {v.size || v.title} ({v.stock} in stock)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Package assortment note */}
                {activeProduct.has_package_allocations && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                    Universal assortment package (pre-allocated across sizes).
                  </div>
                )}

                {/* Quantity Stepper & Add Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-primary/20">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium text-muted-foreground">Quantity:</span>
                    <div className="flex items-center border border-border rounded-lg bg-background shadow-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setAddQuantity((prev) =>
                            Math.max(
                              activeProduct.moq || 1,
                              prev - (activeProduct.moq > 1 ? activeProduct.moq : 1)
                            )
                          )
                        }
                        className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        value={addQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setAddQuantity(val);
                        }}
                        className="w-14 text-center text-xs font-mono font-bold bg-transparent focus:outline-none text-foreground"
                        min={activeProduct.moq || 1}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAddQuantity((prev) =>
                            prev + (activeProduct.moq > 1 ? activeProduct.moq : 1)
                          )
                        }
                        className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    {activeProduct.moq > 1 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        (MOQ: {activeProduct.moq})
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    id="btn-add-to-pos-cart"
                  >
                    <Plus size={14} /> Add to Cart
                  </button>
                </div>
              </div>
            )}

            {/* Product Catalog Grid */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-mono font-medium">Catalog Products ({productResults.length})</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Show:
                  </span>
                  <PageSizeSelector
                    value={productPerPage}
                    onChange={(newSize) => {
                      setProductPerPage(newSize);
                      setProductCurrentPage(1);
                    }}
                    id="pos-catalog-page-size"
                  />
                </div>
              </div>

              {productResults.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-border/60 rounded-xl text-muted-foreground text-xs space-y-1">
                  <Package size={28} className="mx-auto opacity-30 mb-2" />
                  <p className="font-semibold text-foreground">No matching products found</p>
                  <p className="text-[11px]">Try adjusting your search query or category filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1">
                  {paginatedProducts.map((product) => {
                    const isSoldOut = product.is_sold_out || product.total_available_stock <= 0;
                    const isSelected = activeProduct?.id === product.id;

                    return (
                      <div
                        key={product.id}
                        onClick={() => !isSoldOut && setActiveProduct(product)}
                        className={`pos-product-card p-3 rounded-xl border text-xs transition-all cursor-pointer flex flex-col justify-between ${
                          isSoldOut
                            ? "bg-secondary/20 border-border/40 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/40"
                            : "bg-background border-border/70 hover:border-border hover:bg-secondary/25"
                        }`}
                      >
                        <div className="flex gap-2.5">
                          <div className="w-12 h-12 rounded-lg bg-secondary/50 overflow-hidden shrink-0 border border-border/60 relative">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate" title={product.name}>
                              {product.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                              SKU: {product.sku}
                            </p>
                            {product.brand && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {product.brand}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-foreground text-xs block">
                              ${Number(product.unit_price).toFixed(2)}
                            </span>
                            {product.moq > 1 && (
                              <span className="text-[9px] text-muted-foreground font-mono">
                                MOQ: {product.moq}
                              </span>
                            )}
                          </div>

                          <div>
                            {isSoldOut ? (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 font-mono">
                                Sold Out
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono ${
                                  product.total_available_stock < 10
                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {product.total_available_stock} Pcs
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* POS Catalog Pagination */}
              {productResults.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <AdminPagination
                    currentPage={productCurrentPage}
                    totalPages={productTotalPages}
                    totalItems={productResults.length}
                    perPage={productPerPage}
                    onPageChange={setProductCurrentPage}
                    onPerPageChange={(newSize) => {
                      setProductPerPage(newSize);
                      setProductCurrentPage(1);
                    }}
                    itemName="catalog products"
                    idPrefix="pos-catalog-pagination"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              RIGHT COLUMN (~40%): Sticky Unified Checkout Register
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4 min-w-0 max-w-full">
            <div className="p-3.5 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-md space-y-4 lg:sticky lg:top-4 min-w-0">
              {/* ── 1. Register Header: Customer Assignment ───────────────────── */}
              <div className="space-y-3 pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserIcon size={15} className="text-primary" />
                    <span className="font-bold text-xs uppercase tracking-wider font-mono text-foreground">
                      {selectedCustomer ? "Customer Details" : "Select Customer"}
                    </span>
                  </div>
                  {selectedCustomer ? (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                      id="btn-pos-change-customer"
                    >
                      <RotateCcw size={11} /> Change Customer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddError(null);
                        setShowQuickAddModal(true);
                      }}
                      className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                      id="btn-pos-quick-add-customer"
                    >
                      <UserPlus size={12} /> Add New Customer
                    </button>
                  )}
                </div>

                {!selectedCustomer ? (
                  <div className="space-y-2.5">
                    {/* Customer search input */}
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customers by name, phone, email, or company…"
                        className="w-full pl-8 pr-3 py-2 bg-background border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        id="pos-customer-search-input"
                      />
                      {isSearchingCustomers && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      {/* Dropdown results */}
                      {showCustomerDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-border/40">
                          {customerResults.length === 0 ? (
                            <div className="p-3 text-center text-xs text-muted-foreground space-y-2">
                              <p>No customer found for &quot;{customerSearch}&quot;.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickAddName(customerSearch);
                                  setShowCustomerDropdown(false);
                                  setShowQuickAddModal(true);
                                }}
                                className="text-primary font-semibold text-[11px] hover:underline inline-flex items-center gap-1"
                              >
                                <UserPlus size={11} /> Register &quot;{customerSearch}&quot; as New Customer
                              </button>
                            </div>
                          ) : (
                            customerResults.map((cust) => (
                              <div
                                key={cust.id}
                                onClick={() => handleSelectCustomer(cust)}
                                className="p-2.5 hover:bg-secondary/40 cursor-pointer flex items-center justify-between transition-colors text-xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                                    {cust.name}
                                    {cust.company_name && (
                                      <span className="text-[10px] text-muted-foreground font-normal truncate">
                                        • {cust.company_name}
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    {cust.phone && <span>📞 {cust.phone}</span>}
                                    {cust.email && <span className="truncate">✉️ {cust.email}</span>}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-primary font-mono shrink-0">
                                  Select →
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick helper note */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>Customer record required for sale</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddError(null);
                          setShowQuickAddModal(true);
                        }}
                        className="font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <UserPlus size={11} /> Quick register
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Selected Customer Card */
                  <div
                    id="pos-selected-customer-card"
                    className="p-3 rounded-xl bg-primary/10 border border-primary/25 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate" title={selectedCustomer.name}>
                            {selectedCustomer.name}
                          </p>
                          {selectedCustomer.company_name && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {selectedCustomer.company_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 bg-background/80 px-2 py-0.5 rounded-full border border-border/40">
                        {selectedCustomer.orders_count ?? 0} {selectedCustomer.orders_count === 1 ? "order" : "orders"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-primary/15 font-mono">
                      {selectedCustomer.phone && (
                        <span className="text-foreground">📞 {selectedCustomer.phone}</span>
                      )}
                      {selectedCustomer.email ? (
                        <span className="truncate">✉️ {selectedCustomer.email}</span>
                      ) : (
                        <span className="text-muted-foreground/70 italic text-[10px]">No email on file</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── 2. Cart Items Container (Scrollable) ───────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart size={15} className="text-primary" />
                    <span className="font-bold text-xs uppercase tracking-wider font-mono text-foreground">
                      Cart Items ({cart.length})
                    </span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border/70 rounded-xl text-muted-foreground text-xs space-y-1">
                    <ShoppingBag size={24} className="mx-auto opacity-30 mb-1.5" />
                    <p className="font-semibold text-foreground">Cart is currently empty</p>
                    <p className="text-[10px]">Select items from catalog on the left to add.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 sm:max-h-64 lg:max-h-52 xl:max-h-64 overflow-y-auto pr-1 divide-y divide-border/40">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-8 h-8 rounded-md object-cover border border-border/60 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate" title={item.product.name}>
                              {item.product.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              <span className="bg-secondary px-1 rounded text-foreground font-medium">
                                {item.size || "Standard"}
                              </span>{" "}
                              • ${Number(item.unit_price).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Stepper & Line Total */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <div className="flex items-center border border-border rounded-md bg-background">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="p-1 hover:bg-secondary text-muted-foreground hover:text-foreground"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-6 sm:w-7 text-center font-mono font-bold text-[11px] text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="p-1 hover:bg-secondary text-muted-foreground hover:text-foreground"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <span className="font-mono font-bold text-foreground w-12 sm:w-14 text-right">
                            ${Number(item.line_total).toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveLine(item.id)}
                            className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 3. Discounts & Coupon Collapsible ──────────────────────────── */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Tag size={13} className="text-primary" />
                    <span className="font-bold text-xs uppercase tracking-wider font-mono text-foreground">
                      Discounts
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Coupon Button / Badge */}
                    {appliedCouponCode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/20">
                        <Tag size={10} /> {appliedCouponCode} (-${couponDiscountAmount.toFixed(2)})
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="hover:text-destructive ml-1"
                          title="Remove coupon"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCouponInput((prev) => !prev)}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono transition-colors"
                      >
                        <Tag size={11} className="text-primary" /> + Coupon
                      </button>
                    )}

                    {/* Manual Discount Button / Badge */}
                    {can(ADMIN_PERMISSIONS.POS_DISCOUNT) && (
                      appliedManualDiscount ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/20">
                          <Percent size={10} /> Admin (-${manualDiscountAmount.toFixed(2)})
                          <button
                            type="button"
                            onClick={handleRemoveManualDiscount}
                            className="hover:text-destructive ml-1"
                            title="Remove admin discount"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowManualDiscountForm((prev) => !prev);
                            setManualDiscountError(null);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono transition-colors"
                        >
                          <Percent size={11} className="text-primary" /> + Admin Discount
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Coupon input form */}
                {showCouponInput && !appliedCouponCode && (
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/80 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Tag size={11} className="text-primary" /> Promo / Coupon Code
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCouponInput(false);
                          setCouponError(null);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Close coupon input"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        placeholder="ENTER PROMO CODE"
                        className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono uppercase text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCodeInput.trim()}
                        className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                      >
                        {isValidatingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                    {couponError && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-medium">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{couponError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Admin Discount form */}
                {showManualDiscountForm && !appliedManualDiscount && (
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/80 text-xs space-y-2.5">
                    {/* Header with dismiss */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Percent size={13} className="text-primary" />
                        <span>Admin Discount Override</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowManualDiscountForm(false);
                          setManualDiscountError(null);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                        title="Close discount form"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Segmented Control: Percentage vs Fixed */}
                    <div className="grid grid-cols-2 p-0.5 rounded-lg bg-secondary/80 border border-border/70 text-xs gap-0.5">
                      <button
                        type="button"
                        onClick={() => setManualDiscountType("percentage")}
                        className={`py-1.5 px-2 text-center text-xs font-medium rounded-md transition-all cursor-pointer ${
                          manualDiscountType === "percentage"
                            ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualDiscountType("fixed")}
                        className={`py-1.5 px-2 text-center text-xs font-medium rounded-md transition-all cursor-pointer ${
                          manualDiscountType === "fixed"
                            ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        }`}
                      >
                        Fixed ($)
                      </button>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label
                          htmlFor="pos-manual-discount-value"
                          className="block text-[11px] font-medium text-muted-foreground"
                        >
                          {manualDiscountType === "percentage" ? "Discount Rate (%)" : "Discount Amount ($)"}
                        </label>
                        <div className="relative">
                          <input
                            id="pos-manual-discount-value"
                            type="number"
                            min="0"
                            max={manualDiscountType === "percentage" ? "100" : undefined}
                            step={manualDiscountType === "percentage" ? "1" : "0.01"}
                            value={manualDiscountValue}
                            onChange={(e) => setManualDiscountValue(e.target.value)}
                            placeholder={manualDiscountType === "percentage" ? "e.g. 10" : "0.00"}
                            className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground pointer-events-none">
                            {manualDiscountType === "percentage" ? "%" : "$"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="pos-manual-discount-reason"
                          className="block text-[11px] font-medium text-muted-foreground"
                        >
                          Reason <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="pos-manual-discount-reason"
                          type="text"
                          value={manualDiscountReason}
                          onChange={(e) => setManualDiscountReason(e.target.value)}
                          placeholder="e.g. Clearance promo"
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Validation error */}
                    {manualDiscountError && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-medium">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{manualDiscountError}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={handleApplyManualDiscount}
                        disabled={isApplyingManualDiscount}
                        id="btn-apply-manual-discount"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50"
                      >
                        <Check size={13} />
                        <span>{isApplyingManualDiscount ? "Applying..." : "Apply Discount"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowManualDiscountForm(false);
                          setManualDiscountError(null);
                        }}
                        disabled={isApplyingManualDiscount}
                        id="btn-cancel-manual-discount"
                        className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground font-medium text-xs transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 4. Financial Totals Breakdown ─────────────────────────────── */}
              <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({totalPcs} pcs):</span>
                  <span className="text-foreground">${subtotal.toFixed(2)}</span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Total Discounts:</span>
                    <span>-${totalDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (In-Store):</span>
                  <span className="text-foreground">${taxAmount.toFixed(2)}</span>
                </div>

                {/* Grand Total Highlight */}
                <div className="pt-2 border-t border-border flex items-baseline justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                    Total Amount Due:
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-foreground font-mono">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* ── 5. Payment Methods & Settlement Interface (Cash & Bank CI) ──── */}
              <div className="pt-2 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider font-mono text-foreground">
                    Payment Method:
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-secondary font-bold text-foreground">
                    {paymentMethod === "pos_cash" ? "Cash Settlement" : "Commercial Bank Transfer"}
                  </span>
                </div>

                {/* Clean Two-Option Payment Selector: Cash vs Bank */}
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    id="pos-payment-method-cash"
                    onClick={() => setPaymentMethod("pos_cash")}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === "pos_cash"
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background border-border hover:bg-secondary/40 text-foreground font-medium"
                    }`}
                  >
                    <Banknote size={16} className="shrink-0" />
                    <span className="text-xs truncate">Cash Payment</span>
                  </button>

                  <button
                    type="button"
                    id="pos-payment-method-bank"
                    onClick={() => setPaymentMethod("bank_transfer")}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === "bank_transfer"
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background border-border hover:bg-secondary/40 text-foreground font-medium"
                    }`}
                  >
                    <Landmark size={16} className="shrink-0" />
                    <span className="text-xs truncate">Bank Transfer (CI)</span>
                  </button>
                </div>

                {/* 1. CASH PAYMENT WORKFLOW */}
                {paymentMethod === "pos_cash" ? (
                  <div className="space-y-2.5 p-3 rounded-xl bg-secondary/30 border border-border/80">
                    {/* Automatic Calculated Cash Payment Summary */}
                    <div
                      id="pos-cash-summary-card"
                      className="p-3 rounded-xl bg-background border border-border space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5 font-mono text-xs">
                          <Coins size={14} className="text-emerald-500" /> Cash Settlement Total:
                        </span>
                        <span className="text-base font-black font-mono text-foreground" id="pos-cash-amount-display">
                          ${grandTotal.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Automatic Settlement: Full calculated sale total (${grandTotal.toFixed(2)}) is automatically assigned as cash tendered and paid. No manual re-entry required.
                      </p>
                    </div>

                    {/* Optional Cash Payment Note */}
                    <div className="space-y-1 pt-1 border-t border-border/50">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <label htmlFor="pos-cash-payment-note" className="cursor-pointer">
                          Payment Note (Optional):
                        </label>
                        <span className="text-[10px] text-muted-foreground/70">Remarks / drawer note</span>
                      </div>
                      <input
                        type="text"
                        id="pos-cash-payment-note"
                        value={cashPaymentNote}
                        onChange={(e) => setCashPaymentNote(e.target.value)}
                        placeholder="e.g. Register drawer #1, Counter cash memo (Optional)"
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                ) : (
                  /* 2. COMMERCIAL BANK TRANSFER WORKFLOW (CI INTEGRATED) */
                  <div className="space-y-3 p-3 rounded-xl bg-secondary/30 border border-border/80 text-xs">
                    {/* Header with Settings Link */}
                    <div className="flex items-center justify-between pb-1 border-b border-border/60">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={14} className="text-primary" />
                        <span className="font-bold text-foreground">Commercial Banking Instructions</span>
                      </div>
                      <Link
                        href="/ayc/settings"
                        target="_blank"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                        title="Configure Authoritative Bank Accounts in Admin Settings"
                      >
                        <Settings size={11} />
                        <span>Settings</span>
                      </Link>
                    </div>

                    {/* Bank Profile Selector if Multiple Accounts Exist */}
                    {bankProfiles.length > 1 && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-muted-foreground">
                          Select Commercial Bank Account:
                        </label>
                        <select
                          value={selectedBankProfileId}
                          onChange={(e) => setSelectedBankProfileId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {bankProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name || p.bank_name} ({p.currency || "USD"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Authoritative CI Bank Details Summary */}
                    <div
                      id="pos-bank-details-summary"
                      className="p-3 rounded-xl bg-background border border-border space-y-2 font-mono text-[11px]"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                        <span className="text-muted-foreground uppercase text-[10px] tracking-wider">
                          Authoritative CI Beneficiary
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                          {activeBankProfile.currency || "USD"} Settlement
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Beneficiary Name:</span>
                          <span className="font-bold text-foreground break-words">
                            {activeBankProfile.account_title || "M/S AYAAN  CLOTHING"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Bank Name:</span>
                          <span className="font-bold text-foreground break-words">
                            {activeBankProfile.bank_name || "Pubali Bank Limited"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Account No / IBAN:</span>
                          <span className="font-bold text-foreground break-words select-all">
                            {activeBankProfile.account_number || "1788-901-044316"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">SWIFT / BIC Code:</span>
                          <span className="font-bold text-foreground uppercase select-all">
                            {activeBankProfile.swift_code || "PUBABDDH210"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-border/60">
                        <span className="text-muted-foreground block text-[10px]">Branch & Address:</span>
                        <span className="text-foreground text-[10px] leading-relaxed">
                          {activeBankProfile.branch_name || activeBankProfile.bank_address || "Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh"}
                        </span>
                      </div>
                    </div>

                    {/* Commercial Workflow Notice (Not Paid Automatically) */}
                    <div
                      id="pos-bank-status-notice"
                      className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] space-y-1"
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle size={14} className="text-amber-600 shrink-0" />
                        <span>Commercial Invoice Payment Workflow</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-muted-foreground">
                        Order will be recorded with <span className="font-bold text-foreground">Pending Payment</span> status and balance due of <span className="font-bold font-mono text-foreground">${grandTotal.toFixed(2)}</span>. Entering bank instructions does not mark an unpaid wire as received. Payment proof will be reviewed and verified through the standard order review flow.
                      </p>
                    </div>

                    {/* Optional Commercial Payment Reference */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <label htmlFor="pos-bank-reference-input" className="cursor-pointer">
                          Commercial Payment Reference (Optional):
                        </label>
                        <span className="text-[10px] text-muted-foreground/70">Wire ref or TT #</span>
                      </div>
                      <input
                        type="text"
                        id="pos-bank-reference-input"
                        value={bankPaymentReference}
                        onChange={(e) => setBankPaymentReference(e.target.value)}
                        placeholder="e.g. Wire TT-2026-8819, Swift ACK, Bank Deposit Slip #"
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>

                    {/* Optional Bank Payment Note */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <label htmlFor="pos-bank-payment-note" className="cursor-pointer">
                          Bank Payment Note (Optional):
                        </label>
                        <span className="text-[10px] text-muted-foreground/70">Remarks or terms</span>
                      </div>
                      <input
                        type="text"
                        id="pos-bank-payment-note"
                        value={bankPaymentNote}
                        onChange={(e) => setBankPaymentNote(e.target.value)}
                        placeholder="e.g. 30% advance on PI, balance prior to bill of lading"
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── 6. Order Notes (Optional) ─────────────────────────────────── */}
              <div>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Order notes, retail counter remark (Optional)…"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* ── 7. Primary Action: Complete Sale Button ───────────────────── */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={
                    !selectedCustomer ||
                    cart.length === 0 ||
                    isSubmitting
                  }
                  className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-complete-pos-sale"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Processing Sale…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Complete Sale (${grandTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[10px] text-center text-muted-foreground font-mono">
                Atomic deduction • Server authoritative calculation
              </div>
            </div>
          </div>
        </div>

        {/* ── QUICK ADD CUSTOMER MODAL ────────────────────────────────────────── */}
        {showQuickAddModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Add New Customer</h3>
                </div>
                <button
                  onClick={() => setShowQuickAddModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={16} />
                </button>
              </div>

              {quickAddError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{quickAddError}</span>
                </div>
              )}

              <form onSubmit={handleQuickAddSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-medium text-foreground block mb-1">
                    Customer Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAddName}
                    onChange={(e) => setQuickAddName(e.target.value)}
                    placeholder="e.g. Tariq Rahman"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    id="quick-add-name-input"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">
                    Phone Number <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAddPhone}
                    onChange={(e) => setQuickAddPhone(e.target.value)}
                    placeholder="+880 1700-000000"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    id="quick-add-phone-input"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={quickAddEmail}
                    onChange={(e) => setQuickAddEmail(e.target.value)}
                    placeholder="customer@example.com (Leave blank if unknown)"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    id="quick-add-email-input"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">
                    Company / Organization (Optional)
                  </label>
                  <input
                    type="text"
                    value={quickAddCompany}
                    onChange={(e) => setQuickAddCompany(e.target.value)}
                    placeholder="e.g. Tariq Outfits"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    id="quick-add-company-input"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickAddModal(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-border text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isQuickAdding || !quickAddName.trim() || !quickAddPhone.trim()}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    id="btn-save-quick-add-customer"
                  >
                    {isQuickAdding ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>Save & Select</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── POS ORDER MANAGEMENT & CONFIRMATION AREA ─────────────────────── */}
        {createdOrder && (() => {
          const statusPresentation = getOrderStatusPresentation(createdOrder);
          const paymentPresentation = getPaymentPresentation(createdOrder.payment_status || "pending");
          const StatusIcon = statusPresentation.icon;
          const isPaid = (createdOrder.payment_status || "").toLowerCase() === "paid";
          const isHandedOver = ["shipped", "delivered"].includes(
            (createdOrder.status || "").toLowerCase()
          );

          return (
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
              id="pos-order-management-modal"
            >
              <div className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between bg-secondary/30 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <span>POS Order Management</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider">
                          Standard AYC Workflow
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Authoritative order lifecycle, payments, and commercial documents
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForNewSale}
                    className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Close & Start New Sale"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-left text-xs">
                  {/* Action Feedback Banner */}
                  {orderActionFeedback && (
                    <div
                      id="pos-order-action-feedback"
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                        orderActionFeedback.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-destructive/10 border-destructive/30 text-destructive"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {orderActionFeedback.type === "success" ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <AlertCircle size={16} />
                        )}
                        <span>{orderActionFeedback.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOrderActionFeedback(null)}
                        className="opacity-70 hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Top Status & Identification Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Order Number & Copy */}
                    <div className="p-3 rounded-xl bg-secondary/40 border border-border flex items-center justify-between font-mono">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                          Order Number
                        </span>
                        <span
                          className="font-bold text-foreground text-sm"
                          id="pos-completion-order-number"
                        >
                          {createdOrder.order_number}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyOrderNumber}
                        id="btn-pos-copy-order-number"
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Copy Order Number"
                      >
                        {copiedOrderNumber ? (
                          <Check size={16} className="text-emerald-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>

                    {/* Customer Profile Card */}
                    <div
                      className="p-3 rounded-xl bg-secondary/40 border border-border flex items-center justify-between"
                      id="pos-order-customer-info"
                    >
                      <div className="truncate pr-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                          Customer Profile
                        </span>
                        <div className="font-bold text-foreground text-xs truncate">
                          {createdOrder.shipping_name || createdOrder.user?.name || "Customer"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {createdOrder.shipping_phone || createdOrder.email || "In-store registered profile"}
                        </div>
                      </div>
                      <UserIcon size={18} className="text-muted-foreground shrink-0" />
                    </div>
                  </div>

                  {/* Canonical Statuses & Permitted Actions */}
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Customer Status:
                        </span>
                        <span
                          id="pos-order-canonical-status"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusPresentation.badgeClass}`}
                        >
                          <StatusIcon size={13} className={statusPresentation.iconClass} />
                          <span>{statusPresentation.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Payment Status:
                        </span>
                        <span
                          id="pos-order-payment-status"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${paymentPresentation.badgeClass}`}
                        >
                          {paymentPresentation.label}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground italic">
                      {statusPresentation.description}
                    </p>

                    {/* In-Modal Lifecycle Transition Controls */}
                    {(!isPaid || (!isHandedOver && isPaid)) && (
                      <div className="pt-1 flex flex-wrap gap-2 items-center">
                        <span className="text-[11px] font-bold text-muted-foreground">
                          Next Permitted Action:
                        </span>

                        {!isPaid && (
                          <button
                            type="button"
                            onClick={handleApprovePayment}
                            disabled={isApprovingPayment}
                            id="btn-pos-approve-payment"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <ShieldCheck size={14} />
                            <span>
                              {isApprovingPayment ? "Approving..." : "Approve & Confirm Payment"}
                            </span>
                          </button>
                        )}

                        {isPaid && !isHandedOver && (
                          <button
                            type="button"
                            onClick={handleMarkHandedOver}
                            disabled={isUpdatingHandover}
                            id="btn-pos-handover-order"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <PackageCheck size={14} />
                            <span>
                              {isUpdatingHandover ? "Updating..." : "Mark as Handed Over"}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Line Items Review Table */}
                  {createdOrder.items && createdOrder.items.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                        <span>Order Items ({createdOrder.items.length})</span>
                        <span>Qty & Price</span>
                      </div>
                      <div
                        className="max-h-36 overflow-y-auto rounded-xl border border-border divide-y divide-border/60 bg-secondary/10"
                        id="pos-order-items-summary"
                      >
                        {createdOrder.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 flex items-center justify-between text-xs hover:bg-secondary/20"
                          >
                            <div className="truncate pr-2">
                              <span className="font-semibold text-foreground block truncate">
                                {item.product_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                SKU: {item.sku || "N/A"}{" "}
                                {item.size ? `• Size: ${item.size}` : ""}{" "}
                                {item.color ? `• Color: ${item.color}` : ""}
                              </span>
                            </div>
                            <div className="text-right shrink-0 font-mono">
                              <span className="font-bold text-foreground">
                                {item.quantity} × {formatCurrency(item.unit_price, createdOrder.currency)}
                              </span>
                              <span className="text-[11px] text-muted-foreground block font-bold">
                                ={" "}
                                {formatCurrency(
                                  item.line_total ||
                                    Number(item.quantity) * Number(item.unit_price),
                                  createdOrder.currency
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Authoritative Financial Breakdown */}
                  <div className="p-3.5 rounded-xl bg-secondary/20 border border-border/80 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(createdOrder.subtotal, createdOrder.currency)}
                      </span>
                    </div>

                    {Number(createdOrder.discount_amount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>
                          Discount {createdOrder.coupon_code ? `(${createdOrder.coupon_code})` : ""}:
                        </span>
                        <span className="font-semibold">
                          -{formatCurrency(createdOrder.discount_amount, createdOrder.currency)}
                        </span>
                      </div>
                    )}

                    {Number(createdOrder.tax_amount || 0) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax:</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(createdOrder.tax_amount, createdOrder.currency)}
                        </span>
                      </div>
                    )}

                    {Number(createdOrder.shipping_cost || 0) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Shipping / Handover:</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(createdOrder.shipping_cost, createdOrder.currency)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between pt-1 border-t border-border/60 text-sm font-bold">
                      <span className="text-foreground">Grand Total:</span>
                      <span className="text-foreground">
                        {formatCurrency(createdOrder.total_amount, createdOrder.currency)}
                      </span>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-border/40 text-xs">
                      <span className="text-muted-foreground">Amount Paid:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(
                          createdOrder.paid_amount ?? (isPaid ? createdOrder.total_amount : 0),
                          createdOrder.currency
                        )}
                      </span>
                    </div>

                    {createdOrder.payment_details?.tendered_amount != null && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Cash Tendered:</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(
                            createdOrder.payment_details.tendered_amount,
                            createdOrder.currency
                          )}
                        </span>
                      </div>
                    )}

                    {createdOrder.payment_details?.change_return != null &&
                      Number(createdOrder.payment_details.change_return) > 0 && (
                        <div className="flex justify-between p-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                          <span>Change Returned:</span>
                          <span>
                            {formatCurrency(
                              createdOrder.payment_details.change_return,
                              createdOrder.currency
                            )}
                          </span>
                        </div>
                      )}

                    {Number(createdOrder.balance_due || 0) > 0 && (
                      <div className="flex justify-between p-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                        <span>Balance Due:</span>
                        <span>{formatCurrency(createdOrder.balance_due, createdOrder.currency)}</span>
                      </div>
                    )}
                  </div>

                  {/* Standard Commercial Documents Hub */}
                  <div className="space-y-2 pt-1" id="pos-commercial-documents-hub">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          Commercial Documents
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Standard documents generated via authoritative AYC document services
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <Link
                        href={`/ayc/documents/OFFER_SHEET/order_${createdOrder.id}`}
                        target="_blank"
                        className="p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-colors flex flex-col justify-between group"
                        id="btn-pos-doc-offersheet"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <FileText
                            size={16}
                            className="text-primary group-hover:scale-110 transition-transform"
                          />
                          <span className="text-[10px] font-mono uppercase bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-bold">
                            OFFER
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-foreground block text-xs">
                            Offer Sheet
                          </span>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Product specifications & commercial offer
                          </span>
                        </div>
                      </Link>

                      <Link
                        href={`/ayc/documents/PROFORMA_INVOICE/order_${createdOrder.id}`}
                        target="_blank"
                        className="p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-colors flex flex-col justify-between group"
                        id="btn-pos-doc-pi"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <FileText
                            size={16}
                            className="text-primary group-hover:scale-110 transition-transform"
                          />
                          <span className="text-[10px] font-mono uppercase bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-bold">
                            PI
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-foreground block text-xs">
                            Proforma Invoice (PI)
                          </span>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Provisional terms & payment instructions
                          </span>
                        </div>
                      </Link>

                      <Link
                        href={`/ayc/documents/COMMERCIAL_INVOICE/order_${createdOrder.id}`}
                        target="_blank"
                        className="p-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col justify-between group"
                        id="btn-pos-doc-ci"
                        data-testid="btn-pos-print-invoice"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Printer
                            size={16}
                            className="text-primary group-hover:scale-110 transition-transform"
                          />
                          <span className="text-[10px] font-mono uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                            CI
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-foreground block text-xs">
                            Commercial Invoice (CI)
                          </span>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Final commercial & export declaration
                          </span>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="p-4 sm:p-5 border-t border-border/70 bg-secondary/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <Link
                    href={`/ayc/orders/${createdOrder.id}`}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-secondary font-bold text-xs text-foreground transition-colors flex items-center justify-center gap-2"
                    id="btn-pos-view-full-order"
                  >
                    <ExternalLink size={14} />
                    <span>Open Full Order Details</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleResetForNewSale}
                    className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    id="btn-pos-new-sale"
                  >
                    <RotateCcw size={14} />
                    <span>New POS Sale</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </AdminPageGate>
  );
}
