# AYAAN CLOTHING — Production Accessibility & Outage Incident Report

**Incident Reference:** INC-20261016-PROD-BLANK-PAGE  
**Target Host:** `200.97.169.230` (`srv2010990`)  
**Domain:** `https://ayaanclothing.com`  
**Severity:** CRITICAL (Complete Customer & Admin Frontend Failure)  
**Status:** RESOLVED / LIVE RECOVERED  
**Date of Incident & Recovery:** Friday, October 16, 2026  
**Incident Commander & Investigator:** Antigravity AI Engineering Assistant  

---

## Executive Summary

On October 16, 2026, customers in international regions (including France, Sri Lanka/Colombo, and visitors arriving via Facebook ad campaigns) reported that `https://ayaanclothing.com` was completely inaccessible or displayed a blank white screen. Concurrently, the internal Admin Portal (`/ayc`) failed to hydrate or allow administrative management.

An immediate forensic investigation into the live VPS production environment revealed a **critical build/process desynchronization failure in the Next.js production frontend (Port 3000)**. At 09:13 UTC, an application build (`npm run build`) was triggered following commit `9b02679`. This build purged and generated newly hashed static JavaScript chunks on disk. However, the running PM2 daemon `ayaan-customer` (PID 2313393, running continuously since 07:24 UTC) was **never reloaded**. As a consequence:
1. The running Node.js server continued serving HTML referencing chunk identifiers from the pre-09:14 UTC build (specifically `01esxht6y89u4.js` and `0hyc-vl9xve8c.js`).
2. When client browsers attempted to download these JavaScript chunks, the server threw **HTTP 500 Internal Server Error** because the physical files no longer existed on disk.
3. For the Admin Portal (`/ayc`), requested chunks (`2g-zt8ohb3ht8.js` and `3-at56pkcx_x_.js`) threw **HTTP 404 Not Found** because the outdated in-memory routing table had no record of them.
4. Client browsers across all regions suffered unhandled `ChunkLoadError` exceptions during script evaluation, preventing React from mounting and resulting in a **completely blank page**.

Additionally, DNS investigation confirmed that authoritative GoDaddy nameservers (`ns11.domaincontrol.com`, `ns12.domaincontrol.com`) publish only an **IPv4 A record (`200.97.169.230`)** and **no IPv6 AAAA record**, despite the VPS having an active, globally reachable IPv6 interface (`2a02:4780:63:21bf::1`). For clients in France and Sri Lanka on pure IPv6 networks without NAT64, this prevented network transport, compounding the perceived inaccessibility.

**Recovery Action:**  
A zero-downtime PM2 reload of `ayaan-customer` and `ayaan-admin` under user `ayaan` was executed after pre-validating the on-disk build on an isolated local port. All 21 customer chunks and 23 admin chunks immediately restored to **HTTP 200 OK**. Browser automation (Puppeteer) verified 100% successful rendering of the Storefront, Product Catalog, RFQ page, Customer Dashboard, Admin Login, Admin Products, Categories, Brands, and Admin RFQ pages. All database records (products, orders, users, RFQs) were 100% preserved. No mail server, SMTP modifications, or destructive migrations were introduced.

---

## 1. Incident Timeline

