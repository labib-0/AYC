import fs from "fs";
import path from "path";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (error: any) {
    console.error(`❌ [FAIL] ${name}\n       Error: ${error.message}`);
    process.exit(1);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toContain(expected: string) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected content to contain ${JSON.stringify(expected)}`);
      }
    },
    notToContain(expected: string) {
      if (actual.includes(expected)) {
        throw new Error(`Expected content NOT to contain ${JSON.stringify(expected)}`);
      }
    },
  };
}

console.log("==================================================");
console.log("HOT SALE VISIBILITY CONTROL AUDIT TESTS");
console.log("==================================================");

const adminHomepagePath = fs.existsSync(path.resolve(__dirname, "../src/app/ayc/homepage/page.tsx"))
  ? path.resolve(__dirname, "../src/app/ayc/homepage/page.tsx")
  : path.resolve(__dirname, "../src/app/admin/homepage/page.tsx");
const adminHomepageSrc = fs.readFileSync(adminHomepagePath, "utf-8");

const hotSalesPath = path.resolve(__dirname, "../src/components/home/HotSales.tsx");
const hotSalesSrc = fs.readFileSync(hotSalesPath, "utf-8");

const homepageServicePath = path.resolve(__dirname, "../src/services/homepage.service.ts");
const homepageServiceSrc = fs.readFileSync(homepageServicePath, "utf-8");

const backendControllerPath = path.resolve(__dirname, "../backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php");
const backendControllerSrc = fs.readFileSync(backendControllerPath, "utf-8");

const publicControllerPath = path.resolve(__dirname, "../backend/app/Http/Controllers/Api/V1/HomepageController.php");
const publicControllerSrc = fs.readFileSync(publicControllerPath, "utf-8");

const systemSettingPath = path.resolve(__dirname, "../backend/app/Models/SystemSetting.php");
const systemSettingSrc = fs.readFileSync(systemSettingPath, "utf-8");

// ▶ Suite 1: Admin Homepage Control UI
console.log("\n▶ Suite 1: Admin Homepage Control UI");

test("Admin Homepage page contains 'Hot Sale Visibility' section", () => {
  expect(adminHomepageSrc).toContain("Hot Sale Visibility");
  expect(adminHomepageSrc).toContain("Control whether the Hot Sale promotional section is displayed on the customer homepage.");
});

test("Admin toggle uses [ ON / OFF ] buttons with distinct IDs", () => {
  expect(adminHomepageSrc).toContain('id="btn-hot-sale-visible-on"');
  expect(adminHomepageSrc).toContain('id="btn-hot-sale-visible-off"');
  expect(adminHomepageSrc).toContain("ON");
  expect(adminHomepageSrc).toContain("OFF");
});

test("Admin toggle updates hotSaleVisible state without separate publish workflow", () => {
  expect(adminHomepageSrc).toContain("setHotSaleVisible(true)");
  expect(adminHomepageSrc).toContain("setHotSaleVisible(false)");
  expect(adminHomepageSrc).notToContain("Publish Hot Sale");
  expect(adminHomepageSrc).notToContain("Activate Hot Sale");
});

// ▶ Suite 2: Save Changes Persistence & Dirty State
console.log("\n▶ Suite 2: Save Changes Persistence & Dirty State");

test("Hot Sale visibility changes mark the page dirty and enable existing 'Save Changes' button", () => {
  expect(adminHomepageSrc).toContain("const isHotSaleVisibilityDirty = hotSaleVisible !== savedHotSaleVisible;");
  expect(adminHomepageSrc).toContain("const isPageDirty = isBannerDirty || isTickerDirty || isHotSaleVisibilityDirty;");
});

test("Existing SAVE CHANGES button handler persists Hot Sale visibility", () => {
  expect(adminHomepageSrc).toContain("if (isHotSaleVisibilityDirty) {");
  expect(adminHomepageSrc).toContain("await homepageService.updateHotSaleVisibility(hotSaleVisible);");
  expect(adminHomepageSrc).toContain("setSavedHotSaleVisible(hotSaleVisible);");
});

test("Reset button discards unsaved Hot Sale visibility changes", () => {
  expect(adminHomepageSrc).toContain("setHotSaleVisible(savedHotSaleVisible);");
});

// ▶ Suite 3: Default State & Backend Persistence
console.log("\n▶ Suite 3: Default State & Backend Persistence");

test("SystemSetting defaults hot_sale_visible to true", () => {
  expect(systemSettingSrc).toContain("public static function isHotSaleVisible(): bool");
  expect(systemSettingSrc).toContain("return (bool) static::get('hot_sale_visible', true);");
});

test("Storefront Homepage API returns hot_sale_visible boolean", () => {
  expect(publicControllerSrc).toContain("'hot_sale_visible' => SystemSetting::isHotSaleVisible()");
});

test("Admin Homepage API returns hot_sale_visible boolean", () => {
  expect(backendControllerSrc).toContain("'hot_sale_visible' => SystemSetting::isHotSaleVisible()");
});

test("Admin controller has updateHotSaleVisibility and updateSettings methods", () => {
  expect(backendControllerSrc).toContain("public function updateHotSaleVisibility(Request $request): JsonResponse");
  expect(backendControllerSrc).toContain("SystemSetting::set('hot_sale_visible', $visible, 'boolean', 'homepage');");
  expect(backendControllerSrc).toContain("CatalogCacheService::invalidateAll();");
});

// ▶ Suite 4: Customer Storefront Hot Sale Behavior
console.log("\n▶ Suite 4: Customer Storefront Hot Sale Behavior");

test("Storefront HotSales component syncs visibility from homepageService", () => {
  expect(hotSalesSrc).toContain("const [isVisible, setIsVisible] = useState<boolean>(true);");
  expect(hotSalesSrc).toContain("if (data.hot_sale_visible !== undefined) {");
  expect(hotSalesSrc).toContain("setIsVisible(Boolean(data.hot_sale_visible));");
});

test("Storefront HotSales returns null when isVisible is false (no empty container or blank space)", () => {
  expect(hotSalesSrc).toContain("if (!isVisible) {");
  expect(hotSalesSrc).toContain("return null;");
});

// ▶ Suite 5: Isolation & Non-Interference
console.log("\n▶ Suite 5: Isolation & Non-Interference");

test("Shop by Brand remains unchanged and has no visibility control", () => {
  expect(adminHomepageSrc).notToContain("Brand Visibility");
  expect(adminHomepageSrc).notToContain("Shop by Brand Visibility");
});

test("Certificate / BrandTrust remains unchanged and has no visibility control", () => {
  expect(adminHomepageSrc).notToContain("Certificate Visibility");
  expect(adminHomepageSrc).notToContain("Brand Trust Visibility");
});

test("No generic 'Homepage Visibility' section/tab is reintroduced", () => {
  expect(adminHomepageSrc).notToContain("Homepage Visibility");
  expect(adminHomepageSrc).notToContain("HOMEPAGE VISIBILITY");
});

console.log("\n==================================================");
console.log("ALL HOT SALE VISIBILITY TESTS PASSED SUCCESSFULLY!");
console.log("==================================================");
