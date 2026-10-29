import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROD_URL = "https://ayaanclothing.com";
const BEFORE_DIR = path.resolve("docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix");
fs.mkdirSync(BEFORE_DIR, { recursive: true });

// Read token from existing test suite without hardcoding or logging secrets
const cmsSuite = fs.readFileSync("scripts/e2e-cms-live-production-suite.mjs", "utf8");
const tokenMatch = cmsSuite.match(/const adminToken = "([^"]+)";/);
const sessionMatch = cmsSuite.match(/const adminSession = ({[\s\S]*?});/);

if (!tokenMatch || !sessionMatch) {
  console.error("Could not load authorized test admin session from existing test suite.");
  process.exit(1);
}

const adminToken = tokenMatch[1];
const adminSession = eval(`(${sessionMatch[1]})`);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("=== AYC PROMPT 6: LIVE PRODUCTION REPRODUCTION (READ-ONLY) ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Authenticate session
  await page.goto(`${PROD_URL}/ayc`, { waitUntil: "domcontentloaded" });
  await page.evaluate((admin, token) => {
    localStorage.setItem("ayaan_admin_session", JSON.stringify(admin));
    localStorage.setItem("ayaan_admin_token", token);
    localStorage.setItem("ayaan_role", "admin");
    localStorage.setItem("auth_token", token);
  }, adminSession, adminToken);

  const results = {};

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Issue #27: Coupon Edit / Create Modal
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--> Probing Issue #27: /ayc/coupons");
  await page.goto(`${PROD_URL}/ayc/coupons`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const couponOpened = await page.evaluate(() => {
    // Try "Add Coupon" or Edit button on first row
    const addBtn = document.querySelector("#btn-add-coupon") || 
      Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Add Coupon"));
    if (addBtn) {
      addBtn.click();
      return { opened: true, mode: "add" };
    }
    const editBtn = document.querySelector("tbody tr button[title*='Edit'], tbody tr button");
    if (editBtn) {
      editBtn.click();
      return { opened: true, mode: "edit" };
    }
    return { opened: false };
  });

  await sleep(800);
  const couponModalVisible = await page.evaluate(() => document.querySelector("[role='dialog']") !== null);
  console.log("Coupon modal opened:", couponOpened, "visible:", couponModalVisible);

  if (couponModalVisible) {
    const shotPath = path.join(BEFORE_DIR, "issue-27-coupon-modal-before.png");
    await page.screenshot({ path: shotPath });

    // Test inside click
    await page.mouse.click(720, 450); // center of dialog
    await sleep(300);
    const stillOpenInside = await page.evaluate(() => document.querySelector("[role='dialog']") !== null);

    // Test outside click at (20, 20)
    await page.mouse.click(20, 20);
    await sleep(400);
    const stillOpenOutside = await page.evaluate(() => document.querySelector("[role='dialog']") !== null);

    results.issue27 = {
      couponOpened,
      couponModalVisible,
      stillOpenInside,
      dismissedOnOutside: !stillOpenOutside,
      shotPath,
    };
    console.log("Issue #27 results:", results.issue27);

    // If still open, close via Escape or close button
    if (stillOpenOutside) {
      await page.keyboard.press("Escape");
      await sleep(300);
    }
  } else {
    results.issue27 = { error: "Modal failed to open" };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Issue #33: Administrator Edit / Create Modal
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--> Probing Issue #33: /ayc/administrators");
  await page.goto(`${PROD_URL}/ayc/administrators`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const adminOpened = await page.evaluate(() => {
    const addBtn = Array.from(document.querySelectorAll("button")).find(b => 
      b.textContent?.includes("Add Administrator") || b.textContent?.includes("Create")
    );
    if (addBtn) {
      addBtn.click();
      return { opened: true, text: addBtn.textContent?.trim() };
    }
    return { opened: false };
  });

  await sleep(800);
  const adminModalVisible = await page.evaluate(() => document.querySelector("[role='dialog']") !== null);
  console.log("Admin modal opened:", adminOpened, "visible:", adminModalVisible);

  if (adminModalVisible) {
    const shotPath = path.join(BEFORE_DIR, "issue-33-administrator-modal-before.png");
    await page.screenshot({ path: shotPath });

    // Test inside click
    await page.mouse.click(720, 450);
    await sleep(300);
    const stillOpenInside = await page.evaluate(() => document.querySelector("[role='dialog']") !== null);

    // Test outside click at (20, 20)
    await page.mouse.click(20, 20);
    await sleep(400);
    const stillOpenOutside = await page.evaluate(() => document.querySelector("[role='dialog']") !== null);

    results.issue33 = {
      adminOpened,
      adminModalVisible,
      stillOpenInside,
      dismissedOnOutside: !stillOpenOutside,
      shotPath,
    };
    console.log("Issue #33 results:", results.issue33);

    if (stillOpenOutside) {
      await page.keyboard.press("Escape");
      await sleep(300);
    }
  } else {
    results.issue33 = { error: "Admin modal failed to open" };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Issue #18: Products Table Row Action Dropdown
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--> Probing Issue #18: /ayc/products");
  await page.goto(`${PROD_URL}/ayc/products`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const productDropdown = await page.evaluate(async () => {
    const triggers = Array.from(document.querySelectorAll("button[id^='btn-product-actions-'], button[aria-label*='Actions']"));
    if (triggers.length === 0) return { hasTrigger: false };
    const lastTrigger = triggers[triggers.length - 1];
    lastTrigger.scrollIntoView({ block: "center" });
    lastTrigger.click();
    await new Promise(r => setTimeout(r, 400));

    const menu = document.querySelector("[role='menu'], [id^='menu-product-actions-']");
    if (!menu) return { hasTrigger: true, hasMenu: false };
    const rect = menu.getBoundingClientRect();
    const isClipped = rect.bottom > window.innerHeight;
    return {
      hasTrigger: true,
      hasMenu: true,
      placement: menu.getAttribute("data-placement"),
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height, right: rect.right, left: rect.left },
      windowHeight: window.innerHeight,
      isClipped,
    };
  });
  console.log("Issue #18 results:", productDropdown);
  results.issue18 = productDropdown;

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Issue #32: Administrators Table Row Action Dropdown
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--> Probing Issue #32: /ayc/administrators");
  await page.goto(`${PROD_URL}/ayc/administrators`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const adminDropdown = await page.evaluate(async () => {
    const triggers = Array.from(document.querySelectorAll("button[data-testid^='admin-actions-trigger-'], button[aria-label*='Actions']"));
    if (triggers.length === 0) return { hasTrigger: false };
    const lastTrigger = triggers[triggers.length - 1];
    lastTrigger.scrollIntoView({ block: "center" });
    lastTrigger.click();
    await new Promise(r => setTimeout(r, 400));

    const menu = document.querySelector("[role='menu'], [data-testid^='admin-actions-menu-']");
    if (!menu) return { hasTrigger: true, hasMenu: false };
    const rect = menu.getBoundingClientRect();
    const isClipped = rect.bottom > window.innerHeight;
    return {
      hasTrigger: true,
      hasMenu: true,
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height, right: rect.right, left: rect.left },
      windowHeight: window.innerHeight,
      isClipped,
    };
  });
  console.log("Issue #32 results:", adminDropdown);
  results.issue32 = adminDropdown;

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Issue #34: Roles Edit Modal
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--> Probing Issue #34: /ayc/roles");
  await page.goto(`${PROD_URL}/ayc/roles`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const roleModalResult = await page.evaluate(async () => {
    const addBtn = Array.from(document.querySelectorAll("button")).find(b => 
      b.textContent?.includes("Create Custom Role") || b.textContent?.includes("Create Role")
    );
    if (!addBtn) return { hasBtn: false };
    addBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const modal = document.querySelector("[role='dialog']");
    return { hasBtn: true, modalVisible: !!modal };
  });

  if (roleModalResult.modalVisible) {
    // Click outside at (20, 20)
    await page.mouse.click(20, 20);
    await sleep(400);
    const closedOnBackdrop = await page.evaluate(() => document.querySelector("[role='dialog']") === null);
    roleModalResult.closedOnBackdrop = closedOnBackdrop;
  }
  console.log("Issue #34 results:", roleModalResult);
  results.issue34 = roleModalResult;

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Issue #36: Change Admin Password Modal
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--> Probing Issue #36: /ayc/settings?tab=profile");
  await page.goto(`${PROD_URL}/ayc/settings?tab=profile`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const pwModalResult = await page.evaluate(async () => {
    const pwBtn = Array.from(document.querySelectorAll("button")).find(b => 
      b.textContent?.includes("Change Password") || b.textContent?.includes("Update Password")
    );
    if (!pwBtn) return { hasBtn: false };
    pwBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const modal = document.querySelector("[role='dialog']");
    return { hasBtn: true, modalVisible: !!modal };
  });

  if (pwModalResult.modalVisible) {
    // Click outside at (20, 20)
    await page.mouse.click(20, 20);
    await sleep(400);
    const closedOnBackdrop = await page.evaluate(() => document.querySelector("[role='dialog']") === null);
    pwModalResult.closedOnBackdrop = closedOnBackdrop;
  }
  console.log("Issue #36 results:", pwModalResult);
  results.issue36 = pwModalResult;

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Issue #41: Settings Edit Administrator Modal
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--> Probing Issue #41: /ayc/settings?tab=users");
  await page.goto(`${PROD_URL}/ayc/settings?tab=users`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const settingsUserModalResult = await page.evaluate(async () => {
    const addBtn = Array.from(document.querySelectorAll("button")).find(b => 
      b.textContent?.includes("Add Administrator")
    );
    if (!addBtn) return { hasBtn: false };
    addBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const modal = document.querySelector("[role='dialog']");
    return { hasBtn: true, modalVisible: !!modal };
  });

  if (settingsUserModalResult.modalVisible) {
    // Click outside at (20, 20)
    await page.mouse.click(20, 20);
    await sleep(400);
    const closedOnBackdrop = await page.evaluate(() => document.querySelector("[role='dialog']") === null);
    settingsUserModalResult.closedOnBackdrop = closedOnBackdrop;
  }
  console.log("Issue #41 results:", settingsUserModalResult);
  results.issue41 = settingsUserModalResult;

  await browser.close();
  console.log("\nFinal Live Reproduction Summary:\n", JSON.stringify(results, null, 2));
}

run().catch(console.error);
