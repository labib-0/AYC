/**
 * Customer Document Center Redesign Test Suite
 * Order-Wise Document Grouping + Smart Search Regression Verification
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { orderService } from "@/services/order.service";
import { mockStore } from "@/lib/mock-data/mock-store";
import { OrderDocumentGroup, OrderDocumentItem } from "@/types/b2b";

describe("Customer Document Center — Order-Wise Grouping & Smart Search", () => {
  // Test fixture setup with mock orders
  const testOrderId1 = "ord_test_001";
  const testOrderId2 = "ord_test_002";
  const testCustomerId = "usr_cust_123";

  // 1. Documents Grouped by Order
  it("1. Documents must be grouped by canonical order, not displayed as separate top-level rows", async () => {
    // Save sample orders in mockStore
    mockStore.saveOrder({
      id: testOrderId1,
      order_number: "AYN-20261007-CZPIV",
      user_id: testCustomerId,
      shipping_name: "Just Gamer",
      company_name: "Just Gamer Ltd",
      status: "processing",
      payment_status: "paid",
      total_amount: 3192.00,
      currency: "USD",
      placed_at: "2026-10-07T10:00:00Z",
      items: [],
    } as any);

    mockStore.saveOrder({
      id: testOrderId2,
      order_number: "AYN-20261005-ABCD",
      user_id: testCustomerId,
      shipping_name: "Just Gamer",
      company_name: "Just Gamer Ltd",
      status: "pending",
      payment_status: "pending",
      total_amount: 1840.00,
      currency: "USD",
      placed_at: "2026-10-05T14:00:00Z",
      items: [],
    } as any);

    const res = await orderService.getCustomerDocumentGroups({ userId: testCustomerId });
    assert.ok(Array.isArray(res.data), "Result data must be an array of order groups");
    
    // Each item must be an order group containing documents
    for (const group of res.data) {
      assert.ok(group.order, "Each group must have an order object");
      assert.ok(group.order.id, "Group order must have an id");
      assert.ok(group.order.order_number, "Group order must have an order_number");
      assert.ok(Array.isArray(group.documents), "Group must have a documents array");
      assert.ok(group.documents.length > 0, "Group documents must not be empty");
    }
  });

  // 2. Multiple Documents under One Order
  it("2. Multiple commercial documents (PI, CI, INV, OS, PL) appear inside one order group", async () => {
    const res = await orderService.getCustomerDocumentGroups({ userId: testCustomerId });
    const paidGroup = res.data.find((g) => g.order.order_number === "AYN-20261007-CZPIV");
    assert.ok(paidGroup, "Paid order group found");

    const docTypes = paidGroup.documents.map((d) => d.doc_type);
    assert.ok(docTypes.includes("PROFORMA_INVOICE"), "Must include Proforma Invoice");
    assert.ok(docTypes.includes("COMMERCIAL_INVOICE"), "Must include Commercial Invoice for paid order");
    assert.ok(docTypes.includes("INVOICE"), "Must include Order Invoice");
    assert.ok(docTypes.includes("ORDER_SHEET"), "Must include Order Sheet");
    assert.ok(docTypes.includes("PACKING_LIST"), "Must include Packing List for paid order");

    // All documents in this group must point to the same source order ID
    for (const doc of paidGroup.documents) {
      assert.strictEqual(doc.source_id, paidGroup.order.id, "Document source_id must match order id");
    }
  });

  // 3. Search by Customer Name
  it("3. Search by customer name returns matching order group", async () => {
    const res = await orderService.getCustomerDocumentGroups({
      search: "Just Gamer",
      userId: testCustomerId,
    });
    assert.ok(res.data.length > 0, "Search by customer name should return orders");
    for (const g of res.data) {
      assert.ok(
        g.order.customer_name.toLowerCase().includes("just gamer") ||
          (g.order.company_name && g.order.company_name.toLowerCase().includes("just gamer")),
        "Returned orders must match customer name"
      );
    }
  });

  // 4. Search by Order ID
  it("4. Search by Order ID (partial or full) returns the complete order group", async () => {
    const res = await orderService.getCustomerDocumentGroups({
      search: "CZPIV",
      userId: testCustomerId,
    });
    assert.strictEqual(res.data.length, 1, "Exactly one order matches CZPIV");
    assert.strictEqual(res.data[0].order.order_number, "AYN-20261007-CZPIV");
    assert.ok(res.data[0].documents.length >= 4, "Order group contains all related documents");
  });

  // 5. Search by PI Number
  it("5. Search by PI reference returns the order containing that PI", async () => {
    const res = await orderService.getCustomerDocumentGroups({
      search: "PI-2026-1007",
      userId: testCustomerId,
    });
    assert.strictEqual(res.data.length, 1, "One order returned for PI reference");
    assert.strictEqual(res.data[0].order.order_number, "AYN-20261007-CZPIV");
    assert.ok(
      res.data[0].documents.some((d) => d.reference.includes("1007")),
      "Matching PI exists in the returned order group"
    );
  });

  // 6. Search by CI Number
  it("6. Search by CI reference returns the order containing that CI", async () => {
    const res = await orderService.getCustomerDocumentGroups({
      search: "CI-2026-1007",
      userId: testCustomerId,
    });
    assert.strictEqual(res.data.length, 1, "One order returned for CI reference");
    assert.strictEqual(res.data[0].order.order_number, "AYN-20261007-CZPIV");
  });

  // 7. Search returns Complete Order Group, Not Just Single Document
  it("7. Search returns the complete order group with all available documents, not just the matched one", async () => {
    const res = await orderService.getCustomerDocumentGroups({
      search: "CI-2026-1007",
      userId: testCustomerId,
    });
    assert.strictEqual(res.data.length, 1);
    const docs = res.data[0].documents;
    // Must contain both CI and other documents like PI, OS, INV, PL
    assert.ok(docs.length >= 4, "Complete order group returned with all documents");
    assert.ok(docs.some((d) => d.doc_type === "COMMERCIAL_INVOICE"), "Has CI");
    assert.ok(docs.some((d) => d.doc_type === "PROFORMA_INVOICE"), "Has PI");
    assert.ok(docs.some((d) => d.doc_type === "ORDER_SHEET"), "Has Order Sheet");
  });

  // 8. Filters Preserve Order Grouping
  it("8. Filtering by document category preserves the order as the top-level entity", async () => {
    const res = await orderService.getCustomerDocumentGroups({
      filter: "INVOICES",
      userId: testCustomerId,
    });
    for (const group of res.data) {
      assert.ok(group.order, "Top level entity remains the order");
      for (const doc of group.documents) {
        assert.ok(
          ["PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "INVOICE"].includes(doc.doc_type),
          "Filtered documents inside group only contain invoice types"
        );
      }
    }
  });

  // 9. Orders with Missing Document Types
  it("9. Unpaid/pending orders omit Commercial Invoice and Packing List without breaking the group", async () => {
    const res = await orderService.getCustomerDocumentGroups({ userId: testCustomerId });
    const unpaidGroup = res.data.find((g) => g.order.order_number === "AYN-20261005-ABCD");
    assert.ok(unpaidGroup, "Unpaid order group found");

    const docTypes = unpaidGroup.documents.map((d) => d.doc_type);
    assert.ok(docTypes.includes("PROFORMA_INVOICE"), "Unpaid order still has Proforma Invoice");
    assert.ok(docTypes.includes("INVOICE"), "Unpaid order still has Order Invoice");
    assert.ok(docTypes.includes("ORDER_SHEET"), "Unpaid order still has Order Sheet");
    assert.strictEqual(docTypes.includes("COMMERCIAL_INVOICE"), false, "Unpaid order must NOT have Commercial Invoice");
    assert.strictEqual(docTypes.includes("PACKING_LIST"), false, "Unpaid order must NOT have Packing List");
  });

  // 10. Order-Based Pagination
  it("10. Pagination is order-based and does not split an order across pages", async () => {
    const res = await orderService.getCustomerDocumentGroups({
      userId: testCustomerId,
      page: 1,
      per_page: 1,
    });
    assert.strictEqual(res.data.length, 1, "Exactly one order group on page 1");
    assert.ok(res.meta, "Meta pagination object exists");
    assert.strictEqual(res.meta.per_page, 1);
    assert.ok(res.data[0].documents.length > 1, "All documents of order 1 are kept together on page 1");
  });

  // 11. Customer Data Isolation
  it("11. Customer cannot access another customer's orders or documents", async () => {
    // Add another customer's order
    mockStore.saveOrder({
      id: "ord_cust_999",
      order_number: "AYN-20261001-OTHER",
      user_id: "usr_other_999",
      shipping_name: "Secret Buyer",
      status: "paid",
      payment_status: "paid",
      total_amount: 9999.00,
      currency: "USD",
      placed_at: "2026-10-01T10:00:00Z",
      items: [],
    } as any);

    // Customer 123 queries
    const res = await orderService.getCustomerDocumentGroups({ userId: testCustomerId });
    const orderNumbers = res.data.map((g) => g.order.order_number);
    assert.strictEqual(
      orderNumbers.includes("AYN-20261001-OTHER"),
      false,
      "Customer 123 cannot see Customer 999 order"
    );

    // Searching Customer 999's name returns 0 results
    const searchRes = await orderService.getCustomerDocumentGroups({
      userId: testCustomerId,
      search: "Secret Buyer",
    });
    assert.strictEqual(searchRes.data.length, 0, "Cross-tenant search strictly rejected");
  });

  // 12. Component & Layout Static Assertions
  it("12. Document Center Page component preserves required UI elements, badges, and view actions", () => {
    const pagePath = path.join(process.cwd(), "src/app/dashboard/documents/page.tsx");
    assert.ok(fs.existsSync(pagePath), "Page file exists");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Order grouping checks
    assert.ok(content.includes("ORDER #"), "Displays ORDER # in header");
    assert.ok(content.includes("orderGroups.map"), "Maps over orderGroups");
    assert.ok(content.includes("toggleOrder"), "Supports toggleOrder expand/collapse");
    assert.ok(content.includes("toggleAll"), "Supports Expand All / Collapse All");

    // Search bar checks
    assert.ok(content.includes("Search by customer name, order ID, invoice ID or document reference..."), "Contains required search placeholder");
    assert.ok(content.includes("debouncedSearch"), "Uses debounced search");
    assert.ok(content.includes("Matched Search") || content.includes("Matched Query"), "Highlights matched documents");

    // Document types & badges
    assert.ok(content.includes("getDocTypeBadge"), "Uses getDocTypeBadge");
    assert.ok(content.includes("PROFORMA_INVOICE"), "Handles Proforma Invoice");
    assert.ok(content.includes("COMMERCIAL_INVOICE"), "Handles Commercial Invoice");
    assert.ok(content.includes("ORDER_SHEET"), "Handles Order Sheet");
    assert.ok(content.includes("PACKING_LIST"), "Handles Packing List");
    assert.ok(content.includes("INVOICE"), "Handles Order Invoice");

    // Actions
    assert.ok(content.includes("handleView"), "Preserves handleView modal preview");
    assert.ok(content.includes("handleDownloadPDF"), "Preserves handleDownloadPDF");
    assert.ok(content.includes("View Order") || content.includes("orderDetailHref"), "Preserves View Order navigation");

    // Responsive design
    assert.ok(content.includes("hidden md:block"), "Contains desktop table view");
    assert.ok(content.includes("md:hidden"), "Contains mobile card view");
  });
});
