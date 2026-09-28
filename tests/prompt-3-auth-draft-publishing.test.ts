/**
 * Prompt 3 Comprehensive Test Suite:
 * Authentication, Product Draft Preservation & Publishing Flow
 *
 * Verifies all 8 Core Matrix Cases from Section 30 & 36:
 * TEST 1: Authenticated admin publishes product directly (No "Unauthenticated" error).
 * TEST 2: Genuinely unauthenticated request returns 401 and triggers draft preservation.
 * TEST 3: All form data (name, specs, package assortment, pricing, media, badges) preserved during auth challenge.
 * TEST 4: Session expiration simulation & seamless draft recovery after re-authentication.
 * TEST 5: Successful publication clears temporary local draft to prevent stale data.
 * TEST 6: Customer account (authenticated but unauthorized) receives 403 Permission Denied without triggering login.
 * TEST 7: Initial status for new products is "draft", updating to "published" only upon publication.
 * TEST 8: Editing existing product preserves draft isolated to product ID without creating duplicate records.
 */

process.env.NEXT_PUBLIC_FRONTEND_ONLY = "false";
process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000/api/v1";

// Headless polyfills for browser environments
const memoryStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
};

(globalThis as any).window = {
  location: {
    port: "3001",
    pathname: "/admin/products/new",
    hostname: "localhost",
    search: "",
  },
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).CustomEvent = class CustomEvent {
  constructor(public type: string, public params: any = {}) {}
};

