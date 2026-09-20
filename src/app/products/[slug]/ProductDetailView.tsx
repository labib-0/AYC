"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getProductBySlugOrId, getProducts, toStorefrontProduct } from "@/lib/services/products";
import { useCart } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { B2BProductInput } from "@/types/b2b";
import { formatPrice } from "@/lib/formatters";
import ProductCard from "@/components/product/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import ProductBrandLogoOverlay from "@/components/common/ProductBrandLogoOverlay";
import ProductPromotionBadges from "@/components/common/ProductPromotionBadges";

import { 
  ShoppingCart, 
  Check, 
  Package, 
  Heart, 
  TrendingDown, 
  MessageCircle,
} from "lucide-react";
import BUSINESS_PROFILE, { getWhatsAppUrl } from "@/config/business-profile";

interface ProductDetailViewProps {
  initialProduct?: B2BProductInput | null;
  slug: string;
}

const COLOR_MAP: Record<string, string> = {
  black: "#111827",
  white: "#FFFFFF",
  navy: "#1E3A8A",
  blue: "#2563EB",
  red: "#DC2626",
  green: "#16A34A",
  yellow: "#EAB308",
  orange: "#EA580C",
  purple: "#9333EA",
  pink: "#EC4899",
  brown: "#78350F",
  grey: "#6B7280",
  gray: "#6B7280",
  beige: "#D4C5B9",
  maroon: "#881337",
  olive: "#556B2F",
  charcoal: "#374151",
  peach: "#FFCBA4",
  teal: "#0D9488",
  cream: "#FFFDD0",
  khaki: "#C3B091",
  standard: "#111827",
  assorted: "#6366F1",
};

function getColorHex(colorName?: string): string {
  if (!colorName) return "#6B7280";
  const normalized = colorName.trim().toLowerCase();
  return COLOR_MAP[normalized] || "#94A3B8";
}

