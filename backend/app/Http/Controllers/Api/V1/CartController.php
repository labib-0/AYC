<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Cart\AddCartItemRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Http\Resources\Api\V1\CartResource;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends ApiController
{
    /**
     * Helper to get or create active cart for user or guest
     */
    protected function getActiveCart(Request $request): Cart
    {
        $user = $request->user('sanctum') ?? $request->user();

        if ($user) {
            return Cart::firstOrCreate(
                ['user_id' => $user->id, 'status' => 'active'],
                ['session_id' => null]
            );
        }

        $sessionId = (string) ($request->header('X-Session-Id') ?? $request->input('session_id') ?? session()->getId());
        
        if (empty($sessionId)) {
            $sessionId = 'sess_' . bin2hex(random_bytes(16));
        }

        return Cart::firstOrCreate(
            ['session_id' => $sessionId, 'status' => 'active'],
            ['user_id' => null]
        );
    }

    /**
     * GET /api/v1/cart
     */
    public function index(Request $request): JsonResponse
    {
        $cart = $this->getActiveCart($request);
        $cart->load(['items.product.images', 'items.product.brand', 'items.variant']);

        return $this->success(new CartResource($cart), 'Cart retrieved successfully');
    }

    /**
     * POST /api/v1/cart or POST /api/v1/cart/items
     */
    public function addItem(AddCartItemRequest $request): JsonResponse
    {
        $cart = $this->getActiveCart($request);

        $rawProductId = $request->input('product_id');
        $product = is_numeric($rawProductId)
            ? Product::with(['variants', 'pricingTiers', 'packageAllocations'])->find((int) $rawProductId)
            : Product::with(['variants', 'pricingTiers', 'packageAllocations'])->where('slug', $rawProductId)->orWhere('sku', $rawProductId)->first();

        if (!$product) {
            return $this->notFound('Product not found');
        }
        $productId = $product->id;
        $size = trim((string) $request->input('size'));
        $packageCountInput = $request->input('package_count');
        $effectiveMoq = max(1, (int) $product->moq);
        $quantity = (int) $request->input('quantity', 1);
        if ($packageCountInput !== null && (int) $packageCountInput > 0) {
            $quantity = (int) $packageCountInput * $effectiveMoq;
        }
        $variantId = $request->input('variant_id') ?? $request->input('product_variant_id');

        if ($product->status !== 'published') {
            return $this->error('This product is currently unavailable', 422);
        }

        $hasAllocations = $product->packageAllocations->isNotEmpty();

        // Rule: In universal package assortment model, customer CANNOT order individual sizes/variants
        if ($hasAllocations && ($variantId || (!empty($size) && !in_array($size, ['Assorted', 'Standard Assorted', 'Universal Package'])))) {
            return response()->json([
                'success' => false,
                'error_code' => 'VARIANT_ORDERING_NOT_ALLOWED',
                'message' => "Individual size/variant ordering is not allowed for '{$product->name}'. Products must be purchased as complete universal packages.",
                'errors' => [
                    'package' => ["Individual size/variant ordering is not allowed. Products must be purchased as complete universal packages."]
                ]
            ], 422);
        }

        // Check if item already exists in cart
        $cartItemQuery = $cart->items()->where('product_id', $productId);
        if (!$hasAllocations && $variantId) {
            $cartItemQuery->where('product_variant_id', $variantId);
        }
        $cartItem = $cartItemQuery->first();

        $newQuantity = $cartItem ? ($cartItem->quantity + $quantity) : $quantity;

        $packageBreakdown = null;
        $variant = null;

        if (!$hasAllocations) {
            if ($variantId) {
                $variant = ProductVariant::where('product_id', $productId)->where('id', (int) $variantId)->first();
            }
            if (!$variant && !empty($size) && $size !== 'Assorted') {
                $variant = ProductVariant::where('product_id', $productId)->where('size', $size)->first();
            }

            $availableStock = $variant ? (int) $variant->stock : (int) $product->variants->sum('stock');
            if ($newQuantity > $availableStock) {
                $sizeLabel = $variant ? " size {$variant->size}" : (!empty($size) && $size !== 'Assorted' ? " size {$size}" : "");
                return response()->json([
                    'success' => false,
                    'error_code' => 'INSUFFICIENT_STOCK',
                    'message' => "Insufficient stock for '{$product->name}'{$sizeLabel} (Requested: {$newQuantity}, Available: {$availableStock}).",
                    'errors' => [
                        'stock' => ["Insufficient stock for '{$product->name}'{$sizeLabel} (Requested: {$newQuantity}, Available: {$availableStock})."]
                    ],
                    'data' => [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'variant_id' => $variant?->id,
                        'size' => $variant?->size ?? ($size ?: 'Assorted'),
                        'color' => $variant?->color ?? $product->color_name,
                        'sku' => $variant?->sku ?? $product->sku,
                        'requested_quantity' => $newQuantity,
                        'available_quantity' => $availableStock,
                    ]
                ], 422);
            }
        }

        // Server-Side Authoritative MOQ and Increment Enforcement
        if ($effectiveMoq > 1) {
            if ($newQuantity < $effectiveMoq) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'BELOW_MOQ',
                    'message' => "Minimum order quantity (MOQ) for '{$product->name}' is {$effectiveMoq} units.",
                    'errors' => [
                        'quantity' => ["Minimum order quantity (MOQ) for '{$product->name}' is {$effectiveMoq} units."]
                    ],
                    'data' => [
                        'code' => 'BELOW_MOQ',
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'moq' => $effectiveMoq,
                        'requested_quantity' => $newQuantity,
                    ]
                ], 422);
            }
            if ($newQuantity % $effectiveMoq !== 0) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'INVALID_MOQ_MULTIPLE',
                    'message' => "Order quantity for '{$product->name}' must be a multiple of {$effectiveMoq} units.",
                    'errors' => [
                        'quantity' => ["Order quantity must be an exact multiple of the MOQ ({$effectiveMoq} units)."]
                    ],
                    'data' => [
                        'code' => 'INVALID_MOQ_MULTIPLE',
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'moq' => $effectiveMoq,
                        'requested_quantity' => $newQuantity,
                    ]
                ], 422);
            }
        }

        if ($hasAllocations) {
            // Generate automatic package allocation breakdown scaled for ordered packages
            $packageBreakdown = $product->getPackageBreakdownForQuantity($newQuantity);

            // Per-variant inventory verification for complete package requirement
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
                        $cLabel = $bd['color'] ?? '';
                        $sLabel = $bd['size'] ?? '';
                        return response()->json([
                            'success' => false,
                            'error_code' => 'INSUFFICIENT_STOCK',
                            'message' => "Insufficient stock for variant '{$cLabel} / {$sLabel}' in '{$product->name}' (Requested: {$needed}, Available: {$av}).",
                            'errors' => [
                                'stock' => ["Insufficient stock for variant '{$cLabel} / {$sLabel}' in '{$product->name}' (Requested: {$needed}, Available: {$av})."]
                            ],
                            'data' => [
                                'product_id' => $product->id,
                                'product_name' => $product->name,
                                'variant_id' => $vMatch?->id,
                                'size' => $sLabel,
                                'color' => $cLabel,
                                'sku' => $vMatch?->sku ?? $product->sku,
                                'requested_quantity' => $needed,
                                'available_quantity' => $av,
                                'package_count' => (int) ($newQuantity / $effectiveMoq),
                            ]
                        ], 422);
                    }
                }
            }
        }

        if ($cartItem) {
            $cartItem->update([
                'quantity' => $newQuantity,
                'package_breakdown' => $packageBreakdown,
                'product_variant_id' => $hasAllocations ? null : ($variant ? $variant->id : $cartItem->product_variant_id),
                'size' => $hasAllocations ? 'Assorted' : ($variant ? $variant->size : ($size ?: ($cartItem->size ?: 'Assorted'))),
            ]);
        } else {
            $cart->items()->create([
                'product_id' => $productId,
                'product_variant_id' => $hasAllocations ? null : ($variant ? $variant->id : null),
                'size' => $hasAllocations ? 'Assorted' : ($variant ? $variant->size : ($size ?: 'Assorted')),
                'quantity' => $newQuantity,
                'package_breakdown' => $packageBreakdown,
            ]);
        }

        $cart->load(['items.product.images', 'items.product.brand', 'items.variant']);

        return $this->success(new CartResource($cart), 'Item added to cart', 200);
    }

    /**
     * PUT /api/v1/cart/{itemId} or PUT /api/v1/cart/items
     */
    public function updateItem(UpdateCartItemRequest $request, ?string $itemId = null): JsonResponse
    {
        $cart = $this->getActiveCart($request);
        $quantity = (int) $request->input('quantity');

        // Locate item
        $cartItem = null;
        if ($itemId && is_numeric($itemId)) {
            $cartItem = $cart->items()->where('id', (int) $itemId)->first();
        } elseif ($request->filled('item_id')) {
            $cartItem = $cart->items()->where('id', (int) $request->input('item_id'))->first();
        } elseif ($request->filled('product_id') && $request->filled('size')) {
            $cartItem = $cart->items()
                ->where('product_id', (int) $request->input('product_id'))
                ->where('size', (string) $request->input('size'))
                ->first();
        } elseif ($request->filled('product_id')) {
            $cartItem = $cart->items()
                ->where('product_id', (int) $request->input('product_id'))
                ->first();
        }

        if (!$cartItem) {
            return $this->notFound('Cart item not found');
        }

        if ($quantity <= 0) {
            $cartItem->delete();
        } else {
            // Stock & MOQ verification
            $product = $cartItem->product()->with(['variants', 'pricingTiers', 'packageAllocations'])->first();
            
            if ($product) {
                $effectiveMoq = max(1, (int) $product->moq);
                if ($request->has('package_count') && (int) $request->input('package_count') > 0) {
                    $quantity = (int) $request->input('package_count') * $effectiveMoq;
                }

                $hasAllocations = $product->packageAllocations->isNotEmpty();

                if ($effectiveMoq > 1) {
                    if ($quantity < $effectiveMoq) {
                        return response()->json([
                            'success' => false,
                            'error_code' => 'BELOW_MOQ',
                            'message' => "Minimum order quantity (MOQ) for '{$product->name}' is {$effectiveMoq} units.",
                            'errors' => [
                                'quantity' => ["Minimum order quantity (MOQ) for '{$product->name}' is {$effectiveMoq} units."]
                            ],
                            'data' => [
                                'code' => 'BELOW_MOQ',
                                'product_id' => $product->id,
                                'product_name' => $product->name,
                                'moq' => $effectiveMoq,
                                'requested_quantity' => $quantity,
                            ]
                        ], 422);
                    }
                    if ($quantity % $effectiveMoq !== 0) {
                        return response()->json([
                            'success' => false,
                            'error_code' => 'INVALID_MOQ_MULTIPLE',
                            'message' => "Order quantity for '{$product->name}' must be a multiple of {$effectiveMoq} units.",
                            'errors' => [
                                'quantity' => ["Order quantity must be an exact multiple of the MOQ ({$effectiveMoq} units)."]
                            ],
                            'data' => [
                                'code' => 'INVALID_MOQ_MULTIPLE',
                                'product_id' => $product->id,
                                'product_name' => $product->name,
                                'moq' => $effectiveMoq,
                                'requested_quantity' => $quantity,
                            ]
                        ], 422);
                    }
                }

                if ($hasAllocations) {
                    $packageBreakdown = $product->getPackageBreakdownForQuantity($quantity);
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
                                $cLabel = $bd['color'] ?? '';
                                $sLabel = $bd['size'] ?? '';
                                return response()->json([
                                    'success' => false,
                                    'error_code' => 'INSUFFICIENT_STOCK',
                                    'message' => "Insufficient stock for variant '{$cLabel} / {$sLabel}' in '{$product->name}' (Requested: {$needed}, Available: {$av}).",
                                    'errors' => [
                                        'stock' => ["Insufficient stock for variant '{$cLabel} / {$sLabel}' in '{$product->name}' (Requested: {$needed}, Available: {$av})."]
                                    ],
                                    'data' => [
                                        'product_id' => $product->id,
                                        'product_name' => $product->name,
                                        'variant_id' => $vMatch?->id,
                                        'size' => $sLabel,
                                        'color' => $cLabel,
                                        'sku' => $vMatch?->sku ?? $product->sku,
                                        'requested_quantity' => $needed,
                                        'available_quantity' => $av,
                                        'package_count' => (int) ($quantity / $effectiveMoq),
                                    ]
                                ], 422);
                            }
                        }
                    }

                    $cartItem->update([
                        'quantity' => $quantity,
                        'package_breakdown' => $packageBreakdown,
                        'product_variant_id' => null,
                        'size' => 'Assorted',
                    ]);
                } else {
                    $variant = $cartItem->variant;
                    $availableStock = $variant ? (int) $variant->stock : (int) $product->variants->sum('stock');
                    
                    if ($quantity > $availableStock) {
                        $sizeLabel = $variant ? " size {$variant->size}" : (!empty($cartItem->size) && $cartItem->size !== 'Assorted' ? " size {$cartItem->size}" : "");
                        return response()->json([
                            'success' => false,
                            'error_code' => 'INSUFFICIENT_STOCK',
                            'message' => "Insufficient stock for '{$product->name}'{$sizeLabel} (Requested: {$quantity}, Available: {$availableStock}).",
                            'errors' => [
                                'stock' => ["Insufficient stock for '{$product->name}'{$sizeLabel} (Requested: {$quantity}, Available: {$availableStock})."]
                            ],
                            'data' => [
                                'product_id' => $product->id,
                                'product_name' => $product->name,
                                'variant_id' => $variant?->id,
                                'size' => $variant?->size ?? $cartItem->size,
                                'color' => $variant?->color ?? $product->color_name,
                                'sku' => $variant?->sku ?? $product->sku,
                                'requested_quantity' => $quantity,
                                'available_quantity' => $availableStock,
                            ]
                        ], 422);
                    }

                    $cartItem->update(['quantity' => $quantity]);
                }
            } else {
                $cartItem->update(['quantity' => $quantity]);
            }
        }

        $cart->load(['items.product.images', 'items.product.brand', 'items.variant']);

        return $this->success(new CartResource($cart), 'Cart updated successfully');
    }

    /**
     * DELETE /api/v1/cart/{itemId} or DELETE /api/v1/cart/items
     */
    public function removeItem(Request $request, ?string $itemId = null): JsonResponse
    {
        $cart = $this->getActiveCart($request);

        $cartItem = null;
        if ($itemId && is_numeric($itemId)) {
            $cartItem = $cart->items()->where('id', (int) $itemId)->first();
        } elseif ($request->filled('item_id')) {
            $cartItem = $cart->items()->where('id', (int) $request->input('item_id'))->first();
        } else {
            $productId = $request->query('product_id', $request->input('product_id'));
            $size = $request->query('size', $request->input('size'));

            if ($productId && $size) {
                $cartItem = $cart->items()
                    ->where('product_id', (int) $productId)
                    ->where('size', (string) $size)
                    ->first();
            }
        }

        if ($cartItem) {
            $cartItem->delete();
        }

        $cart->load(['items.product.images', 'items.product.brand', 'items.variant']);

        return $this->success(new CartResource($cart), 'Item removed from cart');
    }

    /**
     * DELETE /api/v1/cart
     */
    public function clear(Request $request): JsonResponse
    {
        $cart = $this->getActiveCart($request);
        $cart->items()->delete();
        $cart->load(['items.product.images', 'items.product.brand', 'items.variant']);

        return $this->success(new CartResource($cart), 'Cart cleared successfully');
    }

    /**
     * POST /api/v1/cart/merge
     * Merges guest session cart into authenticated user cart
     */
    public function merge(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return $this->unauthorized('Authentication required to merge cart');
        }

        $sessionId = (string) ($request->input('session_id') ?? $request->header('X-Session-Id') ?? '');
        
        $userCart = Cart::firstOrCreate(
            ['user_id' => $user->id, 'status' => 'active']
        );

        if (!empty($sessionId)) {
            $guestCart = Cart::where('session_id', $sessionId)
                ->where('status', 'active')
                ->whereNull('user_id')
                ->with('items.variant', 'items.product.variants')
                ->first();

            if ($guestCart && $guestCart->items->isNotEmpty()) {
                foreach ($guestCart->items as $guestItem) {
                    $availableStock = $guestItem->variant 
                        ? (int) $guestItem->variant->stock 
                        : (int) ($guestItem->product ? $guestItem->product->variants->sum('stock') : 9999);

                    $existing = $userCart->items()
                        ->where('product_id', $guestItem->product_id)
                        ->where('size', $guestItem->size)
                        ->first();

                    if ($existing) {
                        $combinedQty = min($availableStock, $existing->quantity + $guestItem->quantity);
                        $existing->update([
                            'quantity' => $combinedQty,
                            'product_variant_id' => $guestItem->product_variant_id ?: $existing->product_variant_id,
                        ]);
                    } else {
                        $userCart->items()->create([
                            'product_id' => $guestItem->product_id,
                            'product_variant_id' => $guestItem->product_variant_id,
                            'size' => $guestItem->size,
                            'quantity' => min($availableStock, $guestItem->quantity),
                        ]);
                    }
                }

                $guestCart->update(['status' => 'merged']);
            }
        }

        $userCart->load(['items.product.images', 'items.product.brand', 'items.variant']);

        return $this->success(new CartResource($userCart), 'Cart merged successfully');
    }

    /**
     * POST /api/v1/cart/revalidate
     * Authoritatively validate all items against live database inventory.
     */
    public function revalidate(Request $request): JsonResponse
    {
        $rawItems = $request->input('items');
        $itemsToValidate = [];

        if (is_array($rawItems) && !empty($rawItems)) {
            foreach ($rawItems as $item) {
                $itemsToValidate[] = [
                    'id' => $item['id'] ?? null,
                    'product_id' => $item['product_id'] ?? $item['productId'] ?? null,
                    'variant_id' => $item['variant_id'] ?? $item['variantId'] ?? $item['product_variant_id'] ?? null,
                    'size' => trim((string) ($item['size'] ?? '')),
                    'quantity' => (int) ($item['quantity'] ?? 1),
                ];
            }
        } else {
            $cart = $this->getActiveCart($request);
            $cart->load(['items.product.variants', 'items.variant']);
            foreach ($cart->items as $cartItem) {
                $itemsToValidate[] = [
                    'id' => (string) $cartItem->id,
                    'product_id' => $cartItem->product_id,
                    'variant_id' => $cartItem->product_variant_id,
                    'size' => $cartItem->size,
                    'quantity' => (int) $cartItem->quantity,
                ];
            }
        }

        $violations = [];
        $validatedList = [];

        foreach ($itemsToValidate as $it) {
            $productId = $it['product_id'];
            $variantId = $it['variant_id'];
            $size = $it['size'];
            $requestedQty = $it['quantity'];

            $product = is_numeric($productId)
                ? Product::with('variants')->find((int) $productId)
                : Product::with('variants')->where('slug', $productId)->orWhere('sku', $productId)->first();

            if (!$product || $product->status !== 'published') {
                $prodName = $product ? $product->name : "Product #{$productId}";
                $violations[] = [
                    'item_id' => $it['id'],
                    'product_id' => $productId,
                    'product_name' => $prodName,
                    'variant_id' => $variantId,
                    'size' => $size,
                    'requested_quantity' => $requestedQty,
                    'available_quantity' => 0,
                    'message' => "'{$prodName}' is currently unavailable or out of stock.",
                ];
                $validatedList[] = [
                    'item_id' => $it['id'],
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'size' => $size,
                    'requested_quantity' => $requestedQty,
                    'available_quantity' => 0,
                    'is_valid' => false,
                ];
                continue;
            }

            // Resolve variant
            $variant = null;
            if ($variantId) {
                $variant = $product->variants->firstWhere('id', (int) $variantId);
            }
            if (!$variant && !empty($size) && $size !== 'Assorted') {
                $variant = $product->variants->firstWhere('size', $size);
            }

            $availableStock = $variant ? (int) $variant->stock : (int) $product->variants->sum('stock');
            $effectiveMoq = max(1, (int) $product->moq);
            $isBelowMoq = $effectiveMoq > 1 && $requestedQty < $effectiveMoq;
            $isInvalidMultiple = $effectiveMoq > 1 && ($requestedQty % $effectiveMoq !== 0);
            $isOutOfStock = $requestedQty > $availableStock;
            $isValid = !$isOutOfStock && !$isBelowMoq && !$isInvalidMultiple && $availableStock > 0;

            if ($isOutOfStock) {
                $sizeLabel = $variant ? " size {$variant->size}" : (!empty($size) && $size !== 'Assorted' ? " size {$size}" : "");
                $violations[] = [
                    'item_id' => $it['id'],
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'variant_id' => $variant?->id,
                    'size' => $variant?->size ?? ($size ?: 'Assorted'),
                    'color' => $variant?->color ?? $product->color_name,
                    'sku' => $variant?->sku ?? $product->sku,
                    'requested_quantity' => $requestedQty,
                    'available_quantity' => $availableStock,
                    'moq' => $effectiveMoq,
                    'error_code' => 'INSUFFICIENT_STOCK',
                    'message' => "Only {$availableStock} units are currently available for '{$product->name}'{$sizeLabel}. Please reduce the quantity.",
                ];
            } elseif ($isBelowMoq || $isInvalidMultiple) {
                $violations[] = [
                    'item_id' => $it['id'],
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'variant_id' => $variant?->id,
                    'size' => $variant?->size ?? ($size ?: 'Assorted'),
                    'color' => $variant?->color ?? $product->color_name,
                    'sku' => $variant?->sku ?? $product->sku,
                    'requested_quantity' => $requestedQty,
                    'available_quantity' => $availableStock,
                    'moq' => $effectiveMoq,
                    'error_code' => $isBelowMoq ? 'BELOW_MOQ' : 'INVALID_MOQ_MULTIPLE',
                    'message' => $isBelowMoq
                        ? "Order quantity for '{$product->name}' ({$requestedQty} pcs) is below the minimum order quantity of {$effectiveMoq} pcs."
                        : "Order quantity for '{$product->name}' ({$requestedQty} pcs) must be an exact multiple of the MOQ ({$effectiveMoq} pcs).",
                ];
            }

            $validatedList[] = [
                'item_id' => $it['id'],
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
                'size' => $variant?->size ?? ($size ?: 'Assorted'),
                'requested_quantity' => $requestedQty,
                'available_quantity' => $availableStock,
                'moq' => $effectiveMoq,
                'is_valid' => $isValid,
            ];
        }

        return response()->json([
            'success' => true,
            'is_valid' => empty($violations),
            'violations' => $violations,
            'items' => $validatedList,
        ], 200);
    }
}
