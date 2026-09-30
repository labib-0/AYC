<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\ProductResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageBanner;
use App\Models\HomepageFeaturedBrand;
use App\Models\HomepageFeaturedProduct;
use App\Models\HomepageHotSaleCategory;
use App\Models\HomepageTickerItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class HomepageController extends ApiController
{
    /**
     * GET /api/v1/homepage
     *
     * Public storefront endpoint returning the active published landing page configuration:
     * - Primary promotional banner
     * - Curated Shop By Brand (in exact Admin-specified sort order)
     * - Curated Hot Sale categories (in exact Admin-specified sort order)
     * - Curated Featured Products (in exact Admin-specified sort order)
     */
    public function index(): JsonResponse
    {
        // 1. Fetch active primary banner (prioritizing lowest sort_order, newest update)
        $banner = HomepageBanner::query()
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->orderBy('updated_at', 'desc')
            ->first();

        // 2. Fetch active landing page brands (in admin sort order)
        $featuredBrands = HomepageFeaturedBrand::query()
            ->where('is_active', true)
            ->whereHas('brand', function ($query) {
                $query->where('is_active', true);
            })
            ->with(['brand' => function ($q) {
                $q->select('id', 'name', 'slug', 'logo_url', 'website', 'sort_order', 'is_active', 'is_featured_on_landing', 'landing_sort_order');
            }])
            ->orderBy('sort_order', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'brand_id' => $item->brand_id,
                    'sort_order' => $item->sort_order,
                    'is_active' => $item->is_active,
                    'brand' => $item->brand,
                ];
            });

        // If no records in homepage_featured_brands, also check brands with is_featured_on_landing = true
        if ($featuredBrands->isEmpty()) {
            $landingBrandsDirect = Brand::query()
                ->where('is_active', true)
                ->where('is_featured_on_landing', true)
                ->orderBy('landing_sort_order', 'asc')
                ->orderBy('name', 'asc')
                ->get();

            if ($landingBrandsDirect->isNotEmpty()) {
                $featuredBrands = $landingBrandsDirect->map(function ($b, $idx) {
                    return [
                        'id' => $b->id,
                        'brand_id' => $b->id,
                        'sort_order' => $b->landing_sort_order ?? $idx,
                        'is_active' => true,
                        'brand' => $b,
                    ];
                });
            }
        }

        // 3. Fetch active hot sale categories (in admin sort order)
        $hotSaleCategories = HomepageHotSaleCategory::query()
            ->where('is_active', true)
            ->whereHas('category', function ($query) {
                $query->where('is_active', true);
            })
            ->with(['category' => function ($q) {
                $q->select('id', 'name', 'slug', 'description', 'image_url', 'accent_color', 'sort_order', 'is_active', 'is_featured_on_landing', 'landing_sort_order');
            }])
            ->orderBy('sort_order', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'category_id' => $item->category_id,
                    'sort_order' => $item->sort_order,
                    'is_active' => $item->is_active,
                    'category' => $item->category,
                ];
            });

        // If no records in homepage_hot_sale_categories, also check categories with is_featured_on_landing = true
        if ($hotSaleCategories->isEmpty()) {
            $landingCatsDirect = Category::query()
                ->where('is_active', true)
                ->where('is_featured_on_landing', true)
                ->orderBy('landing_sort_order', 'asc')
                ->orderBy('name', 'asc')
                ->get();

            if ($landingCatsDirect->isNotEmpty()) {
                $hotSaleCategories = $landingCatsDirect->map(function ($c, $idx) {
                    return [
                        'id' => $c->id,
                        'category_id' => $c->id,
                        'sort_order' => $c->landing_sort_order ?? $idx,
                        'is_active' => true,
                        'category' => $c,
                    ];
                });
            }
        }

        // 4. Fetch active featured products (in admin sort order)
        $featuredProducts = HomepageFeaturedProduct::query()
            ->where('is_active', true)
            ->whereHas('product', function ($query) {
                $query->storefrontVisible()
                    ->whereNull('deleted_at');
            })
            ->with([
                'product' => function ($query) {
                    $query->with([
                        'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
                        'brand',
                        'categories',
                        'variants',
                        'pricingTiers',
                        'packageAllocations',
                    ]);
                }
            ])
            ->orderBy('sort_order', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'sort_order' => $item->sort_order,
                    'is_active' => $item->is_active,
                    'product' => new ProductResource($item->product),
                ];
            });

        // If no records in homepage_featured_products, check products with is_featured = true
        if ($featuredProducts->isEmpty()) {
            $featuredProdsDirect = Product::query()
                ->storefrontVisible()
                ->where('is_featured', true)
                ->whereNull('deleted_at')
                ->with([
                    'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
                    'brand',
                    'categories',
                    'variants',
                    'pricingTiers',
                    'packageAllocations',
                ])
                ->orderBy('featured_sort_order', 'asc')
                ->orderBy('id', 'desc')
                ->get();

            if ($featuredProdsDirect->isNotEmpty()) {
                $featuredProducts = $featuredProdsDirect->map(function ($p, $idx) {
                    return [
                        'id' => $p->id,
                        'product_id' => $p->id,
                        'sort_order' => $p->featured_sort_order ?? $idx,
                        'is_active' => true,
                        'product' => new ProductResource($p),
                    ];
                });
            }
        }

        // 5. Fetch active homepage ticker items (in admin sort order)
        $tickerItems = HomepageTickerItem::query()
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get(['id', 'text', 'sort_order', 'is_active']);

        return $this->success([
            'banner' => $banner,
            'ticker_items' => $tickerItems,
            'featured_brands' => $featuredBrands,
            'hot_sale_categories' => $hotSaleCategories,
            'featured_products' => $featuredProducts,
        ], 'Homepage configuration retrieved successfully');
    }
}
