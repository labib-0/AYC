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
  CreditCard,
  Banknote,
  Landmark,
  ShieldCheck,
  Copy,
  Check,
  Tag,
  Percent,
  Smartphone,
  Printer,
  X,
  Sparkles,
  ShoppingBag,
  Coins,
  ArrowRight,
  FileText,
} from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";
import { useAdminAuth } from "@/lib/AdminAuthContext";
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
import PosThermalReceiptModal, { formatReceiptCurrency } from "@/components/admin/pos/PosThermalReceiptModal";

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
  const [isLoadingWalkin, setIsLoadingWalkin] = useState(false);

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
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [warehouses, setWarehouses] = useState<PosWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

  // Scanner & Barcode state
  const [scannerFeedback, setScannerFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [showThermalReceiptModal, setShowThermalReceiptModal] = useState(false);

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

  // ── Payment & Cash Tender State ───────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<string>("pos_cash");
  const [tenderedAmountInput, setTenderedAmountInput] = useState<string>("");
  const [isManualTendered, setIsManualTendered] = useState<boolean>(false);
  const [nonCashPaidInput, setNonCashPaidInput] = useState<string>("");
  const [isManualNonCashPaid, setIsManualNonCashPaid] = useState<boolean>(false);
  const [paymentReference, setPaymentReference] = useState<string>("");

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
        const [whs, cats] = await Promise.all([
          posService.getWarehouses(),
          categoryService.getCategories({ all: true }).catch(() => []),
        ]);
        if (mounted) {
          if (whs.length > 0) {
            setWarehouses(whs);
            setSelectedWarehouseId(whs[0].id);
          }
          if (Array.isArray(cats)) {
            setCategories(cats);
          }
        }
        const initialProducts = await posService.searchProducts("", whs[0]?.id || null, 16);
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

  // Customer search with debounce
  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true);
      try {
        const results = await posService.searchCustomers(customerSearch.trim(), 10);
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
          24,
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

  // Auto-dismiss scanner feedback message after 4.5 seconds
  useEffect(() => {
    if (scannerFeedback) {
      const timer = setTimeout(() => {
        setScannerFeedback(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [scannerFeedback]);

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
        const numericTendered = isCash && isManualTendered && tenderedAmountInput !== ""
          ? parseFloat(tenderedAmountInput) || 0
          : undefined;
        const numericPaid = !isCash && isManualNonCashPaid && nonCashPaidInput !== ""
          ? parseFloat(nonCashPaidInput) || 0
          : undefined;

        const preview = await posService.calculatePreview({
          customer_id: selectedCustomer.id > 0 ? selectedCustomer.id : undefined,
          is_walkin: selectedCustomer.is_walkin || selectedCustomer.id === 0,
          items: payloadItems,
          shipping_cost: 0,
          shipping_method: "POS In-Store Fulfillment",
          coupon_code: appliedCouponCode || undefined,
          manual_discount: appliedManualDiscount
            ? {
                type: appliedManualDiscount.type,
                value: appliedManualDiscount.value,
                reason: appliedManualDiscount.reason,
              }
            : undefined,
          payment_method: paymentMethod,
          tendered_amount: numericTendered,
          paid_amount: numericPaid,
        });

        if (isCurrent) {
          setPreviewTotals(preview);

          // Auto-sync cash tender default if not manually typed
          if (isCash && !isManualTendered) {
            setTenderedAmountInput(preview.total_amount.toFixed(2));
          }
          if (!isCash && !isManualNonCashPaid) {
            setNonCashPaidInput(preview.total_amount.toFixed(2));
          }
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
    tenderedAmountInput,
    nonCashPaidInput,
    isManualTendered,
    isManualNonCashPaid,
  ]);

  // ── Customer Handlers ─────────────────────────────────────────────────────

  const handleSelectWalkin = async () => {
    setIsLoadingWalkin(true);
    setSubmissionError(null);
    try {
      const walkin = await posService.getWalkinCustomer();
      setSelectedCustomer(walkin);
      setCustomerSearch("");
      setShowCustomerDropdown(false);
    } catch (err) {
      console.error("Failed to load walk-in customer:", err);
      // Fallback local representation
      setSelectedCustomer({
        id: 0,
        name: "Walk-in Customer",
        email: "walkin@ayaanclothing.com",
        orders_count: 0,
        is_walkin: true,
      });
    } finally {
      setIsLoadingWalkin(false);
    }
  };

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

    setIsQuickAdding(true);
    setQuickAddError(null);

    try {
      const createdOrMatched = await posService.quickCreateCustomer({
        name: quickAddName.trim(),
        phone: quickAddPhone.trim() || undefined,
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
    qtyToAdd?: number,
    fromScanner = false
  ): boolean => {
    if (product.is_sold_out || product.total_available_stock <= 0) {
      const msg = `'${product.name}' is currently sold out.`;
      if (fromScanner) setScannerFeedback({ type: "error", message: msg });
      else setSubmissionError(msg);
      return false;
    }

    const step = product.moq > 1 ? product.moq : 1;
    const quantity = qtyToAdd ?? step;

    // Check MOQ rules
    if (product.moq > 1) {
      if (quantity < product.moq) {
        const msg = `Minimum order quantity for '${product.name}' is ${product.moq} pcs.`;
        if (fromScanner) setScannerFeedback({ type: "error", message: msg });
        else setSubmissionError(msg);
        return false;
      }
      if (quantity % product.moq !== 0) {
        const msg = `Quantity must be an exact multiple of the MOQ (${product.moq} pcs).`;
        if (fromScanner) setScannerFeedback({ type: "error", message: msg });
        else setSubmissionError(msg);
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
        const msg = `Insufficient stock for '${product.name}'. Max available: ${maxStock} pcs.`;
        if (fromScanner) setScannerFeedback({ type: "error", message: msg });
        else setSubmissionError(msg);
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

      const variantTag = variant ? ` (${variant.size || variant.title})` : "";
      if (fromScanner) {
        setScannerFeedback({
          type: "success",
          message: `✓ Updated '${product.name}${variantTag}' — Quantity is now ${newQty} pcs.`,
        });
      }
      return true;
    } else {
      // New line item
      if (quantity > maxStock) {
        const msg = `Insufficient stock for '${product.name}'. Available: ${maxStock} pcs, Requested: ${quantity} pcs.`;
        if (fromScanner) setScannerFeedback({ type: "error", message: msg });
        else setSubmissionError(msg);
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

      const variantTag = variant ? ` (${variant.size || variant.title})` : "";
      if (fromScanner) {
        setScannerFeedback({
          type: "success",
          message: `✓ Scanned & Added '${product.name}${variantTag}' (Qty: ${quantity} pcs).`,
        });
      }
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

    const success = addOrIncrementProduct(activeProduct, chosenVariant, addQuantity, false);
    if (success) {
      setActiveProduct(null);
      setSubmissionError(null);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  };

  /**
   * Fast Keyboard-Wedge Barcode/SKU Scanner Workflow
   * Intercepts 'Enter' keystroke emitted by physical or Bluetooth barcode scanners.
   */
  const handleBarcodeOrSkuKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    const rawCode = productSearch.trim();
    if (!rawCode) return;

    setIsScanning(true);
    setScannerFeedback(null);

    try {
      // 1. Fetch exact or matching products immediately from backend
      const results = await posService.searchProducts(
        rawCode,
        selectedWarehouseId,
        15,
        selectedCategoryId ? Number(selectedCategoryId) : null
      );

      const codeLower = rawCode.toLowerCase();

      // 2. Identify exact matches
      // A product has an exact match if:
      // - product.sku matches code exactly
      // - product.id matches code exactly
      // - any variant.sku matches code exactly
      const exactMatches = results.filter((p) => {
        if (p.sku?.toLowerCase() === codeLower) return true;
        if (String(p.id) === rawCode) return true;
        if (p.variants?.some((v) => v.sku?.toLowerCase() === codeLower)) return true;
        return false;
      });

      const candidateList = exactMatches.length > 0 ? exactMatches : results;

      if (candidateList.length === 0) {
        setScannerFeedback({
          type: "error",
          message: `Product not found for code "${rawCode}".`,
        });
        return;
      }

      if (exactMatches.length > 1) {
        setScannerFeedback({
          type: "warning",
          message: `Multiple exact matches for "${rawCode}". Please select an item from the catalog.`,
        });
        setProductResults(exactMatches);
        return;
      }

      // If no exact match was identified and there are multiple candidate results:
      if (exactMatches.length === 0 && candidateList.length > 1) {
        setScannerFeedback({
          type: "warning",
          message: `Found ${candidateList.length} items matching "${rawCode}". Please select from list.`,
        });
        setProductResults(candidateList);
        return;
      }

      // We have exactly one product to process
      const matchedProduct = exactMatches.length === 1 ? exactMatches[0] : candidateList[0];

      // Check if scanned code matched a specific variant's SKU
      const matchedVariant = matchedProduct.variants?.find(
        (v) => v.sku?.toLowerCase() === codeLower
      );

      if (matchedVariant) {
        // Specific variant was identified
        if (!matchedVariant.is_active || matchedVariant.stock <= 0) {
          setScannerFeedback({
            type: "error",
            message: `Variant '${matchedVariant.title || matchedVariant.size}' for '${matchedProduct.name}' is out of stock.`,
          });
          return;
        }

        const added = addOrIncrementProduct(matchedProduct, matchedVariant, undefined, true);
        if (added) {
          setProductSearch("");
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
        return;
      }

      // Product-level SKU or ID was scanned
      // Check if product requires size/color variant selection
      if (
        matchedProduct.has_variants &&
        !matchedProduct.has_package_allocations &&
        matchedProduct.variants.length > 0
      ) {
        // Do not guess! Open the variant selector flyout
        setActiveProduct(matchedProduct);
        setScannerFeedback({
          type: "warning",
          message: `Scanned '${matchedProduct.name}'. Please select required size / variant.`,
        });
        setProductSearch("");
        return;
      }

      // Variantless or package-allocated product (unambiguous, saleable cart item)
      const added = addOrIncrementProduct(matchedProduct, null, undefined, true);
      if (added) {
        setProductSearch("");
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } catch (err) {
      console.error("Barcode scan error:", err);
      setScannerFeedback({
        type: "error",
        message: `Failed to resolve scanned code "${rawCode}".`,
      });
    } finally {
      setIsScanning(false);
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
        customer_id: selectedCustomer.id > 0 ? selectedCustomer.id : undefined,
        is_walkin: selectedCustomer.is_walkin || selectedCustomer.id === 0,
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
        shipping_method: "POS In-Store Fulfillment",
        payment_method: paymentMethod,
      });

      setAppliedCouponCode(code);
      setPreviewTotals(preview);
      if (!isManualTendered && paymentMethod === "pos_cash") {
        setTenderedAmountInput(preview.total_amount.toFixed(2));
      }
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
    try {
      const payloadItems: PosSaleItemPayload[] = cart.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id ?? null,
        size: item.size ?? null,
        quantity: item.quantity,
      }));

      const preview = await posService.calculatePreview({
        customer_id: selectedCustomer.id > 0 ? selectedCustomer.id : undefined,
        is_walkin: selectedCustomer.is_walkin || selectedCustomer.id === 0,
        items: payloadItems,
        coupon_code: appliedCouponCode || undefined,
        manual_discount: {
          type: manualDiscountType,
          value: val,
          reason: manualDiscountReason.trim(),
        },
        shipping_cost: 0,
        shipping_method: "POS In-Store Fulfillment",
        payment_method: paymentMethod,
      });

      setAppliedManualDiscount({
        type: manualDiscountType,
        value: val,
        reason: manualDiscountReason.trim(),
      });
      setPreviewTotals(preview);
      if (!isManualTendered && paymentMethod === "pos_cash") {
        setTenderedAmountInput(preview.total_amount.toFixed(2));
      }
      setShowManualDiscountForm(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to apply manual discount.";
      setManualDiscountError(msg);
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

  // Cash Tender / Change Computations
  const isCash = paymentMethod === "pos_cash";
  const numericTendered = tenderedAmountInput === "" ? grandTotal : parseFloat(tenderedAmountInput) || 0;
  const isCashInsufficient = isCash && numericTendered < grandTotal;
  const cashChange = isCash && numericTendered >= grandTotal
    ? Math.round((numericTendered - grandTotal) * 100) / 100
    : 0;

  // Non-Cash Paid Computations
  const numericNonCashPaid = nonCashPaidInput === "" ? grandTotal : parseFloat(nonCashPaidInput) || 0;
  const nonCashBalanceDue = Math.max(0, Math.round((grandTotal - numericNonCashPaid) * 100) / 100);

  // Quick cash shortcuts
  const cashShortcuts = useMemo(() => {
    if (grandTotal <= 0) return [];
    const exact = Math.round(grandTotal * 100) / 100;
    const next10 = Math.ceil(grandTotal / 10) * 10;
    const next50 = Math.ceil(grandTotal / 50) * 50;
    const next100 = Math.ceil(grandTotal / 100) * 100;

    const set = new Set<number>();
    set.add(exact);
    if (next10 > exact) set.add(next10);
    if (next50 > exact && next50 !== next10) set.add(next50);
    if (next100 > exact && set.size < 4) set.add(next100);

    return Array.from(set).sort((a, b) => a - b);
  }, [grandTotal]);

  const handleCompleteSale = async () => {
    if (!selectedCustomer) {
      setSubmissionError("Please select or assign a customer for this sale.");
      return;
    }
    if (cart.length === 0) {
      setSubmissionError("The POS cart is empty. Add products before completing sale.");
      return;
    }
    if (isCash && isCashInsufficient) {
      setSubmissionError(
        `Insufficient cash tendered. Total is $${grandTotal.toFixed(2)}, but tendered is $${numericTendered.toFixed(2)}.`
      );
      return;
    }
    if (!isCash && numericNonCashPaid > grandTotal) {
      setSubmissionError(
        `Non-cash payment amount ($${numericNonCashPaid.toFixed(2)}) cannot exceed sale total ($${grandTotal.toFixed(2)}).`
      );
      return;
    }
    if (!can(ADMIN_PERMISSIONS.POS_CREATE)) {
      setSubmissionError("Your account lacks permission to create POS orders (pos.create).");
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

      const isWalkinCustomer = selectedCustomer.is_walkin || selectedCustomer.id === 0;

      const order = await posService.completeSale({
        customer_id: isWalkinCustomer ? undefined : selectedCustomer.id,
        is_walkin: isWalkinCustomer,
        items: payloadItems,
        warehouse_id: selectedWarehouseId,
        payment_method: paymentMethod,
        paid_amount: isCash ? grandTotal : numericNonCashPaid,
        tendered_amount: isCash ? numericTendered : undefined,
        payment_reference: paymentReference.trim() || undefined,
        coupon_code: appliedCouponCode || undefined,
        manual_discount: appliedManualDiscount
          ? {
              type: appliedManualDiscount.type,
              value: appliedManualDiscount.value,
              reason: appliedManualDiscount.reason,
            }
          : undefined,
        shipping_cost: 0,
        shipping_method: "POS In-Store Fulfillment",
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
      setTenderedAmountInput("");
      setIsManualTendered(false);
      setNonCashPaidInput("");
      setIsManualNonCashPaid(false);
      setPaymentReference("");
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

  const handleResetForNewSale = () => {
    setCreatedOrder(null);
    setCart([]);
    setSelectedCustomer(null);
    setPreviewTotals(null);
    setSubmissionError(null);
    setAppliedCouponCode(null);
    setAppliedManualDiscount(null);
    setTenderedAmountInput("");
    setIsManualTendered(false);
    setNonCashPaidInput("");
    setIsManualNonCashPaid(false);
    setPaymentReference("");
    setPaymentMethod("pos_cash");
    setOrderNotes("");
  };

  return (
    <AdminPageGate permission={ADMIN_PERMISSIONS.POS_VIEW} moduleName="Point of Sale (POS)">
      <div className="p-3 sm:p-5 max-w-[1720px] mx-auto min-h-screen">
        {/* ── TOP HEADER: Terminal Identification & Operator Status ────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/70 mb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Store size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  POS Cashier Terminal
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  Phase 2 Live
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                In-Store Checkout • Cash Tender & Change • Instant Walk-in Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs bg-secondary/50 border border-border/80 px-3 py-1.5 rounded-xl">
              <ShieldCheck size={14} className="text-primary" />
              <span className="text-muted-foreground">Cashier:</span>
              <span className="font-semibold text-foreground">{adminUser?.name || "Admin"}</span>
            </div>

            {warehouses.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-secondary/50 border border-border/80 px-2.5 py-1.5 rounded-xl">
                <WarehouseIcon size={14} className="text-muted-foreground" />
                <select
                  value={selectedWarehouseId || ""}
                  onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                  className="bg-transparent text-foreground font-medium text-xs focus:outline-none cursor-pointer"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ══════════════════════════════════════════════════════════════════════
              LEFT COLUMN (~60%): Product Search, Category Pills & Catalog Grid
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-4">
            {/* Search Bar & Scanner Input */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
              {/* Scanner Status & Immediate Feedback Banner */}
              {scannerFeedback && (
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-150 ${
                    scannerFeedback.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                      : scannerFeedback.type === "error"
                      ? "bg-destructive/10 border-destructive/30 text-destructive"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                  }`}
                  id="pos-scanner-feedback-banner"
                >
                  <div className="flex items-center gap-2">
                    {scannerFeedback.type === "success" ? (
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : scannerFeedback.type === "error" ? (
                      <AlertCircle size={15} className="shrink-0 text-destructive" />
                    ) : (
                      <AlertCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>{scannerFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScannerFeedback(null)}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

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
                  onKeyDown={handleBarcodeOrSkuKeyDown}
                  placeholder="Scan barcode / SKU with reader, or search by name…"
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
                {(isSearchingProducts || isScanning) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Category Filter Pills */}
              {categories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={activeProduct.image_url}
                      alt={activeProduct.name}
                      className="w-12 h-12 rounded-lg object-cover border border-primary/20 shrink-0"
                    />
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-foreground">
                        {activeProduct.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        SKU: {activeProduct.sku} • Base: ${Number(activeProduct.unit_price).toFixed(2)} • Stock: {activeProduct.total_available_stock} pcs
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveProduct(null)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
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
                    className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    id="btn-add-to-pos-cart"
                  >
                    <Plus size={14} /> Add to Cart
                  </button>
                </div>
              </div>
            )}

            {/* Product Catalog Grid */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono font-medium">Catalog Products ({productResults.length})</span>
                <span className="text-[11px]">Click card to configure & add</span>
              </div>

              {productResults.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-border/60 rounded-xl text-muted-foreground text-xs space-y-1">
                  <Package size={28} className="mx-auto opacity-30 mb-2" />
                  <p className="font-semibold text-foreground">No matching products found</p>
                  <p className="text-[11px]">Try adjusting your search query or category filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1">
                  {productResults.map((product) => {
                    const isSoldOut = product.is_sold_out || product.total_available_stock <= 0;
                    const isSelected = activeProduct?.id === product.id;

                    return (
                      <div
                        key={product.id}
                        onClick={() => !isSoldOut && setActiveProduct(product)}
                        className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex flex-col justify-between ${
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
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              RIGHT COLUMN (~40%): Sticky Unified Checkout Register
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-md space-y-4 lg:sticky lg:top-4">
              {/* ── 1. Register Header: Customer Assignment ───────────────────── */}
              <div className="space-y-3 pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserIcon size={15} className="text-primary" />
                    <span className="font-bold text-xs uppercase tracking-wider font-mono text-foreground">
                      Customer Assignment
                    </span>
                  </div>
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                      id="btn-pos-change-customer"
                    >
                      <RotateCcw size={11} /> Change
                    </button>
                  )}
                </div>

                {!selectedCustomer ? (
                  <div className="space-y-2.5">
                    {/* Fast Walk-in & Quick Add action bar */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleSelectWalkin}
                        disabled={isLoadingWalkin}
                        className="py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        id="btn-pos-walkin-customer"
                      >
                        {isLoadingWalkin ? (
                          <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles size={13} />
                        )}
                        <span>Walk-in Customer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowQuickAddModal(true)}
                        className="py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        id="btn-pos-quick-add-customer"
                      >
                        <UserPlus size={13} />
                        <span>Quick Add</span>
                      </button>
                    </div>

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
                        placeholder="Search customer by name, email, phone…"
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
                            <div className="p-3 text-center text-xs text-muted-foreground">
                              No customer accounts matched.
                            </div>
                          ) : (
                            customerResults.map((cust) => (
                              <div
                                key={cust.id}
                                onClick={() => handleSelectCustomer(cust)}
                                className="p-2.5 hover:bg-secondary/40 cursor-pointer flex items-center justify-between transition-colors text-xs"
                              >
                                <div>
                                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                                    {cust.name}
                                    {cust.company_name && (
                                      <span className="text-[10px] text-muted-foreground font-normal">
                                        • {cust.company_name}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {cust.phone || cust.email}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-primary font-mono">
                                  Select →
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Selected Customer Card */
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground flex items-center gap-1.5 truncate">
                          {selectedCustomer.name}
                          {selectedCustomer.is_walkin && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                              Walk-in
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {selectedCustomer.phone || selectedCustomer.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                      {selectedCustomer.orders_count} orders
                    </span>
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
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border border-border rounded-md bg-background">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="p-1 hover:bg-secondary text-muted-foreground hover:text-foreground"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-7 text-center font-mono font-bold text-[11px] text-foreground">
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

                          <span className="font-mono font-bold text-foreground w-14 text-right">
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
                  <div className="flex items-center gap-2">
                    {/* Coupon Button */}
                    {appliedCouponCode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
                        <Tag size={10} /> {appliedCouponCode} (-${couponDiscountAmount.toFixed(2)})
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="hover:text-destructive ml-1"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCouponInput((prev) => !prev)}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono"
                      >
                        <Tag size={12} className="text-primary" /> + Coupon
                      </button>
                    )}

                    {/* Manual Discount Button */}
                    {can(ADMIN_PERMISSIONS.POS_DISCOUNT) && (
                      appliedManualDiscount ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-bold border border-purple-500/20">
                          <Percent size={10} /> Override (-${manualDiscountAmount.toFixed(2)})
                          <button
                            type="button"
                            onClick={handleRemoveManualDiscount}
                            className="hover:text-destructive ml-1"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowManualDiscountForm((prev) => !prev)}
                          className="text-[11px] text-muted-foreground hover:text-purple-500 flex items-center gap-1 font-mono"
                        >
                          <Percent size={12} className="text-purple-500" /> + Admin Discount
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Coupon input form */}
                {showCouponInput && !appliedCouponCode && (
                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        placeholder="ENTER PROMO CODE"
                        className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono uppercase text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCodeInput.trim()}
                        className="px-3 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg disabled:opacity-50"
                      >
                        {isValidatingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[10px] text-destructive">{couponError}</p>
                    )}
                  </div>
                )}

                {/* Manual Admin Discount form */}
                {showManualDiscountForm && !appliedManualDiscount && (
                  <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-1 bg-background p-0.5 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setManualDiscountType("percentage")}
                        className={`py-0.5 text-center font-mono text-[10px] rounded ${
                          manualDiscountType === "percentage"
                            ? "bg-purple-600 text-white font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualDiscountType("fixed")}
                        className={`py-0.5 text-center font-mono text-[10px] rounded ${
                          manualDiscountType === "fixed"
                            ? "bg-purple-600 text-white font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        Fixed ($)
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        step={manualDiscountType === "percentage" ? "1" : "0.01"}
                        value={manualDiscountValue}
                        onChange={(e) => setManualDiscountValue(e.target.value)}
                        placeholder={manualDiscountType === "percentage" ? "Value %" : "Amount $"}
                        className="px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none"
                      />
                      <input
                        type="text"
                        value={manualDiscountReason}
                        onChange={(e) => setManualDiscountReason(e.target.value)}
                        placeholder="Reason (Mandatory)"
                        className="px-2 py-1 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      />
                    </div>

                    {manualDiscountError && (
                      <p className="text-[10px] text-destructive">{manualDiscountError}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleApplyManualDiscount}
                        className="flex-1 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors"
                      >
                        Apply Discount
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualDiscountForm(false)}
                        className="px-2 py-1 border border-border text-muted-foreground hover:text-foreground text-xs rounded-lg"
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

              {/* ── 5. Payment Methods & Cash Tender Calculation ──────────────── */}
              <div className="pt-2 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider font-mono text-foreground">
                    Payment Method:
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-secondary font-bold text-foreground">
                    {paymentMethod === "pos_cash" ? "Cash Settlement" : paymentMethod}
                  </span>
                </div>

                {/* Payment Method Switcher */}
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pos_cash")}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === "pos_cash"
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background border-border hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <Banknote size={15} />
                    <span className="text-[10px]">Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === "card"
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background border-border hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <CreditCard size={15} />
                    <span className="text-[10px]">Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank_transfer")}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === "bank_transfer"
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background border-border hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <Landmark size={15} />
                    <span className="text-[10px]">Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mobile_banking")}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === "mobile_banking"
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background border-border hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <Smartphone size={15} />
                    <span className="text-[10px]">Mobile</span>
                  </button>
                </div>

                {/* CASH TENDER & CHANGE SECTION */}
                {paymentMethod === "pos_cash" ? (
                  <div className="space-y-2 p-3 rounded-xl bg-secondary/30 border border-border/80">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-foreground flex items-center gap-1.5 font-mono">
                        <Coins size={14} className="text-emerald-500" /> Cash Tendered ($):
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Due: ${grandTotal.toFixed(2)}
                      </span>
                    </div>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tenderedAmountInput}
                      onChange={(e) => {
                        setIsManualTendered(true);
                        setTenderedAmountInput(e.target.value);
                      }}
                      placeholder={grandTotal.toFixed(2)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      id="pos-cash-tendered-input"
                    />

                    {/* Cash Tender Shortcuts */}
                    {cashShortcuts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {cashShortcuts.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => {
                              setIsManualTendered(true);
                              setTenderedAmountInput(amount.toFixed(2));
                            }}
                            className={`py-1 px-2.5 rounded-lg border text-[11px] font-mono transition-colors ${
                              parseFloat(tenderedAmountInput) === amount
                                ? "bg-primary text-primary-foreground border-primary font-bold"
                                : "bg-card border-border hover:bg-secondary text-foreground font-medium"
                            }`}
                          >
                            ${amount.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* DYNAMIC CHANGE RETURN CARD */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs transition-all ${
                        isCashInsufficient
                          ? "bg-destructive/10 border-destructive/30 text-destructive"
                          : cashChange > 0
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold"
                          : "bg-secondary/60 border-border text-muted-foreground"
                      }`}
                      id="pos-change-return-display"
                    >
                      <div className="flex items-center gap-1.5">
                        {isCashInsufficient ? (
                          <AlertCircle size={15} />
                        ) : (
                          <CheckCircle2 size={15} className="text-emerald-500" />
                        )}
                        <span className="font-semibold uppercase tracking-wider text-[11px]">
                          {isCashInsufficient
                            ? "Insufficient Tender:"
                            : "Change to Return:"}
                        </span>
                      </div>

                      <span className="text-base font-black">
                        {isCashInsufficient
                          ? `-$${Math.max(0, grandTotal - numericTendered).toFixed(2)}`
                          : `$${cashChange.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* NON-CASH PAYMENT FIELDS */
                  <div className="space-y-2.5 p-3 rounded-xl bg-secondary/30 border border-border/80 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="font-medium text-muted-foreground font-mono">
                          Paid Amount ($):
                        </label>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Max: ${grandTotal.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={grandTotal}
                        value={nonCashPaidInput}
                        onChange={(e) => {
                          setIsManualNonCashPaid(true);
                          setNonCashPaidInput(e.target.value);
                        }}
                        placeholder={grandTotal.toFixed(2)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground font-mono">
                        Payment Reference / Slip # (Optional):
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="e.g. Card Slip, bKash Trx ID, Bank Auth #"
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none"
                        id="pos-payment-reference-input"
                      />
                    </div>

                    {nonCashBalanceDue > 0 && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[11px] flex justify-between">
                        <span>Balance Remaining Due:</span>
                        <span className="font-bold">${nonCashBalanceDue.toFixed(2)}</span>
                      </div>
                    )}
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
                    isSubmitting ||
                    (isCash && isCashInsufficient)
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
                  <h3 className="font-bold text-sm text-foreground">Quick Add Customer</h3>
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
                    Phone Number (Recommended)
                  </label>
                  <input
                    type="text"
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
                    placeholder="customer@example.com"
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
                    disabled={isQuickAdding || !quickAddName.trim()}
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

        {/* ── ORDER COMPLETION SUCCESS MODAL ──────────────────────────────────── */}
        {createdOrder && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  POS Sale Completed Successfully!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Order placed and inventory deducted atomically.
                </p>
              </div>

              {/* Order Number Banner */}
              <div className="p-3 rounded-xl bg-secondary/50 border border-border flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block text-left">
                    Order Number
                  </span>
                  <span className="font-bold text-foreground" id="pos-completion-order-number">{createdOrder.order_number}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy Order Number"
                >
                  {copiedOrderNumber ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              {/* Order Quick Details */}
              <div className="text-xs text-left p-3.5 rounded-xl bg-secondary/20 border border-border/60 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sale Amount:</span>
                  <span className="font-bold text-foreground">
                    {formatReceiptCurrency(createdOrder.total_amount, createdOrder.currency)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatReceiptCurrency(createdOrder.paid_amount ?? createdOrder.total_amount, createdOrder.currency)}
                  </span>
                </div>

                {/* Show Cash Tender & Change if returned */}
                {createdOrder.payment_details?.tendered_amount != null && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cash Tendered:</span>
                    <span className="font-semibold text-foreground">
                      {formatReceiptCurrency(createdOrder.payment_details.tendered_amount, createdOrder.currency)}
                    </span>
                  </div>
                )}

                {createdOrder.payment_details?.change_return != null &&
                  Number(createdOrder.payment_details.change_return) > 0 && (
                    <div className="flex justify-between p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                      <span>Change Returned:</span>
                      <span>
                        {formatReceiptCurrency(createdOrder.payment_details.change_return, createdOrder.currency)}
                      </span>
                    </div>
                  )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium text-foreground truncate max-w-[200px]">
                    {createdOrder.shipping_name}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium text-foreground uppercase text-[10px]">
                    {createdOrder.payment_method}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowThermalReceiptModal(true)}
                  className="py-2.5 px-3 rounded-xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn-pos-open-thermal-receipt"
                >
                  <Printer size={15} /> Thermal Receipt (58/80mm)
                </button>

                <Link
                  href={`/ayc/documents/INVOICE/order_${createdOrder.id}`}
                  target="_blank"
                  className="py-2.5 px-3 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-foreground font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  id="btn-pos-print-invoice"
                >
                  <FileText size={15} /> Export A4 Invoice
                </Link>

                <Link
                  href={`/ayc/orders/${createdOrder.id}`}
                  className="py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-secondary font-bold text-xs text-foreground transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={14} /> View Order Record
                </Link>

                <button
                  type="button"
                  onClick={handleResetForNewSale}
                  className="py-2.5 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  id="btn-pos-new-sale"
                >
                  <RotateCcw size={14} /> New Sale
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated 58mm / 80mm Thermal Receipt Modal */}
        <PosThermalReceiptModal
          isOpen={showThermalReceiptModal}
          order={createdOrder}
          cashierName={adminUser?.name}
          onClose={() => setShowThermalReceiptModal(false)}
        />
      </div>
    </AdminPageGate>
  );
}
