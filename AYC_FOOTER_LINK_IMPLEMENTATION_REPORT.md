# AYC — Footer Navigation and Link Implementation Report (Phase 2)

**Target Website:** `https://ayaanclothing.com`  
**Date:** October 12, 2026  
**Engineer:** Senior Next.js, TypeScript & UX Engineer  
**Phase:** Phase 2 — Implementation & Verification of Verified Link Fixes  
**Status:** **COMPLETE & VERIFIED** (All tests passing; browser automation verified)

---

## 1. Executive Summary

In accordance with [`AYC_FOOTER_LINK_AUDIT.md`](./AYC_FOOTER_LINK_AUDIT.md), Phase 2 has implemented verified link fixes across the customer-facing footer of Ayaan Clothing (`src/components/layout/Footer.tsx`), contact information navigation, and social profile handling without altering the brand identity, visual layout, or inventing unapproved business policies.

All 10 areas specified in the requirements have been resolved:
1. **"ABOUT US ↗"**: Converted from an inert `<button>` targeting a nonexistent DOM element into a semantic Next.js link to `/#top-banner` (the authoritative company hero and overview). Works from both homepage and inner routes. Obsolete event listeners (`expand-about-us`) were removed.
2. **"Explore Buyer Capabilities →"**: Converted into an accessible `<Link href="/rfq">` navigating directly to the wholesale RFQ and buyer capabilities portal.
3. **"Compliance & Certifications (AQL 2.5)"**: Replaced dead DOM query for `#brand-trust` with semantic `<Link href="/#certificate">`. Navigates to the real Certificate section with `scroll-mt-20` for sticky header clearance.
4. **"Export Shipping & Incoterms" & "Wholesale FAQ"**: Purged/hidden from the visible footer pending authoritative content approval to prevent dead hash fragments (`#shipping`, `#faq`).
5. **Physical Business Address**: Linked dynamically to Google Maps search URL with `target="_blank"` and `rel="noopener noreferrer"`.
6. **Official Public Email**: Added accessible email row with `Mail` icon, dynamic `export@ayaanclothing.com`, and `mailto:` link.
7. **Social Media Profiles (LinkedIn & Instagram)**: Implemented safe social link validator (`src/lib/social-links.ts`). Generic platform-root URLs (`https://linkedin.com`, `https://instagram.com`) are automatically hidden in the public footer until official company profiles are entered in Admin Settings. The verified official Facebook profile and WhatsApp links remain intact. Unsafe protocols (`javascript:`) are rejected.
8. **Direct Telephone (`tel:`) Dialing**: Added an accessible direct telephone row (`tel:+8801620853502`) with `Phone` icon, operating independently of the WhatsApp chat link.
9. **Accessibility & Mobile Spacing**: Social icon tap targets increased to 40×40 px (`w-10 h-10`). Added `pb-20 sm:pb-10` bottom padding to eliminate visual overlap/crowding by floating WhatsApp and Back-to-Top buttons on mobile screens ($\le 390\text{ px}$).
10. **Automated Testing & Browser Automation**: Added master test suite `tests/footer-navigation-and-contact-links.test.ts` (42/42 assertions passed). Verified via full browser automation recording.

---

## 2. Each Audit Finding and Its Resolution

