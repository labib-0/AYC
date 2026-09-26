# 19 — Comprehensive Database Schema Dictionary

This document details the authoritative PostgreSQL schema for all tables in the `ayaan_db` database, verified against all 49 migrations in `backend/database/migrations/`.

---

## 1. Core Users, Access & Audit

### `users`
- **Purpose**: Authoritative account store for B2B wholesale buyers and administrators.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `name`: `VARCHAR(255) NOT NULL` (Buyer or admin contact name)
  - `email`: `VARCHAR(255) UNIQUE NOT NULL`
  - `password`: `VARCHAR(255) NOT NULL` (Bcrypt hash with work factor 12)
  - `role`: `VARCHAR(20) DEFAULT 'customer' NOT NULL` (`CHECK role IN ('admin', 'customer')`)
  - `company_name`: `VARCHAR(255) NULL` (Importing business legal name)
  - `phone`: `VARCHAR(50) NULL`
  - `tax_id`: `VARCHAR(100) NULL` (VAT/EIN registration number)
  - `b2b_approval_status`: `VARCHAR(30) DEFAULT 'pending' NOT NULL` (`pending`, `approved`, `rejected`)
  - `b2b_payment_terms`: `VARCHAR(50) DEFAULT 'none' NOT NULL` (`none`, `net_30`, `net_60`, `terms`)
  - `b2b_credit_limit`: `NUMERIC(12,2) DEFAULT 0.00 NOT NULL`
  - `avatar_url`: `VARCHAR(500) NULL`
  - `is_demo`: `BOOLEAN DEFAULT false NOT NULL`
  - `email_verified_at`: `TIMESTAMP NULL`
  - `remember_token`: `VARCHAR(100) NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`
  - `deleted_at`: `TIMESTAMP NULL` (SoftDeletes)

### `personal_access_tokens`
- **Purpose**: Laravel Sanctum bearer tokens.
- **Columns**: `id` (`BIGSERIAL PK`), `tokenable_type` (`VARCHAR(255)`), `tokenable_id` (`BIGINT`), `name` (`VARCHAR(255)`), `token` (`VARCHAR(64) UNIQUE`), `abilities` (`TEXT NULL`), `last_used_at` (`TIMESTAMP NULL`), `expires_at` (`TIMESTAMP NULL`), `created_at`, `updated_at`.

### `addresses`
- **Purpose**: Saved company delivery addresses and port destinations.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `user_id`: `BIGINT REFERENCES users(id) ON DELETE CASCADE`
  - `type`: `VARCHAR(30) DEFAULT 'shipping'` (`shipping`, `billing`)
  - `name`: `VARCHAR(255) NOT NULL`
  - `phone`: `VARCHAR(50) NULL`
  - `address_line_1`: `VARCHAR(255) NOT NULL`
  - `address_line_2`: `VARCHAR(255) NULL`
  - `city`: `VARCHAR(100) NOT NULL`
  - `state`: `VARCHAR(100) NULL`
  - `postal_code`: `VARCHAR(30) NOT NULL`
  - `country_code`: `VARCHAR(10) DEFAULT 'US' NOT NULL`
  - `is_default`: `BOOLEAN DEFAULT false NOT NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `activities`
- **Purpose**: Immutable audit log of administrative mutations.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `user_id`: `BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`
  - `action`: `VARCHAR(100) NOT NULL INDEX`
  - `subject_type`: `VARCHAR(150) NULL INDEX`
  - `subject_id`: `VARCHAR(100) NULL INDEX`
  - `metadata`: `JSONB NULL`
  - `ip_address`: `VARCHAR(45) NULL`
  - `user_agent`: `TEXT NULL`
  - `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP INDEX`

### `notifications`
- **Purpose**: Database-backed notification records for system alerts.
- **Columns**:
  - `id`: `UUID PRIMARY KEY`
  - `type`: `VARCHAR(255) NOT NULL`
  - `notifiable_type`, `notifiable_id`: `MORPHS NOT NULL`
  - `data`: `TEXT NOT NULL`
  - `read_at`: `TIMESTAMP NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

---

## 2. Garment Catalog, Taxonomies & Specifications

