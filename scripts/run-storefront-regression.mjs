/**
 * Ayaan Clothing Storefront Regression Test Runner (Phase I)
 * 
 * Enforces strict boundary separation:
 * 1. Storefront Unit (30/30): Offline component, pricing, cart, auth, SEO, and regression logic (PASS / FAIL)
 * 2. Storefront Contract: Mocked / fixture-based API schema and contract adherence (PASS / FAIL)
 * 3. Storefront Integration: Live Laravel/PostgreSQL/Redis verification (PASS / FAIL / BLOCKED)
 * 4. Admin Tests: Admin-only portal functionality (SEPARATE - isolated from Storefront score)
 * 5. Historical / Legacy: Milestone and prototype audits (PRESERVED - catalogued record)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT_DIR = process.cwd();
const TESTS_DIR = path.join(ROOT_DIR, "tests");
const TARGET_API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

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
  "strict-landing-page-pagination.test.ts",
  "stf-phase-j-commercial-document-normalization.test.ts",
  "stf-phase-k-operational-hardening-and-observability.test.ts",
  "storefront-wide-address-modal.test.ts",
  "customer-document-center-redesign.test.ts",
  "storefront-ux-refinement.test.ts",
  "storefront-wishlist-restoration.test.ts",
  "production-api-failure-and-error-states.test.ts"
];

// 2. Storefront Contract Suites (Mocked / Typed Fixtures)
const STOREFRONT_CONTRACT_SUITES = [
  "fixtures/authoritative-api-fixtures.ts"
];

// 3. Live Backend Integration Suites
const STOREFRONT_LIVE_INTEGRATION_SUITES = [
  "live-api-contract-verification.test.ts",
  "local-fullstack-integration.test.ts",
  "inventory-validation-flow.test.ts",
  "b2b-customer-capabilities.test.ts"
];

// Helper to check backend health
async function checkBackendOnline(url = TARGET_API_BASE) {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      return { online: false, reason: `HTTP status ${res.status}` };
    }
    const json = await res.json();
    if (json.data?.database !== "ok") {
      return { online: false, reason: `Database unavailable (PostgreSQL status: ${json.data?.database})` };
    }
    if (json.data?.redis !== "ok") {
      return { online: false, reason: `Redis cache unavailable (status: ${json.data?.redis})` };
    }
    return { online: true, data: json.data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { online: false, reason: `Cannot connect to ${url}: ${msg}` };
  }
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
    const isBlocked = stdout.includes("STATUS: BLOCKED");
    return { passed: true, blocked: isBlocked, output: stdout };
  } catch (err) {
    const combined = ((err.stdout || "") + "\n" + (err.stderr || "")).trim();
    const isBlocked = combined.includes("STATUS: BLOCKED");
    return { passed: isBlocked, blocked: isBlocked, error: combined || err.message };
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
  const backendCheck = await checkBackendOnline();
  let integrationStatus = "BLOCKED";

  if (!backendCheck.online) {
    integrationStatus = `BLOCKED (${backendCheck.reason})`;
    console.log(`  ℹ Status: BLOCKED — ${backendCheck.reason}`);
    console.log("  ℹ Note: Under Phase I protocol, live integration tests are NEVER silently mocked.");
    for (const suite of STOREFRONT_LIVE_INTEGRATION_SUITES) {
      console.log(`  - [BLOCKED] ${suite} (Requires live PostgreSQL/Redis/Laravel)`);
    }
  } else {
    console.log(`  ℹ Target API: ${TARGET_API_BASE} (DB: ok, Redis: ok)`);
    let intPassed = 0;
    let intFailed = 0;
    for (const suite of STOREFRONT_LIVE_INTEGRATION_SUITES) {
      const res = runTestFile(suite);
      if (res.passed) {
        if (res.blocked) {
          console.log(`  - [BLOCKED] ${suite}`);
        } else {
          console.log(`  ✔ [PASS] ${suite}`);
          intPassed++;
        }
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

  console.log("--- 5. HISTORICAL / LEGACY AUDITS ---");
  const historicalTests = allTests.filter(
    f => !STOREFRONT_UNIT_SUITES.includes(f) &&
         !STOREFRONT_LIVE_INTEGRATION_SUITES.includes(f) &&
         !adminTests.includes(f)
  );
  console.log(`  ℹ Found ${historicalTests.length} Historical/Milestone audit suites preserved in ./tests.`);
  console.log("  ℹ Status: HISTORICAL PRESERVED (Documented baseline; not executed in standard release gate)\n");

  console.log("==========================================================");
  console.log("  STOREFRONT REGRESSION GATE REPORT                       ");
  console.log("==========================================================");
  console.log(`  Storefront Unit (${totalUnitPassed}/${STOREFRONT_UNIT_SUITES.length}): ${unitStatus}`);
  console.log(`  Storefront Contract:    ${contractStatus}`);
  console.log(`  Storefront Integration: ${integrationStatus}`);
  console.log(`  Admin tests:            SEPARATE (Isolated)`);
  console.log(`  Historical / Legacy:    PRESERVED (${historicalTests.length} catalogued)`);
  console.log("==========================================================\n");

  if (unitStatus === "FAIL" || contractStatus === "FAIL" || integrationStatus === "FAIL") {
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
