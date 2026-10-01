/**
 * AYAAN CLOTHING — ADMIN DASHBOARD METRICS AUTOMATED TEST SUITE
 * 
 * Tests frontend AdminDashboardService, contract synchronization,
 * zero-state vs error distinguishing, and database metric mapping.
 */

// Headless polyfills
const memoryStore = new Map<string, string>();
const localStoragePolyfill = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
  get length() { return memoryStore.size; },
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
};

(globalThis as any).localStorage = localStoragePolyfill;
(globalThis as any).window = {
  location: {
    hostname: "localhost",
    port: "3001",
    protocol: "http:",
  },
  localStorage: localStoragePolyfill,
  dispatchEvent: () => true,
};

import { adminDashboardService } from "../src/services/admin/dashboard.service";
import { adminAnalyticsService } from "../src/services/admin/analytics.service";
import { setFrontendOnly } from "../src/lib/frontend-mode";
import { apiClient } from "../src/services/api-client";

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

async function runTests() {
  console.log("\n==================================================");
  console.log("RUNNING ADMIN DASHBOARD METRICS TEST SUITE");
  console.log("==================================================\n");

  // 1. Frontend-only / Demo mode metric calculation
  console.log("▶ Suite 1: Mock/Demo Mode Fallback Calculations");
  {
    setFrontendOnly(true);
    const metrics = await adminDashboardService.getMetrics();
    assert(typeof metrics.total_products === "number", "total_products is numeric");
    assert(typeof metrics.active_products === "number", "active_products is numeric");
    assertEqual(metrics.active_products, metrics.published_products, "published_products matches active_products");
    assert(typeof metrics.total_customers === "number", "total_customers is numeric");
    assert(typeof metrics.total_orders === "number", "total_orders is numeric");
    assert(typeof metrics.pending_orders === "number", "pending_orders is numeric");
    assert(typeof metrics.low_stock_items === "number", "low_stock_items is numeric");
    assertEqual(metrics.low_stock_items, metrics.low_stock_products, "low_stock_products matches low_stock_items");
  }

  // 2. Real API Mode: Errors are NOT swallowed into fake zeros
  console.log("\n▶ Suite 2: Error Propagation & No Silent Fake Zero Fallbacks");
  {
    setFrontendOnly(false);
    
    // Mock apiClient to simulate a 500 server error
    const originalGet = apiClient.get;
    apiClient.get = async () => {
      throw new Error("Server Database Connection Failed");
    };

    let errorCaught = false;
    try {
      await adminDashboardService.getMetrics();
    } catch (err: any) {
      errorCaught = true;
      assertEqual(err.message, "Server Database Connection Failed", "AdminDashboardService propagates backend error");
    }
    assert(errorCaught, "AdminDashboardService throws error on API failure when not in frontend-only mode");

    let analyticsErrorCaught = false;
    try {
      await adminAnalyticsService.getSalesProfit({ period: "daily" });
    } catch (err: any) {
      analyticsErrorCaught = true;
      assertEqual(err.message, "Server Database Connection Failed", "AdminAnalyticsService propagates backend error");
    }
    assert(analyticsErrorCaught, "AdminAnalyticsService throws error on API failure when not in frontend-only mode");

    // Restore apiClient.get
    apiClient.get = originalGet;
  }

  // 3. API Payload Parsing with unified aggregates
  console.log("\n▶ Suite 3: Authoritative Backend Payload Parsing");
  {
    const originalGet = apiClient.get;
    apiClient.get = async () => {
      return {
        data: {
          total_products: 42,
          active_products: 38,
          published_products: 38,
          total_customers: 15,
          total_orders: 8,
          pending_orders: 2,
          processing_orders: 3,
          delivered_orders: 3,
          revenue: 12500.50,
          low_stock_items: 4,
          low_stock_products: 4,
          sales: 12500.50,
          gross_profit: 4500.25,
          units_sold: 450,
          profit_margin: 36.0,
          chart: [{ label: "Oct 01", sales: 12500.50, gross_profit: 4500.25, units_sold: 450 }],
          recent_orders: [],
          recent_rfqs: [],
        },
      } as any;
    };

    const metrics = await adminDashboardService.getMetrics();
    assertEqual(metrics.total_products, 42, "total_products parsed correctly");
    assertEqual(metrics.active_products, 38, "active_products parsed correctly");
    assertEqual(metrics.published_products, 38, "published_products parsed correctly");
    assertEqual(metrics.total_customers, 15, "total_customers parsed correctly");
    assertEqual(metrics.total_orders, 8, "total_orders parsed correctly");
    assertEqual(metrics.pending_orders, 2, "pending_orders parsed correctly");
    assertEqual(metrics.low_stock_items, 4, "low_stock_items parsed correctly");
    assertEqual(metrics.low_stock_products, 4, "low_stock_products parsed correctly");
    assertEqual(metrics.sales, 12500.50, "sales parsed correctly");
    assertEqual(metrics.gross_profit, 4500.25, "gross_profit parsed correctly");
    assertEqual(metrics.units_sold, 450, "units_sold parsed correctly");
    assertEqual(metrics.profit_margin, 36.0, "profit_margin parsed correctly");
    assert(Array.isArray(metrics.chart) && metrics.chart.length === 1, "chart series parsed correctly");

    apiClient.get = originalGet;
  }

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASS: ${passedCount} | FAIL: ${failedCount}`);
  console.log("==================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
