# DOCUMENT INFORMATION AUDIT & REUSABLE BUSINESS CONTROL MATRIX
**Ayaan Clothing — Commercial Documents & Business Information Control Center**
**Document Reference**: `DOCUMENT_INFORMATION_AUDIT.md`
**Status**: Authoritative Phase 1 Audit & Architecture Specification
**Date**: October 6, 2026

---

## 1. Executive Summary & Existing Document Architecture Audit

Ayaan Clothing produces and distributes several key commercial, customer-facing, and export trade documents:
1. **Commercial Invoice (CI)**: Official customs clearance, export accounting, and commercial settlement document (`INV-YYYY-XXXXXX`).
2. **Proforma Invoice (PI)**: Pre-shipment agreement, payment requisition against beneficiary bank wire details, and import permit document (`PI-YYYY-XXXXXX`).
3. **Offer Sheet**: Product visual catalog, quote presentation, and FOB manufacturing offer (`ORD-YYYY-XXXXXX` or quotation number).
4. **Sales Invoice**: Standard commercial order sales receipt and transaction record.
5. **Quotation / RFQ**: Commercial quotation, RFQ response, and delivery chalan.

### Existing Architecture Findings:
- **Backend Services**: Located in `backend/app/Services/Documents/`:
  - `CommercialInvoiceService.php`
  - `ProformaInvoiceService.php`
  - `OfferSheetService.php`
  - `InvoiceService.php`
  - `DocumentHelper.php`
  - `DocumentPdfService.php` (vector PDF renderer using standard PDF-1.4 stream)
- **Frontend Components**: Located in `src/components/admin/documents/`:
  - `CommercialInvoiceDocument.tsx`
  - `ProformaInvoiceDocument.tsx`
  - `OfferSheetDocument.tsx`
  - `QuotationDocument.tsx`
  - `BeneficiaryBankDetails.tsx`
  - `DocumentHeader.tsx`
  - `DocumentSignatory.tsx`
  - `src/lib/pdf-generator.ts` (client-side jsPDF generator for downloads)
- **Previous Duplication / Inconsistency Issues Identified**:
  - Exporter profile details were spread between `config/business.php`, `DocumentHelper.php`, `Order.php`, and frontend `business-profile.ts`.
  - Banking credentials (Pubali Bank Limited wire instructions) were hardcoded in multiple files (`DocumentHelper.php`, `BeneficiaryBankDetails.tsx`, `pdf-generator.ts`) and displayed as read-only / un-editable in the Admin UI.
  - Document defaults (Incoterms, loading ports, declaration notes, signatories) were hardcoded across templates without an Admin interface to configure them.
  - WhatsApp contact number was previously defined in multiple disparate places before Phase G unification.

---

## 2. Document Information Matrix

The following matrix documents **every single information field** discovered across the existing document generation implementations.

