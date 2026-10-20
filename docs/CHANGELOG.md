# AYAAN CLOTHING (AYC) — Architectural Changelog

**Document Purpose**: Chronological record of major architectural transformations, feature releases, database migrations, and production baselines.  
**Audience**: All Engineering and Product Stakeholders.  
**Last Verified Date**: October 20, 2026  
**Environment Baseline**: Production Release `release_20261020_052638_a8d2fef` on Hostinger VPS `srv2010990`.

---

## [Release 20261020_052638_a8d2fef] — 2026-10-20 (Current Baseline)

### Canonical Product Offer Sheet Architecture & Modal Hardening
* **Order Placed Modal Canonical Integration**: Hardened `handleDownloadOfferSheets` in `src/components/cart/CheckoutModal.tsx` to strictly consume `orderServiceClient.downloadOrderCommercialDocumentPdf(order.id, 'OFFER_SHEET')`.
* **Client-Side Fallback Elimination**: Completely eradicated legacy client-side `jsPDF` loops and uncompressed fallbacks from the checkout modal, guaranteeing zero visual divergence.
* **Pure PHP PDF Merger (`PdfMergerService`)**: Deployed native pure PHP PDF object merger that combines multiple product Offer Sheets in exact order item sequence without external binary dependencies (`gs` or `qpdf`).
* **100% SHA-256 Byte Parity**: Verified that browser downloads and transactional email attachments consume the identical disk cache artifact (`documents_cache/order_{id}/`).
* **Strict Size Enforcements**: Verified that all representative 2- and 3-page product Offer Sheets reside well below the 1.5 MB target (0.15 MB – 0.47 MB observed on live catalog).

### Mandatory Verified-Only Ordering Enforcement
* **Universal Security Rule**: Enforced mandatory rule that no customer can place an order or calculate checkouts until their email address is verified via AYAAN CLOTHING's cryptographic link.
* **Dual-Layer Gate**: Implemented at route level via `EnsureEmailIsVerified` (`verified`) middleware and within `OrderController::store` / `calculateCheckout` returning HTTP 403 `EMAIL_VERIFICATION_REQUIRED`.
* **Google OAuth Boundary**: Enforced that customer accounts created via Google Sign-In have `email_verified_at = null` and must complete AYC's branded verification challenge before ordering.
* **Admin Privilege Isolation**: Strictly blocked administrative accounts from authenticating or linking via Google OAuth.

---

## [Release 20261020_050000] — 2026-10-20

### Product-Level Offer Sheet Pre-Generation Pipeline
* **Database Registry**: Added `product_offer_sheets` migration (`2026_10_20_050000_create_product_offer_sheets_table.php`).
* **Background Worker Job**: Deployed `GenerateProductOfferSheetJob` with 3 retries, exponential backoffs, and `afterCommit()` semantics.
* **CLI Command**: Deployed `php artisan ayaan:pregenerate-offer-sheets {--product=} {--force}` for catalog warming.
* **Deterministic Fingerprints**: Implemented composite hashing covering specifications, primary image, ordered gallery images, brand logo, and exporter company details.

---

## [Release 20261020_030000] — 2026-10-20

### Order Idempotency & Concurrency Protection
* **Migration**: Added `order_idempotency_keys` table (`2026_10_20_030000_create_order_idempotency_keys_table.php`).
* **Double-Click Defense**: Protects checkout submissions against rapid double-clicks and network retry duplicates.

---

## [Release 20261018_090000] — 2026-10-18

### Transactional Email Architecture & Dispatch Tracking
* **Migration**: Added `order_email_dispatches` table to track recipient addresses, dispatch status, error messages, and attached document summaries.
* **Attachment Size Guard**: Enforced 20 MB maximum attachment payload limit on outgoing SMTP messages.
* **Synthetic Walk-In Suppression**: Automatically suppresses email dispatch for showroom POS `@ayaan.local` walk-in accounts.

---

## [Release 20261005_150000] — 2026-10-05

### Factory Showroom Point-of-Sale (POS) Module
* **High-Speed Terminal**: Launched `/ayc/pos` terminal supporting hardware barcode scanners.
* **Sales Operator Service**: Deployed `AdminPosSaleService` managing atomic inventory deductions, walk-in customer creation, and receipt printing.
* **Sales Bindings**: Added `coupon_admin_bindings` to record staff commission attribution.

---

## [Release 20260930_080000] — 2026-09-30

### B2B 3-Tier Volume Pricing & Package Assortments
* **Tiered Wholesale Curves**: Deployed volume discount pricing matrix (Tier 1 MOQ, Tier 2 Volume, Tier 3 Container).
* **Package Assortment Profiles**: Configured carton size distribution ratios (e.g. `S:1, M:2, L:2, XL:1`) and gross weight/CBM profiles.

---

## [Release 20260925_100000] — 2026-09-25

### Custom Manufacturing RFQ Negotiation Pipeline
* **Tech-Pack Uploads**: Enabled customer tech-pack uploads up to 20 MB.
* **Multi-Round Negotiations**: Added `rfq_messages` and formal supplier `quotations` tables.
* **Quote Conversion**: Allows buyers to convert accepted quotations directly into confirmed commercial orders.

---

## [Release 20260831_100000] — 2026-08-31

### Zero-Downtime Atomic Deployment Pipeline
* **Pipeline Script**: Implemented `/var/www/ayaan/scripts/deploy-production.sh`.
* **Atomic Symlink**: Replaced live in-place compilation with `.next_releases/` timestamped folders and `mv -Tf` symlink swaps.
* **Chunk Continuity**: Mirrored previous static chunks into new releases to eliminate client `ChunkLoadError` 404s.
* **Mandatory Release Gate**: Implemented automated post-deployment probes verifying 100% of compiled static chunks return HTTP 200 OK before release activation.
