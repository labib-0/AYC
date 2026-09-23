# AYAAN CLOTHING — Final Admin Functional Audit Matrix
**Examination Date:** September 23, 2026  
**Methodology:** Pure Code-Level Static & In-Memory AST / Execution Audit (No Live Browser Testing)  
**Target:** 100% of Admin Routes, Components, Forms, Buttons, Services, and State Stores

---

## 1. Functional Audit Matrix

| Area | Function | Status | Root Cause / Evidence | Test Reference |
|---|---|---|---|---|
| **Authentication** | Admin Login (Wrong Password) | **PASS** | Validates password hash/string in `auth.service.ts`; returns `{ success: false, message: "Invalid password" }`. | `Suite 1, Test 1` |
| **Authentication** | Admin Login (Non-existent Email) | **PASS** | `authService.loginAdmin()` checks account existence; rejects unknown emails safely. | `Suite 1, Test 2` |
| **Authentication** | Admin Login (Customer/Unauthorized Role) | **PASS** | Checks `user.role === "admin"`; rejects `"customer"` and `"b2b_buyer"` from accessing admin session. | `Suite 1, Test 3` |
| **Authentication** | Admin Login (Valid Credentials) | **PASS** | Creates session token, writes to `AYAAN_ADMIN_SESSION`, returns populated session user. | `Suite 1, Test 4` |
| **Authentication** | Admin Session Isolation & Logout | **PASS** | `logoutAdmin()` removes `AYAAN_ADMIN_SESSION` without touching storefront customer session key `ayaan_b2b_user`. | `Suite 1, Test 5` |
| **Authentication** | Admin Route Guard | **PASS** | `AdminAuthGuard.tsx` checks `authService.getAdminSession()`; redirects unauthorized attempts to `/admin/login`. | `Suite 16, Test 14` |
| **MockStore** | Seed Data Initialization | **PASS** | `mockStore.initialize()` correctly populates 12 foundational datasets if localStorage is empty. | `Suite 2, Test 1` |
| **MockStore** | LocalStorage Persistence & Serialization | **FAIL** | In-memory reference mutation causes fallback constant array mutation; deleted items are re-injected by self-healing logic. See Defect #1. | `Suite 2, Test 2` |
| **Products** | Create Product | **PASS** | `ProductForm` dispatches to `productService.createProduct()`; generates SKU, validates MOQ, stores in cache & localStorage. | `Suite 3, Test 1` |
| **Products** | Edit / Update Product | **PASS** | Form populates existing attributes, handles dirty state, updates `mockStore`, dispatches updated entity. | `Suite 3, Test 2` |
| **Products** | Duplicate Product | **PASS** | Clones all product attributes, appends `-copy` to slug, allocates new ID and SKU. | `Suite 3, Test 3` |
| **Products** | Delete Product | **FAIL** | `deleteProduct` removes item from memory, but self-healing routine detects `length < INITIAL_MOCK_PRODUCTS.length` and resurrects it on subsequent read. See Defect #1. | `Suite 3, Test 4` |
| **Products** | Search by Name, SKU, Category | **PASS** | Case-insensitive multi-field search implemented in `product.service.ts:getProducts()`. | Static / Service |
| **Products** | Filter by Category, Audience, Stock | **PASS** | Filters apply combinatorially without mutating underlying dataset. | Static / Service |
| **Products** | Packaging Specs (CBM/Weight/Cartons) | **PASS** | Accurately calculates carton count, gross weight, total CBM using carton capacity and dimensions. | `Suite 3, Test 5` |
| **Products** | Product Status Toggle (Active/Draft) | **PASS** | Updates `status` field directly; reflects in table row immediately upon state reload. | Static / Service |
| **Brands** | Create Brand | **PARTIAL** | `BrandInput` and `BrandModel` omit `description` field; UI form input for description is dropped on save. See Defect #3. | `Suite 4, Test 1` |
| **Brands** | Edit Brand | **PASS** | Updates name, slug, logo URL, website, and active status cleanly. | `Suite 4, Test 1` |
| **Brands** | Delete Brand | **PASS** | Deletes brand entry from `mockStore.brands`; removes cleanly without resurrecting (no self-healing on brands). | `Suite 4, Test 1` |
| **Brands** | Dynamic Product Count Calculation | **PASS** | `BrandService.getBrands()` dynamically counts matching products via `brand_id` and `brand` name. | `brand.service.ts:31` |
| **Categories** | Create Category | **PASS** | Validates name, generates slug, stores parent reference if subcategory. | `Suite 5, Test 1` |
| **Categories** | Edit Category | **PASS** | Updates category hierarchy and name without breaking children nodes. | `Suite 5, Test 1` |
| **Categories** | Delete Category | **PASS** | Deletes category; handles child re-parenting gracefully. | `Suite 5, Test 1` |
| **Categories** | Category Hierarchy & Search | **PASS** | Builds tree data structure correctly from flat store list. | `Suite 5, Test 1` |
| **Inventory** | Single Warehouse Enforcement (Uttara) | **PASS** | Exactly 1 warehouse exists (`Uttara`); multi-warehouse selectors completely removed. | `Suite 6, Test 1` |
| **Inventory** | Stock Level Display | **PASS** | Pulls stock directly from `product.stock` and warehouse inventory record. | `Suite 6, Test 1` |
| **Inventory** | Stock Adjustment & Audit Trail | **PASS** | Adjusts quantity in warehouse record and product model; logs adjustment timestamp and reason. | `Suite 6, Test 2` |
| **Inventory** | Low Stock Rule (Spec vs Code) | **FAIL** | Specification: `LOW STOCK = CURRENT STOCK < MOQ`. Code uses hardcoded `LOW_STOCK_THRESHOLD = 200` ignoring MOQ. See Defect #2. | `Suite 7, Test 1` |
| **Inventory** | Filter by Stock Status | **PASS** | Filters correctly by `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK` (subject to the threshold issue above). | Static / Service |
| **Orders** | Query Orders & Summary Metrics | **PASS** | Computes total revenue, pending counts, and processing stats accurately from live order store. | `Suite 8, Test 1` |
| **Orders** | Order Status Transition | **PASS** | Status transitions append timestamped events to `order.status_history`. | `Suite 8, Test 2` |
| **Orders** | Review Payment Proof | **PASS** | Admin approval toggles `payment_status` to `"paid"` and logs reviewer name. | `Suite 8, Test 3` |
| **Orders** | Fulfillment & Tracking Updates | **PASS** | Updates carrier (`Aramex`/custom), tracking number, and transitions fulfillment to `"shipped"`. | `Suite 8, Test 4` |
| **Orders** | Ocean Freight Shipping Quote | **PASS** | Admin can set custom quoted shipping charge; order grand total recalculates synchronously. | `Suite 8, Test 5` |
| **Customers** | Query Customers List & Detail | **PASS** | Pulls customer profile, links historical orders by customer ID, computes lifetime spend. | `Suite 9, Test 1` |
| **Customers** | B2B Account Approval | **PASS** | Toggles `is_approved_b2b` and persists update to user store. | `Suite 9, Test 2` |
| **Customers** | Modify Payment Terms | **PASS** | Sets custom credit/payment terms (e.g. Net-30, Advance T/T) on customer profile. | `Suite 9, Test 2` |
| **RFQ** | Submit RFQ | **PASS** | Generates canonical `RFQ-YYYYMMDD-XXXX` number, initial status `"SUBMITTED"`. | `Suite 10, Test 1` |
| **RFQ** | Canonical Timestamp Generation | **PASS** | Sets ISO `createdAt` and `submittedAt`; used for date/time ordering and filtering. | `Suite 10, Test 1` |
| **RFQ** | Status Updates & History Log | **PASS** | Updates RFQ status and appends log to `rfq.history` with admin name and notes. | `Suite 10, Test 2` |
| **RFQ** | Message Threading | **PASS** | Appends admin and buyer messages with sender role and ISO timestamp. | `Suite 10, Test 3` |
| **RFQ** | Date & Time Filtering | **PASS** | Admin RFQ filter operates on numeric timestamps parsed from `createdAt`. | `Suite 10, Test 1` |
| **Quotations** | Create Commercial Quotation | **PASS** | Links quotation to RFQ; automatically transitions RFQ to `"QUOTATION_PREPARED"`. | `Suite 11, Test 1` |
| **Quotations** | Quotation Revisioning | **PARTIAL** | Increments `revisionNumber` correctly, but helper skips in-memory cache update on SSR/Node. See Defect #4. | `Suite 11, Test 2` |
| **Quotations** | Quotation Pricing Calculations | **PASS** | Computes line totals, subtotal, discount, shipping, tax, and grand total. | `Suite 11, Test 1` |
| **Promotions** | Percentage Discount Calculation | **PASS** | 10% on $1000 order = $100 discount (when subtotal >= $500 MOQ). | `Suite 12, Test 1` |
| **Promotions** | Flat Discount Calculation | **PASS** | $50 on $1000 order = $50 discount (when subtotal >= $500 MOQ). | `Suite 12, Test 2` |
| **Promotions** | Minimum Spend Rejection | **PASS** | Returns error when order subtotal is below `minimumOrderAmount`. | `Suite 12, Test 3` |
| **Promotions** | Discount Cap at Subtotal | **PASS** | Flat coupon discount cannot exceed order subtotal (capped at subtotal). | `Suite 12, Test 4` |
| **Promotions** | Coupon Creation & Activation | **PASS** | Validates 2 types only (`percentage`, `flat`), requires `minimumOrderAmount`. | `Suite 12, Test 5` |
| **Promotions** | Delete Coupon | **FAIL** | Similar to products, deleted coupon is resurrected by `getCoupons()` self-healing logic. See Defect #1. | `Suite 12, Test 5` |
| **Documents** | Proforma Invoice Generation Data | **PASS** | Compiles complete PI dataset including buyer details, bank coordinates, and items. | `Suite 13, Test 1` |
| **Documents** | Order Sheet Generation Data | **PASS** | Generates Order Sheet with FOB incoterms and zero shipping fee. | `Suite 13, Test 2` |
| **Documents** | Proforma Invoice jsPDF Rendering | **PASS** | Generates binary PDF document without crashing or undefined values. | `Suite 13, Test 3` |
| **Documents** | Product Offer Sheet jsPDF | **PARTIAL** | `generateProductOfferSheetDoc` requires `price` property; `B2BProductInput` provides `wholesalePrice`. See Defect #5. | `Suite 13, Test 4` |
| **Homepage** | Banner Read & Update | **PASS** | `getTopBannerConfig()` retrieves active banner; admin updates persist to promo store. | `Suite 14, Test 1` |
| **Settings** | Business Profile & Preferences | **PASS** | Updates company name, export registration, bank info, and notification flags. | `Suite 15, Test 1` |