| Field Name | CI | PI | Offer Sheet | Invoice | Quotation | Current Source | Type / Scope | Admin Editable (Prior) | Centralized (Phase 1) |
|---|:---:|:---:|:---:|:---:|:---:|---|---|:---:|:---:|
| **Company Name** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` / `DocumentHelper` | Company Master | ❌ Hardcoded/Config | ✅ Yes (`company_name`) |
| **Legal / Beneficiary Name** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` | Company Master | ❌ Hardcoded | ✅ Yes (`company_legal_name`) |
| **Brand Mark (AYC)** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` | Company Master | ❌ Hardcoded | ✅ Yes (`company_brand_mark`) |
| **Business Type / Tagline** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` | Company Master | ❌ Hardcoded | ✅ Yes (`company_business_type`) |
| **Established Year** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` (2010) | Company Master | ❌ Hardcoded | ✅ Yes (`company_established_year`) |
| **Company Logo** | ✅ | ✅ | ✅ | ✅ | ✅ | `SystemSetting` (`site_logo`) | Company Master | ✅ Yes | ✅ Yes (Connected) |
| **Office Address Line 1** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` | Company Contact | ❌ Mock only | ✅ Yes (`office_address_line1`) |
| **Office Address Line 2** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` | Company Contact | ❌ Mock only | ✅ Yes (`office_address_line2`) |
| **Office Area / District** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` (Uttara) | Company Contact | ❌ Mock only | ✅ Yes (`office_area`) |
| **Office City** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` (Dhaka) | Company Contact | ❌ Mock only | ✅ Yes (`office_city`) |
| **Postal Code** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` (1230) | Company Contact | ❌ Mock only | ✅ Yes (`office_postal_code`) |
| **Country & Code** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` (BD) | Company Contact | ❌ Mock only | ✅ Yes (`office_country`) |
| **Official Phone** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` | Company Contact | ❌ Mock only | ✅ Yes (`business_phone`) |
| **Official Export Email** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` | Company Contact | ❌ Mock only | ✅ Yes (`business_email`) |
| **Official Website** | ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` | Company Contact | ❌ Mock only | ✅ Yes (`business_website`) |
| **Authoritative WhatsApp** | ✅ | ✅ | ✅ | ✅ | ✅ | `SystemSetting` / `business-profile` | Company Contact | ✅ Yes | ✅ Yes (`whatsapp_display` & `number`) |
| **Trade License / Reg No.** | ✅ | ✅ | ➖ | ✅ | ➖ | `config/business.php` (`BUSINESS_REG_NUMBER`) | Legal / Export | ❌ Env only | ✅ Yes (`reg_number`) |
| **TIN Number** | ✅ | ✅ | ➖ | ✅ | ➖ | `config/business.php` (`BUSINESS_TIN_NUMBER`) | Legal / Export | ❌ Env only | ✅ Yes (`tin_number`) |
| **BIN Number** | ✅ | ✅ | ➖ | ✅ | ➖ | `config/business.php` (`BUSINESS_BIN_NUMBER`) | Legal / Export | ❌ Env only | ✅ Yes (`bin_number`) |
| **VAT Registration** | ✅ | ✅ | ➖ | ✅ | ➖ | `config/business.php` (`BUSINESS_VAT_NUMBER`) | Legal / Export | ❌ Env only | ✅ Yes (`vat_number`) |
| **BGMEA Registration** | ✅ | ✅ | ➖ | ✅ | ➖ | `config/business.php` (`BUSINESS_BGMEA_REG`) | Legal / Export | ❌ Env only | ✅ Yes (`bgmea_reg`) |
| **Bank Name** | ✅ | ✅ | ➖ | ✅ | ➖ | `DocumentHelper` ('Pubali Bank Limited') | Banking Master | ❌ Hardcoded | ✅ Yes (`bank_name`) |
| **Account Title** | ✅ | ✅ | ➖ | ✅ | ➖ | `DocumentHelper` ('M/S AYAAN  CLOTHING')| Banking Master | ❌ Hardcoded | ✅ Yes (`bank_account_title`) |
| **Beneficiary Name** | ✅ | ✅ | ➖ | ✅ | ➖ | `DocumentHelper` ('M/S AYAAN  CLOTHING')| Banking Master | ❌ Hardcoded | ✅ Yes (`bank_beneficiary_name`) |
| **Account Number / No** | ✅ | ✅ | ➖ | ✅ | ➖ | `DocumentHelper` ('1788-901-044316') | Banking Master | ❌ Hardcoded | ✅ Yes (`bank_account_number`) |
| **SWIFT Code** | ✅ | ✅ | ➖ | ✅ | ➖ | `DocumentHelper` ('PUBABDDH210') | Banking Master | ❌ Hardcoded | ✅ Yes (`bank_swift_code`) |
| **Bank Branch** | ✅ | ✅ | ➖ | ✅ | ➖ | `DocumentHelper` ('Nawabpur Road') | Banking Master | ❌ Hardcoded | ✅ Yes (`bank_branch`) |
| **Bank Branch Address** | ✅ | ✅ | ➖ | ✅ | ➖ | `DocumentHelper` (125 Nawabpur Road) | Banking Master | ❌ Hardcoded | ✅ Yes (`bank_address`) |
| **Bank Is Configured** | ✅ | ✅ | ➖ | ✅ | ➖ | `config/business.php` | Banking Master | ❌ Hardcoded | ✅ Yes (`bank_is_configured`) |
| **Default Country of Origin**| ✅ | ✅ | ✅ | ✅ | ✅ | `config/business.php` ('Bangladesh') | Document Default | ❌ Hardcoded | ✅ Yes (`default_country_of_origin`) |
| **Air Port of Loading** | ✅ | ✅ | ➖ | ➖ | ✅ | `config/business.php` (DAC Dhaka) | Document Default | ❌ Hardcoded | ✅ Yes (`default_air_port_of_loading`) |
| **Sea Port of Loading** | ✅ | ✅ | ➖ | ➖ | ➖ | `config/business.php` (CGP Chattogram) | Document Default | ❌ Hardcoded | ✅ Yes (`default_sea_port_of_loading`) |
| **Place of Receipt** | ✅ | ✅ | ➖ | ➖ | ➖ | `config/business.php` (Uttara Hub) | Document Default | ❌ Hardcoded | ✅ Yes (`default_place_of_receipt`) |
| **Default Incoterm** | ✅ | ✅ | ✅ | ➖ | ✅ | Template / Service (`DAP`, `FOB`) | Document Default | ❌ Hardcoded | ✅ Yes (`default_incoterm`) |
| **Default Payment Terms** | ✅ | ✅ | ✅ | ➖ | ✅ | Template / Order match | Document Default | ❌ Hardcoded | ✅ Yes (`default_payment_terms`) |
| **Default Shipping Terms** | ✅ | ✅ | ✅ | ➖ | ➖ | Template / Service | Document Default | ❌ Hardcoded | ✅ Yes (`default_shipping_terms`) |
| **CI Declaration Notes** | ✅ | ➖ | ➖ | ➖ | ➖ | `CommercialInvoiceService` | Document Default | ❌ Hardcoded | ✅ Yes (`default_ci_notes`) |
| **PI Commercial Terms Notes**| ➖ | ✅ | ➖ | ➖ | ➖ | `ProformaInvoiceService` | Document Default | ❌ Hardcoded | ✅ Yes (`default_pi_notes`) |
| **Offer Sheet Notes** | ➖ | ➖ | ✅ | ➖ | ➖ | `OfferSheetService` | Document Default | ❌ Hardcoded | ✅ Yes (`default_offer_sheet_notes`) |
| **Quotation Notes** | ➖ | ➖ | ➖ | ➖ | ✅ | `QuotationDocument.tsx` | Document Default | ❌ Hardcoded | ✅ Yes (`default_quotation_notes`) |
| **Signatory Title** | ✅ | ✅ | ✅ | ✅ | ✅ | `DocumentSignatory.tsx` | Document Default | ❌ Hardcoded | ✅ Yes (`signatory_title`) |
| **Signatory Division** | ✅ | ✅ | ✅ | ✅ | ✅ | `DocumentSignatory.tsx` | Document Default | ❌ Hardcoded | ✅ Yes (`signatory_division`) |
| **Buyer Company Name** | ✅ | ✅ | ✅ | ✅ | ✅ | `Order` / `Quotation` record | Customer/Order | Dynamic | ❌ No (Order-Derived) |
| **Buyer Attn / Name** | ✅ | ✅ | ✅ | ✅ | ✅ | `Order` / `Quotation` record | Customer/Order | Dynamic | ❌ No (Order-Derived) |
| **Buyer Address & City** | ✅ | ✅ | ✅ | ✅ | ✅ | `Order` / `Quotation` record | Customer/Order | Dynamic | ❌ No (Order-Derived) |
| **Buyer Country & Code** | ✅ | ✅ | ✅ | ✅ | ✅ | `Order` / `Quotation` record | Customer/Order | Dynamic | ❌ No (Order-Derived) |
| **Buyer Contact Phone/Email**| ✅ | ✅ | ✅ | ✅ | ✅ | `Order` / `Quotation` record | Customer/Order | Dynamic | ❌ No (Order-Derived) |
| **Doc Number (INV/PI/ORD)** | ✅ | ✅ | ✅ | ✅ | ✅ | Generated algorithmically from order | Document System | Dynamic | ❌ No (System Generated) |
| **Doc Issue & Expiry Dates**| ✅ | ✅ | ✅ | ✅ | ✅ | Order timestamp + 30 days | Document System | Dynamic | ❌ No (System Generated) |
| **Goods Items & HS Codes** | ✅ | ✅ | ✅ | ✅ | ✅ | `order_items` / `products` | Order Items | Dynamic | ❌ No (Order-Derived) |
| **Package Matrix Breakdown**| ✅ | ✅ | ✅ | ✅ | ✅ | `order_items.package_breakdown` | Order Items | Dynamic | ❌ No (Order-Derived) |
| **Order Subtotal & Totals** | ✅ | ✅ | ✅ | ✅ | ✅ | `order.subtotal`, `total_amount` | Financials | Dynamic | ❌ No (Order-Derived) |
| **Amount in Words (USD)** | ✅ | ✅ | ➖ | ✅ | ➖ | `DocumentHelper::numberToWords` | Algorithm | Dynamic | ❌ No (Algorithm-Derived) |
| **Carton Count, Weight, CBM**| ✅ | ✅ | ➖ | ➖ | ➖ | `order.shipping_snapshot` | Logistics Snapshot | Dynamic | ❌ No (Shipment-Derived) |
| **Carrier & Tracking (AWB)** | ✅ | ✅ | ➖ | ➖ | ➖ | `order.shipping_snapshot` / tracking | Shipment Specific | Dynamic | ❌ No (Shipment-Derived) |

