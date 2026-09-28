import fs from "fs";
import path from "path";

/**
 * CUSTOMER DASHBOARD SIMPLIFICATION & REDUNDANCY CLEANUP AUDIT SUITE
 *
 * Verifies that the Customer Dashboard has been streamlined:
 * - Redundant entry points, cards, and duplicate actions removed.
 * - Sourcing workflows consolidated: Orders, RFQ, Quick Reorder.
 * - Primary KPI cards reduced to Orders, Active RFQs, and Reorder Ready.
 * - Quick Actions consolidated to Request RFQ and Quick Reorder.
 * - Sidebar and Mobile Nav updated to clean hierarchical grouping.
 * - Underlying business logic, quotation detail routes, and catalog accessibility preserved.
 */
function runTests() {
  console.log("==================================================");
  console.log("CUSTOMER DASHBOARD SIMPLIFICATION AUDIT");
  console.log("==================================================\n");

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

  // File Paths
  const headerPath = path.join(cwd, "src/components/dashboard/DashboardHeader.tsx");
  const kpiPath = path.join(cwd, "src/components/dashboard/DashboardKPICards.tsx");
  const quickActionsPath = path.join(cwd, "src/components/dashboard/DashboardQuickActions.tsx");
  const sidebarPath = path.join(cwd, "src/components/dashboard/DashboardSidebar.tsx");
  const mobileNavPath = path.join(cwd, "src/components/dashboard/DashboardMobileNav.tsx");
  const recentOrdersPath = path.join(cwd, "src/components/dashboard/DashboardRecentOrders.tsx");
  const openRfqsPath = path.join(cwd, "src/components/dashboard/DashboardOpenRfqs.tsx");
  const reorderPreviewPath = path.join(cwd, "src/components/dashboard/DashboardReorderPreview.tsx");
  const overviewPagePath = path.join(cwd, "src/app/dashboard/page.tsx");
  const layoutPath = path.join(cwd, "src/app/dashboard/layout.tsx");

  const headerCode = fs.readFileSync(headerPath, "utf-8");
  const kpiCode = fs.readFileSync(kpiPath, "utf-8");
  const quickActionsCode = fs.readFileSync(quickActionsPath, "utf-8");
  const sidebarCode = fs.readFileSync(sidebarPath, "utf-8");
  const mobileNavCode = fs.readFileSync(mobileNavPath, "utf-8");
  const recentOrdersCode = fs.readFileSync(recentOrdersPath, "utf-8");
  const openRfqsCode = fs.readFileSync(openRfqsPath, "utf-8");
  const reorderPreviewCode = fs.readFileSync(reorderPreviewPath, "utf-8");
  const overviewCode = fs.readFileSync(overviewPagePath, "utf-8");
  const layoutCode = fs.readFileSync(layoutPath, "utf-8");

  // ─────────────────────────────────────────────────────────────
  // 1. Welcome Banner Simplification
  // ─────────────────────────────────────────────────────────────
  console.log("▶ Group 1: Welcome Banner (Account Summary Only)");
  assert(
    headerCode.includes("Welcome back, {user?.name || \"Customer\"}") &&
    headerCode.includes("Verified Account") &&
    headerCode.includes("Billing Currency:"),
    "DashboardHeader presents clean account & company summary"
  );
  assert(
    !headerCode.includes("Dedicated Account Rep") &&
    !headerCode.includes("Request Quote"),
    "DashboardHeader removes duplicate action buttons (Request Quote and Dedicated Rep)"
  );

  // ─────────────────────────────────────────────────────────────
  // 2. Primary KPI Metrics Consolidation
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 2: Key Workflow Metrics");
  assert(
    kpiCode.includes('title: "Orders"') &&
    kpiCode.includes('href: "/dashboard/orders"') &&
    kpiCode.includes('title: "Active RFQs"') &&
    kpiCode.includes('href: "/dashboard/rfq"') &&
    kpiCode.includes('title: "Reorder Ready"') &&
    kpiCode.includes('href: "/dashboard/reorder"'),
    "DashboardKPICards provides exactly 3 primary metrics: Orders, Active RFQs, Reorder Ready"
  );
  assert(
    !kpiCode.includes("Saved Wholesale Items") &&
    !kpiCode.includes("Bookmark"),
    "DashboardKPICards removes redundant 'Saved Wholesale Items' KPI"
  );
  assert(
    kpiCode.includes("grid-cols-1 sm:grid-cols-3"),
    "DashboardKPICards renders balanced 3-column responsive grid"
  );

  // ─────────────────────────────────────────────────────────────
  // 3. Quick Actions Simplification
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 3: Quick Actions (Singular Entry Points)");
  assert(
    quickActionsCode.includes('title: "Request RFQ"') &&
    quickActionsCode.includes('href: "/rfq"') &&
    quickActionsCode.includes('title: "Quick Reorder"') &&
    quickActionsCode.includes('href: "/dashboard/reorder"'),
    "DashboardQuickActions contains the two primary customer shortcuts: Request RFQ and Quick Reorder"
  );
  assert(
    !quickActionsCode.includes("Explore Catalog") &&
    !quickActionsCode.includes("Manage Orders"),
    "DashboardQuickActions removes redundant Explore Catalog and Manage Orders cards"
  );
  assert(
    quickActionsCode.includes("grid-cols-1 sm:grid-cols-2"),
    "DashboardQuickActions uses clean 2-column layout"
  );

  // ─────────────────────────────────────────────────────────────
  // 4. Quick Reorder Shelf
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 4: Quick Reorder Shelf Preview");
  assert(
    reorderPreviewCode.includes("Quick Reorder Shelf") &&
    reorderPreviewCode.includes("All Reorder Items") &&
    reorderPreviewCode.includes('href="/dashboard/reorder"'),
    "DashboardReorderPreview retains verified purchase shelf and All Reorder Items destination"
  );
  assert(
    reorderPreviewCode.includes("Last Ordered:") &&
    reorderPreviewCode.includes("Wholesale MOQ:") &&
    reorderPreviewCode.includes("Current Price:") &&
    reorderPreviewCode.includes("Reorder ("),
    "DashboardReorderPreview displays last ordered qty, MOQ, current price, and 1-click reorder"
  );

  // ─────────────────────────────────────────────────────────────
  // 5. Recent Orders Section
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 5: Recent Orders Section");
  assert(
    recentOrdersCode.includes("Recent Orders") &&
    recentOrdersCode.includes("View All Orders") &&
    recentOrdersCode.includes('href="/dashboard/orders"'),
    "DashboardRecentOrders section provides clean header and View All Orders link"
  );
  assert(
    recentOrdersCode.includes("Order #") &&
    recentOrdersCode.includes("Date") &&
    recentOrdersCode.includes("Items / Units") &&
    recentOrdersCode.includes("Total USD") &&
    recentOrdersCode.includes("Payment") &&
    recentOrdersCode.includes("Status"),
    "DashboardRecentOrders retains complete commercial summary columns"
  );

  // ─────────────────────────────────────────────────────────────
  // 6. Unified RFQs & Quotations Section
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 6: Unified RFQs & Quotations");
  assert(
    openRfqsCode.includes("RFQs & Quotations") &&
    openRfqsCode.includes("View All RFQs") &&
    openRfqsCode.includes('href="/dashboard/rfq"'),
    "DashboardOpenRfqs unifies RFQ and quotation status under single section"
  );
  assert(
    openRfqsCode.includes("/dashboard/quotes/"),
    "DashboardOpenRfqs preserves direct quotation review links when quote exists"
  );

  // ─────────────────────────────────────────────────────────────
  // 7. Sidebar Information Architecture
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 7: Sidebar Navigation Structure");
  assert(
    sidebarCode.includes("OVERVIEW_NAV") &&
    sidebarCode.includes('label: "Dashboard"') &&
    sidebarCode.includes('href: "/dashboard"'),
    "Sidebar organizes OVERVIEW with Dashboard"
  );
  assert(
    sidebarCode.includes('label: "Orders"') &&
    sidebarCode.includes('label: "RFQ"') &&
    sidebarCode.includes('label: "Quick Reorder"'),
    "Sidebar SOURCING & BUYING contains Orders, RFQ, Quick Reorder"
  );
  assert(
    !sidebarCode.includes('label: "Commercial Quotes"') &&
    !sidebarCode.includes('label: "RFQs & Inquiries"'),
    "Sidebar eliminates duplicate Commercial Quotes and renames RFQs & Inquiries to RFQ"
  );
  assert(
    sidebarCode.includes('label: "Documents"') &&
    sidebarCode.includes('label: "Addresses"') &&
    sidebarCode.includes('label: "Company Profile"') &&
    sidebarCode.includes('label: "Profile & Security"'),
    "Sidebar COMPANY & SETTINGS contains Documents, Addresses, Company Profile, Profile & Security"
  );

  // ─────────────────────────────────────────────────────────────
  // 8. Mobile Navigation Consistency
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 8: Mobile Navigation Alignment");
  assert(
    mobileNavCode.includes('label: "Dashboard"') &&
    mobileNavCode.includes('label: "Orders"') &&
    mobileNavCode.includes('label: "RFQ"') &&
    mobileNavCode.includes('label: "Quick Reorder"'),
    "Mobile nav aligns with primary buying destinations"
  );
  assert(
    !mobileNavCode.includes('label: "Quotes"'),
    "Mobile nav removes redundant standalone Quotes chip"
  );

  // ─────────────────────────────────────────────────────────────
  // 9. Dashboard Overview Page Performance & Data Optimization
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 9: Data Loading Optimization");
  assert(
    !overviewCode.includes("productService.getProducts") &&
    !overviewCode.includes("catalogProducts"),
    "DashboardOverviewPage avoids loading full product catalog on overview"
  );
  assert(
    !overviewCode.includes("useWishlist") &&
    !overviewCode.includes("totalWishlistItems"),
    "DashboardOverviewPage removes unused wishlist hook"
  );
  assert(
    overviewCode.includes("getUserOrders(user.id)") &&
    overviewCode.includes("getAllRfqs()"),
    "DashboardOverviewPage fetches only customer orders and RFQs"
  );

  // ─────────────────────────────────────────────────────────────
  // 10. Layout Breadcrumbs
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 10: Breadcrumbs Consistency");
  assert(
    layoutCode.includes('if (pathname.startsWith("/dashboard/rfq")) return "RFQ"') &&
    layoutCode.includes('if (pathname.startsWith("/dashboard/settings")) return "Profile & Security"'),
    "Breadcrumbs reflect clean RFQ and Profile & Security naming"
  );

  console.log("\n==================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
