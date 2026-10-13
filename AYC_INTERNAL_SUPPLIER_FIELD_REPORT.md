# AYAAN CLOTHING — Convert Supplier to Internal Text Field Report

**Date:** 2026-10-14  
**Author:** DeepMind Antigravity Pair Programmer  
**System:** AYAAN CLOTHING Admin & Core Catalog Services  
**Status:** Complete & Verified  

---

## 1. Executive Summary

In accordance with business requirements, the supplier field in the AYAAN CLOTHING Product Creation/Editing workflow (`/ayc/products/new` and `/ayc/products/[id]/edit`) and Admin Products listing (`/ayc/products`) has been converted from a searchable relational selector to an internal plain-text input.

Administrators can now type any supplier name directly without prior creation of a separate supplier record in a supplier directory. Supplier information is strictly internal business metadata: it is searchable by authorized administrators across the admin catalog, but is systematically shielded from all public storefront endpoints, customer-facing product models, PDP interfaces, cards, quick-views, JSON-LD schemas, and public API payloads.

---

## 2. Previous Supplier Data Model and UI

### Previous Data Model
- Relational foreign key `supplier_id` on the `products` table referencing `suppliers.id` with `nullOnDelete()`.
- A dedicated `suppliers` database table containing columns `code`, `name`, `contact_person`, `email`, `phone`, `notes`, `is_active`.
- `SupplierSelect.tsx` component that fetched records from `/api/v1/admin/suppliers`, requiring an administrator to search for an already registered supplier record or be blocked from entering a supplier name directly.

### Limitations of Previous Architecture
1. **Administrative Friction:** Administrators had to exit the product flow, navigate to a separate directory, create a formal supplier record with required codes, and only then return to select the supplier.
2. **Coupling:** Forced an unnecessary relational schema constraint when product managers simply wanted to track internal sourcing text on products.

---

## 3. The New Text-Based Storage Approach

### Database Layer
- Added `supplier_name` (nullable `VARCHAR(255)`) to the `products` table with a standard database index:
  ```php
  Schema::table('products', function (Blueprint $table) {
      $table->string('supplier_name', 255)->nullable()->after('supplier_id');
      $table->index('supplier_name');
  });
  ```
- Retained the `suppliers` table and the existing `supplier_id` foreign key column intact for complete backward compatibility. No tables, columns, or relations were dropped.