### `brands`
- **Purpose**: Garment brand labels.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `name`: `VARCHAR(255) NOT NULL`
  - `slug`: `VARCHAR(255) UNIQUE NOT NULL`
  - `logo_url`: `VARCHAR(500) NULL`
  - `description`: `TEXT NULL`
  - `is_active`: `BOOLEAN DEFAULT true NOT NULL`
  - `is_featured_on_landing`: `BOOLEAN DEFAULT false NOT NULL INDEX`
  - `landing_sort_order`: `INTEGER DEFAULT 0 NOT NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `categories`
- **Purpose**: Apparel classification taxonomy.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `name`: `VARCHAR(255) NOT NULL`
  - `slug`: `VARCHAR(255) UNIQUE NOT NULL`
  - `image_url`: `VARCHAR(500) NULL`
  - `parent_id`: `BIGINT NULL REFERENCES categories(id) ON DELETE SET NULL`
  - `is_active`: `BOOLEAN DEFAULT true NOT NULL`
  - `is_featured_on_landing`: `BOOLEAN DEFAULT false NOT NULL INDEX`
  - `landing_sort_order`: `INTEGER DEFAULT 0 NOT NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `products`
- **Purpose**: Wholesale garment styles.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `brand_id`: `BIGINT NULL REFERENCES brands(id) ON DELETE SET NULL`
  - `name`: `VARCHAR(255) NOT NULL`
  - `slug`: `VARCHAR(255) UNIQUE NOT NULL`
  - `sku`: `VARCHAR(100) UNIQUE NOT NULL`
  - `short_description`: `VARCHAR(500) NULL`
  - `description`: `TEXT NULL`
  - `material`: `VARCHAR(255) NULL`
  - `color_name`: `VARCHAR(100) NULL`
  - `color_hex`: `VARCHAR(20) NULL`
  - `audience`: `VARCHAR(20) NOT NULL` (`CHECK audience IN ('MEN', 'WOMEN', 'BOYS', 'GIRLS', 'UNISEX')`)
  - `design_type`: `VARCHAR(20) NOT NULL` (`CHECK design_type IN ('ORIGINAL', 'MASTER COPY')`)
  - `product_type`: `VARCHAR(100) NULL`
  - `collection_season`: `VARCHAR(100) NULL`
  - `wholesale_price`: `NUMERIC(10,2) NOT NULL` (Base Tier 1 price)
  - `msrp_price`: `NUMERIC(10,2) NULL`
  - `cost_price`: `NUMERIC(10,2) NULL` (Factory buying/production cost)
  - `moq`: `INTEGER DEFAULT 10 NOT NULL`
  - `bulk_threshold`: `INTEGER NULL`
  - `bulk_price`: `NUMERIC(10,2) NULL`
  - `full_stock_price`: `NUMERIC(10,2) NULL`
  - `status`: `VARCHAR(20) DEFAULT 'draft' NOT NULL` (`CHECK status IN ('draft', 'published', 'archived')`)
  - `is_featured`: `BOOLEAN DEFAULT false NOT NULL`
  - `featured_sort_order`: `INTEGER DEFAULT 0 NOT NULL`
  - `featured_until`: `TIMESTAMP NULL INDEX`
  - `is_hot`: `BOOLEAN DEFAULT false NOT NULL`
  - `hot_until`: `TIMESTAMP NULL INDEX`
  - `is_new`: `BOOLEAN DEFAULT false NOT NULL`
  - `new_until`: `TIMESTAMP NULL INDEX`
  - `is_limited_deal`: `BOOLEAN DEFAULT false NOT NULL`
  - `is_best_deal`: `BOOLEAN DEFAULT false NOT NULL`
  - `video_url`: `VARCHAR(500) NULL`
  - `weight_grams`: `INTEGER NULL`
  - `is_demo`: `BOOLEAN DEFAULT false NOT NULL INDEX`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`
  - `deleted_at`: `TIMESTAMP NULL` (SoftDeletes)

### `category_product`
- **Purpose**: Many-to-many pivot associating products with categories.
- **Columns**: `product_id` (`BIGINT REFERENCES products(id) ON DELETE CASCADE`), `category_id` (`BIGINT REFERENCES categories(id) ON DELETE CASCADE`), `PRIMARY KEY (product_id, category_id)`.

### `product_variants`
- **Purpose**: Garment color/size variant combinations.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `product_id`: `BIGINT REFERENCES products(id) ON DELETE CASCADE`
  - `sku`: `VARCHAR(100) UNIQUE NOT NULL`
  - `color`: `VARCHAR(50) NOT NULL`
  - `size`: `VARCHAR(20) NOT NULL`
  - `price_modifier`: `NUMERIC(10,2) DEFAULT 0.00`
  - `is_active`: `BOOLEAN DEFAULT true NOT NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `product_images`
