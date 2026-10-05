"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  ShoppingBag,
  FileText,
  ArrowRight,
  AlertCircle,
  Trash2,
  Minus,
  Plus,
  Loader2,
} from "lucide-react";
import { useCart, CartItem } from "@/lib/CartContext";
import { useRfq } from "@/lib/RfqContext";
import { useAuth } from "@/lib/AuthContext";
import { formatPrice } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import CheckoutModal from "./CheckoutModal";

export default function MiniCart() {
  const {
    isCartOpen,
    setIsCartOpen,
    items,
    updateQuantity,
    removeFromCart,
    subtotal,
    stockViolations,
  } = useCart();
  const { addToRfq } = useRfq();
  const { user } = useAuth();
  const router = useRouter();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Resume checkout flow seamlessly after guest logs in
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      const path = window.location.pathname;
      // Do not open checkout modal while on transient authentication or login routes
      if (path.startsWith("/auth/") || path.startsWith("/login") || path.startsWith("/signup")) {
        return;
      }
      if (sessionStorage.getItem("ayaan_open_checkout") === "true") {
        sessionStorage.removeItem("ayaan_open_checkout");
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
      }
    }
  }, [user, setIsCartOpen]);

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
      setIsCartOpen(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ayaan_open_checkout", "true");
        sessionStorage.setItem("ayaan_login_notice", "Please log in to continue to checkout.");
        const currentPath = window.location.pathname + window.location.search;
        const returnUrl = currentPath.startsWith("/login") || currentPath.startsWith("/signup") ? "/cart?openCheckout=true" : (currentPath === "/cart" ? "/cart?openCheckout=true" : currentPath);
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}&notice=${encodeURIComponent("Please log in to continue to checkout.")}`);
      }
      return;
    }
    setIsCartOpen(false);
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
    setIsCartOpen(false);
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

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-ink/30 backdrop-blur-xs z-[100] transition-opacity duration-300 ${
          isCartOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Cart Sheet */}
      <div
        className={`fixed top-0 right-0 h-full w-[94vw] sm:w-[480px] md:w-[520px] max-w-[540px] bg-background border-l border-border shadow-2xl z-[110] flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border bg-card/60">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-foreground" />
            <h2 className="font-display font-bold text-base sm:text-lg uppercase tracking-wider text-foreground">
              Shopping Cart
            </h2>
            {items.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-secondary text-foreground tabular-nums">
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 -mr-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Cart Selection Toolbar */}
        {items.length > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-muted/35 border-b border-border/70 text-xs select-none">
            {/* Left: Select All Checkbox + Label */}
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground/80 hover:text-foreground">
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] uppercase tracking-wider font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
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
        )}

        {/* Cart Items List */}
        {items.length > 0 && items.some((item) => Boolean(item.product?.isPreorder || (item.product as any)?.is_preorder)) && (
          <div className="mx-4 sm:mx-5 mt-2.5 mb-1 p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-foreground flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold uppercase tracking-wider bg-indigo-600 text-white leading-none shrink-0">
              PRE-ORDER
            </span>
            <span className="text-[11px] font-medium text-foreground">
              Cart contains Pre-Order items with scheduled factory production.
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 divide-y divide-border/60 font-sans">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground px-6 py-12">
              <div className="w-14 h-14 rounded-full bg-secondary/60 flex items-center justify-center mb-3">
                <ShoppingBag className="w-7 h-7 text-muted-foreground stroke-1" />
              </div>
              <p className="text-base font-semibold text-foreground">Your cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                Add items or request a wholesale quote to get started.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  router.push("/search");
                }}
                className="mt-5 px-5 py-2.5 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Browse Products
              </button>
            </div>
          ) : (
            items.map((item) => {
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
                  className={`py-3 transition-colors ${
                    itemViolation
                      ? "bg-amber-500/5 -mx-4 sm:-mx-5 px-4 sm:px-5 border-y border-amber-500/30 my-0.5"
                      : isSelected
                      ? "bg-muted/10 -mx-4 sm:-mx-5 px-4 sm:px-5"
                      : "-mx-4 sm:-mx-5 px-4 sm:px-5 hover:bg-muted/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
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
                      className={`w-13 h-17 sm:w-14 sm:h-18 aspect-[3/4] object-contain rounded-md bg-secondary/40 border border-border/40 p-0.5 shrink-0 ${
                        isSoldOut ? "opacity-75 grayscale-[0.35]" : ""
                      }`}
                    />

                    {/* Product Info & Controls Container */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch gap-1.5">
                      {/* Top Line: Title on Left, Total Price on Right */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-xs uppercase tracking-tight text-foreground line-clamp-1">
                          {item.product.name}
                        </h3>
                        <div className="text-right shrink-0">
                          {unitPrice > 0 ? (
                            <div className="text-xs sm:text-sm font-bold text-foreground tabular-nums leading-tight">
                              {formatPrice(lineTotal)}
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground">
                              Price on Request
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Line: Brand, Size, Color */}
                      <div className="text-[11px] text-muted-foreground font-medium truncate">
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

                      {/* Bottom Line: Status/MOQ on Left, Stepper + Delete on Right */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {/* Status / MOQ / Unit Price */}
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
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
                                <span className="text-[10px] text-muted-foreground font-medium truncate">
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
                            <span className="text-[10.5px] text-muted-foreground font-medium truncate">
                              MOQ: {itemMoq} pcs
                              {unitPrice > 0 && (
                                <span className="text-muted-foreground/80">
                                  {" "}· {formatPrice(unitPrice)}/pc
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Stepper + Delete Action */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Stepper */}
                          <div className="flex items-center border border-border rounded-md h-6.5 sm:h-7 bg-background shadow-2xs">
                            <button
                              type="button"
                              className="w-5.5 sm:w-6 h-full flex items-center justify-center hover:bg-secondary rounded-l-md transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              onClick={() =>
                                handleUpdateQuantity(
                                  item,
                                  Math.max(itemMoq, item.quantity - itemMoq)
                                )
                              }
                              disabled={item.quantity <= itemMoq || isUpdating}
                              aria-label={`Decrease quantity of ${item.product.name}`}
                            >
                              <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </button>
                            <span className="px-1.5 text-center text-xs font-bold tabular-nums min-w-[28px] sm:min-w-[32px]">
                              {item.quantity.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              className="w-5.5 sm:w-6 h-full flex items-center justify-center hover:bg-secondary rounded-r-md transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              onClick={() =>
                                handleUpdateQuantity(item, item.quantity + itemMoq)
                              }
                              disabled={isUpdating}
                              aria-label={`Increase quantity of ${item.product.name}`}
                            >
                              <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </button>
                          </div>

                          {/* Delete Button */}
                          <button
                            type="button"
                            className="p-1 sm:p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-30"
                            onClick={() => handleDeleteSingle(item)}
                            disabled={isDeleting || isBulkDeleting}
                            aria-label={`Remove ${item.product.name} from cart`}
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Violation Banner */}
                  {itemViolation && (
                    <div className="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-start gap-1.5 animate-in fade-in">
                      <AlertCircle
                        size={14}
                        className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
                      />
                      <span>{itemViolation.message}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Cart Summary */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-border bg-card/60 backdrop-blur-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-body font-bold uppercase tracking-wider">
              <span className="text-muted-foreground">Estimated Subtotal</span>
              <span className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                {formatPrice(subtotal)}
              </span>
            </div>

            {stockViolations.length > 0 && (
              <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>Some items exceed available stock. Please reduce quantities.</span>
              </div>
            )}

            <button
              type="button"
              disabled={stockViolations.length > 0}
              onClick={handleProceedToCheckout}
              className="w-full py-3 rounded-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={handleRequestQuoteFromCart}
              className="w-full py-2.5 rounded-full bg-foreground text-background font-bold text-xs sm:text-sm uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <FileText size={14} />
              <span>Request Wholesale Quote (RFQ)</span>
            </button>
          </div>
        )}
      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </>
  );
}
