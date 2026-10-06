/**
 * Ayaan Clothing Storefront Regression Test Runner (Phase H)
 * 
 * Enforces strict boundary separation:
 * 1. Storefront Unit: Offline component, pricing, cart, auth, SEO, and regression logic (PASS / FAIL)
 * 2. Storefront Contract: Mocked / fixture-based API schema and contract adherence (PASS / FAIL)
 * 3. Storefront Integration: End-to-end flows against live Laravel/PostgreSQL/Redis (PASS / FAIL / BLOCKED)
 * 4. Admin Tests: Admin-only portal functionality (SEPARATE - isolated from Storefront score)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import http from "http";

const ROOT_DIR = process.cwd();
const TESTS_DIR = path.join(ROOT_DIR, "tests");

// 1. Core Storefront Unit Suites
const STOREFRONT_UNIT_SUITES = [
  "stf-master-regression-suite.test.ts",
  "stf-phase-g-hardening.test.ts",
  "stf-010-seo-structured-data.test.ts",
  "stf-phase-ef-refinements.test.ts",
  "shop-by-brand-and-banner.test.ts",
  "product-seo-keywords-hydration.test.ts",
  "size-colour-specifications-and-package-assortment.test.ts",
  "simplify-product-detail-price-header.test.ts",
  "sales-profit-analytics.test.ts",
  "product-detail-refinement.test.ts",
  "product-detail-simplified-commerce-and-logistics.test.ts",
  "product-detail-ui-hierarchy.test.ts",
  "product-gallery-4-5-size-and-overlays.test.ts",
  "product-grid-density-refinement.test.ts",
  "phase5-multi-currency-banking.test.ts",
  "phase4-final-audit-consistency.test.ts",
  "phase3-final-verification.test.ts",
  "customer-cart-redesign.test.ts",
  "customer-dashboard-simplification.test.ts",
  "dynamic-product-specification-boxes.test.ts",
  "standard-pricing-and-full-stock-basis.test.ts",
  "single-active-explorer.test.ts",
  "header-full-stock-replacement.test.ts",
  "geo-block-403-page.test.ts",
  "all-categories-compact.test.ts",
  "audience-section-compact.test.ts",
  "compact-inventory-ui.test.ts",
  "brand-logo-scale-and-density.test.ts",
  "whatsapp-authoritative-settings.test.ts",
  "strict-landing-page-pagination.test.ts"
];

// 2. Storefront Contract Suites (Mocked / Typed Fixtures)
const STOREFRONT_CONTRACT_SUITES = [
  "fixtures/authoritative-api-fixtures.ts"
];

// 3. Live Backend Integration Suites (Requires Laravel on port 8000)
const STOREFRONT_LIVE_INTEGRATION_SUITES = [
  "local-fullstack-integration.test.ts",
  "inventory-validation-flow.test.ts",
  "admin-storefront-end-to-end-integration.test.ts"
];

// Helper to check backend health
async function checkBackendOnline(url = "http://127.0.0.1:8000/api/v1/health") {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port || 8000,
          path: u.pathname,
          method: "GET",
          timeout: 1500
        },
        (res) => {
          resolve(res.statusCode === 200 || res.statusCode === 204);
        }
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function runTestFile(relPath) {
  const fullPath = path.join(TESTS_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    return { passed: false, error: `File not found: ${relPath}` };
  }

  try {
    const stdout = execSync(`npx tsx "${fullPath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000
    });
    // Check if test output explicitly printed failures
    if (stdout.includes("❌ [FAIL]") || stdout.includes("✗ FAILED") || /FAIL:\s*[1-9]/.test(stdout)) {
      return { passed: false, error: stdout.slice(0, 500) };
    }
    return { passed: true, output: stdout };
  } catch (err) {
    const combined = ((err.stdout || "") + "\n" + (err.stderr || "")).trim();
    return { passed: false, error: combined || err.message };
  }
}

async function main() {
  console.log("==========================================================");
  console.log("  AYAAN CLOTHING — STOREFRONT REGRESSION TEST RUNNER     ");
  console.log("==========================================================\n");

  let totalUnitPassed = 0;
  let totalUnitFailed = 0;
  const unitFailures = [];

  console.log("--- 1. STOREFRONT UNIT REGRESSION ---");
  for (const suite of STOREFRONT_UNIT_SUITES) {
    const res = runTestFile(suite);
    if (res.passed) {
      console.log(`  ✔ [PASS] ${suite}`);
      totalUnitPassed++;
    } else {
      console.log(`  ✖ [FAIL] ${suite}`);
      totalUnitFailed++;
      unitFailures.push({ suite, error: res.error });
    }
  }
  const unitStatus = totalUnitFailed === 0 ? "PASS" : "FAIL";
  console.log(`\nStorefront Unit: ${unitStatus} (${totalUnitPassed}/${STOREFRONT_UNIT_SUITES.length} passed)\n`);

  console.log("--- 2. STOREFRONT CONTRACT REGRESSION ---");
  // Check authoritative fixtures type checking and compilation
  let contractStatus = "PASS";
  try {
    execSync("npx tsc --noEmit tests/fixtures/authoritative-api-fixtures.ts", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    execSync("npx eslint tests/fixtures/authoritative-api-fixtures.ts", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    console.log("  ✔ [PASS] Authoritative Laravel API Fixtures (Product, Media, Customer, Order, RFQ, Cart, Wishlist, Inventory, Address)");
  } catch (e) {
    contractStatus = "FAIL";
    console.log(`  ✖ [FAIL] Authoritative Contract Fixtures: ${e.message}`);
  }
  console.log(`Storefront Contract: ${contractStatus}\n`);

  console.log("--- 3. STOREFRONT LIVE BACKEND INTEGRATION ---");
  const isBackendOnline = await checkBackendOnline();
  let integrationStatus = "BLOCKED";

  if (!isBackendOnline) {
    integrationStatus = "BLOCKED";
    console.log("  ℹ Status: BLOCKED (Live Laravel backend unavailable on http://127.0.0.1:8000)");
    console.log("  ℹ Note: Under Phase H protocol, live integration tests are NEVER silently mocked.");
    for (const suite of STOREFRONT_LIVE_INTEGRATION_SUITES) {
      console.log(`  - [BLOCKED] ${suite} (Requires live PostgreSQL/Redis/Laravel)`);
    }
  } else {
    let intPassed = 0;
    let intFailed = 0;
    for (const suite of STOREFRONT_LIVE_INTEGRATION_SUITES) {
      const res = runTestFile(suite);
      if (res.passed) {
        console.log(`  ✔ [PASS] ${suite}`);
        intPassed++;
      } else {
        console.log(`  ✖ [FAIL] ${suite}`);
        intFailed++;
      }
    }
    integrationStatus = intFailed === 0 ? "PASS" : "FAIL";
  }
  console.log(`Storefront Integration: ${integrationStatus}\n`);

  console.log("--- 4. ADMIN TEST ISOLATION ---");
  const allTests = fs.readdirSync(TESTS_DIR).filter(f => f.endsWith(".ts"));
  const adminTests = allTests.filter(f => f.startsWith("admin-") || f.includes("inventory-batch"));
  console.log(`  ℹ Found ${adminTests.length} Admin-only test suites.`);
  console.log("  ℹ Status: SEPARATE (Admin portal tests are isolated and do NOT impact Storefront release gate)\n");

  console.log("==========================================================");
  console.log("  STOREFRONT REGRESSION GATE REPORT                       ");
  console.log("==========================================================");
  console.log(`  Storefront Unit:        ${unitStatus}`);
  console.log(`  Storefront Contract:    ${contractStatus}`);
  console.log(`  Storefront Integration: ${integrationStatus}`);
  console.log(`  Admin tests:            SEPARATE (Isolated)`);
  console.log("==========================================================\n");

  if (unitStatus === "FAIL" || contractStatus === "FAIL") {
    if (unitFailures.length > 0) {
      console.error("FAILURES DETECTED:");
      for (const f of unitFailures) {
        console.error(`\nSuite: ${f.suite}\n${f.error.slice(0, 500)}`);
      }
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal runner error:", err);
  process.exit(1);
});
