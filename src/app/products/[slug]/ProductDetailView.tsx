"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getProductBySlugOrId, getBrandProducts, toStorefrontProduct } from "@/lib/services/products";
import { useCart } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { B2BProductInput } from "@/types/b2b";
import { formatPrice } from "@/lib/formatters";
import ProductCard from "@/components/product/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import ProductBrandLogoOverlay from "@/components/common/ProductBrandLogoOverlay";
import ProductPromotionBadges from "@/components/common/ProductPromotionBadges";
import ProductBadge from "@/components/common/ProductBadge";
import { renderFormattedProductDescription } from "@/lib/product-description";

import { 
  ShoppingCart, 
  Check, 
  Package, 
  Heart, 
  MessageCircle,
  Sliders,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useRfq } from "@/lib/RfqContext";
import BUSINESS_PROFILE, { getWhatsAppUrl, getProductWhatsAppUrl } from "@/config/business-profile";
import CommerceSectionHeader from "@/components/product/CommerceSectionHeader";
import PricingTierOption from "@/components/product/PricingTierOption";
import QuantityStepper from "@/components/product/QuantityStepper";
import CommerceSummary from "@/components/product/CommerceSummary";
import PackageAssortmentMatrix from "@/components/product/PackageAssortmentMatrix";
import ProductSelectedLogisticsRow from "@/components/product/ProductSelectedLogisticsRow";
import SpecificationCard from "@/components/product/SpecificationCard";

interface ProductDetailViewProps {
  initialProduct?: B2BProductInput | null;
  slug: string;
}

