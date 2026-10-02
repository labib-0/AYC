<?php

namespace App\Services\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageFeaturedBrand;
use App\Models\HomepageFeaturedProduct;
use App\Models\HomepageHotSaleCategory;
use App\Models\HomepageTickerItem;
use App\Models\Product;
use App\Services\Cache\CatalogCacheService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class HomepageOrderingService
{
    /**
     * Deduplicate IDs preserving the first occurrence order and normalize sort_order to 0, 1, 2, ...
     *
     * @param array $items Array of items containing the ID key
     * @param string $idKey The key representing the entity ID (e.g. 'brand_id', 'category_id', 'product_id', 'id')
     * @return array Normalized list of unique items with 0-based sort_order
     */
    public function normalizeSequence(array $items, string $idKey): array
    {
        $seen = [];
        $normalized = [];

        foreach ($items as $item) {
            if (!isset($item[$idKey])) {
                continue;
            }
            $id = (int) $item[$idKey];
            if (!in_array($id, $seen, true)) {
                $seen[] = $id;
                $normalized[] = [
                    $idKey => $id,
                    'sort_order' => count($normalized),
                    'is_active' => isset($item['is_active']) ? (bool) $item['is_active'] : true,
                ];
            }
        }

        return $normalized;
    }

    /**
     * Synchronize and reorder Shop By Brand landing page brands.
     * Persists exact order to homepage_featured_brands and syncs the Brand entity flags.
     *
     * @param array $incomingBrands
     * @return Collection
     */
    public function syncFeaturedBrands(array $incomingBrands): Collection
    {
        $uniqueBrands = $this->normalizeSequence($incomingBrands, 'brand_id');
        $seenBrandIds = array_column($uniqueBrands, 'brand_id');

        return DB::transaction(function () use ($seenBrandIds, $uniqueBrands) {
            if (empty($seenBrandIds)) {
                HomepageFeaturedBrand::query()->delete();
                Brand::where('is_featured_on_landing', true)->update([
                    'is_featured_on_landing' => false,
                ]);
            } else {
                HomepageFeaturedBrand::whereNotIn('brand_id', $seenBrandIds)->delete();
                Brand::whereNotIn('id', $seenBrandIds)->where('is_featured_on_landing', true)->update([
                    'is_featured_on_landing' => false,
                ]);
            }

            foreach ($uniqueBrands as $item) {
                HomepageFeaturedBrand::updateOrCreate(
                    ['brand_id' => $item['brand_id']],
                    [
                        'sort_order' => $item['sort_order'],
                        'is_active' => $item['is_active'],
                    ]
                );

                Brand::where('id', $item['brand_id'])->update([
                    'is_featured_on_landing' => $item['is_active'],
                    'landing_sort_order' => $item['sort_order'],
                ]);
            }

            CatalogCacheService::invalidateBrands();
            CatalogCacheService::invalidateAll();

            return HomepageFeaturedBrand::query()
                ->with(['brand' => function ($q) {
                    $q->select('id', 'name', 'slug', 'logo_url', 'website', 'sort_order', 'is_active', 'is_featured_on_landing', 'landing_sort_order');
                }])
                ->orderBy('sort_order', 'asc')
                ->get();
        });
    }

    /**
     * Synchronize and reorder Hot Sale categories.
     * Persists exact order to homepage_hot_sale_categories and syncs Category entity flags.
     *
     * @param array $incomingCategories
     * @return Collection
     */
    public function syncHotSaleCategories(array $incomingCategories): Collection
    {
        $uniqueCategories = $this->normalizeSequence($incomingCategories, 'category_id');
        $seenCategoryIds = array_column($uniqueCategories, 'category_id');

        return DB::transaction(function () use ($seenCategoryIds, $uniqueCategories) {
            if (empty($seenCategoryIds)) {
                HomepageHotSaleCategory::query()->delete();
                Category::where('is_featured_on_landing', true)->update([
                    'is_featured_on_landing' => false,
                ]);
            } else {
                HomepageHotSaleCategory::whereNotIn('category_id', $seenCategoryIds)->delete();
                Category::whereNotIn('id', $seenCategoryIds)->where('is_featured_on_landing', true)->update([
                    'is_featured_on_landing' => false,
                ]);
            }

            foreach ($uniqueCategories as $item) {
                HomepageHotSaleCategory::updateOrCreate(
                    ['category_id' => $item['category_id']],
                    [
                        'sort_order' => $item['sort_order'],
                        'is_active' => $item['is_active'],
                    ]
                );

                Category::where('id', $item['category_id'])->update([
                    'is_featured_on_landing' => $item['is_active'],
                    'landing_sort_order' => $item['sort_order'],
                ]);
            }

            CatalogCacheService::invalidateCategories();
            CatalogCacheService::invalidateAll();

            return HomepageHotSaleCategory::query()
                ->with(['category' => function ($q) {
                    $q->select('id', 'name', 'slug', 'description', 'image_url', 'accent_color', 'sort_order', 'is_active', 'is_featured_on_landing', 'landing_sort_order');
                }])
                ->orderBy('sort_order', 'asc')
                ->get();
        });
    }

    /**
     * Synchronize and manually reorder Featured Products.
     * Persists exact order to homepage_featured_products and syncs Product entity flags.
     *
     * @param array $incomingProducts
     * @return Collection
     */
    public function syncFeaturedProducts(array $incomingProducts): Collection
    {
        $uniqueProducts = $this->normalizeSequence($incomingProducts, 'product_id');
        $seenProductIds = array_column($uniqueProducts, 'product_id');

        return DB::transaction(function () use ($seenProductIds, $uniqueProducts) {
            if (empty($seenProductIds)) {
                HomepageFeaturedProduct::query()->delete();
                Product::where('is_featured', true)->update([
                    'is_featured' => false,
                ]);
            } else {
                HomepageFeaturedProduct::whereNotIn('product_id', $seenProductIds)->delete();
                Product::whereNotIn('id', $seenProductIds)->where('is_featured', true)->update([
                    'is_featured' => false,
                ]);
            }

            foreach ($uniqueProducts as $item) {
                HomepageFeaturedProduct::updateOrCreate(
                    ['product_id' => $item['product_id']],
                    [
                        'sort_order' => $item['sort_order'],
                        'is_active' => $item['is_active'],
                    ]
                );

                Product::where('id', $item['product_id'])->update([
                    'is_featured' => $item['is_active'],
                    'featured_sort_order' => $item['sort_order'],
                ]);
            }

            CatalogCacheService::invalidateAll();
            CatalogCacheService::bumpFeaturedVersion();

            return HomepageFeaturedProduct::query()
                ->with([
                    'product' => function ($query) {
                        $query->with([
                            'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
                            'brand',
                            'categories',
                        ]);
                    }
                ])
                ->orderBy('sort_order', 'asc')
                ->get();
        });
    }

    /**
     * Synchronize and persist Homepage ticker items (keywords).
     *
     * @param array $incomingItems
     * @return Collection
     */
    public function syncTickerItems(array $incomingItems): Collection
    {
        return DB::transaction(function () use ($incomingItems) {
            $keptIds = [];
            $normalizedIdx = 0;

            foreach ($incomingItems as $itemData) {
                $text = trim($itemData['text'] ?? '');
                if (empty($text)) {
                    continue;
                }
                $isActive = isset($itemData['is_active']) ? (bool) $itemData['is_active'] : true;
                $sortOrder = $normalizedIdx++;

                if (!empty($itemData['id'])) {
                    $tickerItem = HomepageTickerItem::find($itemData['id']);
                    if ($tickerItem) {
                        $tickerItem->update([
                            'text' => $text,
                            'is_active' => $isActive,
                            'sort_order' => $sortOrder,
                        ]);
                        $keptIds[] = $tickerItem->id;
                        continue;
                    }
                }

                $newItem = HomepageTickerItem::create([
                    'text' => $text,
                    'is_active' => $isActive,
                    'sort_order' => $sortOrder,
                ]);
                $keptIds[] = $newItem->id;
            }

            // Remove any items that were deleted by Admin
            HomepageTickerItem::whereNotIn('id', $keptIds)->delete();

            CatalogCacheService::invalidateAll();

            return HomepageTickerItem::query()
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get();
        });
    }
}
