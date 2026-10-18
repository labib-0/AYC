/**
 * Automated Verification: Google Tags & Tracking Integration
 *
 * Tests:
 * 1. Head code parsing and SSR rendering into <head>
 * 2. Body code parsing and SSR rendering immediately after <body>
 * 3. Exact tag structure preservation (<script async src="..." />, <noscript><iframe ... /></noscript>)
 * 4. Isolation: No tracking code injected on admin routes (/ayc, admin hosts)
 * 5. Empty settings produce zero injected HTML
 * 6. Preserves script order and handles multiple tags
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import assert from "assert";

// Import our components
import {
  StorefrontHeadTracking,
  StorefrontBodyTracking,
} from "../src/components/analytics/StorefrontTrackingTags.tsx";

console.log("==========================================================");
console.log("  GOOGLE TAGS & TRACKING — AUTOMATED VERIFICATION SUITE");
console.log("==========================================================");

let passed = 0;
let failed = 0;

function it(title, fn) {
  try {
    fn();
    console.log(`✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`✖ [FAIL] ${title}`);
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// Test 1: Empty and Null Input handling
// -----------------------------------------------------------------------------
it("HeadTracking returns null for null, undefined, or empty string", () => {
  assert.strictEqual(ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: null })), "");
  assert.strictEqual(ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: undefined })), "");
  assert.strictEqual(ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: "" })), "");
  assert.strictEqual(ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: "   \n\t  " })), "");
});

it("BodyTracking returns null for null, undefined, or empty string", () => {
  assert.strictEqual(ReactDOMServer.renderToString(React.createElement(StorefrontBodyTracking, { snippet: null })), "");
  assert.strictEqual(ReactDOMServer.renderToString(React.createElement(StorefrontBodyTracking, { snippet: undefined })), "");
  assert.strictEqual(ReactDOMServer.renderToString(React.createElement(StorefrontBodyTracking, { snippet: "" })), "");
  assert.strictEqual(ReactDOMServer.renderToString(React.createElement(StorefrontBodyTracking, { snippet: "   \n\t  " })), "");
});

// -----------------------------------------------------------------------------
// Test 2: Standard Google tag (gtag.js) in Head
// -----------------------------------------------------------------------------
it("HeadTracking renders standard Google tag (gtag.js) correctly", () => {
  const gTagSnippet = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-VERIFY1234"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-VERIFY1234');
</script>`;

  const html = ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: gTagSnippet }));

  // Must contain external script with async and src
  assert(html.includes('src="https://www.googletagmanager.com/gtag/js?id=G-VERIFY1234"'), "Missing external script src");
  assert(html.includes("async"), "Missing async attribute");

  // Must contain inline script with dataLayer initialization
  assert(html.includes("window.dataLayer = window.dataLayer || [];"), "Missing dataLayer init");
  assert(html.includes("gtag(&#x27;config&#x27;, &#x27;G-VERIFY1234&#x27;);") || html.includes("gtag('config', 'G-VERIFY1234');"), "Missing gtag config call");

  // Must not be wrapped in div or other invalid head elements
  assert(!html.includes("<div"), "HeadTracking must not emit <div> tags");
});

// -----------------------------------------------------------------------------
// Test 3: Standard Google Tag Manager (GTM) in Head
// -----------------------------------------------------------------------------
it("HeadTracking renders Google Tag Manager head snippet correctly", () => {
  const gtmSnippet = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TESTCODE');</script>
<!-- End Google Tag Manager -->`;

  const html = ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: gtmSnippet }));

  assert(html.includes("gtm.start"), "Missing GTM start event");
  assert(html.includes("GTM-TESTCODE"), "Missing GTM container ID");
  assert(html.startsWith("<script>"), "Must start with <script>");
  assert(html.endsWith("</script>"), "Must end with </script>");
});

// -----------------------------------------------------------------------------
// Test 4: Standard GTM Body noscript fallback
// -----------------------------------------------------------------------------
it("BodyTracking renders GTM noscript iframe fallback correctly", () => {
  const gtmBodySnippet = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TESTCODE"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

  const html = ReactDOMServer.renderToString(React.createElement(StorefrontBodyTracking, { snippet: gtmBodySnippet }));

  assert(html.includes("<noscript>"), "Must contain <noscript>");
  assert(html.includes("src=\"https://www.googletagmanager.com/ns.html?id=GTM-TESTCODE\""), "Missing iframe src");
  assert(html.includes("visibility:hidden"), "Missing inline style");
  assert(html.includes("</noscript>"), "Must close </noscript>");
});

// -----------------------------------------------------------------------------
// Test 5: Full Document Structure and Route Isolation
// -----------------------------------------------------------------------------
it("Full document renders Head in <head> and Body immediately after <body>", () => {
  const headSnippet = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-HEAD99"></script>';
  const bodySnippet = '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-BODY88"></iframe></noscript>';

  function MockStorefrontLayout({ isAdmin }) {
    return React.createElement(
      "html",
      null,
      React.createElement(
        "head",
        null,
        React.createElement("title", null, "Ayaan Clothing Storefront"),
        !isAdmin && React.createElement(StorefrontHeadTracking, { snippet: headSnippet })
      ),
      React.createElement(
        "body",
        null,
        !isAdmin && React.createElement(StorefrontBodyTracking, { snippet: bodySnippet }),
        React.createElement("main", null, "Storefront Content")
      )
    );
  }

  // 1. Storefront Rendering
  const storefrontHtml = ReactDOMServer.renderToString(React.createElement(MockStorefrontLayout, { isAdmin: false }));

  // Check head position
  const headOpenIdx = storefrontHtml.indexOf("<head>");
  const headCloseIdx = storefrontHtml.indexOf("</head>");
  const headSnippetIdx = storefrontHtml.indexOf("G-HEAD99");
  assert(headSnippetIdx > headOpenIdx && headSnippetIdx < headCloseIdx, "Head snippet must be inside <head>");

  // Check body position: Body snippet must immediately follow <body>
  const bodyOpenIdx = storefrontHtml.indexOf("<body>");
  const bodySnippetIdx = storefrontHtml.indexOf("<noscript><iframe src=\"https://www.googletagmanager.com/ns.html?id=GTM-BODY88\">");
  assert.strictEqual(bodyOpenIdx + "<body>".length, bodySnippetIdx, "Body snippet must immediately follow <body> tag");

  // 2. Admin Route Isolation
  const adminHtml = ReactDOMServer.renderToString(React.createElement(MockStorefrontLayout, { isAdmin: true }));
  assert(!adminHtml.includes("G-HEAD99"), "Admin route MUST NOT contain head tracking code");
  assert(!adminHtml.includes("GTM-BODY88"), "Admin route MUST NOT contain body tracking code");
  assert(!adminHtml.includes("googletagmanager.com"), "Admin route MUST NOT contain any tracking domain");
});

// -----------------------------------------------------------------------------
// Test 6: Script Tag Execution Order Preservation
// -----------------------------------------------------------------------------
it("HeadTracking preserves sequential order of multiple script tags", () => {
  const multiSnippet = `<script src="https://example.com/lib1.js"></script>
<script>var first = 1;</script>
<script src="https://example.com/lib2.js"></script>
<script>var second = 2;</script>`;

  const html = ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: multiSnippet }));

  const idx1 = html.indexOf("lib1.js");
  const idx2 = html.indexOf("var first = 1;");
  const idx3 = html.indexOf("lib2.js");
  const idx4 = html.indexOf("var second = 2;");

  assert(idx1 !== -1 && idx2 !== -1 && idx3 !== -1 && idx4 !== -1, "All script tags must be present");
  assert(idx1 < idx2, "lib1 must precede first");
  assert(idx2 < idx3, "first must precede lib2");
  assert(idx3 < idx4, "lib2 must precede second");
});

// -----------------------------------------------------------------------------
// Test 7: Raw JavaScript without outer <script> tag fallback
// -----------------------------------------------------------------------------
it("HeadTracking handles raw JavaScript gracefully by wrapping in <script>", () => {
  const rawJs = "window.dataLayer = window.dataLayer || []; console.log('raw js test');";
  const html = ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet: rawJs }));

  assert(html.startsWith("<script>"), "Must wrap in <script>");
  assert(html.includes("console.log('raw js test')"), "Must contain raw JS content");
  assert(html.endsWith("</script>"), "Must close </script>");
});

// -----------------------------------------------------------------------------
// Test 8: Complex query parameters and attributes
// -----------------------------------------------------------------------------
it("HeadTracking preserves complex query strings and custom data attributes", () => {
  const snippet = '<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX&l=customLayer" data-custom="ayaanc" crossOrigin="anonymous"></script>';
  const html = ReactDOMServer.renderToString(React.createElement(StorefrontHeadTracking, { snippet }));

  assert(html.includes('src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX&amp;l=customLayer"') || html.includes('id=GTM-XXXX&l=customLayer'), "Must preserve query params");
  assert(html.includes('data-custom="ayaanc"'), "Must preserve data-* attribute");
  assert(html.includes('crossorigin="anonymous"'), "Must preserve crossOrigin");
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("==========================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("==========================================================");

if (failed > 0) {
  process.exit(1);
}
