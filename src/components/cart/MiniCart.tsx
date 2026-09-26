"use client";

import { useState } from "react";
import { X, ShoppingBag, FileText, ArrowRight, AlertCircle } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useRfq } from "@/lib/RfqContext";
import { formatPrice } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import CheckoutModal from "./CheckoutModal";

export default function MiniCart() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, subtotal, stockViolations } = useCart();
  const { addToRfq } = useRfq();
  const router = useRouter();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

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
        className={`fixed inset-0 bg-ink/30 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isCartOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`} 
        onClick={() => setIsCartOpen(false)}
      />
      
      {/* Cart Sheet */}
      <div className={`fixed top-0 right-0 h-full w-[90vw] max-w-[400px] bg-background border-l border-border shadow-2xl z-[110] flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
        isCartOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-display font-bold text-xl uppercase tracking-wider">Shopping Cart</h2>
          <button 
            onClick={() => setIsCartOpen(false)}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 font-sans">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mb-4 stroke-1" />
              <p className="text-sm font-medium">Your cart is empty</p>
              <p className="text-sm mt-1">Add items or request a wholesale quote</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 sm:gap-4">
              {items.map((item) => {
                const itemMoq = item.product.moq || 1;
                const unitPrice = item.unitPrice || item.product.price;
                const lineTotal = item.lineTotal || (unitPrice * item.quantity);
                const pkgCount = Math.max(1, Math.round(item.quantity / itemMoq));
                const itemViolation = stockViolations.find((v) =>
                  (v.item_id && v.item_id === item.id) ||
                  (String(v.product_id) === String(item.product.id) && (v.size === item.size || (!v.size && !item.size)))
                );

                return (
                  <div key={`${item.product.id}-${item.size || 'pkg'}`} className={`flex flex-col gap-2 p-3 rounded-xl bg-card border shadow-xs ${
                    itemViolation ? "border-amber-500/50 bg-amber-500/5" : "border-border/60"
                  }`}>
                    <div className="flex gap-3.5 items-start">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product.name} 
                        className="w-14 sm:w-15 aspect-[3/4] object-contain object-center rounded-lg bg-secondary/50 dark:bg-white/5 shrink-0 border border-border/40 p-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-body font-semibold text-[14px] sm:text-[15px] uppercase tracking-tight truncate text-foreground">{item.product.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
                          {item.product.brand ? `${item.product.brand} · ` : ""}Universal Package ({pkgCount} {pkgCount === 1 ? "pkg" : "pkgs"} · {item.quantity} pcs)
                        </p>
                        
                        <div className="flex items-baseline justify-between mt-1 font-sans">
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {formatPrice(unitPrice)} <span className="text-xs text-muted-foreground font-medium">/ pc</span>
                          </span>
                          <span className="text-[13px] font-bold text-foreground tabular-nums">
                            Subtotal: {formatPrice(lineTotal)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 font-sans">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border border-border rounded-lg h-7 bg-background">
                              <button 
                                className="w-7 h-full flex items-center justify-center hover:bg-secondary rounded-l-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                onClick={() => updateQuantity(item.product.id, item.size, Math.max(itemMoq, item.quantity - itemMoq), item.id)}
                                disabled={item.quantity <= itemMoq}
                                aria-label="Decrease packages"
                              >−</button>
                              <span className="px-2 text-center text-xs font-bold tabular-nums">
                                {pkgCount} <span className="text-[10px] text-muted-foreground font-normal">pkgs</span>
                              </span>
                              <button 
                                className="w-7 h-full flex items-center justify-center hover:bg-secondary rounded-r-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold text-xs cursor-pointer"
                                onClick={() => updateQuantity(item.product.id, item.size, item.quantity + itemMoq, item.id)}
                                aria-label="Increase packages"
                              >+</button>
                            </div>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              ({item.quantity} pcs)
                            </span>
                          </div>
                          <button 
                            className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                            onClick={() => removeFromCart(item.product.id, item.size, item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    {itemViolation && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-start gap-1.5 animate-in fade-in">
                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <span>{itemViolation.message}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-border bg-secondary/30 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between text-[15px] font-body font-bold uppercase tracking-wider">
              <span>Estimated Subtotal</span>
              <span className="text-lg tabular-nums">{formatPrice(subtotal)}</span>
            </div>

            {stockViolations.length > 0 && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>Some items exceed available stock. Please reduce quantities to proceed.</span>
              </div>
            )}

            <button
              type="button"
              disabled={stockViolations.length > 0}
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              className="w-full py-3.5 rounded-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleRequestQuoteFromCart}
              className="w-full py-2.5 rounded-full bg-foreground text-background font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <FileText size={15} />
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
