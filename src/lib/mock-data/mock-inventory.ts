import { InventoryRecord, Warehouse } from "@/services/admin/inventory.service";

export const CANONICAL_WAREHOUSE: Warehouse = {
  id: 1,
  name: "Uttara Warehouse",
  code: "WH-UTTARA-01",
  address: "House #33 (2nd floor), Road #12, Sector #11, Uttara",
  city: "Dhaka",
  country_code: "BD",
  is_active: true,
  inventories_count: 0,
};

export const INITIAL_MOCK_WAREHOUSES: Warehouse[] = [CANONICAL_WAREHOUSE];

/**
 * Baseline inventory is completely empty.
 * All inventory records and metrics derive dynamically from actual database products & stock.
 * No hardcoded, demo, or fabricated inventory counts exist.
 */
export const INITIAL_MOCK_INVENTORY: InventoryRecord[] = [];
