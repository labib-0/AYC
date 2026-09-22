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

export interface InventoryRecord {
  id: number;
  product_variant_id: number;
  warehouse_id: number;
  quantity: number;
  reserved_quantity: number;
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
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalQuantity: number;
}

export interface InventoryQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  warehouse_id?: number | string;
  status?: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  low_stock?: boolean;
  sort?: string;
  direction?: "asc" | "desc";
}

export interface InventoryAdjustmentPayload {
  inventory_id?: number;
  variant_id?: number;
  warehouse_id?: number;
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
    let list = mockStore.getInventory();

    // 1. Filter by Search Query
    if (params?.search) {
      const q = params.search.trim().toLowerCase();
      list = list.filter((i) => {
        const titleMatch = i.variant?.title?.toLowerCase().includes(q);
        const productNameMatch = i.variant?.product?.name?.toLowerCase().includes(q);
        const variantSkuMatch = i.variant?.sku?.toLowerCase().includes(q);
        const productSkuMatch = i.variant?.product?.sku?.toLowerCase().includes(q);
        const brandMatch = i.variant?.product?.brand?.toLowerCase().includes(q);
        return Boolean(titleMatch || productNameMatch || variantSkuMatch || productSkuMatch || brandMatch);
      });
    }

    // 2. Filter by Warehouse
    if (params?.warehouse_id && params.warehouse_id !== "all") {
      list = list.filter((i) => String(i.warehouse_id) === String(params.warehouse_id));
    }

    // 3. Filter by Stock Status (Unified Threshold)
    const effectiveStatus = params?.status || (params?.low_stock ? "LOW_STOCK" : "ALL");
    if (effectiveStatus === "LOW_STOCK") {
      list = list.filter((i) => isLowStock(i.quantity));
    } else if (effectiveStatus === "OUT_OF_STOCK") {
      list = list.filter((i) => isOutOfStock(i.quantity));
    } else if (effectiveStatus === "IN_STOCK") {
      list = list.filter((i) => isInStock(i.quantity));
    }

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 20;
    const start = (page - 1) * perPage;
    const sliced = list.slice(start, start + perPage);

    return {
      data: sliced,
      current_page: page,
      last_page: Math.max(1, Math.ceil(list.length / perPage)),
      total: list.length,
      per_page: perPage,
    };
  }

  async getInventorySummary(warehouseId?: string | number): Promise<InventorySummary> {
    let list = mockStore.getInventory();
    if (warehouseId && warehouseId !== "all") {
      list = list.filter((i) => String(i.warehouse_id) === String(warehouseId));
    }

    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalQuantity = 0;

    for (const item of list) {
      totalQuantity += item.quantity;
      const status = getStockStatus(item.quantity);
      if (status === "OUT_OF_STOCK") outOfStock++;
      else if (status === "LOW_STOCK") lowStock++;
      else inStock++;
    }

    return {
      totalItems: list.length,
      inStock,
      lowStock,
      outOfStock,
      totalQuantity,
    };
  }

  async adjustInventory(payload: InventoryAdjustmentPayload): Promise<InventoryRecord | null> {
    return mockStore.adjustInventory(payload);
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return mockStore.getWarehouses();
  }

  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    return mockStore.createWarehouse(data);
  }

  async updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse | null> {
    return mockStore.updateWarehouse(id, data);
  }

  async getInventoryItemHistory(inventoryId: number): Promise<InventoryRecord["adjustments"]> {
    const list = mockStore.getInventory();
    const item = list.find((i) => i.id === inventoryId);
    return item?.adjustments || [];
  }
}

export const adminInventoryService = new AdminInventoryService();