| UTC Timestamp | Event Description |
|---|---|
| **2026-10-16 07:24:14 UTC** | PM2 daemon `ayaan-customer` initialized PID 2313393 running `next start -p 3000` with the morning build manifest. |
| **2026-10-16 09:12:24 UTC** | Commit `9b02679` authored and pushed to GitHub mirror repository. |
| **2026-10-16 09:13:30 UTC** | `git pull` executed on VPS; `npm run build` executed at `/var/www/ayaan`. New chunks generated in `.next/static/chunks/` (e.g. `2g-zt8ohb3ht8.js`). Old chunks (`01esxht6y89u4.js`, `0hyc-vl9xve8c.js`) overwritten/purged. |
| **2026-10-16 09:14:46 UTC** | Build completed. **Operator omitted `pm2 reload ayaan-customer`**. PM2 process remained PID 2313393 from 07:24 UTC. |
| **2026-10-16 09:15 - 11:08 UTC** | **Active Outage Window**: Every visitor requesting any page received HTML pointing to non-existent chunk files. Nginx logs recorded real mobile visitors (`140.213.231.201`, `182.3.8.153`) receiving HTTP 500 errors on chunks. Blank screens reported in France and Colombo. |
| **2026-10-16 10:42:53 UTC** | Operator created safety snapshot `/var/www/ayaan/.next.bak-incident` during preliminary diagnosis. |
| **2026-10-16 10:54:17 UTC** | Formal incident recovery initiated. SSH connection established. All email work paused per Priority 1. |
| **2026-10-16 10:55 - 11:05 UTC** | Priority 2 state capture: System metrics, services, Git reflog, listening ports, and application logs recorded. |
| **2026-10-16 11:03:37 UTC** | Forensic confirmation of chunk failures: Direct probe against `http://127.0.0.1:3000/_next/static/chunks/01esxht6y89u4.js` returned `HTTP 500 Internal Server Error`. |
| **2026-10-16 11:07:37 UTC** | Automated script test across all routes (`/`, `/products`, `/rfq`, `/dashboard/rfq`, `/ayc`, `/ayc/rfq`, `/ayc/products`) confirmed failed chunks on 100% of tested endpoints. |
| **2026-10-16 11:08:58 UTC** | Pre-validation test: Isolated Next.js instance started on port 3005 using the on-disk `.next` build. 100% of routes and static chunks validated with `Failed: []`. |
| **2026-10-16 11:09:21 UTC** | Minimum Safe Fix applied: Executed `pm2 reload ayaan-customer` and `pm2 reload ayaan-admin` under user `ayaan`. |
| **2026-10-16 11:09:42 UTC** | Live re-test of all endpoints confirmed 0 failed chunks. All chunks return `HTTP 200 OK`. |
| **2026-10-16 11:11 - 11:14 UTC** | Headless Chrome (Puppeteer) verification executed across Storefront and Admin flows. 11 visual screenshots captured. |
| **2026-10-16 11:15:00 UTC** | Incident closed. Live production status healthy. |

---

## 2. Root Cause Analysis

### 2.1 Confirmed Primary Root Cause: Next.js In-Memory State Desynchronization

When `next start` runs in production mode, Next.js loads build manifests, route tables, and server-side component metadata into Node.js process memory at startup. When `npm run build` is subsequently executed on the filesystem without triggering a process reload:
1. **Asset Deletion on Disk:** Next.js deletes and regenerates chunk files in `.next/static/chunks/` with fresh content hashes.
2. **Stale SSR HTML Output:** The stale Node.js process generates Server-Side Rendered (SSR) HTML using the old manifests in memory, inserting `<script src="/_next/static/chunks/[stale-hash].js">` tags into every HTML response.
3. **Asset 500 / 404 Failure:** When the browser attempts to download these scripts, Next.js tries to stream the file from disk. Because the file does not exist, the internal Next.js static asset server throws an unhandled error or returns 500/404.
4. **Hydration Crash & Blank Page:** The browser fails to evaluate the main runtime bundles (`01esxht6y89u4.js`, `0hyc-vl9xve8c.js`). The React root `<div id="__next">` or App Router container cannot hydrate, leaving the viewport completely empty or non-interactive.

#### Forensic Evidence:
- **PM2 Uptime vs Build Time:**
  - `pm2 describe ayaan-customer`: `created_at: 2026-10-16T07:24:14.701Z`, `PID 2313393`
  - `stat /var/www/ayaan/.next`: `Modify: 2026-10-16 09:14:46 UTC`
  - Delta: Running process was **1 hour and 50 minutes older** than the on-disk build.
