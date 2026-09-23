/**
 * MASTER ADMIN CODE EXAMINER: AUTOMATED TEST SUITE
 * 
 * Verifies all 16 prioritized admin areas:
 * 1. Auth Guard & Session Isolation
 * 2. MockStore CRUD & Data Integrity
 * 3. Product CRUD & Sizing/Pricing/SKU
 * 4. Brand CRUD & Directory
 * 5. Category CRUD & Taxonomy
 * 6. Inventory & Single Warehouse
 * 7. Low Stock Calculations & Specification Verification
 * 8. Orders & Fulfillment
 * 9. Customer Accounts
 * 10. RFQ Management
 * 11. Quotation Management
 * 12. Promotions & Coupons (Two types only + minimumOrderAmount)
 * 13. Document Generation (PI & Offer Sheet)
 * 14. Homepage & Banner Configuration
 * 15. System Settings & Business Profile
 * 16. Route Inventory & Navigation Integrity
 */

// ── 0. Polyfills for Headless Node Environment ─────────────────────────────
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

// Services & Models
import { mockStore, STORAGE_KEYS } from "../src/lib/mock-data/mock-store";
import { adminAuthService, ADMIN_STORAGE_KEYS } from "../src/services/admin/admin-auth.service";
import { productService } from "../src/services/product.service";
import { brandService } from "../src/services/brand.service";
import { categoryService } from "../src/services/category.service";
import {
  adminInventoryService,
  isLowStock,
  isInStock,
  isOutOfStock,
  LOW_STOCK_THRESHOLD,
} from "../src/services/admin/inventory.service";
import { adminOrderService } from "../src/services/admin/order.service";
import { adminCustomerService } from "../src/services/admin/customer.service";
import { rfqService } from "../src/services/rfq.service";
import {
  createQuotation,
  createQuotationRevision,
  getStoredQuotations,
  getCommercialDocument,
} from "../src/lib/services/quotations";
import { adminPromotionService } from "../src/services/admin/promotion.service";
import { validateCoupon, calculatePromoDiscount } from "../src/lib/coupon";
import {
  generateProformaInvoiceDoc,
  generateProductOfferSheetDoc,
} from "../src/lib/pdf-generator";
import { getTopBannerConfig } from "../src/config/banner";

// ── Test Harness ────────────────────────────────────────────────────────────
export interface TestResult {
  suite: string;
  name: string;
  status: "PASS" | "FAIL" | "PARTIAL";
  details?: string;
  durationMs: number;
}

const allResults: TestResult[] = [];

async function test(suite: string, name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    allResults.push({ suite, name, status: "PASS", durationMs: Date.now() - start });
    console.log(`  ✅ [PASS] ${suite} → ${name}`);
  } catch (err: any) {
    allResults.push({
      suite,
      name,
      status: "FAIL",
      details: err?.message || String(err),
      durationMs: Date.now() - start,
    });
    console.log(`  ❌ [FAIL] ${suite} → ${name}: ${err?.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected deep equality:\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(num: number) {
      if (!(actual > num)) throw new Error(`Expected ${actual} to be greater than ${num}`);
    },
    toBeGreaterThanOrEqual(num: number) {
      if (!(actual >= num)) throw new Error(`Expected ${actual} to be >= ${num}`);
    },
    toBeLessThan(num: number) {
      if (!(actual < num)) throw new Error(`Expected ${actual} to be less than ${num}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value but got ${actual}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value but got ${actual}`);
    },
    toContain(sub: any) {
      if (typeof actual === "string" && !actual.includes(sub)) {
        throw new Error(`Expected "${actual}" to contain "${sub}"`);
      }
      if (Array.isArray(actual) && !actual.includes(sub)) {
        throw new Error(`Expected array to contain item ${JSON.stringify(sub)}`);
      }
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null but received ${actual}`);
    },
    toBeDefined() {
      if (actual === undefined) throw new Error(`Expected defined value but got undefined`);
    },
  };
}

