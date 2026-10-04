<?php

namespace App\Services\Cache;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\Cache;

class CatalogCacheService
{
    public const TTL_CATEGORIES = 3600; // 1 hour
    public const TTL_BRANDS = 3600;     // 1 hour
    public const TTL_FEATURED = 1800;   // 30 mins
    public const TTL_HOT_SALES = 1800;  // 30 mins
    public const TTL_PRODUCT = 1800;    // 30 mins

    public static function categoriesKey(): string
    {
        return 'catalog:categories:tree';
    }

    public static function brandsKey(): string
    {
        return 'catalog:brands:all';
    }

    public static function featuredVersionKey(): string
    {
        return 'catalog:products:featured:version';
    }

    public static function getFeaturedVersion(): int
    {
        return (int) Cache::get(self::featuredVersionKey(), 1);
    }

    public static function bumpFeaturedVersion(): void
    {
        if (!Cache::has(self::featuredVersionKey())) {
            Cache::forever(self::featuredVersionKey(), 2);
        } else {
            Cache::increment(self::featuredVersionKey());
        }
    }

    public static function featuredKey(): string
    {
        $v = self::getFeaturedVersion();
        return "catalog:products:featured:v{$v}";
    }

    public static function featuredPageKey(int $offset, int $limit, string $tab = 'all', array $filters = []): string
    {
        $v = self::getFeaturedVersion();
        $filterHash = !empty($filters) ? md5(json_encode($filters)) : 'none';
        return "catalog:products:featured:v{$v}:p_{$offset}_{$limit}:{$tab}:{$filterHash}";
    }

    public static function hotSalesKey(): string
    {
        return 'catalog:products:hot_sales';
    }

    public static function productKey(string|int $slugOrId, bool $isCustomer = false): string
    {
        $tier = $isCustomer ? 'b2b' : 'retail';
        return "catalog:product:{$slugOrId}:{$tier}";
    }

    /**
     * Remember or retrieve categories tree.
     */
    public static function rememberCategories(callable $callback): mixed
    {
        return Cache::remember(self::categoriesKey(), self::TTL_CATEGORIES, $callback);
    }

    /**
     * Remember or retrieve brands collection.
     */
    public static function rememberBrands(callable $callback): mixed
    {
        return Cache::remember(self::brandsKey(), self::TTL_BRANDS, $callback);
    }

    /**
     * Remember or retrieve featured products collection.
     */
    public static function rememberFeatured(callable $callback): mixed
    {
        return Cache::remember(self::featuredKey(), self::TTL_FEATURED, $callback);
    }

    /**
     * Remember or retrieve paginated featured products slice.
     */
    public static function rememberFeaturedPage(int $offset, int $limit, string $tab, array $filters, callable $callback): mixed
    {
        return Cache::remember(self::featuredPageKey($offset, $limit, $tab, $filters), self::TTL_FEATURED, $callback);
    }

    /**
     * Remember or retrieve hot sales collection.
     */
    public static function rememberHotSales(callable $callback): mixed
    {
        return Cache::remember(self::hotSalesKey(), self::TTL_HOT_SALES, $callback);
    }

    /**
     * Remember or retrieve individual product detail isolated by tier.
     */
    public static function rememberProduct(string|int $slugOrId, bool $isCustomer, callable $callback): mixed
    {
        return Cache::remember(self::productKey($slugOrId, $isCustomer), self::TTL_PRODUCT, $callback);
    }

    /**
     * Invalidate caches related to a product across all tiers.
     */
    public static function invalidateProduct(Product|string|int $product): void
    {
        self::bumpFeaturedVersion();
        Cache::forget(self::featuredKey());
        Cache::forget(self::hotSalesKey());

        $identifiers = [];
        if ($product instanceof Product) {
            $identifiers[] = $product->id;
            if ($product->slug) {
                $identifiers[] = $product->slug;
            }
            if ($product->sku) {
                $identifiers[] = $product->sku;
            }
            if ($product->product_id) {
                $identifiers[] = $product->product_id;
            }
        } else {
            $identifiers[] = $product;
        }

        foreach ($identifiers as $id) {
            Cache::forget(self::productKey($id, false)); // retail tier
            Cache::forget(self::productKey($id, true));  // b2b tier
            Cache::forget("catalog:product:{$id}");     // fallback legacy key
        }
    }

    /**
     * Flush all product and collection caches across all products.
     */
    public static function flushAllProducts(): void
    {
        self::bumpFeaturedVersion();
        Cache::forget(self::featuredKey());
        Cache::forget(self::hotSalesKey());

        $products = Product::select('id', 'slug')->get();
        foreach ($products as $p) {
            self::invalidateProduct($p);
        }
    }

    /**
     * Invalidate category caches.
     */
    public static function invalidateCategories(): void
    {
        self::bumpFeaturedVersion();
        Cache::forget(self::categoriesKey());
        Cache::forget(self::featuredKey());
    }

    /**
     * Invalidate brand caches.
     */
    public static function invalidateBrands(): void
    {
        self::bumpFeaturedVersion();
        Cache::forget(self::brandsKey());
        Cache::forget(self::featuredKey());
    }

    /**
     * Flush all public catalog caches.
     */
    public static function invalidateAll(): void
    {
        self::bumpFeaturedVersion();
        Cache::forget(self::categoriesKey());
        Cache::forget(self::brandsKey());
        Cache::forget(self::featuredKey());
        Cache::forget(self::hotSalesKey());
    }
}
