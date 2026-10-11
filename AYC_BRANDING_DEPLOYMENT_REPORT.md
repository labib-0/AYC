# AYC Branding Update Release and Production Deployment Report

**Project:** Ayaan Clothing (AYC) Production System
**Release:** Brand Positioning Update & WhatsApp / Open Graph Social-Sharing Synchronization
**Release Date:** October 11, 2026
**Status:** FULLY DEPLOYED AND VERIFIED

---

## 1. Executive Summary

This release updates Ayaan Clothing's public-facing brand positioning across the live production environment (`https://ayaanclothing.com`), successfully transitioning the legacy phrase **“Ready-Made Garments”** to **“Original-Branded Garments”** across homepage metadata, structured data, web manifest, and the Open Graph / WhatsApp sharing preview banner.

The deployment includes:
1. Precision replacement of the rasterized `B2B Ready-Made Garments` badge inside `public/og-image.jpg` with `Original-Branded Garments`, preserving all photography, typography, color harmony, and contact information while optimizing the asset to 278 KB for mobile WhatsApp link crawlers.
2. Complete synchronization of Next.js metadata (`title`, `description`, `openGraph`, `twitter`, `manifest`, JSON-LD schema, and business configuration).
3. Inclusion and stabilization of canonical commercial document types (`Offer Sheet`, `Proforma Invoice (PI)`, `Commercial Invoice (CI)`).
4. Full remote synchronization to both authoritative GitHub remotes (`origin/main` and `labib/main`).
5. Pre-deployment PostgreSQL database, media assets, and configuration backup on the production VPS (`200.97.169.230`).
6. Production Next.js build compilation and PM2 zero-downtime service reload on the VPS.
7. Comprehensive live HTTP verification and SHA256 checksum matching against the live production server.

---

## 2. Release & Git Metadata

| Parameter | Value |
|---|---|
| **Release Commit SHA** | `1eb222c1e1607a18af031bba366165c1e899eb9c` (`1eb222c`) |
| **Release Commit Message** | `fix(branding): update AYC original-branded garments messaging` |
| **Prior Feature Commit SHA** | `9ab8b9e4a362725fba0b924296bb92911b339485` (`9ab8b9e`) |
| **Git Branch** | `main` |
| **GitHub Remote 1 (`origin`)** | `https://github.com/ayaanclproject26-max/ayaan.git` (HEAD: `1eb222c`) |
| **GitHub Remote 2 (`labib`)** | `https://github.com/labib-0/AYC.git` (HEAD: `1eb222c`) |
| **Previous VPS Commit** | `f764510d9f06dd37265bc7e82e3408f6c44933a3` (`f764510`) |
| **Active Deployed VPS Commit** | `1eb222c1e1607a18af031bba366165c1e899eb9c` (`1eb222c`) |
| **Production Target Host** | `200.97.169.230` (`/var/www/ayaan`) |

---

## 3. Approved Branding Copy and Metadata Implemented

| Field / Tag | Updated Production Content | Source File |
|---|---|---|
| **Primary Heading / Title** | `AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter` | `src/app/page.tsx`, `src/app/layout.tsx` |
| **Banner Badge** | `Original-Branded Garments` | `public/og-image.jpg` |
| **Supporting Description** | `Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers.` | `src/app/page.tsx`, `src/app/layout.tsx`, `src/lib/seo/config.ts` |
| **Open Graph Title** | `AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter` | `src/app/page.tsx`, `src/app/layout.tsx` |
| **Open Graph Description** | `Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers.` | `src/app/page.tsx`, `src/app/layout.tsx` |
| **Open Graph Image URL** | `https://ayaanclothing.com/og-image.jpg` | `src/app/page.tsx`, `src/app/layout.tsx` |
| **Open Graph Image Alt** | `AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter` | `src/app/page.tsx`, `src/app/layout.tsx` |
| **Twitter Card** | `summary_large_image` | `src/app/page.tsx`, `src/app/layout.tsx` |
| **Twitter Title** | `AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter` | `src/app/page.tsx`, `src/app/layout.tsx` |
| **Twitter Description** | `Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers.` | `src/app/page.tsx`, `src/app/layout.tsx` |
| **Canonical URL** | `https://ayaanclothing.com` (Preserved) | `src/app/page.tsx` |
| **Google Verification** | `PTvwgqBhn_YygUjG0aGodqZgKYXwRZPcKMBTpUDFrbk` (Preserved) | `src/app/page.tsx` |
| **Web Manifest Name** | `AYAAN CLOTHING - Original-Branded Garments Manufacturer & Exporter` | `src/app/manifest.ts` |
| **Business Profile** | `Original-Branded Garments Manufacturer & Exporter` | `src/config/business-profile.ts` |