---

## 2. Forensic Defect Evidence & Analysis

### Defect #1: In-Memory Array Reference Mutation & Self-Healing Resurrection
- **Area:** Store / Persistence (`mock-store.ts`)
- **Severity:** **P1 (High)**
- **File:** `src/lib/mock-data/mock-store.ts`
- **Lines:** 37–51, 80–92, 142–158
- **Root Cause:**
  When `mockStore.getItem(key)` retrieves default data, it assigns exported fallback constants (`INITIAL_MOCK_PRODUCTS`, `INITIAL_MOCK_COUPONS`) directly to `this.inMemoryCache[key]` by reference instead of creating a deep or shallow clone:
  ```ts
  if (!item) {
    this.inMemoryCache[key] = fallback; // MUTATES SEED ARRAY IN PLACE
    return fallback;
  }
  ```
  Later, when `deleteProduct(id)` or `deleteCoupon(id)` is called, the item is removed from the filtered list. However, `getProducts()` contains self-healing logic:
  ```ts
  if (list.length < INITIAL_MOCK_PRODUCTS.length) {
    for (const p of INITIAL_MOCK_PRODUCTS) {
      if (!list.some(x => x.id === p.id)) {
        list.push(p); // RESURRECTS DELETED PRODUCT
      }
    }
  }
  ```
  Because `INITIAL_MOCK_PRODUCTS` was mutated when creating items, and because the self-healing routine considers any missing seed item as "lost", deleting an item causes it to be resurrected immediately on the next read!
