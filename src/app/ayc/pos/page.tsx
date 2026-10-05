"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Store,
  Search,
  User,
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
import { OrderRecord } from "@/services/order.service";

interface CartLineItem {
  id: string; // temporary line id
  product: PosProduct;
  variant?: PosVariant | null;
  size?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export default function AdminPosPage() {
  const { adminUser, can } = useAdminAuth();

  // ── Global POS State ──────────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // ── Catalog & Search State ────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<PosProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [warehouses, setWarehouses] = useState<PosWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

  // Active product being configured to add
  const [activeProduct, setActiveProduct] = useState<PosProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [addQuantity, setAddQuantity] = useState<number>(1);

  // ── Cart & Line Items ─────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [previewTotals, setPreviewTotals] = useState<PosCalculationPreview | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // ── Checkout & Options ────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<string>("pos_cash");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderRecord | null>(null);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

  // Load initial warehouses and default products
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const whs = await posService.getWarehouses();
        if (mounted && whs.length > 0) {
          setWarehouses(whs);
          setSelectedWarehouseId(whs[0].id);
        }
        const initialProducts = await posService.searchProducts("", whs[0]?.id || null, 12);
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

  // Product search with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearchingProducts(true);
      try {
        const results = await posService.searchProducts(
          productSearch.trim(),
          selectedWarehouseId,
          20
        );
        setProductResults(results);
      } catch (err) {
        console.error("Product search error:", err);
      } finally {
        setIsSearchingProducts(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [productSearch, selectedWarehouseId]);

  // Sync activeProduct selection defaults
  useEffect(() => {
    if (activeProduct) {
      if (activeProduct.has_variants && activeProduct.variants.length > 0) {
        // default to first active variant in stock if available
        const firstInStock = activeProduct.variants.find((v) => v.stock > 0 && v.is_active);
        setSelectedVariantId(firstInStock ? firstInStock.id : activeProduct.variants[0].id);
      } else {
        setSelectedVariantId(null);
      }
      setAddQuantity(activeProduct.moq || 1);
    }
  }, [activeProduct]);

  // Authoritative live recalculation preview whenever cart or customer changes
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

        const preview = await posService.calculatePreview({
          customer_id: selectedCustomer.id,
          items: payloadItems,
          shipping_cost: 0,
          shipping_method: "POS In-Store Fulfillment",
        });

        if (isCurrent) {
          setPreviewTotals(preview);
        }
      } catch (err) {
        console.error("Calculation error:", err);
      } finally {
        if (isCurrent) setIsCalculating(false);
      }
    };

    recalculate();