---

## 3. Categorization of Information

### A. Company Master Data (Centralized Global Source of Truth)
- Company Name (`AYAAN CLOTHING`)
- Legal / Beneficiary Name (`M/S AYAAN  CLOTHING`)
- Brand Mark (`AYC`)
- Business Type / Tagline (`Ready-made Garments Manufacturer & Exporter`)
- Established Year (`2010`)
- Website Logo (`site_logo` in `system_settings`)

### B. Business Contact Data (Centralized Global Source of Truth)
- Physical Office Address: Line 1, Line 2, Area, City, Postal Code, Country, Country Code
- Export Telephone
- Export Email (`export@ayaanclothing.com`)
- Corporate Website (`www.ayaanclothing.com`)
- Authoritative WhatsApp Number: Display `+880 1620-853502`, Machine `8801620853502`, URL `https://wa.me/8801620853502`

### C. Export / Business Registration Data (Centralized Global Source of Truth)
- Registration Number / Trade License
- Tax Identification Number (TIN)
- Business Identification Number (BIN)
- Value Added Tax (VAT) Number
- BGMEA Associate Membership Number

### D. Beneficiary Bank Wire Details (Centralized Protected Admin Settings)
- Bank Name (`Pubali Bank Limited`)
- Account Title (`M/S AYAAN  CLOTHING`)
- Beneficiary Name (`M/S AYAAN  CLOTHING`)
- Account Number (`1788-901-044316`)
- SWIFT Code (`PUBABDDH210`)
- Bank Branch (`Nawabpur Road Branch`)
- Bank Address (`Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh`)
- Is Configured (boolean toggle)

