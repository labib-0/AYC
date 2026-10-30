import { Product } from "@/types";
import { B2BProductInput } from "@/types/b2b";
import { mockStore } from "@/lib/mock-data/mock-store";
import { findMatchingShippingProfile, calculateTotalCbm } from "@/lib/services/shipping-package";
import { inferProductCategory, DEFAULT_PACKAGE_ASSORTMENT_MESSAGE } from "@/lib/mock-data/mock-products";
import { getLowestValidCustomerUnitPrice } from "@/lib/product-pricing";
import { apiClient } from "./api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { productDraftService } from "@/lib/services/product-draft.service";
import { normalizeImageUrl, isValidImageUrl } from "@/lib/media";
import { homepageService } from "./homepage.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";

export interface ProductQueryParams {
  page?: number;
  per_page?: number | string;
  offset?: number;
  limit?: number;
  search?: string;
  q?: string;
  category?: string;
  brand?: string;
  audience?: string;
  design_type?: string;
  designType?: string;
  price_min?: number;
  price_max?: number;
  color?: string;
  size?: string;
  status?: string;
  is_featured?: boolean;
  is_hot?: boolean;
  is_new?: boolean;
  is_best_deal?: boolean;
  is_limited_deal?: boolean;
  is_preorder?: boolean;
  isPreorder?: boolean;
  is_sold_out?: boolean;
  isSoldOut?: boolean;
  availability?: "ready_stock" | "preorder" | "sold_out" | "low_stock" | "out_of_stock" | "all";
  in_stock?: boolean;
  sort?: string;
  sort_by?: "price_asc" | "price_desc" | "newest" | "popular" | "hot" | "featured" | "name_asc" | "name_desc";
  isAdmin?: boolean;
  all?: boolean;
  exclude?: string;
  product_id?: string;
  productId?: string;
  purchase_price_status?: string;
}

/** Shape returned by the paginated endpoint */
export interface PaginatedProductsResult {
  data: B2BProductInput[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface SearchSuggestionsProductItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  brandLogo?: string | null;
  price: number;
  has_valid_price?: boolean;
  image: string;
  moq?: number;
}

export interface SearchSuggestionsResult {
  products: SearchSuggestionsProductItem[];
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    image_url?: string;
  }>;
  brands: Array<{
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  }>;
}

/**
 * Normalizes raw product object into B2BProductInput
 */