- **Purpose**: Product image showcase gallery.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `product_id`: `BIGINT REFERENCES products(id) ON DELETE CASCADE`
  - `image_url`: `VARCHAR(500) NOT NULL`
  - `sort_order`: `INTEGER DEFAULT 0 NOT NULL`
  - `is_primary`: `BOOLEAN DEFAULT false NOT NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `product_pricing_tiers`
- **Purpose**: Volume discount tier configurations.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `product_id`: `BIGINT REFERENCES products(id) ON DELETE CASCADE`
  - `min_quantity`: `INTEGER NOT NULL`
  - `max_quantity`: `INTEGER NULL` (NULL indicates open-ended highest tier)
  - `unit_price`: `NUMERIC(10,2) NOT NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `product_package_allocations`
- **Purpose**: Variant breakdown inside pre-packed wholesale master cartons.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `product_id`: `BIGINT REFERENCES products(id) ON DELETE CASCADE`
  - `package_name`: `VARCHAR(100) DEFAULT 'Pack A'`
  - `product_variant_id`: `BIGINT NULL REFERENCES product_variants(id) ON DELETE SET NULL`
  - `color`: `VARCHAR(50) NULL`
  - `size`: `VARCHAR(20) NULL`
  - `quantity`: `INTEGER NOT NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `product_shipping_package_profiles`
- **Purpose**: Physical export carton dimensions and weights for freight logistics.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `product_id`: `BIGINT REFERENCES products(id) ON DELETE CASCADE`
  - `package_quantity`: `INTEGER NOT NULL`
  - `quantity_max`: `INTEGER NULL`
  - `carton_count`: `INTEGER DEFAULT 1 NOT NULL`
  - `carton_length`: `NUMERIC(10,2) NOT NULL` (Length in cm)
  - `carton_width`: `NUMERIC(10,2) NOT NULL` (Width in cm)
  - `carton_height`: `NUMERIC(10,2) NOT NULL` (Height in cm)
  - `dimension_unit`: `VARCHAR(10) DEFAULT 'cm' NOT NULL`
  - `gross_weight`: `NUMERIC(10,2) NOT NULL`
  - `net_weight`: `NUMERIC(10,2) NULL`
  - `weight_unit`: `VARCHAR(10) DEFAULT 'kg' NOT NULL`
  - `notes`: `VARCHAR(255) NULL`
  - `is_active`: `BOOLEAN DEFAULT true NOT NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

---

## 3. Storefront Landing Page Merchandising Tables

### `homepage_banners`
- **Purpose**: Hero banners on storefront landing page.
- **Columns**: `id`, `image_path` (`VARCHAR(500)`), `image_url` (`VARCHAR(500)`), `headline` (`VARCHAR(255)`), `subtitle` (`VARCHAR(500)`), `cta_text` (`VARCHAR(100)`), `destination_type` (`VARCHAR(50)`), `destination_value` (`VARCHAR(255)`), `is_active` (`BOOLEAN DEFAULT true`), `sort_order` (`INTEGER DEFAULT 0`), `created_by` (`BIGINT`), `updated_by` (`BIGINT`), `timestamps`.

### `homepage_featured_brands`
- **Purpose**: Curated brands displayed in storefront "Shop By Brand" rail.
- **Columns**: `id`, `brand_id` (`BIGINT UNIQUE REFERENCES brands(id) ON DELETE CASCADE`), `sort_order` (`INTEGER DEFAULT 0`), `is_active` (`BOOLEAN DEFAULT true`), `timestamps`.

### `homepage_hot_sale_categories`
- **Purpose**: Curated categories displayed in storefront "Hot Sale" carousel.
- **Columns**: `id`, `category_id` (`BIGINT UNIQUE REFERENCES categories(id) ON DELETE CASCADE`), `sort_order` (`INTEGER DEFAULT 0`), `is_active` (`BOOLEAN DEFAULT true`), `timestamps`.

