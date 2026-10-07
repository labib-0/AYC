<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Catalog\ProductQueryRequest;
use App\Http\Resources\Api\V1\ProductResource;
use App\Models\CartItem;
use App\Models\HomepageFeaturedProduct;
use App\Models\Product;
use App\Models\ProductShippingPackageProfile;
use App\Models\WishlistItem;
use App\Services\Audit\ActivityLogger;
use App\Services\Cache\CatalogCacheService;
use App\Services\Shipping\PackageCalculatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

use App\Services\Catalog\AdminProductMetricsService;

class ProductController extends ApiController
{
    public function __construct(
        private readonly \App\Services\Rbac\AdminAuthorizationService $authorization,
        private readonly AdminProductMetricsService $productMetricsService
    ) {}

    /**
     * GET /api/v1/products/statistics or /api/v1/admin/products/statistics
     * Authoritative shared catalog statistics for Admin.
     */
    public function statistics(Request $request): JsonResponse
    {
        $metrics = $this->productMetricsService->getMetrics();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $metrics['total_products'],
                'total_products' => $metrics['total_products'],
                'published' => $metrics['published_products'],
                'published_products' => $metrics['published_products'],
                'active_products' => $metrics['active_products'],
                'draft' => $metrics['draft_products'],
                'draft_products' => $metrics['draft_products'],
                'archived' => $metrics['archived_products'],
                'archived_products' => $metrics['archived_products'],
                'low_stock' => $metrics['low_stock_products'],
                'low_stock_products' => $metrics['low_stock_products'],
                'low_stock_items' => $metrics['low_stock_products'],
                'price_pending' => $metrics['price_pending_products'],
                'purchase_price_pending' => $metrics['price_pending_products'],
            ],
            'message' => 'Product catalog statistics retrieved successfully',
        ]);
    }

    /**
     * GET /api/v1/products
     */
    public function index(ProductQueryRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $query = Product::with(['brand', 'categories', 'images', 'variants', 'pricingTiers', 'shippingPackageProfiles']);

        $user = $request->user() ?: auth('sanctum')->user();
        $isAdmin = $request->boolean('isAdmin') || ($user && $user->isAdmin());

        // Status filter (defaults to 'published' for public storefront; non-admins can ONLY view published & non-hidden products with a valid customer price)
        if (!$isAdmin) {
            $query->storefrontVisible();
        } else {
            if ($request->filled('status') && $request->input('status') !== 'all') {
                $query->where('status', $request->input('status'));
            }
            if ($request->filled('is_hidden_from_storefront')) {
                $query->where('is_hidden_from_storefront', $request->boolean('is_hidden_from_storefront'));
            } elseif ($request->filled('hidden')) {
                $query->where('is_hidden_from_storefront', $request->boolean('hidden'));
            }
        }

        $likeOp = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        // Search keyword (q or search)
        $searchTerm = $request->input('q') ?? $request->input('search');
        if (!empty($searchTerm)) {
            $searchTerm = trim($searchTerm);
            $query->where(function ($q) use ($searchTerm, $likeOp, $isAdmin) {
                $q->where('name', $likeOp, "%{$searchTerm}%")
                  ->orWhere('description', $likeOp, "%{$searchTerm}%")
                  ->orWhere('short_description', $likeOp, "%{$searchTerm}%")
                  ->orWhere('sku', $likeOp, "%{$searchTerm}%")
                  ->orWhereHas('brand', function ($bq) use ($searchTerm, $likeOp) {
                      $bq->where('name', $likeOp, "%{$searchTerm}%");
                  })
                  ->orWhereHas('categories', function ($cq) use ($searchTerm, $likeOp) {
                      $cq->where('name', $likeOp, "%{$searchTerm}%");
                  });

                // Product ID search is internal and authoritative for Admins
                if ($isAdmin) {
                    $q->orWhere('product_id', $likeOp, "%{$searchTerm}%");
                }
            });
        }

        // Direct product_id filter for Admins
        if ($isAdmin && $request->filled('product_id')) {
            $query->where('product_id', $likeOp, '%' . trim($request->input('product_id')) . '%');
        }

        // Category filter (slug, id, or comma-separated list - case-insensitive)
        if ($request->filled('category') && $request->input('category') !== 'all') {
            $categories = array_values(array_unique(array_filter(array_map('trim', explode(',', (string) $request->input('category'))))));
            if (!empty($categories)) {
                $lowerCats = array_map('mb_strtolower', $categories);
                $query->whereHas('categories', function ($q) use ($categories, $lowerCats) {
                    $q->whereIn('slug', $categories)
                      ->orWhereIn('name', $categories)
                      ->orWhereIn(\DB::raw('LOWER(slug)'), $lowerCats)
                      ->orWhereIn(\DB::raw('LOWER(name)'), $lowerCats)
                      ->orWhereIn('id', array_filter($categories, 'is_numeric'));
                });
            }
        }

        // Brand filter (slug, id, or comma-separated list - case-insensitive)
        if ($request->filled('brand') && $request->input('brand') !== 'all') {
            $brands = array_values(array_unique(array_filter(array_map('trim', explode(',', (string) $request->input('brand'))))));
            if (!empty($brands)) {
                $lowerBrands = array_map('mb_strtolower', $brands);
                $query->whereHas('brand', function ($q) use ($brands, $lowerBrands) {
                    $q->whereIn('slug', $brands)
                      ->orWhereIn('name', $brands)
                      ->orWhereIn(\DB::raw('LOWER(slug)'), $lowerBrands)
                      ->orWhereIn(\DB::raw('LOWER(name)'), $lowerBrands)
                      ->orWhereIn('id', array_filter($brands, 'is_numeric'));
                });
            }
        }

        // Exclude specific product IDs or slugs (e.g. for brand-based related products)
        if ($request->filled('exclude')) {
            $excludes = array_filter(array_map('trim', explode(',', (string) $request->input('exclude'))));
            if (!empty($excludes)) {
                $query->whereNotIn('id', array_filter($excludes, 'is_numeric'))
                      ->whereNotIn('slug', $excludes);
            }
        }

        // Audience filter (MEN, WOMEN, BOYS, GIRLS, UNISEX)
        if ($request->filled('audience') && $request->input('audience') !== 'all') {
            $audiences = array_filter(array_map(function ($item) {
                return strtoupper(trim($item));
            }, explode(',', $request->input('audience'))));

            if (!empty($audiences)) {
                $query->whereIn('audience', $audiences);
            }
        }

        // Design Type filter (ORIGINAL, MASTER COPY, or comma-separated list)
        $designTypeInput = $request->input('design_type') ?? $request->input('designType');
        if (!empty($designTypeInput) && strtolower($designTypeInput) !== 'all') {
            $designTypes = array_filter(array_map(function ($item) {
                $dt = strtoupper(trim($item));
                if ($dt === 'MC' || $dt === 'REPLICA') {
                    return 'MASTER COPY';
                }
                return $dt;
            }, explode(',', $designTypeInput)));

            if (!empty($designTypes)) {
                $query->whereIn('design_type', $designTypes);
            }
        }

        // Price range filtering
        if ($request->filled('price_min')) {
            $query->where('wholesale_price', '>=', (float) $request->input('price_min'));
        }
        if ($request->filled('price_max')) {
            $query->where('wholesale_price', '<=', (float) $request->input('price_max'));
        }

        // Color filter
        if ($request->filled('color') && $request->input('color') !== 'ALL') {
            $color = $request->input('color');
            $query->where(function ($q) use ($color, $likeOp) {
                $q->where('color_name', $likeOp, "%{$color}%")
                  ->orWhereHas('variants', function ($vq) use ($color, $likeOp) {
                      $vq->where('color', $likeOp, "%{$color}%");
                  });
            });
        }

        // Size filter
        if ($request->filled('size')) {
            $size = $request->input('size');
            $query->whereHas('variants', function ($vq) use ($size) {
                $vq->where('size', $size);
            });
        }

        // Flags (storefront only matches active, unexpired promotional badges)
        $isAdmin = $request->boolean('isAdmin') || ($user && $user->isAdmin());
        if ($request->boolean('is_featured')) {
            $query->where('is_featured', true);
            if (!$isAdmin) {
                $query->where(function ($q) {
                    $q->whereNull('featured_until')->orWhere('featured_until', '>', now());
                });
            }
        }
        if ($request->boolean('is_hot')) {
            $query->where('is_hot', true);
            if (!$isAdmin) {
                $query->where(function ($q) {
                    $q->whereNull('hot_until')->orWhere('hot_until', '>', now());
                });
            }
        }
        if ($request->boolean('is_new')) {
            $query->where('is_new', true);
            if (!$isAdmin) {
                $query->where(function ($q) {
                    $q->whereNull('new_until')->orWhere('new_until', '>', now());
                });
            }
        }
        if ($request->boolean('is_best_deal')) {
            $query->where('is_best_deal', true);
        }
        if ($request->boolean('is_limited_deal')) {
            $query->where('is_limited_deal', true);
        }
        if ($request->boolean('is_preorder')) {
            $query->where('is_preorder', true);
        }
        if ($request->has('is_sold_out')) {
            $query->where('is_sold_out', $request->boolean('is_sold_out'));
        }
        if ($request->filled('availability')) {
            $avail = $request->input('availability');
            if ($avail === 'ready_stock') {
                $query->where('is_preorder', false)->where('is_sold_out', false);
            } elseif ($avail === 'preorder') {
                $query->where('is_preorder', true);
            } elseif ($avail === 'sold_out') {
                $query->where('is_sold_out', true);
            }
        }

        // In Stock filter
        if ($request->boolean('in_stock')) {
            $query->where(function ($sq) {
                $sq->whereHas('variants', function ($vq) {
                    $vq->where('stock', '>', 0);
                })->orWhere(function ($vq) {
                    $vq->where('stock', '>', 0)
                       ->whereDoesntHave('variants');
                });
            });
        }

        // Purchase Price status filter (admin-only)
        if ($request->filled('purchase_price_status')) {
            $pps = $request->input('purchase_price_status');
            if ($pps === 'pending') {
                $query->whereNull('purchase_price_updated_at');
            } elseif ($pps === 'updated') {
                $query->whereNotNull('purchase_price_updated_at');
            }
        }

        // Sorting whitelist
        $sortBy = $request->input('sort') ?? $request->input('sort_by') ?? 'newest';
        if (!$isAdmin) {
            $query->orderBy('is_sold_out', 'asc');
        }
        switch ($sortBy) {
            case 'price_asc':
                $query->orderBy('wholesale_price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('wholesale_price', 'desc');
                break;
            case 'popular':
            case 'hot':
                $query->orderBy('is_hot', 'desc')->orderBy('created_at', 'desc');
                break;
            case 'featured':
                $query->orderBy('is_featured', 'desc')->orderBy('created_at', 'desc');
                break;
            case 'name_asc':
                $query->orderBy('name', 'asc');
                break;
            case 'name_desc':
                $query->orderBy('name', 'desc');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $isAll = $request->boolean('all') || $request->input('per_page') === 'all' || (int) $request->input('per_page') === -1;
        if ($isAll) {
            $products = $query->get();
        } else {
            $perPage = (int) ($request->input('per_page') ?? $request->input('limit') ?? 20);
            $products = $query->paginate($perPage);
        }

        $isAdmin = $request->boolean('isAdmin') || ($user && $user->isAdmin());
        $isPaginated = $products instanceof \Illuminate\Pagination\LengthAwarePaginator;
        $metrics = $isAdmin ? $this->productMetricsService->getMetrics() : null;

        return response()->json([
            'success' => true,
            'data' => ProductResource::collection($products)->resolve(),
            'links' => $isPaginated ? [
                'first' => $products->url(1),
                'last' => $products->url($products->lastPage()),
                'prev' => $products->previousPageUrl(),
                'next' => $products->nextPageUrl(),
            ] : null,
            'meta' => array_merge(
                $isPaginated ? [
                    'current_page' => $products->currentPage(),
                    'from' => $products->firstItem(),
                    'last_page' => $products->lastPage(),
                    'path' => $products->path(),
                    'per_page' => $products->perPage(),
                    'to' => $products->lastItem(),
                    'total' => $products->total(),
                ] : [
                    'current_page' => 1,
                    'from' => count($products) > 0 ? 1 : null,
                    'last_page' => 1,
                    'path' => $request->url(),
                    'per_page' => count($products),
                    'to' => count($products) > 0 ? count($products) : null,
                    'total' => count($products),
                ],
                $isAdmin && $metrics ? [
                    'counts' => [
                        'total' => $metrics['total_products'],
                        'published' => $metrics['published_products'],
                        'draft' => $metrics['draft_products'],
                        'archived' => $metrics['archived_products'],
                        'low_stock' => $metrics['low_stock_products'],
                        'price_pending' => $metrics['price_pending_products'],
                    ],
                ] : []
            ),
        ]);
    }

    /**
     * GET /api/v1/products/featured
     *
     * Returns curated landing-page featured products in authoritative sort order:
     * 1. Admin-pinned products (sort_order ASC)
     * 2. Remaining eligible products in upload order (created_at DESC — newest upload first)
     * Excludes duplicates, non-storefront products, and draft/archived products.
     */
    public function featured(Request $request): JsonResponse
    {
        $limit = max(1, min(100, (int) ($request->input('limit') ?? $request->input('per_page') ?? 21)));
        $offset = max(0, (int) ($request->input('offset') ?? 0));
        if ($request->has('page') && !$request->has('offset')) {
            $page = max(1, (int) $request->input('page'));
            $offset = ($page - 1) * $limit;
        }

        $rawMode = (string) $request->input('mode');
        $tab = (string) $request->input('tab', 'all');

        // Resolve authoritative mode: default | best_deals | new_arrivals
        if ($rawMode === 'best_deals' || $tab === 'best-deals' || $tab === 'best_deals') {
            $mode = 'best_deals';
        } elseif ($rawMode === 'new_arrivals' || $tab === 'new-arrivals' || $tab === 'new_arrivals') {
            $mode = 'new_arrivals';
        } else {
            $mode = 'default';
        }

        $parseFilter = function ($input) {
            if (empty($input) || $input === 'all') return [];
            if (is_array($input)) return array_filter(array_map('trim', $input));
            return array_filter(array_map('trim', explode(',', (string) $input)));
        };

        $brands = $parseFilter($request->input('brand') ?? $request->input('brands'));
        $categories = $parseFilter($request->input('category') ?? $request->input('categories'));
        $audiences = array_map('strtoupper', $parseFilter($request->input('audience') ?? $request->input('audiences')));
        $rawDesignTypes = $parseFilter($request->input('design_type') ?? $request->input('designType') ?? $request->input('designTypes'));
        $designTypes = array_map(function ($item) {
            $dt = strtoupper($item);
            return ($dt === 'MC' || $dt === 'REPLICA') ? 'MASTER COPY' : $dt;
        }, $rawDesignTypes);

        $filterCacheKey = [
            'mode' => $mode,
            'tab' => $tab,
            'brands' => $brands,
            'categories' => $categories,
            'audiences' => $audiences,
            'design_types' => $designTypes,
        ];

        $cachedResult = CatalogCacheService::rememberFeaturedPage(
            $offset,
            $limit,
            $mode,
            $filterCacheKey,
            function () use ($offset, $limit, $mode, $request, $brands, $categories, $audiences, $designTypes) {
                $applyStorefrontFilters = function ($q) use ($brands, $categories, $audiences, $designTypes) {
                    $q->storefrontVisible()->whereNull('deleted_at');
                    if (!empty($brands)) {
                        $lowerBrands = array_map('mb_strtolower', $brands);
                        $q->whereHas('brand', function ($b) use ($brands, $lowerBrands) {
                            $b->whereIn('slug', $brands)
                              ->orWhereIn('name', $brands)
                              ->orWhereIn(\DB::raw('LOWER(slug)'), $lowerBrands)
                              ->orWhereIn(\DB::raw('LOWER(name)'), $lowerBrands)
                              ->orWhereIn('id', array_filter($brands, 'is_numeric'));
                        });
                    }
                    if (!empty($categories)) {
                        $lowerCats = array_map('mb_strtolower', $categories);
                        $q->whereHas('categories', function ($c) use ($categories, $lowerCats) {
                            $c->whereIn('slug', $categories)
                              ->orWhereIn('name', $categories)
                              ->orWhereIn(\DB::raw('LOWER(slug)'), $lowerCats)
                              ->orWhereIn(\DB::raw('LOWER(name)'), $lowerCats)
                              ->orWhereIn('id', array_filter($categories, 'is_numeric'));
                        });
                    }
                    if (!empty($audiences)) {
                        $q->whereIn('audience', $audiences);
                    }
                    if (!empty($designTypes)) {
                        $q->whereIn('design_type', $designTypes);
                    }
                };

                if ($mode === 'best_deals') {
                    // BEST DEALS: Products with active HOT tag, storefront-eligible, sorted newest upload first
                    $hotQuery = Product::query();
                    $applyStorefrontFilters($hotQuery);
                    $hotQuery->where('is_hot', true)
                        ->where(function ($h) {
                            $h->whereNull('hot_until')
                              ->orWhere('hot_until', '>', now());
                        })
                        ->orderBy('created_at', 'desc');
                    $allOrderedIds = $hotQuery->pluck('id')->toArray();
                } elseif ($mode === 'new_arrivals') {
                    // NEW ARRIVALS: Storefront-eligible products ordered by newest upload (created_at DESC)
                    $newQuery = Product::query();
                    $applyStorefrontFilters($newQuery);
                    if ($request->has('is_new')) {
                        $newQuery->where('is_new', filter_var($request->input('is_new'), FILTER_VALIDATE_BOOLEAN));
                    }
                    $newQuery->orderBy('created_at', 'desc');
                    $allOrderedIds = $newQuery->pluck('id')->toArray();
                } else {
                    // DEFAULT:
                    // 1. Admin-pinned products (HomepageFeaturedProduct is authoritative)
                    $pinnedIds = HomepageFeaturedProduct::query()
                        ->where('is_active', true)
                        ->whereHas('product', $applyStorefrontFilters)
                        ->orderBy('sort_order', 'asc')
                        ->pluck('product_id')
                        ->filter()
                        ->values()
                        ->toArray();

                    // Fallback: If no records in homepage_featured_products, check products with is_featured = true
                    if (empty($pinnedIds)) {
                        $fallbackPinnedQuery = Product::query()->where('is_featured', true);
                        $applyStorefrontFilters($fallbackPinnedQuery);
                        $pinnedIds = $fallbackPinnedQuery
                            ->orderBy('featured_sort_order', 'asc')
                            ->orderBy('created_at', 'desc')
                            ->pluck('id')
                            ->toArray();
                    }

                    // 2. Remaining eligible products in upload order (created_at DESC — newest upload first)
                    $remainingQuery = Product::query();
                    $applyStorefrontFilters($remainingQuery);
                    if (!empty($pinnedIds)) {
                        $remainingQuery->whereNotIn('id', $pinnedIds);
                    }
                    $remainingIds = $remainingQuery
                        ->orderBy('is_sold_out', 'asc') // 0 (active/available) first, 1 (sold out) last
                        ->orderBy('created_at', 'desc') // authoritative upload timestamp
                        ->pluck('id')
                        ->toArray();

                    $allOrderedIds = array_merge($pinnedIds, $remainingIds);
                }

                $total = count($allOrderedIds);

                $pageIds = array_slice($allOrderedIds, $offset, $limit);

                if (empty($pageIds)) {
                    $productData = [];
                } else {
                    $products = Product::query()
                        ->whereIn('id', $pageIds)
                        ->with([
                            'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
                            'brand',
                            'categories',
                            'variants.inventories',
                            'pricingTiers',
                            'packageAllocations',
                        ])
                        ->get()
                        ->sortBy(function ($product) use ($pageIds) {
                            return array_search($product->id, $pageIds);
                        })
                        ->values();

                    $productData = ProductResource::collection($products)->resolve();
                }

                return [
                    'data' => $productData,
                    'total' => $total,
                    'offset' => $offset,
                    'limit' => $limit,
                    'has_more' => ($offset + count($pageIds)) < $total,
                    'current_page' => (int) floor($offset / $limit) + 1,
                    'per_page' => $limit,
                ];
            }
        );

        return response()->json([
            'success' => true,
            'data' => $cachedResult['data'],
            'meta' => [
                'total' => $cachedResult['total'],
                'offset' => $cachedResult['offset'],
                'limit' => $cachedResult['limit'],
                'has_more' => $cachedResult['has_more'],
                'current_page' => $cachedResult['current_page'],
                'per_page' => $cachedResult['per_page'],
            ],
        ]);
    }

    /**
     * GET /api/v1/products/{slugOrId} or /api/v1/products/slug/{slug}
     */
    public function show(string $slugOrId): JsonResponse
    {
        $user = request()?->user() ?: (auth('sanctum')->user() ?: auth()->user());
        $isAdmin = $user && $user->isAdmin();
        $isCustomer = $user && $user->isCustomer();

        // For public/customer requests, serve safely from tier-specific cache
        if (!$isAdmin) {
            $cached = CatalogCacheService::rememberProduct($slugOrId, (bool) $isCustomer, function () use ($slugOrId) {
                $p = Product::with(['brand', 'categories', 'images', 'variants.inventories.warehouse', 'pricingTiers', 'packageAllocations.variant', 'shippingPackageProfiles'])
                    ->where('is_hidden_from_storefront', false)
                    ->where(function ($q) use ($slugOrId) {
                        $q->where('slug', $slugOrId);
                        $q->orWhere('sku', $slugOrId);
                        if (is_numeric($slugOrId)) {
                            $q->orWhere('id', (int) $slugOrId);
                        }
                    })
                    ->first();
                return $p ? (new ProductResource($p))->resolve() : null;
            });

            if (!$cached) {
                return $this->notFound('Product not found');
            }

            return $this->success($cached, 'Product retrieved');
        }

        $product = Product::with(['brand', 'supplier', 'categories', 'images', 'variants.inventories.warehouse', 'pricingTiers', 'packageAllocations.variant', 'shippingPackageProfiles'])
            ->where(function ($q) use ($slugOrId) {
                $q->where('slug', $slugOrId);
                $q->orWhere('sku', $slugOrId);
                $q->orWhere('product_id', $slugOrId);
                if (is_numeric($slugOrId)) {
                    $q->orWhere('id', (int) $slugOrId);
                }
            })
            ->first();

        if (!$product) {
            return $this->notFound('Product not found');
        }

        return $this->success(new ProductResource($product), 'Product retrieved');
    }

    /**
     * POST /api/v1/products (Admin)
     */
    public function store(Request $request): JsonResponse
    {
        $targetStatus = $request->input('status', 'published');
        $isPublished = $targetStatus === 'published';

        // Repeated autosave protection: if id of an existing draft is passed, update that draft instead of creating duplicate
        if ($request->filled('id') && is_numeric($request->input('id'))) {
            $existing = Product::find((int) $request->input('id'));
            if ($existing && $existing->status === 'draft') {
                return $this->update($request, (string) $existing->id);
            }
        }

        if ($request->has('productId') && !$request->has('product_id')) {
            $request->merge(['product_id' => $request->input('productId')]);
        }
        if ($request->has('supplierId') && !$request->has('supplier_id')) {
            $request->merge(['supplier_id' => $request->input('supplierId')]);
        }
        if ($request->has('product_id')) {
            $rawPid = (string) $request->input('product_id');
            $normalizedPid = preg_replace('/\s+/', '', $rawPid);
            $request->merge(['product_id' => $normalizedPid !== '' ? $normalizedPid : null]);
        }
        $productIdInput = (string) $request->input('product_id');

        // Normalize Standard Unit Price aliases (standard_price, standardPrice, wholesale_price, wholesalePrice)
        $standardPriceInput = $request->input('standard_price', $request->input('standardPrice', $request->input('wholesale_price', $request->input('wholesalePrice'))));
        if (($standardPriceInput === null || (float)$standardPriceInput <= 0) && $request->has('pricing_tiers') && is_array($request->input('pricing_tiers')) && !empty($request->input('pricing_tiers')[0]['unit_price'])) {
            $tierPrice = (float) $request->input('pricing_tiers')[0]['unit_price'];
            if ($tierPrice > 0) {
                $standardPriceInput = $tierPrice;
            }
        }
        if ($standardPriceInput !== null) {
            $request->merge([
                'wholesale_price' => $standardPriceInput,
                'standard_price' => $standardPriceInput,
            ]);
        }
        if ($request->has('fullStockPrice') && !$request->has('full_stock_price')) {
            $request->merge(['full_stock_price' => $request->input('fullStockPrice')]);
        }
        if ($request->has('costPrice') && !$request->has('cost_price')) {
            $request->merge(['cost_price' => $request->input('costPrice')]);
        }

        $validated = $request->validate([
            'product_id' => [
                'required',
                'string',
                'max:100',
                'regex:/^[A-Za-z0-9\-\/]+$/',
                Rule::unique('products', 'product_id')->whereNull('deleted_at'),
            ],
            'name' => [$isPublished ? 'required' : 'nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', Rule::unique('products', 'slug')->whereNull('deleted_at')],
            'sku' => ['nullable', 'string', Rule::unique('products', 'sku')->whereNull('deleted_at')],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'brand' => ['nullable', 'string'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'supplierId' => ['nullable', 'exists:suppliers,id'],
            'new_brand_name' => ['nullable', 'string', 'max:255'],
            'new_brand_logo' => ['nullable', 'string'],
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seoTitle' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string'],
            'seoDescription' => ['nullable', 'string'],
            'keywords' => ['nullable', 'array'],
            'keywords.*' => ['string', 'max:100'],
            'seo_keywords' => ['nullable', 'array'],
            'seo_keywords.*' => ['string', 'max:100'],
            'material' => ['nullable', 'string'],
            'size_description' => ['nullable', 'string', 'max:255'],
            'sizeDescription' => ['nullable', 'string', 'max:255'],
            'colour_description' => ['nullable', 'string', 'max:255'],
            'colourDescription' => ['nullable', 'string', 'max:255'],
            'package_assortment_visible' => ['nullable', 'boolean'],
            'packageAssortmentVisible' => ['nullable', 'boolean'],
            'package_assortment_message' => ['nullable', 'string'],
            'packageAssortmentMessage' => ['nullable', 'string'],
            'color_name' => ['nullable', 'string'],
            'color_hex' => ['nullable', 'string'],
            'audience' => ['nullable', 'string'],
            'design_type' => ['nullable', 'string'],
            'designType' => ['nullable', 'string'],
            'product_type' => ['nullable', 'string'],
            'wholesale_price' => [$isPublished ? 'required' : 'nullable', 'numeric', $isPublished ? 'min:0.01' : 'min:0'],
            'wholesalePrice' => ['nullable', 'numeric'],
            'standard_price' => ['nullable', 'numeric', $isPublished ? 'min:0.01' : 'min:0'],
            'standardPrice' => ['nullable', 'numeric'],
            'bulk_pricing_enabled' => ['nullable', 'boolean'],
            'bulkPricingEnabled' => ['nullable', 'boolean'],
            'bulk_threshold' => ['nullable', 'integer', 'min:1'],
            'bulkThreshold' => ['nullable', 'integer', 'min:1'],
            'bulk_minimum_quantity' => ['nullable', 'integer', 'min:1'],
            'bulk_price' => ['nullable', 'numeric', 'min:0.01'],
            'bulkPrice' => ['nullable', 'numeric', 'min:0.01'],
            'bulk_unit_price' => ['nullable', 'numeric', 'min:0.01'],
            'full_stock_price' => [$isPublished ? 'required' : 'nullable', 'numeric', $isPublished ? 'gt:0' : 'min:0'],
            'fullStockPrice' => ['nullable', 'numeric'],
            'msrp_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0.01'],
            'costPrice' => ['nullable', 'numeric'],
            'moq' => ['nullable', 'integer', 'min:1'],
            'initial_stock' => ['nullable', 'integer', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'warehouse_id' => [$isPublished ? 'required_without:initial_inventory.warehouse_id' : 'nullable', 'nullable', 'exists:warehouses,id'],
            'initial_inventory' => ['nullable', 'array'],
            'initial_inventory.warehouse_id' => ['nullable', 'exists:warehouses,id'],
            'initial_inventory.quantity' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'string', 'in:draft,published,archived'],
            'is_hidden_from_storefront' => ['nullable', 'boolean'],
            'is_featured' => ['nullable', 'boolean'],
            'featured_sort_order' => ['nullable', 'integer'],
            'featured_until' => ['nullable', 'date'],
            'featured_duration_days' => ['nullable', 'integer', 'min:1'],
            'is_hot' => ['nullable', 'boolean'],
            'hot_until' => ['nullable', 'date'],
            'hot_duration_days' => ['nullable', 'integer', 'min:1'],
            'is_new' => ['nullable', 'boolean'],
            'new_until' => ['nullable', 'date'],
            'new_duration_days' => ['nullable', 'integer', 'min:1'],
            'is_limited_deal' => ['nullable', 'boolean'],
            'is_best_deal' => ['nullable', 'boolean'],
            'is_preorder' => ['nullable', 'boolean'],
            'is_sold_out' => ['nullable', 'boolean'],
            'estimated_delivery_date' => ($request->boolean('is_preorder') && $isPublished)
                ? ['required', 'date', 'after_or_equal:today']
                : ['nullable', 'date', 'after_or_equal:today'],
            'video_url' => ['nullable', 'string', 'max:1000'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'categories' => ['nullable', 'array'],
            'categories.*' => ['exists:categories,id'],
            'images' => ['nullable', 'array'],
            'images.*' => ['nullable', function ($attr, $value, $fail) {
                $checkUrl = function ($url) use ($fail) {
                    if (!is_string($url)) return;
                    if (str_starts_with($url, 'data:')) {
                        $fail('Image URLs must be HTTP/HTTPS URLs, not base64 data URIs. Please upload the image first via the upload endpoint.');
                    }
                    $trimmed = trim($url);
                    if ($trimmed === '/storage' || $trimmed === '/storage/' || $trimmed === 'storage' || preg_match('#^https?://[^/]+/storage/?$#i', $trimmed)) {
                        $fail('Image URL must point to a specific stored file, not the root storage directory.');
                    }
                };
                if (is_string($value)) {
                    $checkUrl($value);
                } elseif (is_array($value)) {
                    $checkUrl($value['image_url'] ?? $value['url'] ?? null);
                }
            }],
            'variants' => ['nullable', 'array'],
            'pricing_tiers' => ['nullable', 'array'],
            'package_allocations' => ['nullable', 'array'],
            'shipping_package_profiles' => ['nullable', 'array'],
        ], [
            'product_id.required' => 'Product ID is required.',
            'product_id.unique' => "Product ID {$productIdInput} is already in use.",
            'product_id.regex' => 'Product ID may only contain letters, numbers, hyphens (-), and slashes (/).',
            'name.required' => 'Product name is required to publish.',
            'wholesale_price.required' => 'Standard unit price is required to publish.',
            'wholesale_price.min' => 'Standard unit price must be greater than $0.00 to publish.',
            'standard_price.required' => 'Standard unit price is required to publish.',
            'standard_price.min' => 'Standard unit price must be greater than $0.00 to publish.',
            'warehouse_id.required_without' => 'Initial warehouse is required.',
            'full_stock_price.required' => 'Full stock price is required.',
            'full_stock_price.gt' => 'Full stock price must be greater than 0.',
        ]);

        if ($request->boolean('is_sold_out') && $request->boolean('is_preorder')) {
            return response()->json([
                'message' => 'A product cannot be marked as both Pre-Order and Sold Out. Please choose either Pre-Order or Sold Out.',
                'errors' => [
                    'is_sold_out' => ['A product cannot be marked as both Pre-Order and Sold Out. Please choose either Pre-Order or Sold Out.']
                ]
            ], 422);
        }

        $user = $request->user();
        $targetStatus = $validated['status'] ?? 'draft';

        if ($targetStatus === 'published' && !$this->authorization->can($user, 'product.publish')) {
            return $this->forbidden("Forbidden: you do not have the 'product.publish' permission to publish products.");
        }

        if ($targetStatus === 'draft' && !$this->authorization->can($user, 'product.save_draft')) {
            return $this->forbidden("Forbidden: you do not have the 'product.save_draft' permission.");
        }

        if ($targetStatus === 'archived' && !$this->authorization->can($user, 'product.archive')) {
            return $this->forbidden("Forbidden: you do not have the 'product.archive' permission.");
        }

        if (!empty($validated['pricing_tiers']) && !$this->authorization->can($user, 'product.pricing.manage')) {
            return $this->forbidden("Forbidden: you do not have the 'product.pricing.manage' permission.");
        }

        if (!empty($validated['variants']) && !$this->authorization->can($user, 'product.variant.manage')) {
            return $this->forbidden("Forbidden: you do not have the 'product.variant.manage' permission.");
        }

        if ((!empty($validated['package_allocations']) || !empty($validated['shipping_package_profiles'])) && !$this->authorization->can($user, 'product.shipping_profile.manage')) {
            return $this->forbidden("Forbidden: you do not have the 'product.shipping_profile.manage' permission.");
        }

        $productData = collect($validated)->except([
            'categories', 'images', 'variants', 'pricing_tiers', 'package_allocations', 'shipping_package_profiles',
            'new_brand_name', 'new_brand_logo', 'brand', 'designType',
            'sizeDescription', 'colourDescription', 'packageAssortmentVisible', 'packageAssortmentMessage',
            'seoTitle', 'seoDescription', 'seo_keywords',
            'bulkPricingEnabled', 'bulkThreshold', 'bulkPrice', 'bulk_minimum_quantity', 'bulk_unit_price',
            'featured_duration_days', 'hot_duration_days', 'new_duration_days',
            'standardPrice', 'standard_price', 'wholesalePrice',
            'fullStockPrice', 'costPrice',
            'initial_stock', 'stock', 'warehouse_id', 'initial_inventory',
        ])->toArray();

        if (array_key_exists('sizeDescription', $validated) && !array_key_exists('size_description', $validated)) {
            $productData['size_description'] = $validated['sizeDescription'];
        }
        if (array_key_exists('colourDescription', $validated) && !array_key_exists('colour_description', $validated)) {
            $productData['colour_description'] = $validated['colourDescription'];
        }
        if (array_key_exists('packageAssortmentVisible', $validated) && !array_key_exists('package_assortment_visible', $validated)) {
            $productData['package_assortment_visible'] = $validated['packageAssortmentVisible'];
        }
        if (array_key_exists('packageAssortmentMessage', $validated) && !array_key_exists('package_assortment_message', $validated)) {
            $productData['package_assortment_message'] = $validated['packageAssortmentMessage'];
        }
        if (array_key_exists('package_assortment_message', $productData)) {
            $msg = trim($productData['package_assortment_message'] ?? '');
            $productData['package_assortment_message'] = $msg !== '' ? $productData['package_assortment_message'] : Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;
        } else {
            $productData['package_assortment_message'] = Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;
        }
        if (array_key_exists('seoTitle', $validated) && !array_key_exists('seo_title', $validated)) {
            $productData['seo_title'] = $validated['seoTitle'];
        }
        if (array_key_exists('seoDescription', $validated) && !array_key_exists('seo_description', $validated)) {
            $productData['seo_description'] = $validated['seoDescription'];
        }
        if (array_key_exists('seo_keywords', $validated) && !array_key_exists('keywords', $validated)) {
            $productData['keywords'] = $validated['seo_keywords'];
        }

        // Resolve explicit Bulk Pricing state
        $isBulkExplicitlySet = $request->has('bulk_pricing_enabled') || $request->has('bulkPricingEnabled');
        $isBulkEnabled = $isBulkExplicitlySet
            ? ($request->boolean('bulk_pricing_enabled') || $request->boolean('bulkPricingEnabled'))
            : (!empty($request->input('bulk_threshold') ?? $request->input('bulkThreshold') ?? $request->input('bulk_minimum_quantity'))
               && !empty($request->input('bulk_price') ?? $request->input('bulkPrice') ?? $request->input('bulk_unit_price')));

        $rawBulkThreshold = $request->input('bulk_threshold') ?? $request->input('bulkThreshold') ?? $request->input('bulk_minimum_quantity');
        $rawBulkPrice = $request->input('bulk_price') ?? $request->input('bulkPrice') ?? $request->input('bulk_unit_price');

        if ($isBulkEnabled) {
            $productData['bulk_pricing_enabled'] = true;
            $productData['bulk_threshold'] = !empty($rawBulkThreshold) ? (int) $rawBulkThreshold : null;
            $productData['bulk_price'] = !empty($rawBulkPrice) ? (float) $rawBulkPrice : null;
        } else {
            $productData['bulk_pricing_enabled'] = false;
            $productData['bulk_threshold'] = null;
            $productData['bulk_price'] = null;
        }

        // Autogenerate unique slug for drafts if not provided
        if (empty($productData['slug'])) {
            $slugSource = !empty($validated['name'])
                ? $validated['name']
                : ('draft-' . ($productIdInput ?: \Illuminate\Support\Str::random(8)));
            $baseSlug = \Illuminate\Support\Str::slug($slugSource) ?: 'draft-' . \Illuminate\Support\Str::random(8);
            $slugCandidate = $baseSlug;
            $sCount = 1;
            while (Product::where('slug', $slugCandidate)->whereNull('deleted_at')->exists()) {
                $slugCandidate = $baseSlug . '-' . (++$sCount);
            }
            $productData['slug'] = $slugCandidate;
        }

        // Autogenerate unique SKU for drafts if not provided
        if (empty($productData['sku'])) {
            $cleanPid = preg_replace('/[^A-Za-z0-9]/', '', $productIdInput ?: '');
            $baseSku = $cleanPid !== '' ? 'AYN-DFT-' . strtoupper($cleanPid) : 'AYN-DFT-' . strtoupper(\Illuminate\Support\Str::random(6));
            $candidateSku = $baseSku;
            $skuCount = 1;
            while (Product::where('sku', $candidateSku)->whereNull('deleted_at')->exists()) {
                $candidateSku = $baseSku . '-' . (++$skuCount);
            }
            $productData['sku'] = $candidateSku;
        }

        // Standard price: do NOT fabricate fake values; keep NULL if omitted
        if ($standardPriceInput !== null) {
            $productData['wholesale_price'] = (float) $standardPriceInput;
        } elseif (!isset($productData['wholesale_price']) || $productData['wholesale_price'] === null) {
            $productData['wholesale_price'] = null;
        }

        if (!array_key_exists('full_stock_price', $productData)) {
            $productData['full_stock_price'] = null;
        }

        // Handle Promotional Badge Scheduling
        if (isset($validated['featured_duration_days']) && !empty($validated['featured_duration_days'])) {
            $productData['featured_until'] = now()->addDays((int) $validated['featured_duration_days']);
        } elseif (array_key_exists('featured_until', $validated)) {
            $productData['featured_until'] = $validated['featured_until'] ? \Carbon\Carbon::parse($validated['featured_until']) : null;
        }
        if (isset($validated['is_featured']) && !$validated['is_featured']) {
            $productData['featured_until'] = null;
        }

        if (isset($validated['hot_duration_days']) && !empty($validated['hot_duration_days'])) {
            $productData['hot_until'] = now()->addDays((int) $validated['hot_duration_days']);
        } elseif (array_key_exists('hot_until', $validated)) {
            $productData['hot_until'] = $validated['hot_until'] ? \Carbon\Carbon::parse($validated['hot_until']) : null;
        }
        if (isset($validated['is_hot']) && !$validated['is_hot']) {
            $productData['hot_until'] = null;
        }

        if (isset($validated['new_duration_days']) && !empty($validated['new_duration_days'])) {
            $productData['new_until'] = now()->addDays((int) $validated['new_duration_days']);
        } elseif (array_key_exists('new_until', $validated)) {
            $productData['new_until'] = $validated['new_until'] ? \Carbon\Carbon::parse($validated['new_until']) : null;
        }
        if (isset($validated['is_new']) && !$validated['is_new']) {
            $productData['new_until'] = null;
        }

        // Validate Video URL if provided (YouTube or Facebook)
        if (!empty($validated['video_url'])) {
            $vUrl = trim($validated['video_url']);
            $isYt = preg_match('#^(?:https?://)?(?:www\.)?(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/)|youtu\.be/)([a-zA-Z0-9_-]{11})#i', $vUrl);
            $dummyProduct = new Product(['video_url' => $vUrl]);
            $isFb = $dummyProduct->isFacebookVideo();
            if (!$isYt && !$isFb) {
                $err = "Video URL must be a valid YouTube link (e.g. https://www.youtube.com/watch?v=...) or Facebook video link (e.g. https://www.facebook.com/.../videos/... or https://fb.watch/...).";
                return $this->error($err, 422, ['video_url' => [$err]]);
            }
            $productData['video_url'] = $vUrl;
        } else {
            $productData['video_url'] = null;
        }

        // Preorder: clear estimated_delivery_date when preorder is explicitly disabled
        if (isset($validated['is_preorder']) && !$validated['is_preorder']) {
            $productData['estimated_delivery_date'] = null;
        }

        if (isset($validated['is_sold_out'])) {
            $productData['is_sold_out'] = (bool) $validated['is_sold_out'];
        }

        $rawDesignType = $validated['design_type'] ?? $validated['designType'] ?? null;
        if ($rawDesignType) {
            $dt = strtoupper(trim($rawDesignType));
            $productData['design_type'] = ($dt === 'MC' || $dt === 'REPLICA' || $dt === 'MASTER COPY')
                ? Product::DESIGN_TYPE_MASTER_COPY
                : Product::DESIGN_TYPE_ORIGINAL;
        } else {
            $productData['design_type'] = $isPublished ? Product::DESIGN_TYPE_ORIGINAL : null;
        }

        // Inline brand creation / resolution
        if (!empty($validated['new_brand_name'])) {
            $brandName = trim($validated['new_brand_name']);
            $brandSlug = \Illuminate\Support\Str::slug($brandName);
            $brandLogo = $validated['new_brand_logo'] ?? null;
            $brand = \App\Models\Brand::firstOrCreate(
                ['slug' => $brandSlug],
                ['name' => $brandName, 'logo_url' => $brandLogo, 'is_active' => true]
            );
            $productData['brand_id'] = $brand->id;
        } elseif (!empty($validated['brand']) && empty($productData['brand_id']) && !is_numeric($validated['brand'])) {
            $brandName = trim($validated['brand']);
            $brandSlug = \Illuminate\Support\Str::slug($brandName);
            $brand = \App\Models\Brand::firstOrCreate(
                ['slug' => $brandSlug],
                ['name' => $brandName, 'is_active' => true]
            );
            $productData['brand_id'] = $brand->id;
        }

        // Derive MOQ automatically from package allocations if present
        $allocSum = 0;
        if (!empty($validated['package_allocations']) && is_array($validated['package_allocations'])) {
            foreach ($validated['package_allocations'] as $pa) {
                if (isset($pa['quantity']) && $pa['quantity'] !== '' && $pa['quantity'] !== null) {
                    if (!is_numeric($pa['quantity']) || (int)$pa['quantity'] < 0 || (float)$pa['quantity'] != (int)$pa['quantity']) {
                        return $this->error("Package allocation quantity must be a non-negative whole integer", 422);
                    }
                    if ((int)$pa['quantity'] > 100000) {
                        return $this->error("Package allocation quantity exceeds maximum allowed limit", 422);
                    }
                    $allocSum += (int)$pa['quantity'];
                }
            }

            $explicitMoq = isset($productData['moq']) ? (int) $productData['moq'] : null;
            if ($allocSum > 0) {
                if ($explicitMoq !== null && $explicitMoq !== $allocSum && $explicitMoq % $allocSum !== 0 && $allocSum % $explicitMoq !== 0) {
                    return $this->error("Package allocation total ({$allocSum} pcs) must equal or be compatible with product MOQ ({$explicitMoq} pcs)", 422);
                }
                $productData['moq'] = $allocSum;
            }
        }

        // Enforce MOQ >= 1 only when publishing
        $effectiveMoq = isset($productData['moq']) ? (int) $productData['moq'] : null;
        if ($isPublished && ($effectiveMoq === null || $effectiveMoq < 1) && empty($validated['package_allocations'])) {
            return $this->error("The MOQ (Minimum Order Quantity) is required and must be at least 1.", 422);
        }
        $moq = $effectiveMoq !== null ? (int) $effectiveMoq : ($isPublished ? 1 : null);
        $productData['moq'] = $moq;

        // Resolve target warehouse: for draft, initial warehouse is NEVER auto-selected!
        $warehouseId = $validated['warehouse_id'] ?? $validated['initial_inventory']['warehouse_id'] ?? null;
        $targetWarehouseId = null;
        if (!$warehouseId) {
            if ($isPublished) {
                return $this->error("Initial warehouse is required.", 422);
            }
            // For drafts: starts unselected (NULL) — do NOT auto-assign warehouse
            $targetWarehouseId = null;
        } else {
            $whCheck = \App\Models\Warehouse::where('id', $warehouseId)->first();
            if (!$whCheck || !$whCheck->is_active) {
                return $this->error("The selected warehouse is inactive or does not exist.", 422);
            }
            $targetWarehouseId = $whCheck->id;
        }

        // Resolve initial stock (>= 0)
        $initialStock = isset($validated['initial_stock'])
            ? (int) $validated['initial_stock']
            : (isset($validated['initial_inventory']['quantity'])
                ? (int) $validated['initial_inventory']['quantity']
                : (isset($validated['stock']) || $request->has('stock') ? (int) $request->input('stock') : null));
        if ($initialStock !== null && $initialStock < 0) {
            return $this->error("Initial stock cannot be negative.", 422);
        }

        $hasPricingTiers = $request->has('pricing_tiers') && is_array($request->input('pricing_tiers')) && count($request->input('pricing_tiers')) > 0;

        // Validate bulk tier pricing: only validated when Bulk Pricing is ENABLED
        if ($isBulkEnabled) {
            $bulkThresh = $productData['bulk_threshold'];
            $bulkPrice = $productData['bulk_price'];

            if ($isPublished) {
                if (empty($bulkThresh)) {
                    return $this->error("Bulk quantity threshold is required when bulk pricing is enabled.", 422);
                }
                if ((int) $bulkThresh <= $moq) {
                    return $this->error("Bulk threshold ({$bulkThresh}) must be strictly greater than MOQ ({$moq}).", 422);
                }
                if (empty($bulkPrice) || (float) $bulkPrice <= 0) {
                    return $this->error("Bulk tier price must be greater than 0.", 422);
                }
            } else {
                if (!empty($bulkThresh) && (int) $bulkThresh <= $moq) {
                    return $this->error("Bulk threshold ({$bulkThresh}) must be strictly greater than MOQ ({$moq}).", 422);
                }
            }
        }

        // Validate Pricing Tiers before transaction if provided
        if ($hasPricingTiers) {
            try {
                $this->validatePricingTiers($request->input('pricing_tiers'));
            } catch (\InvalidArgumentException $e) {
                return $this->error($e->getMessage(), 422);
            }
        }

        // Validate Shipping Package Profiles before transaction if provided
        $shippingProfiles = null;
        if ($request->has('shipping_package_profiles') && is_array($request->input('shipping_package_profiles'))) {
            $shippingProfiles = array_map(function ($p) use ($moq) {
                if (empty($p['package_quantity']) && empty($p['min_quantity'])) {
                    $p['package_quantity'] = $moq > 0 ? $moq : 1;
                }
                return $p;
            }, $request->input('shipping_package_profiles'));

            try {
                PackageCalculatorService::validateProfilesList($shippingProfiles);
            } catch (\InvalidArgumentException $e) {
                return $this->error($e->getMessage(), 422);
            }
        }

        $product = DB::transaction(function () use (
            $productData, $validated, $request, $moq, $user, $targetWarehouseId, $initialStock, $shippingProfiles
        ) {
            // Set purchase_price_updated_at when cost_price > 0 is provided
            if (isset($productData['cost_price']) && (float) $productData['cost_price'] > 0) {
                $productData['purchase_price_updated_at'] = now();
            }

            $product = Product::create($productData);

            $syncCats = !empty($validated['categories']) ? $validated['categories'] : (!empty($validated['category_id']) ? [$validated['category_id']] : []);
            if (!empty($syncCats)) {
                $product->categories()->sync($syncCats);
            }

            if ($product->is_featured) {
                \App\Models\HomepageFeaturedProduct::updateOrCreate(
                    ['product_id' => $product->id],
                    ['sort_order' => $product->featured_sort_order ?? 0, 'is_active' => true]
                );
            }

            // Sync images if provided
            if ($request->has('images') && is_array($request->input('images'))) {
                $order = 0;
                foreach ($request->input('images') as $img) {
                    $imageUrl = is_string($img) ? trim($img) : (is_array($img) ? trim($img['image_url'] ?? $img['url'] ?? '') : '');
                    if (empty($imageUrl) || $imageUrl === '/storage' || $imageUrl === '/storage/' || preg_match('#^https?://[^/]+/storage/?$#i', $imageUrl)) {
                        continue;
                    }

                    if (is_string($img)) {
                        \App\Models\ProductImage::create([
                            'product_id' => $product->id,
                            'image_url' => $imageUrl,
                            'sort_order' => $order,
                            'is_primary' => $order === 0,
                        ]);
                    } elseif (is_array($img)) {
                        \App\Models\ProductImage::create([
                            'product_id' => $product->id,
                            'image_url' => $imageUrl,
                            'alt_text' => $img['alt_text'] ?? null,
                            'sort_order' => $img['sort_order'] ?? $order,
                            'is_primary' => $img['is_primary'] ?? ($order === 0),
                        ]);
                    }
                    $order++;
                }
            }

            // Sync variants & allocate initial stock to the selected warehouse
            $createdVariantsMap = []; // key: "color-size" => ProductVariant
            if ($request->has('variants') && is_array($request->input('variants')) && count($request->input('variants')) > 0) {
                $variantsInput = $request->input('variants');
                $variantCount = count($variantsInput);

                // Check if any variant has explicit stock set
                $hasExplicitVariantStock = false;
                foreach ($variantsInput as $v) {
                    if (isset($v['stock']) && (int)$v['stock'] > 0) {
                        $hasExplicitVariantStock = true;
                        break;
                    }
                }

                // If initialStock was provided but variants have 0 stock, distribute initialStock across variants
                $distributedStock = [];
                if (!$hasExplicitVariantStock && $initialStock > 0 && $variantCount > 0) {
                    $baseStock = (int) floor($initialStock / $variantCount);
                    $remainder = $initialStock % $variantCount;
                    for ($i = 0; $i < $variantCount; $i++) {
                        $distributedStock[$i] = $baseStock + ($i === 0 ? $remainder : 0);
                    }
                }

                foreach ($variantsInput as $idx => $var) {
                    $vColor = $var['color'] ?? $product->color_name ?? 'Standard';
                    $vSize = $var['size'] ?? 'Standard';
                    $varStock = isset($var['stock']) && (int)$var['stock'] > 0
                        ? (int)$var['stock']
                        : ($distributedStock[$idx] ?? 0);

                    $createdVariant = \App\Models\ProductVariant::create([
                        'product_id' => $product->id,
                        'sku' => null,
                        'title' => $var['title'] ?? "{$vColor} / {$vSize}",
                        'size' => $vSize,
                        'color' => $vColor,
                        'price' => $var['price'] ?? $product->wholesale_price,
                        'compare_at_price' => $var['compare_at_price'] ?? null,
                        'stock' => $varStock,
                        'is_default' => $var['is_default'] ?? ($idx === 0),
                        'is_active' => $var['is_active'] ?? true,
                    ]);

                    $createdVariantsMap["{$vColor}-{$vSize}"] = $createdVariant;

                    // Create warehouse inventory row ONLY if a target warehouse was selected
                    if ($targetWarehouseId !== null) {
                        $inv = \App\Models\Inventory::create([
                            'product_variant_id' => $createdVariant->id,
                            'warehouse_id' => $targetWarehouseId,
                            'quantity' => $varStock,
                        ]);

                        // Audit log for stock initialization
                        if ($varStock > 0) {
                            \App\Models\AdminInventoryAdjustment::create([
                                'inventory_id' => $inv->id,
                                'admin_user_id' => $user->id,
                                'previous_quantity' => 0,
                                'adjustment_amount' => $varStock,
                                'resulting_quantity' => $varStock,
                                'reason' => 'Initial stock on product creation',
                            ]);
                        }
                    }
                }
            } else {
                // Product has zero variants: store stock at product level
                $resolvedStock = $initialStock !== null ? $initialStock : 0;
                $product->stock = $resolvedStock;
                $product->save();

                // Create product-level warehouse inventory row ONLY if target warehouse was selected
                if ($targetWarehouseId !== null) {
                    $inv = \App\Models\Inventory::create([
                        'product_id' => $product->id,
                        'product_variant_id' => null,
                        'warehouse_id' => $targetWarehouseId,
                        'quantity' => $resolvedStock,
                    ]);

                    // Audit log for stock initialization
                    if ($resolvedStock > 0) {
                        \App\Models\AdminInventoryAdjustment::create([
                            'inventory_id' => $inv->id,
                            'admin_user_id' => $user->id,
                            'previous_quantity' => 0,
                            'adjustment_amount' => $resolvedStock,
                            'resulting_quantity' => $resolvedStock,
                            'reason' => 'Initial stock on product creation',
                        ]);
                    }
                }
            }

            // Sync Pricing Tiers
            if ($request->has('pricing_tiers') && is_array($request->input('pricing_tiers')) && count($request->input('pricing_tiers')) > 0) {
                foreach ($request->input('pricing_tiers') as $tier) {
                    \App\Models\ProductPricingTier::create([
                        'product_id' => $product->id,
                        'min_quantity' => (int) $tier['min_quantity'],
                        'max_quantity' => isset($tier['max_quantity']) && $tier['max_quantity'] !== null ? (int) $tier['max_quantity'] : null,
                        'unit_price' => (float) $tier['unit_price'],
                    ]);
                }
            } elseif ($product->bulk_pricing_enabled && !empty($product->bulk_threshold) && !empty($product->bulk_price)) {
                \App\Models\ProductPricingTier::create([
                    'product_id' => $product->id,
                    'min_quantity' => $moq,
                    'max_quantity' => (int) $product->bulk_threshold - 1,
                    'unit_price' => (float) $product->wholesale_price,
                ]);
                \App\Models\ProductPricingTier::create([
                    'product_id' => $product->id,
                    'min_quantity' => (int) $product->bulk_threshold,
                    'max_quantity' => null,
                    'unit_price' => (float) $product->bulk_price,
                ]);
            } elseif ($product->wholesale_price !== null && (float)$product->wholesale_price > 0) {
                \App\Models\ProductPricingTier::create([
                    'product_id' => $product->id,
                    'min_quantity' => ($moq && $moq > 0 ? (int)$moq : 1),
                    'max_quantity' => null,
                    'unit_price' => (float) $product->wholesale_price,
                ]);
            }

            // Sync Package Allocations if provided
            if ($request->has('package_allocations') && is_array($request->input('package_allocations'))) {
                foreach ($request->input('package_allocations') as $alloc) {
                    $variantId = $alloc['product_variant_id'] ?? null;
                    $color = $alloc['color'] ?? null;
                    $size = $alloc['size'] ?? null;
                    $packageName = !empty($alloc['package_name']) ? trim($alloc['package_name']) : 'Universal Package';

                    if (!$variantId && $color && $size && isset($createdVariantsMap["{$color}-{$size}"])) {
                        $variantId = $createdVariantsMap["{$color}-{$size}"]->id;
                    }

                    if (!$variantId && $color && $size) {
                        $vMatch = \App\Models\ProductVariant::where('product_id', $product->id)
                            ->where('color', $color)
                            ->where('size', $size)
                            ->first();
                        $variantId = $vMatch?->id;
                    }

                    if (isset($alloc['quantity']) && $alloc['quantity'] !== '' && $alloc['quantity'] !== null) {
                        \App\Models\ProductPackageAllocation::create([
                            'product_id' => $product->id,
                            'package_name' => $packageName,
                            'product_variant_id' => $variantId,
                            'color' => $color ?? $vMatch?->color,
                            'size' => $size ?? $vMatch?->size,
                            'quantity' => (int) $alloc['quantity'],
                        ]);
                    }
                }
            }

            // Sync Shipping Package Profiles if provided
            if (!empty($shippingProfiles)) {
                foreach ($shippingProfiles as $p) {
                    ProductShippingPackageProfile::create([
                        'product_id' => $product->id,
                        'package_quantity' => (int) ($p['package_quantity'] ?? $p['min_quantity']),
                        'quantity_max' => isset($p['quantity_max']) && $p['quantity_max'] !== null ? (int) $p['quantity_max'] : null,
                        'carton_count' => max(1, (int) ($p['carton_count'] ?? 1)),
                        'carton_length' => (float) ($p['carton_length'] ?? 0),
                        'carton_width' => (float) ($p['carton_width'] ?? 0),
                        'carton_height' => (float) ($p['carton_height'] ?? 0),
                        'dimension_unit' => strtolower(trim($p['dimension_unit'] ?? 'cm')),
                        'gross_weight' => (float) ($p['gross_weight'] ?? 0),
                        'net_weight' => isset($p['net_weight']) && $p['net_weight'] !== null ? (float) $p['net_weight'] : null,
                        'weight_unit' => strtolower(trim($p['weight_unit'] ?? 'kg')),
                        'notes' => $p['notes'] ?? null,
                        'is_active' => $p['is_active'] ?? true,
                    ]);
                }
            }

            return $product;
        });

        $product->load([
            'brand',
            'supplier',
            'categories',
            'images',
            'variants.inventories.warehouse',
            'pricingTiers',
            'packageAllocations',
            'shippingPackageProfiles'
        ]);

        CatalogCacheService::invalidateProduct($product);
        ActivityLogger::log('product.created', $product, [
            'name' => $product->name,
            'sku' => $product->sku,
            'wholesale_price' => $product->wholesale_price,
            'cost_price' => $product->cost_price,
            'initial_stock' => $initialStock,
            'warehouse_id' => $targetWarehouseId,
        ]);

        return $this->success(new ProductResource($product), 'Product created successfully', 201);
    }

    /**
     * PUT /api/v1/products/{id} (Admin)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $product = is_numeric($id)
            ? Product::find((int) $id)
            : Product::where('product_id', $id)->orWhere('slug', $id)->orWhere('sku', $id)->first();

        if (!$product) {
            return $this->notFound('Product not found');
        }

        $effectivePreorder = $request->has('is_preorder')
            ? $request->boolean('is_preorder')
            : (bool) $product->is_preorder;
        $effectiveStatus = $request->input('status', $product->status);
        $isPublished = $effectiveStatus === 'published';
        $isPreorderPublish = $effectivePreorder && $isPublished;

        if ($request->has('productId') && !$request->has('product_id')) {
            $request->merge(['product_id' => $request->input('productId')]);
        }
        if ($request->has('product_id')) {
            $rawPid = (string) $request->input('product_id');
            $normalizedPid = preg_replace('/\s+/', '', $rawPid);
            if ($normalizedPid !== '') {
                $request->merge(['product_id' => $normalizedPid]);
            } elseif (!empty($product->product_id)) {
                // Never erase an already saved product_id on partial update
                $request->merge(['product_id' => $product->product_id]);
            } else {
                $request->merge(['product_id' => null]);
            }
        }
        $productIdInput = (string) ($request->input('product_id') ?? $product->product_id);

        // Normalize Standard Unit Price aliases (standard_price, standardPrice, wholesale_price, wholesalePrice)
        $standardPriceInput = $request->input('standard_price', $request->input('standardPrice', $request->input('wholesale_price', $request->input('wholesalePrice'))));
        if ($standardPriceInput !== null) {
            $request->merge([
                'wholesale_price' => $standardPriceInput,
                'standard_price' => $standardPriceInput,
            ]);
        }
        if ($request->has('fullStockPrice') && !$request->has('full_stock_price')) {
            $request->merge(['full_stock_price' => $request->input('fullStockPrice')]);
        }
        if ($request->has('costPrice') && !$request->has('cost_price')) {
            $request->merge(['cost_price' => $request->input('costPrice')]);
        }
        if ($request->has('supplierId') && !$request->has('supplier_id')) {
            $request->merge(['supplier_id' => $request->input('supplierId')]);
        }

        $validated = $request->validate([
            'product_id' => [
                'sometimes',
                $isPublished ? 'required' : 'nullable',
                'string',
                'max:100',
                'regex:/^[A-Za-z0-9\-\/]+$/',
                Rule::unique('products', 'product_id')->ignore($product->id)->whereNull('deleted_at'),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', Rule::unique('products', 'slug')->ignore($product->id)->whereNull('deleted_at')],
            'sku' => ['sometimes', 'string', Rule::unique('products', 'sku')->ignore($product->id)->whereNull('deleted_at')],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'brand' => ['nullable', 'string'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'supplierId' => ['nullable', 'exists:suppliers,id'],
            'new_brand_name' => ['nullable', 'string', 'max:255'],
            'new_brand_logo' => ['nullable', 'string'],
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seoTitle' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string'],
            'seoDescription' => ['nullable', 'string'],
            'keywords' => ['nullable', 'array'],
            'keywords.*' => ['string', 'max:100'],
            'seo_keywords' => ['nullable', 'array'],
            'seo_keywords.*' => ['string', 'max:100'],
            'material' => ['nullable', 'string'],
            'size_description' => ['nullable', 'string', 'max:255'],
            'sizeDescription' => ['nullable', 'string', 'max:255'],
            'colour_description' => ['nullable', 'string', 'max:255'],
            'colourDescription' => ['nullable', 'string', 'max:255'],
            'package_assortment_visible' => ['nullable', 'boolean'],
            'packageAssortmentVisible' => ['nullable', 'boolean'],
            'package_assortment_message' => ['nullable', 'string'],
            'packageAssortmentMessage' => ['nullable', 'string'],
            'color_name' => ['nullable', 'string'],
            'color_hex' => ['nullable', 'string'],
            'audience' => ['nullable', 'string'],
            'design_type' => ['nullable', 'string'],
            'designType' => ['nullable', 'string'],
            'product_type' => ['nullable', 'string'],
            'wholesale_price' => ['sometimes', 'numeric', $isPublished ? 'min:0.01' : 'min:0'],
            'wholesalePrice' => ['nullable', 'numeric'],
            'standard_price' => ['sometimes', 'nullable', 'numeric', $isPublished ? 'min:0.01' : 'min:0'],
            'standardPrice' => ['nullable', 'numeric'],
            'bulk_pricing_enabled' => ['nullable', 'boolean'],
            'bulkPricingEnabled' => ['nullable', 'boolean'],
            'bulk_threshold' => ['nullable', 'integer', 'min:1'],
            'bulkThreshold' => ['nullable', 'integer', 'min:1'],
            'bulk_minimum_quantity' => ['nullable', 'integer', 'min:1'],
            'bulk_price' => ['nullable', 'numeric', 'min:0.01'],
            'bulkPrice' => ['nullable', 'numeric', 'min:0.01'],
            'bulk_unit_price' => ['nullable', 'numeric', 'min:0.01'],
            'full_stock_price' => ['sometimes', $isPublished ? 'required' : 'nullable', 'numeric', $isPublished ? 'gt:0' : 'min:0'],
            'fullStockPrice' => ['nullable', 'numeric'],
            'msrp_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0.01'],
            'costPrice' => ['nullable', 'numeric'],
            'moq' => ['nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'string', 'in:draft,published,archived'],
            'is_hidden_from_storefront' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'featured_sort_order' => ['nullable', 'integer'],
            'featured_until' => ['nullable', 'date'],
            'featured_duration_days' => ['nullable', 'integer', 'min:1'],
            'is_hot' => ['sometimes', 'boolean'],
            'hot_until' => ['nullable', 'date'],
            'hot_duration_days' => ['nullable', 'integer', 'min:1'],
            'is_new' => ['sometimes', 'boolean'],
            'new_until' => ['nullable', 'date'],
            'new_duration_days' => ['nullable', 'integer', 'min:1'],
            'is_limited_deal' => ['nullable', 'boolean'],
            'is_best_deal' => ['nullable', 'boolean'],
            'is_preorder' => ['nullable', 'boolean'],
            'is_sold_out' => ['nullable', 'boolean'],
            'estimated_delivery_date' => $isPreorderPublish
                ? ['required', 'date', 'after_or_equal:today']
                : ['nullable', 'date', 'after_or_equal:today'],
            'video_url' => ['nullable', 'string', 'max:1000'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'categories' => ['nullable', 'array'],
            'images' => ['nullable', 'array'],
            'images.*' => ['nullable', function ($attr, $value, $fail) {
                $checkUrl = function ($url) use ($fail) {
                    if (!is_string($url)) return;
                    if (str_starts_with($url, 'data:')) {
                        $fail('Image URLs must be HTTP/HTTPS URLs, not base64 data URIs. Please upload the image first via the upload endpoint.');
                    }
                    $trimmed = trim($url);
                    if ($trimmed === '/storage' || $trimmed === '/storage/' || $trimmed === 'storage' || preg_match('#^https?://[^/]+/storage/?$#i', $trimmed)) {
                        $fail('Image URL must point to a specific stored file, not the root storage directory.');
                    }
                };
                if (is_string($value)) {
                    $checkUrl($value);
                } elseif (is_array($value)) {
                    $checkUrl($value['image_url'] ?? $value['url'] ?? null);
                }
            }],
            'variants' => ['nullable', 'array'],
            'pricing_tiers' => ['nullable', 'array'],
            'package_allocations' => ['nullable', 'array'],
            'shipping_package_profiles' => ['nullable', 'array'],
        ], [
            'product_id.required' => 'Product ID is required.',
            'product_id.unique' => "Product ID {$productIdInput} is already in use.",
            'product_id.regex' => 'Product ID may only contain letters, numbers, hyphens (-), and slashes (/).',
            'wholesale_price.required' => 'Standard unit price is required to publish.',
            'wholesale_price.min' => 'Standard unit price must be greater than $0.00 to publish.',
            'standard_price.required' => 'Standard unit price is required to publish.',
            'standard_price.min' => 'Standard unit price must be greater than $0.00 to publish.',
        ]);

        $effectiveSoldOut = $request->has('is_sold_out')
            ? $request->boolean('is_sold_out')
            : (bool) $product->is_sold_out;
        $effectivePreorder = $request->has('is_preorder')
            ? $request->boolean('is_preorder')
            : (bool) $product->is_preorder;

        if ($effectiveSoldOut && $effectivePreorder) {
            return response()->json([
                'message' => 'A product cannot be marked as both Pre-Order and Sold Out. Please choose either Pre-Order or Sold Out.',
                'errors' => [
                    'is_sold_out' => ['A product cannot be marked as both Pre-Order and Sold Out. Please choose either Pre-Order or Sold Out.']
                ]
            ], 422);
        }

        $user = $request->user();

        // Status transition enforcement
        if (array_key_exists('status', $validated)) {
            $newStatus = $validated['status'];
            $oldStatus = $product->status;
            if ($newStatus !== $oldStatus) {
                if ($newStatus === 'published' && !$this->authorization->can($user, 'product.publish')) {
                    return $this->forbidden("Forbidden: you do not have the 'product.publish' permission to publish products.");
                }
                if ($newStatus === 'archived' && !$this->authorization->can($user, 'product.archive')) {
                    return $this->forbidden("Forbidden: you do not have the 'product.archive' permission to archive products.");
                }
                if ($newStatus === 'draft' && !$this->authorization->can($user, 'product.save_draft')) {
                    return $this->forbidden("Forbidden: you do not have the 'product.save_draft' permission to save drafts.");
                }
            }
        }

        // When publishing a draft, enforce full publication requirements
        $isTransitionToPublished = $product->status !== 'published' && $effectiveStatus === 'published';
        if ($isTransitionToPublished) {
            $effectiveName = $request->input('name', $product->name);
            if (empty($effectiveName) || strlen(trim($effectiveName)) < 3) {
                return $this->error("Product name is required to publish.", 422);
            }

            // Resolve authoritative standard customer selling price
            $effectiveStandard = $standardPriceInput !== null
                ? $standardPriceInput
                : ($product->wholesale_price !== null && (float)$product->wholesale_price > 0 ? $product->wholesale_price : null);

            // Also check pricing_tiers if standard price not set on root
            if (($effectiveStandard === null || (float)$effectiveStandard <= 0) && $request->has('pricing_tiers') && is_array($request->input('pricing_tiers')) && !empty($request->input('pricing_tiers')[0]['unit_price'])) {
                $tierPrice = (float) $request->input('pricing_tiers')[0]['unit_price'];
                if ($tierPrice > 0) {
                    $effectiveStandard = $tierPrice;
                    $request->merge(['wholesale_price' => $effectiveStandard, 'standard_price' => $effectiveStandard]);
                }
            }

            if ($effectiveStandard === null || (float)$effectiveStandard <= 0) {
                return $this->error("Standard unit price must be greater than $0.00 to publish.", 422);
            }

            $hasWh = !empty($request->input('warehouse_id'))
                || !empty($request->input('warehouseId'))
                || !empty($request->input('initial_inventory.warehouse_id'))
                || $product->directInventories()->exists()
                || $product->inventories()->exists();
            if (!$hasWh) {
                return $this->error("Initial warehouse is required.", 422);
            }
        }

        // If currently published and pricing is updated, ensure standard price is not set to fake zero
        if ($isPublished && $request->hasAny(['wholesale_price', 'standard_price', 'standardPrice', 'wholesalePrice'])) {
            $checkVal = $request->input('standard_price', $request->input('standardPrice', $request->input('wholesale_price', $request->input('wholesalePrice'))));
            if ($checkVal === null || (float)$checkVal <= 0) {
                return $this->error("Standard unit price must be greater than $0.00 to publish.", 422);
            }
        }

        // Pricing protection
        $hasPricingChanges = $request->hasAny(['wholesale_price', 'wholesalePrice', 'standard_price', 'standardPrice', 'bulk_price', 'bulkPrice', 'bulk_threshold', 'bulkThreshold', 'bulk_pricing_enabled', 'bulkPricingEnabled', 'cost_price', 'costPrice', 'full_stock_price', 'fullStockPrice', 'pricing_tiers']);
        if ($hasPricingChanges && !$this->authorization->can($user, 'product.pricing.manage')) {
            return $this->forbidden("Forbidden: you do not have the 'product.pricing.manage' permission to update pricing.");
        }

        // Variant protection
        if ($request->has('variants') && !$this->authorization->can($user, 'product.variant.manage')) {
            return $this->forbidden("Forbidden: you do not have the 'product.variant.manage' permission.");
        }

        // Package and shipping profile protection
        if ($request->hasAny(['shipping_package_profiles', 'package_allocations']) && !$this->authorization->can($user, 'product.shipping_profile.manage')) {
            return $this->forbidden("Forbidden: you do not have the 'product.shipping_profile.manage' permission.");
        }

        $productData = collect($validated)->except([
            'categories', 'images', 'variants', 'pricing_tiers', 'package_allocations', 'shipping_package_profiles',
            'new_brand_name', 'new_brand_logo', 'brand', 'designType',
            'sizeDescription', 'colourDescription', 'packageAssortmentVisible', 'packageAssortmentMessage',
            'seoTitle', 'seoDescription', 'seo_keywords',
            'bulkPricingEnabled', 'bulkThreshold', 'bulkPrice', 'bulk_minimum_quantity', 'bulk_unit_price',
            'featured_duration_days', 'hot_duration_days', 'new_duration_days',
            'standardPrice', 'standard_price', 'wholesalePrice',
            'fullStockPrice', 'costPrice',
        ])->toArray();

        if ($standardPriceInput !== null) {
            $productData['wholesale_price'] = (float) $standardPriceInput;
        }

        if (array_key_exists('sizeDescription', $validated) && !array_key_exists('size_description', $validated)) {
            $productData['size_description'] = $validated['sizeDescription'];
        }
        if (array_key_exists('colourDescription', $validated) && !array_key_exists('colour_description', $validated)) {
            $productData['colour_description'] = $validated['colourDescription'];
        }
        if (array_key_exists('packageAssortmentVisible', $validated) && !array_key_exists('package_assortment_visible', $validated)) {
            $productData['package_assortment_visible'] = $validated['packageAssortmentVisible'];
        }
        if (array_key_exists('packageAssortmentMessage', $validated) && !array_key_exists('package_assortment_message', $validated)) {
            $productData['package_assortment_message'] = $validated['packageAssortmentMessage'];
        }
        if (array_key_exists('package_assortment_message', $productData)) {
            $msg = trim($productData['package_assortment_message'] ?? '');
            $productData['package_assortment_message'] = $msg !== '' ? $productData['package_assortment_message'] : Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;
        }
        if (array_key_exists('seoTitle', $validated) && !array_key_exists('seo_title', $validated)) {
            $productData['seo_title'] = $validated['seoTitle'];
        }
        if (array_key_exists('seoDescription', $validated) && !array_key_exists('seo_description', $validated)) {
            $productData['seo_description'] = $validated['seoDescription'];
        }
        if (array_key_exists('seo_keywords', $validated) && !array_key_exists('keywords', $validated)) {
            $productData['keywords'] = $validated['seo_keywords'];
        }

        // Resolve explicit Bulk Pricing state on update
        $isBulkExplicitlySet = $request->has('bulk_pricing_enabled') || $request->has('bulkPricingEnabled');
        if ($isBulkExplicitlySet) {
            $isBulkEnabled = $request->boolean('bulk_pricing_enabled') || $request->boolean('bulkPricingEnabled');
            $productData['bulk_pricing_enabled'] = $isBulkEnabled;
            if ($isBulkEnabled) {
                $rawThresh = $request->input('bulk_threshold') ?? $request->input('bulkThreshold') ?? $request->input('bulk_minimum_quantity') ?? $product->bulk_threshold;
                $rawPrice = $request->input('bulk_price') ?? $request->input('bulkPrice') ?? $request->input('bulk_unit_price') ?? $product->bulk_price;
                $productData['bulk_threshold'] = !empty($rawThresh) ? (int) $rawThresh : null;
                $productData['bulk_price'] = !empty($rawPrice) ? (float) $rawPrice : null;
            } else {
                $productData['bulk_threshold'] = null;
                $productData['bulk_price'] = null;
            }
        } elseif ($request->hasAny(['bulk_threshold', 'bulkThreshold', 'bulk_minimum_quantity', 'bulk_price', 'bulkPrice', 'bulk_unit_price'])) {
            $rawThresh = $request->input('bulk_threshold') ?? $request->input('bulkThreshold') ?? $request->input('bulk_minimum_quantity') ?? $product->bulk_threshold;
            $rawPrice = $request->input('bulk_price') ?? $request->input('bulkPrice') ?? $request->input('bulk_unit_price') ?? $product->bulk_price;
            if (!empty($rawThresh) && !empty($rawPrice) && (float) $rawPrice > 0) {
                $productData['bulk_pricing_enabled'] = true;
                $productData['bulk_threshold'] = (int) $rawThresh;
                $productData['bulk_price'] = (float) $rawPrice;
            }
        }

        // Handle Promotional Badge Scheduling
        if (isset($validated['featured_duration_days']) && !empty($validated['featured_duration_days'])) {
            $productData['featured_until'] = now()->addDays((int) $validated['featured_duration_days']);
        } elseif (array_key_exists('featured_until', $validated)) {
            $productData['featured_until'] = $validated['featured_until'] ? \Carbon\Carbon::parse($validated['featured_until']) : null;
        }
        if (isset($validated['is_featured']) && !$validated['is_featured']) {
            $productData['featured_until'] = null;
        }

        if (isset($validated['hot_duration_days']) && !empty($validated['hot_duration_days'])) {
            $productData['hot_until'] = now()->addDays((int) $validated['hot_duration_days']);
        } elseif (array_key_exists('hot_until', $validated)) {
            $productData['hot_until'] = $validated['hot_until'] ? \Carbon\Carbon::parse($validated['hot_until']) : null;
        }
        if (isset($validated['is_hot']) && !$validated['is_hot']) {
            $productData['hot_until'] = null;
        }

        if (isset($validated['new_duration_days']) && !empty($validated['new_duration_days'])) {
            $productData['new_until'] = now()->addDays((int) $validated['new_duration_days']);
        } elseif (array_key_exists('new_until', $validated)) {
            $productData['new_until'] = $validated['new_until'] ? \Carbon\Carbon::parse($validated['new_until']) : null;
        }
        if (isset($validated['is_new']) && !$validated['is_new']) {
            $productData['new_until'] = null;
        }

        // Preorder: clear estimated_delivery_date when preorder is explicitly disabled
        if (isset($validated['is_preorder']) && !$validated['is_preorder']) {
            $productData['estimated_delivery_date'] = null;
        }

        if (isset($validated['is_sold_out'])) {
            $productData['is_sold_out'] = (bool) $validated['is_sold_out'];
        }

        // Validate Video URL if provided (YouTube or Facebook)
        if (array_key_exists('video_url', $validated)) {
            if (!empty($validated['video_url'])) {
                $vUrl = trim($validated['video_url']);
                $isYt = preg_match('#^(?:https?://)?(?:www\.)?(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/)|youtu\.be/)([a-zA-Z0-9_-]{11})#i', $vUrl);
                $dummyProduct = new Product(['video_url' => $vUrl]);
                $isFb = $dummyProduct->isFacebookVideo();
                if (!$isYt && !$isFb) {
                    $err = "Video URL must be a valid YouTube link (e.g. https://www.youtube.com/watch?v=...) or Facebook video link (e.g. https://www.facebook.com/.../videos/... or https://fb.watch/...).";
                    return $this->error($err, 422, ['video_url' => [$err]]);
                }
                $productData['video_url'] = $vUrl;
            } else {
                $productData['video_url'] = null;
            }
        }

        $rawDesignType = $validated['design_type'] ?? $validated['designType'] ?? null;
        if ($rawDesignType) {
            $dt = strtoupper(trim($rawDesignType));
            $productData['design_type'] = ($dt === 'MC' || $dt === 'REPLICA' || $dt === 'MASTER COPY')
                ? Product::DESIGN_TYPE_MASTER_COPY
                : Product::DESIGN_TYPE_ORIGINAL;
        }

        // Inline brand creation / resolution
        if (!empty($validated['new_brand_name'])) {
            $brandName = trim($validated['new_brand_name']);
            $brandSlug = \Illuminate\Support\Str::slug($brandName);
            $brandLogo = $validated['new_brand_logo'] ?? null;
            $brand = \App\Models\Brand::firstOrCreate(
                ['slug' => $brandSlug],
                ['name' => $brandName, 'logo_url' => $brandLogo, 'is_active' => true]
            );
            $productData['brand_id'] = $brand->id;
        } elseif (!empty($validated['brand']) && empty($productData['brand_id']) && !is_numeric($validated['brand'])) {
            $brandName = trim($validated['brand']);
            $brandSlug = \Illuminate\Support\Str::slug($brandName);
            $brand = \App\Models\Brand::firstOrCreate(
                ['slug' => $brandSlug],
                ['name' => $brandName, 'is_active' => true]
            );
            $productData['brand_id'] = $brand->id;
        }

        // Derive MOQ automatically from package allocations if present
        if ($request->has('package_allocations') && is_array($request->input('package_allocations'))) {
            $allocSum = 0;
            foreach ($request->input('package_allocations') as $pa) {
                if (isset($pa['quantity']) && $pa['quantity'] !== '' && $pa['quantity'] !== null) {
                    if (!is_numeric($pa['quantity']) || (int)$pa['quantity'] < 0 || (float)$pa['quantity'] != (int)$pa['quantity']) {
                        return $this->error("Package allocation quantity must be a non-negative whole integer", 422);
                    }
                    if ((int)$pa['quantity'] > 100000) {
                        return $this->error("Package allocation quantity exceeds maximum allowed limit", 422);
                    }
                    $allocSum += (int)$pa['quantity'];
                }
            }
            $explicitMoq = isset($productData['moq']) ? (int) $productData['moq'] : null;
            if ($allocSum > 0) {
                if ($explicitMoq !== null && $explicitMoq !== $allocSum && $explicitMoq % $allocSum !== 0 && $allocSum % $explicitMoq !== 0) {
                    return $this->error("Package allocation total ({$allocSum} pcs) must equal or be compatible with product MOQ ({$explicitMoq} pcs)", 422);
                }
                $productData['moq'] = $allocSum;
            }
        }

        $effectiveMoq = (int) ($productData['moq'] ?? $product->moq ?? 1);
        $effectiveBulkEnabled = isset($productData['bulk_pricing_enabled']) ? (bool)$productData['bulk_pricing_enabled'] : (bool)$product->bulk_pricing_enabled;

        if ($effectiveBulkEnabled) {
            $effectiveBulkThresh = isset($productData['bulk_threshold']) ? (int)$productData['bulk_threshold'] : (int)$product->bulk_threshold;
            $effectiveBulkPrice = isset($productData['bulk_price']) ? (float)$productData['bulk_price'] : (float)$product->bulk_price;

            if ($isPublished) {
                if (empty($effectiveBulkThresh)) {
                    return $this->error("Bulk quantity threshold is required when bulk pricing is enabled.", 422);
                }
                if ($effectiveBulkThresh <= $effectiveMoq) {
                    return $this->error("Bulk threshold ({$effectiveBulkThresh}) must be strictly greater than MOQ ({$effectiveMoq})", 422);
                }
                if (empty($effectiveBulkPrice) || $effectiveBulkPrice <= 0) {
                    return $this->error("Bulk tier price must be greater than 0.", 422);
                }
            } elseif ($effectiveBulkThresh > 0 && $effectiveBulkThresh <= $effectiveMoq) {
                return $this->error("Bulk threshold ({$effectiveBulkThresh}) must be strictly greater than MOQ ({$effectiveMoq})", 422);
            }
        }

        // Update purchase_price_updated_at when a valid cost_price > 0 is being saved
        if (isset($productData['cost_price']) && (float) $productData['cost_price'] > 0) {
            $productData['purchase_price_updated_at'] = $product->purchase_price_updated_at ?? now();
        }

        $product->update($productData);

        if ($request->has('categories')) {
            $catInputs = (array) $request->input('categories', []);
            if (!empty($catInputs)) {
                $product->categories()->sync($catInputs);
            }
        } elseif ($request->has('category_id') && !empty($request->input('category_id'))) {
            $product->categories()->sync(array_filter([(int) $request->input('category_id')]));
        }

        if (isset($validated['is_featured'])) {
            if ($validated['is_featured']) {
                \App\Models\HomepageFeaturedProduct::updateOrCreate(
                    ['product_id' => $product->id],
                    ['sort_order' => $validated['featured_sort_order'] ?? $product->featured_sort_order ?? 0, 'is_active' => true]
                );
            } else {
                \App\Models\HomepageFeaturedProduct::where('product_id', $product->id)->delete();
            }
        } elseif (isset($validated['featured_sort_order']) && $product->is_featured) {
            \App\Models\HomepageFeaturedProduct::where('product_id', $product->id)->update([
                'sort_order' => $validated['featured_sort_order'],
            ]);
        }

        // Update images if provided
        if ($request->has('images') && is_array($request->input('images'))) {
            $product->images()->delete();
            $order = 0;
            foreach ($request->input('images') as $img) {
                $imageUrl = is_string($img) ? trim($img) : (is_array($img) ? trim($img['image_url'] ?? $img['url'] ?? '') : '');
                if (empty($imageUrl) || $imageUrl === '/storage' || $imageUrl === '/storage/' || preg_match('#^https?://[^/]+/storage/?$#i', $imageUrl)) {
                    continue;
                }

                if (is_string($img)) {
                    \App\Models\ProductImage::create([
                        'product_id' => $product->id,
                        'image_url' => $imageUrl,
                        'sort_order' => $order,
                        'is_primary' => $order === 0,
                    ]);
                } elseif (is_array($img)) {
                    \App\Models\ProductImage::create([
                        'product_id' => $product->id,
                        'image_url' => $imageUrl,
                        'alt_text' => $img['alt_text'] ?? null,
                        'sort_order' => $order,
                        'is_primary' => $order === 0,
                    ]);
                }
                $order++;
            }
        }

        // Update variants if provided
        $variantsMap = [];
        if ($request->has('variants') && is_array($request->input('variants'))) {
            $inputVariants = $request->input('variants');
            if (count($inputVariants) === 0) {
                // Deselecting all variants: mark all existing variants as inactive
                $product->allVariants()->update(['is_active' => false]);
                // Remove product draft package allocations
                $product->packageAllocations()->delete();

                // If stock provided, update product stock and direct warehouse inventory
                $stockVal = (int) ($request->input('stock') ?? $request->input('initial_stock') ?? $product->stock ?? 0);
                $product->stock = $stockVal;
                $product->save();

                $targetWhId = $request->input('warehouse_id') ?? $request->input('warehouseId') ?? $request->input('initial_inventory.warehouse_id');
                $wh = !empty($targetWhId) ? \App\Models\Warehouse::where('id', $targetWhId)->where('is_active', true)->first() : null;
                $mainWh = $wh ?: ($product->directInventories()->first()?->warehouse ?? $product->inventories()->first()?->warehouse ?? null);
                if ($mainWh) {
                    \App\Models\Inventory::updateOrCreate(
                        ['product_id' => $product->id, 'product_variant_id' => null, 'warehouse_id' => $mainWh->id],
                        ['quantity' => $stockVal]
                    );
                }
            } else {
                foreach ($inputVariants as $var) {
                    $vColor = $var['color'] ?? $product->color_name ?? 'Standard';
                    $vSize = $var['size'] ?? 'Standard';

                    $existingVar = null;
                    if (!empty($var['id'])) {
                        $existingVar = \App\Models\ProductVariant::where('id', $var['id'])
                            ->where('product_id', $product->id)
                            ->first();
                    }
                    if (!$existingVar && !empty($vColor) && !empty($vSize)) {
                        $existingVar = \App\Models\ProductVariant::where('product_id', $product->id)
                            ->where('color', $vColor)
                            ->where('size', $vSize)
                            ->first();
                    }

                    if ($existingVar) {
                        $existingVar->update([
                            'title' => $var['title'] ?? $existingVar->title,
                            'size' => $vSize,
                            'color' => $vColor,
                            'price' => $var['price'] ?? $existingVar->price,
                            'compare_at_price' => $var['compare_at_price'] ?? $existingVar->compare_at_price,
                            'stock' => $var['stock'] ?? $existingVar->stock,
                            'is_default' => $var['is_default'] ?? $existingVar->is_default,
                            'is_active' => $var['is_active'] ?? true,
                        ]);
                        $variantsMap["{$vColor}-{$vSize}"] = $existingVar;
                    } else {
                        $newVar = \App\Models\ProductVariant::create([
                            'product_id' => $product->id,
                            'sku' => null,
                            'title' => $var['title'] ?? "{$vColor} / {$vSize}",
                            'size' => $vSize,
                            'color' => $vColor,
                            'price' => $var['price'] ?? $product->wholesale_price,
                            'compare_at_price' => $var['compare_at_price'] ?? null,
                            'stock' => $var['stock'] ?? 0,
                            'is_default' => $var['is_default'] ?? false,
                            'is_active' => $var['is_active'] ?? true,
                        ]);

                        $variantsMap["{$vColor}-{$vSize}"] = $newVar;

                        $targetWhId = $request->input('warehouse_id') ?? $request->input('warehouseId') ?? $request->input('initial_inventory.warehouse_id');
                        $wh = !empty($targetWhId) ? \App\Models\Warehouse::where('id', $targetWhId)->where('is_active', true)->first() : null;
                        $mainWh = $wh ?: ($product->directInventories()->first()?->warehouse ?? $product->inventories()->first()?->warehouse ?? null);
                        if ($mainWh) {
                            \App\Models\Inventory::create([
                                'product_variant_id' => $newVar->id,
                                'warehouse_id' => $mainWh->id,
                                'quantity' => $newVar->stock,
                            ]);
                        }
                    }
                }
            }
        } else {
            // Variant-less product inventory handling:
            // If the product has NO inventories yet (e.g. uninitialized draft first publishing),
            // initialize initial stock and warehouse with audit record.
            $hasExistingInventory = $product->directInventories()->exists() || $product->inventories()->exists();
            $whInputId = $request->input('warehouse_id') ?? $request->input('warehouseId') ?? $request->input('initial_inventory.warehouse_id');
            $hasStockInput = $request->has('stock') || $request->has('initial_stock');

            if (!$hasExistingInventory) {
                if ($hasStockInput) {
                    $stockVal = (int) ($request->input('stock') ?? $request->input('initial_stock') ?? 0);
                    $product->stock = $stockVal;
                    $product->save();
                }

                if (!empty($whInputId)) {
                    $wh = \App\Models\Warehouse::where('id', $whInputId)->where('is_active', true)->first();
                    if ($wh && !$product->variants()->where('is_active', true)->exists()) {
                        $inv = \App\Models\Inventory::create([
                            'product_id' => $product->id,
                            'product_variant_id' => null,
                            'warehouse_id' => $wh->id,
                            'quantity' => $product->stock ?? 0,
                        ]);
                        if (($product->stock ?? 0) > 0) {
                            \App\Models\AdminInventoryAdjustment::create([
                                'inventory_id' => $inv->id,
                                'admin_user_id' => $user->id,
                                'previous_quantity' => 0,
                                'adjustment_amount' => (int) $product->stock,
                                'resulting_quantity' => (int) $product->stock,
                                'reason' => 'Initial stock on product publication',
                            ]);
                        }
                    }
                }
            } elseif ($product->status === 'draft' && !empty($whInputId) && !$product->variants()->where('is_active', true)->exists()) {
                // In draft lifecycle, admin can reassign warehouse and stock before publication
                $wh = \App\Models\Warehouse::where('id', $whInputId)->where('is_active', true)->first();
                if ($wh) {
                    $stockVal = $hasStockInput ? (int) ($request->input('stock') ?? $request->input('initial_stock') ?? 0) : ($product->stock ?? 0);
                    $product->stock = $stockVal;
                    $product->save();

                    $existingInv = \App\Models\Inventory::where('product_id', $product->id)
                        ->whereNull('product_variant_id')
                        ->first();
                    if ($existingInv) {
                        $existingInv->update([
                            'warehouse_id' => $wh->id,
                            'quantity' => $stockVal,
                        ]);
                    } else {
                        \App\Models\Inventory::create([
                            'product_id' => $product->id,
                            'product_variant_id' => null,
                            'warehouse_id' => $wh->id,
                            'quantity' => $stockVal,
                        ]);
                    }
                }
            }
        }

        // Update pricing tiers
        if ($request->has('pricing_tiers') && is_array($request->input('pricing_tiers'))) {
            try {
                $this->validatePricingTiers($request->input('pricing_tiers'));
            } catch (\InvalidArgumentException $e) {
                return $this->error($e->getMessage(), 422);
            }

            $product->pricingTiers()->delete();
            foreach ($request->input('pricing_tiers') as $tier) {
                \App\Models\ProductPricingTier::create([
                    'product_id' => $product->id,
                    'min_quantity' => (int) $tier['min_quantity'],
                    'max_quantity' => isset($tier['max_quantity']) && $tier['max_quantity'] !== null ? (int) $tier['max_quantity'] : null,
                    'unit_price' => (float) $tier['unit_price'],
                ]);
            }
        } elseif ($product->bulk_pricing_enabled && $product->bulk_threshold && $product->bulk_price) {
            $product->pricingTiers()->delete();
            \App\Models\ProductPricingTier::create([
                'product_id' => $product->id,
                'min_quantity' => $effectiveMoq,
                'max_quantity' => (int) $product->bulk_threshold - 1,
                'unit_price' => (float) $product->wholesale_price,
            ]);
            \App\Models\ProductPricingTier::create([
                'product_id' => $product->id,
                'min_quantity' => (int) $product->bulk_threshold,
                'max_quantity' => null,
                'unit_price' => (float) $product->bulk_price,
            ]);
        } elseif ($product->wholesale_price !== null && (float)$product->wholesale_price > 0) {
            $product->pricingTiers()->delete();
            \App\Models\ProductPricingTier::create([
                'product_id' => $product->id,
                'min_quantity' => $effectiveMoq > 0 ? $effectiveMoq : 1,
                'max_quantity' => null,
                'unit_price' => (float) $product->wholesale_price,
            ]);
        }

        // Update package allocations if provided
        if ($request->has('package_allocations') && is_array($request->input('package_allocations'))) {
            $inputAllocs = $request->input('package_allocations');
            if (!empty($inputAllocs) || ($request->has('variants') && count($request->input('variants', [])) === 0)) {
                $product->packageAllocations()->delete();
                foreach ($inputAllocs as $alloc) {
                $variantId = $alloc['product_variant_id'] ?? null;
                $color = $alloc['color'] ?? null;
                $size = $alloc['size'] ?? null;
                $packageName = !empty($alloc['package_name']) ? trim($alloc['package_name']) : 'Universal Package';

                if (!$variantId && $color && $size && isset($variantsMap["{$color}-{$size}"])) {
                    $variantId = $variantsMap["{$color}-{$size}"]->id;
                }

                if (!$variantId && $color && $size) {
                    $vMatch = \App\Models\ProductVariant::where('product_id', $product->id)
                        ->where('color', $color)
                        ->where('size', $size)
                        ->first();
                    $variantId = $vMatch?->id;
                }

                // Explicit 0 or positive integer is saved; empty/null is skipped (unconfigured)
                if (isset($alloc['quantity']) && $alloc['quantity'] !== '' && $alloc['quantity'] !== null) {
                    \App\Models\ProductPackageAllocation::create([
                        'product_id' => $product->id,
                        'package_name' => $packageName,
                        'product_variant_id' => $variantId,
                        'color' => $color ?? $vMatch?->color,
                        'size' => $size ?? $vMatch?->size,
                        'quantity' => (int) $alloc['quantity'],
                    ]);
                }
            }
        }
    }

        // Update shipping package profiles if provided
        if ($request->has('shipping_package_profiles') && is_array($request->input('shipping_package_profiles'))) {
            $shippingProfiles = array_map(function ($p) use ($effectiveMoq) {
                if (empty($p['package_quantity']) && empty($p['min_quantity'])) {
                    $p['package_quantity'] = $effectiveMoq > 0 ? $effectiveMoq : 1;
                }
                return $p;
            }, $request->input('shipping_package_profiles'));

            try {
                PackageCalculatorService::validateProfilesList($shippingProfiles);
            } catch (\InvalidArgumentException $e) {
                return $this->error($e->getMessage(), 422);
            }

            $product->shippingPackageProfiles()->delete();
            foreach ($shippingProfiles as $p) {
                ProductShippingPackageProfile::create([
                    'product_id' => $product->id,
                    'package_quantity' => (int) ($p['package_quantity'] ?? $p['min_quantity']),
                    'quantity_max' => isset($p['quantity_max']) && $p['quantity_max'] !== null ? (int) $p['quantity_max'] : null,
                    'carton_count' => max(1, (int) ($p['carton_count'] ?? 1)),
                    'carton_length' => (float) ($p['carton_length'] ?? 0),
                    'carton_width' => (float) ($p['carton_width'] ?? 0),
                    'carton_height' => (float) ($p['carton_height'] ?? 0),
                    'dimension_unit' => strtolower(trim($p['dimension_unit'] ?? 'cm')),
                    'gross_weight' => (float) ($p['gross_weight'] ?? 0),
                    'net_weight' => isset($p['net_weight']) && $p['net_weight'] !== null ? (float) $p['net_weight'] : null,
                    'weight_unit' => strtolower(trim($p['weight_unit'] ?? 'kg')),
                    'notes' => $p['notes'] ?? null,
                    'is_active' => $p['is_active'] ?? true,
                ]);
            }
        }

        $product->load(['brand', 'supplier', 'categories', 'images', 'variants', 'pricingTiers', 'packageAllocations', 'shippingPackageProfiles']);

        CatalogCacheService::invalidateProduct($product);
        ActivityLogger::log('product.updated', $product, [
            'name' => $product->name,
            'sku' => $product->sku,
            'changes' => $product->getChanges(),
            'wholesale_price' => $product->wholesale_price,
            'cost_price' => $product->cost_price,
        ]);

        return $this->success(new ProductResource($product), 'Product updated successfully');
    }

    /**
     * GET /api/v1/products/{id}/shipping-specs
     * Calculate live physical shipment specifications for any selected quantity
     */
    public function shippingSpecs(Request $request, string $slugOrId): JsonResponse
    {
        $user = auth('sanctum')->user() ?: $request->user();
        $isAdmin = $user && $user->isAdmin();

        $query = Product::with('shippingPackageProfiles')
            ->where(function ($q) use ($slugOrId) {
                $q->where('slug', $slugOrId);
                if (is_numeric($slugOrId)) {
                    $q->orWhere('id', (int) $slugOrId);
                }
            });

        if (!$isAdmin) {
            $query->where('status', 'published')
                  ->where('is_hidden_from_storefront', false);
        }

        $product = $query->first();

        if (!$product) {
            return $this->notFound('Product not found');
        }

        $quantity = max(1, (int) $request->input('quantity', $product->moq ?? 1));
        $isFullStock = $request->boolean('is_full_stock') || $request->boolean('full_stock');

        $specs = $product->calculateShipmentSpecsForQuantity($quantity, $isFullStock);
        return $this->success($specs, 'Shipment package specifications resolved');
    }

    /**
     * DELETE /api/v1/products/{id} (Admin)
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'product.delete')) {
            return $this->forbidden("Forbidden: you do not have the 'product.delete' permission to delete products.");
        }

        // If client sends a client-side draft ID (e.g. draft_local_new or draft_*), treat as successful discard
        if ($id === 'draft_local_new' || str_starts_with($id, 'draft_') || str_starts_with($id, 'temp_')) {
            return $this->success(null, 'Draft deleted successfully');
        }

        $product = is_numeric($id)
            ? Product::find((int) $id)
            : Product::where('slug', $id)->orWhere('sku', $id)->first();

        if (!$product) {
            return $this->notFound('Product not found or already deleted');
        }

        try {
            DB::transaction(function () use ($product) {
                CatalogCacheService::invalidateProduct($product);
                ActivityLogger::log('product.deleted', $product, [
                    'name' => $product->name,
                    'sku' => $product->sku,
                ]);

                // Release unique constraints (slug, SKU, and product_id) so they can be immediately reused
                $uniqueSuffix = '-deleted-' . $product->id . '-' . time();
                $needsSave = false;
                if (!str_contains($product->slug, '-deleted-')) {
                    $product->slug = substr($product->slug, 0, 200) . $uniqueSuffix;
                    $needsSave = true;
                }
                if (!str_contains($product->sku, '-del-')) {
                    $product->sku = substr($product->sku, 0, 200) . '-del-' . $product->id . '-' . time();
                    $needsSave = true;
                }
                if ($product->product_id && !str_contains($product->product_id, '-del-')) {
                    $product->product_id = substr($product->product_id, 0, 200) . '-del-' . $product->id . '-' . time();
                    $needsSave = true;
                }
                if ($needsSave) {
                    $product->saveQuietly();
                }

                // Clean up non-historical transient relationships
                HomepageFeaturedProduct::where('product_id', $product->id)->delete();
                CartItem::where('product_id', $product->id)->delete();
                WishlistItem::where('product_id', $product->id)->delete();

                // Soft-delete the product (order_items and quotation_items remain preserved with historical snapshot)
                $product->delete();
            });

            return $this->success(null, 'Product deleted successfully');
        } catch (\Exception $e) {
            Log::error('Product deletion error: ' . $e->getMessage(), [
                'product_id' => $product->id,
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->error('Failed to delete product due to a server error. Please try again.', 500);
        }
    }

    /**
     * PATCH /api/v1/products/{id}/toggle-storefront-visibility (Admin)
     * Toggles whether the product is hidden from customer storefront without altering status or data
     */
    public function toggleStorefrontVisibility(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'product.edit')) {
            return $this->forbidden("Forbidden: you do not have the 'product.edit' permission to modify product storefront visibility.");
        }

        $product = is_numeric($id)
            ? Product::find((int) $id)
            : Product::where('slug', $id)->orWhere('sku', $id)->first();

        if (!$product) {
            return $this->notFound('Product not found');
        }

        $product->is_hidden_from_storefront = !$product->is_hidden_from_storefront;
        $product->save();

        CatalogCacheService::invalidateProduct($product);

        ActivityLogger::log('product.storefront_visibility_toggled', $product, [
            'name' => $product->name,
            'sku' => $product->sku,
            'is_hidden_from_storefront' => $product->is_hidden_from_storefront,
        ]);

        return $this->success(new ProductResource($product), 'Product storefront visibility updated successfully');
    }

    /**
     * POST /api/v1/products/{id}/images (Admin)
     * Non-destructive product image upload using Laravel Filesystem abstraction
     */
    public function uploadImage(Request $request, string $slugOrId): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'product.image.upload')) {
            return $this->forbidden("Forbidden: you do not have the 'product.image.upload' permission to upload product images.");
        }

        $product = Product::where('slug', $slugOrId)
            ->orWhere('id', is_numeric($slugOrId) ? (int) $slugOrId : -1)
            ->firstOrFail();

        $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp,gif,bmp,avif', 'max:20480'],
            'is_primary' => ['nullable', 'boolean'],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ], [
            'image.required' => 'Please select an image file to upload.',
            'image.file' => 'The uploaded item must be a valid file.',
            'image.image' => 'The file must be a valid image.',
            'image.mimes' => 'Unsupported format. Supported formats: JPG, PNG, WebP, GIF, BMP, AVIF.',
            'image.max' => 'The image exceeds the 20 MB maximum file size limit. Please upload an image under 20 MB.',
        ]);

        $file = $request->file('image');
        $context = [
            'product_id' => $product->id,
            'admin_id'   => $user?->id,
            'source_ip'  => $request->ip(),
        ];

        try {
            $pipeline = app(\App\Services\Media\ProductImagePipelineService::class);
            $result = $pipeline->processAndStore($file, 'products', $context);
            $url = $result['url'];
            $relativePath = $result['path'] ?? null;
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            \Illuminate\Support\Facades\Log::error('Product image upload failed (runtime)', [
                'product_id'        => $product->id,
                'admin_id'          => $user?->id,
                'filename'          => $file->getClientOriginalName(),
                'size'              => $file->getSize(),
                'mime'              => $file->getMimeType(),
                'exception_class'   => get_class($e),
                'exception_message' => $e->getMessage(),
            ]);
            return $this->serverError($e->getMessage());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Product image upload unexpected failure', [
                'product_id'        => $product->id,
                'admin_id'          => $user?->id,
                'filename'          => $file->getClientOriginalName(),
                'size'              => $file->getSize(),
                'mime'              => $file->getMimeType(),
                'exception_class'   => get_class($e),
                'exception_message' => $e->getMessage(),
            ]);
            return $this->serverError('Image processing failed. Please try again.');
        }

        try {
            DB::beginTransaction();

            $isPrimary = $request->boolean('is_primary');
            if ($isPrimary) {
                $product->images()->update(['is_primary' => false]);
            } else {
                // If this is the first image, make it primary
                $isPrimary = $product->images()->count() === 0;
            }

            $nextSortOrder = ($product->images()->max('sort_order') ?? -1) + 1;

            $productImage = $product->images()->create([
                'image_url' => $url,
                'alt_text' => $request->input('alt_text', $product->name),
                'sort_order' => $nextSortOrder,
                'is_primary' => $isPrimary,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            // Atomic cleanup: remove newly stored WebP if database creation failed
            if (!empty($relativePath) && Storage::disk('public')->exists($relativePath)) {
                Storage::disk('public')->delete($relativePath);
            }

            \Illuminate\Support\Facades\Log::error('Failed to create product image database record', [
                'product_id'        => $product->id,
                'admin_id'          => $user?->id,
                'relative_path'     => $relativePath,
                'exception_class'   => get_class($e),
                'exception_message' => $e->getMessage(),
            ]);

            return $this->serverError('Failed to record product media. Please try again.');
        }

        CatalogCacheService::invalidateProduct($product);

        return $this->success(new \App\Http\Resources\Api\V1\ProductImageResource($productImage), 'Image uploaded successfully', 201);
    }

    /**
     * DELETE /api/v1/products/{id}/images/{imageId} (Admin)
     */
    public function deleteImage(Request $request, string $slugOrId, int $imageId): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'product.image.delete')) {
            return $this->forbidden("Forbidden: you do not have the 'product.image.delete' permission to delete product images.");
        }

        $product = Product::where('slug', $slugOrId)
            ->orWhere('id', is_numeric($slugOrId) ? (int) $slugOrId : -1)
            ->firstOrFail();

        $image = $product->images()->where('id', $imageId)->firstOrFail();

        // Attempt removing from storage disk if stored locally
        if (str_contains($image->image_url, '/storage/')) {
            $relativePath = str_replace(asset('storage/'), '', $image->image_url);
            \Illuminate\Support\Facades\Storage::disk('public')->delete($relativePath);
        }

        $wasPrimary = $image->is_primary;
        $image->delete();

        // If primary was deleted, promote the first remaining image
        if ($wasPrimary) {
            $firstRemaining = $product->images()->orderBy('sort_order', 'asc')->first();
            if ($firstRemaining) {
                $firstRemaining->update(['is_primary' => true]);
            }
        }

        CatalogCacheService::invalidateProduct($product);

        return $this->success(null, 'Image deleted successfully');
    }

    /**
     * PUT /api/v1/products/{id}/images/reorder (Admin)
     */
    public function reorderImages(Request $request, string $slugOrId): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'product.image.reorder')) {
            return $this->forbidden("Forbidden: you do not have the 'product.image.reorder' permission to reorder product images.");
        }

        $product = Product::where('slug', $slugOrId)
            ->orWhere('id', is_numeric($slugOrId) ? (int) $slugOrId : -1)
            ->firstOrFail();

        $validated = $request->validate([
            'image_ids' => ['required', 'array'],
            'image_ids.*' => ['integer', 'exists:product_images,id'],
        ]);

        foreach ($validated['image_ids'] as $idx => $id) {
            $product->images()->where('id', $id)->update([
                'sort_order' => $idx,
                'is_primary' => ($idx === 0),
            ]);
        }

        CatalogCacheService::invalidateProduct($product);

        $product->load('images');
        return $this->success(\App\Http\Resources\Api\V1\ProductImageResource::collection($product->images), 'Images reordered successfully');
    }

    /**
     * Validate pricing tiers for boundaries, overlaps, and positive prices
     */
    protected function validatePricingTiers(array $tiers): void
    {
        if (empty($tiers)) return;

        // Sort tiers by min_quantity ascending
        usort($tiers, fn($a, $b) => ($a['min_quantity'] ?? 0) <=> ($b['min_quantity'] ?? 0));

        $prevMax = 0;
        foreach ($tiers as $idx => $tier) {
            $min = (int) ($tier['min_quantity'] ?? 0);
            $max = isset($tier['max_quantity']) && $tier['max_quantity'] !== null ? (int) $tier['max_quantity'] : null;
            $price = (float) ($tier['unit_price'] ?? 0);

            if ($min <= 0) {
                throw new \InvalidArgumentException("Tier minimum quantity must be greater than 0");
            }
            if ($price <= 0) {
                throw new \InvalidArgumentException("Tier unit price must be greater than 0");
            }
            if ($max !== null && $max < $min) {
                throw new \InvalidArgumentException("Tier max quantity ({$max}) cannot be less than min quantity ({$min})");
            }
            if ($idx > 0) {
                if ($prevMax === null) {
                    throw new \InvalidArgumentException("Cannot have additional tiers after an unlimited tier");
                }
                if ($min <= $prevMax) {
                    throw new \InvalidArgumentException("Pricing tier starting at {$min} overlaps with previous tier ending at {$prevMax}");
                }
            }
            $prevMax = $max;
        }
    }
}
