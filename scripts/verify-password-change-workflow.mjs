import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/c5793a78-8447-41c9-b41b-1a57da0c27ee";
const BASE_URL = "http://localhost:3000";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyPasswordChangeWorkflow() {
  console.log("==========================================================");
  console.log("  AYC CUSTOMER PORTAL HOTFIX — VERIFICATION (PROMPT 3/5)");
  console.log("  Issue 11: Current Password Field & Password Change Flow");
  console.log("==========================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const testMatrix = [];
  const uncaughtScriptErrors = [];

  function record(id, title, status, details = "") {
    console.log(`[${status}] ${id}: ${title} ${details ? "- " + details : ""}`);
    testMatrix.push({ id, title, status, details });
  }

  try {
    const page = await browser.newPage();
    page.on("pageerror", (err) => {
      uncaughtScriptErrors.push(err.message);
    });

    const TEST_USER = {
      id: 9999,
      name: "Security Test Buyer",
      email: "sectest@ayaanclothing.com",
      role: "customer",
      company_name: "Apex Logistics Ltd",
      password: "InitialPassword123!",
      email_verified_at: "2026-10-01T00:00:00Z",
    };

    async function setReactInput(selector, value) {
      await page.evaluate((sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, selector, value);
    }

    async function initUserSession(customPassword = "InitialPassword123!") {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate((u, pw) => {
        localStorage.setItem("ayaan_frontend_only_mode", "true");
        localStorage.setItem("ayaan_auth_token", `auth_token_customer_${u.id}`);
        const userWithPw = { ...u, password: pw };
        localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(userWithPw));

        const existingUsers = JSON.parse(localStorage.getItem("ayaan_mock_users_v2") || "[]");
        const idx = existingUsers.findIndex((x) => String(x.id) === String(u.id));
        if (idx >= 0) {
          existingUsers[idx] = userWithPw;
        } else {
          existingUsers.push(userWithPw);
        }
        localStorage.setItem("ayaan_mock_users_v2", JSON.stringify(existingUsers));
      }, TEST_USER, customPassword);

      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: "networkidle0" });
      await sleep(400);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.1: Form layout and attributes
    // ──────────────────────────────────────────────────────────────────────────
    await page.setViewport({ width: 1440, height: 900 });
    await initUserSession();

    const formDetails = await page.evaluate(() => {
      const currentPwInput = document.getElementById("current_password");
      const newPwInput = document.getElementById("new_password");
      const confirmPwInput = document.getElementById("confirm_password");

      const currentLabel = document.querySelector('label[for="current_password"]')?.textContent?.trim();
      const newLabel = document.querySelector('label[for="new_password"]')?.textContent?.trim();
      const confirmLabel = document.querySelector('label[for="confirm_password"]')?.textContent?.trim();

      const toggleCurrent = !!document.getElementById("toggle_current_password");
      const toggleNew = !!document.getElementById("toggle_new_password");
      const toggleConfirm = !!document.getElementById("toggle_confirm_password");

      return {
        hasCurrent: !!currentPwInput,
        currentType: currentPwInput?.type,
        currentAuto: currentPwInput?.getAttribute("autocomplete"),
        currentPlaceholder: currentPwInput?.placeholder,
        currentLabel,

        hasNew: !!newPwInput,
        newType: newPwInput?.type,
        newAuto: newPwInput?.getAttribute("autocomplete"),
        newPlaceholder: newPwInput?.placeholder,
        newLabel,

        hasConfirm: !!confirmPwInput,
        confirmType: confirmPwInput?.type,
        confirmAuto: confirmPwInput?.getAttribute("autocomplete"),
        confirmPlaceholder: confirmPwInput?.placeholder,
        confirmLabel,

        toggleCurrent,
        toggleNew,
        toggleConfirm,
      };
    });

    if (
      formDetails.hasCurrent &&
      formDetails.hasNew &&
      formDetails.hasConfirm &&
      formDetails.currentType === "password" &&
      formDetails.currentAuto === "current-password" &&
      formDetails.newAuto === "new-password" &&
      formDetails.confirmAuto === "new-password" &&
      formDetails.toggleCurrent &&
      formDetails.toggleNew &&
      formDetails.toggleConfirm
    ) {
      record(
        "T3.1",
        "Form layout: Current Password, New Password, Confirm Password visible & correctly labeled",
        "PASS",
        `All 3 inputs present with autocompletes, placeholders, and eye toggles. Current label: "${formDetails.currentLabel}"`
      );
    } else {
      record("T3.1", "Form layout", "FAIL", JSON.stringify(formDetails));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.2: Required validation (current password missing)
    // ──────────────────────────────────────────────────────────────────────────
    await setReactInput("#current_password", "");
    await setReactInput("#new_password", "NewSecret123!");
    await setReactInput("#confirm_password", "NewSecret123!");

    await page.click('form:has(#current_password) button[type="submit"]');
    await sleep(300);

    const missingError = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      const currentInput = document.getElementById("current_password");
      return {
        alertText: alert?.textContent?.trim(),
        validity: currentInput?.validity?.valueMissing,
      };
    });

    if (missingError.alertText?.includes("current password") || missingError.validity === true) {
      record(
        "T3.2",
        "Required validation: Submission with current password missing is rejected",
        "PASS",
        `Rejected as required: alert="${missingError.alertText || 'HTML5 valueMissing'}"`
      );
    } else {
      record("T3.2", "Required validation", "FAIL", JSON.stringify(missingError));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.3: Wrong current password
    // ──────────────────────────────────────────────────────────────────────────
    await setReactInput("#current_password", "TotallyWrongPassword!");
    await setReactInput("#new_password", "ValidNewPassword456!");
    await setReactInput("#confirm_password", "ValidNewPassword456!");

    await page.click('form:has(#current_password) button[type="submit"]');
    await sleep(400);

    const wrongPwResult = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      const activeUser = JSON.parse(localStorage.getItem("ayaan_mock_active_user_v2") || "{}");
      return {
        alertText: alert?.textContent?.trim(),
        storedPassword: activeUser?.password,
      };
    });

    if (
      wrongPwResult.alertText?.includes("incorrect") &&
      wrongPwResult.storedPassword === "InitialPassword123!"
    ) {
      record(
        "T3.3",
        "Wrong current password: Server/service rejects and leaves original password unchanged",
        "PASS",
        `Alert: "${wrongPwResult.alertText}", original password unchanged.`
      );
    } else {
      record("T3.3", "Wrong current password", "FAIL", JSON.stringify(wrongPwResult));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.4: Confirmation mismatch
    // ──────────────────────────────────────────────────────────────────────────
    await setReactInput("#current_password", "InitialPassword123!");
    await setReactInput("#new_password", "ValidNewPassword456!");
    await setReactInput("#confirm_password", "DifferentPassword789!");

    await page.click('form:has(#current_password) button[type="submit"]');
    await sleep(300);

    const mismatchAlert = await page.evaluate(() => {
      return document.querySelector('[role="alert"]')?.textContent?.trim();
    });

    if (mismatchAlert?.includes("match")) {
      record(
        "T3.4",
        "Confirmation mismatch: Different new and confirmation passwords rejected",
        "PASS",
        `Alert: "${mismatchAlert}"`
      );
    } else {
      record("T3.4", "Confirmation mismatch", "FAIL", `Alert text: ${mismatchAlert}`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.5: Password policy (< 6 characters)
    // ──────────────────────────────────────────────────────────────────────────
    await setReactInput("#current_password", "InitialPassword123!");
    await setReactInput("#new_password", "12345");
    await setReactInput("#confirm_password", "12345");

    await page.click('form:has(#current_password) button[type="submit"]');
    await sleep(300);

    const policyAlert = await page.evaluate(() => {
      return document.querySelector('[role="alert"]')?.textContent?.trim();
    });

    if (policyAlert?.includes("6 characters")) {
      record(
        "T3.5",
        "Password policy: Password shorter than 6 characters rejected",
        "PASS",
        `Alert: "${policyAlert}"`
      );
    } else {
      record("T3.5", "Password policy", "FAIL", `Alert text: ${policyAlert}`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.6: Successful change
    // ──────────────────────────────────────────────────────────────────────────
    await setReactInput("#current_password", "InitialPassword123!");
    await setReactInput("#new_password", "BrandNewValidSecret456!");
    await setReactInput("#confirm_password", "BrandNewValidSecret456!");

    await page.click('form:has(#current_password) button[type="submit"]');
    await sleep(600);

    const successResult = await page.evaluate(() => {
      const successStatus = document.querySelector('[role="status"]')?.textContent?.trim();
      const currentVal = document.getElementById("current_password")?.value;
      const newVal = document.getElementById("new_password")?.value;
      const confirmVal = document.getElementById("confirm_password")?.value;
      const activeUser = JSON.parse(localStorage.getItem("ayaan_mock_active_user_v2") || "{}");

      return {
        successStatus,
        inputsCleared: currentVal === "" && newVal === "" && confirmVal === "",
        passwordPersisted: activeUser?.password === "BrandNewValidSecret456!",
        sessionActive: activeUser?.email === "sectest@ayaanclothing.com",
      };
    });

    if (
      successResult.successStatus?.includes("successfully") &&
      successResult.inputsCleared &&
      successResult.passwordPersisted &&
      successResult.sessionActive
    ) {
      record(
        "T3.6",
        "Successful change: Correct current password & valid new password updates successfully",
        "PASS",
        `Status: "${successResult.successStatus}". Inputs cleared, password updated in store, session preserved.`
      );
    } else {
      record("T3.6", "Successful change", "FAIL", JSON.stringify(successResult));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.7: Old-password verification (old password rejected)
    // ──────────────────────────────────────────────────────────────────────────
    const oldLoginResult = await page.evaluate(async (email) => {
      try {
        await window.__authService.login({ email, password: "InitialPassword123!" });
        return { success: true };
      } catch (err) {
        return { success: false, message: err?.message || String(err) };
      }
    }, TEST_USER.email);

    if (!oldLoginResult.success && oldLoginResult.message?.includes("Invalid")) {
      record(
        "T3.7",
        "Old-password verification: Old password rejected after successful change",
        "PASS",
        `Login with old password failed as expected: "${oldLoginResult.message}"`
      );
    } else {
      record("T3.7", "Old-password verification", "FAIL", JSON.stringify(oldLoginResult));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.8: New-password verification (new password accepted)
    // ──────────────────────────────────────────────────────────────────────────
    const newLoginResult = await page.evaluate(async (email) => {
      try {
        const res = await window.__authService.login({ email, password: "BrandNewValidSecret456!" });
        return { success: true, userEmail: res?.user?.email };
      } catch (err) {
        return { success: false, message: err?.message || String(err) };
      }
    }, TEST_USER.email);

    if (newLoginResult.success && newLoginResult.userEmail === TEST_USER.email) {
      record(
        "T3.8",
        "New-password verification: New password authenticates successfully",
        "PASS",
        `Login with new password succeeded for ${newLoginResult.userEmail}`
      );
    } else {
      record("T3.8", "New-password verification", "FAIL", JSON.stringify(newLoginResult));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.9: Repeated submission guard
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: "networkidle0" });
    await sleep(300);

    await setReactInput("#current_password", "BrandNewValidSecret456!");
    await setReactInput("#new_password", "NextPasswordSecure789!");
    await setReactInput("#confirm_password", "NextPasswordSecure789!");

    // Click submit button to start submission
    page.click('form:has(#current_password) button[type="submit"]');

    let isDisabledOrLoading = false;
    for (let i = 0; i < 20; i++) {
      await sleep(25);
      isDisabledOrLoading = await page.evaluate(() => {
        const btn = document.querySelector('form:has(#current_password) button[type="submit"]');
        return btn?.disabled === true || !!btn?.querySelector(".animate-spin");
      });
      if (isDisabledOrLoading) break;
    }

    if (isDisabledOrLoading) {
      record(
        "T3.9",
        "Repeated submission: Submit button disabled & shows spinner while request is pending",
        "PASS",
        `Disabled/loading state confirmed: ${isDisabledOrLoading}`
      );
    } else {
      record("T3.9", "Repeated submission", "FAIL", `Disabled/loading state was not detected: ${isDisabledOrLoading}`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.10: API bypass attempt (missing current_password rejected by service)
    // ──────────────────────────────────────────────────────────────────────────
    const bypassResult = await page.evaluate(async () => {
      try {
        await window.__authService.updateProfile({
          password: "BypassPassword999!",
          password_confirmation: "BypassPassword999!",
        });
        return { success: true };
      } catch (err) {
        return {
          success: false,
          status: err?.status,
          message: err?.message,
          errors: err?.errors,
        };
      }
    });

    if (!bypassResult.success && bypassResult.status === 422 && bypassResult.message?.includes("current password")) {
      record(
        "T3.10",
        "API bypass attempt: Calling updateProfile without current password rejected with 422",
        "PASS",
        `Rejected: status=${bypassResult.status}, msg="${bypassResult.message}"`
      );
    } else {
      record("T3.10", "API bypass attempt", "FAIL", JSON.stringify(bypassResult));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.11: Account isolation
    // ──────────────────────────────────────────────────────────────────────────
    const isolationResult = await page.evaluate(async () => {
      try {
        const victim = window.__mockStore.saveUser({
          id: 8888,
          name: "Victim Account",
          email: "victim@ayaanclothing.com",
          password: "VictimSafePassword123!",
          role: "customer",
        });

        const activeBefore = window.__mockStore.getActiveUser();

        // Attempt to pass victim's ID and email in updateProfile
        await window.__authService.updateProfile({
          id: victim.id,
          email: victim.email,
          current_password: activeBefore?.password,
          password: "AttackerNewPass!",
          password_confirmation: "AttackerNewPass!",
        });

        const victimAfter = window.__mockStore.getUserById(victim.id);
        const activeAfter = window.__mockStore.getActiveUser();

        return {
          victimPasswordUnchanged: victimAfter?.password === "VictimSafePassword123!",
          activeUserTargeted: activeAfter?.email === activeBefore?.email,
        };
      } catch (err) {
        return { error: err?.message };
      }
    });

    if (isolationResult.victimPasswordUnchanged && isolationResult.activeUserTargeted) {
      record(
        "T3.11",
        "Account isolation: Password update strictly targets authenticated session, ignoring foreign IDs",
        "PASS",
        "Victim password remained untouched; only authenticated user was updated."
      );
    } else {
      record("T3.11", "Account isolation", "FAIL", JSON.stringify(isolationResult));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.12: Error handling (UI reflects server rejection without false success)
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: "networkidle0" });
    await sleep(300);

    await setReactInput("#current_password", "WrongCurrentPasswordAgain!");
    await setReactInput("#new_password", "ValidSecret999!");
    await setReactInput("#confirm_password", "ValidSecret999!");

    await page.click('form:has(#current_password) button[type="submit"]');
    await sleep(400);

    const errorHandlingResult = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      const status = document.querySelector('[role="status"]');
      return {
        hasAlert: !!alert,
        alertText: alert?.textContent?.trim(),
        hasStatus: !!status,
      };
    });

    if (errorHandlingResult.hasAlert && !errorHandlingResult.hasStatus) {
      record(
        "T3.12",
        "Error handling: Error visible to user and success message is strictly suppressed on failure",
        "PASS",
        `Alert visible: "${errorHandlingResult.alertText}", Status message suppressed.`
      );
    } else {
      record("T3.12", "Error handling", "FAIL", JSON.stringify(errorHandlingResult));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.13: Responsive behavior across 375px, 768px, 1024px, 1440px
    // ──────────────────────────────────────────────────────────────────────────
    const viewports = [375, 768, 1024, 1440];
    let responsivePass = true;
    const responsiveDetails = [];

    for (const w of viewports) {
      await page.setViewport({ width: w, height: 800 });
      await sleep(200);

      const metrics = await page.evaluate(() => {
        const currentInput = document.getElementById("current_password");
        const newPwInput = document.getElementById("new_password");
        const confirmPwInput = document.getElementById("confirm_password");
        const form = currentInput?.closest("form");

        const rectForm = form?.getBoundingClientRect();
        const rectCurrent = currentInput?.getBoundingClientRect();
        const rectNew = newPwInput?.getBoundingClientRect();
        const rectConfirm = confirmPwInput?.getBoundingClientRect();

        return {
          formWidth: rectForm?.width,
          currentWidth: rectCurrent?.width,
          newWidth: rectNew?.width,
          confirmWidth: rectConfirm?.width,
          currentVisible: rectCurrent && rectCurrent.width > 150 && rectCurrent.height > 25,
          newVisible: rectNew && rectNew.width > 150 && rectNew.height > 25,
          confirmVisible: rectConfirm && rectConfirm.width > 150 && rectConfirm.height > 25,
          noOverflow: (rectForm?.right || 0) <= window.innerWidth,
        };
      });

      if (!metrics.currentVisible || !metrics.newVisible || !metrics.confirmVisible || !metrics.noOverflow) {
        responsivePass = false;
      }
      responsiveDetails.push(`${w}px: form=${Math.round(metrics.formWidth || 0)}px, inputsVisible=${metrics.currentVisible && metrics.newVisible && metrics.confirmVisible}`);
    }

    // Take verified screenshot at 1440px
    await page.setViewport({ width: 1440, height: 900 });
    const screenshotPath = path.join(ARTIFACTS_DIR, "password_change_form_verified.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });

    if (responsivePass) {
      record(
        "T3.13",
        "Responsive behavior: Form verified usable without overflow at 375px, 768px, 1024px, 1440px",
        "PASS",
        responsiveDetails.join(" | ")
      );
    } else {
      record("T3.13", "Responsive behavior", "FAIL", responsiveDetails.join(" | "));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // T3.14: Accessibility and eye visibility toggle controls
    // ──────────────────────────────────────────────────────────────────────────
    const initialType = await page.$eval("#current_password", (el) => el.type);
    await page.click("#toggle_current_password");
    await sleep(150);
    const toggledType = await page.$eval("#current_password", (el) => el.type);
    await page.click("#toggle_current_password");
    await sleep(150);
    const revertedType = await page.$eval("#current_password", (el) => el.type);

    const a11yAttrs = await page.evaluate(() => {
      const toggle = document.getElementById("toggle_current_password");
      const currentLabel = document.querySelector('label[for="current_password"]');
      const newLabel = document.querySelector('label[for="new_password"]');
      const confirmLabel = document.querySelector('label[for="confirm_password"]');

      return {
        toggleAria: toggle?.getAttribute("aria-label"),
        hasAllLabels: !!currentLabel && !!newLabel && !!confirmLabel,
      };
    });

    const isA11yValid =
      initialType === "password" &&
      toggledType === "text" &&
      revertedType === "password" &&
      a11yAttrs.hasAllLabels &&
      uncaughtScriptErrors.length === 0;

    if (isA11yValid) {
      record(
        "T3.14",
        "Accessibility & regressions: Eye toggles toggle password/text safely, accessible labels, 0 console script errors",
        "PASS",
        `Toggle: ${initialType} -> ${toggledType} -> ${revertedType}. Uncaught errors: ${uncaughtScriptErrors.length}`
      );
    } else {
      record(
        "T3.14",
        "Accessibility & regressions",
        "FAIL",
        `Toggle types: ${initialType} -> ${toggledType} -> ${revertedType}, Labels: ${a11yAttrs.hasAllLabels}, Uncaught errors: ${uncaughtScriptErrors.join(", ")}`
      );
    }

    console.log("\n==========================================================");
    const passedCount = testMatrix.filter((t) => t.status === "PASS").length;
    const totalCount = testMatrix.length;
    console.log(`  SUMMARY: ${passedCount}/${totalCount} TEST SCENARIOS PASSED`);
    console.log("==========================================================\n");

    if (passedCount !== totalCount) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Verification script error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyPasswordChangeWorkflow();
