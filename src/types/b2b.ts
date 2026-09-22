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
  collectionSeason?: string;
  shortDescription?: string;
  description?: string;
  material?: string;
  colorName?: string;
  colorHex?: string;
  weightGrams?: number;
  videoUrl?: string;
  youtubeVideoId?: string;
  youtubeEmbedUrl?: string;
  images: string[];
  costPrice?: number;
  wholesalePrice: number;
  standardPrice?: number;
  bulkThreshold?: number;
  bulkPrice?: number;
  fullStockPrice?: number;
  msrpPrice?: number;
  moq: number;
  stock: number;
  status: "published" | "draft" | "unpublished";
  isFeatured?: boolean;
  isNew?: boolean;
  isHot?: boolean;
  isLimitedDeal?: boolean;
  isBestDeal?: boolean;
  sizes?: string[];
  colors?: string[];
  variants?: B2BProductVariant[];
  pricingTiers?: import("./index").PricingTier[];
  packageAllocations?: import("./index").PackageAllocation[];
  shippingPackageProfiles?: import("./index").ShippingPackageProfile[];
  shipping_package_profiles?: import("./index").ShippingPackageProfile[];
  isPackageAssortment?: boolean;
  fullStockQuantity?: number;
}

export type RfqStatus = 
  | "SUBMITTED" 
  | "UNDER_REVIEW" 
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