### `homepage_featured_products`
- **Purpose**: Curated products displayed in storefront "Featured Products" grid.
- **Columns**: `id`, `product_id` (`BIGINT UNIQUE REFERENCES products(id) ON DELETE CASCADE`), `sort_order` (`INTEGER DEFAULT 0`), `is_active` (`BOOLEAN DEFAULT true`), `timestamps`.

---

## 4. Multi-Warehouse Inventory & Adjustments

### `warehouses`
- **Purpose**: Physical factory and logistics facility locations.
- **Columns**: `id`, `name` (`VARCHAR(255)`), `code` (`VARCHAR(50) UNIQUE`), `address` (`TEXT`), `city` (`VARCHAR(100)`), `country` (`VARCHAR(100)`), `is_active` (`BOOLEAN DEFAULT true`), `timestamps`.

### `inventories`
- **Purpose**: Stock balance per product per warehouse.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `product_id`: `BIGINT REFERENCES products(id) ON DELETE RESTRICT`
  - `warehouse_id`: `BIGINT REFERENCES warehouses(id) ON DELETE RESTRICT`
  - `available_quantity`: `INTEGER DEFAULT 0 NOT NULL`
  - `reserved_quantity`: `INTEGER DEFAULT 0 NOT NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`
  - `UNIQUE (product_id, warehouse_id)`

### `admin_inventory_adjustments`
- **Purpose**: Audited record of physical stock alterations.
- **Columns**: `id`, `inventory_id` (`BIGINT`), `user_id` (`BIGINT`), `quantity_before` (`INTEGER`), `quantity_after` (`INTEGER`), `adjustment_delta` (`INTEGER`), `reason` (`VARCHAR(255)`), `timestamps`.

---

## 5. Cart, Wishlist, Promotions & Coupons

### `carts` & `cart_items`
- **`carts`**: `id`, `user_id` (`BIGINT NULL REFERENCES users(id) ON DELETE CASCADE`), `session_id` (`VARCHAR(100) NULL INDEX`), `status` (`VARCHAR(30) DEFAULT 'active'`), `timestamps`.
- **`cart_items`**: `id`, `cart_id` (`BIGINT REFERENCES carts(id) ON DELETE CASCADE`), `product_id` (`BIGINT REFERENCES products(id) ON DELETE CASCADE`), `product_variant_id` (`BIGINT NULL REFERENCES product_variants(id) ON DELETE NULL`), `size` (`VARCHAR(50) NULL`), `quantity` (`INTEGER DEFAULT 1`), `package_breakdown` (`JSONB NULL`), `timestamps`.

### `wishlists` & `wishlist_items`
- **`wishlists`**: `id`, `user_id` (`BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE`), `timestamps`.
- **`wishlist_items`**: `id`, `wishlist_id` (`BIGINT REFERENCES wishlists(id) ON DELETE CASCADE`), `product_id` (`BIGINT REFERENCES products(id) ON DELETE CASCADE`), `timestamps`, `UNIQUE (wishlist_id, product_id)`.

### `coupons`
- **Purpose**: Discount promotional coupon codes.
- **Columns**: `id`, `code` (`VARCHAR(50) UNIQUE`), `discount_type` (`percentage`, `fixed_amount`), `discount_value` (`NUMERIC(12,2)`), `min_spend` (`NUMERIC(12,2)`), `max_discount` (`NUMERIC(12,2)`), `usage_limit` (`INTEGER`), `usage_count` (`INTEGER DEFAULT 0`), `starts_at`, `expires_at`, `is_active`, `timestamps`.

### `promotions`
- **Purpose**: Marketing campaign banners.
- **Columns**: `id`, `title`, `subtitle`, `type` (`banner`, `limited-time`, `featured`, `clearance`), `image_url`, `discount_percentage`, `button_text`, `button_action`, `button_target`, `starts_at`, `ends_at`, `sort_order`, `is_active`, `timestamps`.

---

## 6. Orders, Line Items, Payments & Fulfillment

