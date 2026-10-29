import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ApiError } from "../src/services/api-client";
import { orderService } from "../src/services/order.service";
import { createRfq, rfqService } from "../src/services/rfq.service";

describe("AYC Prompt 3 — RFQ Submission, Anti-Bot False Positives, Error UX & Modal Dismissal Recovery", () => {
  const rootDir = path.resolve(__dirname, "..");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Issue #10 & #13: Honeypot Autofill Protection (HoneypotField.tsx)
  // ───────────────────────────────────────────────────────────────────────────
  describe("HoneypotField Component Hardening", () => {
    const honeypotPath = path.join(rootDir, "src/components/common/HoneypotField.tsx");
    const honeypotContent = fs.readFileSync(honeypotPath, "utf-8");

    it("does NOT use autoComplete='new-password' to prevent password managers from autofilling", () => {
      assert.ok(
        !honeypotContent.includes('autoComplete="new-password"'),
        "HoneypotField must NOT use autoComplete='new-password'"
      );
    });

    it("uses autoComplete='off' with vendor-specific password manager ignore attributes", () => {
      assert.ok(
        honeypotContent.includes('autoComplete="off"'),
        "HoneypotField must specify autoComplete='off'"
      );
      assert.ok(
        honeypotContent.includes('data-1p-ignore="true"'),
        "Must specify 1Password ignore attribute"
      );
      assert.ok(
        honeypotContent.includes('data-lpignore="true"'),
        "Must specify LastPass ignore attribute"
      );
      assert.ok(
        honeypotContent.includes('data-bwignore="true"'),
        "Must specify Bitwarden ignore attribute"
      );
      assert.ok(
        honeypotContent.includes('data-protonpass-ignore="true"'),
        "Must specify Proton Pass ignore attribute"
      );
      assert.ok(
        honeypotContent.includes('data-autocomplete="off"'),
        "Must specify data-autocomplete='off'"
      );
      assert.ok(
        honeypotContent.includes('data-private="true"'),
        "Must specify data-private='true'"
      );
    });

    it("maintains strict concealment and accessibility safeguards", () => {
      assert.ok(
        honeypotContent.includes("tabIndex={-1}"),
        "Honeypot must be excluded from keyboard tab navigation"
      );
      assert.ok(
        honeypotContent.includes('aria-hidden="true"'),
        "Honeypot must be aria-hidden"
      );
      assert.ok(
        honeypotContent.includes("left: -9999px") || honeypotContent.includes('left: "-9999px"'),
        "Honeypot must be positioned far off-screen"
      );
      assert.ok(
        honeypotContent.includes("pointerEvents: 'none'") ||
          honeypotContent.includes('pointerEvents: "none"'),
        "Honeypot must disallow pointer events"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Anti-Bot Security Trap Contract (Backend & Client Services)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Anti-Bot Security Trap Contract", () => {
    const backendProtectionPath = path.join(
      rootDir,
      "backend/app/Services/Security/NativeBotProtectionService.php"
    );
    const backendProtectionContent = fs.readFileSync(backendProtectionPath, "utf-8");

    it("preserves backend honeypot rejection in NativeBotProtectionService.php", () => {
      assert.ok(
        backendProtectionContent.includes("!empty($honeypot)"),
        "Backend must check !empty($honeypot)"
      );
      assert.ok(
        backendProtectionContent.includes("Automated form submission detected."),
        "Backend must reject with 422 'Automated form submission detected.'"
      );
    });

    it("orderService rejects populated honeypots with ApiError(422)", async () => {
      try {
        await orderService.createOrder({
          email: "customer@example.com",
          shippingName: "Test Consignee",
          shippingAddress: "123 Business St",
          shippingCity: "New York",
          shippingPostalCode: "10001",
          shippingCountryCode: "US",
          shippingCost: 0,
          items: [{ productId: "1", productName: "Test Item", quantity: 50, unitPrice: 10 }],
          website_url_hp: "bot-injected-value",
        });
        assert.fail("orderService should have thrown ApiError for populated honeypot");
      } catch (err: any) {
        assert.ok(
          err instanceof ApiError || err?.message?.includes("Automated form submission detected"),
          `Expected ApiError with bot detection message, got: ${err?.message}`
        );
        assert.equal(err?.status, 422);
        assert.ok(err?.message?.includes("Automated form submission detected"));
      }
    });

    it("createRfq rejects populated honeypots with ApiError(422)", async () => {
      try {
        await createRfq({
          contact_name: "Test Contact",
          buyerName: "Test Contact",
          email: "customer@example.com",
          buyerEmail: "customer@example.com",
          phone: "+1 555-0199",
          company_name: "Test Corp",
          companyName: "Test Corp",
          product_name: "Test Garment",
          target_quantity: 100,
          targetQuantity: 100,
          target_price: 15,
          targetUnitPrice: 15,
          currency: "USD",
          country: "United States",
          destination_country: "United States",
          destinationCountry: "United States",
          destinationCity: "New York",
          notes: "Sample RFQ note",
          website_url_hp: "bot-injected-value",
        } as any);
        assert.fail("createRfq should have thrown ApiError for populated honeypot");
      } catch (err: any) {
        assert.ok(
          err instanceof ApiError || err?.message?.includes("Automated form submission detected"),
          `Expected ApiError with bot detection message, got: ${err?.message}`
        );
        assert.equal(err?.status, 422);
        assert.ok(err?.message?.includes("Automated form submission detected"));
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. User-Friendly Error UX Mapping (Issue #10 & Issue #13)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Human-Friendly Error UX Mapping", () => {
    const rfqPagePath = path.join(rootDir, "src/app/rfq/page.tsx");
    const rfqPageContent = fs.readFileSync(rfqPagePath, "utf-8");

    const checkoutModalPath = path.join(rootDir, "src/components/cart/CheckoutModal.tsx");
    const checkoutModalContent = fs.readFileSync(checkoutModalPath, "utf-8");

    it("maps bot detection errors on RFQ page to actionable customer guidance", () => {
      assert.ok(
        rfqPageContent.includes('rawError.includes("Automated form submission detected")'),
        "RFQ page must detect bot error message"
      );
      assert.ok(
        rfqPageContent.includes(
          "Your quotation request could not be verified. Please ensure browser autofill is not modifying security fields, or refresh the page and try again."
        ),
        "RFQ page must provide helpful customer guidance"
      );
    });

    it("maps bot detection errors on Checkout modal to actionable customer guidance", () => {
      assert.ok(
        checkoutModalContent.includes('rawErr.includes("Automated form submission detected")'),
        "Checkout modal must detect bot error message"
      );
      assert.ok(
        checkoutModalContent.includes(
          "Your order submission could not be verified. Please ensure browser autofill is not modifying security fields, or refresh the page and try again."
        ),
        "Checkout modal must provide helpful customer guidance"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Issue #14: Confirm Commercial Order Modal Dismissal Architecture
  // ───────────────────────────────────────────────────────────────────────────
  describe("Modal Dismissal & Backdrop Architecture (CheckoutModal.tsx)", () => {
    const checkoutModalPath = path.join(rootDir, "src/components/cart/CheckoutModal.tsx");
    const checkoutModalContent = fs.readFileSync(checkoutModalPath, "utf-8");

    it("includes an explicit backdrop layer with test ID and click handler for Main Checkout Form", () => {
      assert.ok(
        checkoutModalContent.includes('data-testid="checkout-modal-backdrop"'),
        "Must have data-testid='checkout-modal-backdrop'"
      );
      assert.ok(
        checkoutModalContent.includes('data-testid="checkout-modal-overlay"'),
        "Must have data-testid='checkout-modal-overlay'"
      );
      assert.ok(
        checkoutModalContent.includes("onClick={() => {\n          if (!loading && !isSubmittingRef.current) {\n            onClose();\n          }\n        }}"),
        "Backdrop click must trigger onClose() when not submitting"
      );
    });

    it("stops click propagation on the modal form dialog to prevent inner clicks from dismissing", () => {
      assert.ok(
        checkoutModalContent.includes('id="checkout-order-form"') &&
          checkoutModalContent.includes("onClick={(e) => e.stopPropagation()}"),
        "Modal dialog form must call e.stopPropagation() on click"
      );
    });

    it("provides explicit backdrop dismissal on Order Placed and Address Form sheets", () => {
      assert.ok(
        checkoutModalContent.includes('data-testid="order-placed-backdrop"'),
        "Must have data-testid='order-placed-backdrop'"
      );
      assert.ok(
        checkoutModalContent.includes('data-testid="address-sheet-backdrop"'),
        "Must have data-testid='address-sheet-backdrop'"
      );
    });
  });
});
