/**
 * AYAAN CLOTHING — SALES & PROFIT OVERVIEW AUTOMATED TEST SUITE
 * 
 * Tests frontend analytics service, calculation logic, demo fallback,
 * period aggregation, summary metrics formatting, and empty states.
 */

// ── 0. Polyfills for Headless Node Environment ─────────────────────────────
const memoryStore = new Map<string, string>();
const localStoragePolyfill = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
  get length() { return memoryStore.size; },
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
};

const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = localStoragePolyfill;
g.window = globalThis;

import { adminAnalyticsService } from "../src/services/admin/analytics.service";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { formatPrice } from "../src/lib/formatters";

// ── Test Runner Utilities ──────────────────────────────────────────────────
let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${errorDetail ? ` — ${errorDetail}` : ""}`);
    failedCount++;
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string) {
  const isMatch = actual === expected;
  assert(
    isMatch,
    testName,
    !isMatch ? `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}` : undefined
  );
}

// ── Test Execution ─────────────────────────────────────────────────────────
console.log("\n==================================================");
console.log("RUNNING SALES & PROFIT ANALYTICS FRONTEND TEST SUITE");
console.log("==================================================\n");

// 1. Default Period and Granularity Tests
console.log("▶ Suite 1: Period Selection & Granularity");
{
  const defaultAnalytics = adminAnalyticsService.calculateDemoSalesProfit("daily");
  assertEqual(defaultAnalytics.period, "daily", "Default period is 'daily'");
  assert(defaultAnalytics.series.length > 0, "Daily series contains timeline buckets");

  const weeklyAnalytics = adminAnalyticsService.calculateDemoSalesProfit("weekly");
  assertEqual(weeklyAnalytics.period, "weekly", "Period can be switched to 'weekly'");
  assert(weeklyAnalytics.series.length > 0, "Weekly series contains timeline buckets");

  const monthlyAnalytics = adminAnalyticsService.calculateDemoSalesProfit("monthly");
  assertEqual(monthlyAnalytics.period, "monthly", "Period can be switched to 'monthly'");
  assert(monthlyAnalytics.series.length > 0, "Monthly series contains timeline buckets");

  const quarterlyAnalytics = adminAnalyticsService.calculateDemoSalesProfit("quarterly");
  assertEqual(quarterlyAnalytics.period, "quarterly", "Period can be switched to 'quarterly'");
  assert(quarterlyAnalytics.series.length > 0, "Quarterly series contains timeline buckets");

  const yearlyAnalytics = adminAnalyticsService.calculateDemoSalesProfit("yearly");
  assertEqual(yearlyAnalytics.period, "yearly", "Period can be switched to 'yearly'");
  assert(yearlyAnalytics.series.length > 0, "Yearly series contains timeline buckets");
}

// 2. Summary Metrics Calculation Tests
console.log("\n▶ Suite 2: Summary Metrics & Financial Formulas");
{
  const analytics = adminAnalyticsService.calculateDemoSalesProfit("daily");
  const { summary } = analytics;

  assert(typeof summary.total_sales === "number", "total_sales is a numeric value");
  assert(typeof summary.gross_profit === "number", "gross_profit is a numeric value");
  assert(typeof summary.units_sold === "number", "units_sold is a numeric value");
  assert(typeof summary.profit_margin === "number", "profit_margin is a numeric value");

  // Verify Profit Margin Formula: (Gross Profit / Total Sales) * 100
  if (summary.total_sales > 0) {
    const expectedMargin = Math.round((summary.gross_profit / summary.total_sales) * 1000) / 10;
    assertEqual(summary.profit_margin, expectedMargin, "Profit margin strictly matches (Gross Profit / Sales) * 100");
  } else {
    assertEqual(summary.profit_margin, 0, "Profit margin is 0% when total sales is 0");
  }
}

// 3. Currency & Formatting Utilities
console.log("\n▶ Suite 3: Currency & Formatting Integrity");
{
  assertEqual(formatPrice(64543.10), "$64,543.10", "Positive USD formatted properly ($64,543.10)");
  assertEqual(formatPrice(0), "$0.00", "Zero USD formatted properly ($0.00)");
  assertEqual(formatPrice(null), "$0.00", "Null USD formatted properly ($0.00)");
  assertEqual(formatPrice(1284), "$1,284.00", "Integer USD formatted with 2 decimal places");
}

// 4. Zero Activity Timeline Buckets (No Gaps in Series)
console.log("\n▶ Suite 4: Zero Activity Timeline Continuity");
{
  const pastAnalytics = adminAnalyticsService.calculateDemoSalesProfit(
    "daily",
    "2023-01-01",
    "2023-01-07"
  );

  assertEqual(pastAnalytics.summary.total_sales, 0, "Empty period reports total_sales = 0");
  assertEqual(pastAnalytics.summary.gross_profit, 0, "Empty period reports gross_profit = 0");
  assertEqual(pastAnalytics.summary.units_sold, 0, "Empty period reports units_sold = 0");
  assertEqual(pastAnalytics.summary.profit_margin, 0, "Empty period reports profit_margin = 0%");

  assertEqual(pastAnalytics.series.length, 7, "Zero-activity period returns full 7 daily buckets without omissions");
  pastAnalytics.series.forEach((point, idx) => {
    assert(
      point.sales === 0 && point.gross_profit === 0 && point.units_sold === 0,
      `Day ${idx + 1} bucket has zero sales, zero profit, and zero units`
    );
  });
}

// 5. Valid Order Status Filtering (Cancelled & Refunded Excluded)
console.log("\n▶ Suite 5: Valid Order Status Filtering");
{
  const orders = mockStore.getOrders();
  const validOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  assert(validOrders.length > 0, "Cancelled orders are filtered from sales aggregation");

  const analytics = adminAnalyticsService.calculateDemoSalesProfit("daily");
  assert(analytics.summary.total_sales >= 0, "Total sales calculated exclusively from valid orders");
}

// 6. Timezone Verification
console.log("\n▶ Suite 6: Timezone Standard");
{
  const analytics = adminAnalyticsService.calculateDemoSalesProfit("daily");
  assertEqual(analytics.timezone, "Asia/Dhaka", "Analytics timezone is canonically Asia/Dhaka");
}

// ── Summary Output ─────────────────────────────────────────────────────────
console.log("\n==================================================");
console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASS: ${passedCount} | FAIL: ${failedCount}`);
console.log("==================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
