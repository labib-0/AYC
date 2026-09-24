"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getProductBySlugOrId, getProducts, getRelatedProducts, toStorefrontProduct } from "@/lib/services/products";
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
  Sliders,
} from "lucide-react";
import BUSINESS_PROFILE, { getWhatsAppUrl } from "@/config/business-profile";
import CommerceSectionHeader from "@/components/product/CommerceSectionHeader";
import PricingTierOption from "@/components/product/PricingTierOption";
import QuantityStepper from "@/components/product/QuantityStepper";
import CommerceSummary from "@/components/product/CommerceSummary";
import PackageAssortmentMatrix from "@/components/product/PackageAssortmentMatrix";

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

          const related = await getRelatedProducts(p, 5);
          setRelatedProducts(related);
        }
        setLoading(false);
      } else {
        const related = await getRelatedProducts(initialProduct, 5);
        setRelatedProducts(related);
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

    // 1. Determine active colors and sizes dynamically from allocations/variants
    let colors: string[] = [];
    let sizes: string[] = [];

    if (isFullStock && product.variants && product.variants.length > 0) {
      const variantColors = Array.from(new Set(product.variants.map(v => v.color).filter((c): c is string => Boolean(c))));
      const variantSizes = Array.from(new Set(product.variants.map(v => v.size).filter((s): s is string => Boolean(s))));
      
      colors = colorsList.filter(c => variantColors.includes(c));
      variantColors.forEach(c => { if (!colors.includes(c)) colors.push(c); });

      sizes = sizesList.filter(s => variantSizes.includes(s));
      variantSizes.forEach(s => { if (!sizes.includes(s)) sizes.push(s); });
    } else if (product.packageAllocations && product.packageAllocations.length > 0) {
      const allocColors = Array.from(new Set(product.packageAllocations.map(a => a.color).filter((c): c is string => Boolean(c))));
      const allocSizes = Array.from(new Set(product.packageAllocations.map(a => a.size).filter((s): s is string => Boolean(s))));

      colors = colorsList.filter(c => allocColors.includes(c));
      allocColors.forEach(c => { if (!colors.includes(c)) colors.push(c); });

      sizes = sizesList.filter(s => allocSizes.includes(s));
      allocSizes.forEach(s => { if (!sizes.includes(s)) sizes.push(s); });
    }

    if (colors.length === 0) colors = colorsList;
    if (sizes.length === 0) sizes = sizesList;

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

        {/* MAIN PRODUCT GRID (Balanced ~35-40% Left Gallery, ~60-65% Right Purchase Hierarchy) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10">
          
          {/* LEFT: GALLERY / MEDIA + SPECIFICATIONS (Compact 3:4 portrait column, sensible desktop max-width, natural mobile width) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-3.5 w-full max-w-lg lg:max-w-[420px] xl:max-w-[440px] mx-auto lg:mx-0">
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

            {/* Specifications Section — Structured information module underneath gallery */}
            <div className="pt-4 mt-4 border-t border-border/70 font-sans space-y-2.5">
              <CommerceSectionHeader
                title="Specifications"
                icon={<Sliders size={14} />}
                subtitle="Product Details"
              />
              
              {product.description && (
                <div className="rounded-lg bg-secondary/15 border border-border/60 p-3 sm:p-3.5 text-muted-foreground text-[12.5px] sm:text-[13px] leading-relaxed">
                  {product.description}
                </div>
              )}

              {/* Compact structured metadata grid, fields rendered dynamically based on existence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[12px] sm:text-[12.5px] font-sans">
                <div className="p-2.5 rounded-lg border border-border/60 bg-card space-y-0.5 shadow-2xs">
                  <span className="text-[10px] sm:text-[10.5px] text-muted-foreground block uppercase font-bold tracking-wider">
                    Design Type
                  </span>
                  <span className="font-semibold text-foreground block truncate">
                    {(product.designType || "").toUpperCase() === "MASTER COPY"
                      ? "MASTER COPY"
                      : "ORIGINAL"}
                  </span>
                </div>
                {product.material && (
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card space-y-0.5 shadow-2xs">
                    <span className="text-[10px] sm:text-[10.5px] text-muted-foreground block uppercase font-bold tracking-wider">
                      Material
                    </span>
                    <span className="font-semibold text-foreground block truncate" title={product.material}>
                      {product.material}
                    </span>
                  </div>
                )}
                
                {product.weightGrams && (
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card space-y-0.5 shadow-2xs">
                    <span className="text-[10px] sm:text-[10.5px] text-muted-foreground block uppercase font-bold tracking-wider">
                      Fabric Weight
                    </span>
                    <span className="font-semibold text-foreground block truncate">
                      {product.weightGrams} g/m²
                    </span>
                  </div>
                )}
                
                {product.collectionSeason && (
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card space-y-0.5 shadow-2xs">
                    <span className="text-[10px] sm:text-[10.5px] text-muted-foreground block uppercase font-bold tracking-wider">
                      Season
                    </span>
                    <span className="font-semibold text-foreground block truncate">
                      {product.collectionSeason}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: WHOLESALE PURCHASE HIERARCHY (7 Cols / 8 Cols on XL+ — Sticky on Desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 lg:sticky lg:top-[80px] lg:self-start w-full flex flex-col space-y-4 sm:space-y-4.5">
            
            {/* ========================================================= */}
            {/* LEVEL 1: PRODUCT IDENTITY & METADATA STRIP */}
            {/* ========================================================= */}
            <div className="space-y-2 pb-4 border-b border-border/70">
              
              {/* Compact Metadata Strip */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] font-sans">
                {/* Brand Badge (Strongest item in metadata line) */}
                <Link
                  href={`/search?brand=${encodeURIComponent(product.brand)}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded bg-foreground text-background font-display font-extrabold text-[11px] sm:text-[12px] uppercase tracking-wider hover:bg-foreground/90 transition-all shadow-2xs cursor-pointer"
                  title={`View all products from ${product.brand}`}
                >
                  {product.brand}
                </Link>

                {/* Design Type (Identifiable metadata tag) */}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded font-display text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider ${
                    (product.designType || "").toUpperCase() === "MASTER COPY"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                      : "bg-secondary/70 text-foreground border border-border/80"
                  }`}
                >
                  {(product.designType || "").toUpperCase() === "MASTER COPY" ? "Master Copy" : "Original"}
                </span>

                {/* Audience Tag */}
                {product.audience && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary/50 text-[10.5px] sm:text-[11px] font-medium uppercase tracking-wider text-muted-foreground border border-border/40">
                    {product.audience}
                  </span>
                )}

                {/* Category Tag */}
                {product.categoryName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary/50 text-[10.5px] sm:text-[11px] font-medium uppercase tracking-wider text-muted-foreground border border-border/40">
                    {product.categoryName}
                  </span>
                )}

                {/* SKU (Muted secondary monospace) */}
                {product.sku && (
                  <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11.5px] text-muted-foreground ml-auto sm:ml-2">
                    <span className="text-muted-foreground/60 uppercase text-[10px] font-bold">SKU:</span>
                    <span className="font-mono text-foreground/80 font-medium tracking-tight">{product.sku}</span>
                  </span>
                )}
              </div>

              {/* Product Title (Controlled Manrope Heading) */}
              <h1 className="text-2xl sm:text-3xl lg:text-[30px] font-display font-extrabold uppercase tracking-tight text-foreground leading-tight pt-1">
                {product.name}
              </h1>

              {/* LEVEL 2: CORE COMMERCIAL DATA — DEDICATED PRICE BLOCK */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-display font-extrabold text-foreground tabular-nums tracking-tight">
                    {formatPrice(currentPrice)}
                  </span>
                  <span className="text-sm sm:text-base font-sans font-medium text-muted-foreground uppercase tracking-wider">
                    / pc
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 text-[12px] sm:text-[12.5px] font-sans">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-border/80 bg-secondary/30 text-foreground font-semibold">
                    <span className="text-muted-foreground font-normal">MOQ</span>
                    <span className="tabular-nums font-bold">{moq} pcs</span>
                  </div>
                  <span className="text-muted-foreground/40 select-none">|</span>
                  <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      <strong className="text-foreground font-semibold tabular-nums">{totalStock.toLocaleString()} pcs</strong> available
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* ========================================================= */}
            {/* LEVEL 3.1: BUY MORE, SAVE MORE TIER MODULE */}
            {/* ========================================================= */}
            <div className="space-y-2">
              <CommerceSectionHeader
                title="Buy More, Save More"
                icon={<TrendingDown size={15} />}
                subtitle="Select a tier to update order quantity"
              />

              <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 space-y-1.5 shadow-2xs" role="radiogroup" aria-label="Pricing Tiers">
                {/* Column Legend */}
                <div className="grid grid-cols-[30%_35%_35%] px-3.5 pb-1 text-[10.5px] font-display font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                  <div>Tier</div>
                  <div>Quantity</div>
                  <div className="text-right">Unit Price</div>
                </div>

                {/* STANDARD TIER */}
                <PricingTierOption
                  name="Standard"
                  quantityRange={`${moq}–${bulkThreshold - 1} pcs`}
                  unitPrice={standardPrice}
                  isSelected={isStandard}
                  onSelect={handleSelectStandard}
                />

                {/* BULK TIER */}
                <PricingTierOption
                  name="Bulk"
                  quantityRange={`${bulkThreshold}+ pcs`}
                  unitPrice={bulkPrice}
                  discountPercent={bulkSavingsPercent}
                  isSelected={isBulk}
                  onSelect={handleSelectBulk}
                />

                {/* TAKE ALL TIER */}
                {totalStock > moq && (
                  <PricingTierOption
                    name="Take All"
                    quantityRange={`${totalStock.toLocaleString()} pcs`}
                    unitPrice={resolvedFullStockPrice}
                    discountPercent={fullStockSavingsPercent}
                    isSelected={isFullStock}
                    onSelect={handleSelectFullStock}
                  />
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* LEVEL 3.2: ORDER QUANTITY & ESTIMATED TOTAL DECISION BLOCK */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-stretch">
              
              {/* Order Quantity Stepper Module */}
              <div className="sm:col-span-6 rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 flex flex-col justify-between space-y-2 shadow-2xs">
                <CommerceSectionHeader
                  title="Order Quantity"
                />
                <QuantityStepper
                  quantity={quantity}
                  moq={moq}
                  step={moq}
                  maxStock={totalStock}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  isDecrementDisabled={quantity <= moq && !isFullStock}
                  isIncrementDisabled={isFullStock || (totalStock > 0 && quantity >= totalStock)}
                  helperText={`Multiples of ${moq} pcs`}
                />
              </div>

              {/* Estimated Total Commercial Summary Module */}
              <div className="sm:col-span-6">
                <CommerceSummary
                  totalAmount={currentPrice * quantity}
                  quantity={quantity}
                  unitPrice={currentPrice}
                  activeTierName={isFullStock ? "Take All Tier" : isBulk ? "Bulk Tier" : "Standard Tier"}
                  className="h-full shadow-2xs"
                />
              </div>
            </div>

            {/* ========================================================= */}
            {/* LEVEL 3.3: PACKAGE ASSORTMENT COMMERCE MODULE */}
            {/* ========================================================= */}
            <div>
              <div className="rounded-xl border border-border/80 bg-secondary/15 p-3.5 sm:p-4 space-y-3 shadow-2xs">
                <CommerceSectionHeader
                  title="Package Assortment"
                  icon={<Package size={15} />}
                  badge={
                    <span className="text-[11px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background border border-border/70 text-foreground tabular-nums">
                      {matrixData ? `${matrixData.grandTotal.toLocaleString()} PCS TOTAL` : `${moq} PCS TOTAL`}
                    </span>
                  }
                />

                {/* Ratio Matrix Component (Colors = Rows, Sizes = Columns, No Redundant Summary Pills) */}
                {matrixData && (
                  <PackageAssortmentMatrix
                    matrixData={matrixData}
                    title={isFullStock ? "Warehouse Inventory Matrix" : "Ratio Matrix"}
                    getColorHex={getColorHex}
                  />
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* LEVEL 4: PRIMARY ACTION (ADD TO CART) & SECONDARY CTAS */}
            {/* ========================================================= */}
            <div className="space-y-3 pt-2 font-sans">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  id="add-to-cart-button"
                  onClick={handleAddToCart}
                  className="w-full flex-1 h-12 sm:h-13 px-6 rounded-xl bg-foreground text-background font-display font-extrabold text-[13.5px] sm:text-[14.5px] uppercase tracking-wider hover:bg-foreground/90 active:scale-[0.99] transition-all duration-150 cursor-pointer shadow-md flex items-center justify-center gap-2.5 group"
                >
                  <ShoppingCart size={17} className="group-hover:scale-110 transition-transform" />
                  <span>Add to Cart</span>
                </button>

                <button
                  type="button"
                  id="wishlist-toggle-button"
                  onClick={() => {
                    if (product) {
                      toggleWishlist(toStorefrontProduct(product));
                    }
                  }}
                  className={`h-12 sm:h-13 w-12 sm:w-13 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-2xs ${
                    product && isInWishlist(product.id)
                      ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-800"
                      : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40 hover:border-border"
                  }`}
                  title={product && isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                  aria-label="Toggle wishlist"
                >
                  <Heart size={18} className={product && isInWishlist(product.id) ? "fill-current text-rose-600" : ""} />
                </button>
              </div>

              {/* Secondary B2B Action (WhatsApp Inquiry) */}
              {product && (
                <a
                  href={getWhatsAppUrl(`Hello ${BUSINESS_PROFILE.name},\n\nI am interested in:\nProduct: ${product.name}\nSKU: ${product.sku}\nQuantity: ${quantity} pcs`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 px-3 rounded-lg bg-transparent hover:bg-secondary/30 border border-border/60 text-muted-foreground hover:text-[#25D366] font-sans font-semibold text-[10.5px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                >
                  <MessageCircle size={14} className="opacity-70 group-hover:opacity-100" />
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
