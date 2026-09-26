# 22 — Performance Architecture & Optimization

## 1. Frontend Performance & Core Web Vitals

The frontend is optimized to achieve sub-second initial loads, smooth micro-interactions, and high Core Web Vitals scores across mobile and desktop.

### 1.1 Image Optimization & 4:5 Aspect Ratio
- **Engine**: Next.js Image Component (`next/image`).
- **Remote Whitelist (`next.config.ts`)**: Authorizes `images.unsplash.com`, `images.pexels.com`, `placehold.co`, and local origins.
- **Responsive Sizes**: Product cards define granular responsive sizes:
  `sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"`.
- **LCP Optimization**: The primary hero banner and top 4 catalog items utilize `priority={true}` to preload hero imagery before JavaScript hydration completes.
- **CLS Prevention**: Strict aspect ratio wrappers (`aspect-[4/5]`) ensure zero layout shift during image decoding.

### 1.2 Font Optimization
Google Fonts (**Inter** and **Manrope**) are loaded via Next.js `next/font/google`. Fonts are automatically self-hosted during the build, downloaded into `.next/static/media`, and injected using CSS variables (`--font-inter`, `--font-manrope`), eliminating third-party blocking network requests to Google servers at runtime.

### 1.3 Bundle Splitting & Dynamic Imports
- **Heavy Document Generation**: `jspdf` and `jspdf-autotable` (~350KB combined) are loaded only when a buyer or admin triggers a document export, preventing them from bloating the initial homepage bundle.
- **Recharts Library**: Used exclusively within `/admin/*` views, completely isolated from customer bundle downloads.

---

## 2. Backend Query Efficiency & Caching

### 2.1 Eager Loading & Elimination of N+1 Queries
In `ProductController::index` and `ProductController::show`, Eloquent queries enforce explicit eager loading:
```php
$products = Product::query()
    ->with([
        'brand:id,name,slug,logo_url',
        'category:id,name,slug',
        'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
        'pricingTiers' => fn($q) => $q->orderBy('min_quantity', 'asc'),
        'variants:id,product_id,color,size,sku',
    ])
    ->where('status', 'published')
    ->paginate(24);
```
*Reduces query count from $1 + 5N$ (up to 121 queries for 24 products) down to 5 optimized SQL queries regardless of catalog page size.*

### 2.2 Tagged Redis Catalog Caching (`CatalogCacheService`)
High-frequency public read endpoints leverage Redis caching tagged by domain:
- `homepage`: Cached for 3600 seconds; invalidated immediately when an admin saves merchandising adjustments.
- `brands_landing`: Cached in Redis; invalidated on brand updates.
- `categories_landing`: Cached in Redis; invalidated on category updates.

### 2.3 Database Index Utilization
PostgreSQL indexes guarantee $O(\log N)$ lookups:
- `idx_products_landing_published`: Index on `(status, is_featured, created_at DESC)` ensures zero full-table scans when building the landing page grid.
- `unq_inventory_product_warehouse`: Composite unique index for instant stock verification during checkout.

---

## 3. Performance Risk Analysis & Bottlenecks

| Area | Observed Risk | Impact | Implemented Mitigation |
|---|---|---|---|
| **Large Catalog Export** | Exporting 5,000 products to CSV / PDF | High CPU & memory usage | Implemented streaming response / chunked cursors (`Product::chunk(100)`). |
| **High Concurrency Checkout**| Multiple buyers checkout remaining 50 units | Race condition overselling | `lockForUpdate()` pessimistic row locking within PostgreSQL transactions. |
| **Sitemap Generation** | Fetching 1,000 products during Next.js build | Slow build times | Sitemap catches network timeouts and falls back gracefully to core roots. |