---

## 4. Social Sharing Image Reconstruction (`public/og-image.jpg`)

- **Resolution:** 1376 × 768 pixels (16:9 aspect ratio)
- **File Size:** **284,718 bytes (278 KB)** (down from 654 KB)
- **SHA256:** `937e0bcc4b0de9caabb8185c608eb77db6b87b3c8e9aff8122af46f2a5a0f67e`
- **Visual Composition:**
  - Raster badge updated to `Original-Branded Garments` in brand orange (`#cd4b08`) with 4× supersampled anti-aliased grotesque typography.
  - Retained brand navy background (`#071626`), white grotesque title `AYAAN CLOTHING`, cream serif subtitle `International Wholesale`, folded knitwear photography, `Est. 2010` claim badge, and Uttara, Dhaka contact block.
  - File size under 300 KB guarantees that WhatsApp mobile link scrapers (iOS & Android) render full rich preview cards without falling back to basic text snippets.

---

## 5. Pre-Deployment Backup Confirmation

Prior to modifying code on the production VPS, a full pre-deployment backup was executed using `/usr/local/bin/ayaan-backup.sh`:

- **Backup Timestamp:** `2026-10-11_13-36-04`
- **Manifest:** `/var/backups/ayaan/manifests/backup_2026-10-11_13-36-04.manifest`
- **PostgreSQL Database Dump:** `/var/backups/ayaan/db/ayaan_db_2026-10-11_13-36-04.sql.gz`
  - Size: 578,164 bytes
  - SHA256: `2e3752eb93c67954b04f40b339cdec7d69c88cf08bc40211c00073419d0e50be`
  - Integrity: Structural dump validation passed (`pg_restore -l`)
- **Persistent Media Assets:** `/var/backups/ayaan/media/ayaan_media_2026-10-11_13-36-04.tar.gz`
  - Size: 213,088,393 bytes (1,249 files)
  - SHA256: `d6566a7caa53c2d3679ee46146be6d8cf70b07458d49c6ecf83fbba0c21c3cac`
- **Configuration & Environment Backup:** `/var/backups/ayaan/config/ayaan_config_2026-10-11_13-36-04.tar.gz`
  - Size: 27,431 bytes
  - SHA256: `93b3e600e31ef2ce283a174921bdf7314a0e2351f3a141648d5b315a0e852fdf`
- **Free Space Available:** 41,871 MB on backup partition

---

## 6. Pre-Release Test and Build Outcomes

| Check | Command | Result | Notes |
|---|---|---|---|
| **Brand Positioning & WhatsApp Suite** | `npx tsx tests/brand-positioning-and-whatsapp-preview.test.ts` | **PASS (28/28)** | All branding and metadata assertions passed |
| **Canonical Three Documents Suite** | `npx tsx tests/canonical-three-commercial-documents.test.ts` | **PASS (29/29)** | Document simplification verified |
| **Customer Document Center Suite** | `npx tsx --test tests/customer-document-center-redesign.test.ts` | **PASS (12/12)** | Aligned with canonical 3 document types |
| **SEO & Google Verification Tests** | `npx tsx tests/google-search-console-and-technical-seo.test.ts` | **PASS (9/9)** | SEO & verification token verified |
| **Storefront Unit Regression** | `npm test` | **PASS (44/44)** | 100% test pass rate across storefront unit suites |
| **TypeScript Type Check** | `npx tsc --noEmit` | **PASS (0 errors)** | Zero type errors |
| **ESLint Check** | `npm run lint` | **PASS (0 errors)** | Zero linting errors |
| **Local Production Build** | `npm run build` | **PASS (0 errors)** | 56 routes compiled cleanly with Turbopack |
| **VPS Production Build** | `sudo -u ayaan npm run build` | **PASS (0 errors)** | 56 routes compiled cleanly on production server in 3.9s |

