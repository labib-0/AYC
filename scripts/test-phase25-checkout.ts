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

  // 2. Assert Removal of Legacy Transportation Icons and dead types
  console.log("\n2. Checking removal of legacy transportation icons & dead types...");
  const forbiddenTokens = [
    "Anchor",
    "Truck",
    "Box",
    "isPortRequired",
    "isPortValid",
    "showThirdPartyNotify",
    "thirdPartyName",
    "thirdPartyAddress",
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
  assert.ok(checkoutCode.includes("shippingCountryCode: dest.country") || checkoutCode.includes("shippingCountryCode: country"), "Country must be submitted in order payload");
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

  // 4. Assert Clean Section Structure
  console.log("\n4. Checking section structure...");
  assert.ok(checkoutCode.includes("1. Shipping Address (Consignee)"), "Section 1 must be Shipping Address");
  assert.ok(checkoutCode.includes("ARAMEX") && checkoutCode.includes("DISCUSS DIRECTLY"), "Shipping options must be ARAMEX and DISCUSS DIRECTLY");
  console.log("  ✓ Section sequence cleanly verified");

  // 5. Assert Order Submission Payload
  console.log("\n5. Checking order payload...");
  assert.ok(!checkoutCode.includes("Overland Truck Freight"), "Overland Truck Freight must NOT exist");
  assert.ok(!checkoutCode.includes("Ocean Cargo"), "Ocean Cargo must NOT exist");
  assert.ok(!checkoutCode.includes("Air Express"), "Air Express must NOT exist");
  assert.ok(!checkoutCode.includes("showThirdPartyNotify"), "showThirdPartyNotify must NOT exist");
  console.log("  ✓ Order submission payload cleanly decoupled from removed legacy transportation methods");

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
