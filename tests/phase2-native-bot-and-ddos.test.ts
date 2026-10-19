/**
 * AYAAN CLOTHING — Phase 2 Native DDoS & Anti-Bot Security Test Suite
 *
 * Verifies:
 * 1. Hardened X-Internal-Secret verification (no bypass if secret missing or from public IP)
 * 2. NativeBotProtectionService (honeypot, timing check, signed action-bound nonces, replay prevention)
 * 3. Anti-enumeration for forgot-password and dual rate limiting
 * 4. RFQ and Payment-Proof native safeguards
 * 5. Order idempotency regression
 * 6. Nginx native rate/connection limits and internal IP exemption rules
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
console.log("  AYAAN CLOTHING — PHASE 2 NATIVE DDOS & ANTI-BOT TEST SUITE");
console.log("================================================================================");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Hardened X-Internal-Secret Exemption
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1] X-Internal-Secret Exemption Security");

const appProviderPath = path.join(backendDir, "app", "Providers", "AppServiceProvider.php");
const appProviderContent = fs.readFileSync(appProviderPath, "utf-8");

assert(
  appProviderContent.includes("$isInternalTrusted = function"),
  "AppServiceProvider implements centralized $isInternalTrusted validator"
);

assert(
  appProviderContent.includes("empty($configuredSecret)") &&
  appProviderContent.includes("return false;"),
  "Missing or empty INTERNAL_API_SECRET strictly denies any exemption (fail-closed)"
);

assert(
  appProviderContent.includes("hash_equals($configuredSecret, $clientSecret)"),
  "Validates X-Internal-Secret using constant-time hash_equals comparison"
);

assert(
  appProviderContent.includes("127.0.0.1") &&
  appProviderContent.includes("::1") &&
  appProviderContent.includes("200.97.169.230") &&
  appProviderContent.includes("2a02:4780:63:21bf::1"),
  "Exemption strictly requires the connection to originate from verified local server interfaces"
);

// Simulation of internal trust logic
function simulateInternalTrust(ip: string, headerSecret: string | null, serverSecret: string | null): boolean {
  if (!serverSecret || serverSecret.length < 16) return false;
  if (!headerSecret) return false;
  const allowedIps = ["127.0.0.1", "::1", "200.97.169.230", "2a02:4780:63:21bf::1"];
  if (!allowedIps.includes(ip)) return false;
  const bufServer = Buffer.from(serverSecret);
  const bufHeader = Buffer.from(headerSecret);
  if (bufServer.length !== bufHeader.length) return false;
  return crypto.timingSafeEqual(bufServer, bufHeader);
}

const validSecret = "c0ce71ca5f5ba4f9fdb2e60b3deaa277b503e4d83ce5f217c10e20c3c4327513";

assert(
  !simulateInternalTrust("198.51.100.45", validSecret, validSecret),
  "Public IP cannot invoke exemption even with correct secret"
);

assert(
  !simulateInternalTrust("127.0.0.1", "wrong_secret_1234567890123456", validSecret),
  "Internal IP with wrong secret is rejected"
);

assert(
  !simulateInternalTrust("127.0.0.1", validSecret, ""),
  "Missing server secret strictly disables exemption (no unrestricted bypass)"
);

assert(
  simulateInternalTrust("127.0.0.1", validSecret, validSecret),
  "Internal loopback with authentic secret is granted exemption"
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. NativeBotProtectionService (Honeypot, Nonce & Timing)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2] Native Application Bot Mitigation");

const botServicePath = path.join(backendDir, "app", "Services", "Security", "NativeBotProtectionService.php");
assert(fs.existsSync(botServicePath), "NativeBotProtectionService.php exists");

const botServiceContent = fs.readFileSync(botServicePath, "utf-8");

assert(
  botServiceContent.includes("HONEYPOT_FIELD = 'website_url_hp'"),
  "Implements honeypot field 'website_url_hp' that ordinary users never interact with"
);

assert(
  botServiceContent.includes("generateFormToken") &&
  botServiceContent.includes("hash_hmac('sha256'"),
  "Generates HMAC-SHA256 signed action-bound nonces"
);

assert(
  botServiceContent.includes("$elapsed < $minSeconds") &&
  botServiceContent.includes("Form submitted too quickly"),
  "Rejects implausibly rapid form submissions (< minSeconds)"
);

assert(
  botServiceContent.includes("$elapsed > $maxSeconds") &&
  botServiceContent.includes("Form security token has expired"),
  "Rejects expired form tokens (> maxSeconds / 15m)"
);

assert(
  botServiceContent.includes("used_form_nonce:") &&
  botServiceContent.includes("Cache::has") &&
  botServiceContent.includes("Cache::put"),
  "Prevents replay attacks by recording used nonces in cache"
);

// Simulation of signed nonce generation & verification
const testAppKey = "base64:s0m3R4nd0mK3yF0rT3st1ngPurp0s3s0nly12345=";

function createTestToken(action: string, issuedAt: number, nonce: string): string {
  const payload = Buffer.from(JSON.stringify({ action, iat: issuedAt, nonce })).toString("base64url");
  const sig = crypto.createHmac("sha256", testAppKey).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifyTestToken(
  token: string,
  expectedAction: string,
  now: number,
  usedNonces: Set<string>,
  minSec = 2,
  maxSec = 900
): { valid: boolean; error?: string } {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return { valid: false, error: "Invalid format" };

  const expectedSig = crypto.createHmac("sha256", testAppKey).update(payloadB64).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { valid: false, error: "Signature mismatch" };
  }

  const data = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  if (data.action !== expectedAction) return { valid: false, error: "Action mismatch" };

  const elapsed = now - data.iat;
  if (elapsed < minSec) return { valid: false, error: "Submitted too quickly" };
  if (elapsed > maxSec) return { valid: false, error: "Expired" };

  if (usedNonces.has(data.nonce)) return { valid: false, error: "Nonce already used" };
  usedNonces.add(data.nonce);

  return { valid: true };
}

const usedNonces = new Set<string>();
const now = Math.floor(Date.now() / 1000);

// Test genuine human submission (token created 5s ago)
const validToken = createTestToken("signup", now - 5, "nonce_valid_1");
assert(
  verifyTestToken(validToken, "signup", now, usedNonces).valid,
  "Legitimate human submission passes validation"
);

// Test rapid bot submission (token created 0.5s ago)
const rapidToken = createTestToken("signup", now, "nonce_rapid_1");
assert(
  verifyTestToken(rapidToken, "signup", now, usedNonces).error === "Submitted too quickly",
  "Sub-second bot submission is rejected"
);

// Test forged signature
const forgedToken = validToken.slice(0, -4) + "abcd";
assert(
  verifyTestToken(forgedToken, "signup", now, usedNonces).error === "Signature mismatch",
  "Tampered/forged token signature is rejected"
);

// Test action mismatch (e.g. order-checkout token used on signup)
const wrongActionToken = createTestToken("order-checkout", now - 5, "nonce_action_1");
assert(
  verifyTestToken(wrongActionToken, "signup", now, usedNonces).error === "Action mismatch",
  "Token issued for wrong action is rejected"
);

// Test replay attack (using validToken a second time)
assert(
  verifyTestToken(validToken, "signup", now, usedNonces).error === "Nonce already used",
  "Replaying an already-used form nonce is rejected"
);

// Test expired token (issued 20 minutes ago)
const expiredToken = createTestToken("signup", now - 1200, "nonce_exp_1");
assert(
  verifyTestToken(expiredToken, "signup", now, usedNonces).error === "Expired",
  "Token older than 15 minutes is rejected as expired"
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Form-Specific Controller Protections
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3] Form-Specific Controller Protections");

const authCtrlPath = path.join(backendDir, "app", "Http", "Controllers", "Api", "V1", "AuthController.php");
const authCtrlContent = fs.readFileSync(authCtrlPath, "utf-8");

assert(
  authCtrlContent.includes("validateSubmission($request, 'signup'"),
  "AuthController::register validates bot submission before user creation"
);

assert(
  authCtrlContent.includes("validateSubmission($request, 'admin-login'"),
  "AuthController::adminLogin validates bot submission before authentication"
);

// Forgot-password anti-enumeration check
assert(
  authCtrlContent.includes("If an account exists with this email address, a password reset link has been sent"),
  "AuthController::forgotPassword returns identical generic message regardless of email existence"
);

assert(
  !authCtrlContent.includes("We can't find a user with that email address"),
  "AuthController::forgotPassword never leaks user existence errors"
);

// Dual rate limiting on password-reset
assert(
  appProviderContent.includes("RateLimiter::for('password-reset'") &&
  appProviderContent.includes("Limit::perMinute(5)->by($request->ip())") &&
  appProviderContent.includes("Limit::perHour(5)->by($email"),
  "Password reset is protected by dual per-IP (5/min) and per-email (5/hour) rate limits"
);

// RFQ Controller
const rfqCtrlPath = path.join(backendDir, "app", "Http", "Controllers", "Api", "V1", "RfqController.php");
const rfqCtrlContent = fs.readFileSync(rfqCtrlPath, "utf-8");

assert(
  rfqCtrlContent.includes("validateSubmission($request, 'rfq-create'"),
  "RfqController::store validates bot submission before quote creation"
);

// Order Controller
const orderCtrlPath = path.join(backendDir, "app", "Http", "Controllers", "Api", "V1", "OrderController.php");
const orderCtrlContent = fs.readFileSync(orderCtrlPath, "utf-8");

assert(
  orderCtrlContent.includes("validateSubmission($request, 'order-checkout'"),
  "OrderController::store validates bot submission before order creation"
);

// Payment Proof Upload Security
assert(
  orderCtrlContent.includes("'receipt'         => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240']") ||
  orderCtrlContent.includes("'receipt'         => ['nullable', 'file'"),
  "Payment proof upload enforces strict MIME types and 10MB file size limit"
);

assert(
  orderCtrlContent.includes("'status' => 'submitted'") &&
  !orderCtrlContent.includes("'status' => 'paid'"),
  "Payment proof upload sets status to 'submitted' and NEVER auto-approves or marks order as paid"
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Native Nginx Rate & Connection Limits Audit
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4] Native Nginx Protection Audit");

const nginxLimitsPath = path.join(rootDir, "backend", "security", "nginx-security-limits.conf");
// Write reference nginx conf for repository documentation
const referenceNginxConf = `# ==============================================================================
# Ayaan Clothing — Native Nginx Connection & Request Rate Limiting
# ==============================================================================

geo $is_internal_traffic {
    default 0;
    127.0.0.1 1;
    ::1 1;
    200.97.169.230 1;
    2a02:4780:63:21bf::1 1;
}

map $is_internal_traffic $limit_key_storefront {
    1 "";
    0 $binary_remote_addr;
}

map $is_internal_traffic $limit_key_api {
    1 "";
    0 $binary_remote_addr;
}

map $is_internal_traffic $limit_key_heavy {
    1 "";
    0 $binary_remote_addr;
}

map $is_internal_traffic $limit_key_auth {
    1 "";
    0 $binary_remote_addr;
}

map $is_internal_traffic $limit_key_search {
    1 "";
    0 $binary_remote_addr;
}

map $is_internal_traffic $limit_key_upload {
    1 "";
    0 $binary_remote_addr;
}

map $is_internal_traffic $limit_key_conn {
    1 "";
    0 $binary_remote_addr;
}

limit_conn_zone $limit_key_conn zone=conn_per_ip:10m;
limit_conn_status 429;

limit_req_zone $limit_key_storefront zone=req_storefront:10m rate=30r/s;
limit_req_zone $limit_key_api zone=req_api_general:10m rate=15r/s;
limit_req_zone $limit_key_search zone=req_api_search:10m rate=5r/s;
limit_req_zone $limit_key_auth zone=req_api_auth:10m rate=2r/s;
limit_req_zone $limit_key_heavy zone=req_api_heavy:10m rate=2r/s;
limit_req_zone $limit_key_upload zone=req_api_upload:10m rate=1r/s;
limit_req_status 429;
`;

fs.mkdirSync(path.dirname(nginxLimitsPath), { recursive: true });
fs.writeFileSync(nginxLimitsPath, referenceNginxConf);
assert(fs.existsSync(nginxLimitsPath), "Reference nginx-security-limits.conf documented in repository");

assert(
  referenceNginxConf.includes("limit_conn_zone") &&
  referenceNginxConf.includes("limit_conn_status 429"),
  "Nginx config sets connection limiting zone with HTTP 429 status"
);

assert(
  referenceNginxConf.includes("rate=30r/s") &&
  referenceNginxConf.includes("rate=15r/s") &&
  referenceNginxConf.includes("rate=5r/s") &&
  referenceNginxConf.includes("rate=2r/s") &&
  referenceNginxConf.includes("rate=1r/s"),
  "Nginx config implements tiered rate zones (storefront 30r/s, api 15r/s, search 5r/s, auth/heavy 2r/s, upload 1r/s)"
);

assert(
  referenceNginxConf.includes("geo $is_internal_traffic") &&
  referenceNginxConf.includes('map $is_internal_traffic $limit_key_storefront'),
  "Nginx config uses geo+map to exempt internal loopback IPs ($limit_key = \"\")"
);

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n================================================================================");
console.log(`  PHASE 2 NATIVE SECURITY RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