### `orders`
- **Purpose**: Master wholesale export orders.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `order_number`: `VARCHAR(50) UNIQUE NOT NULL` (`ORD-2026-XXXX`)
  - `user_id`: `BIGINT NULL REFERENCES users(id) ON DELETE NULL`
  - `status`: `VARCHAR(30) DEFAULT 'pending' NOT NULL INDEX`
  - `payment_status`: `VARCHAR(30) DEFAULT 'pending' NOT NULL INDEX`
  - `fulfillment_status`: `VARCHAR(30) DEFAULT 'unfulfilled' NOT NULL INDEX`
  - `currency`: `VARCHAR(10) DEFAULT 'USD' NOT NULL`
  - `subtotal`: `NUMERIC(12,2) DEFAULT 0.00 NOT NULL`
  - `shipping_cost`: `NUMERIC(12,2) DEFAULT 0.00 NOT NULL`
  - `tax_amount`: `NUMERIC(12,2) DEFAULT 0.00 NOT NULL`
  - `discount_amount`: `NUMERIC(12,2) DEFAULT 0.00 NOT NULL`
  - `other_charges`: `NUMERIC(12,2) DEFAULT 0.00 NOT NULL`
  - `total_amount`: `NUMERIC(12,2) DEFAULT 0.00 NOT NULL`
  - `email`: `VARCHAR(255) NOT NULL`
  - `shipping_name`: `VARCHAR(255) NOT NULL`
  - `shipping_phone`: `VARCHAR(50) NULL`
  - `shipping_address1`: `VARCHAR(255) NOT NULL`
  - `shipping_address2`: `VARCHAR(255) NULL`
  - `shipping_city`: `VARCHAR(100) NOT NULL`
  - `shipping_region`: `VARCHAR(100) NULL`
  - `shipping_postal_code`: `VARCHAR(30) NOT NULL`
  - `shipping_country_code`: `VARCHAR(10) DEFAULT 'US' NOT NULL`
  - `shipping_method`: `VARCHAR(100) NULL`
  - `carrier`: `VARCHAR(100) NULL`
  - `tracking_number`: `VARCHAR(100) NULL` (Aramex AWB)
  - `shipment_id`: `VARCHAR(100) NULL`
  - `shipment_reference`: `VARCHAR(100) NULL`
  - `shipment_label_url`: `VARCHAR(500) NULL`
  - `carrier_status`: `VARCHAR(100) NULL`
  - `last_carrier_update`: `TIMESTAMP NULL`
  - `last_shipment_error`: `TEXT NULL`
  - `shipping_quote_id`: `VARCHAR(100) NULL`
  - `shipping_snapshot`: `JSONB NULL`
  - `billing_address`: `JSONB NULL`
  - `payment_method`: `VARCHAR(50) DEFAULT 'card' NOT NULL` (wire_transfer, letter_of_credit)
  - `payment_proof_url`: `VARCHAR(500) NULL`
  - `payment_details`: `JSONB NULL`
  - `payment_confirmed_at`: `TIMESTAMP NULL`
  - `payment_confirmed_by`: `BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`
  - `notes`: `TEXT NULL`
  - `placed_at`: `TIMESTAMP NULL`
  - `is_demo`: `BOOLEAN DEFAULT false NOT NULL INDEX`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`
  - `deleted_at`: `TIMESTAMP NULL` (SoftDeletes)

### `order_items`
- **Purpose**: Line items inside an order with immutable historical cost capture.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `order_id`: `BIGINT REFERENCES orders(id) ON DELETE CASCADE`
  - `product_id`: `BIGINT NULL REFERENCES products(id) ON DELETE SET NULL`
  - `product_variant_id`: `BIGINT NULL REFERENCES product_variants(id) ON DELETE SET NULL`
  - `product_name`: `VARCHAR(255) NOT NULL`
  - `product_slug`: `VARCHAR(255) NULL`
  - `sku`: `VARCHAR(100) NULL`
  - `variant_title`: `VARCHAR(255) NULL`
  - `size`: `VARCHAR(50) NULL`
  - `color`: `VARCHAR(50) NULL`
  - `product_image_url`: `VARCHAR(500) NULL`
  - `unit_price`: `NUMERIC(12,2) NOT NULL`
  - `quantity`: `INTEGER DEFAULT 1 NOT NULL`
  - `line_total`: `NUMERIC(12,2) NOT NULL`
  - `buying_price_at_sale`: `NUMERIC(10,2) NOT NULL` (Immutable COGS capture)
  - `package_breakdown`: `JSONB NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `order_status_events`
