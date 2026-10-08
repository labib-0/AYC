import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/luhasan/.gemini/antigravity-ide/brain/e9ad5a9b-d6ff-4d62-9c83-a65b903d4c14";
const SCREENSHOT_DIR = path.join(ARTIFACTS_DIR, "browser");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runLiveVerification() {
  console.log("==================================================");
  console.log("  AYAAN CLOTHING — LIVE PRODUCTION BROWSER QA     ");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const networkErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("favicon")) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  try {
    // 1. Homepage Verification
    console.log("\n▶ Checking Homepage (https://ayaanclothing.com)...");
    await page.goto("https://ayaanclothing.com", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Check Header search placeholder
    const headerPlaceholder = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Search products..."]');
      return input ? input.getAttribute("placeholder") : null;
    });
    console.log(`- Header search placeholder: "${headerPlaceholder}" (Expected: "Search products...")`);

    // Check brands
    const brandCount = await page.evaluate(() => {
      // Look for brand logos or brand elements
      const imgs = Array.from(document.querySelectorAll("img[alt*='brand' i], a[href*='/search?brand=']"));
      return imgs.length;
    });
    console.log(`- Detected brand links/logos on homepage: ${brandCount}`);

    // Check categories
    const categoryCount = await page.evaluate(() => {
      const catLinks = Array.from(document.querySelectorAll("a[href*='/search?category='], a[href*='/products?category=']"));
      return catLinks.length;
    });
    console.log(`- Detected category links on homepage: ${categoryCount}`);

    // Check product cards
    const productCardCount = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("a[href*='/products/']"));
      return cards.length;
    });
    console.log(`- Detected product cards on homepage: ${productCardCount}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_homepage.png"), fullPage: false });
    console.log("✔ Captured homepage screenshot.");

    // 2. Search Page Verification
    console.log("\n▶ Checking Search Page (https://ayaanclothing.com/search)...");
    await page.goto("https://ayaanclothing.com/search", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const searchState = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasZeroProductsHeading = text.includes("0 PRODUCTS");
      const hasNoProductsFound = text.includes("NO PRODUCTS FOUND") || text.includes("No Products Found");
      const hasErrorBanner = text.includes("Couldn't load products");
      const productCards = Array.from(document.querySelectorAll("a[href*='/products/']")).length;
      return {
        hasZeroProductsHeading,
        hasNoProductsFound,
        hasErrorBanner,
        productCards,
      };
    });
    console.log("- Search catalog results:", searchState);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_search_catalog.png") });
    console.log("✔ Captured search catalog screenshot.");

    // 3. Search Page Zero Results Verification
    console.log("\n▶ Checking Search Page with 0 results (?q=xyznonexistentquery9999)...");
    await page.goto("https://ayaanclothing.com/search?q=xyznonexistentquery9999", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const zeroResultState = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasZeroProductsHeading = text.includes("0 PRODUCTS");
      const hasNoProductsFound = text.includes("No Products Found") || text.includes("NO PRODUCTS FOUND");
      const hasErrorBanner = text.includes("Couldn't load products");
      const productCards = Array.from(document.querySelectorAll("a[href*='/products/']")).length;
      return {
        hasZeroProductsHeading,
        hasNoProductsFound,
        hasErrorBanner,
        productCards,
      };
    });
    console.log("- Zero result state check:", zeroResultState);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_search_zero_results.png") });
    console.log("✔ Captured zero result screenshot.");

    // 4. Signup Verification
    console.log("\n▶ Checking Signup Page (https://ayaanclothing.com/signup)...");
    await page.goto("https://ayaanclothing.com/signup", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Try submitting with invalid short password
    await page.type("input[type='email'], input[name='email']", "test-eval-user@ayaan-verify.local");
    const nameInput = await page.$("input[name='name'], input[placeholder*='name' i], input[placeholder*='Name' i]");
    if (nameInput) await nameInput.type("QA Tester");
    const passInput = await page.$("input[type='password']");
    if (passInput) await passInput.type("123");

    // Click submit
    const submitBtn = await page.$("button[type='submit']");
    if (submitBtn) {
      await submitBtn.click();
      await new Promise((r) => setTimeout(r, 2500));
    }

    const signupFeedback = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasNetworkError = text.includes("Network error or server unreachable");
      const hasValidationError = text.includes("must be at least 6 characters") ||
                                text.includes("password must be at least") ||
                                text.includes("invalid") ||
                                text.includes("required");
      return {
        hasNetworkError,
        hasValidationError,
        pageTextPreview: text.split("\n").filter((l) => l.trim().length > 0).slice(0, 15).join(" | "),
      };
    });
    console.log("- Signup validation result:", signupFeedback);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_signup_validation.png") });
    console.log("✔ Captured signup validation screenshot.");

    console.log("\n==================================================");
    console.log("  BROWSER VERIFICATION SUMMARY                   ");
    console.log("==================================================");
    console.log(`- Header Placeholder Valid: ${headerPlaceholder === "Search products..."}`);
    console.log(`- Catalog Populated: ${searchState.productCards > 0 && !searchState.hasErrorBanner}`);
    console.log(`- Exclusivity Respected: ${!zeroResultState.hasErrorBanner && zeroResultState.hasNoProductsFound}`);
    console.log(`- No False Network Error on Signup: ${!signupFeedback.hasNetworkError}`);
    console.log("==================================================");

  } catch (err) {
    console.error("Browser verification error:", err);
  } finally {
    await browser.close();
  }
}

runLiveVerification();
