# AYC Live Storefront Audit — Route Inventory & Coverage Baseline

**Audit Date:** 2026-10-28  
**Target Host:** `https://ayaanclothing.com` (Production server `srv2010990` / `200.97.169.230`)  
**Active Production Release:** `release_20261028_053947_47692ee`  
**Browser Engine:** Google Chrome 156.0.7107.0 (Official Build via Puppeteer CDP)

---

## 1. Route Discovery Methodology

The live route inventory was discovered through a multi-vector exploration strategy:
1. **Public Discovery Assets:** Crawled live production [`robots.txt`](https://ayaanclothing.com/robots.txt) and [`sitemap.xml`](https://ayaanclothing.com/sitemap.xml).
2. **Global Navigation Traversal:** Desktop header menus, mobile drawer items, taxonomy links, and footer columns.
3. **Product Catalog Sampling:** Representative live catalog products spanning diverse categories (Men, Women, Boys, Girls), pricing tiers, and gallery layouts.
4. **Commerce & Guest Portals:** Cart, checkout, wishlist, RFQ, order-access guest lookup, login, and registration.
5. **Customer Portal Route Map:** Reverse-verified against Next.js app directory definitions (`src/app/dashboard/*`, `src/app/profile/*`).

---

## 2. Master Route Inventory & Verification Matrix

| Route Path | Page Classification | Auth Required | Discovery Method | Viewports Tested | HTTP Status | Verdict | Notes & Observations |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| **`/`** | Storefront Home | No | Root Domain / Nav | All 13 Viewports | 200 OK | **`PASS`** | Zero horizontal overflow. Dynamic hero, audience cards, categories, design types, and featured products verified. |
| **`/search`** | Catalog & Search | No | Header / Sitemap | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Responsive grid, global filter rail, sort dropdown. 0 overflow. |
| **`/search?categories=Shirts&sort=price_asc`** | Filtered Catalog Listing | No | In-Site Filter Nav | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Facet persistence, price ascending sort evaluated mathematically deterministic. |
| **`/products`** | Catalog Alias Route | No | In-Site Link | Desktop 1440 | 307 Redirect | **`PASS`** | Redirects cleanly to `/search` as canonical product listing. |
| **`/products/mens-short-sleeve-shirt-02`** | Product Detail (Men) | No | Sitemap / Catalog | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Strict 4:5 image gallery aspect ratio, MOQ wholesale pricing tiers ($3.40, $3.20, $3.00), brand logo overlay properly bound within image. |
| **`/products/ladies-short-sleeve-long-tunic-01`** | Product Detail (Women) | No | Sitemap / Catalog | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Multi-tier wholesale MOQ calculations, gallery thumbnails, and description accordions verified. |
| **`/products/boys-long-sleeve-shirt-01`** | Product Detail (Boys) | No | Sitemap / Catalog | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Kids apparel catalog card, stock badges, and specifications render without distortion. |
| **`/cart`** | Shopping Bag / Cart | No | Header / Mini-Cart | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Clean empty state with CTA to catalog. Line items format in USD ($). |
| **`/checkout`** | Checkout Flow | No | Cart CTA | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Multi-step layout, address fields, and currency summary render cleanly. Stop before payment per safety rules. |
| **`/wishlist`** | Customer Wishlist | No | Header / Mobile Nav | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | 4-column desktop grid, refresh button, heart icon state toggle operational. |
| **`/rfq`** | Request for Quotation | Conditional | Header / Footer / PDP | Desktop 1440, Mobile 375 | 200 OK / 307 | **`PASS`** | When accessed unauthenticated, redirects to `/login?returnUrl=%2Frfq&notice=Please+log+in+with+a+customer+account+to+submit+an+RFQ`. |
| **`/privacy-policy`** | Legal Privacy Policy | No | Footer / Sitemap | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Structured legal disclosures, typographic hierarchy, responsive wrapping. |
| **`/terms-and-conditions`** | Legal Terms & Conditions | No | Footer / Sitemap | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Export/import stipulations, FOB/CIF terms, payment gateway disclosures. |
| **`/compliance`** | Ethical & Factory Compliance | No | Footer Navigation | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | BSCI, WRAP, SEDEX certification cards and audit disclosures render without overflow. |
| **`/faq`** | Wholesale & Shipping FAQ | No | Footer Navigation | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Accordions expand and collapse cleanly; contact fallback links operational. |
| **`/login`** | Customer Sign-In | No | Header / Protected Auth | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Clean login form, email/password validation, invalid credential feedback verified. |
| **`/signup`** | Customer Registration | No | Login Tab / Header | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Required field indicators, company name, phone, password confirmation validation. |
| **`/order-access/[reference]`** | Guest Order Tracking | No | Direct URL / Email | Desktop 1440, Mobile 375 | 200 OK | **`PASS`** | Verified with lookup test parameter `/order-access/ORD-TEST-1234`. Clean lookup feedback. |
| **`/404-nonexistent`** | Custom 404 Not Found | No | Direct Invalid URL | Desktop 1440, Mobile 375 | 404 Not Found | **`PASS`** | Branded 404 error page with Return to Home CTA; no unhandled server crash. |

---

## 3. Customer Portal Protected Routes (Authentication Guard Verification)

Every protected customer route was audited in live Chrome to verify strict security boundary enforcement and seamless redirection:

| Protected Route Path | Purpose | Unauthenticated Behavior | Redirect Destination | Verdict | Authenticated Mutation Status |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`/dashboard`** | Importer Dashboard Hub | Intercepted by AuthGuard | `/login?returnUrl=%2Fdashboard&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/dashboard/orders`** | Order History & Tracking | Intercepted by AuthGuard | `/login?returnUrl=%2Fdashboard%2Forders&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/dashboard/quotes`** | Price Quotes & Proforma Invoices | Intercepted by AuthGuard | `/login?returnUrl=%2Fdashboard%2Fquotes&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/dashboard/rfq`** | Submitted RFQs & Inquiries | Intercepted by AuthGuard | `/login?returnUrl=%2Fdashboard%2Frfq&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/dashboard/addresses`** | Saved Shipping/Billing Addresses | Intercepted by AuthGuard | `/login?returnUrl=%2Fdashboard%2Faddresses&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/dashboard/company`** | Importer Business Profile & Tax ID | Intercepted by AuthGuard | `/login?returnUrl=%2Fdashboard%2Fcompany&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/dashboard/documents`** | Commercial Document Hub (PIs, POs) | Intercepted by AuthGuard | `/login?returnUrl=%2Fdashboard%2Fdocuments&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/dashboard/settings`** | Account Security & Passwords | Intercepted by AuthGuard | `/login?returnUrl=%2Fdashboard%2Fsettings&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/dashboard/wishlist`** | Customer Portal Wishlist View | Intercepted by AuthGuard | `/login?returnUrl=%2Fdashboard%2Fwishlist&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/profile`** | Buyer Profile Gateway | Intercepted by AuthGuard | `/login?returnUrl=%2Fprofile&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/profile/details`** | Personal & Contact Details | Intercepted by AuthGuard | `/login?returnUrl=%2Fprofile%2Fdetails&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/profile/orders`** | Profile Order History | Intercepted by AuthGuard | `/login?returnUrl=%2Fprofile%2Forders&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/profile/addresses`** | Profile Address Book | Intercepted by AuthGuard | `/login?returnUrl=%2Fprofile%2Faddresses&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/profile/wishlist`** | Profile Saved Products | Intercepted by AuthGuard | `/login?returnUrl=%2Fprofile%2Fwishlist&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |
| **`/profile/documents`** | Profile Export Documents | Intercepted by AuthGuard | `/login?returnUrl=%2Fprofile%2Fdocuments&notice=...` | **`PASS`** | `BLOCKED — authorized live production customer account unavailable` |

---

## 4. Route Inventory Metrics Summary

* **Total Discovered Routes:** 34
* **Public Storefront & Commerce Routes:** 19 (100% Fully Audited & Verified `PASS`)
* **Protected Customer Portal Routes:** 15 (100% Verified for Auth Protection & Redirection `PASS`; internal data mutation marked `BLOCKED — authorized account unavailable` per Section 1 Operating Rules)
* **Zero 500 Internal Server Errors** encountered across any tested route.

