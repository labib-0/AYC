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
  const router = useRouter();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

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
      for (const item of itemsToDelete) {
        await removeFromCart(item.product.id, item.size, item.id);
      }
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
          <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-muted/40 border-b border-border/70 text-xs select-none">
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
                  ? `Select All (${items.length})`
                  : selectedKeys.length === items.length
                  ? `All Selected (${items.length})`
                  : `Selected ${selectedKeys.length} of ${items.length}`}
              </span>
            </label>

            {/* Right: Delete Action */}
            <button
              type="button"
              disabled={selectedKeys.length === 0 || isBulkDeleting}
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] uppercase tracking-wider font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              aria-label="Delete selected items"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete{selectedKeys.length > 0 ? ` (${selectedKeys.length})` : ""}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-1 divide-y divide-border/60 font-sans">
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
                      ? "bg-amber-500/5 -mx-4 sm:-mx-5 px-4 sm:px-5 rounded-lg border border-amber-500/30 my-1"
                      : ""
                  }`}
                >
                  {/* DESKTOP LAYOUT (sm:flex hidden) */}
                  <div className="hidden sm:flex sm:items-center sm:gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleItem(key)}
                      className="w-4 h-4 rounded border-border text-foreground accent-foreground cursor-pointer focus:ring-1 focus:ring-ring shrink-0"
                      aria-label={`Select ${item.product.name}`}
                    />

                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.product.images?.[0] || "/placeholder-image.jpg"}
                      alt={item.product.name}
                      className="w-13 h-16 aspect-[3/4] object-contain rounded-md bg-secondary/50 dark:bg-white/5 shrink-0 border border-border/40 p-0.5"
                    />

                    {/* Product Information */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-xs uppercase tracking-tight text-foreground line-clamp-1">
                        {item.product.name}
                      </h3>
                      <div className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                        {item.product.brand && <span>{item.product.brand} · </span>}
                        <span>Size: {item.size || "Standard"}</span>
                        {Boolean(
                          item.color || (item as any).color || item.product.color
                        ) && (
                          <span>
                            {" "}
                            · Color:{" "}
                            {item.color ||
                              (item as any).color ||
                              item.product.color}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {isPreorder ? (
                          <>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold tracking-wider uppercase bg-indigo-600 text-white leading-none">
                              Preorder
                            </span>
                            {estDelivery && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                Est:{" "}
                                {new Date(estDelivery).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            MOQ: {itemMoq} pcs
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      {unitPrice > 0 ? (
                        <>
                          <div className="text-xs font-bold text-foreground tabular-nums">
                            {formatPrice(lineTotal)}
                          </div>
                          <div className="text-[10.5px] text-muted-foreground tabular-nums font-medium">
                            {formatPrice(unitPrice)}/pc
                          </div>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">
                          Price on Request
                        </span>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center border border-border rounded-md h-7 bg-background shrink-0">
                      <button
                        type="button"
                        className="w-6 h-full flex items-center justify-center hover:bg-secondary rounded-l-md transition-colors font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
                      <span className="px-1.5 text-center text-xs font-bold tabular-nums min-w-[32px]">
                        {item.quantity.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        className="w-6 h-full flex items-center justify-center hover:bg-secondary rounded-r-md transition-colors font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        onClick={() =>
                          handleUpdateQuantity(item, item.quantity + itemMoq)
                        }
                        disabled={isUpdating}
                        aria-label={`Increase quantity of ${item.product.name}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer shrink-0"
                      onClick={() => handleDeleteSingle(item)}
                      disabled={isDeleting}
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* MOBILE LAYOUT (sm:hidden flex flex-col) */}
                  <div className="flex sm:hidden flex-col gap-2.5">
                    {/* Row 1: Checkbox + Thumbnail + Product Info */}
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(key)}
                        className="w-4 h-4 rounded border-border text-foreground accent-foreground cursor-pointer focus:ring-1 focus:ring-ring mt-1 shrink-0"
                        aria-label={`Select ${item.product.name}`}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.product.images?.[0] || "/placeholder-image.jpg"}
                        alt={item.product.name}
                        className="w-12 h-15 aspect-[3/4] object-contain rounded-md bg-secondary/50 dark:bg-white/5 shrink-0 border border-border/40 p-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs uppercase tracking-tight text-foreground line-clamp-1">
                          {item.product.name}
                        </h3>
                        <div className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                          {item.product.brand && <span>{item.product.brand} · </span>}
                          <span>Size: {item.size || "Standard"}</span>
                          {Boolean(
                            item.color || (item as any).color || item.product.color
                          ) && (
                            <span>
                              {" "}
                              ·{" "}
                              {item.color ||
                                (item as any).color ||
                                item.product.color}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {isPreorder ? (
                            <>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold tracking-wider uppercase bg-indigo-600 text-white leading-none">
                                Preorder
                              </span>
                              {estDelivery && (
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  Est:{" "}
                                  {new Date(estDelivery).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              MOQ: {itemMoq} pcs
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Price + Quantity Stepper + Delete */}
                    <div className="flex items-center justify-between pl-6.5 pt-1 border-t border-border/30">
                      <div>
                        {unitPrice > 0 ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-foreground tabular-nums">
                              {formatPrice(lineTotal)}
                            </span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              ({formatPrice(unitPrice)}/pc)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground">
                            Price on Request
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-border rounded-md h-6.5 bg-background">
                          <button
                            type="button"
                            className="w-5.5 h-full flex items-center justify-center hover:bg-secondary rounded-l-md transition-colors font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            onClick={() =>
                              handleUpdateQuantity(
                                item,
                                Math.max(itemMoq, item.quantity - itemMoq)
                              )
                            }
                            disabled={item.quantity <= itemMoq || isUpdating}
                            aria-label={`Decrease quantity of ${item.product.name}`}
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-1 text-center text-xs font-bold tabular-nums min-w-[28px]">
                            {item.quantity.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            className="w-5.5 h-full flex items-center justify-center hover:bg-secondary rounded-r-md transition-colors font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            onClick={() =>
                              handleUpdateQuantity(item, item.quantity + itemMoq)
                            }
                            disabled={isUpdating}
                            aria-label={`Increase quantity of ${item.product.name}`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                          onClick={() => handleDeleteSingle(item)}
                          disabled={isDeleting}
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

                  {/* Stock violation alert */}
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
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
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
