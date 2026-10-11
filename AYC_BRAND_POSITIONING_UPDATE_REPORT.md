# AYC Brand Positioning and WhatsApp Link Preview Update Report

**Date:** October 11, 2026
**Project:** Ayaan Clothing (AYC)
**Author:** Senior Branding, Next.js & Technical SEO Engineering
**Status:** Implemented, Tested, and Verified Locally (Ready for Production Release)

---

## 1. Executive Summary

This report documents the public-facing brand positioning update for Ayaan Clothing (AYC), transitioning the legacy phrase **“Ready-Made Garments”** to **“Original-Branded Garments”** across the homepage branding, metadata tags, structured data, web manifest, and the WhatsApp / Open Graph social-sharing preview banner.

All updates adhere strictly to the approved brand copy, maintain visual identity integrity, preserve technical SEO and Google Search Console verifications, and optimize the social sharing banner for mobile messaging clients (including WhatsApp iOS and Android).

---

## 2. Approved Brand Copy Implementation

The approved marketing and positioning copy has been integrated consistently across public-facing touchpoints:

| Property | Approved Specification | Implementation Location |
| :--- | :--- | :--- |
| **Primary Heading / Title** | `AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter` | `src/app/page.tsx`<br>`src/app/layout.tsx`<br>`src/lib/seo/config.ts`<br>`src/app/manifest.ts` |
| **Banner Badge** | `Original-Branded Garments` | `public/og-image.jpg` |
| **Supporting Description** | `Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers.` | `src/app/page.tsx`<br>`src/app/layout.tsx`<br>`src/lib/seo/config.ts`<br>`src/config/business-profile.ts` |
| **Established Year & Contact** | `Est. 2010`, `+880 1842-786000`, `+880 1620-853502`, Uttara, Dhaka | Unchanged in `public/og-image.jpg` and business profile |

---

## 3. Source of the Existing WhatsApp Preview Image

### 3.1 Asset Discovery
Investigation of the Next.js metadata architecture identified the public image asset configured for Open Graph and Twitter previews:
- **Source Path:** `public/og-image.jpg`
- **Public URL:** `https://ayaanclothing.com/og-image.jpg`
- **Initial File Specifications:**
  - Resolution: 1376 × 768 pixels (16:9 aspect ratio)
  - File Size: 654 KB
  - Format: JPEG
  - Embedded Content: Navy backdrop (`#071626`), brand title `AYAAN CLOTHING`, subtitle `International Wholesale`, folded garment product photography stack, and a badge with the text **`B2B Ready-Made Garments`**.

### 3.2 The Image Text Problem
Because “B2B Ready-Made Garments” was rasterized directly into `public/og-image.jpg`, updating HTML metadata alone would not alter WhatsApp link previews. The raster image itself required precise graphic editing.

---

## 4. Social Sharing Image Reconstruction (`public/og-image.jpg`)

### 4.1 Visual & Graphic Adjustments
Using high-precision supersampled image processing, the banner asset was updated to replace the legacy badge while preserving all surrounding design elements:
1. **Badge Badge Replacement:**
   - Text changed to: **`Original-Branded Garments`**.
   - Typography: Matching grotesque typeface (Helvetica Regular), optical size 28pt, warm white fill (`rgb(255, 252, 248)`).
   - Geometry: Exact pill container geometry (44px pill height, 22px corner radius) filled with brand orange (`#cd4b08` / `rgb(206, 75, 8)`).
   - Antialiasing: 4× supersampled rasterization for crisp rendering on high-DPI retina displays.
2. **Preserved Elements:**
   - Full folded knitwear and garment photography stack on the right side.
   - Primary heading `AYAAN CLOTHING` in heavy sans-serif white.
   - Orange horizontal rule separator.
   - Subtitle `International Wholesale` in warm cream serif.
   - Secondary badge `International Wholesale` in navy pill container.
   - `Est. 2010` heritage badge.
   - WhatsApp and phone contact info (`+880 1842-786000`, `+880 1620-853502`) and Uttara, Dhaka address block.
3. **File Size Optimization:**
   - Previous Size: 654 KB
   - New Size: **284.7 KB (278 KB)**
   - **Why this matters for WhatsApp:** WhatsApp’s mobile crawlers (both iOS and Android) enforce strict payload limits on link preview images. Images exceeding 300–400 KB frequently fail to render as rich inline image cards on mobile devices, falling back to basic text snippets. Reducing the file size to 278 KB ensures reliable, instantaneous rich card rendering across all WhatsApp clients.

---

## 5. Technical SEO and Metadata Changes

The following files were updated to maintain consistent search and social-sharing metadata:

### 5.1 `src/app/page.tsx` (`generateMetadata`)
- **Title:** `AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter`
- **Description:** `Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers.`
- **OpenGraph:**
  - `title`: `AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter`
  - `description`: Approved supporting description
  - `images`: `[{ url: "https://ayaanclothing.com/og-image.jpg", width: 1200, height: 630, alt: "AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter" }]`
- **Twitter Card:**
  - `title`: Approved heading
  - `description`: Approved supporting description
  - `images`: `["https://ayaanclothing.com/og-image.jpg"]`
  - `card`: `summary_large_image`
- **Preserved:** Canonical URL (`https://ayaanclothing.com`), Google Search Console verification token, alternates.

