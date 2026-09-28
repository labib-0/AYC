import { Product } from "@/types";
import { B2BProductInput } from "@/types/b2b";
import { mockStore } from "@/lib/mock-data/mock-store";
import { findMatchingShippingProfile, calculateTotalCbm } from "@/lib/services/shipping-package";
import { inferProductCategory } from "@/lib/mock-data/mock-products";
import { apiClient } from "./api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

export interface ProductQueryParams {
  page?: number;
  per_page?: number;
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
  in_stock?: boolean;
  sort?: string;
  sort_by?: "price_asc" | "price_desc" | "newest" | "popular" | "hot" | "featured" | "name_asc" | "name_desc";
  isAdmin?: boolean;
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

export interface SearchSuggestionsResult {
  products: Array<{
    id: string;
    name: string;
    slug: string;
    sku: string;
    brand: string;
    price: number;
    image: string;
  }>;
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
    if (typeof img === "string") return img;
    return img?.image_url || img?.url || "";
  }).filter((url: string) => Boolean(url && url.trim()));

  if (images.length === 0) {
    images.push(p.image_url || p.image || "/placeholder.jpg");
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

  const wholesalePrice = p.wholesalePrice !== undefined
    ? Number(p.wholesalePrice)
    : p.wholesale_price !== undefined
    ? Number(p.wholesale_price)
    : p.price_cents !== undefined
    ? p.price_cents / 100
    : Number(p.price) || 15;


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
  const isFeatured = Boolean(p.isFeatured ?? p.is_featured ?? p.featured) && !isFeaturedExpired;
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
  const estimatedDeliveryDate = p.estimatedDeliveryDate ?? p.estimated_delivery_date ?? null;

  let status: "published" | "draft" | "unpublished" = "published";
  if (p.status === "draft") status = "draft";
  else if (p.status === "archived" || p.status === "unpublished") status = "unpublished";

  const pricingTiers = Array.isArray(p.pricingTiers) ? p.pricingTiers : Array.isArray(p.pricing_tiers) ? p.pricing_tiers : (typeof (p.pricingTiers || p.pricing_tiers) === 'object' && (p.pricingTiers || p.pricing_tiers) !== null ? Object.values(p.pricingTiers || p.pricing_tiers) : []);
  const packageAllocations = Array.isArray(p.packageAllocations) ? p.packageAllocations : Array.isArray(p.package_allocations) ? p.package_allocations : (typeof (p.packageAllocations || p.package_allocations) === 'object' && (p.packageAllocations || p.package_allocations) !== null ? Object.values(p.packageAllocations || p.package_allocations) : []);
  const isPackageAssortment = p.isPackageAssortment ?? p.is_package_assortment ?? true;
  const rawVariants = p.variants || [];
  const variants = Array.isArray(rawVariants) ? rawVariants : (typeof rawVariants === 'object' && rawVariants !== null ? Object.values(rawVariants) : []);
  const moqVal = p.moq ? Number(p.moq) : 10;
  const availableStock = variants.length > 0 ? variants.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0) : stock;

  const bulkThreshold = p.bulkThreshold !== undefined && p.bulkThreshold !== null
    ? Number(p.bulkThreshold)
    : p.bulk_threshold !== undefined && p.bulk_threshold !== null
    ? Number(p.bulk_threshold)
    : 200;

  const bulkPrice = p.bulkPrice !== undefined && p.bulkPrice !== null
    ? Number(p.bulkPrice)
    : p.bulk_price !== undefined && p.bulk_price !== null
    ? Number(p.bulk_price)
    : Math.round(wholesalePrice * 0.8 * 100) / 100;

  const configuredFullStockPrice = p.configuredFullStockPrice !== undefined && p.configuredFullStockPrice !== null
    ? Number(p.configuredFullStockPrice)
    : p.full_stock_price !== undefined && p.full_stock_price !== null
    ? Number(p.full_stock_price)
    : (p.fullStockPrice !== undefined && p.fullStockPrice !== null ? Number(p.fullStockPrice) : null);

  const qualifyingThreshold = (bulkThreshold !== undefined && bulkThreshold > 0) ? bulkThreshold : moqVal;
  const derivedEligibleQty = Math.floor(availableStock / moqVal) * moqVal;

  const isFullStockEligible = Boolean(
    p.isFullStockEligible ?? p.is_full_stock_eligible ?? (
      configuredFullStockPrice !== null &&
      configuredFullStockPrice > 0 &&
      availableStock > qualifyingThreshold &&
      derivedEligibleQty > 0
    )
  );

  const fullStockQuantity = p.fullStockQuantity !== undefined && p.fullStockQuantity !== null
    ? Number(p.fullStockQuantity)
    : p.full_stock_quantity !== undefined && p.full_stock_quantity !== null
    ? Number(p.full_stock_quantity)
    : derivedEligibleQty;

  const normalMoqPrice = wholesalePrice;
  const resolvedFullStockPrice = availableStock > qualifyingThreshold && configuredFullStockPrice !== null && configuredFullStockPrice > 0
    ? Math.min(configuredFullStockPrice, normalMoqPrice)
    : (p.fullStockPrice !== undefined && p.fullStockPrice !== null ? Number(p.fullStockPrice) : normalMoqPrice);

  const fullStockTotal = p.fullStockTotal !== undefined && p.fullStockTotal !== null
    ? Number(p.fullStockTotal)
    : p.full_stock_total !== undefined && p.full_stock_total !== null
    ? Number(p.full_stock_total)
    : Math.round(fullStockQuantity * resolvedFullStockPrice * 100) / 100;

  const brandName = typeof p.brand === "string" ? p.brand : p.brand?.name || "";
  const brandLogo = p.brandLogo || p.brand_logo || p.brand_data?.logo_url || p.brand_data?.logo || p.brand?.logo_url || p.brand?.logo || (p.brand?.slug ? `/brands/${p.brand.slug}.svg` : undefined);

  const rawVideoUrl = (p.videoUrl || p.video_url || "").trim();
  let youtubeVideoId: string | undefined = p.youtubeVideoId || p.youtube_video_id || undefined;
  let youtubeEmbedUrl: string | undefined = p.youtubeEmbedUrl || p.youtube_embed_url || undefined;

  if (rawVideoUrl) {
    const ytMatch = rawVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      youtubeVideoId = ytMatch[1];
      youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}`;
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
        single_carton_cbm: sp.single_carton_cbm !== undefined ? Number(sp.single_carton_cbm) : undefined,
        total_cbm: sp.total_cbm !== undefined ? Number(sp.total_cbm) : undefined,
      }))
    : undefined;

  const onHandStock = p.onHandStock !== undefined && p.onHandStock !== null
    ? Number(p.onHandStock)
    : p.on_hand_stock !== undefined && p.on_hand_stock !== null
    ? Number(p.on_hand_stock)
    : availableStock;

  const reservedStock = p.reservedStock !== undefined && p.reservedStock !== null
    ? Number(p.reservedStock)
    : p.reserved_stock !== undefined && p.reserved_stock !== null
    ? Number(p.reserved_stock)
    : 0;

  const realAvailableStock = p.availableStock !== undefined && p.availableStock !== null
    ? Number(p.availableStock)
    : p.available_stock !== undefined && p.available_stock !== null
    ? Number(p.available_stock)
    : Math.max(0, onHandStock - reservedStock);

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

  return {
    id: String(p.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    name: p.name || "Untitled Product",
    slug: p.slug || (p.name || "prod").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    sku: p.sku || `AYN-${Date.now().toString(36).toUpperCase()}`,
    brand: brandName,
    brandLogo: brandLogo,
    brand_id: p.brand_id ? String(p.brand_id) : undefined,
    categoryId: categoryInfo.id,
    categoryName: categoryInfo.name,
    audience: audienceVal,
    designType: designTypeVal,
    productType: p.productType || p.product_type || "Ready-Made Garments",
    shortDescription: p.shortDescription || p.short_description || `Premium quality ${p.name} direct from Dhaka export facilities.`,
    description: p.description || `Premium apparel manufactured with high-tensile combed yarn and reactive dye technology. Compliant with international export standards (AQL 2.5).`,
    seoTitle: p.seoTitle || p.seo_title || p.name || undefined,
    seoDescription: p.seoDescription || p.seo_description || p.shortDescription || p.short_description || undefined,
    keywords: Array.isArray(p.keywords)
      ? p.keywords
      : typeof p.keywords === "string"
      ? p.keywords.split(",").map((s: string) => s.trim()).filter(Boolean)
      : undefined,
    material: p.material || "100% Cotton",
    colorName: p.colorName || p.color_name || p.color || "Black",
    colorHex: p.colorHex || p.color_hex || "#111827",
    videoUrl: rawVideoUrl || undefined,
    video_url: rawVideoUrl || undefined,
    youtubeVideoId: youtubeVideoId,
    youtubeEmbedUrl: youtubeEmbedUrl,
    videoProvider: p.videoProvider || p.video_provider || null,
    vimeoVideoId: p.vimeoVideoId || p.vimeo_video_id || null,
    images: images,
    costPrice: costPrice,
    purchasePriceUpdated: p.purchasePriceUpdated !== undefined ? p.purchasePriceUpdated : null,
    purchasePriceUpdatedAt: p.purchasePriceUpdatedAt || p.purchase_price_updated_at || null,
    wholesalePrice: wholesalePrice,
    standardPrice: wholesalePrice,
    bulkThreshold: bulkThreshold,
    bulkPrice: bulkPrice,
    fullStockPrice: resolvedFullStockPrice,
    configuredFullStockPrice: configuredFullStockPrice ?? undefined,
    isFullStockEligible: isFullStockEligible,
    fullStockQuantity: fullStockQuantity,
    fullStockTotal: fullStockTotal,
    moq: moqVal,
    stock: realAvailableStock,
    onHandStock,
    on_hand_stock: onHandStock,
    reservedStock,
    reserved_stock: reservedStock,
    availableStock: realAvailableStock,
    available_stock: realAvailableStock,
    availableMoqs,
    available_moqs: availableMoqs,
    warehouseBreakdown,
    status: status,
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
    estimatedDeliveryDate: estimatedDeliveryDate,
    estimated_delivery_date: estimatedDeliveryDate,
    sizes: p.sizes || ["S", "M", "L", "XL", "2XL"],
    colors: p.colors || [p.color_name || p.color || "Black"],
    variants: variants,
    pricingTiers: pricingTiers.length > 0 ? pricingTiers : [
      { min_quantity: moqVal, max_quantity: bulkThreshold - 1, unit_price: wholesalePrice },
      { min_quantity: bulkThreshold, max_quantity: fullStockQuantity > bulkThreshold ? fullStockQuantity - 1 : availableStock, unit_price: bulkPrice },
      ...(fullStockQuantity > 0 ? [{ min_quantity: fullStockQuantity, max_quantity: fullStockQuantity, unit_price: resolvedFullStockPrice }] : []),
    ],
    packageAllocations: packageAllocations,
    shippingPackageProfiles: shippingPackageProfiles,
    shipping_package_profiles: shippingPackageProfiles,
    isPackageAssortment: isPackageAssortment,
  };
}

/**
 * Maps B2B product or raw API product to standard Storefront Product interface
 */
export function toStorefrontProduct(p: any): Product {
  const wholesalePrice = p.wholesalePrice !== undefined && p.wholesalePrice !== null
    ? Number(p.wholesalePrice)
    : p.wholesale_price !== undefined && p.wholesale_price !== null
    ? Number(p.wholesale_price)
    : p.price !== undefined && p.price !== null
    ? Number(p.price)
    : 0;


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

  return {
    id: String(p.id),
    name: p.name,
    slug: p.slug,
    price: wholesalePrice,
    wholesalePrice: wholesalePrice,
    standardPrice: p.standardPrice || wholesalePrice,
    bulkThreshold: p.bulkThreshold || p.bulk_threshold,
    bulkPrice: p.bulkPrice !== undefined ? Number(p.bulkPrice) : (p.bulk_price !== undefined ? Number(p.bulk_price) : undefined),
    fullStockPrice: p.fullStockPrice !== undefined ? Number(p.fullStockPrice) : (p.full_stock_price !== undefined ? Number(p.full_stock_price) : undefined),
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
    estimatedDeliveryDate: p.estimatedDeliveryDate ?? p.estimated_delivery_date ?? null,
    estimated_delivery_date: p.estimatedDeliveryDate ?? p.estimated_delivery_date ?? null,
    videoProvider: p.videoProvider || p.video_provider,
    sizes: p.sizes || (Array.isArray(p.variants) && p.variants.length > 0 ? Array.from(new Set(p.variants.map((v: any) => v.size).filter(Boolean))) as string[] : ["S", "M", "L", "XL", "2XL"]),
    moq: p.moq !== undefined ? Number(p.moq) : 1,
    stock: p.availableStock !== undefined ? Number(p.availableStock) : (p.stock !== undefined ? Number(p.stock) : (p.inventory_count !== undefined ? Number(p.inventory_count) : 0)),
    availableStock: p.availableStock !== undefined ? Number(p.availableStock) : (p.stock !== undefined ? Number(p.stock) : (p.inventory_count !== undefined ? Number(p.inventory_count) : 0)),
    availableMoqs: p.availableMoqs !== undefined ? Number(p.availableMoqs) : (p.available_moqs !== undefined ? Number(p.available_moqs) : ((p.moq && Number(p.moq) > 0) ? Math.floor((Number(p.availableStock ?? p.stock ?? 0)) / Number(p.moq)) : 0)),
    onHandStock: p.onHandStock !== undefined ? Number(p.onHandStock) : (p.on_hand_stock !== undefined ? Number(p.on_hand_stock) : undefined),
    reservedStock: p.reservedStock !== undefined ? Number(p.reservedStock) : (p.reserved_stock !== undefined ? Number(p.reserved_stock) : 0),
    brand: typeof p.brand === "string" ? p.brand : p.brand?.name || "Ayaan",
    brandLogo: p.brandLogo || p.brand_logo || p.brand_data?.logo_url || p.brand_data?.logo || p.brand?.logo_url || p.brand?.logo || (p.brand?.slug ? `/brands/${p.brand.slug}.svg` : undefined),
    brand_logo: p.brandLogo || p.brand_logo || p.brand_data?.logo_url || p.brand_data?.logo || p.brand?.logo_url || p.brand?.logo || (p.brand?.slug ? `/brands/${p.brand.slug}.svg` : undefined),
    color: p.colorName || p.color_name,
    description: p.description || p.shortDescription || p.short_description,
    seoTitle: p.seoTitle || p.seo_title,
    seoDescription: p.seoDescription || p.seo_description,
    keywords: p.keywords,
    pricingTiers: p.pricingTiers || p.pricing_tiers,
    packageAllocations: p.packageAllocations || p.package_allocations,
    shippingPackageProfiles: p.shippingPackageProfiles || p.shipping_package_profiles,
    shipping_package_profiles: p.shipping_package_profiles || p.shippingPackageProfiles,
    isPackageAssortment: Boolean(p.isPackageAssortment ?? p.is_package_assortment),
    fullStockQuantity: p.fullStockQuantity || p.full_stock_quantity,
    videoUrl: p.videoUrl || p.video_url,
    youtubeVideoId: p.youtubeVideoId || p.youtube_video_id,
    youtubeEmbedUrl: p.youtubeEmbedUrl || p.youtube_embed_url,
    status: p.status || "draft",
    isDraft: (p.status || "draft") === "draft",
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
   * Fetch products with query parameters
   */
  async getProducts(params?: ProductQueryParams): Promise<B2BProductInput[]> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/products", {
        params: params as Record<string, string | number | boolean | undefined>,
      });
      const items = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(items)) {
        return items.map(normalizeToB2BProduct);
      }
      return [];
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
      per_page: params.per_page ?? 24,
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
        throw err;
      }
    }

    const all = mockStore.getProducts();
    const filtered = this.filterLocalProducts(all, params);
    const page = params.page ?? 1;
    const perPage = params.per_page ?? 24;
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
        return null;
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) {
          return null;
        }
        throw err;
      }
    }

    return mockStore.getProductByIdOrSlug(slugOrId);
  }

  /**
   * Fetch search suggestions (quick autocomplete)
   */
  async getSearchSuggestions(query: string): Promise<SearchSuggestionsResult> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/search/suggestions", {
        params: { q: query },
      });
      const data = res?.data || res;
      return {
        products: data?.products || [],
        categories: data?.categories || [],
        brands: data?.brands || [],
      };
    }

    const q = query.toLowerCase().trim();
    if (!q) {
      return { products: [], categories: [], brands: [] };
    }

    const allProducts = mockStore.getProducts();
    const allCategories = mockStore.getCategories();
    const allBrands = mockStore.getBrands();

    const matchedProducts = allProducts
      .filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        brand: p.brand,
        price: p.wholesalePrice,
        image: p.images[0] || "/placeholder.jpg",
      }));

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
      products: matchedProducts,
      categories: matchedCategories,
      brands: matchedBrands,
    };
  }

  /**
   * Helper to serialize camelCase B2BProductInput to snake_case format expected by Laravel API
   */
  private toBackendPayload(input: Partial<B2BProductInput>): Record<string, any> {
    const payload: Record<string, any> = { ...input };

    if ((input as any).productId !== undefined) payload.product_id = (input as any).productId;
    if ((input as any).product_id !== undefined) payload.product_id = (input as any).product_id;

    if (input.wholesalePrice !== undefined) payload.wholesale_price = input.wholesalePrice;
    if (input.bulkPrice !== undefined) payload.bulk_price = input.bulkPrice;
    if (input.bulkThreshold !== undefined) payload.bulk_threshold = input.bulkThreshold;
    if (input.fullStockPrice !== undefined) payload.full_stock_price = input.fullStockPrice;
    if (input.costPrice !== undefined) payload.cost_price = input.costPrice;

    if (input.shortDescription !== undefined) payload.short_description = input.shortDescription;
    if (input.videoUrl !== undefined) payload.video_url = input.videoUrl;

    if (input.brand_id !== undefined) payload.brand_id = input.brand_id;
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

    if (input.isFeatured !== undefined) payload.is_featured = input.isFeatured;
    if (input.featuredUntil !== undefined) payload.featured_until = input.featuredUntil;
    if (input.isHot !== undefined) payload.is_hot = input.isHot;
    if (input.hotUntil !== undefined) payload.hot_until = input.hotUntil;
    if (input.isNew !== undefined) payload.is_new = input.isNew;
    if (input.newUntil !== undefined) payload.new_until = input.newUntil;
    if (input.isLimitedDeal !== undefined) payload.is_limited_deal = input.isLimitedDeal;
    if (input.isBestDeal !== undefined) payload.is_best_deal = input.isBestDeal;
    if (input.isPreorder !== undefined) payload.is_preorder = input.isPreorder;
    if (input.estimatedDeliveryDate !== undefined) payload.estimated_delivery_date = input.estimatedDeliveryDate;

    if (input.packageAllocations !== undefined) payload.package_allocations = input.packageAllocations;
    if (input.shippingPackageProfiles !== undefined) payload.shipping_package_profiles = input.shippingPackageProfiles;
    if (input.pricingTiers !== undefined) payload.pricing_tiers = input.pricingTiers;

    return payload;
  }

  /**
   * Create a product
   */
  async createProduct(input: Partial<B2BProductInput>): Promise<B2BProductInput> {
    const slug = input.slug || (input.name || "apparel").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
   * Delete product
   */
  async deleteProduct(id: string): Promise<boolean> {
    if (!isFrontendOnly()) {
      await apiClient.delete(`/products/${id}`);
      return true;
    }

    return mockStore.deleteProduct(id);
  }

  /**
   * Duplicate product
   */
  async duplicateProduct(id: string): Promise<B2BProductInput | null> {
    if (!isFrontendOnly()) {
      const existing = await this.getProductBySlugOrId(id);
      if (!existing) return null;
      const { id: _ignored, ...rest } = existing;
      const newName = `${existing.name} (Copy)`;
      const newSlug = `${existing.slug}-copy-${Date.now().toString(36)}`;
      const newSku = `${existing.sku}-CPY`;
      return this.createProduct({
        ...rest,
        name: newName,
        slug: newSlug,
        sku: newSku,
      });
    }
    return mockStore.duplicateProduct(id);
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
            pCatName === c ||
            pCatId === c ||
            pCatName.includes(c) ||
            c.includes(pCatName) ||
            pCatId.includes(c) ||
            c.includes(pCatId)
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
        const prodId = options?.isAdmin ? ((p.productId || (p as any).product_id || "").toLowerCase()) : "";
        const match = terms.every(
          (t) =>
            name.includes(t) ||
            brand.includes(t) ||
            sku.includes(t) ||
            cat.includes(t) ||
            desc.includes(t) ||
            (prodId && prodId.includes(t))
        );
        if (!match) return false;
      }
      if (options?.price_min !== undefined && p.wholesalePrice < options.price_min) {
        return false;
      }
      if (options?.price_max !== undefined && p.wholesalePrice > options.price_max) {
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
      return true;
    });

    // Sorting
    const sort = options?.sort_by || options?.sort;
    if (sort) {
      if (sort === "price_asc") {
        result.sort((a, b) => a.wholesalePrice - b.wholesalePrice);
      } else if (sort === "price_desc") {
        result.sort((a, b) => b.wholesalePrice - a.wholesalePrice);
      } else if (sort === "newest") {
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      } else if (sort === "popular" || sort === "hot") {
        result.sort((a, b) => (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0));
      } else if (sort === "name_asc") {
        result.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sort === "name_desc") {
        result.sort((a, b) => b.name.localeCompare(a.name));
      }
    }

    return result;
  }
}

export const productService = new ProductService();
