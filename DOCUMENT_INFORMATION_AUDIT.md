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

---

## 6. Phase 3 Finalization: Hardening, Consistency, Global WhatsApp & Document QA

### A. Admin Settings Architecture & UX Badging Status
- **Status**: FULLY IMPLEMENTED & HARDENED.
- **Dedicated Admin Section**: `/ayc/settings` under the **Business & Document Info** tab.
- **Categorization & Clear Scope Badging**:
  1. **Company Master Data**: Badged `PUBLIC WEBSITE & DOCUMENTS`.
     - Fields: Company Name, Legal/Trading Name, Corporate Tagline, Website, Logo URL.
  2. **Contact Information**: Badged `PUBLIC WEBSITE & DOCUMENTS`.
     - Fields: Registered Office Address, City, Country, Export Telephone, Official Export Email.
     - Sub-card: **Authoritative WhatsApp Business Number** badged `PUBLIC WEBSITE`.
  3. **Export Regulatory & Statutory Registrations**: Badged `DOCUMENT ONLY`.
     - Fields: Trade License Number, BIN / VAT Registration, TIN Number, ERC Number, IRC Number, BGMEA Membership Number, Certificate of Incorporation Number.
  4. **Beneficiary Bank Wire Details**: Badged `DOCUMENT ONLY / PRIVATE`.
     - Fields: Bank Name, Branch Name & Address, Beneficiary Account Name, Account Number, SWIFT / BIC Code, Routing Number, Settlement Currency.
     - Clear notice informing administrators that bank data is never exposed via public endpoints.
  5. **Document Logistics & Legal Defaults**: Badged `DOCUMENT ONLY`.
     - Fields: Port of Loading (POL), Country of Origin, Default Incoterm, Default Payment Terms Statement, Legal Declaration Text, Authorized Signatory Name & Title.
- **1-Click Reset to Default Controls**:
  - **WhatsApp Reset**: Instantly resets to canonical `+880 1620-853502`.
  - **Banking Reset**: Instantly resets to official Pubali Bank Limited baseline (`1788-901-044316`, `PUBABDDH210`, Nawabpur Road Branch).
  - **Logistics Defaults Reset**: Instantly resets to standard baseline (`Bangladesh`, `Chattogram Sea Port / Hazrat Shahjalal Int. Airport, Dhaka`, `FOB Chattogram`).
- **Immediate Propagation**:
  - Save operation persists to PostgreSQL via `AdminSettingsController::updateBusinessSettings`.
  - Updates `localStorage.ayaan_site_settings_cache` and triggers cross-tab `window.dispatchEvent(new Event("storage"))` for instantaneous real-time UI synchronization without requiring page reload.
  - Invalidates backend `site_settings_public` Redis/memory cache.

### B. Global WhatsApp Single Source of Truth Status
- **Status**: FULLY VERIFIED & ACTIVE.
- **Authoritative Canonical Default**:
  - **Display Number**: `+880 1620-853502`
  - **Machine Number**: `8801620853502`
  - **Direct Destination URL**: `https://wa.me/8801620853502`
- **Zero Active Stale Numbers**: Repository-wide audit confirmed 0 hardcoded stale numbers in storefront and document components.
- **E2E Number Change & Restoration**: Verified automated transition:
  - Default `+880 1620-853502` -> Updated `+880 1982-183886` (`https://wa.me/8801982183886`) -> Restored `+880 1620-853502`.
  - Contextual product and order messages are preserved with RFC 3986 safe percent-encoding across number changes.

### C. Commercial Document QA Status
1. **Commercial Invoice (CI)**:
   - **Verification**: Verified via `Phase3FinalDocumentQaTest::test_12_ci_qa_preserves_calculations_and_protects_internal_costs`.
   - **Fields Bound**: Centralized company profile, seller/exporter identity, beneficiary bank wire details (without routing number for buyers), contact telephone/WhatsApp, buyer snapshot, itemized goods, quantities, unit prices, line totals, discounts, shipping, and grand total.
   - **Protection**: Internal product cost price (`cost_price` / `purchase_price`) is strictly excluded.
