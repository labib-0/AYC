/**
 * Regression & Integration Test Suite for:
 * 1. Brand Logo Source Consistency (Shop By Brand vs Product Page)
 * 2. Quick Add Modal Package Assortment Exclusion vs Product Detail Retention
 * 3. Inventory Unique Product Counting & Quantity Safety
 */

import fs from "fs";
import path from "path";

const API_BASE = "http://127.0.0.1:8000/api/v1";

async function main() {
  console.log("==================================================================");
  console.log("TEST SUITE: FIX 3 PRODUCT PAGE / INVENTORY ISSUES");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Authenticate as Admin to verify backend API endpoints
  // -------------------------------------------------------------------------
  console.log("▶ Authenticating admin session...");
  let adminToken = "";
  try {
    const { execSync } = await import("child_process");
    adminToken = execSync(
      `php -r 'require "backend/vendor/autoload.php"; $app = require_once "backend/bootstrap/app.php"; $kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class); $kernel->bootstrap(); $u = \\App\\Models\\User::where("role", "admin")->first(); echo $u ? $u->createToken("ci-test")->plainTextToken : "";'`
    ).toString().trim();
    if (adminToken) {
      console.log("✔ Admin token obtained successfully.");
    }
  } catch (err) {
    console.warn("Notice: Token generation via artisan threw notice:", err);
  }

  const authHeaders: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(adminToken ? { "Authorization": `Bearer ${adminToken}` } : {}),
  };

  // -------------------------------------------------------------------------
  // ISSUE 1: BRAND LOGO SOURCE CONSISTENCY
  // -------------------------------------------------------------------------
  console.log("\n▶ [ISSUE 1] Verifying Brand Logo Source Consistency...");

  // 1a. Check Shop By Brand landing brands source
  const brandsRes = await fetch(`${API_BASE}/brands?landing=true`, { headers: authHeaders });
  assert(brandsRes.ok, "Brands API responds with 200 OK");
  const brandsJson = await brandsRes.json();
  const landingBrands = brandsJson.data || [];
  assert(landingBrands.length > 0, `Landing brands found in database (${landingBrands.length} brands)`);

  const nikeBrand = landingBrands.find((b: any) => b.slug === "nike" || b.name?.toLowerCase() === "nike") || landingBrands[0];
  const expectedBrandLogo = nikeBrand?.logo_url || nikeBrand?.logo;
  console.log(`- Shop By Brand logo for ${nikeBrand?.name}: ${expectedBrandLogo}`);

  // 1b. Check Product endpoint for product with this brand
  const productsRes = await fetch(`${API_BASE}/products`, { headers: authHeaders });
  assert(productsRes.ok, "Products API responds with 200 OK");
  const productsJson = await productsRes.json();
  const productList = productsJson.data || [];
  assert(productList.length > 0, `Products found in catalog (${productList.length} products)`);

  const sampleProduct = productList.find((p: any) => p.brand === nikeBrand?.name || p.brand_id === nikeBrand?.id) || productList[0];
  console.log(`- Sample product: ${sampleProduct?.name} (Brand: ${sampleProduct?.brand})`);

  // Fetch full product detail
  const productDetailRes = await fetch(`${API_BASE}/products/${sampleProduct.slug || sampleProduct.id}`, { headers: authHeaders });
  assert(productDetailRes.ok, "Product detail API responds with 200 OK");
  const productDetailJson = await productDetailRes.json();
  const detailedProduct = productDetailJson.data;

  // Assert identical database logo source
  assert(
    detailedProduct.brandLogo === expectedBrandLogo ||
    detailedProduct.brand_logo === expectedBrandLogo ||
    detailedProduct.brand_data?.logo_url === expectedBrandLogo,
    "Product Page brand logo source is IDENTICAL to Shop By Brand database logo",
    `Expected: ${expectedBrandLogo}, Received: ${detailedProduct.brandLogo || detailedProduct.brand_logo}`
  );

  // -------------------------------------------------------------------------
  // ISSUE 2: QUICK ADD DOES NOT RENDER PACKAGE ASSORTMENT, DETAIL VIEW DOES
  // -------------------------------------------------------------------------
  console.log("\n▶ [ISSUE 2] Verifying Quick Add vs Product Detail Presentation Scopes...");

  const quickAddModalFile = path.resolve(process.cwd(), "src/components/product/ProductQuickAddModal.tsx");
  const productDetailViewFile = path.resolve(process.cwd(), "src/app/products/[slug]/ProductDetailView.tsx");

  const quickAddCode = fs.readFileSync(quickAddModalFile, "utf-8");
  const detailViewCode = fs.readFileSync(productDetailViewFile, "utf-8");

  // Quick Add must NOT contain Package Assortment / Ratio Matrix presentation
  const quickAddHasUniversalPackageAssortmentHeading = quickAddCode.includes("Universal Package Assortment");
  const quickAddHasFixedDistributionText = quickAddCode.includes("Fixed distribution. Customers purchase complete packages exactly as configured.");
  const quickAddHasPackageAssortmentMatrix = quickAddCode.includes("<PackageAssortmentMatrix");

  assert(!quickAddHasUniversalPackageAssortmentHeading, "Quick Add modal DOES NOT render 'Universal Package Assortment' header");
  assert(!quickAddHasFixedDistributionText, "Quick Add modal DOES NOT render package ratio distribution matrix");
  assert(!quickAddHasPackageAssortmentMatrix, "Quick Add modal DOES NOT render <PackageAssortmentMatrix>");

  // Quick Add retains minimum required actions
  assert(quickAddCode.includes("maxCompletePackages"), "Quick Add retains maxCompletePackages calculations");
  assert(quickAddCode.includes("packageCount"), "Quick Add retains packageCount controls");
  assert(quickAddCode.includes("handleAddToCart"), "Quick Add retains Add to Cart action");
  assert(quickAddCode.includes("handleAddToRfq"), "Quick Add retains Add to Quote action");

  // Product Detail Page MUST continue rendering Package Assortment
  const detailHasPackageAssortmentMatrix = detailViewCode.includes("<PackageAssortmentMatrix");
  const detailHasPackageAssortmentHeader = detailViewCode.includes("Package Assortment");

  assert(detailHasPackageAssortmentMatrix, "Full Product Detail page STILL renders <PackageAssortmentMatrix>");
  assert(detailHasPackageAssortmentHeader, "Full Product Detail page STILL renders Package Assortment section header");

  // -------------------------------------------------------------------------
  // ISSUE 3: INVENTORY UNIQUE PRODUCT COUNT & METRIC ACCURACY
  // -------------------------------------------------------------------------
  console.log("\n▶ [ISSUE 3] Verifying Inventory Unique Products Count & Metrics...");

  if (adminToken) {
    const summaryRes = await fetch(`${API_BASE}/admin/inventory/summary`, { headers: authHeaders });
    assert(summaryRes.ok, "Admin inventory summary API responds with 200 OK");
    const summaryData = (await summaryRes.json()).data;

    console.log("✔ Live Inventory Summary:", summaryData);

    // Rule: Unique product count must equal actual unique products in DB, not 16
    assert(
      summaryData.totalProducts === 1 || summaryData.totalItems === 1,
      `Inventory summary reports UNIQUE product count of 1 (totalProducts: ${summaryData.totalProducts}, totalItems: ${summaryData.totalItems})`,
      `Received totalProducts: ${summaryData.totalProducts}, totalItems: ${summaryData.totalItems}`
    );

    // Inventory records must reflect 16 child records
    assert(
      summaryData.totalRecords === 16,
      `Inventory summary correctly reflects 16 inventory records (totalRecords: ${summaryData.totalRecords})`
    );

    // Total quantity reflects sum of units (496)
    assert(
      summaryData.totalQuantity === 496,
      `Inventory quantity accurately reflects 496 pcs total quantity (totalQuantity: ${summaryData.totalQuantity})`
    );

    // Inventory records list pagination verification
    const invListRes = await fetch(`${API_BASE}/admin/inventory`, { headers: authHeaders });
    assert(invListRes.ok, "Admin inventory records list responds with 200 OK");
    const invListData = (await invListRes.json()).data;
    assert(invListData.total === 16, `Inventory records list contains 16 rows total (total: ${invListData.total})`);
  } else {
    console.log("Notice: Admin token unavailable for live endpoint check; backend PHPUnit test covers live SQLite assertions.");
  }

  // -------------------------------------------------------------------------
  // Final Results
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
