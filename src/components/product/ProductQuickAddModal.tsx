"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { X, Minus, Plus, ShoppingCart, Check, FileText, AlertCircle } from "lucide-react";
import { useProductModal } from "@/lib/ProductModalContext";
import { useCart } from "@/lib/CartContext";
import { useRfq } from "@/lib/RfqContext";
import ProductGallery from "@/components/product/ProductGallery";
import ProductBrandLogoOverlay from "@/components/common/ProductBrandLogoOverlay";
import ProductPromotionBadges from "@/components/common/ProductPromotionBadges";
import { Product } from "@/types";
import { getLowestValidCustomerUnitPrice } from "@/lib/product-pricing";

type ExtendedProduct = Product & {
  stock?: number;
  colorName?: string;
  colors?: string[];
  brand_logo?: string;
  color_name?: string;
  size?: string;
  max_complete_packages?: number;
  maxCompletePackages?: number;
  complete_package_stock?: number;
  completePackageStock?: number;
  package_allocations?: Array<{
    id?: number | string;
    package_name?: string;
    product_variant_id?: number | string;
    color?: string;
    size?: string;
    quantity: number;
  }>;
  packageAllocations?: Array<{
    id?: number | string;
    package_name?: string;
    product_variant_id?: number | string;
    color?: string;
    size?: string;
    quantity: number;
  }>;
  variants?: Array<{
    id: number | string;
    size?: string;
    color?: string;
    stock?: number;
    sku?: string;
  }>;
};

