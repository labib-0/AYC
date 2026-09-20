# ADMIN PANEL REBUILD PLAN

> **Created:** 2026-09-20
> **Based on:** `docs/admin-panel-audit.md`
> **Methodology:** Clean slate admin frontend. Old UI retired. Backend/API infrastructure preserved. Features rebuilt one at a time.

---

## GROUND RULES

1. **DO NOT** touch storefront code (Header, Homepage, Product pages, Cart, Checkout, Search).
2. **DO NOT** delete backend API endpoints, Laravel logic, PostgreSQL data, or Redis infrastructure.
3. **DO NOT** break existing services (`src/services/`, `src/lib/services/`) used by storefront.
4. **Preserve** `mockStore`, `mock-data/`, and the dual-mode service pattern.
5. **One phase at a time.** Complete, verify, document before starting next.
6. **Each feature** must have: loading state, empty state, error state, and success feedback before moving on.
7. **After each phase:** update this document with completion status.

---

## CLEAN SLATE PROCEDURE (Before Rebuild Starts)

### What to REMOVE (admin frontend only)
- `src/app/admin/layout.tsx` → replace with new shell
- `src/app/admin/page.tsx` → replace with new dashboard
- `src/app/admin/products/page.tsx` → replace
- `src/app/admin/products/new/page.tsx` → replace
- `src/app/admin/products/[id]/edit/page.tsx` → replace
- `src/app/admin/brands/page.tsx` → replace
- `src/app/admin/categories/page.tsx` → replace
- `src/app/admin/inventory/page.tsx` → replace
- `src/app/admin/orders/page.tsx` → replace
- `src/app/admin/orders/[id]/page.tsx` → replace
- `src/app/admin/customers/page.tsx` → replace
- `src/app/admin/rfq/page.tsx` → replace
- `src/app/admin/rfq/[id]/page.tsx` → replace
- `src/app/admin/quotations/page.tsx` → replace
- `src/app/admin/promotions/page.tsx` → replace
- `src/app/admin/documents/[type]/[id]/page.tsx` → replace (or keep as-is initially — low priority to rebuild)
- `src/components/admin/ProductForm.tsx` → break apart into smaller components
- `src/components/admin/BrandModal.tsx` → keep (well-structured, reusable)

### What to PRESERVE
- All `src/services/admin/*.ts` service files
- All `src/services/*.service.ts` files
- All `src/lib/services/*.ts` files
- All `src/lib/mock-data/` files
- `src/services/api-client.ts`
- `src/config/banner.ts`
- `src/components/admin/BrandModal.tsx`
- All shared/common components (`BrandTile`, `BrandName`, etc.)
- All storefront components
- `.env.local`, `.insforge/`, `next.config.ts`

### Git Checkpoint
Before destructive changes, commit:
```
git add -A && git commit -m "chore: checkpoint existing admin panel before rebuild"
```

---

## PHASE 1 — ADMIN SHELL (Foundation)

**Goal:** A clean, protected admin layout with sidebar, header, and content area.

**Dependencies:** None (pure frontend structure)

**Required UI:**
- Top header: brand name + "Admin" badge, "View Storefront" link, logged-in user name/avatar
- Left sidebar: navigation items (collapsible on mobile)
- Content area: `{children}` with page title slot
- Route protection: redirect to `/login` if not authenticated as `admin`
- Responsive: mobile drawer, desktop fixed sidebar

**Required Backend/API:** None for shell (auth check uses mockStore in frontend-only mode)

**Implementation Steps:**
1. Create `src/app/admin/layout.tsx` — new clean shell
2. Add auth guard: check `mockStore.getActiveUser()`, redirect to `/login` if not admin role
3. Define new `NAV_ITEMS` array (same routes, improved grouping)
4. Build sidebar with clear section groupings
5. Build top header with user info
6. Add loading state for initial auth check

**Priority:** HIGHEST — everything else depends on this

**Completion Checklist:**
- [ ] Protected: unauthenticated users redirected
- [ ] Sidebar renders all nav items
- [ ] Active states correct
- [ ] Mobile drawer works
- [ ] "View Storefront" link present
- [ ] Storefront unchanged

---

## PHASE 2 — DASHBOARD (Status: Completed)

**Goal:** Operational overview — real counts from mockStore (or live API), not fake metrics.

**Dependencies:** Phase 1 (admin shell), `adminDashboardService`

**Implemented UI & Components (`src/components/admin/dashboard/`):**
- `DashboardHeader.tsx`: Clean title "Dashboard", operational subtitle, and active Refresh button with spinner.
- `DashboardMetricCard.tsx`: 6 compact, data-oriented KPI cards (TOTAL PRODUCTS, PUBLISHED PRODUCTS, TOTAL ORDERS, PENDING ORDERS, TOTAL CUSTOMERS, LOW STOCK) with tabular numbers and restrained accents.
- `DashboardQuickActions.tsx`: Compact quick action strip linking to real routes (`+ Add New Product`, `Review Orders`, `Manage Inventory`).
- `RecentOrdersTable.tsx`: Operational table with Order Number, Buyer / Company, Amount, Status badge, and Date. Includes clean empty state.
- `RecentRfqsTable.tsx`: Operational table with RFQ Number, Company, Status badge, and Date. Includes clean empty state.
- `src/app/admin/page.tsx`: Rebuilt main dashboard page with smooth skeleton loading and compact error state with RETRY.

**Data & Service Layer:** `adminDashboardService.getMetrics()` (dual-mode: mockStore fallback / live REST API).

**Completion Checklist:**
- [x] All metric cards accurate from mockStore
- [x] Recent orders table functional with real data
- [x] Recent RFQs table functional with real data
- [x] Loading skeleton displayed
- [x] Error state with retry button
- [x] Refresh button works smoothly without page reload
- [x] Responsive on desktop (6-column/balanced grid), tablet, and mobile with no horizontal overflow
- [x] Zero changes to storefront and backend contracts

---

## PHASE 3 — PRODUCT MANAGEMENT

**Goal:** Replace monolithic product pages with clean, structured implementation.

**Dependencies:** Phase 1, Phase 2, `productService`, `brandService`, `categoryService`

### Phase 3A — Product List Page (Status: Completed)

