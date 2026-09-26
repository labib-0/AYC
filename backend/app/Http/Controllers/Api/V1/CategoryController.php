<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\CategoryResource;
use App\Models\Category;
use App\Models\HomepageHotSaleCategory;
use App\Services\Audit\ActivityLogger;
use App\Services\Cache\CatalogCacheService;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class CategoryController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization
    ) {}
    /**
     * GET /api/v1/categories
     * 
     * Security Rule: Public and customer callers only receive active categories.
     * Only authenticated administrators may view inactive categories by passing ?all=true.
     * Supports ?landing=true to retrieve landing-page selected categories.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isLandingOnly = $request->boolean('landing') || $request->boolean('featured');

        // Serve cached category tree for generic public/storefront requests
        if (!$isAdmin && !$request->filled('search') && !$isLandingOnly) {
            $cached = CatalogCacheService::rememberCategories(function () {
                $cats = Category::with(['parent', 'children'])
                    ->withCount('products')
                    ->where('is_active', true)
                    ->orderBy('sort_order', 'asc')
                    ->orderBy('name', 'asc')
                    ->get();
                return CategoryResource::collection($cats)->resolve();
            });

            return $this->success($cached, 'Categories retrieved');
        }

        $query = Category::with(['parent', 'children'])->withCount('products');

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

        $categories = $query->orderBy($isLandingOnly ? 'landing_sort_order' : 'sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return $this->success(CategoryResource::collection($categories), 'Categories retrieved');
    }

    /**
     * GET /api/v1/categories/landing
     *
     * Returns curated landing-page categories in authoritative landing sort order.
     */
    public function landing(): JsonResponse
    {
        $categories = Category::withCount('products')
            ->where('is_active', true)
            ->where('is_featured_on_landing', true)
            ->orderBy('landing_sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return $this->success(CategoryResource::collection($categories), 'Landing page categories retrieved');
    }

    /**
     * GET /api/v1/categories/{slugOrId}
     */
    public function show(Request $request, string $slugOrId): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();
        $isAdmin = $user && $user->isAdmin();

        $query = Category::with(['parent', 'children'])->withCount('products')
            ->where(function ($q) use ($slugOrId) {
                $q->where('slug', $slugOrId)
                  ->orWhere('id', is_numeric($slugOrId) ? (int)$slugOrId : -1);
            });

        if (!$isAdmin) {
            $query->where('is_active', true);
        }

        $category = $query->first();

        if (!$category) {
            return $this->notFound('Category not found');
        }

        return $this->success(new CategoryResource($category), 'Category retrieved');
    }

    /**
     * POST /api/v1/categories (Admin)
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'category.create')) {
            return $this->forbidden("Forbidden: you do not have the 'category.create' permission.");
        }

        if ($request->filled('image') && !$request->filled('image_url')) {
            $request->merge(['image_url' => $request->input('image')]);
        }

        $validated = $request->validate([
            'parent_id' => ['nullable', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string'],
            'accent_color' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
            'is_featured_on_landing' => ['nullable', 'boolean'],
            'landing_sort_order' => ['nullable', 'integer'],
        ]);

        // Auto-generate collision-resistant unique slug if not provided or collision
        $baseSlug = !empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : Str::slug($validated['name']);
        
        if (empty($baseSlug)) {
            $baseSlug = 'cat-' . time();
        }

        $slug = $baseSlug;
        $counter = 1;
        while (Category::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }
        $validated['slug'] = $slug;

        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['is_featured_on_landing'] = $validated['is_featured_on_landing'] ?? false;
        $validated['landing_sort_order'] = $validated['landing_sort_order'] ?? 0;

        $category = Category::create($validated);

        if ($category->is_featured_on_landing) {
            HomepageHotSaleCategory::updateOrCreate(
                ['category_id' => $category->id],
                ['sort_order' => $category->landing_sort_order, 'is_active' => true]
            );
        }

        $this->invalidateCategoryCache($category, 'created');

        return $this->success(new CategoryResource($category->load(['parent', 'children'])->loadCount('products')), 'Category created successfully', 201);
    }

    /**
     * PUT /api/v1/categories/{id} (Admin)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'category.edit')) {
            return $this->forbidden("Forbidden: you do not have the 'category.edit' permission.");
        }

        $category = Category::findOrFail($id);

        if ($request->filled('image') && !$request->filled('image_url')) {
            $request->merge(['image_url' => $request->input('image')]);
        }

        $validated = $request->validate([
            'parent_id' => ['nullable', 'exists:categories,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string'],
            'accent_color' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
            'is_featured_on_landing' => ['sometimes', 'boolean'],
            'landing_sort_order' => ['nullable', 'integer'],
        ]);

        // Handle slug collision safely if updated
        if (isset($validated['slug'])) {
            $baseSlug = Str::slug($validated['slug']);
            if (empty($baseSlug)) {
                $baseSlug = 'cat-' . $id;
            }
            $slug = $baseSlug;
            $counter = 1;
            while (Category::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        // Prevent circular parent relationship
        if (isset($validated['parent_id']) && $validated['parent_id'] !== null) {
            if ((int)$validated['parent_id'] === $id) {
                return $this->error('Category cannot be its own parent.', 422);
            }

            $descendantIds = $this->getDescendantIds($category);
            if (in_array((int)$validated['parent_id'], $descendantIds)) {
                return $this->error('Cannot select a descendant category as parent.', 422);
            }
        }

        // Sub-permission enforcement for activation, featuring, and reordering
        if (array_key_exists('is_active', $validated) && $validated['is_active'] !== $category->is_active) {
            if ($validated['is_active'] && !$this->authorization->can($user, 'category.activate')) {
                return $this->forbidden("Forbidden: you do not have the 'category.activate' permission to activate categories.");
            }
            if (!$validated['is_active'] && !$this->authorization->can($user, 'category.deactivate')) {
                return $this->forbidden("Forbidden: you do not have the 'category.deactivate' permission to deactivate categories.");
            }
        }

        if (array_key_exists('is_featured_on_landing', $validated) && $validated['is_featured_on_landing'] !== $category->is_featured_on_landing) {
            if (!$this->authorization->can($user, 'category.feature')) {
                return $this->forbidden("Forbidden: you do not have the 'category.feature' permission to feature categories.");
            }
        }

        if ((array_key_exists('sort_order', $validated) && $validated['sort_order'] !== $category->sort_order)
            || (array_key_exists('landing_sort_order', $validated) && $validated['landing_sort_order'] !== $category->landing_sort_order)) {
            if (!$this->authorization->can($user, 'category.reorder')) {
                return $this->forbidden("Forbidden: you do not have the 'category.reorder' permission to reorder categories.");
            }
        }

        $category->update($validated);

        if (isset($validated['is_featured_on_landing'])) {
            if ($validated['is_featured_on_landing']) {
                HomepageHotSaleCategory::updateOrCreate(
                    ['category_id' => $category->id],
                    ['sort_order' => $validated['landing_sort_order'] ?? $category->landing_sort_order ?? 0, 'is_active' => true]
                );
            } else {
                HomepageHotSaleCategory::where('category_id', $category->id)->delete();
            }
        } elseif (isset($validated['landing_sort_order']) && $category->is_featured_on_landing) {
            HomepageHotSaleCategory::where('category_id', $category->id)->update([
                'sort_order' => $validated['landing_sort_order'],
            ]);
        }

        $this->invalidateCategoryCache($category, 'updated');

        return $this->success(new CategoryResource($category->fresh(['parent', 'children'])->loadCount('products')), 'Category updated successfully');
    }

    /**
     * DELETE /api/v1/categories/{id} (Admin - Safe Deletion)
     * 
     * Prevents deleting categories that have active product relationships or child categories.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$this->authorization->can($user, 'category.delete')) {
            return $this->forbidden("Forbidden: you do not have the 'category.delete' permission.");
        }

        $category = Category::withCount(['products', 'children'])->findOrFail($id);

        if ($category->products_count > 0) {
            return $this->error(
                "Cannot delete category '{$category->name}': it is associated with {$category->products_count} product(s). Please reassign or remove the products first, or deactivate the category.",
                422
            );
        }

        if ($category->children_count > 0) {
            return $this->error(
                "Cannot delete category '{$category->name}': it has {$category->children_count} child category/categories. Please reassign or delete child categories first.",
                422
            );
        }

        HomepageHotSaleCategory::where('category_id', $category->id)->delete();

        $category->delete();

        $this->invalidateCategoryCache($category, 'deleted');

        return $this->success(null, "Category '{$category->name}' deleted successfully");
    }

    /**
     * Helper to get all descendant category IDs recursively.
     */
    private function getDescendantIds(Category $category): array
    {
        $ids = [];
        foreach ($category->children as $child) {
            $ids[] = $child->id;
            $ids = array_merge($ids, $this->getDescendantIds($child));
        }
        return $ids;
    }

    /**
     * Invalidate category-related caches and log audit activity
     */
    private function invalidateCategoryCache(?Category $category = null, string $action = 'updated'): void
    {
        CatalogCacheService::invalidateCategories();
        CatalogCacheService::invalidateAll();
        Cache::forget('storefront_categories');
        Cache::forget('active_categories_list');

        if ($category) {
            ActivityLogger::log("category.{$action}", $category, [
                'name' => $category->name,
                'slug' => $category->slug,
            ]);
        }
    }
}