export default function ProductQuickAddModal() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedProduct: rawProduct, closeProductModal } = useProductModal();
  const product = rawProduct as ExtendedProduct | null;
  const { addToCart, setIsCartOpen } = useCart();
  const { addToRfq } = useRfq();

  const [packageCount, setPackageCount] = useState<number>(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [addedRfqSuccess, setAddedRfqSuccess] = useState(false);

  const moq = Math.max(1, product?.moq ?? 1);

  // Predefined Package Assortment Allocations
  const packageAllocations = useMemo(() => {
    if (!product) return [];
    const list = product.package_allocations || product.packageAllocations || [];
    return Array.isArray(list) ? list : [];
  }, [product]);

  const variantsList = useMemo<any[]>(() => {
    if (!product?.variants) return [];
    return Array.isArray(product.variants)
      ? (product.variants as any[])
      : (typeof product.variants === "object" ? (Object.values(product.variants) as any[]) : []);
  }, [product]);

  const isPreorder = Boolean(product?.isPreorder || (product as any)?.is_preorder);
  const isSoldOut = Boolean(product?.isSoldOut || (product as any)?.is_sold_out);
  const estimatedDelivery = product?.estimatedDeliveryDate || (product as any)?.estimated_delivery_date;

  // Authoritative Maximum Complete Packages Supported by Live Variant Inventory
  const maxCompletePackages = useMemo<number>(() => {
    if (!product) return 0;
    if (isSoldOut) return 0;
    if (isPreorder) return 9999;
    if (typeof product.max_complete_packages === "number") {
      return product.max_complete_packages;
    }
    if (typeof product.maxCompletePackages === "number") {
      return product.maxCompletePackages;
    }
    if (packageAllocations.length === 0) {
      const rawStock = Number(product.availableStock ?? product.stock ?? 0);
      return Math.floor(rawStock / moq);
    }

    let minPackages: number | null = null;
    for (const alloc of packageAllocations) {
      const allocQty = Number(alloc.quantity) || 0;
      if (allocQty <= 0) continue;

      const vMatch = variantsList.find(
        (v: any) =>
          (alloc.product_variant_id && String(v.id) === String(alloc.product_variant_id)) ||
          (v.color?.toLowerCase() === alloc.color?.toLowerCase() && v.size?.toLowerCase() === alloc.size?.toLowerCase())
      );
      const vStock = Number(vMatch?.stock ?? 0);
      const supported = Math.floor(vStock / allocQty);
      if (minPackages === null || supported < minPackages) {
        minPackages = supported;
      }
    }
    return Math.max(0, minPackages ?? 0);
  }, [product, moq, packageAllocations, variantsList, isPreorder, isSoldOut]);

  // Authoritative Complete Package Stock (in total pcs)
  const completePackageStock = useMemo(() => {
    if (isSoldOut) return 0;
    if (isPreorder) return 9999;
    if (typeof product?.complete_package_stock === "number") {
      return product.complete_package_stock;
    }
    if (typeof product?.completePackageStock === "number") {
      return product.completePackageStock;
    }
    return maxCompletePackages * moq;
  }, [product, maxCompletePackages, moq, isPreorder, isSoldOut]);

  const totalQuantity = packageCount * moq;

  // Group allocations by color for informational breakdown presentation
  const groupedBreakdown = useMemo(() => {
    if (packageAllocations.length === 0) return [];
    const groups: Record<string, Array<{ size: string; quantity: number }>> = {};

    packageAllocations.forEach((alloc) => {
      const color = alloc.color || "Standard";
      const size = alloc.size || "M";
      const qty = Number(alloc.quantity) || 0;
      if (!groups[color]) groups[color] = [];
      groups[color].push({ size, quantity: qty });
    });

    return Object.entries(groups).map(([color, sizes]) => ({
      color,
      sizes,
      subtotal: sizes.reduce((sum, s) => sum + s.quantity, 0),
    }));
  }, [packageAllocations]);

  // Scaled breakdown for current package count
  const currentOrderBreakdown = useMemo(() => {
    return packageAllocations.map((a) => ({
      product_variant_id: a.product_variant_id ? Number(a.product_variant_id) : null,
      color: a.color || "Standard",
      size: a.size || "M",
      quantity: (Number(a.quantity) || 0) * packageCount,
    }));
  }, [packageAllocations, packageCount]);

  // Derive Brand information
  const brandName = useMemo(() => {
    if (!product) return "";
    return typeof product.brand === "string" ? product.brand : "";
  }, [product]);

  const brandLogo = useMemo(() => {
    if (!product) return undefined;
    return product.brandLogo || product.brand_logo || (product as any).brand_data?.logo_url || (product as any).brand_data?.logo;
  }, [product]);

  // Reset state when product opens
  useEffect(() => {
    if (product) {
      setPackageCount(1);
      setAddedSuccess(false);
      setStockError(null);
    }
  }, [product]);

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

  const decreasePackages = useCallback(() => {
    setStockError(null);
    setPackageCount((prev) => Math.max(1, prev - 1));
  }, []);

  const increasePackages = useCallback(() => {
    setStockError(null);
    setPackageCount((prev) => Math.min(isPreorder ? 9999 : (maxCompletePackages > 0 ? maxCompletePackages : 9999), prev + 1));
  }, [maxCompletePackages, isPreorder]);

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    if (isSoldOut) {
      setStockError("This product is sold out and cannot be purchased.");
      return;
    }
    const lowestPrice = getLowestValidCustomerUnitPrice(product);
    const hasValidPrice = lowestPrice !== null && lowestPrice > 0;
    if (!hasValidPrice) {
      setStockError("This product does not have a configured customer selling price. Please request a quote.");
      return;
    }
    if (!isPreorder && completePackageStock > 0 && totalQuantity > completePackageStock) {
      setStockError(
        `Requested ${totalQuantity.toLocaleString()} pcs exceeds available stock of ${completePackageStock.toLocaleString()} pcs.`
      );
      return;
    }
    setStockError(null);
    try {
      await addToCart(product, "Assorted", totalQuantity, undefined, currentOrderBreakdown);
      setAddedSuccess(true);
      setTimeout(() => {
        closeProductModal();
        setIsCartOpen(true);
      }, 800);
    } catch (err: any) {
      setStockError(err?.message || "Failed to add product to cart.");
    }
  }, [product, isPreorder, isSoldOut, packageCount, totalQuantity, maxCompletePackages, completePackageStock, currentOrderBreakdown, addToCart, closeProductModal, setIsCartOpen]);

  const handleAddToRfq = useCallback(() => {
    if (!product) return;
    addToRfq(product, totalQuantity, {
      size: "Assorted",
      color: "Standard",
      buyerNotes: `Quantity: ${totalQuantity.toLocaleString()} pcs`,
    });
    closeProductModal();
    if (!user) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ayaan_intended_destination", "/rfq");
        sessionStorage.setItem("ayaan_login_notice", "Please log in to submit an RFQ.");
      }
      router.push(`/login?returnUrl=${encodeURIComponent("/rfq")}&notice=${encodeURIComponent("Please log in to submit an RFQ.")}`);
      return;
    }
    setAddedRfqSuccess(true);
    setTimeout(() => {
      setAddedRfqSuccess(false);
    }, 800);
  }, [product, packageCount, totalQuantity, addToRfq, closeProductModal, user, router]);

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
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Quick View: ${product.name}`}
        className={`fixed inset-0 z-[201] flex items-center justify-center p-3 sm:p-4 pointer-events-none overflow-y-auto ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`relative w-full max-w-3xl bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden pointer-events-auto transition-all duration-300 transform font-sans ${
            isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={closeProductModal}
            aria-label="Close modal"
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 w-8 h-8 rounded-full bg-background/80 hover:bg-background border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all backdrop-blur-xs cursor-pointer shadow-xs"
          >
            <X size={16} strokeWidth={2} />
          </button>

          {/* Modal Header */}
          <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border/70 flex items-baseline justify-between gap-3">
            <div className="min-w-0 pr-8">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-primary block truncate">
                {brandName || "Ayaan Export"} • Universal Package Wholesale
              </span>
              <h2 className="text-base sm:text-lg font-display font-extrabold uppercase tracking-tight text-foreground truncate mt-0.5">
                {product.name}
              </h2>
            </div>
            <div className="shrink-0 text-right">
              {(() => {
                const lowestPrice = getLowestValidCustomerUnitPrice(product);
                return lowestPrice !== null && lowestPrice > 0 ? (
                  <div className="text-lg sm:text-xl font-display font-extrabold text-foreground tabular-nums">
                    ${lowestPrice.toFixed(2)}
                    <span className="text-xs font-sans font-normal text-muted-foreground ml-1">/ pc</span>
                  </div>
                ) : (
                  <div className="text-sm sm:text-base font-sans font-bold text-muted-foreground">
                    Price on Request
                  </div>
                );
              })()}
              <span className="text-[10.5px] font-sans font-semibold text-muted-foreground block">
                MOQ: {moq} pcs
              </span>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 max-h-[calc(85vh-120px)] overflow-y-auto">
            <div className="flex flex-col md:flex-row gap-5">
              
              {/* ═══ LEFT: Media Experience (Gallery) ═══ */}
              <div className="md:w-[44%] shrink-0">
                <ProductGallery
                  images={product.images && product.images.length > 0 ? product.images : ["/placeholder.jpg"]}
                  productName={product.name}
                  productSlug={product.slug}
                  product={product}
                  videoUrl={product.videoUrl || (product as any).video_url}
                  youtubeVideoId={(product as any).youtubeVideoId}
                  youtubeEmbedUrl={(product as any).youtubeEmbedUrl}
                  facebookVideoUrl={(product as any).facebookVideoUrl || (product as any).facebook_video_url}
                  facebookEmbedUrl={(product as any).facebookEmbedUrl || (product as any).facebook_embed_url}
                  videoEmbedUrl={(product as any).videoEmbedUrl || (product as any).video_embed_url}
                  variant="modal"
                  overlayContent={
                    <>
                      <ProductPromotionBadges product={product} variant="modal" />
                      <ProductBrandLogoOverlay
                        brandName={brandName}
                        brandLogo={brandLogo}
                        brandData={(product as any)?.brand_data}
                        size="modal"
                        className="top-2.5 right-2.5"
                      />
                    </>
                  }
                />
              </div>

              {/* ═══ RIGHT: Information + Quantity Controls ═══ */}
              <div className="md:w-[56%] flex flex-col justify-between gap-4">
                
                {/* Product Information Module */}
                <div>
                  <h3 className="text-[11px] font-sans font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Product Specifications
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-secondary/30 rounded-xl border border-border/50 text-xs font-sans">
                    <InfoItem label="Brand" value={brandName || "—"} />
                    <InfoItem label="SKU" value={product.sku || "—"} />
                    <InfoItem
                      label="Design Type"
                      value={
                        (product.designType || "").toUpperCase() === "MASTER COPY"
                          ? "MASTER COPY"
                          : "ORIGINAL"
                      }
                    />
                    <InfoItem
                      label="Available Stock"
                      value={
                        isSoldOut
                          ? "Sold Out"
                          : isPreorder
                          ? "Pre-Order"
                          : completePackageStock > 0
                          ? `${completePackageStock.toLocaleString()} PCS`
                          : "Out of Stock"
                      }
                    />
                    <InfoItem label="MOQ" value={`${moq} pcs`} />
                  </div>
                </div>

                {/* Pre-order Delivery Date Information */}
                {isPreorder && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-foreground flex items-center gap-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold uppercase tracking-wider bg-indigo-600 text-white leading-none shrink-0">
                      PRE-ORDER
                    </span>
                    <span>
                      {estimatedDelivery ? (
                        <>Expected delivery: <strong className="text-indigo-700 dark:text-indigo-300 font-semibold">{new Date(estimatedDelivery).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong></>
                      ) : (
                        "Pre-Order item. Delivery timeframe will be confirmed upon order."
                      )}
                    </span>
                  </div>
                )}

                {/* Sold Out Banner */}
                {isSoldOut && (
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-slate-600 dark:text-slate-400" />
                    <span>This product is marked as Sold Out and cannot be purchased.</span>
                  </div>
                )}

                {/* ═══ ORDER QUANTITY (PCS) ═══ */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-muted-foreground block">
                        Order Quantity
                      </label>
                      <span className="text-[11px] font-bold text-foreground tabular-nums">
                        <span className="text-primary">{totalQuantity.toLocaleString()} PCS</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center border border-border rounded-xl h-11 bg-card shadow-2xs">
                        <button
                          type="button"
                          onClick={decreasePackages}
                          disabled={packageCount <= 1 || isSoldOut}
                          className="w-10 sm:w-11 h-full flex items-center justify-center hover:bg-secondary rounded-l-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={15} strokeWidth={2} />
                        </button>
                        <span className="min-w-16 px-2 text-center text-sm sm:text-base font-bold tabular-nums font-sans select-none border-x border-border/50">
                          {totalQuantity.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={increasePackages}
                          disabled={isSoldOut || (!isPreorder && maxCompletePackages > 0 && packageCount >= maxCompletePackages)}
                          className="w-10 sm:w-11 h-full flex items-center justify-center hover:bg-secondary rounded-r-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus size={15} strokeWidth={2} />
                        </button>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-muted-foreground font-sans">
                        PCS
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1.5 font-sans">
                      <strong className="text-foreground">{totalQuantity.toLocaleString()} pcs</strong> · MOQ: {moq} pcs · {
                        isSoldOut ? "Sold Out" : isPreorder ? "Pre-Order" : `Available: ${completePackageStock.toLocaleString()} pcs`
                      }
                    </p>
                  </div>

                  {stockError && (
                    <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{stockError}</span>
                    </div>
                  )}

                  {/* Actions: Add to Cart & RFQ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={
                        isSoldOut ||
                        !(getLowestValidCustomerUnitPrice(product) !== null && (getLowestValidCustomerUnitPrice(product) ?? 0) > 0) ||
                        addedSuccess ||
                        (!isPreorder && maxCompletePackages > 0 && packageCount > maxCompletePackages) ||
                        (!isPreorder && maxCompletePackages <= 0)
                      }
                      className={`w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-sans font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        addedSuccess
                          ? "bg-emerald-600 text-white cursor-default"
                          : isSoldOut
                          ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]"
                      }`}
                    >
                      {isSoldOut ? (
                        <span>Sold Out</span>
                      ) : addedSuccess ? (
                        <>
                          <Check size={16} strokeWidth={2.5} />
                          <span>Added to Cart</span>
                        </>
                      ) : !(getLowestValidCustomerUnitPrice(product) !== null && (getLowestValidCustomerUnitPrice(product) ?? 0) > 0) ? (
                        <span>Quote Only</span>
                      ) : (
                        <>
                          <ShoppingCart size={16} strokeWidth={2} />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddToRfq}
                      disabled={addedRfqSuccess}
                      className={`w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-sans font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs border cursor-pointer ${
                        addedRfqSuccess
                          ? "bg-emerald-600 text-white border-emerald-600 cursor-default"
                          : "bg-card text-foreground border-border hover:bg-secondary/70 active:scale-[0.99]"
                      }`}
                    >
                      {addedRfqSuccess ? (
                        <>
                          <Check size={16} strokeWidth={2.5} />
                          <span>Added to RFQ</span>
                        </>
                      ) : (
                        <>
                          <FileText size={16} strokeWidth={2} className="text-amber-500" />
                          <span>Add to RFQ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 sm:px-6 py-2.5 sm:py-3 bg-secondary/30 border-t border-border/50 flex items-center justify-center">
            <Link
              href={`/products/${product.slug}`}
              onClick={closeProductModal}
              className="inline-flex items-center justify-center gap-1.5 py-1 px-3 text-xs font-sans font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>View Full Product Specifications &amp; Pricing Tiers</span>
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