### Backend Product Model & Fillable
- Added `'supplier_name'` to `$fillable` in [`backend/app/Models/Product.php`](file:///Users/luhasan/Documents/ayaan/backend/app/Models/Product.php).
- Retained the legacy `supplier()` Eloquent relationship so existing records or integrations remain functional.

### Normalization and Validation
In `ProductController::store()` and `ProductController::update()`:
- Surrounding whitespace is automatically trimmed.
- Empty or blank strings are normalized to `null`.
- Accepts either `supplier_name`, camelCase `supplierName`, or string `supplier`.
- Length validation enforces `max:255`.
- If an existing product has a legacy `supplier_id` but no `supplier_name`, the migration and API layer safely fallback to the relational supplier's name.

---

## 4. Admin Search Implementation

In [`backend/app/Http/Controllers/Api/V1/ProductController.php`](file:///Users/luhasan/Documents/ayaan/backend/app/Http/Controllers/Api/V1/ProductController.php), the search query in `index()` incorporates supplier searching under administrator authorization:

```php
// Product ID and Supplier search are internal and authoritative for Admins
if ($isAdmin) {
    $q->orWhere('product_id', $likeOp, "%{$searchTerm}%")
      ->orWhere('supplier_name', $likeOp, "%{$searchTerm}%")
      ->orWhereHas('supplier', function ($sq) use ($searchTerm, $likeOp) {
          $sq->where('name', $likeOp, "%{$searchTerm}%");
      });
}

// Direct supplier / supplier_name filter for Admins
if ($isAdmin && ($request->filled('supplier_name') || $request->filled('supplier'))) {
    $supTerm = trim((string) ($request->input('supplier_name') ?? $request->input('supplier')));
    if ($supTerm !== '') {
        $query->where(function ($sq) use ($supTerm, $likeOp) {
            $sq->where('supplier_name', $likeOp, "%{$supTerm}%")
               ->orWhereHas('supplier', function ($rel) use ($supTerm, $likeOp) {
                   $rel->where('name', $likeOp, "%{$supTerm}%");
               });
        });
    }
}
```

### Search Capabilities
- **Case-Insensitive & Partial Matching:** Uses `$likeOp` (`ilike` on PostgreSQL, `like` on SQLite/MySQL) with `%{$searchTerm}%` wrapping.
- **Combined Search:** Searching "ABC Garments" finds matching products even if "ABC Garments" does not appear in product title, SKU, brand, or category.
- **Pagination & Filters:** Fully integrated into server-side pagination (default 5 records per page, with 10, 20, 50 options) and combined seamlessly with status, brand, category, and audience filters.
- **Client Listing Indicator:** In [`ProductTableRow.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/products/ProductTableRow.tsx), a compact badge `Sup: <name>` is rendered below the product title, giving instant visual confirmation to administrators when reviewing search results.

---

## 5. Security & Public Privacy Enforcement

Supplier data is strictly internal business metadata. The following safeguards are in place:

1. **ProductResource Shield:**
   In [`backend/app/Http/Resources/Api/V1/ProductResource.php`](file:///Users/luhasan/Documents/ayaan/backend/app/Http/Resources/Api/V1/ProductResource.php):
   ```php
   'supplier_id' => $this->when($isAdmin, $this->supplier_id ? (int) $this->supplier_id : null),
   'supplierId' => $this->when($isAdmin, $this->supplier_id ? (int) $this->supplier_id : null),
   'supplier_name' => $this->when($isAdmin, $this->supplier_name ?: ($this->supplier ? $this->supplier->name : null)),
   'supplierName' => $this->when($isAdmin, $this->supplier_name ?: ($this->supplier ? $this->supplier->name : null)),
   'supplier' => $this->when($isAdmin, ...),
   ```
   When `$isAdmin` is false (public storefront users, anonymous visitors, customer tokens), none of these keys exist in the serialized API JSON.

2. **Catalog Cache Shield:**
   Non-admin product caching in `CatalogCacheService::rememberProduct` resolves the public resource view, ensuring no supplier metadata ever enters the public cache.

3. **Public Search Shield:**
   The `supplier_name` search clause is wrapped inside `if ($isAdmin)`. Public storefront searches via `/api/v1/products?q=...` never match or expose products by internal supplier names.

4. **Storefront Frontend Models:**
   The customer storefront product type (`src/types/index.ts`) does not include supplier fields, and storefront components (PDP, product cards, category/brand listings, carts, quick-view modals, JSON-LD schemas) never access or render supplier names.

---

## 6. Frontend Admin UI Architecture

### Product Creation and Editing Forms
In [`src/components/admin/products/form/ProductBasicInfoSection.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/products/form/ProductBasicInfoSection.tsx):
- Replaced `<SupplierSelect>` dropdown with a standard HTML text input:
  ```tsx
  <div>
    <label
      htmlFor="product-supplier-input"
      className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5"
    >
      Supplier <span className="text-[10px] font-normal text-muted-foreground lowercase">(admin only / optional)</span>
    </label>
    <input
      id="product-supplier-input"
      type="text"
      value={supplierName ?? ""}
      onChange={(e) => onSupplierNameChange?.(e.target.value)}
      placeholder="Enter supplier name (optional)"
      className={inputClass(Boolean(errors.supplier_name || errors.supplierName))}
    />
  </div>
  ```
- Perfectly styled using admin design tokens (`border-input bg-card text-foreground text-xs rounded-lg px-3 py-2`).
- Responsive 2-column grid layout with the SKU input.

### State & Autosave Persistence
In [`src/components/admin/products/form/ProductForm.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/products/form/ProductForm.tsx):
- Manages `supplierName` string state.
- Initializes from existing product data on edit.
- Persists to local draft storage and backend payloads (`supplier_name` and `supplierName`).
- Rehydrates on save, refresh, or edit navigation.

---

## 7. Automated Test Suite & Results

### Automated Suite: `tests/internal-supplier-field.test.ts`
All 15 targeted tests executed with **0 failures**:

| # | Test Case | Result |
|---|---|:---:|
| 1 | Replaces SupplierSelect with standard text input labeled Supplier | ✅ PASS |
| 2 | ProductForm tracks and saves supplierName state directly | ✅ PASS |
| 3 | Admin Products search placeholder includes supplier | ✅ PASS |
| 4 | B2BProductInput and B2BProduct types include supplier_name and supplierName | ✅ PASS |
| 5 | product.service.ts normalizes and serializes supplier_name | ✅ PASS |
| 6 | No customer storefront product component displays supplier information | ✅ PASS |
| 7 | Authenticates as administrator via Laravel auth | ✅ PASS |
| 8 | Creates a draft product with a typed supplier name directly without a supplier record | ✅ PASS |
| 9 | Persists the supplier name when retrieving product as admin | ✅ PASS |
| 10 | Allows editing the supplier name | ✅ PASS |
| 11 | Allows clearing the supplier name to null | ✅ PASS |
| 12 | Searches products by supplier name with case-insensitivity and partial matching | ✅ PASS |
| 13 | Strictly hides supplier name from public storefront API | ✅ PASS |
| 14 | Prevents public storefront search from matching internal supplier names | ✅ PASS |
| 15 | Cleans up test product after test run | ✅ PASS |

### Regression Suites
- `tests/admin-rfq-workflow-simplification.test.ts`: 19/19 PASSED ✅
- `tests/storefront-product-count-removal-and-breadcrumbs.test.ts`: 10/10 PASSED ✅
- `tests/pos-discount-standardization.test.ts`: 17/17 PASSED ✅
- `npx tsc --noEmit`: 0 errors ✅
- `npm run lint`: 0 errors ✅
- `npm run build`: Compiled 56 routes successfully ✅

---

## 8. Real Browser Verification

A real browser session executed via browser automation subagent verified:
1. **`/ayc/products/new`:**
   - Navigated to the Admin Product creation form.
   - Located the `Supplier` text input (`id="product-supplier-input"`).
   - Confirmed the placeholder `"Enter supplier name (optional)"`.
   - Verified the complete absence of any `SELECT` button, modal picker, or dropdown toggle.
   - Successfully typed `"Apex Garments Ltd"` directly into the input.
2. **`/ayc/products`:**
   - Verified the search input placeholder includes supplier search indication.
   - Confirmed the admin table layout and search controls remain intact.
3. **`/search` (Storefront Catalog):**
   - Verified that customer-facing product cards display only brand, title, pricing, and MOQ.
   - Confirmed zero exposure of internal supplier information.

---

## 9. Remaining Limitations & Notes

- **Existing Legacy Supplier Records:** Any legacy supplier entries in the `suppliers` table remain accessible to admin APIs for historical reference and were not deleted.
- **Storefront Isolation:** The architectural guarantee that `supplier_name` is only evaluated when `$isAdmin` is true ensures that customer storefront search latency is unaffected by supplier matching queries.