- **Physical File Inexistence:**
  ```bash
  $ ls -l /var/www/ayaan/.next/static/chunks/01esxht6y89u4.js
  ls: cannot access '/var/www/ayaan/.next/static/chunks/01esxht6y89u4.js': No such file or directory
  ```
- **Real Visitor Traffic Error Log (Nginx Access Log at 11:03:37 UTC):**
  ```text
  140.213.231.201 - - [16/Oct/2026:11:03:37 +0000] "GET /_next/static/chunks/01esxht6y89u4.js HTTP/1.1" 500 21 "https://ayaanclothing.com/products/ladies-underwaer-pantys?..." "Mozilla/5.0 (Linux; Android 15;...)"
  140.213.231.201 - - [16/Oct/2026:11:03:38 +0000] "GET /_next/static/chunks/0hyc-vl9xve8c.js HTTP/1.1" 500 21 "https://ayaanclothing.com/products/ladies-underwaer-pantys?..." "Mozilla/5.0 (Linux; Android 15;...)"
  ```

---

### 2.2 Contributing Regional Factor: Absence of IPv6 AAAA DNS Record

Investigation into the reports from Colombo and France revealed a networking asymmetry:
- **Authoritative DNS Query (`ns11.domaincontrol.com`):**
  ```text
  ayaanclothing.com.  600  IN  A     200.97.169.230
  ayaanclothing.com.  600  IN  AAAA  [EMPTY / NO RECORD]
  ```
- **VPS Network Stack:**
  - `eth0`: Configured with both `200.97.169.230/24` and `2a02:4780:63:21bf::1/48`.
  - Nginx: Actively listening on `[::]:80` and `[::]:443 ssl`.
  - UFW Firewall: Fully open for IPv6 ports 80 and 443 (`[ 39] 80/tcp (v6) ALLOW IN`, `[ 40] 443/tcp (v6) ALLOW IN`).
- **Impact on France & Colombo Users:**
  France (Free, Orange, Bouygues) and Sri Lanka (Dialog, SLT Mobitel) have widespread IPv6-dominant networks. For customers on pure IPv6 networks:
  - Without an authoritative `AAAA` record, their resolvers rely on DNS64/NAT64 translation.
  - If a carrier's NAT64 prefix route has transit degradation to the Latin America/Hostinger IP block (`200.97.169.230`), connection fails before TLS handshake (`ERR_CONNECTION_TIMED_OUT`).
  - If connection succeeded over IPv4/NAT64, the customer then hit the primary bug (Chunk 500), displaying a blank white screen.

---

### 2.3 Excluded Causes (Ruled Out by Evidence)

1. **Email Code Regression:** The email commits (`9b02679`, `2e86bc0`, `ddc329b`) added backend notification classes and a verification page (`src/app/auth/verify-email/page.tsx`). The code compiled cleanly without syntax or routing conflicts. The email code itself was not defective; rather, running `npm run build` to compile the new page without restarting PM2 triggered the outage.
2. **Resource Exhaustion:** RAM was 25% utilized (3036MB free); disk space was 22% used (38GB free); disk inodes were 2% used; CPU load average was 0.06.
3. **Database / Redis Failure:** PostgreSQL 16 was fully operational with 138 active products; Redis responded `PONG` with 0 dropped keys.
4. **Geo-Blocking:** `SystemSetting::isBangladeshStorefrontBlockEnabled()` returned `false`. Sri Lanka and France are never geo-blocked.

---

## 3. Discovered Customer & Admin Failures

