export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  wholesalePrice?: number;
  standardPrice?: number;
  bulkThreshold?: number;
  bulkPrice?: number;
  fullStockPrice?: number;
  categoryId: string;
  categoryName?: string;
  audience?: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | string;
  designType?: "ORIGINAL" | "MASTER COPY";
  images: string[];
  isNew?: boolean;
  isHot?: boolean;
  isLimitedTimeOffer?: boolean;
  promotionType?: "limited-time" | "featured" | "clearance" | string;
  sizes: string[];
  sku?: string;
  moq?: number;
  quantityStep?: number;
  availableStock?: number;
  brand?: string;
  brandLogo?: string;
  colours?: number;
  color?: string;
  description?: string;
  createdAt?: string;
  addedAt?: string;
  publishedAt?: string;
  pricingTiers?: PricingTier[];
  packageAllocations?: PackageAllocation[];
  shippingPackageProfiles?: ShippingPackageProfile[];
  shipping_package_profiles?: ShippingPackageProfile[];
  isPackageAssortment?: boolean;
  fullStockQuantity?: number;
  videoUrl?: string;
  youtubeVideoId?: string;
  youtubeEmbedUrl?: string;
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
  gross_weight: number;
  net_weight?: number | null;
  weight_unit: "kg" | "lbs" | "g";
  notes?: string | null;
  is_active?: boolean;
  total_cbm?: number;
}

export interface PricingTier {
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
}

export interface PackageAllocation {
  product_variant_id: number;
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

export type HeroCtaAction = "featured-products" | "category" | "product" | "url";

export interface HeroPromotion {
  id: string | number;
  title: string;
  subtitle: string;
  description?: string;
  eyebrow?: string;
  image: string;
  buttonText: string;
  buttonAction: HeroCtaAction;
  buttonTarget?: string;
  active: boolean;
  sortOrder: number;
  startAt?: string;
  endAt?: string;
}

export type SecondaryBannerType = "new-arrivals" | "limited-time-offer";

export interface HeroSecondaryBanner {
  id: string | number;
  type: SecondaryBannerType;
  title: string;
  subtitle?: string;
  image: string;
  targetType: "featured-products" | "category" | "product" | "url";
  target?: string;
  active: boolean;
  productId?: string;
}

export interface ProductPromotion {
  id: string;
  productId: string;
  type: "limited-time" | "featured" | "clearance";
  active: boolean;
  startAt?: string;
  endAt?: string;
  priority?: number;
  customTitle?: string;
  customSubtitle?: string;
  customImage?: string;
}

export * from "./api";

