# 31 — Technical Debt & Known Architectural Inconsistencies

This document catalogues factual technical debt, legacy artifacts, and structural inconsistencies observed during the deep repository audit.

---

## 1. Technical Debt Inventory

### ISSUE 1: Legacy Standalone Mock Data Artifacts
- **Why It Matters**: Causes confusion for developers regarding the source of truth.
- **Affected Area**: `src/lib/mock-data/` (`mock-products.ts`, `mock-brands.ts`, `mock-users.ts`, `mock-rfqs.ts`).
- **Evidence**: The active production storefront and admin portals have been completely decoupled from these files and query PostgreSQL exclusively. However, mock files remain on disk for fallback in isolated offline test harnesses (`NEXT_PUBLIC_FRONTEND_ONLY=true`).
- **Possible Direction**: Retain for offline unit tests or remove once CI test harnesses run against Dockerized PostgreSQL.

### ISSUE 2: Duplicate Customer Route Paths (`/dashboard` vs `/profile`)
- **Why It Matters**: Potential split SEO crawl paths and redundant maintenance.
- **Affected Area**: `src/app/dashboard/*` and `src/app/profile/*`.
- **Evidence**: Both `/dashboard/orders` and `/profile/orders`, as well as `/dashboard/addresses` and `/profile/addresses` exist in the App Router.
- **Possible Direction**: Standardize on `/dashboard/*` for all authenticated buyer functionality and issue permanent 301 redirects from `/profile/*`.

### ISSUE 3: Dual Local Development Port Proxy Architecture
- **Why It Matters**: Requires orchestrating an extra Node.js proxy server (`scripts/admin-proxy.js`) during local full-stack development.
- **Affected Area**: `scripts/admin-proxy.js`, `src/proxy.ts`.
- **Evidence**: Port `3000` is reserved for storefront and `3001` for admin. In production, this is solved cleanly by Cloudflare/Nginx subdomain routing (`admin.ayaanclothing.com`), but locally it requires the auxiliary proxy script.
- **Possible Direction**: Consolidate local developers around host file aliases (`admin.localhost:3000`) or keep `admin-proxy.js` as the standard launcher.

### ISSUE 4: Faceted Search Canonical URL Parameter Normalization
- **Why It Matters**: Duplicate content risk if search engines crawl identical filter permutations (`?brand=A&category=B` vs `?category=B&brand=A`).
- **Affected Area**: `src/app/search/page.tsx`, `src/lib/seo/category.ts`.
- **Evidence**: Canonical tag defaults to base route without strict alphanumeric query parameter sorting.
- **Possible Direction**: Implement canonical parameter normalization helper in `src/lib/seo/config.ts`.

### ISSUE 5: Dual Category Association Mechanism (`category_id` vs `category_product`)
- **Why It Matters**: Ambiguity in data querying and mutations.
- **Affected Area**: `backend/database/migrations/`, `backend/app/Models/Product.php`.
- **Evidence**: The `products` table retains a legacy `category_id` column, while modern controller code queries the `category_product` many-to-many pivot table via `Product::categories()`.
- **Possible Direction**: Deprecate and drop `category_id` in a future migration to enforce exclusive use of `category_product`.

### ISSUE 6: Dual Document Template Maintenance (Client jsPDF vs Backend Blade)
- **Why It Matters**: Changes to commercial invoice formatting must be applied twice to ensure consistency between client print previews and archived server files.
- **Affected Area**: `src/app/admin/documents/[type]/[id]/page.tsx`, `backend/app/Services/Documents/CommercialInvoiceService.php`.
- **Evidence**: Storefront and admin dynamic preview pages use `jspdf` / `html2canvas` for immediate browser generation, while backend services render server-side HTML/PDF templates.
- **Possible Direction**: Unify on a single headless rendering service (e.g. Puppeteer/Browsershot on backend) serving both preview and download.

### ISSUE 7: Mock Token Sanitization in API Client
- **Why It Matters**: Legacy defensive check executes on every client request.
- **Affected Area**: `src/services/api-client.ts@sanitizeToken`.
- **Evidence**: Contains string prefix checks (`mock_token_`, `admin_token_usr_`) to prevent mock tokens from hitting Laravel Sanctum in fullstack mode.
- **Possible Direction**: Clean up `sanitizeToken()` once mock authentication is completely deprecated.
