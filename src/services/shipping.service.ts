import { calculateMockShippingQuote } from "@/lib/mock-data/mock-shipping";

export interface ShippingQuoteItem {
  product_id: string | number;
  quantity: number;
}

export interface ShipmentSpecs {
  package_quantity: number;
  carton_count: number;
  carton_dimensions: {
    length: number;
    width: number;
    height: number;
    unit: "cm" | "in" | "m";
  };
  gross_weight: number;
  net_weight?: number;
  weight_unit: "kg" | "lbs" | "g" | string;
  cbm: number;
  total_cbm: number;
}

export interface ShippingQuoteOption {
  quote_id: string;
  provider?: "aramex" | "akij" | string;
  carrier: string;
  service_name: string;
  division?: string;
  mode: "air" | "sea" | string;
  amount: number | null;
  currency: string;
  estimated_days?: string;
  gross_weight?: number;
  net_weight?: number;
  chargeable_weight?: number;
  weight_unit?: string;
  carton_count?: number;
  cbm?: number;
  billable_cbm?: number;
  rate_per_cbm?: number;
  port_of_loading?: string;
  is_available: boolean;
  is_provisional?: boolean;
  requires_quote?: boolean;
  error_message?: string;
  notes?: string;
  quoted_at: string;
  expires_at: string;
}

export interface ShippingQuoteRequest {
  items: ShippingQuoteItem[];
  country_code: string;
  city?: string;
  postal_code?: string;
  address1?: string;
  shipping_mode?: "all" | "air" | "sea";
}

export interface ShippingQuoteResponse {
  success: boolean;
  origin: {
    name: string;
    company: string;
    city: string;
    country_code: string;
  };
  destination: {
    country_code: string;
    city: string;
    postal_code: string;
    line1?: string;
  };
  goods_value: number;
  currency: string;
  shipment_specs: ShipmentSpecs;
  quotes: ShippingQuoteOption[];
  items?: Array<{
    product_id: string | number;
    name: string;
    sku: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  message?: string;
}

class ShippingService {
  /**
   * Request real-time shipping quote
   */
  async getShippingQuotes(request: ShippingQuoteRequest): Promise<ShippingQuoteResponse> {
    return calculateMockShippingQuote(request);
  }
}

export const shippingService = new ShippingService();
