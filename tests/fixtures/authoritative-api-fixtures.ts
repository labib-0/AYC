/**
 * AUTHORITATIVE API CONTRACT FIXTURES (TEST ENVIRONMENT ONLY)
 * 
 * Accurately models the exact Laravel API v1 responses defined in:
 * - backend/app/Http/Resources/Api/V1/ProductResource.php
 * - backend/app/Http/Resources/Api/V1/CategoryResource.php
 * - backend/app/Http/Resources/Api/V1/BrandResource.php
 * - backend/app/Http/Resources/Api/V1/CartResource.php
 * - backend/app/Http/Resources/Api/V1/OrderResource.php
 * - backend/app/Http/Resources/Api/V1/RfqResource.php
 * - backend/app/Http/Resources/Api/V1/WishlistResource.php
 * 
 * STRICT CONTRACT RULES ENFORCED:
 * 1. Customer responses NEVER include cost_price, costPrice, purchase_price, or internal product_id.
 * 2. Full Stock pricing, quantities, and eligible totals are mathematically sound.
 * 3. YouTube & Facebook video embed URLs and IDs conform to strict regex patterns.
 * 4. Coupons define type, discount value, and minimum order requirements.
 */

export interface AuthoritativeProductFixture {
  id: number;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  brand_id: string | null;
  brand_logo: string | null;
  categoryId: string | null;
  categoryName: string | null;
  audience: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX";
  design_type: "ORIGINAL" | "MASTER COPY";
  designType: "ORIGINAL" | "MASTER COPY";
  productType: string;
  shortDescription: string;
  description: string;
  seo_title: string;
  seo_description: string;
  keywords: string[];
  material: string;
  package_assortment_visible: boolean;
  package_assortment_message: string;
  images: string[];
  price: number;
  effective_customer_unit_price: number;
  lowest_customer_unit_price: number;
  has_valid_price: boolean;
  wholesalePrice: number;
  standardPrice: number;
  bulk_pricing_enabled: boolean;
  bulk_threshold: number | null;
  bulk_price: number | null;
  fullStockPrice: number;
  is_full_stock_eligible: boolean;
  full_stock_quantity: number;
  full_stock_total: number;
  moq: number;
  stock: number;
  available_stock: number;
  in_stock: boolean;
  youtubeVideoId: string | null;
  youtubeEmbedUrl: string | null;
  facebookVideoUrl: string | null;
  facebookEmbedUrl: string | null;
  is_hot: boolean;
  is_new: boolean;
  is_sold_out: boolean;
  is_preorder: boolean;
  sizes: string[];
  colors: string[];
  pricing_tiers: Array<{
    min_quantity: number;
    max_quantity: number | null;
    unit_price: number;
  }>;
}

