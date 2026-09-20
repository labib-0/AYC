import {
  adminInventoryService,
  LOW_STOCK_THRESHOLD,
  isLowStock,
  isOutOfStock,
  isInStock,
  getStockStatus,
} from "../src/services/admin/inventory.service";
import { mockStore } from "../src/lib/mock-data/mock-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase6Tests() {
  console.log("==================================================");
  console.log("PHASE 6: INVENTORY & STOCK MANAGEMENT VERIFICATION");
  console.log("==================================================\n");

  // 1. Unified Threshold Tests
  console.log("--- 1. Unified Low-Stock Threshold (< 200) ---");
  assert(LOW_STOCK_THRESHOLD === 200, `LOW_STOCK_THRESHOLD must equal 200 (got ${LOW_STOCK_THRESHOLD})`);
  assert(isLowStock(199) === true, "isLowStock(199) is true");
  assert(isLowStock(200) === false, "isLowStock(200) is false");
  assert(isLowStock(0) === false, "isLowStock(0) is false (0 is OUT_OF_STOCK)");
  assert(isOutOfStock(0) === true, "isOutOfStock(0) is true");
  assert(isOutOfStock(1) === false, "isOutOfStock(1) is false");
  assert(isInStock(200) === true, "isInStock(200) is true");
  assert(isInStock(199) === false, "isInStock(199) is false");
  assert(getStockStatus(0) === "OUT_OF_STOCK", "getStockStatus(0) === OUT_OF_STOCK");
  assert(getStockStatus(50) === "LOW_STOCK", "getStockStatus(50) === LOW_STOCK");
  assert(getStockStatus(250) === "IN_STOCK", "getStockStatus(250) === IN_STOCK");

  // 2. Initial Data & Relations
  console.log("\n--- 2. Mock Store Inventory & Warehouses ---");
  const initialItems = mockStore.getInventory();
  assert(initialItems.length >= 20, `Initial inventory contains at least 20 items (got ${initialItems.length})`);
  
  const initialWarehouses = mockStore.getWarehouses();
  assert(initialWarehouses.length >= 3, `Initial warehouses contain at least 3 facilities (got ${initialWarehouses.length})`);

  // Verify first record schema
  const first = initialItems[0];
  assert(Boolean(first.id && first.variant && first.warehouse), "Inventory record contains id, variant, and warehouse");
  assert(Boolean(first.variant?.product?.name), "Variant contains nested product name");
  assert(Boolean(first.variant?.sku), "Variant contains SKU");

  // 3. Dynamic KPI Summary
  console.log("\n--- 3. Dynamic KPI Summary Calculation ---");
  const summaryAll = await adminInventoryService.getInventorySummary();
  assert(summaryAll.totalItems === initialItems.length, `totalItems matches inventory count (${summaryAll.totalItems})`);
  assert(
    summaryAll.inStock + summaryAll.lowStock + summaryAll.outOfStock === summaryAll.totalItems,
    "inStock + lowStock + outOfStock equals totalItems"
  );
  assert(summaryAll.lowStock > 0, `Mock inventory contains low stock items (found ${summaryAll.lowStock})`);
  assert(summaryAll.outOfStock > 0, `Mock inventory contains out of stock items (found ${summaryAll.outOfStock})`);
  assert(summaryAll.totalQuantity > 0, `totalQuantity computed accurately (${summaryAll.totalQuantity})`);

  // Warehouse-scoped summary
  const targetWh = initialWarehouses[0].id;
  const summaryWh = await adminInventoryService.getInventorySummary(targetWh);
  assert(summaryWh.totalItems > 0 && summaryWh.totalItems <= summaryAll.totalItems, "Warehouse-scoped summary filters correctly");

  // 4. Query & Filter Verification
  console.log("\n--- 4. Query & Filter Execution ---");
  const lowStockRes = await adminInventoryService.getInventory({ status: "LOW_STOCK" });
  assert(lowStockRes.data.every((i) => i.quantity > 0 && i.quantity < 200), "All items in LOW_STOCK query have 0 < qty < 200");
  assert(lowStockRes.total === summaryAll.lowStock, `lowStockRes total matches summary (${lowStockRes.total})`);

  const outOfStockRes = await adminInventoryService.getInventory({ status: "OUT_OF_STOCK" });
  assert(outOfStockRes.data.every((i) => i.quantity === 0), "All items in OUT_OF_STOCK query have qty === 0");
  assert(outOfStockRes.total === summaryAll.outOfStock, `outOfStockRes total matches summary (${outOfStockRes.total})`);

  const inStockRes = await adminInventoryService.getInventory({ status: "IN_STOCK" });
  assert(inStockRes.data.every((i) => i.quantity >= 200), "All items in IN_STOCK query have qty >= 200");
  assert(inStockRes.total === summaryAll.inStock, `inStockRes total matches summary (${inStockRes.total})`);

  // Search filter
  const searchRes = await adminInventoryService.getInventory({ search: "Linen" });
  assert(searchRes.data.length > 0, `Search for 'Linen' returned ${searchRes.data.length} matches`);
  assert(
    searchRes.data.every((i) => 
      i.variant?.product?.name.toLowerCase().includes("linen") ||
      i.variant?.title.toLowerCase().includes("linen") ||
      i.variant?.sku.toLowerCase().includes("linen")
    ),
    "Search matches product name, variant title, or SKU"
  );

  // Pagination
  const paginated = await adminInventoryService.getInventory({ page: 1, per_page: 5 });
  assert(paginated.data.length === 5, "per_page: 5 returns exactly 5 items");
  assert(paginated.current_page === 1, "current_page is 1");
  assert(paginated.last_page === Math.ceil(initialItems.length / 5), "last_page computed accurately");

  // 5. Stock Adjustment (Delta and Absolute)
  console.log("\n--- 5. Stock Adjustment Mutations ---");
  const itemToAdjust = initialItems[0];
  const initialQty = itemToAdjust.quantity;

  // Delta addition (+60)
  const adjustedAdd = await adminInventoryService.adjustInventory({
    inventory_id: itemToAdjust.id,
    adjustment_amount: 60,
    reason: "Factory Shipment Arrival",
    notes: "Batch AC-2026-Q1 delivered via Chittagong.",
  });
  assert(adjustedAdd !== null && adjustedAdd.quantity === initialQty + 60, `Adding +60 updated stock from ${initialQty} to ${initialQty + 60}`);
  assert(adjustedAdd?.adjustments?.[0]?.reason === "Factory Shipment Arrival", "Audit reason recorded in adjustments");
  assert(adjustedAdd?.adjustments?.[0]?.notes === "Batch AC-2026-Q1 delivered via Chittagong.", "Audit notes recorded");

  // Delta deduction (-20)
  const adjustedSub = await adminInventoryService.adjustInventory({
    inventory_id: itemToAdjust.id,
    adjustment_amount: -20,
    reason: "Damaged Goods Write-off",
    notes: "Water damage inspection loss.",
  });
  assert(adjustedSub !== null && adjustedSub.quantity === initialQty + 40, `Deducting -20 updated stock to ${initialQty + 40}`);

  // Set absolute quantity (350)
  const adjustedSet = await adminInventoryService.adjustInventory({
    inventory_id: itemToAdjust.id,
    new_quantity: 350,
    reason: "Physical Audit Correction",
  });
  assert(adjustedSet !== null && adjustedSet.quantity === 350, `Setting absolute quantity updated stock to 350`);

  // History audit check
  const history = await adminInventoryService.getInventoryItemHistory(itemToAdjust.id);
  assert(Boolean(history && history.length >= 3), `Audit history contains all 3 adjustments (found ${history?.length || 0})`);
  assert(Boolean(history && history[0].resulting_quantity === 350), "Most recent audit entry reflects latest stock");
  console.log("   Audit log verification passed.");

  // 6. Warehouse Management (Create & Edit)
  console.log("\n--- 6. Warehouse Management Operations ---");
  const newWh = await adminInventoryService.createWarehouse({
    name: "Sylhet Regional Transit Hub",
    code: "WH-SYL-01",
    country_code: "BD",
    city: "Sylhet",
    address: "Airport Road Logistics Zone",
    is_active: true,
  });
  assert(Boolean(newWh.id && newWh.code === "WH-SYL-01"), `Warehouse created with ID ${newWh.id}`);

  // Edit warehouse
  const updatedWh = await adminInventoryService.updateWarehouse(newWh.id, {
    name: "Sylhet North Export Hub",
    code: "WH-SYL-02",
  });
  assert(updatedWh !== null && updatedWh.name === "Sylhet North Export Hub", "Warehouse updated successfully");

  // Check that mockStore includes the updated warehouse
  const currentWarehouses = await adminInventoryService.getWarehouses();
  assert(currentWarehouses.some((w) => w.code === "WH-SYL-02"), "New warehouse present in getWarehouses()");

  console.log("\n==================================================");
  console.log("ALL PHASE 6 INVENTORY VALIDATION TESTS PASSED!");
  console.log("==================================================");
}

runPhase6Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
