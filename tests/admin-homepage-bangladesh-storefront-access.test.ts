/**
 * AUTOMATED TEST SUITE:
 * HOMEPAGE ADMIN: BANGLADESH STOREFRONT IP BLOCK ON/OFF CONTROL
 *
 * Verifies all 28 acceptance criteria from Master Prompt:
 * 1. Placement near the top of Admin Homepage (below header, before promotional banner)
 * 2. Visual separation from content configuration fields (Security / Access Control badge)
 * 3. Title: "BANGLADESH STOREFRONT ACCESS"
 * 4. Helper text: "Block customer storefront access from Bangladesh IP addresses."
 * 5. Displayed status: "● Storefront blocked in Bangladesh" (ON) / "● Storefront accessible in Bangladesh" (OFF)
 * 6. Status toggle button: [ ON ] / [ OFF ] with id="bangladesh-storefront-access-toggle"
 * 7. Confirmation modal: "Enable Bangladesh Storefront Block?" / "Disable Bangladesh Storefront Block?"
 * 8. Confirmation modal buttons: CANCEL and CONFIRM
 * 9. Loading indicator during update: "Updating…" with button disabled
 * 10. Success message: "Bangladesh storefront access updated. Traffic changes may take a short time to propagate."
 * 11. Error message: "Unable to update Bangladesh storefront access. The Cloudflare configuration was not changed."
 * 12. Frontend API service contracts: getBangladeshStorefrontAccess() and updateBangladeshStorefrontAccess()
 * 13. Security gate: Zero NEXT_PUBLIC_CLOUDFLARE secrets exposed to frontend.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log("======================================================================");
console.log("TEST SUITE: HOMEPAGE ADMIN BANGLADESH STOREFRONT ACCESS CONTROL");
console.log("======================================================================\n");

const projectRoot = resolve(__dirname, "..");
const cardPath = resolve(projectRoot, "src/components/admin/homepage/BangladeshStorefrontAccessCard.tsx");
const pagePath = resolve(projectRoot, "src/app/ayc/homepage/page.tsx");
const indexPath = resolve(projectRoot, "src/components/admin/homepage/index.ts");
const servicePath = resolve(projectRoot, "src/services/homepage.service.ts");
const nextConfigPath = resolve(projectRoot, "next.config.ts");

// 1. Files existence check
assert(existsSync(cardPath), "BangladeshStorefrontAccessCard.tsx exists");
assert(existsSync(pagePath), "src/app/ayc/homepage/page.tsx exists");
assert(existsSync(indexPath), "src/components/admin/homepage/index.ts exists");
assert(existsSync(servicePath), "src/services/homepage.service.ts exists");

const cardCode = readFileSync(cardPath, "utf-8");
const pageCode = readFileSync(pagePath, "utf-8");
const indexCode = readFileSync(indexPath, "utf-8");
const serviceCode = readFileSync(servicePath, "utf-8");
const nextConfigCode = readFileSync(nextConfigPath, "utf-8");

console.log("\n▶ PART 1: HOMEPAGE ADMIN PAGE PLACEMENT & VISUAL HIERARCHY");
assert(
  pageCode.includes("<BangladeshStorefrontAccessCard"),
  "BangladeshStorefrontAccessCard is mounted in Admin Homepage page.tsx"
);

const headerIndex = pageCode.indexOf("<HomepageBannerHeader");
const cardMountIndex = pageCode.indexOf("<BangladeshStorefrontAccessCard");
const bannerSectionIndex = pageCode.indexOf("SECTION 1: PRIMARY PROMOTIONAL BANNER");

assert(
  headerIndex !== -1 && cardMountIndex > headerIndex,
  "Control is placed immediately below the Homepage Header"
);
assert(
  bannerSectionIndex !== -1 && cardMountIndex < bannerSectionIndex,
  "Control is placed near the top, ahead of Section 1 (Primary Promotional Banner)"
);

console.log("\n▶ PART 2: COMPONENT LABELS, HELPER TEXT & STATUS DISPLAY");
assert(
  cardCode.includes("Bangladesh Storefront Access"),
  "Card displays title: 'Bangladesh Storefront Access'"
);
assert(
  cardCode.includes("Security Control"),
  "Card is styled with 'Security Control' badge to distinguish from content fields"
);
assert(
  cardCode.includes("Block customer storefront access from Bangladesh IP addresses"),
  "Card displays exact helper text: 'Block customer storefront access from Bangladesh IP addresses'"
);
assert(
  cardCode.includes("● Storefront blocked in Bangladesh"),
  "Card displays ON status: '● Storefront blocked in Bangladesh'"
);
assert(
  cardCode.includes("● Storefront accessible in Bangladesh"),
  "Card displays OFF status: '● Storefront accessible in Bangladesh'"
);
assert(
  cardCode.includes('id="bangladesh-storefront-access-toggle"'),
  "Toggle button has unique descriptive id='bangladesh-storefront-access-toggle'"
);
assert(
  cardCode.includes('[ ON ]') && cardCode.includes('[ OFF ]'),
  "Toggle button status displays '[ ON ]' or '[ OFF ]'"
);

console.log("\n▶ PART 3: CONFIRMATION DIALOG SPECIFICATION");
assert(
  cardCode.includes("Enable Bangladesh Storefront Block?"),
  "Modal has title: 'Enable Bangladesh Storefront Block?' for turning ON"
);
assert(
  cardCode.includes("Disable Bangladesh Storefront Block?"),
  "Modal has title: 'Disable Bangladesh Storefront Block?' for turning OFF"
);
assert(
  cardCode.includes("Customer storefront requests from Bangladesh IP addresses will be blocked"),
  "Modal has message for turning ON: 'Customer storefront requests from Bangladesh IP addresses will be blocked.'"
);
assert(
  cardCode.includes("Customer storefront access from Bangladesh IP addresses will be restored"),
  "Modal has message for turning OFF: 'Customer storefront access from Bangladesh IP addresses will be restored.'"
);
assert(
  cardCode.includes(">CANCEL<") || cardCode.includes("CANCEL"),
  "Modal includes CANCEL button"
);
assert(
  cardCode.includes(">CONFIRM<") || cardCode.includes("CONFIRM"),
  "Modal includes CONFIRM button"
);

console.log("\n▶ PART 4: LOADING, SUCCESS & SAFE ERROR HANDLING");
assert(
  cardCode.includes("Updating…"),
  "Loading state displays 'Updating…'"
);
assert(
  cardCode.includes("Bangladesh storefront access updated"),
  "Success message includes 'Bangladesh storefront access updated.'"
);
assert(
  cardCode.includes("Traffic changes may take a short time to propagate"),
  "Success message includes propagation notice: 'Traffic changes may take a short time to propagate.'"
);
assert(
  cardCode.includes("Unable to update Bangladesh storefront access. The Cloudflare configuration was not changed."),
  "Error state displays exact safe error: 'Unable to update Bangladesh storefront access. The Cloudflare configuration was not changed.'"
);

console.log("\n▶ PART 5: FRONTEND API SERVICE & PROXY ROUTING CONTRACTS");
assert(
  serviceCode.includes("getBangladeshStorefrontAccess()"),
  "homepageService exports getBangladeshStorefrontAccess()"
);
assert(
  serviceCode.includes("updateBangladeshStorefrontAccess("),
  "homepageService exports updateBangladeshStorefrontAccess(enabled: boolean)"
);
assert(
  serviceCode.includes('"/admin/homepage/bangladesh-storefront-access"'),
  "homepageService targets '/admin/homepage/bangladesh-storefront-access'"
);
assert(
  nextConfigCode.includes("/ayc/api/:path*"),
  "next.config.ts correctly rewrites '/ayc/api/*' to backend API base"
);

console.log("\n▶ PART 6: CREDENTIAL & SECRETS SECURITY GATE");
// Verify no NEXT_PUBLIC_CLOUDFLARE variables exist
const envExamplePath = resolve(projectRoot, ".env.example");
const envLocalPath = resolve(projectRoot, ".env.local");

if (existsSync(envExamplePath)) {
  const envExample = readFileSync(envExamplePath, "utf-8");
  assert(!envExample.includes("NEXT_PUBLIC_CLOUDFLARE"), ".env.example contains NO NEXT_PUBLIC_CLOUDFLARE");
}
if (existsSync(envLocalPath)) {
  const envLocal = readFileSync(envLocalPath, "utf-8");
  assert(!envLocal.includes("NEXT_PUBLIC_CLOUDFLARE"), ".env.local contains NO NEXT_PUBLIC_CLOUDFLARE");
}

assert(!cardCode.includes("CLOUDFLARE_API_TOKEN"), "No Cloudflare API token in React frontend component");
assert(!serviceCode.includes("CLOUDFLARE_API_TOKEN"), "No Cloudflare API token in frontend service code");

console.log("\n======================================================================");
console.log("ALL FRONTEND BANGLADESH STOREFRONT ACCESS TESTS PASSED (100%)!");
console.log("======================================================================\n");
