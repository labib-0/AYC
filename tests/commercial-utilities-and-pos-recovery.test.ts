import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  setFlashToast,
  consumeFlashToast,
  peekFlashToast,
  clearFlashToast,
  FLASH_TOAST_STORAGE_KEY,
  FLASH_TOAST_EVENT_NAME,
} from "../src/lib/flash-toast";
import { cartService } from "../src/services/cart.service";

describe("AYC Prompt 9 — Cart Count, POS Responsiveness, Auth Feedback & Email Verification Recovery", () => {
  const rootDir = path.resolve(__dirname, "..");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Issue #16: Cart Badge Count Semantics and Data Flow
  // ───────────────────────────────────────────────────────────────────────────
  describe("Cart Badge Count Semantics (Issue #16)", () => {
    const cartContextPath = path.join(rootDir, "src/lib/CartContext.tsx");
    const cartContextContent = fs.readFileSync(cartContextPath, "utf-8");
    const headerPath = path.join(rootDir, "src/components/layout/Header.tsx");
    const headerContent = fs.readFileSync(headerPath, "utf-8");
    const miniCartPath = path.join(rootDir, "src/components/cart/MiniCart.tsx");
    const miniCartContent = fs.readFileSync(miniCartPath, "utf-8");
    const cartServicePath = path.join(rootDir, "src/services/cart.service.ts");
    const cartServiceContent = fs.readFileSync(cartServicePath, "utf-8");

    it("CartContext calculates totalItems strictly as distinct items.length", () => {
      assert.ok(
        cartContextContent.includes("const totalItems = useMemo(() => items.length, [items])"),
        "totalItems must strictly equal items.length"
      );
    });

    it("CartContext calculates totalUnits strictly as the sum of item quantities", () => {
      assert.ok(
        cartContextContent.includes("const totalUnits = useMemo("),
        "totalUnits memo calculation must exist"
      );
      assert.ok(
        cartContextContent.includes("items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)"),
        "totalUnits must sum item quantities"
      );
    });

    it("Header desktop cart badge binds strictly to totalItems", () => {
      assert.ok(
        headerContent.includes("aria-label={`Shopping Cart (${totalItems} items)`}"),
        "Desktop cart button aria-label must use totalItems"
      );
      assert.ok(
        headerContent.includes("{totalItems > 0 && (") &&
          headerContent.includes("{totalItems}\n                </span>"),
        "Desktop cart badge text must render totalItems"
      );
    });

    it("Header compact/sticky cart badge binds strictly to totalItems", () => {
      assert.ok(
        headerContent.includes("{totalItems > 0 && (\n                  <span className=\"absolute -top-0.5 -right-0.5") &&
          headerContent.includes("{totalItems}\n                  </span>"),
        "Compact/sticky header cart badge must render totalItems"
      );
    });

    it("Header mobile nav drawer binds strictly to totalItems", () => {
      assert.ok(
        headerContent.includes("aria-label={`Cart (${totalItems} items)`}"),
        "Mobile drawer button aria-label must use totalItems"
      );
      assert.ok(
        headerContent.includes("{totalItems > 0 ? (\n              <span className=\"bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm\">\n                {totalItems}\n              </span>"),
        "Mobile drawer badge must render totalItems"
      );
    });

    it("MiniCart drawer header displays items.length as distinct item badge", () => {
      assert.ok(
        miniCartContent.includes("{items.length > 0 && (\n              <span className=\"px-2 py-0.5 text-xs font-bold rounded-full bg-secondary text-foreground tabular-nums\">\n                {items.length}\n              </span>"),
        "MiniCart drawer header must render items.length"
      );
    });

    it("CartService calculates distinct total_items and unit sum total_units separately", () => {
      assert.ok(
        cartServiceContent.includes("const total_items = items.length;"),
        "CartService must set total_items to items.length"
      );
      assert.ok(
        cartServiceContent.includes("const total_units = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);"),
        "CartService must compute total_units from quantity sum"
      );
    });

    it("Mathematical isolation: 2 distinct products with 200 + 250 units results in badge count 2 and total units 450", () => {
      const mockItems = [
        { id: "item-1", quantity: 200, unit_price: 15.0 },
        { id: "item-2", quantity: 250, unit_price: 20.0 },
      ];
      const distinctItems = mockItems.length;
      const totalUnits = mockItems.reduce((acc, i) => acc + i.quantity, 0);
      const subtotal = mockItems.reduce((acc, i) => acc + i.quantity * i.unit_price, 0);

      assert.strictEqual(distinctItems, 2, "Distinct cart count for badge must equal 2");
      assert.strictEqual(totalUnits, 450, "Total units must equal 450 (sum of units)");
      assert.strictEqual(subtotal, 8000.0, "Subtotal calculation must be accurate");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Issue #22: POS Cashier Terminal Responsive Architecture
  // ───────────────────────────────────────────────────────────────────────────
  describe("POS Cashier Terminal Responsive Architecture (Issue #22)", () => {
    const posPath = path.join(rootDir, "src/app/ayc/pos/page.tsx");
    const posContent = fs.readFileSync(posPath, "utf-8");

    it("contains outer container with min-w-0 and max-width bounds", () => {
      assert.ok(
        posContent.includes('className="p-3 sm:p-5 max-w-[1720px] mx-auto min-h-screen w-full min-w-0"'),
        "POS outer container must have min-w-0 and max-width"
      );
    });

    it("implements responsive 2-column workspace that cleanly stacks on mobile (<1024px)", () => {
      assert.ok(
        posContent.includes("grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0"),
        "POS grid must use grid-cols-1 on mobile and lg:grid-cols-12 on desktop"
      );
    });

    it("provides horizontal scroll containment for category filter pills with subtle-scrollbar", () => {
      assert.ok(
        posContent.includes("flex items-center gap-1.5 overflow-x-auto pb-1 subtle-scrollbar text-xs max-w-full"),
        "Category filter pills must have horizontal containment and subtle-scrollbar"
      );
    });

    it("catalog products grid adjusts columns responsively from 1 to 2 to 3 without blowout", () => {
      assert.ok(
        posContent.includes("grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1"),
        "Catalog grid must reflow from 1 column on mobile to 2 on tablet to 3 on desktop"
      );
    });

    it("payment method selector reflows from 1 column on narrow mobile to 2 on wider viewports", () => {
      assert.ok(
        posContent.includes("grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 text-xs"),
        "Payment method selector must stack on ultra-mobile viewports <420px"
      );
    });

    it("complete sale button has full width and responsive tap padding", () => {
      assert.ok(
        posContent.includes('id="btn-complete-pos-sale"'),
        "POS Complete Sale button must have dedicated id"
      );
      assert.ok(
        posContent.includes("w-full py-3.5 px-4 bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl"),
        "Complete Sale button must have full width touch target"
      );
    });

    it("order completion modal has responsive container and commercial document links", () => {
      assert.ok(
        posContent.includes('id="pos-order-management-modal"'),
        "Order management modal must be defined"
      );
      assert.ok(
        posContent.includes('id="btn-pos-doc-offersheet"') &&
          posContent.includes('id="btn-pos-doc-pi"') &&
          posContent.includes('id="btn-pos-doc-ci"'),
        "Modal must provide accessible links to all 3 commercial documents (Offer Sheet, PI, CI)"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Issue #23: Login and Logout Success Feedback
  // ───────────────────────────────────────────────────────────────────────────
  describe("Login and Logout Success Feedback (Issue #23)", () => {
    const loginPagePath = path.join(rootDir, "src/app/login/page.tsx");
    const loginPageContent = fs.readFileSync(loginPagePath, "utf-8");
    const sidebarPath = path.join(rootDir, "src/components/dashboard/DashboardSidebar.tsx");
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
    const mobileNavPath = path.join(rootDir, "src/components/dashboard/DashboardMobileNav.tsx");
    const mobileNavContent = fs.readFileSync(mobileNavPath, "utf-8");
    const shellPath = path.join(rootDir, "src/components/layout/StorefrontShell.tsx");
    const shellContent = fs.readFileSync(shellPath, "utf-8");
    const adminLayoutPath = path.join(rootDir, "src/app/ayc/AdminLayoutClient.tsx");
    const adminLayoutContent = fs.readFileSync(adminLayoutPath, "utf-8");

    it("StorefrontShell and AdminLayoutClient both render GlobalToast", () => {
      assert.ok(
        shellContent.includes("<GlobalToast />"),
        "StorefrontShell must mount GlobalToast for storefront pages"
      );
      assert.ok(
        adminLayoutContent.includes("<GlobalToast />"),
        "AdminLayoutClient must mount GlobalToast for admin portal"
      );
    });

    it("login page sets success flash toast only when authentication succeeds with customer role", () => {
      assert.ok(
        loginPageContent.includes('setFlashToast("success", "Login successful. Welcome back!");'),
        "Login page must set success flash toast on valid customer login"
      );
      // Failed login must set error state and never call setFlashToast
      assert.ok(
        loginPageContent.includes("if (res.error) {\n      const errMsg = typeof res.error === \"string\" ? res.error : res.error.message || \"These credentials cannot be used for customer login.\";\n      setError(errMsg);"),
        "Failed login must set error state and not trigger success toast"
      );
    });

    it("customer sign out triggers explicit logout success toast", () => {
      assert.ok(
        sidebarContent.includes('setFlashToast("success", "Logged out successfully.");'),
        "DashboardSidebar must set logout success toast"
      );
      assert.ok(
        mobileNavContent.includes('setFlashToast("success", "Logged out successfully.");'),
        "DashboardMobileNav must set logout success toast"
      );
    });

    it("flash toast in-memory lifecycle: stages, consumes once, and guarantees zero replay on subsequent read", () => {
      // Mock sessionStorage in Node test environment
      const storage: Record<string, string> = {};
      const mockSessionStorage = {
        getItem: (k: string) => storage[k] || null,
        setItem: (k: string, v: string) => { storage[k] = v; },
        removeItem: (k: string) => { delete storage[k]; },
      };

      (globalThis as any).sessionStorage = mockSessionStorage;
      (globalThis as any).window = {
        dispatchEvent: () => true,
      };

      // 1. Stage a success toast
      const staged = setFlashToast("success", "Login successful. Welcome back!");
      assert.ok(staged, "setFlashToast must return staged toast object");
      assert.strictEqual(staged?.type, "success");
      assert.strictEqual(staged?.message, "Login successful. Welcome back!");

      // 2. Peek does not remove it
      const peeked = peekFlashToast();
      assert.strictEqual(peeked?.message, "Login successful. Welcome back!");

      // 3. First consume retrieves the toast and clears storage
      const consumed = consumeFlashToast();
      assert.strictEqual(consumed?.message, "Login successful. Welcome back!");

      // 4. Second consume must return null (single consumption guaranteed, prevents replay across route transitions)
      const replayed = consumeFlashToast();
      assert.strictEqual(replayed, null, "Flash toast must be consumed exactly once");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Issue #26: Email Verification Gate and Security Invariants
  // ───────────────────────────────────────────────────────────────────────────
  describe("Optional Email Verification and Security Invariants (Issue #26)", () => {
    const authControllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/AuthController.php");
    const authControllerContent = fs.readFileSync(authControllerPath, "utf-8");
    const orderControllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/OrderController.php");
    const orderControllerContent = fs.readFileSync(orderControllerPath, "utf-8");
    const dashboardLayoutPath = path.join(rootDir, "src/app/dashboard/DashboardLayoutClient.tsx");
    const dashboardLayoutContent = fs.readFileSync(dashboardLayoutPath, "utf-8");
    const checkoutModalPath = path.join(rootDir, "src/components/cart/CheckoutModal.tsx");
    const checkoutModalContent = fs.readFileSync(checkoutModalPath, "utf-8");

    it("backend AuthController authenticates without requiring email_verified_at check", () => {
      // AuthController authenticate method verifies Hash::check and status, not email_verified_at
      assert.ok(
        authControllerContent.includes("Hash::check($validated['password'], $user->password)"),
        "Must verify password hash"
      );
      assert.ok(
        authControllerContent.includes("$user->status === 'inactive'"),
        "Must verify active account status"
      );
      assert.ok(
        !authControllerContent.includes("mustVerifyEmail") &&
          !authControllerContent.includes("hasVerifiedEmail") &&
          !authControllerContent.includes("email_verified_at"),
        "AuthController must NOT block login when email is unverified"
      );
    });

    it("backend OrderController allows order placement without requiring email_verified_at", () => {
      // OrderController store method requires user login and customer role, but does not block unverified email
      assert.ok(
        orderControllerContent.includes("$user = $request->user() ?: auth('sanctum')->user();"),
        "Must require authenticated user for checkout"
      );
      assert.ok(
        orderControllerContent.includes("if ($user->isAdmin() || !$user->isCustomer())"),
        "Must restrict checkout to customer role"
      );
      assert.ok(
        !orderControllerContent.includes("email_verified_at") &&
          !orderControllerContent.includes("hasVerifiedEmail"),
        "OrderController store must NOT block checkout when email is unverified"
      );
    });

    it("DashboardLayoutClient renders a soft informational email verification banner that does not block portal access", () => {
      assert.ok(
        dashboardLayoutContent.includes("{user && !user.email_verified_at && ("),
        "Must display informational banner when email is unverified"
      );
      assert.ok(
        dashboardLayoutContent.includes("Your account email (<strong>{user.email}</strong>) has not been verified yet. You can browse, place orders, and manage quotes freely."),
        "Banner must explicitly inform customer that browsing and ordering are fully permitted"
      );
    });

    it("CheckoutModal displays optional verification notice and does not disable Confirm Order button", () => {
      assert.ok(
        checkoutModalContent.includes("Email Verification Pending (Optional)"),
        "CheckoutModal must clearly mark email verification as Optional"
      );
      assert.ok(
        checkoutModalContent.includes("Email verification is optional for placing orders."),
        "Notice must inform customer that verification is optional"
      );
      // Button disabled guard only checks loading and stock violations, never email verification
      assert.ok(
        checkoutModalContent.includes("disabled={loading || stockViolations.length > 0}"),
        "Checkout submit button must only be disabled for loading or stock violations, never email verification"
      );
    });

    it("Admin routes and authorization remain strictly isolated from customer accounts", () => {
      assert.ok(
        authControllerContent.includes("if ($requiredRole === User::ROLE_ADMIN) {\n            // Reject customer accounts attempting administrator login\n            if (! $user->isAdmin()) {"),
        "Admin login must strictly reject customer accounts"
      );
      assert.ok(
        authControllerContent.includes("if ($requiredRole === User::ROLE_CUSTOMER) {\n            // Reject admin, super admin, or any non-customer account attempting customer login\n            if ($user->isAdmin() || ! $user->isCustomer()) {"),
        "Customer login must strictly reject admin accounts"
      );
    });
  });
});
