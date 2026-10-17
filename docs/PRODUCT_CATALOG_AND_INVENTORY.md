# Product Catalog & Inventory — AYAAN CLOTHING (AYC)

## 1. Product Lifecycle & Creation Workflow

Managing export garment stock lots and OEM production styles requires precision across physical specifications, volume pricing structures, and inventory tracking. Products are authored and maintained through the Admin Portal (`/ayc/products`).

```mermaid
flowchart LR
    Draft[Admin Drafts Product] --> Specs[Enter Authentic Specifications]
    Specs --> Pricing[Configure 3-Tier Volume Pricing]
    Pricing --> Carton[Define Carton Size-Curve Assortment]
    Carton --> Inventory[Assign Physical Warehouse Stock]
    Inventory --> Publish[Publish to Storefront]
```

---

## 2. Identifier Uniqueness & Duplicate Name Semantics

The data model enforces strict identifier rules designed specifically for apparel wholesale:

### A. Non-Unique Product Names
* **Business Rule**: Product display names (`products.name`) are **not** required to be unique.
* **Rationale**: An export manufacturer frequently produces repeat runs of popular styles (e.g., *"Classic Crewneck Sweatshirt"* or *"Heavyweight Cargo Pants"*) differentiated by color, fabric weight, or production season. Requiring unique names would force artificial suffixes on customer-facing titles.

### B. Strictly Unique Identifiers
To guarantee relational integrity, logistics tracking, and URL routing, three identifiers must be globally unique:
1. **Master SKU (`products.sku`)**: Unique alphanumeric code (e.g. `AYC-SWT-BLK-01`).
2. **Visible Product ID (`products.product_id`)**: Commercial trade reference displayed on Offer Sheets and invoices (e.g. `PRD-0089`).
3. **URL Slug (`products.slug`)**: Canonical URL path segment (e.g. `classic-crewneck-sweatshirt-black`).

### C. Slug Recycling for Soft-Deleted Products
When a product is deleted or archived, its URL slug is automatically released via database migration `2026_09_26_220000`:
* The deleted record's slug is transformed to `{slug}-deleted-{timestamp}`.
* This immediately frees the clean, human-readable slug for assignment to a new product without constraint violations.

---

## 3. Garment Specifications & Fabric Integrity

Product specifications are stored in PostgreSQL JSONB (`products.specifications`). To maintain brand trust with international buyers:

1. **Zero Specification Fabrication**: Only attributes explicitly verified by the merchandiser (Fabric Composition, GSM, Fit, Weave, Care Instructions) are saved.
2. **Elimination of Generic GSM Claims**: Garments without measured weight data omit the GSM field entirely. Universal boilerplate claims (e.g., *"Premium 200+ GSM"*) are strictly prohibited across all product descriptions and metadata generators.
3. **Country of Origin**: Standardized as `Bangladesh (Export Certified)` across all catalog items.

---

## 4. Supplier Privacy & Cost Confidentiality

To protect factory sourcing relationships and profit margins:
* **Internal Supplier Fields**: `products.supplier_id` and `products.supplier_name`.
* **Internal Cost Fields**: `products.buying_price` and historical snapshot `order_items.buying_price_at_sale`.
* **Strict Privacy Boundary**: The Laravel API layer filters out all supplier and cost fields from public resources. These attributes are never transmitted to customer-facing clients or exposed in public JSON responses. Only administrators with `catalog.manage` or `reports.view` permissions can view cost structures.

---

## 5. Pinned & Featured Catalog Ordering

The catalog implements a two-tier priority ordering model (`src/components/admin/AdminProductsTable.tsx` and `backend/app/Http/Controllers/ProductController.php`):

### A. Pinned Priority (`is_pinned`)
* Administrators can pin high-priority stock lots or clearance overruns to the top of the catalog using the **Pin** action button.
* Pinned items are assigned an explicit `pinned_at` timestamp.
* **Sorting Hierarchy**:
  1. `is_pinned = TRUE` ordered by `pinned_at DESC` (newest pinned items first).
  2. `is_pinned = FALSE` ordered by `sort_order ASC`, then `created_at DESC`.

### B. Featured Status (`is_featured`)
* Flags products for inclusion in the curated homepage **Featured Export Overruns** carousel.
* Operated independently of pinned status.

### C. Storefront Visibility Toggle (`is_hidden_from_storefront`)
* Allows administrators to draft products, prepare future collections, or restrict items to POS showroom sales without displaying them on the public website.

---

## 6. Authoritative Inventory Model & Stock Deductions

AYC operates on a **Single Authoritative Physical Stock Model**:

### A. No Reserved Stock Complexity
* Migration `2026_09_29_070000` dropped the legacy `reserved_quantity` column from the `inventories` table.
* **Immediate Stock Deduction**: When a buyer submits an order or a POS cashier tenders a sale, the exact carton unit quantity is deducted immediately from physical inventory (`inventories.quantity` and `products.stock`) inside a database transaction:
  ```php
  DB::transaction(function () use ($orderData) {
      // 1. Lock inventory row
      $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->first();
      
      // 2. Validate availability
      if ($inventory->quantity < $requiredQuantity) {
          throw new InsufficientStockException("Insufficient stock available.");
      }
      
      // 3. Deduct stock immediately
      $inventory->decrement('quantity', $requiredQuantity);
      $product->decrement('stock', $requiredQuantity);
  });
  ```

### B. Automatic Stock Restorations
If an order is cancelled or payment verification is permanently rejected, the system automatically restores the deducted quantity back to the active warehouse inventory, logging an audit record in `admin_inventory_adjustments`.

### C. Full-Page Stock Management & Auditing
The Stock Management interface (`/ayc/products/inventory`) provides:
* Warehouse-level physical count updates.
* Historical change logs capturing timestamp, previous quantity, new quantity, delta, and operating administrator ID.
* Low-stock warning indicators triggered when availability drops below carton MOQ thresholds.
