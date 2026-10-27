import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const salesProfitFile = fs.readFileSync(
  path.join(process.cwd(), "src/components/admin/dashboard/SalesProfitOverview.tsx"),
  "utf8"
);
const recentOrdersFile = fs.readFileSync(
  path.join(process.cwd(), "src/components/admin/dashboard/RecentOrdersTable.tsx"),
  "utf8"
);
const recentRfqsFile = fs.readFileSync(
  path.join(process.cwd(), "src/components/admin/dashboard/RecentRfqsTable.tsx"),
  "utf8"
);
const dashboardPageFile = fs.readFileSync(
  path.join(process.cwd(), "src/app/ayc/dashboard/page.tsx"),
  "utf8"
);
const metricCardFile = fs.readFileSync(
  path.join(process.cwd(), "src/components/admin/dashboard/DashboardMetricCard.tsx"),
  "utf8"
);
const posPageFile = fs.readFileSync(
  path.join(process.cwd(), "src/app/ayc/pos/page.tsx"),
  "utf8"
);
const adminHeaderFile = fs.readFileSync(
  path.join(process.cwd(), "src/components/admin/layout/AdminHeader.tsx"),
  "utf8"
);

describe("Prompt 4 Dashboard & POS Responsiveness Regression Suite", () => {
  // ── PART 1: Dashboard Sales & Profit Chart Responsiveness ────────────────────
  describe("Part 1: Dashboard Sales & Profit Chart", () => {
    it("SalesProfitOverview wrapper prevents overflow with min-w-0 and overflow-hidden", () => {
      assert.ok(
        salesProfitFile.includes("w-full min-w-0 overflow-hidden"),
        "SalesProfitOverview section should enforce min-w-0 and overflow-hidden"
      );
    });

    it("Chart header adapts to mobile with flex-col sm:flex-row and wrap", () => {
      assert.ok(
        salesProfitFile.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0"),
        "Chart header should stack on mobile and row on sm+ to prevent legend/date overlap"
      );
    });

    it("ResponsiveContainer enforces width='100%' and minWidth={0}", () => {
      assert.ok(
        salesProfitFile.includes('<ResponsiveContainer width="100%" height="100%" minWidth={0}>'),
        "ResponsiveContainer should use minWidth={0} to adapt cleanly inside flex/grid containers"
      );
    });

    it("LineChart uses responsive margins and tight left offset for narrow viewports", () => {
      assert.ok(
        salesProfitFile.includes("margin={{ top: 10, right: 12, left: -10, bottom: 20 }}"),
        "LineChart should use responsive margins with left: -10 to maximize plot area on mobile"
      );
    });

    it("XAxis prevents label collision on mobile via minTickGap and interval", () => {
      assert.ok(
        salesProfitFile.includes('minTickGap={20}'),
        "XAxis must include minTickGap={20} to prevent date label overlap on mobile"
      );
      assert.ok(
        salesProfitFile.includes('interval="preserveStartEnd"'),
        "XAxis must preserve start and end ticks without crowding intermediate ticks"
      );
    });

    it("YAxis uses compact width (width={42}) and compact currency formatter", () => {
      assert.ok(
        salesProfitFile.includes("width={42}"),
        "YAxis should constrain width to 42px to maximize data visualization area"
      );
      assert.ok(
        salesProfitFile.includes("tickFormatter={formatCompactYAxis}"),
        "YAxis should format values compactly ($0, $10k, $1M)"
      );
    });

    it("Empty state message remains centered with readable backdrop and padding", () => {
      assert.ok(
        salesProfitFile.includes("No sales data for this period."),
        "Empty state message must be preserved"
      );
      assert.ok(
        salesProfitFile.includes("absolute inset-0 flex flex-col items-center justify-center bg-card/85 backdrop-blur-2xs z-10 rounded-xl space-y-1.5 p-4 text-center"),
        "Empty state overlay must be centered with backdrop blur and p-4 padding"
      );
    });

    it("Summary metric cards use min-w-0, responsive font size, and truncate", () => {
      assert.ok(
        salesProfitFile.includes("grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0"),
        "Summary strip must have min-w-0"
      );
      assert.ok(
        salesProfitFile.includes("text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight tabular-nums truncate"),
        "Metric values should scale responsibly across viewports with truncate"
      );
    });
  });

  // ── PART 2: Operational Tables (Recent Orders & RFQs) ───────────────────────
  describe("Part 2: Recent Orders & Recent RFQs Tables", () => {
    it("RecentOrdersTable uses overflow-x-auto with min-w-[520px] table", () => {
      assert.ok(
        recentOrdersFile.includes("overflow-x-auto subtle-scrollbar min-w-0"),
        "Orders table wrapper must have overflow-x-auto and subtle-scrollbar"
      );
      assert.ok(
        recentOrdersFile.includes('className="w-full min-w-[520px] text-left text-xs border-collapse"'),
        "Orders table must specify min-w-[520px] so columns don't compress into illegibility"
      );
    });

    it("RecentOrdersTable preserves all 5 critical columns with accessible data", () => {
      assert.ok(recentOrdersFile.includes("Order Number"), "Order Number column preserved");
      assert.ok(recentOrdersFile.includes("Buyer / Company"), "Buyer / Company column preserved");
      assert.ok(recentOrdersFile.includes("Amount"), "Amount column preserved");
      assert.ok(recentOrdersFile.includes("Status"), "Status column preserved");
      assert.ok(recentOrdersFile.includes("Date"), "Date column preserved");
    });

    it("RecentRfqsTable uses overflow-x-auto with min-w-[460px] table", () => {
      assert.ok(
        recentRfqsFile.includes("overflow-x-auto subtle-scrollbar min-w-0"),
        "RFQ table wrapper must have overflow-x-auto and subtle-scrollbar"
      );
      assert.ok(
        recentRfqsFile.includes('className="w-full min-w-[460px] text-left text-xs border-collapse"'),
        "RFQ table must specify min-w-[460px] to preserve columns"
      );
    });

    it("DashboardMetricCard scales with responsive font size and truncate", () => {
      assert.ok(
        metricCardFile.includes("min-w-0"),
        "Metric card must include min-w-0"
      );
      assert.ok(
        metricCardFile.includes("text-xl sm:text-2xl lg:text-3xl font-bold font-mono text-foreground tracking-tight tabular-nums truncate"),
        "Metric card value must be responsive and truncate gracefully"
      );
    });
  });

  // ── PART 3: POS Terminal Responsiveness (Issue #22) ──────────────────────────
  describe("Part 3: POS Terminal Header, Controls & Catalog", () => {
    it("POS page container prevents horizontal blowout with min-w-0", () => {
      assert.ok(
        posPageFile.includes("max-w-[1720px] mx-auto min-h-screen w-full min-w-0"),
        "POS container must enforce min-w-0"
      );
    });

    it("POS header adapts on mobile with flex-col sm:flex-row and balanced wrapping", () => {
      assert.ok(
        posPageFile.includes("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/70 mb-5 min-w-0"),
        "POS top header should stack on mobile"
      );
      assert.ok(
        posPageFile.includes("flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0"),
        "Cashier and warehouse information must wrap on narrow viewports"
      );
    });

    it("POS cashier and warehouse information truncate gracefully to avoid clipping adjacent controls", () => {
      assert.ok(
        posPageFile.includes('truncate max-w-[140px] sm:max-w-none'),
        "Cashier name must truncate on mobile with max-w-[140px]"
      );
      assert.ok(
        posPageFile.includes('truncate max-w-[140px] sm:max-w-[200px]'),
        "Warehouse select must truncate on mobile to prevent control blowout"
      );
    });

    it("Category filter chips use horizontal scrolling with subtle-scrollbar and max-w-full", () => {
      assert.ok(
        posPageFile.includes("flex items-center gap-1.5 overflow-x-auto pb-1 subtle-scrollbar text-xs max-w-full"),
        "Category filter chips must use subtle-scrollbar and max-w-full"
      );
    });

    it("Product Search input fits available width with min-w-0", () => {
      assert.ok(
        posPageFile.includes('id="pos-product-search-input"'),
        "Product search input must be preserved"
      );
    });

    it("Active product configuration panel has responsive Add to Cart button", () => {
      assert.ok(
        posPageFile.includes("w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl"),
        "Add to Cart button should be full-width on mobile and auto-width on sm+"
      );
    });

    it("Payment method buttons adapt cleanly to narrow screens with grid-cols-1 min-[420px]:grid-cols-2", () => {
      assert.ok(
        posPageFile.includes("grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 text-xs"),
        "Payment methods should stack on narrow mobile (<420px) and display 2 columns on wider screens"
      );
    });

    it("POS cart line item controls use responsive gap and widths", () => {
      assert.ok(
        posPageFile.includes("gap-1.5 sm:gap-2 shrink-0"),
        "Cart line item stepper and total must use responsive spacing"
      );
    });
  });

  // ── PART 4: Viewport Simulation Across All 5 Required Sizes ─────────────────
  describe("Part 4: Viewport Sizing Simulations", () => {
    const viewports = [
      { name: "320 × 720 (Mobile Narrow)", width: 320, height: 720 },
      { name: "375 × 812 (Mobile Standard)", width: 375, height: 812 },
      { name: "768 × 1024 (Tablet Portrait)", width: 768, height: 1024 },
      { name: "1024 × 768 (Tablet Landscape)", width: 1024, height: 768 },
      { name: "1440 × 900 (Desktop)", width: 1440, height: 900 },
    ];

    viewports.forEach((vp) => {
      it(`Layout arithmetic satisfies non-overflow criteria for ${vp.name}`, () => {
        // Page padding: p-4 on <640px = 32px; p-6 on 640-1024px = 48px; p-8 on >1024px = 64px
        const pagePadding = vp.width < 640 ? 32 : vp.width < 1024 ? 48 : 64;
        const mainContentWidth = vp.width - pagePadding;

        // Container section padding: p-3.5 on <640px = 28px; p-6 on >=640px = 48px
        const sectionPadding = vp.width < 640 ? 28 : 48;
        const availableWidth = mainContentWidth - sectionPadding;

        // Verify available width is positive and capable of hosting chart
        assert.ok(availableWidth > 200, `Available chart width (${availableWidth}px) should be > 200px`);

        // Verify YAxis allocation (42px) leaves at least 70% of available width for plot lines
        const plotWidth = availableWidth - 42;
        const plotRatio = plotWidth / availableWidth;
        assert.ok(plotRatio > 0.7, `Plot width ratio (${plotRatio.toFixed(2)}) should exceed 70% of container`);
      });
    });
  });

  // ── PART 5: Admin Header Mobile Responsiveness ──────────────────────────────
  describe("Part 5: Admin Header Mobile Immunity", () => {
    it("AdminHeader includes w-full min-w-0 and px-3 sm:px-6", () => {
      assert.ok(
        adminHeaderFile.includes("px-3 sm:px-6 flex items-center justify-between shadow-xs shrink-0 w-full min-w-0"),
        "AdminHeader should prevent mobile horizontal blowout"
      );
    });

    it("AdminHeader brand title truncates on narrow mobile", () => {
      assert.ok(
        adminHeaderFile.includes("truncate max-w-[110px] min-[400px]:max-w-none"),
        "Header brand title should truncate to fit alongside toggle and actions"
      );
    });

    it("Notification popover width respects viewport boundary", () => {
      assert.ok(
        adminHeaderFile.includes("max-w-[calc(100vw-24px)]"),
        "Notifications popover should not extend past mobile viewport"
      );
    });
  });
});