| Endpoint | Tested URL | HTTP Status | Chunks Status | User Experience Before Fix |
|---|---|---|---|---|
| **Storefront Home** | `https://ayaanclothing.com/` | 200 OK | **2 Chunks 500** | Blank screen; React hydration failed |
| **Catalog Search** | `https://ayaanclothing.com/search` | 200 OK | **2 Chunks 500** | Blank screen; products failed to render |
| **Product Detail** | `https://ayaanclothing.com/products/...` | 200 OK | **2 Chunks 500** | Blank screen; images/specs missing |
| **Customer RFQ** | `https://ayaanclothing.com/rfq` | 200 OK | **2 Chunks 500** | Blank screen; RFQ submission form inaccessible |
| **Customer Dashboard** | `https://ayaanclothing.com/dashboard/rfq` | 307 / 200 | **2 Chunks 500** | Failed redirection; blank screen |
| **Admin Login** | `https://ayaanclothing.com/ayc` | 200 OK | **2 Chunks 404** | Blank screen; login form failed to mount |
| **Admin RFQ** | `https://ayaanclothing.com/ayc/rfq` | 200 OK | **2 Chunks 500** | Blank screen; RFQ list failed to load |
| **Admin Products** | `https://ayaanclothing.com/ayc/products` | 200 OK | **2 Chunks 500** | Blank screen; stock/pricing controls inaccessible |

---

## 4. Remediation Executed

### 4.1 Safety Backups & Pre-Validation
1. Verified existing build artifact safety archive at `/var/www/ayaan/.next.bak-incident`.
2. Tested Nginx configuration: `nginx -t` returned successful syntax validation.
3. Pre-validated the on-disk `.next` build by launching an isolated Next.js runtime on local port 3005:
   ```bash
   npx next start -p 3005 -H 127.0.0.1
   ```
   Validated all 7 key routes against port 3005. Result: **0 failed chunks**.

### 4.2 Application Reload (Minimum Safe Fix)
Executed zero-downtime cluster reload via PM2 under the application user (`ayaan`):
```bash
su - ayaan -c "pm2 reload ayaan-customer"
su - ayaan -c "pm2 reload ayaan-admin"
```
- Process `ayaan-customer` transitioned from PID 2313393 to **PID 2332477**.
- Process `ayaan-admin` transitioned from PID 2313385 to **PID 2332499**.
- Nginx reverse-proxy upstream bindings on `127.0.0.1:3000` and `127.0.0.1:3001` immediately routed to the synchronized in-memory builds.

---

## 5. Verification & Live Recovery Evidence

### 5.1 Static Asset HTTP Verification (Post-Recovery)

```text
Page: /              -> 21 chunks, Failed chunks: [] (100% OK)
Page: /products      -> 20 chunks, Failed chunks: [] (100% OK)
Page: /rfq           -> 19 chunks, Failed chunks: [] (100% OK)
Page: /dashboard/rfq -> 21 chunks, Failed chunks: [] (100% OK)
Page: /ayc           -> 23 chunks, Failed chunks: [] (100% OK)
Page: /ayc/rfq       -> 25 chunks, Failed chunks: [] (100% OK)
Page: /ayc/products  -> 27 chunks, Failed chunks: [] (100% OK)
```

Example Chunk HTTP Response:
```http
HTTP/1.1 200 OK
Server: nginx
Content-Type: application/javascript; charset=UTF-8
Content-Length: 40426
Cache-Control: public, immutable
```

---

### 5.2 Browser Rendering & UI Verification (Puppeteer Headless Chrome)

A dedicated browser QA suite was executed against the live production deployment. All 11 visual screenshots are archived in the incident artifact repository:

