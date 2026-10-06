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
use App\Models\SystemSetting;
use App\Services\Cache\CatalogCacheService;
use App\Services\Settings\WhatsAppNormalizationService;
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

        // 4. Fetch active featured products ordered correctly:
        //    RULE A: Admin-selected (pinned) products appear FIRST in their exact sort_order (Admin-curated sequence).
        //    RULE B: After all pinned products, remaining eligible published products follow in UPLOAD ORDER (created_at DESC).
        //            newest upload = first position among non-pinned products.
        //    RULE C: No product appears twice — pinned product IDs are excluded from the remaining list.
        //    RULE D: updated_at is intentionally NOT used — editing a product must NOT change its position.
        $featuredProducts = CatalogCacheService::rememberFeatured(function () {
            $selectedFeatured = HomepageFeaturedProduct::query()
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
                            'variants.inventories',
                            'pricingTiers',
                            'packageAllocations',
                        ]);
                    }
                ])
                ->orderBy('sort_order', 'asc') // Admin-pinned order
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'sort_order' => $item->sort_order,
                        'is_active' => $item->is_active,
                        'product' => (new ProductResource($item->product))->resolve(),
                    ];
                });

            // Collect pinned product IDs to exclude from remaining list (prevents duplication)
            $pinnedProductIds = $selectedFeatured->pluck('product_id')->filter()->values()->toArray();

            // Remaining eligible products in upload order (created_at DESC — newest upload first)
            // Excludes all pinned products so each product appears exactly once
            $remainingFeatured = Product::query()
                ->storefrontVisible()
                ->whereNull('deleted_at')
                ->when(!empty($pinnedProductIds), fn($q) => $q->whereNotIn('id', $pinnedProductIds))
                ->with([
                    'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
                    'brand',
                    'categories',
                    'variants.inventories',
                    'pricingTiers',
                    'packageAllocations',
                ])
                ->orderBy('is_sold_out', 'asc') // 0 (active/available) first, 1 (sold out) last
                ->orderBy('created_at', 'desc') // authoritative upload timestamp; NOT updated_at, NOT id
                ->get()
                ->map(function ($p, $idx) use ($selectedFeatured) {
                    return [
                        'id' => null,
                        'product_id' => $p->id,
                        'sort_order' => $selectedFeatured->count() + $idx,
                        'is_active' => true,
                        'product' => (new ProductResource($p))->resolve(),
                    ];
                });

            // Combined: Admin-pinned selected products FIRST → remaining in created_at DESC
            $featuredProducts = $selectedFeatured->concat($remainingFeatured);

            // Fallback: If no records in homepage_featured_products, check products with is_featured = true
            // Apply the same ordering rule: featured_sort_order first, then created_at DESC (not id DESC)
            if ($selectedFeatured->isEmpty()) {
                $featuredProdsDirect = Product::query()
                    ->storefrontVisible()
                    ->where('is_featured', true)
                    ->whereNull('deleted_at')
                    ->with([
                        'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
                        'brand',
                        'categories',
                        'variants.inventories',
                        'pricingTiers',
                        'packageAllocations',
                    ])
                    ->orderBy('featured_sort_order', 'asc')
                    ->orderBy('created_at', 'desc') // newest upload first — NOT id DESC
                    ->get();

                if ($featuredProdsDirect->isNotEmpty()) {
                    $fallbackPinnedIds = $featuredProdsDirect->pluck('id')->toArray();

                    $fallbackPinned = $featuredProdsDirect->map(function ($p, $idx) {
                        return [
                            'id' => $p->id,
                            'product_id' => $p->id,
                            'sort_order' => $p->featured_sort_order ?? $idx,
                            'is_active' => true,
                            'product' => (new ProductResource($p))->resolve(),
                        ];
                    });

                    // Remaining products after fallback-pinned exclusion, sorted by created_at DESC
                    $fallbackRemaining = Product::query()
                        ->storefrontVisible()
                        ->whereNull('deleted_at')
                        ->whereNotIn('id', $fallbackPinnedIds)
                        ->with([
                            'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
                            'brand',
                            'categories',
                            'variants.inventories',
                            'pricingTiers',
                            'packageAllocations',
                        ])
                        ->orderBy('is_sold_out', 'asc') // 0 (active/available) first, 1 (sold out) last
                        ->orderBy('created_at', 'desc') // newest upload first — NOT updated_at, NOT id
                        ->get()
                        ->map(function ($p, $idx) use ($fallbackPinned) {
                            return [
                                'id' => null,
                                'product_id' => $p->id,
                                'sort_order' => $fallbackPinned->count() + $idx,
                                'is_active' => true,
                                'product' => (new ProductResource($p))->resolve(),
                            ];
                        });

                    $featuredProducts = $fallbackPinned->concat($fallbackRemaining);
                }
            }

            return $featuredProducts->values()->all();
        });

        // 5. Fetch active homepage ticker items (in admin sort order)
        $tickerItems = HomepageTickerItem::query()
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get(['id', 'text', 'sort_order', 'is_active']);

        // 6. Authoritative business WhatsApp contact
        $whatsappDisplay = SystemSetting::get('whatsapp_display', env('NEXT_PUBLIC_WHATSAPP_DISPLAY', WhatsAppNormalizationService::CANONICAL_DISPLAY));
        $whatsappNumber = SystemSetting::get('whatsapp_number', SystemSetting::get('whatsapp_business_number', WhatsAppNormalizationService::CANONICAL_NUMBER));
        $whatsappUrl = WhatsAppNormalizationService::buildWhatsAppUrl($whatsappNumber);

        return $this->success([
            'banner' => $banner,
            'ticker_items' => $tickerItems,
            'featured_brands' => $featuredBrands,
            'hot_sale_categories' => $hotSaleCategories,
            'featured_products' => $featuredProducts,
            'hot_sale_visible' => SystemSetting::isHotSaleVisible(),
            'whatsapp' => [
                'display' => $whatsappDisplay,
                'number' => $whatsappNumber,
                'url' => $whatsappUrl,
            ],
        ], 'Homepage configuration retrieved successfully');
    }
}