    return () => {
      isCurrent = false;
    };
  }, [cart, selectedCustomer]);

  // ── Actions ───────────────────────────────────────────────────────────────

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

  const handleAddToCart = () => {
    if (!activeProduct) return;

    if (activeProduct.is_sold_out || activeProduct.total_available_stock <= 0) {
      setSubmissionError(`'${activeProduct.name}' is currently sold out.`);
      return;
    }

    let chosenVariant: PosVariant | null = null;
    let sizeLabel = "Assorted";

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
      if (chosenVariant.stock < addQuantity) {
        setSubmissionError(
          `Insufficient variant stock. Available: ${chosenVariant.stock} pcs, Requested: ${addQuantity} pcs.`
        );
        return;
      }
      sizeLabel = chosenVariant.size || chosenVariant.title;
    } else {
      if (activeProduct.total_available_stock < addQuantity) {
        setSubmissionError(
          `Insufficient stock. Available: ${activeProduct.total_available_stock} pcs, Requested: ${addQuantity} pcs.`
        );
        return;
      }
    }

    if (activeProduct.moq > 1) {
      if (addQuantity < activeProduct.moq) {
        setSubmissionError(
          `Minimum order quantity for '${activeProduct.name}' is ${activeProduct.moq} pcs.`
        );
        return;
      }
      if (addQuantity % activeProduct.moq !== 0) {
        setSubmissionError(
          `Quantity must be an exact multiple of the MOQ (${activeProduct.moq} pcs).`
        );
        return;
      }
    }

    // Determine unit price based on quantity or variant
    let effectiveUnitPrice = chosenVariant?.price ?? activeProduct.unit_price;
    if (activeProduct.pricing_tiers?.length > 0) {
      for (const tier of activeProduct.pricing_tiers) {
        if (
          addQuantity >= tier.min_quantity &&
          (tier.max_quantity == null || addQuantity <= tier.max_quantity)
        ) {
          effectiveUnitPrice = tier.unit_price;
          break;
        }
      }
    }

    const lineId = `${activeProduct.id}_${chosenVariant?.id || "base"}_${Date.now()}`;
    const newLine: CartLineItem = {
      id: lineId,
      product: activeProduct,
      variant: chosenVariant,
      size: sizeLabel,
      quantity: addQuantity,
      unit_price: effectiveUnitPrice,
      line_total: Math.round(effectiveUnitPrice * addQuantity * 100) / 100,
    };

    setCart((prev) => {
      // Check if item already exists in cart, update quantity if identical
      const existingIdx = prev.findIndex(
        (i) => i.product.id === newLine.product.id && i.variant?.id === newLine.variant?.id
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + newLine.quantity;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          line_total: Math.round(updated[existingIdx].unit_price * newQty * 100) / 100,
        };
        return updated;
      }
      return [...prev, newLine];
    });

    setActiveProduct(null);
    setSubmissionError(null);
  };

  const handleUpdateQuantity = (lineId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id !== lineId) return item;
          const step = item.product.moq > 1 ? item.product.moq : 1;
          const newQty = item.quantity + delta * step;
          if (newQty <= 0) return null;

          // Check availability
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

  const handleCompleteSale = async () => {
    if (!selectedCustomer) {
      setSubmissionError("Please select a customer for this sale.");
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

    setIsSubmitting(true);
    setSubmissionError(null);

    const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload: PosSaleItemPayload[] = cart.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id ?? null,
        size: item.size ?? null,
        quantity: item.quantity,
      }));

      const order = await posService.completeSale({
        customer_id: selectedCustomer.id,
        items: payload,
        warehouse_id: selectedWarehouseId,
        payment_method: paymentMethod,
        shipping_cost: 0,
        shipping_method: "POS In-Store Fulfillment",
        notes: orderNotes.trim() || undefined,
        idempotency_key: idempotencyKey,
      });

      setCreatedOrder(order);
      // Clear cart on success
      setCart([]);
      setSelectedCustomer(null);
      setPreviewTotals(null);
      setOrderNotes("");
    } catch (err: any) {
      console.error("POS transaction failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to complete POS sale transaction. Please check stock levels and retry.";
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
    setOrderNotes("");
  };

  // ── Render Calculations ───────────────────────────────────────────────────
  const subtotal = previewTotals
    ? previewTotals.subtotal
    : cart.reduce((sum, item) => sum + item.line_total, 0);
  const taxAmount = previewTotals ? previewTotals.tax_amount : Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = previewTotals ? previewTotals.total_amount : subtotal + taxAmount;
  const totalPcs = previewTotals
    ? previewTotals.total_quantity
    : cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AdminPageGate permission={ADMIN_PERMISSIONS.POS_VIEW} moduleName="Point of Sale (POS)">
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto min-h-screen">
        {/* ── POS Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border/60 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Store size={22} />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Point of Sale (POS)
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
                    Phase 1
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct In-Store Counter & Manual B2B Order Entry
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs bg-secondary/50 border border-border/80 px-3 py-1.5 rounded-lg">
              <ShieldCheck size={14} className="text-primary" />
              <span className="text-muted-foreground">Operator:</span>
              <span className="font-semibold text-foreground">{adminUser?.name || "Admin"}</span>
            </div>
            {warehouses.length > 0 && (
              <div className="flex items-center gap-2 text-xs bg-secondary/50 border border-border/80 px-3 py-1.5 rounded-lg">
                <WarehouseIcon size={14} className="text-muted-foreground" />
                <select
                  value={selectedWarehouseId || ""}
                  onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                  className="bg-transparent text-foreground font-medium focus:outline-none cursor-pointer"
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

        {/* ── Error Banner ────────────────────────────────────────────────────── */}
        {submissionError && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 animate-in fade-in duration-200">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold">Action Required</p>
              <p className="mt-0.5 opacity-90">{submissionError}</p>
            </div>
          </div>
        )}

        {/* ── Main 2-Column POS Layout ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN: Customers + Catalog + Line Items (8 Cols) ────────── */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Customer Selection Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">
                    1. Select Customer
                  </h2>
                </div>
                {selectedCustomer && (
                  <button
                    onClick={handleClearCustomer}
                    className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={12} /> Change Customer
                  </button>
                )}
              </div>

              {!selectedCustomer ? (
                <div className="relative">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search existing customer by Name, Email, Phone, Company or ID…"
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    {isSearchingCustomers && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Customer Search Dropdown */}
                  {showCustomerDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-border/40">
                      {customerResults.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No matching registered customers found.
                        </div>
                      ) : (
                        customerResults.map((cust) => (
                          <div
                            key={cust.id}
                            onClick={() => handleSelectCustomer(cust)}
                            className="p-3 hover:bg-secondary/40 cursor-pointer flex items-center justify-between transition-colors text-xs"
                          >
                            <div className="space-y-0.5">
                              <p className="font-semibold text-foreground flex items-center gap-2">
                                {cust.name}
                                {cust.company_name && (
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    • {cust.company_name}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail size={11} /> {cust.email}
                                </span>
                                {cust.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={11} /> {cust.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-mono text-muted-foreground block">
                                {cust.orders_count} past orders
                              </span>
                              <span className="text-[10px] text-primary font-semibold">Select →</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Customer Card */
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-primary/5 border border-primary/20 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-mono text-sm border border-primary/20">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground flex items-center gap-2">
                        {selectedCustomer.name}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                          ID: #{selectedCustomer.id}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                        {selectedCustomer.company_name && (
                          <span className="flex items-center gap-1">
                            <Building2 size={11} /> {selectedCustomer.company_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Mail size={11} /> {selectedCustomer.email}
                        </span>
                        {selectedCustomer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> {selectedCustomer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {selectedCustomer.orders_count}
                    </span>{" "}
                    historical orders
                  </div>
                </div>
              )}
            </div>

            {/* 2. Product Search & Catalog Add */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">
                    2. Search & Add Products
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {productResults.length} items found
                </span>
              </div>

              {/* Product Search Input */}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product by Name, SKU, Style, Brand, or Product ID…"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                {isSearchingProducts && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Products Results Grid / Horizontal List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
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
                          ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30"
                          : "bg-card border-border/70 hover:border-border hover:bg-secondary/20"
                      }`}
                    >
                      <div className="flex gap-2.5">
                        <div className="w-12 h-12 rounded-lg bg-secondary/50 overflow-hidden shrink-0 border border-border/50 relative">
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
                              Brand: {product.brand}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-foreground block">
                            ${Number(product.unit_price).toFixed(2)}
                          </span>
                          {product.moq > 1 && (
                            <span className="text-[9px] text-muted-foreground block font-mono">
                              MOQ: {product.moq} pcs
                            </span>
                          )}
                        </div>

                        <div>
                          {isSoldOut ? (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                              Sold Out
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono ${
                                product.total_available_stock < 10
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              }`}
                            >
                              {product.total_available_stock} Avail
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Configure Active Product Modal/Panel */}
              {activeProduct && (
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/80 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-foreground">
                        Configure: {activeProduct.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Base Price: ${Number(activeProduct.unit_price).toFixed(2)} • Available:{" "}
                        {activeProduct.total_available_stock} pcs
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveProduct(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Variant Selection (if discrete variants) */}
                  {activeProduct.has_variants && !activeProduct.has_package_allocations && (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
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
                                  : "bg-background border-border hover:bg-secondary/40 text-foreground"
                              }`}
                            >
                              {v.size || v.title} ({v.stock} in stock)
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Universal Package Assortment Notice */}
                  {activeProduct.has_package_allocations && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px]">
                      <strong>Universal Assortment:</strong> Sold as complete assorted wholesale
                      packages according to size/colour inventory ratios.
                    </div>
                  )}

                  {/* Quantity Stepper & Add Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Quantity:</span>
                      <div className="flex items-center border border-border rounded-lg bg-background">
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
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          value={addQuantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setAddQuantity(val);
                          }}
                          className="w-16 text-center text-xs font-mono font-bold bg-transparent focus:outline-none text-foreground"
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
                          <Plus size={14} />
                        </button>
                      </div>
                      {activeProduct.moq > 1 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          (Step: {activeProduct.moq})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Plus size={14} /> Add to POS Sale
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Sale Items Table (Cart) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">
                    3. POS Sale Items ({cart.length})
                  </h2>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-border/50 rounded-xl text-muted-foreground text-xs space-y-2">
                  <ShoppingCart size={28} className="mx-auto opacity-40 mb-2" />
                  <p className="font-semibold text-foreground">No sale items added yet.</p>
                  <p className="text-[11px]">
                    Select a customer and add products above to build the POS invoice.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3">Variant / Type</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-center">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {cart.map((item) => (
                        <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="w-9 h-9 rounded-md object-cover border border-border shrink-0"
                              />
                              <div className="min-w-0 max-w-[200px]">
                                <p className="font-bold text-foreground truncate">
                                  {item.product.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono truncate">
                                  {item.variant?.sku || item.product.sku}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-secondary font-medium text-foreground">
                              {item.size || "Standard"}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-medium text-foreground">
                            ${Number(item.unit_price).toFixed(2)}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                className="w-6 h-6 rounded bg-secondary/80 hover:bg-secondary text-foreground flex items-center justify-center transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-10 text-center font-mono font-bold text-foreground">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                className="w-6 h-6 rounded bg-secondary/80 hover:bg-secondary text-foreground flex items-center justify-center transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                            ${Number(item.line_total).toFixed(2)}
                          </td>

                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => handleRemoveLine(item.id)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Checkout & Live Financials (4 Cols) ─────────────── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-sm space-y-5 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-primary" />
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider font-mono">
                    Sale Summary
                  </h3>
                </div>
                {isCalculating && (
                  <span className="text-[10px] font-mono text-primary animate-pulse">
                    Calculating…
                  </span>
                )}
              </div>

              {/* Customer Indicator */}
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 text-xs space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block">
                  Buyer Attribution:
                </span>
                {selectedCustomer ? (
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>{selectedCustomer.name}</span>
                    <span className="text-[10px] font-mono text-primary font-normal">
                      #{selectedCustomer.id}
                    </span>
                  </div>
                ) : (
                  <p className="text-destructive font-medium flex items-center gap-1.5">
                    <AlertCircle size={13} /> No Customer Selected
                  </p>
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-2 uppercase font-mono tracking-wider">
                  Payment Method:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pos_cash")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === "pos_cash"
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                        : "bg-background border-border hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <Banknote size={16} />
                    <span className="text-[11px]">Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === "card"
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                        : "bg-background border-border hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <CreditCard size={16} />
                    <span className="text-[11px]">Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank_transfer")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === "bank_transfer"
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                        : "bg-background border-border hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <Landmark size={16} />
                    <span className="text-[11px]">Bank</span>
                  </button>
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5 uppercase font-mono tracking-wider">
                  Sale Notes (Optional):
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Cash counter notes, walk-in reference, or special packaging notes…"
                  rows={2}
                  className="w-full p-2.5 bg-background border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Authoritative Financial Breakdown */}
              <div className="space-y-2 pt-2 border-t border-border/50 text-xs font-mono">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal ({totalPcs} pcs)</span>
                  <span className="text-foreground">${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tax (5% Gov Standard)</span>
                  <span className="text-foreground">${taxAmount.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>In-Store Handover</span>
                  <span className="text-emerald-500 font-semibold">$0.00</span>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-foreground tracking-wider block">
                      Grand Total
                    </span>
                    <span className="text-[10px] text-muted-foreground">USD Currency</span>
                  </div>
                  <span className="text-2xl font-black text-foreground">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Button: Complete Sale */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={!selectedCustomer || cart.length === 0 || isSubmitting}
                  className="w-full py-3.5 bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Processing Sale…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Complete Sale</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[10px] text-center text-muted-foreground">
                Authoritative transaction creates real Ayaan order & updates inventory immediately.
              </div>
            </div>
          </div>
        </div>

        {/* ── Order Completion Success Modal ──────────────────────────────────── */}
        {createdOrder && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  POS Sale Completed Successfully!
                </h3>
                <p className="text-xs text-muted-foreground">
                  A real Ayaan Clothing order has been created and inventory deducted.
                </p>
              </div>

              {/* Order Number Banner */}
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block text-left">
                    Order Number
                  </span>
                  <span className="font-bold text-foreground">{createdOrder.order_number}</span>
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
                  <span className="text-muted-foreground">Total Paid:</span>
                  <span className="font-bold text-foreground">
                    ${Number(createdOrder.total_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium text-foreground">{createdOrder.shipping_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <span className="text-emerald-500 font-bold uppercase text-[10px]">
                    {createdOrder.payment_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Source:</span>
                  <span className="text-amber-500 font-bold uppercase text-[10px]">POS</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href={`/ayc/orders/${createdOrder.id}`}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-secondary font-bold text-xs text-foreground transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={14} /> View Order
                </Link>

                <button
                  type="button"
                  onClick={handleResetForNewSale}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RotateCcw size={14} /> Start New Sale
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPageGate>
  );
}