| # | Element | Audit Finding | Resolution Implemented | Destination URL |
|---|---|---|---|---|
| 1 | **"ABOUT US ↗"** | Non-functional `<button>` targeting nonexistent `#built-for-international-buyers`. Dead `expand-about-us` custom event. | Replaced button with semantic Next.js `<Link>`. Removed dead click handler and event. | `/#top-banner` |
| 2 | **"Explore Buyer Capabilities →"** | Non-functional `<button>` querying nonexistent `#built-for-international-buyers`. | Replaced button with semantic Next.js `<Link>`. | `/rfq` |
| 3 | **"Compliance & Certifications (AQL 2.5)"** | Non-functional `<button>` searching for `#brand-trust`. Real DOM section is `#certificate`. | Replaced button with semantic Next.js `<Link>`. Target `#certificate` has `scroll-mt-20` header clearance. | `/#certificate` |
| 4 | **"Export Shipping & Incoterms"** | Dead anchor `#shipping` with no matching policy section or dedicated page. | Removed/hidden from visible footer pending business-approved content. | *Hidden pending content* |
| 5 | **"Wholesale FAQ"** | Dead anchor `#faq` with no matching FAQ page or section. | Removed/hidden from visible footer pending business-approved content. | *Hidden pending content* |
| 6 | **Business Address & MapPin** | Static unlinked `<span>` text without Google Maps navigation. | Wrapped address and MapPin in accessible `<a>` tag with encoded Google Maps search API. | `https://www.google.com/maps/search/?api=1&query=House+%2333...` |
| 7 | **Official Public Email** | Missing from footer despite `export@ayaanclothing.com` existing in backend settings. | Added contact row with `Mail` icon, public email, and `mailto:` link. | `mailto:export@ayaanclothing.com` |
| 8 | **Direct Phone Dialing** | Phone was only accessible via WhatsApp chat link; no direct voice dialing. | Added independent direct telephone row with `Phone` icon and `tel:` action using normalized E.164 digits. | `tel:+8801620853502` |
| 9 | **LinkedIn Social Icon** | Targeted generic `https://linkedin.com` homepage. | Filtered out from public footer via `isConfiguredSocialUrl` until official company profile URL is provided. Admin portal preserved. | *Hidden pending official handle* |
| 10 | **Instagram Social Icon** | Targeted generic `https://instagram.com` homepage. | Filtered out from public footer via `isConfiguredSocialUrl` until official handle is provided. Admin portal preserved. | *Hidden pending official handle* |
| 11 | **Facebook Social Icon** | Targeted verified profile `https://www.facebook.com/profile.php?id=61579913706663`. | Kept intact and active. Enlarged touch target to 40×40 px. | `https://www.facebook.com/profile.php?id=61579913706663` |
| 12 | **Mobile Floating Button Crowding** | On $\le 390\text{ px}$ screens, floating buttons crowded legal links. Touch targets were 32×32 px. | Added `pb-20 sm:pb-10` padding and expanded touch targets to 40×40 px. | Visual & Ergonomic Fix |

---

## 3. Changed Files

1. **[`src/components/layout/Footer.tsx`](./src/components/layout/Footer.tsx)**
   - Replaced "ABOUT US" and "Explore Buyer Capabilities" buttons with semantic Next.js `<Link>` elements.
   - Removed dead event handlers (`handleAboutUsClick`, `handleComplianceClick`, and `expand-about-us`).
   - Replaced "Compliance & Certifications" button with `<Link href="/#certificate">`.
   - Omitted dead `#shipping` and `#faq` entries.
   - Wrapped physical address and MapPin in external Google Maps search link (`target="_blank"`, `rel="noopener noreferrer"`).
   - Added official public email row (`Mail` icon, `mailto:export@ayaanclothing.com`).
   - Added direct telephone row (`Phone` icon, `tel:+8801620853502`).
   - Sourced social links through `filterConfiguredSocialLinks` to suppress generic platform roots.
   - Increased social icon button touch targets to `w-10 h-10` (40×40 px).
   - Added `pb-20 sm:pb-10` to eliminate visual crowding with floating buttons on mobile.
   - Removed unused icon components at bottom of file.

2. **[`src/lib/social-links.ts`](./src/lib/social-links.ts)** *(New)*
   - `isValidHttpUrl(url)`: Strictly validates `http:` and `https:` protocols, rejecting `javascript:`, `data:`, or malformed URLs.
   - `isConfiguredSocialUrl(url)`: Detects generic platform roots (`linkedin.com`, `instagram.com`, etc.) without a profile path or query ID.
   - `filterConfiguredSocialLinks(links)`: Filters active social links ensuring only verified destinations render publicly.

3. **[`src/types/settings.ts`](./src/types/settings.ts)**
   - Added `company_name?: string;`, `public_email?: string;`, `public_phone?: string;`, `public_address?: string;` to `PublicSiteSettings` interface to match Laravel API payload.

4. **[`src/config/business-profile.ts`](./src/config/business-profile.ts)**
   - Configured `BUSINESS_PROFILE.contact.email` to authoritative `"export@ayaanclothing.com"`.

