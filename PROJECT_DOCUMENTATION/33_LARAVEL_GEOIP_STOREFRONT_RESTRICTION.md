# 33. Laravel GeoIP Bangladesh Storefront Restriction

## 1. Overview & Objective

Ayaan Clothing is a dedicated wholesale export manufacturer. The customer-facing storefront is designed exclusively for international buyers and export wholesale commerce.

The Bangladesh storefront restriction blocks visitors connecting from Bangladesh IP addresses when enabled by administrators, while ensuring:
1. **Administrative Portal (`/ayc`, `/ayc/*`)** remains globally accessible so authorized administrators in Bangladesh can access and manage the system.
2. **REST APIs (`/api/v1/*`)** continue normal execution according to their existing authentication and authorization policies.
3. **Storage & Media (`/storage/*`)** remain accessible.
4. **Zero Cloudflare or External CDN dependencies**: Geolocation resolution and access control are operated directly within the Laravel application stack using local MaxMind GeoLite2 databases.

---

## 2. Package & Driver Specification

| Attribute | Specification |
| :--- | :--- |
| **Package** | `stevebauman/location` |
| **Installed Version** | `v7.6.3` (Compatible with Laravel 13 & PHP 8.3+) |
| **Primary Driver** | `Stevebauman\Location\Drivers\MaxMind::class` |
| **Local Database** | `database/maxmind/GeoLite2-Country.mmdb` (Country-level binary lookup) |
| **Resolution Speed** | `< 1ms` local in-memory binary search |
| **Fallbacks** | `IpApi::class`, `Ip2locationio::class`, `IpInfo::class`, `GeoPlugin::class` |
| **PII & Data Storage** | Zero personal location data stored. Only 2-letter uppercase ISO country code is returned (`BD`, `US`, etc.). |

---

## 3. End-to-End System Architecture

```
                       USER BROWSER
                            |
                          NGINX
                 (X-Real-IP: $remote_addr)
                            |
                    Next.js 16 proxy.ts
                            |
           Is request an Admin route (/ayc/*)
           or API (/api/*) or static asset?
                     /             \
                   YES              NO (Storefront Page)
                    |                |
             ALLOW (Proceed)    Internal Server-to-Server Check
                                (GET /api/v1/internal/storefront/access-check)
                                [Header: X-Internal-Secret]
                                     |
                         StorefrontCountryAccessService
                                     |
                       Is block toggle enabled?
                              /             \
                            NO              YES
                             |               |
                           ALLOW       GeoIP Resolution
                                     (MaxMind Local mmdb)
                                       /             \
                                  Country: BD     Other Country / Unknown
                                       |                     |
                                  HTTP 403                 ALLOW
                           (403_geo_restricted.html)
```

---

## 4. Backend Implementation Components

### 4.1 `StorefrontCountryAccessService`
- **Location**: `backend/app/Services/Security/StorefrontCountryAccessService.php`
- **Responsibilities**:
  - `isBlockEnabled()`: Reads `SystemSetting::isBangladeshStorefrontBlockEnabled()`.
  - `setBlockEnabled(bool $enabled)`: Persists state to database and purges catalog caches.
  - `resolveCountry(?string $ip)`: Resolves country via `Location::get($ip)` with 30-minute Redis/file cache (`geoip_country:{ip}`).
  - `checkAccess(?string $ip)`: Computes access decision object (`['enabled' => bool, 'country' => ?string, 'blocked' => bool, 'allowed' => bool]`).
  - **Fail-Safe**: If GeoIP resolution fails, returns `allowed: true` to avoid randomly locking out valid users.

### 4.2 Internal Country-Check Endpoint
- **Route**: `GET /api/v1/internal/storefront/access-check`
- **Controller**: `App\Http\Controllers\Api\V1\Internal\InternalStorefrontAccessController`
- **Security Boundary**:
  - Requires `X-Internal-Secret` matching `INTERNAL_API_SECRET`. Public requests without secret return HTTP 403 Forbidden.
  - Requires `X-Internal-Client-IP` populated server-side by Next.js proxy from trusted Nginx socket (`$remote_addr`).
  - Strictly rejects any client query parameter `?ip=...` with HTTP 400 Bad Request to prevent spoofing.
- **Payload**: Minimal decision object `{ "allowed": true }` or `{ "allowed": false }`. Never exposes coordinates, city, ISP, or internal diagnostics.

### 4.3 Admin Toggle Endpoints
- **Routes**:
  - `GET /api/v1/admin/homepage/bangladesh-storefront-access` (Requires `homepage.view`)
  - `PATCH /api/v1/admin/homepage/bangladesh-storefront-access` (Requires `homepage.banner.edit` or Super Admin)
- **Controller**: `App\Http\Controllers\Api\V1\Admin\HomepageManagementController`
- **Persistence**: Stored in `system_settings` under key `bangladesh_storefront_block_enabled`.

### 4.4 Database Maintenance, Atomic Updates & Rollback (`GeoIpDatabaseManager`)
- **Service**: `App\Services\Security\GeoIpDatabaseManager`
- **Atomic Swap & Rollback**:
  - Downloads updates to a temporary directory (`sys_get_temp_dir()`).
  - Validates downloaded archive size (> 1MB), binary format, `GeoLite2-Country` database type, and verifies resolution of test IPs (`8.8.8.8` -> `US`, `103.230.104.1` -> `BD`).
  - Preserves previous valid database at `database/maxmind/GeoLite2-Country.mmdb.backup`.
  - Atomically replaces active database only if all validation tests pass.
  - Automatically restores backup and keeps storefront functional if new file is corrupted or validation fails.