### 5.2 `src/app/layout.tsx` (Root Metadata)
- `title.default`: Updated to approved primary heading.
- `description`: Updated to approved supporting description with heritage note.
- `openGraph.title` & `openGraph.description`: Synchronized with approved copy.
- `openGraph.images[0].alt`: Synchronized with approved heading.
- `twitter.title` & `twitter.description`: Synchronized with approved copy.

### 5.3 `src/lib/seo/config.ts` (`SITE_CONFIG`)
- `SITE_CONFIG.tagline`: `Original-Branded Garments Manufacturer & Exporter`
- `SITE_CONFIG.description`: Approved supporting description.
- `generateOrganizationJsonLd()`: Automatically derives organization description from `SITE_CONFIG.description`, updating structured data for search engines.

### 5.4 `src/app/manifest.ts` (PWA Web Manifest)
- `name`: `AYAAN CLOTHING - Original-Branded Garments Manufacturer & Exporter`
- `description`: `Original-Branded Garments Manufacturer & Exporter based in Uttara, Dhaka, Bangladesh. Established 2010.`

### 5.5 `src/config/business-profile.ts`
- `BUSINESS_PROFILE.description`: `Original-Branded Garments Manufacturer & Exporter`
- `BUSINESS_PROFILE.shortDescription`: `Original-Branded Garments Manufacturer & Exporter`

---

## 6. Verification and Test Results

### 6.1 Custom Brand Positioning & WhatsApp Preview Suite
A dedicated verification suite (`tests/brand-positioning-and-whatsapp-preview.test.ts`) was executed with **28 automated assertions**:
- **Group 1 (Homepage Metadata):** Passed (10/10)
  - Title, description, OpenGraph title/description/image URL/alt/dimensions, and Twitter card tags verified.
- **Group 2 (Root Layout Metadata):** Passed (4/4)
  - Default title, OpenGraph title/description/alt verified.
- **Group 3 (SEO Config & Structured Data):** Passed (3/3)
  - `SITE_CONFIG.tagline`, `SITE_CONFIG.description`, and Organization JSON-LD verified.
- **Group 4 (Web Manifest):** Passed (2/2)
  - PWA manifest name and description verified.
- **Group 5 (Image Asset Verification):** Passed (6/6)
  - `public/og-image.jpg` existence, dimensions, file size (< 500KB and > 50KB), and absence of legacy text strings in source verified.
- **Group 6 (Canonical & GSC Preservation):** Passed (3/3)
  - Canonical URL (`https://ayaanclothing.com`) and verification structures preserved.

**Overall Test Suite Result:** `28 PASSED | 0 FAILED`

### 6.2 Technical SEO Regression Suite
- `tests/google-search-console-and-technical-seo.test.ts`: **9/9 tests passed**.
  - Token parsing, XSS guard, homepage `<head>` meta injection, robots.txt rules, sitemap structure, noindex directives, legal canonicals, and Schema.org structured data intact.

### 6.3 Commercial Document Regression Suite
- `tests/canonical-three-commercial-documents.test.ts`: **29/29 tests passed**.

### 6.4 Static Analysis and Production Build
- **TypeScript:** `npx tsc --noEmit` exited with code 0 (zero errors).
- **ESLint:** `npm run lint` exited with code 0 (zero errors).
- **Next.js Production Build:** `npm run build` compiled all 56 application routes successfully in 302ms.

---

## 7. Social Platform Caching and Link Preview Refresh Guide

WhatsApp, Facebook, Twitter, and LinkedIn aggressively cache Open Graph previews. When this release is deployed to production, please follow these instructions regarding link preview refresh:

### 7.1 How WhatsApp Caching Works
1. **Device-Level Cache:** Once a link has been shared and rendered inside a user's WhatsApp chat, WhatsApp caches the preview thumbnail and snippet on that device.
2. **Server-Level Cache:** WhatsApp queries Meta's shared crawler cache. If a link preview was generated recently, subsequent shares of the identical URL will reuse the cached preview.

### 7.2 Immediate Preview Refresh (Cache-Busting)
To generate the new preview immediately without waiting for Meta's cache TTL to expire:
- Share the URL with a query parameter, for example:
  - `https://ayaanclothing.com/?v=2`
  - `https://ayaanclothing.com/?ref=share`
- WhatsApp treats unique query parameters as distinct URLs, forcing its scraper to download the updated HTML and new `og-image.jpg`.

### 7.3 Meta / Facebook Sharing Debugger
To force Meta's edge crawler to purge the root URL cache:
1. Navigate to: [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Enter `https://ayaanclothing.com`
3. Click **Debug**, then click **Scrape Again**.
4. This clears Meta's shared cache used by WhatsApp, Facebook, and Instagram.

### 7.4 Other Platform Debuggers
- **LinkedIn:** [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) (enter URL to purge LinkedIn's cache).
- **Twitter / X:** Share a post draft in Twitter Web to trigger card re-fetch.

---

## 8. Business Integrity and Boundaries

- **Accurate Claims:** The phrase “Original-Branded Garments” is applied strictly as Ayaan Clothing's own manufacturing and export brand positioning. No unauthorized claims of third-party brand representation or certification were introduced.
- **Scope Discipline:** Catalog categories, product inventory, database schemas, POS terminal behaviors, and commercial document workflows remain unaltered.
- **Deployment Status:** In accordance with instructions, this changeset is verified locally and has **not** been pushed to GitHub remotes or deployed to the VPS.
