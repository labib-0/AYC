# AYAAN CLOTHING — Complete Website Functional Audit Matrix

**Date:** September 23, 2026  
**Scope:** 100% of Customer Storefront, Customer Dashboard, Admin Management Portal, Shared Services, Stores, and Document Generators  
**Testing Methodology:** Forensic Static Code Analysis, AST Inspection, and In-Memory Automated Testing (Zero Live Browser Execution)

---

## 1. Functional Audit Matrix

| Area | Function | Status | Evidence | File | Line/Function | Automated Test |
|---|---|---|---|---|---|---|
| **Customer / Home** | Section Rendering Order | **PASS** | Exact order enforced: Banner $\rightarrow$ Strip $\rightarrow$ Brands $\rightarrow$ Hot Sale $\rightarrow$ Featured $\rightarrow$ Audience $\rightarrow$ Testimonials $\rightarrow$ Certs. | `src/app/page.tsx` | 13–40 | Static / Build |
| **Customer / Nav** | Header Navigation & Mobile Accordion | **PASS** | `mobileAccordion` enforces strictly one section open (`none`, `audience`, `category`). Active routes highlighted. | `src/components/layout/Header.tsx` | 68–84 | Static |
| **Customer / Nav** | Search Overlay & Dropdown | **PASS** | Tokenized multi-term search, recent search storage in `localStorage`, clean dismissal on click-outside. | `src/components/layout/SearchOverlay.tsx` | 45–120 | Static |
| **Customer / Catalog** | Product Grid & Multi-Filter Rail | **PASS** | Combined filtering (Brand, Audience, Category, Design Type) operates combinatorially without data mutation. | `src/app/search/page.tsx` | 80–180 | Static |
| **Customer / Catalog** | Product Sorting Operations | **PASS** | Sorts by price (asc/desc), newest (`created_at`), and popularity (`rating`/`orders`) deterministically. | `src/app/search/page.tsx` | 140–165 | Static |
| **Customer / Detail** | Product Detail View Loading | **PASS** | Loads product by slug or ID; falls back to clean 404 state if slug does not exist. | `src/app/products/[slug]/page.tsx` | 15–58 | Static / Build |
| **Customer / Detail** | Image Gallery & Lightbox Synchronization | **PASS** | Single source of truth (`currentIndex`); thumbnail clicks, swipe drag events, and lightbox state remain in sync. | `src/components/product/ProductGallery.tsx` | 40–90 | Static |
| **Customer / Cart** | Wholesale Three-Tier Pricing | **PASS** | Base MOQ price, bulk threshold price (>=200 pcs), and full stock price (>=1000 pcs) calculate correctly. | `src/services/cart.service.ts` | 33–47 | `Website Suite 2, Test 1` |
| **Customer / Cart** | Add to Cart & Merge Duplicate Variants | **PASS** | Merges items with identical product ID and size; recalculates quantity tier pricing automatically. | `src/services/cart.service.ts` | 76–120 | `Website Suite 2, Test 2` |
| **Customer / Cart** | Quantity Update & Item Removal | **PASS** | Updates quantity, recalculates line totals and cart subtotal; removing item clears from storage. | `src/services/cart.service.ts` | 125–170 | `Website Suite 2, Test 3` |
| **Customer / Checkout** | Delivery Address Validation & Selection | **PASS** | Validates name, company, email, phone, address, city, country; derives single canonical destination object. | `src/components/cart/CheckoutModal.tsx` | 137–189 | `Website Suite 3, Test 1` |
| **Customer / Checkout** | Address Form Native Submission Bug Check | **PASS** | `AddressForm` rendered in isolated sheet outside checkout `<form>`; zero accidental form bubbling. | `src/components/cart/CheckoutModal.tsx` | 75–83 | Static |
| **Customer / Checkout** | Freight Method Selection (Aramex vs Manual) | **PASS** | Only `aramex` and `manual` ("Discuss Directly") exist; obsolete ocean/truck/air-express methods fully eliminated. | `src/components/cart/CheckoutModal.tsx` | 50–53, 517–530 | `Website Suite 5, Test 2` |
| **Customer / Checkout** | Promo Code Apply & Minimum Spend Check | **PASS** | Rejects codes when order subtotal is below minimum spend; enforces percentage and flat calculations. | `src/lib/coupon.ts` | 79–153 | `Website Suite 4, Tests 1–4` |
| **Customer / Checkout** | Promo Discount Capping | **PASS** | Flat discount exceeding merchandise subtotal is capped strictly at subtotal; order total never negative. | `src/lib/coupon.ts` | 40–64 | `Website Suite 4, Test 5` |
| **Customer / Checkout** | Order Placement & Reference Generation | **PASS** | Emits canonical order reference (`AYN-YYYYMMDD-XXXXXX`), clears cart, captures consignee and shipping snapshot. | `src/services/order.service.ts` | 196–235 | `Website Suite 5, Test 1` |
| **Customer / Auth** | Customer Sign In & Credentials Check | **PASS** | Validates email/password; generates `auth_token_customer_*`; saves active user to `ayaan_b2b_user`. | `src/services/auth.service.ts` | 24–58 | `Website Suite 1, Test 1` |
| **Customer / Auth** | Auto-Account Registration for New Buyers | **PASS** | Non-existent customer email auto-provisions account with default customer role and session token. | `src/services/auth.service.ts` | 41–57 | `Website Suite 1, Test 1` |
| **Customer / Auth** | Customer Route Guard | **PASS** | `DashboardLayout` and `ProfileLayout` inspect `user`; unauthenticated visitors redirected to `/login`. | `src/app/dashboard/layout.tsx` | 32–36 | Static |
| **Customer / Dashboard**| Overview & Data Isolation | **PASS** | Filters orders and RFQs strictly by authenticated user ID and email; no cross-customer data leakage. | `src/app/dashboard/page.tsx` | 43–56 | Static |
| **Customer / Dashboard**| Orders Center & Order Details View | **PASS** | Queries customer orders; detail view displays status timeline, items, totals, and document links. | `src/app/dashboard/orders/page.tsx` | 1–120 | Static |
| **Customer / Dashboard**| RFQ & Quotations Viewer | **PASS** | Displays customer RFQ history, preparation status, quotation details, and commercial terms. | `src/app/dashboard/rfq/page.tsx` | 1–95 | Static |
| **Customer / Dashboard**| Document Center | **PASS** | Provides direct download access to Proforma Invoices and Offer Sheets for all customer orders. | `src/app/dashboard/documents/page.tsx`| 1–80 | Static |
| **Customer / Dashboard**| Address Book CRUD | **PASS** | Add, edit, delete, and set default delivery addresses in `addressService`. | `src/lib/services/address.service.ts` | 170–240 | `Website Suite 3, Test 1` |
| **Customer / RFQ** | Public RFQ Submission (`/rfq`) | **PASS** | Generates canonical `RFQ-YYYYMMDD-XXXX` identifier, records ISO `createdAt` timestamp, sets `"SUBMITTED"`. | `src/services/rfq.service.ts` | 45–95 | `Website Suite 6, Test 1` |
| **Customer / Direct** | Direct Order Access (`/order-access`) | **PASS** | Allows guest buyers to look up order status via order number and billing email address securely. | `src/app/order-access/[reference]/page.tsx` | 20–75 | Static |
| **Documents** | Beneficiary Bank Credentials | **PASS** | Exactly matches official credentials: Pubali Bank Limited, Account `1788-901-044316`, SWIFT `PUBABDDH210`. | `src/config/business-profile.ts` | 172–184 | `Website Suite 8, Test 1` |
| **Documents** | Proforma Invoice Assembly | **PASS** | Compiles complete commercial PI with buyer data, item breakdown, bank details, and grand total. | `src/lib/services/quotations.ts` | 192–273 | `Website Suite 8, Test 2` |
| **Documents** | Order Sheet Zero Shipping Rule | **PASS** | Generates commercial Order Sheet with FOB incoterms and strictly zero shipping charges. | `src/lib/services/quotations.ts` | 278–320 | `Website Suite 8, Test 2` |
| **Documents** | jsPDF Binary Generation | **PASS** | `generateProformaInvoiceDoc` and `generateProductOfferSheetDoc` produce valid PDF binary structures without crash. | `src/lib/pdf-generator.ts` | 150–220, 1130–1200 | `Website Suite 8, Test 3` |
| **SEO** | Product Metadata & Canonical URLs | **PASS** | Generates clean `<title>`, meta description, canonical URL, OpenGraph tags, and Twitter card metadata. | `src/lib/seo/product.ts` | 66–120 | `Website Suite 9, Test 1` |
| **SEO** | Meta Keywords Omission | **PASS** | Project adheres to standard: zero `<meta name="keywords">` generated; keywords exist as catalog data only. | `src/lib/seo/product.ts` | 70–95 | `Website Suite 9, Test 2` |
| **SEO** | Robots.txt Configuration | **PASS** | Allows public catalog (`/`, `/search`, `/products/`, `/rfq`); disallows private (`/admin`, `/dashboard`, `/profile`, `/checkout`). | `src/app/robots.ts` | 8–35 | `Website Suite 9, Test 3` |
| **SEO** | Sitemap XML Generation | **PASS** | Dynamic sitemap includes static pages, categories, brands, and products; excludes private/admin routes. | `src/app/sitemap.ts` | 12–105 | `Website Suite 9, Test 4` |
| **SEO** | Footer Internal Links | **PASS** | All footer links point to valid public routes; zero admin or private customer links in public footer. | `src/components/layout/Footer.tsx` | 85–240 | Static |
| **Brand Logo** | Canonical Brand Logo System | **PASS** | `getBrandLogoUrl` maps official vector SVGs; strict container aspect ratio; zero broken letter fallbacks. | `src/lib/brand-logos.ts` | 1–50 | `Website Suite 10, Test 1` |
| **Inventory** | Single Warehouse Invariant (Uttara) | **PASS** | Strictly one active warehouse (`Uttara`, `wh_uttara`); all multi-warehouse selectors completely removed. | `src/services/admin/inventory.service.ts` | 1–35 | `Website Suite 11, Test 1` |
| **Inventory** | Low Stock Calculation | **FAIL** | Specification: `Stock < MOQ`. Code: hardcodes `LOW_STOCK_THRESHOLD = 200` ignoring product MOQ. | `src/services/admin/inventory.service.ts` | 16, 114–119 | `Website Suite 11, Test 2` |
| **Admin / Auth** | Admin Login & Session Isolation | **PASS** | Authenticates admin credentials, saves `AYAAN_ADMIN_SESSION`; customer session remains completely untouched. | `src/services/admin/admin-auth.service.ts`| 39–70 | `Admin Suite 1, Tests 1–5` |
| **Admin / Auth** | Admin Route Guard | **PASS** | `AdminLayoutInner` intercepts unauthorized access and presents administrative login challenge. | `src/app/admin/layout.tsx` | 67–100 | Static |
| **Admin / Products**| Create Product | **PASS** | Generates SKU, validates MOQ, calculates carton specs, persists product entity. | `src/services/product.service.ts` | 130–180 | `Admin Suite 3, Test 1` |
| **Admin / Products**| Edit & Duplicate Product | **PASS** | Updates existing attributes; duplicate clones properties with new distinct ID and SKU. | `src/services/product.service.ts` | 185–225 | `Admin Suite 3, Tests 2–3` |
| **Admin / Products**| Delete Product | **FAIL** | `deleteProduct` removes item, but store self-healing detects length deficit and resurrects it on read. | `src/lib/mock-data/mock-store.ts` | 142–158 | `Website Suite 12, Test 1` |
| **Admin / Brands** | Create Brand | **PARTIAL** | `BrandModel` and `BrandInput` schemas omit `description`; textarea value in modal dropped on save. | `src/services/brand.service.ts` | 3–15 | Static / Admin Suite 4 |
| **Admin / Brands** | Edit, Delete & Product Counts | **PASS** | Updates brand data, removes cleanly without self-healing resurrection, counts products dynamically. | `src/services/brand.service.ts` | 30–80 | `Admin Suite 4, Test 1` |
| **Admin / Categories**| Category Taxonomy CRUD | **PASS** | Creates, edits, deletes categories; manages parent-child tree hierarchy without breaking child nodes. | `src/services/category.service.ts` | 40–110 | `Admin Suite 5, Test 1` |
| **Admin / Orders** | Orders Query & Status Transitions | **PASS** | Filters orders, transitions status (Confirmed, Processing, Shipped), appends history event log. | `src/services/admin/order.service.ts` | 80–140 | `Admin Suite 8, Tests 1–2` |
| **Admin / Orders** | Payment Review & Fulfillment Tracking | **PASS** | Admin approval toggles `payment_status="paid"`; carrier tracking number and status update cleanly. | `src/services/admin/order.service.ts` | 180–235 | `Admin Suite 8, Tests 3–4` |
| **Admin / Orders** | Ocean Freight Custom Quote | **PASS** | Custom ocean shipping charge updates order total synchronously; reflected across documents. | `src/services/admin/order.service.ts` | 240–265 | `Admin Suite 8, Test 5` |
| **Admin / Customers**| B2B Approval & Payment Terms | **PASS** | Toggles customer `is_approved_b2b`; configures custom wholesale payment terms (Net-30, etc.). | `src/services/admin/customer.service.ts`| 60–120 | `Admin Suite 9, Tests 1–2` |
| **Admin / RFQ** | RFQ Date/Time Filter & Messages | **PASS** | Filters RFQs by numeric timestamps from `createdAt`; appends admin replies to conversation thread. | `src/services/rfq.service.ts` | 100–160 | `Admin Suite 10, Tests 2–3` |
| **Admin / Quotes** | Create Commercial Quotation | **PASS** | Links quotation to RFQ, updates RFQ status to `"QUOTATION_PREPARED"`, calculates line and grand totals. | `src/lib/services/quotations.ts` | 75–140 | `Admin Suite 11, Test 1` |
| **Admin / Quotes** | Quotation Revisioning | **PARTIAL** | Increments revision number; skips in-memory cache update when running outside browser window. | `src/lib/services/quotations.ts` | 215–230 | Static / Admin Suite 11 |
| **Admin / Promo** | Coupon CRUD & Two Types Enforcement | **PASS** | Enforces strictly `percentage` and `flat` discount types; mandates `minimumOrderAmount`. | `src/services/admin/promotion.service.ts`| 50–95 | `Admin Suite 12, Tests 1–5`|
| **Admin / Promo** | Delete Coupon | **FAIL** | Similar to products, deleted coupon is resurrected by `getCoupons()` self-healing logic. | `src/lib/mock-data/mock-store.ts` | 480–495 | Static / Admin Suite 12 |
| **Admin / Docs** | Offer Sheet Product Adapter | **PARTIAL** | `generateProductOfferSheetDoc` expects `price` instead of standard catalog `wholesalePrice`. | `src/lib/pdf-generator.ts` | 150–165 | Static / Admin Suite 13 |
| **Admin / Home** | Hero Banner Configuration | **PASS** | `getTopBannerConfig()` retrieves active banner; admin updates persist to promotion store. | `src/services/admin/promotion.service.ts`| 110–135 | `Admin Suite 14, Test 1` |
| **Admin / Settings**| Business Profile & Preferences | **PASS** | Updates export registration, bank details, and system preferences in `settingsService`. | `src/services/admin/settings.service.ts`| 40–80 | `Admin Suite 15, Test 1` |
| **Shared / Store** | Seed Data Initialization | **PASS** | Automatically seeds 12 core datasets on first load if `localStorage` is unpopulated. | `src/lib/mock-data/mock-store.ts` | 20–55 | `Admin Suite 2, Test 1` |
| **Shared / Store** | In-Memory Deletion Self-Healing | **FAIL** | Reference mutation causes fallback constant array mutation, resurrecting deleted records. | `src/lib/mock-data/mock-store.ts` | 37–51, 142–158 | `Website Suite 12, Test 1` |