export const FIXTURE_PRODUCTS: Record<string, AuthoritativeProductFixture> = {
  merinoSweater: {
    id: 101,
    name: "Men's Luxury Merino Wool Knit Sweater",
    slug: "mens-luxury-merino-wool-knit-sweater",
    sku: "AYN-SWT-0101",
    brand: "Ayaan Prime",
    brand_id: "1",
    brand_logo: "/brands/ayaan-prime.svg",
    categoryId: "c_sweaters",
    categoryName: "Sweaters",
    audience: "MEN",
    design_type: "ORIGINAL",
    designType: "ORIGINAL",
    productType: "Knitwear",
    shortDescription: "Ultra-fine merino wool knitted sweater for wholesale distribution.",
    description: "Export-grade 100% Australian Merino Wool knit sweater. Engineered with anti-pilling yarn.",
    seo_title: "Men's Luxury Merino Wool Knit Sweater | Ayaan B2B",
    seo_description: "Wholesale export luxury merino wool sweater. Minimum order 100 pcs. Direct factory export.",
    keywords: ["merino wool", "knit sweater", "wholesale apparel", "b2b export"],
    material: "100% Merino Wool",
    package_assortment_visible: true,
    package_assortment_message: "Each package includes a mixed assortment of all available colours and sizes.",
    images: [
      "https://images.pexels.com/photos/45982/pexels-photo-45982.jpeg",
      "https://images.pexels.com/photos/1040424/pexels-photo-1040424.jpeg"
    ],
    price: 18.50,
    effective_customer_unit_price: 18.50,
    lowest_customer_unit_price: 18.50,
    has_valid_price: true,
    wholesalePrice: 24.00,
    standardPrice: 24.00,
    bulk_pricing_enabled: true,
    bulk_threshold: 500,
    bulk_price: 21.00,
    fullStockPrice: 18.50,
    is_full_stock_eligible: true,
    full_stock_quantity: 1550,
    full_stock_total: 28675.00,
    moq: 100,
    stock: 1550,
    available_stock: 1550,
    in_stock: true,
    youtubeVideoId: "dQw4w9WgXcQ",
    youtubeEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    facebookVideoUrl: "https://www.facebook.com/watch/?v=1234567890",
    facebookEmbedUrl: "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D1234567890",
    is_hot: true,
    is_new: false,
    is_sold_out: false,
    is_preorder: false,
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Navy", "Charcoal", "Burgundy"],
    pricing_tiers: [
      { min_quantity: 100, max_quantity: 499, unit_price: 24.00 },
      { min_quantity: 500, max_quantity: 1549, unit_price: 21.00 },
      { min_quantity: 1550, max_quantity: null, unit_price: 18.50 }
    ]
  },
  soldOutPolo: {
    id: 102,
    name: "Classic Pique Cotton Polo Shirt",
    slug: "classic-pique-cotton-polo-shirt",
    sku: "AYN-POL-0102",
    brand: "Zara",
    brand_id: "2",
    brand_logo: "/brands/zara.svg",
    categoryId: "c_tshirts",
    categoryName: "T-Shirts",
    audience: "MEN",
    design_type: "ORIGINAL",
    designType: "ORIGINAL",
    productType: "T-Shirt",
    shortDescription: "Combed cotton pique polo shirt.",
    description: "220 GSM ring-spun cotton pique polo shirt with reinforced rib collar.",
    seo_title: "Classic Pique Cotton Polo Shirt - Sold Out | Ayaan B2B",
    seo_description: "Wholesale cotton polo shirts. Currently sold out.",
    keywords: ["polo shirt", "pique cotton", "wholesale polo"],
    material: "100% Combed Cotton",
    package_assortment_visible: true,
    package_assortment_message: "Each package includes a mixed assortment of all available colours and sizes.",
    images: ["/placeholder.jpg"],
    price: 12.00,
    effective_customer_unit_price: 12.00,
    lowest_customer_unit_price: 12.00,
    has_valid_price: true,
    wholesalePrice: 12.00,
    standardPrice: 12.00,
    bulk_pricing_enabled: false,
    bulk_threshold: null,
    bulk_price: null,
    fullStockPrice: 12.00,
    is_full_stock_eligible: false,
    full_stock_quantity: 0,
    full_stock_total: 0,
    moq: 100,
    stock: 0,
    available_stock: 0,
    in_stock: false,
    youtubeVideoId: null,
    youtubeEmbedUrl: null,
    facebookVideoUrl: null,
    facebookEmbedUrl: null,
    is_hot: false,
    is_new: false,
    is_sold_out: true,
    is_preorder: false,
    sizes: ["M", "L"],
    colors: ["White"],
    pricing_tiers: [
      { min_quantity: 100, max_quantity: null, unit_price: 12.00 }
    ]
  },
  preorderJacket: {
    id: 103,
    name: "Winter Expedition Down Jacket",
    slug: "winter-expedition-down-jacket",
    sku: "AYN-JKT-0103",
    brand: null, // Test product without brand
    brand_id: null,
    brand_logo: null,
    categoryId: "c_jackets",
    categoryName: "Jackets",
    audience: "UNISEX",
    design_type: "MASTER COPY",
    designType: "MASTER COPY",
    productType: "Outerwear",
    shortDescription: "High-loft duck down insulated outerwear.",
    description: "700 fill power responsibly sourced down jacket with DWR water-resistant nylon shell.",
    seo_title: "Winter Expedition Down Jacket (Pre-Order) | Ayaan B2B",
    seo_description: "Advance wholesale pre-order for next season winter outerwear.",
    keywords: ["down jacket", "outerwear", "wholesale winter", "b2b coats"],
    material: "100% Nylon Shell, 90/10 Duck Down",
    package_assortment_visible: false,
    package_assortment_message: "Package assortment is managed upon order confirmation.",
    images: ["https://images.pexels.com/photos/842811/pexels-photo-842811.jpeg"],
    price: 45.00,
    effective_customer_unit_price: 45.00,
    lowest_customer_unit_price: 40.00,
    has_valid_price: true,
    wholesalePrice: 45.00,
    standardPrice: 45.00,
    bulk_pricing_enabled: true,
    bulk_threshold: 200,
    bulk_price: 40.00,
    fullStockPrice: 40.00,
    is_full_stock_eligible: false,
    full_stock_quantity: 500,
    full_stock_total: 20000.00,
    moq: 50,
    stock: 500,
    available_stock: 500,
    in_stock: true,
    youtubeVideoId: null,
    youtubeEmbedUrl: null,
    facebookVideoUrl: null,
    facebookEmbedUrl: null,
    is_hot: false,
    is_new: true,
    is_sold_out: false,
    is_preorder: true,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Olive"],
    pricing_tiers: [
      { min_quantity: 50, max_quantity: 199, unit_price: 45.00 },
      { min_quantity: 200, max_quantity: null, unit_price: 40.00 }
    ]
  }
};

