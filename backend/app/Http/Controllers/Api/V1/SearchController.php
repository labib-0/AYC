<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends ApiController
{
    /**
     * GET /api/v1/search/suggestions
     */
    public function suggestions(Request $request): JsonResponse
    {
        $q = trim((string) ($request->query('q') ?? $request->query('query') ?? ''));

        if (empty($q)) {
            return $this->success([
                'products' => [],
                'categories' => [],
                'brands' => [],
            ], 'Search suggestions retrieved');
        }

        $likeOp = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $products = Product::where('status', 'published')
            ->where(function ($query) use ($q, $likeOp) {
                $query->where('name', $likeOp, "%{$q}%")
                      ->orWhere('sku', $likeOp, "%{$q}%")
                      ->orWhere('description', $likeOp, "%{$q}%");
            })
            ->with(['brand', 'images'])
            ->limit(6)
            ->get()
            ->map(function ($p) {
                $firstImage = $p->images->first()?->image_url ?? '/placeholder.jpg';
                return [
                    'id' => (string) $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug,
                    'sku' => $p->sku,
                    'brand' => $p->brand ? $p->brand->name : 'Ayaan',
                    'price' => (float) $p->wholesale_price,
                    'image' => $firstImage,
                ];
            });

        $categories = Category::where('is_active', true)
            ->where('name', $likeOp, "%{$q}%")
            ->limit(5)
            ->get(['id', 'name', 'slug', 'image_url']);

        $brands = Brand::where('is_active', true)
            ->where('name', $likeOp, "%{$q}%")
            ->limit(5)
            ->get(['id', 'name', 'slug', 'logo_url']);

        return $this->success([
            'products' => $products,
            'categories' => $categories,
            'brands' => $brands,
        ], 'Search suggestions retrieved');
    }
}
