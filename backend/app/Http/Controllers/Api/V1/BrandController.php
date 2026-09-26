<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\BrandResource;
use App\Models\Brand;
use App\Models\HomepageFeaturedBrand;
use App\Services\Audit\ActivityLogger;
use App\Services\Cache\CatalogCacheService;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class BrandController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization
    ) {}
    /**
     * GET /api/v1/brands
     * 
     * Security Rule: Public and customer callers only receive active brands.
     * Only authenticated administrators may view inactive brands by passing ?all=true.
     * Supports ?landing=true to retrieve landing-page selected brands.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isLandingOnly = $request->boolean('landing') || $request->boolean('featured');

        // Serve cached brand collection for generic public storefront requests
        if (!$isAdmin && !$request->filled('search') && !$isLandingOnly) {
            $cached = CatalogCacheService::rememberBrands(function () {
                $brands = Brand::withCount('products')
                    ->where('is_active', true)
                    ->orderBy('sort_order', 'asc')
                    ->orderBy('name', 'asc')
                    ->get();
                return BrandResource::collection($brands)->resolve();
            });

            return $this->success($cached, 'Brands retrieved');
        }

        $query = Brand::withCount('products');

        if (!$isAdmin || !$request->boolean('all')) {
            $query->where('is_active', true);
        }

        if ($isLandingOnly) {
            $query->where('is_featured_on_landing', true)
                  ->orderBy('landing_sort_order', 'asc');
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('slug', 'ilike', "%{$search}%");
            });
        }

        $brands = $query->orderBy($isLandingOnly ? 'landing_sort_order' : 'sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return $this->success(BrandResource::collection($brands), 'Brands retrieved');
    }

    /**
     * GET /api/v1/brands/landing
     *
     * Returns curated landing-page brands in authoritative landing sort order.
     */
    public function landing(): JsonResponse
    {
        $brands = Brand::withCount('products')
            ->where('is_active', true)
            ->where('is_featured_on_landing', true)
            ->orderBy('landing_sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return $this->success(BrandResource::collection($brands), 'Landing page brands retrieved');
    }

    /**
     * GET /api/v1/brands/{slugOrId}
     */
    public function show(Request $request, string $slugOrId): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();
        $isAdmin = $user && $user->isAdmin();

        $query = Brand::withCount('products')
            ->where(function ($q) use ($slugOrId) {
                $q->where('slug', $slugOrId)
                  ->orWhere('id', is_numeric($slugOrId) ? (int)$slugOrId : -1);
            });

        if (!$isAdmin) {
            $query->where('is_active', true);
        }

        $brand = $query->first();

        if (!$brand) {
            return $this->notFound('Brand not found');
        }

        return $this->success(new BrandResource($brand), 'Brand retrieved');
    }

    /**
     * POST /api/v1/brands (Admin)
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'brand.create')) {
            return $this->forbidden("Forbidden: you do not have the 'brand.create' permission.");
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'logo_url' => ['nullable', 'string'],
            'logo' => ['nullable', 'string'],
            'website' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
            'is_featured_on_landing' => ['nullable', 'boolean'],
            'landing_sort_order' => ['nullable', 'integer'],
        ]);

        if (empty($validated['logo_url']) && !empty($validated['logo'])) {
            $validated['logo_url'] = $validated['logo'];
        }

        // Auto-generate collision-resistant unique slug if not provided or collision
        $baseSlug = !empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : Str::slug($validated['name']);

        if (empty($baseSlug)) {
            $baseSlug = 'brand-' . time();
        }

        $slug = $baseSlug;
        $counter = 1;
        while (Brand::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }
        $validated['slug'] = $slug;

        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['is_featured_on_landing'] = $validated['is_featured_on_landing'] ?? false;
        $validated['landing_sort_order'] = $validated['landing_sort_order'] ?? 0;

        $brand = Brand::create($validated);

        if ($brand->is_featured_on_landing) {
            HomepageFeaturedBrand::updateOrCreate(
                ['brand_id' => $brand->id],
                ['sort_order' => $brand->landing_sort_order, 'is_active' => true]
            );
        }

        $this->invalidateBrandCache($brand, 'created');

        return $this->success(new BrandResource($brand->loadCount('products')), 'Brand created successfully', 201);
    }

    /**
     * PUT /api/v1/brands/{id} (Admin)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'brand.edit')) {
            return $this->forbidden("Forbidden: you do not have the 'brand.edit' permission.");
        }

        $brand = Brand::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'logo_url' => ['nullable', 'string'],
            'logo' => ['nullable', 'string'],
            'website' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
            'is_featured_on_landing' => ['sometimes', 'boolean'],
            'landing_sort_order' => ['nullable', 'integer'],
        ]);

        if (empty($validated['logo_url']) && !empty($validated['logo'])) {
            $validated['logo_url'] = $validated['logo'];
        }

        // Handle slug collision safely if updated
        if (isset($validated['slug'])) {
            $baseSlug = Str::slug($validated['slug']);
            if (empty($baseSlug)) {
                $baseSlug = 'brand-' . $id;
            }
            $slug = $baseSlug;
            $counter = 1;
            while (Brand::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        // Sub-permission enforcement for activation, featuring, and reordering
        if (array_key_exists('is_active', $validated) && $validated['is_active'] !== $brand->is_active) {
            if ($validated['is_active'] && !$this->authorization->can($user, 'brand.activate')) {
                return $this->forbidden("Forbidden: you do not have the 'brand.activate' permission to activate brands.");
            }
            if (!$validated['is_active'] && !$this->authorization->can($user, 'brand.deactivate')) {
                return $this->forbidden("Forbidden: you do not have the 'brand.deactivate' permission to deactivate brands.");
            }
        }

        if (array_key_exists('is_featured_on_landing', $validated) && $validated['is_featured_on_landing'] !== $brand->is_featured_on_landing) {
            if (!$this->authorization->can($user, 'brand.feature')) {
                return $this->forbidden("Forbidden: you do not have the 'brand.feature' permission to feature brands.");
            }
        }

        if ((array_key_exists('sort_order', $validated) && $validated['sort_order'] !== $brand->sort_order)
            || (array_key_exists('landing_sort_order', $validated) && $validated['landing_sort_order'] !== $brand->landing_sort_order)) {
            if (!$this->authorization->can($user, 'brand.reorder')) {
                return $this->forbidden("Forbidden: you do not have the 'brand.reorder' permission to reorder brands.");
            }
        }

        $brand->update($validated);

        if (isset($validated['is_featured_on_landing'])) {
            if ($validated['is_featured_on_landing']) {
                HomepageFeaturedBrand::updateOrCreate(
                    ['brand_id' => $brand->id],
                    ['sort_order' => $validated['landing_sort_order'] ?? $brand->landing_sort_order ?? 0, 'is_active' => true]
                );
            } else {
                HomepageFeaturedBrand::where('brand_id', $brand->id)->delete();
            }
        } elseif (isset($validated['landing_sort_order']) && $brand->is_featured_on_landing) {
            HomepageFeaturedBrand::where('brand_id', $brand->id)->update([
                'sort_order' => $validated['landing_sort_order'],
            ]);
        }

        $this->invalidateBrandCache($brand, 'updated');

        return $this->success(new BrandResource($brand->fresh()->loadCount('products')), 'Brand updated successfully');
    }

    /**
     * DELETE /api/v1/brands/{id} (Admin - Safe Deletion)
     * 
     * Prevents deleting brands that have active product references.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'brand.delete')) {
            return $this->forbidden("Forbidden: you do not have the 'brand.delete' permission.");
        }

        $brand = Brand::withCount('products')->findOrFail($id);

        if ($brand->products_count > 0) {
            return $this->error(
                "Cannot delete brand '{$brand->name}': it is associated with {$brand->products_count} product(s). Please reassign or remove the products first, or deactivate the brand.",
                422
            );
        }

        HomepageFeaturedBrand::where('brand_id', $brand->id)->delete();

        $brand->delete();

        $this->invalidateBrandCache($brand, 'deleted');

        return $this->success(null, "Brand '{$brand->name}' deleted successfully");
    }

    /**
     * Invalidate brand-related caches and record audit activity
     */
    private function invalidateBrandCache(?Brand $brand = null, string $action = 'updated'): void
    {
        CatalogCacheService::invalidateBrands();
        CatalogCacheService::invalidateAll();
        Cache::forget('storefront_brands');
        Cache::forget('active_brands_list');

        if ($brand) {
            ActivityLogger::log("brand.{$action}", $brand, [
                'name' => $brand->name,
                'slug' => $brand->slug,
            ]);
        }
    }
}
