# CURRENT ADMIN PANEL AUDIT

> **Audit Date:** 2026-09-20
> **Status:** PHASE 0 — READ-ONLY INSPECTION. No code was modified during this audit.

---

## 1. Existing Routes

| Route | File | Purpose | Status |
|---|---|---|---|
| `/admin` | `src/app/admin/page.tsx` | Executive dashboard — KPI cards, recent orders, recent RFQs | UI + Mock functional |
| `/admin/products` | `src/app/admin/products/page.tsx` | Product catalog list with search, filters, bulk actions | UI + Mock functional |
| `/admin/products/new` | `src/app/admin/products/new/page.tsx` | New product creation via ProductForm | UI + Mock functional |
| `/admin/products/[id]/edit` | `src/app/admin/products/[id]/edit/page.tsx` | Edit existing product via ProductForm | UI + Mock functional |
| `/admin/brands` | `src/app/admin/brands/page.tsx` | Brand list with create/edit/delete via BrandModal | UI + Mock functional |
| `/admin/categories` | `src/app/admin/categories/page.tsx` | Category taxonomy management with inline modal | UI + Mock functional |
| `/admin/inventory` | `src/app/admin/inventory/page.tsx` | Inventory list, warehouse selector, stock adjustments | UI + Mock functional |
| `/admin/orders` | `src/app/admin/orders/page.tsx` | Paginated order list with filters | UI + Mock functional |
| `/admin/orders/[id]` | `src/app/admin/orders/[id]/page.tsx` | Full order detail — status transitions, fulfillment, payment review | UI + Mock functional (1015 lines) |
| `/admin/customers` | `src/app/admin/customers/page.tsx` | Customer/company list with inline detail modal | UI + Mock functional |
| `/admin/rfq` | `src/app/admin/rfq/page.tsx` | B2B RFQ list with filters and status badges | UI + Mock functional |
| `/admin/rfq/[id]` | `src/app/admin/rfq/[id]/page.tsx` | RFQ detail — messaging, status, quotation builder | UI + Mock functional (525 lines) |
| `/admin/quotations` | `src/app/admin/quotations/page.tsx` | Issued quotation/PI list | UI + Mock functional |
| `/admin/promotions` | `src/app/admin/promotions/page.tsx` | Promotions (banners) + Coupons dual-tab | UI + Mock functional (714 lines) |
| `/admin/documents/[type]/[id]` | `src/app/admin/documents/[type]/[id]/page.tsx` | Commercial document viewer/printer | UI + Mock functional (828 lines) |

---

## 2. Existing Navigation

### Sidebar (Desktop) — `src/app/admin/layout.tsx`

- Dashboard → `/admin` (exact match active state)
- Products Catalog → `/admin/products`
- Category Taxonomy → `/admin/categories`
- Brands Directory → `/admin/brands`
- Inventory & Stock → `/admin/inventory`
- Orders & Fulfillment → `/admin/orders`
- Customer Accounts → `/admin/customers`
- B2B RFQs & Inquiries → `/admin/rfq`
- Commercial Quotes → `/admin/quotations`
- Promotions & Coupons → `/admin/promotions`

### Sidebar Quick Shortcuts
- + Add New Product → `/admin/products/new`
- Stock Adjustments → `/admin/inventory`
- Review Pending Orders → `/admin/orders`

### Header Actions
- "Storefront" link → `/` (back to consumer site)
- "Admin Mode Active" badge (green shield — purely decorative)
- Mobile hamburger menu (full-width drawer overlay)

### Missing from Navigation
- No link to `/admin/documents`
- No User Management / Settings / Reports section
- No dedicated Homepage / Banner Management entry

---

## 3. Existing Features

### Feature: Admin Layout / Shell
- **Status:** Partially implemented
- **Current UI:** Top sticky bar + left sidebar (desktop) + mobile drawer
- **Current Functionality:** Client-side navigation only. No auth check. No role verification.
- **API/Backend Dependency:** None
- **Important Files:** `src/app/admin/layout.tsx`
- **Critical Problem:** No authentication guard. Any visitor can access `/admin/*`. "Admin Mode Active" is cosmetic only.

