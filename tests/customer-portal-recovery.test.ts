import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ApiError } from "../src/services/api-client";
import { authService } from "../src/services/auth.service";
import { mockStore } from "../src/lib/mock-data/mock-store";

describe("AYC Prompt 4 — Customer Dashboard Sidebar, Password Form & Sign-Out Modal Recovery", () => {
  const rootDir = path.resolve(__dirname, "..");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Issue #7: Customer Dashboard Sidebar Geometry & Sticky Architecture
  // ───────────────────────────────────────────────────────────────────────────
  describe("Dashboard Sidebar & Layout Architecture (Issue #7)", () => {
    const sidebarPath = path.join(
      rootDir,
      "src/components/dashboard/DashboardSidebar.tsx"
    );
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

    const layoutPath = path.join(
      rootDir,
      "src/app/dashboard/DashboardLayoutClient.tsx"
    );
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");

    it("anchors desktop sidebar with sticky top-24 self-start and viewport max-height constraint", () => {
      assert.ok(
        sidebarContent.includes('sticky top-24 self-start max-h-[calc(100vh-7rem)]'),
        "Sidebar must specify sticky top-24 self-start max-h-[calc(100vh-7rem)]"
      );
      assert.ok(
        sidebarContent.includes('w-[250px] shrink-0'),
        "Sidebar must maintain fixed 250px width without shrinking"
      );
      assert.ok(
        sidebarContent.includes('data-testid="customer-dashboard-sidebar"'),
        "Sidebar must include customer-dashboard-sidebar testid"
      );
    });

    it("enables independent vertical scrolling within sidebar when content exceeds viewport", () => {
      assert.ok(
        sidebarContent.includes('overflow-y-auto subtle-scrollbar'),
        "Sidebar card must include overflow-y-auto subtle-scrollbar"
      );
    });

    it("isolates desktop sidebar from mobile/tablet using hidden lg:flex responsive utility", () => {
      assert.ok(
        sidebarContent.includes('hidden lg:flex'),
        "Desktop sidebar must hide on viewports smaller than lg breakpoint"
      );
      assert.ok(
        layoutContent.includes("<DashboardMobileNav />"),
        "Layout must provide dedicated mobile navigation on mobile/tablet viewports"
      );
    });

    it("ensures parent dashboard layout allows sticky positioning without ancestor overflow traps", () => {
      assert.ok(
        layoutContent.includes('lg:overflow-x-visible'),
        "Dashboard layout container must ensure overflow-x-visible on desktop to guarantee sticky behavior"
      );
      assert.ok(
        layoutContent.includes('flex flex-col lg:flex-row gap-5 lg:gap-6 items-start'),
        "Main layout must align items-start for natural content column scrolling"
      );
    });

    it("defines full customer portal navigation routes without dead links", () => {
      const requiredRoutes = [
        "/dashboard",
        "/dashboard/orders",
        "/dashboard/wishlist",
        "/dashboard/rfq",
        "/dashboard/documents",
        "/dashboard/addresses",
        "/dashboard/company",
        "/dashboard/settings",
      ];
      for (const route of requiredRoutes) {
        assert.ok(
          sidebarContent.includes(`href: "${route}"`),
          `Sidebar must define navigation link for ${route}`
        );
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Issue #11: Password Change Form, Current Password Field & Security Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe("Password Change Form & Server-Side Verification (Issue #11)", () => {
    const settingsPath = path.join(
      rootDir,
      "src/app/dashboard/settings/page.tsx"
    );
    const settingsContent = fs.readFileSync(settingsPath, "utf-8");

    const controllerPath = path.join(
      rootDir,
      "backend/app/Http/Controllers/Api/V1/UserController.php"
    );
    const controllerContent = fs.readFileSync(controllerPath, "utf-8");

    const requestPath = path.join(
      rootDir,
      "backend/app/Http/Requests/User/UpdateProfileRequest.php"
    );
    const requestContent = fs.readFileSync(requestPath, "utf-8");

    it("renders Current Password field with proper label, input type, and autocomplete", () => {
      assert.ok(
        settingsContent.includes('htmlFor="current_password"'),
        "Must have label htmlFor='current_password'"
      );
      assert.ok(
        settingsContent.includes('Current Password <span className="text-red-500">*</span>'),
        "Must visibly label Current Password as required"
      );
      assert.ok(
        settingsContent.includes('id="current_password"'),
        "Input must have id='current_password'"
      );
      assert.ok(
        settingsContent.includes('name="current_password"'),
        "Input must have name='current_password'"
      );
      assert.ok(
        settingsContent.includes('autoComplete="current-password"'),
        "Input must specify autoComplete='current-password'"
      );
    });

    it("provides visibility toggle buttons for all three password fields", () => {
      assert.ok(
        settingsContent.includes('id="toggle_current_password"'),
        "Must have toggle for current password"
      );
      assert.ok(
        settingsContent.includes('id="toggle_new_password"'),
        "Must have toggle for new password"
      );
      assert.ok(
        settingsContent.includes('id="toggle_confirm_password"'),
        "Must have toggle for confirm password"
      );
    });

    it("validates required current password and new password matching before submission", () => {
      assert.ok(
        settingsContent.includes('!passwordData.currentPassword'),
        "Must validate current password is non-empty"
      );
      assert.ok(
        settingsContent.includes('passwordData.newPassword.length < 6'),
        "Must enforce 6-character minimum on new password"
      );
      assert.ok(
        settingsContent.includes('passwordData.newPassword !== passwordData.confirmPassword'),
        "Must validate new password matches confirmation"
      );
    });

    it("backend UpdateProfileRequest requires current_password when password is provided", () => {
      assert.ok(
        requestContent.includes("'current_password' => ['required_with:password', 'string']"),
        "UpdateProfileRequest must enforce required_with:password on current_password"
      );
      assert.ok(
        requestContent.includes("'password' => ['sometimes', 'required', 'string', 'min:6', 'confirmed']"),
        "UpdateProfileRequest must enforce min:6 and confirmed on password"
      );
    });

    it("backend UserController verifies Hash::check on current_password before updating", () => {
      assert.ok(
        controllerContent.includes("!Hash::check($currentPassword, $user->password)"),
        "Backend controller must verify Hash::check against existing hashed password"
      );
      assert.ok(
        controllerContent.includes("The provided current password is incorrect."),
        "Backend controller must return specific error message for invalid current password"
      );
      assert.ok(
        controllerContent.includes("unset($validated['current_password'], $validated['password'], $validated['password_confirmation'])"),
        "Backend controller must strip plain-text password fields from mass-assignment updates"
      );
    });

    it("authService rejects missing current password with ApiError(422)", async () => {
      const testUser = {
        id: 771,
        name: "Test Customer",
        email: "customer771@example.com",
        role: "customer" as const,
        password: "ValidExistingPassword123",
      };
      mockStore.setActiveUser(testUser as any);
      mockStore.saveUser(testUser as any);

      try {
        await authService.updateProfile({
          password: "NewPassword456",
          password_confirmation: "NewPassword456",
        });
        assert.fail("Should have thrown ApiError for missing current password");
      } catch (err: any) {
        assert.equal(err?.status, 422);
        assert.ok(
          err?.message?.includes("current password"),
          `Expected message about current password, got: ${err?.message}`
        );
      }
    });

    it("authService rejects incorrect current password with ApiError(422)", async () => {
      const testUser = {
        id: 772,
        name: "Test Customer 2",
        email: "customer772@example.com",
        role: "customer" as const,
        password: "CorrectCurrentPassword123",
      };
      mockStore.setActiveUser(testUser as any);
      mockStore.saveUser(testUser as any);

      try {
        await authService.updateProfile({
          current_password: "WrongCurrentPassword999",
          password: "NewPassword456",
          password_confirmation: "NewPassword456",
        });
        assert.fail("Should have thrown ApiError for incorrect current password");
      } catch (err: any) {
        assert.equal(err?.status, 422);
        assert.ok(
          err?.message?.includes("The provided current password is incorrect"),
          `Expected incorrect password error, got: ${err?.message}`
        );
      }
    });

    it("authService succeeds with correct current password and acceptable new password", async () => {
      const testUser = {
        id: 773,
        name: "Test Customer 3",
        email: "customer773@example.com",
        role: "customer" as const,
        password: "CorrectCurrentPassword123",
      };
      mockStore.setActiveUser(testUser as any);
      mockStore.saveUser(testUser as any);

      const res = await authService.updateProfile({
        current_password: "CorrectCurrentPassword123",
        password: "BrandNewPassword789",
        password_confirmation: "BrandNewPassword789",
      });

      assert.ok(res, "Update profile must return user record");
      assert.equal(res.id, 773);
      assert.equal((res as any).current_password, undefined, "current_password must NOT be leaked in return payload");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Issue #12: Sign-Out Confirmation Modal Outside Click Dismissal
  // ───────────────────────────────────────────────────────────────────────────
  describe("Sign Out Modal Outside Click Architecture (Issue #12)", () => {
    const sidebarPath = path.join(
      rootDir,
      "src/components/dashboard/DashboardSidebar.tsx"
    );
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

    const mobileNavPath = path.join(
      rootDir,
      "src/components/dashboard/DashboardMobileNav.tsx"
    );
    const mobileNavContent = fs.readFileSync(mobileNavPath, "utf-8");

    const settingsPath = path.join(
      rootDir,
      "src/app/dashboard/settings/page.tsx"
    );
    const settingsContent = fs.readFileSync(settingsPath, "utf-8");

    it("desktop sidebar modal provides explicit backdrop element with test ID and click dismissal", () => {
      assert.ok(
        sidebarContent.includes('data-testid="signout-modal-backdrop"'),
        "Must have data-testid='signout-modal-backdrop'"
      );
      assert.ok(
        sidebarContent.includes('onClick={() => setShowSignOutConfirm(false)}'),
        "Backdrop must invoke setShowSignOutConfirm(false) on click"
      );
      assert.ok(
        sidebarContent.includes('data-testid="signout-modal-card"'),
        "Modal dialog must have data-testid='signout-modal-card'"
      );
      assert.ok(
        sidebarContent.includes('onClick={(e) => e.stopPropagation()}'),
        "Dialog card must stop click propagation so inner clicks do not dismiss"
      );
    });

    it("mobile nav modal provides explicit backdrop element with test ID and click dismissal", () => {
      assert.ok(
        mobileNavContent.includes('data-testid="mobile-signout-modal-backdrop"'),
        "Must have data-testid='mobile-signout-modal-backdrop'"
      );
      assert.ok(
        mobileNavContent.includes('onClick={() => setShowSignOutConfirm(false)}'),
        "Backdrop must invoke setShowSignOutConfirm(false) on click"
      );
      assert.ok(
        mobileNavContent.includes('data-testid="mobile-signout-modal-card"'),
        "Mobile modal dialog must have data-testid='mobile-signout-modal-card'"
      );
    });

    it("settings page modal provides explicit backdrop element with test ID and click dismissal", () => {
      assert.ok(
        settingsContent.includes('data-testid="settings-signout-modal-backdrop"'),
        "Must have data-testid='settings-signout-modal-backdrop'"
      );
      assert.ok(
        settingsContent.includes('data-testid="settings-signout-modal-card"'),
        "Settings modal dialog must have data-testid='settings-signout-modal-card'"
      );
    });

    it("supports keyboard Escape key accessibility for modal dismissal", () => {
      assert.ok(
        sidebarContent.includes('e.key === "Escape"'),
        "Sidebar modal must dismiss on Escape"
      );
      assert.ok(
        mobileNavContent.includes('e.key === "Escape"'),
        "Mobile modal must dismiss on Escape"
      );
      assert.ok(
        settingsContent.includes('e.key === "Escape"'),
        "Settings modal must dismiss on Escape"
      );
    });
  });
});
