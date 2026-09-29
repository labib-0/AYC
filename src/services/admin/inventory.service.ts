import { apiClient } from "@/services/api-client";

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

export interface InventoryRecord {
  id: number;
  product_variant_id: number;
  warehouse_id: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  variant?: {
    id: number;
    sku: string;
    title: string;
    size?: string;
    color?: string;
    stock: number;
    product?: {
      id: number | string;
      name: string;
      slug: string;
      sku: string;
      wholesale_price: number;
      brand?: string;
      category?: string;
      images?: Array<{ id: number; image_url: string }> | string[];
    };
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
  adjustment_amount?: number;
  new_quantity?: number;
  reason: string;
  notes?: string;
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

  async adjustInventory(payload: InventoryAdjustmentPayload): Promise<InventoryRecord | null> {
    try {
      const res = await apiClient.post<any>("/admin/inventory/adjust", payload);
      const data = res?.data || res;
      return (data?.inventory || data) as InventoryRecord;
    } catch (err) {
      console.error("Failed to adjust inventory via API:", err);
      throw err;
    }
  }

  async getWarehouses(): Promise<Warehouse[]> {
    try {
      const res = await apiClient.get<any>("/admin/warehouses");
      const list = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(list)) return list;
      return [];
    } catch (err) {
      console.warn("Failed to fetch warehouses from API:", err);
      return [];
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