**Implemented UI & Components (`src/components/admin/products/`):**
- `ProductSummaryMetrics.tsx`: 4 compact KPI cards (Total Products, Published, Draft, Low Stock) calculated from actual data.
- `ProductSearchFilters.tsx`: Search input (name/SKU), Brand/Audience/Status dropdowns, expandable Category/Design Type filters, active filter count badge, Clear Filters action.
- `ProductTable.tsx`: Operational data table with select-all checkbox (indeterminate state), loading skeleton, error state with Retry, empty state with Clear Filters.
- `ProductTableRow.tsx`: Compact row with 3:4 thumbnail, promotion badges (New/Hot), low stock indicator, status badge, action dropdown (Edit, View Storefront, Toggle Publish, Duplicate, Delete).
- `ProductPagination.tsx`: Page numbers with ellipsis, prev/next buttons, "Showing X–Y of Z" display, 20 items per page.
- `ProductBulkActions.tsx`: Selection count, Bulk Publish/Unpublish buttons, Clear Selection.
- `DeleteProductModal.tsx`: Confirmation modal (no `window.confirm`), product name display, Cancel/Delete with loading state.
- `DuplicateProductModal.tsx`: Confirmation modal, product name, Cancel/Duplicate with loading state.
- `ProductToast.tsx`: Auto-dismissing success/error notifications (3s), smooth animations.
- `src/app/admin/products/page.tsx`: Clean orchestration page composing all components above.

**Data Flow:** `getProducts({ isAdmin: true })` → `ProductService` → `mockStore` (258+ products).

**Completion Checklist:**
- [x] Product list with search, filter, pagination (20/page)
- [x] Summary metrics use real product data
- [x] Search by name/SKU works
- [x] Brand filter works (dynamic brand list)
- [x] Audience filter works (MEN/WOMEN/BOYS/GIRLS/UNISEX)
- [x] Status filter works (Published/Draft) with empty state
- [x] Category and Design Type advanced filters work
- [x] Combined filters work (intersection)
- [x] Clear Filters resets all
- [x] Pagination resets on filter/search change
- [x] Toggle Publish/Unpublish with toast feedback
- [x] Duplicate with confirmation modal and toast
- [x] Delete with confirmation modal and toast
- [x] Bulk select with select-all and indeterminate state
- [x] Bulk Publish/Unpublish with count feedback
- [x] Loading skeleton state
- [x] Empty state with Clear Filters action
- [x] Error state with Retry
- [x] Desktop: compact data-dense table
- [x] Responsive: horizontal scroll within table container, no page-level overflow
- [x] Admin Authentication Guard protects the catalog management workspace
- [x] Separate Admin Website origin support (routes to `/products`, port 3001 and subdomain rewrites in `src/proxy.ts`)
- [x] Edit navigates to `/products/[id]/edit` / `/admin/products/[id]/edit` (route prepared)
- [x] View Storefront resolves directly to external customer storefront (`http://localhost:3000/products/[slug]`)
- [x] Add Product links to `/products/new` / `/admin/products/new` (route prepared)
- [x] Storefront unchanged, backend unchanged

### Phase 3B — Product Create/Edit (Status: Completed)

Replaced monolithic `ProductForm.tsx` (2127 lines) with modular, focused components under `src/components/admin/products/form/`:
- `ProductBasicInfoSection.tsx` — name, dynamic slug generation/preservation, brand selection with inline `BrandModal`, category, audience, design type (ORIGINAL/REPLICA), material, description
- `ProductImagesSection.tsx` — drag-and-drop / file upload via `uploadProductImage`, direct URL entry, 3:4 preview gallery, primary image selection, reorder, delete
- `ProductPricingSection.tsx` — USD wholesale price, MOQ, bulk quantity threshold & discount price, optional full stock/MSRP/cost prices, promotion flags (`isNew`, `isHot`, `isFeatured`)
- `ProductVariantsSection.tsx` — curated color swatches + custom hex addition, standard size badges + custom size addition, stock quantity allocation, matrix SKU preview
- `ProductShippingSection.tsx` — carton package profiles (`ShippingPackageProfile`), dimensions (L×W×H cm), gross weight (kg), automated CBM volume calculation via `calculateTotalCbm`
- `ProductSeoSection.tsx` — SEO title, meta description with character count indicator, live Google search snippet preview
- `ProductPublishSection.tsx` — Status selector (`published` vs `draft`), readiness checklist
- `ProductForm.tsx` — Orchestrator component managing form state, validation, draft saving, publishing, sticky action header, responsive 2-column desktop layout
- `index.ts` — Barrel exports for all modular components

**Pages & Routing:**
- `src/app/admin/products/new/page.tsx` — Create mode (`mode="create"`)
- `src/app/admin/products/[id]/edit/page.tsx` — Edit mode (`mode="edit"`), skeleton loading, product not found state
- Supports both standalone admin URLs (`/products/new`, `/products/[id]/edit`) and internal admin routes (`/admin/products/new`, `/admin/products/[id]/edit`) via `src/proxy.ts`

**Completion Checklist:**
- [x] Create product works (mockStore + dual-mode ProductService)
- [x] Edit product works (loads existing data, preserves slug, updates mockStore)
- [x] All form sections broken out into clean modular components
- [x] Monolithic 2127-line `ProductForm.tsx` eliminated
- [x] Image upload works with direct URL fallback
- [x] Zero TypeScript errors (`npx tsc --noEmit` clean)
- [x] Zero ESLint errors or warnings on new form components and pages
- [x] Storefront unchanged, backend unchanged

---

## PHASE 4 — BRAND MANAGEMENT (Status: Completed)

**Goal:** Clean brand management with modular components, dynamic product counts, logo uploads, delete safety, custom confirmation dialogs, and pagination.

**Dependencies:** Phase 1 (admin shell), `brandService`, `mockStore`, `storage.ts`