---

### Feature: Admin Dashboard
- **Status:** UI-only / Mock
- **Current UI:** 8-card KPI grid (Revenue, Orders, Products, Customers, status counts), Recent Orders table, Recent RFQs table, Retry on error
- **Current Functionality:** Calls `adminDashboardService.getMetrics()`. In frontend-only mode derives all data from `mockStore`. In live mode tries `GET /admin/dashboard`, falls back to mock. Has loading skeleton and error retry.
- **API/Backend Dependency:** `GET /admin/dashboard` (expected endpoint)
- **Important Files:** `src/app/admin/page.tsx`, `src/services/admin/dashboard.service.ts`

---

### Feature: Product Management
- **Status:** Partially implemented — UI comprehensive, API integration dual-mode
- **Current UI:** Product table, search, brand/audience/status filters, bulk select/publish/unpublish
- **Actions:** Toggle publish/unpublish, duplicate, delete (browser confirm()), edit link
- **Current Functionality:** Mock-backed via `productService` + `mockStore`
- **API/Backend Dependency:** `GET/POST/PUT/DELETE /products`
- **Important Files:**
  - `src/app/admin/products/page.tsx` (444 lines)
  - `src/app/admin/products/new/page.tsx` (stub — mounts ProductForm)
  - `src/app/admin/products/[id]/edit/page.tsx` (stub — loads product, mounts ProductForm)
  - `src/components/admin/ProductForm.tsx` (2127 lines — massive monolith)

ProductForm covers: basic info, slug, brand (with inline create via BrandModal), category, audience, design type, description, image upload (drag/drop), pricing (wholesale/RRP/MOQ/compare-at), promotion flags, variants (color palette + size presets with stock per size), shipping packages (CBM), SEO fields, publish/draft toggle.

**Problems:**
- ProductForm is 2127 lines — unmaintainable monolith
- No product detail view page (`/admin/products/[id]` has no `page.tsx`, only `/edit`)
- Delete/duplicate use native browser `confirm()` — should be proper modals

---

### Feature: Brand Management
- **Status:** Partially implemented — functional in mock mode
- **Current UI:** Brand card grid with logo preview, search bar, status filter (ALL/ACTIVE/INACTIVE)
- **Actions:** Create, Edit (BrandModal), Toggle active status, Delete (browser confirm())
- **Current Functionality:** Mock-backed; live mode calls `/brands` CRUD endpoints
- **API/Backend Dependency:** `GET/POST/PUT/DELETE /brands`
- **Important Files:**
  - `src/app/admin/brands/page.tsx` (243 lines)
  - `src/components/admin/BrandModal.tsx` (437 lines)
  - `src/services/brand.service.ts`

BrandModal: name (required), logo PNG drag/drop upload, live preview via BrandTile, replace/remove logo, advanced fields collapsible (slug, website, sort_order, is_active).

**Problems:** No pagination, no product count per brand, delete uses native confirm()

---

### Feature: Product Category Management
- **Status:** Partially implemented
- **Current UI:** Category table with search, status filter, inline create/edit modal
- **Actions:** Create, Edit, Toggle active, Delete, image upload
- **Current Functionality:** Mock-backed; live mode calls `/categories` CRUD
- **API/Backend Dependency:** `GET/POST/PUT/DELETE /categories`
- **Important Files:**
  - `src/app/admin/categories/page.tsx` (565 lines)
  - `src/services/category.service.ts`

Category form: name, auto-slug, parent category select, description, image upload, hex accent color picker, is_active, sort_order.

**Problems:** Flat list only (no tree view), audience categories mixed in same table, image upload uses same storage function as products, delete gives no orphan warning.

---

### Feature: Audience Management
- **Status:** Not implemented as standalone admin feature
- **Current UI:** Audiences visible in Category page but not separately managed
- **Current Functionality:** Fixed taxonomy: MEN, WOMEN, BOYS, GIRLS, UNISEX defined in `src/lib/filters.ts` (AUDIENCE_CATEGORIES constant). No admin UI.
- **API/Backend Dependency:** None — static

---

