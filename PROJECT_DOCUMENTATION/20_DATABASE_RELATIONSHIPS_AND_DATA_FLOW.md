# 20 — Database Relationships & Data Flow

This document details the relational entity associations, pivot structures, cascade rules, and query optimization patterns in PostgreSQL.

---

## 1. Relational Cardinality & Cascade Rules

| Parent Entity | Child Entity | Cardinality | Foreign Key | Cascade Rule on Delete | Business Rationale |
|---|---|:---:|---|---|---|
| `users` | `orders` | `1:N` | `orders.user_id` | **RESTRICT** | Cannot delete buyer account with historical legal orders. |
| `users` | `addresses` | `1:N` | `addresses.user_id`| **CASCADE** | Deleting user deletes saved delivery addresses. |
| `users` | `quotations` | `1:N` | `quotations.user_id`| **RESTRICT** | Formal commercial contracts must be preserved. |
| `products` | `product_variants`| `1:N` | `product_variants.product_id`| **CASCADE** | Variants belong strictly to their parent style. |
| `products` | `product_images` | `1:N` | `product_images.product_id` | **CASCADE** | Images belong strictly to their parent garment. |
| `products` | `product_pricing_tiers`| `1:N` | `product_pricing_tiers.product_id`| **CASCADE** | Tiers are property of the parent product. |
| `products` | `order_items` | `1:N` | `order_items.product_id` | **RESTRICT** | Ordered products cannot be destructively deleted. |
| `products` | `inventories` | `1:N` | `inventories.product_id` | **RESTRICT** | Physical inventory records cannot be orphaned. |
| `brands` | `products` | `1:N` | `products.brand_id` | **SET NULL** | Deleting brand unlinks products without deleting garments. |
| `categories` | `products` | `1:N` | `products.category_id` | **RESTRICT** | Products must belong to an active category. |
| `orders` | `order_items` | `1:N` | `order_items.order_id` | **CASCADE** | Items cannot exist outside their parent order. |
| `orders` | `payments` | `1:N` | `payments.order_id` | **CASCADE** | Remittance slips belong strictly to their parent order. |
| `quotes` (RFQ) | `rfq_messages` | `1:N` | `rfq_messages.quote_id`| **CASCADE** | Deleting an RFQ cleanses its message thread. |
| `quotations` | `quotation_items` | `1:N` | `quotation_items.quotation_id`| **CASCADE**| Line items belong strictly to proforma quote. |

---

## 2. Pivot Tables & Merchandising Many-to-Many

To ensure maximum performance and zero hardcoding, many-to-many associations are maintained via dedicated indexed pivot tables:

1. **`homepage_featured_brands`**:
   - Maps `brands` to the landing page Shop By Brand section.
   - Enforces unique `brand_id`.
   - Stores custom integer `sort_order` and boolean `is_active`.
2. **`homepage_hot_sale_categories`**:
   - Maps `categories` to the storefront Hot Sale carousel.
   - Enforces unique `category_id`.
   - Stores custom integer `sort_order`.
3. **`homepage_featured_products`**:
   - Maps `products` to the landing page Featured Products grid.
   - Enforces unique `product_id`.
   - Stores custom integer `sort_order`.
4. **`category_product`**:
   - Standard apparel cross-categorization pivot for garments fitting multiple classifications (e.g., both "Sports" and "T-Shirts").

---

## 3. Potential Bottlenecks & Mitigation Strategies

| Risk / Bottleneck | Technical Impact | Built-In Mitigation in Ayaan Platform |
|---|---|---|
| **Inventory Checkout Concurrency** | Race condition overselling remaining units during flash sales | `lockForUpdate()` pessimistic row locking within `DB::transaction()`. |
| **Catalog Query N+1 Problems** | Excessive SQL queries fetching variants, tiers, and images for 24 products | Controller enforces eager loading: `Product::with(['brand', 'category', 'variants', 'pricingTiers', 'images'])`. |
| **Historical COGS Distortion** | Price changes in product cost distort past profit reports | `buying_price_at_sale` permanently captured in `order_items` during checkout. |
| **Heavy Document Generation** | PDF compilation blocking web server worker | Client-side generation using `jspdf` for immediate user preview; background queues for formal server archiving. |
