# AYAAN CLOTHING — Google Organic Search Appearance Improvement Report
**Domain:** `https://www.ayaanclothing.com/`  
**Reference Domain:** `https://ayaanclothing.com.bd/`  
**Execution Date:** October 13, 2026  
**Auditor:** Principal Software Architect & Technical SEO Lead  
**Release Gate Status:** **PASS (46/46 Storefront Suites, 10/10 GSC Technical SEO Suites, 28/28 Brand Positioning Suites)**

---

## Executive Summary

To elevate the Google organic search appearance and brand authority of `https://www.ayaanclothing.com/` to match and exceed the brand recognition, visual polish, and rich snippet discoverability of the reference domain `https://ayaanclothing.com.bd/`, a full technical SEO audit and architectural implementation was executed across the Next.js App Router codebase.

The scope encompassed developer-controlled frontend implementation, HTML head configuration, Next.js metadata APIs, authentic multi-resolution favicon generation, JSON-LD structured data normalization, semantic internal linking, and robots/sitemap harmonization.

---

## 1. Gaps Identified in Existing Implementation

| Area | Before State (Identified Defect) | Risk to Google Organic Appearance |
| :--- | :--- | :--- |
| **Favicon & Apple Touch Icons** | `src/app/layout.tsx` had no `icons` property configured in Next.js `metadata`. `public/` lacked `favicon.ico`, `icon-48x48.png`, `icon-192x192.png`, and `apple-touch-icon.png`. | Googlebot-Image requires square favicons of at least 48×48 px explicitly declared in `<link rel="icon">`. Without it, Google displays a generic default globe icon in mobile & desktop SERPs. |
| **Homepage Title & Snippet** | Mixed case legacy tagline: `"AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter"` with legacy description. | Did not match targeted B2B international apparel procurement queries ("garment manufacturer & exporter in Bangladesh", "OEM production", "factory surplus"). |
| **Homepage Visible H1** | Banner H1 was rendered as `"Your Wholesale Apparel Sourcing Partner"`, diverging from SERP title and metadata. | Google devalues titles that diverge from visible on-page `<h1>` headings; creates brand identity mismatch. |
| **Structured Data (JSON-LD)** | `sameAs` array in `Organization` schema contained generic platform homepages (`https://linkedin.com`, `https://instagram.com`). Phone number had inconsistent formats. | Schema validation warnings; Google penalizes structured data containing placeholder domains or unverified claims. |
| **RFQ Discoverability** | `/rfq` lacked a server-rendered layout with unique metadata, and was accidentally disallowed in `src/app/robots.ts` and omitted from `sitemap.xml`. | Prevented Google from indexing the B2B wholesale quotation portal and providing Sitelinks to buyer inquiry flows. |
| **Anchor Link Hazards** | External or legacy links to `#built-for-international-buyers` and `#brand-trust` had no matching element IDs in their target components. | Broken in-page navigation anchors degrade user signal metrics and cause crawler 404 anchor fragment skips. |

---

## 2. Brand Identity & Favicon Configuration

### 2.1 Asset Generation from Approved Logo
Extracted from the official brand identity assets:
1. `public/favicon.ico`: Multi-resolution icon (including 16×16, 32×32, 48×48, 256×256) directly served at `/favicon.ico` (200 OK).
2. `public/icon-48x48.png`: 48×48 px square PNG icon (Googlebot-Image minimum requirement).
3. `public/icon-96x96.png`: 96×96 px square PNG icon (desktop browser tabs).
4. `public/icon-192x192.png`: 192×192 px square PNG icon (Android / PWA homescreen).
5. `public/icon-256x256.png`: 256×256 px square PNG high-res icon.
6. `public/apple-touch-icon.png`: 180×180 px square PNG icon (iOS Safari).

### 2.2 Next.js App Router Metadata Configuration
Configured in `src/app/layout.tsx`:
```typescript
icons: {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/icon-48x48.png", sizes: "48x48", type: "image/png" },
    { url: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
    { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    { url: "/icon-256x256.png", sizes: "256x256", type: "image/png" },
  ],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
  shortcut: "/favicon.ico",
}
```

### 2.3 Web App Manifest Synchronization
Synchronized `src/app/manifest.ts` with official branding and icon array:
- `name`: `"Ayaan Clothing | Garment Manufacturer & Exporter in Bangladesh"`
- `short_name`: `"Ayaan Clothing"`
- `icons`: Registered `favicon.ico`, `icon-48x48.png`, `icon-96x96.png`, `icon-192x192.png`, `icon-256x256.png`, and `apple-touch-icon.png`.

---

## 3. Homepage Title, Description & Heading Alignment

### 3.1 Authoritative Metadata
Applied across `src/app/layout.tsx`, `src/app/page.tsx`, and `src/lib/seo/config.ts`:

