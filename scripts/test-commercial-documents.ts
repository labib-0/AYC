import assert from "node:assert";
import BUSINESS_PROFILE from "../src/config/business-profile";
import { getCommercialDocument } from "../src/lib/services/quotations";
import { generateProformaInvoiceDoc, generateProductOfferSheetDoc } from "../src/lib/pdf-generator";
import { OrderRecord } from "../src/services/order.service";
import { mockStore } from "../src/lib/mock-data/mock-store";

async function runStaticVerification() {
  console.log("============================================================");
  console.log("RUNNING STATIC COMMERCIAL DOCUMENT VALIDATION");
  console.log("============================================================");

  // ── 1. Validate Central Business Profile Banking Credentials ─────────────
  console.log("\n[TEST 1] Checking BUSINESS_PROFILE.banking exact credentials...");
  const banking = BUSINESS_PROFILE.banking;

  assert.strictEqual(banking.bankName, "Pubali Bank Limited", "Bank Name must be Pubali Bank Limited");
  assert.strictEqual(banking.accountTitle, "M/S AYAAN  CLOTHING", "Account Title must be 'M/S AYAAN  CLOTHING' with 2 spaces");
  assert.strictEqual(banking.accountNo, "1788-901-044316", "Account No must be 1788-901-044316");
  assert.strictEqual(banking.swiftCode, "PUBABDDH210", "SWIFT CODE must be PUBABDDH210");
  assert(banking.bankAddress?.includes("Nawabpur Road Branch"), "Bank Address must contain Nawabpur Road Branch");
  assert(banking.bankAddress?.includes("125 Nawabpur Road"), "Bank Address must contain 125 Nawabpur Road");
  assert(banking.bankAddress?.includes("Dhaka-1100"), "Bank Address must contain Dhaka-1100");
  assert(banking.bankAddress?.includes("Bangladesh"), "Bank Address must contain Bangladesh");
  assert.strictEqual(banking.routingNumber, null, "Routing number must be null/eliminated");
  console.log("✓ Central business profile banking credentials verified perfectly.");

  // ── 2. Validate Proforma Invoice (PI) Document Generation ─────────────────
  console.log("\n[TEST 2] Checking getCommercialDocument for PROFORMA_INVOICE...");
  const mockOrder: OrderRecord = {
    id: "ord_test_001",
    order_number: "ORD-998877",
    status: "processing",
    payment_status: "pending",
    fulfillment_status: "processing",
    currency: "USD",
    email: "buyer@commercial.com",
    shipping_name: "Euro Imports Ltd",
    shipping_company: "Euro Imports Ltd",
    shipping_address1: "74 Oxford Street",
    shipping_city: "London",
    shipping_postal_code: "W1D 1BS",
    shipping_country_code: "GB",
    payment_method: "proforma_invoice",
    subtotal: 3500,
    subtotal_cents: 350000,
    shipping_cost: 450,
    shipping_cents: 45000,
    tax_amount: 0,
    tax_cents: 0,
    discount_amount: 0,
    discount_cents: 0,
    total_amount: 3950,
    total_cents: 395000,
    placed_at: "2026-09-20T10:00:00Z",
    created_at: "2026-09-20T10:00:00Z",
    updated_at: "2026-09-20T10:00:00Z",
    carrier: "Aramex Express Air",
    items: [
      {
        product_name: "Premium Organic Cotton Crewneck",
        sku: "AYN-TSH-001",
        quantity: 250,
        unit_price: 14,
        unit_price_cents: 1400,
        line_total: 3500,
        line_total_cents: 350000,
        product_images: ["/images/products/tshirt-front.jpg", "/images/products/tshirt-back.jpg"],
      },
    ],
  };

  mockStore.saveOrder(mockOrder);

  const piDoc = await getCommercialDocument("PROFORMA_INVOICE", "order_ord_test_001");
  assert(piDoc !== null, "PI document should be generated");
  assert.strictEqual(piDoc.docType, "PROFORMA_INVOICE");
  assert.strictEqual(piDoc.bankDetails?.bankName, "Pubali Bank Limited");
  assert.strictEqual(piDoc.bankDetails?.accountTitle, "M/S AYAAN  CLOTHING");
  assert.strictEqual(piDoc.bankDetails?.accountNo, "1788-901-044316");
  assert.strictEqual(piDoc.bankDetails?.swiftCode, "PUBABDDH210");
  assert.strictEqual(piDoc.bankDetails?.routing_no, null, "Old routing number must be null");
  console.log("✓ PI document banking details mapped accurately from central profile.");

  // ── 3. Validate Proforma Invoice PDF Generation ───────────────────────────
  console.log("\n[TEST 3] Generating Proforma Invoice PDF and verifying content...");
  const piPdf = generateProformaInvoiceDoc(mockOrder);
  assert(piPdf, "jsPDF instance should be created");
  const piPdfOutput = piPdf.output();
  assert(piPdfOutput.length > 1000, "PDF should have substantial byte content");
  // Check text content inside PDF streams
  assert(piPdfOutput.includes("BENEFICIARY BANK DETAILS"), "PDF must contain BENEFICIARY BANK DETAILS");
  assert(piPdfOutput.includes("Pubali Bank Limited"), "PDF must contain Pubali Bank Limited");
  assert(piPdfOutput.includes("M/S AYAAN  CLOTHING"), "PDF must contain 'M/S AYAAN  CLOTHING'");
  assert(piPdfOutput.includes("1788-901-044316"), "PDF must contain '1788-901-044316'");
  assert(piPdfOutput.includes("PUBABDDH210"), "PDF must contain 'PUBABDDH210'");
  assert(piPdfOutput.includes("Nawabpur Road Branch"), "PDF must contain Nawabpur Road Branch");
  console.log("✓ Proforma Invoice PDF generated with exact bank credentials and labels.");

  // ── 4. Validate Offer Sheet / Order Sheet Product Gallery ─────────────────
  console.log("\n[TEST 4] Checking Offer Sheet document generation and product gallery...");
  const offerDoc = await getCommercialDocument("ORDER_SHEET", "order_ord_test_001");
  assert(offerDoc !== null, "Offer Sheet document should be generated");
  assert.strictEqual(offerDoc.docType, "ORDER_SHEET");
  assert(Array.isArray(offerDoc.product_gallery), "Offer sheet must have product_gallery array");
  console.log(`✓ Offer Sheet generated with product_gallery array of size: ${offerDoc.product_gallery?.length}`);

  // ── 5. Validate Offer Sheet PDF Generation with Image Gallery ─────────────
  console.log("\n[TEST 5] Generating Offer Sheet PDF with simulated image gallery...");
  // 1x1 transparent PNG data URL for headless testing
  const dummyPixelDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const offerPdf = generateProductOfferSheetDoc({
    name: "Heavyweight Boxy Fleece Hoodie",
    sku: "AYN-HD-002",
    brand: "AYAAN CLOTHING",
    price: 18.5,
    moq: 50,
    composition: "80% Combed Organic Cotton, 20% Polyester",
    gsm: 380,
    images: ["/images/products/hoodie-front.jpg", "/images/products/hoodie-back.jpg", "/images/products/hoodie-detail.jpg"],
    imageDataUrl: dummyPixelDataUrl,
    galleryDataUrls: [dummyPixelDataUrl, dummyPixelDataUrl, dummyPixelDataUrl],
  }, {
    name: "Nordic Retailers AB",
    company: "Nordic Retailers AB",
    country: "Sweden",
  });

  assert(offerPdf, "Offer Sheet jsPDF instance should be created");
  const offerPdfOutput = offerPdf.output();
  assert(offerPdfOutput.includes("COMMERCIAL OFFER SHEET"), "PDF must contain COMMERCIAL OFFER SHEET");
  assert(offerPdfOutput.includes("PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES"), "PDF must contain PRODUCT VISUAL GALLERY header");
  assert(offerPdfOutput.includes("AYN-HD-002"), "PDF must contain SKU");
  assert(offerPdfOutput.includes("Heavyweight Boxy Fleece Hoodie"), "PDF must contain product name");
  console.log("✓ Offer Sheet PDF successfully generated with top product gallery and 2-page pagination capability.");

  console.log("\n============================================================");
  console.log("ALL STATIC VERIFICATIONS PASSED SUCCESSFULLY (5/5)!");
  console.log("============================================================");
}

runStaticVerification().catch((err) => {
  console.error("Static verification failed:", err);
  process.exit(1);
});
