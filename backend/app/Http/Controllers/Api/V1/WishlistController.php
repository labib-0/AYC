<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Wishlist\AddWishlistItemRequest;
use App\Http\Resources\Api\V1\WishlistResource;
use App\Models\Product;
use App\Models\Wishlist;
use App\Models\WishlistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends ApiController
{
    /**
     * GET /api/v1/wishlist
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return $this->unauthorized();
        }

        if ($user->isAdmin() || !$user->isCustomer()) {
            return $this->forbidden('Unauthorized action. Required role: customer');
        }

        $wishlist = Wishlist::firstOrCreate(['user_id' => $user->id]);
        $wishlist->load([
            'items' => function ($q) {
                $q->whereHas('product', function ($pq) {
                    $pq->storefrontVisible();
                })->with([
                    'product.images',
                    'product.brand',
                    'product.variants.inventories',
                    'product.packageAllocations'
                ]);
            }
        ]);

        return $this->success(new WishlistResource($wishlist), 'Wishlist retrieved successfully');
    }

    /**
     * POST /api/v1/wishlist or POST /api/v1/wishlist/items
     */
    public function store(AddWishlistItemRequest $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return $this->unauthorized();
        }

        if ($user->isAdmin() || !$user->isCustomer()) {
            return $this->forbidden('Unauthorized action. Required role: customer');
        }

        $productId = $request->input('product_id');
        $product = is_numeric($productId)
            ? Product::find((int) $productId)
            : Product::where('slug', (string) $productId)->orWhere('sku', (string) $productId)->first();

        if (!$product || !$product->isStorefrontVisible()) {
            return $this->notFound('Product not found or not available in storefront.');
        }

        $wishlist = Wishlist::firstOrCreate(['user_id' => $user->id]);
        $wishlist->items()->firstOrCreate(['product_id' => $product->id]);

        $wishlist->load([
            'items' => function ($q) {
                $q->whereHas('product', function ($pq) {
                    $pq->storefrontVisible();
                })->with([
                    'product.images',
                    'product.brand',
                    'product.variants.inventories',
                    'product.packageAllocations'
                ]);
            }
        ]);

        return $this->success(new WishlistResource($wishlist), 'Item added to wishlist', 201);
    }

    /**
     * POST /api/v1/wishlist/toggle
     */
    public function toggle(AddWishlistItemRequest $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return $this->unauthorized();
        }

        if ($user->isAdmin() || !$user->isCustomer()) {
            return $this->forbidden('Unauthorized action. Required role: customer');
        }

        $productId = $request->input('product_id');
        $product = is_numeric($productId)
            ? Product::find((int) $productId)
            : Product::where('slug', (string) $productId)->orWhere('sku', (string) $productId)->first();

        if (!$product || !$product->isStorefrontVisible()) {
            return $this->notFound('Product not found or not available in storefront.');
        }

        $wishlist = Wishlist::firstOrCreate(['user_id' => $user->id]);
        $existing = $wishlist->items()->where('product_id', $product->id)->first();

        $action = 'added';
        if ($existing) {
            $existing->delete();
            $action = 'removed';
            $message = 'Item removed from wishlist';
        } else {
            $wishlist->items()->create(['product_id' => $product->id]);
            $action = 'added';
            $message = 'Item added to wishlist';
        }

        $wishlist->load([
            'items' => function ($q) {
                $q->whereHas('product', function ($pq) {
                    $pq->storefrontVisible();
                })->with([
                    'product.images',
                    'product.brand',
                    'product.variants.inventories',
                    'product.packageAllocations'
                ]);
            }
        ]);

        $resource = (new WishlistResource($wishlist))->additional([
            'action' => $action,
            'is_wishlisted' => $action === 'added',
        ]);

        return $this->success($resource, $message);
    }

    /**
     * DELETE /api/v1/wishlist/{productId} or DELETE /api/v1/wishlist/items/{productId}
     */
    public function destroy(Request $request, string $productId): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return $this->unauthorized();
        }

        if ($user->isAdmin() || !$user->isCustomer()) {
            return $this->forbidden('Unauthorized action. Required role: customer');
        }

        $wishlist = Wishlist::where('user_id', $user->id)->first();
        if ($wishlist) {
            $product = is_numeric($productId)
                ? Product::withTrashed()->find((int) $productId)
                : Product::withTrashed()->where('slug', $productId)->orWhere('sku', $productId)->first();

            $pId = $product ? $product->id : (is_numeric($productId) ? (int) $productId : -1);

            $wishlist->items()
                ->where(function ($q) use ($pId) {
                    $q->where('product_id', $pId)
                      ->orWhere('id', $pId);
                })
                ->delete();
        }

        $wishlist = Wishlist::firstOrCreate(['user_id' => $user->id]);
        $wishlist->load([
            'items' => function ($q) {
                $q->whereHas('product', function ($pq) {
                    $pq->storefrontVisible();
                })->with([
                    'product.images',
                    'product.brand',
                    'product.variants.inventories',
                    'product.packageAllocations'
                ]);
            }
        ]);

        return $this->success(new WishlistResource($wishlist), 'Item removed from wishlist');
    }
}
