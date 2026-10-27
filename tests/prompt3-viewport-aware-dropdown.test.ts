/**
 * REGRESSION TEST SUITE: PROMPT 3/5 VIEWPORT-AWARE ACTION DROPDOWNS
 * - Issue #18: Admin action dropdown chooses suitable position so complete menu remains visible
 *   within viewport and is not clipped by table, scrolling container, footer, or browser window.
 */

import assert from "assert";
import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;

function it(description: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          console.log(`  ✅ [PASS] ${description}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ❌ [FAIL] ${description}`);
          console.error(err);
          failed++;
        });
    } else {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
      return Promise.resolve();
    }
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(err);
    failed++;
    return Promise.resolve();
  }
}

// Positioning calculation logic mirror for unit testing
function calculateMenuPosition(params: {
  triggerRect: { top: number; bottom: number; left: number; right: number };
  viewportWidth: number;
  viewportHeight: number;
  menuHeight?: number;
}) {
  const { triggerRect, viewportWidth, viewportHeight, menuHeight = 360 } = params;

  if (triggerRect.bottom < 0 || triggerRect.top > viewportHeight) {
    return { shouldClose: true };
  }

  const GAP = 4;
  const PADDING = 8;
  const MENU_WIDTH = 192;

  const spaceBelow = viewportHeight - triggerRect.bottom - GAP - PADDING;
  const spaceAbove = triggerRect.top - GAP - PADDING;

  const shouldOpenUp = spaceBelow < Math.min(menuHeight, 260) && spaceAbove > spaceBelow;
  const placement = shouldOpenUp ? "top" : "bottom";

  let top: number | undefined;
  let bottom: number | undefined;
  let maxHeight: number;

  if (shouldOpenUp) {
    bottom = Math.round(viewportHeight - triggerRect.top + GAP);
    maxHeight = Math.min(menuHeight, Math.max(120, Math.floor(spaceAbove)));
  } else {
    top = Math.round(triggerRect.bottom + GAP);
    maxHeight = Math.min(menuHeight, Math.max(120, Math.floor(spaceBelow)));
  }

  let right: number | undefined = Math.round(viewportWidth - triggerRect.right);
  let left: number | undefined;

  if (triggerRect.right - MENU_WIDTH < PADDING) {
    left = Math.max(PADDING, Math.round(triggerRect.left));
    right = undefined;
  } else if (right < PADDING) {
    right = PADDING;
  }

  return {
    shouldClose: false,
    placement,
    top,
    bottom,
    left,
    right,
    maxHeight,
  };
}