- **Homepage Title:**
  `Ayaan Clothing | Garment Manufacturer & Exporter in Bangladesh`
- **Root Layout Title Template:**
  `%s | Ayaan Clothing`
- **Meta Description:**
  `Bangladesh garment manufacturer and exporter supplying wholesale apparel, original-branded stock lots, factory surplus, and custom OEM production to international buyers.`
- **OpenGraph & Twitter Card:**
  Exact match for Title, Description, and 1200×630 `public/og-image.jpg` preview image.

### 3.2 Visible Content & H1 Harmony
In `src/config/banner.ts` and `src/components/home/TopBannerView.tsx`:
- **Eyebrow Brand Mark:** `Ayaan Clothing`
- **Main Heading (`<h1>`):** `Garment Manufacturer & Exporter in Bangladesh`
- **Supporting Subtitle (`<p>`):** `Bangladesh garment manufacturer and exporter supplying wholesale apparel, original-branded stock lots, factory surplus, and custom OEM production to international buyers.`
- **Photo Alt Text:** `Ayaan Clothing — Garment Manufacturer & Exporter in Bangladesh`

The SERP `<title>`, meta description, on-page `<h1>`, and supporting copy are now in complete alignment.

---

## 4. Structured Data (JSON-LD) Normalization

Implemented in `src/lib/seo/structured-data.ts` and injected in `<head>` during SSR:

### 4.1 Schema.org Organization
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "AYAAN CLOTHING",
  "legalName": "AYAAN CLOTHING",
  "alternateName": ["Ayaan Clothing", "AYC"],
  "url": "https://ayaanclothing.com",
  "logo": "https://ayaanclothing.com/logo.png",
  "description": "Bangladesh garment manufacturer and exporter supplying wholesale apparel, original-branded stock lots, factory surplus, and custom OEM production to international buyers.",
  "foundingDate": "2010",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "House #33 (2nd floor), Road #12, Sector #11",
    "addressLocality": "Uttara, Dhaka",
    "postalCode": "1230",
    "addressCountry": "BD"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+880 1620-853502",
    "contactType": "sales",
    "availableLanguage": ["English", "Bengali"]
  },
  "sameAs": [
    "https://www.facebook.com/profile.php?id=61579913706663"
  ]
}
```
*Note: Unverified placeholder domains (`https://linkedin.com`, `https://instagram.com`) were purged from `sameAs`.*

### 4.2 Schema.org WebSite
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "AYAAN CLOTHING",
  "alternateName": "Ayaan Clothing",
  "url": "https://ayaanclothing.com",
  "description": "Bangladesh garment manufacturer and exporter supplying wholesale apparel, original-branded stock lots, factory surplus, and custom OEM production to international buyers.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://ayaanclothing.com/search?query={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### 4.3 BreadcrumbList & Product Schema
- Product routes (`/products/[slug]`) inject `BreadcrumbList` reflecting `Home > [Category] > [Product Name]`.
- Product schema uses valid commercial price tiers (`AggregateOffer` or `Offer`) with `InStock` / `PreOrder` availability, strictly omitting private internal costs or fabricated review ratings.

---

## 5. Technical SEO, Routing & Internal Linking

### 5.1 Route Discoverability & Robots.txt
- **`src/app/robots.ts`**:
  - Removed `/rfq` from `disallow`.
  - Added `/rfq` to `allow`.
  - Verified `/`, `/sitemap.xml`, `/search`, `/products`, `/products/`, `/privacy-policy`, `/terms-and-conditions`, and `/rfq` are all crawlable.
  - Retained strict disallow on private customer and admin routes (`/ayc`, `/ayc/*`, `/admin`, `/dashboard`, `/cart`, `/checkout`, `/login`, `/signup`).

### 5.2 Dynamic Sitemap (`src/app/sitemap.ts`)
- Added `/rfq` to the canonical sitemap (`priority: 0.8`, `changeFrequency: "weekly"`).
- Deduplicates dynamic product URLs and includes authentic last-modified timestamps (`<lastmod>`).
- Sitemaps omit parameterized URLs and private routes.

### 5.3 Dedicated Server-Rendered Metadata for Important Routes
- **`/rfq` (`src/app/rfq/layout.tsx`)**: Created dedicated layout providing SSR title (`Request for Quotation (RFQ) | Ayaan Clothing`), description, canonical URL, and OpenGraph metadata.
- **`/search` (`src/app/search/layout.tsx`)**: Title streamlined to `"Wholesale Apparel Catalog & B2B Sourcing"` (rendered as `Wholesale Apparel Catalog & B2B Sourcing | Ayaan Clothing`).
- **`/privacy-policy` & `/terms-and-conditions`**: Clean titles integrated with root title template.