- **Cache Invalidation**:
  - Uses dynamic versioned salt (`geoip_country_cache_salt`).
  - Increments salt on every database update, causing all cached lookups to immediately resolve against the updated database in 1ms without flushing unrelated Redis application caches.

### 4.5 Diagnostics & Automated Scheduling
- **Diagnostic Command**: `php artisan geoip:status` (supports `--json` for monitoring tools). Reports file size, build timestamp, IP version support, node count, health status (`HEALTHY`, `OUTDATED`, `CORRUPT`, `MISSING`), and update audit trail. Never leaks license keys or secrets.
- **Maintenance Command**: `php artisan geoip:update` (supports `--force` and `--license-key=`).
- **Scheduler**: Scheduled in `routes/console.php` every Wednesday at `03:00 UTC` with `withoutOverlapping()`. Executes via the production crontab (`* * * * * php artisan schedule:run`).

---

## 5. Next.js Storefront Proxy Integration & Route Classification

- **File**: `src/proxy.ts`
- **Next.js 16 Proxy Convention**: `export async function proxy(request: NextRequest)`
- **Explicit Route Classification**:
  1. **Customer Storefront Content (Subject to GeoIP Check)**:
     - `/` (Home landing page, merchandising banners, brand showcase)
     - `/products`, `/products/*` (Garment catalog & product detail matrix)
     - `/search`, `/search/*` (Faceted catalog search)
     - `/privacy-policy`, `/terms-and-conditions` (Storefront legal pages)
  2. **Customer Account & Fulfillment Services (Exempt / Globally Accessible)**:
     - `/order-access`, `/order-access/*` (Direct guest/buyer order lookup & invoice tracking via email token)
     - `/dashboard`, `/dashboard/*` (Authenticated customer order, quote, and document management)
     - `/profile`, `/profile/*` (Customer profile & shipping address settings)
     - `/login`, `/signup`, `/auth/*` (Customer authentication gateway & Google OAuth)
     - `/rfq` (Direct OEM manufacturing quote submission)
  3. **Administrative Portal (Exempt / Globally Accessible)**:
     - `/ayc`, `/ayc/*` (Dedicated admin gateway on port 3001)
  4. **Backend API & Public Storage (Exempt / Existing Behavior)**:
     - `/api/*`, `/storage/*`
  5. **Technical & Static Resources (Exempt)**:
     - `/_next/*`, `.ico`, `.png`, `.jpg`, `.svg`, `.webp`, `.woff2`, `.css`, `.js`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`
- **403 Response**: Returns HTTP 403 status with clean minimal markup defined in `src/lib/geo-block-page.ts`.

---

## 6. Admin User Interface

- **Component**: `src/components/admin/homepage/BangladeshStorefrontAccessCard.tsx`
- **Page**: `/ayc/homepage`
- **Title**: `BANGLADESH STOREFRONT ACCESS`
- **Controls**: Interactive segmented button `[ OFF ]` / `[ ON ]`
- **Status Badges**:
  - When OFF: Green badge: *"Storefront accessible in Bangladesh"*
  - When ON: Red badge: *"Storefront blocked in Bangladesh"*
- **Safety Dialog**: Requires confirmation before persisting state to prevent accidental storefront lockouts:
  - ON confirmation: *"Block the customer storefront for visitors from Bangladesh?"*
  - OFF confirmation: *"Allow the customer storefront for visitors from Bangladesh?"*

---

## 7. Acceptance & Verification Matrix

| Test Scenario | Bangladesh IP (`203.190.14.229`) | Non-Bangladesh IP (`200.97.169.230`) | Verified |
| :--- | :--- | :--- | :--- |
| **Block OFF (Default)** | | | |
| Storefront Pages (`/`, `/products/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| Admin Portal (`/ayc/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| Customer Account (`/order-access/*`, `/dashboard`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| REST API (`/api/v1/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| Media / Storage (`/storage/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| **Block ON** | | | |
| Storefront Pages (`/`, `/products/*`, `/search`) | **HTTP 403 BLOCKED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| Admin Portal (`/ayc/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| Customer Account (`/order-access/*`, `/dashboard`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| REST API (`/api/v1/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| Media / Storage (`/storage/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Real Live Verified |
| IPv6 Connection (`2400:c600:...`) | **HTTP 403 BLOCKED** | **HTTP 200 ALLOWED** | ✅ Automated Test Verified |
| GeoIP Lookup Failure | **HTTP 200 (Fail-open)**| **HTTP 200 (Fail-open)**| ✅ Automated Test Verified |
| Corrupt Database Rollback | **Restores Backup** | **Restores Backup** | ✅ Automated Test Verified |
| Unauthorized Toggle Attempt | **HTTP 401/403 FORBIDDEN**| **HTTP 401/403 FORBIDDEN**| ✅ Real Live Verified |
| Public Call to Internal Endpoint | **HTTP 403 FORBIDDEN**| **HTTP 403 FORBIDDEN**| ✅ Real Live Verified |
| Arbitrary `?ip=8.8.8.8` Query Spoof | **HTTP 400 BAD REQUEST**| **HTTP 400 BAD REQUEST**| ✅ Real Live Verified |