**Implemented UI & Components (`src/components/admin/brands/`):**
- `BrandToolbar.tsx`: Search input with instant filtering by name/slug, status toggle filter (`All`, `Active`, `Inactive`) with counts, and refresh button with spin state.
- `BrandLogoUploader.tsx`: Drag & drop zone + file picker with format validation (SVG, PNG, JPG, WebP) and size limits (5MB). Preserves native aspect ratio with `object-contain` without destructive cropping. Supports live preview, replace, and remove actions.
- `BrandForm.tsx`: Reusable form for create and edit. Supports brand name (required, trimmed, inline validation), slug (auto-generated from name with manual edit preservation), logo uploader, and collapsible advanced settings (website with URL validation, sort order numeric validation, active toggle).
- `BrandModal.tsx`: Accessible dialog shell (`role="dialog"`, ESC key, backdrop close, focus trap) wrapping `BrandForm` with clean state reset on close.
- `BrandRow.tsx`: Desktop table row with real brand logo (`object-contain`, centered, SVG/PNG support, fallback to neutral Tag icon — never fake initials), brand name with optional website link, slug, actual product count badge, active status badge, and compact accessible actions (Edit, Activate/Deactivate, Delete). Includes responsive mobile card layout with zero page-level overflow.
- `BrandTable.tsx`: Full table structure with column headers (Logo, Brand, Slug, Products, Status, Actions), loading skeletons, and empty state delegation.
- `BrandDeleteDialog.tsx`: Safe delete confirmation dialog (no native `confirm`). If associated products exist (`products_count > 0`), deletion is strictly BLOCKED with explanatory warning directing the administrator to reassign products first. If 0 products, provides confirmation with loading state.
- `BrandStatusDialog.tsx`: Custom dialog for activating or deactivating brands with clear consequence messaging.
- `BrandEmptyState.tsx`: Distinct visual presentations for empty catalog ("No brands yet" + "+ Add Brand") vs filter/search empty ("No brands match your current search or filter." + "Clear Filters").
- `BrandPagination.tsx`: 20 brands per page, "Showing X–Y of Z brands", page numbers with ellipsis, previous/next controls, and automatic page index correction on record deletion.
- `src/app/admin/brands/page.tsx`: Page orchestration connecting all components, error state with Retry, loading skeleton, and toast notifications.
- `src/components/admin/BrandModal.tsx`: Re-exports modular `BrandModal` preserving 100% backwards compatibility for `ProductBasicInfoSection.tsx`.

**Data & Service Layer:**
- `BrandService.getBrands()` dynamically calculates accurate `products_count` from `mockStore.getProducts()` in mock mode, while passing through API counts in live mode.
- Added `BrandService.getProductCount(brand)` helper for authoritative product association checks.
- Dual-mode support: fully functional in frontend MOCK MODE (mutating and persisting to `mockStore`) and LIVE API mode.

**Discovered Limitations & Architecture Decisions:**
- `BrandModel` exposes optional `products_count`. In mock mode, this is dynamically derived by inspecting `mockStore.getProducts()` by `brand_id`, `brand` name, or `slug`.
- Product deletion safety is enforced on the frontend by blocking deletion when associated products exist, avoiding orphan records or unwanted cascade deletions without backend contract changes.
- Logo upload uses `uploadBrandLogo`, saving persistent base64 Data URLs to `localStorage` in mock mode and posting to `/upload` in live API mode.

**Completion Checklist:**
- [x] Brand list loads from mockStore
- [x] Create brand via BrandModal (name, slug, logo, website, sort order, active status)
- [x] Edit brand via BrandModal (preloads existing data, preserves slug edits)
- [x] Toggle active works with custom BrandStatusDialog
- [x] Confirmation modal for delete (BrandDeleteDialog)
- [x] Product count dynamically derived from real product data
- [x] Delete safety blocks deletion when brand has associated products
- [x] Logo uploader with drag & drop, validation (SVG, PNG, JPG, WebP), preview, replace, and remove
- [x] Pagination implemented (20/page default) with ellipsis and auto-adjust
- [x] Loading, empty, and error states with Retry
- [x] Toast feedback notifications for all operations
- [x] Responsive layout (table on desktop/tablet, card list on mobile, no horizontal overflow)
- [x] Zero changes to customer storefront or backend infrastructure
- [x] Clean static TypeScript validation (`tsc --noEmit` clean)
- [x] Zero ESLint warnings on brand module (`eslint src/components/admin/brands src/app/admin/brands` clean)

---

## PHASE 5 — CATEGORY TAXONOMY (Status: Completed)

**Goal:** Clean category management with flat taxonomy, clear Audience vs Product Category separation, dynamic product counts, image uploads, delete safety, custom confirmation dialogs, and pagination.

**Dependencies:** Phase 1 (admin shell), `categoryService`, `mockStore`, `storage.ts`

**Implemented UI & Components (`src/components/admin/categories/`):**
- `AudienceReference.tsx`: Compact read-only informational card displaying the 5 fixed audiences (`MEN`, `WOMEN`, `BOYS`, `GIRLS`, `UNISEX`) with clear explanation that Audience is a fixed product attribute and not managed as a product category. Contains strictly zero CRUD buttons or forms.
- `CategoryToolbar.tsx`: Search input matching category name and slug, status filter (`All`, `Active`, `Inactive`) with counts, and refresh button with spin state.
- `CategoryImageUploader.tsx`: Drag & drop zone + file picker with format validation (SVG, PNG, JPG, WebP) and size limits (5MB). Preserves native aspect ratio with `object-cover` without destructive cropping. Supports live preview, replace, and remove actions.
- `CategoryForm.tsx`: Unified form for create and edit. Supports category name (required, trimmed, validation), slug (auto-generated from name with manual override preservation), image uploader, optional description, sort order (numeric validation), and active status toggle.
- `CategoryModal.tsx`: Accessible dialog shell (`role="dialog"`, ESC key, backdrop close, focus trap) wrapping `CategoryForm` with clean state reset on close.
- `CategoryRow.tsx`: Desktop table row with real category image (aspect ratio preserved, neutral Layers fallback — never fake initials), category name, description snippet, slug, actual product count badge, sort order, active status badge, and compact accessible actions (Edit, Activate/Deactivate, Delete). Includes responsive mobile card layout with zero page-level overflow.
- `CategoryTable.tsx`: Full table structure with column headers (Image, Category, Slug, Products, Sort Order, Status, Actions), loading skeletons, and empty state delegation.
- `CategoryDeleteDialog.tsx`: Safe delete confirmation dialog (no native `confirm`). If associated products exist (`products_count > 0`), deletion is strictly BLOCKED with an explanatory warning directing the administrator to reassign products first. If 0 products, provides confirmation with loading state.
- `CategoryStatusDialog.tsx`: Custom dialog for activating or deactivating categories with clear consequence messaging.
- `CategoryEmptyState.tsx`: Distinct visual presentations for empty catalog ("No product categories yet" + "+ Add Category") vs filter/search empty ("No categories match your current search or filter." + "Clear Filters").
- `CategoryPagination.tsx`: 20 categories per page, "Showing X–Y of Z categories", page numbers with ellipsis, previous/next controls, and automatic page index correction on record deletion.
- `src/app/admin/categories/page.tsx`: Page orchestration connecting all components, error state with Retry, loading skeleton, and toast feedback notifications.

