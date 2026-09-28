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
  bulkThreshold?: number;
  bulkPrice?: number;
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
  reservedStock?: number;
  brand?: string;
  brandLogo?: string;
  brand_logo?: string;
  colours?: number;
  color?: string;
  colorName?: string;
  material?: string;
  shortDescription?: string;
  status?: string;
  isDraft?: boolean;
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
  seoDescription?: string;
  keywords?: string[];
}

export interface ShippingPackageProfile {
  id?: string | number;
  product_id?: string | number;
  package_quantity: number;
  quantity_max?: number | null;
  carton_count: number;
  carton_length: number;
  carton_width: number;
  carton_height: number;
  dimension_unit: "cm" | "in" | "m";
  gross_weight: number;        // per carton
  total_gross_weight?: number; // gross_weight × carton_count (derived)
  net_weight?: number | null;
  weight_unit: "kg" | "lbs" | "g";
  notes?: string | null;
  is_active?: boolean;
  single_carton_cbm?: number;  // volume of one carton (derived)
  total_cbm?: number;          // single_carton_cbm × carton_count (derived)
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

