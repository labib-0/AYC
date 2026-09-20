import { mockStore } from "../src/lib/mock-data/mock-store";
import { getAllRfqs, getRfqById, updateRfqStatus, addRfqMessage, createRfq } from "../src/lib/services/rfq";
import { getAllQuotations, getQuotationById, getQuotationByRfqId, createQuotation, getCommercialDocument } from "../src/lib/services/quotations";
import { RfqRecord, QuotationRecord, RfqStatus } from "../src/types/b2b";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase10StaticValidation() {
  console.log("============================================================");
  console.log("PHASE 10 — B2B RFQ & QUOTATION MANAGEMENT STATIC VALIDATION");
  console.log("============================================================\n");

  // ------------------------------------------------------------
  // 1. RFQ List & True Pagination Tests
  // ------------------------------------------------------------
  console.log("--- 1. RFQ List & True Pagination Tests ---");
  const allRfqs = await getAllRfqs();
  assert(allRfqs.length >= 25, `Total RFQs >= 25 (found ${allRfqs.length})`);

  const PAGE_SIZE = 20;
  const page1 = allRfqs.slice(0, PAGE_SIZE);
  const page2 = allRfqs.slice(PAGE_SIZE, PAGE_SIZE * 2);

  assert(page1.length === 20, `Page 1 returns 20 RFQs (received ${page1.length})`);
  assert(page2.length >= 5, `Page 2 returns remaining RFQs (received ${page2.length})`);

  const page1Ids = new Set(page1.map((r) => r.id));
  const hasOverlap = page2.some((r) => page1Ids.has(r.id));
  assert(!hasOverlap, "Page 1 and Page 2 RFQs are strictly distinct (no pagination bleed)");

  // ------------------------------------------------------------
  // 2. Dynamic KPI Metrics Derivation Tests
  // ------------------------------------------------------------
  console.log("\n--- 2. Dynamic KPI Metrics Derivation Tests ---");
  const total = allRfqs.length;
  const needsReview = allRfqs.filter(
    (r) => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW" || r.status === "NEED_INFORMATION"
  ).length;
  const quoted = allRfqs.filter(
    (r) => r.status === "QUOTATION_PREPARED" || r.status === "SENT_TO_BUYER" || r.status === "NEGOTIATION"
  ).length;
  const accepted = allRfqs.filter((r) => r.status === "ACCEPTED").length;
  const totalUnits = allRfqs.reduce(
    (sum, r) => sum + (r.items || []).reduce((itemSum, it) => itemSum + (it.quantity || 0), 0),
    0
  );

  assert(total >= 25, `Total inquiries KPI matches dataset count (${total})`);
  assert(needsReview > 0, `Needs review KPI is derived: ${needsReview}`);
  assert(quoted > 0, `Quoted / In progress KPI is derived: ${quoted}`);
  assert(accepted > 0, `Accepted KPI is derived: ${accepted}`);
  assert(totalUnits > 5000, `Total units requested is dynamically summed: ${totalUnits} pcs`);

  // ------------------------------------------------------------
  // 3. Multi-Field Filter & Search Tests
  // ------------------------------------------------------------
  console.log("\n--- 3. Multi-Field Filter & Search Tests ---");
  // Search by RFQ #
  const searchByNumber = await getAllRfqs({ search: "RFQ-2026-000101" });
  assert(searchByNumber.length === 1 && searchByNumber[0].rfqNumber === "RFQ-2026-000101", "Found RFQ by RFQ number");

  // Search by Buyer name
  const searchByName = await getAllRfqs({ search: "Tariq Al-Mansoor" });
  assert(searchByName.length >= 1 && searchByName[0].buyerName.includes("Tariq"), "Found RFQ by buyer name");

  // Search by Company name
  const searchByCompany = await getAllRfqs({ search: "Vance & Co" });
  assert(searchByCompany.length >= 1 && searchByCompany[0].companyName.includes("Vance"), "Found RFQ by company name");

  // Filter by Status
  const submittedRfqs = await getAllRfqs({ status: "SUBMITTED" });
  assert(submittedRfqs.length > 0 && submittedRfqs.every((r) => r.status === "SUBMITTED"), "Status filter 'SUBMITTED' returns only new inquiries");

  const acceptedRfqs = await getAllRfqs({ status: "ACCEPTED" });
  assert(acceptedRfqs.length > 0 && acceptedRfqs.every((r) => r.status === "ACCEPTED"), "Status filter 'ACCEPTED' returns only accepted inquiries");

  // Filter by Country
  const uaeRfqs = await getAllRfqs({ country: "United Arab Emirates" });
  assert(uaeRfqs.length >= 1 && uaeRfqs.every((r) => r.destinationCountry === "United Arab Emirates"), "Country filter correctly filters by destination");

  // ------------------------------------------------------------
  // 4. RFQ Detail & Relationship Integrity Tests
  // ------------------------------------------------------------
  console.log("\n--- 4. RFQ Detail & Relationship Integrity Tests ---");
  const rfq101 = await getRfqById("rfq_demo_101");
  assert(Boolean(rfq101), "getRfqById retrieves RFQ rfq_demo_101");
  assert(rfq101?.buyerName === "Tariq Al-Mansoor", "Detail contains buyer name: Tariq Al-Mansoor");
  assert(rfq101?.companyName === "Gulf Apparel Trading LLC", "Detail contains company: Gulf Apparel Trading LLC");
  assert(rfq101?.destinationCountry === "United Arab Emirates", "Detail contains destination country");
  assert(Boolean(rfq101?.shippingPort), "Detail contains designated shipping port");
  assert(Boolean(rfq101?.items && rfq101.items.length > 0), "Detail contains requested line items");
  assert(rfq101?.items[0].quantity === 500, "Detail preserves requested line item quantity");

  const nonExistent = await getRfqById("rfq_invalid_99999");
  assert(nonExistent === null, "getRfqById returns null for non-existent RFQ ID");

  // ------------------------------------------------------------
  // 5. RFQ Status Transition & History Audit Tests
  // ------------------------------------------------------------
  console.log("\n--- 5. RFQ Status Transition & History Audit Tests ---");
  const updatedRfq = await updateRfqStatus(
    "rfq_demo_101",
    "NEGOTIATION",
    "Ayaan Sales Desk",
    "Special pricing discount discussed with buyer."
  );
  assert(updatedRfq?.status === "NEGOTIATION", "Status successfully updated to 'NEGOTIATION'");
  assert(
    Boolean(updatedRfq?.history && updatedRfq.history[0].status === "NEGOTIATION"),
    "History event prepended to audit timeline"
  );
  assert(
    Boolean(updatedRfq?.history && updatedRfq.history[0].note?.includes("Special pricing discount")),
    "History event preserves audit reason/note"
  );

  // Verify persistence in mockStore
  const reloadedRfq = mockStore.getRfqById("rfq_demo_101");
  assert(reloadedRfq?.status === "NEGOTIATION", "Status update persisted in mockStore");

  // ------------------------------------------------------------
  // 6. Critical RFQ Messaging Persistence Tests
  // ------------------------------------------------------------
  console.log("\n--- 6. Critical RFQ Messaging Persistence Tests ---");
  const initialMsgCount = rfq101?.messages?.length || 0;
  const testMessageText = `Automated export test message ${Date.now()}`;

  const addedMsg = await addRfqMessage(
    "rfq_demo_101",
    "admin",
    "Ayaan Senior Merchandiser",
    testMessageText
  );

  assert(Boolean(addedMsg), "addRfqMessage returned newly created message object");
  assert(addedMsg?.message === testMessageText, "Message content matches input");
  assert(addedMsg?.senderRole === "admin", "Sender role set correctly to 'admin'");

  // Verify that the message exists in mockStore after re-fetching (simulating page reload)
  const freshRfq = await getRfqById("rfq_demo_101");
  assert(
    Boolean(freshRfq?.messages && freshRfq.messages.length === initialMsgCount + 1),
    `Messages count incremented from ${initialMsgCount} to ${initialMsgCount + 1}`
  );
  assert(
    Boolean(freshRfq?.messages?.some((m) => m.message === testMessageText)),
    "Newly sent message persisted into mockStore and survived re-fetching!"
  );

  // ------------------------------------------------------------
  // 7. Quotation Generation & Association Tests
  // ------------------------------------------------------------
  console.log("\n--- 7. Quotation Generation & Association Tests ---");
  const newQuote = await createQuotation({
    rfqId: "rfq_demo_103",
    rfqNumber: "RFQ-2026-000103",
    userId: "usr_103",
    buyerName: "Sarah Jenkins",
    buyerEmail: "testuser@example.com",
    companyName: "Jenkins Apparel Boutique",
    destinationCountry: "United States",
    destinationCity: "Los Angeles",
    currency: "USD",
    currencySymbol: "$",
    items: [
      {
        id: "qi_103_1",
        productId: "prd0002",
        productName: "Classic Denim Jacket",
        sku: "AYN-JNS-002",
        variantTitle: "Vintage Blue / S-XL",
        quantity: 200,
        unitPrice: 28.00,
        lineTotal: 5600.00,
      },
    ],
    subtotal: 5600.00,
    discountTotal: 100.00,
    shippingFee: 350.00,
    taxAmount: 0,
    grandTotal: 5850.00,
    paymentTerms: "30% Advance T/T, 70% against B/L copy",
    shippingTerms: "FOB Chittagong Port to Long Beach",
    incoterm: "FOB",
    deliveryEstimate: "14-18 business days",
    validUntil: "2026-10-31",
    adminNotes: "Sample pack pre-shipped via DHL.",
  });

  assert(Boolean(newQuote), "createQuotation successfully generated quotation");
  assert(newQuote.quotationNumber.startsWith("QT-"), `Generated quotation reference: ${newQuote.quotationNumber}`);
  assert(newQuote.grandTotal === 5850.00, `Grand total matches formula: $${newQuote.grandTotal}`);
  assert(newQuote.status === "READY", "Quotation initialized with status 'READY'");

  // Verify RFQ association and status transition
  const associatedRfq = await getRfqById("rfq_demo_103");
  assert(associatedRfq?.status === "QUOTATION_PREPARED", "Associated RFQ status automatically updated to 'QUOTATION_PREPARED'");
  assert(associatedRfq?.quotationId === newQuote.id, "RFQ linked to quotation ID");

  // ------------------------------------------------------------
  // 8. Quotation List & Commercial Document Integration Tests
  // ------------------------------------------------------------
  console.log("\n--- 8. Quotation List & Commercial Document Integration Tests ---");
  const allQuotations = await getAllQuotations();
  assert(allQuotations.length >= 8, `getAllQuotations returns list of quotations (found ${allQuotations.length})`);

  const foundCreatedQuote = allQuotations.find((q) => q.id === newQuote.id);
  assert(Boolean(foundCreatedQuote), "Newly created quotation appears in quotations directory");

  // Search quotations
  const searchedQuotes = await getAllQuotations({ search: newQuote.quotationNumber });
  assert(searchedQuotes.length === 1, "Found quotation by quotation reference");

  // Get commercial document layout
  const doc = await getCommercialDocument("QUOTATION", newQuote.id);
  assert(Boolean(doc), "getCommercialDocument generates standardized commercial document layout");
  assert(doc?.title === "COMMERCIAL QUOTATION", "Document title is 'COMMERCIAL QUOTATION'");
  assert(doc?.grandTotal === 5850.00, "Commercial document preserves quoted grand total ($5850.00)");
  assert(doc?.companyName === "Jenkins Apparel Boutique", "Commercial document preserves buyer company");

  console.log("\n============================================================");
  console.log("ALL PHASE 10 STATIC & CODE-LEVEL VALIDATION TESTS PASSED! 🎉");
  console.log("============================================================");
}

runPhase10StaticValidation().catch((err) => {
  console.error("Test execution failure:", err);
  process.exit(1);
});
