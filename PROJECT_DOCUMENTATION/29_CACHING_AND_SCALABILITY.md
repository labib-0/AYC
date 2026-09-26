# 29 — Caching Architecture & Horizontal Scalability

This document outlines the multi-tier caching architecture, cache key strategies, invalidation triggers, and horizontal scaling capabilities.

---

## 1. Multi-Tier Caching Topology

```
┌────────────────────────────────────────────────────────┐
│ Layer 1: Edge & CDN Caching (Cloudflare)               │  Static assets, WebP images, JS bundles
├────────────────────────────────────────────────────────┤
│ Layer 2: Client-Side In-Memory Cache (Next.js)         │  React Contexts, SWR / deduplication
├────────────────────────────────────────────────────────┤
│ Layer 3: Application In-Memory Cache (Redis 7+)        │  Tagged Catalog payloads, Rate limiters, Sessions
├────────────────────────────────────────────────────────┤
│ Layer 4: Relational Query Caching (PostgreSQL)         │  Shared buffer pool, indexed query execution plans
└────────────────────────────────────────────────────────┘
```

---

## 2. Redis Tagged Cache Engine (`CatalogCacheService`)

All high-throughput public catalog read operations utilize tagged Redis caching:

| Cache Key Pattern | Tag Name | TTL (Seconds) | Invalidation Trigger |
|---|---|:---:|---|
| `ayaan_cache_homepage` | `homepage` | 3600 | Admin updates banner, brands, or categories in `/admin/homepage` |
| `ayaan_cache_landing_brands`| `brands` | 3600 | Brand creation, update, deletion, or sort order change |
| `ayaan_cache_landing_categories`| `categories` | 3600 | Category creation, update, deletion, or sort order change |
| `ayaan_cache_products_{page}_{filters}`| `products` | 1800 | Product CRUD, image update, pricing tier adjustment |

### Invalidation Logic (`CatalogCacheService.php`)
```php
public function forgetHomepage(): void
{
    Cache::tags(['homepage', 'brands', 'categories', 'catalog'])->flush();
}

public function forgetProduct(int $productId): void
{
    Cache::tags(['products', 'catalog'])->flush();
    Cache::forget("product_{$productId}");
}
```

---

## 3. Horizontal Scalability Roadmap

The platform was intentionally engineered to scale horizontally without state bottlenecks:
1. **Stateless Presentation Tier**:
   - The Next.js application maintains zero in-memory session state across requests.
   - Any number of Node.js container replicas can run behind a round-robin load balancer.
2. **Stateless API Tier**:
   - Laravel Sanctum authentication relies on the central `personal_access_tokens` table in PostgreSQL rather than sticky local PHP sessions.
   - Multiple PHP-FPM / Nginx nodes can serve traffic concurrently.
3. **Decoupled Asynchronous Processing**:
   - Time-intensive workloads (PDF compilation, Aramex label generation, transactional email dispatch) are pushed to the Redis queue (`jobs` table / Redis queues) and consumed by dedicated Supervisor worker pools.
4. **Database Scaling**:
   - PostgreSQL can be configured with streaming read replicas for heavy analytical queries (`SalesProfitAnalyticsService`) while directing writes to the primary node.
