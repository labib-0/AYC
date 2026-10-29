import puppeteer from "puppeteer-core";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = "http://localhost:3000";

const TEST_BUYER = {
  id: 9991,
  name: "Tariq Al-Mansoor",
  email: "tariq@gulfapparel.ae",
  role: "customer",
  company_name: "Gulf Apparel Trading LLC",
  phone: "+971 50 123 4567",
  tax_id: "TRN-10029381",
  email_verified_at: "2026-10-01T00:00:00Z",
};

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((buyer) => {
    localStorage.setItem("ayaan_frontend_only_mode", "true");
    localStorage.setItem("ayaan_auth_token", `auth_token_customer_${buyer.id}`);
    localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(buyer));
    localStorage.setItem("ayaan_mock_users_v2", JSON.stringify([buyer]));
  }, TEST_BUYER);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1000));

  const initialAsideBox = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return null;
    const rect = aside.getBoundingClientRect();
    const computed = window.getComputedStyle(aside);
    return {
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
      position: computed.position,
      top: computed.top,
      parentDisplay: window.getComputedStyle(aside.parentElement).display,
      parentAlignItems: window.getComputedStyle(aside.parentElement).alignItems,
      ancestors: Array.from(document.querySelectorAll("*"))
        .filter((el) => el.contains(aside) && el !== aside)
        .map((el) => ({
          tag: el.tagName,
          className: el.className,
          overflow: window.getComputedStyle(el).overflow,
          overflowX: window.getComputedStyle(el).overflowX,
          overflowY: window.getComputedStyle(el).overflowY,
        })),
    };
  });
  console.log("Initial aside:", initialAsideBox);

  // Scroll down 600px
  await page.evaluate(() => window.scrollTo(0, 600));
  await new Promise((r) => setTimeout(r, 500));

  const scrolledAsideBox = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return null;
    const rect = aside.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
    };
  });
  console.log("Scrolled aside:", scrolledAsideBox);

  await browser.close();
}

test();

