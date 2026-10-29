import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("AYC Prompt 8 — Refresh Controls, Coupon/Document/Role Table Responsiveness & Regression Suite", () => {
  const rootDir = path.resolve(__dirname, "..");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Issue #15: Customer Wishlist Refresh Control (WishlistManager.tsx & WishlistContext.tsx)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Customer Wishlist Refresh Control (Issue #15)", () => {
    const wishlistManagerPath = path.join(rootDir, "src/components/wishlist/WishlistManager.tsx");
    const wishlistContextPath = path.join(rootDir, "src/lib/WishlistContext.tsx");
    const wishlistManagerContent = fs.readFileSync(wishlistManagerPath, "utf-8");
    const wishlistContextContent = fs.readFileSync(wishlistContextPath, "utf-8");

    it("renders the Wishlist Refresh button with accessible id and data-testid", () => {
      assert.ok(
        wishlistManagerContent.includes('id="wishlist-refresh-btn"'),
        "WishlistManager must provide id='wishlist-refresh-btn'"
      );
      assert.ok(
        wishlistManagerContent.includes('data-testid="wishlist-refresh-btn"'),
        "WishlistManager must provide data-testid='wishlist-refresh-btn'"
      );
    });

    it("binds handleRefresh handler with loading and isRefreshingLocal disabled guards", () => {
      assert.ok(
        wishlistManagerContent.includes("onClick={handleRefresh}"),
        "Wishlist refresh button must trigger handleRefresh"
      );
      assert.ok(
        wishlistManagerContent.includes("disabled={loading || isRefreshingLocal}"),
        "Wishlist refresh button must be disabled during active fetch or local refreshing"
      );
    });

    it("renders spinning RefreshCw icon and changes button label during refresh", () => {
      assert.ok(
        wishlistManagerContent.includes('(loading || isRefreshingLocal) ? "animate-spin" : ""'),
        "RefreshCw icon must include animate-spin when loading or refreshing"
      );
      assert.ok(
        wishlistManagerContent.includes('{(loading || isRefreshingLocal) ? "Refreshing..." : "Refresh"}'),
        "Button label must switch dynamically between Refreshing... and Refresh"
      );
    });

    it("displays success notification banner upon successful refresh completion", () => {
      assert.ok(
        wishlistManagerContent.includes('title: "Wishlist Refreshed"'),
        "handleRefresh must stage success feedback with title 'Wishlist Refreshed'"
      );
      assert.ok(
        wishlistManagerContent.includes("Product availability, stock information, and pricing have been updated."),
        "handleRefresh must inform customer of updated availability, stock, and pricing"
      );
    });

    it("protects empty wishlist state against full unmount skeleton during refresh", () => {
      assert.ok(
        wishlistManagerContent.includes("!hasInitialLoaded && loading && items.length === 0"),
        "Skeleton pulse must only render on initial mount loading, preventing layout shift on empty wishlist refresh"
      );
    });

    it("wires refreshWishlist to force fresh inventory and pricing from backend service", () => {
      assert.ok(
        wishlistContextContent.includes("wishlistService.getWishlist({ forceFresh: true })"),
        "refreshWishlist must bypass local cache and query backend with forceFresh: true"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Issue #19: Admin Product Categories Refresh Icon (page.tsx & CategoryToolbar.tsx)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Product Categories Refresh Control (Issue #19)", () => {
    const categoriesPagePath = path.join(rootDir, "src/app/ayc/categories/page.tsx");
    const categoryToolbarPath = path.join(rootDir, "src/components/admin/categories/CategoryToolbar.tsx");
    const categoriesPageContent = fs.readFileSync(categoriesPagePath, "utf-8");
    const categoryToolbarContent = fs.readFileSync(categoryToolbarPath, "utf-8");

    it("renders categories refresh button with id and test ID in CategoryToolbar", () => {
      assert.ok(
        categoryToolbarContent.includes('id="btn-refresh-categories"'),
        "CategoryToolbar must render button with id='btn-refresh-categories'"
      );
      assert.ok(
        categoryToolbarContent.includes('data-testid="btn-refresh-categories"'),
        "CategoryToolbar must render button with data-testid='btn-refresh-categories'"
      );
    });

    it("animates refresh icon and disables button during categories re-fetching", () => {
      assert.ok(
        categoryToolbarContent.includes("disabled={isRefreshing}"),
        "Categories refresh button must be disabled while isRefreshing is true"
      );
      assert.ok(
        categoryToolbarContent.includes('isRefreshing ? "animate-spin text-foreground" : ""'),
        "RefreshCw icon must spin when categories are refreshing"
      );
    });

    it("invalidates cache and fetches fresh categories and hot sale visibility in page.tsx", () => {
      assert.ok(
        categoriesPageContent.includes("categoryService.invalidateCache()"),
        "handleRefresh must invalidate client-side category cache"
      );
      assert.ok(
        categoriesPageContent.includes("categoryService.getCategories({ isAdmin: true, all: true, forceFresh: true })"),
        "handleRefresh must call getCategories with forceFresh: true"
      );
      assert.ok(
        categoriesPageContent.includes("homepageService.getAdminHomepageData()"),
        "handleRefresh must re-fetch homepage hot sale configuration"
      );
      assert.ok(
        categoriesPageContent.includes('"Category list refreshed successfully."'),
        "handleRefresh must display success toast notification"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Issue #20: Admin Brands Refresh Icon (page.tsx & BrandToolbar.tsx)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Brands Refresh Control (Issue #20)", () => {
    const brandsPagePath = path.join(rootDir, "src/app/ayc/brands/page.tsx");
    const brandToolbarPath = path.join(rootDir, "src/components/admin/brands/BrandToolbar.tsx");
    const brandsPageContent = fs.readFileSync(brandsPagePath, "utf-8");
    const brandToolbarContent = fs.readFileSync(brandToolbarPath, "utf-8");

    it("renders brands refresh button with id and test ID in BrandToolbar", () => {
      assert.ok(
        brandToolbarContent.includes('id="btn-refresh-brands"'),
        "BrandToolbar must render button with id='btn-refresh-brands'"
      );
      assert.ok(
        brandToolbarContent.includes('data-testid="btn-refresh-brands"'),
        "BrandToolbar must render button with data-testid='btn-refresh-brands'"
      );
    });

    it("animates refresh icon and disables button during brands re-fetching", () => {
      assert.ok(
        brandToolbarContent.includes("disabled={isRefreshing}"),
        "Brands refresh button must be disabled while isRefreshing is true"
      );
      assert.ok(
        brandToolbarContent.includes('isRefreshing ? "animate-spin text-foreground" : ""'),
        "RefreshCw icon must spin when brands are refreshing"
      );
    });

    it("invalidates cache and fetches fresh brands with forceFresh: true", () => {
      assert.ok(
        brandsPageContent.includes("brandService.invalidateCache()"),
        "handleRefresh must invalidate brand cache"
      );
      assert.ok(
        brandsPageContent.includes("brandService.getBrands({ isAdmin: true, all: true, forceFresh: true })"),
        "handleRefresh must call getBrands with forceFresh: true"
      );
      assert.ok(
        brandsPageContent.includes('"Brand list refreshed successfully."'),
        "handleRefresh must display success toast notification"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Issue #21: Admin Orders Refresh Icon (page.tsx & OrderListHeader.tsx)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Orders Refresh Control (Issue #21)", () => {
    const ordersPagePath = path.join(rootDir, "src/app/ayc/orders/page.tsx");
    const orderListHeaderPath = path.join(rootDir, "src/components/admin/orders/OrderListHeader.tsx");
    const ordersPageContent = fs.readFileSync(ordersPagePath, "utf-8");
    const orderListHeaderContent = fs.readFileSync(orderListHeaderPath, "utf-8");

    it("renders orders refresh button with id and test ID in OrderListHeader", () => {
      assert.ok(
        orderListHeaderContent.includes('id="btn-refresh-orders"'),
        "OrderListHeader must render button with id='btn-refresh-orders'"
      );
      assert.ok(
        orderListHeaderContent.includes('data-testid="btn-refresh-orders"'),
        "OrderListHeader must render button with data-testid='btn-refresh-orders'"
      );
    });

    it("displays spinning RefreshCw icon and switches text to Refreshing...", () => {
      assert.ok(
        orderListHeaderContent.includes('isLoading ? "animate-spin text-primary" : ""'),
        "Refresh icon must spin when orders are loading"
      );
      assert.ok(
        orderListHeaderContent.includes('{isLoading ? "Refreshing..." : "Refresh"}'),
        "Button text must toggle between Refreshing... and Refresh"
      );
    });

    it("preserves active filters and pagination while fetching fresh orders and KPI metrics", () => {
      assert.ok(
        ordersPageContent.includes("forceFresh: isSilentRefresh"),
        "loadData must propagate forceFresh to backend order service calls"
      );
      assert.ok(
        ordersPageContent.includes("adminOrderService.getOrderSummary({ forceFresh: isSilentRefresh })"),
        "loadData must refresh order summary metrics in sync with order table"
      );
      assert.ok(
        ordersPageContent.includes('"Orders and summary metrics refreshed successfully."'),
        "handleRefresh must notify administrator upon successful refresh"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Issues #24 & #25: Coupons Page Mobile Layout & Table Responsiveness
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Coupons Mobile Responsiveness (Issues #24 & #25)", () => {
    const couponHeaderPath = path.join(rootDir, "src/components/admin/coupons/CouponHeader.tsx");
    const couponTablePath = path.join(rootDir, "src/components/admin/coupons/CouponTable.tsx");
    const couponBindingsPath = path.join(rootDir, "src/components/admin/coupons/CouponAdminBindingsSection.tsx");
    const couponHeaderContent = fs.readFileSync(couponHeaderPath, "utf-8");
    const couponTableContent = fs.readFileSync(couponTablePath, "utf-8");
    const couponBindingsContent = fs.readFileSync(couponBindingsPath, "utf-8");

    it("CouponHeader reflows title and action buttons responsively on mobile", () => {
      assert.ok(
        couponHeaderContent.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-4"),
        "CouponHeader must stack vertically on mobile and reflow horizontally on desktop"
      );
      assert.ok(
        couponHeaderContent.includes("w-full sm:w-auto shrink-0"),
        "CouponHeader button row must span full width on mobile"
      );
    });

    it("CouponTable provides desktop table view and dedicated mobile stacked card view", () => {
      assert.ok(
        couponTableContent.includes('hidden md:block overflow-x-auto subtle-scrollbar'),
        "Desktop table must be hidden on mobile (<768px) and scrollable on desktop"
      );
      assert.ok(
        couponTableContent.includes('data-testid="coupons-mobile-cards"'),
        "Mobile card container must provide data-testid='coupons-mobile-cards'"
      );
      assert.ok(
        couponTableContent.includes("md:hidden divide-y divide-border/60"),
        "Mobile card container must be visible on mobile and hidden on desktop"
      );
    });

    it("CouponAdminBindingsSection provides dedicated mobile cards view avoiding table squeeze", () => {
      assert.ok(
        couponBindingsContent.includes('hidden md:block overflow-x-auto subtle-scrollbar w-full min-w-0'),
        "Admin Bindings table must be hidden on mobile (<768px)"
      );
      assert.ok(
        couponBindingsContent.includes('data-testid="coupon-bindings-mobile-cards"'),
        "Admin Bindings must provide dedicated mobile cards container data-testid='coupon-bindings-mobile-cards'"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Issue #31: Admin Documents Hub Mobile Responsiveness
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Documents Hub Mobile Responsiveness (Issue #31)", () => {
    const documentsPagePath = path.join(rootDir, "src/app/ayc/documents/page.tsx");
    const documentsPageContent = fs.readFileSync(documentsPagePath, "utf-8");

    it("documents page header reflows with vertical stacking on mobile", () => {
      assert.ok(
        documentsPageContent.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-4"),
        "Documents page header must use responsive flex stacking"
      );
    });

    it("renders desktop table with overflow containment and dedicated mobile card view", () => {
      assert.ok(
        documentsPageContent.includes("hidden md:block overflow-x-auto subtle-scrollbar"),
        "Documents table must be hidden on mobile (<768px) and scrollable on desktop"
      );
      assert.ok(
        documentsPageContent.includes('data-testid="documents-mobile-cards"'),
        "Documents page must provide data-testid='documents-mobile-cards' for mobile view"
      );
      assert.ok(
        documentsPageContent.includes("md:hidden divide-y divide-border/60"),
        "Mobile card container must only be active on viewports below 768px"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Issue #35: Admin Roles Mobile Responsiveness
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Roles Mobile Responsiveness (Issue #35)", () => {
    const rolesTablePath = path.join(rootDir, "src/components/admin/roles/RolesTable.tsx");
    const rolesTableContent = fs.readFileSync(rolesTablePath, "utf-8");

    it("renders desktop table with min-width and horizontal containment", () => {
      assert.ok(
        rolesTableContent.includes("hidden md:block overflow-x-auto subtle-scrollbar"),
        "Roles table must be hidden on mobile and horizontally scrollable on desktop"
      );
      assert.ok(
        rolesTableContent.includes("min-w-[760px]"),
        "Roles table must maintain minimum width for legible columns on desktop"
      );
    });

    it("provides dedicated mobile stacked card view with accessible action buttons", () => {
      assert.ok(
        rolesTableContent.includes('data-testid="roles-mobile-cards"'),
        "RolesTable must provide data-testid='roles-mobile-cards'"
      );
      assert.ok(
        rolesTableContent.includes("md:hidden divide-y divide-border/60"),
        "Mobile card container must only be visible on viewports below 768px"
      );
      assert.ok(
        rolesTableContent.includes("min-h-[38px]"),
        "Mobile action buttons must meet touch target accessibility guidelines (min-h-[38px])"
      );
    });
  });
});