---

## 2. Summary of Audit Failures and Partials

### Defect 1 (P1 - High): In-Memory Reference Mutation Causing Self-Healing Resurrection
- **File:** `src/lib/mock-data/mock-store.ts:37–51, 142–158, 480–495`
- **Component:** `mockStore.deleteProduct()` and `mockStore.deleteCoupon()`
- **Problem:** `getItem()` caches the seed constant directly by reference. When items are deleted, `getProducts()` / `getCoupons()` triggers self-healing because `list.length < INITIAL_MOCK_PRODUCTS.length`, resurrecting deleted items immediately on subsequent read.
- **Evidence:** Automated tests `Website Suite 12, Test 1`, `Admin Suite 2, Test 2`, and `Admin Suite 3, Test 4` all failed with the resurrected object.

### Defect 2 (P1 - High): Hardcoded Competing Low-Stock Threshold
- **File:** `src/services/admin/inventory.service.ts:16` and 8 UI components
- **Component:** `LOW_STOCK_THRESHOLD = 200`
- **Problem:** Specification mandates `LOW STOCK = CURRENT STOCK < MINIMUM BULK AMOUNT (MOQ)`. Hardcoding 200 causes products with stock between MOQ and 200 to be falsely classified as low stock.
- **Evidence:** Confirmed in `Website Suite 11, Test 2` and `Admin Suite 7, Test 1`.

### Defect 3 (P2 - Medium): BrandModel Drops Description Field
- **File:** `src/services/brand.service.ts:3–15` and `BrandModal.tsx`
- **Component:** `BrandModel` and `BrandInput`
- **Problem:** Description entered in modal is stripped by the service because `BrandModel` interface lacks a description property.

### Defect 4 (P2 - Medium): Quotation Revision Skips In-Memory Cache on SSR
- **File:** `src/lib/services/quotations.ts:215–230`
- **Component:** `createQuotationRevision()`
- **Problem:** Bypasses in-memory cache update when running in server-side or non-browser environments.

### Defect 5 (P3 - Low): OfferSheetProductInput vs B2BProductInput Property Divergence
- **File:** `src/lib/pdf-generator.ts:150–165`
- **Component:** `generateProductOfferSheetDoc()`
- **Problem:** Expects `price` while catalog products provide `wholesalePrice`.