- **Purpose**: Audit trail of order status transitions.
- **Columns**: `id`, `order_id` (`BIGINT REFERENCES orders(id) ON DELETE CASCADE`), `user_id` (`BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`), `event_type` (`VARCHAR(50)`), `message` (`TEXT NULL`), `timestamps`.

### `payments`
- **Purpose**: Payment transactions and deposit slip proof records.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `order_id`: `BIGINT REFERENCES orders(id) ON DELETE CASCADE`
  - `customer_id`: `BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`
  - `amount`: `NUMERIC(12,2) NOT NULL`
  - `status`: `VARCHAR(30) DEFAULT 'pending_review' NOT NULL`
  - `payment_method`: `VARCHAR(50) NULL`
  - `payer_name`: `VARCHAR(255) NULL`
  - `bank_name`: `VARCHAR(255) NULL`
  - `account_number`: `VARCHAR(100) NULL`
  - `payment_date`: `DATE NULL`
  - `receipt_path`: `VARCHAR(500) NULL`
  - `receipt_url`: `VARCHAR(500) NULL`
  - `receipt_original_name`: `VARCHAR(255) NULL`
  - `receipt_mime_type`: `VARCHAR(100) NULL`
  - `notes`: `TEXT NULL`
  - `admin_notes`: `TEXT NULL`
  - `submitted_at`: `TIMESTAMP NULL`
  - `confirmed_at`: `TIMESTAMP NULL`
  - `confirmed_by`: `BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

---

## 7. B2B RFQs & Commercial Proforma Quotations

### `quotes` (RFQs)
- **Purpose**: Buyer-initiated custom manufacturing inquiry.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `rfq_number`: `VARCHAR(50) UNIQUE NOT NULL` (`RFQ-AYN-2026-XXXXXX`)
  - `user_id`: `BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`
  - `buyer_name`: `VARCHAR(255) NOT NULL`
  - `buyer_email`: `VARCHAR(255) NOT NULL`
  - `buyer_phone`: `VARCHAR(50) NULL`
  - `company_name`: `VARCHAR(255) NOT NULL`
  - `business_type`: `VARCHAR(100) NULL`
  - `website`: `VARCHAR(255) NULL`
  - `tax_number`: `VARCHAR(100) NULL`
  - `destination_country`: `VARCHAR(100) DEFAULT 'United States'`
  - `destination_city`: `VARCHAR(100) NULL`
  - `shipping_port`: `VARCHAR(100) NULL`
  - `target_delivery_date`: `DATE NULL`
  - `request_title`: `VARCHAR(255) NULL`
  - `general_notes`: `TEXT NULL`
  - `status`: `VARCHAR(50) DEFAULT 'SUBMITTED' NOT NULL INDEX` (`SUBMITTED`, `UNDER_REVIEW`, `NEED_INFORMATION`, `QUOTATION_PREPARED`, `SENT_TO_BUYER`, `NEGOTIATION`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED_TO_ORDER`, `CANCELLED`)
  - `is_demo`: `BOOLEAN DEFAULT false NOT NULL INDEX`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `quote_items`
- **Purpose**: Garment line items inside an RFQ inquiry.
- **Columns**: `id`, `quote_id` (`BIGINT REFERENCES quotes(id) ON DELETE CASCADE`), `product_id` (`BIGINT NULL REFERENCES products(id) ON DELETE SET NULL`), `product_name` (`VARCHAR(255)`), `product_slug`, `brand`, `sku`, `image_url`, `selected_color`, `selected_size`, `quantity` (`INTEGER`), `moq` (`INTEGER`), `unit_price` (`NUMERIC(12,2) NULL`), `target_price` (`NUMERIC(12,2) NULL`), `buyer_notes`, `timestamps`.

