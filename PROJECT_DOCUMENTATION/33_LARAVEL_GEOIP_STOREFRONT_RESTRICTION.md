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

---

## 5. Next.js Storefront Proxy Integration

- **File**: `src/proxy.ts`
- **Next.js 16 Proxy Convention**: `export async function proxy(request: NextRequest)`
- **Route Protection Filter**:
  - Admin paths (`/ayc`, `/ayc/*`), admin subdomains, and admin gateway headers are exempted immediately.
  - Static files (`_next/*`, `/storage/*`, `.ico`, `.png`, `.svg`, `.xml`, etc.) bypass the check.
  - Storefront page requests (`/`, `/products/*`, `/search`, `/dashboard/*`, etc.) execute the internal country check.
- **403 Response**: Returns HTTP 403 status with clean minimal markup defined in `src/lib/geo-block-page.ts` (reusing `public/403_geo_restricted.html`).

---

## 6. Admin User Interface

- **Component**: `src/components/admin/homepage/BangladeshStorefrontAccessCard.tsx`
- **Page**: `/ayc/homepage`
- **Title**: `BANGLADESH STOREFRONT ACCESS`
- **Controls**: Interactive segmented button `[ OFF ]` / `[ ON ]`
- **Status Badges**:
  - When OFF: Green badge: *"Storefront accessible in Bangladesh"*
  - When ON: Red badge: *"Storefront blocked in Bangladesh"*
- **Safety Dialog**: Requires confirmation before persisting state to prevent accidental storefront lockouts.

---

## 7. Acceptance & Verification Matrix

| Test Scenario | Bangladesh IP | Non-Bangladesh IP | Verified |
| :--- | :--- | :--- | :--- |
| **Block OFF (Default)** | | | |
| Storefront Pages (`/`, `/products/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Verified |
| Admin Portal (`/ayc/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Verified |
| REST API (`/api/v1/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Verified |
| Media / Storage (`/storage/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Verified |
| **Block ON** | | | |
| Storefront Pages (`/`, `/products/*`) | **HTTP 403 BLOCKED** | **HTTP 200 ALLOWED** | ✅ Verified |
| Admin Portal (`/ayc/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Verified |
| REST API (`/api/v1/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Verified |
| Media / Storage (`/storage/*`) | **HTTP 200 ALLOWED** | **HTTP 200 ALLOWED** | ✅ Verified |
| IPv6 Connection (`2400:c600:...`) | **HTTP 403 BLOCKED** | **HTTP 200 ALLOWED** | ✅ Verified |
| GeoIP Lookup Failure | **HTTP 200 (Fail-open)**| **HTTP 200 (Fail-open)**| ✅ Verified |
| Unauthorized Toggle Attempt | **HTTP 403 FORBIDDEN**| **HTTP 403 FORBIDDEN**| ✅ Verified |
| Public Call to Internal Endpoint | **HTTP 403 FORBIDDEN**| **HTTP 403 FORBIDDEN**| ✅ Verified |
