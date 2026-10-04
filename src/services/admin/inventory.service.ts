import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";

// ============================================================================
// Unified Low-Stock Threshold & Status Logic (Single Source of Truth)
// ============================================================================

export const LOW_STOCK_THRESHOLD = 200;

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function isOutOfStock(quantity: number): boolean {
  return quantity <= 0;
}

export function isLowStock(quantity: number): boolean {
  return quantity > 0 && quantity < LOW_STOCK_THRESHOLD;
}

export function isInStock(quantity: number): boolean {
  return quantity >= LOW_STOCK_THRESHOLD;
}

export function getStockStatus(quantity: number): StockStatus {
  if (isOutOfStock(quantity)) return "OUT_OF_STOCK";
  if (isLowStock(quantity)) return "LOW_STOCK";
  return "IN_STOCK";
}

// ============================================================================
// Interfaces
// ============================================================================

export interface InventoryAdjustment {
  id: number;
  previous_quantity: number;
  adjustment_amount: number;
  resulting_quantity: number;
  reason: string;
  notes?: string;
  created_at: string;
  admin_user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface InventoryProductImage {
  id?: number;
  product_id?: number;
  image_url: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface InventoryBrand {
  id?: number;
  name?: string;
  slug?: string;
  logo_url?: string;
}

export interface InventoryCategory {
  id?: number;
  name?: string;
  slug?: string;
}

export interface InventoryProduct {
  id: number | string;
  name: string;
  slug: string;
  sku: string;
  wholesale_price?: number | string;
  brand?: InventoryBrand | string;
  category?: InventoryCategory | string;
  categories?: InventoryCategory[];
  images?: Array<InventoryProductImage | { image_url?: string; is_primary?: boolean }> | string[];
}

export interface InventoryRecord {
  id: number;
  product_id?: number | null;
  product_variant_id?: number | null;
  warehouse_id: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: InventoryProduct;
  variant?: {
    id: number;
    sku: string;
    title: string;
    size?: string;
    color?: string;
    stock: number;
    product?: InventoryProduct;
  };
  warehouse?: {
    id: number;
    name: string;
    code: string;
    city?: string;
    address?: string;
    country_code?: string;
  };
  adjustments?: InventoryAdjustment[];
}

export function getInventoryProduct(record?: InventoryRecord | null): InventoryProduct | undefined {
  if (!record) return undefined;
  return record.product || record.variant?.product;
}

export function getInventorySku(record?: InventoryRecord | null): string {
  if (!record) return "—";
  const product = getInventoryProduct(record);
  return record.variant?.sku || product?.sku || "—";
}

export function getInventoryBrandName(record?: InventoryRecord | null): string {
  const product = getInventoryProduct(record);
  if (!product?.brand) return "—";
  if (typeof product.brand === "string") return product.brand;
  return product.brand.name || "—";
}

export function getInventoryCategoryName(record?: InventoryRecord | null): string {
  const product = getInventoryProduct(record);
  if (!product) return "—";
  if (typeof product.category === "string") return product.category;
  if (product.category?.name) return product.category.name;
  if (Array.isArray(product.categories) && product.categories.length > 0) {
    return product.categories[0]?.name || "—";
  }
  return "—";
}

export function getInventoryImageUrl(record?: InventoryRecord | null): string {
  const product = getInventoryProduct(record);
  if (!product?.images || product.images.length === 0) return "/placeholder.jpg";
  if (Array.isArray(product.images)) {
    const primary = product.images.find(
      (img) => typeof img === "object" && img !== null && "is_primary" in img && (img as any).is_primary
    );
    const target = primary || product.images[0];
    if (typeof target === "string") return target;
    return target?.image_url || "/placeholder.jpg";
  }
  return "/placeholder.jpg";
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  country_code: string;
  is_active: boolean;
  inventories_count?: number;
}

export interface InventorySummary {
  totalItems: number;
  totalProducts?: number;
  totalRecords?: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalQuantity: number;
  inStockRecords?: number;
  lowStockRecords?: number;
  outOfStockRecords?: number;
}

export interface InventoryQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  low_stock?: boolean;
  sort?: string;
  direction?: "asc" | "desc";
}

export interface InventoryAdjustmentPayload {
  inventory_id?: number;
  variant_id?: number;
  product_id?: number | string;
  warehouse_id?: number;
  adjustment_amount?: number;
  new_quantity?: number;
  reason: string;
  notes?: string;
}

export interface InventoryAdjustmentResult {
  inventory: InventoryRecord;
  quantity?: number;
  adjustment?: InventoryAdjustment;
  variant_total_stock?: number;
  product_stock?: number;
  on_hand_stock?: number;
  available_stock?: number;
  available_moqs?: number;
  warehouse_breakdown?: Array<{
    warehouse_id: number;
    warehouse_name: string;
    warehouse_code: string;
    on_hand_quantity: number;
    available_quantity: number;
    inventory_id?: number;
  }>;
}

export class AdminInventoryService {
  async getInventory(params?: InventoryQueryParams): Promise<{
    data: InventoryRecord[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  }> {
    try {
      const res = await apiClient.get<any>("/admin/inventory", { params: params as any });
      const data = res?.data || res;
      const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      return {
        data: items,
        current_page: data?.current_page || 1,
        last_page: data?.last_page || 1,
        total: data?.total !== undefined ? Number(data.total) : items.length,
        per_page: data?.per_page || (params?.per_page ?? 20),
      };
    } catch (err) {
      console.warn("Failed to fetch inventory from API, returning empty database state:", err);
      return {
        data: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: params?.per_page ?? 20,
      };
    }
  }

  async getInventorySummary(): Promise<InventorySummary> {
    try {
      const res = await apiClient.get<any>("/admin/inventory/summary");
      const data = res?.data || res;
      if (data && (typeof data.totalItems === "number" || typeof data.totalProducts === "number")) {
        const totalProducts = Number(data.totalProducts ?? data.totalItems ?? 0);
        return {
          totalItems: totalProducts,
          totalProducts: totalProducts,
          totalRecords: Number(data.totalRecords ?? data.totalItems ?? 0),
          inStock: Number(data.inStock || 0),
          lowStock: Number(data.lowStock || 0),
          outOfStock: Number(data.outOfStock || 0),
          totalQuantity: Number(data.totalQuantity || 0),
          inStockRecords: Number(data.inStockRecords ?? data.inStock ?? 0),
          lowStockRecords: Number(data.lowStockRecords ?? data.lowStock ?? 0),
          outOfStockRecords: Number(data.outOfStockRecords ?? data.outOfStock ?? 0),
        };
      }
      return {
        totalItems: 0,
        totalProducts: 0,
        totalRecords: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalQuantity: 0,
      };
    } catch (err) {
      console.warn("Failed to fetch inventory summary from API, returning zero state:", err);
      return {
        totalItems: 0,
        totalProducts: 0,
        totalRecords: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalQuantity: 0,
      };
    }
  }

  async adjustInventory(payload: InventoryAdjustmentPayload): Promise<InventoryAdjustmentResult | null> {
    if (isFrontendOnly()) {
      const inv = mockStore.adjustInventory(payload);
      const resultingQty = inv?.quantity ?? (payload.new_quantity !== undefined ? payload.new_quantity : ((payload.adjustment_amount ?? 0) >= 0 ? 1000 + (payload.adjustment_amount ?? 0) : Math.max(0, 1000 + (payload.adjustment_amount ?? 0))));
      return {
        inventory: inv || ({
          id: payload.inventory_id || 1,
          quantity: resultingQty,
          warehouse: mockStore.getWarehouses()[0],
        } as any),
        quantity: resultingQty,
        adjustment: {
          id: Date.now(),
          previous_quantity: 1000,
          adjustment_amount: payload.adjustment_amount ?? 0,
          resulting_quantity: resultingQty,
          reason: payload.reason,
          notes: payload.notes,
          created_at: new Date().toISOString(),
        },
        product_stock: resultingQty,
        on_hand_stock: resultingQty,
        available_stock: resultingQty,
        available_moqs: Math.floor(resultingQty / 50),
        warehouse_breakdown: [
          {
            inventory_id: payload.inventory_id || 1,
            warehouse_id: payload.warehouse_id || 1,
            warehouse_name: "Uttara Warehouse",
            warehouse_code: "WH-UTTARA-01",
            on_hand_quantity: resultingQty,
            available_quantity: resultingQty,
          },
        ],
      };
    }
    try {
      const res = await apiClient.post<any>("/admin/inventory/adjust", payload);
      const data = res?.data || res;
      if (data && (data.inventory || data.product_stock !== undefined || data.id)) {
        const inv = data.inventory || data;
        return {
          inventory: inv,
          quantity: inv?.quantity ?? data.quantity ?? data.product_stock,
          adjustment: data.adjustment,
          variant_total_stock: data.variant_total_stock,
          product_stock: data.product_stock,
          on_hand_stock: data.on_hand_stock,
          available_stock: data.available_stock,
          available_moqs: data.available_moqs,
          warehouse_breakdown: data.warehouse_breakdown,
        };
      }
      return null;
    } catch (err) {
      console.error("Failed to adjust inventory via API:", err);
      throw err;
    }
  }

  async getWarehouses(): Promise<Warehouse[]> {
    if (isFrontendOnly()) {
      return mockStore.getWarehouses();
    }
    try {
      const res = await apiClient.get<any>("/admin/warehouses");
      const list = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(list)) return list;
      return [];
    } catch (err) {
      console.warn("Failed to fetch warehouses from API:", err);
      return mockStore.getWarehouses();
    }
  }

  async getInventoryItemHistory(inventoryId: number): Promise<InventoryRecord["adjustments"]> {
    try {
      const res = await apiClient.get<any>(`/admin/inventory/${inventoryId}/history`);
      const data = res?.data || res;
      if (Array.isArray(data)) return data;
      return [];
    } catch (err) {
      console.warn("Failed to fetch inventory history from API:", err);
      return [];
    }
  }
}

export const adminInventoryService = new AdminInventoryService();
