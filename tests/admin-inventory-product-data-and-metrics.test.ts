import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getInventoryProduct,
  getInventorySku,
  getInventoryBrandName,
  getInventoryCategoryName,
  getInventoryImageUrl,
  InventoryRecord,
  LOW_STOCK_THRESHOLD,
  isInStock,
  isLowStock,
  isOutOfStock,
} from "../src/services/admin/inventory.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedCount++;
  }
}

console.log("==================================================");
console.log("ADMIN INVENTORY PRODUCT DATA & METRICS VERIFICATION");
console.log("==================================================");

const srcDir = path.resolve(__dirname, "../src");
const backendDir = path.resolve(__dirname, "../backend");

const inventoryServiceFile = path.join(srcDir, "services/admin/inventory.service.ts");
const inventoryRowFile = path.join(srcDir, "components/admin/inventory/InventoryRow.tsx");
const inventoryTableFile = path.join(srcDir, "components/admin/inventory/InventoryTable.tsx");
const stockAdjustmentModalFile = path.join(srcDir, "components/admin/inventory/StockAdjustmentModal.tsx");
const inventoryHistoryModalFile = path.join(srcDir, "components/admin/inventory/InventoryHistoryModal.tsx");
const inventoryKpisFile = path.join(srcDir, "components/admin/inventory/InventoryKpis.tsx");
const inventoryControllerFile = path.join(backendDir, "app/Http/Controllers/Api/V1/Admin/InventoryController.php");

const inventoryServiceContent = fs.readFileSync(inventoryServiceFile, "utf-8");
const inventoryRowContent = fs.readFileSync(inventoryRowFile, "utf-8");
const inventoryTableContent = fs.readFileSync(inventoryTableFile, "utf-8");
const stockAdjustmentModalContent = fs.readFileSync(stockAdjustmentModalFile, "utf-8");
const inventoryHistoryModalContent = fs.readFileSync(inventoryHistoryModalFile, "utf-8");
const inventoryKpisContent = fs.readFileSync(inventoryKpisFile, "utf-8");
const inventoryControllerContent = fs.readFileSync(inventoryControllerFile, "utf-8");

// ==================================================
// 1. BACKEND RELATIONSHIPS & EAGER LOADING
// ==================================================
console.log("\n▶ 1. Backend Eager Loading & Query Structure:");

assert(
  inventoryControllerContent.includes("'product.brand'") &&
    inventoryControllerContent.includes("'product.categories'") &&
    inventoryControllerContent.includes("'product.images'") &&
    inventoryControllerContent.includes("'variant.product.brand'") &&
    inventoryControllerContent.includes("'variant.product.categories'") &&
    inventoryControllerContent.includes("'variant.product.images'") &&
    inventoryControllerContent.includes("'warehouse'") &&
    inventoryControllerContent.includes("'adjustments.adminUser'"),
  "Backend index() eagerly loads product.brand, product.categories, product.images, variant relations, and warehouse"
);

assert(
  inventoryControllerContent.includes("$totalProducts = (clone $productQuery)->distinct()->count('products.id');") &&
    inventoryControllerContent.includes("$totalRecords = (clone $base)->count();"),
  "Backend summary() distinguishes unique products count from total inventory records count"
);

assert(
  inventoryControllerContent.includes("$totalQuantity = (int) (clone $base)->sum('quantity');") &&
    !inventoryControllerContent.includes("reserved"),
  "Backend calculates total quantity directly without Reserved Stock deduction"
);

// ==================================================
// 2. ELIMINATION OF FAKE/PLACEHOLDER DATA & "Catalog Product"
// ==================================================
console.log("\n▶ 2. Elimination of Fake/Placeholder Fallbacks:");

assert(
  !inventoryRowContent.includes('"Catalog Product"') &&
    !inventoryTableContent.includes('"Catalog Product"') &&
    !stockAdjustmentModalContent.includes('"Catalog Product"') &&
    !inventoryHistoryModalContent.includes('"Catalog Product"'),
  "No inventory component uses 'Catalog Product' fallback"
);

assert(
  !inventoryRowContent.includes('|| "Ayaan"') &&
    !inventoryRowContent.includes('|| "Apparel"'),
  "InventoryRow does not hardcode fake brand 'Ayaan' or category 'Apparel'"
);

assert(
  !inventoryRowContent.includes("variant?.sku || record.id") &&
    !inventoryTableContent.includes("variant?.sku || record.id") &&
    !inventoryHistoryModalContent.includes("variant?.sku || record.id"),
  "No component displays raw inventory record.id as SKU"
);

// ==================================================
// 3. AUTHORITATIVE HELPER FUNCTIONS IN INVENTORY SERVICE
// ==================================================
console.log("\n▶ 3. Testing Inventory Helper Functions (Direct Product & Variant Models):");

