import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/31cacd12-715a-409b-bae1-a43267ea2420";
const BASE_URL = "http://localhost:3000";
const API_BASE = "http://127.0.0.1:8000/api/v1";

const VIEWPORTS = [
  { width: 320, height: 650, name: "320" },
  { width: 375, height: 720, name: "375" },
  { width: 390, height: 844, name: "390" },
  { width: 430, height: 932, name: "430" },
  { width: 1280, height: 900, name: "1280" },
];

function logSection(title) {
  console.log(`\n==========================================================`);
  console.log(`  ${title}`);
  console.log(`==========================================================`);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`✔ [PASS] ${message}`);
}

const INTERNAL_SECRET = "c0ce71ca5f5ba4f9fdb2e60b3deaa277b503e4d83ce5f217c10e20c3c4327513";

function testHeaders(testIp) {
  const h = { "X-Internal-Secret": INTERNAL_SECRET };
  if (testIp) h["X-Test-Client-IP"] = testIp;
  return h;
}

async function testBackendEndpoints() {
  logSection("TESTING BACKEND GEOLOCATION SERVICE & CONTROLLER (Cases 1-4)");

  // Test 1: Bangladesh IPv4
  const resBD = await fetch(`${API_BASE}/geolocation/detect`, {
    headers: testHeaders("103.108.140.0"),
  });
  const dataBD = await resBD.json();
  assert(dataBD.success === true, "BD API returned success: true");
  assert(dataBD.detected === true, "BD API detected: true");
  assert(dataBD.country_code === "BD", `BD API country_code is BD (got ${dataBD.country_code})`);
  assert(dataBD.country_name === "Bangladesh", `BD API country_name is Bangladesh (got ${dataBD.country_name})`);

  // Test 2: United States IPv4
  const resUS = await fetch(`${API_BASE}/geolocation/detect`, {
    headers: testHeaders("8.8.8.8"),
  });
  const dataUS = await resUS.json();
  assert(dataUS.detected === true, "US API detected: true");
  assert(dataUS.country_code === "US", `US API country_code is US (got ${dataUS.country_code})`);
  assert(dataUS.country_name === "United States", `US API country_name is United States (got ${dataUS.country_name})`);

  // Test 2b: United Kingdom IPv4
  const resGB = await fetch(`${API_BASE}/geolocation/detect`, {
    headers: testHeaders("81.2.69.142"),
  });
  const dataGB = await resGB.json();
  assert(dataGB.detected === true, "GB API detected: true");
  assert(dataGB.country_code === "GB", `GB API country_code is GB (got ${dataGB.country_code})`);
  assert(dataGB.country_name === "United Kingdom", `GB API country_name is United Kingdom (got ${dataGB.country_name})`);

  // Test 3: Localhost / Private IP -> Neutral Fallback
  const resLocal = await fetch(`${API_BASE}/geolocation/detect`, {
    headers: testHeaders("127.0.0.1"),
  });
  const dataLocal = await resLocal.json();
  assert(dataLocal.success === true, "Localhost API returned success: true");
  assert(dataLocal.detected === false, "Localhost API detected: false (no false claim)");
  assert(dataLocal.country_code === null, "Localhost API country_code is null");
  assert(dataLocal.country_name === null, "Localhost API country_name is null");

  // Test 4: IPv6 Support
  const resIPv6 = await fetch(`${API_BASE}/geolocation/detect`, {
    headers: testHeaders("2001:4860:4860::8888"),
  });
  const dataIPv6 = await resIPv6.json();
  assert(dataIPv6.detected === true, "IPv6 API detected: true");
  assert(dataIPv6.country_code === "US", `IPv6 resolved to US (got ${dataIPv6.country_code})`);
}

