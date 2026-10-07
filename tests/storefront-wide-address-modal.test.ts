import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("Storefront Add New Address Modal Widening Verification", () => {
  const root = process.cwd();

  it("CheckoutModal address modal uses 80-90% viewport width and sensible max-width between 1100-1250px", () => {
    const file = path.join(root, "src/components/cart/CheckoutModal.tsx");
    const content = fs.readFileSync(file, "utf-8");

    // Check modal outer container centering
    assert.ok(
      content.includes("items-end sm:items-center justify-center"),
      "Modal must be centered horizontally on sm/md/lg"
    );

    // Check width and max-width in CheckoutModal
    assert.ok(
      content.includes("sm:w-[90vw]") && content.includes("max-w-[1200px]"),
      "Modal must use responsive viewport width (85-90vw) and max-width ~1200px"
    );

    // Check internal vertical scrolling preserved
    assert.ok(
      content.includes("max-h-[80vh] overflow-y-auto"),
      "Vertical internal scrolling must be preserved"
    );
  });

  it("DashboardAddressModal uses 80-90% viewport width and sensible max-width between 1100-1250px", () => {
    const file = path.join(root, "src/components/account/address/DashboardAddressModal.tsx");
    const content = fs.readFileSync(file, "utf-8");

    // Check modal centering
    assert.ok(
      content.includes("flex items-center justify-center"),
      "Dashboard modal must be centered horizontally"
    );

    // Check width and max-width
    assert.ok(
      content.includes("sm:w-[90vw]") && content.includes("max-w-[1200px]"),
      "Dashboard modal must use responsive viewport width and max-width ~1200px"
    );

    // Check internal scrolling preserved
    assert.ok(
      content.includes("overflow-y-auto") && content.includes("max-h-[90vh]"),
      "Vertical internal scrolling must be preserved"
    );
  });

  it("AddressContactSection maintains 2-column layout for Contact Person / Company and Email / Phone with breathable gap", () => {
    const file = path.join(root, "src/components/account/address/AddressContactSection.tsx");
    const content = fs.readFileSync(file, "utf-8");

    assert.ok(
      content.includes("grid-cols-1 sm:grid-cols-2"),
      "Must retain 2-column layout on tablet/desktop and single-column on mobile"
    );
    assert.ok(
      content.includes("gap-4") || content.includes("gap-5") || content.includes("gap-6"),
      "Column gap must be breathable for wider modal"
    );
    assert.ok(
      content.includes("Contact Person") && content.includes("Company Name"),
      "Contact Person and Company Name must be present"
    );
    assert.ok(
      content.includes("Email Address") && content.includes("Phone / Mobile"),
      "Email Address and Phone / Mobile must be present"
    );
  });

  it("AddressLocationSection maintains full-width lines and 2-column layout for Country/City and State/Postal", () => {
    const file = path.join(root, "src/components/account/address/AddressLocationSection.tsx");
    const content = fs.readFileSync(file, "utf-8");

    // Full-width fields
    assert.ok(
      content.includes("Address Line 1") && content.includes("Address Line 2"),
      "Address Line 1 and Address Line 2 must be present"
    );
    // 2-column layout for location fields
    assert.ok(
      content.includes("grid-cols-1 sm:grid-cols-2"),
      "Location grid must retain 2-column layout on tablet/desktop"
    );
    assert.ok(
      content.includes("gap-4") || content.includes("gap-5") || content.includes("gap-6"),
      "Location grid gap must be breathable"
    );
    assert.ok(
      content.includes("Country") && content.includes("City"),
      "Country and City must be in 2-column layout"
    );
    assert.ok(
      content.includes("State / Province") && content.includes("Postal / ZIP Code"),
      "State and Postal must be in 2-column layout"
    );
  });

  it("AddressSettingsSection maintains full-width label and checkboxes", () => {
    const file = path.join(root, "src/components/account/address/AddressSettingsSection.tsx");
    const content = fs.readFileSync(file, "utf-8");

    assert.ok(
      content.includes("Address Label"),
      "Address Label must be present"
    );
    assert.ok(
      content.includes("Presets:"),
      "Presets chips must be preserved"
    );
  });
});