2. **Proforma Invoice (PI)**:
   - **Verification**: Verified via `Phase3FinalDocumentQaTest::test_13_pi_qa_preserves_calculations_and_bank_wire_terms`.
   - **Fields Bound**: Exporter profile, buyer snapshot, order reference, itemized products, quantities, prices, discounts, totals, and complete beneficiary bank wire instructions for foreign trade remittances. PI calculation logic preserved.
3. **Offer Sheet**:
   - **Verification**: Verified via `Phase3FinalDocumentQaTest::test_14_offer_sheet_qa_single_tier_and_no_duplicate_media`.
   - **Fields Bound**: Exporter profile, buyer snapshot, single-tier order quantity pricing (`applicable_pricing`), product media without duplicates. Bank details and internal cost prices strictly omitted.
4. **Sales Invoice**:
   - **Verification**: Verified via `Phase3FinalDocumentQaTest::test_15_invoice_qa_historical_order_values_authoritative`.
   - **Fields Bound**: Historical frozen order values are authoritative. For public customer generation, internal operator notes (`manual_discount_reason`) are shielded from view, while admin generation preserves audit context.
5. **Commercial Quotation / RFQ / Chalan**:
   - **Verification**: Verified via `Phase3FinalDocumentQaTest::test_16_quotation_qa_centralized_company_data`.
   - **Fields Bound**: Exporter profile, quotation reference, dynamic customer inquiry data, items, shipping fee, subtotal, and grand total.

### D. Public vs Private Settings Security Boundary
- **Public Storefront Endpoint (`/api/v1/settings/public`)**:
  - Exposes ONLY non-sensitive branding and contact fields: `site_title`, `site_logo`, `whatsapp` (`display`, `number`, `url`), `social_links`, `legal_pages`.
  - Strictly conceals: Bank account numbers, SWIFT codes, branch addresses, routing numbers, TIN, BIN, VAT, ERC, IRC, and BGMEA registration numbers.
- **Admin Settings Endpoint (`/api/v1/admin/settings/business`)**:
  - Authenticated via Sanctum and restricted to `role:admin` with `permission:settings.view` (read) and `permission:settings.edit` (write).
  - Direct manipulation by unauthorized users or customers returns `401 Unauthorized` or `403 Forbidden`.

### E. Historical Document Protection & Immutability
- Historical orders remain strictly immutable in PostgreSQL.
- Changing business settings updates newly generated documents and real-time previews, but does NOT perform destructive batch-updates or overwrite historical records.
- Product catalog price updates do not mutate historical order item pricing.

### F. Cache Consistency & Immediate Invalidation
- Changing business settings triggers `Cache::forget('site_settings_public')`.
- Subsequent requests to `/api/v1/settings/public` immediately return fresh values.
- Storefront components listen to storage events and update in real-time without requiring Next.js rebuilds or server restarts.

### G. Audit Log Verification
- Changes to business settings trigger `ActivityLogger::log('settings.business_updated')`.
- Changes to WhatsApp numbers trigger `ActivityLogger::log('settings.whatsapp_updated')` recording old display, new display, old machine number, new machine number, and the initiating admin ID.

### H. Outstanding Limitations
- Multi-currency banking profiles (different bank accounts per foreign currency) remain a planned future expansion; currently, the system provides one authoritative wire instructions profile with configurable settlement currency (default `USD`).

---

## FINAL COVERAGE MATRIX (PHASE 4 AUDIT)

The following definitive matrix categorizes every reusable, dynamic, and document-specific field across Commercial Invoice (CI), Proforma Invoice (PI), Offer Sheet, Sales Invoice, Quotation, and Packing List.