export function normalizeToB2BProduct(p: any): B2BProductInput {
  const rawImages = Array.isArray(p.images) && p.images.length > 0 
    ? p.images 
    : [p.image_url || p.image || "/placeholder.jpg"];

  const images = rawImages.map((img: any) => {
    const raw = typeof img === "string" ? img : img?.image_url || img?.url || "";
    return normalizeImageUrl(raw, "/placeholder.jpg");
  }).filter((url: string) => isValidImageUrl(url));

  if (images.length === 0) {
    images.push("/placeholder.jpg");
  }

  let audienceVal: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" = "UNISEX";
  if (p.audience && ["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"].includes(String(p.audience).toUpperCase())) {
    audienceVal = String(p.audience).toUpperCase() as any;
  } else {
    const rawCat = (p.categoryId || p.category_id || p.category?.name || p.name || "").toLowerCase();
    if (rawCat.includes("men") && !rawCat.includes("women")) audienceVal = "MEN";
    else if (rawCat.includes("women")) audienceVal = "WOMEN";
    else if (rawCat.includes("boys")) audienceVal = "BOYS";
    else if (rawCat.includes("girls")) audienceVal = "GIRLS";
  }

  const rawDt = (p.designType || p.design_type || "").toString().toUpperCase();
  const designTypeVal: "ORIGINAL" | "MASTER COPY" =
    rawDt === "MASTER COPY" || rawDt === "REPLICA" || rawDt === "MC" ? "MASTER COPY" : "ORIGINAL";

  const categoryInfo = inferProductCategory(p);

  const rawWholesale = p.wholesalePrice !== undefined && p.wholesalePrice !== null
    ? Number(p.wholesalePrice)
    : p.wholesale_price !== undefined && p.wholesale_price !== null
    ? Number(p.wholesale_price)
    : p.price_cents !== undefined && p.price_cents !== null
    ? p.price_cents / 100
    : p.price !== undefined && p.price !== null
    ? Number(p.price)
    : undefined;

  let wholesalePrice: number = (rawWholesale !== undefined && rawWholesale > 0) ? rawWholesale : 0;

  if (wholesalePrice <= 0) {
    const rawTiers = p.pricingTiers || p.pricing_tiers;
    const tiers = Array.isArray(rawTiers) ? rawTiers : (typeof rawTiers === 'object' && rawTiers !== null ? Object.values(rawTiers) : []);
    const validTier = tiers.find((t: any) => Number(t.unit_price) > 0);
    if (validTier) {
      wholesalePrice = Number(validTier.unit_price);
    } else if (p.bulkPricingEnabled || p.bulk_pricing_enabled) {
      const bp = Number(p.bulkPrice || p.bulk_price);
      if (bp > 0) wholesalePrice = bp;
    } else if (p.fullStockPrice || p.full_stock_price) {
      const fsp = Number(p.fullStockPrice || p.full_stock_price);
      if (fsp > 0) wholesalePrice = fsp;
    }
  }


  const stock = p.stock !== undefined
    ? Number(p.stock)
    : p.inventory_count !== undefined
    ? Number(p.inventory_count)
    : p.availableStock !== undefined
    ? Number(p.availableStock)
    : 500;

  const newUntil = p.newUntil || p.new_until || null;
  const hotUntil = p.hotUntil || p.hot_until || null;
  const featuredUntil = p.featuredUntil || p.featured_until || null;

  const now = Date.now();
  const isNewExpired = newUntil ? new Date(newUntil).getTime() <= now : false;
  const isHotExpired = hotUntil ? new Date(hotUntil).getTime() <= now : false;
  const isFeaturedExpired = featuredUntil ? new Date(featuredUntil).getTime() <= now : false;

  const isHot = Boolean(p.isHot ?? p.is_hot ?? p.badge === "Hot") && !isHotExpired;
  const isNew = Boolean(p.isNew ?? p.is_new ?? p.badge === "New") && !isNewExpired;
  const isPinned = Boolean(p.isPinned ?? p.is_pinned ?? p.isFeatured ?? p.is_featured ?? p.featured) && !isFeaturedExpired;
  const isFeatured = isPinned;
  const isLimitedDeal = Boolean(p.isLimitedDeal || p.is_limited_deal || p.isLimitedTimeOffer);
  const isBestDeal = Boolean(
    p.isBestDeal ||
    p.is_best_deal ||
    p.isLimitedDeal ||
    p.isLimitedTimeOffer ||
    isFeatured ||
    isHot
  );

  const isPreorder = Boolean(p.isPreorder ?? p.is_preorder);
  const isSoldOut = Boolean(p.isSoldOut ?? p.is_sold_out);
  const estimatedDeliveryDate = p.estimatedDeliveryDate ?? p.estimated_delivery_date ?? null;

  let status: "published" | "draft" | "unpublished" = "published";
  if (p.status === "draft") status = "draft";
  else if (p.status === "archived" || p.status === "unpublished") status = "unpublished";

  const pricingTiers = Array.isArray(p.pricingTiers) ? p.pricingTiers : Array.isArray(p.pricing_tiers) ? p.pricing_tiers : (typeof (p.pricingTiers || p.pricing_tiers) === 'object' && (p.pricingTiers || p.pricing_tiers) !== null ? Object.values(p.pricingTiers || p.pricing_tiers) : []);
  const packageAllocations = Array.isArray(p.packageAllocations) ? p.packageAllocations : Array.isArray(p.package_allocations) ? p.package_allocations : (typeof (p.packageAllocations || p.package_allocations) === 'object' && (p.packageAllocations || p.package_allocations) !== null ? Object.values(p.packageAllocations || p.package_allocations) : []);
  const isPackageAssortment = p.isPackageAssortment ?? p.is_package_assortment ?? true;
  const rawVariants = p.variants || [];
  const variants = (
    Array.isArray(rawVariants)
      ? rawVariants
      : (typeof rawVariants === 'object' && rawVariants !== null && !(rawVariants as any).__PHP_Incomplete_Class_Name
          ? Object.values(rawVariants)
          : [])
  ).filter((v: any) => v && typeof v === "object" && !v.__PHP_Incomplete_Class_Name);
  const moqVal = p.moq ? Number(p.moq) : 10;
  const availableStock = variants.length > 0 ? variants.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0) : stock;

  const bulkPricingEnabled = p.bulkPricingEnabled !== undefined
    ? Boolean(p.bulkPricingEnabled)
    : p.bulk_pricing_enabled !== undefined
    ? Boolean(p.bulk_pricing_enabled)
    : (p.bulkThreshold !== undefined && p.bulkThreshold !== null && Number(p.bulkThreshold) > 0 && p.bulkPrice !== undefined && p.bulkPrice !== null && Number(p.bulkPrice) > 0)
      ? true
      : (p.bulk_threshold !== undefined && p.bulk_threshold !== null && Number(p.bulk_threshold) > 0 && p.bulk_price !== undefined && p.bulk_price !== null && Number(p.bulk_price) > 0)
      ? true
      : false;

  const rawBulkThreshold = p.bulkThreshold !== undefined && p.bulkThreshold !== null
    ? Number(p.bulkThreshold)
    : p.bulk_threshold !== undefined && p.bulk_threshold !== null
    ? Number(p.bulk_threshold)
    : (p.bulkMinimumQuantity !== undefined && p.bulkMinimumQuantity !== null ? Number(p.bulkMinimumQuantity) : (p.bulk_minimum_quantity !== undefined && p.bulk_minimum_quantity !== null ? Number(p.bulk_minimum_quantity) : null));

  const rawBulkPrice = p.bulkPrice !== undefined && p.bulkPrice !== null
    ? Number(p.bulkPrice)
    : p.bulk_price !== undefined && p.bulk_price !== null
    ? Number(p.bulk_price)
    : (p.bulkUnitPrice !== undefined && p.bulkUnitPrice !== null ? Number(p.bulkUnitPrice) : (p.bulk_unit_price !== undefined && p.bulk_unit_price !== null ? Number(p.bulk_unit_price) : null));

  const bulkThreshold = bulkPricingEnabled && rawBulkThreshold !== null && rawBulkThreshold > 0 ? rawBulkThreshold : undefined;
  const bulkPrice = bulkPricingEnabled && rawBulkPrice !== null && rawBulkPrice > 0 ? rawBulkPrice : undefined;

  const configuredFullStockPrice = p.configuredFullStockPrice !== undefined && p.configuredFullStockPrice !== null
    ? Number(p.configuredFullStockPrice)
    : p.full_stock_price !== undefined && p.full_stock_price !== null
    ? Number(p.full_stock_price)
    : (p.fullStockPrice !== undefined && p.fullStockPrice !== null ? Number(p.fullStockPrice) : null);

  const qualifyingThreshold = (bulkPricingEnabled && bulkThreshold !== undefined && bulkThreshold > 0) ? bulkThreshold : moqVal;
  const derivedEligibleQty = Math.floor(availableStock / moqVal) * moqVal;

  const isFullStockEligible = Boolean(
    p.isFullStockEligible ?? p.is_full_stock_eligible ?? (
      configuredFullStockPrice !== null &&
      configuredFullStockPrice > 0 &&
      (bulkPricingEnabled ? availableStock > qualifyingThreshold : availableStock >= moqVal) &&
      derivedEligibleQty > 0
    )
  );

  const fullStockQuantity = p.fullStockQuantity !== undefined && p.fullStockQuantity !== null
    ? Number(p.fullStockQuantity)
    : p.full_stock_quantity !== undefined && p.full_stock_quantity !== null
    ? Number(p.full_stock_quantity)
    : derivedEligibleQty;

  const normalMoqPrice = wholesalePrice;
  const isFullStockQualified = bulkPricingEnabled
    ? (availableStock > qualifyingThreshold)
    : (availableStock >= moqVal);

  const resolvedFullStockPrice = isFullStockQualified && configuredFullStockPrice !== null && configuredFullStockPrice > 0
    ? Math.min(configuredFullStockPrice, normalMoqPrice)
    : (p.fullStockPrice !== undefined && p.fullStockPrice !== null ? Number(p.fullStockPrice) : normalMoqPrice);

  const fullStockTotal = p.fullStockTotal !== undefined && p.fullStockTotal !== null
    ? Number(p.fullStockTotal)
    : p.full_stock_total !== undefined && p.full_stock_total !== null
    ? Number(p.full_stock_total)
    : Math.round(fullStockQuantity * resolvedFullStockPrice * 100) / 100;

  const brandName = typeof p.brand === "string" ? p.brand : p.brand?.name || "";
  const rawBrandLogo = p.brandLogo || p.brand_logo || p.brand_data?.logo_url || p.brand_data?.logo || p.brand?.logo_url || p.brand?.logo;
  const brandLogo = getBrandLogoUrl(brandName, rawBrandLogo) || undefined;

  const rawVideoUrl = (p.videoUrl || p.video_url || "").trim();
  let youtubeVideoId: string | undefined = p.youtubeVideoId || p.youtube_video_id || undefined;
  let youtubeEmbedUrl: string | undefined = p.youtubeEmbedUrl || p.youtube_embed_url || undefined;
  let facebookVideoUrl: string | undefined = p.facebookVideoUrl || p.facebook_video_url || undefined;
  let facebookEmbedUrl: string | undefined = p.facebookEmbedUrl || p.facebook_embed_url || undefined;
  let videoEmbedUrl: string | undefined = p.videoEmbedUrl || p.video_embed_url || undefined;
  let videoProvider: string | null = p.videoProvider || p.video_provider || null;

  if (rawVideoUrl) {
    const ytMatch = rawVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      youtubeVideoId = ytMatch[1];
      youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}`;
      videoProvider = "youtube";
      videoEmbedUrl = youtubeEmbedUrl;
    } else if (
      /facebook\.com|fb\.watch|fb\.gg/i.test(rawVideoUrl)
    ) {
      facebookVideoUrl = rawVideoUrl;
      facebookEmbedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawVideoUrl)}&show_text=false&t=0`;
      videoProvider = "facebook";
      videoEmbedUrl = facebookEmbedUrl;
    }
  }

  const costPrice = p.costPrice !== undefined && p.costPrice !== null
    ? Number(p.costPrice)
    : p.cost_price !== undefined && p.cost_price !== null
    ? Number(p.cost_price)
    : undefined;

  const rawShippingProfiles = p.shipping_package_profiles || p.shippingPackageProfiles;
  const shippingPackageProfiles = Array.isArray(rawShippingProfiles) && rawShippingProfiles.length > 0
    ? rawShippingProfiles.map((sp: any) => ({
        id: sp.id ? String(sp.id) : undefined,
        product_id: sp.product_id ? String(sp.product_id) : undefined,
        package_quantity: Number(sp.package_quantity || sp.min_quantity || 0),
        quantity_max: sp.quantity_max !== undefined && sp.quantity_max !== null ? Number(sp.quantity_max) : null,
        carton_count: Number(sp.carton_count || 1),
        carton_length: Number(sp.carton_length || 60),
        carton_width: Number(sp.carton_width || 40),
        carton_height: Number(sp.carton_height || 35),
        dimension_unit: (sp.dimension_unit || "cm") as "cm" | "in" | "m",
        gross_weight: Number(sp.gross_weight || 15),
        total_gross_weight: sp.total_gross_weight !== undefined ? Number(sp.total_gross_weight) : Number(sp.gross_weight || 15) * Number(sp.carton_count || 1),
        net_weight: sp.net_weight !== undefined && sp.net_weight !== null ? Number(sp.net_weight) : 13.5,
        weight_unit: (sp.weight_unit || "kg") as "kg" | "lbs" | "g",
        notes: sp.notes || null,
        is_active: sp.is_active !== undefined ? Boolean(sp.is_active) : true,
        total_cbm: sp.total_cbm !== undefined ? Number(sp.total_cbm) : undefined,
      }))
    : undefined;

  const onHandStock = p.onHandStock !== undefined && p.onHandStock !== null
    ? Number(p.onHandStock)
    : p.on_hand_stock !== undefined && p.on_hand_stock !== null
    ? Number(p.on_hand_stock)
    : availableStock;

  const realAvailableStock = p.availableStock !== undefined && p.availableStock !== null
    ? Number(p.availableStock)
    : p.available_stock !== undefined && p.available_stock !== null
    ? Number(p.available_stock)
    : onHandStock;

  const availableMoqs = p.availableMoqs !== undefined && p.availableMoqs !== null
    ? Number(p.availableMoqs)
    : p.available_moqs !== undefined && p.available_moqs !== null
    ? Number(p.available_moqs)
    : (moqVal > 0 ? Math.floor(realAvailableStock / moqVal) : 0);

  const warehouseBreakdown = Array.isArray(p.warehouseBreakdown)
    ? p.warehouseBreakdown
    : Array.isArray(p.warehouse_breakdown)
    ? p.warehouse_breakdown
    : undefined;

  const rawPid = p.productId ?? p.product_id ?? undefined;
  const cleanPid = rawPid !== undefined && rawPid !== null && String(rawPid).trim() !== "" ? String(rawPid).trim() : undefined;

  return {
    id: String(p.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    productId: cleanPid,
    product_id: cleanPid,
    name: p.name || "Untitled Product",
    slug: p.slug || (p.name || "prod").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    previousSlugs: Array.isArray(p.previousSlugs) ? p.previousSlugs : (Array.isArray(p.previous_slugs) ? p.previous_slugs : []),
    previous_slugs: Array.isArray(p.previous_slugs) ? p.previous_slugs : (Array.isArray(p.previousSlugs) ? p.previousSlugs : []),
    sku: p.sku || `AYN-${Date.now().toString(36).toUpperCase()}`,
    brand: brandName,
    brandLogo: brandLogo,
    brand_id: p.brand_id ? String(p.brand_id) : undefined,
    supplier_id: p.supplier_id ? (Number(p.supplier_id) || p.supplier_id) : (p.supplierId ? (Number(p.supplierId) || p.supplierId) : undefined),
    supplierId: p.supplierId ? (Number(p.supplierId) || p.supplierId) : (p.supplier_id ? (Number(p.supplier_id) || p.supplier_id) : undefined),
    supplier_name: p.supplier_name || p.supplierName || (typeof p.supplier === 'string' ? p.supplier : p.supplier?.name) || undefined,
    supplierName: p.supplierName || p.supplier_name || (typeof p.supplier === 'string' ? p.supplier : p.supplier?.name) || undefined,
    supplier: p.supplier || undefined,
    categoryId: categoryInfo.id,
    categoryName: categoryInfo.name,
    audience: audienceVal,
    designType: designTypeVal,
    productType: p.productType || p.product_type || "Ready-Made Garments",
    shortDescription: p.shortDescription || p.short_description || `Premium quality ${p.name} direct from Dhaka export facilities.`,
    description: p.description || `Premium apparel manufactured with high-tensile combed yarn and reactive dye technology. Compliant with international export standards (AQL 2.5).`,
    seoTitle: p.seoTitle || p.seo_title || undefined,
    seo_title: p.seo_title || p.seoTitle || undefined,
    seoDescription: p.seoDescription || p.seo_description || undefined,
    seo_description: p.seo_description || p.seoDescription || undefined,
    keywords: (() => {
      const rawKeywords = p.keywords !== undefined ? p.keywords : (p.seo_keywords !== undefined ? p.seo_keywords : p.seoKeywords);
      if (Array.isArray(rawKeywords)) {
        return rawKeywords.map(String);
      }
      if (typeof rawKeywords === "string" && rawKeywords.trim()) {
        try {
          const parsed = JSON.parse(rawKeywords);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
          return rawKeywords.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
        return rawKeywords.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      return [];
    })(),
    seo_keywords: (() => {
      const rawKeywords = p.keywords !== undefined ? p.keywords : (p.seo_keywords !== undefined ? p.seo_keywords : p.seoKeywords);
      if (Array.isArray(rawKeywords)) {
        return rawKeywords.map(String);
      }
      if (typeof rawKeywords === "string" && rawKeywords.trim()) {
        try {
          const parsed = JSON.parse(rawKeywords);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
          return rawKeywords.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
        return rawKeywords.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      return [];
    })(),
    material: p.material || "100% Cotton",
    colorName: p.colorName || p.color_name || p.color || "",
    colorHex: p.colorHex || p.color_hex || "#111827",
    videoUrl: rawVideoUrl || undefined,
    video_url: rawVideoUrl || undefined,
    youtubeVideoId: youtubeVideoId,
    youtubeEmbedUrl: youtubeEmbedUrl,
    facebookVideoUrl: facebookVideoUrl,
    facebook_video_url: facebookVideoUrl,
    facebookEmbedUrl: facebookEmbedUrl,
    facebook_embed_url: facebookEmbedUrl,
    videoEmbedUrl: videoEmbedUrl || p.videoEmbedUrl || p.video_embed_url || undefined,
    video_embed_url: videoEmbedUrl || p.videoEmbedUrl || p.video_embed_url || undefined,
    videoProvider: videoProvider || p.videoProvider || p.video_provider || null,
    vimeoVideoId: p.vimeoVideoId || p.vimeo_video_id || null,
    images: images,
    costPrice: costPrice,
    purchasePriceUpdated: p.purchasePriceUpdated !== undefined ? p.purchasePriceUpdated : null,
    purchasePriceUpdatedAt: p.purchasePriceUpdatedAt || p.purchase_price_updated_at || null,
    wholesalePrice: wholesalePrice,
    standardPrice: wholesalePrice,
    bulkPricingEnabled: bulkPricingEnabled,
    bulk_pricing_enabled: bulkPricingEnabled,
    bulkThreshold: bulkThreshold,
    bulkPrice: bulkPrice,
    bulkMinimumQuantity: bulkThreshold,
    bulk_minimum_quantity: bulkThreshold,
    bulkUnitPrice: bulkPrice,
    bulk_unit_price: bulkPrice,
    fullStockPrice: resolvedFullStockPrice,
    configuredFullStockPrice: configuredFullStockPrice ?? undefined,
    isFullStockEligible: isFullStockEligible,
    fullStockQuantity: fullStockQuantity,
    fullStockTotal: fullStockTotal,
    moq: moqVal,
    stock: realAvailableStock,
    initialStock: Number(p.initialStock ?? p.initial_stock ?? realAvailableStock),
    initial_stock: Number(p.initial_stock ?? p.initialStock ?? realAvailableStock),
    onHandStock,
    on_hand_stock: onHandStock,
    availableStock: realAvailableStock,
    available_stock: realAvailableStock,
    availableMoqs,
    available_moqs: availableMoqs,
    warehouseBreakdown,
    status: status,
    sizeDescription: p.sizeDescription || p.size_description || undefined,
    size_description: p.size_description || p.sizeDescription || undefined,
    colourDescription: p.colourDescription || p.colour_description || undefined,
    colour_description: p.colour_description || p.colourDescription || undefined,
    packageAssortmentVisible: p.packageAssortmentVisible !== false && p.package_assortment_visible !== false,
    package_assortment_visible: p.package_assortment_visible !== false && p.packageAssortmentVisible !== false,
    packageAssortmentMessage: typeof (p.packageAssortmentMessage ?? p.package_assortment_message) === "string" && (p.packageAssortmentMessage ?? p.package_assortment_message).trim() !== "" ? (p.packageAssortmentMessage ?? p.package_assortment_message).trim() : DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
    package_assortment_message: typeof (p.package_assortment_message ?? p.packageAssortmentMessage) === "string" && (p.package_assortment_message ?? p.packageAssortmentMessage).trim() !== "" ? (p.package_assortment_message ?? p.packageAssortmentMessage).trim() : DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
    isHiddenFromStorefront: Boolean(p.isHiddenFromStorefront ?? p.is_hidden_from_storefront),
    is_hidden_from_storefront: Boolean(p.isHiddenFromStorefront ?? p.is_hidden_from_storefront),
    isPinned: isPinned,
    is_pinned: isPinned,
    pinnedOrder: (p as any).pinnedOrder ?? (p as any).pinned_order ?? (p as any).featuredSortOrder ?? (p as any).featured_sort_order,
    pinned_order: (p as any).pinnedOrder ?? (p as any).pinned_order ?? (p as any).featuredSortOrder ?? (p as any).featured_sort_order,
    isFeatured: isFeatured,
    featuredUntil: featuredUntil,
    featured_until: featuredUntil,
    isNew: isNew,
    newUntil: newUntil,
    new_until: newUntil,
    isHot: isHot,
    hotUntil: hotUntil,
    hot_until: hotUntil,
    isLimitedDeal: isLimitedDeal,
    isBestDeal: isBestDeal,
    isPreorder: isPreorder,
    is_preorder: isPreorder,
    isSoldOut: isSoldOut,
    is_sold_out: isSoldOut,
    estimatedDeliveryDate: estimatedDeliveryDate,
    estimated_delivery_date: estimatedDeliveryDate,
    sizes: p.sizes || ["S", "M", "L", "XL", "2XL"],
    colors: p.colors || (p.color_name || p.color ? [p.color_name || p.color] : []),
    variants: variants,
    pricingTiers: pricingTiers.length > 0 ? pricingTiers : (
      bulkPricingEnabled && bulkThreshold && bulkPrice
        ? [
            { min_quantity: moqVal, max_quantity: bulkThreshold - 1, unit_price: wholesalePrice },
            { min_quantity: bulkThreshold, max_quantity: fullStockQuantity > bulkThreshold ? fullStockQuantity - 1 : availableStock, unit_price: bulkPrice },
            ...(fullStockQuantity > 0 ? [{ min_quantity: fullStockQuantity, max_quantity: fullStockQuantity, unit_price: resolvedFullStockPrice }] : []),
          ]
        : [
            { min_quantity: moqVal, max_quantity: fullStockQuantity > moqVal ? fullStockQuantity - 1 : null, unit_price: wholesalePrice },
            ...(fullStockQuantity > 0 ? [{ min_quantity: fullStockQuantity, max_quantity: fullStockQuantity, unit_price: resolvedFullStockPrice }] : []),
          ]
    ),
    packageAllocations: packageAllocations,
    shippingPackageProfiles: shippingPackageProfiles,
    shipping_package_profiles: shippingPackageProfiles,
    isPackageAssortment: isPackageAssortment,
    sort_order: p.sort_order !== undefined ? Number(p.sort_order) : (p.sortOrder !== undefined ? Number(p.sortOrder) : 0),
    sortOrder: p.sort_order !== undefined ? Number(p.sort_order) : (p.sortOrder !== undefined ? Number(p.sortOrder) : 0),
    createdAt: p.createdAt || p.created_at || undefined,
    created_at: p.created_at || p.createdAt || undefined,
    updatedAt: p.updatedAt || p.updated_at || undefined,
    updated_at: p.updated_at || p.updatedAt || undefined,
  };
}

export const normalizeProduct = normalizeToB2BProduct;

/**
 * Maps B2B product or raw API product to standard Storefront Product interface
 */
export function toStorefrontProduct(p: any): Product {
  let resolvedPrice: number | undefined = undefined;

  if (p.price !== undefined && p.price !== null && Number(p.price) > 0) {
    resolvedPrice = Number(p.price);
  } else if (p.wholesalePrice !== undefined && p.wholesalePrice !== null && Number(p.wholesalePrice) > 0) {
    resolvedPrice = Number(p.wholesalePrice);
  } else if (p.wholesale_price !== undefined && p.wholesale_price !== null && Number(p.wholesale_price) > 0) {
    resolvedPrice = Number(p.wholesale_price);
  } else if (p.standardPrice !== undefined && p.standardPrice !== null && Number(p.standardPrice) > 0) {
    resolvedPrice = Number(p.standardPrice);
  } else {
    // Fallback to pricing tiers if wholesale_price was not set or 0
    const rawTiers = p.pricingTiers || p.pricing_tiers;
    const tiers = Array.isArray(rawTiers) ? rawTiers : (typeof rawTiers === 'object' && rawTiers !== null ? Object.values(rawTiers) : []);
    const validTier = tiers.find((t: any) => Number(t.unit_price) > 0);
    if (validTier) {
      resolvedPrice = Number(validTier.unit_price);
    } else if (p.bulkPricingEnabled || p.bulk_pricing_enabled) {
      const bp = Number(p.bulkPrice || p.bulk_price);
      if (bp > 0) resolvedPrice = bp;
    } else if (p.fullStockPrice || p.full_stock_price) {
      const fsp = Number(p.fullStockPrice || p.full_stock_price);
      if (fsp > 0) resolvedPrice = fsp;
    }
  }

  const rawImages = Array.isArray(p.images) && p.images.length > 0
    ? p.images
    : [p.image_url || p.image || "/placeholder.jpg"];

  const images = rawImages.map((img: any) => {
    if (typeof img === "string") return img;
    return img?.image_url || img?.url || "";
  }).filter((url: string) => Boolean(url && url.trim()));

  if (images.length === 0) {
    images.push("/placeholder.jpg");
  }

  const bulkPricingEnabled = p.bulkPricingEnabled !== undefined
    ? Boolean(p.bulkPricingEnabled)
    : p.bulk_pricing_enabled !== undefined
    ? Boolean(p.bulk_pricing_enabled)
    : Boolean((p.bulkThreshold || p.bulk_threshold) && (p.bulkPrice || p.bulk_price));

  const bulkThreshold = bulkPricingEnabled
    ? (p.bulkThreshold !== undefined && p.bulkThreshold !== null ? Number(p.bulkThreshold) : (p.bulk_threshold !== undefined && p.bulk_threshold !== null ? Number(p.bulk_threshold) : undefined))
    : undefined;

  const bulkPrice = bulkPricingEnabled
    ? (p.bulkPrice !== undefined && p.bulkPrice !== null ? Number(p.bulkPrice) : (p.bulk_price !== undefined && p.bulk_price !== null ? Number(p.bulk_price) : undefined))
    : undefined;

  const rawPid = p.productId ?? p.product_id ?? undefined;
  const cleanPid = rawPid !== undefined && rawPid !== null && String(rawPid).trim() !== "" ? String(rawPid).trim() : undefined;

  // Authoritative lowest valid customer-facing unit price
  const lowestCustomerPrice = getLowestValidCustomerUnitPrice(p);
  const resolvedLowestPrice = lowestCustomerPrice !== null ? lowestCustomerPrice : resolvedPrice;

  return {
    id: String(p.id),
    productId: cleanPid,
    product_id: cleanPid,
    name: p.name,
    slug: p.slug,
    previousSlugs: Array.isArray(p.previousSlugs) ? p.previousSlugs : (Array.isArray(p.previous_slugs) ? p.previous_slugs : []),
    previous_slugs: Array.isArray(p.previous_slugs) ? p.previous_slugs : (Array.isArray(p.previousSlugs) ? p.previousSlugs : []),
    price: resolvedLowestPrice,
    effectiveCustomerUnitPrice: lowestCustomerPrice,
    effective_customer_unit_price: lowestCustomerPrice,
    lowestCustomerUnitPrice: lowestCustomerPrice,
    lowest_customer_unit_price: lowestCustomerPrice,
    has_valid_price: Boolean(resolvedLowestPrice && resolvedLowestPrice > 0),
    hasValidPrice: Boolean(resolvedLowestPrice && resolvedLowestPrice > 0),
    wholesalePrice: resolvedPrice,
    wholesale_price: resolvedPrice,
    standardPrice: p.standardPrice && Number(p.standardPrice) > 0 ? Number(p.standardPrice) : resolvedPrice,
    standard_price: p.standardPrice && Number(p.standardPrice) > 0 ? Number(p.standardPrice) : resolvedPrice,
    bulkPricingEnabled,
    bulk_pricing_enabled: bulkPricingEnabled,
    bulkThreshold,
    bulk_threshold: bulkThreshold,
    bulkPrice,
    bulk_price: bulkPrice,
    bulkMinimumQuantity: bulkThreshold,
    bulk_minimum_quantity: bulkThreshold,
    bulkUnitPrice: bulkPrice,
    bulk_unit_price: bulkPrice,
    fullStockPrice: p.fullStockPrice !== undefined ? Number(p.fullStockPrice) : (p.full_stock_price !== undefined ? Number(p.full_stock_price) : undefined),
    full_stock_price: p.fullStockPrice !== undefined ? Number(p.fullStockPrice) : (p.full_stock_price !== undefined ? Number(p.full_stock_price) : undefined),
    categoryId: p.categoryId || p.category_id || (p.categories?.[0]?.id ? String(p.categories[0].id) : "c_sweaters"),
    categoryName: p.categoryName || (p.categories?.[0]?.name ? String(p.categories[0].name) : undefined),
    audience: p.audience || "UNISEX",
    designType: p.designType || p.design_type || "ORIGINAL",
    images: images,
    isNew: Boolean(p.isNew ?? p.is_new),
    newUntil: p.newUntil || p.new_until,
    isHot: Boolean(p.isHot ?? p.is_hot),
    hotUntil: p.hotUntil || p.hot_until,
    isFeatured: Boolean(p.isFeatured ?? p.is_featured),
    featuredUntil: p.featuredUntil || p.featured_until,
    isLimitedTimeOffer: Boolean(p.isLimitedDeal ?? p.is_limited_deal),
    isPreorder: Boolean(p.isPreorder ?? p.is_preorder),
    is_preorder: Boolean(p.isPreorder ?? p.is_preorder),
    isSoldOut: Boolean(p.isSoldOut ?? p.is_sold_out),
    is_sold_out: Boolean(p.isSoldOut ?? p.is_sold_out),
    estimatedDeliveryDate: p.estimatedDeliveryDate ?? p.estimated_delivery_date ?? null,
    estimated_delivery_date: p.estimatedDeliveryDate ?? p.estimated_delivery_date ?? null,
    videoProvider: p.videoProvider || p.video_provider,
    sizes: p.sizes || (Array.isArray(p.variants) && p.variants.length > 0 ? Array.from(new Set(p.variants.map((v: any) => v.size).filter(Boolean))) as string[] : ["S", "M", "L", "XL", "2XL"]),
    moq: p.moq !== undefined ? Number(p.moq) : 1,
    stock: p.availableStock !== undefined ? Number(p.availableStock) : (p.stock !== undefined ? Number(p.stock) : (p.inventory_count !== undefined ? Number(p.inventory_count) : 0)),
    availableStock: p.availableStock !== undefined ? Number(p.availableStock) : (p.stock !== undefined ? Number(p.stock) : (p.inventory_count !== undefined ? Number(p.inventory_count) : 0)),
    initialStock: p.initialStock !== undefined ? Number(p.initialStock) : (p.initial_stock !== undefined ? Number(p.initial_stock) : (p.stock !== undefined ? Number(p.stock) : (p.availableStock !== undefined ? Number(p.availableStock) : 0))),
    initial_stock: p.initial_stock !== undefined ? Number(p.initial_stock) : (p.initialStock !== undefined ? Number(p.initialStock) : (p.stock !== undefined ? Number(p.stock) : (p.availableStock !== undefined ? Number(p.availableStock) : 0))),
    availableMoqs: p.availableMoqs !== undefined ? Number(p.availableMoqs) : (p.available_moqs !== undefined ? Number(p.available_moqs) : ((p.moq && Number(p.moq) > 0) ? Math.floor((Number(p.availableStock ?? p.stock ?? 0)) / Number(p.moq)) : 0)),
    onHandStock: p.onHandStock !== undefined ? Number(p.onHandStock) : (p.on_hand_stock !== undefined ? Number(p.on_hand_stock) : undefined),
    brand: typeof p.brand === "string" ? p.brand : p.brand?.name || "Ayaan",
    brandLogo: getBrandLogoUrl(typeof p.brand === "string" ? p.brand : p.brand?.name, p.brandLogo || p.brand_logo || p.brand_data?.logo_url || p.brand_data?.logo || p.brand?.logo_url || p.brand?.logo) || undefined,
    brand_logo: getBrandLogoUrl(typeof p.brand === "string" ? p.brand : p.brand?.name, p.brandLogo || p.brand_logo || p.brand_data?.logo_url || p.brand_data?.logo || p.brand?.logo_url || p.brand?.logo) || undefined,
    color: p.colorName || p.color_name,
    description: p.description || p.shortDescription || p.short_description,
    seoTitle: p.seoTitle || p.seo_title,
    seoDescription: p.seoDescription || p.seo_description,
    keywords: p.keywords || p.seo_keywords || [],
    pricingTiers: p.pricingTiers || p.pricing_tiers,
    packageAllocations: p.packageAllocations || p.package_allocations,
    shippingPackageProfiles: p.shippingPackageProfiles || p.shipping_package_profiles,
    shipping_package_profiles: p.shipping_package_profiles || p.shippingPackageProfiles,
    isPackageAssortment: Boolean(p.isPackageAssortment ?? p.is_package_assortment),
    fullStockQuantity: p.fullStockQuantity || p.full_stock_quantity,
    videoUrl: p.videoUrl || p.video_url,
    youtubeVideoId: p.youtubeVideoId || p.youtube_video_id,
    sizeDescription: p.sizeDescription || p.size_description || undefined,
    size_description: p.size_description || p.sizeDescription || undefined,
    colourDescription: p.colourDescription || p.colour_description || undefined,
    colour_description: p.colour_description || p.colourDescription || undefined,
    packageAssortmentVisible: p.packageAssortmentVisible !== false && p.package_assortment_visible !== false,
    package_assortment_visible: p.package_assortment_visible !== false && p.packageAssortmentVisible !== false,
    packageAssortmentMessage: typeof (p.packageAssortmentMessage ?? p.package_assortment_message) === "string" && (p.packageAssortmentMessage ?? p.package_assortment_message).trim() !== "" ? (p.packageAssortmentMessage ?? p.package_assortment_message).trim() : DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
    package_assortment_message: typeof (p.package_assortment_message ?? p.packageAssortmentMessage) === "string" && (p.package_assortment_message ?? p.packageAssortmentMessage).trim() !== "" ? (p.package_assortment_message ?? p.packageAssortmentMessage).trim() : DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
    isHiddenFromStorefront: Boolean(p.isHiddenFromStorefront ?? p.is_hidden_from_storefront),
    is_hidden_from_storefront: Boolean(p.isHiddenFromStorefront ?? p.is_hidden_from_storefront),
    status: p.status || "draft",
    isDraft: (p.status || "draft") === "draft",
    createdAt: p.createdAt || p.created_at || undefined,
    created_at: p.created_at || p.createdAt || undefined,
    updatedAt: p.updatedAt || p.updated_at || undefined,
    updated_at: p.updated_at || p.updatedAt || undefined,
  };
}

/**
 * Generate a clean standard B2B SKU
 */
export function generateProductSku(brand: string, category: string, name: string): string {
  const b = (brand || "AYN").replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase();
  const c = (category || "GEN").replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase();
  const n = (name || "PRD").replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${b}-${c}-${n}-${rand}`;
}

export class ProductService {
  /**
   * Fetch authoritative Admin product statistics from backend
   */
   async getProductStatistics(): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    lowStock: number;
    purchasePricePending: number;
    featured: number;
  }> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/products/statistics");
        const data = res?.data || res;
        if (data && typeof data.total !== "undefined") {
          return {
            total: Number(data.total ?? data.total_products ?? 0),
            published: Number(data.published ?? data.published_products ?? data.active_products ?? 0),
            draft: Number(data.draft ?? data.draft_products ?? 0),
            archived: Number(data.archived ?? data.archived_products ?? 0),
            lowStock: Number(data.low_stock ?? data.low_stock_products ?? data.low_stock_items ?? 0),
            purchasePricePending: Number(data.price_pending ?? data.purchase_price_pending ?? 0),
            featured: Number(data.featured ?? data.featured_products ?? 0),
          };
        }
      } catch {
        // Fallback to dashboard endpoint if available
        try {
          const dashRes = await apiClient.get<any>("/admin/dashboard");
          const dashData = dashRes?.data || dashRes;
          if (dashData && typeof dashData.total_products !== "undefined") {
            const pub = Number(dashData.published_products ?? dashData.active_products ?? 0);
            return {
              total: Number(dashData.total_products || 0),
              published: pub,
              draft: Number(dashData.draft_products || 0),
              archived: Number(dashData.archived_products || 0),
              lowStock: Number(dashData.low_stock_items ?? dashData.low_stock_products ?? 0),
              purchasePricePending: 0,
              featured: Number(dashData.featured_products ?? dashData.featured ?? 0),
            };
          }
        } catch {
          // Fall through to mockStore
        }
      }
    }

    const all = mockStore.getProducts();
    const published = all.filter((p) => p.status === "published").length;
    const draft = all.filter((p) => p.status === "draft").length;
    const archived = all.filter((p) => (p.status as any) === "archived").length;
    const lowStock = all.filter((p) => {
      const avail = p.availableStock !== undefined ? Number(p.availableStock) : Number(p.stock || 0);
      const effectiveMoq = p.moq && Number(p.moq) > 1 ? Number(p.moq) : 1;
      return avail < effectiveMoq;
    }).length;

    const now = Date.now();
    const featured = all.filter((p) => {
      const featuredUntil = p.featuredUntil || p.featured_until || null;
      const isFeaturedExpired = featuredUntil ? new Date(featuredUntil).getTime() <= now : false;
      return (
        Boolean(p.isFeatured ?? p.is_featured ?? p.featured) &&
        !isFeaturedExpired &&
        (p.status as any) !== "archived"
      );
    }).length;

    return {
      total: all.length,
      published,
      draft,
      archived,
      lowStock,
      purchasePricePending: all.filter((p) => (p as any).purchasePriceUpdated === false).length,
      featured,
    };
  }

  /**
   * Fetch products with query parameters
   */
  async getProducts(params?: ProductQueryParams, signal?: AbortSignal): Promise<B2BProductInput[]> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/products", {
          params: params as Record<string, string | number | boolean | undefined>,
          signal,
        } as any);
        const items = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(items)) {
          return items.map(normalizeToB2BProduct);
        }
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.message === "AbortError") {
          throw err;
        }
        // Fall through to mockStore
      }
    }

    const all = mockStore.getProducts();
    let result = this.filterLocalProducts(all, params);
    if (params?.offset !== undefined || params?.limit !== undefined) {
      const start = params?.offset ?? 0;
      const end = params?.limit !== undefined ? start + params.limit : undefined;
      result = result.slice(start, end);
    }
    return result;
  }

  /**
   * Fetch a single server-paginated page of products
   */
  async getProductsPaginated(
    params: ProductQueryParams,
    _signal?: AbortSignal
  ): Promise<PaginatedProductsResult> {
    const defaultMeta = {
      current_page: params.page ?? 1,
      last_page: 1,
      per_page: Number(params.per_page ?? 24),
      total: 0,
      from: null,
      to: null,
    };

    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/products", {
          params: params as Record<string, string | number | boolean | undefined>,
          signal: _signal,
        } as any);

        const rawData = res?.data;
        const rawMeta = res?.meta;
        const items = Array.isArray(rawData) ? rawData : (Array.isArray(res) ? res : []);

        return {
          data: items.map(normalizeToB2BProduct),
          meta: rawMeta
            ? {
                current_page: Number(rawMeta.current_page ?? defaultMeta.current_page),
                last_page: Number(rawMeta.last_page ?? 1),
                per_page: Number(rawMeta.per_page ?? defaultMeta.per_page),
                total: Number(rawMeta.total ?? items.length),
                from: rawMeta.from != null ? Number(rawMeta.from) : null,
                to: rawMeta.to != null ? Number(rawMeta.to) : null,
              }
            : defaultMeta,
        };
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.message === "AbortError") {
          throw err;
        }
        // Fall through to local dataset when backend connection fails or offline
      }
    }

    const all = mockStore.getProducts();
    const filtered = this.filterLocalProducts(all, params);
    const page = params.page ?? 1;
    const perPage = Number(params.per_page ?? 24);
    const start = (page - 1) * perPage;
    const sliced = filtered.slice(start, start + perPage);

    return {
      data: sliced,
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(filtered.length / perPage)),
        per_page: perPage,
        total: filtered.length,
        from: filtered.length > 0 ? start + 1 : null,
        to: filtered.length > 0 ? Math.min(start + perPage, filtered.length) : null,
      },
    };
  }

  /**
   * Fetch single product by Slug or ID
   */
  async getProductBySlugOrId(slugOrId: string): Promise<B2BProductInput | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/products/${slugOrId}`);
        const item = res?.data || res;
        if (item && item.id) {
          return normalizeToB2BProduct(item);
        }
        // If not found in backend response, fallback to mockStore
        return mockStore.getProductByIdOrSlug(slugOrId);
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) {
          return mockStore.getProductByIdOrSlug(slugOrId);
        }
        const fallback = mockStore.getProductByIdOrSlug(slugOrId);
        if (fallback) return fallback;
        throw err;
      }
    }

    return mockStore.getProductByIdOrSlug(slugOrId);
  }

  /**
   * Fetch search suggestions (quick autocomplete) with multi-dimensional product matching & relevance scoring
   */
  async getSearchSuggestions(
    query: string,
    options?: { signal?: AbortSignal }
  ): Promise<SearchSuggestionsResult> {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { products: [], categories: [], brands: [] };
    }

    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/search/suggestions", {
          params: { q },
          signal: options?.signal,
        });
        const data = res?.data || res;
        return {
          products: Array.isArray(data?.products) ? data.products : [],
          categories: Array.isArray(data?.categories) ? data.categories : [],
          brands: Array.isArray(data?.brands) ? data.brands : [],
        };
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
          throw err;
        }
        // Fall through to offline mock store search
      }
    }

    const allProducts = mockStore.getProducts();
    const allCategories = mockStore.getCategories();
    const allBrands = mockStore.getBrands();

    // Map categories for rapid lookup
    const categoryNameMap = new Map<string, string>();
    allCategories.forEach((c) => {
      categoryNameMap.set(String(c.id).toLowerCase(), (c.name || "").toLowerCase());
      categoryNameMap.set((c.slug || "").toLowerCase(), (c.name || "").toLowerCase());
    });

    // Score products across Title, SKU, Brand, Category, and Description
    const scoredProducts = allProducts.map((p) => {
      let score = 0;
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const catId = String(p.categoryId || (p as any).category_id || "").toLowerCase();
      const catName = (p.categoryName || (p as any).category_name || categoryNameMap.get(catId) || "").toLowerCase();
      const desc = `${p.description || ""} ${p.shortDescription || ""}`.toLowerCase();

      // 1. Title match
      if (name === q) {
        score += 100;
      } else if (name.startsWith(q)) {
        score += 80;
      } else if (name.includes(q)) {
        score += 60;
      }

      // 2. SKU match
      if (sku === q) {
        score += 70;
      } else if (sku.startsWith(q)) {
        score += 50;
      } else if (sku.includes(q)) {
        score += 45;
      }

      // 3. Brand match (e.g., typing 'Lacoste', 'Nike', 'H&M' finds all products for that brand)
      if (brand === q) {
        score += 65;
      } else if (brand.includes(q)) {
        score += 40;
      }

      // 4. Category match (e.g., typing 'Sweater', 'Jeans', 'Shirt')
      if (catName === q) {
        score += 55;
      } else if (catName.includes(q)) {
        score += 35;
      }

      // 5. Description match
      if (desc.includes(q)) {
        score += 10;
      }

      return { product: p, score };
    });

    // Filter to only products with positive relevance score
    const matched = scoredProducts
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ product: p }) => {
        const rawPrice = p.standardPrice ?? p.wholesalePrice ?? 0;
        return {
          id: String(p.id),
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          brand: p.brand || "Ayaan",
          brandLogo: (p as any).brandLogo || (p as any).brand_logo || null,
          price: rawPrice,
          has_valid_price: rawPrice > 0,
          image: p.images?.[0] || "/placeholder.jpg",
          moq: p.moq || 10,
        };
      });

    const matchedCategories = allCategories
      .filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      .slice(0, 4)
      .map((c) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        image_url: c.image_url || c.image,
      }));

    const matchedBrands = allBrands
      .filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q))
      .slice(0, 4)
      .map((b) => ({
        id: String(b.id),
        name: b.name,
        slug: b.slug,
        logo_url: b.logo_url || b.logo,
      }));

    return {
      products: matched,
      categories: matchedCategories,
      brands: matchedBrands,
    };
  }

  /**
   * Helper to serialize camelCase B2BProductInput to snake_case format expected by Laravel API
   */
  public static toBackendPayload(input: Partial<B2BProductInput>): Record<string, any> {
    const payload: Record<string, any> = { ...input };

    if ((input as any).productId !== undefined) {
      payload.product_id = String((input as any).productId).replace(/\s+/g, "");
      payload.productId = payload.product_id;
    }
    if ((input as any).product_id !== undefined) {
      payload.product_id = String((input as any).product_id).replace(/\s+/g, "");
      payload.productId = payload.product_id;
    }
    if (payload.product_id === "" && input.id && !String(input.id).startsWith("prod_") && !String(input.id).startsWith("draft_")) {
      delete payload.product_id;
      delete payload.productId;
    }

    const bulkEnabled = input.bulkPricingEnabled !== undefined
      ? Boolean(input.bulkPricingEnabled)
      : input.bulk_pricing_enabled !== undefined
      ? Boolean(input.bulk_pricing_enabled)
      : undefined;

    if (bulkEnabled !== undefined) {
      payload.bulk_pricing_enabled = bulkEnabled;
      payload.bulkPricingEnabled = bulkEnabled;
    }

    if (bulkEnabled === false) {
      payload.bulk_threshold = null;
      payload.bulkThreshold = null;
      payload.bulk_minimum_quantity = null;
      payload.bulkMinimumQuantity = null;
      payload.bulk_price = null;
      payload.bulkPrice = null;
      payload.bulk_unit_price = null;
      payload.bulkUnitPrice = null;
    } else {
      if (input.bulkPrice !== undefined) payload.bulk_price = input.bulkPrice;
      if (input.bulkUnitPrice !== undefined) payload.bulk_unit_price = input.bulkUnitPrice;
      if (input.bulk_unit_price !== undefined) payload.bulk_unit_price = input.bulk_unit_price;
      if (input.bulkThreshold !== undefined) payload.bulk_threshold = input.bulkThreshold;
      if (input.bulkMinimumQuantity !== undefined) payload.bulk_minimum_quantity = input.bulkMinimumQuantity;
      if (input.bulk_minimum_quantity !== undefined) payload.bulk_minimum_quantity = input.bulk_minimum_quantity;
    }

    // Authoritative Standard Customer Price mapping
    const standardPrice = input.standardPrice !== undefined
      ? input.standardPrice
      : input.standard_price !== undefined
      ? input.standard_price
      : input.wholesalePrice !== undefined
      ? input.wholesalePrice
      : input.wholesale_price !== undefined
      ? input.wholesale_price
      : undefined;

    if (standardPrice !== undefined) {
      payload.standard_price = standardPrice;
      payload.standardPrice = standardPrice;
      payload.wholesale_price = standardPrice;
      payload.wholesalePrice = standardPrice;
    }

    if (input.fullStockPrice !== undefined) {
      payload.full_stock_price = input.fullStockPrice;
      payload.fullStockPrice = input.fullStockPrice;
    }
    if (input.full_stock_price !== undefined) {
      payload.full_stock_price = input.full_stock_price;
      payload.fullStockPrice = input.full_stock_price;
    }

    if (input.costPrice !== undefined) {
      payload.cost_price = input.costPrice;
      payload.costPrice = input.costPrice;
    }
    if (input.cost_price !== undefined) {
      payload.cost_price = input.cost_price;
      payload.costPrice = input.cost_price;
    }

    if (input.shortDescription !== undefined) payload.short_description = input.shortDescription;
    if (input.videoUrl !== undefined) payload.video_url = input.videoUrl;

    if (input.seoTitle !== undefined) {
      payload.seo_title = input.seoTitle;
      payload.seoTitle = input.seoTitle;
    } else if ((input as any).seo_title !== undefined) {
      payload.seo_title = (input as any).seo_title;
      payload.seoTitle = (input as any).seo_title;
    }

    if (input.seoDescription !== undefined) {
      payload.seo_description = input.seoDescription;
      payload.seoDescription = input.seoDescription;
    } else if ((input as any).seo_description !== undefined) {
      payload.seo_description = (input as any).seo_description;
      payload.seoDescription = (input as any).seo_description;
    }

    if (input.keywords !== undefined) {
      payload.keywords = input.keywords;
      payload.seo_keywords = input.keywords;
    } else if ((input as any).seo_keywords !== undefined) {
      payload.keywords = (input as any).seo_keywords;
      payload.seo_keywords = (input as any).seo_keywords;
    }

    if (input.brand_id !== undefined) payload.brand_id = input.brand_id;

    if (input.supplier_name !== undefined) {
      payload.supplier_name = typeof input.supplier_name === "string" ? input.supplier_name.trim() || null : null;
      payload.supplierName = payload.supplier_name;
    } else if (input.supplierName !== undefined) {
      payload.supplier_name = typeof input.supplierName === "string" ? input.supplierName.trim() || null : null;
      payload.supplierName = payload.supplier_name;
    } else if (typeof input.supplier === "string") {
      payload.supplier_name = input.supplier.trim() || null;
      payload.supplierName = payload.supplier_name;
    } else if (input.supplier && typeof (input.supplier as any).name === "string") {
      payload.supplier_name = (input.supplier as any).name.trim() || null;
      payload.supplierName = payload.supplier_name;
    }

    if (input.supplier_id !== undefined) {
      payload.supplier_id = input.supplier_id ? Number(input.supplier_id) : null;
      payload.supplierId = payload.supplier_id;
    } else if ((input as any).supplierId !== undefined) {
      payload.supplier_id = (input as any).supplierId ? Number((input as any).supplierId) : null;
      payload.supplierId = payload.supplier_id;
    }
    if (input.categoryId !== undefined && !payload.categories) {
      const numId = Number(input.categoryId);
      if (!isNaN(numId) && Number.isInteger(numId) && numId > 0) {
        payload.categories = [numId];
      }
    }
    if (input.designType !== undefined) {
      payload.design_type = input.designType;
      payload.designType = input.designType;
    }
    if (input.productType !== undefined) payload.product_type = input.productType;
    if (input.colorName !== undefined) payload.color_name = input.colorName;
    if (input.colorHex !== undefined) payload.color_hex = input.colorHex;

    if (input.sizeDescription !== undefined) payload.size_description = input.sizeDescription;
    if (input.size_description !== undefined) payload.size_description = input.size_description;
    if (input.colourDescription !== undefined) payload.colour_description = input.colourDescription;
    if (input.colour_description !== undefined) payload.colour_description = input.colour_description;

    if (input.packageAssortmentVisible !== undefined) payload.package_assortment_visible = input.packageAssortmentVisible;
    if (input.package_assortment_visible !== undefined) payload.package_assortment_visible = input.package_assortment_visible;
    if (input.packageAssortmentMessage !== undefined) payload.package_assortment_message = input.packageAssortmentMessage;
    if (input.package_assortment_message !== undefined) payload.package_assortment_message = input.package_assortment_message;

    if (input.isHiddenFromStorefront !== undefined) payload.is_hidden_from_storefront = input.isHiddenFromStorefront;
    if (input.is_hidden_from_storefront !== undefined) payload.is_hidden_from_storefront = input.is_hidden_from_storefront;

    if (input.isPinned !== undefined) {
      payload.is_pinned = input.isPinned;
      payload.is_featured = input.isPinned;
    }
    if ((input as any).is_pinned !== undefined) {
      payload.is_pinned = (input as any).is_pinned;
      payload.is_featured = (input as any).is_pinned;
    }
    if (input.pinnedOrder !== undefined) {
      payload.pinned_order = input.pinnedOrder;
      payload.featured_sort_order = input.pinnedOrder;
    }
    if ((input as any).pinned_order !== undefined) {
      payload.pinned_order = (input as any).pinned_order;
      payload.featured_sort_order = (input as any).pinned_order;
    }
    if (input.isFeatured !== undefined) {
      payload.is_featured = input.isFeatured;
      payload.is_pinned = input.isFeatured;
    }
    if (input.featuredUntil !== undefined) payload.featured_until = input.featuredUntil;
    if (input.isHot !== undefined) payload.is_hot = input.isHot;
    if (input.hotUntil !== undefined) payload.hot_until = input.hotUntil;
    if (input.isNew !== undefined) payload.is_new = input.isNew;
    if (input.newUntil !== undefined) payload.new_until = input.newUntil;
    if (input.isLimitedDeal !== undefined) payload.is_limited_deal = input.isLimitedDeal;
    if (input.isBestDeal !== undefined) payload.is_best_deal = input.isBestDeal;
    if (input.isPreorder !== undefined) payload.is_preorder = input.isPreorder;
    if (input.isSoldOut !== undefined) payload.is_sold_out = input.isSoldOut;
    if ((input as any)?.is_sold_out !== undefined) payload.is_sold_out = (input as any).is_sold_out;
    if (input.estimatedDeliveryDate !== undefined) payload.estimated_delivery_date = input.estimatedDeliveryDate;

    if (input.packageAllocations !== undefined) payload.package_allocations = input.packageAllocations;
    if (input.shippingPackageProfiles !== undefined) payload.shipping_package_profiles = input.shippingPackageProfiles;
    if (input.pricingTiers !== undefined) payload.pricing_tiers = input.pricingTiers;
    if ((input as any).slugManuallyEdited !== undefined) payload.slug_manually_edited = (input as any).slugManuallyEdited;
    if ((input as any).slug_manually_edited !== undefined) payload.slug_manually_edited = (input as any).slug_manually_edited;

    return payload;
  }

  public toBackendPayload(input: Partial<B2BProductInput>): Record<string, any> {
    return ProductService.toBackendPayload(input);
  }

  /**
   * Check slug and SKU uniqueness and return suggestions if duplicates exist
   */
  async checkIdentifierUniqueness(params: {
    slug?: string;
    sku?: string;
    excludeId?: string | number;
    productId?: string;
  }): Promise<{
    slug?: { requested: string; is_available: boolean; suggested: string; adjusted: boolean };
    sku?: { requested: string; is_available: boolean; suggested: string; adjusted: boolean };
  }> {
    if (!isFrontendOnly()) {
      try {
        const queryParams: any = {};
        if (params.slug) queryParams.slug = params.slug;
        if (params.sku) queryParams.sku = params.sku;
        if (params.excludeId !== undefined) queryParams.exclude_id = params.excludeId;
        if (params.productId) queryParams.productId = params.productId;

        const res = await apiClient.get<any>("/products/check-uniqueness", { params: queryParams });
        const data = res?.data || res;
        return data || {};
      } catch {
        // Fallback to local mockStore check if network/endpoint fails
      }
    }

    return mockStore.checkUniqueness(params);
  }

  /**
   * Create a product
   */
  async createProduct(input: Partial<B2BProductInput>): Promise<B2BProductInput> {
    const slug = input.slug || (input.name || "apparel").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const sku = input.sku || generateProductSku(input.brand || "AYN", input.categoryName || "APP", input.name || "PRD");

    if (!isFrontendOnly()) {
      const backendPayload = this.toBackendPayload({ ...input, slug, sku });
      const res = await apiClient.post<any>("/products", backendPayload);
      const item = res?.data || res;
      return normalizeToB2BProduct(item);
    }

    return mockStore.saveProduct({ ...input, slug, sku });
  }

  /**
   * Update product
   */
  async updateProduct(id: string, updates: Partial<B2BProductInput>): Promise<B2BProductInput | null> {
    if (!isFrontendOnly()) {
      const backendPayload = this.toBackendPayload(updates);
      const res = await apiClient.put<any>(`/products/${id}`, backendPayload);
      const item = res?.data || res;
      return normalizeToB2BProduct(item);
    }

    return mockStore.saveProduct({ ...updates, id });
  }

  /**
   * Toggle storefront visibility (Admin)
   */
  async toggleProductStorefrontVisibility(id: string, isHidden?: boolean): Promise<B2BProductInput | null> {
    if (!isFrontendOnly()) {
      const res = await apiClient.patch<any>(`/products/${id}/toggle-storefront-visibility`);
      const item = res?.data || res;
      return item ? normalizeToB2BProduct(item) : null;
    }

    const current = mockStore.getProductByIdOrSlug(id);
    if (!current) return null;
    const targetHidden = isHidden !== undefined ? isHidden : !current.isHiddenFromStorefront;
    const updated: B2BProductInput = {
      ...current,
      isHiddenFromStorefront: targetHidden,
      is_hidden_from_storefront: targetHidden,
    };
    mockStore.saveProduct(updated);
    return updated;
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<boolean> {
    if (id === "draft_local_new" || id.startsWith("draft_") || id === "new") {
      productDraftService.clearDraft("new");
      productDraftService.clearDraft(id);
      return true;
    }

    if (!isFrontendOnly()) {
      await apiClient.delete(`/products/${id}`);
      productDraftService.clearDraft(id);
      return true;
    }

    productDraftService.clearDraft(id);
    return mockStore.deleteProduct(id);
  }

  /**
   * Mark a product as sold out immediately through authoritative backend inventory
   */
  async markProductSoldOut(id: string, reason?: string): Promise<B2BProductInput | null> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/products/${id}/mark-sold-out`, { reason });
      const item = res?.data || res;
      return item ? normalizeToB2BProduct(item) : null;
    }

    const prod = mockStore.getProductByIdOrSlug(id);
    if (!prod) return null;
    return mockStore.saveProduct({
      ...prod,
      stock: 0,
      availableStock: 0,
      isSoldOut: true,
      is_sold_out: true,
      isPreorder: false,
      is_preorder: false,
    });
  }

  /**
   * Fetch calculated shipping physical package specs for a product quantity
   */
  async getProductShippingSpecs(slugOrId: string, quantity: number, _isFullStock: boolean = false): Promise<any> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>(`/products/${slugOrId}/shipping-specs`, {
        params: { quantity, full_stock: _isFullStock ? 1 : 0 },
      });
      return res?.data || res;
    }

    const prod = mockStore.getProductByIdOrSlug(slugOrId);
    if (!prod) {
      return { status: "unavailable", message: "Product not found" };
    }

    const profiles = prod.shippingPackageProfiles || [];
    const matchedProfile = findMatchingShippingProfile(profiles, quantity);

    const cartonCount = matchedProfile?.carton_count || Math.max(1, Math.ceil(quantity / 50));
    const grossWeight = matchedProfile?.gross_weight || Math.round((quantity * 0.35 + cartonCount * 1.2) * 10) / 10;
    const netWeight = matchedProfile?.net_weight || Math.round((quantity * 0.32) * 10) / 10;
    const cartonLength = matchedProfile?.carton_length || 60;
    const cartonWidth = matchedProfile?.carton_width || 40;
    const cartonHeight = matchedProfile?.carton_height || 35;
    const totalCbm = calculateTotalCbm(cartonLength, cartonWidth, cartonHeight, cartonCount, "cm");

    return {
      status: "available",
      package_quantity: quantity,
      carton_count: cartonCount,
      carton_dimensions: { length: cartonLength, width: cartonWidth, height: cartonHeight, unit: "cm" },
      gross_weight: grossWeight,
      net_weight: netWeight,
      weight_unit: "kg",
      total_cbm: totalCbm,
      profile_matched: Boolean(matchedProfile),
    };
  }

  private filterLocalProducts(list: B2BProductInput[], options?: ProductQueryParams): B2BProductInput[] {
    const result = list.filter((p) => {
      if (!options?.isAdmin && p.status !== "published") {
        return false;
      }
      if (options?.status && options.status !== "all" && p.status !== options.status) {
        return false;
      }
      if (options?.exclude) {
        const excludes = options.exclude.split(",").map((e) => e.trim()).filter(Boolean);
        if (excludes.includes(String(p.id)) || excludes.includes(p.slug)) {
          return false;
        }
      }
      if (options?.brand && options.brand !== "all") {
        const brands = options.brand.split(",").map((b) => b.trim().toLowerCase()).filter(Boolean);
        if (brands.length > 0) {
          const pBrandClean = (p.brand || "").toLowerCase().replace(/['’.\s-]/g, "");
          const pBrandRaw = (p.brand || "").toLowerCase();
          const match = brands.some((b) => {
            const bClean = b.replace(/^br_/, "").replace(/['’.\s-]/g, "");
            return (
              pBrandRaw === b ||
              pBrandClean === bClean ||
              pBrandRaw.includes(b) ||
              b.includes(pBrandRaw) ||
              pBrandClean.includes(bClean) ||
              bClean.includes(pBrandClean)
            );
          });
          if (!match) return false;
        }
      }
      if (options?.audience && options.audience !== "all") {
        const audiences = options.audience.split(",").map((a) => a.trim().toUpperCase()).filter(Boolean);
        if (audiences.length > 0) {
          const pAud = (p.audience || "").toUpperCase();
          const pCatId = (p.categoryId || "").toUpperCase();
          const match = audiences.some((a) => pAud === a || pCatId.includes(a));
          if (!match) return false;
        }
      }
      const dtOption = options?.design_type || options?.designType;
      if (dtOption && dtOption !== "all") {
        const designTypes = dtOption.split(",").map((d) => {
          const upper = d.trim().toUpperCase();
          if (upper === "REPLICA" || upper === "MASTER_COPY" || upper === "MASTER COPY" || upper === "MC") {
            return "MASTER COPY";
          }
          return upper;
        }).filter(Boolean);
        if (designTypes.length > 0) {
          const rawPDt = (p.designType || "ORIGINAL").toUpperCase();
          const pDt = (rawPDt === "REPLICA" || rawPDt === "MC") ? "MASTER COPY" : rawPDt;
          if (!designTypes.includes(pDt)) return false;
        }
      }
      if (options?.category && options.category !== "all") {
        const categories = options.category.split(",").map((c) => c.trim().toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean);
        if (categories.length > 0) {
          const pCatName = (p.categoryName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const pCatId = (p.categoryId || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const match = categories.some((c) => 
            (pCatName && (pCatName === c || pCatName.includes(c) || c.includes(pCatName))) ||
            (pCatId && (pCatId === c || pCatId.includes(c) || c.includes(pCatId)))
          );
          if (!match) return false;
        }
      }
      if (options?.search || options?.q) {
        const q = (options.search || options.q || "").toLowerCase().trim();
        const terms = q.split(/\s+/).filter(Boolean);
        const name = (p.name || "").toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        const cat = (p.categoryName || p.categoryId || "").toLowerCase();
        const desc = (p.description || p.shortDescription || "").toLowerCase();
        const idStr = String(p.id ?? "").toLowerCase();
        const variantSkus = Array.isArray(p.variants)
          ? p.variants.map((v: any) => (v?.sku || "").toLowerCase()).filter(Boolean)
          : [];
        const prodId = options?.isAdmin ? ((p.productId || (p as any).product_id || "").toLowerCase()) : "";
        const supName = options?.isAdmin ? ((p.supplier_name || p.supplierName || (typeof p.supplier === 'string' ? p.supplier : p.supplier?.name) || "").toLowerCase()) : "";
        const match = terms.every(
          (t) =>
            name.includes(t) ||
            brand.includes(t) ||
            sku.includes(t) ||
            variantSkus.some((vsku: string) => vsku.includes(t)) ||
            cat.includes(t) ||
            desc.includes(t) ||
            idStr === t ||
            (prodId && prodId.includes(t)) ||
            (supName && supName.includes(t))
        );
        if (!match) return false;
      }
      const effectivePrice = p.standardPrice ?? p.wholesalePrice ?? 0;
      if (options?.price_min !== undefined && effectivePrice < options.price_min) {
        return false;
      }
      if (options?.price_max !== undefined && effectivePrice > options.price_max) {
        return false;
      }
      if (options?.color && options.color !== "all") {
        const hasColor = p.colors?.some((c) => c.toLowerCase() === options.color!.toLowerCase()) || p.colorName?.toLowerCase() === options.color.toLowerCase();
        if (!hasColor) return false;
      }
      if (options?.size && options.size !== "all") {
        if (!p.sizes?.includes(options.size)) return false;
      }
      if (options?.in_stock && p.stock <= 0) return false;
      if (options?.is_featured && !p.isFeatured) return false;
      if (options?.is_hot && !p.isHot) return false;
      if (options?.is_new && !p.isNew) return false;
      if (options?.is_best_deal && !p.isBestDeal) return false;
      if (options?.is_limited_deal && !p.isLimitedDeal) return false;
      if (options?.is_preorder && !p.isPreorder) return false;
      if (options?.is_sold_out !== undefined && Boolean(p.isSoldOut) !== Boolean(options.is_sold_out)) return false;
      if (options?.availability) {
        if (options.availability === 'ready_stock' && (p.isPreorder || p.isSoldOut)) return false;
        if (options.availability === 'preorder' && !p.isPreorder) return false;
        if (options.availability === 'sold_out' && !p.isSoldOut) return false;
        if (options.availability === 'low_stock') {
          const s = p.availableStock !== undefined ? Number(p.availableStock) : Number(p.stock || 0);
          if (s <= 0 || s >= 200) return false;
        }
        if (options.availability === 'out_of_stock') {
          const s = p.availableStock !== undefined ? Number(p.availableStock) : Number(p.stock || 0);
          if (s > 0) return false;
        }
      }
      return true;
    });

    // Helper to resolve authoritative numerical unit price for sorting
    const getSortPrice = (p: B2BProductInput): number | null => {
      const lowest = getLowestValidCustomerUnitPrice(p);
      if (lowest !== null && !isNaN(lowest) && lowest > 0) {
        return lowest;
      }
      const candidates = [
        p.price,
        p.wholesalePrice,
        p.wholesale_price,
        p.standardPrice,
        p.standard_price,
        (p as any).lowestUnitPrice,
        (p as any).effectiveCustomerUnitPrice,
      ];
      for (const c of candidates) {
        if (c !== undefined && c !== null && !isNaN(Number(c)) && Number(c) > 0) {
          return Number(c);
        }
      }
      const rawTiers = p.pricingTiers || (p as any).pricing_tiers;
      const tiers = Array.isArray(rawTiers)
        ? rawTiers
        : typeof rawTiers === "object" && rawTiers !== null
        ? Object.values(rawTiers)
        : [];
      for (const t of tiers) {
        const u = Number((t as any)?.unit_price);
        if (!isNaN(u) && u > 0) return u;
      }
      return null;
    };

    // Helper to normalize product name for stable locale-appropriate comparison
    const getNormalizedName = (p: B2BProductInput): string => {
      return (p.name || "").trim().normalize("NFC");
    };

    // Helper to get authoritative product creation/publication timestamp
    const getProductTimestamp = (p: B2BProductInput): number => {
      const dateStr = p.createdAt || p.created_at || (p as any).publishedAt || (p as any).published_at || (p as any).addedAt;
      if (dateStr) {
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      const idStr = String(p.id ?? "");
      const match = idStr.match(/\d+/);
      if (match) {
        return parseInt(match[0], 10);
      }
      return 0;
    };

    // Sorting across full filtered dataset
    const sort = options?.sort_by || options?.sort;
    if (sort) {
      if (sort === "manual" || sort === "sort_order") {
        result.sort((a, b) => {
          const sa = a.sort_order ?? a.sortOrder ?? 0;
          const sb = b.sort_order ?? b.sortOrder ?? 0;
          if (sa !== sb) return sa - sb;
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
      } else if (sort === "price_asc") {
        result.sort((a, b) => {
          const priceA = getSortPrice(a);
          const priceB = getSortPrice(b);
          // Both priced: sort by numeric unit price ascending
          if (priceA !== null && priceB !== null) {
            if (priceA !== priceB) return priceA - priceB;
            const nameComp = getNormalizedName(a).localeCompare(getNormalizedName(b), undefined, { sensitivity: "base", numeric: true });
            if (nameComp !== 0) return nameComp;
            return String(a.id || "").localeCompare(String(b.id || ""));
          }
          // Unpriced / price-on-request items placed after priced items
          if (priceA !== null) return -1;
          if (priceB !== null) return 1;
          // Both unpriced: tie-break by name then id
          const nameComp = getNormalizedName(a).localeCompare(getNormalizedName(b), undefined, { sensitivity: "base", numeric: true });
          if (nameComp !== 0) return nameComp;
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
      } else if (sort === "price_desc") {
        result.sort((a, b) => {
          const priceA = getSortPrice(a);
          const priceB = getSortPrice(b);
          // Both priced: sort by numeric unit price descending
          if (priceA !== null && priceB !== null) {
            if (priceA !== priceB) return priceB - priceA;
            const nameComp = getNormalizedName(a).localeCompare(getNormalizedName(b), undefined, { sensitivity: "base", numeric: true });
            if (nameComp !== 0) return nameComp;
            return String(a.id || "").localeCompare(String(b.id || ""));
          }
          // Unpriced / price-on-request items placed after priced items (in both asc and desc)
          if (priceA !== null) return -1;
          if (priceB !== null) return 1;
          // Both unpriced: tie-break by name then id
          const nameComp = getNormalizedName(a).localeCompare(getNormalizedName(b), undefined, { sensitivity: "base", numeric: true });
          if (nameComp !== 0) return nameComp;
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
      } else if (sort === "name_asc") {
        result.sort((a, b) => {
          const nameComp = getNormalizedName(a).localeCompare(getNormalizedName(b), undefined, { sensitivity: "base", numeric: true });
          if (nameComp !== 0) return nameComp;
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
      } else if (sort === "name_desc") {
        result.sort((a, b) => {
          const nameComp = getNormalizedName(b).localeCompare(getNormalizedName(a), undefined, { sensitivity: "base", numeric: true });
          if (nameComp !== 0) return nameComp;
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
      } else if (sort === "popular" || sort === "hot") {
        result.sort((a, b) => {
          const hotA = Boolean(a.isHot || (a as any).is_hot) ? 1 : 0;
          const hotB = Boolean(b.isHot || (b as any).is_hot) ? 1 : 0;
          if (hotA !== hotB) return hotB - hotA;
          const timeA = getProductTimestamp(a);
          const timeB = getProductTimestamp(b);
          if (timeA !== timeB) return timeB - timeA;
          return String(b.id || "").localeCompare(String(a.id || ""));
        });
      } else if (sort === "newest") {
        result.sort((a, b) => {
          const timeA = getProductTimestamp(a);
          const timeB = getProductTimestamp(b);
          if (timeA !== timeB) return timeB - timeA;
          const newA = Boolean(a.isNew || (a as any).is_new) ? 1 : 0;
          const newB = Boolean(b.isNew || (b as any).is_new) ? 1 : 0;
          if (newA !== newB) return newB - newA;
          return String(b.id || "").localeCompare(String(a.id || ""));
        });
      }
    }

    return result;
  }

  /**
   * Persistent bulk reordering of products
   */
  async reorderProducts(
    orders: Array<{ id: string | number; sort_order: number }> | (string | number)[]
  ): Promise<B2BProductInput[]> {
    const isRealId = (id: string | number) =>
      typeof id === "number" || (!isNaN(Number(id)) && !String(id).startsWith("draft_"));

    if (!isFrontendOnly()) {
      const filteredOrders = Array.isArray(orders)
        ? typeof orders[0] === "object"
          ? (orders as Array<{ id: string | number; sort_order: number }>).filter((o) => isRealId(o.id))
          : (orders as (string | number)[]).filter(isRealId)
        : orders;

      const payload =
        Array.isArray(filteredOrders) && filteredOrders.length > 0 && typeof filteredOrders[0] === "object"
          ? { orders: filteredOrders }
          : { ids: filteredOrders };
      await apiClient.put("/products/reorder", payload);
      return this.getProducts({ all: true, isAdmin: true, sort: "manual" });
    }

    const normalizedOrders =
      Array.isArray(orders) && orders.length > 0 && typeof orders[0] === "object"
        ? (orders as Array<{ id: string | number; sort_order: number }>)
        : (orders as (string | number)[]).map((id, idx) => ({ id, sort_order: idx }));

    mockStore.reorderProducts(normalizedOrders);
    return this.getProducts({ all: true, isAdmin: true, sort: "manual" });
  }

  /**
   * Move a product to an exact position in the complete manual product order.
   * All products between its previous and new positions automatically shift by one.
   */
  async moveProductToPosition(
    id: string | number,
    targetPosition: number
  ): Promise<B2BProductInput[]> {
    if (!isFrontendOnly()) {
      await apiClient.put(`/products/${id}/position`, { position: targetPosition });
      if (typeof window !== "undefined") {
        homepageService.invalidateStorefrontCache();
        window.dispatchEvent(new CustomEvent("ayaan:homepage-updated"));
      }
      return this.getProducts({ all: true, isAdmin: true, sort: "manual" });
    }

    mockStore.moveProductToPosition(id, targetPosition);
    if (typeof window !== "undefined") {
      homepageService.invalidateStorefrontCache();
      window.dispatchEvent(new CustomEvent("ayaan:homepage-updated"));
    }
    return this.getProducts({ all: true, isAdmin: true, sort: "manual" });
  }

  async toggleProductPin(id: string, isPinned?: boolean): Promise<{ success: boolean; is_pinned: boolean }> {
    if (!isFrontendOnly()) {
      const endpoint = isPinned !== undefined
        ? (isPinned ? `/products/${id}/pin` : `/products/${id}/unpin`)
        : `/products/${id}/toggle-pin`;
      const res = await apiClient.post<any>(endpoint, isPinned !== undefined ? { is_pinned: isPinned } : {});
      const item = res?.data || res;
      if (typeof window !== "undefined") {
        homepageService.invalidateStorefrontCache();
      }
      return { success: true, is_pinned: Boolean(item?.is_pinned ?? item?.is_featured) };
    }

    const current = mockStore.getProductByIdOrSlug(id);
    if (!current) return { success: false, is_pinned: false };
    const nextPinned = isPinned !== undefined ? isPinned : !(current.isPinned ?? current.isFeatured ?? (current as any).is_pinned);
    const updated: B2BProductInput = {
      ...current,
      isFeatured: nextPinned,
      is_featured: nextPinned,
      isPinned: nextPinned,
      is_pinned: nextPinned,
    };
    mockStore.saveProduct(updated);
    return { success: true, is_pinned: nextPinned };
  }
}

export const productService = new ProductService();
export const toggleProductStorefrontVisibility = (id: string, isHidden?: boolean) =>
  productService.toggleProductStorefrontVisibility(id, isHidden);
export const toggleProductFeatured = (id: string, isFeatured: boolean) =>
  productService.updateProduct(id, { isFeatured, is_featured: isFeatured, isPinned: isFeatured, is_pinned: isFeatured });
export const toggleProductPin = (id: string, isPinned?: boolean) =>
  productService.toggleProductPin(id, isPinned);
export const reorderProducts = (orders: Array<{ id: string | number; sort_order: number }> | (string | number)[]) =>
  productService.reorderProducts(orders);
export const moveProductToPosition = (id: string | number, targetPosition: number) =>
  productService.moveProductToPosition(id, targetPosition);
