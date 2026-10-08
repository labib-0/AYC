import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/luhasan/.gemini/antigravity-ide/brain/ade24986-ba80-4dc5-8f7a-c5f285f12189";

const mockCustomer = {
  id: 55,
  name: "Demo Customer",
  email: "customer@ayaan-demo.local",
  role: "customer",
  company_name: "Ayaan Commercial Demo Corp",
  phone: "+880 1982-183886",
};

const sampleWishlistProducts = [
  {
    id: "prod-oxford-01",
    name: "Classic Oxford Cotton Shirt",
    slug: "classic-oxford-cotton-shirt",
    brand: "Brooks Brothers",
    sku: "OXF-001",
    price: 35.0,
    wholesalePrice: 35.0,
    wholesale_price: 35.0,
    stock: 120,
    availableStock: 120,
    moq: 10,
    isSoldOut: false,
    is_sold_out: false,
    in_stock: true,
    images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400"],
  },
  {
    id: "prod-linen-02",
    name: "Linen Summer Trousers",
    slug: "linen-summer-trousers",
    brand: "Massimo Dutti",
    sku: "LIN-002",
    price: 28.0,
    wholesalePrice: 28.0,
    wholesale_price: 28.0,
    stock: 15,
    availableStock: 15,
    moq: 10,
    isSoldOut: false,
    is_sold_out: false,
    in_stock: true,
    images: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400"],
  },
  {
    id: "prod-tie-03",
    name: "Silk Blend Jacquard Tie",
    slug: "silk-blend-jacquard-tie",
    brand: "Ermenegildo Zegna",
    sku: "TIE-003",
    price: 15.0,
    wholesalePrice: 15.0,
    wholesale_price: 15.0,
    stock: 0,
    availableStock: 0,
    moq: 5,
    isSoldOut: false,
    is_sold_out: false,
    in_stock: false,
    images: ["https://images.unsplash.com/photo-1589756823695-278bc923f962?w=400"],
  },
  {
    id: "prod-coat-04",
    name: "Cashmere Winter Overcoat",
    slug: "cashmere-winter-overcoat",
    brand: "Burberry",
    sku: "CSH-004",
    price: 180.0,
    wholesalePrice: 180.0,
    wholesale_price: 180.0,
    stock: 0,
    availableStock: 0,
    moq: 5,
    isSoldOut: true,
    is_sold_out: true,
    in_stock: false,
    images: ["https://images.unsplash.com/photo-1544441893-675973e31985?w=400"],
  },
];

function formatWishlistItems(products) {
  return products.map((p, idx) => ({
    id: `w_item_${idx + 1}`,
    wishlist_id: "wl_qa_01",
    product_id: p.id,
    product: p,
    created_at: new Date().toISOString(),
  }));
}

