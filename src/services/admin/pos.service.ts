import { apiClient } from "@/services/api-client";
import { OrderRecord } from "@/services/order.service";

export interface PosCustomer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  avatar_url?: string;
  orders_count: number;
  created_at?: string;
}

export interface PosVariant {
  id: number;
  sku: string;
  title: string;
  size?: string;
  color?: string;
  stock: number;
  price: number;
  is_active: boolean;
}

export interface PosPricingTier {
  min_quantity: number;
  max_quantity?: number | null;
  unit_price: number;
}

export interface PosWarehouseStock {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  country_code: string;
  on_hand: number;
  available: number;
}

export interface PosProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  brand?: string;
  color_name?: string;
  moq: number;
  image_url: string;
  has_variants: boolean;
  has_package_allocations: boolean;
  package_assortment_message?: string | null;
  total_available_stock: number;
  selected_warehouse_stock?: number | null;
  is_sold_out: boolean;
  unit_price: number;
  pricing_tiers: PosPricingTier[];
  variants: PosVariant[];
  warehouse_breakdown: PosWarehouseStock[];
}

export interface PosWarehouse {
  id: number;
  name: string;
  code: string;
  city?: string;
  country_code?: string;
}

export interface PosCalculationPreviewLine {
  product_id: number;
  product_name: string;
  product_slug: string;
  sku: string;
  product_variant_id?: number | null;
  variant_title?: string | null;
  size?: string | null;
  color?: string | null;
  product_image_url: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  package_breakdown?: any;
}

export interface PosManualDiscount {
  type: "percentage" | "fixed" | "flat";
  value: number;
  reason: string;
  amount?: number;
}

export interface PosCalculationPreview {
  subtotal: number;
  coupon_discount_amount?: number;
  manual_discount_amount?: number;
  discount_amount: number;
  coupon_code?: string;
  manual_discount?: PosManualDiscount | null;
  shipping_cost: number;
  shipping_method: string;
  tax_amount: number;
  other_charges: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_status: "paid" | "partially_paid" | "pending";
  total_quantity: number;
  lines: PosCalculationPreviewLine[];
}

export interface PosSaleItemPayload {
  product_id: number;
  variant_id?: number | null;
  size?: string | null;
  quantity: number;
  pricing_mode?: string | null;
}

export interface PosSalePayload {
  customer_id: number;
  items: PosSaleItemPayload[];
  warehouse_id?: number | null;
  coupon_code?: string | null;
  manual_discount?: PosManualDiscount | null;
  shipping_cost?: number | null;
  shipping_method?: string | null;
  payment_method?: string | null;
  paid_amount?: number | null;
  payment_reference?: string | null;
  notes?: string | null;
  idempotency_key?: string | null;
}

export class AdminPosService {
  /**
   * Search existing customers for POS sale assignment.
   */
  async searchCustomers(query: string = "", limit: number = 20): Promise<PosCustomer[]> {
    const params = new URLSearchParams();
    if (query) params.append("search", query);
    params.append("limit", String(limit));

    const res = await apiClient.get<any>(`/admin/pos/customers?${params.toString()}`);
    const data = res?.data || res;
    return Array.isArray(data) ? data : [];
  }

  /**
   * Search product catalog for POS sale items.
   */
  async searchProducts(
    query: string = "",
    warehouseId?: number | null,
    limit: number = 25
  ): Promise<PosProduct[]> {
    const params = new URLSearchParams();
    if (query) params.append("search", query);
    if (warehouseId) params.append("warehouse_id", String(warehouseId));
    params.append("limit", String(limit));

    const res = await apiClient.get<any>(`/admin/pos/products?${params.toString()}`);
    const data = res?.data || res;
    return Array.isArray(data) ? data : [];
  }

  /**
   * List active warehouses for inventory fulfillment.
   */
  async getWarehouses(): Promise<PosWarehouse[]> {
    const res = await apiClient.get<any>("/admin/pos/warehouses");
    const data = res?.data || res;
    return Array.isArray(data) ? data : [];
  }

  /**
   * Live preview calculation using authoritative OrderCalculationService.
   */
  async calculatePreview(payload: {
    customer_id: number;
    items: PosSaleItemPayload[];
    coupon_code?: string | null;
    manual_discount?: PosManualDiscount | null;
    shipping_cost?: number | null;
    shipping_method?: string | null;
    paid_amount?: number | null;
    payment_method?: string | null;
    payment_reference?: string | null;
  }): Promise<PosCalculationPreview> {
    const res = await apiClient.post<any>("/admin/pos/calculate", payload);
    return res?.data || res;
  }

  /**
   * Complete POS sale transaction atomically.
   */
  async completeSale(payload: PosSalePayload): Promise<OrderRecord> {
    const headers: Record<string, string> = {};
    if (payload.idempotency_key) {
      headers["X-Idempotency-Key"] = payload.idempotency_key;
    }

    const res = await apiClient.post<any>("/admin/pos/orders", payload, { headers });
    return (res?.data || res) as OrderRecord;
  }
}

export const posService = new AdminPosService();
