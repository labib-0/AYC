export type ProductStatus = "draft" | "active" | "archived" | "published" | "unpublished";

export interface B2BProductVariant {
  id?: string;
  sku: string;
  title: string;
  optionSummary?: string;
  color?: string;
  size?: string;
  priceCents?: number;
  wholesalePrice?: number;
  stock: number;
  moq?: number;
  isActive?: boolean;
}

export interface B2BProductInput {
  id: string;
  productId?: string;
  product_id?: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  brandLogo?: string;
  brand_id?: string;
  categoryId?: string;
  categoryName?: string;
  categories?: (number | string)[];
  audience: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX";
  designType?: "ORIGINAL" | "MASTER COPY";
  productType?: string;
  shortDescription?: string;
  description?: string;
  material?: string;
  color?: string;
  colorName?: string;
  colorHex?: string;
  videoUrl?: string;
  video_url?: string;
  youtubeVideoId?: string;
  youtubeEmbedUrl?: string;
  videoProvider?: string | null;
  vimeoVideoId?: string | null;
  images: string[];
  costPrice?: number;
  purchasePriceUpdated?: boolean | null;
  purchasePriceUpdatedAt?: string | null;
  wholesalePrice: number;
  standardPrice?: number;
  bulkThreshold?: number;
  bulkPrice?: number;
  fullStockPrice?: number;
  full_stock_price?: number;
  configuredFullStockPrice?: number;
  isFullStockEligible?: boolean;
  fullStockTotal?: number;
  moq: number;
  stock: number;
  warehouseId?: number | string;
  warehouse_id?: number | string;
  initialStock?: number;
  initial_stock?: number;
  onHandStock?: number;
  on_hand_stock?: number;
  reservedStock?: number;
  reserved_stock?: number;
  availableStock?: number;
  available_stock?: number;
  availableMoqs?: number;
  available_moqs?: number;
  maxCompletePackages?: number;
  max_complete_packages?: number;
  completePackageStock?: number;
  complete_package_stock?: number;
  warehouseBreakdown?: Array<{
    warehouse_id: number;
    warehouse_name: string;
    warehouse_code: string;
    on_hand_quantity: number;
    reserved_quantity: number;
    available_quantity: number;
  }>;
  status: "published" | "draft" | "unpublished";
  isFeatured?: boolean;
  featuredUntil?: string | null;
  featured_until?: string | null;
  isNew?: boolean;
  newUntil?: string | null;
  new_until?: string | null;
  isHot?: boolean;
  hotUntil?: string | null;
  hot_until?: string | null;
  isLimitedDeal?: boolean;
  isBestDeal?: boolean;
  isPreorder?: boolean;
  is_preorder?: boolean;
  estimatedDeliveryDate?: string | null;
  estimated_delivery_date?: string | null;
  sizes?: string[];
  colors?: string[];
  variants?: B2BProductVariant[];
  pricingTiers?: import("./index").PricingTier[];
  packageAllocations?: import("./index").PackageAllocation[];
  package_allocations?: import("./index").PackageAllocation[];
  shippingPackageProfiles?: import("./index").ShippingPackageProfile[];
  shipping_package_profiles?: import("./index").ShippingPackageProfile[];
  isPackageAssortment?: boolean;
  fullStockQuantity?: number;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
}

export type RfqStatus = 
  | "SUBMITTED" 
  | "RFQ_RECEIVED"
  | "UNDER_REVIEW" 
  | "APPROVED"
  | "QUOTATION_GENERATED"
  | "QUOTATION_APPROVED"
  | "PAID"
  | "NEED_INFORMATION" 
  | "QUOTATION_PREPARED" 
  | "SENT_TO_BUYER" 
  | "NEGOTIATION" 
  | "ACCEPTED" 
  | "REJECTED" 
  | "EXPIRED" 
  | "CONVERTED_TO_ORDER" 
  | "CANCELLED";

export interface RfqItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  brand: string;
  sku: string;
  image: string;
  category?: string;
  audience?: string;
  selectedColor?: string;
  selectedSize?: string;
  assortedSizesNotes?: string;
  assortedColorsNotes?: string;
  quantity: number;
  moq: number;
  unitPrice?: number;
  targetPrice?: number;
  buyerNotes?: string;
  package_breakdown?: any;
  packageBreakdown?: any;
}

export interface RfqMessage {
  id: string;
  rfqId: string;
  senderRole: "buyer" | "admin" | "sales";
  senderName: string;
  message: string;
  createdAt: string;
}

export interface RfqHistoryEvent {
  id: string;
  rfqId: string;
  status: RfqStatus;
  actorName: string;
  note?: string;
  createdAt: string;
}

export interface RfqRecord {
  id: string;
  rfqNumber: string;
  userId?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  companyName: string;
  businessType?: string;
  website?: string;
  taxNumber?: string;
  destinationCountry: string;
  destinationCity: string;
  shippingPort?: string;
  targetDeliveryDate?: string;
  requestTitle?: string;
  generalNotes?: string;
  status: RfqStatus;
  items: RfqItem[];
  messages?: RfqMessage[];
  history?: RfqHistoryEvent[];
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  quotationId?: string;
}

export type QuotationStatus = 
  | "DRAFT" 
  | "READY" 
  | "SENT" 
  | "VIEWED" 
  | "NEGOTIATION" 
  | "ACCEPTED" 
  | "REJECTED" 
  | "EXPIRED" 
  | "CONVERTED_TO_ORDER" 
  | "CANCELLED";

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  variantTitle?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  lineTotal: number;
  package_breakdown?: any;
  packageBreakdown?: any;
}

