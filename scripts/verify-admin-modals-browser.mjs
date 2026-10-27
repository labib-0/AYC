import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const QA_SCREENSHOTS_DIR = path.resolve("docs/qa/admin-ui-hotfixes-2026-10-27/screenshots");
fs.mkdirSync(QA_SCREENSHOTS_DIR, { recursive: true });

async function runBrowserVerification() {
  console.log("================================================================================");
  console.log("AYC ADMIN HOTFIX BROWSER VERIFICATION: ISSUES #33, #34, #36");
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
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,800"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Inject super-admin session into localStorage for admin access
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
      localStorage.setItem("ayaan_admin_session", JSON.stringify(admin));
      localStorage.setItem("ayaan_admin_token", "mock_admin_token_super_admin");
      localStorage.setItem("ayaan_role", "admin");
    }, adminSession);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ISSUE #33: EDIT ADMINISTRATOR ACCOUNT MODAL
    // ─────────────────────────────────────────────────────────────────────────
    console.log("▶ Verifying Issue #33: Edit Administrator Account Modal Dismissal (/ayc/administrators)");
    await page.goto(`${BASE_URL}/ayc/administrators`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1200));

    // Trigger modal open via click on "Create Administrator" or "Edit Administrator"
    const opened = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find((b) =>
        b.textContent?.includes("Create Administrator") ||
        b.textContent?.includes("Add Administrator") ||
        b.getAttribute("title")?.includes("Edit Administrator") ||
        b.getAttribute("title")?.includes("Edit")
      );
      if (target) {
        target.click();
        return true;
      }
      return false;
    });

    recordCheck(opened, "Triggered Edit/Add Administrator modal open button");
    await new Promise((r) => setTimeout(r, 500));

    // Check modal is open
    let modalOverlay = await page.$("[data-testid='admin-form-modal-overlay']");
    let modalContent = await page.$("[data-testid='admin-form-modal-content']");
    recordCheck(Boolean(modalOverlay && modalContent), "AdminFormModal opened and mounted in DOM");

    if (modalContent) {
      // Test 1: Inside click must NOT close modal
      const nameInput = await page.$("[data-testid='admin-form-modal-content'] input[type='text']");
      if (nameInput) {
        await nameInput.click();
        await new Promise((r) => setTimeout(r, 200));
        const stillOpenAfterInside = await page.$("[data-testid='admin-form-modal-content']");
        recordCheck(Boolean(stillOpenAfterInside), "Clicking inside form inputs preserves modal open state");
      }

      // Test 2: Outside click closes modal
      // Click at viewport x=20, y=20 (on the overlay backdrop outside content)
      await page.mouse.click(20, 20);
      await new Promise((r) => setTimeout(r, 400));
      let closedAfterOutside = await page.$("[data-testid='admin-form-modal-content']");
      recordCheck(!closedAfterOutside, "Clicking overlay backdrop closes AdminFormModal cleanly");

      // Test 3: Re-open and test Escape key
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const target = btns.find((b) =>
          b.textContent?.includes("Create Administrator") ||
          b.textContent?.includes("Add Administrator") ||
          b.getAttribute("title")?.includes("Edit Administrator") ||
          b.getAttribute("title")?.includes("Edit")
        );
        target?.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      modalContent = await page.$("[data-testid='admin-form-modal-content']");
      recordCheck(Boolean(modalContent), "AdminFormModal re-opened successfully");

      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 400));
      let closedAfterEscape = await page.$("[data-testid='admin-form-modal-content']");
      recordCheck(!closedAfterEscape, "Pressing Escape key closes AdminFormModal cleanly");

      // Test 4: Cancel button closes modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const target = btns.find((b) =>
          b.textContent?.includes("Create Administrator") ||
          b.textContent?.includes("Add Administrator") ||
          b.getAttribute("title")?.includes("Edit Administrator") ||
          b.getAttribute("title")?.includes("Edit")
        );
        target?.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      const cancelBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("[data-testid='admin-form-modal-content'] button"));
        return btns.find((b) => b.textContent?.trim() === "Cancel");
      });
      if (cancelBtn) {
        await cancelBtn.click();
        await new Promise((r) => setTimeout(r, 400));
        let closedAfterCancel = await page.$("[data-testid='admin-form-modal-content']");
        recordCheck(!closedAfterCancel, "Clicking Cancel button closes AdminFormModal cleanly");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ISSUE #34: EDIT ROLE MODAL
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Verifying Issue #34: Edit Role Modal Dismissal (/ayc/roles)");
    await page.goto(`${BASE_URL}/ayc/roles`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));

    // Open Role Modal via button
    const openedRole = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find((b) =>
        b.textContent?.includes("Create Role") ||
        b.textContent?.includes("Create Custom Role") ||
        b.getAttribute("title")?.includes("Edit")
      );
      if (target) {
        target.click();
        return true;
      }
      return false;
    });

    recordCheck(openedRole, "Triggered Create/Edit Role modal open button");
    await new Promise((r) => setTimeout(r, 500));

    modalOverlay = await page.$("[data-testid='role-form-modal-overlay']");
    modalContent = await page.$("[data-testid='role-form-modal-content']");
    recordCheck(Boolean(modalOverlay && modalContent), "RoleFormModal opened and mounted in DOM");

    if (modalContent) {
      // Test 1: Inside click must NOT close modal
      const roleNameInput = await page.$("[data-testid='role-form-modal-content'] input[type='text']");
      if (roleNameInput) {
        await roleNameInput.click();
        await new Promise((r) => setTimeout(r, 200));
        const stillOpenAfterInside = await page.$("[data-testid='role-form-modal-content']");
        recordCheck(Boolean(stillOpenAfterInside), "Clicking inside role form inputs preserves modal open state");
      }

      // Test 2: Outside click closes modal
      await page.mouse.click(20, 20);
      await new Promise((r) => setTimeout(r, 400));
      let closedAfterOutside = await page.$("[data-testid='role-form-modal-content']");
      recordCheck(!closedAfterOutside, "Clicking overlay backdrop closes RoleFormModal cleanly");

      // Test 3: Re-open and test Escape key
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const target = btns.find((b) =>
          b.textContent?.includes("Create Role") ||
          b.textContent?.includes("Create Custom Role") ||
          b.getAttribute("title")?.includes("Edit")
        );
        target?.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      modalContent = await page.$("[data-testid='role-form-modal-content']");
      recordCheck(Boolean(modalContent), "RoleFormModal re-opened successfully");

      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 400));
      let closedAfterEscape = await page.$("[data-testid='role-form-modal-content']");
      recordCheck(!closedAfterEscape, "Pressing Escape key closes RoleFormModal cleanly");

      // Test 4: Cancel button closes modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const target = btns.find((b) =>
          b.textContent?.includes("Create Role") ||
          b.textContent?.includes("Create Custom Role") ||
          b.getAttribute("title")?.includes("Edit")
        );
        target?.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      const cancelRoleBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("[data-testid='role-form-modal-content'] button"));
        return btns.find((b) => b.textContent?.trim() === "Cancel");
      });
      if (cancelRoleBtn) {
        await cancelRoleBtn.click();
        await new Promise((r) => setTimeout(r, 400));
        let closedAfterCancel = await page.$("[data-testid='role-form-modal-content']");
        recordCheck(!closedAfterCancel, "Clicking Cancel button closes RoleFormModal cleanly");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. ISSUE #36: CHANGE ADMIN PASSWORD MODAL
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Verifying Issue #36: Change Admin Password Modal Dismissal (/ayc/settings?tab=profile)");
    await page.goto(`${BASE_URL}/ayc/settings?tab=profile`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));

    // Open Change Password modal
    const openedPassword = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find((b) => b.textContent?.includes("Change Password"));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });

    recordCheck(openedPassword, "Triggered Change Password modal open button");
    await new Promise((r) => setTimeout(r, 500));

    modalOverlay = await page.$("[data-testid='change-password-modal-overlay']");
    modalContent = await page.$("[data-testid='change-password-modal-content']");
    recordCheck(Boolean(modalOverlay && modalContent), "ChangePasswordModal opened and mounted in DOM");

    if (modalContent) {
      // Test 1: Inside click must NOT close modal, type test password
      const pwInput = await page.$("[data-testid='change-password-modal-content'] input[type='password']");
      if (pwInput) {
        await pwInput.click();
        await pwInput.type("TemporarySecret123!");
        await new Promise((r) => setTimeout(r, 200));
        const stillOpenAfterInside = await page.$("[data-testid='change-password-modal-content']");
        recordCheck(Boolean(stillOpenAfterInside), "Clicking inside password inputs preserves modal open state");
      }

      // Test 2: Outside click closes modal
      await page.mouse.click(20, 20);
      await new Promise((r) => setTimeout(r, 400));
      let closedAfterOutside = await page.$("[data-testid='change-password-modal-content']");
      recordCheck(!closedAfterOutside, "Clicking overlay backdrop closes ChangePasswordModal cleanly");

      // Test 3: Sensitive password state must be wiped when re-opened
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const target = btns.find((b) => b.textContent?.includes("Change Password"));
        target?.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      const wipedVal = await page.evaluate(() => {
        const inp = document.querySelector("[data-testid='change-password-modal-content'] input[type='password']");
        return inp ? inp.value : null;
      });
      recordCheck(wipedVal === "", "Sensitive password inputs are wiped clean on modal dismissal");

      // Test 4: Escape key closes modal
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 400));
      let closedAfterEscape = await page.$("[data-testid='change-password-modal-content']");
      recordCheck(!closedAfterEscape, "Pressing Escape key closes ChangePasswordModal cleanly");

      // Test 5: Cancel button closes modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const target = btns.find((b) => b.textContent?.includes("Change Password"));
        target?.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      const cancelPwBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("[data-testid='change-password-modal-content'] button"));
        return btns.find((b) => b.textContent?.trim() === "Cancel");
      });
      if (cancelPwBtn) {
        await cancelPwBtn.click();
        await new Promise((r) => setTimeout(r, 400));
        let closedAfterCancel = await page.$("[data-testid='change-password-modal-content']");
        recordCheck(!closedAfterCancel, "Clicking Cancel button closes ChangePasswordModal cleanly");
      }
    }

    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(`ADMIN MODAL BROWSER VERIFICATION: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log("================================================================================\n");

  if (passedChecks === totalChecks && totalChecks > 0) {
    console.log("🎉 ALL ADMIN MODAL DISMISSAL BROWSER CHECKS PASSED!");
    process.exit(0);
  } else {
    console.error(`⚠️ SOME CHECKS FAILED (${totalChecks - passedChecks} failed out of ${totalChecks})`);
    process.exit(1);
  }
}

runBrowserVerification().catch((err) => {
  console.error("Fatal error during browser verification:", err);
  process.exit(1);
});
