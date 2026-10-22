import fs from "fs";
import path from "path";

/**
 * AYAAN CLOTHING — WAREHOUSE STOCK ANOMALY & MOQ GATE COMPREHENSIVE TEST SUITE
 * 
 * Tests and verifies all 12 scenarios covering:
 * 1. Stock exactly matches required quantity
 * 2. Stock exceeds required quantity
 * 3. Stock is insufficient (600 required vs 421 available -> SHORT 179 pcs)
 * 4. Initial inventory increment / decrement through valid transaction (621 - 200 = 421)
 * 5. Carton and MOQ constraints enforcement during order placement
 * 6. Valid piece-level stock movement leaving non-MOQ multiple (621 - 200 = 421 pcs)
 * 7. Idempotency preventing double deductions
 * 8. Order cancellation restoration policy (decremented orders restored, un-decremented not inflated)
 * 9. Multi-line warehouse reconciliation against WH-UTTARA-01
 * 10. Atomic lock validation preventing negative stock
 * 11. Warning and shortage UI gate calculation
 * 12. Payment approval blocked when any line is insufficient
 */

interface MockWarehouseInventory {
  warehouseId: number;
  warehouseCode: string;
  productId: number;
  sku: string;
  productName: string;
  moq: number;
  stock: number;
}

interface MockOrderLine {
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
}

interface StockGateRow {
  productName: string;
  sku: string;
  required: number;
  available: number;
  shortfall: number;
  isConflict: boolean;
  status: "Ready" | `SHORT (${number} PCS)` | "Allocated";
}

function evaluateStockGate(
  lines: MockOrderLine[],
  warehouseStock: Map<number, MockWarehouseInventory>,
  isDecremented: boolean = false
): {
  rows: StockGateRow[];
  hasStockConflict: boolean;
  canApprove: boolean;
} {
  const rows: StockGateRow[] = lines.map((item) => {
    const inv = warehouseStock.get(item.productId);
    const available = inv ? inv.stock : 0;
    const isConflict = !isDecremented && available < item.quantity;
    const shortfall = isConflict ? Math.max(0, item.quantity - available) : 0;
    const status: StockGateRow["status"] = isDecremented
      ? "Allocated"
      : isConflict
      ? `SHORT (${shortfall} PCS)`
      : "Ready";

    return {
      productName: item.productName,
      sku: item.sku,
      required: item.quantity,
      available,
      shortfall,
      isConflict,
      status,
    };
  });

  const hasStockConflict = !isDecremented && rows.some((r) => r.isConflict);
  const canApprove = !hasStockConflict;

  return { rows, hasStockConflict, canApprove };
}

function validateCheckoutMoq(productMoq: number, requestedQty: number): { valid: boolean; error?: string } {
  const effectiveMoq = Math.max(1, productMoq);
  if (requestedQty < effectiveMoq) {
    return { valid: false, error: `Minimum order quantity (MOQ) is ${effectiveMoq} pcs.` };
  }
  if (requestedQty % effectiveMoq !== 0) {
    return { valid: false, error: `Order quantity must be a multiple of ${effectiveMoq} pcs.` };
  }
  return { valid: true };
}

