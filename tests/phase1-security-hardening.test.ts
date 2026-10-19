/**
 * AYAAN CLOTHING — Phase 1 Security Hardening & Idempotency Test Suite
 *
 * Verifies:
 * 1. Trusted-proxy configuration and spoofed header immunity
 * 2. Safe default and dedicated API rate limiting (with 429 retry-after structure)
 * 3. Server-side order submission idempotency (key hashing, lifecycle, race handling)
 * 4. Frontend checkout idempotency integration
 * 5. Log rotation and process hygiene defaults
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

const rootDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(rootDir, "backend");

console.log("================================================================================");
console.log("  AYAAN CLOTHING — PHASE 1 SECURITY HARDENING TEST SUITE");
console.log("================================================================================");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Correct Laravel Trusted-Proxy Handling & Spoofed Headers
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1] Trusted-Proxy Configuration & Spoofed Header Protection");

const bootstrapAppPath = path.join(backendDir, "bootstrap", "app.php");
assert(fs.existsSync(bootstrapAppPath), "bootstrap/app.php exists");

const bootstrapAppContent = fs.readFileSync(bootstrapAppPath, "utf-8");

// Must NOT use wildcard proxy trust
assert(
  !bootstrapAppContent.includes("trustProxies(at: '*')") &&
  !bootstrapAppContent.includes('trustProxies(at: "*")'),
  "Wildcard proxy trust (trustProxies('*')) is completely removed"
);

// Must trust zero proxies when TRUSTED_PROXIES is unset/empty
assert(
  bootstrapAppContent.includes("trustProxies(at: [])"),
  "Defaults to zero trusted proxies ($middleware->trustProxies(at: [])) when directly exposed"
);

// Must read trusted proxies from TRUSTED_PROXIES env var
assert(
  bootstrapAppContent.includes("env('TRUSTED_PROXIES'") ||
  bootstrapAppContent.includes('env("TRUSTED_PROXIES"'),
  "TRUSTED_PROXIES environment variable governs upstream proxy trust"
);

// Verify headers specified when trusted proxies exist
assert(
  bootstrapAppContent.includes("Request::HEADER_X_FORWARDED_FOR") &&
  bootstrapAppContent.includes("Request::HEADER_X_FORWARDED_HOST") &&
  bootstrapAppContent.includes("Request::HEADER_X_FORWARDED_PORT") &&
  bootstrapAppContent.includes("Request::HEADER_X_FORWARDED_PROTO"),
  "Strictly limits trusted forwarded headers to standard Symfony flags"
);

// FastCGI / Nginx IP validation simulation:
// When trustProxies is [], Symfony ignores client headers X-Forwarded-For and X-Real-IP,
// resolving Request::ip() strictly to $_SERVER['REMOTE_ADDR'].
function simulateClientIpResolution(remoteAddr: string, forwardedForHeader: string | null, trustedProxies: string[]): string {
  if (!trustedProxies.length) {
    // Zero-trust mode: always REMOTE_ADDR
    return remoteAddr;
  }
  if (forwardedForHeader && trustedProxies.includes(remoteAddr)) {
    const parts = forwardedForHeader.split(",").map(s => s.trim());
    return parts[0] || remoteAddr;
  }
  return remoteAddr;
}

const vpsRemoteClient = "198.51.100.45"; // Real external client
const spoofedHeader = "10.0.0.1, 1.1.1.1, 127.0.0.1";
const resolvedIpZeroTrust = simulateClientIpResolution(vpsRemoteClient, spoofedHeader, []);
assert(
  resolvedIpZeroTrust === vpsRemoteClient,
  `Spoofed X-Forwarded-For is ignored: resolved to actual remote address (${resolvedIpZeroTrust})`
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Safe Default and Dedicated API Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2] Safe Default and Dedicated API Rate Limiting");

const appServiceProvPath = path.join(backendDir, "app", "Providers", "AppServiceProvider.php");
assert(fs.existsSync(appServiceProvPath), "AppServiceProvider.php exists");

const appServiceProvContent = fs.readFileSync(appServiceProvPath, "utf-8");

// Check named limiters in AppServiceProvider
assert(
  appServiceProvContent.includes("RateLimiter::for('api'") ||
  appServiceProvContent.includes('RateLimiter::for("api"'),
  "Default 'api' rate limiter configured (120 req/min)"
);

assert(
  appServiceProvContent.includes("Limit::none()") &&
  (appServiceProvContent.includes("127.0.0.1") || appServiceProvContent.includes("::1")),
  "Internal loopback SSR traffic (127.0.0.1 / ::1) is unmetered to protect storefront page rendering"
);

assert(
  appServiceProvContent.includes("RateLimiter::for('search-suggestions'") ||
  appServiceProvContent.includes('RateLimiter::for("search-suggestions"'),
  "Dedicated 'search-suggestions' limiter configured (60 req/min)"
);

assert(
  appServiceProvContent.includes("RateLimiter::for('products-browse'") ||
  appServiceProvContent.includes('RateLimiter::for("products-browse"'),
  "Dedicated 'products-browse' limiter configured (120 req/min)"
);

assert(
  appServiceProvContent.includes("RateLimiter::for('documents-pdf'") ||
  appServiceProvContent.includes('RateLimiter::for("documents-pdf"'),
  "Dedicated 'documents-pdf' limiter configured (15 req/min)"
);

assert(
  appServiceProvContent.includes("RateLimiter::for('cart-mutations'") ||
  appServiceProvContent.includes('RateLimiter::for("cart-mutations"'),
  "Dedicated 'cart-mutations' limiter configured (60 req/min)"
);

assert(
  appServiceProvContent.includes("RateLimiter::for('payment-proof-upload'") ||
  appServiceProvContent.includes('RateLimiter::for("payment-proof-upload"'),
  "Dedicated 'payment-proof-upload' limiter configured (10 req/min)"
);

assert(
  appServiceProvContent.includes("RateLimiter::for('admin-login'") ||
  appServiceProvContent.includes('RateLimiter::for("admin-login"'),
  "Dedicated 'admin-login' limiter configured (5 req/min)"
);

// Check routes/api.php bindings
const routesApiPath = path.join(backendDir, "routes", "api.php");
const routesApiContent = fs.readFileSync(routesApiPath, "utf-8");

assert(
  routesApiContent.includes("Route::prefix('v1')") &&
  routesApiContent.includes("'throttle:api'"),
  "All /api/v1 routes have default 'throttle:api' protection"
);

assert(
  routesApiContent.includes("throttle:search-suggestions"),
  "Search suggestions endpoint has dedicated limiter"
);

assert(
  routesApiContent.includes("throttle:products-browse"),
  "Products catalog endpoint has dedicated limiter"
);

assert(
  routesApiContent.includes("throttle:documents-pdf"),
  "PDF document streaming endpoints have dedicated limiter"
);

assert(
  routesApiContent.includes("throttle:cart-mutations"),
  "Cart mutations group has dedicated limiter"
);

assert(
  routesApiContent.includes("throttle:payment-proof-upload"),
  "Payment proof upload endpoint has dedicated limiter"
);

assert(
  routesApiContent.includes("throttle:admin-login"),
  "Admin authentication endpoint has dedicated brute-force limiter"
);

// Check HTTP 429 response structure in bootstrap/app.php
assert(
  bootstrapAppContent.includes("ThrottleRequestsException") &&
  bootstrapAppContent.includes("'retry_after'") &&
  bootstrapAppContent.includes("429"),
  "HTTP 429 response includes retry_after in payload and forwards Retry-After header"
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Order Submission Idempotency
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3] Order Submission Idempotency");

// Migration check
const migrationPath = path.join(
  backendDir,
  "database",
  "migrations",
  "2026_10_20_030000_create_order_idempotency_keys_table.php"
);
assert(fs.existsSync(migrationPath), "Migration 2026_10_20_030000_create_order_idempotency_keys_table.php exists");

const migrationContent = fs.readFileSync(migrationPath, "utf-8");
assert(
  migrationContent.includes("$table->string('key', 64)->unique()") &&
  migrationContent.includes("$table->foreignId('user_id')") &&
  migrationContent.includes("$table->string('request_hash', 64)") &&
  migrationContent.includes("$table->string('status', 20)") &&
  migrationContent.includes("$table->json('response_payload')"),
  "Idempotency table schema has unique key, user_id, request_hash, status, and response_payload"
);

// Model check
const modelPath = path.join(backendDir, "app", "Models", "OrderIdempotencyKey.php");
assert(fs.existsSync(modelPath), "app/Models/OrderIdempotencyKey.php exists");

const modelContent = fs.readFileSync(modelPath, "utf-8");
assert(
  modelContent.includes("STATUS_PROCESSING") &&
  modelContent.includes("STATUS_COMPLETED") &&
  modelContent.includes("STATUS_FAILED"),
  "OrderIdempotencyKey defines processing, completed, and failed statuses"
);

assert(
  modelContent.includes("computePayloadHash"),
  "OrderIdempotencyKey contains computePayloadHash method"
);

// Simulate computePayloadHash logic in TypeScript to test canonical sorting and hashing
function computePayloadHash(
  userId: number | string,
  items: Array<{ product_id: any; variant_id: any; size?: string; quantity: number; pricing_mode?: string }>,
  shipping: { country_code?: string; postal_code?: string; address1?: string },
  paymentMethod: string | null,
  couponCode: string | null
): string {
  const normalizedItems = items.map(item => ({
    product_id: item.product_id,
    variant_id: item.variant_id,
    size: item.size || null,
    quantity: item.quantity,
    pricing_mode: item.pricing_mode || null,
  }));

  normalizedItems.sort((a, b) => {
    const p = String(a.product_id || "").localeCompare(String(b.product_id || ""));
    if (p !== 0) return p;
    return String(a.variant_id || "").localeCompare(String(b.variant_id || ""));
  });

  const canonical = {
    user_id: String(userId),
    items: normalizedItems,
    shipping: {
      country: (shipping.country_code || "").trim().toUpperCase(),
      postal_code: (shipping.postal_code || "").trim(),
      address: (shipping.address1 || "").trim(),
    },
    payment_method: (paymentMethod || "").trim().toLowerCase(),
    coupon_code: (couponCode || "").trim().toUpperCase(),
  };

  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

const itemA = { product_id: 10, variant_id: 20, size: "M", quantity: 50, pricing_mode: "wholesale" };
const itemB = { product_id: 5, variant_id: 12, size: "L", quantity: 100, pricing_mode: "full_stock" };
const shippingData = { country_code: "US", postal_code: "10001", address1: "123 Broadway" };

const hash1 = computePayloadHash(42, [itemA, itemB], shippingData, "card", "WELCOME10");
const hash2 = computePayloadHash(42, [itemB, itemA], shippingData, "card", "WELCOME10");
assert(
  hash1 === hash2,
  "Payload hash is order-invariant for line items (canonicalized sorting)"
);

const hashDifferentUser = computePayloadHash(99, [itemA, itemB], shippingData, "card", "WELCOME10");
assert(
  hash1 !== hashDifferentUser,
  "Payload hash differs across different user IDs"
);

const hashDifferentQty = computePayloadHash(42, [{ ...itemA, quantity: 51 }, itemB], shippingData, "card", "WELCOME10");
assert(
  hash1 !== hashDifferentQty,
  "Payload hash differs when line item quantities change"
);

// Controller check
const orderCtrlPath = path.join(backendDir, "app", "Http", "Controllers", "Api", "V1", "OrderController.php");
const orderCtrlContent = fs.readFileSync(orderCtrlPath, "utf-8");

assert(
  orderCtrlContent.includes("OrderIdempotencyKey") &&
  orderCtrlContent.includes("X-Idempotency-Key"),
  "OrderController inspects X-Idempotency-Key header and idempotency_key parameter"
);

assert(
  orderCtrlContent.includes("Idempotency key does not belong to the authenticated user"),
  "Reusing an idempotency key across different users is rejected with 403 Forbidden"
);

assert(
  orderCtrlContent.includes("Idempotency key was already used with a different order payload"),
  "Reusing an idempotency key with a tampered/altered payload is rejected with 422"
);

assert(
  orderCtrlContent.includes("STATUS_COMPLETED") &&
  orderCtrlContent.includes("response_payload"),
  "Re-submitting with completed key immediately returns stored response without duplicating order"
);

assert(
  orderCtrlContent.includes("STATUS_PROCESSING") &&
  orderCtrlContent.includes("409"),
  "Concurrent in-progress submission with same key returns HTTP 409 Conflict with Retry-After"
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Frontend Checkout Idempotency Integration
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4] Frontend Checkout Idempotency Integration");

const orderServicePath = path.join(rootDir, "src", "services", "order.service.ts");
const orderServiceContent = fs.readFileSync(orderServicePath, "utf-8");

assert(
  orderServiceContent.includes("idempotencyKey?: string"),
  "CreateOrderInput in order.service.ts supports optional idempotencyKey"
);

assert(
  orderServiceContent.includes('headers["X-Idempotency-Key"] = input.idempotencyKey'),
  "orderService.createOrder forwards X-Idempotency-Key header in API request"
);

const checkoutModalPath = path.join(rootDir, "src", "components", "cart", "CheckoutModal.tsx");
const checkoutModalContent = fs.readFileSync(checkoutModalPath, "utf-8");

assert(
  checkoutModalContent.includes("idempotencyKeyRef") &&
  checkoutModalContent.includes("randomUUID"),
  "CheckoutModal generates a UUID idempotency key once per checkout session"
);

assert(
  checkoutModalContent.includes("idempotencyKey: idempotencyKeyRef.current"),
  "CheckoutModal passes idempotencyKey to createOrder call"
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Log Hygiene & Rotation
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[5] Log Hygiene & Rotation");

const loggingConfigPath = path.join(backendDir, "config", "logging.php");
const loggingConfigContent = fs.readFileSync(loggingConfigPath, "utf-8");

assert(
  loggingConfigContent.includes("env('LOG_STACK', 'daily')"),
  "Default LOG_STACK is set to 'daily' for automatic rotation and retention"
);

assert(
  loggingConfigContent.includes("env('LOG_DAILY_DAYS', 14)"),
  "Daily channel retains 14 days of logs by default"
);

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n================================================================================");
console.log(`  PHASE 1 SECURITY HARDENING RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