### Field Ownership Classifications
- **A. CENTRALIZED ADMIN SETTING**: Business profile, corporate branding, primary contact, export registrations, wire instructions, default logistics, and signatory metadata managed in Admin Business Settings.
- **B. ORDER-DERIVED**: Dynamic parameters originating strictly from the order life-cycle (e.g., order reference, subtotal, shipping charge, discount, grand total).
- **C. CUSTOMER-DERIVED**: Dynamic buyer information provided during checkout or RFQ submission (e.g., buyer name, company, email, delivery destination).
- **D. PRODUCT-DERIVED**: Item specifications, descriptions, SKUs, sizes, colors, and quantities originating from the catalog/cart.
- **E. SHIPMENT-DERIVED**: Physical logistics attributes captured in `shipping_snapshot` or generated during dispatch (e.g., carrier, tracking number, carton breakdown, weights).
- **F. PAYMENT-DERIVED**: Dynamic transaction details (e.g., payment status, transaction reference, amount paid, balance due).
- **G. DOCUMENT-SPECIFIC**: Document lifecycle identifiers (e.g., doc number, issue date, validity window, related invoice number).
- **H. NOT CURRENTLY REQUIRED**: Fields identified during audit that are intentionally omitted from customer export documents (e.g., domestic bank routing number on foreign PI, internal supplier purchase prices).