### E. Document & Logistics Defaults (Centralized Global Defaults)
- Default Country of Origin (`Bangladesh`)
- Default Air Port of Loading (`Hazrat Shahjalal International Airport (DAC), Dhaka`)
- Default Sea Port of Loading (`Chattogram Sea Port (CGP), Bangladesh`)
- Default Place of Receipt (`Uttara Corporate Office / Dhaka Hub, Bangladesh`)
- Default Currency (`USD`)
- Default Payment Terms (`Bank Wire Transfer (T/T Advance)`)
- Default Shipping Terms (`Express Air Freight (DAP / DDP)`)
- Default Incoterm (`DAP`)
- Document Notes: Commercial Invoice Notes, Proforma Invoice Notes, Offer Sheet Notes, Quotation Notes
- Signatory Title (`Authorized Signatory & Official Stamp`)
- Signatory Division (`Ayaan Clothing Export Division`)

### F. Dynamic Customer / Order / Document Specific Data (Intentionally NOT Centralized)
- Customer / Buyer Name, Company, Email, Phone, Shipping Address
- Order Numbers, Quotation Numbers, Document Numbers, Issue Dates, Expiry Dates
- Product Lines, SKUs, HS Codes, Quantities, Unit Prices, Line Totals, Assorted Size/Color Breakdowns
- Financial Subtotals, Coupons, Discounts, Taxes, Shipping Charges, Total Payable
- Carton Counts, Gross Weights, Net Weights, CBM Volumes, Tracking Numbers (AWB)