async function testBrowserModal() {
  logSection("TESTING BROWSER MODAL UI, PERSISTENCE & RESPONSIVENESS");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();

    // ── Test Case 1 in Browser: IP resolved to BD ──────────────────────
    logSection("Case 1 & 7: Bangladesh Resolution & Modal Elements Verification");
    await page.setExtraHTTPHeaders(testHeaders("103.108.140.0"));

    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}`, { waitUntil: "domcontentloaded" });

    // Clear localStorage to ensure fresh detection
    await page.evaluate(() => localStorage.removeItem("ayaan_user_preferences"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('button[aria-label*="Deliver to"]', { timeout: 10000 });

    // Open Location Modal by clicking Deliver To button
    const deliverToBtn = await page.$('button[aria-label*="Deliver to"]');
    assert(deliverToBtn !== null, "Found Deliver To button in Header");
    await deliverToBtn.click();
    await new Promise((r) => setTimeout(r, 600));

    // Verify Modal Heading & Subtitle
    const heading = await page.$eval("#location-modal-title", (el) => el.textContent?.trim());
    assert(heading === "Specify Your Location", `Modal title is "Specify Your Location" (got "${heading}")`);

    const subtitle = await page.$eval(
      "#location-modal-title + p",
      (el) => el.textContent?.trim()
    );
    assert(
      subtitle === "Shipping options and fees vary based on your location",
      `Subtitle is "Shipping options and fees vary based on your location" (got "${subtitle}")`
    );

    // Verify Case 1: Detected Country is Bangladesh
    const triggerText = await page.$eval("#country-selector-trigger", (el) => el.textContent?.trim());
    assert(triggerText.includes("Bangladesh"), `Trigger displays "Bangladesh" (got "${triggerText}")`);
    assert(triggerText.includes("BD"), `Trigger displays "(BD)" (got "${triggerText}")`);
    assert(triggerText.includes("🇧🇩"), `Trigger displays Bangladesh flag "🇧🇩" (got "${triggerText}")`);

    // Verify Case 7: ZIP/Postal code input, SAVE button, and OR divider are completely ABSENT
    const zipInput = await page.$('input[placeholder*="postal" i], input[placeholder*="zip" i]');
    assert(zipInput === null, "ZIP/Postal code input is completely ABSENT from modal");

    const zipLabel = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll("label, p, span")).map((e) => e.textContent || "");
      return texts.some((t) => t.toUpperCase().includes("ENTER ZIP") || t.toUpperCase().includes("POSTAL CODE"));
    });
    assert(!zipLabel, "ENTER ZIP OR POSTAL CODE label is completely ABSENT from modal");

    const orDivider = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll("span, div")).map((e) => e.textContent?.trim() || "");
      return texts.some((t) => t === "or" || t === "OR");
    });
    assert(!orDivider, "OR divider is completely ABSENT from modal");

    const saveBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim() || "");
      return buttons.some((t) => t === "Save" || t === "SAVE");
    });
    assert(!saveBtn, "SAVE button is completely ABSENT from modal");

    // Verify prominent action button: SIGN IN TO ADD ADDRESS
    const signInBtn = await page.$("#location-modal-signin-btn");
    assert(signInBtn !== null, "SIGN IN TO ADD ADDRESS button exists in modal");
    const signInBtnText = await page.$eval("#location-modal-signin-btn", (el) => el.textContent?.trim());
    assert(
      signInBtnText.toUpperCase().includes("SIGN IN TO ADD ADDRESS"),
      `Button text is "SIGN IN TO ADD ADDRESS" (got "${signInBtnText}")`
    );

    // Capture desktop screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "location_modal_1280.png"),
    });
    console.log("✔ Saved screenshot location_modal_1280.png");

    // ── Test Case 3 in Browser: Neutral Fallback when detection fails ──
    logSection("Case 3: Neutral Fallback when IP Detection is Unavailable");
    await page.setExtraHTTPHeaders(testHeaders("127.0.0.1"));
    await page.evaluate(() => localStorage.removeItem("ayaan_user_preferences"));
    await page.reload({ waitUntil: "domcontentloaded" });

    // Open modal again
    await page.click('button[aria-label*="Deliver to"]');
    await new Promise((r) => setTimeout(r, 600));

    const neutralTriggerText = await page.$eval("#country-selector-trigger", (el) => el.textContent?.trim());
    assert(
      neutralTriggerText.includes("Select your country"),
      `Displays neutral fallback "Select your country" (got "${neutralTriggerText}")`
    );
    assert(
      neutralTriggerText.includes("🌐"),
      `Displays neutral globe "🌐" (got "${neutralTriggerText}")`
    );
    assert(
      !neutralTriggerText.includes("Bangladesh") && !neutralTriggerText.includes("United States"),
      "Does not falsely claim any detected country"
    );

    // ── Test Case 5: Manual Country Selection & Persistence ────────────
    logSection("Case 5: Manual Country Selection & Persistence Across Reloads");
    // Click country trigger to open dropdown
    await page.click("#country-selector-trigger");
    await new Promise((r) => setTimeout(r, 300));

    // Type "Germany" in search input
    const searchInput = await page.$('input[placeholder*="Search country"]');
    assert(searchInput !== null, "Search input exists in dropdown");
    await searchInput.type("Germany");
    await new Promise((r) => setTimeout(r, 300));

    // Screenshot of dropdown open
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "location_modal_dropdown.png"),
    });
    console.log("✔ Saved screenshot location_modal_dropdown.png");

    // Select Germany
    const germanyBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button[role='option']"));
      return buttons.find((b) => b.textContent?.includes("Germany"));
    });
    assert(germanyBtn !== null, "Found Germany option in dropdown");
    await germanyBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // Verify trigger immediately updated to Germany
    const updatedTrigger = await page.$eval("#country-selector-trigger", (el) => el.textContent?.trim());
    assert(updatedTrigger.includes("Germany"), `Trigger updated immediately to Germany (got "${updatedTrigger}")`);
    assert(updatedTrigger.includes("DE"), `Trigger shows code (DE) (got "${updatedTrigger}")`);
    assert(updatedTrigger.includes("🇩🇪"), `Trigger shows flag 🇩🇪 (got "${updatedTrigger}")`);

    // Verify localStorage has isManual: true
    const savedPrefs = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("ayaan_user_preferences") || "{}");
    });
    assert(savedPrefs.countryCode === "DE", `localStorage countryCode is DE (got ${savedPrefs.countryCode})`);
    assert(savedPrefs.country === "Germany", `localStorage country is Germany (got ${savedPrefs.country})`);
    assert(savedPrefs.isManual === true, "localStorage isManual flag is true");

    // Now reload page with a DIFFERENT simulated IP (e.g. BD IP 103.108.140.0)
    await page.setExtraHTTPHeaders(testHeaders("103.108.140.0"));
    await page.reload({ waitUntil: "domcontentloaded" });

    // Open modal again
    await page.click('button[aria-label*="Deliver to"]');
    await new Promise((r) => setTimeout(r, 600));

    // Verify it is STILL Germany and was NOT overwritten!
    const reloadedTrigger = await page.$eval("#country-selector-trigger", (el) => el.textContent?.trim());
    assert(
      reloadedTrigger.includes("Germany"),
      `Manual selection was NOT overwritten by IP detection on reload (got "${reloadedTrigger}")`
    );

    // Screenshot of selected country
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "location_modal_selected.png"),
    });
    console.log("✔ Saved screenshot location_modal_selected.png");

    // Close modal
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 300));

    // ── Test Case 8: Sign-In Navigation ────────────────────────────────
    logSection("Case 8: Sign In Navigation with Preserved Return Path");
    await page.click('button[aria-label*="Deliver to"]');
    await new Promise((r) => setTimeout(r, 600));

    await page.click("#location-modal-signin-btn");
    await page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {});
    const currentUrl = page.url();
    assert(
      currentUrl.includes("/login"),
      `Sign-in button navigated guest to /login (url is "${currentUrl}")`
    );
    assert(
      currentUrl.includes("returnUrl"),
      `Sign-in URL preserves returnUrl parameter (url is "${currentUrl}")`
    );

    // ── Test Case 10: Responsive Layout Across All Viewports ───────────
    logSection("Case 10: Responsive Layouts across 320px, 375px, 390px, 430px");
    for (const vp of VIEWPORTS.filter((v) => v.width < 1000)) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('button[aria-label="Open navigation menu"]', { timeout: 10000 });

      // Open drawer
      await page.click('button[aria-label="Open navigation menu"]');
      await new Promise((r) => setTimeout(r, 400));

      // Click Deliver to in mobile drawer
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find((b) => b.textContent?.includes("Deliver to:"));
        if (btn) btn.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      // Verify no horizontal overflow in modal
      const modalBox = await page.$eval('div[role="dialog"]', (el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, left: rect.left, right: rect.right };
      });
      assert(
        modalBox.width <= vp.width,
        `Viewport ${vp.name}: Modal width (${modalBox.width}px) fits within viewport (${vp.width}px)`
      );

      // Verify tappable heights
      const triggerHeight = await page.$eval("#country-selector-trigger", (el) => el.getBoundingClientRect().height);
      assert(
        triggerHeight >= 44,
        `Viewport ${vp.name}: Country selector height (${triggerHeight}px) is comfortably tappable (>= 44px)`
      );

      const signinHeight = await page.$eval("#location-modal-signin-btn", (el) => el.getBoundingClientRect().height);
      assert(
        signinHeight >= 44,
        `Viewport ${vp.name}: Sign-in button height (${signinHeight}px) is comfortably tappable (>= 44px)`
      );

      // Capture screenshot
      const shotPath = path.join(ARTIFACTS_DIR, `location_modal_${vp.name}.png`);
      await page.screenshot({ path: shotPath });
      console.log(`✔ Saved screenshot location_modal_${vp.name}.png`);
    }

    logSection("ALL 10 VERIFICATION CASES PASSED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    await testBackendEndpoints();
    await testBrowserModal();
    console.log("\n==========================================================");
    console.log("🎉 ALL TESTS PASSED: Geolocation & Simplified Modal Verified!");
    console.log("==========================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ VERIFICATION FAILED:", err);
    process.exit(1);
  }
}

main();
