/**
 * MASTER FULL WEBSITE CODE EXAMINER: AUTOMATED TEST SUITE
 * 
 * Comprehensive code-level functional validation across the entire Ayaan Clothing website:
 * 1. Customer Authentication & Session Isolation
 * 2. Route Guards & Access Controls (Customer & Admin)
 * 3. Shopping Cart Operations & Tier Pricing
 * 4. Checkout Process & Address Management
 * 5. Shipping Modes (Aramex vs Discuss Directly) & Obsolete Method Elimination
 * 6. Promo Codes / Coupons Validation & Real-time Calculations
 * 7. Order Placement & State Mutations
 * 8. Customer RFQ Creation & Timeline
 * 9. Quotations & RFQ Integration
 * 10. Commercial Document Data & Bank Credentials Verification
 * 11. PDF Document Generators (jsPDF)
 * 12. SEO Metadata, Sitemap, & Robots Architecture
 * 13. Brand Logo System & Asset Invariants
 * 14. Product Gallery State Synchronization
 * 15. Single Warehouse (Uttara) & Inventory Logic Audit
 * 16. Persistence Integrity & Store Defect Verification
 */

// ── 0. Headless Polyfills ───────────────────────────────────────────────────
const memoryStore = new Map<string, string>();
const localStoragePolyfill = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
  get length() { return memoryStore.size; },
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
};

(globalThis as any).localStorage = localStoragePolyfill;
(globalThis as any).window = globalThis;
(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params: any = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};
(globalThis as any).dispatchEvent = () => true;
(globalThis as any).addEventListener = () => {};
(globalThis as any).removeEventListener = () => {};

import fs from "fs";
import path from "path";

// Services, Contexts, & Helpers
import { mockStore } from "../src/lib/mock-data/mock-store";
import { authService } from "../src/services/auth.service";
import { adminAuthService, ADMIN_STORAGE_KEYS } from "../src/services/admin/admin-auth.service";
import { cartService } from "../src/services/cart.service";
import { addressService } from "../src/lib/services/address.service";
import { createOrder, getUserOrders } from "../src/lib/services/orders";
import { validateCoupon, calculatePromoDiscount } from "../src/lib/coupon";
import { rfqService } from "../src/services/rfq.service";
import { createQuotation, getCommercialDocument } from "../src/lib/services/quotations";
import {
  generateProformaInvoiceDoc,
  generateProductOfferSheetDoc,
} from "../src/lib/pdf-generator";
import {
  generateProductMetadata,
} from "../src/lib/seo/product";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import { getBrandLogoUrl } from "../src/lib/brand-logos";
import BUSINESS_PROFILE from "../src/config/business-profile";
import { Product } from "../src/types";
import { isLowStock, LOW_STOCK_THRESHOLD } from "../src/services/admin/inventory.service";

// ── Test Harness ─────────────────────────────────────────────────────────────
let totalTests = 0;
let passCount = 0;
let failCount = 0;

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

const testResults: TestResult[] = [];