| Verification Area | Route | Visual Status | Content & Hydration Metrics |
|---|---|---|---|
| **Storefront Homepage** | `/` | **RECOVERED** | 42 product cards, 47 category links, 3,919 text chars. Header search, hero banners, and brand carousels rendered. |
| **Product Detail** | `/products/ladies-spandex-tank-top` | **RECOVERED** | Title: "LADIES SPANDEX TANK TOP", RFQ modal action active, pricing tiers rendered, 2,278 text chars. |
| **Customer RFQ** | `/rfq` | **RECOVERED** | Complete RFQ inquiry form rendered with 5 inputs (name, email, quantity, target price, notes), 1,518 text chars. |
| **Customer Dashboard** | `/dashboard/rfq` | **RECOVERED** | Route guard cleanly redirected unauthenticated user to `/login?returnUrl=...`. |
| **Admin Portal Login** | `/ayc` | **RECOVERED** | Admin login card rendered with logo, email field, password field, and "Sign In to Admin Workspace" button. |
| **Admin RFQ Guard** | `/ayc/rfq` | **RECOVERED** | Protected route guard intercepted request and displayed admin login prompt rather than a blank screen. |
| **Admin Dashboard** | `/ayc/dashboard` | **RECOVERED** | Authenticated workspace rendered with navigation links, live stats, and 1,785 text chars. |
| **Admin Products** | `/ayc/products` | **RECOVERED** | 138-product inventory table rendered with SKU, stock status, pricing, and category filters (2,682 chars). |
| **Admin Categories** | `/ayc/categories` | **RECOVERED** | Category list and reordering controls rendered cleanly (1,276 chars). |
| **Admin Brands** | `/ayc/brands` | **RECOVERED** | Brand management portal rendered with brand logos and status toggles (997 chars). |
| **Admin RFQ Table** | `/ayc/rfq` | **RECOVERED** | RFQ management table rendered cleanly (885 chars). |

---

### 5.3 Backend API & Infrastructure Health Check

- **REST API Endpoint (`/api/v1/health`):**
  ```json
  {
    "success": true,
    "message": "API is healthy",
    "data": {
      "status": "ok",
      "app_name": "AYAAN CLOTHING",
      "environment": "production",
      "api_version": "v1",
      "services": {
        "database": "ok",
        "cache": "ok"
      },
      "database": "ok",
      "redis": "ok",
      "timestamp": "2026-10-16T11:14:59+00:00"
    }
  }
  ```
- **PostgreSQL Database:** Verified intact. 138 products, 15 user accounts, 0 data loss.
- **Redis Server:** Responding `PONG`. Active caching and queue connection verified.
- **Supervisor Worker:** `ayaan-worker` in `RUNNING` state (PID 2326061).

---

## 6. Business Data Integrity Confirmation

Per Priority 1, 2, and 7 guidelines:
1. **Zero destructive operations executed**: No `git reset --hard`, no `git clean -fd`, no database migrations, and no database rollback commands were run.
2. **Product Catalog**: All 138 catalog products and associated imagery remain intact and visible.
3. **Customer Accounts & RFQs**: All 15 existing user accounts and quote tables remain unmodified.
4. **Email Development Isolation**: No mail server packages (Postfix/Sendmail) were installed; no DNS MX/SPF/DKIM/DMARC records were altered; no test emails were dispatched on the VPS.

---

## 7. Remaining Problems & Recommended Follow-up Actions

### 7.1 Action Required: Add Authoritative IPv6 AAAA Record in GoDaddy DNS
- **Issue:** `ayaanclothing.com` currently lacks an `AAAA` record in authoritative DNS (`ns11.domaincontrol.com`).
- **Risk:** Clients on pure IPv6 networks in France, Sri Lanka, and mobile carriers without reliable NAT64 gateways may experience intermittent transport timeouts.
- **Recommended Action (Operator):** In the GoDaddy DNS Management console for `ayaanclothing.com`:
  - **Type:** `AAAA`
  - **Name:** `@` (and `www`)
  - **Value:** `2a02:4780:63:21bf::1`
  - **TTL:** `600` seconds (10 minutes)

### 7.2 Release Process Enforcement
- **Issue:** Deployments that execute `npm run build` without an accompanying `pm2 reload ayaan-customer` cause immediate asset 500 ChunkLoadErrors.
- **Recommended Action:** Update the CI/CD pipeline or deployment shell script to ensure atomic builds or create an automated deployment wrapper:
  ```bash
  # Atomic deployment sequence
  npm run build && su - ayaan -c "pm2 reload ayaan-customer ayaan-admin"
  ```
  Consider using Next.js standalone output with symlinked release directories (`releases/YYYYMMDD-HHMMSS`) to ensure instant, rollback-safe releases.

---

**Incident Status:** Fully Resolved. All customer and administrative pages are healthy and serving live traffic normally.
