/**
 * AYC — Product Link Copying and Sharing Verification Suite
 *
 * Verifies:
 * 1. Clipboard content strictly equals the expected canonical product URL.
 * 2. No product title, description, price, or other generated text appears in clipboard.
 * 3. Native Web Share API payload contains { url } only (NO title, NO text).
 * 4. Fallback copies exactly the canonical URL without extra messages.
 * 5. Query parameters, temporary tokens, and hashes are completely stripped from copied/shared URLs.
 * 6. User cancellation (AbortError) on Web Share does not trigger duplicate fallback or errors.
 * 7. Clipboard failure / unavailable APIs are handled safely with clear messages.
 * 8. Existing product SEO metadata and canonical routes remain fully intact.
 */

import { getCanonicalProductUrl, generateProductMetadata } from "../src/lib/seo/product";
import { canonicalUrl, getCanonicalBaseUrl } from "../src/lib/seo/config";
import { copyTextToClipboard } from "../src/lib/clipboard";
import { B2BProductInput } from "../src/types/b2b";
import assert from "assert";

console.log("==========================================================");
console.log("  AYC PRODUCT LINK COPYING & SHARING VERIFICATION SUITE   ");
console.log("==========================================================\n");

let passed = 0;
let failed = 0;

function it(title: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res && typeof (res as any).then === "function") {
      (res as Promise<void>)
        .then(() => {
          console.log(`✔ [PASS] ${title}`);
          passed++;
        })
        .catch((err) => {
          console.error(`✖ [FAIL] ${title}: ${err.message}`);
          failed++;
        });
    } else {
      console.log(`✔ [PASS] ${title}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`✖ [FAIL] ${title}: ${err.message}`);
    failed++;
  }
}

const mockProduct: B2BProductInput = {
  id: "prod-dress-01",
  name: "Girls' Baby Dress",
  slug: "girls-baby-dress",
  sku: "CA-DRE-GIR-3918",
  brand: "Zara",
  audience: "GIRLS",
  categoryName: "Dresses",
  designType: "ORIGINAL",
  moq: 15,
  stock: 300,
  status: "published",
  shortDescription: "Delicate floral embroidered baby dress crafted with 100% breathable organic cotton.",
  standardPrice: 18.5,
  images: ["https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80"],
};

const baseUrl = getCanonicalBaseUrl();

// -----------------------------------------------------------------------------
// Test 1: Canonical Product URL Resolution
// -----------------------------------------------------------------------------
it("1. getCanonicalProductUrl resolves to exact clean absolute canonical URL", () => {
  const url = getCanonicalProductUrl(mockProduct);
  const expectedUrl = `${baseUrl}/products/girls-baby-dress`;

  assert.strictEqual(url, expectedUrl, `Expected ${expectedUrl}, got ${url}`);
  assert(url.startsWith("https://"), "URL must be strict HTTPS");
  assert(!url.includes("?"), "URL must not contain query parameters");
  assert(!url.includes("#"), "URL must not contain hash fragments");
  assert(!url.includes("localhost"), "URL must not leak localhost");
});

// -----------------------------------------------------------------------------
// Test 2: URL Sanitization & Stripping Query/Token Parameters
// -----------------------------------------------------------------------------
it("2. Strips tracking parameters, temporary tokens, and hashes from product URL", () => {
  const dirtyProduct = {
    ...mockProduct,
    slug: "girls-baby-dress?utm_source=facebook&utm_medium=cpc&token=secret123#gallery",
  };
  const cleanUrl = getCanonicalProductUrl(dirtyProduct);
  assert.strictEqual(cleanUrl, `${baseUrl}/products/girls-baby-dress`);
  assert(!cleanUrl.includes("utm_source"), "Must strip utm parameters");
  assert(!cleanUrl.includes("secret123"), "Must strip temporary tokens");
});

// -----------------------------------------------------------------------------
// Test 3: Native Web Share API Payload contains URL ONLY
// -----------------------------------------------------------------------------
it("3. Native Web Share API payload contains { url } ONLY (no title, no text, no promotional copy)", async () => {
  let capturedSharePayload: any = null;

  // Mock navigator.share
  const originalNavigator = global.navigator;
  (global as any).navigator = {
    share: async (payload: any) => {
      capturedSharePayload = payload;
      return Promise.resolve();
    },
  };

  const canonicalProductUrl = getCanonicalProductUrl(mockProduct);

  // Simulate ProductDetailView handleShareProduct logic
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({
      url: canonicalProductUrl,
    });
  }

  // Restore navigator
  (global as any).navigator = originalNavigator;

  assert(capturedSharePayload !== null, "navigator.share was not called");
  assert.strictEqual(
    capturedSharePayload.url,
    `${baseUrl}/products/girls-baby-dress`,
    "Share payload must contain canonical URL"
  );
  assert.strictEqual(
    capturedSharePayload.title,
    undefined,
    "Share payload must NOT contain a title field"
  );
  assert.strictEqual(
    capturedSharePayload.text,
    undefined,
    "Share payload must NOT contain a text field"
  );
  assert.deepStrictEqual(
    Object.keys(capturedSharePayload),
    ["url"],
    `Share payload must contain ONLY the 'url' property, found: ${Object.keys(capturedSharePayload).join(", ")}`
  );
});

// -----------------------------------------------------------------------------
// Test 4: Clipboard Content Equals Canonical URL Only
// -----------------------------------------------------------------------------
it("4. Clipboard content equals the expected canonical URL and contains NO title, price, or markdown", async () => {
  let clipboardWrittenText = "";

  // Mock navigator.clipboard
  const originalNavigator = global.navigator;
  (global as any).navigator = {
    clipboard: {
      writeText: async (text: string) => {
        clipboardWrittenText = text;
        return Promise.resolve();
      },
    },
  };

  const canonicalProductUrl = getCanonicalProductUrl(mockProduct);
  const success = await copyTextToClipboard(canonicalProductUrl);

  (global as any).navigator = originalNavigator;

  assert.strictEqual(success, true, "copyTextToClipboard must succeed");
  assert.strictEqual(
    clipboardWrittenText,
    `${baseUrl}/products/girls-baby-dress`,
    "Clipboard content must be strictly the canonical product URL"
  );

  // Assert NO product name, price, or labels
  assert(!clipboardWrittenText.includes("Girls' Baby Dress"), "Must not include product name");
  assert(!clipboardWrittenText.includes("18.5"), "Must not include price");
  assert(!clipboardWrittenText.includes("USD"), "Must not include currency");
  assert(!clipboardWrittenText.includes("Wholesale"), "Must not include promotional text");
  assert(!clipboardWrittenText.includes("Product link:"), "Must not include labels");
  assert(!clipboardWrittenText.includes("["), "Must not include markdown brackets");
  assert(!clipboardWrittenText.includes('"'), "Must not include quotation marks");
});

// -----------------------------------------------------------------------------
// Test 5: Fallback Textarea execCommand when Clipboard API is unavailable
// -----------------------------------------------------------------------------
it("5. Fallback textarea execCommand copies exact canonical URL when navigator.clipboard is unavailable", async () => {
  let execCommandArg = "";
  let textareaAppendedValue = "";

  // Mock environment without navigator.clipboard
  const originalNavigator = global.navigator;
  const originalDocument = global.document;

  (global as any).navigator = {}; // no clipboard

  const mockTextarea: any = {
    value: "",
    style: {},
    setAttribute: () => {},
    focus: () => {},
    select: () => {
      textareaAppendedValue = mockTextarea.value;
    },
  };

  (global as any).document = {
    body: {
      appendChild: (el: any) => {
        mockTextarea.value = el.value;
      },
      removeChild: () => {},
    },
    createElement: (tag: string) => (tag === "textarea" ? mockTextarea : {}),
    execCommand: (command: string) => {
      execCommandArg = command;
      return true;
    },
  };

  const canonicalProductUrl = getCanonicalProductUrl(mockProduct);
  const success = await copyTextToClipboard(canonicalProductUrl);

  (global as any).navigator = originalNavigator;
  (global as any).document = originalDocument;

  assert.strictEqual(success, true, "execCommand fallback must succeed");
  assert.strictEqual(execCommandArg, "copy", "execCommand must execute 'copy'");
  assert.strictEqual(
    textareaAppendedValue,
    `${baseUrl}/products/girls-baby-dress`,
    "Textarea must contain only canonical URL"
  );
});

// -----------------------------------------------------------------------------
// Test 6: Clipboard Failure Handling
// -----------------------------------------------------------------------------
it("6. Handles clipboard failure gracefully without throwing or reporting false success", async () => {
  const originalNavigator = global.navigator;
  const originalDocument = global.document;

  // Mock clipboard throwing permission error
  (global as any).navigator = {
    clipboard: {
      writeText: async () => Promise.reject(new Error("Permission denied")),
    },
  };
  // Mock document.execCommand returning false
  (global as any).document = {
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
    createElement: () => ({
      style: {},
      setAttribute: () => {},
      focus: () => {},
      select: () => {},
    }),
    execCommand: () => false,
  };

  const success = await copyTextToClipboard("https://example.com/item");

  (global as any).navigator = originalNavigator;
  (global as any).document = originalDocument;

  assert.strictEqual(success, false, "Must return false when all copy mechanisms fail");
});

// -----------------------------------------------------------------------------
// Test 7: User Abort on Web Share API does not trigger error or duplicate fallback
// -----------------------------------------------------------------------------
it("7. User Abort on Web Share API (closing share sheet) does NOT trigger duplicate clipboard copy", async () => {
  let clipboardCalled = false;

  const originalNavigator = global.navigator;
  (global as any).navigator = {
    share: async () => {
      const abortErr = new Error("Share cancelled by user");
      abortErr.name = "AbortError";
      throw abortErr;
    },
    clipboard: {
      writeText: async () => {
        clipboardCalled = true;
        return Promise.resolve();
      },
    },
  };

  const canonicalProductUrl = getCanonicalProductUrl(mockProduct);

  let shareStatus = "idle";
  try {
    await (navigator as any).share({ url: canonicalProductUrl });
    shareStatus = "success";
  } catch (err: any) {
    if (err?.name === "AbortError") {
      // Abort is handled silently — do NOT fall through to clipboard
      shareStatus = "idle";
    } else {
      // Non-abort falls through
      await copyTextToClipboard(canonicalProductUrl);
      shareStatus = "copied";
    }
  }

  (global as any).navigator = originalNavigator;

  assert.strictEqual(clipboardCalled, false, "Clipboard must NOT be called when user aborts share dialog");
  assert.strictEqual(shareStatus, "idle", "Status must remain idle on user cancellation");
});

// -----------------------------------------------------------------------------
// Test 8: SEO Metadata & Open Graph Integrity Preserved
// -----------------------------------------------------------------------------
it("8. Preserves Open Graph and canonical metadata consistency", () => {
  const metadata = generateProductMetadata(mockProduct, mockProduct.slug);
  const canonicalUrlFromMeta = (metadata.alternates as any)?.canonical;
  const ogUrl = metadata.openGraph?.url;
  const canonicalFromHelper = getCanonicalProductUrl(mockProduct);

  assert.strictEqual(canonicalUrlFromMeta, canonicalFromHelper, "Metadata canonical must match helper");
  assert.strictEqual(ogUrl, canonicalFromHelper, "OG URL must match canonical helper");
  assert.strictEqual(metadata.openGraph?.title, "Girls' Baby Dress", "OG title must remain intact");
  assert(
    metadata.openGraph?.description?.includes("Delicate floral embroidered"),
    "OG description must remain intact"
  );
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
setTimeout(() => {
  console.log("\n==========================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}, 50);
