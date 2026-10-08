# AYAAN CLOTHING — PRODUCTION API FAILURE DIAGNOSIS & FRONTEND ERROR-STATE INCIDENT REPORT

**Date:** October 8, 2026  
**Incident Reference:** INC-2026-10-08-STF-API  
**Target Environment:** Production (`https://ayaanclothing.com` / VPS `200.97.169.230`)  
**Investigator:** Antigravity AI Coding Assistant  

---

## 1. EXECUTIVE SUMMARY & STATUS

**ROOT CAUSE:**  
1. **Storefront Client API Base URL Misconfiguration (`src/services/api-client.ts`):**  
   During Next.js production client bundling, `NEXT_PUBLIC_API_URL` fell back to `http://127.0.0.1:8000/api/v1` (or localhost). The runtime helper `apiClient.getBaseUrl()` only rewrote the URL if the browser's `window.location.hostname` was strictly `localhost` or `127.0.0.1`. When real customers loaded the production storefront at `https://ayaanclothing.com`, `getBaseUrl()` returned `http://127.0.0.1:8000/api/v1`. The customer's browser blocked or failed these calls due to mixed content / unreachable localhost loopback, immediately aborting all client-side data fetches (customer registration, search products catalog, brand explorer, category feeds).
2. **Search Page Overlapping Error / Empty State Bug (`src/app/search/page.tsx`):**  
   The search page failed to treat the API error state and zero-result empty state as mutually exclusive. When an API error occurred (`error !== null`), the page simultaneously rendered the header `ALL PRODUCTS — 0 PRODUCTS`, the empty catalog card (`No Products Found`), and the error banner (`Couldn't load products. Please try again.`).
3. **Header Search Placeholder Discrepancies (`src/components/layout/Header.tsx`):**  
   Search input elements used legacy placeholders (`"Search apparel, brand, or collection..."` / `"Search apparel, brand..."`) and lacked explicit form autocomplete protection (`autoComplete="off"`), making them susceptible to browser form autofill or stray placeholder strings (e.g. `"Cupiditate est incidid"` from faker fixtures).

**FIX:**  
1. **Dynamic Resilient API URL Resolution:**  
   Updated `src/services/api-client.ts` `getBaseUrl()`:
   - For any client-side browser execution on a remote host (such as `ayaanclothing.com`), it dynamically uses the current origin: `${window.location.origin}/api/v1`. This is reverse-proxied by Nginx directly to PHP-FPM, eliminating localhost leaks and mixed-content issues regardless of build-time inlining.
   - For production SSR, falls back to `https://ayaanclothing.com/api/v1`.
   - Structured error handling to preserve 422 validation messages/field dictionaries, 429 rate limits, 403 authorization denials, and 500 server errors rather than collapsing them into status 0 network errors.
2. **Mutually Exclusive Search States:**  
   Updated `src/app/search/page.tsx`:
   - Loading: displays animated skeleton placeholders.
   - Error: renders dedicated error state with a Retry action; suppresses `"0 PRODUCTS"` from the catalog header; completely hides the empty results card.
   - Success with 0 items: displays `"No Products Found"` only when `!error && !loading && products.length === 0`.
3. **Standardized Header Search Inputs:**  
   Updated `src/components/layout/Header.tsx` to standardize all search input placeholders to the approved `"Search products..."` with `autoComplete="off"` and standard field attributes.
4. **Auth Validation Integrity (`src/lib/AuthContext.tsx`):**  
   Preserved backend 422 validation messages and field dictionaries in `signIn` and `signUp`, ensuring that validation failures (e.g., duplicate email, short password) are communicated cleanly to the user rather than masquerading as network connection errors.

**PRODUCTION STATUS:**  
HEALTHY

---

## 2. AFFECTED ENDPOINTS & COMPONENTS

### Affected Backend Endpoints (Client-Side Access Blocked by Port 8000 Leak)
- `POST /api/v1/auth/register` (Customer registration)
- `GET /api/v1/products` (Search & catalog query)
- `GET /api/v1/categories` (Category navigation)
- `GET /api/v1/brands` (Brand explorer)
- `GET /api/v1/homepage` (Dynamic catalog sections)

### Affected Frontend Components & Pages
- `src/services/api-client.ts` (`ApiClient.getBaseUrl`, `ApiClient.request`)
- `src/lib/AuthContext.tsx` (`signUp`, `signIn`)
- `src/app/search/page.tsx` (Catalog explorer & state exclusivity)
- `src/components/layout/Header.tsx` (Search bar placeholders & input attributes)
- `src/app/signup/page.tsx` & `src/components/auth/AuthModal.tsx` (Registration error feedback)

---

## 3. BACKEND & INFRASTRUCTURE FINDINGS

