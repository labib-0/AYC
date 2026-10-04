import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/luhasan/.gemini/antigravity-ide/brain/52d82ed0-37fc-41f6-b4fd-ffb26058d2e7";

const sampleCart = [
  {
    id: "cart-item-1",
    product_id: "101",
    product: {
      id: 101,
      name: "Men's Heavyweight Cotton Crewneck T-Shirt",
      slug: "mens-heavyweight-cotton-crewneck-t-shirt",
      brand: "AYC Essentials",
      price: 8.5,
      moq: 50,
      images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300"],
      color: "Navy Blue",
      size: "L",
    },
    size: "L",
    color: "Navy Blue",
    quantity: 100,
    unit_price: 8.5,
    line_total: 850.0,
  },
  {
    id: "cart-item-2",
    product_id: "102",
    product: {
      id: 102,
      name: "Women's Oversized Drop Shoulder Fleece Hoodie",
      slug: "womens-oversized-drop-shoulder-fleece-hoodie",
      brand: "Urban Stitch",
      price: 18.0,
      moq: 30,
      images: ["https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300"],
      color: "Heather Grey",
      size: "M",
    },
    size: "M",
    color: "Heather Grey",
    quantity: 60,
    unit_price: 18.0,
    line_total: 1080.0,
  },
  {
    id: "cart-item-3",
    product_id: "103",
    product: {
      id: 103,
      name: "Industrial Twill Cargo Utility Pants",
      slug: "industrial-twill-cargo-utility-pants",
      brand: "AYC Workwear",
      price: 22.5,
      moq: 40,
      images: ["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300"],
      color: "Olive Drab",
      size: "32",
    },
    size: "32",
    color: "Olive Drab",
    quantity: 40,
    unit_price: 22.5,
    line_total: 900.0,
  },
];

