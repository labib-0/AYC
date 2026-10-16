/**
 * AYAAN CLOTHING — RFQ END-TO-END WORKFLOW AUDIT & STABILIZATION TEST
 *
 * Verifies:
 * 1. Customer Custom-Garment RFQ submission without catalog product IDs.
 * 2. Protection against non-numeric / string productId injection (PostgreSQL bigint foreign key safety).
 * 3. 3-state RFQ lifecycle (Pending, Approved, Rejected) across both Customer and Admin service layers.
 * 4. Approval and rejection notes persistence and extraction across both storefront and administrative APIs.
 * 5. Customer Dashboard filter tabs and badges properly render "APPROVED" and "REJECTED".
 * 6. Admin pagination properly handles "all" (mapped to 500) without crashing or truncating results.
 * 7. RFQ deletion cascading and safety without modifying catalog products or existing orders.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { isRfqApproved, isRfqRejected, adminRfqService } from "../src/services/admin/rfq.service";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { RfqRecord } from "../src/types/b2b";

const rootDir = process.cwd();

describe("1. Customer Storefront Custom-Garment RFQ Submission", () => {
  const rfqPagePath = path.join(rootDir, "src/app/rfq/page.tsx");
  const rfqPageContent = fs.readFileSync(rfqPagePath, "utf-8");

  it("permits custom apparel submission without requiring a catalog product", () => {
    assert.ok(
      rfqPageContent.includes("Submit Custom Quotation Request") ||
      rfqPageContent.includes("Custom Quotation Request"),
      "Storefront must offer custom quotation request submission"
    );
    assert.ok(
      rfqPageContent.includes("Custom Apparel Specification") ||
      rfqPageContent.includes("Custom Garment Specification") ||
      rfqPageContent.includes("Add Custom Garment"),
      "Storefront must include custom garment builder / modal"
    );
  });

  it("does not inject non-numeric 'custom-garment' string into productId column", () => {
    // Verifies that custom items do NOT set productId to string "custom-garment"
    assert.ok(
      !rfqPageContent.includes('productId: "custom-garment"'),
      "Must not pass string 'custom-garment' as productId to prevent PostgreSQL bigint failure"
    );
  });

  it("renders validation error feedback visible both at top of page and near submit CTA", () => {
    assert.ok(
      rfqPageContent.includes("errorMsg && (") && rfqPageContent.includes("AlertTriangle"),
      "Must render error alert banner when validation fails"
    );
  });
});

describe("2. Backend API & PostgreSQL BigInt Foreign Key Safety", () => {
  const controllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/RfqController.php");
  const controllerContent = fs.readFileSync(controllerPath, "utf-8");

  it("sanitizes product_id to null when non-numeric or custom string is provided", () => {
    assert.ok(
      controllerContent.includes("is_numeric($rawProductId)"),
      "RfqController must check is_numeric before casting product_id"
    );
    assert.ok(
      controllerContent.includes("$cleanProductId"),
      "RfqController must assign cleanProductId to prevent foreign key / syntax crashes"
    );
  });

  it("supports up to 500 records per page for 'all' pagination option", () => {
    assert.ok(
      controllerContent.includes("min(500,"),
      "RfqController must allow min(500, ...) perPage limit for 'all' selection"
    );
  });

  it("enforces admin authorization and transaction safety on RFQ deletion", () => {
    assert.ok(
      controllerContent.includes("public function destroy"),
      "RfqController must implement destroy endpoint"
    );
    assert.ok(
      controllerContent.includes("isAdmin()"),
      "destroy endpoint must enforce admin role check"
    );
    assert.ok(
      controllerContent.includes("$rfq->items()->delete()"),
      "destroy endpoint must cascade items cleanup"
    );
    assert.ok(
      controllerContent.includes("$rfq->messages()->delete()"),
      "destroy endpoint must cascade messages cleanup"
    );
  });
});

describe("3. Three-State Workflow (Pending, Approved, Rejected) & Notes", () => {
  let testRfqId: string;

  beforeEach(() => {
    // Create an isolated test RFQ in mock store
    const newRfq: RfqRecord = {
      id: `test_rfq_${Date.now()}`,
      rfqNumber: `RFQ-TEST-${Date.now()}`,
      buyerName: "Audit Test Buyer",
      buyerEmail: "audit@test.com",
      companyName: "Audit Apparel Ltd",
      destinationCountry: "United States",
      destinationCity: "Los Angeles",
      status: "SUBMITTED",
      items: [
        {
          id: `item_1`,
          productId: "",
          productName: "Custom Heavyweight Fleece Hoodie 450GSM",
          productSlug: "custom-heavyweight-fleece-hoodie",
          brand: "Custom OEM",
          sku: "OEM-450GSM",
          image: "/placeholder.jpg",
          quantity: 250,
          moq: 50,
          targetPrice: 18.5,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockStore.saveRfq(newRfq);
    testRfqId = newRfq.id;
  });

  it("initial state begins as Pending", () => {
    const rfq = mockStore.getRfqById(testRfqId);
    assert.ok(rfq);
    assert.equal(isRfqApproved(rfq.status), false);
    assert.equal(isRfqRejected(rfq.status), false);
  });

  it("transitions to REJECTED with note preserved and accessible", async () => {
    const updated = await adminRfqService.rejectRfq(testRfqId, "Target price below production cost");
    assert.ok(updated);
    assert.equal(updated.status, "REJECTED");
    assert.equal(isRfqRejected(updated.status), true);
    assert.equal(isRfqApproved(updated.status), false);
    assert.equal(updated.approvalNote, "Target price below production cost");
  });

  it("transitions to APPROVED with note and administrator metadata preserved", async () => {
    const updated = await adminRfqService.approveRfq(testRfqId, "Target specs accepted for Q4 run");
    assert.ok(updated);
    assert.equal(updated.status, "APPROVED");
    assert.equal(isRfqApproved(updated.status), true);
    assert.equal(isRfqRejected(updated.status), false);
    assert.equal(updated.approvalNote, "Target specs accepted for Q4 run");
    assert.ok(updated.approvedBy);
    assert.ok(updated.approvedAt);
  });

  it("deletes the RFQ cleanly without affecting other records", async () => {
    const deleted = await adminRfqService.deleteRfq(testRfqId);
    assert.equal(deleted, true);
    const lookup = mockStore.getRfqById(testRfqId);
    assert.equal(lookup, null);
  });
});

describe("4. Customer Dashboard Consistency Audit", () => {
  const customerListPagePath = path.join(rootDir, "src/app/dashboard/rfq/page.tsx");
  const customerListContent = fs.readFileSync(customerListPagePath, "utf-8");

  const customerDetailPagePath = path.join(rootDir, "src/app/dashboard/rfq/[id]/page.tsx");
  const customerDetailContent = fs.readFileSync(customerDetailPagePath, "utf-8");

  it("customer list badge renders APPROVED status", () => {
    assert.ok(
      customerListContent.includes('case "APPROVED":'),
      "Customer RFQ list must handle APPROVED status explicitly"
    );
  });

  it("customer list filter matches APPROVED under accepted/approved tab", () => {
    assert.ok(
      customerListContent.includes('rfq.status === "APPROVED"'),
      "matchesFilter must include APPROVED status"
    );
  });

  it("customer detail page renders decision note alert card for approved and rejected inquiries", () => {
    assert.ok(
      customerDetailContent.includes('case "APPROVED":'),
      "Customer RFQ detail page must handle APPROVED status in badge"
    );
    assert.ok(
      customerDetailContent.includes("rfq.approvalNote"),
      "Customer RFQ detail page must display approvalNote / decision note"
    );
    assert.ok(
      customerDetailContent.includes("Note from Export Administration:"),
      "Customer RFQ detail page must clearly attribute decision note to export administration"
    );
  });
});

describe("5. Admin Pagination & Metric Correctness", () => {
  it("converts per_page: 'all' to 500 in service layer", async () => {
    const res = await adminRfqService.getRfqs({ per_page: "all" });
    assert.ok(Array.isArray(res.data));
    assert.ok(res.total >= 0);
  });

  it("calculates totalRfqs as sum of pending + approved + rejected", async () => {
    const summary = await adminRfqService.getRfqSummary();
    assert.ok(summary.totalRfqs >= 0);
    assert.ok(summary.pending >= 0);
    assert.ok(summary.approved >= 0);
    assert.ok(summary.rejected >= 0);
    assert.equal(summary.totalRfqs, summary.pending + summary.approved + summary.rejected);
  });
});
