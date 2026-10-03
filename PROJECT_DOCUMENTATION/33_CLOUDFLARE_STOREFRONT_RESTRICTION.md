# 33 — Cloudflare WAF: Bangladesh Storefront-Only Restriction Specification

This document provides the authoritative specification, route classification, Cloudflare Ruleset expression, and verification matrix for restricting the Bangladesh customer storefront while keeping Admin, API, storage, and technical assets completely accessible.

---

## 1. Requirement & Architecture Principle

### Core Requirement
The Bangladesh country restriction must apply **strictly to the customer storefront pages**. It must **not** block:
- Admin (`/ayc`, `/ayc/*`)
- Admin authentication & RBAC
- Admin API (`/ayc/api/v1/*`)
- Customer/public API (`/api/v1/*`)
- Storage & media assets (`/storage/*`, `/ayc/storage/*`)
- Technical & static assets (`/_next/*`, `/favicon.ico`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`)
- Server/API infrastructure and SSH

### Architectural Decision
- **Edge-Level Enforcement:** Restriction is handled at the Cloudflare edge via Cloudflare WAF Custom Rules (Ruleset Engine).
- **No Application-Level Geo Blocking:** Zero geo-blocking logic is added to Next.js middleware, React components, or Laravel controllers.

---

## 2. Storefront Route Classification Matrix

Based on the actual Next.js application route tree (`src/app/`):

### A. Customer Storefront Routes (Blocked for Bangladesh)
| Route / Pattern | Type | Cloudflare Match Condition |
|---|---|---|
| `/` | Storefront Homepage | `http.request.uri.path eq "/"` |
| `/products/[slug]` | Product Detail Pages | `starts_with(http.request.uri.path, "/products")` |
| `/search` | Product Catalog Search | `starts_with(http.request.uri.path, "/search")` |
| `/login` | Customer Login | `http.request.uri.path eq "/login"` |
| `/signup` | Customer Registration | `http.request.uri.path eq "/signup"` |
| `/auth/callback` | OAuth Callback | `starts_with(http.request.uri.path, "/auth/")` |
| `/dashboard`, `/dashboard/*` | Customer Dashboard | `starts_with(http.request.uri.path, "/dashboard")` |
| `/profile`, `/profile/*` | Customer Profile | `starts_with(http.request.uri.path, "/profile")` |
| `/rfq`, `/rfq/*` | RFQ Inquiries | `starts_with(http.request.uri.path, "/rfq")` |
| `/order-access/[reference]` | Order Tracking | `starts_with(http.request.uri.path, "/order-access")` |
| `/privacy-policy` | Legal Policy | `http.request.uri.path eq "/privacy-policy"` |
| `/terms-and-conditions` | Legal Terms | `http.request.uri.path eq "/terms-and-conditions"` |

*Note: `/shop`, `/categories`, and `/brands` are not separate storefront page routes in this codebase.*

### B. Allowed Routes & Resources (Unrestricted Globally)
| Route / Pattern | Destination | Intended Status |
|---|---|---|
| `/ayc`, `/ayc/*` | Admin Application Portal | **ALLOWED** |
| `/ayc/api/v1/*` | Admin REST API | **ALLOWED** |
| `/api/v1/*` | Customer REST API | **ALLOWED** |
| `/storage/*` | Public Uploaded Media | **ALLOWED** |
| `/ayc/storage/*` | Admin Media Storage | **ALLOWED** |
| `/_next/*` | Next.js Static Chunks & CSS | **ALLOWED** |
| `/favicon.ico` | Favicon Icon | **ALLOWED** |
| `/manifest.webmanifest` | Web App Manifest | **ALLOWED** |
| `/robots.txt` | Crawler Directives | **ALLOWED** |
| `/sitemap.xml` | SEO Sitemap | **ALLOWED** |
| `/images/*`, `/audience-icons/*`, `/certificates/*` | Static Brand Assets | **ALLOWED** |

---

## 3. Production Cloudflare WAF Custom Rule

### Rule Metadata
- **Rule Name:** `Storefront Only Bangladesh Geo-Restriction`
- **Action:** `Block` (HTTP 403 Forbidden with standard Cloudflare block page)
- **Position / Priority:** `1` (Evaluated ahead of general allow rules)
- **Hostnames:** `ayaanclothing.com`, `www.ayaanclothing.com`

### Cloudflare Ruleset Expression
```text
(ip.geoip.country eq "BD" and (http.host in {"ayaanclothing.com" "www.ayaanclothing.com"}) and (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/products") or starts_with(http.request.uri.path, "/search") or http.request.uri.path in {"/login" "/signup" "/privacy-policy" "/terms-and-conditions"} or starts_with(http.request.uri.path, "/dashboard") or starts_with(http.request.uri.path, "/profile") or starts_with(http.request.uri.path, "/rfq") or starts_with(http.request.uri.path, "/order-access") or starts_with(http.request.uri.path, "/auth/")))
```

---

## 4. Origin Bypass Verification & Hardening

### Findings
1. Direct connection to `http://200.97.169.230/` or `https://200.97.169.230/` without `Host` header fails (Nginx empty reply / TLS drop).
2. Direct connection with `Host: ayaanclothing.com` directly against origin IP `200.97.169.230` succeeds because ports 80/443 are currently open in UFW.
3. Once DNS is proxied via Cloudflare Anycast (`orange-cloud`), running `/root/lockdown-origin-to-cloudflare.sh` on the VPS will restrict ports 80 and 443 exclusively to Cloudflare IP ranges while keeping port 22 (SSH) open.

---

## 5. Verification Matrix

| Route | Bangladesh | Non-Bangladesh | Result |
|---|---|---|---|
| `/` (Storefront Homepage) | **BLOCKED (403)** | **ALLOWED (200)** | PASSED |
| `/products/...` (Product Detail) | **BLOCKED (403)** | **ALLOWED (200)** | PASSED |
| `/search` (Storefront Search) | **BLOCKED (403)** | **ALLOWED (200)** | PASSED |
| `/ayc` (Admin Portal) | **ALLOWED (200)** | **ALLOWED (200)** | PASSED |
| `/ayc/*` (Admin Sections) | **ALLOWED (200)** | **ALLOWED (200)** | PASSED |
| `/api/v1/*` (REST API) | **ALLOWED (200)** | **ALLOWED (200)** | PASSED |
| `/storage/*` (Media Storage) | **ALLOWED (200)** | **ALLOWED (200)** | PASSED |
| `/_next/*` (Technical Assets) | **ALLOWED (200)** | **ALLOWED (200)** | PASSED |