### `rfq_messages`
- **Purpose**: Threaded negotiation messages inside an RFQ inquiry.
- **Columns**: `id`, `quote_id` (`BIGINT REFERENCES quotes(id) ON DELETE CASCADE`), `user_id` (`BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`), `sender_role` (`VARCHAR(50)`: `admin`, `customer`), `sender_name` (`VARCHAR(255)`), `message` (`TEXT`), `read_at` (`TIMESTAMP NULL`), `timestamps`.

### `quotations`
- **Purpose**: Formal proforma quotation generated by factory admin.
- **Columns**:
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `quotation_number`: `VARCHAR(50) UNIQUE NOT NULL`
  - `revision_number`: `INTEGER DEFAULT 1 NOT NULL`
  - `quote_id`: `BIGINT NULL REFERENCES quotes(id) ON DELETE SET NULL`
  - `user_id`: `BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`
  - `created_by`: `BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`
  - `buyer_name`: `VARCHAR(255) NOT NULL`
  - `buyer_email`: `VARCHAR(255) NOT NULL`
  - `buyer_phone`: `VARCHAR(50) NULL`
  - `company_name`: `VARCHAR(255) NOT NULL`
  - `destination_country`: `VARCHAR(100) DEFAULT 'United States'`
  - `destination_city`: `VARCHAR(100) NULL`
  - `destination_port`: `VARCHAR(100) NULL`
  - `currency`: `VARCHAR(10) DEFAULT 'USD'`
  - `currency_symbol`: `VARCHAR(10) DEFAULT '$'`
  - `subtotal`: `NUMERIC(12,2) DEFAULT 0.00`
  - `discount_total`: `NUMERIC(12,2) DEFAULT 0.00`
  - `shipping_fee`: `NUMERIC(12,2) DEFAULT 0.00`
  - `tax_amount`: `NUMERIC(12,2) DEFAULT 0.00`
  - `grand_total`: `NUMERIC(12,2) DEFAULT 0.00`
  - `payment_terms`: `VARCHAR(255) DEFAULT '30% T/T Advance, 70% against B/L'`
  - `shipping_terms`: `VARCHAR(255) DEFAULT 'FOB Chittagong'`
  - `incoterm`: `VARCHAR(20) DEFAULT 'FOB'`
  - `delivery_estimate`: `VARCHAR(100) NULL`
  - `valid_until`: `TIMESTAMP NULL`
  - `admin_notes`: `TEXT NULL`
  - `customer_notes`: `TEXT NULL`
  - `status`: `VARCHAR(50) DEFAULT 'READY' NOT NULL INDEX` (`DRAFT`, `READY`, `SENT`, `VIEWED`, `NEGOTIATION`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED_TO_ORDER`, `CANCELLED`)
  - `rejection_reason`: `TEXT NULL`
  - `proforma_invoice_id`: `VARCHAR(50) NULL`
  - `converted_order_id`: `BIGINT NULL REFERENCES orders(id) ON DELETE SET NULL`
  - `is_demo`: `BOOLEAN DEFAULT false NOT NULL INDEX`
  - `created_at`, `updated_at`: `TIMESTAMP NULL`

### `quotation_items`
- **Purpose**: Line items inside a formal commercial quotation.
- **Columns**: `id`, `quotation_id` (`BIGINT REFERENCES quotations(id) ON DELETE CASCADE`), `product_id` (`BIGINT NULL REFERENCES products(id) ON DELETE SET NULL`), `product_variant_id` (`BIGINT NULL REFERENCES product_variants(id) ON DELETE SET NULL`), `product_name`, `product_slug`, `sku`, `variant_title`, `selected_size`, `selected_color`, `product_image_url`, `quantity` (`INTEGER`), `unit_price` (`NUMERIC(12,2)`), `discount_amount` (`NUMERIC(12,2)`), `line_total` (`NUMERIC(12,2)`), `package_breakdown` (`JSONB NULL`), `notes` (`TEXT NULL`), `timestamps`.

---

## 8. System Preferences & Settings

### `system_settings`
- **Purpose**: Key-value platform configurations (shipping rates, wire details, notification toggles).
- **Columns**: `id`, `key` (`VARCHAR(255) UNIQUE INDEX`), `value` (`TEXT NULL`), `type` (`VARCHAR(50) DEFAULT 'string'`: `boolean`, `string`, `integer`, `json`), `group` (`VARCHAR(100) DEFAULT 'general' INDEX`), `timestamps`.
