import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Admin Product Table 'Offer Sheet' Row Action & Instant Modal", () => {
  const rootDir = process.cwd();
  const modalPath = path.join(rootDir, "src/components/admin/products/ProductOfferSheetModal.tsx");
  const rowPath = path.join(rootDir, "src/components/admin/products/ProductTableRow.tsx");
  const tablePath = path.join(rootDir, "src/components/admin/products/ProductTable.tsx");
  const pagePath = path.join(rootDir, "src/app/ayc/products/page.tsx");
  const indexPath = path.join(rootDir, "src/components/admin/products/index.ts");

  it("1. ProductOfferSheetModal component exists with required controls", () => {
    assert.ok(fs.existsSync(modalPath), "ProductOfferSheetModal.tsx must exist");
    const content = fs.readFileSync(modalPath, "utf-8");

    // Check essential capabilities
    assert.ok(content.includes("export default function ProductOfferSheetModal"), "Exports ProductOfferSheetModal");
    assert.ok(content.includes("/offer-sheet"), "Hits the backend offer-sheet endpoint");
    assert.ok(content.includes("Download PDF") || content.includes("Download"), "Has download button");
    assert.ok(content.includes("Open in New Tab") || content.includes("ExternalLink"), "Has open in new tab button");
    assert.ok(content.includes("Print") || content.includes("Printer"), "Has print button");
    assert.ok(content.includes("<iframe"), "Renders PDF inside an iframe for instant preview");
    assert.ok(content.includes("Escape"), "Supports ESC key to dismiss modal");
  });

  it("2. ProductOfferSheetModal is exported from admin products index", () => {
    const content = fs.readFileSync(indexPath, "utf-8");
    assert.ok(content.includes("ProductOfferSheetModal"), "index.ts exports ProductOfferSheetModal");
  });

  it("3. ProductTableRow includes the 'Offer Sheet' action in the dropdown menu", () => {
    const content = fs.readFileSync(rowPath, "utf-8");
    assert.ok(content.includes("onViewOfferSheet"), "ProductTableRow accepts onViewOfferSheet prop");
    assert.ok(content.includes("Offer Sheet"), "ProductTableRow renders 'Offer Sheet' label");
    assert.ok(content.includes("FileText"), "Uses FileText icon for Offer Sheet action");
  });

  it("4. ProductTable forwards onViewOfferSheet prop to rows", () => {
    const content = fs.readFileSync(tablePath, "utf-8");
    assert.ok(content.includes("onViewOfferSheet?: (product: B2BProductInput) => void"), "ProductTable defines onViewOfferSheet in interface");
    assert.ok(content.includes("onViewOfferSheet={onViewOfferSheet}"), "ProductTable passes onViewOfferSheet to ProductTableRow");
  });

  it("5. Admin Products page binds state, handler, and renders ProductOfferSheetModal", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    assert.ok(content.includes("ProductOfferSheetModal"), "page.tsx imports ProductOfferSheetModal");
    assert.ok(content.includes("offerSheetProduct"), "page.tsx maintains offerSheetProduct state");
    assert.ok(content.includes("onViewOfferSheet={handleViewOfferSheet}"), "passes onViewOfferSheet to ProductTable");
    assert.ok(content.includes("<ProductOfferSheetModal"), "page.tsx renders ProductOfferSheetModal");
    assert.ok(content.includes("isOpen={offerSheetProduct !== null}"), "ProductOfferSheetModal is open when a product is selected");
  });
});
