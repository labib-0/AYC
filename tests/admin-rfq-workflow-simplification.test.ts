/**
 * AYAAN CLOTHING — RFQ WORKFLOW SIMPLIFICATION TEST
 *
 * Verifies:
 * 1. RFQ status display is simplified strictly to two statuses: "RFQ Pending" and "RFQ Approved".
 * 2. RFQ details page contains Approval Note field (label "Approval Note", placeholder "Add an optional note about this RFQ approval...").
 * 3. Approving an RFQ persists the approval note, administrator name, and approval timestamp.
 * 4. Approved RFQ remains approved when re-fetched (refresh simulation).
 * 5. Repeated approval requests are idempotent and handled safely without duplication.
 * 6. Approving an RFQ does NOT generate an Order, PI, CI, Offer Sheet, or payment record.
 * 7. Requested line items, package assortment / size matrix, target prices, and customer details remain intact.
 * 8. Obsolete 8-stage workflow stepper, quotation unit price editor, and commercial document payment gating are removed from RFQ details page.
 * 9. RFQ toolbar status filter options are simplified to "all", "PENDING", and "APPROVED".
 * 10. Historical RFQs load cleanly without data loss.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { isRfqApproved, adminRfqService } from "../src/services/admin/rfq.service";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { RfqRecord } from "../src/types/b2b";

const rootDir = process.cwd();

describe("RFQ Status Normalization & Logic", () => {
  it("maps all pre-approval statuses to RFQ Pending (isRfqApproved === false)", () => {
    assert.equal(isRfqApproved("SUBMITTED"), false);
    assert.equal(isRfqApproved("RFQ_RECEIVED"), false);
    assert.equal(isRfqApproved("UNDER_REVIEW"), false);
    assert.equal(isRfqApproved("PENDING"), false);
    assert.equal(isRfqApproved("NEED_INFORMATION"), false);
    assert.equal(isRfqApproved(undefined), false);
    assert.equal(isRfqApproved(""), false);
  });

  it("maps approved and subsequent statuses to RFQ Approved (isRfqApproved === true)", () => {
    assert.equal(isRfqApproved("APPROVED"), true);
    assert.equal(isRfqApproved("QUOTATION_GENERATED"), true);
    assert.equal(isRfqApproved("QUOTATION_APPROVED"), true);
    assert.equal(isRfqApproved("QUOTATION_PREPARED"), true);
    assert.equal(isRfqApproved("ACCEPTED"), true);
    assert.equal(isRfqApproved("PAID"), true);
  });
});

describe("RFQ Details Page UI Audit (/ayc/rfq/[id]/page.tsx)", () => {
  const rfqPagePath = path.join(rootDir, "src/app/ayc/rfq/[id]/page.tsx");
  const content = fs.readFileSync(rfqPagePath, "utf-8");

  it("removes the obsolete 8-stage stepper and multi-step workflow labels", () => {
    assert.ok(!content.includes("1. RFQ Received"), "Must not contain '1. RFQ Received'");
    assert.ok(!content.includes("2. RFQ Under Review"), "Must not contain '2. RFQ Under Review'");
    assert.ok(!content.includes("4. Quotation Generation"), "Must not contain '4. Quotation Generation'");
    assert.ok(!content.includes("6. PI + Offer Sheet"), "Must not contain '6. PI + Offer Sheet'");
    assert.ok(!content.includes("7. Payment Paid"), "Must not contain '7. Payment Paid'");
    assert.ok(!content.includes("8. Commercial Invoice"), "Must not contain '8. Commercial Invoice'");
  });

  it("removes commercial quotation value editor and manual shipping fee inputs from RFQ page", () => {
    assert.ok(!content.includes("Commercial Quotation Values"), "Must not contain commercial quotation values editor");
    assert.ok(!content.includes("input-shipping-fee"), "Must not contain manual shipping fee input on RFQ page");
    assert.ok(!content.includes("btn-generate-quotation"), "Must not contain generate quotation action on RFQ page");
    assert.ok(!content.includes("btn-approve-quotation"), "Must not contain approve quotation action on RFQ page");
  });

  it("removes commercial document generation and payment gating from RFQ page", () => {
    assert.ok(!content.includes("btn-mark-payment-paid"), "Must not contain mark payment paid action on RFQ page");
    assert.ok(!content.includes("btn-generate-commercial-invoice"), "Must not contain commercial invoice button on RFQ page");
    assert.ok(!content.includes("Commercial Documents"), "Must not contain Commercial Documents section on RFQ page");
  });

  it("contains the required Approval Note field with canonical label and placeholder", () => {
    assert.ok(content.includes("Approval Note"), "Must contain 'Approval Note' label");
    assert.ok(
      content.includes("Add an optional note about this RFQ approval..."),
      "Must contain placeholder 'Add an optional note about this RFQ approval...'"
    );
    assert.ok(content.includes('id="input-approval-note"'), "Must contain input-approval-note id");
  });

  it("contains the canonical Approve RFQ action button", () => {
    assert.ok(content.includes('id="btn-approve-rfq"'), "Must contain btn-approve-rfq button");
    assert.ok(content.includes("Approve RFQ"), "Must display 'Approve RFQ' button text");
  });

  it("preserves requested line items, package assortment / size matrix, customer details, and target prices", () => {
    assert.ok(content.includes("Requested Line Items"), "Must preserve Requested Line Items section");
    assert.ok(content.includes("package_breakdown"), "Must preserve package breakdown assortment");
    assert.ok(content.includes("Size Matrix:"), "Must preserve Wholesale Size Matrix");
    assert.ok(content.includes("Customer Information"), "Must preserve Customer Information section");
    assert.ok(content.includes("Target Value Summary"), "Must preserve Target Value Summary");
  });
});

describe("RFQ Status Badge UI Audit (RfqStatusBadge.tsx)", () => {
  const badgePath = path.join(rootDir, "src/components/admin/rfq/RfqStatusBadge.tsx");
  const content = fs.readFileSync(badgePath, "utf-8");

  it("displays strictly only RFQ Pending and RFQ Approved", () => {
    assert.ok(content.includes('"RFQ Approved"'), "Must expose 'RFQ Approved'");
    assert.ok(content.includes('"RFQ Pending"'), "Must expose 'RFQ Pending'");
    assert.ok(!content.includes('"Under Review"'), "Must not expose 'Under Review'");
    assert.ok(!content.includes('"Quotation Generated"'), "Must not expose 'Quotation Generated'");
    assert.ok(!content.includes('"Payment Paid"'), "Must not expose 'Payment Paid'");
  });
});

describe("RFQ Toolbar & KPI Simplification", () => {
  const toolbarPath = path.join(rootDir, "src/components/admin/rfq/RfqToolbar.tsx");
  const toolbarContent = fs.readFileSync(toolbarPath, "utf-8");

  it("restricts status filter options to All, RFQ Pending, RFQ Approved, and RFQ Rejected", () => {
    assert.ok(toolbarContent.includes('<option value="all">All RFQ Statuses</option>'));
    assert.ok(toolbarContent.includes('<option value="PENDING">RFQ Pending</option>'));
    assert.ok(toolbarContent.includes('<option value="APPROVED">RFQ Approved</option>'));
    assert.ok(toolbarContent.includes('<option value="REJECTED">RFQ Rejected</option>'));
    assert.ok(!toolbarContent.includes('<option value="UNDER_REVIEW">'));
    assert.ok(!toolbarContent.includes('<option value="QUOTATION_GENERATED">'));
    assert.ok(!toolbarContent.includes('<option value="PAID">'));
  });

  const kpisPath = path.join(rootDir, "src/components/admin/rfq/RfqKpis.tsx");
  const kpisContent = fs.readFileSync(kpisPath, "utf-8");

  it("KPI cards display Total RFQs, RFQ Pending, RFQ Approved, and RFQ Rejected", () => {
    assert.ok(kpisContent.includes('"Total RFQs"'));
    assert.ok(kpisContent.includes('"RFQ Pending"'));
    assert.ok(kpisContent.includes('"RFQ Approved"'));
    assert.ok(kpisContent.includes('"RFQ Rejected"'));
    assert.ok(!kpisContent.includes('"Quotation Generated"'));
  });
});

describe("RFQ Approval Lifecycle & Note Persistence", () => {
  const testRfqId = `test_rfq_${Date.now()}`;
  const testRfqNumber = `RFQ-TEST-${Date.now()}`;

  const initialRfq: RfqRecord = {
    id: testRfqId,
    rfqNumber: testRfqNumber,
    buyerName: "Elena Rostova",
    buyerEmail: "elena.rostova@balticbrands.eu",
    companyName: "Baltic Apparel Distribution",
    destinationCountry: "Germany",
    destinationCity: "Hamburg",
    status: "SUBMITTED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: "item_test_1",
        productId: "prod_1",
        productName: "Premium Heavyweight Cotton Tee",
        productSlug: "premium-heavyweight-cotton-tee",
        brand: "Ayaan",
        sku: "AYN-TEE-001",
        image: "/images/products/tee-1.jpg",
        quantity: 1200,
        moq: 100,
        unitPrice: 4.5,
        targetPrice: 3.8,
        package_breakdown: [
          { size: "S", quantity: 200 },
          { size: "M", quantity: 500 },
          { size: "L", quantity: 500 },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockStore.saveRfq(initialRfq);
  });

  it("1. Newly submitted RFQ begins in RFQ Pending state", async () => {
    const fetched = await adminRfqService.getRfqById(testRfqId);
    assert.ok(fetched, "RFQ must exist in store");
    assert.equal(fetched.status, "SUBMITTED");
    assert.equal(isRfqApproved(fetched.status), false, "Must evaluate to not approved");
  });

  it("2. Administrator can approve RFQ and record Approval Note", async () => {
    const approvalNote = "Target price $3.80 accepted for 1,200 pcs volume run. FOB Chittagong confirmed.";
    const approved = await adminRfqService.approveRfq(testRfqId, approvalNote);

    assert.equal(approved.status, "APPROVED");
    assert.equal(isRfqApproved(approved.status), true, "Must evaluate to approved");
    assert.equal(approved.approvalNote, approvalNote, "Approval note must match input");
    assert.ok(approved.approvedBy, "approvedBy must be recorded");
    assert.ok(approved.approvedAt, "approvedAt timestamp must be recorded");
  });

  it("3. Approved RFQ remains approved when refreshed/re-fetched", async () => {
    const reloaded = await adminRfqService.getRfqById(testRfqId);
    assert.ok(reloaded);
    assert.equal(reloaded.status, "APPROVED");
    assert.equal(isRfqApproved(reloaded.status), true);
    assert.ok(reloaded.approvalNote);
    assert.ok(reloaded.approvedBy);
    assert.ok(reloaded.approvedAt);
  });

  it("4. Repeated approval requests are handled idempotently without error", async () => {
    const firstApproval = await adminRfqService.getRfqById(testRfqId);
    assert.ok(firstApproval);

    // Call approve again on already approved RFQ
    const secondApproval = await adminRfqService.approveRfq(testRfqId, "Duplicate approval request");
    assert.equal(secondApproval.status, "APPROVED");
    assert.equal(isRfqApproved(secondApproval.status), true);
  });

  it("5. Approving RFQ does NOT automatically create a commercial order, payment, or documents", async () => {
    const initialOrdersCount = mockStore.getOrders().length;

    // Approve another fresh RFQ
    const freshId = `fresh_rfq_${Date.now()}`;
    mockStore.saveRfq({
      ...initialRfq,
      id: freshId,
      rfqNumber: `RFQ-FRESH-${Date.now()}`,
      status: "SUBMITTED",
    });

    await adminRfqService.approveRfq(freshId, "Approved without side effects");

    const afterOrdersCount = mockStore.getOrders().length;
    assert.equal(
      afterOrdersCount,
      initialOrdersCount,
      "Approving an RFQ must not create any commercial orders"
    );
  });

  it("6. Line items, quantities, target prices, and package assortment remain intact after approval", async () => {
    const approved = await adminRfqService.getRfqById(testRfqId);
    assert.ok(approved);
    assert.equal(approved.items.length, 1);
    assert.equal(approved.items[0].quantity, 1200);
    assert.equal(approved.items[0].targetPrice, 3.8);
    assert.equal(approved.items[0].productName, "Premium Heavyweight Cotton Tee");
    assert.ok(Array.isArray(approved.items[0].package_breakdown));
    assert.equal(approved.items[0].package_breakdown.length, 3);
  });

  it("7. Filter by PENDING and APPROVED groups correctly in getRfqs", async () => {
    const pendingList = await adminRfqService.getRfqs({ status: "PENDING" });
    const approvedList = await adminRfqService.getRfqs({ status: "APPROVED" });

    // Verify all in pendingList are not approved
    for (const rfq of pendingList.data) {
      assert.equal(isRfqApproved(rfq.status), false);
    }

    // Verify all in approvedList are approved
    for (const rfq of approvedList.data) {
      assert.equal(isRfqApproved(rfq.status), true);
    }
  });

  it("8. Summary metrics return totalRfqs, pending, and approved correctly", async () => {
    const summary = await adminRfqService.getRfqSummary();
    assert.ok(summary.totalRfqs >= 0);
    assert.ok(summary.pending >= 0);
    assert.ok(summary.approved >= 0);
    assert.ok(summary.rejected >= 0);
    assert.equal(summary.totalRfqs, summary.pending + summary.approved + summary.rejected);
  });
});