### Feature: Inventory & Stock Management
- **Status:** Partially implemented
- **Current UI:** Paginated inventory table, warehouse dropdown filter, low-stock toggle, stock adjustment modal (set/delta mode), warehouse create modal
- **Actions:** Adjust stock (absolute or delta), view adjustment history, create new warehouse
- **Current Functionality:** Mock-backed; live mode calls `/admin/inventory` + `/admin/warehouses`
- **API/Backend Dependency:** `GET /admin/inventory`, `POST /admin/inventory/adjust`, `GET/POST /admin/warehouses`
- **Important Files:**
  - `src/app/admin/inventory/page.tsx` (590 lines)
  - `src/services/admin/inventory.service.ts`

**Problems:** Low-stock threshold inconsistency (UI shows "<100", service uses "<200"), no product link from inventory row, adjustment history may not persist in mock.

---

### Feature: Order Management
- **Status:** Partially implemented
- **Current UI (list):** Paginated table, search, status/payment_status/fulfillment_status filters
- **Current UI (detail):** Customer info, line items, pricing summary, status transition form, fulfillment/tracking update, payment proof review modal, sea freight quote modal
- **Current Functionality:** Mock-backed; live mode calls `/admin/orders` endpoints
- **API/Backend Dependency:** `GET /admin/orders`, `GET /admin/orders/{id}`, `PUT` for status/fulfillment
- **Important Files:**
  - `src/app/admin/orders/page.tsx` (301 lines)
  - `src/app/admin/orders/[id]/page.tsx` (1015 lines — very large)
  - `src/services/admin/order.service.ts` (305 lines)

**Problems:** 1015-line order detail page, "Akij Sea Freight" hardcoded business name, no print from list view.

---

### Feature: Customer / Company Management
- **Status:** Partially implemented
- **Current UI:** Paginated table, search, role filter, inline slide-out detail modal
- **Actions:** View detail, edit role, B2B approval status, payment terms, tax ID
- **Current Functionality:** Mock-backed; live mode calls `/admin/customers`
- **API/Backend Dependency:** `GET /admin/customers`, `GET /admin/customers/{id}`, `PUT` B2B fields
- **Important Files:**
  - `src/app/admin/customers/page.tsx` (417 lines)
  - `src/services/admin/customer.service.ts` (236 lines)

**Problems:** Detail is an in-page modal (no dedicated route), no ability to create customers, no address management.

---

### Feature: B2B RFQ Management
- **Status:** Partially implemented
- **Current UI (list):** Table with search, status/country filters, KPI stats (total, under review, quoted, accepted, total units)
- **Current UI (detail):** Buyer info, item line preview, messaging thread, status updates, quotation builder modal (with pricing fields)
- **Current Functionality:** Mock-backed via `getAllRfqs`, `getRfqById`, `addRfqMessage`, `updateRfqStatus`
- **API/Backend Dependency:** Mock + expected `/rfq` endpoints
- **Important Files:**
  - `src/app/admin/rfq/page.tsx` (263 lines)
  - `src/app/admin/rfq/[id]/page.tsx` (525 lines)
  - `src/lib/services/rfq.ts`

**Problems:** Messaging does not persist reliably across page reloads, no email notification trigger.

---

### Feature: Commercial Quotations
- **Status:** Partially implemented — list only
- **Current UI:** Quotation list with search and status filter
- **Current Functionality:** Mock-backed via `getAllQuotations`
- **API/Backend Dependency:** Mock
- **Important Files:**
  - `src/app/admin/quotations/page.tsx` (210 lines)
  - `src/lib/services/quotations.ts` (15KB)

**Problems:** No create from quotation list (must go via RFQ detail), no edit, PDF only via `/admin/documents/[type]/[id]`.

---