export default function ProductDetailView({ initialProduct, slug }: ProductDetailViewProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<B2BProductInput | null>(initialProduct || null);
  const [relatedProducts, setRelatedProducts] = useState<B2BProductInput[]>([]);
  const [loading, setLoading] = useState(!initialProduct);

  const [quantity, setQuantity] = useState<number>(initialProduct?.moq || 10);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  useEffect(() => {
    async function load() {
      if (!initialProduct) {
        setLoading(true);
        const p = await getProductBySlugOrId(slug);
        if (p) {
          setProduct(p);
          setQuantity(p.moq || 10);

          const all = await getProducts({ brand: p.brand });
          setRelatedProducts(all.filter((item) => item.id !== p.id).slice(0, 5));
        }
        setLoading(false);
      } else {
        const all = await getProducts({ brand: initialProduct.brand });
        setRelatedProducts(all.filter((item) => item.id !== initialProduct.id).slice(0, 5));
      }
    }
    load();
  }, [slug, initialProduct]);

  const moq = Math.max(1, product?.moq || 10);

  // 1. Standard Base Price
  const standardPrice = product?.standardPrice ?? product?.wholesalePrice ?? 28.0;

  // 2. Bulk Tier Threshold and Unit Price
  const bulkTierFromList = product?.pricingTiers?.find(t => t.min_quantity > moq);
  const bulkThreshold = product?.bulkThreshold 
    ?? (bulkTierFromList ? bulkTierFromList.min_quantity : moq * 20); // Default dynamic 20x MOQ if unspecified
  
  const bulkPrice = product?.bulkPrice 
    ?? (bulkTierFromList ? bulkTierFromList.unit_price : Math.round(standardPrice * 0.8 * 100) / 100);

  // 3. Total Available Stock
  const totalStock = useMemo(() => {
    if (!product) return 0;
    if (product.fullStockQuantity) return product.fullStockQuantity;
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }
    return product.stock || 710;
  }, [product]);

  // 4. Exact Full Stock Price Resolution (Backend-aligned rule: never worse than valid tier for totalStock)
  const applicableNormalPriceForFullStock = totalStock >= bulkThreshold ? bulkPrice : standardPrice;
  const configuredFullStockPrice = product?.fullStockPrice !== undefined && product?.fullStockPrice !== null
    ? Number(product.fullStockPrice)
    : null;

  const resolvedFullStockPrice = configuredFullStockPrice !== null && configuredFullStockPrice > 0
    ? Math.min(configuredFullStockPrice, applicableNormalPriceForFullStock)
    : applicableNormalPriceForFullStock;

  // Purchasing Mode Resolution
  const isFullStock = Boolean(totalStock > 0 && quantity === totalStock);
  const isBulk = !isFullStock && quantity >= bulkThreshold;
  const isStandard = !isFullStock && !isBulk;

  const currentPrice = isFullStock 
    ? resolvedFullStockPrice 
    : (isBulk ? bulkPrice : standardPrice);

  // Savings Percentages
  const bulkSavingsPercent = standardPrice > bulkPrice 
    ? Math.round(((standardPrice - bulkPrice) / standardPrice) * 100) 
    : 0;

  const fullStockSavingsPercent = standardPrice > resolvedFullStockPrice 
    ? Math.round(((standardPrice - resolvedFullStockPrice) / standardPrice) * 100) 
    : 0;

  // Extract YouTube Video
  const youtubeEmbedUrl = useMemo(() => {
    if (product?.youtubeEmbedUrl) return product.youtubeEmbedUrl;
    if (product?.youtubeVideoId) return `https://www.youtube-nocookie.com/embed/${product.youtubeVideoId}`;
    if (!product?.videoUrl) return null;
    const url = product.videoUrl.trim();
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
  }, [product]);

  // Informational Colors & Sizes Lists
  const colorsList = useMemo(() => {
    if (!product) return ["Black"];
    if (product.colors && product.colors.length > 0) return product.colors;
    if (product.colorName) return [product.colorName];
    return ["Black"];
  }, [product]);

  const sizesList = useMemo(() => {
    if (!product) return ["S", "M", "L", "XL"];
    if (product.sizes && product.sizes.length > 0) return product.sizes;
    return ["S", "M", "L", "XL"];
  }, [product]);

  // Package Assortment Matrix Computation (Display-only)
  const matrixData = useMemo(() => {
    if (!product) return null;

    const colors = colorsList;
    const sizes = sizesList;

    const cellMap: Record<string, Record<string, number>> = {};
    colors.forEach(c => {
      cellMap[c] = {};
      sizes.forEach(s => { cellMap[c][s] = 0; });
    });

    if (isFullStock && product.variants && product.variants.length > 0) {
      // Authoritative live warehouse inventory breakdown for Full Stock
      product.variants.forEach(v => {
        const c = v.color || colors[0];
        const s = v.size || sizes[0];
        if (!cellMap[c]) cellMap[c] = {};
        cellMap[c][s] = (cellMap[c][s] || 0) + (v.stock || 0);
      });
    } else if (product.packageAllocations && product.packageAllocations.length > 0) {
      // Standard package allocation scaled proportionally by quantity / moq
      const mult = quantity / moq;
      let runningTotal = 0;
      const flatList: { color: string; size: string; count: number }[] = [];

      product.packageAllocations.forEach(a => {
        const c = a.color || colors[0];
        const s = a.size || sizes[0];
        // Support both `quantity` (canonical) and legacy `count` field names
        const baseQty = (a.quantity ?? (a as any).count ?? 0) as number;
        const count = Math.round(baseQty * mult);
        flatList.push({ color: c, size: s, count });
        runningTotal += count;
      });

      // Guarantee SUM(all cells) === quantity mathematically (deterministic remainder on last item)
      const diff = quantity - runningTotal;
      if (diff !== 0 && flatList.length > 0) {
        flatList[flatList.length - 1].count += diff;
      }

      flatList.forEach(item => {
        if (!cellMap[item.color]) cellMap[item.color] = {};
        cellMap[item.color][item.size] = (cellMap[item.color][item.size] || 0) + item.count;
      });

    } else {
      // Fallback: Proportional distribution across colors and sizes
      const totalCombinations = colors.length * sizes.length;
      const basePerCell = Math.floor(quantity / Math.max(1, totalCombinations));
      let remainder = quantity % Math.max(1, totalCombinations);

      colors.forEach(c => {
        sizes.forEach(s => {
          const extra = remainder > 0 ? 1 : 0;
          if (remainder > 0) remainder--;
          cellMap[c][s] = basePerCell + extra;
        });
      });
    }

    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;

    sizes.forEach(s => { colTotals[s] = 0; });

    colors.forEach(c => {
      rowTotals[c] = 0;
      sizes.forEach(s => {
        const val = cellMap[c]?.[s] || 0;
        rowTotals[c] += val;
        colTotals[s] += val;
        grandTotal += val;
      });
    });

    return { colors, sizes, cellMap, rowTotals, colTotals, grandTotal };
  }, [product, quantity, isFullStock, moq, colorsList, sizesList]);

  // Pricing Row Click Handlers
  const handleSelectStandard = () => {
    setQuantity(moq);
  };

  const handleSelectBulk = () => {
    setQuantity(bulkThreshold);
  };

  const handleSelectFullStock = () => {
    if (totalStock > 0) {
      setQuantity(totalStock);
    }
  };

  const handleIncrement = () => {
    if (isFullStock) return; // already at max
    const nextQty = quantity + moq;
    if (totalStock > 0 && nextQty >= totalStock) {
      setQuantity(totalStock);
    } else {
      setQuantity(nextQty);
    }
  };

  const handleDecrement = () => {
    if (isFullStock) {
      // Step down smoothly to nearest valid multiple of MOQ below totalStock
      const nearestMultiple = Math.floor((totalStock - 1) / moq) * moq;
      setQuantity(Math.max(moq, nearestMultiple));
      return;
    }
    // Never go below MOQ
    if (quantity <= moq) return;
    setQuantity(q => Math.max(moq, q - moq));
  };


  // Handle Add to Cart
  const handleAddToCart = () => {
    if (!product) return;

    const packageBreakdown: import("@/types").PackageBreakdown[] = [];
    if (matrixData) {
      matrixData.colors.forEach(c => {
        matrixData.sizes.forEach(s => {
          const qty = matrixData.cellMap[c]?.[s] || 0;
          if (qty > 0) {
            const matchedVariant = product.variants?.find(
              v => (v.color === c || !v.color) && (v.size === s || !v.size)
            );
            packageBreakdown.push({
              product_variant_id: matchedVariant ? Number(matchedVariant.id) : null,
              color: c,
              size: s,
              quantity: qty
            });
          }
        });
      });
    }

    addToCart(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        categoryId: product.categoryId || "c_tops",
        price: currentPrice,
        oldPrice: product.msrpPrice,
        images: product.images,
        badge: product.isHot ? "Hot" : undefined,
        sizes: sizesList,
        color: colorsList.join(", "),
        isNew: product.isNew,
        moq: moq,
      } as any,
      "Assorted",
      quantity,
      undefined,
      packageBreakdown
    );
    setFeedbackMsg("Added to cart");
    setTimeout(() => {
      setFeedbackMsg("");
    }, 3000);
    setIsCartOpen(true);
  };

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full min-h-[70vh] py-20 text-center">
        <h2 className="text-xl font-bold uppercase font-display">Product Not Found</h2>
        <Link href="/search" className="text-primary hover:underline mt-2 inline-block text-xs font-bold uppercase">
          ← Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10 space-y-4 sm:space-y-5">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Link href="/search" className="hover:text-foreground transition-colors">Catalog</Link>
          <span className="text-border">/</span>
          <Link href={`/search?brand=${encodeURIComponent(product.brand)}`} className="hover:text-foreground transition-colors">
            {product.brand}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground truncate max-w-xs">{product.name}</span>
        </nav>

        {feedbackMsg && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check size={16} />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* MAIN PRODUCT GRID (5 Cols Left Images ≈ 41.7%, 7 Cols Right Purchase Hierarchy ≈ 58.3%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* LEFT: GALLERY / MEDIA + SPECIFICATIONS (5 Cols with controlled max-width) */}
          <div className="lg:col-span-5 space-y-3.5 max-w-[420px] xl:max-w-[440px] 2xl:max-w-[480px] w-full mx-auto lg:mx-0">
            {/* Unified Media Experience (Images + Video + Lightbox) */}
            <ProductGallery
              images={product.images}
              productName={product.name}
              productSlug={product.slug}
              videoUrl={product.videoUrl}
              youtubeVideoId={product.youtubeVideoId}
              youtubeEmbedUrl={youtubeEmbedUrl || product.youtubeEmbedUrl}
              variant="detail"
              overlayContent={
                <>
                  {/* Normalized Promotional Badges (Top Left) */}
                  <ProductPromotionBadges product={product} variant="detail" />

                  {/* Actual Brand Logo Overlay (Top Right) */}
                  <ProductBrandLogoOverlay
                    brandName={product.brand}
                    brandLogo={product.brandLogo}
                    size="detail"
                    className="top-3 right-3 sm:top-4 sm:right-4"
                  />
                </>
              }
            />

            {/* Specifications Section — positioned underneath thumbnail rail with clean, compact spacing */}
            <div className="pt-4 mt-4 border-t border-border/60 font-sans">
              <h2 className="text-[11px] font-display font-bold uppercase tracking-wider text-foreground mb-2">
                Specifications
              </h2>
              
              {product.description && (
                <p className="font-sans text-muted-foreground leading-relaxed text-xs mb-4 max-w-prose">
                  {product.description}
                </p>
              )}

              {/* Compact structured metadata grid, fields rendered dynamically based on existence */}
              {(product.material || product.weightGrams || product.collectionSeason) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-border/40 text-xs font-sans">
                  {product.material && (
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Material</span>
                      <span className="font-medium text-foreground block leading-snug break-words">
                        {product.material}
                      </span>
                    </div>
                  )}
                  
                  {product.weightGrams && (
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Weight</span>
                      <span className="font-medium text-foreground block leading-snug break-words">
                        {product.weightGrams} g/m²
                      </span>
                    </div>
                  )}
                  
                  {product.collectionSeason && (
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Season</span>
                      <span className="font-medium text-foreground block leading-snug break-words">
                        {product.collectionSeason}
                      </span>
                    </div>
                  )}
                  
                  {/* Note: product.audience intentionally omitted here to prevent redundancy with Product Header */}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: WHOLESALE PURCHASE HIERARCHY (7 Cols — Sticky on Desktop) */}
          <div className="lg:col-span-7 lg:sticky lg:top-[80px] lg:self-start max-w-xl xl:max-w-2xl 2xl:max-w-3xl w-full flex flex-col">
            
            {/* ========================================================= */}
            {/* 1. PRODUCT IDENTITY & METADATA HIERARCHY */}
            {/* ========================================================= */}
            <div className="space-y-1.5 pb-4 border-b border-border/60">
              
              {/* Structured Metadata (Brand prominent, SKU · Audience · Category secondary) */}
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {product.brand}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-sans text-muted-foreground">
                  <span>SKU: <span className="font-mono text-foreground/90 font-medium">{product.sku}</span></span>
                  <span className="text-border/80">·</span>
                  <span className="uppercase font-medium">{product.audience}</span>
                  <span className="text-border/80">·</span>
                  <span className="font-medium">{product.categoryName || "Apparel"}</span>
                </div>
              </div>

              {/* Product Title */}
              <h1 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-foreground leading-tight">
                {product.name}
              </h1>

              {/* Price Hierarchy */}
              <div className="space-y-1 pt-0.5">
                {/* Dominant Primary B2B Unit Price */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-sans font-bold text-foreground tabular-nums tracking-tight">
                    {formatPrice(currentPrice)}
                  </span>
                  <span className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wider">
                    / pc
                  </span>
                </div>

                {/* Compact Secondary MOQ & Stock Facts */}
                <div className="flex items-center gap-1.5 text-[11px] font-sans text-muted-foreground">
                  <span>MOQ: <strong className="text-foreground font-semibold tabular-nums">{moq} pcs</strong></span>
                  <span className="text-border/80">·</span>
                  <span>Stock: <strong className="text-foreground font-semibold tabular-nums">{totalStock.toLocaleString()} pcs</strong></span>
                </div>
              </div>

            </div>

            {/* ========================================================= */}
            {/* 2. BUY MORE, SAVE MORE TIER TABLE */}
            {/* ========================================================= */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-display font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <TrendingDown size={14} className="text-primary" />
                  <span>Buy More, Save More</span>
                </h3>
                <span className="text-[10px] text-muted-foreground/70">Select a tier to set order volume</span>
              </div>

              <div className="text-xs font-sans min-w-[280px]">
                {/* Header Row */}
                <div className="grid grid-cols-[30%_35%_35%] px-3 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <div className="font-semibold text-foreground">Tier</div>
                  <div className="font-semibold text-foreground">Quantity</div>
                  <div className="font-bold text-right text-foreground">Unit Price</div>
                </div>

                {/* Rows Container */}
                <div className="pt-2.5 space-y-1.5" role="radiogroup" aria-label="Pricing Tiers">
                  {/* STANDARD */}
                  <div
                    role="radio"
                    aria-checked={isStandard}
                    tabIndex={0}
                    onClick={handleSelectStandard}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectStandard();
                      }
                    }}
                    className={`grid grid-cols-[30%_35%_35%] items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 ${
                      isStandard
                        ? "bg-secondary/30 ring-2 ring-inset ring-foreground shadow-sm"
                        : "bg-card ring-1 ring-inset ring-border/70 hover:ring-border hover:bg-secondary/20 hover:shadow-xs text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${isStandard ? "bg-foreground scale-125" : "bg-muted-foreground/40"}`} />
                      <span className={`uppercase tracking-wider text-[11px] ${isStandard ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>Standard</span>
                    </div>
                    <div className="font-normal tabular-nums text-xs">
                      <span className={isStandard ? "text-foreground" : "text-muted-foreground"}>
                        {moq}–{bulkThreshold - 1} pcs
                      </span>
                    </div>
                    <div className="text-right tabular-nums whitespace-nowrap">
                      <span className={`tabular-nums text-xs sm:text-sm ${isStandard ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                        {formatPrice(standardPrice)}
                      </span>
                    </div>
                  </div>

                  {/* BULK */}
                  <div
                    role="radio"
                    aria-checked={isBulk}
                    tabIndex={0}
                    onClick={handleSelectBulk}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectBulk();
                      }
                    }}
                    className={`grid grid-cols-[30%_35%_35%] items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 ${
                      isBulk
                        ? "bg-secondary/30 ring-2 ring-inset ring-foreground shadow-sm"
                        : "bg-card ring-1 ring-inset ring-border/70 hover:ring-border hover:bg-secondary/20 hover:shadow-xs text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${isBulk ? "bg-foreground scale-125" : "bg-muted-foreground/40"}`} />
                      <span className={`uppercase tracking-wider text-[11px] ${isBulk ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>Bulk</span>
                    </div>
                    <div className="font-normal tabular-nums text-xs">
                      <span className={isBulk ? "text-foreground" : "text-muted-foreground"}>
                        {bulkThreshold}+ pcs
                      </span>
                    </div>
                    <div className="text-right tabular-nums whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {bulkSavingsPercent > 0 && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
                            {bulkSavingsPercent}% OFF
                          </span>
                        )}
                        <span className={`tabular-nums text-xs sm:text-sm ${isBulk ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                          {formatPrice(bulkPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FULL STOCK */}
                  {totalStock > moq && (
                    <div
                      role="radio"
                      aria-checked={isFullStock}
                      tabIndex={0}
                      onClick={handleSelectFullStock}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectFullStock();
                        }
                      }}
                      className={`grid grid-cols-[30%_35%_35%] items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 ${
                        isFullStock
                          ? "bg-secondary/30 ring-2 ring-inset ring-foreground shadow-sm"
                          : "bg-card ring-1 ring-inset ring-border/70 hover:ring-border hover:bg-secondary/20 hover:shadow-xs text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${isFullStock ? "bg-foreground scale-125" : "bg-muted-foreground/40"}`} />
                        <span className={`uppercase tracking-wider text-[11px] ${isFullStock ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>Full Stock</span>
                      </div>
                      <div className="font-normal tabular-nums text-xs">
                        <span className={isFullStock ? "text-foreground" : "text-muted-foreground"}>
                          {totalStock.toLocaleString()} pcs
                        </span>
                      </div>
                      <div className="text-right tabular-nums whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {fullStockSavingsPercent > 0 && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
                              {fullStockSavingsPercent}% OFF
                            </span>
                          )}
                          <span className={`tabular-nums text-xs sm:text-sm ${isFullStock ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                            {formatPrice(resolvedFullStockPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 3. UNIFIED ORDER QUANTITY & ESTIMATED TOTAL DECISION BLOCK */}
            {/* ========================================================= */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-6 font-sans pt-5">
              
              {/* Left side: Order Quantity */}
              <div className="space-y-2">
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-foreground block">
                  Order Quantity
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-border/80 rounded-md bg-card shadow-2xs h-8">
                    <button 
                      type="button" 
                      onClick={handleDecrement}
                      disabled={quantity <= moq && !isFullStock}
                      className="w-8 h-full flex items-center justify-center text-foreground font-bold text-sm hover:bg-secondary/60 rounded-l-md cursor-pointer transition-colors select-none disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Decrease quantity"
                      title={quantity <= moq ? `Minimum order quantity is ${moq} pcs` : undefined}
                    >
                      −
                    </button>
                    <div className="w-16 text-center font-bold text-xs select-none tabular-nums font-sans">
                      {quantity.toLocaleString()}
                    </div>
                    <button 
                      type="button" 
                      onClick={handleIncrement}
                      disabled={isFullStock || (totalStock > 0 && quantity >= totalStock)}
                      className="w-8 h-full flex items-center justify-center text-foreground font-bold text-sm hover:bg-secondary/60 rounded-r-md cursor-pointer transition-colors select-none disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Increase quantity"
                      title={isFullStock || (totalStock > 0 && quantity >= totalStock) ? `Maximum available stock is ${totalStock.toLocaleString()} pcs` : undefined}
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">pcs</span>
                </div>
                <div className="text-[10px] text-muted-foreground/80 leading-none">
                  Multiples of {moq} pcs
                </div>
              </div>

              {/* Right side: Estimated Total */}
              <div className="space-y-1.5 sm:text-right">
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground block">
                  Est. Total
                </span>
                <div className="text-xl sm:text-2xl font-bold text-foreground font-sans tabular-nums leading-none">
                  {formatPrice(currentPrice * quantity)}
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums leading-none">
                  {quantity.toLocaleString()} pcs × {formatPrice(currentPrice)} / pc
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 4. WHOLESALE PACKAGE / ASSORTMENT INFORMATION */}
            {/* ========================================================= */}
            <div className="flex flex-col p-2.5 rounded-lg border border-border/50 bg-secondary/10 font-sans gap-2 mt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Package size={13} className="text-primary" />
                  <h3 className="text-[11px] font-display font-bold uppercase tracking-wider text-foreground">
                    Package Assortment
                  </h3>
                </div>
                <span className="text-[10px] font-sans font-medium text-muted-foreground tabular-nums">
                  {matrixData ? `${matrixData.grandTotal.toLocaleString()} pcs total` : `${moq} pcs / pack`}
                </span>
              </div>

              {/* Compact Summary */}
              <div className="text-[10px] text-muted-foreground leading-snug">
                <span className="font-semibold text-foreground">Colors:</span> {colorsList.join(", ")} <span className="mx-1">&middot;</span> <span className="font-semibold text-foreground">Sizes:</span> {sizesList.join(", ")}
              </div>

              {/* Package Breakdown Matrix Table (if available) */}
              {matrixData && (
                <div className="space-y-1 mt-1">
                  <div className="flex items-center justify-between text-[9px] mb-1">
                    <span className="font-display font-semibold uppercase tracking-wider text-foreground/80">
                      {isFullStock ? "Full Stock Matrix" : "Ratio Matrix"}
                    </span>
                    <span className="text-muted-foreground">Units per package</span>
                  </div>

                  <div className="overflow-x-auto border border-border/50 rounded-md bg-background shadow-2xs">
                    <table className="w-full text-xs text-left min-w-[220px] font-sans">
                      <thead className="bg-secondary/30 text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                        <tr>
                          <th className="px-2 py-1.5 font-semibold">Color</th>
                          {matrixData.sizes.map((s) => (
                            <th key={s} className="px-1.5 py-1.5 font-semibold text-center">{s}</th>
                          ))}
                          <th className="px-2 py-1.5 font-bold text-right text-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30 text-[10px]">
                        {matrixData.colors.map((color) => (
                          <tr key={color} className="hover:bg-secondary/10">
                            <td className="px-2 py-1 font-medium text-foreground flex items-center gap-1.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: getColorHex(color) }}
                              />
                              <span>{color}</span>
                            </td>
                            {matrixData.sizes.map((size) => (
                              <td key={size} className="px-1.5 py-1 text-center text-muted-foreground tabular-nums">
                                {matrixData.cellMap[color]?.[size] || 0}
                              </td>
                            ))}
                            <td className="px-2 py-1 font-bold text-right text-foreground tabular-nums">
                              {matrixData.rowTotals[color] || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-secondary/20 border-t border-border/50 font-bold text-foreground text-[10px]">
                        <tr>
                          <td className="px-2 py-1.5 uppercase text-[9px]">TOTAL</td>
                          {matrixData.sizes.map((size) => (
                            <td key={size} className="px-1.5 py-1.5 text-center tabular-nums">
                              {matrixData.colTotals[size] || 0}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right text-foreground font-bold tabular-nums">
                            {matrixData.grandTotal.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* 5. PRIMARY ACTION: ADD TO CART (+ WISHLIST & SECONDARY CTAS) */}
            {/* ========================================================= */}
            <div className="space-y-3 pt-6 font-sans">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full flex-1 h-11 sm:h-12 px-5 rounded-lg bg-foreground text-background font-sans font-bold text-[11px] sm:text-xs uppercase tracking-wider hover:bg-foreground/90 transition-all duration-150 cursor-pointer shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={15} />
                  <span>Add to Cart</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (product) {
                      toggleWishlist(toStorefrontProduct(product));
                    }
                  }}
                  className={`h-11 sm:h-12 w-11 sm:w-12 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    product && isInWishlist(product.id)
                      ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-800"
                      : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:border-border"
                  }`}
                  title={product && isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                  aria-label="Toggle wishlist"
                >
                  <Heart size={16} className={product && isInWishlist(product.id) ? "fill-current text-rose-600" : ""} />
                </button>
              </div>

              {/* Secondary B2B Action (WhatsApp Inquiry Only — Offer Sheet Removed) */}
              {product && (
                <a
                  href={getWhatsAppUrl(`Hello ${BUSINESS_PROFILE.name},\n\nI am interested in:\nProduct: ${product.name}\nSKU: ${product.sku}\nQuantity: ${quantity} pcs`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 px-3 rounded-md bg-transparent hover:bg-secondary/30 border border-border/50 text-muted-foreground hover:text-[#25D366] font-sans font-semibold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                >
                  <MessageCircle size={13} className="opacity-70 group-hover:opacity-100" />
                  <span>Inquire on WhatsApp</span>
                </a>
              )}
            </div>

          </div>

        </div>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <div className="pt-8 sm:pt-10 border-t border-border space-y-4">
            <h2 className="text-lg sm:text-xl font-display font-bold uppercase tracking-tight text-foreground">
              More from {product.brand}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[1440px]:grid-cols-6 2xl:grid-cols-6 gap-3 sm:gap-4">
              {relatedProducts.map((rp) => (
                <ProductCard
                  key={rp.id}
                  product={toStorefrontProduct(rp)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
