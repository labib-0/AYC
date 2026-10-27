/**
 * AYC HOTFIX REGRESSION SUITE: PROMPT 2/5
 * Issues #24 & #25 Verification
 *
 * Issue #24: Admin notifications popover is incorrectly positioned on mobile
 * Issue #25: Admin Coupons page mobile responsiveness
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Pure calculation function mirroring AdminHeader.tsx's positioning logic
function computePopoverLayout(opts: {
  viewportWidth: number;
  viewportHeight: number;
  triggerRect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
}) {
  const { viewportWidth, viewportHeight, triggerRect } = opts;
  const margin = 12;
  const panelWidth = Math.min(384, Math.max(280, viewportWidth - margin * 2));

  // Horizontal calculation: align right edge with button, clamped within viewport bounds
  let left = triggerRect.right - panelWidth;
  if (left < margin) {
    left = margin;
  } else if (left + panelWidth > viewportWidth - margin) {
    left = Math.max(margin, viewportWidth - panelWidth - margin);
  }

  // Vertical calculation: flip to top if bottom space is cramped and space above is greater
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const popoverHeight = 360;

  let placement: "top" | "bottom" = "bottom";
  let top: number | undefined;
  let bottom: number | undefined;
  let maxHeight = 420;

  if (spaceBelow < 280 && spaceAbove > spaceBelow) {
    placement = "top";
    bottom = viewportHeight - triggerRect.top + 8;
    maxHeight = Math.min(420, Math.max(160, spaceAbove - 24));
  } else {
    placement = "bottom";
    top = triggerRect.bottom + 8;
    maxHeight = Math.min(420, Math.max(160, spaceBelow - 24));
  }

  return {
    left,
    top,
    bottom,
    width: panelWidth,
    maxHeight,
    placement,
  };
}

describe("Prompt 2 Hotfix Regression Suite (Issues #24 & #25)", () => {
  const projectRoot = path.resolve(__dirname, "..");

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE #24: Admin Notifications Popover Positioning on Mobile
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Issue #24 — Admin Notifications Popover Viewport Positioning", () => {
    it("T24.1: Computes panel width and bounds safely on iPhone SE (320px viewport)", () => {
      // On 320px mobile, bell button is typically at x = 230 to 266px
      const layout = computePopoverLayout({
        viewportWidth: 320,
        viewportHeight: 568,
        triggerRect: { top: 12, bottom: 44, left: 230, right: 266, width: 36, height: 32 },
      });

      assert.equal(layout.width, 296, "Panel width should be exactly 320 - 24 = 296px at 320px viewport");
      assert.equal(layout.left, 12, "Left position must be clamped to 12px margin on 320px screen");
      assert.equal(layout.left + layout.width, 308, "Right edge must not exceed 308px (320 - 12)");
      assert.ok(layout.left >= 12, "Left edge must not bleed past left screen margin");
      assert.ok(layout.left + layout.width <= 320, "Right edge must never bleed beyond viewport");
      assert.equal(layout.placement, "bottom");
      assert.equal(layout.top, 52, "Top position should be button bottom (44) + 8px");
    });

    it("T24.2: Computes panel width and bounds safely on iPhone 12/13/14 (375px viewport)", () => {
      const layout = computePopoverLayout({
        viewportWidth: 375,
        viewportHeight: 667,
        triggerRect: { top: 12, bottom: 44, left: 285, right: 321, width: 36, height: 32 },
      });

      assert.equal(layout.width, 351, "Panel width should be 375 - 24 = 351px at 375px viewport");
      assert.equal(layout.left, 12, "Left position clamped to 12px margin");
      assert.ok(layout.left >= 12);
      assert.ok(layout.left + layout.width <= 375);
    });

    it("T24.3: Caps panel width to max 384px on tablet (768px) and desktop (1440px)", () => {
      const tabletLayout = computePopoverLayout({
        viewportWidth: 768,
        viewportHeight: 1024,
        triggerRect: { top: 12, bottom: 44, left: 680, right: 716, width: 36, height: 32 },
      });
      assert.equal(tabletLayout.width, 384, "Panel width capped at 384px on tablet");
      assert.ok(tabletLayout.left >= 12);
      assert.ok(tabletLayout.left + tabletLayout.width <= 768 - 12);

      const desktopLayout = computePopoverLayout({
        viewportWidth: 1440,
        viewportHeight: 900,
        triggerRect: { top: 12, bottom: 44, left: 1350, right: 1386, width: 36, height: 32 },
      });
      assert.equal(desktopLayout.width, 384, "Panel width capped at 384px on desktop");
      assert.ok(desktopLayout.left >= 12);
      assert.ok(desktopLayout.left + desktopLayout.width <= 1440 - 12);
    });

    it("T24.4: Auto-flips upward when vertical space below trigger is cramped (<280px)", () => {
      const layout = computePopoverLayout({
        viewportWidth: 375,
        viewportHeight: 667,
        triggerRect: { top: 500, bottom: 532, left: 285, right: 321, width: 36, height: 32 },
      });

      assert.equal(layout.placement, "top", "Should flip to top when space below is only 135px");
      assert.equal(layout.top, undefined);
      assert.equal(layout.bottom, 667 - 500 + 8, "Bottom position should be relative to viewport bottom");
      assert.ok(layout.maxHeight <= 420, "Max height constrained by available space");
    });

    it("T24.5: AdminHeader.tsx source inspection verifies portal, fixed positioning, dismissal listeners and z-index", () => {
      const headerCode = fs.readFileSync(
        path.join(projectRoot, "src/components/admin/layout/AdminHeader.tsx"),
        "utf8"
      );

      // 1. Portal verification
      assert.ok(
        headerCode.includes("createPortal("),
        "AdminHeader must use createPortal for the notification popover"
      );
      assert.ok(
        headerCode.includes("document.body"),
        "AdminHeader popover must be portaled directly to document.body to escape header overflow/z-index"
      );

      // 2. Fixed positioning & z-index
      assert.ok(
        headerCode.includes('position: "fixed"'),
        "Popover must use fixed positioning"
      );
      assert.ok(
        headerCode.includes("zIndex: 9999"),
        "Popover must have zIndex 9999 to overlay page content cleanly"
      );

      // 3. Viewport clamping logic
      assert.ok(
        headerCode.includes("Math.min(384, Math.max(280, viewportWidth - 24))"),
        "Popover width must be clamped between 280px and 384px based on viewport width"
      );
      assert.ok(
        headerCode.includes("left = 12") && headerCode.includes("left + panelWidth > viewportWidth - 12"),
        "Horizontal positioning must clamp within viewport left/right margins"
      );

      // 4. Auto-flip logic
      assert.ok(
        headerCode.includes("spaceBelow < 280 && spaceAbove > spaceBelow"),
        "Popover must auto-flip upward when space below is insufficient"
      );

      // 5. Dismissal on scroll, resize, escape, outside click
      assert.ok(
        headerCode.includes('window.addEventListener("resize", handleScrollOrResize)'),
        "Must listen for window resize"
      );
      assert.ok(
        headerCode.includes('window.addEventListener("scroll", handleScrollOrResize, true)'),
        "Must listen for window scroll (capture phase)"
      );
      assert.ok(
        headerCode.includes('e.key === "Escape"'),
        "Must support Escape key dismissal"
      );
      assert.ok(
        headerCode.includes("handleClickOutside"),
        "Must support outside click dismissal"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE #25: Admin Coupons Page Mobile Responsiveness
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Issue #25 — Admin Coupons Page Mobile Responsiveness", () => {
    it("T25.1: CouponHeader.tsx supports responsive stacking and minimum 40px touch targets", () => {
      const code = fs.readFileSync(
        path.join(projectRoot, "src/components/admin/coupons/CouponHeader.tsx"),
        "utf8"
      );

      // Container responsiveness
      assert.ok(
        code.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60 min-w-0 w-full"),
        "CouponHeader must have flex-col on mobile and flex-row on desktop"
      );

      // Button group stacking
      assert.ok(
        code.includes("flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0"),
        "Button container must occupy full width on mobile (w-full sm:w-auto)"
      );

      // Add Coupon button touch target & sizing
      assert.ok(
        code.includes("min-h-[40px]"),
        "Add Coupon button must have min-h-[40px] for comfortable mobile touch targets"
      );
      assert.ok(
        code.includes("flex-1 sm:flex-initial"),
        "Add Coupon button must expand on mobile (flex-1 sm:flex-initial)"
      );

      // Refresh button touch target
      assert.ok(
        code.includes("h-10 w-10 shrink-0 inline-flex items-center justify-center"),
        "Refresh button must have 40x40px touch target (h-10 w-10)"
      );
    });

    it("T25.2: Coupons page tabs are responsive, horizontally scrollable and touch-friendly", () => {
      const code = fs.readFileSync(
        path.join(projectRoot, "src/app/ayc/coupons/page.tsx"),
        "utf8"
      );

      // Outer container
      assert.ok(
        code.includes("space-y-6 min-w-0 w-full max-w-full"),
        "Page main container must prevent overflow with min-w-0 w-full max-w-full"
      );

      // Navigation tabs container
      assert.ok(
        code.includes("w-full sm:w-fit max-w-full overflow-x-auto subtle-scrollbar"),
        "Tabs container must adapt to full width and allow horizontal scroll if needed"
      );

      // Tab buttons
      assert.ok(
        code.includes("flex-1 sm:flex-initial whitespace-nowrap min-h-[38px] sm:min-h-0"),
        "Tab buttons must be flexible with comfortable min-height on mobile"
      );
    });

    it("T25.3: CouponToolbar.tsx search is full width and filters wrap without overflow", () => {
      const code = fs.readFileSync(
        path.join(projectRoot, "src/components/admin/coupons/CouponToolbar.tsx"),
        "utf8"
      );

      // Toolbar container
      assert.ok(
        code.includes("min-w-0 w-full"),
        "CouponToolbar container must have min-w-0 w-full"
      );

      // Search input
      assert.ok(
        code.includes("relative flex-1 w-full min-w-0"),
        "Search input container must be full width"
      );
      assert.ok(
        code.includes("min-h-[38px]"),
        "Search input must have min-h-[38px]"
      );

      // Filter select wrapping
      assert.ok(
        code.includes("flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-1.5 w-full sm:w-auto"),
        "Filter selects must wrap on mobile (flex-wrap sm:flex-nowrap)"
      );
      assert.ok(
        code.includes("flex-1 sm:flex-initial min-w-[110px]"),
        "Filter selects must have min-width and flex-1 on mobile"
      );
    });

    it("T25.4: CouponAdminBindingsSection.tsx contains toolbar wrapping and table overflow containment", () => {
      const code = fs.readFileSync(
        path.join(projectRoot, "src/components/admin/coupons/CouponAdminBindingsSection.tsx"),
        "utf8"
      );

      // Section toolbar
      assert.ok(
        code.includes("relative w-full sm:max-w-sm min-w-0"),
        "Bindings search must be full width on mobile"
      );
      assert.ok(
        code.includes("flex items-center gap-2 w-full sm:w-auto shrink-0"),
        "Bindings action buttons must adapt beneath search on mobile"
      );
      assert.ok(
        code.includes("flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[38px]"),
        "Bind Coupon button must have comfortable touch target and flex-1 on mobile"
      );
      assert.ok(
        code.includes("h-[38px] w-[38px]"),
        "Refresh bindings button must have adequate touch dimensions"
      );

      // Table horizontal scroll containment
      assert.ok(
        code.includes("overflow-x-auto subtle-scrollbar w-full min-w-0"),
        "Bindings table wrapper must enable subtle horizontal scroll without overflowing page"
      );
      assert.ok(
        code.includes("min-w-[560px]"),
        "Bindings table must declare explicit min-w-[560px] to prevent column collapse"
      );

      // Unbind touch targets
      assert.ok(
        code.includes("min-h-[36px]"),
        "Unbind button must maintain at least 36px touch target"
      );
    });

    it("T25.5: CouponTable.tsx enforces desktop min-width and mobile stacked card touch targets", () => {
      const code = fs.readFileSync(
        path.join(projectRoot, "src/components/admin/coupons/CouponTable.tsx"),
        "utf8"
      );

      // Desktop table min-width
      assert.ok(
        code.includes("min-w-[680px]"),
        "Desktop table must have min-w-[680px] to prevent column cramping"
      );
      assert.ok(
        code.includes("overflow-x-auto subtle-scrollbar"),
        "Desktop table must be wrapped in scrollable container"
      );

      // Mobile card layout
      assert.ok(
        code.includes("md:hidden divide-y divide-border/60"),
        "Mobile view must render stacked cards"
      );
      assert.ok(
        code.includes("break-all"),
        "Coupon codes on mobile cards must break-all to prevent horizontal blowout"
      );

      // Card action touch targets
      assert.ok(
        code.includes("min-h-[36px]"),
        "Mobile card action buttons must have min-h-[36px]"
      );
      assert.ok(
        code.includes("min-w-[36px]"),
        "Mobile card edit/delete buttons must have min-w-[36px]"
      );
      assert.ok(
        code.includes("flex flex-wrap items-center justify-between gap-2"),
        "Mobile card footer must flex-wrap to prevent action button overflow"
      );
    });

    it("T25.6: Modal dialogs (CouponBindModal & CouponModal) provide outside-click and Escape key dismissal", () => {
      const bindModalCode = fs.readFileSync(
        path.join(projectRoot, "src/components/admin/coupons/CouponBindModal.tsx"),
        "utf8"
      );
      const couponModalCode = fs.readFileSync(
        path.join(projectRoot, "src/components/admin/coupons/CouponModal.tsx"),
        "utf8"
      );

      // CouponBindModal
      assert.ok(
        bindModalCode.includes('e.key === "Escape"'),
        "CouponBindModal must listen for Escape key"
      );
      assert.ok(
        bindModalCode.includes("e.target === e.currentTarget"),
        "CouponBindModal must dismiss on backdrop click"
      );
      assert.ok(
        bindModalCode.includes("e.stopPropagation()"),
        "CouponBindModal card must prevent propagation"
      );

      // CouponModal
      assert.ok(
        couponModalCode.includes('e.key === "Escape"'),
        "CouponModal must listen for Escape key"
      );
      assert.ok(
        couponModalCode.includes("e.target === e.currentTarget"),
        "CouponModal must dismiss on backdrop click"
      );
      assert.ok(
        couponModalCode.includes("e.stopPropagation()"),
        "CouponModal card must prevent propagation"
      );
    });
  });
});
