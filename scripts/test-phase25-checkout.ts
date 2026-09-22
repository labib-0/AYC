import fs from "fs";
import path from "path";
import assert from "assert";

function runPhase25Tests() {
  console.log("=== PHASE 25 STATIC VALIDATION: REMOVE TRANSPORTATION METHOD FROM CUSTOMER CHECKOUT ===");

  const checkoutPath = path.resolve(process.cwd(), "src/components/cart/CheckoutModal.tsx");
  assert.ok(fs.existsSync(checkoutPath), "CheckoutModal.tsx must exist");

  const checkoutCode = fs.readFileSync(checkoutPath, "utf-8");

  // 1. Assert Removal of UI text & headers
  console.log("\n1. Checking removal of Transportation Method UI...");
  const forbiddenPhrases = [
    "Shipping Service & Transportation Method",
    "SHIPPING SERVICE & TRANSPORTATION METHOD",
    "Transportation Method *",
    "Air Express",
    "Ocean Cargo",
    "Overland Truck",
    "Priority Air (3-5 days)",
    "Priority Air (3–5 days)",
    "LCL / FCL Container",
    "Cross-Border Road",
    "Service Type (Delivery Scope)",
    "Door to Door",
    "Door to Port",
    "Port to Door",
    "Port to Port",
    "Destination Port / Terminal Code",
  ];

  for (const phrase of forbiddenPhrases) {
    const found = checkoutCode.includes(phrase);
    assert.strictEqual(found, false, `Forbidden UI text "${phrase}" must NOT exist in customer checkout`);
    console.log(`  ✓ Forbidden text "${phrase}" absent`);
  }

  // 2. Assert Removal of Transportation Icons and dead types
  console.log("\n2. Checking removal of transportation icons & dead types...");
  const forbiddenTokens = [
    "Plane",
    "Anchor",
    "Truck",
    "Box",
    "TransportMethod",
    "ShippingMode",
    "ServiceType",
    "ShippingQuoteOption",
    "ShipmentSpecs",
    "shippingService",
    "isPortRequired",
    "isPortValid",
    "fetchAramexQuote",
    "aramexQuote",
    "aramexLoading",
    "aramexError",
    "shipmentSpecs",
  ];

  for (const token of forbiddenTokens) {
    // Regex for whole word match
    const regex = new RegExp(`\\b${token}\\b`, "g");
    const matches = checkoutCode.match(regex);
    assert.strictEqual(
      matches,
      null,
      `Forbidden token "${token}" must NOT exist in CheckoutModal.tsx`
    );
    console.log(`  ✓ Forbidden token "${token}" absent`);
  }

  // 3. Assert Preservation of Destination Country & Required Consignee Data
  console.log("\n3. Checking preservation of Destination Country and consignee data...");
  assert.ok(checkoutCode.includes("shippingCountryCode: country"), "Country must be submitted in order payload");
  assert.ok(checkoutCode.includes("country, setCountry"), "Destination Country state must exist");
  assert.ok(checkoutCode.includes("isCountryValid"), "isCountryValid validation must exist");
  assert.ok(checkoutCode.includes("isNameValid"), "isNameValid validation must exist");
  assert.ok(checkoutCode.includes("isCompanyValid"), "isCompanyValid validation must exist");
  assert.ok(checkoutCode.includes("isEmailValid"), "isEmailValid validation must exist");
  assert.ok(checkoutCode.includes("isPhoneValid"), "isPhoneValid validation must exist");
  assert.ok(checkoutCode.includes("isCityValid"), "isCityValid validation must exist");
  assert.ok(checkoutCode.includes("isAddressValid"), "isAddressValid validation must exist");
  assert.ok(checkoutCode.includes("savedAddresses"), "savedAddresses must exist");
  assert.ok(checkoutCode.includes("handleSelectAddress"), "handleSelectAddress must exist");
  console.log("  ✓ Destination Country and all contact/consignee fields preserved and validated");

  // 4. Assert Clean Section Numbering (1 -> 2 -> 3)
  console.log("\n4. Checking section renumbering...");
  assert.ok(checkoutCode.includes("1. Shipping Address (Consignee)"), "Section 1 must be Shipping Address");
  assert.ok(checkoutCode.includes("2. Special Instructions &amp; Remarks (Optional)"), "Section 2 must be Special Instructions");
  assert.ok(checkoutCode.includes("3. Order Review &amp; Financial Summary"), "Section 3 must be Order Review");
  assert.strictEqual(checkoutCode.includes("4. FINANCIAL SUMMARY"), false, "Orphaned Section 4 must NOT exist");
  assert.strictEqual(checkoutCode.includes("5. FINAL CTA"), false, "Orphaned Section 5 must NOT exist");
  console.log("  ✓ Section sequence cleanly renumbered to 1, 2, 3");

  // 5. Assert Order Submission Payload
  console.log("\n5. Checking order payload...");
  assert.ok(checkoutCode.includes('shippingMethod: "To be arranged"'), "shippingMethod must be 'To be arranged'");
  assert.ok(checkoutCode.includes('carrier: "Export Desk Logistics"'), "carrier must be 'Export Desk Logistics'");
  assert.ok(checkoutCode.includes("shippingCost: 0"), "shippingCost must be 0");
  assert.ok(!checkoutCode.includes("transportMethod:"), "transportMethod must NOT be submitted from frontend");
  assert.ok(!checkoutCode.includes("destinationPort:"), "destinationPort must NOT be submitted from frontend");
  console.log("  ✓ Order submission payload cleanly decoupled from customer transportation method");

  // 6. Assert Submit Button validation dependencies
  console.log("\n6. Checking submit button state...");
  assert.ok(checkoutCode.includes("disabled={loading}"), "Submit button must only be disabled by loading");
  assert.ok(!checkoutCode.includes("!aramexQuote"), "Submit button must not wait for shipping quote");
  console.log("  ✓ Submit button does not block on removed transportation method");

  // 7. Verify Admin shipping untouched
  console.log("\n7. Checking admin shipping integrity...");
  const adminShippingServicePath = path.resolve(process.cwd(), "src/services/shipping.service.ts");
  assert.ok(fs.existsSync(adminShippingServicePath), "Admin shipping service must exist");
  const adminShippingCode = fs.readFileSync(adminShippingServicePath, "utf-8");
  assert.ok(adminShippingCode.includes("getShippingQuotes"), "getShippingQuotes must remain in service for Admin");
  console.log("  ✓ Admin shipping services are completely untouched");

  console.log("\n=======================================================");
  console.log("ALL PHASE 25 STATIC VALIDATION TESTS PASSED CLEANLY!");
  console.log("=======================================================");
}

runPhase25Tests();