### 5.4 Anchor Safeguards
- In `src/components/home/BrandTrust.tsx`: Added `<span id="brand-trust" className="sr-only" aria-hidden="true" />` as an alias to `#certificate` so legacy links smoothly scroll to the quality & certification section.
- In `src/components/home/TopBannerView.tsx`: Added `<span id="built-for-international-buyers" className="sr-only" aria-hidden="true" />` so legacy links scroll to the hero banner.

---

## 6. Verification and Quality Gate

### 6.1 Automated Test Execution
| Test Suite | Command | Result |
| :--- | :--- | :--- |
| **Brand Positioning & WhatsApp Preview** | `npx tsx tests/brand-positioning-and-whatsapp-preview.test.ts` | **PASS (28/28 passed)** |
| **Google Search Console & Technical SEO** | `npx tsx tests/google-search-console-and-technical-seo.test.ts` | **PASS (10/10 passed)** |
| **SEO Structured Data (STF-010)** | `npx tsx tests/stf-010-seo-structured-data.test.ts` | **PASS (5/5 passed)** |
| **Footer Navigation & Contact Links** | `npx tsx tests/footer-navigation-and-contact-links.test.ts` | **PASS (42/42 passed)** |
| **TikTok & LinkedIn Social Links** | `npx tsx tests/tiktok-linkedin-social-links.test.ts` | **PASS (34/34 passed)** |
| **Full Storefront Regression Runner** | `node scripts/run-storefront-regression.mjs` | **PASS (46/46 passed)** |
| **TypeScript Static Typecheck** | `npx tsc --noEmit` | **PASS (0 errors)** |
| **ESLint Static Analysis** | `npm run lint` | **PASS (0 errors)** |
| **Next.js Production Build** | `npm run build` | **PASS (56/56 static pages compiled)** |

### 6.2 HTTP Static Asset Verification
Validated via production server (`curl -I`):
- `GET /favicon.ico` -> **HTTP 200 OK** (`Content-Type: image/x-icon`, `Content-Length: 25931`)
- `GET /icon-48x48.png` -> **HTTP 200 OK** (`Content-Type: image/png`, 48×48 px)
- `GET /icon-96x96.png` -> **HTTP 200 OK** (`Content-Type: image/png`, 96×96 px)
- `GET /icon-192x192.png` -> **HTTP 200 OK** (`Content-Type: image/png`, 192×192 px)
- `GET /apple-touch-icon.png` -> **HTTP 200 OK** (`Content-Type: image/png`, 180×180 px)
- `GET /logo.png` -> **HTTP 200 OK** (`Content-Type: image/png`)
- `GET /robots.txt` -> **HTTP 200 OK**
- `GET /sitemap.xml` -> **HTTP 200 OK**

---

## 7. Before vs. After Summary

```diff
- <title>AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter</title>
+ <title>Ayaan Clothing | Garment Manufacturer & Exporter in Bangladesh</title>

- <meta name="description" content="Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers. Est. 2010.">
+ <meta name="description" content="Bangladesh garment manufacturer and exporter supplying wholesale apparel, original-branded stock lots, factory surplus, and custom OEM production to international buyers.">

- <!-- No <link rel="icon"> or apple-touch-icon in <head> -->
+ <link rel="shortcut icon" href="/favicon.ico">
+ <link rel="icon" href="/favicon.ico" sizes="any">
+ <link rel="icon" href="/icon-48x48.png" sizes="48x48" type="image/png">
+ <link rel="icon" href="/icon-96x96.png" sizes="96x96" type="image/png">
+ <link rel="icon" href="/icon-192x192.png" sizes="192x192" type="image/png">
+ <link rel="icon" href="/icon-256x256.png" sizes="256x256" type="image/png">
+ <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" type="image/png">

- <!-- Organization sameAs: ["https://facebook.com", "https://linkedin.com", "https://instagram.com"] -->
+ <!-- Organization sameAs: ["https://www.facebook.com/profile.php?id=61579913706663"] -->

- <!-- robots.txt: Disallow: /rfq -->
+ <!-- robots.txt: Allow: /rfq -->

- <!-- sitemap.xml: /rfq omitted -->
+ <!-- sitemap.xml: <loc>https://ayaanclothing.com/rfq</loc> (priority 0.8) -->
```

---

## 8. Deployment and Search Appearance Timeline Note

Technical and structural foundations have been verified in the codebase and production build. Once deployed to production:
1. Googlebot will recrawl the homepage and discover the new `<link rel="icon">` tags, updating the search snippet favicon according to its crawling schedule (typically 1–3 weeks for domain recrawling).
2. The revised title and meta description will replace legacy snippets as Google refreshes its index cache.
3. The inclusion of `/rfq`, `/search`, and category routes in the canonical sitemap and internal links enables Google to establish site structure and evaluate Sitelinks discovery.
