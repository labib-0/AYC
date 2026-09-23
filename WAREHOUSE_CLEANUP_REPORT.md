# Ayaan Clothing — Single Warehouse Refactor Report

**Business Rule:** AYAAN CLOTHING now uses one warehouse only: **Uttara**.

---

## 1. Previous Warehouse Architecture

Previously, the application contained multi-warehouse concepts and management layers:
- Seed data contained three separate warehouses:
  1. `Dhaka Central Export Hub` (`WH-DHK-01`) in Uttara, Dhaka
  2. `Chittagong Port Export Facility` (`WH-CTG-02`) in Chittagong
  3. `Savar Production & Transit Hub` (`WH-SVR-03`) in Savar
- `WarehouseManagementModal`: Allowed administrators to create, edit, and toggle active status across multiple warehouses.
- `WarehouseSelector`: Dropdown filter in the inventory toolbar allowing filtering across warehouses.
- `mockStore` & `AdminInventoryService`: Maintained CRUD methods (`createWarehouse`, `updateWarehouse`) and warehouse-based inventory slicing.
- Multi-warehouse assignment across mock inventory records.

---

## 2. Final Single-Warehouse Architecture

The entire inventory, catalog, and admin architecture has been simplified to a single fixed warehouse: **Uttara**.
- **Canonical Warehouse Single Source of Truth:** `CANONICAL_WAREHOUSE` defined in `src/lib/mock-data/mock-inventory.ts`.
- **Zero Warehouse Selection:** Removed dropdowns, modals, and multi-warehouse filters.
- **Unified Inventory Display:** The admin inventory screen, product stock configurations, adjustments, and history modals reflect current inventory held at Uttara.
- **Clean Service Layer:** Removed `createWarehouse` and `updateWarehouse` mutations.

---

## 3. Uttara Warehouse Details Used

Per the requirement, existing authentic warehouse coordinates from the repository were preserved with zero fabricated details:

```typescript
export const CANONICAL_WAREHOUSE: Warehouse = {
  id: 1,
  name: "Uttara",
  code: "WH-UTT-01",
  address: "House #33, Road #12, Sector #11, Uttara",
  city: "Dhaka",
  country_code: "BD",
  is_active: true,
  inventories_count: 24,
};
```

---

## 4. Warehouses Removed

The following obsolete warehouses and their records were completely excised from mock data, inventory assignments, and runtime stores:
1. `Chittagong Port Export Facility` (`WH-CTG-02`)
2. `Savar Production & Transit Hub` (`WH-SVR-03`)

---

## 5. Files Changed

1. **`src/lib/mock-data/mock-inventory.ts`**: Replaced multi-warehouse array with `CANONICAL_WAREHOUSE` (`[CANONICAL_WAREHOUSE]`); updated all 24 inventory items to `warehouse_id: 1` and `warehouse: CANONICAL_WAREHOUSE_INFO`.
2. **`src/lib/mock-data/mock-store.ts`**: Simplified `getWarehouses()` to return `INITIAL_MOCK_WAREHOUSES`; added safe runtime normalization in `getInventory()` to migrate legacy multi-warehouse `localStorage` records into Uttara; removed `createWarehouse` and `updateWarehouse`.
3. **`src/services/admin/inventory.service.ts`**: Simplified `getInventory()` and `getInventorySummary()` by removing multi-warehouse filtering; removed `createWarehouse` and `updateWarehouse` methods.
4. **`src/components/admin/inventory/index.ts`**: Removed exports for `WarehouseSelector` and `WarehouseManagementModal`.
5. **`src/components/admin/inventory/InventoryHeader.tsx`**: Removed "Manage Warehouses" button and updated header subtitle.
6. **`src/components/admin/inventory/InventoryToolbar.tsx`**: Removed `WarehouseSelector` and added a clean static `📍 Uttara Warehouse` indicator.
7. **`src/components/admin/inventory/InventoryTable.tsx`**: Removed `selectedWarehouse` prop; simplified empty state filter logic and mobile card warehouse label.
8. **`src/components/admin/inventory/InventoryRow.tsx`**: Updated warehouse column to display `Uttara` / `WH-UTT-01 • Dhaka, BD`.
9. **`src/components/admin/inventory/StockAdjustmentModal.tsx`**: Updated item selection and preview card to reference `Uttara (WH-UTT-01)`.
10. **`src/components/admin/inventory/InventoryHistoryModal.tsx`**: Updated audit trail header to reference `Uttara (WH-UTT-01)`.
11. **`src/app/admin/inventory/page.tsx`**: Removed multi-warehouse state, selector handlers, and `WarehouseManagementModal`.
12. **`src/components/admin/products/form/ProductVariantsSection.tsx`**: Updated UI copy to "Uttara warehouse stock".