### Feature: Promotions & Coupons
- **Status:** Partially implemented
- **Current UI:** Dual-tab page. Promotions: create/edit/delete via inline modal. Coupons: separate tab with inline modal.
- **Promotion fields:** title, subtitle, type (hero_banner/top_banner/sale_event/etc.), image_url (text input only), discount %, button text/target, active, sort_order
- **Coupon fields:** code, type (percentage/fixed), value, min_spend, usage_limit, expires_at, active
- **Current Functionality:** Mock-backed; live mode calls `/admin/promotions` + `/admin/coupons`
- **API/Backend Dependency:** `GET/POST/PUT/DELETE /admin/promotions`, `/admin/coupons`
- **Connection to storefront:** `src/config/banner.ts` reads `mockStore.getPromotions()` — creating a promotion of type `hero_banner` with `image_url` WILL replace the homepage banner image. This is functional.
- **Important Files:**
  - `src/app/admin/promotions/page.tsx` (714 lines)
  - `src/services/admin/promotion.service.ts`
  - `src/config/banner.ts`

**Problems:** No image upload in promotions form (only text URL), no banner preview, coupon usage tracking is mock-only.

---

### Feature: Commercial Document Viewer
- **Status:** Partially implemented
- **Current UI:** Full-page renderer for Proforma Invoice, Quotation, Packing List, Bill of Lading
- **Current Functionality:** Mock-backed; generates printable HTML; PDF download via `downloadCommercialDocumentPDF`
- **API/Backend Dependency:** Mock store
- **Important Files:**
  - `src/app/admin/documents/[type]/[id]/page.tsx` (828 lines)
  - `src/lib/pdf-generator.ts`
  - `src/lib/services/quotations.ts`

**Problems:** Not linked from sidebar, accessible only via deep links from RFQ/Quotation detail, 828-line monolith.

---

### Feature: Homepage / Banner Management
- **Status:** Not a dedicated admin page — indirectly managed via Promotions
- **Current UI:** No dedicated page
- **Current Functionality:** A promotion of type `hero_banner`/`top_banner` with a non-null `image_url` will override the storefront homepage banner (`src/config/banner.ts`). Image must be entered as a URL string — no file upload.
- **Important Files:** `src/config/banner.ts`, `src/app/admin/promotions/page.tsx`

---

## 4. Authentication / Authorization

### Login
- **Status:** Implemented (mock-backed)
- `authService.login()` in `src/services/auth.service.ts`
- Mock mode: checks `mockStore.getUserByEmail()`, generates `mock_token_{role}_{id}`, auto-creates users in dev
- Emails containing "admin" → role `admin`, "buyer" → `b2b_buyer`, else `customer`

### Protected Admin Routes
- **Status:** NOT IMPLEMENTED — CRITICAL GAP
- There is no Next.js middleware, no layout-level auth check, no role guard on any `/admin/*` route
- Any anonymous visitor can access all admin pages
- "Admin Mode Active" badge is purely decorative

### Roles in Mock Data
- `admin`, `customer`, `b2b_buyer` defined in `src/lib/mock-data/mock-users.ts`
- No role-based UI suppression in admin panel

---

## 5. Reusable Admin Components

| Component | File | Size | Purpose |
|---|---|---|---|
| `ProductForm` | `src/components/admin/ProductForm.tsx` | 2127 lines | Full product create/edit form — monolith |
| `BrandModal` | `src/components/admin/BrandModal.tsx` | 437 lines | Brand create/edit modal with logo upload |

All other modals (categories, inventory, customers, orders payment review) are inlined inside their page files.

---

## 6. Admin Services (Backend/API Dependencies)

| Service | File | Endpoints | Mock Fallback |
|---|---|---|---|
| AdminDashboardService | `src/services/admin/dashboard.service.ts` | `GET /admin/dashboard` | Yes |
| AdminOrderService | `src/services/admin/order.service.ts` | `GET/PUT /admin/orders` | Yes |
| AdminInventoryService | `src/services/admin/inventory.service.ts` | `GET /admin/inventory`, `POST /admin/inventory/adjust`, `GET/POST /admin/warehouses` | Yes |
| AdminCustomerService | `src/services/admin/customer.service.ts` | `GET/PUT /admin/customers` | Yes |
| AdminPromotionService | `src/services/admin/promotion.service.ts` | `GET/POST/PUT/DELETE /admin/promotions`, `/admin/coupons` | Yes |
| BrandService | `src/services/brand.service.ts` | `GET/POST/PUT/DELETE /brands` | Yes |
| CategoryService | `src/services/category.service.ts` | `GET/POST/PUT/DELETE /categories` | Yes |
| ProductService | `src/services/product.service.ts` | `GET/POST/PUT/DELETE /products` | Yes |

