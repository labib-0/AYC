<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Wishlist\AddSelectedWishlistItemsToCartRequest;
use App\Http\Requests\Wishlist\AddWishlistItemRequest;
use App\Http\Resources\Api\V1\CartResource;
use App\Http\Resources\Api\V1\WishlistResource;
use App\Models\Cart;
use App\Models\CartItem;
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

    /**
     * POST /api/v1/wishlist/add-selected-to-cart
     * Authoritative bulk add-to-cart for selected wishlist items.
     * Revalidates inventory, MOQ, and purchasability; supports partial success.
     * Items remain in wishlist after adding to cart.
     */
    public function addSelectedToCart(AddSelectedWishlistItemsToCartRequest $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return $this->unauthorized();
        }

        if ($user->isAdmin() || !$user->isCustomer()) {
            return $this->forbidden('Unauthorized action. Required role: customer');
        }

        $rawIds = $request->input('wishlist_item_ids') ?? $request->input('item_ids') ?? $request->input('product_ids') ?? [];
        $inputItems = $request->input('items', []);

        if (empty($rawIds) && !empty($inputItems)) {
            foreach ($inputItems as $it) {
                if (!empty($it['wishlist_item_id'])) {
                    $rawIds[] = $it['wishlist_item_id'];
                } elseif (!empty($it['product_id'])) {
                    $rawIds[] = $it['product_id'];
                }
            }
        }

        $rawIds = array_values(array_unique(array_filter((array) $rawIds, fn($val) => !is_null($val) && $val !== '')));

        if (empty($rawIds)) {
            return $this->error('No wishlist items selected.', 422);
        }

        $wishlist = Wishlist::firstOrCreate(['user_id' => $user->id]);

        $userWishlistItems = $wishlist->items()
            ->where(function ($q) use ($rawIds) {
                $q->whereIn('id', $rawIds)
                  ->orWhereIn('product_id', $rawIds);
            })
            ->with([
                'product.images',
                'product.brand',
                'product.variants.inventories',
                'product.pricingTiers',
                'product.packageAllocations'
            ])
            ->get();

        $matchedIds = [];
        foreach ($userWishlistItems as $it) {
            $matchedIds[] = (string) $it->id;
            $matchedIds[] = (string) $it->product_id;
        }

        $failed = [];
        foreach ($rawIds as $rid) {
            if (!in_array((string) $rid, $matchedIds, true)) {
                $failed[] = [
                    'id' => $rid,
                    'reason' => 'Wishlist item not found or does not belong to your account.',
                ];
            }
        }

        $cart = Cart::firstOrCreate(
            ['user_id' => $user->id, 'status' => 'active'],
            ['session_id' => null]
        );

        $added = [];
        $unavailable = [];

        foreach ($userWishlistItems as $item) {
            $product = $item->product;

            // 1. Existence and storefront visibility check
            if (!$product || !$product->isStorefrontVisible()) {
                $unavailable[] = [
                    'wishlist_item_id' => (string) $item->id,
                    'product_id' => (string) ($product?->id ?? $item->product_id),
                    'product_name' => $product?->name ?? 'Unavailable Product',
                    'reason' => 'Product is currently unpublished or not visible in the storefront.',
                ];
                continue;
            }

            // 2. Sold out check
            if ($product->is_sold_out) {
                $unavailable[] = [
                    'wishlist_item_id' => (string) $item->id,
                    'product_id' => (string) $product->id,
                    'product_name' => $product->name,
                    'reason' => "'{$product->name}' is sold out and cannot be purchased.",
                ];
                continue;
            }

            // 3. Preorder compatibility with active cart
            $isIncomingPreorder = (bool) $product->is_preorder;
            $existingCartItems = $cart->items()->with('product')->get();
            if ($existingCartItems->isNotEmpty()) {
                $hasPreorderInCart = $existingCartItems->contains(fn($ci) => (bool) $ci->product?->is_preorder);
                $hasReadyStockInCart = $existingCartItems->contains(fn($ci) => !(bool) $ci->product?->is_preorder);

                if ($isIncomingPreorder && $hasReadyStockInCart) {
                    $unavailable[] = [
                        'wishlist_item_id' => (string) $item->id,
                        'product_id' => (string) $product->id,
                        'product_name' => $product->name,
                        'reason' => 'Ready Stock and Pre-Order products cannot be ordered together in the same cart.',
                    ];
                    continue;
                }

                if (!$isIncomingPreorder && $hasPreorderInCart) {
                    $unavailable[] = [
                        'wishlist_item_id' => (string) $item->id,
                        'product_id' => (string) $product->id,
                        'product_name' => $product->name,
                        'reason' => 'Ready Stock and Pre-Order products cannot be ordered together in the same cart.',
                    ];
                    continue;
                }
            }

            // 4. Quantity and MOQ handling
            $effectiveMoq = max(1, (int) ($product->moq ?? 1));
            $requestedQty = null;
            foreach ($inputItems as $it) {
                if ((isset($it['wishlist_item_id']) && (string) $it['wishlist_item_id'] === (string) $item->id) ||
                    (isset($it['product_id']) && (string) $it['product_id'] === (string) $product->id)) {
                    if (!empty($it['quantity']) && (int) $it['quantity'] > 0) {
                        $requestedQty = (int) $it['quantity'];
                    }
                    break;
                }
            }

            $addQuantity = $requestedQty ?? $effectiveMoq;
            if ($addQuantity < $effectiveMoq) {
                $addQuantity = $effectiveMoq;
            }
            if ($effectiveMoq > 1 && ($addQuantity % $effectiveMoq !== 0)) {
                $addQuantity = (int) (ceil($addQuantity / $effectiveMoq) * $effectiveMoq);
            }

            // 5. Authoritative inventory check
            $hasAllocations = $product->packageAllocations->isNotEmpty();
            $availableStock = $hasAllocations
                ? (int) ($product->getCompletePackageStock() > 0 ? $product->getCompletePackageStock() : $product->getTotalAvailableStock())
                : (int) $product->getTotalAvailableStock();

            $cartItem = $cart->items()->where('product_id', $product->id)->first();
            $newTotalQuantity = $cartItem ? ($cartItem->quantity + $addQuantity) : $addQuantity;

            if (!$product->is_preorder) {
                if ($availableStock <= 0) {
                    $unavailable[] = [
                        'wishlist_item_id' => (string) $item->id,
                        'product_id' => (string) $product->id,
                        'product_name' => $product->name,
                        'reason' => "'{$product->name}' is out of stock.",
                    ];
                    continue;
                }

                if ($availableStock < $effectiveMoq) {
                    $unavailable[] = [
                        'wishlist_item_id' => (string) $item->id,
                        'product_id' => (string) $product->id,
                        'product_name' => $product->name,
                        'reason' => "Available inventory ({$availableStock}) is below minimum order quantity ({$effectiveMoq}).",
                    ];
                    continue;
                }

                if ($newTotalQuantity > $availableStock) {
                    $unavailable[] = [
                        'wishlist_item_id' => (string) $item->id,
                        'product_id' => (string) $product->id,
                        'product_name' => $product->name,
                        'reason' => "Insufficient stock for '{$product->name}' (Requested: {$newTotalQuantity}, Available: {$availableStock}).",
                    ];
                    continue;
                }
            }

            // 6. Package assortment per-variant check
            $packageBreakdown = null;
            if ($hasAllocations) {
                $packageBreakdown = $product->getPackageBreakdownForQuantity($newTotalQuantity);
                if (!$product->is_preorder) {
                    $allocationStockError = null;
                    foreach ($packageBreakdown as $bd) {
                        $needed = (int) ($bd['quantity'] ?? 0);
                        if ($needed > 0) {
                            $vMatch = $bd['product_variant_id'] ? $product->variants->firstWhere('id', $bd['product_variant_id']) : null;
                            if (!$vMatch) {
                                $vMatch = $product->variants->first(fn($var) =>
                                    strtolower(trim($var->color ?? '')) === strtolower(trim($bd['color'] ?? '')) &&
                                    strtolower(trim($var->size ?? '')) === strtolower(trim($bd['size'] ?? ''))
                                );
                            }
                            $av = $vMatch ? (int) $vMatch->stock : 0;
                            if ($av < $needed) {
                                $allocationStockError = "Insufficient stock for assortment breakdown in '{$product->name}'.";
                                break;
                            }
                        }
                    }
                    if ($allocationStockError) {
                        $unavailable[] = [
                            'wishlist_item_id' => (string) $item->id,
                            'product_id' => (string) $product->id,
                            'product_name' => $product->name,
                            'reason' => $allocationStockError,
                        ];
                        continue;
                    }
                }
            }

            // 7. Single variant resolution if non-allocation
            $variant = null;
            if (!$hasAllocations && $product->variants->count() === 1) {
                $variant = $product->variants->first();
            }

            // 8. Add or Update CartItem
            if ($cartItem) {
                $cartItem->update([
                    'quantity' => $newTotalQuantity,
                    'package_breakdown' => $packageBreakdown,
                    'product_variant_id' => $hasAllocations ? null : ($variant ? $variant->id : $cartItem->product_variant_id),
                    'size' => $hasAllocations ? 'Assorted' : ($variant ? $variant->size : ($cartItem->size ?: 'Assorted')),
                ]);
            } else {
                $cart->items()->create([
                    'product_id' => $product->id,
                    'product_variant_id' => $hasAllocations ? null : ($variant ? $variant->id : null),
                    'size' => $hasAllocations ? 'Assorted' : ($variant ? $variant->size : 'Assorted'),
                    'quantity' => $addQuantity,
                    'pricing_mode' => 'standard',
                    'package_breakdown' => $packageBreakdown,
                ]);
            }

            $added[] = [
                'wishlist_item_id' => (string) $item->id,
                'product_id' => (string) $product->id,
                'product_name' => $product->name,
                'quantity' => $addQuantity,
                'unit_price' => $product->getEffectiveCustomerPrice(),
            ];
        }

        $addedCount = count($added);
        $unavailableCount = count($unavailable);
        $failedCount = count($failed);

        if ($addedCount > 0 && $unavailableCount === 0 && $failedCount === 0) {
            $message = $addedCount === 1 ? '1 product added to cart.' : "{$addedCount} products added to cart.";
        } elseif ($addedCount > 0 && ($unavailableCount > 0 || $failedCount > 0)) {
            $unavTotal = $unavailableCount + $failedCount;
            $message = "{$addedCount} " . ($addedCount === 1 ? 'product' : 'products') . " added to cart. {$unavTotal} " . ($unavTotal === 1 ? 'product is' : 'products are') . " currently unavailable.";
        } elseif ($addedCount === 0 && ($unavailableCount > 0 || $failedCount > 0)) {
            $message = "Selected products could not be added to cart because they are currently unavailable.";
        } else {
            $message = "No products were added to cart.";
        }

        $cart->load(['items.product.images', 'items.product.brand', 'items.variant']);
        $totalItemsInCart = (int) $cart->items()->sum('quantity');

        return response()->json([
            'success' => $addedCount > 0,
            'message' => $message,
            'data' => [
                'added' => $added,
                'unavailable' => $unavailable,
                'failed' => $failed,
                'cart' => new CartResource($cart),
                'cart_count' => $totalItemsInCart,
                'added_count' => $addedCount,
                'unavailable_count' => $unavailableCount,
            ]
        ], 200);
    }
}
