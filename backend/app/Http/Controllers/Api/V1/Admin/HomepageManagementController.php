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
use Illuminate\Support\Facades\Log;
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
            ->orderBy('product_id', 'asc')
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
            'google_tag_head_code' => SystemSetting::getGoogleTagHeadCode(),
            'google_tag_body_code' => SystemSetting::getGoogleTagBodyCode(),
            'ticker_items' => $tickerItems,
            'featured_brands' => $featuredBrands,
            'all_brands' => $allBrands,
            'hot_sale_categories' => $hotSaleCategories,
            'all_categories' => $allCategories,
            'featured_products' => $featuredProducts,
            'footer_description' => SystemSetting::get('footer_description', 'Ready-made Garments Manufacturer & Exporter. Serving international retail chains and corporate apparel importers with export-grade ready-made garments.'),
            'office_address' => SystemSetting::get('office_address_formatted', 'House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh'),
            'contact_email' => SystemSetting::get('business_email', 'sales@ayaanclothing.com'),
            'contact_phone' => SystemSetting::get('business_phone', '+880 1620-853502'),
            'whatsapp_display' => SystemSetting::get('whatsapp_display', '+880 1620-853502'),
            'exporter_company_name' => SystemSetting::get('company_name', 'AYAAN CLOTHING'),
            'company_name' => SystemSetting::get('company_name', 'AYAAN CLOTHING'),
            'country_of_origin' => SystemSetting::get('office_country', 'Bangladesh'),
            'reg_number' => SystemSetting::get('reg_number', 'TRAD/DNCC/012458/2022'),
            'faqs' => SystemSetting::get('homepage_faqs', []),
            'social_links' => SystemSetting::get('social_links', []),
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
            $ext = strtolower($file->getClientOriginalExtension() ?: '');
            if ($ext === 'svg' || str_contains(strtolower($file->getClientMimeType() ?: ''), 'svg')) {
                $imagePath = $file->store('banners', 'public');
                $imageUrl = asset('storage/' . $imagePath);
            } else {
                $pipeline = app(\App\Services\Media\ProductImagePipelineService::class);
                $result = $pipeline->processAndStore($file, 'banners', ['action' => 'homepage_banner_upload']);
                $imageUrl = $result['url'];
            }
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

        $isAll = $request->boolean('all') || $request->input('per_page') === 'all' || (int) $request->input('per_page') === -1;
        if ($isAll) {
            $items = $query->orderByRaw('LOWER(name) ASC')->orderBy('id', 'asc')->get();
            return $this->success([
                'items' => $items,
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $items->count(),
                    'total' => $items->count(),
                ],
            ], 'Brands retrieved for landing page selector');
        }

        $paginated = $query->orderByRaw('LOWER(name) ASC')->orderBy('id', 'asc')->paginate($perPage);

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

        $isAll = $request->boolean('all') || $request->input('per_page') === 'all' || (int) $request->input('per_page') === -1;
        if ($isAll) {
            $items = $query->orderBy('name', 'asc')->get();
            return $this->success([
                'items' => $items,
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $items->count(),
                    'total' => $items->count(),
                ],
            ], 'Categories retrieved for landing page selector');
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

        $isAll = $request->boolean('all') || $request->input('per_page') === 'all' || (int) $request->input('per_page') === -1;
        if ($isAll) {
            $products = $query->orderBy('id', 'desc')->get();
            $items = $products->map(function ($product) {
                $data = $product->toArray();
                $data['primary_image_url'] = $product->primary_image_url;
                $data['brand_name'] = $product->brand?->name;
                $data['category_name'] = $product->categories?->first()?->name;
                $price = $product->wholesale_price ?? $product->selling_price ?? $product->base_price ?? null;
                $data['price'] = $price !== null ? (float) $price : null;
                $data['formatted_price'] = $price !== null ? '$' . number_format((float) $price, 2) : null;
                return $data;
            });

            return $this->success([
                'items' => $items,
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $items->count(),
                    'total' => $items->count(),
                ],
            ], 'Products retrieved for landing page selector');
        }

        $paginated = $query->orderBy('id', 'desc')->paginate($perPage);

        $items = collect($paginated->items())->map(function ($product) {
            $data = $product->toArray();
            $data['primary_image_url'] = $product->primary_image_url;
            $data['brand_name'] = $product->brand?->name;
            $data['category_name'] = $product->categories?->first()?->name;
            $price = $product->wholesale_price ?? $product->selling_price ?? $product->base_price ?? null;
            $data['price'] = $price !== null ? (float) $price : null;
            $data['formatted_price'] = $price !== null ? '$' . number_format((float) $price, 2) : null;
            return $data;
        });

        return $this->success([
            'items' => $items,
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
            'footer_description' => ['nullable', 'string', 'max:2000'],
            'office_address' => ['nullable', 'string', 'max:500'],
            'contact_email' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:100'],
            'whatsapp_display' => ['nullable', 'string', 'max:100'],
            'faqs' => ['nullable', 'array'],
            'social_links' => ['nullable', 'array'],
            'exporter_company_name' => ['nullable', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'country_of_origin' => ['nullable', 'string', 'max:100'],
            'reg_number' => ['nullable', 'string', 'max:100'],
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
        }

        if ($request->has('footer_description')) {
            SystemSetting::set('footer_description', trim(strip_tags($request->input('footer_description'))), 'string', 'branding');
        }

        if ($request->has('office_address')) {
            SystemSetting::set('office_address_formatted', trim(strip_tags($request->input('office_address'))), 'string', 'contact');
        }

        if ($request->has('contact_email')) {
            SystemSetting::set('business_email', trim(strip_tags($request->input('contact_email'))), 'string', 'contact');
        }

        if ($request->has('contact_phone')) {
            SystemSetting::set('business_phone', trim(strip_tags($request->input('contact_phone'))), 'string', 'contact');
        }

        if ($request->has('whatsapp_display')) {
            $wa = trim(strip_tags($request->input('whatsapp_display')));
            SystemSetting::set('whatsapp_display', $wa, 'string', 'contact');
            if (!empty($wa)) {
                $clean = preg_replace('/\D+/', '', $wa);
                SystemSetting::set('whatsapp_number', $clean, 'string', 'contact');
                SystemSetting::set('whatsapp_business_number', $clean, 'string', 'contact');
            }
        }

        if ($request->has('exporter_company_name') || $request->has('company_name')) {
            $cn = trim(strip_tags((string)($request->input('exporter_company_name') ?: $request->input('company_name'))));
            if (!empty($cn)) {
                SystemSetting::set('company_name', $cn, 'string', 'branding');
            }
        }

        if ($request->has('country_of_origin')) {
            $co = trim(strip_tags((string)$request->input('country_of_origin')));
            if (!empty($co)) {
                SystemSetting::set('office_country', $co, 'string', 'contact');
            }
        }

        if ($request->has('reg_number')) {
            $rn = trim(strip_tags((string)$request->input('reg_number')));
            if (!empty($rn)) {
                SystemSetting::set('reg_number', $rn, 'string', 'legal');
            }
        }

        if ($request->has('faqs')) {
            SystemSetting::set('homepage_faqs', $request->input('faqs'), 'json', 'homepage');
        }

        if ($request->has('social_links')) {
            SystemSetting::set('social_links', $request->input('social_links'), 'json', 'branding');
        }

        Cache::forget('site_settings_public');
        CatalogCacheService::invalidateAll();

        return $this->success([
            'hot_sale_visible' => SystemSetting::isHotSaleVisible(),
            'google_search_console_verification' => SystemSetting::getGoogleSearchConsoleVerification(),
            'footer_description' => SystemSetting::get('footer_description'),
            'office_address' => SystemSetting::get('office_address_formatted'),
            'contact_email' => SystemSetting::get('business_email'),
            'contact_phone' => SystemSetting::get('business_phone'),
            'whatsapp_display' => SystemSetting::get('whatsapp_display'),
            'exporter_company_name' => SystemSetting::get('company_name'),
            'country_of_origin' => SystemSetting::get('office_country'),
            'reg_number' => SystemSetting::get('reg_number'),
        ], 'Homepage settings saved successfully.');
    }

    /**
     * POST /api/v1/admin/homepage/beneficiary
     *
     * Update authoritative Exporter / Beneficiary commercial settings.
     */
    public function updateBeneficiarySettings(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->authorization->can($user, 'settings.edit') && !$this->authorization->can($user, 'homepage.banner.edit')) {
            return $this->forbidden("Forbidden: you do not have permission to edit commercial beneficiary settings.");
        }

        $validated = $request->validate([
            'exporter_company_name' => ['required', 'string', 'filled', 'regex:/[^\s]/', 'max:255'],
            'office_address' => ['required', 'string', 'filled', 'regex:/[^\s]/', 'max:500'],
            'country_of_origin' => ['required', 'string', 'filled', 'regex:/[^\s]/', 'max:100'],
            'contact_email' => ['required', 'string', 'email:rfc,filter', 'max:255'],
            'whatsapp_display' => ['required', 'string', 'filled', 'regex:/[^\s]/', 'max:50'],
            'reg_number' => ['required', 'string', 'filled', 'regex:/[^\s]/', 'max:100'],
        ], [
            'exporter_company_name.required' => 'Exporter / Beneficiary Company Name is required.',
            'exporter_company_name.regex' => 'Company Name cannot be empty or whitespace only.',
            'office_address.required' => 'Address is required.',
            'office_address.regex' => 'Address cannot be empty or whitespace only.',
            'country_of_origin.required' => 'Country of Origin is required.',
            'country_of_origin.regex' => 'Country of Origin cannot be empty or whitespace only.',
            'contact_email.required' => 'Contact Email is required.',
            'contact_email.email' => 'Contact Email must be a valid email address.',
            'whatsapp_display.required' => 'WhatsApp Number is required.',
            'whatsapp_display.regex' => 'WhatsApp Number cannot be empty or whitespace only.',
            'reg_number.required' => 'Registration Number is required.',
            'reg_number.regex' => 'Registration Number cannot be empty or whitespace only.',
        ]);

        $companyName = trim($validated['exporter_company_name']);
        $officeAddress = trim($validated['office_address']);
        $countryOfOrigin = trim($validated['country_of_origin']);
        $contactEmail = trim($validated['contact_email']);
        $whatsappDisplay = trim($validated['whatsapp_display']);
        $regNumber = trim($validated['reg_number']);

        SystemSetting::set('company_name', $companyName, 'string', 'branding');
        SystemSetting::set('office_address_formatted', $officeAddress, 'string', 'contact');
        SystemSetting::set('office_country', $countryOfOrigin, 'string', 'contact');
        SystemSetting::set('business_email', $contactEmail, 'string', 'contact');
        SystemSetting::set('whatsapp_display', $whatsappDisplay, 'string', 'contact');
        $cleanWa = preg_replace('/\D+/', '', $whatsappDisplay);
        if (!empty($cleanWa)) {
            SystemSetting::set('whatsapp_number', $cleanWa, 'string', 'contact');
            SystemSetting::set('whatsapp_business_number', $cleanWa, 'string', 'contact');
        }
        SystemSetting::set('reg_number', $regNumber, 'string', 'legal');

        Cache::forget('site_settings_public');
        CatalogCacheService::invalidateAll();

        return $this->success([
            'exporter_company_name' => SystemSetting::get('company_name'),
            'company_name' => SystemSetting::get('company_name'),
            'office_address' => SystemSetting::get('office_address_formatted'),
            'country_of_origin' => SystemSetting::get('office_country'),
            'contact_email' => SystemSetting::get('business_email'),
            'whatsapp_display' => SystemSetting::get('whatsapp_display'),
            'reg_number' => SystemSetting::get('reg_number'),
        ], 'Commercial Exporter / Beneficiary settings saved successfully.');
    }

    /**
     * GET /api/v1/admin/homepage/faqs
     */
    public function getFaqs(): JsonResponse
    {
        $faqs = SystemSetting::get('homepage_faqs', []);
        return $this->success(is_array($faqs) ? $faqs : [], 'Homepage FAQs retrieved');
    }

    /**
     * POST /api/v1/admin/homepage/faqs
     */
    public function syncFaqs(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->authorization->can($user, 'homepage.banner.edit') &&
            !$this->authorization->can($user, 'homepage.view') &&
            !$this->authorization->can($user, 'settings.edit')) {
            return $this->forbidden("Forbidden: you do not have permission to manage FAQs.");
        }

        $validated = $request->validate([
            'faqs' => ['present', 'array'],
            'faqs.*.id' => ['nullable'],
            'faqs.*.question' => ['required', 'string', 'max:500'],
            'faqs.*.answer' => ['required', 'string', 'max:5000'],
            'faqs.*.sort_order' => ['nullable', 'integer'],
            'faqs.*.is_active' => ['nullable', 'boolean'],
        ]);

        $faqs = $validated['faqs'];
        $cleaned = [];
        foreach ($faqs as $idx => $f) {
            $cleaned[] = [
                'id' => $f['id'] ?? ($idx + 1),
                'question' => trim(strip_tags($f['question'])),
                'answer' => trim(strip_tags($f['answer'], '<p><br><strong><em><ul><ol><li><a>')),
                'sort_order' => isset($f['sort_order']) ? (int) $f['sort_order'] : ($idx + 1),
                'is_active' => isset($f['is_active']) ? (bool) $f['is_active'] : true,
            ];
        }

        usort($cleaned, fn($a, $b) => $a['sort_order'] <=> $b['sort_order']);
        SystemSetting::set('homepage_faqs', $cleaned, 'json', 'homepage');

        Cache::forget('site_settings_public');
        CatalogCacheService::invalidateAll();

        return $this->success($cleaned, 'FAQs synchronized successfully.');
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

    /**
     * GET /api/v1/admin/homepage/google-tags
     *
     * Retrieve configured Google tracking codes (head & body).
     */
    public function getGoogleTags(Request $request): JsonResponse
    {
        $user = $request->user();
        $canView = $user && (
            $user->isSuperAdmin() ||
            $this->authorization->can($user, 'settings.view') ||
            $this->authorization->can($user, 'settings.edit') ||
            $this->authorization->can($user, 'homepage.banner.edit')
        );

        if (!$canView) {
            return $this->forbidden('Forbidden: you do not have permission to view tracking code settings.');
        }

        return $this->success([
            'head_code' => SystemSetting::getGoogleTagHeadCode(),
            'body_code' => SystemSetting::getGoogleTagBodyCode(),
            'google_tag_head_code' => SystemSetting::getGoogleTagHeadCode(),
            'google_tag_body_code' => SystemSetting::getGoogleTagBodyCode(),
            'is_head_configured' => !empty(SystemSetting::getGoogleTagHeadCode()),
            'is_body_configured' => !empty(SystemSetting::getGoogleTagBodyCode()),
        ], 'Google tracking tags retrieved successfully.');
    }

    /**
     * POST /api/v1/admin/homepage/google-tags
     *
     * Update Google tracking codes (head & body).
     */
    public function updateGoogleTags(Request $request): JsonResponse
    {
        $user = $request->user();
        $canEdit = $user && (
            $user->isSuperAdmin() ||
            $this->authorization->can($user, 'settings.edit')
        );

        if (!$canEdit) {
            return $this->forbidden('Forbidden: only authorized administrators with settings management privileges may configure website tracking codes.');
        }

        $validated = $request->validate([
            'head_code' => ['nullable', 'string', 'max:65536'],
            'body_code' => ['nullable', 'string', 'max:65536'],
        ], [
            'head_code.max' => 'Head Code must not exceed 64 KB.',
            'body_code.max' => 'Body Code must not exceed 64 KB.',
        ]);

        $hasHead = array_key_exists('head_code', $validated);
        $hasBody = array_key_exists('body_code', $validated);

        if ($hasHead) {
            SystemSetting::setGoogleTagHeadCode($validated['head_code']);
        }

        if ($hasBody) {
            SystemSetting::setGoogleTagBodyCode($validated['body_code']);
        }

        $headCode = SystemSetting::getGoogleTagHeadCode();
        $bodyCode = SystemSetting::getGoogleTagBodyCode();

        // Invalidate public caches immediately
        Cache::forget('site_settings_public');
        CatalogCacheService::invalidateAll();

        Log::info('Google tracking tags updated by administrator', [
            'admin_id' => $user->id,
            'has_head_code' => !empty($headCode),
            'head_code_bytes' => strlen($headCode ?? ''),
            'has_body_code' => !empty($bodyCode),
            'body_code_bytes' => strlen($bodyCode ?? ''),
            'ip' => $request->ip(),
        ]);

        return $this->success([
            'head_code' => $headCode,
            'body_code' => $bodyCode,
            'google_tag_head_code' => $headCode,
            'google_tag_body_code' => $bodyCode,
            'is_head_configured' => !empty($headCode),
            'is_body_configured' => !empty($bodyCode),
        ], 'Google tracking codes saved successfully.');
    }
}
