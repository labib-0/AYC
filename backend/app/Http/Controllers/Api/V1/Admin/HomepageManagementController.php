<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
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
use App\Services\Catalog\HomepageOrderingService;
use App\Services\Rbac\AdminAuthorizationService;
use App\Services\Security\StorefrontCountryAccessService;
use App\Services\Seo\GoogleVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class HomepageManagementController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization,
        private readonly HomepageOrderingService $orderingService,
        private readonly StorefrontCountryAccessService $accessService
    ) {}

    /**
     * GET /api/v1/admin/homepage
     *
     * Retrieve complete landing page management settings for Admin.
     */
    public function index(): JsonResponse
    {
        // 1. Current active or latest banner
        $banner = HomepageBanner::query()
            ->orderBy('is_active', 'desc')
            ->orderBy('sort_order', 'asc')
            ->orderBy('updated_at', 'desc')
            ->first();

        // All saved banners for history/selection
        $allBanners = HomepageBanner::query()
            ->orderBy('updated_at', 'desc')
            ->get();

        // 2. Featured brands (Shop By Brand) in order
        $featuredBrands = HomepageFeaturedBrand::query()
            ->with(['brand' => function ($q) {
                $q->select('id', 'name', 'slug', 'logo_url', 'website', 'sort_order', 'is_active', 'is_featured_on_landing', 'landing_sort_order');
            }])
            ->orderBy('sort_order', 'asc')
            ->get();

        // All active brands for selector
        $allBrands = Brand::query()
            ->select('id', 'name', 'slug', 'logo_url', 'website', 'sort_order', 'is_active', 'is_featured_on_landing', 'landing_sort_order')
            ->orderBy('sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        // 3. Hot sale categories in order
        $hotSaleCategories = HomepageHotSaleCategory::query()
            ->with(['category' => function ($q) {
                $q->select('id', 'name', 'slug', 'description', 'image_url', 'accent_color', 'sort_order', 'is_active', 'is_featured_on_landing', 'landing_sort_order');
            }])
            ->orderBy('sort_order', 'asc')
            ->get();

        // All active categories for selector
        $allCategories = Category::query()
            ->select('id', 'name', 'slug', 'description', 'image_url', 'accent_color', 'sort_order', 'is_active', 'is_featured_on_landing', 'landing_sort_order')
            ->orderBy('sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        // 4. Featured products in order
        $featuredProducts = HomepageFeaturedProduct::query()
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

        // 5. Ticker items in order
        $tickerItems = HomepageTickerItem::query()
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return $this->success([
            'banner' => $banner,
            'all_banners' => $allBanners,
            'site_logo' => SystemSetting::get('site_logo'),
            'hot_sale_visible' => SystemSetting::isHotSaleVisible(),
            'google_search_console_verification' => SystemSetting::getGoogleSearchConsoleVerification(),
            'ticker_items' => $tickerItems,
            'featured_brands' => $featuredBrands,
            'all_brands' => $allBrands,
            'hot_sale_categories' => $hotSaleCategories,
            'all_categories' => $allCategories,
            'featured_products' => $featuredProducts,
            'counts' => [
                'total_brands' => Brand::count(),
                'landing_brands' => $featuredBrands->where('is_active', true)->count(),
                'total_categories' => Category::count(),
                'landing_categories' => $hotSaleCategories->where('is_active', true)->count(),
                'total_products' => Product::where('status', 'published')->count(),
                'total_all_products' => Product::count(),
                'featured_products' => $featuredProducts->where('is_active', true)->count(),
            ],
        ], 'Admin homepage configuration retrieved');
    }

    /**
     * POST /api/v1/admin/homepage/banner
     *
     * Update or create the primary landing page promotional banner.
     */
    public function updateBanner(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => ['nullable', 'integer', 'exists:homepage_banners,id'],
            'headline' => ['required', 'string', 'max:150'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'cta_text' => ['nullable', 'string', 'max:100'],
            'destination_type' => ['nullable', 'string', 'max:50'],
            'destination_value' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'file' => ['nullable', 'file', 'image', 'mimes:jpeg,jpg,png,webp,svg', 'max:10240'],
        ]);

        $imagePath = null;
        $imageUrl = $validated['image_url'] ?? null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $imagePath = $file->store('banners', 'public');
            $imageUrl = asset('storage/' . $imagePath);
        }

        $isActive = true;

        $user = $request->user();
        if (!$this->authorization->can($user, 'homepage.banner.edit')) {
            return $this->forbidden("Forbidden: you do not have permission to edit the homepage banner.");
        }

        DB::beginTransaction();
        try {
            // Save Changes persists and immediately activates the banner
            HomepageBanner::query()->where('is_active', true)->update(['is_active' => false]);

            if (!empty($validated['id'])) {
                $banner = HomepageBanner::findOrFail($validated['id']);
                $updateData = [
                    'headline' => $validated['headline'],
                    'subtitle' => $validated['subtitle'] ?? null,
                    'cta_text' => $validated['cta_text'] ?? 'EXPLORE CATALOG →',
                    'destination_type' => $validated['destination_type'] ?? 'anchor',
                    'destination_value' => $validated['destination_value'] ?? '#featured',
                    'is_active' => $isActive,
                    'updated_by' => auth()->id(),
                ];
                if ($imageUrl) {
                    $updateData['image_url'] = $imageUrl;
                }
                if ($imagePath) {
                    $updateData['image_path'] = $imagePath;
                }
                $banner->update($updateData);
            } else {
                $banner = HomepageBanner::first();
                if ($banner) {
                    $updateData = [
                        'headline' => $validated['headline'],
                        'subtitle' => $validated['subtitle'] ?? null,
                        'cta_text' => $validated['cta_text'] ?? 'EXPLORE CATALOG →',
                        'destination_type' => $validated['destination_type'] ?? 'anchor',
                        'destination_value' => $validated['destination_value'] ?? '#featured',
                        'is_active' => $isActive,
                        'updated_by' => auth()->id(),
                    ];
                    if ($imageUrl) {
                        $updateData['image_url'] = $imageUrl;
                    }
                    if ($imagePath) {
                        $updateData['image_path'] = $imagePath;
                    }
                    $banner->update($updateData);
                } else {
                    $banner = HomepageBanner::create([
                        'headline' => $validated['headline'],
                        'subtitle' => $validated['subtitle'] ?? null,
                        'cta_text' => $validated['cta_text'] ?? 'EXPLORE CATALOG →',
                        'destination_type' => $validated['destination_type'] ?? 'anchor',
                        'destination_value' => $validated['destination_value'] ?? '#featured',
                        'image_url' => $imageUrl ?? '/images/homepage-banner.jpg',
                        'image_path' => $imagePath,
                        'is_active' => $isActive,
                        'sort_order' => 0,
                        'created_by' => auth()->id(),
                        'updated_by' => auth()->id(),
                    ]);
                }
            }

            DB::commit();

            CatalogCacheService::invalidateAll();

            return $this->success($banner, 'Homepage banner saved successfully');
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->error('Failed to save homepage banner: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/admin/homepage/brands
     *
     * Synchronize and reorder Shop By Brand landing page brands.
     */
    public function syncFeaturedBrands(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'brands' => ['present', 'array'],
            'brands.*.brand_id' => ['required', 'integer', 'exists:brands,id'],
            'brands.*.sort_order' => ['nullable', 'integer'],
            'brands.*.is_active' => ['nullable', 'boolean'],
        ]);

        try {
            $updated = $this->orderingService->syncFeaturedBrands($validated['brands']);
            return $this->success($updated, 'Shop By Brand landing page brands updated successfully');
        } catch (\Throwable $e) {
            return $this->error('Failed to update landing page brands: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/admin/homepage/hot-sale-categories
     *
     * Synchronize and reorder Hot Sale categories.
     */
    public function syncHotSaleCategories(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'categories' => ['present', 'array'],
            'categories.*.category_id' => ['required', 'integer', 'exists:categories,id'],
            'categories.*.sort_order' => ['nullable', 'integer'],
            'categories.*.is_active' => ['nullable', 'boolean'],
        ]);

        try {
            $updated = $this->orderingService->syncHotSaleCategories($validated['categories']);
            return $this->success($updated, 'Hot Sale categories updated successfully');
        } catch (\Throwable $e) {
            return $this->error('Failed to update Hot Sale categories: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/admin/homepage/featured-products
     *
     * Synchronize and manually reorder Featured Products.
     */
    public function syncFeaturedProducts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'products' => ['present', 'array'],
            'products.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'products.*.sort_order' => ['nullable', 'integer'],
            'products.*.is_active' => ['nullable', 'boolean'],
        ]);

        try {
            // Transaction and model updates handled by HomepageOrderingService:
            // 'featured_sort_order' => $item['sort_order']
            $updated = $this->orderingService->syncFeaturedProducts($validated['products']);
            return $this->success($updated, 'Featured products updated successfully');
        } catch (\Throwable $e) {
            return $this->error('Failed to update Featured products: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/admin/homepage/search-brands
     *
     * Paginated search for brands to add to Shop By Brand on landing page.
     */
    public function searchBrands(Request $request): JsonResponse
    {
        $search = trim((string) $request->input('q', $request->input('search', '')));
        $perPage = min(max((int) $request->input('per_page', 5), 1), 50);
        $excludeIds = $request->input('exclude_ids', []);
        if (is_string($excludeIds)) {
            $excludeIds = array_filter(array_map('trim', explode(',', $excludeIds)));
        }

        $query = Brand::query()
            ->where('is_active', true)
            ->withCount('products');

        if (!empty($excludeIds)) {
            $query->whereNotIn('id', $excludeIds);
        }

        if (!empty($search)) {
            $lower = '%' . strtolower($search) . '%';
            $query->where(function ($q) use ($lower, $search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$lower])
                  ->orWhereRaw('LOWER(slug) LIKE ?', [$lower]);
                if (is_numeric($search)) {
                    $q->orWhere('id', (int) $search);
                }
            });
        }

        $paginated = $query->orderBy('name', 'asc')->paginate($perPage);

        return $this->success([
            'items' => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ], 'Brands retrieved for landing page selector');
    }

    /**
     * GET /api/v1/admin/homepage/search-categories
     *
     * Paginated search for categories to add to Hot Sale on landing page.
     */
    public function searchCategories(Request $request): JsonResponse
    {
        $search = trim((string) $request->input('q', $request->input('search', '')));
        $perPage = min(max((int) $request->input('per_page', 5), 1), 50);
        $excludeIds = $request->input('exclude_ids', []);
        if (is_string($excludeIds)) {
            $excludeIds = array_filter(array_map('trim', explode(',', $excludeIds)));
        }

        $query = Category::query()
            ->where('is_active', true)
            ->withCount('products');

        if (!empty($excludeIds)) {
            $query->whereNotIn('id', $excludeIds);
        }

        if (!empty($search)) {
            $lower = '%' . strtolower($search) . '%';
            $query->where(function ($q) use ($lower, $search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$lower])
                  ->orWhereRaw('LOWER(slug) LIKE ?', [$lower]);
                if (is_numeric($search)) {
                    $q->orWhere('id', (int) $search);
                }
            });
        }

        $paginated = $query->orderBy('name', 'asc')->paginate($perPage);

        return $this->success([
            'items' => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ], 'Categories retrieved for landing page selector');
    }

    /**
     * GET /api/v1/admin/homepage/search-products
     *
     * Paginated search for products to add to Featured Products.
     */
    public function searchProducts(Request $request): JsonResponse
    {
        $search = trim((string) $request->input('q', $request->input('search', '')));
        $categoryId = $request->input('category_id');
        $brandId = $request->input('brand_id');
        $perPage = min(max((int) $request->input('per_page', 5), 1), 50);
        $excludeIds = $request->input('exclude_ids', []);
        if (is_string($excludeIds)) {
            $excludeIds = array_filter(array_map('trim', explode(',', $excludeIds)));
        }

        $query = Product::query()
            ->where('status', 'published')
            ->whereNull('deleted_at')
            ->with([
                'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
                'brand',
                'categories',
            ]);

        if (!empty($excludeIds)) {
            $query->whereNotIn('id', $excludeIds);
        }

        if (!empty($search)) {
            $lower = '%' . strtolower($search) . '%';
            $query->where(function ($q) use ($lower, $search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$lower])
                  ->orWhereRaw('LOWER(sku) LIKE ?', [$lower]);
                if (is_numeric($search)) {
                    $q->orWhere('id', (int) $search);
                }
                $q->orWhereHas('brand', function ($bq) use ($lower) {
                    $bq->whereRaw('LOWER(name) LIKE ?', [$lower]);
                })
                ->orWhereHas('categories', function ($cq) use ($lower) {
                    $cq->whereRaw('LOWER(name) LIKE ?', [$lower]);
                });
            });
        }

        if (!empty($categoryId)) {
            $query->whereHas('categories', function ($cq) use ($categoryId) {
                $cq->where('categories.id', $categoryId);
            });
        }

        if (!empty($brandId)) {
            $query->where('brand_id', $brandId);
        }

        $paginated = $query->orderBy('id', 'desc')->paginate($perPage);

        return $this->success([
            'items' => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ], 'Products retrieved for landing page selector');
    }

    /**
     * POST /api/v1/admin/homepage/ticker
     *
     * Synchronize and persist Homepage ticker items (keywords).
     */
    public function syncTickerItems(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->authorization->can($user, 'homepage.banner.edit') &&
            !$this->authorization->can($user, 'homepage.view')) {
            return $this->forbidden("Forbidden: you do not have permission to manage homepage ticker items.");
        }

        $validated = $request->validate([
            'items' => ['present', 'array'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.text' => ['required', 'string', 'max:255'],
            'items.*.is_active' => ['nullable', 'boolean'],
            'items.*.sort_order' => ['nullable', 'integer'],
        ]);

        try {
            $savedItems = $this->orderingService->syncTickerItems($validated['items']);
            return $this->success($savedItems, 'Homepage ticker items saved successfully.');
        } catch (\Throwable $e) {
            return $this->error('Failed to save homepage ticker items: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/admin/homepage/hot-sale-visibility
     *
     * Toggle or update Hot Sale visibility setting.
     */
    public function updateHotSaleVisibility(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hot_sale_visible' => ['required', 'boolean'],
        ]);

        $visible = (bool) $validated['hot_sale_visible'];
        SystemSetting::set('hot_sale_visible', $visible, 'boolean', 'homepage');

        CatalogCacheService::invalidateAll();

        return $this->success([
            'hot_sale_visible' => $visible,
        ], 'Hot Sale visibility updated successfully.');
    }

    /**
     * POST /api/v1/admin/homepage/settings
     *
     * General homepage settings update endpoint.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hot_sale_visible' => ['nullable', 'boolean'],
            'google_search_console_verification' => ['nullable', 'string'],
        ]);

        if ($request->has('hot_sale_visible')) {
            $visible = (bool) $validated['hot_sale_visible'];
            SystemSetting::set('hot_sale_visible', $visible, 'boolean', 'homepage');
        }

        if ($request->has('google_search_console_verification')) {
            $rawToken = $request->input('google_search_console_verification');
            $parsed = GoogleVerificationService::parseAndValidate($rawToken);
            if (!$parsed['valid']) {
                return $this->error($parsed['error'], 422);
            }
            SystemSetting::setGoogleSearchConsoleVerification($parsed['token']);
            Cache::forget('site_settings_public');
        }

        CatalogCacheService::invalidateAll();

        return $this->success([
            'hot_sale_visible' => SystemSetting::isHotSaleVisible(),
            'google_search_console_verification' => SystemSetting::getGoogleSearchConsoleVerification(),
        ], 'Homepage settings saved successfully.');
    }

    /**
     * POST /api/v1/admin/homepage/seo
     *
     * Dedicated endpoint to update Google Search Console verification token.
     */
    public function updateGoogleSearchConsoleVerification(Request $request): JsonResponse
    {
        $user = $request->user();
        $canEdit = $user && (
            $user->isSuperAdmin() ||
            $this->authorization->can($user, 'settings.edit') ||
            $this->authorization->can($user, 'homepage.banner.edit')
        );

        if (!$canEdit) {
            return $this->forbidden('Forbidden: you do not have permission to manage homepage SEO verification.');
        }

        $input = $request->input('google_search_console_verification');
        $parsed = GoogleVerificationService::parseAndValidate($input);

        if (!$parsed['valid']) {
            return $this->error($parsed['error'], 422);
        }

        SystemSetting::setGoogleSearchConsoleVerification($parsed['token']);

        // Invalidate public caches immediately so storefront reflects new tag
        Cache::forget('site_settings_public');
        CatalogCacheService::invalidateAll();

        return $this->success([
            'google_search_console_verification' => $parsed['token'],
        ], $parsed['token'] ? 'Google Search Console verification code saved successfully.' : 'Google Search Console verification code removed.');
    }

    /**
     * GET /api/v1/admin/homepage/bangladesh-storefront-access
     *
     * Retrieve the real-time status of the Bangladesh customer storefront restriction.
     */
    public function getBangladeshStorefrontAccess(): JsonResponse
    {
        $status = $this->accessService->getStatus();
        return $this->success($status, 'Bangladesh storefront access status retrieved successfully.');
    }

    /**
     * PATCH /api/v1/admin/homepage/bangladesh-storefront-access
     *
     * Toggle the Bangladesh customer storefront restriction ON (blocked) or OFF (accessible).
     */
    public function updateBangladeshStorefrontAccess(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $user = $request->user();

        // Enforce RBAC permission: Must have settings.edit, homepage.banner.edit or be super admin
        $canEdit = $user && (
            $user->isSuperAdmin() ||
            $this->authorization->can($user, 'settings.edit') ||
            $this->authorization->can($user, 'homepage.banner.edit')
        );

        if (!$canEdit) {
            return $this->forbidden('You do not have administrative permission to modify storefront access restrictions.');
        }

        $this->accessService->setBlockEnabled((bool) $validated['enabled']);

        return $this->success(
            $this->accessService->getStatus(),
            'Bangladesh storefront access setting updated successfully.'
        );
    }
}
