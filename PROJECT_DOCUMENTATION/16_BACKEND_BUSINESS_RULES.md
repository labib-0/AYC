# 16 — Backend Business Rules & Invariants

This document details the business logic invariants, transactional rules, and data integrity safeguards enforced within the Laravel API.

---

## 1. Inventory Locking & Concurrency Control

To prevent overselling of high-demand garment lines during simultaneous wholesale checkouts, stock deductions adhere to strict database-level locking:

1. **Transaction Wrapping**: All checkout operations in `OrderController::store` and manual adjustments in `Admin\InventoryController::adjust` execute within an atomic `DB::transaction()` block.
2. **Pessimistic Row Locking**:
   ```php
   $inventory = Inventory::where('product_id', $productId)
       ->where('warehouse_id', $warehouseId)
       ->lockForUpdate()
       ->firstOrFail();
   ```
3. **Available vs. Reserved Stock**:
   - `available_quantity`: Physical stock ready for booking.
   - `reserved_quantity`: Stock locked in orders awaiting payment verification.
   - Upon order creation: `available_quantity -= $qty`, `reserved_quantity += $qty`.
   - Upon payment verification: `reserved_quantity -= $qty`, permanent inventory decrement confirmed.
   - Upon order cancellation: `reserved_quantity -= $qty`, `available_quantity += $qty` (stock released back to public catalog).

---

## 2. Immutable Cost of Goods Sold (COGS) Invariant

In wholesale export manufacturing, yarn and fabric procurement costs fluctuate. To ensure financial analytics remain historically accurate:
1. **Rule**: Every `order_items` record must capture `buying_price_at_sale` at the exact millisecond of checkout.
2. **Implementation**:
   ```php
   $orderItem->buying_price_at_sale = $product->cost_price ?? $product->wholesale_price * 0.70;
   ```
3. **Audit Guarantee**: If an administrator modifies a product's `cost_price` months later, historical gross profit reports for past quarters remain 100% immutable and accurate.

---

## 3. Dynamic Catalog & Merchandising Invariants

1. **Dual Persistence Synchronization**:
   - When an admin selects or reorders brands/categories for the landing page, the controller updates **both**:
     a) The dedicated homepage pivot table (`homepage_featured_brands`, `homepage_hot_sale_categories`).
     b) The entity model attributes (`brands.is_featured_on_landing`, `brands.landing_sort_order`).
   - Guarantees that public endpoints querying `/homepage` or `/brands/landing` return identical order sequences.
2. **Empty Array Safety**:
   - If an admin deselects all brands or categories, the controller accepts `present, array` and safely removes all landing flags without database constraint violations or `whereNotIn` query anomalies.

---

## 4. Deletion Safeguards & Referential Integrity

To protect historical commercial orders and tax invoices from silent data corruption:
1. **Restricted Product Deletion**:
   - A product that has been ordered (`order_items.product_id`) or quoted (`quotation_items.product_id`) cannot be destructively deleted.
   - Admin attempts to delete referenced products will shift the product to `archived` status rather than issuing `DELETE FROM products`.
2. **Cascade Deletion Boundaries**:
   - Deleting an unreferenced draft product cascades cleanly to `product_images`, `product_variants`, and `product_pricing_tiers`.
   - Brand or Category deletion sets `brand_id = null` on affected products, preventing orphaned database foreign keys.
