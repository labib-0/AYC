# AYC — Footer Navigation and Link Audit Report

**Target Website:** `https://ayaanclothing.com`  
**Date:** October 11, 2026  
**Auditor:** Senior Frontend Engineer & UX Auditor  
**Phase:** Phase 1 — Comprehensive Audit Only (No code changes implemented)

---

## 1. Actual Footer Structure and Source File Locations

The customer-facing footer of Ayaan Clothing is implemented as a shared client component rendered globally via `StorefrontShell` on all public customer routes (excluding internal `/ayc/*` admin routes).

### Primary Source Files:
- **Footer Component:** [`src/components/layout/Footer.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/layout/Footer.tsx)
- **Shell Wrapper:** [`src/components/layout/StorefrontShell.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/layout/StorefrontShell.tsx)
- **Root Layout:** [`src/app/layout.tsx`](file:///Users/luhasan/Documents/ayaan/src/app/layout.tsx)
- **Authoritative Business Profile Config:** [`src/config/business-profile.ts`](file:///Users/luhasan/Documents/ayaan/src/config/business-profile.ts)
- **Runtime Settings Provider:** [`src/lib/SiteSettingsContext.tsx`](file:///Users/luhasan/Documents/ayaan/src/lib/SiteSettingsContext.tsx)
- **Social Icon Line-Style SVG Component:** [`src/components/common/SocialIcon.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/common/SocialIcon.tsx)
- **Admin Settings Portal (Social & WhatsApp):** [`src/components/admin/settings/social/SocialLinksSettings.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/settings/social/SocialLinksSettings.tsx)

### Data Architecture (Hardcoded vs. Dynamic Database):
1. **Hybrid Architecture:** The footer combines static structural navigation with live dynamic database taxonomies and settings:
   - **Company Branding & Address:** Sourced from static config `BUSINESS_PROFILE` in `src/config/business-profile.ts` with live overrides from `SiteSettingsContext`.
   - **Shop Links (Collections):** Hardcoded static search query links in `Footer.tsx` (`/search?audience=...`, `/search?sort=...`).
   - **Categories:** Dynamic database-driven via `categoryService.getCategories()` (displays top 9 active, non-gender categories with fallback static list).
   - **Brands:** Dynamic database-driven via `brandService.getBrands()` (displays top 9 active brands with fallback static list).
   - **Social Media Links:** Dynamic database-driven from `SystemSetting` table (`key: social_links`) managed via Admin Settings (`/ayc/settings`).
   - **Legal Pages:** Dynamic database-driven from `SystemSetting` (`key: legal_pages`) with fallback to `/privacy-policy` and `/terms-and-conditions`.
   - **WhatsApp Contact:** Dynamic from `SystemSetting` / `business-profile.ts` using normalized E.164 digits `8801620853502`.

---

## 2. Visual Browser Evidence

Browser inspections were conducted on both Desktop (1920×1080) and Mobile (390×844) viewports:

- **Desktop Footer Full Capture:**  
  `ayaan_footer_1791730786380.png`  
  Shows the full 5-column layout, social icons, business address, disclaimer, and bottom legal links.
- **Mobile Footer Capture:**  
  `mobile_footer_1791731036743.png` & `mobile_footer_1791731018067.png`  
  Shows single-column vertical flow, floating action buttons (Back-to-Top and WhatsApp), and touch ergonomics.

---

## 3. Comprehensive Inventory and Audit Findings Table

The table below catalogs every visible text element, heading, icon, link, and interactive control in the footer:

| Element | Footer section | Current behavior | Intended destination/action | Finding | Priority |
|---|---|---|---|---|---|
| **AYC Brand Logo & Mark** | Column 1: Branding | `<Link href="/">` wraps HeaderBranding; clicks navigate to homepage | `https://ayaanclothing.com/` | **WORKING** | Low |
| **"ABOUT US ↗"** | Column 1: Branding | `<button onClick={handleAboutUsClick}>` queries `#built-for-international-buyers`; ID **does not exist** in DOM; event `expand-about-us` has no listener; **does nothing** | Should navigate to homepage `#homepage-ticker` / `#top-banner`, or open an About Us modal / dedicated company page; on non-homepage routes, must navigate to `/#...` | **BROKEN** | **High** |
| **Company Description Text** | Column 1: Branding | Static `<p>` text: "Original-Branded Garments Manufacturer & Exporter. Established in 2010..." | Informational branding copy | **DECORATIVE** | Low |
| **"Explore Buyer Capabilities →"** | Column 1: Branding | `<button onClick={handleAboutUsClick}>` styled as an underlined hyperlink; queries nonexistent `#built-for-international-buyers`; **does nothing** | Should link to `/rfq` (Request for Quotation / Buyer capabilities) or an authoritative capabilities section | **BROKEN** | **High** |
| **"SHOP"** | Column 2: Shop | Static `<h3>` heading | Section category label | **DECORATIVE** | Low |
| **"All Products"** | Column 2: Shop | `<Link href="/search">`; navigates to complete catalog | `/search` | **WORKING** | Low |
| **"New Arrivals"** | Column 2: Shop | `<Link href="/search?sort=newest">`; navigates to catalog sorted by newest | `/search?sort=newest` | **WORKING** | Low |
| **"Best Deals & Hot Sales"** | Column 2: Shop | `<Link href="/search?sort=popular">`; navigates to catalog sorted by popular items | `/search?sort=popular` (or `/#hot-sales`) | **WORKING** | Low |
| **"Men's Collection"** | Column 2: Shop | `<Link href="/search?audience=MEN">`; filters catalog for Men | `/search?audience=MEN` | **WORKING** | Low |
| **"Women's Apparel"** | Column 2: Shop | `<Link href="/search?audience=WOMEN">`; filters catalog for Women | `/search?audience=WOMEN` | **WORKING** | Low |
| **"Boys Fashion"** | Column 2: Shop | `<Link href="/search?audience=BOYS">`; filters catalog for Boys | `/search?audience=BOYS` | **WORKING** | Low |
| **"Girls Wear"** | Column 2: Shop | `<Link href="/search?audience=GIRLS">`; filters catalog for Girls | `/search?audience=GIRLS` | **WORKING** | Low |
| **"Unisex Essentials"** | Column 2: Shop | `<Link href="/search?audience=UNISEX">`; filters catalog for Unisex | `/search?audience=UNISEX` | **WORKING** | Low |
| **"CATEGORIES"** | Column 3: Categories | Static `<h3>` heading | Section category label | **DECORATIVE** | Low |
| **Dynamic Category Links (9)** (e.g. BODYCON, Blouses, Jeans, Knit Top, Knitwear, LONG PANT, Plazo, Sleepsuits, T-Shirts) | Column 3: Categories | `<Link href="/search?category=...">`; queries active categories from API and filters catalog | `/search?category={category_name}` | **WORKING** | Low |
| **"BRANDS"** | Column 4: Brands | Static `<h3>` heading | Section category label | **DECORATIVE** | Low |
| **Dynamic Brand Links (9)** (e.g. 3, 7 days It, 8 Seconds, A&D London, AARAB, ADMIRAL, ARM AND THIERY, BERTONI, BLCK LABL) | Column 4: Brands | `<Link href="/search?brand=...">`; queries active brands from API and filters catalog | `/search?brand={brand_name}` | **WORKING** | Low |
| **"WHOLESALE SOURCING"** | Column 5: Sourcing | Static `<h3>` heading | Section category label | **DECORATIVE** | Low |
| **"Request for Quotation (RFQ) →"** | Column 5: Sourcing | `<Link href="/rfq">`; navigates to public wholesale RFQ submission form | `/rfq` | **WORKING** | Low |
| **"Compliance & Certifications (AQL 2.5)"** | Column 5: Sourcing | `<button onClick={handleComplianceClick}>` queries `#brand-trust`; actual section ID in `BrandTrust.tsx` is `#certificate`; **fails to scroll and does nothing**; on inner pages has no route | Should scroll to `/#certificate` on homepage, or navigate to `https://ayaanclothing.com/#certificate` when clicked from inner pages | **BROKEN** | **High** |
| **"Export Shipping & Incoterms"** | Column 5: Sourcing | `<Link href="#shipping">`; anchor `#shipping` **does not exist anywhere on the website**; appends `#shipping` to URL and does nothing | Missing destination; requires either an Export Incoterms modal/drawer, dedicated policy page, or `/terms-and-conditions#shipping` anchor | **BROKEN / MISSING CONFIGURATION** | **High** |
| **"Wholesale FAQ"** | Column 5: Sourcing | `<Link href="#faq">`; anchor `#faq` **does not exist anywhere on the website**; appends `#faq` to URL and does nothing | Missing destination; no FAQ page or section currently exists; requires business confirmation | **BROKEN / MISSING CONFIGURATION** | **High** |
| **LinkedIn Social Icon** | Column 5: Social Icons | `<a href="https://linkedin.com">`; opens generic `https://linkedin.com` homepage in new tab | Official Ayaan Clothing LinkedIn Company Page | **WRONG DESTINATION / MISSING CONFIGURATION** | **Medium** |
| **Instagram Social Icon** | Column 5: Social Icons | `<a href="https://instagram.com">`; opens generic `https://instagram.com` homepage in new tab | Official Ayaan Clothing Instagram Profile | **WRONG DESTINATION / MISSING CONFIGURATION** | **Medium** |
| **Facebook Social Icon** | Column 5: Social Icons | `<a href="https://www.facebook.com/profile.php?id=61579913706663">`; opens official Ayaan Clothing Facebook profile | `https://www.facebook.com/profile.php?id=61579913706663` | **WORKING** | Low |
| **MapPin Icon & Physical Address** | Column 5: Contact Info | Static `<span>`: "House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh" with decorative `<MapPin>` icon; **no link attached** | Should open Google Maps search for AYC office: `https://www.google.com/maps/search/?api=1&query=House+%2333+%282nd+floor%29%2C+Road+%2312%2C+Sector+%2311%2C+Uttara%2C+Dhaka-1230%2C+Bangladesh` in new tab | **UNLINKED** | **Medium** |
| **WhatsApp Icon & Phone Text** | Column 5: Contact Info | `<a href={getWhatsAppUrl(...)}>`; opens `https://wa.me/8801620853502?text=...` in new tab | `https://wa.me/8801620853502?...` | **WORKING** | Low |
| **Direct Phone (`tel:`) Call Action** | Column 5: Contact Info | Phone number is only presented inside the WhatsApp chat link; no direct `tel:` dialing link | Optional `tel:+8801620853502` action for mobile buyers wanting direct voice call | **UNLINKED / USABILITY ENHANCEMENT** | Low |
| **Official Public Email Address** | Column 5: Contact Info | Backend has authoritative `public_email: "export@ayaanclothing.com"`, but **it is not rendered in the footer at all** | Display `export@ayaanclothing.com` with `<a href="mailto:export@ayaanclothing.com">` link | **MISSING CONFIGURATION / UNLINKED** | **Medium** |
| **Brand Legal Disclaimer Text** | Full Width Row | Static `<p>`: "Disclaimer: All brand names, logos, trademarks..." | Informational legal disclaimer | **DECORATIVE** | Low |
| **Copyright Notice** | Bottom Row | Static `<p>`: "© 2026 AYAAN CLOTHING. All rights reserved." | Informational copyright notice | **DECORATIVE** | Low |
| **"Privacy Policy"** | Bottom Row: Legal | `<Link href="/privacy-policy">`; navigates to legal privacy policy page | `/privacy-policy` | **WORKING** | Low |
| **"Terms & Conditions"** | Bottom Row: Legal | `<Link href="/terms-and-conditions">`; navigates to legal terms page | `/terms-and-conditions` | **WORKING** | Low |
| **Floating Back-to-Top Button** | Floating Controls | `<button onClick={scrollToTop}>`; smooth scrolls window to top; visible when `scrollY > 400` | Window top scroll | **WORKING** | Low |
| **Floating WhatsApp Button** | Floating Controls | `<a href={getWhatsAppUrl(...)}>`; fixed button bottom-right with WhatsApp icon | `https://wa.me/8801620853502?...` | **WORKING** | Low |

---

## 4. Detailed Analysis of Problematic Elements

### 1. "ABOUT US ↗" and "Explore Buyer Capabilities →" (Column 1)
- **Root Cause:** In earlier versions of the homepage, `ServiceStrip.tsx` had `id="built-for-international-buyers"` and listened to a custom `expand-about-us` DOM event. When `ServiceStrip` was refactored into the dynamic Admin Headline Ticker (`id="homepage-ticker"`), the ID and event listener were removed.
- **Consequence:** 
  1. `document.getElementById("built-for-international-buyers")` returns `null`.
  2. `window.dispatchEvent(new CustomEvent("expand-about-us"))` has no listeners.
  3. Clicks on both buttons are completely inert.
  4. Non-anchor `<button>` tags prevent search crawlers from following them and prevent users from opening in a new tab.

### 2. "Compliance & Certifications (AQL 2.5)" (Column 5)
- **Root Cause:** In `Footer.tsx` line 76, `handleComplianceClick` attempts to locate `document.getElementById("brand-trust")`. However, `BrandTrust.tsx` line 59 defines the section as:
  ```tsx
  <section id="certificate" className="...">
    <span id="certificates" className="sr-only" aria-hidden="true" />
  ```
- **Consequence:** The ID `#brand-trust` does not exist. Clicks fail to scroll anywhere. Furthermore, if clicked from `/search` or `/rfq`, the script fails to navigate back to the homepage.

### 3. "Export Shipping & Incoterms" (`#shipping`) and "Wholesale FAQ" (`#faq`) (Column 5)
- **Root Cause:** These links use placeholder hash fragments (`#shipping`, `#faq`).
- **Consequence:** Neither `#shipping` nor `#faq` exists anywhere on the site. Clicking them causes an abrupt jump or changes the URL fragment with no visual or functional response.

### 4. LinkedIn and Instagram Social Icons (Column 5)
- **Root Cause:** In the production database (`SystemSetting` key `social_links`), LinkedIn is saved as `https://linkedin.com` and Instagram as `https://instagram.com` (generic platform root domains).
- **Consequence:** International B2B buyers clicking the icons are taken to generic login/feed screens rather than Ayaan Clothing's verified business presence.

### 5. Physical Business Address & MapPin Icon (Column 5)
- **Root Cause:** Rendered as a plain `<div>` containing an SVG `<MapPin>` and `<span>{BUSINESS_PROFILE.address.formatted}</span>`.
- **Consequence:** Buyers cannot tap or click to open Google Maps or view navigation directions to the Uttara, Dhaka office.

### 6. Missing Public Business Email (`export@ayaanclothing.com`)
- **Root Cause:** The database and API provide `public_email: "export@ayaanclothing.com"`, but `Footer.tsx` does not render an email address row.
- **Consequence:** B2B buyers seeking official written inquiry via email must hunt for email details elsewhere on the site.

---

## 5. Desktop vs. Mobile Layout Findings

1. **Responsive Column Wrapping:**
   - **Desktop (>=1024px):** 5-column grid (`lg:grid-cols-12`). Clean alignment and generous spacing.
   - **Tablet (640px–1023px):** Wraps into 2–3 columns smoothly.
   - **Mobile (<640px):** Single vertical column. Headings and links stack cleanly with accessible tap targets (min height >= 32px).
2. **Floating Action Button Overlap on Mobile:**
   - On screens `<= 390px` width, the dual floating buttons (Back-to-Top at `bottom-20 right-6` and WhatsApp at `bottom-6 right-6`) hover directly over the right side of the bottom legal disclaimer and copyright row. While `z-index` prevents click blocking of underlying links, visual crowding occurs near the bottom of the page.
3. **Touch Targets:**
   - Social icon buttons have a touch target of `w-8 h-8` (32×32px). Recommended mobile standard is 44×44px or 40×40px with padding.

---

## 6. Destinations Requiring Business-Owner Confirmation

The following elements require business decisions or specific URLs from Ayaan Clothing management:

1. **Official LinkedIn Company URL:**  
   Confirm whether an official company page exists (e.g. `https://www.linkedin.com/company/ayaanclothing` or similar) or whether this icon should be set to inactive in Admin Settings until created.
2. **Official Instagram Profile URL:**  
   Confirm whether an official Instagram handle exists (e.g. `https://www.instagram.com/ayaanclothing` or similar) or whether this icon should be set to inactive until launched.
3. **Export Shipping & Incoterms Destination:**  
   Confirm whether to:
   - Option A: Link to a specific anchor within [`/terms-and-conditions`](file:///Users/luhasan/Documents/ayaan/src/app/terms-and-conditions/page.tsx) (e.g., `/terms-and-conditions#shipping-terms`).
   - Option B: Launch an informative modal detailing FOB Chittagong, CFR, CIF, payment terms, and lead times.
   - Option C: Create a dedicated `/shipping-and-incoterms` page.
4. **Wholesale FAQ Destination:**  
   Confirm whether an FAQ section/page is planned, or whether this link should temporarily redirect to `/rfq#faq` or be omitted from the footer until FAQ content is published.

---

## 7. Prioritized Implementation Plan for Phase 2

When approved to implement fixes, the work should be executed in the following priority order:

### Priority 1: Fix Broken Internal Navigation (Immediate)
1. **Fix "Compliance & Certifications (AQL 2.5)":**
   - Replace the broken button click handler with `<Link href="/#certificate">`.
   - Update ID target from `#brand-trust` to `#certificate`.
   - Ensure it smoothly scrolls on the homepage and navigates from inner routes.
2. **Fix "ABOUT US ↗" and "Explore Buyer Capabilities →":**
   - Change "ABOUT US" to navigate to `/#homepage-ticker` (or dedicated company section).
   - Change "Explore Buyer Capabilities →" to `<Link href="/rfq">` (or `/#featured` catalog discovery).
   - Convert non-semantic `<button>` tags into accessible Next.js `<Link>` elements.
3. **Fix Broken `#shipping` and `#faq` Anchors:**
   - If dedicated pages do not exist, anchor `#shipping` to `/terms-and-conditions` and direct `#faq` to `/rfq`.

### Priority 2: Fix Unlinked & Misdirected Contact/Social Links (High)
1. **Link Business Address to Google Maps:**
   - Wrap the address and MapPin in an external link to Google Maps search:
     `https://www.google.com/maps/search/?api=1&query=House+%2333+%282nd+floor%29%2C+Road+%2312%2C+Sector+%2311%2C+Uttara%2C+Dhaka-1230%2C+Bangladesh`
     with `target="_blank"` and `rel="noopener noreferrer"`.
2. **Add Authoritative Email Address:**
   - Render `export@ayaanclothing.com` with `<a href="mailto:export@ayaanclothing.com">` in the Contact block.
3. **Correct Social Media Links in Database:**
   - Update LinkedIn and Instagram in `SystemSetting` with verified AYC URLs, or mark inactive until provided.

### Priority 3: Mobile Usability & Accessibility Polish (Medium)
1. Increase social icon touch bounding boxes to 40×40px.
2. Add safe padding to the bottom footer row on mobile to prevent floating button visual collision.

---

## Summary of Exact Footer Items Requiring Linking

### High Priority (Broken / Dead Links):
1. **"ABOUT US ↗"** (Currently non-functional `<button>` targeting missing `#built-for-international-buyers`)
2. **"Explore Buyer Capabilities →"** (Currently non-functional `<button>` targeting missing `#built-for-international-buyers`)
3. **"Compliance & Certifications (AQL 2.5)"** (Currently non-functional `<button>` targeting missing `#brand-trust`)
4. **"Export Shipping & Incoterms"** (Dead fragment link to `#shipping`)
5. **"Wholesale FAQ"** (Dead fragment link to `#faq`)

### Medium Priority (Unlinked / Wrong Destination / Missing Data):
6. **Business Address & MapPin Icon** (Unlinked static text &rarr; needs Google Maps URL)
7. **Official Business Email** (Missing from footer &rarr; needs `mailto:export@ayaanclothing.com`)
8. **LinkedIn Social Icon** (Wrong destination &rarr; points to generic `https://linkedin.com`)
9. **Instagram Social Icon** (Wrong destination &rarr; points to generic `https://instagram.com`)

### Working Correctly (No Changes Required):
- AYC Logo (`/`)
- All 8 Shop Collection Links (`/search`, `/search?sort=...`, `/search?audience=...`)
- All 9 Dynamic Category Links (`/search?category=...`)
- All 9 Dynamic Brand Links (`/search?brand=...`)
- Request for Quotation (`/rfq`)
- WhatsApp Contact Link (`https://wa.me/8801620853502?...`)
- Facebook Social Icon (`https://www.facebook.com/profile.php?id=61579913706663`)
- Privacy Policy (`/privacy-policy`)
- Terms & Conditions (`/terms-and-conditions`)
- Back-to-Top Button & Floating WhatsApp Button
