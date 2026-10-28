import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getBrandLogoUrl, BRAND_LOGO_MAP } from "../src/lib/brand-logos";
import fs from "fs";
import path from "path";

describe("Minor Audit Remediation Verification (DEF-01 & OBS-01)", () => {
  it("DEF-01: getBrandLogoUrl returns verified SVG for major brands", () => {
    assert.equal(getBrandLogoUrl("Nike"), "/brands/nike.svg");
    assert.equal(getBrandLogoUrl("Adidas"), "/brands/adidas.svg");
    assert.equal(getBrandLogoUrl("Zara"), "/brands/zara.svg");
    assert.equal(getBrandLogoUrl("Levi's"), "/brands/levis.svg");
  });

  it("DEF-01: getBrandLogoUrl rejects unverified static brand paths and returns null", () => {
    // These brands previously generated 404 console errors
    assert.equal(getBrandLogoUrl("Aarab"), null);
    assert.equal(getBrandLogoUrl("Pepco Women"), null);
    assert.equal(getBrandLogoUrl("Grupo Inditex"), null);
    assert.equal(getBrandLogoUrl("Aarab", "/brands/aarab.svg"), null);
    assert.equal(getBrandLogoUrl("Pepco Women", "/brands/pepco-women.svg"), null);
  });

  it("DEF-01: getBrandLogoUrl preserves legitimate uploaded media assets", () => {
    assert.equal(
      getBrandLogoUrl("Custom Brand", "/storage/brands/custom-logo-123.png"),
      "/storage/brands/custom-logo-123.png"
    );
    assert.equal(
      getBrandLogoUrl("Custom Brand", "https://cdn.example.com/logo.webp"),
      "https://cdn.example.com/logo.webp"
    );
  });

  it("OBS-01: Header.tsx attaches Escape listener when isMobileMenuOpen is true", () => {
    const headerCode = fs.readFileSync(path.resolve("src/components/layout/Header.tsx"), "utf-8");
    assert.ok(
      headerCode.includes("!isSearchOpen && !isMobileMenuOpen"),
      "Header outside/escape effect guards with !isSearchOpen && !isMobileMenuOpen"
    );
    assert.ok(
      headerCode.includes("if (isMobileMenuOpen) {\n          setIsMobileMenuOpen(false);"),
      "handleKeyDown dismisses isMobileMenuOpen on Escape"
    );
  });

  it("OBS-01: MiniCart.tsx attaches Escape keydown listener", () => {
    const miniCartCode = fs.readFileSync(path.resolve("src/components/cart/MiniCart.tsx"), "utf-8");
    assert.ok(
      miniCartCode.includes('if (e.key === "Escape")'),
      "MiniCart binds Escape key listener"
    );
    assert.ok(
      miniCartCode.includes("setIsCartOpen(false)"),
      "MiniCart closes on Escape"
    );
  });
});
