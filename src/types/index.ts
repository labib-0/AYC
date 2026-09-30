export interface Product {
  id: string;
  productId?: string;
  product_id?: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  wholesalePrice?: number;
  standardPrice?: number;
  bulkPricingEnabled?: boolean;
  bulk_pricing_enabled?: boolean;
  bulkThreshold?: number | null;
  bulkPrice?: number | null;
  bulkMinimumQuantity?: number | null;
  bulk_minimum_quantity?: number | null;
  bulkUnitPrice?: number | null;
  bulk_unit_price?: number | null;
  fullStockPrice?: number;
  configuredFullStockPrice?: number;
  isFullStockEligible?: boolean;
  fullStockQuantity?: number;
  fullStockTotal?: number;
  categoryId: string;
  categoryName?: string;
  audience?: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | string;
  designType?: "ORIGINAL" | "MASTER COPY";
  images: string[];
  isNew?: boolean;
  newUntil?: string | null;
  isHot?: boolean;
  hotUntil?: string | null;
  isFeatured?: boolean;
  featuredUntil?: string | null;
  isLimitedTimeOffer?: boolean;
  isPreorder?: boolean;
  is_preorder?: boolean;
  estimatedDeliveryDate?: string | null;
  estimated_delivery_date?: string | null;
  promotionType?: "limited-time" | "featured" | "clearance" | string;
  sizes: string[];
  sku?: string;
  moq?: number;
  quantityStep?: number;
  availableStock?: number;
  stock?: number;
  availableMoqs?: number;
  maxCompletePackages?: number;
  completePackageStock?: number;
  onHandStock?: number;
  brand?: string;
  brandLogo?: string;
  brand_logo?: string;
  colours?: number;
  color?: string;
  colorName?: string;
  material?: string;
  sizeDescription?: string;
  size_description?: string;
  colourDescription?: string;
  colour_description?: string;
  packageAssortmentVisible?: boolean;
  package_assortment_visible?: boolean;
  packageAssortmentMessage?: string;
  package_assortment_message?: string;
  shortDescription?: string;
  status?: string;
  isDraft?: boolean;
  isHiddenFromStorefront?: boolean;
  is_hidden_from_storefront?: boolean;
  description?: string;
  createdAt?: string;
  addedAt?: string;
  publishedAt?: string;
  pricingTiers?: PricingTier[];
  packageAllocations?: PackageAllocation[];
  shippingPackageProfiles?: ShippingPackageProfile[];
  shipping_package_profiles?: ShippingPackageProfile[];
  isPackageAssortment?: boolean;
  videoUrl?: string;
  youtubeVideoId?: string;
  youtubeEmbedUrl?: string;
  videoProvider?: string | null;
  vimeoVideoId?: string | null;
  seoTitle?: string;
  seo_title?: string;
  seoDescription?: string;
  seo_description?: string;
  keywords?: string[];
  seo_keywords?: string[];
}

export interface ShippingPackageProfile {
  id?: string | number;
  product_id?: string | number;
  package_quantity: number;
  quantity_max?: number | null;
  carton_count?: number;
  carton_length?: number;
  carton_width?: number;
  carton_height?: number;
  dimension_unit: "cm" | "in" | "m";
  gross_weight?: number;        // per carton
  total_gross_weight?: number; // gross_weight × carton_count (derived)
  net_weight?: number | null;
  weight_unit: "kg" | "lbs" | "g";
  notes?: string | null;
  is_active?: boolean;
  total_cbm?: number;          // derived packaging volume
}

export interface PricingTier {
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
}

export interface PackageAllocation {
  id?: number | string;
  package_name?: string;
  product_variant_id?: number | null;
  quantity: number;
  color: string | null;
  size: string | null;
}

export interface PackageBreakdown {
  product_variant_id: number | null;
  quantity: number;
  size?: string;
  color?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
}
export * from "./api";

