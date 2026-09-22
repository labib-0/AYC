"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { X, Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { useProductModal } from "@/lib/ProductModalContext";
import { useCart } from "@/lib/CartContext";
import ProductGallery from "@/components/product/ProductGallery";
import ProductBrandLogoOverlay from "@/components/common/ProductBrandLogoOverlay";
import ProductPromotionBadges from "@/components/common/ProductPromotionBadges";
import { Product } from "@/types";

type ExtendedProduct = Product & {
  stock?: number;
  colorName?: string;
  colors?: string[];
  brand_logo?: string;
  color_name?: string;
  size?: string;
};

export default function ProductQuickAddModal() {
  const { selectedProduct: rawProduct, closeProductModal } = useProductModal();
  const product = rawProduct as ExtendedProduct | null;
  const { addToCart, setIsCartOpen } = useCart();

  const [quantity, setQuantity] = useState(0);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const moq = product?.moq ?? 1;
  const step = product?.quantityStep ?? moq;
  const stock = product?.availableStock ?? product?.stock ?? 9999;

  // Derive Brand information
  const brandName = useMemo(() => {
    if (!product) return "";
    return typeof product.brand === "string"
      ? product.brand
      : "";
  }, [product]);

  const brandLogo = useMemo(() => {
    if (!product) return undefined;
    return product.brandLogo || product.brand_logo;
  }, [product]);

  // Derive Display Size (customer-facing value, never raw count)
  const displaySize = useMemo(() => {
    if (!product) return "One Size";
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      return product.sizes.join(", ");
    }
    return product.size || "One Size";
  }, [product]);

  // Derive Display Color (customer-facing name, never raw count)
  const displayColor = useMemo(() => {
    if (!product) return "Standard";
    if (product.colorName) return product.colorName;
    if (product.color) return product.color;
    if (product.color_name) return product.color_name;
    if (Array.isArray(product.colors) && product.colors.length > 0) {
      return product.colors.join(", ");
    }
    return "Standard";
  }, [product]);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(moq);
      setAddedSuccess(false);
    }
  }, [product, moq]);

  // Escape key closes modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeProductModal();
    };
    if (product) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [product, closeProductModal]);

  const decreaseQty = useCallback(() => {
    setQuantity((prev) => Math.max(moq, prev - step));
  }, [moq, step]);

  const increaseQty = useCallback(() => {
    setQuantity((prev) => Math.min(stock, prev + step));
  }, [stock, step]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const size = product.sizes?.[0] ?? "One Size";
    addToCart(product, size, quantity);
    setAddedSuccess(true);
    setTimeout(() => {
      closeProductModal();
      setIsCartOpen(true);
    }, 800);
  }, [product, quantity, addToCart, closeProductModal, setIsCartOpen]);

  if (!product) return null;

  const isVisible = !!product;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-ink/60 backdrop-blur-xs z-[200] transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeProductModal}
      />

      {/* Modal Container */}
      <div
        className={`fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4 transition-all duration-300 ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
        onClick={closeProductModal}
      >
        <div
          className="bg-background w-full max-w-[680px] max-h-[85vh] sm:max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border/70"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── LEVEL 1 & 2: Header (Product Name + Brand/SKU Metadata) ─── */}
          <div className="flex items-start justify-between px-5 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-3.5 border-b border-border/60">
            <div className="min-w-0 mr-3">
              <h2 className="text-base sm:text-lg font-display font-semibold text-foreground tracking-tight truncate">
                {product.name}
              </h2>
              <p className="text-xs text-muted-foreground font-sans font-medium mt-0.5 tracking-normal">
                {brandName ? `${brandName.toUpperCase()} · ` : ""}{(product.designType || "").toUpperCase() === "MASTER COPY" ? "MASTER COPY" : "ORIGINAL"} · SKU: {product.sku ?? "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={closeProductModal}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close product modal"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>

          {/* ─── Body (Two-Column Layout: Media + Compact Ordering) ─── */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="flex flex-col md:flex-row items-stretch">
              {/* ═══ LEFT: Product Media (Shared ProductGallery with Full Experience) ═══ */}
              <div className="md:w-[44%] md:shrink-0 p-4 sm:p-5 flex flex-col items-center justify-start">
                <ProductGallery
                  images={product.images && product.images.length > 0 ? product.images : ["/placeholder.jpg"]}
                  productName={product.name}
                  productSlug={product.slug}
                  videoUrl={product.videoUrl || (product as any).video_url}
                  youtubeVideoId={(product as any).youtubeVideoId}
                  youtubeEmbedUrl={(product as any).youtubeEmbedUrl}
                  variant="modal"
                  overlayContent={
                    <>
                      <ProductPromotionBadges product={product} variant="modal" />
                      <ProductBrandLogoOverlay
                        brandName={brandName}
                        brandLogo={brandLogo}
                        size="modal"
                        className="top-2.5 right-2.5"
                      />
                    </>
                  }
                />
              </div>

              {/* ═══ RIGHT: LEVEL 3, 4, 5 (Product Info + Quantity + Add to Cart) ═══ */}
              <div className="md:w-[56%] p-4 sm:p-5 md:pl-1 flex flex-col justify-between gap-4">
                {/* LEVEL 3: Product Facts (Clean, non-duplicated) */}
                <div>
                  <h3 className="text-[11px] font-sans font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Product Information
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 p-3 sm:p-3.5 bg-secondary/40 rounded-xl border border-border/40 font-sans">
                    <InfoItem label="Brand" value={brandName || "—"} />
                    <InfoItem
                      label="Design Type"
                      value={
                        (product.designType || "").toUpperCase() === "MASTER COPY"
                          ? "MASTER COPY"
                          : "ORIGINAL"
                      }
                    />
                    <InfoItem label="Stock" value={`${stock.toLocaleString()} pcs`} />
                    <InfoItem label="Size" value={displaySize} />
                    <InfoItem label="Color" value={displayColor} />
                  </div>
                </div>

                {/* LEVEL 4 & 5: Order Quantity & Add to Cart */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Order Quantity
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center border border-border rounded-xl h-11 bg-secondary/20">
                        <button
                          type="button"
                          onClick={decreaseQty}
                          disabled={quantity <= moq}
                          className="w-10 sm:w-11 h-full flex items-center justify-center hover:bg-secondary rounded-l-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={15} strokeWidth={2} />
                        </button>
                        <span className="w-12 sm:w-14 text-center text-sm sm:text-base font-bold tabular-nums font-sans select-none">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={increaseQty}
                          disabled={quantity >= stock}
                          className="w-10 sm:w-11 h-full flex items-center justify-center hover:bg-secondary rounded-r-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Increase quantity"
                        >
                          <Plus size={15} strokeWidth={2} />
                        </button>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground font-sans">pcs</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5 font-sans">
                      {step === moq
                        ? `Multiples of ${step} pcs`
                        : `Minimum order: ${moq} pcs · Multiples of ${step} pcs`}
                    </p>
                  </div>

                  {/* LEVEL 5: Add to Cart (Dominant Primary Action) */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={addedSuccess}
                    className={`w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-sans font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs ${
                      addedSuccess
                        ? "bg-emerald-600 text-white cursor-default"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]"
                    }`}
                  >
                    {addedSuccess ? (
                      <>
                        <Check size={16} strokeWidth={2.5} />
                        <span>Added to Cart</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} strokeWidth={2} />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── LEVEL 6: Footer (Secondary Action: View Full Specifications) ─── */}
          <div className="px-5 sm:px-6 py-2.5 sm:py-3 bg-secondary/30 border-t border-border/50 flex items-center justify-center">
            <Link
              href={`/products/${product.slug}`}
              onClick={closeProductModal}
              className="inline-flex items-center justify-center gap-1.5 py-1 px-3 text-xs font-sans font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>View Full Product Specifications</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans font-medium">
        {label}
      </dt>
      <dd className="text-xs sm:text-sm font-sans font-semibold text-foreground mt-0.5 truncate" title={value}>
        {value}
      </dd>
    </div>
  );
}