| Field Name | Class | Admin Configurable | CI | PI | Offer Sheet | Invoice | Quotation | Packing List | Public | Private | Source of Truth | Verified |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|:---:|
| `company_name` | A | YES | YES | YES | YES | YES | YES | YES | YES | NO | SystemSetting `company_name` | PASS |
| `legal_name` | A | YES | YES | YES | YES | YES | YES | YES | NO | YES | SystemSetting `company_legal_name` | PASS |
| `tagline` / `business_type` | A | YES | YES | YES | YES | YES | YES | YES | YES | NO | SystemSetting `company_tagline` | PASS |
| `office_address` | A | YES | YES | YES | YES | YES | YES | YES | YES | NO | SystemSetting `office_address_formatted` | PASS |
| `business_phone` | A | YES | YES | YES | YES | YES | YES | YES | YES | NO | SystemSetting `business_phone` | PASS |
| `business_email` | A | YES | YES | YES | YES | YES | YES | YES | YES | NO | SystemSetting `business_email` | PASS |
| `whatsapp_display` (`+880 1620-853502`) | A | YES | YES | YES | YES | YES | YES | YES | YES | NO | SystemSetting `whatsapp_display` | PASS |
| `whatsapp_canonical` (`8801620853502`) | A | YES | YES | YES | YES | YES | YES | YES | YES | NO | SystemSetting `whatsapp_number` | PASS |
| `trade_license` / `reg_number` | A | YES | YES | YES | NO | YES | NO | NO | NO | YES | SystemSetting `reg_number` | PASS |
| `tin_number` | A | YES | YES | YES | NO | YES | NO | NO | NO | YES | SystemSetting `tin_number` | PASS |
| `bin_vat` | A | YES | YES | YES | NO | YES | NO | NO | NO | YES | SystemSetting `bin_number` | PASS |
| `erc_number` | A | YES | YES | YES | NO | NO | NO | NO | NO | YES | SystemSetting `erc_number` | PASS |
| `irc_number` | A | YES | YES | YES | NO | NO | NO | NO | NO | YES | SystemSetting `irc_number` | PASS |
| `bgmea_reg` | A | YES | YES | YES | NO | NO | NO | NO | NO | YES | SystemSetting `bgmea_reg` | PASS |
| `incorporation_number` | A | YES | YES | YES | NO | NO | NO | NO | NO | YES | SystemSetting `incorporation_number` | PASS |
| `bank_name` (`Pubali Bank Limited`) | A | YES | YES | YES | NO | NO | NO | NO | NO | YES | SystemSetting `bank_name` | PASS |
| `bank_account_title` | A | YES | YES | YES | NO | NO | NO | NO | NO | YES | SystemSetting `bank_account_title` | PASS |
| `bank_account_number` (`1788-901-044316`) | A | YES | YES | YES | NO | NO | NO | NO | NO | YES | SystemSetting `bank_account_number` | PASS |
| `bank_swift_code` (`PUBABDDH210`) | A | YES | YES | YES | NO | NO | NO | NO | NO | YES | SystemSetting `bank_swift_code` | PASS |
| `bank_branch` / `bank_address` | A | YES | YES | YES | NO | NO | NO | NO | NO | YES | SystemSetting `bank_address` | PASS |
| `bank_routing_number` | H | YES | NO | NO | NO | NO | NO | NO | NO | YES | SystemSetting `bank_routing_number` (Admin Only) | PASS |
| `country_of_origin` (`Bangladesh`) | A | YES | YES | YES | YES | NO | YES | YES | YES | NO | SystemSetting `default_country_of_origin` | PASS |
| `port_of_loading` | A | YES | YES | YES | NO | NO | YES | YES | YES | NO | SystemSetting `default_port_of_loading` | PASS |
| `incoterm` (`DAP` / `FOB Dhaka`) | A | YES | YES | YES | NO | NO | YES | NO | YES | NO | SystemSetting `default_incoterm` | PASS |
| `payment_terms` | A | YES | YES | YES | YES | YES | YES | NO | YES | NO | SystemSetting `default_payment_terms` | PASS |
| `declaration_text` | A | YES | YES | YES | NO | NO | NO | YES | YES | NO | SystemSetting `default_declaration_text` | PASS |
| `signatory_title` | A | YES | YES | YES | YES | YES | YES | YES | YES | NO | SystemSetting `signatory_title` | PASS |
| `signatory_division` | A | YES | YES | YES | YES | YES | YES | YES | YES | NO | SystemSetting `signatory_division` | PASS |
| `order_number` | B | NO | YES | YES | YES | YES | YES | YES | NO | YES | Order `order_number` | PASS |
| `subtotal` / `goods_value` | B | NO | YES | YES | YES | YES | YES | NO | NO | YES | Order `subtotal` | PASS |
| `shipping_cost` / `freight` | B | NO | YES | YES | NO | YES | YES | NO | NO | YES | Order `shipping_cost` | PASS |
| `discount_amount` | B | NO | YES | YES | NO | YES | YES | NO | NO | YES | Order `discount_amount` | PASS |
| `total_amount` / `total_payable` | B | NO | YES | YES | YES | YES | YES | NO | NO | YES | Order `total_amount` | PASS |
| `buyer_name` / `attention` | C | NO | YES | YES | YES | YES | YES | YES | NO | YES | Order / RFQ `shipping_name` | PASS |
| `buyer_company` | C | NO | YES | YES | YES | YES | YES | YES | NO | YES | Customer `company_name` | PASS |
| `buyer_address` | C | NO | YES | YES | NO | YES | NO | YES | NO | YES | Order `shipping_address1` | PASS |
| `buyer_country` | C | NO | YES | YES | YES | YES | YES | YES | NO | YES | Order `shipping_country_code` | PASS |
| `buyer_email` / `buyer_phone` | C | NO | YES | YES | YES | YES | YES | YES | NO | YES | Order `email` / `shipping_phone` | PASS |
| `item_description` / `product_name` | D | NO | YES | YES | YES | YES | YES | YES | YES | NO | OrderItem `product_name` | PASS |
| `item_sku` | D | NO | YES | YES | YES | YES | YES | YES | YES | NO | OrderItem `sku` | PASS |
| `item_quantity` | D | NO | YES | YES | YES | YES | YES | YES | NO | YES | OrderItem `quantity` | PASS |
| `item_unit_price` | D | NO | YES | YES | YES | YES | YES | NO | NO | YES | OrderItem `unit_price` | PASS |
| `item_line_total` | D | NO | YES | YES | YES | YES | YES | NO | NO | YES | OrderItem `line_total` | PASS |
| `item_package_breakdown` | D | NO | YES | YES | YES | NO | NO | YES | YES | NO | Product `package_breakdown` | PASS |
| `carrier` / `tracking_number` | E | NO | YES | NO | NO | NO | NO | YES | NO | YES | Order `shipping_snapshot` | PASS |
| `carton_count` / `packing_cartons` | E | NO | YES | NO | NO | NO | NO | YES | NO | YES | Order `shipping_snapshot` | PASS |
| `gross_weight` / `net_weight` / `cbm` | E | NO | YES | NO | YES | NO | NO | YES | YES | NO | Order `shipping_snapshot` / Product | PASS |
| `payment_status` | F | NO | YES | YES | NO | YES | NO | NO | NO | YES | Order `payment_status` | PASS |
| `payment_method` | F | NO | YES | YES | NO | YES | NO | NO | NO | YES | Order `payment_method` | PASS |
| `paid_amount` / `balance_due` | F | NO | YES | YES | NO | YES | NO | NO | NO | YES | Order `paid_amount` / calculations | PASS |
| `transaction_id` / `receipt_ref` | F | NO | YES | NO | NO | YES | NO | NO | NO | YES | Order `payment_details` | PASS |
| `doc_number` (CI/PI/QT/PL/INV) | G | NO | YES | YES | YES | YES | YES | YES | NO | YES | Document numbering engine | PASS |
| `date_of_issue` | G | NO | YES | YES | YES | YES | YES | YES | NO | YES | Document created_at / placed_at | PASS |
| `valid_until` | G | NO | YES | YES | YES | NO | YES | NO | NO | YES | Document validity calculation | PASS |
| `product_cost_price` | H | NO | NO | NO | NO | NO | NO | NO | NO | YES | Product `cost_price` (Strictly Hidden) | PASS |