---

## 4. Banking Information Security & Storefront Boundary

> [!IMPORTANT]
> **Zero Public Exposure of Private Banking Credentials**:
> The public storefront endpoint `GET /api/v1/settings/public` serves ONLY public brand and contact info (`company_name`, `office_address`, `phone`, `email`, `website`, `whatsapp`, `social_links`, `site_logo`, `site_title`).
> Under NO circumstances are beneficiary bank account numbers, SWIFT codes, branch addresses, or tax registration credentials exposed to unauthorized/guest storefront visitors.
> Bank details are served exclusively through authorized Admin Settings endpoints (`/api/v1/admin/settings/business` guarded by `settings.view` and `settings.edit`) and embedded into authentic buyer commercial documents (`Order::getCommercialDocument` for authenticated order holders).

---

## 5. Hardcoded Information Inventory & Resolution

1. **Pubali Bank Credentials**:
   - *Previous state*: Hardcoded in `DocumentHelper::getBankDetails()`, `BeneficiaryBankDetails.tsx`, and `pdf-generator.ts`.
   - *Phase 1 resolution*: Centralized into `SystemSetting` (`bank_name`, `bank_account_number`, `bank_swift_code`, `bank_branch`, `bank_address`). `DocumentHelper` reads dynamically from `SystemSetting` with fallback to `config/business.banking`.
2. **Exporter Profile & Address**:
   - *Previous state*: Read solely from static config `config/business.php`.
   - *Phase 1 resolution*: Centralized into `SystemSetting` (`company_name`, `office_address_*`, `business_phone`, `business_email`, `business_website`).
3. **WhatsApp Business Number**:
   - *Authoritative Setting*: Centralized in `whatsapp_display` (`+880 1620-853502`), `whatsapp_number` (`8801620853502`), and `whatsapp_business_number`.
4. **Document Signatory & Notes**:
   - *Previous state*: Hardcoded in React document components.
   - *Phase 1 resolution*: Admin-configurable defaults stored in `system_settings` (`signatory_title`, `signatory_division`, `default_*_notes`).

---

## 6. Future Phase Roadmaps

- **Phase 2 (Connect Business Settings to Documents + Global WhatsApp)**:
  - COMPLETED. See detailed implementation section below.
- **Phase 3 (Multi-Bank & Multi-Currency Profiles)**:
  - If required in future export expansions, support secondary bank accounts (e.g. specialized LC issuing bank vs TT wire bank) and secondary currency accounts (EUR, GBP).

---

## 5. Phase 2 Implementation: Dynamic Document Resolution & Authoritative WhatsApp

Phase 2 establishes end-to-end integration between centralized Admin settings (`SystemSetting`) and all 5 commercial document generators, both on the Laravel backend and client-side Next.js viewer / PDF export engine.

### A. Connected Document Generators
1. **Commercial Invoice (CI)**:
   - Backend: `CommercialInvoiceService.php` (`generateForOrder`, `generateForQuotation`) dynamically injects `$exporter` (`DocumentHelper::getExporterProfile()`), `$bankDetails` (`DocumentHelper::getBankDetails()`), and `$docDefaults` (`DocumentHelper::getDocumentDefaults()`).
   - Frontend: `CommercialInvoiceDocument.tsx` passes `exporterProfile={doc.exporter}` and `bankDetails={doc.bankDetails || (doc as any).bank_details}`.
   - Client PDF: `pdf-generator.ts` (`generateCommercialInvoiceDoc`) renders dynamic exporter profile and verified payment / wire bank parameters.
