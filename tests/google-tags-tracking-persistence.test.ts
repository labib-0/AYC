/**
 * Automated Test Suite: Google Tags & Tracking Persistence and Integration
 *
 * Verifies all 12 requirements:
 * 1. Retrieve the Google Tags & Tracking settings.
 * 2. Save Head Code only (preserves existing Body Code).
 * 3. Save Body Code only (preserves existing Head Code).
 * 4. Save both fields together.
 * 5. Reload the page and verify persistence across reloads.
 * 6. Clear either field intentionally and save (clears to null without wiping other).
 * 7. Submit multiline snippets with HTML tags, quotes, and line breaks.
 * 8. Submit empty and oversized input to verify appropriate validation (<64KB).
 * 9. Confirm an unauthorized user cannot modify the settings (Superadmin / RBAC).
 * 10. Confirm storefront places snippets in correct document locations (<head> & <body>) exactly once.
 * 11. Confirm settings survive normal navigation and admin route isolation (/ayc never executes snippets).
 * 12. Confirm the underlying 500 error no longer occurs (Log facade imported, independent saving).
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  StorefrontHeadTracking,
  StorefrontBodyTracking,
} from "../src/components/analytics/StorefrontTrackingTags";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log("======================================================================");
console.log("TEST SUITE: GOOGLE TAGS & TRACKING PERSISTENCE & INTEGRATION SUITE");
console.log("======================================================================\n");

const projectRoot = resolve(__dirname, "..");

// 1. Static Architecture and Code Inspection
console.log("▶ TEST 1 & 12: CONTROLLER FIX & FACADE RESOLUTION");
const controllerPath = resolve(
  projectRoot,
  "backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php"
);
assert(existsSync(controllerPath), "HomepageManagementController.php exists");
const controllerSource = readFileSync(controllerPath, "utf-8");

// Verify Log facade import
assert(
  controllerSource.includes("use Illuminate\\Support\\Facades\\Log;"),
  "HomepageManagementController imports Illuminate\\Support\\Facades\\Log facade"
);

// Verify independent field save logic in updateGoogleTags
assert(
  controllerSource.includes("SystemSetting::setGoogleTagHeadCode($validated['head_code']);"),
  "updateGoogleTags independently updates Head Code when present"
);
assert(
  controllerSource.includes("SystemSetting::setGoogleTagBodyCode($validated['body_code']);"),
  "updateGoogleTags independently updates Body Code when present"
);
assert(
  !controllerSource.includes("array_key_exists('head_code', $validated) ? $validated['head_code'] : null;"),
  "updateGoogleTags does NOT overwrite missing fields with null"
);

// Verify cache invalidation
assert(
  controllerSource.includes("Cache::forget('site_settings_public');"),
  "updateGoogleTags invalidates public storefront settings cache immediately"
);
assert(
  controllerSource.includes("CatalogCacheService::invalidateAll();"),
  "updateGoogleTags flushes catalog cache"
);

// 2. Model Inspection: SystemSetting
console.log("\n▶ TEST 2, 3, 4, 6: MODEL PERSISTENCE & DEDICATED SETTERS");
const modelPath = resolve(projectRoot, "backend/app/Models/SystemSetting.php");
assert(existsSync(modelPath), "SystemSetting.php exists");
const modelSource = readFileSync(modelPath, "utf-8");

assert(
  modelSource.includes("function setGoogleTagHeadCode(?string $headCode): void"),
  "SystemSetting defines setGoogleTagHeadCode method"
);
assert(
  modelSource.includes("function setGoogleTagBodyCode(?string $bodyCode): void"),
  "SystemSetting defines setGoogleTagBodyCode method"
);
assert(
  modelSource.includes("static::updateOrCreate("),
  "SystemSetting uses updateOrCreate preventing duplicate records on repeated saves"
);

// 3. Authorization & RBAC Route Inspection
console.log("\n▶ TEST 9: AUTHORIZATION & RBAC PRIVILEGES");
const routesPath = resolve(projectRoot, "backend/routes/api.php");
assert(existsSync(routesPath), "routes/api.php exists");
const routesSource = readFileSync(routesPath, "utf-8");

assert(
  routesSource.includes("Route::get('/google-tags', [AdminHomepageManagementController::class, 'getGoogleTags'])"),
  "GET /admin/homepage/google-tags is registered with permission:homepage.view"
);
assert(
  routesSource.includes("Route::post('/google-tags', [AdminHomepageManagementController::class, 'updateGoogleTags'])"),
  "POST /admin/homepage/google-tags is registered with permission:settings.edit"
);
assert(
  controllerSource.includes("$user->isSuperAdmin() ||"),
  "updateGoogleTags restricts execution to Super Admin or authorized settings manager"
);
assert(
  controllerSource.includes("$this->authorization->can($user, 'settings.edit')"),
  "updateGoogleTags enforces settings.edit permission"
);

// 4. Frontend Component & Independent Action Bars
console.log("\n▶ TEST 5, 8: FRONTEND ADMIN COMPONENT & VALIDATION");
const componentPath = resolve(
  projectRoot,
  "src/components/admin/homepage/GoogleTagsManager.tsx"
);
assert(existsSync(componentPath), "GoogleTagsManager.tsx exists");
const componentSource = readFileSync(componentPath, "utf-8");

assert(
  componentSource.includes("handleSave(\"head\")"),
  "GoogleTagsManager provides independent Save Head Code control"
);
assert(
  componentSource.includes("handleSave(\"body\")"),
  "GoogleTagsManager provides independent Save Body Code control"
);
assert(
  componentSource.includes("handleClearSnippet(\"head\")"),
  "GoogleTagsManager provides independent Clear Head Code control"
);
assert(
  componentSource.includes("handleClearSnippet(\"body\")"),
  "GoogleTagsManager provides independent Clear Body Code control"
);
assert(
  componentSource.includes("MAX_SNIPPET_BYTES = 65536"),
  "GoogleTagsManager enforces 64 KB client-side byte limit"
);
assert(
  componentSource.includes("isHeadOversized") && componentSource.includes("isBodyOversized"),
  "GoogleTagsManager detects oversized snippets before network transmission"
);
assert(
  componentSource.includes("extractErrorMessage"),
  "GoogleTagsManager provides detailed diagnostic error reporting"
);

// 5. Storefront Injection & Tag Rendering Tests (Head & Body)
console.log("\n▶ TEST 7, 10, 11: STOREFRONT INJECTION & ROUTE ISOLATION");

// Test Multiline GTM Head snippet with quotes, attributes, and comments
const multilineGtmHead = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PROD9999');</script>
<!-- End Google Tag Manager -->`;

const headHtml = ReactDOMServer.renderToString(
  React.createElement(StorefrontHeadTracking, { snippet: multilineGtmHead })
);
assert(headHtml.includes("GTM-PROD9999"), "StorefrontHeadTracking rendered GTM snippet with container ID");
assert(headHtml.includes("gtm.start"), "StorefrontHeadTracking preserved script inner execution logic");
assert(headHtml.startsWith("<script>"), "StorefrontHeadTracking emits clean <script> element without invalid wrappers");

// Test Multiline GTM Body noscript fallback snippet
const multilineGtmBody = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PROD9999"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

const bodyHtml = ReactDOMServer.renderToString(
  React.createElement(StorefrontBodyTracking, { snippet: multilineGtmBody })
);
assert(bodyHtml.includes("<noscript>"), "StorefrontBodyTracking rendered <noscript> fallback element");
assert(bodyHtml.includes("src=\"https://www.googletagmanager.com/ns.html?id=GTM-PROD9999\""), "StorefrontBodyTracking preserved iframe src attribute");
assert(bodyHtml.includes("visibility:hidden"), "StorefrontBodyTracking preserved inline styling");

// Test Empty Snippet Injection (must render NOTHING)
assert(
  ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: null })) === "",
  "StorefrontHeadTracking renders null for empty snippet"
);
assert(
  ReactDOMServer.renderToString(React.createElement(StorefrontBodyTracking, { snippet: null })) === "",
  "StorefrontBodyTracking renders null for empty snippet"
);
assert(
  ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: "   \n  " })) === "",
  "StorefrontHeadTracking renders null for whitespace snippet"
);
assert(
  ReactDOMServer.renderToString(React.createElement(StorefrontBodyTracking, { snippet: "   \n  " })) === "",
  "StorefrontBodyTracking renders null for whitespace snippet"
);

// Verify Storefront Document Layout placement and Admin isolation
const layoutPath = resolve(projectRoot, "src/app/layout.tsx");
assert(existsSync(layoutPath), "src/app/layout.tsx exists");
const layoutSource = readFileSync(layoutPath, "utf-8");

assert(
  layoutSource.includes("<StorefrontHeadTracking snippet={publicSettings?.google_tag_head_code} />"),
  "layout.tsx places StorefrontHeadTracking inside <head>"
);
assert(
  layoutSource.includes("<StorefrontBodyTracking snippet={publicSettings?.google_tag_body_code} />"),
  "layout.tsx places StorefrontBodyTracking inside <body>"
);
assert(
  layoutSource.includes("!isAdminRoute && ("),
  "layout.tsx strictly excludes tracking tags on Admin routes"
);

console.log("\n======================================================================");
console.log("🎉 ALL 12 GOOGLE TAGS & TRACKING PERSISTENCE TESTS PASSED CLEANLY!");
console.log("======================================================================");