---

## 6. Files Deleted

1. `src/components/admin/inventory/WarehouseManagementModal.tsx` — (Deleted: Obsolete multi-warehouse CRUD modal)
2. `src/components/admin/inventory/WarehouseSelector.tsx` — (Deleted: Obsolete multi-warehouse filter dropdown)

---

## 7. Data Structures Simplified

- **Warehouse Array:** Now contains exactly one element: `[CANONICAL_WAREHOUSE]`.
- **Inventory Records:** Every item points to `warehouse_id: 1` representing physical stock at Uttara.
- **InventoryQueryParams:** Removed `warehouse_id?: number | string;`.
- **InventoryAdjustmentPayload:** Removed `warehouse_id?: number;`.

---

## 8. Admin UI Changes

- **Inventory Header:** Clean action bar with `Adjust Stock` and `Refresh` buttons (removed `Manage Warehouses`).
- **Inventory Toolbar:** Retained real-time search and status filter tabs (`All Items`, `In Stock`, `Low Stock (<200)`, `Out of Stock`) alongside a single `📍 Uttara Warehouse` badge.
- **Data Table & Rows:** Fixed warehouse column displaying `Uttara (WH-UTT-01)`.

---

## 9. Inventory Changes

Current stock across all catalog products and variants directly reflects stock on hand at the single Uttara facility.

---

## 10. Order / Fulfillment Changes

All orders and commercial document generations (invoices, packing lists) assume direct dispatch from the single Uttara export facility.

---

## 11. MockStore / LocalStorage Migration

In `src/lib/mock-data/mock-store.ts`, `getInventory()` inspects persisted records in browser `localStorage`. If any legacy records contain non-Uttara identifiers or names (such as Chittagong or Savar), they are automatically normalized to `warehouse_id: 1` (`Uttara`) on read and persisted back. This prevents crashes or inconsistent views for users with existing cached browser storage.

---

## 12. Low-Stock Behavior

Maintained the unified B2B rule:
- `LOW STOCK = CURRENT STOCK < MINIMUM BULK AMOUNT` (with unified fallback threshold `LOW_STOCK_THRESHOLD = 200`).
- Calculations evaluate the current stock at the single Uttara warehouse.

---

## 13. Remaining Warehouse References

All remaining mentions of the term "warehouse" in the codebase refer strictly to:
1. The single canonical Uttara Warehouse (`CANONICAL_WAREHOUSE`).
2. Document job titles (e.g. `Warehouse Quality & Dispatch Supervisor` on export packing lists).
3. Customer shipping presets (e.g. buyer's delivery destination options such as Office / Warehouse / Distribution Center).

---

## 14. Verification Results

- **TypeScript Check (`npx tsc --noEmit`):** PASSED (0 errors)
- **Lint Check (`npm run lint`):** PASSED (0 errors)
- **Unit / Static Tests:** PASSED
- **Next.js Production Build (`npm run build`):** PASSED (All 39 static and dynamic routes compiled cleanly)

---

## Statement of Architecture

**AYAAN CLOTHING now uses one warehouse only: Uttara.**