---

## KNOWN HARDCODED VALUES

**Remaining Active Hardcoded Company Values: ZERO (0)**

### Audit Summary:
1. **Corporate Identity & Branding**: All corporate identity attributes (`name`, `legal_name`, `tagline`, `logo_url`, `office_address`) resolve dynamically from Admin Business Settings (`SystemSetting::get('company_name')`, `office_address_formatted`, etc.) with fallback to centralized `BUSINESS_PROFILE` configuration constants.
2. **Contact & WhatsApp**: All storefront components (Header, Footer, Floating CTA, Product Detail, RFQ, Cart, Checkout) and document templates (CI, PI, Offer Sheet, Quotation, Packing List) resolve the authoritative business WhatsApp through the centralized settings service (`+880 1620-853502` / `8801620853502` / `https://wa.me/8801620853502`). Zero active secondary or personal telephone numbers exist in the codebase.
3. **Beneficiary Wire Instructions**: All banking instructions resolve dynamically from Admin settings (`SystemSetting::get('bank_name')`, `bank_account_number`, `bank_swift_code`, `bank_address`) with fallback to the official Pubali Bank Limited export account (`1788-901-044316`, `PUBABDDH210`). No hardcoded foreign routing numbers are leaked on international trade documents.
4. **Signatories & Document Defaults**: Port of loading, Incoterms, payment terms, export declarations, and signatory titles/divisions resolve dynamically from `document_defaults`.

---

## Phase 5 — Multi-Currency Banking

### 1. Architectural Overview & Data Model
Phase 5 introduces structured, multi-currency beneficiary banking profiles into the centralized Admin Business & Document Information Control Center without database schema modifications.

- **Storage**: Beneficiary profiles are persisted as a JSON array under the `bank_profiles` key in the `system_settings` table (`SystemSetting::get('bank_profiles')`).
- **Profile Schema**:
  ```json
  {
    "id": "prof_1728250000_usd",
    "name": "Pubali Bank Limited (USD Account)",
    "currency": "USD",
    "bank_name": "Pubali Bank Limited",
    "account_title": "M/S AYAAN  CLOTHING",
    "account_number": "1788-901-044316",
    "swift_code": "PUBABDDH210",
    "branch": "Nawabpur Road Branch",
    "bank_address": "Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh",
    "routing_number": "175271894",
    "notes": "Primary export settlement account for international USD wire transfers.",
    "is_active": true,
    "is_default": true
  }
  ```
- **Supported Currencies**: `USD`, `EUR`, `GBP`, `BDT` (defined centrally via `DocumentHelper::SUPPORTED_CURRENCIES`).
- **Two-Way Legacy Sync**: For seamless backward compatibility with existing document generators, external integrations, and legacy endpoints:
  - Updates to `bank_profiles` automatically sync the designated default profile to single legacy keys (`bank_name`, `bank_account_number`, `bank_swift_code`, `bank_branch`, `bank_address`, `bank_routing_number`, `bank_currency`).
  - Updates submitted via single legacy keys automatically sync into the designated default profile within `bank_profiles`.