**Data & Service Layer:**
- `CategoryService.getCategories()` dynamically calculates accurate `products_count` from `mockStore.getProducts()` by matching `categoryId` or `categoryName` in mock mode, while passing through API counts in live mode.
- Added `CategoryService.getProductCount(category)` helper for authoritative product association checks.
- Added `uploadCategoryImage(file)` to `src/lib/services/storage.ts` with base64 Data URL persistence in mock mode and `/upload` in live mode.
- Dual-mode support: fully functional in frontend MOCK MODE (mutating and persisting to `mockStore`) and LIVE API mode.

**Discovered Limitations & Architecture Decisions:**
- Flat taxonomy strictly maintained: no subcategories or hierarchy trees introduced, preserving the current database and API models.
- Audience (`MEN`, `WOMEN`, `BOYS`, `GIRLS`, `UNISEX`) is completely separated from Product Category.
- Deletion safety is enforced on the frontend by blocking deletion when associated products exist, avoiding orphan catalog references.

**Completion Checklist:**
- [x] Category list loads from mockStore
- [x] Audience clearly separated as read-only reference (no CRUD)
- [x] Create category via CategoryModal (name, slug, image, description, sort order, active status)
- [x] Edit category via CategoryModal (preloads existing data, preserves slug edits)
- [x] Toggle active works with custom CategoryStatusDialog
- [x] Confirmation modal for delete (CategoryDeleteDialog)
- [x] Product count dynamically derived from real product data
- [x] Delete safety blocks deletion when category has associated products
- [x] Image uploader with drag & drop, validation (SVG, PNG, JPG, WebP), preview, replace, and remove
- [x] Pagination implemented (20/page default) with ellipsis and auto-adjust
- [x] Loading, empty, and error states with Retry
- [x] Toast feedback notifications for all operations
- [x] Responsive layout (table on desktop/tablet, card list on mobile, no horizontal overflow)
- [x] Zero changes to customer storefront or backend infrastructure
- [x] Clean static TypeScript validation (`tsc --noEmit` clean)
- [x] Zero ESLint warnings on categories module (`eslint src/components/admin/categories src/app/admin/categories` clean)

---

## PHASE 6 — INVENTORY & STOCK MANAGEMENT (Status: Completed)

**Goal:** Clean, comprehensive Inventory & Stock Management module resolving threshold inconsistencies, supporting multi-warehouse allocation, dynamic KPI metrics, real stock adjustments (both delta and absolute modes), full audit logging, and warehouse directory management in both Mock Mode and Live API Mode.

**Dependencies:** Phase 1 (admin shell), `adminInventoryService`, `mockStore`, `apiClient`

**Implemented UI & Components (`src/components/admin/inventory/`):**
- `StockStatusBadge.tsx`: Visual badge for stock availability using unified thresholds: `IN STOCK` (≥ 200), `LOW STOCK` (< 200), and `OUT OF STOCK` (0). Contains accessible icons and text labels (never color alone).
- `WarehouseSelector.tsx`: Reusable warehouse picker displaying all active facilities with code indicators, plus "All Warehouses" default option.
- `InventoryHeader.tsx`: Compact header with page title ("Inventory & Stock"), description, primary action triggers (`[ Adjust Stock ]`, `[ Manage Warehouses ]`), and manual data refresh button.
- `InventoryKpis.tsx`: 4 dynamic KPI cards ("Total Items", "In Stock", "Low Stock", "Out of Stock") computed directly from current stock records and warehouse filters. Each KPI card functions as an interactive filter shortcut to instantly scope the table.
- `InventoryToolbar.tsx`: Search input ("Search by product or SKU..."), stock status filter pills ("All", "In Stock", "Low Stock", "Out of Stock"), warehouse selector, clear filters reset button, and real-time result count indicator.
- `InventoryRow.tsx`: Desktop and responsive table row displaying real product thumbnail (aspect ratio preserved), variant details (color, size, title), monospaced SKU badge, resolved Brand & Category, Warehouse facility with city code, current stock, reserved stock, available quantity, `StockStatusBadge`, and quick action triggers (`[ Adjust ]`, `[ History ]`, `[ View Product ]`).
- `InventoryTable.tsx`: Full table container with loading skeleton placeholders, desktop table layout, and specialized empty state presentations (empty catalog, no search results, no low stock, no out of stock).
- `StockAdjustmentModal.tsx`: Dual-mode adjustment modal supporting both global invocation (with product/variant picker) and row-preselected invocation. Offers "Add / Subtract Stock" (+/- delta) and "Set Absolute Qty" modes with live stock progression preview, negative stock validation, common reason chips, custom note field, and duplicate submission prevention.
- `InventoryHistoryModal.tsx`: Read-only chronological audit trail modal displaying adjustments with date/time, previous stock, delta indicator, resulting stock, reason, custom notes, and admin user attribution.
- `WarehouseManagementModal.tsx`: Complete warehouse directory management modal with active facility list, status indicators, "Add Warehouse" form, and "Edit Warehouse" mode. Explicitly communicates system non-deletion policy to protect historical audit references.
- `InventoryPagination.tsx`: 20 records per page, record range summary ("Showing X to Y of Z records"), page buttons, and previous/next controls.
- `src/app/admin/inventory/page.tsx`: Orchestrator page binding data fetching, filter synchronization, modal transitions, and application-level toast feedback via `ProductToast`.

**Data & Service Layer (`src/services/admin/inventory.service.ts` & `src/lib/mock-data/`):**
- **Unified Threshold Decision:** Centralized `LOW_STOCK_THRESHOLD = 200` as the single source of truth across service queries, mock filtering, table badges, and KPI metric cards, eliminating previous UI (< 100) vs Service (< 200) inconsistency.
- Added `getInventorySummary(warehouseId)` for server/mock authoritative KPI computation.
- Added `isLowStock()`, `isOutOfStock()`, `isInStock()`, and `getStockStatus()` helper methods.
- Added `updateWarehouse(id, data)` and `getInventoryItemHistory(inventoryId)` service methods.
- `mockStore` enriched with persistent warehouse updates, inventory adjustments with notes, and 24 diverse seed records across 3 operational export hubs (`Dhaka Central Export Hub`, `Chittagong Port Export Facility`, `Savar Production & Transit Hub`).
- Dual-mode support: fully functional in frontend MOCK MODE (mutating and persisting to `mockStore`) and LIVE API mode.

