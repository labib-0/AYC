"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  FileText,
  ArrowRight,
  AlertCircle,
  Trash2,
  Minus,
  Plus,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Truck,
  HelpCircle,
} from "lucide-react";
import { useCart, CartItem } from "@/lib/CartContext";
import { useRfq } from "@/lib/RfqContext";
import { useAuth } from "@/lib/AuthContext";
import { formatPrice } from "@/lib/formatters";
import CheckoutModal from "@/components/cart/CheckoutModal";

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeFromCart,
    subtotal,
    stockViolations,
    setIsCartOpen,
  } = useCart();
  const { addToRfq } = useRfq();
  const { user } = useAuth();
  const router = useRouter();

  // Close the slide-over drawer when on dedicated cart page
  useEffect(() => {
    setIsCartOpen(false);
  }, [setIsCartOpen]);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Resume checkout flow seamlessly after guest logs in
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      if (sessionStorage.getItem("ayaan_open_checkout") === "true") {
        sessionStorage.removeItem("ayaan_open_checkout");
        setIsCheckoutOpen(true);
      }
    }
  }, [user]);

  // Helper to reliably identify cart items
  const getItemKey = (item: CartItem) =>
    item.id || `${item.product.id}-${item.size || "default"}`;

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [initializedSelection, setInitializedSelection] = useState(false);

  // Loading state tracking
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());

  // Indeterminate Select All ref
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Synchronize selection with cart items
  useEffect(() => {
    if (items.length > 0) {
      if (!initializedSelection) {
        setSelectedKeys(items.map(getItemKey));
        setInitializedSelection(true);
      } else {
        const validKeys = new Set(items.map(getItemKey));
        setSelectedKeys((prev) => prev.filter((k) => validKeys.has(k)));
      }
    } else {
      setSelectedKeys([]);
      setInitializedSelection(false);
    }
  }, [items, initializedSelection]);

  const isAllSelected = items.length > 0 && selectedKeys.length === items.length;
  const isIndeterminate = selectedKeys.length > 0 && selectedKeys.length < items.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(items.map(getItemKey));
    }
  };

  const handleToggleItem = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedKeys.length === 0 || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      const itemsToDelete = items.filter((item) =>
        selectedKeys.includes(getItemKey(item))
      );
      await Promise.all(
        itemsToDelete.map((item) =>
          removeFromCart(item.product.id, item.size, item.id)
        )
      );
      setSelectedKeys([]);
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteSingle = async (item: CartItem) => {
    const key = getItemKey(item);
    if (deletingKeys.has(key)) return;
    setDeletingKeys((prev) => new Set(prev).add(key));
    try {
      await removeFromCart(item.product.id, item.size, item.id);
      setSelectedKeys((prev) => prev.filter((k) => k !== key));
    } catch (err) {
      console.error("Delete item failed:", err);
    } finally {
      setDeletingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleUpdateQuantity = async (item: CartItem, newQty: number) => {
    const key = getItemKey(item);
    if (updatingKeys.has(key) || newQty <= 0) return;
    setUpdatingKeys((prev) => new Set(prev).add(key));
    try {
      await updateQuantity(item.product.id, item.size, newQty, item.id);
    } catch (err) {
      console.error("Update quantity failed:", err);
    } finally {
      setUpdatingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ayaan_open_checkout", "true");
        sessionStorage.setItem("ayaan_login_notice", "Please log in to continue to checkout.");
        router.push(
          `/login?returnUrl=${encodeURIComponent("/cart")}&notice=${encodeURIComponent("Please log in to continue to checkout.")}`
        );
      }
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleRequestQuoteFromCart = () => {
    for (const item of items) {
      addToRfq(
        {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          brand: item.product.brand,
          price: item.product.price,
          images: item.product.images,
          sku: item.product.sku,
          moq: 50,
        } as any,
        item.quantity,
        {
          size: item.size,
          color: (item as any).color || item.product.color,
        }
      );
    }
    if (!user) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ayaan_intended_destination", "/rfq");
        sessionStorage.setItem("ayaan_login_notice", "Please log in to submit an RFQ.");
      }
      router.push(`/login?returnUrl=${encodeURIComponent("/rfq")}&notice=${encodeURIComponent("Please log in to submit an RFQ.")}`);
      return;
    }
    router.push("/rfq");
  };

  const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="min-h-[80vh] bg-background text-foreground pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-semibold">Shopping Cart</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center justify-between pb-5 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-wider text-foreground">
                Shopping Cart
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length > 0
                  ? `${items.length} product${items.length === 1 ? "" : "s"} · ${totalUnits.toLocaleString()} total units`
                  : "Manage your wholesale order and quotation items"}
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <Link
              href="/search"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-block"
            >
              Continue Shopping →
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          /* Empty State */
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-secondary/60 flex items-center justify-center mb-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground stroke-1" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Your cart is empty</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Explore our B2B garment catalog to add wholesale items or submit an RFQ.
            </p>
            <Link
              href="/search"
              className="mt-6 px-6 py-3 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-xs"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          /* Cart Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
            {/* Left 8 Cols: Selection Toolbar + Compact Cart Rows */}
            <div className="lg:col-span-8">
              {/* Pre-order banner */}
              {items.some((item) => Boolean(item.product?.isPreorder || (item.product as any)?.is_preorder)) && (
                <div className="mb-4 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-foreground flex items-center gap-2.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold uppercase tracking-wider bg-indigo-600 text-white leading-none shrink-0">
                    PRE-ORDER
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    Cart contains items currently in factory scheduling or pre-order production.
                  </span>
                </div>
              )}

              {/* Cart Container Card */}
              <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
                {/* Top Selection Toolbar */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-muted/35 border-b border-border text-xs select-none">
                  {/* Left: Select All */}
                  <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-foreground/80 hover:text-foreground">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-border text-foreground accent-foreground cursor-pointer focus:ring-1 focus:ring-ring"
                      aria-label="Select all cart items"
                    />
                    <span className="uppercase tracking-wider text-[11px] font-bold">
                      {selectedKeys.length === 0
                        ? `SELECT ALL (${items.length})`
                        : selectedKeys.length === items.length
                        ? `ALL SELECTED (${items.length})`
                        : `SELECTED ${selectedKeys.length} OF ${items.length}`}
                    </span>
                  </label>

                  {/* Right: Delete Action */}
                  <button
                    type="button"
                    disabled={selectedKeys.length === 0 || isBulkDeleting}
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] uppercase tracking-wider font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    aria-label="Delete selected items"
                  >
                    {isBulkDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>DELETING...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {selectedKeys.length > 0
                            ? `DELETE SELECTED (${selectedKeys.length})`
                            : "DELETE"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Rows List */}
                <div className="divide-y divide-border/60">
                  {items.map((item) => {
                    const key = getItemKey(item);
                    const itemMoq = item.product.moq || 1;
                    const unitPrice = item.unitPrice || item.product.price || 0;
                    const lineTotal = item.lineTotal || unitPrice * item.quantity;
                    const isSelected = selectedKeys.includes(key);
                    const isDeleting = deletingKeys.has(key);
                    const isUpdating = updatingKeys.has(key);
                    const isPreorder = Boolean(
                      item.product.isPreorder || (item.product as any).is_preorder
                    );
                    const isSoldOut = Boolean(
                      item.product.isSoldOut || (item.product as any).is_sold_out
                    );
                    const estDelivery =
                      item.product.estimatedDeliveryDate ||
                      (item.product as any).estimated_delivery_date;
                    const itemViolation = stockViolations.find(
                      (v) =>
                        (v.item_id && v.item_id === item.id) ||
                        (String(v.product_id) === String(item.product.id) &&
                          (v.size === item.size || (!v.size && !item.size)))
                    );

                    return (
                      <div
                        key={key}
                        className={`p-4 sm:p-5 transition-colors ${
                          itemViolation
                            ? "bg-amber-500/5 border-y border-amber-500/30"
                            : isSelected
                            ? "bg-muted/10"
                            : "hover:bg-muted/5"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          {/* Left: Checkbox + Thumbnail + Product Info */}
                          <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItem(key)}
                              className="w-4 h-4 rounded border-border text-foreground accent-foreground cursor-pointer focus:ring-1 focus:ring-ring mt-1 shrink-0"
                              aria-label={`Select ${item.product.name}`}
                            />

                            {/* Thumbnail */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.product.images?.[0] || "/placeholder-image.jpg"}
                              alt={item.product.name}
                              className={`w-14 h-18 sm:w-16 sm:h-20 aspect-[3/4] object-contain rounded-md bg-secondary/40 border border-border/40 p-0.5 shrink-0 ${
                                isSoldOut ? "opacity-75 grayscale-[0.35]" : ""
                              }`}
                            />

                            {/* Product Info */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <Link
                                href={`/products/${item.product.slug}`}
                                className="font-semibold text-xs sm:text-sm uppercase tracking-tight text-foreground hover:text-primary transition-colors line-clamp-2 sm:line-clamp-1 block"
                              >
                                {item.product.name}
                              </Link>
                              <div className="text-xs text-muted-foreground font-medium truncate">
                                {item.product.brand && <span>{item.product.brand} · </span>}
                                <span>Size: {item.size || "Standard"}</span>
                                {Boolean(
                                  item.color || (item as any).color || item.product.color
                                ) && (
                                  <span>
                                    {" "}· Color: {item.color || (item as any).color || item.product.color}
                                  </span>
                                )}
                              </div>

                              {/* Status / MOQ */}
                              <div className="flex items-center gap-2 flex-wrap min-w-0 pt-0.5">
                                {isSoldOut ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold tracking-wider uppercase bg-slate-800 text-white leading-none">
                                    SOLD OUT
                                  </span>
                                ) : isPreorder ? (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold tracking-wider uppercase bg-indigo-600 text-white leading-none shrink-0">
                                      PRE-ORDER
                                    </span>
                                    {estDelivery && (
                                      <span className="text-[11px] text-muted-foreground font-medium truncate">
                                        Exp:{" "}
                                        <strong className="text-foreground">
                                          {new Date(estDelivery).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </strong>
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-medium truncate">
                                    MOQ: {itemMoq} pcs
                                    {unitPrice > 0 && (
                                      <span className="text-muted-foreground/80 sm:hidden">
                                        {" "}· {formatPrice(unitPrice)}/pc
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Row 2 on Mobile (Price + Stepper + Delete) / Right side on Desktop */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-7 sm:pl-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-t-0 shrink-0">
                            {/* Price Breakdown */}
                            <div className="text-left sm:text-right shrink-0">
                              {unitPrice > 0 ? (
                                <div>
                                  <div className="text-sm sm:text-base font-bold text-foreground tabular-nums leading-tight">
                                    {formatPrice(lineTotal)}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-medium hidden sm:block">
                                    {formatPrice(unitPrice)}/pc
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Price on Request
                                </span>
                              )}
                            </div>

                            {/* Stepper + Delete Action */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Stepper */}
                              <div className="flex items-center border border-border rounded-md h-7 sm:h-8 bg-background shadow-2xs">
                                <button
                                  type="button"
                                  className="w-6 sm:w-7 h-full flex items-center justify-center hover:bg-secondary rounded-l-md transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item,
                                      Math.max(itemMoq, item.quantity - itemMoq)
                                    )
                                  }
                                  disabled={item.quantity <= itemMoq || isUpdating}
                                  aria-label={`Decrease quantity of ${item.product.name}`}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2 text-center text-xs sm:text-sm font-bold tabular-nums min-w-[32px] sm:min-w-[40px]">
                                  {item.quantity.toLocaleString()}
                                </span>
                                <button
                                  type="button"
                                  className="w-6 sm:w-7 h-full flex items-center justify-center hover:bg-secondary rounded-r-md transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  onClick={() => handleUpdateQuantity(item, item.quantity + itemMoq)}
                                  disabled={isUpdating}
                                  aria-label={`Increase quantity of ${item.product.name}`}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Delete Button */}
                              <button
                                type="button"
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-30"
                                onClick={() => handleDeleteSingle(item)}
                                disabled={isDeleting || isBulkDeleting}
                                aria-label={`Remove ${item.product.name} from cart`}
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Stock Violation Alert */}
                        {itemViolation && (
                          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-start gap-2">
                            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <span>{itemViolation.message}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Order Summary Panel */}
            <div className="lg:col-span-4">
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs sticky top-24 space-y-5">
                <h2 className="font-display font-bold text-base uppercase tracking-wider text-foreground pb-3 border-b border-border/70">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between text-muted-foreground font-medium">
                    <span>Selected Items</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {selectedKeys.length} of {items.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground font-medium">
                    <span>Total Quantity</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {totalUnits.toLocaleString()} pcs
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground font-medium">
                    <span>Shipping Estimate</span>
                    <span className="text-muted-foreground">Calculated at Checkout</span>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between items-baseline">
                    <span className="font-bold uppercase tracking-wider text-foreground text-sm">
                      Estimated Subtotal
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                </div>

                {stockViolations.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Some items exceed warehouse inventory. Adjust quantities to proceed.</span>
                  </div>
                )}

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    disabled={stockViolations.length > 0}
                    onClick={handleProceedToCheckout}
                    className="w-full py-3.5 rounded-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestQuoteFromCart}
                    className="w-full py-3 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <FileText size={15} />
                    <span>Request Wholesale Quote (RFQ)</span>
                  </button>
                </div>

                {/* B2B Assurance Badges */}
                <div className="pt-4 border-t border-border/70 space-y-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Verified Manufacturer Wholesale Pricing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Factory Direct Global Air & Sea Freight</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Dedicated Export Account Manager</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </div>
  );
}
