import { B2BProductInput } from "@/types/b2b";
import rawProductsData from "@/data/products.json";
import { getBrandLogoUrl } from "@/lib/brand-logos";

const AUDIENCE_CATEGORY_IDS = new Set(["c_men", "c_women", "c_boys", "c_girls", "c_unisex", "men", "women", "boys", "girls", "unisex"]);

export function inferProductCategory(p: any): { id: string; name: string } {
  const explicitName = p.categoryName || p.category_name || (typeof p.category === "string" ? p.category : p.category?.name);
  const explicitId = p.categoryId || p.category_id || p.category?.id;

  if (explicitName && explicitName !== "Apparel" && !AUDIENCE_CATEGORY_IDS.has(String(explicitName).toLowerCase())) {
    return {
      id: explicitId && !AUDIENCE_CATEGORY_IDS.has(String(explicitId).toLowerCase()) ? String(explicitId) : `c_${String(explicitName).toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
      name: explicitName,
    };
  }

  const name = (p.name || "").toLowerCase();
  const sku = (p.sku || "").toLowerCase();

  if (name.includes("sweater") || name.includes("cardigan") || name.includes("knit") || name.includes("pullover") || name.includes("turtleneck") || sku.includes("-swt-")) {
    return { id: "c_sweaters", name: "Sweaters" };
  }
  if (name.includes("t-shirt") || name.includes("tee") || sku.includes("-tsh-")) {
    return { id: "c_tshirts", name: "T-Shirts" };
  }
  if (name.includes("hoodie") || name.includes("sweatshirt") || name.includes("fleece") || sku.includes("-hd-")) {
    return { id: "c_hoodies", name: "Hoodies" };
  }
  if (name.includes("trouser") || name.includes("chino") || name.includes("jogger") || name.includes("legging") || name.includes("tights") || sku.includes("-trs-")) {
    return { id: "c_trousers", name: "Trousers" };
  }
  if (name.includes("pant") || name.includes("jean") || name.includes("denim") || name.includes("overall") || sku.includes("-jns-")) {
    return { id: "c_pants", name: "Pants" };
  }
  if (name.includes("short") || name.includes("trunk") || sku.includes("-sho-")) {
    return { id: "c_shorts", name: "Shorts" };
  }
  if (name.includes("polo") || sku.includes("-pol-")) {
    return { id: "c_polos", name: "Polo Shirts" };
  }
  if (name.includes("jacket") || name.includes("coat") || name.includes("vest") || name.includes("parka") || name.includes("bomber") || name.includes("blazer") || name.includes("windbreaker") || name.includes("anorak") || sku.includes("-jkt-")) {
    return { id: "c_jackets", name: "Jackets" };
  }
  if (name.includes("shirt") || name.includes("oxford") || name.includes("flannel") || name.includes("blouse") || sku.includes("-sht-")) {
    return { id: "c_tshirts", name: "T-Shirts" };
  }
  if (name.includes("sport") || name.includes("running") || name.includes("gym") || name.includes("yoga") || name.includes("active") || name.includes("compression")) {
    return { id: "c_activewear", name: "Activewear" };
  }
  if (name.includes("towel") || sku.includes("-twl-")) {
    return { id: "c_towels", name: "Towels" };
  }

  if (explicitId && !AUDIENCE_CATEGORY_IDS.has(String(explicitId).toLowerCase())) {
    return { id: String(explicitId), name: explicitName || "" };
  }

  if (explicitName) {
    return { id: `c_${String(explicitName).toLowerCase().replace(/[^a-z0-9]+/g, "")}`, name: explicitName };
  }

  return { id: "", name: "" };
}

/**
 * Normalizes raw JSON product into full B2BProductInput
 */
export function normalizeProductData(p: any): B2BProductInput {
  const images = Array.isArray(p.images) && p.images.length > 0 
    ? p.images 
    : [p.image_url || p.image || "/placeholder.jpg"];

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

  const categoryInfo = inferProductCategory(p);

  const wholesalePrice = p.wholesalePrice !== undefined
    ? Number(p.wholesalePrice)
    : p.wholesale_price !== undefined
    ? Number(p.wholesale_price)
    : p.price_cents !== undefined
    ? p.price_cents / 100
    : Number(p.price) || 15;

  const msrpPrice = p.msrpPrice !== undefined && p.msrpPrice !== null
    ? Number(p.msrpPrice)
    : p.msrp_price !== undefined && p.msrp_price !== null
    ? Number(p.msrp_price)
    : p.compare_at_price_cents !== undefined && p.compare_at_price_cents !== null
    ? p.compare_at_price_cents / 100
    : p.oldPrice !== undefined && p.oldPrice !== null
    ? Number(p.oldPrice)
    : Math.round(wholesalePrice * 1.6 * 100) / 100;

  const stock = p.stock !== undefined
    ? Number(p.stock)
    : p.inventory_count !== undefined
    ? Number(p.inventory_count)
    : p.availableStock !== undefined
    ? Number(p.availableStock)
    : 1000;

  // Package allocations must NEVER be auto-calculated from ratios or inventory.
  // Only explicitly configured allocations from input are preserved.
  const rawAllocations = p.packageAllocations || p.package_allocations || [];
  const packageAllocations: Array<{ size: string; quantity: number; color: string; product_variant_id: number; package_name?: string }> = Array.isArray(rawAllocations)
    ? rawAllocations.map((a: any) => ({
        size: a.size || "M",
        quantity: Number(a.quantity ?? 0),
        color: a.color || "Standard",
        product_variant_id: Number(a.product_variant_id || 0),
        package_name: a.package_name || "Universal Package",
      }))
    : [];

  const allocSum = packageAllocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
  const moq = allocSum > 0 ? allocSum : (p.moq ? Number(p.moq) : 10);
  const bulkThreshold = p.bulkThreshold ? Number(p.bulkThreshold) : Math.max(200, moq + 50);
  const bulkPrice = p.bulkPrice ? Number(p.bulkPrice) : Math.round(wholesalePrice * 0.8 * 100) / 100;
  const fullStockPrice = p.fullStockPrice ? Number(p.fullStockPrice) : Math.round(wholesalePrice * 0.7 * 100) / 100;

  const sizes = Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ["S", "M", "L", "XL", "2XL"];
  const colors = Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : [p.color_name || p.color || "Black"];

  // Default single shipping package profile
  const shippingPackageProfiles = p.shippingPackageProfiles || p.shipping_package_profiles || [
    {
      id: `sp_${p.id || "1"}_universal`,
      package_quantity: moq,
      carton_count: 1,
      carton_length: 60,
      carton_width: 40,
      carton_height: 30,
      dimension_unit: "cm",
      gross_weight: 15.0,
      net_weight: 13.5,
      weight_unit: "kg",
      is_active: true,
      total_cbm: 0.072,
    },
  ];

  const brandName = typeof p.brand === "string" ? p.brand : p.brand?.name || "Ayaan";
  const brandLogo = p.brandLogo || p.brand_logo || getBrandLogoUrl(brandName) || "/logo.png";
  const rawDt = (p.designType || p.design_type || "").toString().toUpperCase();
  const designTypeVal: "ORIGINAL" | "MASTER COPY" = rawDt.includes("MASTER") ? "MASTER COPY" : "ORIGINAL";

  // Keywords and SEO
  let keywordsList: string[] = [];
  if (Array.isArray(p.keywords)) {
    keywordsList = p.keywords.map((k: unknown) => String(k).trim()).filter(Boolean);
  } else if (typeof p.keywords === "string" && p.keywords.trim()) {
    keywordsList = p.keywords.split(",").map((s: string) => s.trim()).filter(Boolean);
  } else {
    const pName = (p.name || "Apparel").toLowerCase();
    keywordsList = [
      `wholesale ${brandName.toLowerCase()} ${pName}`,
      `bulk ${pName}`,
      `${categoryInfo.name.toLowerCase()} supplier`,
      `${audienceVal.toLowerCase()} apparel export`,
      "Bangladesh clothing manufacturer",
    ];
  }

  return {
    id: String(p.id),
    name: p.name || "Apparel Item",
    slug: p.slug || (p.name || "apparel").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    sku: p.sku || `AYN-${Date.now().toString(36).toUpperCase()}`,
    brand: brandName,
    brandLogo: brandLogo,
    categoryId: categoryInfo.id,
    categoryName: categoryInfo.name,
    audience: audienceVal,
    designType: designTypeVal,
    productType: p.productType || "Ready-Made Garments",
    shortDescription: p.shortDescription || `Export grade ${p.name} manufactured in Dhaka, Bangladesh with precision stitching and premium fabric.`,
    description: p.description || `${p.name} is engineered for international apparel retailers and corporate buyers. Manufactured with high-tensile yarn, reactive dye technology, and compliant with European & US export quality standards (AQL 2.5).`,
    seoTitle: p.seoTitle || p.name || undefined,
    seoDescription: p.seoDescription || p.shortDescription || undefined,
    keywords: keywordsList,
    material: p.material || "100% Combed Compact Cotton (Single Jersey / Brushed Fleece)",
    colorName: p.colorName || colors[0] || "Black",
    colorHex: p.colorHex || "#111827",
    videoUrl: p.videoUrl || p.video_url || undefined,
    youtubeVideoId: p.youtubeVideoId || p.youtube_video_id || undefined,
    youtubeEmbedUrl: p.youtubeEmbedUrl || p.youtube_embed_url || undefined,
    images: images,
    costPrice: p.costPrice !== undefined ? Number(p.costPrice) : undefined,
    wholesalePrice: wholesalePrice,
    standardPrice: wholesalePrice,
    bulkThreshold: bulkThreshold,
    bulkPrice: bulkPrice,
    fullStockPrice: fullStockPrice,
    msrpPrice: msrpPrice,
    moq: moq,
    stock: stock,
    status: p.status || "published",
    isFeatured: Boolean(p.isFeatured || p.featured || p.isHot),
    featuredUntil: p.featuredUntil || p.featured_until || null,
    isNew: Boolean(p.isNew),
    newUntil: p.newUntil || p.new_until || null,
    isHot: Boolean(p.isHot),
    hotUntil: p.hotUntil || p.hot_until || null,
    isBestDeal: Boolean(p.isBestDeal || p.is_best_deal || p.isLimitedDeal || p.isLimitedTimeOffer || p.isHot || p.isFeatured || (msrpPrice > wholesalePrice)),
    sizes: sizes,
    colors: colors,
    variants: [],
    pricingTiers: [
      { min_quantity: moq, max_quantity: bulkThreshold - 1, unit_price: wholesalePrice },
      { min_quantity: bulkThreshold, max_quantity: stock - 1, unit_price: bulkPrice },
      { min_quantity: stock, max_quantity: null, unit_price: fullStockPrice },
    ],
    packageAllocations: packageAllocations,
    shippingPackageProfiles: shippingPackageProfiles,
    shipping_package_profiles: shippingPackageProfiles,
    isPackageAssortment: true,
    fullStockQuantity: stock,
  };
}

export const INITIAL_MOCK_PRODUCTS: B2BProductInput[] = (rawProductsData as any[]).map(normalizeProductData);
