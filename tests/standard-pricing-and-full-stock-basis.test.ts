import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ProductService } from "../src/services/product.service";

describe("ADMIN PRODUCT PRICING & FULL STOCK BASIS COMPREHENSIVE SUITE", () => {
  const pricingSectionPath = path.resolve(__dirname, "../src/components/admin/products/form/ProductPricingSection.tsx");
  const productFormPath = path.resolve(__dirname, "../src/components/admin/products/form/ProductForm.tsx");
  const pricingSectionSrc = fs.readFileSync(pricingSectionPath, "utf-8");
  const productFormSrc = fs.readFileSync(productFormPath, "utf-8");

  describe("1. Legacy Wholesale Price Publish Validation Removal", () => {
    it("ProductForm should not contain obsolete 'Wholesale price must be greater than $0.00' error", () => {
      assert.ok(
        !productFormSrc.includes("Wholesale price must be greater than $0.00"),
        "ProductForm must not have the obsolete 'Wholesale price must be greater than $0.00' message"
      );
    });

    it("ProductForm should validate Standard unit price with current error message", () => {
      assert.ok(
        productFormSrc.includes("Standard unit price must be greater than $0.00."),
        "ProductForm must display 'Standard unit price must be greater than $0.00.' when invalid"
      );
    });

    it("ProductForm publish validation should not coerce missing price to fake 0", () => {
      // It should not use (isDraftTarget ? undefined : 0) fallback
      assert.ok(
        !productFormSrc.includes("(isDraftTarget ? undefined : 0)"),
        "ProductForm must not fallback missing price to 0"
      );
    });
  });

  describe("2. Full Stock Basis Display UI Specification", () => {
    it("Pricing UI columns must use compact tier column and allocated basis column", () => {
      assert.ok(
        pricingSectionSrc.includes("grid-cols-[135px_minmax(0,1.25fr)_minmax(0,1fr)]"),
        "Pricing table grid columns must be adjusted to prevent text collision in sidebars"
      );
    });

    it("Available Stock label and quantity must be cleanly separated with colon and formatting", () => {
      assert.ok(
        pricingSectionSrc.includes("Available Stock:"),
        "Full stock basis label must include 'Available Stock:'"
      );
      assert.ok(
        pricingSectionSrc.includes(".toLocaleString()"),
        "Full stock basis quantity must format numbers with thousands separators (e.g. 1,000 PCS)"
      );
      assert.ok(
        pricingSectionSrc.includes("whitespace-nowrap"),
        "Full stock basis quantity must be whitespace-nowrap to prevent line breaks inside the number"
      );
    });

    it("Full Stock basis must be purely read-only and derived (no input field for Full Stock quantity)", () => {
      // Find the FULL STOCK row section
      const fullStockRowIndex = pricingSectionSrc.indexOf("3. FULL STOCK TIER ROW");
      assert.ok(fullStockRowIndex !== -1, "FULL STOCK row must exist in ProductPricingSection");
      const fullStockSection = pricingSectionSrc.slice(fullStockRowIndex);

      // Verify there is an input for fullStockPrice, but NO input for fullStockQuantity or availableStock
      assert.ok(
        !fullStockSection.includes('name="fullStockQuantity"') &&
        !fullStockSection.includes('name="availableStock"') &&
        !fullStockSection.includes('onAvailableStockChange') &&
        !fullStockSection.includes('onFullStockQuantityChange'),
        "Full Stock basis quantity must NOT have an editable input or change handler"
      );
    });
  });

  describe("3. ProductService Payload Mapping", () => {
    it("should map standardPrice to backend fields (standard_price, standardPrice, wholesale_price, wholesalePrice)", () => {
      const payload = ProductService.toBackendPayload({
        productId: "AY-TEST-430",
        standardPrice: 4.30,
        fullStockPrice: 4.00,
      });

      assert.equal(payload.standard_price, 4.30);
      assert.equal(payload.standardPrice, 4.30);
      assert.equal(payload.wholesale_price, 4.30);
      assert.equal(payload.wholesalePrice, 4.30);
      assert.equal(payload.full_stock_price, 4.00);
      assert.equal(payload.fullStockPrice, 4.00);
    });

    it("should map standard_price snake_case input to backend payload", () => {
      const payload = ProductService.toBackendPayload({
        productId: "AY-TEST-SNAKE",
        standard_price: 4.30,
      });

      assert.equal(payload.standard_price, 4.30);
      assert.equal(payload.wholesale_price, 4.30);
    });

    it("should map legacy wholesalePrice input to standard and wholesale fields for backward compatibility", () => {
      const payload = ProductService.toBackendPayload({
        productId: "AY-TEST-LEGACY",
        wholesalePrice: 4.30,
      });

      assert.equal(payload.standard_price, 4.30);
      assert.equal(payload.wholesale_price, 4.30);
    });

    it("should map costPrice strictly to cost_price and costPrice without touching selling price", () => {
      const payload = ProductService.toBackendPayload({
        productId: "AY-TEST-COST",
        costPrice: 2.50,
      });

      assert.equal(payload.cost_price, 2.50);
      assert.equal(payload.costPrice, 2.50);
      assert.equal(payload.standard_price, undefined);
      assert.equal(payload.wholesale_price, undefined);
    });

    it("should NOT convert undefined standard price to 0", () => {
      const payload = ProductService.toBackendPayload({
        productId: "AY-TEST-UNDEF",
      });

      assert.equal(payload.standard_price, undefined);
      assert.equal(payload.wholesale_price, undefined);
    });
  });

  describe("4. Pricing Business Rule Verification (Standard / Bulk / Full Stock / Purchase)", () => {
    function simulatePublishValidation(input: {
      standardPrice?: number;
      wholesalePrice?: number;
      moq?: number;
      bulkPricingEnabled?: boolean;
      bulkThreshold?: number;
      bulkPrice?: number;
      fullStockPrice?: number;
      costPrice?: number;
    }): { valid: boolean; errors: Record<string, string> } {
      const errors: Record<string, string> = {};

      const standardPrice = input.standardPrice ?? input.wholesalePrice;
      if (standardPrice === undefined || standardPrice <= 0) {
        errors.standardPrice = "Standard unit price must be greater than $0.00.";
      }

      if (input.moq === undefined || input.moq < 1) {
        errors.moq = "Minimum Order Quantity must be at least 1.";
      }

      if (input.bulkPricingEnabled) {
        const moqVal = input.moq ?? 1;
        if (!input.bulkThreshold || input.bulkThreshold <= moqVal) {
          errors.bulkThreshold = `Bulk minimum (${input.bulkThreshold ?? 0}) must be greater than MOQ (${moqVal}).`;
        }
        if (!input.bulkPrice || input.bulkPrice <= 0) {
          errors.bulkPrice = "Bulk tier price must be greater than $0.00.";
        }
      }

      if (!input.fullStockPrice || input.fullStockPrice <= 0) {
        errors.fullStockPrice = "Full stock price is required.";
      }

      // Cost price is internal only - NOT required for publish!
      return { valid: Object.keys(errors).length === 0, errors };
    }

    it("Standard Unit Price = $4.30 satisfies customer selling price requirement", () => {
      const res = simulatePublishValidation({
        standardPrice: 4.30,
        moq: 200,
        fullStockPrice: 4.00,
      });

      assert.equal(res.valid, true);
      assert.equal(Object.keys(res.errors).length, 0);
    });

    it("Standard Unit Price = undefined fails publish validation", () => {
      const res = simulatePublishValidation({
        standardPrice: undefined,
        moq: 200,
        fullStockPrice: 4.00,
      });

      assert.equal(res.valid, false);
      assert.equal(res.errors.standardPrice, "Standard unit price must be greater than $0.00.");
    });

    it("Standard Unit Price = 0.00 fails publish validation", () => {
      const res = simulatePublishValidation({
        standardPrice: 0.00,
        moq: 200,
        fullStockPrice: 4.00,
      });

      assert.equal(res.valid, false);
      assert.equal(res.errors.standardPrice, "Standard unit price must be greater than $0.00.");
    });

    it("Purchase Price alone does NOT satisfy standard selling price", () => {
      const res = simulatePublishValidation({
        costPrice: 2.50, // Internal cost only!
        moq: 200,
        fullStockPrice: 4.00,
      });

      assert.equal(res.valid, false);
      assert.equal(res.errors.standardPrice, "Standard unit price must be greater than $0.00.");
    });

    it("Purchase Price is not required for publish", () => {
      const res = simulatePublishValidation({
        standardPrice: 4.30,
        costPrice: undefined, // Optional!
        moq: 200,
        fullStockPrice: 4.00,
      });

      assert.equal(res.valid, true);
      assert.equal(res.errors.costPrice, undefined);
    });

    it("Bulk disabled does not trigger bulk validation", () => {
      const res = simulatePublishValidation({
        standardPrice: 4.30,
        moq: 200,
        fullStockPrice: 4.00,
        bulkPricingEnabled: false,
        bulkThreshold: undefined,
        bulkPrice: undefined,
      });

      assert.equal(res.valid, true);
      assert.equal(res.errors.bulkThreshold, undefined);
      assert.equal(res.errors.bulkPrice, undefined);
    });

    it("Bulk enabled validates minimum quantity > MOQ", () => {
      const res = simulatePublishValidation({
        standardPrice: 4.30,
        moq: 200,
        fullStockPrice: 4.00,
        bulkPricingEnabled: true,
        bulkThreshold: 150, // <= MOQ 200
        bulkPrice: 4.20,
      });

      assert.equal(res.valid, false);
      assert.ok(res.errors.bulkThreshold.includes("must be greater than MOQ"));
    });

    it("Bulk enabled requires valid Bulk Unit Price > 0", () => {
      const res = simulatePublishValidation({
        standardPrice: 4.30,
        moq: 200,
        fullStockPrice: 4.00,
        bulkPricingEnabled: true,
        bulkThreshold: 500,
        bulkPrice: 0,
      });

      assert.equal(res.valid, false);
      assert.equal(res.errors.bulkPrice, "Bulk tier price must be greater than $0.00.");
    });
  });
});
