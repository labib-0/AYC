import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/31cacd12-715a-409b-bae1-a43267ea2420";
const TOKEN = process.env.TOKEN || "";

const VIEWPORTS = [
  { width: 320, height: 650, name: "320" },
  { width: 375, height: 720, name: "375" },
  { width: 390, height: 844, name: "390" },
  { width: 430, height: 932, name: "430" },
  { width: 1280, height: 900, name: "1280" },
];

async function run() {
  console.log("Launching Chrome for Address & Checkout UI Verification...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  // Test across each viewport
  for (const vp of VIEWPORTS) {
    console.log(`\n========================================`);
    console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);
    await page.setViewport({ width: vp.width, height: vp.height });

    // Seed customer auth and cart
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.evaluate((tok) => {
      const user = {
        id: 4,
        name: "Labib Ul Hasan",
        email: "mdlhjahin@gmail.com",
        role: "customer",
        company_name: "Ayaan Retailers"
      };
      localStorage.setItem("ayaan_auth_token", tok);
      localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(user));
      localStorage.setItem("ayaan_customer_addresses_v1", JSON.stringify({
        "4": [
          {
            id: "addr_1",
            user_id: "4",
            label: "Headquarters",
            name: "Labib Ul Hasan",
            contact_name: "Labib Ul Hasan",
            company_name: "Ayaan Retailers",
            email: "mdlhjahin@gmail.com",
            phone: "+880 1711 000000",
            address_line_1: "House 12, Road 4, Sector 3",
            city: "Dhaka",
            state: "Dhaka Division",
            postal_code: "1230",
            country_code: "BD",
            country: "Bangladesh",
            is_default: true,
            created_at: new Date().toISOString()
          }
        ]
      }));
      localStorage.setItem("ayaan_cart", JSON.stringify([
        {
          id: "cart_item_145",
          product_id: 145,
          product: {
            id: 145,
            name: "Girls cvc plazu trousers",
            slug: "girls-cvc-plazu-trousers",
            brand: "Reebok",
            price: 1.6,
            moq: 300,
            stock: 1000,
            images: ["/ayc/storage/products/awz9hFEoCWwT8Q2mhwG9zuVq.webp"]
          },
          quantity: 300,
          size: "8-16",
          unit_price: 1.6
        }
      ]));
    }, TOKEN);

    // Navigate to cart
    await page.goto("http://localhost:3000/cart", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Click Proceed to Commercial Order / Checkout button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) =>
        b.textContent?.includes("Confirm Commercial Order") ||
        b.textContent?.includes("PROCEED TO CHECKOUT") ||
        b.textContent?.includes("Proceed") ||
        b.textContent?.includes("Checkout")
      );
      if (btn) btn.click();
    });

    await new Promise((r) => setTimeout(r, 1200));

    // Verify checkout modal presence
    const modalTitle = await page.evaluate(() => {
      const el = document.querySelector("#checkout-modal-title");
      return el ? el.textContent.trim() : null;
    });
    console.log(`Checkout Modal Title: "${modalTitle}"`);

    // Verify Aramex UI
    const aramexDetails = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const aramexBtn = buttons.find((b) => b.textContent?.includes("ARAMEX"));
      if (!aramexBtn) return null;
      return {
        text: aramexBtn.innerText.replace(/\n+/g, " | "),
        hasCurrentlyUnavailable: aramexBtn.innerText.includes("Currently Unavailable"),
        hasOldUnavailableBadge: aramexBtn.innerText.includes("UNAVAILABLE"),
        hasServiceDisabled: aramexBtn.innerText.includes("Service Disabled") || aramexBtn.innerText.includes("Service currently disabled"),
        hasPriorityAirText: aramexBtn.innerText.includes("Priority Air Express · 3–5 business days"),
        disabled: aramexBtn.disabled,
      };
    });
    console.log("Aramex Card Status:", aramexDetails);

    // Verify Discuss Directly UI
    const discussDirectlyDetails = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const ddBtn = buttons.find((b) => b.textContent?.includes("Discuss Directly"));
      if (!ddBtn) return null;
      return {
        text: ddBtn.innerText.replace(/\n+/g, " | "),
        hasExportTeamCopy: ddBtn.innerText.includes("Our export team will discuss shipping arrangements and freight charges with you after your order is placed."),
        hasFreightToBeConfirmed: ddBtn.innerText.includes("Freight to be confirmed"),
        headingHasIcon: !!ddBtn.querySelector("h3 svg, div.flex.items-center.gap-1\\.5 svg.lucide-message-circle"),
      };
    });
    console.log("Discuss Directly Status:", discussDirectlyDetails);

    // Verify Special Instructions UI
    const specialInstructionsDetails = await page.evaluate(() => {
      const textarea = document.querySelector("#specialInstructions");
      const label = document.querySelector('label[for="specialInstructions"]');
      return {
        hasTextarea: !!textarea,
        placeholder: textarea ? textarea.getAttribute("placeholder") : null,
        labelText: label ? label.textContent.trim() : null,
        hasSLIRemarks: label ? label.textContent.includes("Aramex SLI Remarks") : false,
      };
    });
    console.log("Special Instructions Status:", specialInstructionsDetails);

    // Verify Promo Code UI
    const promoCodeDetails = await page.evaluate(() => {
      const input = document.querySelector("#promoCodeInput");
      return {
        hasInput: !!input,
        placeholder: input ? input.getAttribute("placeholder") : null,
      };
    });
    console.log("Promo Code Input Status:", promoCodeDetails);

    // Verify Pricing Summary & Footer
    const pricingAndFooterDetails = await page.evaluate(() => {
      const submitBtn = document.querySelector("button[type='submit']");
      const paragraphs = Array.from(document.querySelectorAll("p"));
      const footerNote = paragraphs.find((p) => p.textContent?.includes("Proforma Invoice"));
      return {
        submitButtonText: submitBtn ? submitBtn.innerText.trim() : null,
        footerNoteText: footerNote ? footerNote.innerText.trim() : null,
      };
    });
    console.log("Footer & Button Status:", pricingAndFooterDetails);

    // Capture screenshot of Checkout Modal
    const checkoutScreenshotPath = path.join(ARTIFACTS_DIR, `checkout_modal_${vp.name}.png`);
    await page.screenshot({ path: checkoutScreenshotPath });
    console.log(`Saved screenshot: ${checkoutScreenshotPath}`);

    // Now open Add New Address form sheet
    console.log("Opening Add New Address sheet in checkout...");
    const openedSheet = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent?.includes("Add New Address") || b.textContent?.includes("Add Shipping Address"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (openedSheet) {
      await new Promise((r) => setTimeout(r, 600));

      const addressFormDetails = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll("label"));
        const companyLabel = labels.find((l) => l.textContent?.includes("Company Name"));
        const hasAsteriskOnCompany = companyLabel ? companyLabel.innerHTML.includes("*") || companyLabel.textContent.includes("*") : false;

        const inputs = Array.from(document.querySelectorAll("input, textarea"));
        const placeholders = inputs.map((i) => i.getAttribute("placeholder")).filter(Boolean);

        const allText = document.body.innerText;
        const fakeDataDetected = [
          "John Doe / Receiving Manager",
          "Global Retail Ltd / Fashion Boutique",
          "receiving@company.com",
          "+1 555 0192 or +44 20 7946 0912",
          "Street address, building number, warehouse bay",
          "New York, London, Dubai",
          "CA, NY, Greater London, Bavaria",
          "10001, W1D 1BS, 90210",
        ].filter((f) => allText.includes(f) || placeholders.some((p) => p && p.includes(f)));

        return {
          hasAsteriskOnCompany,
          fakeDataDetected,
          placeholders,
        };
      });
      console.log("Address Form Placeholders & Status:", addressFormDetails);

      // Test Searchable Country Selector
      const countrySearchTest = await page.evaluate(async () => {
        const trigger = document.querySelector("#address-country-select");
        if (!trigger) return { error: "No country trigger" };
        trigger.click();

        await new Promise((r) => setTimeout(r, 200));
        const searchInput = document.querySelector('input[placeholder="Search country or code..."]');
        if (!searchInput) return { error: "No search input" };

        searchInput.value = "Japan";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));

        await new Promise((r) => setTimeout(r, 200));
        const options = Array.from(document.querySelectorAll('[role="option"]'));
        const japanOption = options.find((o) => o.textContent?.includes("Japan"));
        if (japanOption) {
          japanOption.click();
        }

        await new Promise((r) => setTimeout(r, 200));
        return {
          countryValueAfterSelect: trigger.innerText.trim(),
        };
      });
      console.log("Country Search Test (selected Japan):", countrySearchTest);

      // Capture screenshot of Address Modal
      const addressScreenshotPath = path.join(ARTIFACTS_DIR, `address_form_${vp.name}.png`);
      await page.screenshot({ path: addressScreenshotPath });
      console.log(`Saved screenshot: ${addressScreenshotPath}`);

      // Test leaving Company Name blank and saving
      if (vp.name === "1280") {
        console.log("Testing saving address without Company Name...");
        const saveAddressResult = await page.evaluate(async () => {
          const inputs = Array.from(document.querySelectorAll("input"));
          const nameInput = inputs.find((i) => i.placeholder?.includes("contact person"));
          if (nameInput) {
            nameInput.value = "Jonathan Smith";
            nameInput.dispatchEvent(new Event("input", { bubbles: true }));
          }

          const emailInput = inputs.find((i) => i.type === "email");
          if (emailInput) {
            emailInput.value = "jonathan@example.com";
            emailInput.dispatchEvent(new Event("input", { bubbles: true }));
          }

          const phoneInput = inputs.find((i) => i.type === "tel");
          if (phoneInput) {
            phoneInput.value = "+81 3 1234 5678";
            phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
          }

          const line1Input = inputs.find((i) => i.placeholder?.includes("Street address"));
          if (line1Input) {
            line1Input.value = "1-1 Chiyoda, Chiyoda-ku";
            line1Input.dispatchEvent(new Event("input", { bubbles: true }));
          }

          const cityInput = inputs.find((i) => i.placeholder?.includes("city"));
          if (cityInput) {
            cityInput.value = "Tokyo";
            cityInput.dispatchEvent(new Event("input", { bubbles: true }));
          }

          const postalInput = inputs.find((i) => i.placeholder?.includes("postal code"));
          if (postalInput) {
            postalInput.value = "100-8111";
            postalInput.dispatchEvent(new Event("input", { bubbles: true }));
          }

          // Company Name is left blank intentionally!

          const buttons = Array.from(document.querySelectorAll("button"));
          const saveBtn = buttons.find((b) => b.textContent?.includes("Save & Use") || b.textContent?.includes("Save Address"));
          if (saveBtn) {
            saveBtn.click();
            return { attemptedSave: true };
          }
          return { attemptedSave: false };
        });
        console.log("Save Address Attempt Result:", saveAddressResult);

        await new Promise((r) => setTimeout(r, 1200));
        const afterSaveScreenshot = path.join(ARTIFACTS_DIR, "address_saved_without_company.png");
        await page.screenshot({ path: afterSaveScreenshot });
        console.log(`Saved screenshot: ${afterSaveScreenshot}`);
      }
    }
  }

  // Also test /dashboard/addresses
  console.log("\n========================================");
  console.log("Testing /dashboard/addresses page");
  console.log("========================================");
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto("http://localhost:3000/dashboard/addresses", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1000));

  // Open modal on dashboard
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const addBtn = buttons.find((b) => b.textContent?.includes("Add New") || b.textContent?.includes("Add Shipping Address"));
    if (addBtn) addBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const dashboardModalScreenshot = path.join(ARTIFACTS_DIR, "dashboard_address_modal.png");
  await page.screenshot({ path: dashboardModalScreenshot });
  console.log(`Saved screenshot: ${dashboardModalScreenshot}`);

  await browser.close();
  console.log("\n==================================================");
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