**Discovered Limitations & Architecture Decisions:**
- **Warehouse Deletion Restricted:** In alignment with inventory referential integrity principles (Prompt Rule 37), warehouse deletion is disabled because active inventory items reference warehouse foreign keys. Deletion would orphan stock or cause cascading data loss. Editing and creating warehouses are fully supported.
- **Brand & Category Resolution:** Brand and Category are resolved from product relationships when present, avoiding redundant duplication of taxonomy fields in the inventory schema.
- **Available vs Reserved Stock:** Calculation strictly preserves `available = Math.max(0, quantity - reserved_quantity)`, adhering to the established inventory model.

**Completion Checklist:**
- [x] Unified low-stock threshold `< 200` established across all components and services
- [x] Dynamic KPI summary cards (Total, In Stock, Low Stock, Out of Stock) with interactive filter shortcuts
- [x] Warehouse selector dropdown populated dynamically from actual warehouse records
- [x] Unified search + status filter + warehouse filter working cohesively
- [x] Inventory table with product image thumbnail, variant details, SKU, brand/category, warehouse, quantities, status badge, and actions
- [x] Stock adjustment modal supporting both global and row-preselected modes, delta (+/-) and set modes, validation, reason chips, notes, and live preview
- [x] Inventory adjustment history audit modal with chronological logs, delta indicators, and admin attribution
- [x] Warehouse management modal supporting directory listing, creation, and editing
- [x] Specialized empty states (no inventory, filter mismatch, no low stock, no out of stock)
- [x] Real pagination (20 items per page) with page reset on filter change
- [x] Loading skeletons and non-destructive refresh states
- [x] Application-level toast notifications (zero native `alert`/`confirm`)
- [x] Storefront preserved (zero customer-side changes)
- [x] Backend infrastructure preserved (zero destructive API changes)
- [x] Clean static TypeScript validation (`tsc --noEmit` clean, 0 errors)
- [x] Clean ESLint validation (`eslint` clean, 0 errors)
- [x] Headless verification script (`scripts/test-phase6-inventory.ts`) passing all 28 assertions
- [x] Zero live browser testing performed (strictly static/code-level validation)

---

## PHASE 7 — ORDERS & FULFILLMENT (Status: Completed)

**Goal:** Clean, comprehensive, and modular Orders & Fulfillment module. Deconstructed the legacy 1015-line monolith into focused, reusable components. Eliminated hardcoded freight providers (`Akij Sea Freight` / `Akij Logistics`), replaced all native browser dialogs with accessible modal dialogs, preserved historical snapshot data integrity, and supported multi-dimensional filtering and mutations in both Mock Mode and Live API Mode.

**Dependencies:** Phase 1 (admin shell), `adminOrderService`, `orderService`, `mockStore`, `apiClient`

### Implemented UI & Components (`src/components/admin/orders/`):
- `OrderStatusBadge.tsx`: Visual badge for order statuses (`pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`) with semantic icons and distinct accessible color tokens (never color alone).
- `PaymentStatusBadge.tsx`: Semantic badge for payment statuses (`paid`, `pending`, `failed`, `refunded`).
- `FulfillmentStatusBadge.tsx`: Semantic badge for fulfillment statuses (`unfulfilled`, `partial`, `processing`, `shipped`, `delivered`, `returned`).
- `OrderListHeader.tsx`: Header matching specification with title "Orders", description "Manage customer orders, payment status and fulfillment.", and manual data refresh button.
- `OrderKpis.tsx`: 5 dynamic KPI cards ("Total Orders", "Pending Action", "Processing", "Fulfilled / Shipped", "Paid Orders") with interactive filter shortcut toggles.
- `OrderToolbar.tsx`: Search input (matching order number, customer name, company name, and email), Order Status dropdown, Payment Status dropdown, Fulfillment Status dropdown, clear filters reset button, and real-time result count indicator.
- `OrderTableRow.tsx`: Desktop table row displaying order number & date, customer name & email, company name or fallback, line items count and total pieces, formatted USD total with currency badge, payment status badge, fulfillment status badge, order status badge, and quick action triggers (`[ View ]`, and quick review trigger if payment proof is pending).
- `OrderTable.tsx`: Full table container with loading skeleton placeholders, desktop table layout, mobile card layout, and specialized empty state presentations ("No orders yet" vs "No orders match your current filters").
- `OrderPagination.tsx`: 20 orders per page default, record range summary ("Showing X to Y of Z orders"), page buttons with ellipsis, previous/next controls, and page reset on filter change.
- `OrderDetailHeader.tsx`: Order #[order_number], placement date, status badges, dynamic "← Back to Orders" navigation, commercial export document action buttons (`Order Sheet`, `PI`, `Commercial Invoice`, `Packing List`), and refresh button.
- `OrderItemsTable.tsx`: Purchased line items list with product image thumbnail, product title, SKU, variant attributes (size, color, wholesale package breakdown matrix), historical unit price, and line total. Strictly preserves historical prices without recalculating from current catalog.
- `OrderFinancialSummary.tsx`: Breakdown of Goods Value (Subtotal), Shipping/Freight, Other Charges/Documentation, Taxes & Duties, Discount Applied, and Total Payable in USD.
- `CustomerInfoCard.tsx`: Contact name, company name, email link, phone number, and customer ID. Strictly preserves boundary (no customer management fields).
- `ShippingInfoCard.tsx`: Historical shipping snapshot address, consignee details, destination port, transport method, shipping service/Incoterm, third-party notify party, and special handling instructions.
- `PaymentInfoCard.tsx`: Payment method formatted label, total amount, currency, and offline payment receipt indicator. Excludes all sensitive secrets (no CVVs, full card numbers, or private tokens).
- `PaymentProofReview.tsx`: Receipt thumbnail preview lightbox with external zoom link, review guidance, and quick trigger buttons for `[ Approve Payment ]` and `[ Reject Payment ]`.
- `PaymentReviewModal.tsx`: Accessible custom dialog for approving or rejecting offline payment receipts, requiring reviewer audit note and confirming state transition.
- `CarrierFulfillmentCard.tsx`: Carrier-neutral logistics card displaying carrier name (`order.carrier` or snapshot), AWB / tracking number, live carrier status, packaging metrics (carton count, gross weight, net weight, CBM volume), Aramex tracking portal link, and official shipping label download link.
- `OceanFreightQuoteModal.tsx`: Carrier-neutral sea freight quote modal allowing administrators to quote freight amount (USD), booking reference, carrier/freight line, validity date, and booking notes.
- `FulfillmentUpdateModal.tsx`: Custom modal to update fulfillment status, carrier, tracking number, and dispatch note.
- `AramexShipmentDialog.tsx`: Custom accessible confirmation dialog for generating official Aramex export AWB and dispatch record (completely replacing native `confirm()`).
- `OrderStatusTransitionCard.tsx`: Structured status transition card enforcing allowed lifecycle transitions via `adminOrderService.getAllowedNextStatuses(order.status)`. Prevents arbitrary invalid status jumps.
- `OrderStatusHistory.tsx`: Chronological audit trail timeline displaying system events with event type, message, and timestamp.
- `index.ts`: Barrel export for all orders components.