---

## 7. Production Verification & Live Smoke Tests

### A. Live Homepage Metadata Inspection (`https://ayaanclothing.com/`)
Inspected raw initial HTML response streamed by production Next.js:
- `<title>AYAAN CLOTHING — Original-Branded Garments Manufacturer &amp; Exporter</title>`: **Verified**
- `<meta name="description" content="Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers."/>`: **Verified**
- `<meta property="og:title" content="AYAAN CLOTHING — Original-Branded Garments Manufacturer &amp; Exporter"/>`: **Verified**
- `<meta property="og:description" content="Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers."/>`: **Verified**
- `<meta property="og:image" content="https://ayaanclothing.com/og-image.jpg"/>`: **Verified**
- `<meta property="og:image:width" content="1200"/>` / `<meta property="og:image:height" content="630"/>`: **Verified**
- `<meta name="twitter:card" content="summary_large_image"/>`: **Verified**
- `<meta name="twitter:title" content="AYAAN CLOTHING — Original-Branded Garments Manufacturer &amp; Exporter"/>`: **Verified**
- `<meta name="twitter:image" content="https://ayaanclothing.com/og-image.jpg"/>`: **Verified**
- `<link rel="canonical" href="https://ayaanclothing.com"/>`: **Verified**
- `<meta name="google-site-verification" content="PTvwgqBhn_YygUjG0aGodqZgKYXwRZPcKMBTpUDFrbk"/>`: **Verified**

### B. Live Asset Verification (`https://ayaanclothing.com/og-image.jpg`)
- HTTP Status: **200 OK**
- Content-Type: `image/jpeg`
- Content-Length: `284718 bytes`
- SHA256 Checksum: `937e0bcc4b0de9caabb8185c608eb77db6b87b3c8e9aff8122af46f2a5a0f67e` (Exact match with local asset)

### C. System Service Health
- **API Health Endpoint (`https://ayaanclothing.com/api/v1/health`):** HTTP 200 OK
  `{"status":"ok","app_name":"AYAAN CLOTHING","environment":"production","api_version":"v1","services":{"database":"ok","cache":"ok"},"database":"ok","redis":"ok"}`
- **PM2 `ayaan-customer` (id 0):** online (pid 2107315, 0% CPU, 58.5 MB RAM)
- **PM2 `ayaan-admin` (id 1):** online (pid 2107323, 0% CPU, 41.0 MB RAM)
- **Nginx (`nginx`):** active
- **PHP-FPM (`php8.3-fpm`):** active
- **Redis (`redis-server`):** active
- **PostgreSQL (`postgresql`):** active

### D. Product Catalog Preservation
- `https://ayaanclothing.com/products`: HTTP 200 OK
- `https://ayaanclothing.com/products/boys-traouser`: HTTP 200 OK
  `<title>BOYS TRAOUSER | WONDER NATION | B2B Wholesale | AYAAN CLOTHING | AYAAN CLOTHING</title>`
  All product titles, brand logos, specifications, pricing, and category classifications remain 100% operational.

---

## 8. Social Platform Caching and Link Preview Refresh

WhatsApp, Meta, LinkedIn, and Twitter aggressively cache Open Graph link previews by URL:

1. **WhatsApp Device & Proxy Cache:** Previously shared chat threads in WhatsApp retain earlier preview cards stored locally on the recipient/sender device.
2. **Instant Preview Testing (Cache-Busting):** Sharing links with a query string (e.g. `https://ayaanclothing.com/?v=2` or `https://ayaanclothing.com/?ref=share`) forces WhatsApp to immediately fetch and render the live production HTML and new image.
3. **Purging Meta Edge Cache:** To refresh preview cards across Facebook, WhatsApp, and Instagram for the bare root domain:
   - Visit the [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - Enter `https://ayaanclothing.com`
   - Click **Scrape Again**.
4. **Purging LinkedIn Cache:** Use the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) to clear LinkedIn's cached preview.

---

## 9. Final Release Status

**`FULLY DEPLOYED AND VERIFIED`**