// Direct Product Inventory (like live wholesale items on VPS)
const directRecord: InventoryRecord = {
  id: 85,
  product_id: 11,
  product_variant_id: null,
  warehouse_id: 1,
  quantity: 350,
  created_at: "2026-09-29T11:54:53.000000Z",
  updated_at: "2026-09-29T11:54:53.000000Z",
  product: {
    id: 11,
    name: "Men’s Straight Fit Denim Jeans-",
    slug: "men-s-straight-fit-denim-jeans",
    sku: "AY-APP-MEN-2933",
    brand: { id: 42, name: "IZOD", slug: "izod" },
    category: { id: 6, name: "Jeans", slug: "jeans" },
    categories: [{ id: 6, name: "Jeans", slug: "jeans" }],
    images: [
      {
        id: 2069,
        image_url: "https://ayaanclothing.com/storage/products/RM10BA7EcjPtOIjQI6MCz6Io.webp",
        is_primary: true,
      },
      {
        id: 2070,
        image_url: "https://ayaanclothing.com/storage/products/HAr7Er6nA1xJ5wx0EZhQ39ez.webp",
        is_primary: false,
      },
    ],
  },
  warehouse: {
    id: 1,
    name: "Uttara Warehouse",
    code: "WH-UTTARA-01",
    city: "Dhaka",
  },
};

const directProduct = getInventoryProduct(directRecord);
assert(
  directProduct?.name === "Men’s Straight Fit Denim Jeans-",
  "getInventoryProduct correctly resolves product for direct product inventory"
);

assert(
  getInventorySku(directRecord) === "AY-APP-MEN-2933",
  "getInventorySku correctly resolves real product SKU ('AY-APP-MEN-2933') instead of record ID ('85')"
);

assert(
  getInventoryBrandName(directRecord) === "IZOD",
  "getInventoryBrandName correctly resolves brand 'IZOD' instead of generic fallback"
);

assert(
  getInventoryCategoryName(directRecord) === "Jeans",
  "getInventoryCategoryName correctly resolves category 'Jeans' instead of generic fallback"
);

assert(
  getInventoryImageUrl(directRecord) === "https://ayaanclothing.com/storage/products/RM10BA7EcjPtOIjQI6MCz6Io.webp",
  "getInventoryImageUrl correctly resolves primary product image"
);

// Variant-based Inventory
const variantRecord: InventoryRecord = {
  id: 140,
  product_id: null,
  product_variant_id: 12,
  warehouse_id: 1,
  quantity: 150,
  created_at: "2026-09-29T11:54:53.000000Z",
  updated_at: "2026-09-29T11:54:53.000000Z",
  variant: {
    id: 12,
    sku: "AY-APP-MEN-2933-BLU-32",
    title: "Blue / 32",
    stock: 150,
    color: "Blue",
    size: "32",
    product: {
      id: 11,
      name: "Men’s Straight Fit Denim Jeans-",
      slug: "men-s-straight-fit-denim-jeans",
      sku: "AY-APP-MEN-2933",
      brand: "IZOD",
      category: "Jeans",
      images: ["https://ayaanclothing.com/storage/products/RM10BA7EcjPtOIjQI6MCz6Io.webp"],
    },
  },
  warehouse: {
    id: 1,
    name: "Uttara Warehouse",
    code: "WH-UTTARA-01",
  },
};

assert(
  getInventoryProduct(variantRecord)?.name === "Men’s Straight Fit Denim Jeans-",
  "getInventoryProduct correctly resolves parent product for variant inventory"
);

assert(
  getInventorySku(variantRecord) === "AY-APP-MEN-2933-BLU-32",
  "getInventorySku correctly resolves variant SKU for variant inventory"
);

assert(
  getInventoryBrandName(variantRecord) === "IZOD" &&
    getInventoryCategoryName(variantRecord) === "Jeans",
  "getInventoryBrandName and getInventoryCategoryName resolve string brand and category"
);

// ==================================================
// 4. THRESHOLDS & INVENTORY KPI CONSISTENCY
// ==================================================
console.log("\n▶ 4. Stock Thresholds & Status Consistency:");

assert(
  LOW_STOCK_THRESHOLD === 200,
  "Authoritative low stock threshold is strictly 200 units"
);

assert(
  isInStock(200) && isInStock(500) && !isInStock(199),
  "isInStock is true if and only if quantity >= 200"
);

assert(
  isLowStock(199) && isLowStock(1) && !isLowStock(200) && !isLowStock(0),
  "isLowStock is true if and only if 0 < quantity < 200"
);

assert(
  isOutOfStock(0) && isOutOfStock(-5) && !isOutOfStock(1),
  "isOutOfStock is true if and only if quantity <= 0"
);

// ==================================================
// SUMMARY
// ==================================================
console.log("\n==================================================");
console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL INVENTORY PRODUCT DATA & METRICS TESTS PASSED!");
}
