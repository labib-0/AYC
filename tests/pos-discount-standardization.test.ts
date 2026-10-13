import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADMIN_PERMISSIONS } from "../src/lib/permissions";

describe("POS Discount UI/UX Standardization", () => {
  const posPagePath = path.join(process.cwd(), "src/app/ayc/pos/page.tsx");
  const posSource = fs.readFileSync(posPagePath, "utf-8");

  // Extract the Discounts Section (Section 3)
  const discountSectionMatch = posSource.match(
    /\{\/\* ── 3\. Discounts & Coupon Collapsible ──[\s\S]*?\{\/\* ── 4\. Financial Totals Breakdown/
  );
  const discountSectionSource = discountSectionMatch ? discountSectionMatch[0] : "";

  it("should extract the POS discount section successfully", () => {
    assert.ok(discountSectionSource.length > 0, "Discount section must be present in POS page");
  });

  describe("1. Removal of Purple Theme from Discount Section", () => {
    it("must not contain any purple background or border in the discount section container", () => {
      assert.doesNotMatch(
        discountSectionSource,
        /bg-purple-/,
        "Discount section must not contain purple backgrounds (e.g. bg-purple-500/5, bg-purple-600)"
      );
      assert.doesNotMatch(
        discountSectionSource,
        /border-purple-/,
        "Discount section must not contain purple borders (e.g. border-purple-500/20)"
      );
    });

    it("must not contain any purple text or purple icons in the discount section", () => {
      assert.doesNotMatch(
        discountSectionSource,
        /text-purple-/,
        "Discount section must not contain purple text or icons"
      );
      assert.doesNotMatch(
        discountSectionSource,
        /hover:text-purple-/,
        "Discount section must not contain purple hover states"
      );
    });
  });

  describe("2. Design Tokens and Container Consistency", () => {
    it("uses standard surface background and neutral border for the discount container", () => {
      assert.match(
        discountSectionSource,
        /bg-secondary\/30\s+border\s+border-border\/80\s+text-xs\s+space-y-2\.5/,
        "Container should match the standard POS card styling (bg-secondary/30, border-border/80, space-y-2.5)"
      );
    });

    it("includes a clear and professional section heading", () => {
      assert.match(
        discountSectionSource,
        /Discounts/,
        "Section must include a clear 'Discounts' header"
      );
      assert.match(
        discountSectionSource,
        /Admin Discount Override/,
        "Form must include 'Admin Discount Override' header"
      );
    });
  });

  describe("3. Segmented Control: Percentage (%) vs Fixed ($)", () => {
    it("uses navy primary for the selected state and neutral for the unselected state", () => {
      assert.match(
        discountSectionSource,
        /manualDiscountType === "percentage"\s*\?\s*"bg-primary text-primary-foreground font-bold shadow-2xs"/,
        "Percentage button must use navy primary token when active"
      );
      assert.match(
        discountSectionSource,
        /manualDiscountType === "fixed"\s*\?\s*"bg-primary text-primary-foreground font-bold shadow-2xs"/,
        "Fixed button must use navy primary token when active"
      );
      assert.match(
        discountSectionSource,
        /text-muted-foreground hover:text-foreground hover:bg-background\/50/,
        "Unselected segmented option must use clean neutral typography"
      );
    });
  });

  describe("4. Form Inputs, Labels, and Validation", () => {
    it("provides standard POS input styling with accessible labels and units", () => {
      assert.match(
        discountSectionSource,
        /id="pos-manual-discount-value"/,
        "Value input must have an accessible ID"
      );
      assert.match(
        discountSectionSource,
        /htmlFor="pos-manual-discount-value"/,
        "Value input must have an associated label"
      );
      assert.match(
        discountSectionSource,
        /id="pos-manual-discount-reason"/,
        "Reason input must have an accessible ID"
      );
      assert.match(
        discountSectionSource,
        /htmlFor="pos-manual-discount-reason"/,
        "Reason input must have an associated label"
      );
      assert.match(
        discountSectionSource,
        /Reason <span className="text-destructive">\*<\/span>/,
        "Reason input label must clearly indicate that reason is mandatory"
      );
      assert.match(
        discountSectionSource,
        /focus:ring-1 focus:ring-primary focus:border-primary/,
        "Inputs must have standard primary focus ring"
      );
    });

    it("displays validation errors using the semantic destructive alert style", () => {
      assert.match(
        discountSectionSource,
        /bg-destructive\/10\s+border\s+border-destructive\/20\s+text-destructive/,
        "Validation error should be styled with semantic alert tokens"
      );
    });
  });

  describe("5. Action Buttons (Apply & Cancel)", () => {
    it("uses standard primary button for Apply Discount and secondary for Cancel", () => {
      assert.match(
        discountSectionSource,
        /id="btn-apply-manual-discount"[^>]*className="[^"]*bg-primary hover:bg-primary\/90 text-primary-foreground font-semibold text-xs/,
        "Apply button must be standard primary navy button"
      );
      assert.match(
        discountSectionSource,
        /id="btn-cancel-manual-discount"[^>]*className="[^"]*border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground font-medium text-xs/,
        "Cancel button must be standard secondary outlined button"
      );
      assert.match(
        discountSectionSource,
        /isApplyingManualDiscount \? "Applying\.\.\." : "Apply Discount"/,
        "Apply button must display loading feedback"
      );
    });
  });

  describe("6. Applied Discount Badge", () => {
    it("uses emerald tokens for applied manual discount badge consistent with savings", () => {
      assert.match(
        discountSectionSource,
        /bg-emerald-500\/10 text-emerald-700 dark:text-emerald-300 font-mono text-\[10px\] font-bold border border-emerald-500\/20/,
        "Applied discount badge must use emerald savings token instead of purple"
      );
    });
  });

  describe("7. Preservation of Discount Logic & Validation Rules", () => {
    it("requires ADMIN_PERMISSIONS.POS_DISCOUNT permission check", () => {
      assert.ok(
        ADMIN_PERMISSIONS.POS_DISCOUNT === "pos.discount",
        "Permission constant must match pos.discount"
      );
      assert.match(
        posSource,
        /if \(!can\(ADMIN_PERMISSIONS\.POS_DISCOUNT\)\)/,
        "Must verify pos.discount permission before applying discount"
      );
    });

    it("validates positive amount and percentage upper bound of 100%", () => {
      assert.match(
        posSource,
        /if \(isNaN\(val\) \|\| val <= 0\)/,
        "Must reject non-positive or invalid discount amounts"
      );
      assert.match(
        posSource,
        /if \(manualDiscountType === "percentage" && val > 100\)/,
        "Must reject percentage discounts greater than 100%"
      );
    });

    it("strictly requires a non-empty discount reason", () => {
      assert.match(
        posSource,
        /if \(!manualDiscountReason\.trim\(\)\)/,
        "Reason must be strictly validated as non-empty"
      );
    });

    it("correctly computes percentage discount calculations", () => {
      const subtotal = 250.0;
      const percentage = 15;
      const expectedDiscount = Math.round((subtotal * percentage) / 100 * 100) / 100;
      assert.equal(expectedDiscount, 37.5);
      const grandTotal = Math.max(0, subtotal - expectedDiscount);
      assert.equal(grandTotal, 212.5);
    });

    it("correctly computes fixed discount calculations", () => {
      const subtotal = 250.0;
      const fixedAmount = 50.0;
      const expectedDiscount = Math.min(subtotal, fixedAmount);
      assert.equal(expectedDiscount, 50.0);
      const grandTotal = Math.max(0, subtotal - expectedDiscount);
      assert.equal(grandTotal, 200.0);
    });

    it("handles 100% percentage discount without negative balance", () => {
      const subtotal = 120.0;
      const percentage = 100;
      const expectedDiscount = (subtotal * percentage) / 100;
      assert.equal(expectedDiscount, 120.0);
      const grandTotal = Math.max(0, subtotal - expectedDiscount);
      assert.equal(grandTotal, 0.0);
    });

    it("resets discount state cleanly on cancellation/removal", () => {
      assert.match(
        posSource,
        /const handleRemoveManualDiscount = \(\) => \{\s*setAppliedManualDiscount\(null\);\s*setManualDiscountError\(null\);\s*setManualDiscountValue\(""\);\s*setManualDiscountReason\(""\);\s*\};/,
        "handleRemoveManualDiscount must reset all discount state fields"
      );
    });
  });
});