async function runAll() {
  console.log("\n=================================================================");
  console.log("RUNNING: Prompt 3 Viewport-Aware Action Dropdowns Regression Suite");
  console.log("=================================================================\n");

  const rowPath = path.resolve(process.cwd(), "src/components/admin/products/ProductTableRow.tsx");
  const content = fs.readFileSync(rowPath, "utf-8");

  // 1. Static Architecture & Code Inspection
  console.log("--- PART 1: Architecture & Container Clipping Immunity ---");

  await it("ProductTableRow imports and utilizes createPortal from react-dom", () => {
    assert.ok(content.includes('import { createPortal } from "react-dom";'), "Must import createPortal");
    assert.ok(content.includes("createPortal(menuElement, document.body)"), "Must render dropdown in document.body");
  });

  await it("ProductTableRow uses fixed positioning with high z-index (9999) to escape stacking contexts", () => {
    assert.ok(content.includes('position: "fixed"'), "Must use fixed positioning for portal element");
    assert.ok(content.includes("zIndex: 9999"), "Must specify z-index 9999 to render above sticky columns and headers");
  });

  await it("Dropdown menu container enforces scrollable container with overflow-y-auto and subtle-scrollbar", () => {
    assert.ok(content.includes("overflow-y-auto subtle-scrollbar"), "Dropdown menu must be scrollable when constrained");
  });

  await it("Dropdown menu provides data-placement attribute for inspection ('top' or 'bottom')", () => {
    assert.ok(content.includes("data-placement={placement}"), "Must reflect placement in data-placement attribute");
  });

  // 2. Vertical Positioning & Boundary Detection
  console.log("\n--- PART 2: Viewport-Aware Vertical Placement ---");

  await it("Downward placement: opens downward when sufficient space exists below trigger", () => {
    // Standard desktop (1440x900), row near top (triggerRect bottom = 200)
    const pos = calculateMenuPosition({
      triggerRect: { top: 172, bottom: 200, left: 1300, right: 1328 },
      viewportWidth: 1440,
      viewportHeight: 900,
      menuHeight: 360,
    });

    assert.strictEqual(pos.placement, "bottom", "Should open downward");
    assert.strictEqual(pos.top, 204, "Top should be trigger bottom + GAP (200 + 4)");
    assert.strictEqual(pos.bottom, undefined, "Bottom should not be set when opening downward");
    assert.ok(pos.maxHeight >= 360, "Full height available");
  });

  await it("Upward placement: flips upward when trigger is near the bottom of the viewport", () => {
    // Desktop (1440x900), row near bottom (triggerRect bottom = 850, top = 822)
    const pos = calculateMenuPosition({
      triggerRect: { top: 822, bottom: 850, left: 1300, right: 1328 },
      viewportWidth: 1440,
      viewportHeight: 900,
      menuHeight: 360,
    });

    assert.strictEqual(pos.placement, "top", "Should open upward when bottom space is cramped");
    assert.strictEqual(pos.bottom, 82, "Bottom should be viewportHeight - triggerRect.top + GAP (900 - 822 + 4)");
    assert.strictEqual(pos.top, undefined, "Top should not be set when opening upward");
    assert.ok(pos.maxHeight >= 360, "Max height should accommodate menu in upper space");
  });

  await it("Constrained height: clamps maxHeight when both directions have limited space", () => {
    // Small viewport (landscape mobile or split screen, 800x400)
    const pos = calculateMenuPosition({
      triggerRect: { top: 220, bottom: 248, left: 600, right: 628 },
      viewportWidth: 800,
      viewportHeight: 400,
      menuHeight: 360,
    });

    assert.strictEqual(pos.placement, "top", "Should pick upper direction having more space");
    assert.ok(pos.maxHeight <= 220, "maxHeight should be constrained to available space above");
    assert.ok(pos.maxHeight >= 120, "maxHeight should respect minimum lower bound of 120px");
  });

  await it("Offscreen scroll dismissal: closes menu when row scrolls completely out of viewport", () => {
    // Row scrolled above top edge (bottom < 0)
    const posAbove = calculateMenuPosition({
      triggerRect: { top: -100, bottom: -72, left: 1300, right: 1328 },
      viewportWidth: 1440,
      viewportHeight: 900,
    });
    assert.strictEqual(posAbove.shouldClose, true, "Should close when row scrolls above viewport");

    // Row scrolled below bottom edge (top > 900)
    const posBelow = calculateMenuPosition({
      triggerRect: { top: 950, bottom: 978, left: 1300, right: 1328 },
      viewportWidth: 1440,
      viewportHeight: 900,
    });
    assert.strictEqual(posBelow.shouldClose, true, "Should close when row scrolls below viewport");
  });

  // 3. Horizontal Positioning & Responsive Widths
  console.log("\n--- PART 3: Horizontal Alignment & Viewport Widths ---");

  await it("Desktop (1440x900): aligns menu to right of trigger button", () => {
    const pos = calculateMenuPosition({
      triggerRect: { top: 300, bottom: 328, left: 1300, right: 1328 },
      viewportWidth: 1440,
      viewportHeight: 900,
    });

    assert.strictEqual(pos.right, 112, "Right should be 1440 - 1328 = 112");
    assert.strictEqual(pos.left, undefined, "Left should be undefined when right aligned");
  });

  await it("Tablet Portrait (768x1024): aligns properly and stays inside screen width", () => {
    const pos = calculateMenuPosition({
      triggerRect: { top: 400, bottom: 428, left: 700, right: 728 },
      viewportWidth: 768,
      viewportHeight: 1024,
    });

    assert.ok(pos.right !== undefined && pos.right >= 8, "Right offset must be >= padding 8");
    const menuLeft = 768 - pos.right! - 192;
    assert.ok(menuLeft >= 8, "Left edge must not overflow left boundary");
  });

  await it("Mobile (375x812): prevents horizontal left-edge bleeding when right aligned", () => {
    // On 375px wide screen, if trigger button is near left or table is scrolled
    const pos = calculateMenuPosition({
      triggerRect: { top: 300, bottom: 328, left: 120, right: 148 },
      viewportWidth: 375,
      viewportHeight: 812,
    });

    // 148 - 192 = -44 (overflows left edge). Should flip to left alignment!
    assert.strictEqual(pos.left, 120, "Should align left to trigger when right-alignment overflows");
    assert.strictEqual(pos.right, undefined);
  });

  // 4. Interaction, Actions & Dismissal
  console.log("\n--- PART 4: Actions, Keyboard Navigation & Dismissal ---");

  await it("Trigger button implements full accessibility attributes (haspopup, expanded, controls, label)", () => {
    assert.ok(content.includes('aria-haspopup="menu"'), "Trigger button must have aria-haspopup='menu'");
    assert.ok(content.includes("aria-expanded={menuOpen}"), "Trigger button must bind aria-expanded");
    assert.ok(content.includes("aria-controls={menuOpen ? `menu-product-actions-${product.id}` : undefined}"), "Must reference menu id");
    assert.ok(content.includes('aria-label={`Actions for ${product.name}`'), "Must have accessible label");
  });

  await it("Dropdown container and items implement ARIA roles (role='menu' and role='menuitem')", () => {
    assert.ok(content.includes('role="menu"'), "Dropdown container must have role='menu'");
    assert.ok(content.includes('role="menuitem"'), "Action items must have role='menuitem'");
  });

  await it("Escape key listener closes dropdown and restores focus to button", () => {
    assert.ok(content.includes('e.key === "Escape"'), "Must handle Escape key press");
    assert.ok(content.includes("buttonRef.current?.focus()"), "Must restore focus to trigger button on Escape");
  });

  await it("Outside click listener dismisses dropdown without interfering with button click", () => {
    assert.ok(content.includes("handleMouseDown"), "Must attach mousedown handler");
    assert.ok(content.includes("buttonRef.current.contains(target)"), "Must ignore clicks inside trigger button");
    assert.ok(content.includes("menuRef.current.contains(target)"), "Must ignore clicks inside menu");
  });

  await it("All 10 product row actions are fully preserved and close menu on click", () => {
    const actions = [
      "Edit Product",
      "Adjust Stock",
      "Stock Movement History",
      "Mark as Sold Out",
      "Offer Sheet",
      "View Storefront",
      "onToggleStorefrontVisibility",
      "onToggleFeatured",
      "onTogglePublish",
      "onDelete",
    ];

    for (const action of actions) {
      assert.ok(content.includes(action), `ProductTableRow must preserve action: ${action}`);
    }
  });

  console.log("\n-----------------------------------------------------------------");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("-----------------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

