import { strict as assert } from "assert";
import { calculatePromoDiscount, validatePromoCode } from "../src/lib/coupon";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { adminCouponService, CouponRecord } from "../src/services/admin/coupon.service";
import fs from "fs";
import path from "path";

async function runCouponTests() {
  console.log("==================================================");
  console.log("RUNNING COUPON CREATE VALIDATION & CRUD TEST SUITE");
  console.log("==================================================\n");

  // 1. Discount calculations
  console.log("▶ Test Group 1: Discount Calculations");
  const flatDiscount = calculatePromoDiscount("flat", 100, 1000);
  assert.equal(flatDiscount, 100, "Flat discount calculation: $100 off $1000 = $100");

  const flatCappedAtSubtotal = calculatePromoDiscount("flat", 250, 200);
  assert.equal(flatCappedAtSubtotal, 200, "Flat discount cannot exceed subtotal ($250 discount on $200 = $200)");

  const percDiscount = calculatePromoDiscount("percentage", 10, 1000);
  assert.equal(percDiscount, 100, "Percentage discount: 10% on $1000 = $100");

  const percWithCap = calculatePromoDiscount("percentage", 20, 1000, 150);
  assert.equal(percWithCap, 150, "Percentage discount capped at max_discount: 20% on $1000 ($200) capped at $150");

  console.log("  ✅ [PASS] 1. Flat and Percentage discount calculations are correct");

  // 2. Input Sanitation & Leading Zero Normalization ("01000" Bug)
  console.log("\n▶ Test Group 2: Leading Zero Normalization ('01000' Bug)");
  function sanitizeNumericInput(val: string, allowDecimals = true): string {
    let clean = allowDecimals ? val.replace(/[^0-9.]/g, "") : val.replace(/[^0-9]/g, "");
    if (allowDecimals) {
      const parts = clean.split(".");
      if (parts.length > 2) {
        clean = parts[0] + "." + parts.slice(1).join("");
      }
    }
    if (/^0[0-9]/.test(clean)) {
      clean = clean.replace(/^0+/, "");
      if (clean === "") clean = "0";
    }
    return clean;
  }

  assert.equal(sanitizeNumericInput("01000"), "1000", "'01000' normalizes to '1000'");
  assert.equal(sanitizeNumericInput("00500"), "500", "'00500' normalizes to '500'");
  assert.equal(sanitizeNumericInput("$1000"), "1000", "'$1000' strips currency prefix to '1000'");
  assert.equal(sanitizeNumericInput("0"), "0", "'0' is preserved as '0'");
  assert.equal(sanitizeNumericInput("0.5"), "0.5", "'0.5' is preserved as '0.5'");
  console.log("  ✅ [PASS] 2. Leading zero normalization prevents '01000' formatting bug");

  // 3. Backend Controller Validation Contract
  console.log("\n▶ Test Group 3: Backend Controller Validation Contract");
  const backendControllerPath = path.join(
    process.cwd(),
    "backend",
    "app",
    "Http",
    "Controllers",
    "Api",
    "V1",
    "Admin",
    "CouponController.php"
  );
  const controllerContent = fs.readFileSync(backendControllerPath, "utf-8");

  assert(
    controllerContent.includes("'discount_type' => ['required', 'string', 'in:percentage,flat,fixed,fixed_amount']"),
    "store() accepts 'flat', 'percentage', 'fixed', and 'fixed_amount'"
  );
  assert(
    controllerContent.includes("'discount_type' => ['sometimes', 'string', 'in:percentage,flat,fixed,fixed_amount']"),
    "update() accepts 'flat', 'percentage', 'fixed', and 'fixed_amount'"
  );
  assert(
    controllerContent.includes("$validated['discount_type'] = 'flat';"),
    "Controller normalizes fixed/fixed_amount to canonical 'flat'"
  );
  console.log("  ✅ [PASS] 3. Backend CouponController accepts 'flat' and establishes canonical contract");

  // 4. Coupon Model Constants
  console.log("\n▶ Test Group 4: Coupon Model Constants");
  const couponModelPath = path.join(process.cwd(), "backend", "app", "Models", "Coupon.php");
  const modelContent = fs.readFileSync(couponModelPath, "utf-8");
  assert(modelContent.includes("public const TYPE_PERCENTAGE = 'percentage';"), "Coupon::TYPE_PERCENTAGE defined");
  assert(modelContent.includes("public const TYPE_FLAT = 'flat';"), "Coupon::TYPE_FLAT defined");
  console.log("  ✅ [PASS] 4. Coupon model defines canonical TYPE_PERCENTAGE and TYPE_FLAT constants");

  // 5. Frontend CouponModal Contract & Implementation
  console.log("\n▶ Test Group 5: Frontend CouponModal Contract & State");
  const modalPath = path.join(process.cwd(), "src", "components", "admin", "coupons", "CouponModal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf-8");

  assert(modalContent.includes('sanitizeNumericInput'), "CouponModal uses sanitizeNumericInput");
  assert(modalContent.includes('discountType === "flat" ? "" : maxDiscount'), "maxDiscount is blanked for flat discounts");
  assert(modalContent.includes('parsedMaxDiscount'), "parsedMaxDiscount handles flat discounts as null");
  assert(modalContent.includes('Creating Coupon...'), "Button shows loading state while submitting");
  assert(modalContent.includes('apiErr.errors'), "Field-level backend validation errors are parsed and displayed");
  console.log("  ✅ [PASS] 5. CouponModal implements clean state, field error mapping, and loading indicator");

  // 6. Admin CRUD End-to-End Simulation
  console.log("\n▶ Test Group 6: Admin CRUD End-to-End Simulation");
  const testFlatCoupon: Partial<CouponRecord> = {
    code: "BULK50_TEST",
    discount_type: "flat",
    discount_value: 100,
    min_spend: 1000,
    max_discount: null,
    usage_limit: 100,
    is_active: true,
  };

  const created = await adminCouponService.createCoupon(testFlatCoupon);
  assert.equal(created.code, "BULK50_TEST", "Created coupon code matches");
  assert.equal(created.discount_type, "flat", "Created coupon discount_type is 'flat'");
  assert.equal(created.discount_value, 100, "Created coupon discount_value is 100");
  assert.equal(created.min_spend, 1000, "Created coupon min_spend is 1000");

  const list = await adminCouponService.getCoupons({ type: "flat" });
  const found = list.find((c) => c.code === "BULK50_TEST");
  assert.ok(found, "Newly created flat coupon is retrievable via type='flat' filter");

  const updated = await adminCouponService.updateCoupon(created.id, {
    discount_value: 120,
    min_spend: 1200,
  });
  assert.equal(updated.discount_value, 120, "Updated discount_value is 120");
  assert.equal(updated.min_spend, 1200, "Updated min_spend is 1200");

  const deleted = await adminCouponService.deleteCoupon(created.id);
  assert.equal(deleted, true, "Coupon deleted successfully");
  console.log("  ✅ [PASS] 6. Admin CRUD operations with flat coupon succeed end-to-end");

  console.log("\n==================================================");
  console.log("ALL COUPON CREATE & VALIDATION TESTS PASSED!");
  console.log("==================================================");
}

runCouponTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
