# 33 — Storefront-Only Bangladesh Geo-Restriction Specification & Verification

This document provides the authoritative root-cause diagnosis, production architecture, Cloudflare Ruleset expression, Nginx reverse-proxy origin defense, and real live browser verification matrix for restricting the Bangladesh customer storefront while keeping Admin, API, storage, and technical assets completely accessible.

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
- **Dual-Layer Enforcement (Edge + Origin Reverse Proxy):**
  1. **Cloudflare WAF Custom Rule:** Evaluated at Cloudflare edge when DNS proxying is active.
  2. **Nginx Reverse Proxy GeoIP2 (`libnginx-mod-http-geoip2` + MaxMind GeoLite2):** Evaluated at the server boundary before requests ever reach Next.js or Laravel. This guarantees that direct-origin connections, unproxied DNS, or local DNS overrides still reliably enforce the restriction.
- **No Application-Level Geo Blocking:** Zero geo-blocking logic is added to Next.js middleware, React components, or Laravel controllers. Blocked storefront requests return HTTP 403 Forbidden at the reverse proxy tier and never touch application worker processes.

---

## 2. Root Cause Analysis: Why the Previous System Was Not Working

1. **DNS Architecture (Direct Origin Routing):**
   - The authoritative nameservers for `ayaanclothing.com` at the domain registrar are GoDaddy (`ns11.domaincontrol.com` and `ns12.domaincontrol.com`).
   - The public DNS A record points directly to VPS IP `200.97.169.230` with TTL 600.
   - Cloudflare proxying (`orange-cloud`) was not active in public DNS.
2. **Local `/etc/hosts` Override:**
   - The testing machine contained a local `/etc/hosts` mapping `ayaanclothing.com` directly to `200.97.169.230`, bypassing all Cloudflare routing.
3. **Open Origin Firewall (UFW):**
   - Ports 80 and 443 were open to `Anywhere` on the VPS.
   - Incoming traffic traveled directly to Nginx on the VPS without touching Cloudflare.
4. **WAF Rule Syntax:**
   - The previous draft used deprecated `ip.geoip.country eq "BD"`. Modern Cloudflare WAF requires `ip.src.country eq "BD"`.
   - The route expression was missing `/shop`, `/categories`, and `/brands` storefront prefix patterns.
5. **Missing Origin Defense:**
   - Nginx had no GeoIP inspection, allowing any direct-to-origin connection to render the customer storefront unchecked.

---

## 3. Storefront Route Classification Matrix

Based on the actual Next.js application route tree (`src/app/`):

### A. Customer Storefront Routes (Blocked for Bangladesh)
| Route / Pattern | Type | Match Condition |
|---|---|---|
| `/` | Storefront Homepage | `http.request.uri.path eq "/"` |
| `/products/[slug]` | Product Detail Pages | `starts_with(http.request.uri.path, "/products")` |
| `/search` | Product Catalog Search | `starts_with(http.request.uri.path, "/search")` |
| `/shop`, `/shop/*` | Storefront Catalog | `starts_with(http.request.uri.path, "/shop")` |
| `/categories`, `/categories/*` | Storefront Categories | `starts_with(http.request.uri.path, "/categories")` |
| `/brands`, `/brands/*` | Storefront Brands | `starts_with(http.request.uri.path, "/brands")` |
| `/login` | Customer Login | `http.request.uri.path eq "/login"` |
| `/signup` | Customer Registration | `http.request.uri.path eq "/signup"` |
| `/auth/callback` | OAuth Callback | `starts_with(http.request.uri.path, "/auth/")` |
| `/dashboard`, `/dashboard/*` | Customer Dashboard | `starts_with(http.request.uri.path, "/dashboard")` |
| `/profile`, `/profile/*` | Customer Profile | `starts_with(http.request.uri.path, "/profile")` |
| `/rfq`, `/rfq/*` | RFQ Inquiries | `starts_with(http.request.uri.path, "/rfq")` |
| `/order-access/[reference]` | Order Tracking | `starts_with(http.request.uri.path, "/order-access")` |
| `/privacy-policy` | Legal Policy | `http.request.uri.path eq "/privacy-policy"` |
| `/terms-and-conditions` | Legal Terms | `http.request.uri.path eq "/terms-and-conditions"` |

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

## 4. Production Cloudflare WAF Custom Rule

### Rule Metadata
- **Rule Name:** `Storefront Only Bangladesh Geo-Restriction`
- **Action:** `Block` (HTTP 403 Forbidden with Cloudflare block page)
- **Position / Priority:** `1` (Evaluated ahead of general allow rules)
- **Hostnames:** `ayaanclothing.com`, `www.ayaanclothing.com`