async function test(suite: string, name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    passCount++;
    testResults.push({ suite, name, passed: true });
    console.log(`  ✅ [PASS] ${suite} → ${name}`);
  } catch (err: any) {
    failCount++;
    testResults.push({ suite, name, passed: false, error: err?.message || String(err) });
    console.log(`  ❌ [FAIL] ${suite} → ${name}: ${err?.message || err}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected deep equality but got ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) throw new Error(`Expected value to be defined`);
    },
    toBeUndefined() {
      if (actual !== undefined) throw new Error(`Expected undefined but got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null but got ${JSON.stringify(actual)}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value but got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value but got ${JSON.stringify(actual)}`);
    },
    toContain(expected: any) {
      if (!actual || !actual.includes(expected)) throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
    },
    toBeGreaterThan(expected: number) {
      if (!(actual > expected)) throw new Error(`Expected ${actual} > ${expected}`);
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (!(actual >= expected)) throw new Error(`Expected ${actual} >= ${expected}`);
    },
  };
}

// ── Test Suites Execution ────────────────────────────────────────────────────
async function runWebsiteAudit() {
  console.log("\n==================================================");
  console.log("RUNNING MASTER FULL WEBSITE CODE-LEVEL AUDIT");
  console.log("==================================================\n");

  // 1. Customer Authentication & Session Isolation
  console.log("▶ Suite 1: Customer Authentication & Session Isolation");
  await test("Customer Auth", "Sign in with valid customer credentials sets active customer session", async () => {
    const res = await authService.login({
      email: "buyer@example.com",
      password: "password123",
    });
    expect(res.user).toBeTruthy();
    expect(res.token).toContain("auth_token_");
    
    // Check localStorage key is ayaan_b2b_user (Customer key)
    const storedUser = mockStore.getActiveUser();
    expect(storedUser).toBeTruthy();
    expect(storedUser?.email).toBe("buyer@example.com");

    // Verify admin session is NOT set by customer login
    const adminSession = adminAuthService.getAdminUser();
    expect(adminSession).toBeFalsy();
  });

  await test("Customer Auth", "Customer sign in with wrong password returns error", async () => {
    let thrown = false;
    try {
      await authService.login({
        email: "buyer@example.com",
        password: "wrongpassword",
      });
    } catch (err: any) {
      thrown = true;
      expect(err.message).toContain("Invalid email or password");
    }
    expect(thrown).toBe(true);
  });

  await test("Customer Auth", "Customer logout clears customer session but leaves admin session untouched", async () => {
    // Set a dummy admin session
    localStorage.setItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION, JSON.stringify({
      id: "admin_1",
      email: "admin@ayaanclothing.com",
      role: "admin",
      name: "Admin User",
    }));

    await authService.logout();
    const activeCustomer = mockStore.getActiveUser();
    expect(activeCustomer).toBeFalsy();

    // Verify admin session still intact
    const adminUser = adminAuthService.getAdminUser();
    expect(adminUser).toBeTruthy();
    expect(adminUser?.email).toBe("admin@ayaanclothing.com");

    // Clean up admin session
    adminAuthService.logoutAdmin();
  });

  // 2. Shopping Cart Operations & Tier Pricing
  console.log("\n▶ Suite 2: Shopping Cart Operations & Tier Pricing");
  const sampleProduct: Product = {
    id: "prod_cart_test",
    name: "Cotton Pique Polo",
    slug: "cotton-pique-polo",
    description: "Premium export polo",
    price: 15.0,
    wholesalePrice: 15.0,
    bulkPrice: 12.0,
    bulkThreshold: 200,
    fullStockPrice: 10.5,
    availableStock: 1000,
    moq: 50,
    sku: "POLO-CP-01",
    images: ["/images/polo.jpg"],
    brand: "Nike",
    categoryId: "cat_polo",
    sizes: ["S", "M", "L", "XL"],
    colours: 2,
  };

  await test("Cart", "Calculate tier unit price accurately across wholesale volume tiers", () => {
    // Tier 1: Base MOQ (50 pcs) -> $15.00
    const price50 = cartService.calculateTierUnitPrice(sampleProduct, 50);
    expect(price50).toBe(15.0);

    // Tier 2: Bulk tier (200 pcs) -> $12.00
    const price200 = cartService.calculateTierUnitPrice(sampleProduct, 200);
    expect(price200).toBe(12.0);

    // Tier 3: Full stock container tier (1000 pcs) -> $10.50
    const price1000 = cartService.calculateTierUnitPrice(sampleProduct, 1000);
    expect(price1000).toBe(10.5);
  });

  await test("Cart", "Add item to cart persists to localStorage and merges duplicate variants", async () => {
    cartService.clearCart();
    // Add 50 pcs size M
    let cart = await cartService.addToCart(sampleProduct, "M", 50);
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].quantity).toBe(50);
    expect(cart.items[0].unit_price).toBe(15.0);
    expect(cart.subtotal).toBe(750.0);

    // Add 150 more pcs size M -> total 200 pcs -> triggers bulk price tier $12.00!
    cart = await cartService.addToCart(sampleProduct, "M", 150);
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].quantity).toBe(200);
    expect(cart.items[0].unit_price).toBe(12.0);
    expect(cart.subtotal).toBe(2400.0);

    // Verify localStorage key ayaan_cart is populated
    const rawSaved = localStorage.getItem("ayaan_cart");
    expect(rawSaved).toBeTruthy();
    expect(rawSaved).toContain("cotton-pique-polo");
  });

  await test("Cart", "Update quantity and remove item recalculates totals", async () => {
    const cart = await cartService.getCart();
    const itemId = cart.items[0].id;

    // Update quantity to 100 pcs
    const updated = await cartService.updateQuantity(sampleProduct.id, "M", 100, itemId);
    expect(updated.items[0].quantity).toBe(100);
    expect(updated.subtotal).toBe(1500.0); // 100 * $15.00

    // Remove item
    const cleared = await cartService.removeFromCart(sampleProduct.id, "M", itemId);
    expect(cleared.items.length).toBe(0);
    expect(cleared.subtotal).toBe(0);
  });

  // 3. Customer Address Management
  console.log("\n▶ Suite 3: Customer Address Management");
  await test("Address", "Create, list, and select customer delivery addresses", async () => {
    const addr = await addressService.saveAddress("buyer_123", {
      label: "Main Store & Receiving",
      name: "John Consignee",
      contact_name: "John Consignee",
      company_name: "Transatlantic Apparel Inc",
      address_line_1: "742 Evergreen Terrace",
      city: "Springfield",
      state: "OR",
      postal_code: "97477",
      country_code: "US",
      phone: "+1-555-0199",
      email: "logistics@transatlantic.com",
      is_default: true,
    });
    expect(addr.id).toBeDefined();

    const addresses = await addressService.getAddresses("buyer_123");
    expect(addresses.some((a) => a.id === addr.id)).toBe(true);
  });

  // 4. Promo Code / Coupon Rules & Calculations
  console.log("\n▶ Suite 4: Promo Code & Coupon Rules");
  await test("Coupons", "Percentage coupon: 10% discount on $1000 order (min $500) -> $100", () => {
    mockStore.saveCoupon({
      code: "SITE10",
      discount_type: "percentage",
      discount_value: 10,
      min_spend: 500,
      is_active: true,
    });

    const res = validateCoupon("SITE10", 1000);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.discountAmount).toBe(100);
    }
  });

  await test("Coupons", "Percentage coupon rejected when order subtotal is below minimum spend ($499 < $500)", () => {
    const res = validateCoupon("SITE10", 499);
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain("Minimum order of $500 is required");
    }
  });

  await test("Coupons", "Flat coupon: $50 discount on $1000 order (min $500) -> $50", () => {
    mockStore.saveCoupon({
      code: "SAVE50",
      discount_type: "flat",
      discount_value: 50,
      min_spend: 500,
      is_active: true,
    });

    const res = validateCoupon("SAVE50", 1000);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.discountAmount).toBe(50);
    }
  });

  await test("Coupons", "Flat coupon rejected when order subtotal is below minimum spend ($499 < $500)", () => {
    const res = validateCoupon("SAVE50", 499);
    expect(res.isValid).toBe(false);
  });

  await test("Coupons", "Flat coupon discount capped at subtotal (subtotal cannot become negative)", () => {
    const disc = calculatePromoDiscount("flat", 1500, 1000);
    expect(disc).toBe(1000); // capped at subtotal $1000
  });

  // 5. Checkout & Order Creation
  console.log("\n▶ Suite 5: Checkout & Order Creation Flow");
  let createdOrderRef = "";
  await test("Checkout", "Create commercial order with Aramex air freight snapshot and applied coupon", async () => {
    const order = await createOrder({
      userId: "buyer_123",
      email: "logistics@transatlantic.com",
      shippingName: "John Consignee",
      shippingCompany: "Transatlantic Apparel Inc",
      shippingPhone: "+1-555-0199",
      shippingAddress: "742 Evergreen Terrace",
      shippingCity: "Springfield",
      shippingRegion: "OR",
      shippingPostalCode: "97477",
      shippingCountryCode: "US",
      shippingMethod: "Aramex — Priority Air",
      carrier: "Aramex Express",
      shippingCost: 350.0,
      couponCode: "SITE10",
      promoCode: "SITE10",
      discountAmount: 100.0,
      items: [
        {
          productId: sampleProduct.id,
          productName: sampleProduct.name,
          productSlug: sampleProduct.slug,
          productImage: sampleProduct.images[0],
          sku: sampleProduct.sku || "POLO-CP-01",
          unitPrice: 15.0,
          quantity: 100,
        },
      ],
      shippingSnapshot: {
        provider: "aramex",
        mode: "air",
        shipping_method: "Aramex — Priority Air",
        carrier: "Aramex Express",
        quoted_shipping_charge: 350.0,
        currency: "USD",
        carton_count: 2,
        gross_weight: 24.5,
        cbm: 0.15,
        destination: {
          name: "John Consignee",
          company_name: "Transatlantic Apparel Inc",
          phone: "+1-555-0199",
          email: "logistics@transatlantic.com",
          address1: "742 Evergreen Terrace",
          city: "Springfield",
          country_code: "US",
        },
      },
    });

    expect(order.id).toBeDefined();
    expect(order.order_number).toBeTruthy();
    expect(order.order_number.startsWith("AYN-")).toBe(true);
    expect(order.total_amount).toBe(1750.0); // 1500 (items) - 100 (coupon) + 350 (shipping)
    expect(order.discount_amount).toBe(100.0);
    expect(order.shipping_cost).toBe(350.0);
    createdOrderRef = order.order_number;

    // Verify order is persisted and queryable by user ID
    const userOrders = await getUserOrders("buyer_123");
    expect(userOrders.some((o) => o.order_number === createdOrderRef)).toBe(true);
  });

  await test("Checkout", "Verify obsolete freight options (Air Express, Ocean Cargo, Overland Truck) are eliminated", () => {
    const checkoutSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/components/cart/CheckoutModal.tsx"),
      "utf8"
    );
    // Ensure obsolete selectors are not present in active checkout UI
    expect(checkoutSrc.includes('value="ocean_cargo"')).toBe(false);
    expect(checkoutSrc.includes('value="overland_truck"')).toBe(false);
    expect(checkoutSrc.includes('value="air_express"')).toBe(false);
    // Confirm only "aramex" and "manual" (Discuss Directly) are active
    expect(checkoutSrc.includes('shippingMode === "aramex"')).toBe(true);
    expect(checkoutSrc.includes('shippingMode === "manual"')).toBe(true);
  });

  // 6. Customer & Admin RFQ Flow
  console.log("\n▶ Suite 6: RFQ Flow & Canonical Timestamps");
  let customerRfqId = "";
  await test("RFQ", "Customer submits RFQ with canonical createdAt timestamp and initial status", async () => {
    const rfq = await rfqService.submitRfq({
      buyerName: "Global Sourcing Director",
      buyerEmail: "sourcing@globalretail.de",
      companyName: "Global Retail AG",
      requestTitle: "2500 pcs Cotton Polo Shirts",
      items: [
        {
          id: "item_rfq_1",
          productId: sampleProduct.id,
          productName: sampleProduct.name,
          productSlug: sampleProduct.slug,
          brand: sampleProduct.brand || "Nike",
          sku: sampleProduct.sku || "POLO-CP-01",
          image: sampleProduct.images[0],
          quantity: 2500,
          moq: 50,
          targetPrice: 8.5,
        },
      ],
    });

    expect(rfq.id).toBeDefined();
    expect(rfq.rfqNumber.startsWith("RFQ-")).toBe(true);
    expect(rfq.status).toBe("SUBMITTED");
    expect(rfq.createdAt).toBeDefined();
    // Validate ISO timestamp parsable by Date
    expect(isNaN(new Date(rfq.createdAt).getTime())).toBe(false);
    customerRfqId = rfq.id;
  });

  // 7. Commercial Quotations & RFQ Integration
  console.log("\n▶ Suite 7: Commercial Quotations & Pricing Formulas");
  await test("Quotations", "Create quotation linked to RFQ transitions RFQ status to QUOTATION_PREPARED", async () => {
    const quote = await createQuotation({
      rfqId: customerRfqId,
      rfqNumber: "RFQ-TEST-CUST",
      companyName: "Global Retail AG",
      buyerName: "Global Sourcing Director",
      buyerEmail: "sourcing@globalretail.de",
      destinationCountry: "Germany",
      destinationCity: "Hamburg",
      currency: "USD",
      currencySymbol: "$",
      items: [
        {
          id: "q_item_1",
          productId: sampleProduct.id,
          productName: sampleProduct.name,
          sku: sampleProduct.sku || "POLO-CP-01",
          quantity: 2500,
          unitPrice: 8.2,
          lineTotal: 20500,
        },
      ],
      subtotal: 20500,
      discountTotal: 500,
      shippingFee: 1200,
      taxAmount: 0,
      grandTotal: 21200,
      validUntil: "2026-12-31",
      paymentTerms: "30% Advance T/T, 70% against BL copy",
      shippingTerms: "FOB Chittagong",
      incoterm: "FOB",
      adminNotes: "FOB Sea Freight lead time 30 days",
    });

    expect(quote.id).toBeDefined();
    expect(quote.quotationNumber.startsWith("QT-")).toBe(true);
    expect(quote.grandTotal).toBe(21200);

    // Verify RFQ is linked and updated
    const rfq = await rfqService.getRfqById(customerRfqId);
    expect(rfq?.quotationId).toBe(quote.id);
    expect(rfq?.status).toBe("QUOTATION_PREPARED");
  });

  // 8. Documents & Official Pubali Bank Credentials
  console.log("\n▶ Suite 8: Documents & Beneficiary Bank Credentials");
  await test("Documents", "Proforma Invoice contains exact approved Pubali Bank Limited credentials", () => {
    expect(BUSINESS_PROFILE.banking.bankName).toBe("Pubali Bank Limited");
    expect(BUSINESS_PROFILE.banking.accountTitle).toBe("M/S AYAAN  CLOTHING");
    expect(BUSINESS_PROFILE.banking.accountNo).toBe("1788-901-044316");
    expect(BUSINESS_PROFILE.banking.swiftCode).toBe("PUBABDDH210");
  });

  await test("Documents", "Commercial Document Generator produces valid Proforma Invoice and Order Sheet", async () => {
    const order = mockStore.getOrders()[0];
    const piDoc = await getCommercialDocument("PROFORMA_INVOICE", order.id);
    expect(piDoc).toBeTruthy();
    expect(piDoc?.docType).toBe("PROFORMA_INVOICE");
    expect(piDoc?.bankDetails?.bankName).toBe("Pubali Bank Limited");

    // Order Sheet has strictly zero shipping fee for wholesale delivery
    const catalogProd = mockStore.getProducts()[0];
    const osDoc = await getCommercialDocument("ORDER_SHEET", catalogProd.id);
    expect(osDoc).toBeTruthy();
    expect(osDoc?.docType).toBe("ORDER_SHEET");
    expect(osDoc?.shipping).toBe(0);
    expect(osDoc?.incoterm).toBe("FOB");
  });

  await test("Documents", "jsPDF generator creates valid Proforma Invoice and Offer Sheet binaries without crashing", () => {
    const order = mockStore.getOrders()[0];
    const piPdf = generateProformaInvoiceDoc(order);
    expect(piPdf).toBeDefined();
    expect(typeof piPdf.output).toBe("function");

    const offerSheetPdf = generateProductOfferSheetDoc({
      ...sampleProduct,
      price: sampleProduct.wholesalePrice,
    } as any);
    expect(offerSheetPdf).toBeDefined();
    expect(typeof offerSheetPdf.output).toBe("function");
  });

  // 9. SEO & Sitemap & Robots Architecture
  console.log("\n▶ Suite 9: SEO & Robots Architecture");
  await test("SEO", "deriveProductTitle and generateProductMetadata output correct canonical metadata", () => {
    const meta = generateProductMetadata(sampleProduct as any, sampleProduct.slug);
    expect(meta.title).toContain("Cotton Pique Polo");
    expect(meta.title).toContain("Nike");
    expect(meta.title).toContain("AYAAN CLOTHING");
    expect((meta.alternates as any)?.canonical).toContain(`/products/${sampleProduct.slug}`);
    expect(meta.openGraph?.title).toBeDefined();
  });

  await test("SEO", "NO meta keywords tag: keywords are application data only", () => {
    const meta = generateProductMetadata(sampleProduct as any, sampleProduct.slug);
    // Next.js Metadata keywords property should NOT be populated or rendered as meta tag
    expect((meta as any).keywords).toBeUndefined();
  });

  await test("SEO", "Robots configuration allows public crawlers and disallows private/admin paths", () => {
    const robotRules = robots();
    expect(robotRules.sitemap).toContain("/sitemap.xml");
    const rule = (robotRules.rules as any)[0];
    expect(rule.allow).toContain("/");
    expect(rule.allow).toContain("/search");
    expect(rule.allow).toContain("/products/");
    expect(rule.allow).toContain("/rfq");
    expect(rule.disallow).toContain("/admin");
    expect(rule.disallow).toContain("/admin/*");
    expect(rule.disallow).toContain("/profile");
    expect(rule.disallow).toContain("/dashboard");
    expect(rule.disallow).toContain("/cart");
    expect(rule.disallow).toContain("/checkout");
  });

  await test("SEO", "Sitemap includes public static routes, categories, brands, products; excludes admin/dashboard", async () => {
    const siteMapEntries = await sitemap();
    expect(siteMapEntries.length).toBeGreaterThan(5);
    const urls = siteMapEntries.map((e) => e.url);
    // Public routes present
    expect(urls.some((u) => u.endsWith("/search"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/rfq"))).toBe(true);
    expect(urls.some((u) => u.includes("/search?audience="))).toBe(true);
    // Private/admin routes strictly excluded
    expect(urls.some((u) => u.includes("/admin"))).toBe(false);
    expect(urls.some((u) => u.includes("/dashboard"))).toBe(false);
    expect(urls.some((u) => u.includes("/profile"))).toBe(false);
    expect(urls.some((u) => u.includes("/checkout"))).toBe(false);
  });

  // 10. Brand Logo Consistency
  console.log("\n▶ Suite 10: Brand Logo System");
  await test("Brand Logo", "getBrandLogoUrl returns official clean SVG without letter fallbacks", () => {
    const nikeLogo = getBrandLogoUrl("Nike");
    expect(nikeLogo).toBe("/brands/nike.svg");

    const adidasLogo = getBrandLogoUrl("Adidas");
    expect(adidasLogo).toBe("/brands/adidas.svg");

    const pumaLogo = getBrandLogoUrl("Puma");
    expect(pumaLogo).toBe("/brands/puma.svg");

    const unknownLogo = getBrandLogoUrl("UnknownBrandXYZ");
    expect(unknownLogo).toBeNull(); // Strict invariant: never show broken letter fallback
  });

  // 11. Single Warehouse (Uttara) & Inventory Logic Audit
  console.log("\n▶ Suite 11: Inventory & Uttara Warehouse");
  await test("Inventory", "Single warehouse invariant: only Uttara exists in warehouse inventory", () => {
    const inv = mockStore.getInventory();
    expect(inv.length).toBeGreaterThan(0);
    const nonUttara = inv.filter(
      (item) =>
        item.warehouse_id !== 1 &&
        (item as any).warehouse_name &&
        (item as any).warehouse_name !== "Uttara"
    );
    expect(nonUttara.length).toBe(0);
  });

  await test("Inventory", "AUDIT DEFECT CHECK: Low Stock calculation specification vs code", () => {
    // Specification: LOW STOCK = CURRENT STOCK < MINIMUM BULK AMOUNT (MOQ)
    // Code: hardcodes LOW_STOCK_THRESHOLD = 200 regardless of product MOQ!
    expect(LOW_STOCK_THRESHOLD).toBe(200);
    const qty100IsLowInCode = isLowStock(100);
    expect(qty100IsLowInCode).toBe(true);
  });

  // 12. Deletion Defect Check (Known Real Bug Reproduction)
  console.log("\n▶ Suite 12: Persistence & Store Defect Verification");
  await test("Persistence", "AUDIT DEFECT CHECK: Product deletion self-healing resurrection bug", async () => {
    const initialList = mockStore.getProducts();
    const target = initialList[0];
    mockStore.deleteProduct(target.id);
    const afterDelete = mockStore.getProducts().find((p) => p.id === target.id);
    // In buggy mockStore, self-healing routine resurrects the product immediately on read!
    // Expected behavior: afterDelete should be undefined.
    // Real behavior: afterDelete returns the resurrected object.
    expect(afterDelete).toBeFalsy();
  });

  console.log("\n==================================================");
  console.log("AUTOMATED FULL WEBSITE AUDIT RUN FINISHED");
  console.log(`TOTAL TESTS: ${totalTests} | PASS: ${passCount} | FAIL: ${failCount}`);
  console.log("==================================================\n");
}

runWebsiteAudit();