### Page Architecture:
- `src/app/admin/orders/page.tsx`: Clean orchestrator page for Order List (reduced from 301 lines of mixed concerns to 204 lines of modular, declarative code).
- `src/app/admin/orders/[id]/page.tsx`: Rebuilt Order Detail page (deconstructed legacy 1015-line monolith to 327 lines of modular, clean components).

### Data & Service Layer (`src/services/admin/order.service.ts` & `src/lib/mock-data/`):
- Added `getOrderSummary()` computing KPI metrics (`totalOrders`, `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `paid`, `pendingPayment`).
- Added `getAllowedNextStatuses(status)` enforcing authoritative transition matrix:
  - `pending` → `confirmed`, `processing`, `cancelled`
  - `confirmed` → `processing`, `cancelled`
  - `processing` → `shipped`, `cancelled`
  - `shipped` → `delivered`
  - `delivered` → `refunded`
  - `cancelled`, `refunded` → terminal states (no further transitions)
- Updated `AdminOrderService.getOrders` to support search against `order_number`, `shipping_name`, `shipping_company`, `user.company_name`, and `email`.
- Enriched `mockStore` order dataset to 25 diverse B2B export and retail records spanning all statuses, payment proofs, and packaging snapshots (cartons, CBM, weights) to properly support 20-item pagination and multi-dimensional filters.
- Dual-mode support: fully functional in frontend MOCK MODE (mutating and persisting to `mockStore`) and LIVE API mode.

### Discovered Limitations & Architecture Decisions:
1. **Carrier Neutrality:** Legacy order detail contained hardcoded `"Akij Sea Freight"` and `"Akij Logistics"` business names across UI banners, modals, and default strings. These were completely removed. Carrier attribution is now dynamic: read from `order.carrier`, `order.shipping_snapshot?.carrier`, or administrator input in the quote modal.
2. **Zero Native Browser Dialogs:** Replaced native `window.confirm(...)` in shipment creation with `AramexShipmentDialog`. Replaced all confirmation prompts with accessible custom dialogs.
3. **Historical Pricing & Snapshot Integrity:** Order line items strictly preserve historical `unit_price` and `line_total` stored at checkout time. No prices are recomputed against the active product catalog or current promotions. Historical shipping addresses are preserved from snapshot data rather than dynamically substituted from the customer's current address book.
4. **Boundary Integrity:** Strictly avoided expanding Order Detail into Customer Management (Phase 9), Inventory Management (Phase 6), or Promotion Management (Phase 11).

**Completion Checklist:**
- [x] Order list with all filters (order status, payment status, fulfillment status)
- [x] Order search across order #, customer name, company name, email
- [x] Dynamic KPI metric cards with quick-filter shortcuts
- [x] 20 orders/page pagination with page reset on search/filter changes
- [x] Loading skeleton, distinct empty states, and error state with Retry
- [x] Order detail loads by ID with not-found state
- [x] Historical pricing and snapshot data integrity preserved
- [x] Allowed status transition rules enforced (no arbitrary jumps)
- [x] Fulfillment and tracking update form and modal
- [x] Carrier-neutral ocean freight quote modal (hardcoded "Akij" removed)
- [x] Offline payment proof review (approve/reject) with custom modal
- [x] Aramex shipment creation confirmation dialog (no native `confirm()`)
- [x] Order status audit event history timeline
- [x] Commercial document deep links (`Order Sheet`, `PI`, `Commercial Invoice`, `Packing List`)
- [x] Application-level toast notifications (zero native `alert`/`confirm`)
- [x] Storefront preserved (zero customer-side changes)
- [x] Backend infrastructure preserved (zero destructive API changes)
- [x] Clean static TypeScript validation (`tsc --noEmit` clean, 0 errors)
- [x] Clean ESLint validation (`npm run lint` clean, 0 errors)
- [x] Headless verification script (`scripts/test-phase7-orders.ts`) passing all 32 assertions
- [x] Zero live browser testing performed (strictly static/code-level validation)

---

## PHASE 8 — HOMEPAGE / BANNER MANAGEMENT

**Goal:** A dedicated, first-class admin page to manage the homepage banner.

**Dependencies:** Phase 1, `adminPromotionService`, storage upload service

**Required UI:**
- Page title: "Homepage & Banner Management"
- Current active banner preview (image + title + subtitle + target URL)
- Edit banner form: image upload (drag/drop), title, subtitle, target URL, active toggle
- Save button
- "Preview on Storefront" link

**Background:** `src/config/banner.ts` already reads `mockStore.getPromotions()` to override the banner. The new page just needs a clean UI for this specific promotion type (`hero_banner`/`top_banner`).

**Required Backend/API:** Reads/writes via `adminPromotionService` (type = `hero_banner`)

**Priority:** MEDIUM

**Completion Checklist:**
- [ ] Current banner displayed
- [ ] Image upload works
- [ ] Save updates storefront banner
- [ ] Preview link to storefront homepage
- [ ] Loading, empty, error states

---

## PHASE 9 — CUSTOMER MANAGEMENT (COMPLETED)

**Goal:** Clean customer list with a dedicated detail page (not an inline modal).

**Status:** ✅ COMPLETED (2026-09-20)

**Dependencies:** Phase 1, `adminCustomerService`, `mockStore`, `addressService`, `orderService`

**Implemented Architecture & Components:**
- **Customer List (`/customers` & `/admin/customers`):**
  - Search across name, email, company, phone.
  - Multi-field filters: Role (`all`, `customer`, `b2b_buyer`, `sales`) and B2B Status (`all`, `approved`, `pending`, `rejected`, `none`).
  - 4 Dynamic KPI metric cards: Total Customers, B2B Accounts, Approved B2B, Pending Review.
  - Customer table with initials avatar fallback, company, role, orders count, total spend (USD), B2B status, joined date, and `[ View ]` action.
  - Responsive mobile card stack with joined date and key commercial metrics.
  - Pagination (20 customers/page) with full reset on filter changes.
  - Distinct empty states (unfiltered "No customers yet" vs filtered "No customers match your current filters") and error retry state.
- **Dedicated Customer Detail Page (`/customers/[id]` & `/admin/customers/[id]`):**
  - Replaced legacy 417-line inline modal with a dedicated, modular route.
  - `CustomerDetailHeader`: Breadcrumb back navigation, customer name, role & B2B badges, quick refresh, and role change action.
  - `CustomerProfileCard`: Contact information, company, ID, joined date, and commercial stats badges.
  - `CustomerB2BCard`: In-place editing of B2B approval status, payment terms (`net_15`, `net_30`, `net_60`, `cia`, `cod`), tax ID, and credit limit in USD with numeric validation and explicit "Save Changes" (no autosave).
  - `CustomerRoleDialog`: Accessible custom modal dialog for role modifications with current/new role display (zero native `confirm()` or `alert()` calls).
  - `CustomerOrdersTable`: Historical orders table linking to Phase 7 `/orders/[id]` with real status badges and amounts.
  - `CustomerQuotesTable`: Quotation and RFQ history table.
  - `CustomerAddressesCard`: Read-only saved delivery addresses card with default markers and contact details.
  - 404 Customer Not Found state with "Back to Customers" safe return button.
- **Service & Persistence Layer:**
  - `AdminCustomerService` enriched with dynamic spend and order counts derived from `mockStore.getOrders()` and `mockStore.getRfqs()`.
  - Realistic mock users expanded to 26 accounts matching the 25 enriched mock orders.
  - B2B field mutations and role changes strictly persist to `mockStore.updateUser()`.
  - Customer creation intentionally omitted (not supported by backend service).
  - Storefront boundaries, customer address book, and checkout preserved intact.

**Completion Checklist:**
- [x] Customer list loads, searches, and filters (Role & B2B Status)
- [x] Dedicated customer detail page `/customers/[id]` (not inline modal)
- [x] B2B fields editable with explicit save and toast feedback
- [x] Role change dialog with custom confirmation (zero native dialogs)
- [x] Recent orders shown and linked to Phase 7 `/orders/[id]`
- [x] Saved addresses displayed in read-only mode
- [x] Dynamic spend and order count calculation without hardcoding
- [x] Mock persistence to `mockStore` for B2B fields & roles
- [x] Loading skeletons, filtered empty, and error retry states

---

## PHASE 10 — B2B RFQ & QUOTATION MANAGEMENT (COMPLETED)

**Goal:** Clean RFQ + Quotation workflows. Separate list from detail. Fix messaging persistence.

**Status:** ✅ COMPLETED (2026-09-20)

**Dependencies:** Phase 1, `mockStore`, `rfqService`, `quotationsService`, commercial document generator

### Phase 10A — RFQ List (`/rfq` & `/admin/rfq`)
- Page Header: Title "RFQ & Inquiries", supporting text "Review wholesale requests, buyer requirements and quotation activity.", and manual refresh action.
- 5 Dynamic KPI Cards: Data-derived metrics for Total Inquiries (25), Needs Review (14), Quoted / In Progress (6), Accepted (4), and Total Units Requested (11,350 pcs). Cards double as quick filter selectors.
- Comprehensive Search & Filter Toolbar:
  - Free-text multi-field search across RFQ number, buyer name, company name, destination country.
  - Status filter with actual supported enum values.
  - Dynamic destination country filter derived from active dataset.
  - Active filter count and one-click Reset button.
- Paginated RFQ Table (Desktop & Mobile):
  - Desktop: RFQ Ref, Buyer (initials avatar fallback), Company, Country (with globe icon), Items count, Total Units, Status Badge, Submission Date, and Action (`[ View ]` -> `/rfq/[id]`).
  - Mobile: Responsive card stack with full-width View button.
- Pagination: True 20 RFQs per page with boundary protection and auto-reset on filter/search change.
- Resilient UI States: Skeletons, distinct empty states (unfiltered vs filtered), error retry.

### Phase 10B — RFQ Detail (`/rfq/[id]` & `/admin/rfq/[id]`)
- Eliminated legacy 525-line monolith; modularized into reusable section cards in `src/components/admin/rfq/`:
  - `RfqHeader`: Breadcrumb back link, RFQ reference, creation date, status badge, action triggers (`Update Status`, `Generate Quotation` / `View Quotation`).
  - `RfqBuyerCard`: Buyer name, company, email, phone, business type, tax ID/VAT, website, and account deep link to Phase 9 (`/customers/[id]`).
  - `RfqShippingCard`: Destination country, city, shipping port, delivery date, buyer instructions.
  - `RfqItemsTable`: Product thumbnails, titles, SKUs, variants, quantities, target prices, buyer notes, subtotal calculation.
  - `RfqStatusDialog`: Custom accessible modal dialog for changing status with audit note (zero native `confirm()` or `alert()` calls).
  - `RfqMessageThread`: Chronological conversation thread between Buyer and Export Sales/Admin with sender badges, timestamps, and empty state.
  - `RfqMessageComposer`: Message input with character limit, trim validation, send button with loading spinner, and resilient error recovery.
  - `RfqQuotationBuilder`: Accessible modal for issuing official quotations pre-populated from RFQ. Allows entry of quoted unit prices, shipping fee, discount, payment terms, shipping terms, Incoterms (`FOB`, `CIF`, `EXW`, `DDP`, `CFR`), delivery estimate, validity, and notes. Generates quotation record and links to RFQ.
  - `RfqTimeline`: History audit trail of transitions and notes.
  - 404 RFQ Not Found screen.

### Phase 10C — Quotation List (`/quotations` & `/admin/quotations`)
- Page Header: Title "Quotations", supporting text "Review issued commercial quotations and quotation status.", and manual refresh action.
- Search across Quotation Ref, RFQ Ref, Buyer, Company, Destination.
- Status Filter (`All`, `Issued/Ready`, `Accepted`, `In Negotiation`, `Rejected`, `Expired`).
- Paginated Quotation Table (20/page): Quote Ref, RFQ Ref, Buyer & Company, Destination, Grand Total (USD), Status Badge, Valid Until, Action (`[ View ]` linking directly to `/documents/QUOTATION/[id]`).
- Clean mobile card stack view, skeletons, distinct empty states, error retry.

### Critical Known Issue Resolution: RFQ Message Persistence
- **Root Cause Identified**: Previously, `mockStore` lacked `addRfqMessage()` and `src/lib/services/rfq.ts` used a disconnected storage key.
- **Architectural Solution**: Added `addRfqMessage()` to `mockStore` that appends the message to the RFQ's `messages` array and persists the entire record to `STORAGE_KEYS.RFQS` in `localStorage`. Unified both `rfq.ts` and `rfq.service.ts` to delegate directly to `mockStore`. Messages now reliably survive browser reloads and re-fetches.
- **Quotation Persistence**: Added `STORAGE_KEYS.QUOTATIONS` to `mockStore` and unified quotation creation and retrieval.

**Completion Checklist:**
- [x] RFQ list with filters (Search, Status, Country) and dynamic KPIs
- [x] Dedicated RFQ detail page `/rfq/[id]` without monolithic code
- [x] Status update works with custom confirmation modal (zero native dialogs)
- [x] Critical RFQ message persistence in `mockStore` resolved and verified
- [x] Quotation generation pre-populated from RFQ works
- [x] Quotation list `/quotations` loads, filters, and paginates (20/page)
- [x] Direct linking to commercial document viewer `/documents/QUOTATION/[id]`
- [x] Loading skeletons, distinct empty states, and error retry states

---

## PHASE 11 — PROMOTIONS & COUPONS

**Goal:** Clean promotions management. Add image upload to promotions form.

**Dependencies:** Phase 1, Phase 8 (banner), `adminPromotionService`, storage upload service

**Required UI:**
- Dual-tab: Promotions | Coupons
- Promotions tab: list with type/status, create/edit modal with image UPLOAD (drag/drop, not text URL)
- Coupons tab: list with code/discount/usage, create/edit modal
- Delete with confirmation modal
- Loading, empty, error states

**Required Backend/API:** `GET/POST/PUT/DELETE /admin/promotions`, `/admin/coupons`

**Priority:** MEDIUM

**Completion Checklist:**
- [ ] Promotions list loads
- [ ] Create/edit with image upload
- [ ] Coupon list loads
- [ ] Create/edit coupon works
- [ ] Delete confirmation modal
- [ ] Loading, empty, error states

---

## PHASE 12 — ADMIN AUTHENTICATION GUARD

**Goal:** Fix the critical security gap — protect all `/admin/*` routes.

**Dependencies:** Phase 1 (shell must be in place)

**Implementation Options:**
1. **Next.js Middleware** (`src/middleware.ts`): Check auth cookie/header for `/admin` prefix, redirect to `/login` if absent
2. **Layout-level guard**: In `src/app/admin/layout.tsx`, check `mockStore.getActiveUser()` on client, redirect to `/login`

In frontend-only mode: use layout-level guard with role check (`user.role === 'admin'`).
When backend is connected: migrate to Next.js middleware with JWT cookie check.

**Technical:**
- Admin login: enter `admin@ayaan.com` / any password → role `admin` auto-assigned (mock)
- Redirect: unauthenticated → `/login?redirect=/admin`
- After login as admin role → redirect back to `/admin`

**Priority:** HIGH — should be done early in Phase 1, documented separately for clarity

**Completion Checklist:**
- [ ] Anonymous user redirected from `/admin`
- [ ] Non-admin role user redirected from `/admin`
- [ ] Admin user can access all admin pages
- [ ] Logout clears session and redirects

---

## PHASE 13 — COMMERCIAL DOCUMENT VIEWER (Cleanup)

**Goal:** Keep document viewer but refactor from 828-line monolith and add sidebar link.

**Dependencies:** Phase 1, Phase 10 (quotation system), `src/lib/pdf-generator.ts`

**Required:**
- Add "Documents" link to admin sidebar
- Break 828-line page into render sections
- Ensure print and PDF download work

**Priority:** LOW (functional already, mostly cleanup)

---

## PHASE 14 — SETTINGS (Future)

**Goal:** Admin settings page for business configuration.

**Possible sections:**
- Business profile (name, address, contact — reads `src/config/business-profile.ts`)
- Notification preferences
- API key display (read-only)
- Theme preference

**Priority:** LOW — post-MVP

---

## RECOMMENDED BUILD ORDER

```
Phase 1  — Admin Shell + Auth Guard        [FIRST — blocks all others]
Phase 12 — Authentication Guard            [Tie to Phase 1]
Phase 2  — Dashboard                       [Second — first page admin sees]
Phase 3A — Product List                    [High priority — core function]
Phase 3B — Product Create/Edit             [Follow product list]
Phase 4  — Brand Management               [After products — brands needed for products]
Phase 5  — Category Management            [After brands]
Phase 7A — Order List                      [High operational priority]
Phase 7B — Order Detail                    [Follow order list]
Phase 6  — Inventory                       [After orders]
Phase 8  — Homepage / Banner               [Mid priority]
Phase 9  — Customer Management            [Mid priority]
Phase 10 — RFQ & Quotation                [Mid priority]
Phase 11 — Promotions & Coupons           [After banner is sorted]
Phase 13 — Document Viewer Cleanup        [Low — functional already]
Phase 14 — Settings                        [Last — future]
```

---

## STATUS TRACKER

| Phase | Description | Status | Completed |
|---|---|---|---|
| 1 | Admin Shell | ✅ Completed | Phase 1 |
| 12 | Auth Guard | ✅ Completed | Phase 1 |
| 2 | Dashboard | ✅ Completed | Phase 2 |
| 3A | Product List | ✅ Completed | 2026-09-20 |
| 3B | Product Create/Edit | Pending | — |
| 4 | Brand Management | Pending | — |
| 5 | Category Management | ✅ Completed | 2026-09-20 |
| 7A | Order List | ✅ Completed | 2026-09-20 |
| 7B | Order Detail | ✅ Completed | 2026-09-20 |
| 6 | Inventory | ✅ Completed | 2026-09-20 |
| 8 | Homepage / Banner | Pending | — |
| 9 | Customer Management | ✅ Completed | 2026-09-20 |
| 10 | RFQ & Quotation | ✅ Completed | 2026-09-20 |
| 11 | Promotions & Coupons | Pending | — |
| 13 | Document Viewer | Pending | — |
| 14 | Settings | Future | — |

---

## WHAT IS PRESERVED AT BACKEND/API LEVEL

The following must NOT be deleted even though admin frontend is rebuilt:

- All `src/services/admin/*.ts` (dashboard, order, inventory, customer, promotion services)
- All `src/services/*.service.ts` (brand, category, product, auth, order, cart, rfq)
- `src/services/api-client.ts`
- All `src/lib/mock-data/` files
- All `src/lib/services/` files (used by storefront too)
- `src/config/banner.ts` (used by storefront homepage banner)
- `src/config/business-profile.ts`
- `src/components/admin/BrandModal.tsx` (reusable — keep)
- All storefront components (`src/components/layout`, `src/components/home`, etc.)