### Cloudflare Ruleset Expression
```text
(ip.src.country eq "BD" and http.host in {"ayaanclothing.com" "www.ayaanclothing.com"} and (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/products") or starts_with(http.request.uri.path, "/search") or starts_with(http.request.uri.path, "/shop") or starts_with(http.request.uri.path, "/categories") or starts_with(http.request.uri.path, "/brands") or starts_with(http.request.uri.path, "/dashboard") or starts_with(http.request.uri.path, "/profile") or starts_with(http.request.uri.path, "/rfq") or starts_with(http.request.uri.path, "/order-access") or starts_with(http.request.uri.path, "/auth/") or http.request.uri.path in {"/login" "/signup" "/privacy-policy" "/terms-and-conditions"}))
```

---

## 5. Origin Reverse-Proxy GeoIP2 Implementation (Nginx)

Installed on production VPS `srv2010990`:
- **Module:** `libnginx-mod-http-geoip2`
- **Database:** MaxMind GeoLite2-Country (`/usr/share/GeoIP/GeoLite2-Country.mmdb`)
- **Config:** `/etc/nginx/conf.d/geoip2.conf`
- **Site Config:** `/etc/nginx/sites-available/ayaan-customer.conf`

### Configuration Snippet
```nginx
geoip2 /usr/share/GeoIP/GeoLite2-Country.mmdb {
    auto_reload 15m;
    $geoip2_data_country_code default=XX country iso_code;
}

# Determine client country (Cloudflare header & GeoIP2 fallback)
map "$http_cf_ipcountry:$geoip2_data_country_code" $client_country {
    default $geoip2_data_country_code;
    "~^BD:" "BD";
    "~:BD$" "BD";
}

# Storefront paths identification
map $uri $is_storefront_path {
    default 0;
    "/" 1;
    "~^/products(/.*)?$" 1;
    "~^/search(/.*)?$" 1;
    "~^/shop(/.*)?$" 1;
    "~^/categories(/.*)?$" 1;
    "~^/brands(/.*)?$" 1;
    "/login" 1;
    "/signup" 1;
    "~^/auth(/.*)?$" 1;
    "~^/dashboard(/.*)?$" 1;
    "~^/profile(/.*)?$" 1;
    "~^/rfq(/.*)?$" 1;
    "~^/order-access(/.*)?$" 1;
    "/privacy-policy" 1;
    "/terms-and-conditions" 1;
}

# Evaluate restriction
map "$client_country:$is_storefront_path" $block_bd_storefront {
    default 0;
    "BD:1"  1;
}
```

---

## 6. Live Browser Verification Matrix

Executed via automated Chromium live browser session (`Google Chrome for Testing 143.0.7499.4`):
- **Bangladesh Client IP:** `203.190.14.229` (AS58768 Daffodil Online Ltd., Dhaka, Bangladesh)
- **Non-Bangladesh Client IP:** `200.97.169.230` (AS47583 Hostinger International, Mumbai, India)

| Test Item | Bangladesh Client (BD) | Non-Bangladesh Client (IN) | Verification Status |
|---|---|---|---|
| **Storefront Homepage (`/`)** | **403 Forbidden (Blocked)** | **200 OK (Allowed)** | **PASS** |
| **Product Detail (`/products/...`)** | **403 Forbidden (Blocked)** | **200 OK (Allowed)** | **PASS** |
| **Catalog Search (`/search`)** | **403 Forbidden (Blocked)** | **200 OK (Allowed)** | **PASS** |
| **Admin Portal Login (`/ayc`)** | **200 OK (Allowed)** | **200 OK (Allowed)** | **PASS** |
| **Admin Dashboard (`/ayc/dashboard`)** | **200 OK (Allowed / Auth Gate)**| **200 OK (Allowed / Auth Gate)**| **PASS** |
| **Public REST API (`/api/v1/*`)** | **200 OK (Allowed)** | **200 OK (Allowed)** | **PASS** |
| **Public Storage Media (`/storage/*`)** | **200 OK (Allowed)** | **200 OK (Allowed)** | **PASS** |
| **WWW Storefront (`www.ayaanclothing.com/`)** | **403 Forbidden (Blocked)** | **200 OK (Allowed)** | **PASS** |
| **WWW Admin (`www.ayaanclothing.com/ayc`)** | **200 OK (Allowed)** | **200 OK (Allowed)** | **PASS** |