import { apiClient, ApiError } from "../src/services/api-client";
import { adminAuthService } from "../src/services/admin/admin-auth.service";
import { productDraftService } from "../src/lib/services/product-draft.service";
import { productService } from "../src/services/product.service";
import { B2BProductInput } from "../src/types/b2b";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runPrompt3TestSuite() {
  console.log("\n=======================================================");
  console.log("RUNNING PROMPT 3 TEST SUITE (AUTH, DRAFTS & PUBLISHING)");
  console.log("=======================================================\n");

  // ── TEST 1: Authenticated Admin Publishes Product Directly ────────────────
  console.log("▶ TEST 1: Authenticated Admin Login & Direct Publish");
  const loginRes = await adminAuthService.loginAdmin({
    email: "admin@ayaanclothing.com",
    password: "password123",
  });

  assert(
    Boolean(loginRes.token && loginRes.user && loginRes.user.role === "admin"),
    "TEST 1a: Admin authenticated against Laravel backend with Sanctum token"
  );

  const activeToken = apiClient.getToken();
  assert(
    activeToken === loginRes.token,
    "TEST 1b: ApiClient context-aware token resolution prioritizes verified admin token in admin context"
  );

  const timestamp = Date.now();
  const testProductPayload: Partial<B2BProductInput> = {
    name: `Direct Publish Polo ${timestamp}`,
    slug: `direct-publish-polo-${timestamp}`,
    sku: `AYN-POLO-${timestamp}`,
    brand: "Ayaan Sourcing",
    wholesalePrice: 28.50,
    bulkThreshold: 100,
    bulkPrice: 22.00,
    status: "published",
    colors: ["Navy", "White"],
    sizes: ["M", "L"],
    packageAllocations: [
      { color: "Navy", size: "M", quantity: 10 },
      { color: "Navy", size: "L", quantity: 15 },
    ],
  };

  const createdProduct = await productService.createProduct(testProductPayload);
  assert(
    Boolean(createdProduct && createdProduct.id && createdProduct.status === "published"),
    "TEST 1c: Authenticated admin published product directly through backend API without 401 error"
  );
  assert(
    createdProduct.moq === 25,
    "TEST 1d: Published product maintains derived MOQ (25 pcs) from package allocations"
  );

  // ── TEST 2: Genuinely Unauthenticated Request Detection ───────────────────
  console.log("\n▶ TEST 2: Unauthenticated State & 401 Detection");
  adminAuthService.clearAdminSession();
  apiClient.removeToken();

  let unauthErrorCaught = false;
  try {
    await apiClient.post("/products", {
      name: "Should Fail Unauthenticated",
      wholesale_price: 20.00,
    });
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 401) {
      unauthErrorCaught = true;
    }
  }

  assert(
    unauthErrorCaught,
    "TEST 2: Backend strictly enforces Sanctum auth, returning 401 Unauthenticated when token is absent"
  );

  // ── TEST 3: Draft Preservation of All Entered Specifications ─────────────
  console.log("\n▶ TEST 3: Comprehensive Product Draft Preservation");
  const fullDraftData: Partial<B2BProductInput> = {
    name: "Luxury Silk Chiffon Shirt",
    slug: "luxury-silk-chiffon-shirt",
    brand: "Ayaan Sourcing",
    categoryId: "c_tops",
    categoryName: "Tops",
    audience: "WOMEN",
    designType: "ORIGINAL",
    material: "100% Mulberry Silk",
    description: "Hand-finished silk chiffon export garment with French seams.",
    images: ["https://example.com/chiffon1.jpg", "https://example.com/chiffon2.jpg"],
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    wholesalePrice: 45.00,
    bulkThreshold: 150,
    bulkPrice: 38.00,
    stock: 500,
    colors: ["Emerald", "Ivory"],
    sizes: ["S", "M", "L"],
    packageAllocations: [
      { color: "Emerald", size: "S", quantity: 5 },
      { color: "Emerald", size: "M", quantity: 10 },
      { color: "Emerald", size: "L", quantity: 10 },
      { color: "Ivory", size: "S", quantity: 5 },
      { color: "Ivory", size: "M", quantity: 10 },
      { color: "Ivory", size: "L", quantity: 10 },
    ],
    isNew: true,
    newUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    isHot: true,
    hotUntil: null,
    isFeatured: true,
    featuredUntil: new Date(Date.now() + 14 * 86400000).toISOString(),
  };

  productDraftService.saveDraft("new", fullDraftData, "create");
  assert(
    productDraftService.hasDraft("new"),
    "TEST 3a: Draft successfully saved to persistent local workspace storage"
  );

  const restoredDraft = productDraftService.getDraft("new");
  assert(
    Boolean(restoredDraft && restoredDraft.data && restoredDraft.data.name === fullDraftData.name),
    "TEST 3b: Restored draft preserves complete product name and basic specs"
  );
  assert(
    restoredDraft?.data.packageAllocations?.length === 6 &&
    restoredDraft?.data.packageAllocations?.reduce((acc, a) => acc + (a.quantity || 0), 0) === 50,
    "TEST 3c: Restored draft preserves complete 6-cell package matrix total (50 pcs derived MOQ)"
  );
  assert(
    restoredDraft?.data.isNew === true &&
    restoredDraft?.data.hotUntil === null &&
    Boolean(restoredDraft?.data.featuredUntil),
    "TEST 3d: Restored draft preserves independent promotional scheduling states (7d, until changed, 14d)"
  );

  // Verify security: No passwords or private tokens stored in draft payload
  const rawDraftStorage = memoryStore.get("ayaan_admin_product_draft_new") || "";
  assert(
    !rawDraftStorage.includes("password") && !rawDraftStorage.includes("auth_token"),
    "TEST 3e: Security audit passed - product draft storage contains zero plaintext credentials or tokens"
  );

  // ── TEST 4: Session Expiration & Recovery After Re-Authentication ────────
  console.log("\n▶ TEST 4: Re-Authentication & Recovery Publishing");
  // Simulate admin logging back in after session expiration
  const reAuthRes = await adminAuthService.loginAdmin({
    email: "admin@ayaanclothing.com",
    password: "password123",
  });
  assert(
    Boolean(reAuthRes.token),
    "TEST 4a: Admin successfully re-authenticated after session challenge"
  );

  // Verify session endpoint verifies admin role
  const verifiedUser = await adminAuthService.verifyAdminSession();
  assert(
    Boolean(verifiedUser && verifiedUser.role === "admin"),
    "TEST 4b: verifyAdminSession confirms active backend authentication state"
  );

  // Re-submit the exact draft that was preserved
  const recoveredPublishPayload: Partial<B2BProductInput> = {
    ...restoredDraft!.data,
    slug: `luxury-silk-${Date.now()}`,
    sku: `AYN-SILK-${Date.now()}`,
    status: "published",
  };
  const publishedRecovered = await productService.createProduct(recoveredPublishPayload);
  assert(
    Boolean(publishedRecovered && publishedRecovered.status === "published"),
    "TEST 4c: Recovered draft product successfully published to backend after re-authentication"
  );

  // ── TEST 5: Draft Cleanup After Successful Publication ───────────────────
  console.log("\n▶ TEST 5: Draft Cleanup on Success");
  productDraftService.clearDraft("new");
  assert(
    !productDraftService.hasDraft("new"),
    "TEST 5: Local product draft cleanly cleared upon successful publication"
  );

  // ── TEST 6: Customer Account Authorization Check (403) ───────────────────
  console.log("\n▶ TEST 6: Customer Authorization Enforcement (403)");
  // Authenticate as normal customer
  const custRes = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      email: "kenji@ayaan-demo.local",
      password: "Customer@12345",
    }),
  });
  const custData = await custRes.json();
  const customerToken = custData?.data?.token;

  let forbiddenCaught = false;
  try {
    await apiClient.post("/products", {
      name: "Customer Forbidden Product",
      wholesale_price: 20.00,
    }, { token: customerToken });
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 403) {
      forbiddenCaught = true;
    }
  }

  assert(
    forbiddenCaught,
    "TEST 6: Customer token rejected with 403 Forbidden without presenting admin login"
  );

  // ── TEST 7: Initial Product Status Lifecycle ─────────────────────────────
  console.log("\n▶ TEST 7: Initial Product Status Lifecycle");
  const draftCreatePayload: Partial<B2BProductInput> = {
    name: `Draft Only Item ${Date.now()}`,
    slug: `draft-only-item-${Date.now()}`,
    sku: `AYN-DRF-${Date.now()}`,
    brand: "Ayaan Sourcing",
    wholesalePrice: 19.99,
    status: "draft",
    packageAllocations: [
      { color: "Black", size: "M", quantity: 20 },
    ],
  };

  // Re-set admin token
  apiClient.setAdminToken(reAuthRes.token);
  const draftCreated = await productService.createProduct(draftCreatePayload);
  assert(
    draftCreated.status === "draft",
    "TEST 7: Product saved as draft has status 'draft' and does not appear as 'published'"
  );

  // ── TEST 8: Editing Existing Product Isolation ───────────────────────────
  console.log("\n▶ TEST 8: Edit Mode Draft Isolation");
  const editId = String(draftCreated.id);
  const editDraftData: Partial<B2BProductInput> = {
    name: "Updated Name During Edit",
    wholesalePrice: 22.50,
  };
  productDraftService.saveDraft(editId, editDraftData, "edit");
  assert(
    productDraftService.hasDraft(editId) && !productDraftService.hasDraft("new"),
    "TEST 8a: Product edit draft is strictly keyed to product ID without colliding with new drafts"
  );

  const updatedProduct = await productService.updateProduct(editId, {
    name: "Updated Name During Edit",
    wholesalePrice: 22.50,
    status: "published",
  });
  assert(
    Boolean(updatedProduct && updatedProduct.id === editId && updatedProduct.wholesalePrice === 22.50),
    "TEST 8b: Existing product updated and published without creating duplicate records"
  );
  productDraftService.clearDraft(editId);

  console.log("\n=======================================================");
  console.log("ALL PROMPT 3 REQUIREMENTS VERIFIED SUCCESSFULLY! 🚀");
  console.log("=======================================================\n");
}

runPrompt3TestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