2. **Proforma Invoice (PI)**:
   - Backend: `ProformaInvoiceService.php` (`generateForOrder`, `generateForQuotation`) injects dynamic exporter, logistics defaults (`country_of_origin`, `air_port_of_loading`, `shipping_terms`, `incoterm`), notes, and Pubali/configured wire instructions into `bankDetails`.
   - Frontend: `ProformaInvoiceDocument.tsx` passes `exporterProfile={doc.exporter}` and `bankDetails={doc.bankDetails || (doc as any).bank_details}` to `BeneficiaryBankDetails`.
   - Client PDF: `pdf-generator.ts` (`generateProformaInvoiceDoc`) dynamically formats exporter title band, registration numbers, and wire instructions.
3. **Offer Sheet**:
   - Backend: `OfferSheetService.php` (`generateForOrder`, `generateForQuotation`) dynamically populates `exporter`, `paymentTerms`, `shippingTerms`, `incoterm`, and `notes`. Strictly omits volume pricing tier tables for single-tier clarity and excludes wire details.
   - Frontend: `OfferSheetDocument.tsx` passes `exporterProfile={doc.exporter}` to `DocumentHeader`.
   - Client PDF: `pdf-generator.ts` (`generateProductOfferSheetDoc`) renders dynamic exporter profile in top navy header band.
4. **Sales Invoice / Quotation / Order Access**:
   - Backend: `InvoiceService.php` and `Order::getCommercialDocument` dynamically bind exporter profile, logistics origins, payment terms, and bank details from `DocumentHelper`.
   - Frontend: `QuotationDocument.tsx` and `DocumentHeader.tsx` render dynamic exporter details.
   - Server PDF: `DocumentPdfService.php` dynamically binds company title, formatted address, email, WhatsApp contact line (`Contact / WA: {$expPhone}`), registration numbers, and bank credentials.

### B. Beneficiary Bank Details Wire Format
- Authoritative fallback to official Pubali Bank Limited credentials:
  - Bank Name: `Pubali Bank Limited`
  - Account Title / Beneficiary: `M/S AYAAN  CLOTHING`
  - Account Number: `1788-901-044316`
  - SWIFT Code: `PUBABDDH210`
  - Branch: `Nawabpur Road Branch`
  - Address: `Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh`
- Security constraint maintained: `routing_number` is strictly omitted from customer export documents (`DocumentHelper::getBankDetails()` defaults to `$includeRouting = false`) and only accessible to Admin Settings (`getBankDetailsWithRouting(true)`).

### C. PDF Multibyte Text Encoding Hardening
- In `DocumentPdfService.php`, replaced byte-level `substr()` with `mb_substr(..., 'UTF-8')` to prevent cutting multibyte UTF-8 sequences.
- Replaced multibyte bullet characters (`•` / `\xE2\x80\xA2`) with standard ASCII character `o` prior to FPDF `iconv('UTF-8', 'ISO-8859-1//TRANSLIT')` conversion, completely eliminating incomplete multibyte character notices.

### D. Single Source of Truth for WhatsApp
- Authoritative default: `+880 1620-853502` (display), `8801620853502` (canonical digits), `https://wa.me/8801620853502` (URL).
- TypeScript canonical helpers: `buildWhatsAppUrl(number?, message?)`, `normalizeWhatsAppNumber(number)`, `getProductWhatsAppUrl(product, qty?, number?)` in `@/config/business-profile`.
- PHP normalization helper: `WhatsAppNormalizationService::buildWhatsAppUrl($number, $message)`.
- Dynamic propagation: Changing the WhatsApp number in the Admin Control Center invalidates runtime cache and updates the public storefront and newly generated documents immediately without requiring code deployment or Next.js rebuild.

### E. Security & Non-Destructive Integrity
- Bank credentials and internal tax registrations are strictly excluded from `/settings/public`.
- No mass-regeneration executed against historical orders; past documents remain untouched while new documents dynamically reflect active settings.

