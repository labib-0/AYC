# 18 — Database Architecture & PostgreSQL Configuration

## 1. Engine & Persistence Overview

Ayaan Clothing utilizes **PostgreSQL 14+** as its authoritative relational database engine.
- **Database Name**: `ayaan_db` (Production default: `ayaan_production`).
- **Connection Port**: `5432`.
- **Driver**: PHP `pdo_pgsql` configured via `DB_CONNECTION=pgsql` in `backend/config/database.php`.
- **Character Encoding**: `UTF8` with `LC_COLLATE = 'en_US.UTF-8'` to support international buyer company names, shipping addresses, and multilingual product descriptions.
- **Timezone**: All internal database timestamps are recorded in UTC (`TIMESTAMP WITH TIME ZONE` or UTC timestamp strings) to ensure international export orders align across global time zones.

---

## 2. Integrity & Constraint Design

The schema enforces strict relational boundaries at the database level rather than relying solely on application-level checks:
1. **Foreign Key Integrity**:
   - Every dependent entity (e.g., `order_items.order_id`, `inventories.warehouse_id`, `product_variants.product_id`) specifies explicit foreign key constraints with indexed foreign keys.
2. **Cascade Deletion Boundaries**:
   - `ON DELETE CASCADE`: Used strictly on dependent sub-attributes that have no independent lifecycle (e.g., deleting a draft product cascades to `product_images`, `product_variants`, `product_pricing_tiers`, and `product_package_allocations`).
   - `ON DELETE RESTRICT`: Enforced on transactional history. A product cannot be deleted if referenced in `order_items` or `quotation_items`.
   - `ON DELETE SET NULL`: Applied to non-critical metadata (e.g., deleting an admin user sets `activities.user_id` to NULL, preserving the immutable audit log).
3. **Database Check Constraints**:
   - `role IN ('admin', 'customer')` on `users.role`.
   - `audience IN ('MEN', 'WOMEN', 'BOYS', 'GIRLS', 'UNISEX')` on `products.audience`.
   - `design_type IN ('ORIGINAL', 'MASTER COPY')` on `products.design_type`.
   - `status IN ('draft', 'published', 'archived')` on `products.status`.
   - `quantity > 0` on order and cart line items.

---

## 3. Indexing Strategy & Query Optimization

Migration `2026_09_25_130000_add_performance_indexes.php` introduced specialized database indexes for high-throughput queries:
1. **Catalog Browsing Indexes**:
   - `CREATE INDEX idx_products_landing_published ON products(status, is_featured, created_at DESC);`
   - `CREATE INDEX idx_products_audience_design ON products(audience, design_type, status);`
   - `CREATE INDEX idx_brands_landing ON brands(is_featured_on_landing, landing_sort_order);`
   - `CREATE INDEX idx_categories_landing ON categories(is_featured_on_landing, landing_sort_order);`
2. **Order & Financial Lookup Indexes**:
   - `CREATE INDEX idx_orders_user_status ON orders(user_id, status, created_at DESC);`
   - `CREATE INDEX idx_order_items_product_order ON order_items(order_id, product_id);`
   - `CREATE INDEX idx_order_items_cogs ON order_items(order_id, buying_price_at_sale);`
3. **Inventory Concurrency Indexes**:
   - `CREATE UNIQUE INDEX unq_inventory_product_warehouse ON inventories(product_id, warehouse_id);`