5. **[`src/lib/SiteSettingsContext.tsx`](./src/lib/SiteSettingsContext.tsx)**
   - Added `public_email`, `public_phone`, `public_address`, and official Facebook URL into `INITIAL_SETTINGS`.

6. **[`src/services/site-settings.service.ts`](./src/services/site-settings.service.ts)**
   - Added `public_email`, `public_phone`, `public_address`, and official Facebook URL into `DEFAULT_PUBLIC_SETTINGS`.

7. **[`src/components/admin/settings/social/SocialLinksSettings.tsx`](./src/components/admin/settings/social/SocialLinksSettings.tsx)**
   - Integrated `isValidHttpUrl` to validate social URLs before saving, preventing accidental `javascript:` or malformed inputs.

8. **[`tests/footer-navigation-and-contact-links.test.ts`](./tests/footer-navigation-and-contact-links.test.ts)** *(New)*
   - Master automated test suite covering all 10 Phase 2 checkpoints.

9. **[`scripts/run-storefront-regression.mjs`](./scripts/run-storefront-regression.mjs)**
   - Added `footer-navigation-and-contact-links.test.ts` into the standard Storefront Unit regression gate.

---

## 4. Confirmed Working Destinations vs. Intentionally Hidden Entries

### Confirmed Working Footer Links (Visible & Active)
| Label / Item | Type | Destination | Verification Method |
|---|---|---|---|
| **AYC Brand Logo** | Internal Link | `/` (Homepage) | Automated test & browser subagent |
| **ABOUT US ↗** | Internal Hash Link | `/#top-banner` | Automated test & browser subagent |
| **Explore Buyer Capabilities →** | Internal Page Link | `/rfq` | Automated test & browser subagent |
| **All Products** | Catalog Link | `/search` | Regression test |
| **New Arrivals** | Catalog Link | `/search?sort=newest` | Regression test |
| **Best Deals & Hot Sales** | Catalog Link | `/search?sort=popular` | Regression test |
| **Men's Collection** | Audience Filter | `/search?audience=MEN` | Regression test |
| **Women's Apparel** | Audience Filter | `/search?audience=WOMEN` | Regression test |
| **Boys Fashion** | Audience Filter | `/search?audience=BOYS` | Regression test |
| **Girls Wear** | Audience Filter | `/search?audience=GIRLS` | Regression test |
| **Unisex Essentials** | Audience Filter | `/search?audience=UNISEX` | Regression test |
| **Categories (Top 9)** | Dynamic Category | `/search?category={name}` | Regression test |
| **Brands (Top 9)** | Dynamic Brand | `/search?brand={name}` | Regression test |
| **Request for Quotation (RFQ) →** | Internal Page Link | `/rfq` | Regression test & browser subagent |
| **Compliance & Certifications (AQL 2.5)** | Internal Hash Link | `/#certificate` | Automated test & browser subagent |
| **Physical Address & MapPin** | External Search Link | Google Maps Search API | Automated test & browser subagent |
| **Official Email** | Mailto Link | `mailto:export@ayaanclothing.com` | Automated test & browser subagent |
| **Direct Phone** | Tel Link | `tel:+8801620853502` | Automated test & browser subagent |
| **WhatsApp Business** | External WhatsApp | `https://wa.me/8801620853502?...` | Automated test & browser subagent |
| **Facebook Profile** | External Social | `https://www.facebook.com/profile.php?id=61579913706663` | Automated test & browser subagent |
| **Privacy Policy** | Legal Page Link | `/privacy-policy` | Regression test & browser subagent |
| **Terms & Conditions** | Legal Page Link | `/terms-and-conditions` | Regression test & browser subagent |
| **Back to Top Button** | In-page Action | `window.scrollTo({ top: 0 })` | Automated test & browser subagent |
| **Floating WhatsApp Button** | External Action | `https://wa.me/8801620853502?...` | Automated test & browser subagent |

