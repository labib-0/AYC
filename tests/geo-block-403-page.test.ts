import fs from "fs";
import path from "path";
import { GEO_BLOCKED_HTML } from "../src/lib/geo-block-page";

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
console.log("403 REGIONAL PAGE COPY & BRAND COLOR AUDIT TESTS");
console.log("==================================================");

const staticHtmlPath = path.resolve(__dirname, "../public/403_geo_restricted.html");
const staticHtml = fs.readFileSync(staticHtmlPath, "utf-8");

const exactSupportingText = "Ayaan Clothing serves international wholesale and export buyers. Access from Bangladesh is currently unavailable.";
const exactHeading = "Ayaan Clothing Is Not<br>Available in <span class=\"accent\">Bangladesh</span>";
const brandOrange = "#EA580C";
const brandOrangeRgb = "234, 88, 12";

[
  { name: "src/lib/geo-block-page.ts (GEO_BLOCKED_HTML)", html: GEO_BLOCKED_HTML },
  { name: "public/403_geo_restricted.html", html: staticHtml },
].forEach(({ name, html }) => {
  console.log(`\n▶ Testing ${name}:`);

  test(`${name} contains exact supporting message`, () => {
    expect(html).toContain(exactSupportingText);
  });

  test(`${name} does NOT contain obsolete/technical forbidden keywords`, () => {
    expect(html.toLowerCase()).notToContain("storefront is designed");
    expect(html.toLowerCase()).notToContain("cloudflare");
    expect(html.toLowerCase()).notToContain("geoip");
    expect(html.toLowerCase()).notToContain("laravel");
    expect(html.toLowerCase()).notToContain("waf");
    expect(html.toLowerCase()).notToContain("enterprise notice");
  });

  test(`${name} maintains exact heading and highlighted Bangladesh`, () => {
    expect(html).toContain(exactHeading);
  });

  test(`${name} uses official brand orange token (#EA580C / 234, 88, 12)`, () => {
    expect(html).toContain(brandOrange);
    expect(html).toContain(brandOrangeRgb);
    expect(html).toContain("var(--brand-orange)");
  });

  test(`${name} does NOT contain obsolete red/pink accent (#f87171 or 248, 113, 113)`, () => {
    expect(html).notToContain("#f87171");
    expect(html).notToContain("248, 113, 113");
  });

  test(`${name} contains HTTP 403 status badge`, () => {
    expect(html).toContain("HTTP 403 · REGIONAL ACCESS RESTRICTION");
  });

  test(`${name} does NOT contain map, globe, pin or buttons`, () => {
    expect(html.toLowerCase()).notToContain("<button");
    expect(html.toLowerCase()).notToContain("globe");
    expect(html.toLowerCase()).notToContain("location-pin");
  });
});

console.log("\n==================================================");
console.log("ALL 403 REGIONAL PAGE AUDIT TESTS PASSED (100%)!");
console.log("==================================================");
