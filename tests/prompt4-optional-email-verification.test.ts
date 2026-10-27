import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { AuthService } from "@/services/auth.service";
import { mockStore } from "@/lib/mock-data/mock-store";
import { apiClient } from "@/services/api-client";

const rootDir = process.cwd();

test("Prompt 4 Hotfix: Issue #26 — Optional Email Verification for Login & Checkout", async (t) => {
  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: LOGIN WITHOUT MANDATORY EMAIL VERIFICATION
  // ───────────────────────────────────────────────────────────────────────────
  await t.test("PART 1: Customer Login Flow (Verified vs Unverified)", async (loginTest) => {
    const authService = new AuthService();

    await loginTest.test("1.1: Verified customer with valid credentials logs in successfully", async () => {
      const email = "verified_test_buyer@ayaan-demo.local";
      const nowIso = new Date().toISOString();
      mockStore.saveUser({
        name: "Verified Buyer",
        email,
        password: "SecretPassword123!",
        role: "customer",
        email_verified_at: nowIso,
      } as any);

      const res = await authService.login({
        email,
        password: "SecretPassword123!",
      });

      assert.ok(res.user, "User object must be returned");
      assert.ok(res.token, "Sanctum/auth token must be established");
      assert.equal(res.user.email, email);
      assert.equal(res.user.role, "customer");
      assert.equal(res.user.email_verified_at, nowIso, "Verified user retains verification timestamp");
    });

    await loginTest.test("1.2: Unverified customer with valid credentials logs in successfully without blocking", async () => {
      const email = "unverified_test_buyer@ayaan-demo.local";
      mockStore.saveUser({
        name: "Unverified Buyer",
        email,
        password: "SecretPassword123!",
        role: "customer",
        email_verified_at: null,
      } as any);

      const res = await authService.login({
        email,
        password: "SecretPassword123!",
      });

      assert.ok(res.user, "Unverified user must successfully receive user object");
      assert.ok(res.token, "Sanctum/auth token must be established for unverified user");
      assert.equal(res.user.email, email);
      assert.equal(res.user.role, "customer");
      assert.equal(res.user.email_verified_at, null, "User must NOT be falsely marked as verified in DB");
    });

    await loginTest.test("1.3: Customer login with invalid password fails and throws 422", async () => {
      const email = "unverified_test_buyer@ayaan-demo.local";
      await assert.rejects(
        async () => {
          await authService.login({
            email,
            password: "WrongPassword!",
          });
        },
        /Invalid email or password/i,
        "Invalid password must throw authentication error"
      );
    });

    await loginTest.test("1.4: Backend AuthController enforces status and role separation before issuing tokens", () => {
      const authControllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/AuthController.php");
      const content = fs.readFileSync(authControllerPath, "utf-8");

      // Verify inactive accounts are rejected
      assert.match(
        content,
        /\$user->status\s*===\s*['"]inactive['"]/,
        "AuthController must reject inactive/disabled accounts"
      );

      // Verify admin role is rejected on customer login
      assert.match(
        content,
        /\$user->isAdmin\(\)\s*\|\|\s*!\s*\$user->isCustomer\(\)/,
        "AuthController must reject non-customer roles on customer login"
      );

      // Verify authenticate method security pipeline order
      const authMethod = content.substring(content.indexOf("protected function authenticate"));
      const hashCheckIdx = authMethod.indexOf("Hash::check");
      const roleCheckIdx = authMethod.indexOf("Strict Role Separation");
      const tokenCreateIdx = authMethod.indexOf("createToken('auth_token')");
      assert.ok(hashCheckIdx !== -1 && roleCheckIdx !== -1 && tokenCreateIdx !== -1, "All steps present in authenticate()");
      assert.ok(hashCheckIdx < roleCheckIdx && roleCheckIdx < tokenCreateIdx, "Security pipeline order preserved");
    });

    await loginTest.test("1.5: Customer login page and AuthContext do not trap unverified customers in redirect loops", () => {
      const loginPagePath = path.join(rootDir, "src/app/login/page.tsx");
      const loginPageContent = fs.readFileSync(loginPagePath, "utf-8");

      assert.ok(
        !loginPageContent.includes("verify-email?status=unverified"),
        "LoginPage must not redirect unverified users to verify-email loop"
      );

      const dashboardLayoutPath = path.join(rootDir, "src/app/dashboard/DashboardLayoutClient.tsx");
      const dashboardContent = fs.readFileSync(dashboardLayoutPath, "utf-8");

      assert.ok(
        !dashboardContent.includes("Email Verification Required Before Placing Orders"),
        "Dashboard layout must not claim verification is required before placing orders"
      );
      assert.ok(
        dashboardContent.includes("<DashboardSidebar />") && dashboardContent.includes("{children}"),
        "Dashboard workspace and navigation remain fully accessible to unverified customers"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: ORDER PLACEMENT WITHOUT MANDATORY EMAIL VERIFICATION
  // ───────────────────────────────────────────────────────────────────────────
  await t.test("PART 2: Order Placement Flow (Frontend Gates & Backend Controller)", async (orderTest) => {
    await orderTest.test("2.1: backend/routes/api.php does NOT attach 'verified' middleware to orders or checkout validate", () => {
      const routesPath = path.join(rootDir, "backend/routes/api.php");
      const routesContent = fs.readFileSync(routesPath, "utf-8");

      // Match checkout validate route
      assert.match(
        routesContent,
        /Route::middleware\(\[['"]auth:sanctum['"],\s*['"]role:customer['"],\s*['"]storefront\.country\.access['"]\]\)->group\(function\s*\(\)\s*\{\s*Route::post\(['"]\/checkout\/validate['"]/,
        "checkout/validate route must NOT require 'verified' middleware"
      );

      // Match orders store route
      assert.match(
        routesContent,
        /Route::post\(['"]\/['"],\s*\[OrderController::class,\s*['"]store['"]\]\)->middleware\(\[['"]throttle:checkout-order['"]\]\);/,
        "POST /orders route must NOT require 'verified' middleware"
      );
    });

    await orderTest.test("2.2: OrderController::validateCheckout allows unverified customers", () => {
      const orderControllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/OrderController.php");
      const content = fs.readFileSync(orderControllerPath, "utf-8");

      const validateCheckoutMethod = content.substring(
        content.indexOf("public function validateCheckout"),
        content.indexOf("public function store")
      );

      assert.ok(
        !validateCheckoutMethod.includes("EMAIL_VERIFICATION_REQUIRED"),
        "validateCheckout must NOT reject unverified customers with EMAIL_VERIFICATION_REQUIRED"
      );
      assert.ok(
        validateCheckoutMethod.includes("unauthorized('Please log in to continue to checkout.')"),
        "validateCheckout still enforces authentication"
      );
      assert.ok(
        validateCheckoutMethod.includes("Only customer accounts may perform checkout"),
        "validateCheckout still enforces customer role"
      );
    });

    await orderTest.test("2.3: OrderController::store allows unverified customers while maintaining all security invariants", () => {
      const orderControllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/OrderController.php");
      const content = fs.readFileSync(orderControllerPath, "utf-8");

      const storeMethod = content.substring(
        content.indexOf("public function store(CreateOrderRequest"),
        content.indexOf("public function cancel(")
      );

      assert.ok(
        !storeMethod.includes("EMAIL_VERIFICATION_REQUIRED"),
        "OrderController::store must NOT reject unverified customers with EMAIL_VERIFICATION_REQUIRED"
      );

      // Invariants:
      assert.ok(
        storeMethod.includes("unauthorized('Please log in to continue to checkout.')"),
        "Invariant: Authentication is strictly required"
      );
      assert.ok(
        storeMethod.includes("forbidden('Only customer accounts may perform checkout.')"),
        "Invariant: Customer role is strictly required"
      );
      assert.ok(
        storeMethod.includes("NativeBotProtectionService::class"),
        "Invariant: Anti-bot protection is strictly enforced"
      );
      assert.ok(
        storeMethod.includes("OrderIdempotencyKey"),
        "Invariant: Idempotency and duplicate order prevention remain active"
      );
      assert.ok(
        storeMethod.includes("InsufficientStockException"),
        "Invariant: Stock validation remains strictly enforced"
      );
      assert.ok(
        storeMethod.includes("InvalidMoqMultipleException"),
        "Invariant: MOQ multiple rules remain strictly enforced"
      );
      assert.ok(
        storeMethod.includes("getUnitPriceForQuantity"),
        "Invariant: Server-side authoritative pricing calculations preserved"
      );
      assert.ok(
        storeMethod.includes("'user_id' => $user->id"),
        "Invariant: Order ownership is strictly bound to authenticated user (no client spoofing)"
      );
    });

    await orderTest.test("2.4: CheckoutModal.tsx does NOT block unverified customers in handleSubmit", () => {
      const checkoutModalPath = path.join(rootDir, "src/components/cart/CheckoutModal.tsx");
      const content = fs.readFileSync(checkoutModalPath, "utf-8");

      const handleSubmitMatch = content.substring(
        content.indexOf("const handleSubmit = async"),
        content.indexOf("const totalItemQuantity =")
      );

      assert.ok(
        !handleSubmitMatch.includes("user && !user.email_verified_at"),
        "handleSubmit must NOT abort submission for unverified users"
      );
      assert.ok(
        handleSubmitMatch.includes("if (!user)"),
        "handleSubmit still requires authenticated customer session"
      );
    });

    await orderTest.test("2.5: CheckoutModal.tsx renders the active submit button and non-blocking note for unverified users", () => {
      const checkoutModalPath = path.join(rootDir, "src/components/cart/CheckoutModal.tsx");
      const content = fs.readFileSync(checkoutModalPath, "utf-8");

      // Verify the submit button is always rendered
      assert.match(
        content,
        /<button[\s\S]*?type="submit"[\s\S]*?Confirm Order/m,
        "CheckoutModal must render active submit button for unverified customers"
      );

      // Verify the non-blocking informational note
      assert.match(
        content,
        /Email verification is optional for placing orders[\s\S]*?verify your email anytime/,
        "CheckoutModal must render helpful non-blocking note linking to verification"
      );
    });

    await orderTest.test("2.6: CheckoutModal.tsx top banner displays non-blocking informational status", () => {
      const checkoutModalPath = path.join(rootDir, "src/components/cart/CheckoutModal.tsx");
      const content = fs.readFileSync(checkoutModalPath, "utf-8");

      assert.ok(
        content.includes("Email Verification Pending (Optional)"),
        "Top banner title must clearly state verification is optional"
      );
      assert.ok(
        content.includes("You can complete your order now without interruption"),
        "Top banner body must inform customer they can complete their order without interruption"
      );
      assert.ok(
        !content.includes("Email Verification Required Before Ordering"),
        "Top banner must NOT claim email verification is required before ordering"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 3: PRESERVATION OF OPTIONAL EMAIL VERIFICATION & RECOVERY
  // ───────────────────────────────────────────────────────────────────────────
  await t.test("PART 3: Preservation of Optional Email Verification & Account Safety", async (verifTest) => {
    await verifTest.test("3.1: Dedicated /auth/verify-email screen remains fully functional", () => {
      const verifyEmailPath = path.join(rootDir, "src/app/auth/verify-email/page.tsx");
      assert.ok(fs.existsSync(verifyEmailPath), "/auth/verify-email page exists");
      const content = fs.readFileSync(verifyEmailPath, "utf-8");

      assert.ok(content.includes("handleResend"), "Resend functionality remains available");
      assert.ok(content.includes("handleCheckStatus"), "Check status functionality remains available");
      assert.ok(content.includes("cooldown"), "Rate limit cooldown timer is preserved");
      assert.ok(content.includes("different_browser"), "Cross-browser verification handling is preserved");
    });

    await verifTest.test("3.2: Backend email verification endpoints remain intact", () => {
      const routesPath = path.join(rootDir, "backend/routes/api.php");
      const routesContent = fs.readFileSync(routesPath, "utf-8");

      assert.ok(
        routesContent.includes("/email/verify/{id}/{hash}"),
        "GET /email/verify/{id}/{hash} endpoint preserved"
      );
      assert.ok(
        routesContent.includes("/email/verification-notification"),
        "POST /email/verification-notification endpoint preserved"
      );
      assert.ok(
        routesContent.includes("/email/verification-status"),
        "GET /email/verification-status endpoint preserved"
      );
      assert.ok(
        routesContent.includes("throttle:verification-resend"),
        "Verification resend rate limit throttle preserved"
      );
    });

    await verifTest.test("3.3: EmailVerificationController rate limiting and token handling intact", () => {
      const controllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/EmailVerificationController.php");
      assert.ok(fs.existsSync(controllerPath), "EmailVerificationController.php exists");
      const content = fs.readFileSync(controllerPath, "utf-8");

      assert.ok(content.includes("VERIFICATION_RESEND_COOLDOWN"), "60-second cooldown is enforced");
      assert.ok(content.includes("diffInSeconds(now())"), "Remaining cooldown seconds calculated accurately");

      const servicePath = path.join(rootDir, "backend/app/Services/Auth/EmailVerificationService.php");
      assert.ok(fs.existsSync(servicePath), "EmailVerificationService.php exists");
      const serviceContent = fs.readFileSync(servicePath, "utf-8");
      assert.ok(serviceContent.includes("lockForUpdate"), "Pessimistic locking on token consumption preserved");
    });

    await verifTest.test("3.4: Order placement or login never alters unverified customer to verified", () => {
      const orderControllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/OrderController.php");
      const content = fs.readFileSync(orderControllerPath, "utf-8");

      // Verify store() does NOT mutate email_verified_at
      const storeMethod = content.substring(
        content.indexOf("public function store("),
        content.indexOf("public function cancel(")
      );
      assert.ok(
        !storeMethod.includes("email_verified_at"),
        "OrderController::store must NEVER touch user email_verified_at column"
      );
    });
  });
});