- **Impact:** Administrators cannot permanently delete products or coupons; deleted items reappear after reload or subsequent query.
- **Recommended Fix:**
  1. Always clone initial fallback arrays when initializing cache: `JSON.parse(JSON.stringify(fallback))`.
  2. Maintain a separate `deletedIds` set in storage so self-healing never resurrects items explicitly deleted by the admin.

---

### Defect #2: Hardcoded Competing Low-Stock Threshold vs MOQ Rule
- **Area:** Inventory & Dashboard (`inventory.service.ts`, `dashboard.service.ts`)
- **Severity:** **P1 (High)**
- **Files & Lines:**
  - `src/services/admin/inventory.service.ts:16`: `export const LOW_STOCK_THRESHOLD = 200;`
  - `src/services/admin/inventory.service.ts:114–119`: `isLowStock(quantity: number)` checks `quantity <= LOW_STOCK_THRESHOLD` (fixed at 200).
  - `src/components/admin/inventory/StockStatusBadge.tsx:8`: Hardcoded `quantity < 200`.
  - `src/components/admin/inventory/InventoryKpis.tsx:42`: Counts low stock with `item.quantity <= 200`.
  - `src/components/admin/inventory/InventoryToolbar.tsx:28`: Hardcoded filter badge.
  - `src/components/admin/inventory/InventoryTable.tsx:128`: Hardcoded status logic.
  - `src/components/admin/products/ProductTableRow.tsx:75`: Hardcoded warning badge.
  - `src/services/admin/dashboard.service.ts:46`: Dashboard low stock counter uses `p.stock < 200`.