export const FIXTURE_CATEGORIES = [
  { id: 1, name: "Sweaters", slug: "sweaters", image_url: "/categories/sweaters.jpg" },
  { id: 2, name: "T-Shirts", slug: "t-shirts", image_url: "/categories/t-shirts.jpg" },
  { id: 3, name: "Jackets", slug: "jackets", image_url: "/categories/jackets.jpg" },
  { id: 4, name: "Towels", slug: "towels", image_url: "/categories/towels.jpg" }
];

export const FIXTURE_BRANDS = [
  { id: 1, name: "Ayaan Prime", slug: "ayaan-prime", logo_url: "/brands/ayaan-prime.svg" },
  { id: 2, name: "Zara", slug: "zara", logo_url: "/brands/zara.svg" },
  { id: 3, name: "Nike", slug: "nike", logo_url: "/brands/nike.svg" }
];

export const FIXTURE_COUPONS = {
  validPercent: {
    code: "WHOLESALE10",
    type: "percentage" as const,
    discount_value: 10,
    min_order_amount: 500,
    max_discount_amount: 200,
    is_active: true
  },
  validFixed: {
    code: "SAVE50",
    type: "fixed" as const,
    discount_value: 50,
    min_order_amount: 300,
    max_discount_amount: null,
    is_active: true
  },
  expired: {
    code: "EXPIRED20",
    type: "percentage" as const,
    discount_value: 20,
    min_order_amount: 100,
    max_discount_amount: 100,
    is_active: false
  }
};

export const FIXTURE_USERS = {
  customerA: {
    id: 1001,
    name: "Customer Alpha",
    email: "customer-alpha@ayaan-test.local",
    role: "customer" as const,
    token: "cust_token_alpha_123"
  },
  customerB: {
    id: 1002,
    name: "Customer Beta",
    email: "customer-beta@ayaan-test.local",
    role: "customer" as const,
    token: "cust_token_beta_456"
  },
  admin: {
    id: 999,
    name: "Admin User",
    email: "admin@ayaan-demo.local",
    role: "admin" as const,
    token: "admin_token_master_789"
  }
};

export const FIXTURE_ORDERS = {
  customerAOrder: {
    id: 5001,
    order_number: "ORD-2026-5001",
    user_id: 1001,
    status: "processing",
    payment_status: "paid",
    total_amount: 3700.00,
    currency: "USD",
    items_count: 150,
    created_at: "2026-10-01T10:00:00Z",
    items: [
      {
        id: 9001,
        product_id: 101,
        product_name: "Men's Luxury Merino Wool Knit Sweater",
        quantity: 150,
        unit_price: 24.00,
        subtotal: 3600.00
      }
    ]
  },
  customerBOrder: {
    id: 5002,
    order_number: "ORD-2026-5002",
    user_id: 1002,
    status: "completed",
    payment_status: "paid",
    total_amount: 1200.00,
    currency: "USD",
    items_count: 100,
    created_at: "2026-10-02T12:00:00Z",
    items: [
      {
        id: 9002,
        product_id: 102,
        product_name: "Classic Pique Cotton Polo Shirt",
        quantity: 100,
        unit_price: 12.00,
        subtotal: 1200.00
      }
    ]
  }
};

export const FIXTURE_RFQS = {
  customerARfq: {
    id: 7001,
    rfq_number: "RFQ-2026-7001",
    user_id: 1001,
    product_id: 101,
    product_name: "Men's Luxury Merino Wool Knit Sweater",
    target_quantity: 500,
    target_price: 19.50,
    status: "submitted",
    notes: "Requesting customized neck labels and hang tags.",
    created_at: "2026-10-03T14:30:00Z"
  },
  customerBRfq: {
    id: 7002,
    rfq_number: "RFQ-2026-7002",
    user_id: 1002,
    product_id: 103,
    product_name: "Winter Expedition Down Jacket",
    target_quantity: 1000,
    target_price: 36.00,
    status: "in_review",
    notes: "Requires waterproof seam sealing certificate.",
    created_at: "2026-10-04T09:15:00Z"
  }
};
