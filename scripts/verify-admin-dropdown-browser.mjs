import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const QA_SCREENSHOTS_DIR = path.resolve("docs/qa/admin-ui-hotfixes-2026-10-27/screenshots");
const ARTIFACT_DIR = path.resolve(
  process.env.HOME || "",
  ".gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81"
);

fs.mkdirSync(QA_SCREENSHOTS_DIR, { recursive: true });
if (fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "desktop_1440", width: 1440, height: 900 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "mobile_375", width: 375, height: 812 },
  { name: "mobile_320", width: 320, height: 720 },
];

async function runBrowserVerification() {
  console.log("================================================================================");
  console.log("AYC ADMIN HOTFIX BROWSER VERIFICATION: ISSUE #32 DROPDOWN POSITIONING");
  console.log("================================================================================\n");

  let totalChecks = 0;
  let passedChecks = 0;

  function recordCheck(condition, description) {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✅ [PASS] ${description}`);
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  try {
    const page = await browser.newPage();

    // Authenticate Admin session via localStorage
    const adminSession = {
      id: "1",
      name: "Ayaan Admin",
      email: "admin@ayaanclothing.com",
      role: "admin",
      is_super_admin: true,
      access_level: "super_admin",
    };

    await page.goto(`${BASE_URL}/ayc`, { waitUntil: "networkidle0" });
    await page.evaluate((admin) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_admin_session", JSON.stringify(admin));
      localStorage.setItem("ayaan_admin_token", "mock_admin_token_super_admin");
      localStorage.setItem("ayaan_role", "admin");
    }, adminSession);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. VERIFY ACROSS ALL 4 VIEWPORTS
    // ─────────────────────────────────────────────────────────────────────────
    for (const vp of VIEWPORTS) {
      console.log(`\n▶ Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/administrators`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 800));

      // Scroll trigger into view on mobile/tablet if needed
      await page.evaluate(() => {
        const trigger = document.querySelector("tbody tr:last-child button[data-testid^='admin-actions-trigger-']");
        if (trigger) {
          trigger.scrollIntoView({ block: "center", inline: "center" });
        }
      });
      await new Promise((r) => setTimeout(r, 200));

      // Click row action trigger
      const clickResult = await page.evaluate(() => {
        const trigger = document.querySelector("tbody tr:last-child button[data-testid^='admin-actions-trigger-']");
        if (!trigger) return null;
        trigger.click();
        return { id: trigger.id, rect: trigger.getBoundingClientRect() };
      });

      recordCheck(Boolean(clickResult), `[${vp.name}] Trigger button located and clicked`);
      await new Promise((r) => setTimeout(r, 300));

      // Inspect open dropdown metrics
      const menuMetrics = await page.evaluate(() => {
        const menu = document.querySelector("[data-testid^='admin-actions-menu-']");
        if (!menu) return null;

        const rect = menu.getBoundingClientRect();
        const docEl = document.documentElement;
        const isPortal = menu.parentElement === document.body;
        const style = window.getComputedStyle(menu);

        const items = Array.from(menu.querySelectorAll("[role='menuitem']")).map((item) => ({
          text: item.innerText.trim(),
          height: item.getBoundingClientRect().height,
          visible: item.getBoundingClientRect().height > 0,
        }));

        return {
          menuExists: true,
          isPortal,
          position: style.position,
          zIndex: Number(style.zIndex) || 0,
          placement: menu.getAttribute("data-placement"),
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
          },
          fitsInViewportX: rect.left >= 0 && rect.right <= window.innerWidth + 1,
          fitsInViewportY: rect.top >= 0 && rect.bottom <= window.innerHeight + 1,
          noPageOverflow: docEl.scrollWidth <= window.innerWidth + 1,
          itemCount: items.length,
          hasAssignRoles: items.some((i) => i.text.includes("Assign RBAC Roles")),
          hasResetPassword: items.some((i) => i.text.includes("Reset Password")),
          hasToggleStatus: items.some((i) => i.text.includes("Account")),
          hasDelete: items.some((i) => i.text.includes("Delete Administrator")),
        };
      });

      if (menuMetrics) {
        recordCheck(menuMetrics.isPortal, `[${vp.name}] Rendered through portal into document.body`);
        recordCheck(menuMetrics.position === "fixed", `[${vp.name}] Fixed position applied (position: ${menuMetrics.position})`);
        recordCheck(menuMetrics.zIndex >= 9999, `[${vp.name}] Stacking context z-index >= 9999 (zIndex: ${menuMetrics.zIndex})`);
        recordCheck(menuMetrics.fitsInViewportX, `[${vp.name}] Horizontal boundaries fit inside viewport (left=${Math.round(menuMetrics.rect.left)}, right=${Math.round(menuMetrics.rect.right)}, viewportWidth=${vp.width})`);
        recordCheck(menuMetrics.fitsInViewportY, `[${vp.name}] Vertical boundaries fit inside viewport (top=${Math.round(menuMetrics.rect.top)}, bottom=${Math.round(menuMetrics.rect.bottom)}, viewportHeight=${vp.height})`);
        recordCheck(menuMetrics.noPageOverflow, `[${vp.name}] Zero horizontal page-level overflow`);
        recordCheck(menuMetrics.itemCount === 4, `[${vp.name}] All 4 action items rendered in menu`);
        recordCheck(menuMetrics.hasAssignRoles, `[${vp.name}] 'Assign RBAC Roles' action is visible and readable`);
      } else {
        recordCheck(false, `[${vp.name}] Menu failed to open or could not be found`);
      }

      // Screenshot for evidence
      const screenshotName = `admin_dropdown_${vp.name}.png`;
      const qaPath = path.join(QA_SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: qaPath });
      if (fs.existsSync(ARTIFACT_DIR)) {
        fs.copyFileSync(qaPath, path.join(ARTIFACT_DIR, screenshotName));
      }
      console.log(`    📸 Saved screenshot: ${screenshotName}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. VERIFY UPWARD PLACEMENT WHEN SCROLLED NEAR BOTTOM
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Testing Upward Placement When Space Below is Constrained");
    await page.setViewport({ width: 1024, height: 580 });
    await page.goto(`${BASE_URL}/ayc/administrators`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 600));

    // Scroll window so the trigger is near the very bottom of the screen
    await page.evaluate(() => {
      window.scrollTo(0, 160);
      const trigger = document.querySelector("tbody tr:last-child button[data-testid^='admin-actions-trigger-']");
      if (trigger) trigger.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const upwardMetrics = await page.evaluate(() => {
      const menu = document.querySelector("[data-testid^='admin-actions-menu-']");
      const trigger = document.querySelector("tbody tr:last-child button[data-testid^='admin-actions-trigger-']");
      if (!menu || !trigger) return null;

      const menuRect = menu.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();

      return {
        placement: menu.getAttribute("data-placement"),
        menuRect: { top: menuRect.top, bottom: menuRect.bottom, height: menuRect.height },
        triggerRect: { top: triggerRect.top, bottom: triggerRect.bottom },
        openedAboveTrigger: menuRect.bottom <= triggerRect.top + 8,
        staysInsideViewport: menuRect.top >= 0 && menuRect.bottom <= window.innerHeight,
      };
    });

    if (upwardMetrics) {
      recordCheck(upwardMetrics.placement === "top", `Upward placement activated when space below constrained (placement=${upwardMetrics.placement})`);
      recordCheck(upwardMetrics.openedAboveTrigger, `Menu bottom (${Math.round(upwardMetrics.menuRect.bottom)}px) is above trigger top (${Math.round(upwardMetrics.triggerRect.top)}px)`);
      recordCheck(upwardMetrics.staysInsideViewport, `Menu remains fully inside viewport when opening upward (top=${Math.round(upwardMetrics.menuRect.top)}px >= 0)`);
    } else {
      recordCheck(false, "Upward placement test menu not found");
    }

    const upwardScreenshot = "admin_dropdown_upward_placement.png";
    const qaUpwardPath = path.join(QA_SCREENSHOTS_DIR, upwardScreenshot);
    await page.screenshot({ path: qaUpwardPath });
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(qaUpwardPath, path.join(ARTIFACT_DIR, upwardScreenshot));
    }
    console.log(`    📸 Saved screenshot: ${upwardScreenshot}`);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. VERIFY DISMISSAL (ESCAPE KEY & OUTSIDE CLICK)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Testing Dismissal Behaviors (Escape Key & Outside Click)");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/ayc/administrators`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 600));

    // Test Escape key dismissal
    await page.evaluate(() => {
      const trigger = document.querySelector("button[data-testid^='admin-actions-trigger-']");
      trigger?.click();
    });
    await new Promise((r) => setTimeout(r, 200));
    const openedBeforeEscape = await page.evaluate(() => Boolean(document.querySelector("[data-testid^='admin-actions-menu-']")));
    recordCheck(openedBeforeEscape, "Menu opened before Escape key press");

    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 200));
    const closedAfterEscape = await page.evaluate(() => !document.querySelector("[data-testid^='admin-actions-menu-']"));
    recordCheck(closedAfterEscape, "Menu successfully dismissed on Escape key press");

    // Test Outside click dismissal
    await page.evaluate(() => {
      const trigger = document.querySelector("button[data-testid^='admin-actions-trigger-']");
      trigger?.click();
    });
    await new Promise((r) => setTimeout(r, 200));
    const openedBeforeOutsideClick = await page.evaluate(() => Boolean(document.querySelector("[data-testid^='admin-actions-menu-']")));
    recordCheck(openedBeforeOutsideClick, "Menu opened before outside click");

    await page.mouse.click(50, 50); // Click outside on header
    await new Promise((r) => setTimeout(r, 200));
    const closedAfterOutsideClick = await page.evaluate(() => !document.querySelector("[data-testid^='admin-actions-menu-']"));
    recordCheck(closedAfterOutsideClick, "Menu successfully dismissed on outside click");

    // ─────────────────────────────────────────────────────────────────────────
    // 4. VERIFY ACTION EXECUTION ("Assign RBAC Roles")
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Testing Action Execution ('Assign RBAC Roles' Modal Opening)");
    await page.evaluate(() => {
      const trigger = document.querySelector("button[data-testid^='admin-actions-trigger-']");
      trigger?.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    const assignRolesClicked = await page.evaluate(() => {
      const btn = document.querySelector("button[data-testid^='admin-action-assign-roles-']");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    recordCheck(assignRolesClicked, "'Assign RBAC Roles' item clicked from dropdown menu");
    await new Promise((r) => setTimeout(r, 400));

    const modalState = await page.evaluate(() => {
      const h2s = Array.from(document.querySelectorAll("h2")).map((h) => h.innerText.toUpperCase());
      const hasModal = h2s.some((text) => text.includes("ASSIGN RBAC ROLES"));
      const menuDismissed = !document.querySelector("[data-testid^='admin-actions-menu-']");
      return { hasModal, menuDismissed };
    });

    recordCheck(modalState.hasModal, "Assign RBAC Roles modal opened successfully upon selection");
    recordCheck(modalState.menuDismissed, "Dropdown menu closed upon action selection without orphan popovers");

    const modalScreenshot = "admin_dropdown_roles_modal.png";
    const qaModalPath = path.join(QA_SCREENSHOTS_DIR, modalScreenshot);
    await page.screenshot({ path: qaModalPath });
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(qaModalPath, path.join(ARTIFACT_DIR, modalScreenshot));
    }
    console.log(`    📸 Saved screenshot: ${modalScreenshot}`);

    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(`BROWSER VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log("================================================================================\n");

  if (passedChecks === totalChecks && totalChecks > 0) {
    console.log("🎉 ALL ISSUE #32 BROWSER CHECKS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error(`⚠️ SOME CHECKS FAILED (${totalChecks - passedChecks} failed out of ${totalChecks})`);
    process.exit(1);
  }
}

runBrowserVerification().catch((err) => {
  console.error("Fatal error during dropdown browser verification:", err);
  process.exit(1);
});

