<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SearchController extends ApiController
{
    /**
     * Resolve the Redis/Cache key for search history, scoped to authenticated user or guest session.
     */
    protected function getHistoryCacheKey(Request $request): string
    {
        $user = $request->user('sanctum') ?? $request->user();
        if ($user) {
            return "search_history:user:{$user->id}";
        }
        $guestId = $request->header('X-Session-ID')
            ?? $request->cookie('ayaan_session_id')
            ?? $request->ip()
            ?? 'guest';
        return "search_history:guest:" . md5((string) $guestId);
    }

    /**
     * GET /api/v1/search/suggestions
     *
     * Multi-dimensional search matching:
     * 1. Product title / name
     * 2. Brand name
     * 3. Category name
     * 4. Product SKU & variant SKUs
     * 5. Description / short description
     *
     * Ranked by relevance:
     * - Exact product title
     * - Title prefix
     * - Title substring
     * - SKU match
     * - Brand match
     * - Category match
     * - Description match
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

        // Retrieve storefront-visible products matching ANY dimension
        $matchedProducts = Product::storefrontVisible()
            ->where(function ($query) use ($q, $likeOp) {
                $query->where('name', $likeOp, "%{$q}%")
                      ->orWhere('sku', $likeOp, "%{$q}%")
                      ->orWhere('description', $likeOp, "%{$q}%")
                      ->orWhere('short_description', $likeOp, "%{$q}%")
                      ->orWhereHas('brand', function ($bq) use ($q, $likeOp) {
                          $bq->where('name', $likeOp, "%{$q}%");
                      })
                      ->orWhereHas('categories', function ($cq) use ($q, $likeOp) {
                          $cq->where('name', $likeOp, "%{$q}%");
                      })
                      ->orWhereHas('variants', function ($vq) use ($q, $likeOp) {
                          $vq->where('sku', $likeOp, "%{$q}%");
                      });
            })
            ->with(['brand', 'categories', 'images', 'pricingTiers'])
            ->limit(24) // Eager fetch a pool to sort by high-fidelity relevance scoring
            ->get();

        // Calculate relevance scoring
        $qLower = mb_strtolower($q);
        $sorted = $matchedProducts->sortByDesc(function ($p) use ($qLower) {
            $score = 0;
            $nameLower = mb_strtolower($p->name);
            $skuLower = $p->sku ? mb_strtolower($p->sku) : '';
            $brandNameLower = $p->brand ? mb_strtolower($p->brand->name) : '';

            // 1. Exact title match
            if ($nameLower === $qLower) {
                $score += 100;
            } elseif (str_starts_with($nameLower, $qLower)) {
                $score += 80;
            } elseif (str_contains($nameLower, $qLower)) {
                $score += 60;
            }

            // 2. SKU match
            if ($skuLower === $qLower) {
                $score += 70;
            } elseif (str_starts_with($skuLower, $qLower)) {
                $score += 50;
            } elseif (str_contains($skuLower, $qLower)) {
                $score += 45;
            }

            // 3. Brand name match
            if ($brandNameLower === $qLower) {
                $score += 65;
            } elseif (str_contains($brandNameLower, $qLower)) {
                $score += 40;
            }

            // 4. Category match
            if ($p->relationLoaded('categories') && $p->categories) {
                foreach ($p->categories as $cat) {
                    $catLower = mb_strtolower($cat->name);
                    if ($catLower === $qLower) {
                        $score += 55;
                        break;
                    } elseif (str_contains($catLower, $qLower)) {
                        $score += 35;
                        break;
                    }
                }
            }

            // 5. Description match
            $descLower = mb_strtolower(($p->short_description ?? '') . ' ' . ($p->description ?? ''));
            if (str_contains($descLower, $qLower)) {
                $score += 10;
            }

            return $score;
        })->values();

        $products = $sorted->take(6)->map(function ($p) {
            $firstImage = $p->images->first()?->image_url ?? '/placeholder.jpg';
            $effectivePrice = $p->getEffectiveCustomerPrice();
            return [
                'id' => (string) $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'sku' => $p->sku,
                'brand' => $p->brand ? $p->brand->name : 'Ayaan',
                'brandLogo' => $p->brand?->logo_url,
                'price' => $effectivePrice,
                'has_valid_price' => $effectivePrice !== null && $effectivePrice > 0,
                'image' => $firstImage,
                'moq' => (int) ($p->moq ?? 10),
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

    /**
     * GET /api/v1/search/history
     */
    public function getHistory(Request $request): JsonResponse
    {
        $key = $this->getHistoryCacheKey($request);
        $history = Cache::get($key, []);
        return $this->success(is_array($history) ? array_values($history) : [], 'Search history retrieved');
    }

    /**
     * POST /api/v1/search/history
     */
    public function recordHistory(Request $request): JsonResponse
    {
        $term = trim((string) ($request->input('term') ?? $request->input('query') ?? $request->input('q') ?? ''));
        $term = preg_replace('/\s+/', ' ', $term);

        if (empty($term) || mb_strlen($term) > 100) {
            $key = $this->getHistoryCacheKey($request);
            $history = Cache::get($key, []);
            return $this->success(is_array($history) ? array_values($history) : [], 'No-op');
        }

        $key = $this->getHistoryCacheKey($request);
        $history = Cache::get($key, []);
        if (!is_array($history)) {
            $history = [];
        }

        // Case-insensitive deduplication
        $history = array_values(array_filter($history, function ($item) use ($term) {
            return strcasecmp(trim($item), $term) !== 0;
        }));

        array_unshift($history, $term);
        $history = array_slice($history, 0, 8);

        Cache::put($key, $history, now()->addDays(30));

        return $this->success($history, 'Search term recorded');
    }

    /**
     * DELETE /api/v1/search/history
     */
    public function deleteHistory(Request $request): JsonResponse
    {
        $key = $this->getHistoryCacheKey($request);
        $term = $request->input('term') ?? $request->query('term');

        if ($term !== null && trim((string) $term) !== '') {
            $cleanTerm = trim((string) $term);
            $history = Cache::get($key, []);
            if (is_array($history)) {
                $history = array_values(array_filter($history, function ($item) use ($cleanTerm) {
                    return strcasecmp(trim($item), $cleanTerm) !== 0;
                }));
                Cache::put($key, $history, now()->addDays(30));
                return $this->success($history, 'Search term removed');
            }
        }

        Cache::forget($key);
        return $this->success([], 'Search history cleared');
    }
}
