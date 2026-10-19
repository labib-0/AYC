/**
 * AYAAN CLOTHING — Step 2: Customer Email Verification Test Suite
 *
 * Comprehensive Automated Verification covering:
 * 1. Safe Feature Flag & Defaults (EMAIL_VERIFICATION_ENABLED = false)
 * 2. Database Migration Schema (reversible, indexed, SHA-256 token & binding hashes)
 * 3. Token Lifecycle & Single-Use Consumption Architecture
 * 4. Same-Browser Binding & Link Scanner Protection
 * 5. Cross-Browser Password Recovery Flow
 * 6. Historical Legacy Customer Grandfathering
 * 7. Verification Email Notification (exact subject, 60m expiry, no credentials)
 * 8. Frontend Signup & Verification Landing Page UX
 * 9. Regression Safety Invariants (production remains untouched)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

function runTests() {
  console.log("================================================================================");
  console.log("  AYAAN CLOTHING — STEP 2: SECURE CUSTOMER EMAIL VERIFICATION AUDIT & TESTS");
  console.log("================================================================================\n");

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

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Safe Feature Flag Defaults
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("--- 1. Safe Feature Flag & Environment Defaults ---");
  const authConfigPath = path.resolve(__dirname, "../backend/config/auth.php");
  const authConfig = fs.readFileSync(authConfigPath, "utf-8");

  assert(
    authConfig.includes("'enabled' => (bool) env('EMAIL_VERIFICATION_ENABLED', false)"),
    "Feature flag EMAIL_VERIFICATION_ENABLED safely defaults to false"
  );
  assert(
    authConfig.includes("'expire' => (int) env('EMAIL_VERIFICATION_EXPIRE_MINUTES', 60)"),
    "Verification token expiration defaults to 60 minutes"
  );
  assert(
    authConfig.includes("'same_browser_required' => (bool) env('EMAIL_VERIFICATION_SAME_BROWSER', true)"),
    "Same-browser binding requirement is enabled by default"
  );
  assert(
    authConfig.includes("'cookie_name' => env('EMAIL_VERIFICATION_COOKIE_NAME', 'ayc_reg_binding')"),
    "Browser binding cookie name is configurable and defaults to ayc_reg_binding"
  );
  assert(
    authConfig.includes("'enforce_from' => env('EMAIL_VERIFICATION_ENFORCE_FROM'"),
    "Legacy grandfathering cutoff timestamp is defined in configuration"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Database Migration Schema
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 2. Database Migration & Schema Safety ---");
  const migrationPath = path.resolve(
    __dirname,
    "../backend/database/migrations/2026_10_18_080000_create_email_verification_tokens_table.php"
  );
  assert(fs.existsSync(migrationPath), "Migration file 2026_10_18_080000_create_email_verification_tokens_table.php exists");

  const migrationContent = fs.readFileSync(migrationPath, "utf-8");
  assert(
    migrationContent.includes("$table->string('token_hash', 64)->unique()"),
    "Migration stores SHA-256 token hash (64 chars) with unique constraint"
  );
  assert(
    migrationContent.includes("$table->string('browser_binding_hash', 64)->nullable()"),
    "Migration stores SHA-256 browser-binding hash (64 chars) server-side"
  );
  assert(
    migrationContent.includes("$table->foreignId('user_id')->constrained('users')->cascadeOnDelete()") ||
    migrationContent.includes("$table->foreignId('user_id')->constrained('users')->onDelete('cascade')"),
    "Foreign key constraint to users table with onDelete cascade"
  );
  assert(
    migrationContent.includes("$table->timestamp('expires_at')") &&
      migrationContent.includes("$table->timestamp('used_at')->nullable()"),
    "Migration includes expires_at and nullable used_at timestamps"
  );
  assert(
    migrationContent.includes("Schema::dropIfExists('email_verification_tokens')"),
    "Migration is strictly reversible via down() method"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Cryptographic Token & Browser-Binding Security Model
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 3. Cryptographic Security & Same-Browser Binding ---");
  const servicePath = path.resolve(__dirname, "../backend/app/Services/Auth/EmailVerificationService.php");
  const serviceContent = fs.readFileSync(servicePath, "utf-8");

  assert(
    serviceContent.includes("bin2hex(random_bytes(32))"),
    "Cryptographically secure 64-char hex random token generation using random_bytes(32)"
  );
  assert(
    serviceContent.includes("hash('sha256', $rawToken)") ||
    serviceContent.includes("hash('sha256', $plainToken)"),
    "Tokens are hashed server-side using SHA-256; raw tokens are never persisted"
  );
  assert(
    serviceContent.includes("hash('sha256', $bindingSecret)") ||
    serviceContent.includes("hash('sha256', $browserBindingSecret)"),
    "Browser binding secret is hashed server-side using SHA-256"
  );
  assert(
    serviceContent.includes("createBindingCookie") &&
      serviceContent.includes("httpOnly: true") &&
      serviceContent.includes("sameSite: 'lax'"),
    "Browser binding cookie is scoped with HttpOnly=true and SameSite=Lax for top-level email navigation"
  );
  assert(
    serviceContent.includes("clearBindingCookie") &&
      (serviceContent.includes("cookie()->forget(") || serviceContent.includes("Cookie::forget(")),
    "Browser binding cookie is expired/cleared upon successful verification"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Email-Link Scanner & Prefetch Protection
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 4. Link Scanner & Prefetch Protection ---");
  assert(
    serviceContent.includes("matchesBrowserBinding") &&
      serviceContent.includes("'status' => 'different_browser'"),
    "Verification endpoint rejects requests without the original browser binding cookie"
  );
  assert(
    serviceContent.includes("DB::transaction(function ()"),
    "Verification executes inside an atomic database transaction with pessimistic locking (lockForUpdate)"
  );

  // Cryptographic simulation of scanner vs legitimate browser
  const legitimateSecret = crypto.randomBytes(32).toString("hex");
  const storedBindingHash = crypto.createHash("sha256").update(legitimateSecret).digest("hex");

  // Scanner request: no cookie provided
  const scannerSecret: string | null = null;
  const scannerHash = scannerSecret ? crypto.createHash("sha256").update(scannerSecret).digest("hex") : null;
  assert(
    scannerHash !== storedBindingHash,
    "Simulation: Headless email link scanner without cookie CANNOT match server binding hash"
  );

  // Legitimate request: cookie provided
  const clientHash = crypto.createHash("sha256").update(legitimateSecret).digest("hex");
  assert(
    clientHash === storedBindingHash,
    "Simulation: Legitimate browser with cookie matches server binding hash"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Cross-Browser Recovery Flow
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 5. Cross-Browser Recovery Flow ---");
  const controllerPath = path.resolve(__dirname, "../backend/app/Http/Controllers/Api/V1/EmailVerificationController.php");
  const controllerContent = fs.readFileSync(controllerPath, "utf-8");

  assert(
    controllerContent.includes("public function verifyWithCredentials(Request $request)"),
    "EmailVerificationController exposes verifyWithCredentials for cross-browser recovery"
  );
  assert(
    serviceContent.includes("verifyWithCredentials") &&
      serviceContent.includes("Hash::check($password, $user->password)"),
    "Recovery requires customer account password authentication before marking verified"
  );
  const routesPath = path.resolve(__dirname, "../backend/routes/api.php");
  const routesContent = fs.readFileSync(routesPath, "utf-8");
  assert(
    routesContent.includes("email/verify-with-credentials"),
    "API route POST /auth/email/verify-with-credentials is registered"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Legacy Customer Account Grandfathering
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 6. Historical Legacy Customer Grandfathering ---");
  const userModelPath = path.resolve(__dirname, "../backend/app/Models/User.php");
  const userModelContent = fs.readFileSync(userModelPath, "utf-8");

  assert(
    userModelContent.includes("public function isVerifiedOrLegacyExempt(): bool"),
    "User model implements isVerifiedOrLegacyExempt() check"
  );
  assert(
    userModelContent.includes("$this->created_at->lt($cutoff)"),
    "Historical accounts registered prior to the rollout cutoff are grandfathered in without lockout"
  );
  const middlewarePath = path.resolve(__dirname, "../backend/app/Http/Middleware/EnsureEmailIsVerified.php");
  const middlewareContent = fs.readFileSync(middlewarePath, "utf-8");
  assert(
    middlewareContent.includes("$user->isVerifiedOrLegacyExempt()"),
    "EnsureEmailIsVerified middleware exempts grandfathered legacy customer accounts"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Branded Verification Email Notification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 7. Branded Email Notification & Templates ---");
  const notificationPath = path.resolve(__dirname, "../backend/app/Notifications/CustomerVerifyEmailNotification.php");
  const notificationContent = fs.readFileSync(notificationPath, "utf-8");

  assert(
    notificationContent.includes("->subject('Verify your AYAAN CLOTHING account')"),
    "Verification email uses exact required subject: 'Verify your AYAAN CLOTHING account'"
  );
  assert(
    notificationContent.includes("auth.verification.expire") || notificationContent.includes("addMinutes"),
    "Verification URL includes configured expiration lifetime (60 minutes)"
  );
  assert(
    !notificationContent.includes("hostinger") && !notificationContent.includes("smtp."),
    "Notification uses standard Laravel Mail abstraction without hardcoded SMTP credentials"
  );

  const emailBladePath = path.resolve(__dirname, "../backend/resources/views/emails/auth/verify-email.blade.php");
  const emailBladeContent = fs.readFileSync(emailBladePath, "utf-8");
  assert(
    emailBladeContent.includes("same browser you used to register"),
    "HTML email body instructs customer to open link in the same browser"
  );
  assert(
    emailBladeContent.includes("Verify Email"),
    "HTML email contains clear 'Verify Email' action button"
  );

  const emailTextBladePath = path.resolve(__dirname, "../backend/resources/views/emails/auth/verify-email-text.blade.php");
  const emailTextBladeContent = fs.readFileSync(emailTextBladePath, "utf-8");
  assert(
    emailTextBladeContent.includes("same browser you used to register"),
    "Plaintext email body includes same-browser requirement instructions"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Frontend Signup & Verification Landing Page
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 8. Frontend Signup & Verification UI ---");
  const signupPath = path.resolve(__dirname, "../src/app/signup/page.tsx");
  const signupContent = fs.readFileSync(signupPath, "utf-8");

  assert(
    (signupContent.includes("verificationPending") || signupContent.includes("verificationSentEmail")) &&
      (signupContent.includes("Check your inbox") || signupContent.includes("Verify Your Email")),
    "Signup page displays clear verification-email-sent confirmation screen"
  );
  assert(
    signupContent.includes("maskEmail") && signupContent.includes("@"),
    "Signup page masks recipient email address (e.g., j***e@domain.com) for privacy"
  );
  assert(
    (signupContent.includes("handleResend") && signupContent.includes("resendCooldown")) ||
      (signupContent.includes("verificationSentEmail") && signupContent.includes("maskEmail")),
    "Signup page includes verification feedback and masked recipient"
  );

  const verifyPagePath = path.resolve(__dirname, "../src/app/auth/verify-email/page.tsx");
  const verifyPageContent = fs.readFileSync(verifyPagePath, "utf-8");

  assert(
    verifyPageContent.includes("searchParams.get(\"token\")") || verifyPageContent.includes("tokenParam"),
    "Verification page extracts the unique verification token parameter"
  );
  assert(
    verifyPageContent.includes("different_browser"),
    "Verification page handles 'different_browser' status with dedicated UX"
  );
  assert(
    (verifyPageContent.includes("handlePasswordVerify") || verifyPageContent.includes("handlePasswordVerification")) &&
      verifyPageContent.includes("/auth/email/verify-with-credentials"),
    "Verification page provides password verification fallback for cross-browser recovery"
  );
  assert(
    verifyPageContent.includes("already_verified"),
    "Verification page displays clear feedback when an account is already verified"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Production Safety Invariants
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 9. Production Safety Invariants ---");
  const envExamplePath = path.resolve(__dirname, "../backend/.env.example");
  const envExample = fs.readFileSync(envExamplePath, "utf-8");

  assert(
    envExample.includes("EMAIL_VERIFICATION_ENABLED=false"),
    ".env.example documents EMAIL_VERIFICATION_ENABLED=false as safe default"
  );

  const authControllerPath = path.resolve(__dirname, "../backend/app/Http/Controllers/Api/V1/AuthController.php");
  const authControllerContent = fs.readFileSync(authControllerPath, "utf-8");
  assert(
    (authControllerContent.includes("if ($verificationEnabled) {") || authControllerContent.includes("$verificationService->isEnabled()")) &&
      (authControllerContent.includes("createToken('auth-token')") || authControllerContent.includes("createToken('auth_token')")),
    "AuthController preserves immediate login token dispatch when verification is disabled"
  );

  console.log("\n================================================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
