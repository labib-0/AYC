# AYC Live Storefront Audit — Defect Classification & Remediation Plan

**Audit Date:** 2026-10-28  
**Target Host:** `https://ayaanclothing.com`  
**Active Production Release:** `release_20261028_053947_47692ee`  
**Overall Status:** PASS (Zero Critical, High, or Medium defects found)

---

## 1. Defect Severity Classification Summary

| Severity | Description | Count |
| :--- | :--- | :---: |
| **Critical** | Core journey unusable, data loss, or server crash | **0** |
| **High** | Major shopping/account workflow broken, severe responsive failure | **0** |
| **Medium** | Important functionality impaired, significant layout breakage | **0** |
| **Low** | Minor visual defects, isolated copy/asset issues | **1** |
| **Observation** | Non-breaking behavioral pattern or usability enhancement | **2** |

---

## 2. Itemized Defects & Observations

### DEF-01 — Missing Static Vector Assets for Niche Brand Logos (404 Console Errors)
* **Severity:** **`Low`** (Cosmetic / Console Noise) — **[STATUS: RESOLVED]**
* **Affected Surface:** Storefront Homepage (`/`), Catalog Search (`/search`), and Product Cards.
* **Component:** [`src/services/product.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/product.service.ts), [`src/lib/brand-logos.ts`](file:///Users/labibhasan/Documents/AYC/src/lib/brand-logos.ts), [`src/components/home/ShopByBrand.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/home/ShopByBrand.tsx), and [`public/brands/`](file:///Users/labibhasan/Documents/AYC/public/brands/).
* **Evidence:** Browser console logs recorded 404 responses for:
  - `https://ayaanclothing.com/brands/aarab.svg`
  - `https://ayaanclothing.com/brands/pepco-women.svg`
  - `https://ayaanclothing.com/brands/grupo-inditex.svg`
* **Root Cause:** When a product record does not have an uploaded `brand_logo` in media storage, `product.service.ts` dynamically synthesized `/brands/${brand.slug}.svg`. While major brands (`adidas.svg`, `zara.svg`, `nike.svg`, etc.) exist in `public/brands/`, niche brands lack local SVGs. The component's `onError` handler gracefully fell back to text/placeholder, but the network request returned HTTP 404.
* **Resolution Applied:**
  - In [`src/lib/brand-logos.ts`](file:///Users/labibhasan/Documents/AYC/src/lib/brand-logos.ts), added `VERIFIED_STATIC_BRAND_LOGOS` whitelist. Static `/brands/*` paths are only resolved if verified to exist in the static registry; unverified static paths return `null` instead of generating 404 network attempts.
  - In [`src/services/product.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/product.service.ts) and [`src/components/home/ShopByBrand.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/home/ShopByBrand.tsx), replaced blind `/brands/${slug}.svg` fallbacks with verified resolution via `getBrandLogoUrl`.
  - Verified with test: `tests/verify-minor-audit-fixes.test.ts` (3/3 pass).

---

### OBS-01 — Escape Key Dismissal Omitted on Mobile Drawer and Mini-Cart Sheet
* **Severity:** **`Observation`** (Accessibility Enhancement) — **[STATUS: RESOLVED]**
* **Affected Surface:** Mobile Navigation Drawer (`#mobile-navigation-drawer`) and Mini-Cart Sheet.
* **Component:** [`src/components/layout/Header.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/Header.tsx) and [`src/components/cart/MiniCart.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/cart/MiniCart.tsx).
* **Observed Behavior:** Both overlays closed reliably on clicking their respective close buttons (`button[aria-label='Close menu']`, `button[aria-label='Close cart']`) and on backdrop clicks. However, pressing the physical `Escape` key on a keyboard did not dismiss them.
* **Resolution Applied:**
  - In [`src/components/layout/Header.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/Header.tsx), expanded the keydown effect to listen when either `isSearchOpen` or `isMobileMenuOpen` is active, closing the mobile navigation drawer when `Escape` is pressed.
  - In [`src/components/cart/MiniCart.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/cart/MiniCart.tsx), added a dedicated `keydown` event listener that invokes `setIsCartOpen(false)` on `Escape`.
  - Verified with test: `tests/verify-minor-audit-fixes.test.ts` (2/2 pass).

---

### OBS-02 — Direct Navigation to `/rfq` Enforces Authentication Redirection
* **Severity:** **`Observation`** (Architectural Design Alignment)
* **Affected Surface:** Request for Quotation Pathway (`/rfq`).
* **Observed Behavior:** When an unauthenticated visitor navigates directly to `/rfq` or clicks "Request Quote (RFQ)" on a Product Detail Page, the application redirects to:  
  `https://ayaanclothing.com/login?returnUrl=%2Frfq&notice=Please%20log%20in%20with%20a%20customer%20account%20to%20submit%20an%20RFQ.`
* **Customer Impact:** Prevents anonymous spam bot submissions by requiring a registered buyer account. Guest visitors see a clear banner explaining why sign-in is required, with `returnUrl` preserved.
* **Architectural Alignment:** Working as intended for commercial B2B wholesale platform security.