### 2. Document Currency Resolution Engine
When commercial documents (CI, PI, Sales Invoice) or quotations are generated, the beneficiary bank details are resolved dynamically:
1. **Currency Context Identification**: The document engine determines the authoritative document currency (from `order.currency`, `quotation.currency`, or explicitly passed `$currency` parameter; defaults to `USD`).
2. **Resolution Cascade (`DocumentHelper::getBankDetailsForCurrency`)**:
   - **Step 1 — Exact Active Currency Match**: Locates an active profile (`is_active = true`) whose `currency` matches the document currency (case-insensitive).
   - **Step 2 — Designated Default Fallback**: If no active profile matches the currency (e.g. unconfigured currency, or matched profile is inactive), selects the active designated default profile (`is_default = true` and `is_active = true`).
   - **Step 3 — First Active Fallback**: If no active default profile exists, selects the first active profile in the list.
   - **Step 4 — Baseline System Fallback**: If `bank_profiles` is empty or unconfigured, falls back to the authoritative system baseline default (Pubali Bank Limited USD wire instructions).
3. **Number-to-Words Currency Localization**: `DocumentHelper::numberToWords` formats amounts with currency-specific wording:
   - `USD`: `"US Dollars {Amount} Only"`
   - `EUR`: `"Euros {Amount} Only"`
   - `GBP`: `"Pounds Sterling {Amount} Only"`
   - `BDT`: `"Bangladeshi Taka {Amount} Only"`

### 3. Document Boundaries & Exclusion Invariants
- **Commercial Invoice (CI)**: Includes currency-matched beneficiary bank details and settlement badge.
- **Proforma Invoice (PI)**: Includes currency-matched beneficiary bank details and settlement badge.
- **Sales Invoice**: Includes currency-matched beneficiary bank details.
- **Quotation / Chalan**: Commercial quotation displays currency terms; delivery chalan omits banking.
- **Offer Sheet**: **STRICTLY OMITS** all beneficiary bank details.
- **Packing List**: **STRICTLY OMITS** all beneficiary bank details (`bank_details => null`).

### 4. Zero Exchange Rate Conversion Guarantee
- All order line item prices, unit prices, subtotal, discounts, shipping fees, and grand totals are authoritative and unchanged.
- Multi-currency banking only routes beneficiary wire instructions for the document's native settlement currency; it **NEVER** mutates amounts or applies FX conversions.

### 5. Historical Document Immutability
- Orders that already have stored financial or document snapshots retain their immutable snapshots.
- New documents or on-the-fly regenerations use the live currency resolution cascade without altering persisted order accounting records.

### 6. Security, RBAC & Public API Separation
- **Storefront Privacy**: The public settings endpoint (`GET /api/v1/settings/public`) strictly **NEVER** exposes `bank_profiles`, account numbers, SWIFT codes, or routing numbers.
- **Admin RBAC**: Viewing and modifying `bank_profiles` is restricted to authenticated administrators with `manage_settings` permission (`GET/PUT /api/v1/admin/settings/business`). Unauthenticated requests receive `401 Unauthorized`; customer accounts receive `403 Forbidden`.
- **Admin Validation Rules**:
  - Restricts currency to supported list (`USD`, `EUR`, `GBP`, `BDT`).
  - Rejects duplicate active profiles for the same currency.
  - Requires at least one active profile designated as default (`is_default = true`).
  - Prevents deleting the default profile or the only remaining profile.

### 7. Authoritative WhatsApp Invariant
- The canonical business WhatsApp contact (`+880 1620-853502` / `8801620853502` / `https://wa.me/8801620853502`) remains strictly preserved across all storefront components, document headers, footers, and APIs.

### 8. Remaining Limitations
- Settlement currency routing currently matches 1-to-1 between document currency and configured bank account; automated foreign exchange rate hedging or dynamic multi-currency conversions remain out of scope.