export default function ProductDetailView({ initialProduct, slug }: ProductDetailViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToRfq } = useRfq();
  const [addedRfqSuccess, setAddedRfqSuccess] = useState(false);

  const [product, setProduct] = useState<B2BProductInput | null>(initialProduct || null);
  const [brandProducts, setBrandProducts] = useState<B2BProductInput[]>([]);
  const [loading, setLoading] = useState(!initialProduct);

  const [quantity, setQuantity] = useState<number>(initialProduct?.moq || 10);
  const [selectedTier, setSelectedTier] = useState<"standard" | "bulk" | "full_stock">("standard");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!initialProduct) {
        setLoading(true);
        try {
          const p = await getProductBySlugOrId(slug);
          if (
            p &&
            p.status !== "draft" &&
            !p.isHiddenFromStorefront &&
            !(p as any).is_hidden_from_storefront
          ) {
            setProduct(p);
            const pMoq = p.moq || 10;
            const pAvail = Number(p.availableStock ?? (p as any).available_stock ?? p.stock ?? 0);
            const initQty = pAvail > 0 && pAvail < pMoq ? pAvail : pMoq;
            setQuantity(initQty);
            if (pAvail > 0 && initQty === pAvail) {
              setSelectedTier("full_stock");
            }

            try {
              const brandItems = await getBrandProducts(p, 4);
              setBrandProducts(brandItems);
            } catch (err) {
              console.warn("Failed to load products from brand:", err);
            }
          } else {
            setProduct(null);
          }
        } catch (err) {
          console.error("Failed to load product by slug/id:", slug, err);
          setProduct(null);
        } finally {
          setLoading(false);
        }
      } else {
        setProduct(initialProduct);
        const initMoq = initialProduct.moq || 10;
        const initAvail = Number(initialProduct.availableStock ?? (initialProduct as any).available_stock ?? initialProduct.stock ?? 0);
        const startQty = initAvail > 0 && initAvail < initMoq ? initAvail : initMoq;
        setQuantity(startQty);
        if (initAvail > 0 && startQty === initAvail) {
          setSelectedTier("full_stock");
        }
        setLoading(false);
        try {
          const brandItems = await getBrandProducts(initialProduct, 4);
          setBrandProducts(brandItems);
        } catch (err) {
          console.warn("Failed to load products from brand:", err);
        }
      }
    }
    load();
  }, [slug, initialProduct]);

  const moq = Math.max(1, product?.moq || 10);

  // 1. Standard Base Price
  const standardPrice = (product?.standardPrice && product.standardPrice > 0)
    ? product.standardPrice
    : (product?.wholesalePrice && product.wholesalePrice > 0)
    ? product.wholesalePrice
    : (product?.price && product.price > 0)
    ? product.price
    : (product?.pricingTiers?.find(t => t.unit_price > 0)?.unit_price ?? 0);

  // 2. Bulk Tier Threshold and Unit Price
  const bulkPricingEnabled = product?.bulkPricingEnabled !== undefined
    ? Boolean(product.bulkPricingEnabled)
    : (product as any)?.bulk_pricing_enabled !== undefined
    ? Boolean((product as any).bulk_pricing_enabled)
    : Boolean(product?.bulkThreshold && product?.bulkPrice);

  const bulkTierFromList = product?.pricingTiers?.find(t => t.min_quantity > moq && t.min_quantity !== (product?.availableStock ?? product?.stock));
  const rawBulkThreshold = product?.bulkThreshold ?? (bulkTierFromList ? bulkTierFromList.min_quantity : undefined);
  const rawBulkPrice = product?.bulkPrice ?? (bulkTierFromList ? bulkTierFromList.unit_price : undefined);

  const hasBulkTier = Boolean(bulkPricingEnabled && rawBulkThreshold && rawBulkPrice && Number(rawBulkThreshold) > moq && Number(rawBulkPrice) > 0);
  const bulkThreshold = hasBulkTier ? Number(rawBulkThreshold) : undefined;
  const bulkPrice = hasBulkTier ? Number(rawBulkPrice) : undefined;

  const variants = useMemo<any[]>(() => {
    if (!product?.variants) return [];
    return Array.isArray(product.variants)
      ? (product.variants as any[])
      : (typeof product.variants === "object" ? (Object.values(product.variants) as any[]) : []);
  }, [product]);

  const packageAllocations = useMemo<any[]>(() => {
    const raw = product?.packageAllocations ?? (product as any)?.package_allocations;
    if (!raw) return [];
    return Array.isArray(raw)
      ? (raw as any[])
      : (typeof raw === "object" ? (Object.values(raw) as any[]) : []);
  }, [product]);

  // 3. Authoritative Complete Package Stock (from allocations & variant inventory)
  const maxCompletePackages = useMemo<number>(() => {
    if (typeof (product as any)?.max_complete_packages === "number") {
      return (product as any).max_complete_packages;
    }
    if (typeof (product as any)?.maxCompletePackages === "number") {
      return (product as any).maxCompletePackages;
    }
    if (typeof (product as any)?.available_moqs === "number") {
      return (product as any).available_moqs;
    }
    if (typeof (product as any)?.availableMoqs === "number") {
      return (product as any).availableMoqs;
    }
    if (packageAllocations.length === 0) {
      const rawStock = Number(product?.availableStock ?? (product as any)?.available_stock ?? product?.stock ?? 0);
      return Math.floor(rawStock / moq);
    }
    let minPkgs: number | null = null;
    for (const alloc of packageAllocations) {
      const allocQty = Number(alloc.quantity) || 0;
      if (allocQty <= 0) continue;
      const vMatch = variants.find(
        (v: any) =>
          (alloc.product_variant_id && String(v.id) === String(alloc.product_variant_id)) ||
          (v.color?.toLowerCase() === alloc.color?.toLowerCase() && v.size?.toLowerCase() === alloc.size?.toLowerCase())
      );
      const vStock = Number(vMatch?.stock ?? 0);
      const supported = Math.floor(vStock / allocQty);
      if (minPkgs === null || supported < minPkgs) {
        minPkgs = supported;
      }
    }
    return Math.max(0, minPkgs ?? 0);
  }, [product, moq, packageAllocations, variants]);

  const completePackageStock = useMemo(() => {
    if (typeof (product as any)?.complete_package_stock === "number") {
      return (product as any).complete_package_stock;
    }
    if (typeof (product as any)?.completePackageStock === "number") {
      return (product as any).completePackageStock;
    }
    return maxCompletePackages * moq;
  }, [product, maxCompletePackages, moq]);

  // 4. Authoritative Available Inventory & Full Stock Calculation
  // Authoritative INITIAL STOCK & AVAILABLE INVENTORY in PCS
  const initialStock = Number(
    product?.initialStock ??
    (product as any)?.initial_stock ??
    product?.stock ??
    product?.availableStock ??
    (product as any)?.available_stock ??
    0
  );
  const availableInventory = Number(product?.availableStock ?? (product as any)?.available_stock ?? product?.stock ?? 0);
  const isPreorder = Boolean(product?.isPreorder ?? (product as any)?.is_preorder);
  const isSoldOut = Boolean(product?.isSoldOut ?? (product as any)?.is_sold_out);
  const estimatedDelivery = product?.estimatedDeliveryDate ?? (product as any)?.estimated_delivery_date;
  const fullStockQuantity = availableInventory;
  const totalStock = availableInventory;
  const fullStockPackages = maxCompletePackages;

  // FULL STOCK OPTION IS ALWAYS VISIBLE
  // Price is conditional:
  // IF Bulk is configured: Available Inventory > Minimum Bulk Order Quantity -> full_stock_price
  // IF Bulk is NOT configured: Available Inventory >= MOQ -> full_stock_price
  const isFullStockQualified = hasBulkTier && bulkThreshold !== undefined
    ? (availableInventory > bulkThreshold)
    : (availableInventory >= moq);

  const configuredFullStockPrice = product?.configuredFullStockPrice !== undefined && product?.configuredFullStockPrice !== null
    ? Number(product.configuredFullStockPrice)
    : product?.fullStockPrice !== undefined && product?.fullStockPrice !== null
    ? Number(product.fullStockPrice)
    : null;

  // Authoritative Normal MOQ Price
  const normalMoqPrice = standardPrice;

  // Authoritative Full Stock Price selection
  const resolvedFullStockPrice = useMemo(() => {
    if (isFullStockQualified) {
      if (configuredFullStockPrice !== null && configuredFullStockPrice > 0) {
        return Math.min(configuredFullStockPrice, normalMoqPrice);
      }
      if (product?.fullStockPrice !== undefined && product?.fullStockPrice !== null) {
        return Number(product.fullStockPrice);
      }
    }
    return normalMoqPrice;
  }, [isFullStockQualified, configuredFullStockPrice, normalMoqPrice, product?.fullStockPrice]);

  const isFullStockEligible = isFullStockQualified && configuredFullStockPrice !== null && configuredFullStockPrice > 0;

  const fullStockTotal = Math.round(fullStockQuantity * resolvedFullStockPrice * 100) / 100;

  // Purchasing Mode Resolution: Full Stock is automatically selected when quantity === available inventory
  const isFullStock = fullStockQuantity > 0 && quantity === fullStockQuantity;
  const isBulk = !isFullStock && hasBulkTier && bulkThreshold !== undefined && quantity >= bulkThreshold;
  const isStandard = !isFullStock && !isBulk;

  const currentPrice = isFullStock 
    ? resolvedFullStockPrice 
    : (isBulk && bulkPrice ? bulkPrice : standardPrice);

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
    if (!product) return [];
    if (product.colors && product.colors.length > 0) return product.colors;
    if (product.colorName) return [product.colorName];
    return [];
  }, [product]);

  const sizesList = useMemo(() => {
    if (!product) return [];
    if (product.sizes && product.sizes.length > 0) return product.sizes;
    return [];
  }, [product]);

  // Package Assortment Matrix Computation (Display-only)
  const matrixData = useMemo(() => {
    if (!product) return null;

    // A product without package breakdown must NEVER display an empty matrix, zero package units, or fake package data.
    // Package breakdown only exists when packageAllocations are defined and non-empty.
    if (!packageAllocations || packageAllocations.length === 0) {
      return null;
    }

    // 1. Determine active colors and sizes dynamically strictly from allocations
    const allocColors = Array.from(new Set(packageAllocations.map(a => a.color).filter((c): c is string => Boolean(c))));
    const allocSizes = Array.from(new Set(packageAllocations.map(a => a.size).filter((s): s is string => Boolean(s))));

    let colors = colorsList.filter(c => allocColors.includes(c));
    allocColors.forEach(c => { if (!colors.includes(c)) colors.push(c); });

    let sizes = sizesList.filter(s => allocSizes.includes(s));
    allocSizes.forEach(s => { if (!sizes.includes(s)) sizes.push(s); });

    if (colors.length === 0) colors = allocColors;
    if (sizes.length === 0) sizes = allocSizes;

    if (colors.length === 0 || sizes.length === 0) {
      return null;
    }

    const cellMap: Record<string, Record<string, number>> = {};
    colors.forEach(c => {
      cellMap[c] = {};
      sizes.forEach(s => { cellMap[c][s] = 0; });
    });

    if (isFullStock && variants.length > 0) {
      // Authoritative live warehouse inventory breakdown for Full Stock
      variants.forEach(v => {
        const c = v.color || colors[0];
        const s = v.size || sizes[0];
        if (!cellMap[c]) cellMap[c] = {};
        cellMap[c][s] = (cellMap[c][s] || 0) + (v.stock || 0);
      });
    } else {
      // Standard package allocation scaled proportionally by quantity / moq
      const mult = quantity / moq;
      let runningTotal = 0;
      const flatList: { color: string; size: string; count: number }[] = [];

      packageAllocations.forEach(a => {
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

    // If grandTotal is 0 or less, do NOT show an empty matrix or zero package total
    if (grandTotal <= 0) {
      return null;
    }

    return { colors, sizes, cellMap, rowTotals, colTotals, grandTotal };
  }, [product, quantity, isFullStock, moq, colorsList, sizesList, variants, packageAllocations]);

  // Exact default Package Assortment message
  const DEFAULT_PACKAGE_ASSORTMENT_MESSAGE =
    "Each package includes a mixed assortment of all available colours and sizes. All listed colours and sizes will be included in the package. Quantity may vary by colour and size due to original surplus stock availability.";

  // Check hidden state: admin explicitly toggled package assortment to hidden
  const isAssortmentHidden =
    product?.packageAssortmentVisible === false ||
    (product as any)?.package_assortment_visible === false;
  const isAssortmentVisible = !isAssortmentHidden;

  // Safe message resolution: custom message has priority if non-empty, otherwise exact default
  const rawAssortmentMsg =
    product?.packageAssortmentMessage || (product as any)?.package_assortment_message;
  const resolvedAssortmentMessage =
    typeof rawAssortmentMsg === "string" && rawAssortmentMsg.trim().length > 0
      ? rawAssortmentMsg.trim()
      : DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;

  // Authoritative matrix presence: must have non-empty colors, sizes, and positive grand total
  const hasPackageAssortmentMatrix = Boolean(
    matrixData &&
    matrixData.colors.length > 0 &&
    matrixData.sizes.length > 0 &&
    matrixData.grandTotal > 0
  );

  // Pricing Row Click Handlers
  const handleSelectStandard = () => {
    setSelectedTier("standard");
    const targetQty = fullStockQuantity > 0 ? Math.min(moq, fullStockQuantity) : moq;
    setQuantity(targetQty);
    if (fullStockQuantity > 0 && targetQty === fullStockQuantity) {
      setSelectedTier("full_stock");
    }
  };

  const handleSelectBulk = () => {
    if (!hasBulkTier || bulkThreshold === undefined) return;
    setSelectedTier("bulk");
    const validBulkQty = Math.ceil(bulkThreshold / moq) * moq;
    const targetQty = fullStockQuantity > 0 ? Math.min(validBulkQty, fullStockQuantity) : validBulkQty;
    setQuantity(targetQty);
    if (fullStockQuantity > 0 && targetQty === fullStockQuantity) {
      setSelectedTier("full_stock");
    }
  };

  const handleSelectFullStock = () => {
    setSelectedTier("full_stock");
    if (fullStockQuantity > 0) {
      setQuantity(fullStockQuantity);
    }
  };

  const handleIncrement = () => {
    if (fullStockQuantity <= 0) return;
    if (quantity >= fullStockQuantity) return;

    const nextQty = Math.min(fullStockQuantity, quantity + moq);
    setQuantity(nextQty);
    if (nextQty === fullStockQuantity) {
      setSelectedTier("full_stock");
    } else if (hasBulkTier && bulkThreshold !== undefined && nextQty >= bulkThreshold) {
      setSelectedTier("bulk");
    } else {
      setSelectedTier("standard");
    }
  };

  const handleDecrement = () => {
    const minQty = Math.min(moq, fullStockQuantity > 0 ? fullStockQuantity : moq);
    if (quantity <= minQty) return;

    let prevQty: number;
    if (quantity === fullStockQuantity && quantity % moq !== 0) {
      // Step down from non-multiple full stock to the highest valid MOQ multiple below full stock
      prevQty = Math.max(minQty, Math.floor((quantity - 1) / moq) * moq);
    } else {
      prevQty = Math.max(minQty, quantity - moq);
    }

    setQuantity(prevQty);
    if (fullStockQuantity > 0 && prevQty === fullStockQuantity) {
      setSelectedTier("full_stock");
    } else if (hasBulkTier && bulkThreshold !== undefined && prevQty >= bulkThreshold) {
      setSelectedTier("bulk");
    } else {
      setSelectedTier("standard");
    }
  };


  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (!product) return;
    setErrorMessage("");

    if (currentPrice <= 0) {
      setErrorMessage("This product does not have a configured customer selling price. Please request a quote.");
      return;
    }

    // Authoritative client-side pre-validation
    if (!isFullStock && quantity < moq) {
      setErrorMessage(`Order quantity must be at least the minimum order quantity (${moq} pcs).`);
      return;
    }
    if (!isFullStock && quantity % moq !== 0) {
      setErrorMessage(`Order quantity must be an exact multiple of the MOQ (${moq} pcs).`);
      return;
    }
    if (fullStockQuantity > 0 && quantity > fullStockQuantity) {
      setErrorMessage(`Requested quantity (${quantity} pcs) exceeds available stock (${fullStockQuantity} pcs).`);
      return;
    }

    const packageBreakdown: import("@/types").PackageBreakdown[] = [];
    if (matrixData) {
      matrixData.colors.forEach(c => {
        matrixData.sizes.forEach(s => {
          const qty = matrixData.cellMap[c]?.[s] || 0;
          if (qty > 0) {
            const matchedVariant = variants.find(
              (v: any) => (v.color === c || !v.color) && (v.size === s || !v.size)
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

    if (isSoldOut) {
      setErrorMessage("This product is sold out and cannot be purchased.");
      return;
    }

    try {
      await addToCart(
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          categoryId: product.categoryId || "c_tops",
          price: currentPrice,
          images: product.images,
          badge: product.isHot ? "Hot" : undefined,
          sizes: sizesList,
          color: colorsList.join(", "),
          isNew: product.isNew,
          isPreorder: isPreorder,
          is_preorder: isPreorder,
          isSoldOut: isSoldOut,
          is_sold_out: isSoldOut,
          estimatedDeliveryDate: estimatedDelivery,
          estimated_delivery_date: estimatedDelivery,
          moq: moq,
        } as any,
        sizesList.length > 0 ? (sizesList.length === 1 ? sizesList[0] : "Assorted") : "",
        quantity,
        undefined,
        packageBreakdown,
        isFullStock ? "full_stock" : isBulk ? "bulk" : "standard"
      );
      setFeedbackMsg("Added to cart");
      setTimeout(() => {
        setFeedbackMsg("");
      }, 3000);
      setIsCartOpen(true);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to add to cart due to stock limits.");
      setTimeout(() => {
        setErrorMessage("");
      }, 6000);
    }
  };

  // Handle Add to RFQ (Wholesale Quotation Request)
  const handleAddToRfq = () => {
    if (!product) return;
    const tierName = isFullStock ? "Full Stock" : isBulk ? "Bulk" : "Standard";
    addToRfq(product, quantity, {
      color: colorsList.length > 0 ? colorsList[0] : "",
      size: sizesList.length > 0 ? sizesList[0] : "",
      targetPrice: currentPrice,
      buyerNotes: `Tier: ${tierName}, Quantity: ${quantity} pcs`,
    });
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
    }, 2500);
  };

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product || product.status === "draft") {
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
    <div className="w-full bg-background min-h-screen py-1.5 sm:py-3 lg:py-2">
      <div className="mx-auto w-full max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8 space-y-2.5 sm:space-y-3">
        
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

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* MAIN PRODUCT GRID (Balanced Left Gallery ~38-40%, Right Product Area ~60-62%, Controlled Gap) */}
        <div className="grid grid-cols-1 lg:grid-cols-[39%_minmax(0,1fr)] gap-5 lg:gap-6 xl:gap-7 items-start w-full max-w-[1480px] xl:max-w-[1560px] 2xl:max-w-[1600px] mx-auto">
          
          {/* LEFT: GALLERY / MEDIA + DESCRIPTION + SPECIFICATIONS */}
          <div className={`space-y-3.5 w-full max-w-[440px] sm:max-w-[480px] lg:max-w-none mx-auto lg:mx-0 ${isSoldOut ? "opacity-80 grayscale-[0.35]" : ""}`}>
            {/* Unified Media Experience (Images + Video + Lightbox) */}
            <ProductGallery
              images={product.images}
              productName={product.name}
              productSlug={product.slug}
              product={product}
              videoUrl={product.videoUrl}
              youtubeVideoId={product.youtubeVideoId}
              youtubeEmbedUrl={youtubeEmbedUrl || product.youtubeEmbedUrl}
              facebookVideoUrl={product.facebookVideoUrl || (product as any).facebook_video_url}
              facebookEmbedUrl={product.facebookEmbedUrl || (product as any).facebook_embed_url}
              videoEmbedUrl={product.videoEmbedUrl || (product as any).video_embed_url}
              variant="detail"
              overlayContent={
                <>
                  {/* Normalized Promotional Badges (Top Left) */}
                  <ProductPromotionBadges product={product} variant="detail" />

                  {/* Actual Brand Logo Overlay (Top Right) */}
                  <ProductBrandLogoOverlay
                    brandName={product.brand}
                    brandLogo={product.brandLogo || (product as any).brand_logo || (product as any).brand_data?.logo_url || (product as any).brand_data?.logo}
                    brandData={(product as any).brand_data}
                    size="detail"
                    className="top-2.5 right-2.5 sm:top-3 sm:right-3"
                  />
                </>
              }
            />

            {/* Structured Information Column: Description then Specifications */}
            <div className="pt-3 mt-3 border-t border-border/70 font-sans space-y-3">
              {/* Product Description */}
              {product.description && product.description.trim().length > 0 && (
                <div className="space-y-1.5">
                  <CommerceSectionHeader
                    title="Description"
                    icon={<FileText size={14} />}
                  />
                  <div
                    id="storefront-product-description"
                    data-testid="storefront-product-description"
                    className="rounded-lg bg-secondary/15 border border-border/60 p-3.5 sm:p-4 text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap break-words"
                  >
                    {renderFormattedProductDescription(product.description.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim())}
                  </div>
                </div>
              )}

              {/* Specifications: Technical Details */}
              <div className="space-y-1.5">
                <CommerceSectionHeader
                  title="Specifications"
                  icon={<Sliders size={14} />}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans items-start">
                  {/* Tile 1: Design Type */}
                  <SpecificationCard
                    label="Design Type"
                    value={
                      (product.designType || "").toUpperCase() === "MASTER COPY"
                        ? "MASTER COPY"
                        : product.designType || "ORIGINAL"
                    }
                    testId="spec-card-design-type"
                  />

                  {/* Tile 2: Material */}
                  <SpecificationCard
                    label="Material"
                    value={product.material || "—"}
                    testId="spec-card-material"
                  />

                  {/* Tile 3: Size (Explicit admin entry only — NEVER derived from variants) */}
                  <SpecificationCard
                    label="Size"
                    value={product.sizeDescription || product.size_description || "—"}
                    testId="spec-card-size"
                  />

                  {/* Tile 4: Colour (Explicit admin entry only — NEVER derived from variants) */}
                  <SpecificationCard
                    label="Colour"
                    value={product.colourDescription || product.colour_description || "—"}
                    testId="spec-card-colour"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: WHOLESALE PURCHASE HIERARCHY (~60-62% — Sticky on Desktop) */}
          <div className="lg:sticky lg:top-[72px] lg:self-start w-full min-w-0 flex flex-col space-y-2 sm:space-y-2.5">
            
            {/* ========================================================= */}
            {/* LEVEL 1: PRODUCT IDENTITY & METADATA STRIP */}
            {/* ========================================================= */}
            <div className="space-y-1 pb-2 border-b border-border/70">
              
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

                {/* SKU (Muted secondary monospace) */}
                {product.sku && (
                  <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11.5px] text-muted-foreground ml-auto sm:ml-2">
                    <span className="text-muted-foreground/60 uppercase text-[10px] font-bold">SKU:</span>
                    <span className="font-mono text-foreground/80 font-medium tracking-tight">{product.sku}</span>
                  </span>
                )}
              </div>

              {/* Product Title (Controlled Manrope Heading) */}
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-display font-extrabold uppercase tracking-tight text-foreground leading-tight pt-0.5">
                {product.name}
              </h1>

              {/* Merchandising Strip (Pre-Order / Sold Out) */}
              {isSoldOut ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-xs font-sans mt-2">
                  <ProductBadge variant="soldout">
                    SOLD OUT
                  </ProductBadge>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    This product is sold out and currently unavailable for purchase.
                  </span>
                </div>
              ) : isPreorder ? (
                <div className="flex items-center gap-2.5 p-2.5 px-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs font-sans mt-2">
                  <ProductBadge variant="preorder">
                    PRE-ORDER
                  </ProductBadge>
                  {estimatedDelivery && (
                    <span className="font-medium text-foreground">
                      Expected delivery:{" "}
                      <strong className="text-indigo-700 dark:text-indigo-300 font-semibold">
                        {new Date(estimatedDelivery).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </strong>
                    </span>
                  )}
                </div>
              ) : null}

              {/* LEVEL 2: CORE COMMERCIAL METADATA — MOQ & FULL STOCK */}
              <div className="pt-1 flex items-center gap-2 sm:gap-2.5 text-[12px] sm:text-[12.5px] font-sans">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-border/80 bg-secondary/30 text-foreground font-semibold">
                  <span className="text-muted-foreground font-normal">MOQ</span>
                  <span className="tabular-nums font-bold">{moq} PCS</span>
                </div>
                <span className="text-muted-foreground/40 select-none">|</span>
                <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      fullStockQuantity > 0 ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span>
                    <span className="text-muted-foreground">FULL STOCK</span>{" "}
                    <strong className={`font-semibold tabular-nums ${fullStockQuantity > 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}`}>
                      {fullStockQuantity.toLocaleString()} PCS
                    </strong>
                  </span>
                </div>
              </div>

            </div>

            {/* ========================================================= */}
            {/* LEVEL 3.1: VOLUME PRICING TIER MODULE */}
            {/* ========================================================= */}
            <div className="space-y-1 sm:space-y-1.5">
              <CommerceSectionHeader
                title="Pricing"
                className="pb-0"
              />
              <div className="rounded-lg border border-border/80 bg-card p-2 sm:p-2.5 space-y-0.5 shadow-2xs" role="radiogroup" aria-label="Pricing Tiers">
                {/* Column Legend (Visually Grouped: Tier + Quantity grouped, Price right-aligned) */}
                <div className="grid grid-cols-[105px_130px_1fr] sm:grid-cols-[120px_145px_1fr] px-2.5 pb-1 text-[10px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                  <div>Tier</div>
                  <div>Quantity</div>
                  <div className="text-right">Unit Price</div>
                </div>

                {/* STANDARD TIER */}
                <PricingTierOption
                  name="Standard"
                  quantityRange={hasBulkTier && bulkThreshold !== undefined ? `${moq}–${bulkThreshold - 1} pcs` : `${moq}+ pcs`}
                  unitPrice={standardPrice}
                  isSelected={isStandard}
                  onSelect={handleSelectStandard}
                />

                {/* BULK TIER (OPTIONAL) */}
                {hasBulkTier && bulkThreshold !== undefined && bulkPrice !== undefined && (
                  <PricingTierOption
                    name="Bulk"
                    quantityRange={`${bulkThreshold}+ pcs`}
                    unitPrice={bulkPrice}
                    isSelected={isBulk}
                    onSelect={handleSelectBulk}
                  />
                )}

                {/* FULL STOCK TIER - ALWAYS VISIBLE */}
                <PricingTierOption
                  name="Full Stock"
                  quantityRange={`${fullStockQuantity.toLocaleString()} pcs`}
                  unitPrice={resolvedFullStockPrice}
                  estimatedTotal={fullStockTotal > 0 ? fullStockTotal : undefined}
                  isSelected={isFullStock}
                  onSelect={handleSelectFullStock}
                  disabled={fullStockQuantity <= 0}
                />
              </div>
            </div>

            {/* ========================================================= */}
            {/* LEVEL 3.2: ORDER QUANTITY & ESTIMATED TOTAL DECISION BLOCK */}
            {/* ========================================================= */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-2 items-stretch">
                
                {/* Order Quantity Stepper Module */}
                <div className="sm:col-span-6 rounded-md border border-border/80 bg-card p-1.5 sm:p-2 flex flex-col justify-between space-y-1 shadow-2xs">
                  <CommerceSectionHeader
                    title="Order Quantity"
                  />
                  <QuantityStepper
                    quantity={quantity}
                    moq={moq}
                    step={moq}
                    maxStock={isPreorder ? 9999 : fullStockQuantity}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    isDecrementDisabled={quantity <= Math.min(moq, (!isPreorder && fullStockQuantity > 0) ? fullStockQuantity : moq)}
                    isIncrementDisabled={!isPreorder && fullStockQuantity > 0 && quantity >= fullStockQuantity}
                  />
                </div>

                {/* Estimated Total Commercial Summary Module */}
                <div className="sm:col-span-6">
                  <CommerceSummary
                    totalAmount={currentPrice * quantity}
                    quantity={quantity}
                    unitPrice={currentPrice}
                    activeTierName={isFullStock ? "Full Stock Tier" : isBulk ? "Bulk Tier" : "Standard Tier"}
                    className="h-full shadow-2xs rounded-md"
                  />
                </div>
              </div>

              {/* Real-time Selected-Quantity Logistics Impact Row */}
              <ProductSelectedLogisticsRow
                quantity={quantity}
                profiles={product?.shippingPackageProfiles ?? product?.shipping_package_profiles ?? []}
                moq={moq}
                packageAllocations={packageAllocations}
              />
            </div>

            {/* LEVEL 3.3: PACKAGE ASSORTMENT COMMERCE MODULE */}
            {matrixData && hasPackageAssortmentMatrix && isAssortmentVisible ? (
              <div>
                <div className="rounded-lg border border-border/80 bg-secondary/15 p-2.5 sm:p-3 space-y-2 shadow-2xs">
                  <CommerceSectionHeader
                    title="Package Assortment"
                    icon={<Package size={15} />}
                    badge={
                      <span className="text-[11px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background border border-border/70 text-foreground tabular-nums">
                        {`${matrixData.grandTotal.toLocaleString()} PCS TOTAL`}
                      </span>
                    }
                  />

                  {/* Ratio Matrix Component (Colors = Rows, Sizes = Columns, No Redundant Summary Pills) */}
                  <PackageAssortmentMatrix
                    matrixData={matrixData}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="rounded-lg border border-border/80 bg-secondary/15 p-2.5 sm:p-3 space-y-2 shadow-2xs">
                  <CommerceSectionHeader
                    title="Package Assortment"
                    icon={<Package size={15} />}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {resolvedAssortmentMessage}
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* LEVEL 4: PRIMARY ACTION (ADD TO CART) & SECONDARY CTAS */}
            {/* ========================================================= */}
            <div className="space-y-1.5 pt-0.5 font-sans">
              {/* Pre-order Notice near CTA */}
              {isPreorder && (
                <div className="p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-foreground flex items-center gap-2 mb-1">
                  <ProductBadge variant="preorder">PRE-ORDER</ProductBadge>
                  <span className="text-[11.5px] font-medium text-foreground">
                    {estimatedDelivery ? (
                      <>Expected delivery: <strong className="text-indigo-700 dark:text-indigo-300 font-semibold">{new Date(estimatedDelivery).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong></>
                    ) : (
                      "Pre-Order item with extended delivery timeline."
                    )}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  id="add-to-cart-button"
                  onClick={handleAddToCart}
                  disabled={isSoldOut || (availableInventory <= 0 && !isPreorder) || currentPrice <= 0}
                  className={`w-full sm:flex-1 h-10 lg:h-11 px-5 rounded-xl font-display font-extrabold text-[13px] sm:text-[14px] uppercase tracking-wider transition-all duration-150 shadow-md flex items-center justify-center gap-2 group ${
                    isSoldOut || (availableInventory <= 0 && !isPreorder) || currentPrice <= 0
                      ? "bg-secondary text-muted-foreground border border-border cursor-not-allowed"
                      : "bg-foreground text-background hover:bg-foreground/90 active:scale-[0.99] cursor-pointer"
                  }`}
                >
                  <ShoppingCart size={17} className={!isSoldOut && (availableInventory > 0 || isPreorder) ? "group-hover:scale-110 transition-transform" : ""} />
                  <span>{isSoldOut ? "Sold Out" : (availableInventory <= 0 && !isPreorder) ? "Out of Stock" : currentPrice <= 0 ? "Quote Only" : "Add to Cart"}</span>
                </button>

                <button
                  type="button"
                  id="add-to-rfq-button"
                  onClick={handleAddToRfq}
                  className={`w-full sm:flex-1 h-10 lg:h-11 px-5 rounded-xl font-display font-extrabold text-[13px] sm:text-[14px] uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-md flex items-center justify-center gap-2 border ${
                    addedRfqSuccess
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-card text-foreground border-border hover:bg-secondary/60 active:scale-[0.99]"
                  }`}
                  title="Add to Request for Quotation"
                >
                  {addedRfqSuccess ? (
                    <>
                      <Check size={17} />
                      <span>Added to RFQ</span>
                    </>
                  ) : (
                    <>
                      <FileText size={17} className="text-amber-500" />
                      <span>Request Quote (RFQ)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="wishlist-toggle-button"
                  onClick={() => {
                    if (product) {
                      toggleWishlist(toStorefrontProduct(product));
                    }
                  }}
                  className={`h-10 lg:h-11 w-10 lg:w-11 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-2xs self-end sm:self-auto ${
                    product && isInWishlist(product.id)
                      ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-800"
                      : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40 hover:border-border"
                  }`}
                  title={product && isInWishlist(product.id) ? "Saved to Wishlist" : "Add to Wishlist"}
                  aria-label={product && isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart size={18} className={product && isInWishlist(product.id) ? "fill-current text-rose-600" : ""} />
                </button>
              </div>

              {/* Secondary B2B Actions (WhatsApp Inquiry & RFQ Overview Link) */}
              {product && (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <a
                    href={getProductWhatsAppUrl(product, quantity)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1 h-9 px-3 rounded-lg bg-transparent hover:bg-secondary/30 border border-border/60 text-muted-foreground hover:text-[#25D366] font-sans font-semibold text-[10.5px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                  >
                    <MessageCircle size={14} className="opacity-70 group-hover:opacity-100" />
                    <span>Inquire on WhatsApp</span>
                  </a>

                  <Link
                    href="/rfq"
                    className="w-full sm:w-auto h-9 px-3.5 rounded-lg bg-transparent hover:bg-secondary/30 border border-border/60 text-muted-foreground hover:text-foreground font-sans font-semibold text-[10.5px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>View RFQ Cart</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* PRODUCTS FROM BRAND (Full-width section after all product detail content) */}
        {brandProducts.length > 0 && (
          <section
            aria-label={`Products from ${product.brand}`}
            className="w-full pt-8 sm:pt-10 lg:pt-12 mt-6 sm:mt-8 border-t border-border/80 space-y-4 sm:space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-display font-extrabold uppercase tracking-tight text-foreground">
                More from {product.brand}
              </h2>
              <Link
                href={`/search?brand=${encodeURIComponent(product.brand)}`}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
              >
                <span>View all</span>
                <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-6">
              {brandProducts.map((bp) => (
                <ProductCard
                  key={bp.id}
                  product={toStorefrontProduct(bp)}
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