All services use dual-mode: attempt live API call, fall back to `mockStore` on failure or when `NEXT_PUBLIC_FRONTEND_ONLY=true`.

---

## 7. Mock / Temporary Data

All mock data seeded in `src/lib/mock-data/` and persisted to localStorage:

| Data | Source File | Storage Key |
|---|---|---|
| Products | `mock-products.ts` + `src/data/products.json` | `ayaan_mock_products_v2` |
| Categories | `mock-categories.ts` | `ayaan_mock_categories_v3` |
| Brands | `mock-brands.ts` | `ayaan_mock_brands_v2` |
| Users | `mock-users.ts` | `ayaan_mock_users_v2` |
| Orders | `mock-orders.ts` | `ayaan_mock_orders_v2` |
| RFQs | `mock-rfqs.ts` | `ayaan_mock_rfqs_v2` |
| Inventory | `mock-inventory.ts` | `ayaan_mock_inventory_v2` + `_warehouses_v2` |
| Promotions | `mock-promotions.ts` | `ayaan_mock_promotions_v2` + `_coupons_v2` |

MockStore uses dual cache: in-memory first, then localStorage. All admin CRUD mutates this store.

---

## 8. Problems / Technical Debt

### Critical

1. **No admin route protection** — `/admin/*` is fully unguarded. No middleware, no auth check, no role gate.
2. **ProductForm is a 2127-line monolith** — unmaintainable, untestable single file.
3. **Native confirm() for destructive actions** — all delete and duplicate operations use `window.confirm()` instead of proper modals.
4. **All modals inlined in page files** — categories, inventory, customers, order payment review are not reusable components.
5. **No product detail page** — `/admin/products/[id]` has no `page.tsx`. Edit is the only route.

### Structural / Architecture

6. **Duplicate service layers** — brands/categories/products have services in both `src/services/` AND `src/lib/services/` (redundant re-export wrappers).
7. **Low-stock threshold inconsistency** — UI label says "< 100", service.ts uses `< 200`.
8. **Document viewer not in sidebar** — useful route but no nav entry.
9. **Banner management indirect** — no dedicated homepage control page, no image upload, only text URL input in Promotions.
10. **Oversized page files** — `orders/[id]` (1015 lines), `documents/[type]/[id]` (828 lines), `promotions` (714 lines), `inventory` (590 lines), `categories` (565 lines).
11. **No Settings page.**
12. **No User Management page** (no admin user CRUD).
13. **RFQ messaging unreliable** — mock messages may not survive page reload if store is reset.
14. **Hardcoded business name** — "Akij Sea Freight" is hardcoded in order detail, should be configurable.
15. **No image upload in Promotions form** — unlike BrandModal which has drag/drop, promotions only accept a text URL.
16. **No Reports / Analytics.**
17. **Coupon usage tracking is mock-only** — usage_count does not actually increment.

---

## 9. Summary Assessment

| Area | Functional Level |
|---|---|
| Admin Shell / Layout | Partial — no auth guard |
| Dashboard | Partial — mock metrics only |
| Product Management (List) | Partial — mock-backed |
| Product Create/Edit | Partial — functional but monolith |
| Brand Management | Partial — functional |
| Category Management | Partial — flat list only |
| Audience Management | Not implemented |
| Inventory Management | Partial — threshold inconsistency |
| Order List | Partial — mock-backed |
| Order Detail | Partial — most complete, still monolith |
| Customer Management | Partial — no create |
| RFQ Management | Partial — messaging unreliable |
| Quotation Management | Partial — list only |
| Promotions / Coupons | Partial — no image upload |
| Homepage / Banner | Not dedicated — indirect via Promotions |
| Authentication | NOT IMPLEMENTED (critical) |
| Settings | Not implemented |
| User Management | Not implemented |
| Reports / Analytics | Not implemented |
