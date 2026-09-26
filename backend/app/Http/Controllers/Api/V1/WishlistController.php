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

        $wishlist = Wishlist::firstOrCreate(['user_id' => $user->id]);
        $wishlist->load(['items.product.images', 'items.product.brand', 'items.product.variants']);

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

        $productId = $request->input('product_id');
        $product = is_numeric($productId)
            ? Product::find((int) $productId)
            : Product::where('slug', (string) $productId)->orWhere('sku', (string) $productId)->first();

        if (!$product) {
            return $this->notFound('Product not found');
        }

        $wishlist = Wishlist::firstOrCreate(['user_id' => $user->id]);
        $item = $wishlist->items()->firstOrCreate(['product_id' => $product->id]);

        $wishlist->load(['items.product.images', 'items.product.brand', 'items.product.variants']);

        return $this->success(new WishlistResource($wishlist), 'Item added to wishlist', 201);
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

        $wishlist = Wishlist::where('user_id', $user->id)->first();
        if ($wishlist) {
            $product = is_numeric($productId)
                ? Product::find((int) $productId)
                : Product::where('slug', $productId)->orWhere('sku', $productId)->first();

            $pId = $product ? $product->id : (is_numeric($productId) ? (int) $productId : -1);

            $wishlist->items()
                ->where(function ($q) use ($pId) {
                    $q->where('product_id', $pId)
                      ->orWhere('id', $pId);
                })
                ->delete();
        }

        $wishlist = Wishlist::firstOrCreate(['user_id' => $user->id]);
        $wishlist->load(['items.product.images', 'items.product.brand', 'items.product.variants']);

        return $this->success(new WishlistResource($wishlist), 'Item removed from wishlist');
    }
}