export interface QuotationRecord {
  id: string;
  quotationNumber: string; // e.g. QT-2026-000101
  revisionNumber: number; // 1, 2, ...
  rfqId: string;
  rfqNumber: string;
  userId?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  companyName: string;
  destinationCountry: string;
  destinationCity: string;
  currency: "USD" | "EUR" | "GBP" | "BDT";
  currencySymbol: string;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  paymentTerms: string; // e.g. "30% T/T Advance, 70% against B/L"
  shippingTerms: string; // e.g. "FOB Chittagong"
  incoterm?: "FOB" | "CIF" | "EXW" | "DDP" | "CFR";
  deliveryEstimate?: string;
  validUntil: string;
  adminNotes?: string;
  status: QuotationStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  proformaInvoiceId?: string;
}

export type CommercialDocType = "QUOTATION" | "PROFORMA_INVOICE" | "ORDER_SHEET" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CHALAN";

export interface OrderShippingSnapshot {
  provider?: "aramex" | "akij" | string;
  mode?: "air" | "sea" | string;
  shipping_method?: string;
  carrier?: string;
  tracking_number?: string;
  quoted_shipping_charge?: number | null;
  currency?: string;
  destination?: {
    name?: string;
    company_name?: string;
    phone?: string;
    email?: string;
    address1?: string;
    address2?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country_code?: string;
  };
  service_type?: string;
  destination_port?: string;
  special_instructions?: string;
  third_party_notify?: {
    name?: string;
    address?: string;
  };
  package_quantity?: number;
  carton_count?: number;
  carton_dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: "cm" | "in" | "m";
  };
  gross_weight?: number;
  net_weight?: number | null;
  weight_unit?: "kg" | "lbs" | "g";
  cbm?: number;
  total_cbm?: number;
  chargeable_weight?: number;
  port_of_loading?: string;
  quote_reference_id?: string | null;
  quoted_at?: string;
  is_provisional?: boolean;
  notes?: string | null;
}

export interface CommercialDocument {
  id: string;
  docNumber: string;
  docType: CommercialDocType;
  title: string;
  date: string;
  quotationNumber?: string;
  rfqNumber?: string;
  orderNumber?: string;
  order_id?: string;
  related_invoice_number?: string;
  pi_number?: string;
  order_sheet_number?: string;
  packing_list_number?: string;
  is_payment_verified?: boolean;
  is_gated?: boolean;
  payment_status?: string;
  payment_details?: {
    payment_status?: string;
    payment_method?: string;
    transaction_id?: string;
    payer_name?: string;
    bank_name?: string;
    account_number?: string;
    payment_amount?: number;
    currency?: string;
    payment_date?: string;
    notes?: string;
    receipt_url?: string;
    receipt_original_name?: string;
    confirmed_at?: string;
  };
  companyName: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerAddress?: string;
  buyerCountry: string;
  exporter?: {
    company_name: string;
    brand: string;
    address: string;
    city: string;
    postal_code: string;
    country: string;
    phone: string;
    email: string;
    web?: string;
    reg_number?: string;
    tin_number?: string;
    bgmea_reg?: string;
    est_year?: string;
  };
  notify_party?: {
    name: string;
    company_name?: string;
    address: string;
    city?: string;
    country: string;
    contact?: string;
  };
  logistics?: {
    country_of_origin: string;
    place_of_receipt: string;
    port_of_loading: string;
    port_of_discharge: string;
    final_destination: string;
    terms_of_delivery: string;
    mode_of_shipment: string;
    carrier?: string;
    awb_number?: string;
    carrier_status?: string;
  };
  shipping_snapshot?: OrderShippingSnapshot;
  items: Array<{
    id?: string;
    item_no?: number;
    description: string;
    sku: string;
    hs_code?: string;
    marks_and_numbers?: string;
    product_image_url?: string;
    product_images?: string[];
    quantity: number;
    unitPrice: number;
    total: number;
    size?: string;
    color?: string;
    package_breakdown?: any;
    details?: string;
  }>;
  product_gallery?: string[];
  packing_cartons?: Array<{
    carton_no: string;
    marks_and_numbers: string;
    description: string;
    quantity_pcs: number;
    packaging: string;
    dimensions: string;
    gross_weight: number;
    net_weight: number;
    cbm: number;
  }>;
  totals_summary?: {
    total_quantity: number;
    total_cartons: number;
    total_gross_weight: number;
    total_net_weight: number;
    total_cbm: number;
    weight_unit: string;
  };
  subtotal: number;
  goods_value?: number;
  discount: number;
  shipping: number;
  tax: number;
  other_charges?: number;
  grandTotal: number;
  total_payable?: number;
  amount_in_words?: string;
  currency: string;
  paymentTerms?: string;
  shippingTerms?: string;
  incoterm?: string;
  validUntil?: string;
  notes?: string;
  bankDetails?: {
    isConfigured?: boolean;
    beneficiaryName?: string;
    accountTitle?: string;
    bankName?: string | null;
    accountNumber?: string | null;
    accountNo?: string | null;
    swiftCode?: string | null;
    bankAddress?: string | null;
    branch?: string | null;
    routing_no?: string | null;
    routingNumber?: string | null;
  };
}