- **Root Cause:**
  The business specification mandates:
  $$\text{LOW STOCK} \iff \text{CURRENT STOCK} < \text{MINIMUM BULK AMOUNT (MOQ)}$$
  However, the codebase hardcodes `200` across 8 different files. For example, a product with Current Stock = 100 and MOQ = 100 is NOT low on stock per business rules, but the UI and services flag it as low stock because $100 < 200$.
- **Impact:** Misleading low-stock warnings across inventory table, product table, and dashboard metrics.
- **Recommended Fix:**
  Centralize low stock determination into a single canonical helper:
  ```ts
  export function isProductLowStock(currentStock: number, moq: number): boolean {
    return currentStock < (moq || 1);
  }
  ```
  Replace all 8 hardcoded `<= 200` occurrences with this helper.

---

### Defect #3: BrandModel Schema Discards Description Input
- **Area:** Brands (`brand.service.ts`, `BrandModal.tsx`)
- **Severity:** **P2 (Medium)**
- **File:** `src/services/brand.service.ts`
- **Lines:** 3–15, 54–68
- **Root Cause:**
  `BrandModal.tsx` renders a textarea for `description`. However, `interface BrandModel` and `interface BrandInput` do not declare a `description` field. When `brandService.createBrand()` or `updateBrand()` is called, the description property is stripped out or ignored by the typing layer and not stored in `mockStore.brands`.
- **Impact:** Brand descriptions typed by admin users are discarded and never displayed or persisted.
- **Recommended Fix:**
  Add `description?: string;` to `BrandModel` and `BrandInput` in `src/services/brand.service.ts`.

---

### Defect #4: Quotation Revision Bypasses In-Memory Cache on SSR/Node
- **Area:** Quotations (`quotations.ts`)
- **Severity:** **P2 (Medium)**
- **File:** `src/lib/services/quotations.ts`
- **Lines:** 215–230
- **Root Cause:**
  `createQuotationRevision()` modifies the quotation revision list and invokes `persistQuotations()`. Inside `persistQuotations()`, it guards persistence with `if (typeof window !== "undefined")`, but fails to update the module-level fallback cache when executed outside the browser window (e.g. server-side execution or background script).
- **Impact:** Quotation revisions created during server rendering or background processing do not update in-memory storage.
- **Recommended Fix:**
  Ensure `cachedQuotations = updatedList` is assigned unconditionally before the `window` check.

---

### Defect #5: OfferSheetProductInput vs B2BProductInput Field Name Divergence
- **Area:** Document Generation (`pdf-generator.ts`)
- **Severity:** **P3 (Low)**
- **File:** `src/lib/pdf-generator.ts`
- **Lines:** 150–165
- **Root Cause:**
  `generateProductOfferSheetDoc(product: OfferSheetProductInput)` expects `product.price: number`. However, the standard catalog product interface (`B2BProductInput` / `Product`) uses `wholesalePrice: number`. Passing a catalog product without manual property mapping results in `undefined` price in the PDF header.
- **Impact:** Potential runtime NaN or blank price in generated Offer Sheet if caller passes raw `Product` without adapter.
- **Recommended Fix:**
  Update `generateProductOfferSheetDoc` to read `product.price ?? product.wholesalePrice ?? 0`.