Direct diagnostic checks performed on the production server (`200.97.169.230`):
- **Nginx (`/etc/nginx/sites-available/ayaan`)**:  
  Reverse proxies `/api/v1/` to FastCGI socket `unix:/run/php/php8.4-fpm.sock`. Port 8000 is intentionally closed to external traffic.
- **PHP 8.4-FPM**:  
  Active (running) with 8 worker processes. FastCGI socket responsive.
- **PostgreSQL (`ayaan_production`)**:  
  Online, accepting queries on localhost port 5432. All migrations up to date.
- **Redis (`6379`)**:  
  Online, PING -> PONG. Cache and session storage operational.
- **Supervisor Queue Worker**:  
  `ayaan-worker:ayaan-worker_00` RUNNING.
- **PM2**:  
  Processes `ayaan-customer` (port 3000) and `ayaan-admin` (port 3001) active under system user `ayaan`.
- **Direct API Checks**:
  - `GET https://ayaanclothing.com/api/v1/health` -> HTTP 200 `{"status":"ok","database":"ok","redis":"ok"}`
  - `GET https://ayaanclothing.com/api/v1/settings/public` -> HTTP 200
  - `GET https://ayaanclothing.com/api/v1/categories` -> HTTP 200
  - `GET https://ayaanclothing.com/api/v1/brands` -> HTTP 200
  - `GET https://ayaanclothing.com/api/v1/products` -> HTTP 200
  - `GET https://ayaanclothing.com/api/v1/homepage` -> HTTP 200
  - `POST https://ayaanclothing.com/api/v1/auth/register` -> HTTP 422 with structured validation error JSON

---

## 4. REGRESSION TEST VERIFICATION

Added automated regression test suite:  
[`tests/production-api-failure-and-error-states.test.ts`](file:///Users/luhasan/Documents/ayaan/tests/production-api-failure-and-error-states.test.ts)

Test cases covered:
1. `Product API failure` -> throws `ApiError` with proper status and diagnostic message.
2. `Product API success with zero results` -> returns empty product array cleanly without error flag.
3. `Product API success with products` -> parses and transforms real product schema correctly.
4. `Homepage API failure` -> handles failure gracefully without corrupting catalog state.
5. `Signup network failure` -> catches network/connectivity failures with friendly connection warning.
6. `Signup HTTP 422 validation error` -> extracts and displays field validation messages (e.g. duplicate email) instead of generic network errors.
7. `Correct production API URL` -> verifies remote browser environments resolve to origin `/api/v1`.
8. `Search placeholder` -> verifies header inputs use approved `"Search products..."` placeholder and autocomplete is disabled.
9. `Categories response mapping` -> verifies category array parsing.
10. `Brands response mapping` -> verifies brand array parsing.

**Test Execution:**
```
Storefront Unit: PASS (37/37 passed)
Storefront Contract: PASS
Storefront Release Gate: APPROVED
```

---

## 5. POST-DEPLOYMENT VERIFICATION

- **Storefront HTTP status:** 200 OK
- **API Health status:** 200 OK (`database: ok`, `redis: ok`)
- **Homepage Elements:**
  - Brands: 69 brand links & logos dynamically loaded
  - Categories: 41 category pills rendered
  - Dynamic products: 42 product cards rendered
- **Catalog Search (`https://ayaanclothing.com/search`):**
  - Products display: 79 total products in catalog (24 loaded per batch with infinite scroll)
  - Mutual Exclusivity: Error state and empty results state never overlap
  - Zero results state (`?q=xyznonexistentquery9999`): displays clean "NO PRODUCTS FOUND" with "CLEAR SEARCH" button; no error banner
- **Customer Registration (`https://ayaanclothing.com/signup`):**
  - Validation feedback (HTTP 422) is clear: "Password must be at least 6 characters"
  - No false "network error or server unreachable" reports
- **Header Search Bar:**
  - Placeholder is consistently `"Search products..."` on both desktop and mobile headers
  - Explicit `autoComplete="off"` protects against browser autofill anomalies
- **Visual Evidence:**
  - Homepage: `live_homepage.png`
  - Search Catalog: `live_search_catalog.png`
  - Zero Results Search: `live_search_zero_results.png`
  - Signup Validation: `live_signup_validation.png`

---

## 6. FINAL DEPLOYMENT STATUS

- Git Commit: `178e366 fix(production): resolve storefront API and authentication failures`
- Pushed to: `origin/main` & `labib/main`
- Deployed to VPS: `200.97.169.230` (/var/www/ayaan)
- PM2 Processes: `ayaan-customer` (PID 1978628) and `ayaan-admin` (PID 1978640) online
- System Status: **HEALTHY**