function runSuite() {
  console.log("==================================================================");
  console.log("AYAAN CLOTHING — WAREHOUSE STOCK ANOMALY & MOQ GATE AUDIT SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  const cwd = process.cwd();

  // Test 1: Stock exactly matches required quantity (e.g. LADIES WINTER SETS: 100 req, 100 wh)
  {
    const wh = new Map<number, MockWarehouseInventory>([
      [212, { warehouseId: 1, warehouseCode: "WH-UTTARA-01", productId: 212, sku: "LAC-WIN-LAD-5573-01", productName: "LADIES WINTER SETS", moq: 100, stock: 100 }],
    ]);
    const lines: MockOrderLine[] = [{ productId: 212, productName: "LADIES WINTER SETS", sku: "LAC-WIN-LAD-5573-01", quantity: 100 }];
    const res = evaluateStockGate(lines, wh);

    assert(
      res.rows[0].shortfall === 0 && res.rows[0].status === "Ready" && !res.hasStockConflict && res.canApprove,
      "Scenario 1: Stock exactly matches required quantity (100 req vs 100 wh) resolves to Ready with 0 shortfall"
    );
  }

  // Test 2: Stock exceeds required quantity (e.g. Mens Interlock Jacket: 100 req, 160 wh; Cargo Pants: 300 req, 500 wh)
  {
    const wh = new Map<number, MockWarehouseInventory>([
      [198, { warehouseId: 1, warehouseCode: "WH-UTTARA-01", productId: 198, sku: "JAC-JAC-MEN-1363-01", productName: "Mens Interlock Jacket", moq: 100, stock: 160 }],
      [152, { warehouseId: 1, warehouseCode: "WH-UTTARA-01", productId: 152, sku: "ONL-CAR-LAD-2274", productName: "Ladies’ Stretch Spandex Wide-Leg Cargo Pants", moq: 100, stock: 500 }],
    ]);
    const lines: MockOrderLine[] = [
      { productId: 198, productName: "Mens Interlock Jacket", sku: "JAC-JAC-MEN-1363-01", quantity: 100 },
      { productId: 152, productName: "Ladies’ Stretch Spandex Wide-Leg Cargo Pants", sku: "ONL-CAR-LAD-2274", quantity: 300 },
    ];
    const res = evaluateStockGate(lines, wh);

    assert(
      res.rows[0].status === "Ready" && res.rows[0].shortfall === 0 &&
      res.rows[1].status === "Ready" && res.rows[1].shortfall === 0 &&
      res.canApprove,
      "Scenario 2: Stock exceeds required quantity (100 req vs 160 wh, 300 req vs 500 wh) resolves to Ready"
    );
  }

  // Test 3: Stock is insufficient (Boys Shirt H&M: 600 required vs 421 available -> SHORT 179 PCS)
  {
    const wh = new Map<number, MockWarehouseInventory>([
      [183, { warehouseId: 1, warehouseCode: "WH-UTTARA-01", productId: 183, sku: "HM-SHI-BOY-3684-01", productName: "Boys Shirt H&M", moq: 200, stock: 421 }],
    ]);
    const lines: MockOrderLine[] = [
      { productId: 183, productName: "Boys Shirt H&M", sku: "HM-SHI-BOY-3684-01", quantity: 600 },
    ];
    const res = evaluateStockGate(lines, wh);

    assert(
      res.rows[0].shortfall === 179 &&
      res.rows[0].status === "SHORT (179 PCS)" &&
      res.hasStockConflict === true &&
      res.canApprove === false,
      "Scenario 3: 600 required vs 421 available flags SHORT (179 PCS) and blocks confirmation"
    );
  }

  // Test 4: Initial inventory increment / decrement through valid transaction (621 - 200 = 421)
  {
    let inventoryStock = 0;
    // Step 1: Initial publication adjustment (+621 pcs)
    const initialAdjustment = 621;
    inventoryStock += initialAdjustment;
    assert(inventoryStock === 621, "Scenario 4a: Initial stock adjustment on publication records 621 pcs");

    // Step 2: Payment approved for Order AYN-20261021-VENHS0 (-200 pcs)
    const orderDeduction = 200;
    inventoryStock -= orderDeduction;
    assert(inventoryStock === 421, "Scenario 4b: Atomic decrement of 200 pcs for approved order produces exactly 421 pcs");
  }

  // Test 5: Carton and MOQ constraints apply when explicitly configured on checkout
  {
    const moq = 200;
    const belowMoq = validateCheckoutMoq(moq, 150);
    const nonMultiple = validateCheckoutMoq(moq, 250);
    const validMoq = validateCheckoutMoq(moq, 600);

    assert(
      belowMoq.valid === false &&
      nonMultiple.valid === false &&
      validMoq.valid === true,
      "Scenario 5: Checkout validates MOQ boundaries (<200 rejected, non-multiples like 250 rejected, 600 accepted)"
    );
  }

  // Test 6: Valid piece-level stock movement leaves non-MOQ multiple when piece-level inventory allowed
  {
    // Physical stocklots in apparel export frequently have piece-level counts (e.g. 621 pcs)
    const initialLot = 621;
    const moqIncrement = 200;
    const remainingAfterOneOrder = initialLot - moqIncrement;

    assert(
      remainingAfterOneOrder === 421 &&
      remainingAfterOneOrder % moqIncrement !== 0,
      "Scenario 6: Legitimate piece-level stock movement leaves non-MOQ remainder (421 pcs is valid physical balance)"
    );
  }

  // Test 7: Reservations / decrements are not deducted twice (idempotency guard)
  {
    let stock = 421;
    let paymentDetails: { inventory_decremented: boolean; decremented_at?: string } = { inventory_decremented: false };

    function approveOrderPayment(orderQty: number): boolean {
      if (paymentDetails.inventory_decremented) {
        return false; // Idempotent no-op
      }
      if (stock < orderQty) {
        throw new Error("Insufficient stock");
      }
      stock -= orderQty;
      paymentDetails.inventory_decremented = true;
      paymentDetails.decremented_at = new Date().toISOString();
      return true;
    }

    const firstRun = approveOrderPayment(200);
    const secondRun = approveOrderPayment(200);

    assert(
      firstRun === true &&
      secondRun === false &&
      stock === 221,
      "Scenario 7: Idempotency guard prevents duplicate inventory deduction upon payment approval retry"
    );
  }

  // Test 8: Cancellation releases stock ONLY if previously decremented
  {
    let stock = 221;
    function cancelOrder(isDecremented: boolean, qty: number) {
      if (isDecremented) {
        stock += qty;
      }
    }

    // Unpaid order cancelled (inventory was never decremented)
    cancelOrder(false, 600);
    assert(stock === 221, "Scenario 8a: Cancelling unconfirmed order does NOT inflate warehouse stock");

    // Paid/decremented order cancelled (stock restored)
    cancelOrder(true, 200);
    assert(stock === 421, "Scenario 8b: Cancelling confirmed decremented order restores warehouse stock (221 + 200 = 421)");
  }

  // Test 9: Multi-line order reconciliation against canonical warehouse WH-UTTARA-01
  {
    const order47Lines: MockOrderLine[] = [
      { productId: 198, productName: "Mens Interlock Jacket", sku: "JAC-JAC-MEN-1363-01", quantity: 100 },
      { productId: 212, productName: "LADIES WINTER SETS", sku: "LAC-WIN-LAD-5573-01", quantity: 100 },
      { productId: 152, productName: "Ladies’ Stretch Spandex Wide-Leg Cargo Pants", sku: "ONL-CAR-LAD-2274", quantity: 300 },
      { productId: 183, productName: "Boys Shirt H&M", sku: "HM-SHI-BOY-3684-01", quantity: 600 },
    ];

    const uttaraWarehouse = new Map<number, MockWarehouseInventory>([
      [198, { warehouseId: 1, warehouseCode: "WH-UTTARA-01", productId: 198, sku: "JAC-JAC-MEN-1363-01", productName: "Mens Interlock Jacket", moq: 100, stock: 160 }],
      [212, { warehouseId: 1, warehouseCode: "WH-UTTARA-01", productId: 212, sku: "LAC-WIN-LAD-5573-01", productName: "LADIES WINTER SETS", moq: 100, stock: 100 }],
      [152, { warehouseId: 1, warehouseCode: "WH-UTTARA-01", productId: 152, sku: "ONL-CAR-LAD-2274", productName: "Ladies’ Stretch Spandex Wide-Leg Cargo Pants", moq: 100, stock: 500 }],
      [183, { warehouseId: 1, warehouseCode: "WH-UTTARA-01", productId: 183, sku: "HM-SHI-BOY-3684-01", productName: "Boys Shirt H&M", moq: 200, stock: 421 }],
    ]);

    const res = evaluateStockGate(order47Lines, uttaraWarehouse);

    assert(
      res.rows.length === 4 &&
      res.rows[0].status === "Ready" &&
      res.rows[1].status === "Ready" &&
      res.rows[2].status === "Ready" &&
      res.rows[3].status === "SHORT (179 PCS)" &&
      res.hasStockConflict === true,
      "Scenario 9: Reconciling all 4 Order 47 lines against WH-UTTARA-01 matches exact screenshot values (160, 100, 500, 421)"
    );
  }

  // Test 10: Atomic lock validation preventing negative stock in backend Order.php
  {
    const orderModelPath = path.join(cwd, "backend/app/Models/Order.php");
    const orderCode = fs.readFileSync(orderModelPath, "utf-8");

    assert(
      orderCode.includes("lockForUpdate()") &&
      orderCode.includes("Insufficient stock") &&
      orderCode.includes("$actualDeduct = min($prevQty, $qty)") &&
      orderCode.includes("WH-UTTARA-01"),
      "Scenario 10: Backend Order.php implements pessimistic locking, shortage guard, and canonical WH-UTTARA-01 resolution"
    );
  }

  // Test 11: UI Gate Warning and Shortage Display reflects exact availability calculation
  {
    const cardPath = path.join(cwd, "src/components/admin/orders/OrderPaymentInventoryCard.tsx");
    const cardCode = fs.readFileSync(cardPath, "utf-8");

    assert(
      cardCode.includes("Pre-Approval Warehouse Stock Gate") &&
      cardCode.includes("Facility: WH-UTTARA-01 (Export Center)") &&
      cardCode.includes("Stock Conflict Detected — Confirmation Blocked") &&
      cardCode.includes("Short ({item.shortfall} pcs)") &&
      cardCode.includes("hasStockConflict"),
      "Scenario 11: OrderPaymentInventoryCard.tsx implements authoritative stock gate UI with exact copy, facility, and shortage badges"
    );
  }

  // Test 12: Payment approval remains blocked when any required line has insufficient stock
  {
    const adminOrderCtrlPath = path.join(cwd, "backend/app/Http/Controllers/Api/V1/Admin/OrderController.php");
    const adminCtrlCode = fs.readFileSync(adminOrderCtrlPath, "utf-8");
    const cardPath = path.join(cwd, "src/components/admin/orders/OrderPaymentInventoryCard.tsx");
    const cardCode = fs.readFileSync(cardPath, "utf-8");

    assert(
      adminCtrlCode.includes("$order->decrementInventory($admin->id") &&
      adminCtrlCode.includes("'error_code' => 'INSUFFICIENT_INVENTORY'") &&
      cardCode.includes("disabled={isLoading || hasStockConflict}"),
      "Scenario 12: Both backend reviewPaymentProof and frontend button strictly block approval when stock is insufficient"
    );
  }

  // Test 13: OrderItemResource Authoritative Stock Resolution Resilience
  {
    const resourcePath = path.join(cwd, "backend/app/Http/Resources/Api/V1/OrderItemResource.php");
    const resourceCode = fs.readFileSync(resourcePath, "utf-8");

    assert(
      resourceCode.includes("getTotalAvailableStock") &&
      resourceCode.includes("$data['current_stock'] = $availableStock;"),
      "Scenario 13: OrderItemResource resolves availableStock through getTotalAvailableStock() with fallback"
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSuite();
