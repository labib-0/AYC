import fs from "fs";
import path from "path";

/**
 * COMPREHENSIVE VERIFICATION AUDIT:
 * 1. Complete Removal of Customer Reorder Feature
 * 2. Payment Receipt Update & Proof Replacement Workflow
 * 3. Preservation of Core Ordering, Inventory, and Admin Catalog Functions
 */
function runTests() {
  console.log("==================================================================");
  console.log("AYC: REORDER REMOVAL & PAYMENT RECEIPT UPDATE VERIFICATION AUDIT");
  console.log("==================================================================\n");

  const cwd = process.cwd();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  function readCode(relPath: string): string {
    return fs.readFileSync(path.join(cwd, relPath), "utf-8");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TASK 1: Customer Reorder Feature Complete Retirement
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ Group 1: Customer Reorder Complete Retirement");

  const reorderPageExists = fs.existsSync(path.join(cwd, "src/app/dashboard/reorder"));
  assert(!reorderPageExists, "Customer /dashboard/reorder route directory is completely removed");

  const reorderPreviewExists = fs.existsSync(
    path.join(cwd, "src/components/dashboard/DashboardReorderPreview.tsx")
  );
  assert(!reorderPreviewExists, "DashboardReorderPreview component is completely deleted");

  const nextConfigCode = readCode("next.config.ts");
  assert(
    nextConfigCode.includes('source: "/dashboard/reorder"') &&
      nextConfigCode.includes('destination: "/dashboard/orders"'),
    "next.config.ts safely redirects legacy /dashboard/reorder URL to /dashboard/orders"
  );

  const dashboardPageCode = readCode("src/app/dashboard/page.tsx");
  assert(
    !dashboardPageCode.includes("DashboardReorderPreview") &&
      !dashboardPageCode.includes("uniquePurchasedProductIds") &&
      !dashboardPageCode.includes("reorderCount"),
    "DashboardOverviewPage contains no reorder preview component, logic, or props"
  );

  const dashboardKPICardsCode = readCode("src/components/dashboard/DashboardKPICards.tsx");
  assert(
    !dashboardKPICardsCode.includes("Reorder Ready") &&
      !dashboardKPICardsCode.includes("/dashboard/reorder") &&
      dashboardKPICardsCode.includes('title: "Documents"') &&
      dashboardKPICardsCode.includes('href: "/dashboard/documents"'),
    "DashboardKPICards replaces 'Reorder Ready' with 'Documents' linking to /dashboard/documents"
  );

  const dashboardQuickActionsCode = readCode("src/components/dashboard/DashboardQuickActions.tsx");
  assert(
    !dashboardQuickActionsCode.includes("Quick Reorder") &&
      !dashboardQuickActionsCode.includes("/dashboard/reorder") &&
      dashboardQuickActionsCode.includes('title: "Explore Catalog"') &&
      dashboardQuickActionsCode.includes('href: "/products"'),
    "DashboardQuickActions replaces 'Quick Reorder' with 'Explore Catalog'"
  );

  const sidebarCode = readCode("src/components/dashboard/DashboardSidebar.tsx");
  assert(
    !sidebarCode.includes("Quick Reorder") && !sidebarCode.includes("/dashboard/reorder"),
    "DashboardSidebar contains no Quick Reorder navigation item or href"
  );

  const mobileNavCode = readCode("src/components/dashboard/DashboardMobileNav.tsx");
  assert(
    !mobileNavCode.includes("Quick Reorder") && !mobileNavCode.includes("/dashboard/reorder"),
    "DashboardMobileNav contains no Quick Reorder navigation item or href"
  );

  const customerOrdersPageCode = readCode("src/app/dashboard/orders/page.tsx");
  assert(
    !customerOrdersPageCode.includes("Quick Reorder") &&
      !customerOrdersPageCode.includes("/dashboard/reorder"),
    "Customer Orders list page contains no Quick Reorder button or link"
  );

  const customerOrderDetailPageCode = readCode("src/app/dashboard/orders/[id]/page.tsx");
  assert(
    !customerOrderDetailPageCode.includes("Reorder Items") &&
      !customerOrderDetailPageCode.includes("handleReorder"),
    "Customer Order Details page contains no Reorder Items button or handler"
  );

  const layoutCode = readCode("src/app/dashboard/layout.tsx");
  const layoutClientCode = readCode("src/app/dashboard/DashboardLayoutClient.tsx");
  assert(
    !layoutCode.includes("/dashboard/reorder") && !layoutClientCode.includes("/dashboard/reorder"),
    "Dashboard layouts contain no breadcrumb or routing references to /dashboard/reorder"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TASK 2: Payment Receipt Update & Replacement Bug Fix
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 2: Payment Receipt Update & Replacement Bug Fix");

  const apiRoutesCode = readCode("backend/routes/api.php");
  assert(
    apiRoutesCode.includes("Route::middleware('auth:sanctum')->group(function () {") &&
      apiRoutesCode.includes("Route::post('/{id}/payment-proof', [OrderController::class, 'uploadPaymentProof']);"),
    "Customer payment proof route is protected by auth:sanctum allowing order owner update"
  );
  assert(
    apiRoutesCode.includes("Route::post('/orders/{id}/payment-proof', [OrderController::class, 'uploadPaymentProof']);"),
    "Admin routes group exposes POST /admin/orders/{id}/payment-proof for authorized admin updates"
  );

  const orderControllerCode = readCode("backend/app/Http/Controllers/Api/V1/OrderController.php");
  assert(
    orderControllerCode.includes("uploadPaymentProof(Request $request,") &&
      (orderControllerCode.includes("mimes:jpg,jpeg,png,webp") || orderControllerCode.includes("mimes:jpg,jpeg,png,webp,pdf")) &&
      orderControllerCode.includes("max:10240"),
    "OrderController enforces backend validation for JPG, PNG, WebP up to 10MB"
  );
  assert(
    orderControllerCode.includes("Storage::disk('public')->delete($oldRelativePath)"),
    "OrderController safely cleans up orphaned old receipt file upon replacement"
  );
  assert(
    orderControllerCode.includes("OrderResource($order)"),
    "OrderController returns refreshed OrderResource with updated receipt and payment details"
  );
  assert(
    !orderControllerCode.includes("payment_status = 'paid'") ||
      !orderControllerCode.includes("uploadPaymentProof"), // verify uploadPaymentProof does not mark paid
    "uploadPaymentProof preserves order payment review workflow without marking paid prematurely"
  );

  const adminOrderServiceCode = readCode("src/services/admin/order.service.ts");
  assert(
    adminOrderServiceCode.includes("updatePaymentReceipt") &&
      adminOrderServiceCode.includes("/orders/${id}/payment-proof"),
    "Admin order.service.ts provides updatePaymentReceipt API integration"
  );

  const orderPaymentInventoryCardCode = readCode("src/components/admin/orders/OrderPaymentInventoryCard.tsx");
  assert(
    orderPaymentInventoryCardCode.includes("onReceiptUpdated") &&
      orderPaymentInventoryCardCode.includes("Replace / Update Receipt") &&
      orderPaymentInventoryCardCode.includes("showReplaceReceiptModal"),
    "OrderPaymentInventoryCard provides interactive receipt replacement modal for admins"
  );
  assert(
    orderPaymentInventoryCardCode.includes("10 * 1024 * 1024") &&
      orderPaymentInventoryCardCode.includes("image/jpeg,image/png,image/webp,application/pdf"),
    "OrderPaymentInventoryCard enforces client-side file size and format validation"
  );

  assert(
    customerOrderDetailPageCode.includes("Update / Replace Receipt") &&
      customerOrderDetailPageCode.includes("handleFileChange") &&
      customerOrderDetailPageCode.includes("10 * 1024 * 1024"),
    "Customer Order Details page supports receipt replacement with client-side validation"
  );
  assert(
    customerOrderDetailPageCode.includes("setOrder(result.order as OrderRecord)") ||
      customerOrderDetailPageCode.includes("setOrder(result.order)"),
    "Customer Order Details page refreshes receipt immediately in-memory without full page reload"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TASK 3: Preservation of Core Ordering & Admin Sequence Reorder
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 3: Core Ordering & Catalog Integrity");

  const productServiceCode = readCode("src/services/product.service.ts");
  assert(
    productServiceCode.includes("reorderProducts") &&
      productServiceCode.includes("/products/reorder"),
    "Admin catalog product sequence ordering (reorderProducts) remains intact and operational"
  );

  const categoryServiceCode = readCode("src/services/category.service.ts");
  assert(
    categoryServiceCode.includes("reorderCategories") &&
      categoryServiceCode.includes("/categories/reorder"),
    "Admin catalog category sequence ordering (reorderCategories) remains intact and operational"
  );

  const brandServiceCode = readCode("src/services/brand.service.ts");
  assert(
    brandServiceCode.includes("reorderBrands") &&
      brandServiceCode.includes("/brands/reorder"),
    "Admin catalog brand sequence ordering (reorderBrands) remains intact and operational"
  );

  const cartServiceCode = readCode("src/services/cart.service.ts");
  assert(
    cartServiceCode.includes("addToCart") &&
      cartServiceCode.includes("calculateTierUnitPrice") &&
      cartServiceCode.includes("InvalidMoqMultipleError"),
    "Storefront cart service, tiered wholesale pricing, and MOQ validation remain intact and operational"
  );

  console.log("\n==================================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