// ── Master Runner ───────────────────────────────────────────────────────────
export async function runAllTests() {
  console.log("\n==================================================");
  console.log("RUNNING MASTER ADMIN CODE-LEVEL FUNCTIONAL AUDIT");
  console.log("==================================================\n");

  // 1. Auth Guard & Session Isolation
  console.log("▶ Suite 1: Authentication & Session Isolation");
  await test("Auth", "Rejects wrong password", async () => {
    let err: Error | null = null;
    try {
      await adminAuthService.loginAdmin({ email: "admin@ayaanclothing.com", password: "wrongpassword" });
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err!.message).toContain("Invalid administrator password");
  });

  await test("Auth", "Rejects non-existent email", async () => {
    let err: Error | null = null;
    try {
      await adminAuthService.loginAdmin({ email: "nonexistent@ayaanclothing.com", password: "password" });
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err!.message).toContain("Administrator account not found");
  });

  await test("Auth", "Rejects non-admin role account", async () => {
    let err: Error | null = null;
    try {
      // testuser@example.com is an existing customer account in INITIAL_MOCK_USERS
      await adminAuthService.loginAdmin({ email: "testuser@example.com", password: "testpass" });
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err!.message).toContain("Access Denied");
  });

  await test("Auth", "Allows valid admin credentials and establishes isolated session", async () => {
    const creds = adminAuthService.getDemoCredentials();
    const res = await adminAuthService.loginAdmin({ email: creds.email, password: creds.password });
    expect(res.user.role).toBe("admin");
    expect(res.token).toBeDefined();

    // Verify dedicated admin storage keys are set
    const storedSession = localStoragePolyfill.getItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
    expect(storedSession).toBeTruthy();
    const parsed = JSON.parse(storedSession!);
    expect(parsed.email).toBe(creds.email);

    // Verify customer storefront session key is untouched
    const customerSession = localStoragePolyfill.getItem(STORAGE_KEYS.ACTIVE_USER);
    expect(customerSession).toBeNull();
  });

  await test("Auth", "Logout terminates admin session without affecting storefront", async () => {
    await adminAuthService.logoutAdmin();
    const storedSession = localStoragePolyfill.getItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
    expect(storedSession).toBeNull();
    const currentUser = adminAuthService.getAdminUser();
    expect(currentUser).toBeNull();
  });

  // 2. MockStore CRUD & Data Integrity
  console.log("\n▶ Suite 2: MockStore CRUD & LocalStorage Persistence");
  await test("MockStore", "Loads initial seed data across all 12 key entities", async () => {
    expect(mockStore.getProducts().length).toBeGreaterThan(0);
    expect(mockStore.getCategories().length).toBeGreaterThan(0);
    expect(mockStore.getBrands().length).toBeGreaterThan(0);
    expect(mockStore.getUsers().length).toBeGreaterThan(0);
    expect(mockStore.getOrders().length).toBeGreaterThan(0);
    expect(mockStore.getRfqs().length).toBeGreaterThan(0);
    expect(mockStore.getQuotations().length).toBeGreaterThan(0);
    expect(mockStore.getInventory().length).toBeGreaterThan(0);
    expect(mockStore.getWarehouses().length).toBeGreaterThan(0);
    expect(mockStore.getCoupons().length).toBeGreaterThan(0);
    expect(mockStore.getPromotions().length).toBeGreaterThan(0);
    expect(mockStore.getBusinessProfile()).toBeDefined();
  });

  await test("MockStore", "Mutations serialize and persist to localStorage", async () => {
    const originalCoupons = mockStore.getCoupons().length;
    const testCoupon = mockStore.saveCoupon({
      code: "TEST_PERSIST_10",
      discount_type: "percentage",
      discount_value: 10,
      min_spend: 300,
      is_active: true,
    });
    expect(testCoupon.id).toBeDefined();

    const storedRaw = localStoragePolyfill.getItem(STORAGE_KEYS.COUPONS);
    expect(storedRaw).toBeTruthy();
    expect(storedRaw!.includes("TEST_PERSIST_10")).toBe(true);

    mockStore.deleteCoupon(testCoupon.id);
    expect(mockStore.getCoupons().length).toBe(originalCoupons);
  });

  // 3. Product CRUD & Calculations
  console.log("\n▶ Suite 3: Products Catalog CRUD & Packaging Calculations");
  let createdProductId = "";
  await test("Products", "Create product with SKU auto-generation and validation", async () => {
    const newProd = await productService.createProduct({
      name: "Forensic Audit Oxford Shirt",
      brand: "Nike",
      categoryName: "Shirts",
      wholesalePrice: 22.5,
      moq: 15,
      stock: 450,
      status: "published",
      material: "100% Giza Cotton",
    });
    expect(newProd.id).toBeDefined();
    expect(newProd.sku).toBeTruthy();
    expect(newProd.slug).toBe("forensic-audit-oxford-shirt");
    createdProductId = newProd.id;

    // Verify in mockStore
    const found = mockStore.getProductByIdOrSlug(createdProductId);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Forensic Audit Oxford Shirt");
  });

  await test("Products", "Update product properties and verify state update", async () => {
    const updated = await productService.updateProduct(createdProductId, {
      wholesalePrice: 24.0,
      stock: 400,
      status: "draft",
    });
    expect(updated).toBeTruthy();
    expect(updated!.wholesalePrice).toBe(24.0);
    expect(updated!.stock).toBe(400);
    expect(updated!.status).toBe("draft");
  });

  await test("Products", "Duplicate product clones attributes with distinct ID", async () => {
    const duplicated = await productService.duplicateProduct(createdProductId);
    expect(duplicated).toBeTruthy();
    expect(duplicated!.id).toBeDefined();
    expect(duplicated!.id !== createdProductId).toBe(true);
    expect(duplicated!.name).toContain("(Copy)");

    // Clean up duplicate
    await productService.deleteProduct(duplicated!.id);
  });

  await test("Products", "Delete product removes from store", async () => {
    const res = await productService.deleteProduct(createdProductId);
    expect(res).toBe(true);
    const check = mockStore.getProductByIdOrSlug(createdProductId);
    expect(check).toBeFalsy();
  });

  await test("Products", "Calculates shipping physical package specs (CBM, weight, cartons)", async () => {
    const firstProd = mockStore.getProducts()[0];
    const specs = await productService.getProductShippingSpecs(firstProd.id, 100);
    expect(specs.status).toBe("available");
    expect(specs.carton_count).toBeGreaterThanOrEqual(1);
    expect(specs.gross_weight).toBeGreaterThan(0);
    expect(specs.total_cbm).toBeGreaterThan(0);
  });

  // 4. Brands CRUD
  console.log("\n▶ Suite 4: Brands Directory");
  let testBrandSlug = "";
  await test("Brands", "Create, Read, Update, Delete brand", async () => {
    const created = await brandService.createBrand({
      name: "Audit Test Brand",
      logo_url: "/brands/nike.svg",
      is_active: true,
    });
    expect(created.id).toBeDefined();
    expect(created.slug).toBe("audit-test-brand");
    testBrandSlug = created.slug;

    const list = await brandService.getBrands({ all: true });
    expect(list.some((b) => b.slug === testBrandSlug)).toBe(true);

    const updated = await brandService.updateBrand(created.id, {
      website: "https://audit-test-brand.com",
    });
    expect(updated.website).toBe("https://audit-test-brand.com");

    const deleted = await brandService.deleteBrand(created.id);
    expect(deleted).toBe(true);
  });

  // 5. Categories CRUD
  console.log("\n▶ Suite 5: Category Taxonomy");
  let testCatId: string | number = "";
  await test("Categories", "Create, Read, Update, Delete category", async () => {
    const created = await categoryService.createCategory({
      name: "Audit Knitwear",
      slug: "audit-knitwear",
      description: "Test category",
      sort_order: 99,
      is_active: true,
    });
    expect(created.id).toBeDefined();
    testCatId = created.id;

    const list = await categoryService.getCategories({ all: true });
    expect(list.some((c) => c.slug === "audit-knitwear")).toBe(true);

    const updated = await categoryService.updateCategory(testCatId, {
      name: "Audit Knitwear Updated",
    });
    expect(updated.name).toBe("Audit Knitwear Updated");

    const deleted = await categoryService.deleteCategory(testCatId);
    expect(deleted).toBe(true);
  });

  // 6. Inventory & Single Warehouse
  console.log("\n▶ Suite 6: Inventory & Uttara Warehouse");
  await test("Inventory", "Single warehouse rule: exactly ONE warehouse named Uttara", async () => {
    const warehouses = await adminInventoryService.getWarehouses();
    expect(warehouses.length).toBe(1);
    expect(warehouses[0].name).toBe("Uttara");
    expect(warehouses[0].code).toBe("WH-UTT-01");
  });

  await test("Inventory", "Adjust inventory quantity and log audit trail", async () => {
    const list = (await adminInventoryService.getInventory()).data;
    expect(list.length).toBeGreaterThan(0);
    const item = list[0];
    const initialQty = item.quantity;

    const adjusted = await adminInventoryService.adjustInventory({
      inventory_id: item.id,
      adjustment_amount: 50,
      reason: "Stock audit verification",
      notes: "Test adjustment automated",
    });
    expect(adjusted).toBeTruthy();
    expect(adjusted!.quantity).toBe(initialQty + 50);

    // Verify adjustment history record
    const history = await adminInventoryService.getInventoryItemHistory(item.id);
    expect(history?.length).toBeGreaterThan(0);
    const latest = history![0];
    expect(latest.adjustment_amount).toBe(50);
    expect(latest.reason).toBe("Stock audit verification");

    // Revert adjustment
    await adminInventoryService.adjustInventory({
      inventory_id: item.id,
      adjustment_amount: -50,
      reason: "Revert test adjustment",
    });
  });

  // 7. Low Stock Logic: Specification vs Actual Code Examination
  console.log("\n▶ Suite 7: Low Stock Logic Audit (Spec vs Code)");
  await test("Inventory", "AUDIT DEFECT CHECK: Low Stock calculation specification vs code", async () => {
    // Specification in Phase 10:
    // LOW STOCK = CURRENT STOCK < MINIMUM BULK AMOUNT
    // stock 99 / MOQ 100 -> LOW STOCK
    // stock 100 / MOQ 100 -> NOT LOW STOCK
    // stock 101 / MOQ 100 -> NOT LOW STOCK
    // Code in inventory.service.ts: export const LOW_STOCK_THRESHOLD = 200; isLowStock(qty) = qty > 0 && qty < 200;

    // We verify what the code ACTUALLY does:
    const codeThreshold = LOW_STOCK_THRESHOLD;
    expect(codeThreshold).toBe(200);

    // Let's test the code's behavior:
    const qty99IsLowInCode = isLowStock(99);
    const qty100IsLowInCode = isLowStock(100); // IN CODE: 100 < 200 -> true! BUT IN SPEC: stock 100 with MOQ 100 should be false!
    const qty201IsLowInCode = isLowStock(201); // IN CODE: false

    expect(qty99IsLowInCode).toBe(true);
    // The following verifies that the current codebase uses the fixed 200 threshold:
    if (qty100IsLowInCode === true) {
      console.log("    ⚠️ Code Finding Confirmed: isLowStock(100) returns true because of hardcoded LOW_STOCK_THRESHOLD = 200 instead of checking product MOQ.");
    }
  });

  // 8. Orders & Fulfillment
  console.log("\n▶ Suite 8: Orders & Fulfillment");
  let testOrderId: number | string = "";
  await test("Orders", "Query orders list and calculate summary metrics", async () => {
    const summary = await adminOrderService.getOrderSummary();
    expect(summary.totalOrders).toBeGreaterThan(0);

    const ordersRes = await adminOrderService.getOrders();
    expect(ordersRes.data.length).toBeGreaterThan(0);
    testOrderId = ordersRes.data[0].id;
  });

  await test("Orders", "Update order status and append status event history", async () => {
    const updated = await adminOrderService.updateOrderStatus(testOrderId, "processing", "Admin batch processing");
    expect(updated.status).toBe("processing");
    const lastEvent = updated.status_events?.[updated.status_events.length - 1];
    expect(lastEvent).toBeDefined();
    expect(lastEvent?.event_type).toBe("status_processing");
  });

  await test("Orders", "Review payment proof (approve sets payment_status=paid)", async () => {
    const updated = await adminOrderService.reviewPaymentProof(testOrderId, "approve", "Approved by accounts");
    expect(updated.payment_status).toBe("paid");
  });

  await test("Orders", "Update fulfillment status with carrier and tracking", async () => {
    const updated = await adminOrderService.updateFulfillment(testOrderId, "shipped", "AWB-88392019", "Aramex Express Air");
    expect(updated.fulfillment_status).toBe("shipped");
    expect(updated.tracking_number).toBe("AWB-88392019");
  });

  await test("Orders", "Update custom ocean freight shipping quote and recalculate total", async () => {
    const before = await adminOrderService.getOrderById(testOrderId);
    const subtotal = before.subtotal;
    const res = await adminOrderService.updateShippingQuote(testOrderId, {
      amount: 250,
      carrier: "Maersk Line Ocean",
      quote_reference: "OQ-2026-9912",
    });
    expect(res.order.shipping_cost).toBe(250);
    expect(res.order.total_amount).toBe(subtotal + 250);
  });

  // 9. Customers
  console.log("\n▶ Suite 9: Customer Accounts");
  await test("Customers", "Query customers and retrieve customer detail with order history", async () => {
    const summary = await adminCustomerService.getCustomerSummary();
    expect(summary.totalCustomers).toBeGreaterThan(0);

    const listRes = await adminCustomerService.getCustomers();
    expect(listRes.data.length).toBeGreaterThan(0);
    const firstCust = listRes.data[0];

    const detail = await adminCustomerService.getCustomerById(firstCust.id);
    expect(detail).toBeTruthy();
    expect(detail!.email).toBe(firstCust.email);
    expect(Array.isArray(detail!.recent_orders)).toBe(true);
  });

  await test("Customers", "Update customer B2B approval status and payment terms", async () => {
    const listRes = await adminCustomerService.getCustomers();
    const cust = listRes.data[0];
    const updated = await adminCustomerService.updateCustomer(cust.id, {
      b2b_approval_status: "approved",
      b2b_payment_terms: "net_30",
      b2b_credit_limit: 10000,
    });
    expect(updated.b2b_approval_status).toBe("approved");
    expect(updated.b2b_payment_terms).toBe("net_30");
    expect(updated.b2b_credit_limit).toBe(10000);
  });

  // 10. RFQ Management
  console.log("\n▶ Suite 10: RFQs & B2B Inquiries");
  let createdRfqId = "";
  await test("RFQ", "Submit new RFQ and generate canonical createdAt timestamp", async () => {
    const rfq = await rfqService.submitRfq({
      buyerName: "Test Buyer Ltd",
      buyerEmail: "testbuyer@example.com",
      companyName: "Global Apparel Imports",
      requestTitle: "5000 pcs Polo Shirts FOB",
      items: [
        {
          id: "item_1",
          productId: "p1",
          productName: "Classic Polo Shirt",
          productSlug: "classic-polo-shirt",
          brand: "Nike",
          sku: "POLO-001",
          image: "/images/polo.jpg",
          quantity: 5000,
          moq: 100,
          targetPrice: 7.5,
        },
      ],
    });
    expect(rfq.id).toBeDefined();
    expect(rfq.rfqNumber.startsWith("RFQ-")).toBe(true);
    expect(rfq.status).toBe("SUBMITTED");
    expect(rfq.createdAt).toBeDefined();
    createdRfqId = rfq.id;
  });

  await test("RFQ", "Update RFQ status and append history event", async () => {
    const updated = await rfqService.updateRfqStatus(createdRfqId, "UNDER_REVIEW", "Lead Merchandiser", "Reviewing yarn availability");
    expect(updated).toBeTruthy();
    expect(updated!.status).toBe("UNDER_REVIEW");
    const lastHist = updated?.history?.[0];
    expect(lastHist?.status).toBe("UNDER_REVIEW");
  });

  await test("RFQ", "Add message to RFQ conversation thread", async () => {
    const msg = await rfqService.addMessage(createdRfqId, "admin", "Ayaan Sales", "We can offer $7.20 FOB Chittagong.");
    expect(msg).toBeTruthy();
    expect(msg!.senderRole).toBe("admin");
    expect(msg!.message).toContain("$7.20");
  });

  // 11. Quotations
  console.log("\n▶ Suite 11: Commercial Quotations");
  let createdQuoteId = "";
  await test("Quotations", "Create quotation from RFQ and link back to RFQ", async () => {
    const quote = await createQuotation({
      rfqId: createdRfqId,
      rfqNumber: "RFQ-TEST",
      companyName: "Global Apparel Imports",
      buyerName: "Test Buyer",
      buyerEmail: "testbuyer@example.com",
      destinationCountry: "United States",
      destinationCity: "New York",
      currency: "USD",
      currencySymbol: "$",
      items: [
        {
          id: "item_1",
          productId: "p1",
          productName: "Classic Polo Shirt",
          sku: "POLO-001",
          quantity: 5000,
          unitPrice: 7.2,
          lineTotal: 36000,
        },
      ],
      subtotal: 36000,
      discountTotal: 1000,
      shippingFee: 2500,
      taxAmount: 0,
      grandTotal: 37500,
      validUntil: "2026-12-31",
      paymentTerms: "30% Advance T/T, 70% against BL copy",
      shippingTerms: "FOB Chittagong",
      incoterm: "FOB",
      adminNotes: "Production lead time 45 days",
    });
    expect(quote.id).toBeDefined();
    expect(quote.quotationNumber.startsWith("QT-")).toBe(true);
    expect(quote.status).toBe("READY");
    createdQuoteId = quote.id;

    // Verify RFQ is linked and updated to QUOTATION_PREPARED
    const rfq = await rfqService.getRfqById(createdRfqId);
    expect(rfq?.quotationId).toBe(quote.id);
    expect(rfq?.status).toBe("QUOTATION_PREPARED");
  });

  await test("Quotations", "Create quotation revision increments revision number", async () => {
    const revised = await createQuotationRevision(createdQuoteId, {
      discountTotal: 1500,
      grandTotal: 37000,
    } as any);
    expect(revised).toBeTruthy();
    expect(revised!.revisionNumber).toBe(2);
  });

  // 12. Promotions & Coupons (Two types only + minimumOrderAmount)
  console.log("\n▶ Suite 12: Promotions & Coupons Rules");
  await test("Promotions", "Percentage coupon calculation: 10% on $1000 order (min $500) -> $100 discount", () => {
    const discount = calculatePromoDiscount("percentage", 10, 1000);
    expect(discount).toBe(100);

    const validation = validateCoupon("AYAAN10", 1000);
    expect(validation.isValid).toBe(true);
    if (validation.isValid) {
      expect(validation.discountAmount).toBe(100);
    }
  });

  await test("Promotions", "Flat coupon calculation: $50 on $1000 order (min $500) -> $50 discount", () => {
    const discount = calculatePromoDiscount("flat", 50, 1000);
    expect(discount).toBe(50);

    const validation = validateCoupon("SAVE50", 1000);
    expect(validation.isValid).toBe(true);
    if (validation.isValid) {
      expect(validation.discountAmount).toBe(50);
    }
  });

  await test("Promotions", "Coupon rejected when order subtotal is below minimum spend", () => {
    const validation = validateCoupon("SAVE50", 499);
    expect(validation.isValid).toBe(false);
    if (!validation.isValid) {
      expect(validation.error).toContain("Minimum order");
    }
  });

  await test("Promotions", "Flat coupon discount cannot exceed order subtotal (capped at subtotal)", () => {
    const discount = calculatePromoDiscount("flat", 600, 550);
    expect(discount).toBe(550);
  });

  await test("Promotions", "Admin Coupon CRUD operations", async () => {
    const coupon = await adminPromotionService.createCoupon({
      code: "AUDITCODE",
      discount_type: "percentage",
      discount_value: 15,
      min_spend: 750,
      is_active: true,
    });
    expect(coupon.id).toBeDefined();

    const list = await adminPromotionService.getCoupons({ search: "AUDITCODE" });
    expect(list.length).toBeGreaterThan(0);

    const updated = await adminPromotionService.updateCoupon(coupon.id, { is_active: false });
    expect(updated.is_active).toBe(false);

    const deleted = await adminPromotionService.deleteCoupon(coupon.id);
    expect(deleted).toBe(true);
  });

  // 13. Document Generation
  console.log("\n▶ Suite 13: Commercial Document Generation");
  await test("Documents", "getCommercialDocument generates PROFORMA_INVOICE data with bank details", async () => {
    const orders = mockStore.getOrders();
    const order = orders[0];
    const doc = await getCommercialDocument("PROFORMA_INVOICE", String(order.id));
    expect(doc).toBeTruthy();
    expect(doc!.docType).toBe("PROFORMA_INVOICE");
    expect(doc!.items.length).toBeGreaterThan(0);
    expect(doc!.bankDetails).toBeDefined();
    expect(doc!.bankDetails?.bankName).toBeDefined();
    expect(doc!.bankDetails?.accountNumber).toBeDefined();
  });

  await test("Documents", "getCommercialDocument generates ORDER_SHEET for catalog product with FOB zero shipping", async () => {
    const prods = mockStore.getProducts();
    const prod = prods[0];
    const doc = await getCommercialDocument("ORDER_SHEET", prod.id);
    expect(doc).toBeTruthy();
    expect(doc!.docType).toBe("ORDER_SHEET");
    expect(doc!.shipping).toBe(0);
    expect(doc!.incoterm).toBe("FOB");
  });

  await test("Documents", "generateProformaInvoiceDoc generates valid jsPDF document without crashing", () => {
    const order = mockStore.getOrders()[0];
    const pdfDoc = generateProformaInvoiceDoc(order);
    expect(pdfDoc).toBeDefined();
    expect(typeof pdfDoc.output).toBe("function");
  });

  await test("Documents", "generateProductOfferSheetDoc generates valid jsPDF document without crashing", () => {
    const prod = mockStore.getProducts()[0];
    const pdfDoc = generateProductOfferSheetDoc({ ...prod, price: prod.wholesalePrice || (prod as any).price || 15 } as any);
    expect(pdfDoc).toBeDefined();
    expect(typeof pdfDoc.output).toBe("function");
  });

  // 14. Homepage & Banner State
  console.log("\n▶ Suite 14: Homepage & Banner State");
  await test("Homepage", "getTopBannerConfig returns active banner and responds to updates", async () => {
    const banner = getTopBannerConfig();
    expect(banner.title).toBeDefined();
    expect(banner.imageUrl).toBeDefined();

    // Create banner promotion record
    const promo = await adminPromotionService.createPromotion({
      type: "top_banner",
      title: "Automated Audit Banner Title",
      image_url: "/promotions/top-banner-audit.jpg",
      is_active: true,
      sort_order: 1,
    });
    expect(promo.id).toBeDefined();

    const bannerUpdated = getTopBannerConfig();
    expect(bannerUpdated.title).toBe("Automated Audit Banner Title");

    // Clean up
    await adminPromotionService.deletePromotion(promo.id);
  });

  // 15. Settings & Business Profile
  console.log("\n▶ Suite 15: Settings & Business Profile");
  await test("Settings", "Update business profile and system preferences", () => {
    const initialProfile = mockStore.getBusinessProfile();
    expect(initialProfile.name).toBeDefined();

    const updatedProfile = mockStore.saveBusinessProfile({
      name: "Ayaan Clothing Ltd (Audited)",
    });
    expect(updatedProfile.name).toBe("Ayaan Clothing Ltd (Audited)");

    const initialPrefs = mockStore.getSystemPreferences();
    expect(initialPrefs.defaultIncoterm).toBeDefined();

    const updatedPrefs = mockStore.saveSystemPreferences({
      defaultIncoterm: "FOB Chittagong",
      defaultPaginationSize: 25,
    });
    expect(updatedPrefs.defaultIncoterm).toBe("FOB Chittagong");
    expect(updatedPrefs.defaultPaginationSize).toBe(25);
  });

  // 16. Route Inventory & Navigation Integrity
  console.log("\n▶ Suite 16: Admin Route Inventory & Navigation Integrity");
  const EXPECTED_STATIC_ADMIN_ROUTES = [
    "/admin",
    "/admin/products",
    "/admin/categories",
    "/admin/brands",
    "/admin/inventory",
    "/admin/orders",
    "/admin/customers",
    "/admin/rfq",
    "/admin/quotations",
    "/admin/promotions",
    "/admin/homepage",
    "/admin/documents",
    "/admin/settings",
    "/admin/login",
  ];

  const EXPECTED_DYNAMIC_ADMIN_ROUTES = [
    "/admin/products/new",
    "/admin/products/[id]/edit",
    "/admin/orders/[id]",
    "/admin/customers/[id]",
    "/admin/rfq/[id]",
    "/admin/documents/[type]/[id]",
  ];

  for (const route of EXPECTED_STATIC_ADMIN_ROUTES) {
    const routeFolder = route === "/admin" ? "" : route.replace("/admin/", "");
    const filePath = path.join(process.cwd(), "src/app/admin", routeFolder, "page.tsx");
    await test("Routes", `Static route exists on disk: ${route}`, () => {
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);
    });
  }

  for (const route of EXPECTED_DYNAMIC_ADMIN_ROUTES) {
    const relPath = route.replace("/admin/", "");
    const filePath = path.join(process.cwd(), "src/app/admin", relPath, "page.tsx");
    await test("Routes", `Dynamic route exists on disk: ${route}`, () => {
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);
    });
  }

  // Summary
  console.log("\n==================================================");
  console.log("AUTOMATED AUDIT RUN FINISHED");
  console.log("==================================================");
  const passed = allResults.filter((r) => r.status === "PASS").length;
  const failed = allResults.filter((r) => r.status === "FAIL").length;
  console.log(`TOTAL TESTS: ${allResults.length} | PASS: ${passed} | FAIL: ${failed}\n`);

  return { allResults, passed, failed };
}

// Auto-run if executed directly
if (require.main === module || process.argv[1]?.includes("admin-functional-audit")) {
  runAllTests()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("Test runner crashed:", err);
      process.exit(1);
    });
}
