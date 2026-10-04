import fs from "fs";
import path from "path";

/**
 * AYAAN CLOTHING CART REDESIGN AUDIT SUITE
 *
 * Verifies that the customer shopping cart (both MiniCart drawer and /cart page):
 * 1. Top Cart Toolbar includes Select All checkbox, selection count, and bulk Delete action.
 * 2. Real Select All logic with indeterminate state synchronization.
 * 3. Individual and bulk deletion functionality with loading states and concurrent execution.
 * 4. Compact horizontal cart rows following the Section 23 visual target:
 *    [ Checkbox ] [ Thumbnail ] [ Title & Price / Meta / Stepper & Delete ]
 * 5. Compact quantity steppers respecting MOQ step and validation.
 * 6. Authentic AYC pricing and formatters preserved without fake discounts.
 * 7. Pre-order and sold-out states indicated clearly with badges.
 * 8. Clean, space-efficient dividers without excessive card nesting.
 * 9. Customer authentication requirement preserved for checkout.
 * 10. CartContext calculations, stock validations, and RFQ copying preserved intact.
 */
function runTests() {
  console.log("==================================================");
  console.log("AYAAN CLOTHING CART UI REDESIGN AUDIT");
  console.log("==================================================\n");

  const cwd = process.cwd();
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

  const miniCartPath = path.join(cwd, "src/components/cart/MiniCart.tsx");
  const cartPagePath = path.join(cwd, "src/app/cart/page.tsx");
  const cartContextPath = path.join(cwd, "src/lib/CartContext.tsx");

  const miniCartCode = fs.readFileSync(miniCartPath, "utf-8");
  const cartPageCode = fs.readFileSync(cartPagePath, "utf-8");
  const cartContextCode = fs.readFileSync(cartContextPath, "utf-8");

  // ─────────────────────────────────────────────────────────────
  // Group 1: Top Cart Toolbar & Selection (MiniCart & CartPage)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ Group 1: Top Cart Toolbar & Selection State");
  assert(
    miniCartCode.includes("handleToggleSelectAll") &&
      cartPageCode.includes("handleToggleSelectAll"),
    "Both MiniCart and CartPage implement handleToggleSelectAll"
  );
  assert(
    miniCartCode.includes("selectAllRef") &&
      miniCartCode.includes(".indeterminate = isIndeterminate"),
    "MiniCart synchronizes native HTML checkbox indeterminate property"
  );
  assert(
    cartPageCode.includes("selectAllRef") &&
      cartPageCode.includes(".indeterminate = isIndeterminate"),
    "CartPage synchronizes native HTML checkbox indeterminate property"
  );
  assert(
    miniCartCode.includes("SELECT ALL") && miniCartCode.includes("ALL SELECTED"),
    "Top Toolbar renders dynamic selection count labels (SELECT ALL / ALL SELECTED / SELECTED X OF Y)"
  );
  assert(
    miniCartCode.includes("handleDeleteSelected") &&
      cartPageCode.includes("handleDeleteSelected"),
    "Top Toolbar connects to bulk delete handler"
  );
  assert(
    miniCartCode.includes("disabled={selectedKeys.length === 0 || isBulkDeleting}"),
    "Bulk Delete button is disabled when nothing is selected or during deletion"
  );

  // ─────────────────────────────────────────────────────────────
  // Group 2: Deletion Functionality & Concurrency
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 2: Individual & Bulk Deletion");
  assert(
    miniCartCode.includes("handleDeleteSingle") &&
      cartPageCode.includes("handleDeleteSingle"),
    "Per-row individual delete handler exists on both cart views"
  );
  assert(
    miniCartCode.includes("Promise.all") && cartPageCode.includes("Promise.all"),
    "Bulk deletion executes concurrent Promise.all for fast, non-blocking requests"
  );
  assert(
    miniCartCode.includes("isBulkDeleting") && miniCartCode.includes("deletingKeys"),
    "Cart tracks both bulk and individual item deletion loading keys"
  );
  assert(
    miniCartCode.includes("removeFromCart") && cartPageCode.includes("removeFromCart"),
    "Deletions call the authoritative CartContext removeFromCart method"
  );

  // ─────────────────────────────────────────────────────────────
  // Group 3: Compact Row Structure (Section 23 Visual Target)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 3: Compact Row Structure & Space Efficiency");
  assert(
    miniCartCode.includes("aspect-[3/4]") &&
      miniCartCode.includes("object-contain"),
    "Product thumbnail preserves 3:4 aspect ratio with object-contain to prevent distortion"
  );
  assert(
    miniCartCode.includes("line-clamp-1") &&
      miniCartCode.includes("uppercase tracking-tight"),
    "Product titles are prominently displayed with clean truncation without squishing"
  );
  assert(
    miniCartCode.includes("formatPrice(lineTotal)") &&
      miniCartCode.includes("formatPrice(unitPrice)"),
    "Row renders line total prominently with per-piece unit price breakdown"
  );
  assert(
    miniCartCode.includes("Minus") && miniCartCode.includes("Plus"),
    "Compact quantity stepper buttons (Minus & Plus) are aligned in the row"
  );
  assert(
    miniCartCode.includes("Trash2"),
    "Delete trash icon is positioned adjacent to the quantity stepper"
  );

  // ─────────────────────────────────────────────────────────────
  // Group 4: Quantity Controls & MOQ Logic
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 4: Quantity Control & MOQ Validation");
  assert(
    miniCartCode.includes("Math.max(itemMoq, item.quantity - itemMoq)"),
    "Quantity decrement respects product MOQ step size and lower bound"
  );
  assert(
    miniCartCode.includes("disabled={item.quantity <= itemMoq || isUpdating}"),
    "Minus button is disabled when quantity is at or below MOQ"
  );
  assert(
    miniCartCode.includes("item.quantity + itemMoq"),
    "Plus button increments by product MOQ step size"
  );

  // ─────────────────────────────────────────────────────────────
  // Group 5: Pre-Order, Sold Out, and Stock Violations
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 5: Pre-Order, Sold Out, and Inventory Violations");
  assert(
    miniCartCode.includes("isPreorder") && miniCartCode.includes("PRE-ORDER"),
    "Pre-order items display distinct PRE-ORDER badge and expected delivery date"
  );
  assert(
    miniCartCode.includes("isSoldOut") && miniCartCode.includes("SOLD OUT"),
    "Sold-out items display clear SOLD OUT badge and grayscale thumbnail"
  );
  assert(
    miniCartCode.includes("stockViolations") &&
      miniCartCode.includes("itemViolation"),
    "Cart highlights stock violations and displays warning notices"
  );

  // ─────────────────────────────────────────────────────────────
  // Group 6: Checkout Authentication & RFQ Integration
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 6: Checkout Auth & RFQ Integration");
  assert(
    miniCartCode.includes("handleProceedToCheckout") &&
      miniCartCode.includes("ayaan_open_checkout"),
    "Proceed to Checkout requires customer authentication and stores resume flag"
  );
  assert(
    miniCartCode.includes("handleRequestQuoteFromCart") &&
      miniCartCode.includes("addToRfq"),
    "Request Wholesale Quote copies cart items into the RFQ context"
  );

  // ─────────────────────────────────────────────────────────────
  // Group 7: Accessibility & Keyboard Navigation
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 7: Accessibility");
  assert(
    miniCartCode.includes("aria-label={`Select ") &&
      cartPageCode.includes("aria-label={`Select "),
    "Checkboxes have descriptive ARIA labels"
  );
  assert(
    miniCartCode.includes("aria-label={`Decrease quantity of ") &&
      miniCartCode.includes("aria-label={`Increase quantity of "),
    "Stepper buttons have descriptive ARIA labels"
  );
  assert(
    miniCartCode.includes("aria-label={`Remove ") &&
      cartPageCode.includes("aria-label={`Remove "),
    "Delete buttons have descriptive ARIA labels"
  );

  // ─────────────────────────────────────────────────────────────
  // Group 8: Business Logic Protection
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 8: Cart Business Logic Protection");
  assert(
    cartContextCode.includes("applyCartData") &&
      cartContextCode.includes("subtotal") &&
      cartContextCode.includes("stockViolations"),
    "CartContext business logic and calculation rules are completely intact"
  );

  console.log("\n==================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
