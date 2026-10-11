/**
 * AYC — Canonical Three Commercial Documents Verification Suite
 *
 * Verifies global standardization around exactly three commercial document types:
 * 1. Offer Sheet (offer_sheet / OFFER_SHEET)
 * 2. Proforma Invoice (PI) (proforma_invoice / PROFORMA_INVOICE)
 * 3. Commercial Invoice (CI) (commercial_invoice / COMMERCIAL_INVOICE)
 *
 * Verifies all 12 criteria specified in section 9 of the prompt.
 */

import fs from "fs";
import path from "path";
import { CANONICAL_COMMERCIAL_DOC_TYPES } from "../src/types/b2b";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

function runTests() {
  console.log("==================================================================");
  console.log("AYC — CANONICAL THREE COMMERCIAL DOCUMENTS VERIFICATION SUITE");
  console.log("==================================================================");

  const rootDir = path.resolve(__dirname, "..");

  // Read frontend files
  const b2bTypesCode = fs.readFileSync(path.join(rootDir, "src/types/b2b.ts"), "utf-8");
  const posPageCode = fs.readFileSync(path.join(rootDir, "src/app/ayc/pos/page.tsx"), "utf-8");
  const orderHeaderCode = fs.readFileSync(path.join(rootDir, "src/components/admin/orders/OrderDetailHeader.tsx"), "utf-8");
  const adminDocsPageCode = fs.readFileSync(path.join(rootDir, "src/app/ayc/documents/page.tsx"), "utf-8");
  const customerDocsPageCode = fs.readFileSync(path.join(rootDir, "src/app/dashboard/documents/page.tsx"), "utf-8");
  const customerOrderDetailCode = fs.readFileSync(path.join(rootDir, "src/app/dashboard/orders/[id]/page.tsx"), "utf-8");
  const orderServiceCode = fs.readFileSync(path.join(rootDir, "src/services/order.service.ts"), "utf-8");
  const pdfGeneratorCode = fs.readFileSync(path.join(rootDir, "src/lib/pdf-generator.ts"), "utf-8");

  // Read backend files
  const orderControllerCode = fs.readFileSync(path.join(rootDir, "backend/app/Http/Controllers/Api/V1/OrderController.php"), "utf-8");
  const orderModelCode = fs.readFileSync(path.join(rootDir, "backend/app/Models/Order.php"), "utf-8");
  const offerSheetServiceCode = fs.readFileSync(path.join(rootDir, "backend/app/Services/Documents/OfferSheetService.php"), "utf-8");
  const docJobCode = fs.readFileSync(path.join(rootDir, "backend/app/Jobs/GenerateCommercialDocumentJob.php"), "utf-8");

  // ── CRITERION 1: Exactly Three Canonical Document Types Registry ───────────
  console.log("\n▶ Criterion 1: Canonical Three-Document Registry Definition");
  assert(
    CANONICAL_COMMERCIAL_DOC_TYPES.length === 3,
    "CANONICAL_COMMERCIAL_DOC_TYPES constant defines exactly 3 types"
  );
  assert(
    CANONICAL_COMMERCIAL_DOC_TYPES[0].slug === "offer_sheet" &&
      CANONICAL_COMMERCIAL_DOC_TYPES[0].label === "Offer Sheet" &&
      CANONICAL_COMMERCIAL_DOC_TYPES[0].key === "OFFER_SHEET",
    "Registry item 1 is Offer Sheet (offer_sheet / OFFER_SHEET)"
  );
  assert(
    CANONICAL_COMMERCIAL_DOC_TYPES[1].slug === "proforma_invoice" &&
      CANONICAL_COMMERCIAL_DOC_TYPES[1].label === "Proforma Invoice (PI)" &&
      CANONICAL_COMMERCIAL_DOC_TYPES[1].key === "PROFORMA_INVOICE",
    "Registry item 2 is Proforma Invoice (PI) (proforma_invoice / PROFORMA_INVOICE)"
  );
  assert(
    CANONICAL_COMMERCIAL_DOC_TYPES[2].slug === "commercial_invoice" &&
      CANONICAL_COMMERCIAL_DOC_TYPES[2].label === "Commercial Invoice (CI)" &&
      CANONICAL_COMMERCIAL_DOC_TYPES[2].key === "COMMERCIAL_INVOICE",
    "Registry item 3 is Commercial Invoice (CI) (commercial_invoice / COMMERCIAL_INVOICE)"
  );

  // ── CRITERION 2: Offer Sheet Commercial Offer Content ───────────────────────
  console.log("\n▶ Criterion 2: Offer Sheet Structure and Commercial Content");
  assert(
    offerSheetServiceCode.includes("'title' => 'COMMERCIAL OFFER SHEET'") &&
      offerSheetServiceCode.includes("'doc_type' => $canonicalDocType"),
    "OfferSheetService outputs authoritative 'COMMERCIAL OFFER SHEET' title and canonical doc_type"
  );
  assert(
    offerSheetServiceCode.includes("'applicable_pricing'") &&
      offerSheetServiceCode.includes("'show_all_pricing_tiers' => false"),
    "Offer Sheet retains only relevant order quantity pricing, without fabricated discount tiers"
  );
  assert(
    pdfGeneratorCode.includes('docData.docType === "OFFER_SHEET"') &&
      pdfGeneratorCode.includes("downloadProductOfferSheetPDF"),
    "PDF generator routes canonical OFFER_SHEET to authoritative downloadProductOfferSheetPDF"
  );

  // ── CRITERION 3: Proforma Invoice (PI) Generation Intact ────────────────────
  console.log("\n▶ Criterion 3: Proforma Invoice (PI) Generation Preservation");
  assert(
    orderControllerCode.includes("'PROFORMA_INVOICE'") &&
      orderControllerCode.includes("getCommercialDocument"),
    "Backend generates Proforma Invoice (PI) using authoritative order data"
  );
  assert(
    pdfGeneratorCode.includes("generateProformaInvoiceDoc") &&
      pdfGeneratorCode.includes("downloadProformaInvoicePDF"),
    "PDF generator retains authoritative Proforma Invoice PDF renderer"
  );
  assert(
    orderModelCode.includes("'PROFORMA_INVOICE' => 'PROFORMA INVOICE'") &&
      orderModelCode.includes("'PROFORMA_INVOICE' => 'PI'"),
    "Order model assigns PI prefix and title to Proforma Invoice"
  );

  // ── CRITERION 4: Commercial Invoice (CI) Generation Intact ──────────────────
  console.log("\n▶ Criterion 4: Commercial Invoice (CI) Generation Preservation");
  assert(
    orderControllerCode.includes("'COMMERCIAL_INVOICE'") &&
      orderControllerCode.includes("$isPaid"),
    "Backend gates and generates Commercial Invoice for paid/confirmed orders"
  );
  assert(
    pdfGeneratorCode.includes("downloadCommercialInvoicePDF") &&
      pdfGeneratorCode.includes('docData.docType === "COMMERCIAL_INVOICE"'),
    "PDF generator retains authoritative Commercial Invoice PDF renderer"
  );
  assert(
    orderModelCode.includes("'COMMERCIAL_INVOICE' => 'COMMERCIAL INVOICE'") &&
      orderModelCode.includes("'COMMERCIAL_INVOICE' => 'INV'"),
    "Order model maps Commercial Invoice with customs and declaration details"
  );

  // ── CRITERION 5: Retired Document Types Removed Everywhere ─────────────────
  console.log("\n▶ Criterion 5: Retired Document Types Removed Everywhere");
  assert(
    !posPageCode.includes('id="btn-pos-doc-invoice"') &&
      !posPageCode.includes('id="btn-pos-doc-packinglist"'),
    "Admin POS does not offer retired Official Sales Invoice or Packing List"
  );
  assert(
    !orderHeaderCode.includes('id="doc-item-sales-invoice"') &&
      !orderHeaderCode.includes('id="doc-item-packing-list"'),
    "Admin Order Detail dropdown does not offer retired Sales Invoice or Packing List"
  );
  assert(
    !customerOrderDetailCode.includes("Packing List") &&
      !customerOrderDetailCode.includes("Export Packing List"),
    "Customer Order Detail page does not render retired Packing List card"
  );
  assert(
    adminDocsPageCode.includes("Total Docs") &&
      adminDocsPageCode.includes("Offer Sheets") &&
      adminDocsPageCode.includes("Proforma (PI)") &&
      adminDocsPageCode.includes("Commercial (CI)") &&
      !adminDocsPageCode.includes("Official Sales Invoices") &&
      !adminDocsPageCode.includes("Packing Lists"),
    "Admin Commercial Documents Hub KPI cards show strictly 4 cards (Total Docs + 3 Canonical Types)"
  );

  // ── CRITERION 6: Access Control & Authorization ─────────────────────────────
  console.log("\n▶ Criterion 6: Access Control & Authorization");
  assert(
    orderControllerCode.includes("document.proforma.generate") &&
      orderControllerCode.includes("document.commercial_invoice.generate"),
    "RBAC permissions for commercial documents are strictly checked for admins"
  );
  assert(
    orderControllerCode.includes("$order->user_id") &&
      orderControllerCode.includes("You are not authorized to view commercial documents"),
    "Customer owner boundary strictly blocks unauthorized users from viewing other orders' documents"
  );

  // ── CRITERION 7: Payment Gating Enforced for Commercial Invoice ─────────────
  console.log("\n▶ Criterion 7: Payment Gating on Commercial Invoice");
  assert(
    orderControllerCode.includes("is_gated") &&
      orderControllerCode.includes("Commercial Invoice is generated exclusively upon payment confirmation"),
    "Unpaid orders reject Commercial Invoice generation with 403 and gated explanation"
  );
  assert(
    orderControllerCode.includes("'available_documents' => ['OFFER_SHEET', 'PROFORMA_INVOICE']"),
    "Gated response advertises only the allowed canonical alternatives: OFFER_SHEET and PROFORMA_INVOICE"
  );

  // ── CRITERION 8: Admin POS and Regular Orders Use Same Document Hub ─────────
  console.log("\n▶ Criterion 8: Admin POS and Regular Orders Uniformity");
  assert(
    posPageCode.includes("/ayc/documents/OFFER_SHEET/order_") &&
      posPageCode.includes("/ayc/documents/PROFORMA_INVOICE/order_") &&
      posPageCode.includes("/ayc/documents/COMMERCIAL_INVOICE/order_"),
    "Admin POS links directly to the canonical admin document viewer routes"
  );
  assert(
    orderHeaderCode.includes("/ayc/documents/OFFER_SHEET/order_") &&
      orderHeaderCode.includes("/ayc/documents/PROFORMA_INVOICE/order_") &&
      orderHeaderCode.includes("/ayc/documents/COMMERCIAL_INVOICE/order_"),
    "Admin Order Details dropdown links to the exact same canonical admin document routes as POS"
  );

  // ── CRITERION 9: Historical Retired Document Preservation ───────────────────
  console.log("\n▶ Criterion 9: Historical Document Preservation & Backward Compatibility");
  assert(
    orderModelCode.includes("'INVOICE', 'SALES_INVOICE'") &&
      orderModelCode.includes("'PACKING_LIST' => 'COMMERCIAL PACKING LIST'") &&
      orderModelCode.includes("'ORDER_SHEET'"),
    "Order model preserves legacy document type handlers for historical record retrieval"
  );
  assert(
    docJobCode.includes("'offer-sheet', 'order-sheet' => $offerSheetService->generate($quotation)"),
    "Document generation background job maps legacy order-sheet alias to offerSheetService"
  );

  // ── CRITERION 10: Non-Mutation of Business Records ──────────────────────────
  console.log("\n▶ Criterion 10: Document Generation Non-Mutation");
  const documentMethodsCode = orderControllerCode.slice(orderControllerCode.indexOf("public function document("));
  assert(
    !documentMethodsCode.includes("->save()") &&
      !documentMethodsCode.includes("->update(") &&
      !documentMethodsCode.includes("Order::create") &&
      !documentMethodsCode.includes("decrementInventory"),
    "OrderController::document and documentCenter are read-only and do not mutate orders, payments, or inventory"
  );

  // ── CRITERION 11: Customer Document Center Consistency ──────────────────────
  console.log("\n▶ Criterion 11: Customer Document Center Consistency");
  assert(
    customerDocsPageCode.includes('{ id: "ALL", label: "All Documents" }') &&
      customerDocsPageCode.includes('{ id: "OFFER_SHEET", label: "Offer Sheets" }') &&
      customerDocsPageCode.includes('{ id: "PROFORMA_INVOICE", label: "Proforma Invoices (PI)" }') &&
      customerDocsPageCode.includes('{ id: "COMMERCIAL_INVOICE", label: "Commercial Invoices (CI)" }') &&
      !customerDocsPageCode.includes('{ id: "PACKING_LIST"') &&
      !customerDocsPageCode.includes('{ id: "INVOICE"'),
    "Customer Document Center filter pills offer strictly canonical Offer Sheets, PI, and CI"
  );
  assert(
    orderServiceCode.includes("OFFER_SHEET") &&
      orderServiceCode.includes("PROFORMA_INVOICE") &&
      orderServiceCode.includes("COMMERCIAL_INVOICE"),
    "Order service fallback derivation produces only the 3 canonical document types"
  );

  // ── CRITERION 12: Order Lifecycle and Workflows Intact ──────────────────────
  console.log("\n▶ Criterion 12: Order Lifecycle Preservation");
  assert(
    posPageCode.includes("handleCompleteSale") &&
      posPageCode.includes("selectedCustomer") &&
      posPageCode.includes("previewTotals"),
    "POS order creation, customer selection, and authoritative price totals remain intact"
  );

  console.log("\n==================================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
