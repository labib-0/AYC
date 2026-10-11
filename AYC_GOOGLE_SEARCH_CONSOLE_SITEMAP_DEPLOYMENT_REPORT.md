# AYC — Google Search Console Sitemap Fetch Fix Deployment Report

**Repository:** `ayaanclothing.com` (Ayaan Clothing — AYC)  
**Date:** October 11, 2026  
**Release Engineer:** Senior Release Engineer & Production Reliability Engineer  
**Status:** `DEPLOYED — GOOGLE PROCESSING PENDING`

---

## Executive Summary

The Google Search Console sitemap fetch fix, robots.txt crawler clarity rules, and Admin SEO sitemap submission guidance have been committed, synchronized across both GitHub remotes (`origin/main` and `labib/main`), deployed to the production VPS (`200.97.169.230`), and verified live.

A pre-deployment forensic audit proved that genuine Googlebot crawlers successfully fetch `/sitemap.xml` with HTTP 200 OK. The initial "Couldn't fetch / Type: Unknown" report in Google Search Console reflects asynchronous processing queue latency and potential operator input ambiguity (submitting a leading slash in GSC's prefix-anchored input). The release addresses both risks with zero disruption to business workflows, database records, POS, or auth.

---

## 1. Confirmed Root Cause and Production Evidence

### Forensic Evidence from Production Access Logs:
1. **Genuine Googlebot Access is Unblocked:**
   Production Nginx access logs recorded **7 successful HTTP 200 fetches** by authenticated Googlebot crawlers on October 11, 2026:
   - `11/Oct/2026:05:12:31 +0000` &rarr; `GET /sitemap.xml HTTP/1.1 200 17893` (Googlebot 2.1)
   - `11/Oct/2026:05:14:29 +0000` &rarr; `GET /sitemap.xml HTTP/1.1 200 17893` (Googlebot 2.1)
   - `11/Oct/2026:05:22:18 +0000` &rarr; `GET /sitemap.xml HTTP/1.1 200 17893` (Googlebot 2.1)
   - `11/Oct/2026:05:23:19 +0000` &rarr; `GET /sitemap.xml HTTP/1.1 200 17893` (Googlebot 2.1)
   - `11/Oct/2026:05:55:19 +0000` &rarr; `GET /sitemap.xml HTTP/1.1 200 17893` (Googlebot 2.1)
   - `11/Oct/2026:05:56:06 +0000` &rarr; `GET /sitemap.xml HTTP/1.1 200 17893` (Googlebot 2.1)
   - `11/Oct/2026:06:23:55 +0000` &rarr; `GET /sitemap.xml HTTP/1.1 200 17908` (Googlebot 2.1)
   
   Forward and reverse DNS lookups on client IP `192.178.4.130` confirmed genuine Googlebot identity (`crawl-192-178-4-130.googlebot.com` &harr; `192.178.4.130`).

2. **Google Search Console Asynchronous Queue Latency:**
   At `11/Oct/2026:05:14:46 +0000` (17 seconds after Googlebot's fetch), an operator visited `/sitemap.xml` directly from referrer `https://search.google.com/`. In Google Search Console, newly submitted sitemaps default to displaying `Couldn't fetch / Type: Unknown` while waiting in Google's asynchronous ingestion queue before parsing completes.

3. **Leading-Slash Submission Edge Case:**
   In GSC's submission input, the prefix `https://ayaanclothing.com/` is fixed. If an operator types `/sitemap.xml`, a double-slash URL (`https://ayaanclothing.com//sitemap.xml`) is produced. Next.js natively redirects `//sitemap.xml` to `/sitemap.xml` via HTTP 308. GSC sitemap ingestion does not follow redirects for sitemap submissions, which triggers a fetch failure.

4. **Nginx & Storefront Geo-restrictions:**
   Nginx error logs had 0 errors. Storefront country blocking is disabled in PostgreSQL (`bangladesh_storefront_blocked = 0`, `bangladesh_storefront_block_enabled = 0`), and `.xml` files are explicitly exempt in Next.js proxy middleware.

---

## 2. Commit and GitHub Synchronization

### Release Commit Details:
- **Commit SHA:** `0c86f6832c80133bb9e51007fc63c8773d58df15`
- **Short SHA:** `0c86f68`
- **Commit Message:** `fix(seo): normalize sitemap paths and clarify submission instructions`
- **Files Modified (5):**
  - `src/app/robots.ts`
  - `src/components/admin/homepage/HomepageSeoManager.tsx`
  - `src/proxy.ts`
  - `tests/google-search-console-and-technical-seo.test.ts`
  - `AYC_GOOGLE_SEARCH_CONSOLE_SITEMAP_FETCH_REPORT.md`

### Remote Synchronization Status:
| Remote Name | Remote URL | Pushed Commit SHA | Verification Status |
|---|---|---|---|
| `origin` | `https://github.com/ayaanclproject26-max/ayaan.git` | `0c86f6832c80133bb9e51007fc63c8773d58df15` | **Synchronized (`main`)** |
| `labib` | `https://github.com/labib-0/AYC.git` | `0c86f6832c80133bb9e51007fc63c8773d58df15` | **Synchronized (`main`)** |

Both remotes verified via `git ls-remote`.

---

## 3. Pre-Deployment Backup Confirmation

A full pre-deployment backup was executed on the production VPS prior to deploying code:

- **Backup Script:** `/var/www/ayaan/scripts/backup/ayaan-backup.sh`
- **Timestamp:** `2026-10-11_14-42-05 UTC`
- **Manifest File:** `/var/backups/ayaan/manifests/backup_2026-10-11_14-42-05.manifest`
- **PostgreSQL Database Dump:**
  - Size: 578,110 bytes
  - SHA256: `b5aa38f19adb366e2c46c27dab9fb81d887ac30dbcb0f532ea124c2df23de13e`
  - Structural Integrity: Verified (`pg_restore -l` passed)
- **Persistent Media Archive:**
  - Size: 213,086,259 bytes (1,249 files)
  - SHA256: `360b6828241bccde6743b3511207bd0f371165b43a773e327e4f9668d21b2398`
- **Configuration & Environment Archive:**
  - Size: 27,434 bytes
  - SHA256: `3267f9bc155558e4b2deaf73e56bf485f1d761503c76fc091a12db66ea789faa`
- **Available Disk Space:** 41,651 MB (Healthy)

---

## 4. Production VPS Deployment

- **VPS Host:** `srv2010990` (`200.97.169.230`)
- **Application Directory:** `/var/www/ayaan`
- **Previous Deployed Commit:** `ff9722157a23124260f6ee032d8e2fb8e9a25c94`
- **Deployed Commit:** `0c86f6832c80133bb9e51007fc63c8773d58df15`
- **Git Reconciliation:** Fast-forward pull from authenticated remote `labib/main` (0 merge conflicts, clean tree).
- **Frontend Build:** `sudo -u ayaan npm run build` (Turbopack, compiled in 5.9s, static pages generated 56/56 in 3.8s, 0 errors).
- **Service Reload:**
  - `pm2 reload ayaan-customer` &rarr; Online (PID 2112462, 0% CPU, 70.4 MB RAM)
  - `pm2 reload ayaan-admin` &rarr; Online (PID 2112481, 0% CPU, 41.0 MB RAM)
- **Database Migrations:** None required; zero schema or business data changes.

---

## 5. Production URL Verification Results

The live production application was verified using external HTTP requests and VPS probes:

| Target URL | HTTP Status | Content-Type | Redirects | Verification Assessment |
|---|---|---|---|---|
| `https://ayaanclothing.com/sitemap.xml` | **200 OK** | `application/xml` | Direct (0) | Serves valid XML sitemap directly; `x-nextjs-cache: HIT` |
| `https://ayaanclothing.com//sitemap.xml` | **308 &rarr; 200 OK** | `application/xml` | 1 redirect | Clean single redirect to `/sitemap.xml`, no loops |
| `https://ayaanclothing.com///sitemap.xml` | **308 &rarr; 200 OK** | `application/xml` | 1 redirect | Clean single redirect to `/sitemap.xml`, no loops |
| `https://ayaanclothing.com/robots.txt` | **200 OK** | `text/plain` | Direct (0) | Valid robots.txt; explicitly allows `/sitemap.xml` and `/products` |
| `https://ayaanclothing.com/api/v1/health` | **200 OK** | `application/json` | Direct (0) | Database: ok, Redis: ok, Cache: ok |
| `https://ayaanclothing.com/ayc/homepage` | **200 OK** | `text/html; charset=utf-8` | Direct (0) | Admin homepage SEO manager renders new sitemap path copy actions and guidance |
| `https://ayaanclothing.com/` | **200 OK** | `text/html; charset=utf-8` | Direct (0) | Storefront homepage renders canonical tag and GSC verification meta tag |

---

## 6. Live Sitemap XML Validation

Live payload parsed and validated via standard Python `xml.etree.ElementTree`:

```text
Target: https://ayaanclothing.com/sitemap.xml
Root Element: <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
Total URLs: 94
  - Static Canonical Pages: 4 (/, /search, /privacy-policy, /terms-and-conditions)
  - Published Catalog Products: 90 (/products/{slug})
Canonical Domain Integrity: 94 / 94 (100% strictly https://ayaanclothing.com)
Timestamp Compliance: 100% valid ISO 8601 (lastmod omitted for root & search)
Private / Protected Routes: 0 (No /ayc, /admin, /cart, /checkout, /dashboard, /profile)
Sitemap Protocol Compliance: 100% VALID W3C XML
```

---

## 7. Automated Test Suite Results

| Test Suite | Commands | Result |
|---|---|---|
| Technical SEO & Sitemap Suite | `npx tsx tests/google-search-console-and-technical-seo.test.ts` | **10 / 10 PASSED** |
| Storefront Unit Regression | `npm test` (`scripts/run-storefront-regression.mjs`) | **44 / 44 PASSED** |
| TypeScript Compiler | `npx tsc --noEmit` | **0 Errors** |
| ESLint Quality Check | `npx eslint src/app/robots.ts src/proxy.ts src/components/admin/homepage/HomepageSeoManager.tsx` | **0 Errors, 0 Warnings** |
| Next.js Production Build | `npm run build` | **Build Success (Static sitemap 1h ISR)** |

---

## 8. Remaining Action in Google Search Console

Because Google Search Console processes sitemaps asynchronously via an internal background ingestion queue, the site administrator should complete the following manual step:

1. Open **[Google Search Console](https://search.google.com/search-console)**.
2. Select property: **`https://ayaanclothing.com/`**.
3. In the sidebar, navigate to **Indexing &rarr; Sitemaps**.
4. If an existing `/sitemap.xml` entry shows **"Couldn't fetch"**:
   - Click on the row for `/sitemap.xml`.
   - Click the three vertical dots (`⋮`) in the top-right corner.
   - Click **Remove sitemap**.
5. Under **Add a new sitemap**:
   - The input prefix already displays `https://ayaanclothing.com/`.
   - In the text field, enter only: **`sitemap.xml`** (strictly without a leading `/`).
   - Click **SUBMIT**.
6. **Processing Latency Notice:**
   - Immediately following submission, GSC may show `Type: Unknown` or `Couldn't fetch` for a few minutes while the request sits in Google's ingestion pipeline.
   - Do not re-submit. Allow 15–60 minutes for Googlebot's asynchronous parser to process the 94 URLs. The status will transition to **Success** with **Discovered pages: 94**.

---

## Conclusion Status

**`DEPLOYED — GOOGLE PROCESSING PENDING`**