### Intentionally Hidden Footer Entries (Pending Approved Content/Handles)
| Item | Reason for Hiding | Requirements for Activation |
|---|---|---|
| **Export Shipping & Incoterms** | Dead fragment `#shipping`. No authoritative shipping policy or Incoterms page exists. | Create and approve either `/shipping-and-incoterms` policy page or add an export shipping section in `/terms-and-conditions#shipping`. |
| **Wholesale FAQ** | Dead fragment `#faq`. No FAQ section or route exists on the website. | Author and publish official B2B wholesale FAQ content (e.g. `/rfq#faq` or `/faq`). |
| **LinkedIn Social Icon** | Database contained generic platform root `https://linkedin.com`. Not an official company presence. | Ayaan Clothing management to supply official verified company page URL (e.g. `https://www.linkedin.com/company/ayaanclothing`) and enter via Admin &rarr; Settings &rarr; Social Links. |
| **Instagram Social Icon** | Database contained generic platform root `https://instagram.com`. Not an official handle. | Ayaan Clothing management to supply official Instagram handle (e.g. `https://www.instagram.com/ayaanclothing`) and enter via Admin &rarr; Settings &rarr; Social Links. |

---

## 5. Tests Executed and Actual Results

### 1. Master Footer Navigation Test Suite
```bash
npx tsx tests/footer-navigation-and-contact-links.test.ts
```
**Result: 42 PASSED, 0 FAILED** (100% pass rate)

Checkpoints verified:
- [x] ABOUT US uses semantic link to `/#top-banner`; obsolete event handler removed.
- [x] Explore Buyer Capabilities links to `/rfq`; target route exists.
- [x] Compliance & Certifications links to `/#certificate`; header clearance verified via `scroll-mt-20`.
- [x] Dead `#shipping` and `#faq` anchors omitted.
- [x] Google Maps link correctly formatted and encoded from authoritative address with `_blank` / `noopener`.
- [x] Official email renders with `mailto:export@ayaanclothing.com` and `Mail` icon.
- [x] Direct telephone link (`tel:+8801620853502`) and WhatsApp link operate independently.
- [x] Social link filter rejects generic platform roots (`linkedin.com`, `instagram.com`) while allowing verified Facebook profile.
- [x] All 8 shop links, dynamic taxonomies, and legal routes preserved.
- [x] Mobile bottom padding (`pb-20`) and semantic HTML tags verified.

### 2. Storefront Regression Gate
```bash
npm test
```
**Result: Storefront Unit: PASS (45/45 passed), Storefront Contract: PASS**

### 3. Static Type Analysis
```bash
npx tsc --noEmit
```
**Result: PASS (0 TypeScript errors)**

### 4. Code Quality & Linting
```bash
npm run lint
```
**Result: PASS (0 errors)**

### 5. Production Build Compilation
```bash
npm run build
```
**Result: PASS (56/56 routes compiled and optimized in 1.5 seconds)**

### 6. Browser Automation & Visual Inspection
- Executed via browser subagent on local server (`http://localhost:3000`).
- Verified navigation from desktop (1920×1080) and mobile (390×844).
- Verified clicking "Explore Buyer Capabilities →" navigates to `/rfq`.
- Verified clicking "Compliance & Certifications (AQL 2.5)" scrolls smoothly to `#certificate`.
- Verified address opens Google Maps search in new tab.
- Verified email, direct phone, and WhatsApp contact rows.
- Verified floating action buttons do not overlap or crowd copyright content on mobile screens.

---

## 6. Remaining Blockers & Next Actions for Management

There are **zero technical blockers**. The footer implementation is clean, robust, and fully functional.

Outstanding business items for Ayaan Clothing management:
1. **Official LinkedIn Company URL:** When registered, add via Admin &rarr; Settings &rarr; Social Links (`https://www.linkedin.com/company/...`). It will automatically pass validation and appear in the footer.
2. **Official Instagram Profile Handle:** When registered, add via Admin &rarr; Settings &rarr; Social Links (`https://www.instagram.com/...`). It will automatically appear in the footer.
3. **Export Shipping & Incoterms Content:** If management wishes to display shipping policies, author the terms (e.g. FOB Chittagong, CFR, CIF, payment terms) and decide whether to add them to `/terms-and-conditions` or create `/shipping`.
4. **Wholesale FAQ Content:** If management wishes to display an FAQ, author the official Q&A answers for wholesale apparel sourcing.