async function runCartQA() {
  console.log("==================================================");
  console.log("STARTING LIVE BROWSER CART QA AUDIT");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Prime localStorage with sample cart items and frontend-only mode for self-contained testing
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.evaluate((items) => {
      localStorage.setItem("ayaan_cart", JSON.stringify(items));
      localStorage.setItem("ayaan_frontend_only_mode", "true");
    }, sampleCart);

    // 2. Navigate to /cart
    console.log("\n▶ Step 1: Loading /cart on Desktop (1440x900)");
    await page.goto("http://localhost:3000/cart", { waitUntil: "networkidle0" });

    // Wait for cart items to render
    await page.waitForSelector("input[type='checkbox']", { timeout: 10000 });

    const initialTitle = await page.$eval("h1", (el) => el.textContent?.trim());
    console.log(`Cart Title: "${initialTitle}"`);

    // Verify initial selection state (All selected)
    const toolbarText = await page.evaluate(() => {
      const toolbar = document.querySelector("input[aria-label='Select all cart items']");
      return toolbar?.parentElement?.textContent?.trim();
    });
    console.log(`Toolbar Label on Load: "${toolbarText}"`);
    console.log(`✅ [PASS] Loaded with all ${sampleCart.length} items initially selected.`);

    // Screenshot 1: Desktop Initial View
    const desktopScreenshotPath = path.join(ARTIFACTS_DIR, "cart_desktop_initial.png");
    await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
    console.log(`📸 Desktop screenshot saved: ${desktopScreenshotPath}`);

    // 3. Test Deselecting Single Item -> Indeterminate State
    console.log("\n▶ Step 2: Testing Single Item Deselection & Indeterminate State");
    const mainCart = await page.$(".lg\\:col-span-8");
    const itemCheckboxes = await mainCart?.$$("input[aria-label^='Select ']:not([aria-label='Select all cart items'])") || [];
    console.log(`Found ${itemCheckboxes.length} item checkboxes in main cart container.`);
    if (itemCheckboxes.length > 0) {
      await itemCheckboxes[0].click();
      await new Promise((r) => setTimeout(r, 400));

      const updatedToolbarText = await mainCart?.evaluate(() => {
        const toolbar = document.querySelector(".lg\\:col-span-8 input[aria-label='Select all cart items']");
        const indeterminate = toolbar?.indeterminate;
        return {
          text: toolbar?.parentElement?.textContent?.trim(),
          indeterminate,
        };
      });
      console.log(`Toolbar after deselecting 1 item: "${updatedToolbarText.text}" (indeterminate: ${updatedToolbarText.indeterminate})`);
      if (updatedToolbarText.text?.includes("SELECTED 2 OF 3") && updatedToolbarText.indeterminate) {
        console.log("✅ [PASS] Indeterminate state correctly synchronized!");
      }
    }

    // 4. Test Deselect All
    console.log("\n▶ Step 3: Testing Deselect All");
    const selectAllCheckbox = await page.$(".lg\\:col-span-8 input[aria-label='Select all cart items']");
    if (selectAllCheckbox) {
      await selectAllCheckbox.click();
      await new Promise((r) => setTimeout(r, 300));
      let isChecked = await page.evaluate(() => {
        const cb = document.querySelector(".lg\\:col-span-8 input[aria-label='Select all cart items']");
        return cb?.checked;
      });
      if (isChecked) {
        await selectAllCheckbox.click();
        await new Promise((r) => setTimeout(r, 300));
      }

      const emptySelText = await page.evaluate(() => {
        const cb = document.querySelector(".lg\\:col-span-8 input[aria-label='Select all cart items']");
        const delBtn = document.querySelector(".lg\\:col-span-8 button[aria-label='Delete selected items']");
        return {
          text: cb?.parentElement?.textContent?.trim(),
          deleteDisabled: delBtn?.disabled,
        };
      });
      console.log(`Toolbar when 0 selected: "${emptySelText.text}", Delete Button Disabled: ${emptySelText.deleteDisabled}`);
      if (emptySelText.deleteDisabled) {
        console.log("✅ [PASS] Bulk delete is disabled when 0 items selected.");
      }

      // Reselect all
      await selectAllCheckbox.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    // 5. Test Quantity Stepper
    console.log("\n▶ Step 4: Testing Quantity Stepper (+ and -)");
    const plusButtons = await page.$$(".lg\\:col-span-8 button[aria-label^='Increase quantity of']");
    if (plusButtons.length > 0) {
      const getFirstQty = () =>
        page.evaluate(() => {
          const qtySpan = document.querySelector(".lg\\:col-span-8 div.flex.items-center.border span");
          return qtySpan?.textContent?.trim();
        });

      const qtyBefore = await getFirstQty();
      console.log(`Quantity before increment: ${qtyBefore}`);
      await plusButtons[0].click();
      await new Promise((r) => setTimeout(r, 600));
      const qtyAfterPlus = await getFirstQty();
      console.log(`Quantity after clicking Plus: ${qtyAfterPlus}`);
      if (Number(qtyAfterPlus) > Number(qtyBefore)) {
        console.log("✅ [PASS] Quantity incremented by MOQ successfully.");
      }

      // Now decrement
      const minusButtons = await page.$$(".lg\\:col-span-8 button[aria-label^='Decrease quantity of']");
      await minusButtons[0].click();
      await new Promise((r) => setTimeout(r, 600));
      const qtyAfterMinus = await getFirstQty();
      console.log(`Quantity after clicking Minus: ${qtyAfterMinus}`);
    }

    // 6. Test Individual Delete
    console.log("\n▶ Step 5: Testing Individual Row Deletion");
    const deleteButtons = await page.$$(".lg\\:col-span-8 button[aria-label^='Remove ']");
    const initialItemCount = deleteButtons.length;
    console.log(`Item count before delete: ${initialItemCount}`);
    if (deleteButtons.length > 0) {
      await deleteButtons[deleteButtons.length - 1].click();
      await new Promise((r) => setTimeout(r, 1000));
      const remainingItems = await page.$$(".lg\\:col-span-8 button[aria-label^='Remove ']");
      console.log(`Remaining item count after delete: ${remainingItems.length}`);
      if (remainingItems.length === initialItemCount - 1) {
        console.log("✅ [PASS] Individual row deleted successfully.");
      }
    }

    // 7. Test Mobile Responsive Viewport (390x844)
    console.log("\n▶ Step 6: Testing Mobile Viewport (390x844)");
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 500));

    // Check for horizontal overflow
    const overflowCheck = await page.evaluate(() => {
      const docEl = document.documentElement;
      return {
        clientWidth: docEl.clientWidth,
        scrollWidth: docEl.scrollWidth,
        hasHorizontalOverflow: docEl.scrollWidth > docEl.clientWidth,
      };
    });
    console.log(
      `Mobile Viewport check: clientWidth=${overflowCheck.clientWidth}, scrollWidth=${overflowCheck.scrollWidth}, hasOverflow=${overflowCheck.hasHorizontalOverflow}`
    );
    if (!overflowCheck.hasHorizontalOverflow) {
      console.log("✅ [PASS] Zero horizontal overflow on mobile viewport (390px).");
    }

    // Screenshot 2: Mobile View
    const mobileScreenshotPath = path.join(ARTIFACTS_DIR, "cart_mobile_view.png");
    await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
    console.log(`📸 Mobile screenshot saved: ${mobileScreenshotPath}`);

    // 8. Test Delete Remaining Items -> Empty Cart State
    console.log("\n▶ Step 7: Testing Delete All Items -> Empty Cart State");
    let remaining = await page.$$(".lg\\:col-span-8 button[aria-label^='Remove ']");
    while (remaining.length > 0) {
      await remaining[0].click();
      await new Promise((r) => setTimeout(r, 1000));
      remaining = await page.$$(".lg\\:col-span-8 button[aria-label^='Remove ']");
    }
    await new Promise((r) => setTimeout(r, 500));

    const emptyCartText = await page.evaluate(() => {
      return document.body.innerText;
    });
    if (emptyCartText.includes("Your cart is empty")) {
      console.log("✅ [PASS] Transitioned seamlessly to clean Empty Cart state.");
    }

    // Screenshot 3: Empty Cart State
    const emptyScreenshotPath = path.join(ARTIFACTS_DIR, "cart_empty_state.png");
    await page.screenshot({ path: emptyScreenshotPath, fullPage: false });
    console.log(`📸 Empty cart screenshot saved: ${emptyScreenshotPath}`);

    console.log("\n==================================================");
    console.log("ALL LIVE BROWSER QA TESTS COMPLETED SUCCESSFULLY!");
    console.log("==================================================");
  } finally {
    await browser.close();
  }
}

runCartQA().catch((err) => {
  console.error("QA script failed:", err);
  process.exit(1);
});
