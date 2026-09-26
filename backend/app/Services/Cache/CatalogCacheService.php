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

    public static function featuredKey(): string
    {
        return 'catalog:products:featured';
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
        Cache::forget(self::featuredKey());
        Cache::forget(self::hotSalesKey());

        $identifiers = [];
        if ($product instanceof Product) {
            $identifiers[] = $product->id;
            if ($product->slug) {
                $identifiers[] = $product->slug;
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
        Cache::forget(self::categoriesKey());
        Cache::forget(self::featuredKey());
    }

    /**
     * Invalidate brand caches.
     */
    public static function invalidateBrands(): void
    {
        Cache::forget(self::brandsKey());
    }

    /**
     * Flush all public catalog caches.
     */
    public static function invalidateAll(): void
    {
        Cache::forget(self::categoriesKey());
        Cache::forget(self::brandsKey());
        Cache::forget(self::featuredKey());
        Cache::forget(self::hotSalesKey());
    }
}
