# AYAAN CLOTHING (AYC) — Application Modules Inventory

**Document Purpose**: Comprehensive functional inventory of all platform modules across storefront, admin, POS, and backend services.  
**Audience**: Product Managers, Developers, Quality Assurance Engineers, System Auditors.  
**Last Verified Date**: October 20, 2026  
**Environment Baseline**: Production Release `release_20261020_052638_a8d2fef` on Hostinger VPS `srv2010990`.

---

## Module Index

1. [Product Catalog & Discovery](#1-product-catalog--discovery)
2. [B2B Tiered Wholesale Pricing & Package Assortments](#2-b2b-tiered-wholesale-pricing--package-assortments)
3. [Customer Authentication & Verification](#3-customer-authentication--verification)
4. [Shopping Cart & Pre-Order Segregation](#4-shopping-cart--pre-order-segregation)
5. [Checkout & Order Placement Pipeline](#5-checkout--order-placement-pipeline)
6. [Customer Order Tracking & Document Portal](#6-customer-order-tracking--document-portal)
7. [Payment Processing & Wire Proof Verification](#7-payment-processing--wire-proof-verification)
8. [Commercial Export Trade Documents](#8-commercial-export-trade-documents)
9. [Product Offer Sheet Pre-Generation & Merging](#9-product-offer-sheet-pre-generation--merging)
10. [Custom RFQ & Manufacturing Quote Negotiation](#10-custom-rfq--manufacturing-quote-negotiation)
11. [Factory Showroom Point-of-Sale (POS) Terminal](#11-factory-showroom-point-of-sale-pos-terminal)
12. [Administrative Management Suite (`/ayc`)](#12-administrative-management-suite-ayc)
13. [Transactional Email & Notification Engine](#13-transactional-email--notification-engine)
14. [SEO, Social Sharing & Dynamic Graph Meta](#14-seo-social-sharing--dynamic-graph-meta)

---

## 1. Product Catalog & Discovery

* **Purpose**: Allows international buyers to explore bulk ready-stock apparel, inspect technical fabric details, view multi-angle photography, filter by brand/category, and download official product Offer Sheets.
* **Frontend Pages & Components**:
  - Storefront Home: `src/app/page.tsx`
  - Products Browse: `src/app/products/page.tsx`
  - Product Detail Page: `src/app/products/[slug]/page.tsx`
  - Filters & Search: `src/components/products/ProductFilterDrawer.tsx`, `ProductGrid.tsx`, `SearchModal.tsx`
* **Backend Implementation**:
  - Controller: `App\Http\Controllers\Api\V1\ProductController`
  - Routes: `GET /api/v1/products`, `GET /api/v1/products/slug/{slug}`, `GET /api/v1/products/{id}/shipping-specs`
  - Models: `Product`, `Brand`, `Category`, `ProductImage`, `ProductVariant`
* **Database Entities**: `products`, `brands`, `categories`, `category_product`, `product_images`, `product_variants`
* **Authorization**: Public read access. Throttled by Nginx and Laravel `throttle:products-browse`.
* **Associated Tests**: `tests/Feature/Catalog/ProductBrowseTest.php`, `tests/catalog-filters.test.ts`.

---

## 2. B2B Tiered Wholesale Pricing & Package Assortments

* **Purpose**: Implements B2B volume discounting curves based on order size and enforces manufacturer-standard size distribution ratios (e.g. S:M:L:XL = 1:2:2:1 per carton).
* **Frontend Components**:
  - `src/components/products/VolumePricingTable.tsx`
  - `src/components/products/PackageAssortmentBreakdown.tsx`
  - `src/components/cart/PricingModeSelector.tsx`
* **Backend Implementation**:
  - Calculation Service: `App\Services\Order\OrderCalculationService`
  - Models: `ProductPricingTier`, `ProductPackageAllocation`, `ProductShippingPackageProfile`
* **Database Entities**: `product_pricing_tiers`, `product_package_allocations`, `product_shipping_package_profiles`
* **Business Rules**:
  - Minimum Order Quantity (MOQ) strictly enforced before cart addition.
  - Tier 1: Baseline MOQ wholesale rate.
  - Tier 2: Mid-tier volume discount (typically 500–2,000 pcs).
  - Tier 3: High-volume container export rate (>2,000 pcs).

---

## 3. Customer Authentication & Verification

* **Purpose**: Manages buyer identity, secure registration, credential login, password reset tokens, Google OAuth Socialite login, and cryptographic email verification.
* **Frontend Pages & Components**:
  - Login/Register: `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/components/auth/AuthModal.tsx`
  - Email Verification Landing: `src/app/auth/verify-email/page.tsx`
  - Google Sign-In: `src/components/auth/GoogleSignInButton.tsx`
* **Backend Implementation**:
  - Controllers: `AuthController`, `GoogleAuthController`
  - Service: `App\Services\Auth\EmailVerificationService`
  - Routes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/verify-email`, `GET /api/v1/auth/google/redirect`, `GET /api/v1/auth/google/callback`
  - Models: `User`, `EmailVerificationToken`, `PersonalAccessToken`
* **Key Invariant**: **Mandatory Verified-Only Ordering**. Customers cannot place orders without verifying their email address through AYC's verification challenge. Google OAuth does NOT bypass this requirement.
* **Associated Tests**: `tests/Feature/Auth/CustomerAuthWorkflowTest.php`, `tests/Feature/Auth/GoogleCustomerAuthenticationWorkflowTest.php`, `tests/Feature/Auth/EmailVerificationDeliveryTest.php`.

---

## 4. Shopping Cart & Pre-Order Segregation

* **Purpose**: Manages buyer order staging, MOQ validation, package breakdown calculations, and guarantees that Ready Stock items and Pre-Order items are never mixed into the same order.
* **Frontend Components**:
  - Cart Slide-over: `src/components/cart/CartDrawer.tsx`
  - Cart Page: `src/app/cart/page.tsx`
  - State Context: `src/lib/CartContext.tsx`
* **Backend Implementation**:
  - Controller: `App\Http\Controllers\Api\V1\CartController`
  - Routes: `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PUT /api/v1/cart/items/{id}`, `DELETE /api/v1/cart/items/{id}`
  - Models: `Cart`, `CartItem`
* **Business Rules**: Incompatible cart mixing check rejects checkout if ready-stock and pre-order products are combined.

---

## 5. Checkout & Order Placement Pipeline

* **Purpose**: Collects consignee destination details, calculates shipping rates (Air, Sea, or Manual export arrangements), validates promotional coupons, applies idempotency locks, creates database order records, decrements inventory, and displays the approved Order Placed modal.
* **Frontend Components**:
  - Modal: `src/components/cart/CheckoutModal.tsx`
  - Address Form: `src/components/account/AddressForm.tsx`
* **Backend Implementation**:
  - Controller: `App\Http\Controllers\Api\V1\OrderController`
  - Middleware: `auth:sanctum`, `role:customer`, `verified`, `throttle:checkout-order`
  - Route: `POST /api/v1/orders`
  - Models: `Order`, `OrderItem`, `OrderStatusEvent`, `OrderIdempotencyKey`, `Address`
* **Associated Tests**: `tests/Feature/Order/OrderCreationIdempotencyTest.php`, `tests/Feature/Order/VerifiedCustomerOrderingEnforcementTest.php`.

---

## 6. Customer Order Tracking & Document Portal

* **Purpose**: Provides buyers with a self-service dashboard to review placed orders, inspect status progressions, track international air waybills (Aramex integration), download commercial trade documents, and submit payment proofs.
* **Frontend Pages & Components**:
  - Order Listing: `src/app/dashboard/orders/page.tsx`
  - Order Details: `src/app/dashboard/orders/[id]/page.tsx`
  - Documents Center: `src/app/dashboard/documents/page.tsx`
* **Backend Implementation**:
  - Routes: `GET /api/v1/orders`, `GET /api/v1/orders/{id}`, `GET /api/v1/orders/{id}/tracking`, `GET /api/v1/orders/documents`
  - Controller: `OrderController`
* **Authorization**: Customer ownership strictly validated; users cannot view other customers' orders or documents.

---

## 7. Payment Processing & Wire Proof Verification

* **Purpose**: Facilitates B2B international bank wire payments (TT / SWIFT), accepts uploaded scanned deposit receipts/PDFs (up to 20 MB), triggers administrative audit workflows, and updates order status upon confirmation.
* **Frontend Components**:
  - Wire Submission Form: `src/components/orders/PaymentProofUploadModal.tsx`
  - Admin Payment Verification: `src/components/admin/orders/PaymentAuditPanel.tsx`
* **Backend Implementation**:
  - Controller: `OrderController::uploadPaymentProof`, `AdminOrderController::verifyPayment`
  - Routes: `POST /api/v1/orders/{id}/payment-proof`, `POST /api/v1/orders/{id}/verify-payment`
  - Models: `Payment`, `Order`, `OrderStatusEvent`
* **Associated Tests**: `tests/Feature/Order/PaymentProofUploadTest.php`.

---

## 8. Commercial Export Trade Documents

* **Purpose**: Generates and issues official international trade documentation complying with customs and banking remittance standards.
* **Document Types**:
  1. **Product Offer Sheet (`OFFER_SHEET`)**: Product visual presentation, specifications, packing info, commercial terms.
  2. **Proforma Invoice (`PROFORMA_INVOICE`)**: Commercial billing document with order totals, consignee details, and export banking coordinates.
  3. **Commercial Invoice (`COMMERCIAL_INVOICE`)**: Official customs invoice released upon payment confirmation (`isPaid`).
  4. **Packing List (`PACKING_LIST`)**: Detailed carton-by-carton breakdown with gross/net weights.
* **Backend Implementation**:
  - Services: `CommercialPdfArtifactService`, `ProformaInvoiceService`, `CommercialInvoiceService`, `DocumentHelper`
  - Route: `GET /api/v1/orders/{id}/documents/{docType}/pdf`

---

## 9. Product Offer Sheet Pre-Generation & Merging

* **Purpose**: Pre-renders individual product Offer Sheets upon catalog publication, enforces a strict $\le 1.5$ MB size target (2.0 MB maximum), caches artifacts on disk, and dynamically combines multiple products into a single PDF for multi-item orders using a pure PHP PDF merger.
* **Backend Implementation**:
  - Services: `ProductOfferSheetService`, `PdfMergerService`, `DocumentPdfService`
  - Artisan Command: `php artisan ayaan:pregenerate-offer-sheets`
  - Background Job: `GenerateProductOfferSheetJob`
  - Routes: `GET /api/v1/products/{id}/offer-sheet/pdf`, `POST /api/v1/products/bulk-offer-sheet`, `GET /api/v1/orders/{id}/documents/OFFER_SHEET/pdf`
  - Model: `ProductOfferSheet`
* **Associated Tests**: `tests/Feature/Documents/ProductOfferSheetPreGenerationTest.php`, `tests/Feature/Documents/OfferSheetMergeIntegrityTest.php`.

---

## 10. Custom RFQ & Manufacturing Quote Negotiation

* **Purpose**: Manages custom manufacturing inquiries where international buyers upload tech-packs and negotiate production orders with administrative merchandisers.
* **Frontend Pages**:
  - RFQ Submission Form: `src/app/rfq/page.tsx`
  - Customer RFQ Hub: `src/app/dashboard/rfq/page.tsx`, `src/app/dashboard/rfq/[id]/page.tsx`
  - Admin RFQ Console: `src/app/ayc/rfq/page.tsx`, `src/app/ayc/rfq/[id]/page.tsx`
* **Backend Implementation**:
  - Controllers: `RfqController`, `AdminQuotationController`
  - Routes: `POST /api/v1/rfq`, `GET /api/v1/rfq`, `POST /api/v1/rfq/{id}/messages`, `POST /api/v1/rfq/{id}/accept-quote`
  - Models: `Quote`, `QuoteItem`, `Quotation`, `QuotationItem`, `RfqMessage`

---

## 11. Factory Showroom Point-of-Sale (POS) Terminal

* **Purpose**: High-speed in-person wholesale ordering terminal at factory showrooms supporting barcode scanners, walk-in customer accounts, cash/wire payments, coupon applications, and direct inventory depletion.
* **Frontend Page**: `src/app/ayc/pos/page.tsx`
* **Backend Implementation**:
  - Service: `App\Services\Order\AdminPosSaleService`
  - Route: `POST /api/v1/pos/checkout`
  - Models: `Order`, `OrderItem`, `Inventory`, `CouponAdminBinding`
* **Associated Tests**: `tests/Feature/Pos/AdminPosSaleWorkflowTest.php`.

---

## 12. Administrative Management Suite (`/ayc`)

* **Purpose**: Back-office operations center for factory merchandisers, store managers, and system administrators.
* **Sub-modules**:
  - Products & Inventory Management: `/ayc/products`, `/ayc/inventory`, `/ayc/products/stock`
  - Order Processing & Payment Auditing: `/ayc/orders`, `/ayc/orders/[id]`
  - Customer Accounts & Verification Status: `/ayc/customers`, `/ayc/customers/[id]`
  - Promotional Coupons & Sales Bindings: `/ayc/coupons`, `/ayc/coupon-sales`
  - RBAC Roles & Permissions: `/ayc/roles`, `/ayc/permissions`, `/ayc/administrators`
  - Global Store Settings & Homepage Banners: `/ayc/settings`, `/ayc/homepage`
* **Backend Implementation**: `App\Http\Controllers\Api\V1\Admin\*` controllers, protected by `auth:sanctum` and `role:admin`.

---

## 13. Transactional Email & Notification Engine

* **Purpose**: Delivers critical lifecycle emails including account email verification challenges, password resets, order placement confirmations with attached PDFs, payment confirmations, and RFQ updates.
* **Backend Implementation**:
  - Service: `App\Services\Mail\OrderEmailService`
  - Jobs: `SendOrderConfirmationEmailJob`, `SendOrderConfirmedEmailJob`, `SendPaymentProofReceivedEmailJob`
  - Mailables: `CustomerOrderConfirmationMail`, `CustomerOrderConfirmedMail`, `CustomerPaymentProofReceivedMail`
  - Model: `OrderEmailDispatch` (tracks dispatch timestamps, recipients, and attachment sizes)
* **Byte Parity Invariant**: Attachments generated via `SendOrderConfirmationEmailJob` use the exact same cached PDF artifacts as customer portal downloads, guaranteeing 100% SHA-256 byte parity.

---

## 14. SEO, Social Sharing & Dynamic Graph Meta

* **Purpose**: Optimizes global search visibility through Open Graph tags, Twitter/X cards, dynamic sitemaps, JSON-LD Schema.org structured data, and high-performance canonical URLs.
* **Frontend Implementation**:
  - Metadata Generators: `src/app/products/[slug]/page.tsx` (`generateMetadata`)
  - Dynamic Sitemap: `src/app/sitemap.ts`
  - Robots: `src/app/robots.ts`
  - Dynamic Open Graph Images: `src/app/products/[slug]/opengraph-image.tsx`
* **Associated Tests**: `tests/seo-metadata.test.ts`.