async function runWishlistBrowserQA() {
  console.log("==================================================");
  console.log("STARTING COMPREHENSIVE LIVE BROWSER WISHLIST QA");
  console.log("==================================================");

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const testResults = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ── SCENARIO 1: Empty Wishlist State ──
    console.log("\n▶ Scenario 1: Empty Wishlist State");
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.evaluate((cust) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(cust));
      localStorage.setItem("user", JSON.stringify(cust));
      localStorage.setItem("ayaan_auth_token", "auth_token_customer_55");
      localStorage.setItem("ayaan_wishlist", JSON.stringify([]));
      document.cookie = "auth_token=auth_token_customer_55; path=/";
    }, mockCustomer);

    await page.goto("http://localhost:3000/wishlist", { waitUntil: "networkidle0" });
    await page.waitForSelector("main", { timeout: 10000 });

    const emptyText = await page.evaluate(() => document.body.innerText);
    const hasEmptyState = emptyText.includes("Your wishlist is empty") || emptyText.includes("Saved Wholesale Items");
    const hasBrowseLink = await page.$("a[href='/search']") !== null || await page.$("a[href='/products']") !== null;

    console.log(`Empty state text verified: ${hasEmptyState}`);
    console.log(`Catalog exploration link verified: ${hasBrowseLink}`);
    testResults.push({ scenario: "Empty Wishlist State", passed: hasEmptyState && hasBrowseLink });

    const shot1 = path.join(ARTIFACTS_DIR, "wishlist_01_empty_state.png");
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`📸 Screenshot: ${shot1}`);

    // ── SCENARIO 2: Mixed Inventory State (In-Stock, Low-Stock, Out-of-Stock, Sold Out) ──
    console.log("\n▶ Scenario 2: Mixed Inventory Wishlist (Available & Unavailable)");
    const mixedItems = formatWishlistItems(sampleWishlistProducts);
    await page.evaluate((items) => {
      localStorage.setItem("ayaan_wishlist", JSON.stringify(items));
    }, mixedItems);

    // page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    // page.on("pageerror", (err) => console.error("PAGE ERR:", err.message));

    await page.goto("http://localhost:3000/wishlist", { waitUntil: "networkidle0" });
    const pageHtml = await page.evaluate(() => document.body.innerText);
    console.log("PAGE TEXT PREVIEW:", pageHtml.slice(0, 300));
    await page.waitForSelector("input[type='checkbox']", { timeout: 10000 });

    const cardDetails = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-wishlist-item-id]"));
      return cards.map((c) => ({
        id: c.getAttribute("data-wishlist-item-id"),
        text: c.textContent,
        hasCheckbox: c.querySelector("input[type='checkbox']") !== null,
        isCheckboxDisabled: c.querySelector("input[type='checkbox']")?.disabled,
      }));
    });

    console.log(`Loaded ${cardDetails.length} items in wishlist.`);
    const hasInStock = cardDetails.some((c) => c.text.includes("In Stock"));
    const hasLowStock = cardDetails.some((c) => c.text.includes("Low Stock"));
    const hasOutOfStock = cardDetails.some((c) => c.text.includes("Out of Stock"));
    const hasSoldOut = cardDetails.some((c) => c.text.includes("Sold Out"));

    console.log(`Badges detected -> In Stock: ${hasInStock}, Low Stock: ${hasLowStock}, Out of Stock: ${hasOutOfStock}, Sold Out: ${hasSoldOut}`);
    testResults.push({
      scenario: "Mixed Inventory Badges & Independent Preservation",
      passed: cardDetails.length === 4 && hasInStock && hasLowStock && hasOutOfStock && hasSoldOut,
    });

    const shot2 = path.join(ARTIFACTS_DIR, "wishlist_02_mixed_inventory.png");
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`📸 Screenshot: ${shot2}`);

    // ── SCENARIO 3: Select All Selects ONLY Eligible Products ──
    console.log("\n▶ Scenario 3: Select All Functionality (Eligible Only)");
    const selectAllCheckbox = await page.$("input[aria-label='Select all eligible items']");
    if (!selectAllCheckbox) {
      throw new Error("Select all checkbox not found!");
    }
    await selectAllCheckbox.click();
    await new Promise((r) => setTimeout(r, 400));

    const selectionState = await page.evaluate(() => {
      const allCheckboxes = Array.from(document.querySelectorAll("[data-wishlist-item-id] input[type='checkbox']"));
      return allCheckboxes.map((cb) => ({
        checked: cb.checked,
        disabled: cb.disabled,
      }));
    });

    const eligibleChecked = selectionState.filter((s) => !s.disabled && s.checked).length;
    const disabledUnchecked = selectionState.filter((s) => s.disabled && !s.checked).length;

    console.log(`Eligible checked: ${eligibleChecked} (expected 2), Disabled unchecked: ${disabledUnchecked} (expected 2)`);
    const bulkButtonText = await page.evaluate(() => {
      const btn = document.querySelector("#wishlist-add-selected-btn");
      return btn ? btn.textContent.trim() : "";
    });
    console.log(`Bulk Button Text: "${bulkButtonText}"`);

    testResults.push({
      scenario: "Select All Selects Eligible Only",
      passed: eligibleChecked === 2 && disabledUnchecked === 2 && bulkButtonText.includes("Add 2 to Cart"),
    });

    const shot3 = path.join(ARTIFACTS_DIR, "wishlist_03_select_all_eligible.png");
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`📸 Screenshot: ${shot3}`);

    // ── SCENARIO 4: Indeterminate Select-All State & Multi-Select ──
    console.log("\n▶ Scenario 4: Indeterminate Select-All State & Multi-Select");
    // Deselect the first item checkbox
    const firstItemCheckbox = await page.$("[data-wishlist-item-id='w_item_1'] input[type='checkbox']");
    if (firstItemCheckbox) {
      await firstItemCheckbox.click();
    }
    await new Promise((r) => setTimeout(r, 400));

    const indeterminateState = await page.evaluate(() => {
      const selectAll = document.querySelector("input[aria-label='Select all eligible items']");
      const btn = document.querySelector("#wishlist-add-selected-btn");
      return {
        isIndeterminate: selectAll ? selectAll.indeterminate : false,
        btnText: btn ? btn.textContent.trim() : "",
      };
    });

    console.log(`Select All Indeterminate: ${indeterminateState.isIndeterminate}, Button Text: "${indeterminateState.btnText}"`);
    testResults.push({
      scenario: "Indeterminate Select All & Sub-Selection",
      passed: indeterminateState.isIndeterminate && indeterminateState.btnText.includes("Add 1 to Cart"),
    });

    const shot4 = path.join(ARTIFACTS_DIR, "wishlist_04_indeterminate_state.png");
    await page.screenshot({ path: shot4, fullPage: false });
    console.log(`📸 Screenshot: ${shot4}`);

    // ── SCENARIO 5: Add Selected to Cart with Feedback & Preservation ──
    console.log("\n▶ Scenario 5: Add Selected to Cart with Inline Feedback");
    const bulkAddBtn = await page.$("#wishlist-add-selected-btn");
    if (bulkAddBtn) {
      await bulkAddBtn.click();
    }
    await new Promise((r) => setTimeout(r, 1200));

    const cartFeedback = await page.evaluate(() => {
      const feedbackBanner = document.querySelector("[data-testid='wishlist-feedback']");
      const cartItems = JSON.parse(localStorage.getItem("ayaan_cart") || "[]");
      const wishlistItems = JSON.parse(localStorage.getItem("ayaan_wishlist") || "[]");
      return {
        hasFeedback: feedbackBanner !== null || document.body.innerText.includes("added to cart"),
        bannerText: feedbackBanner ? feedbackBanner.textContent.trim() : "",
        cartLength: cartItems.length,
        wishlistRetainedLength: wishlistItems.length,
      };
    });

    console.log(`Feedback present: ${cartFeedback.hasFeedback}, Cart items: ${cartFeedback.cartLength}, Wishlist items retained: ${cartFeedback.wishlistRetainedLength}`);
    testResults.push({
      scenario: "Bulk Add to Cart Feedback & Wishlist Preservation",
      passed: cartFeedback.hasFeedback && cartFeedback.wishlistRetainedLength === 4,
    });

    const shot5 = path.join(ARTIFACTS_DIR, "wishlist_05_add_to_cart_feedback.png");
    await page.screenshot({ path: shot5, fullPage: false });
    console.log(`📸 Screenshot: ${shot5}`);

    // ── SCENARIO 6: Dynamic Stock Replenishment (Sold-out/Out-of-stock becomes available) ──
    console.log("\n▶ Scenario 6: Inventory Replenishment Restores Add to Cart Eligibility");
    const replenishedProducts = sampleWishlistProducts.map((p) => {
      if (p.id === "prod-tie-03") {
        return { ...p, stock: 80, availableStock: 80, isSoldOut: false, is_sold_out: false, in_stock: true };
      }
      return p;
    });

    await page.evaluate((items) => {
      localStorage.setItem("ayaan_wishlist", JSON.stringify(items));
    }, formatWishlistItems(replenishedProducts));

    await page.goto("http://localhost:3000/wishlist", { waitUntil: "networkidle0" });
    await page.waitForSelector("[data-wishlist-item-id='w_item_3']", { timeout: 10000 });

    const tieStockState = await page.evaluate(() => {
      const card = document.querySelector("[data-wishlist-item-id='w_item_3']");
      const cb = card?.querySelector("input[type='checkbox']");
      const addBtn = card?.querySelector("button[data-action='add-to-cart']");
      return {
        cardText: card ? card.textContent : "",
        isCheckboxEnabled: cb ? !cb.disabled : false,
        hasAddButton: addBtn !== null,
      };
    });

    console.log(`Tie card replenished -> Checkbox enabled: ${tieStockState.isCheckboxEnabled}, Add Button: ${tieStockState.hasAddButton}`);
    testResults.push({
      scenario: "Inventory Replenishment Dynamic Eligibility",
      passed: tieStockState.isCheckboxEnabled && tieStockState.cardText.includes("In Stock"),
    });

    const shot6 = path.join(ARTIFACTS_DIR, "wishlist_06_replenished_stock.png");
    await page.screenshot({ path: shot6, fullPage: false });
    console.log(`📸 Screenshot: ${shot6}`);

    // ── SCENARIO 7: Dynamic Stock Depletion (In-stock becomes Sold Out) ──
    console.log("\n▶ Scenario 7: Inventory Depletion Immediately Disables Add to Cart");
    const depletedProducts = replenishedProducts.map((p) => {
      if (p.id === "prod-oxford-01") {
        return { ...p, stock: 0, availableStock: 0, isSoldOut: true, is_sold_out: true };
      }
      return p;
    });

    await page.evaluate((items) => {
      localStorage.setItem("ayaan_wishlist", JSON.stringify(items));
    }, formatWishlistItems(depletedProducts));

    await page.goto("http://localhost:3000/wishlist", { waitUntil: "networkidle0" });
    await page.waitForSelector("[data-wishlist-item-id='w_item_1']", { timeout: 10000 });

    const oxfordDepletedState = await page.evaluate(() => {
      const card = document.querySelector("[data-wishlist-item-id='w_item_1']");
      const cb = card?.querySelector("input[type='checkbox']");
      const addBtn = card?.querySelector("button[data-action='add-to-cart']");
      return {
        cardText: card ? card.textContent : "",
        isCheckboxDisabled: cb ? cb.disabled : true,
        isAddButtonMissing: addBtn === null,
      };
    });

    console.log(`Oxford card depleted -> Checkbox disabled: ${oxfordDepletedState.isCheckboxDisabled}, Sold Out badge: ${oxfordDepletedState.cardText.includes("Sold Out")}`);
    testResults.push({
      scenario: "Inventory Depletion Dynamic Disabling",
      passed: oxfordDepletedState.isCheckboxDisabled && oxfordDepletedState.cardText.includes("Sold Out"),
    });

    const shot7 = path.join(ARTIFACTS_DIR, "wishlist_07_depleted_stock.png");
    await page.screenshot({ path: shot7, fullPage: false });
    console.log(`📸 Screenshot: ${shot7}`);

    // ── SCENARIO 8: Mobile Viewport Responsiveness (390×844) ──
    console.log("\n▶ Scenario 8: Mobile Responsive Wishlist (390×844)");
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto("http://localhost:3000/wishlist", { waitUntil: "networkidle0" });
    await page.waitForSelector("main", { timeout: 10000 });

    const mobileCheck = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const hasHorizontalScroll = scrollWidth > clientWidth;
      const bulkBar = document.querySelector("#wishlist-add-selected-btn") || document.querySelector("input[aria-label='Select all eligible items']");
      return {
        scrollWidth,
        clientWidth,
        hasHorizontalScroll,
        hasBulkControls: bulkBar !== null,
      };
    });

    console.log(`Mobile dimensions -> scrollWidth: ${mobileCheck.scrollWidth}, clientWidth: ${mobileCheck.clientWidth}, Horizontal scroll: ${mobileCheck.hasHorizontalScroll}`);
    testResults.push({
      scenario: "Mobile Responsiveness & Zero Horizontal Overflow",
      passed: !mobileCheck.hasHorizontalScroll && mobileCheck.hasBulkControls,
    });

    const shot8 = path.join(ARTIFACTS_DIR, "wishlist_08_mobile_viewport.png");
    await page.screenshot({ path: shot8, fullPage: false });
    console.log(`📸 Screenshot: ${shot8}`);

    // ── SCENARIO 9: Customer Authorization & Login Redirection ──
    console.log("\n▶ Scenario 9: Customer Authorization & Guest Login Redirection");
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    });

    // Attempt to access protected customer dashboard wishlist route
    await page.goto("http://localhost:3000/dashboard/wishlist", { waitUntil: "networkidle0" });
    const guestUrl = page.url();
    const isRedirectedToLogin = guestUrl.includes("/login");
    const hasRedirectParam =
      guestUrl.includes("returnUrl=%2Fdashboard%2Fwishlist") ||
      guestUrl.includes("redirect=%2Fdashboard%2Fwishlist") ||
      guestUrl.includes("returnUrl=") ||
      guestUrl.includes("redirect=");

    console.log(`Guest URL on dashboard/wishlist access: ${guestUrl}`);
    console.log(`Redirected to login: ${isRedirectedToLogin}, Has redirect param: ${hasRedirectParam}`);
    testResults.push({
      scenario: "Customer Authorization & Login Redirect Guard",
      passed: isRedirectedToLogin && hasRedirectParam,
    });

    const shot9 = path.join(ARTIFACTS_DIR, "wishlist_09_guest_login_redirect.png");
    await page.screenshot({ path: shot9, fullPage: false });
    console.log(`📸 Screenshot: ${shot9}`);

  } finally {
    await browser.close();
  }

  // ── FINAL QA SUMMARY ──
  console.log("\n==================================================");
  console.log("LIVE BROWSER WISHLIST QA SUMMARY");
  console.log("==================================================");
  let allPassed = true;
  for (const r of testResults) {
    const symbol = r.passed ? "✔ [PASS]" : "✖ [FAIL]";
    console.log(`${symbol} ${r.scenario}`);
    if (!r.passed) allPassed = false;
  }
  console.log("==================================================");

  if (allPassed) {
    console.log("🎉 ALL 9 BROWSER QA SCENARIOS PASSED SUCCESSFULLY!\n");
    process.exit(0);
  } else {
    console.error("❌ ONE OR MORE BROWSER QA SCENARIOS FAILED!\n");
    process.exit(1);
  }
}

runWishlistBrowserQA().catch((err) => {
  console.error("Browser QA Runner crashed:", err);
  process.exit(1);
});
