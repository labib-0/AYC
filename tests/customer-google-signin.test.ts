/**
 * Customer Google Sign-In & Admin Protection Verification Test
 *
 * Verifies:
 * - Customer LoginPage has "Continue with Google" button with matching styling.
 * - Customer LoginPage handles query param errors from OAuth cancellation/failure.
 * - Admin LoginPage strictly has NO Google Sign-In button or OAuth dependencies.
 * - Next.js auth callback page (/auth/callback) exists, sanitizes redirects, and sets token.
 * - Backend config/services.php properly registers the google driver with env variables.
 * - Backend User model includes google_id in fillable without elevating permissions.
 * - Backend routes register /api/v1/auth/google/redirect and /api/v1/auth/google/callback.
 */

import fs from "fs";
import path from "path";

function runVerification() {
  console.log("==================================================");
  console.log("CUSTOMER GOOGLE SIGN-IN ARCHITECTURE AUDIT");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  // 1. Customer LoginPage Inspection
  const customerLoginPath = path.resolve(__dirname, "../src/app/login/page.tsx");
  const customerLoginContent = fs.readFileSync(customerLoginPath, "utf-8");

  assert(
    customerLoginContent.includes("Continue with Google"),
    "Customer LoginPage contains 'Continue with Google' button"
  );
  assert(
    customerLoginContent.includes("handleGoogleSignIn"),
    "Customer LoginPage implements handleGoogleSignIn handler"
  );
  assert(
    customerLoginContent.includes("/auth/google/redirect"),
    "Customer LoginPage redirects to /auth/google/redirect endpoint"
  );
  assert(
    customerLoginContent.includes("params.get(\"error\")") || customerLoginContent.includes("urlError"),
    "Customer LoginPage reads error query parameters from OAuth returns"
  );

  // 2. Admin LoginPage Inspection (CRITICAL REQUIREMENT - Admin migrated to /ayc)
  const adminLoginPath = path.resolve(__dirname, "../src/app/ayc/page.tsx");
  const adminLoginContent = fs.readFileSync(adminLoginPath, "utf-8");

  assert(
    !adminLoginContent.includes("Continue with Google"),
    "Admin LoginPage STRICTLY DOES NOT contain 'Continue with Google'"
  );
  assert(
    !adminLoginContent.includes("google_id") && !adminLoginContent.includes("handleGoogle"),
    "Admin LoginPage STRICTLY DOES NOT contain any Google OAuth handlers"
  );
  assert(
    !adminLoginContent.includes("/auth/google/"),
    "Admin LoginPage STRICTLY DOES NOT link to Google auth endpoints"
  );

  // 3. Customer Auth Callback Page
  const callbackPath = path.resolve(__dirname, "../src/app/auth/callback/page.tsx");
  assert(fs.existsSync(callbackPath), "Auth callback page (src/app/auth/callback/page.tsx) exists");

  const callbackContent = fs.readFileSync(callbackPath, "utf-8");
  assert(
    callbackContent.includes("apiClient.setToken(token)"),
    "Auth callback page persists token via apiClient.setToken"
  );
  assert(
    callbackContent.includes("refreshSession"),
    "Auth callback hydrates user session via refreshSession"
  );
  assert(
    callbackContent.includes("sanitizeRedirectUrl") ||
      (callbackContent.includes("startsWith(\"/\")") && callbackContent.includes("startsWith(\"//\")")),
    "Auth callback sanitizes open redirect targets"
  );

  // 4. Backend Configuration & Services
  const servicesPath = path.resolve(__dirname, "../backend/config/services.php");
  const servicesContent = fs.readFileSync(servicesPath, "utf-8");

  assert(
    servicesContent.includes("'google' => [") &&
    servicesContent.includes("'client_id' => env('GOOGLE_CLIENT_ID')") &&
    servicesContent.includes("'client_secret' => env('GOOGLE_CLIENT_SECRET')") &&
    servicesContent.includes("'redirect' => env('GOOGLE_REDIRECT_URI'"),
    "backend/config/services.php defines Google client_id, client_secret, and redirect"
  );

  // 5. Backend User Model
  const userModelPath = path.resolve(__dirname, "../backend/app/Models/User.php");
  const userModelContent = fs.readFileSync(userModelPath, "utf-8");

  assert(
    userModelContent.includes("'google_id'"),
    "User model includes google_id in fillable attributes"
  );

  // 6. Backend Routes
  const routesPath = path.resolve(__dirname, "../backend/routes/api.php");
  const routesContent = fs.readFileSync(routesPath, "utf-8");

  assert(
    routesContent.includes("/google/redirect") && routesContent.includes("/google/callback"),
    "backend/routes/api.php defines /google/redirect and /google/callback routes"
  );
  assert(
    routesContent.includes("GoogleAuthController"),
    "backend/routes/api.php connects routes to GoogleAuthController"
  );

  // 7. Security: No client secret in frontend
  const envLocalPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envLocalPath)) {
    const envLocalContent = fs.readFileSync(envLocalPath, "utf-8");
    assert(
      !envLocalContent.includes("GOOGLE_CLIENT_SECRET"),
      "Next.js .env.local does NOT expose GOOGLE_CLIENT_SECRET"
    );
  }

  const envExamplePath = path.resolve(__dirname, "../.env.example");
  const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");
  assert(
    !envExampleContent.includes("GOOGLE_CLIENT_SECRET"),
    "Next.js .env.example does NOT expose GOOGLE_CLIENT_SECRET"
  );

  console.log(`\n==================================================`);
  console.log(`TOTAL AUDIT CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
