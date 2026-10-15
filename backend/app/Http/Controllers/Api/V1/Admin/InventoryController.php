<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\AdminInventoryAdjustment;
use App\Models\Inventory;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends ApiController
{
    /**
     * Standard unified low stock threshold across admin platform
     */
    public const LOW_STOCK_THRESHOLD = 200;

    /**
     * Helper to guarantee canonical warehouse and sync active product variants
     */
    protected function ensureInventorySync(): void
    {
        $canonicalWarehouse = Warehouse::firstOrCreate(
            ['code' => 'WH-UTTARA-01'],
            [
                'name' => 'Uttara Warehouse',
                'address' => 'House #33 (2nd floor), Road #12, Sector #11, Uttara',
                'city' => 'Dhaka',
                'country_code' => 'BD',
                'is_active' => true,
            ]
        );

        $untrackedVariants = ProductVariant::whereHas('product')
            ->whereDoesntHave('inventories')
            ->get(['id', 'stock']);

        foreach ($untrackedVariants as $var) {
            Inventory::firstOrCreate(
                [
                    'product_variant_id' => $var->id,
                    'warehouse_id' => $canonicalWarehouse->id,
                ],
                [
                    'quantity' => (int) ($var->stock ?? 0),
                ]
            );
        }

        $untrackedProducts = \App\Models\Product::whereDoesntHave('variants')
            ->whereDoesntHave('directInventories')
            ->get(['id', 'stock']);

        foreach ($untrackedProducts as $prod) {
            Inventory::firstOrCreate(
                [
                    'product_id' => $prod->id,
                    'warehouse_id' => $canonicalWarehouse->id,
                ],
                [
                    'quantity' => (int) ($prod->stock ?? 0),
                ]
            );
        }
    }

    /**
     * GET /api/v1/admin/inventory/summary
     * Dynamically derive all inventory statistics directly from the database.
     * When database contains no records, all values are strictly 0.
     */
    public function summary(Request $request): JsonResponse
    {
        $this->ensureInventorySync();

        $threshold = (int) $request->input('threshold', self::LOW_STOCK_THRESHOLD);

        $base = Inventory::where(function ($q) {
            $q->whereHas('variant.product')->orWhereHas('product');
        });

        if ($request->filled('warehouse_id')) {
            $base->where('warehouse_id', $request->input('warehouse_id'));
        }

        // 1. UNIQUE Products in inventory (COUNT DISTINCT products.id)
        $productQuery = \App\Models\Product::where(function ($pq) use ($request) {
            $pq->whereHas('variants.inventories', function ($q) use ($request) {
                if ($request->filled('warehouse_id')) {
                    $q->where('warehouse_id', $request->input('warehouse_id'));
                }
            })->orWhereHas('directInventories', function ($q) use ($request) {
                if ($request->filled('warehouse_id')) {
                    $q->where('warehouse_id', $request->input('warehouse_id'));
                }
            });
        });

        $totalProducts = (clone $productQuery)->distinct()->count('products.id');
        $totalRecords = (clone $base)->count();
        $totalQuantity = (int) (clone $base)->sum('quantity');
        $inStock = (clone $base)->where('quantity', '>=', $threshold)->count();
        $lowStock = (clone $base)->where('quantity', '>', 0)->where('quantity', '<', $threshold)->count();
        $outOfStock = (clone $base)->where('quantity', '<=', 0)->count();

        return $this->success([
            'totalItems' => $totalProducts,
            'totalProducts' => $totalProducts,
            'totalRecords' => $totalRecords,
            'totalQuantity' => $totalQuantity,
            'inStock' => $inStock,
            'lowStock' => $lowStock,
            'outOfStock' => $outOfStock,
            'inStockRecords' => $inStock,
            'lowStockRecords' => $lowStock,
            'outOfStockRecords' => $outOfStock,
        ], 'Inventory summary calculated from database');
    }

    /**
     * GET /api/v1/admin/inventory
     * List all inventory records with server-side filtering, searching and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $this->ensureInventorySync();

        $query = Inventory::where(function ($q) {
            $q->whereHas('variant.product')->orWhereHas('product');
        })->with([
            'product.brand',
            'product.categories',
            'product.images',
            'variant.product.brand',
            'variant.product.categories',
            'variant.product.images',
            'warehouse',
            'adjustments.adminUser',
        ]);

        // Search by Product name or Variant SKU
        if ($request->filled('search')) {
            $search = $request->input('search');
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($sq) use ($search, $likeOp) {
                $sq->whereHas('variant', function ($vq) use ($search, $likeOp) {
                    $vq->where('sku', $likeOp, "%{$search}%")
                        ->orWhere('title', $likeOp, "%{$search}%")
                        ->orWhereHas('product', function ($pq) use ($search, $likeOp) {
                            $pq->where('name', $likeOp, "%{$search}%")
                               ->orWhere('sku', $likeOp, "%{$search}%");
                        });
                })->orWhereHas('product', function ($pq) use ($search, $likeOp) {
                    $pq->where('name', $likeOp, "%{$search}%")
                       ->orWhere('sku', $likeOp, "%{$search}%");
                });
            });
        }

        // Filter by warehouse
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }

        // Filter by stock status
        $status = strtoupper($request->input('status', 'ALL'));
        $threshold = (int) $request->input('threshold', self::LOW_STOCK_THRESHOLD);

        if ($status === 'IN_STOCK') {
            $query->where('quantity', '>=', $threshold);
        } elseif ($status === 'LOW_STOCK' || $request->boolean('low_stock')) {
            $query->where('quantity', '>', 0)->where('quantity', '<', $threshold);
        } elseif ($status === 'OUT_OF_STOCK') {
            $query->where('quantity', '<=', 0);
        }

        // Sorting
        $sort = $request->input('sort', 'updated_at');
        $direction = $request->input('direction', 'desc');
        if (in_array($sort, ['quantity', 'created_at', 'updated_at'])) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('updated_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $inventories = $query->paginate($perPage);

        return $this->success($inventories, 'Inventory records retrieved');
    }

    /**
     * GET /api/v1/admin/inventory/{id}/history
     * Get inventory adjustment history for a specific inventory record or product.
     */
    public function history(Request $request, string $id): JsonResponse
    {
        if ($request->query('by') === 'product' || $request->boolean('by_product')) {
            return $this->productHistory($request, $id);
        }

        $inventory = is_numeric($id) ? Inventory::find((int) $id) : null;
        if ($inventory) {
            $adjustments = AdminInventoryAdjustment::with(['adminUser', 'inventory.warehouse', 'inventory.variant'])
                ->where('inventory_id', $inventory->id)
                ->orderByDesc('created_at')
                ->get();

            return $this->success($adjustments, 'Inventory adjustment history retrieved');
        }

        // Fallback: check if the id corresponds to a product
        $product = is_numeric($id)
            ? \App\Models\Product::find((int) $id)
            : \App\Models\Product::where('product_id', $id)->orWhere('slug', $id)->first();

        if ($product) {
            return $this->productHistory($request, (string) $product->id);
        }

        return $this->notFound('Inventory record not found');
    }

    /**
     * GET /api/v1/admin/inventory/products/{productId}/history
     * Retrieve all stock adjustments for a specific product across all variants and warehouses.
     */
    public function productHistory(Request $request, string $productId): JsonResponse
    {
        $product = is_numeric($productId)
            ? \App\Models\Product::find((int) $productId)
            : \App\Models\Product::where('product_id', $productId)->orWhere('slug', $productId)->first();

        if (!$product) {
            return $this->notFound('Product not found');
        }

        $variantIds = ProductVariant::where('product_id', $product->id)->pluck('id');

        $inventoryQuery = Inventory::where('product_id', $product->id);
        if ($variantIds->isNotEmpty()) {
            $inventoryQuery->orWhereIn('product_variant_id', $variantIds);
        }
        $inventoryIds = $inventoryQuery->pluck('id');

        $adjustments = AdminInventoryAdjustment::with(['adminUser', 'inventory.warehouse', 'inventory.variant'])
            ->whereIn('inventory_id', $inventoryIds)
            ->orderByDesc('created_at')
            ->get();

        return $this->success($adjustments, 'Product stock movement history retrieved');
    }

    /**
     * POST /api/v1/admin/inventory/adjust
     * Safely adjust inventory quantity with locking, audit recording, and variant stock sync.
     */
    public function adjust(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'inventory_id' => ['nullable'],
            'variant_id' => ['nullable'],
            'product_id' => ['nullable'],
            'warehouse_id' => ['nullable'],
            'adjustment_amount' => ['nullable', 'integer'], // e.g. +50 or -20
            'new_quantity' => ['nullable', 'integer', 'min:0'], // or absolute new quantity
            'reason' => ['required', 'string', 'max:255'],
        ]);

        if (!isset($validated['inventory_id']) && !isset($validated['variant_id']) && !isset($validated['product_id'])) {
            return $this->error('Must provide either inventory_id, variant_id, or product_id.', 422);
        }

        $admin = $request->user();

        try {
            $result = DB::transaction(function () use ($validated, $admin) {
                // Resolve warehouse safely
                $targetWarehouse = null;
                if (!empty($validated['warehouse_id'])) {
                    $targetWarehouse = Warehouse::find($validated['warehouse_id']);
                }
                if (!$targetWarehouse) {
                    $targetWarehouse = Warehouse::where('is_active', true)->first()
                        ?? Warehouse::first()
                        ?? Warehouse::firstOrCreate(
                            ['code' => 'WH-UTTARA-01'],
                            ['name' => 'Uttara Warehouse', 'country_code' => 'BD', 'is_active' => true]
                        );
                }
                $warehouseId = $targetWarehouse->id;

                $inventory = null;
                $variant = null;

                // 1. Try finding by inventory_id
                if (!empty($validated['inventory_id'])) {
                    $inventory = Inventory::where('id', $validated['inventory_id'])->lockForUpdate()->first();
                }

                // 2. Try finding by variant_id
                if (!$inventory && !empty($validated['variant_id'])) {
                    $variant = ProductVariant::where('id', $validated['variant_id'])->lockForUpdate()->first();
                    if ($variant) {
                        $inventory = Inventory::where('product_variant_id', $variant->id)
                            ->where('warehouse_id', $warehouseId)
                            ->lockForUpdate()
                            ->first();

                        if (!$inventory) {
                            $inventory = Inventory::create([
                                'product_variant_id' => $variant->id,
                                'warehouse_id' => $warehouseId,
                                'quantity' => (int) ($variant->stock ?? 0),
                            ]);
                        }
                    }
                }

                // 3. Try finding by product_id (or if inventory_id was actually a product_id)
                $targetProductId = $validated['product_id'] ?? null;
                if (!$inventory && !$targetProductId && !empty($validated['inventory_id'])) {
                    if (\App\Models\Product::where('id', $validated['inventory_id'])->exists()) {
                        $targetProductId = $validated['inventory_id'];
                    }
                }

                if (!$inventory && !empty($targetProductId)) {
                    $product = \App\Models\Product::where('id', $targetProductId)->lockForUpdate()->first();
                    if ($product) {
                        // Check if direct inventory exists for product in warehouse
                        $inventory = Inventory::where('product_id', $product->id)
                            ->where('warehouse_id', $warehouseId)
                            ->lockForUpdate()
                            ->first();

                        // If no direct inventory, check variant inventory
                        if (!$inventory) {
                            $firstVariant = ProductVariant::where('product_id', $product->id)->first();
                            if ($firstVariant) {
                                $variant = $firstVariant;
                                $inventory = Inventory::where('product_variant_id', $firstVariant->id)
                                    ->where('warehouse_id', $warehouseId)
                                    ->lockForUpdate()
                                    ->first();

                                if (!$inventory) {
                                    $inventory = Inventory::create([
                                        'product_variant_id' => $firstVariant->id,
                                        'warehouse_id' => $warehouseId,
                                        'quantity' => (int) ($firstVariant->stock ?? 0),
                                    ]);
                                }
                            } else {
                                $inventory = Inventory::create([
                                    'product_id' => $product->id,
                                    'product_variant_id' => null,
                                    'warehouse_id' => $warehouseId,
                                    'quantity' => (int) ($product->stock ?? 0),
                                ]);
                            }
                        }
                    }
                }

                if (!$inventory) {
                    throw new \Exception('Could not resolve an inventory record to adjust.', 422);
                }

                if ($inventory->product_variant_id && !$variant) {
                    $variant = ProductVariant::where('id', $inventory->product_variant_id)->lockForUpdate()->first();
                }

                $previousQuantity = (int) $inventory->quantity;

                if (isset($validated['new_quantity'])) {
                    $resultingQuantity = (int) $validated['new_quantity'];
                    $adjustmentAmount = $resultingQuantity - $previousQuantity;
                } elseif (isset($validated['adjustment_amount'])) {
                    $adjustmentAmount = (int) $validated['adjustment_amount'];
                    $resultingQuantity = $previousQuantity + $adjustmentAmount;
                } else {
                    throw new \Exception('Please provide either adjustment_amount or new_quantity.', 422);
                }

                if ($resultingQuantity < 0) {
                    throw new \Exception("Cannot reduce stock below zero. Current stock is {$previousQuantity}.", 422);
                }

                // Update inventory quantity
                $inventory->update(['quantity' => $resultingQuantity]);

                // Update variant or product total stock to reflect actual sum of all warehouse inventory
                if ($variant) {
                    $totalStock = Inventory::where('product_variant_id', $variant->id)->sum('quantity');
                    $variant->update(['stock' => $totalStock]);

                    // Keep parent product stock in sync as sum of all inventories
                    $prodTotalStock = Inventory::where(function ($q) use ($variant) {
                        $q->where('product_id', $variant->product_id)
                          ->orWhereIn('product_variant_id', ProductVariant::where('product_id', $variant->product_id)->pluck('id'));
                    })->sum('quantity');

                    $prod = \App\Models\Product::find($variant->product_id);
                    if ($prod) {
                        $prodUpdates = ['stock' => $prodTotalStock];
                        if ($prodTotalStock > 0 && $prod->is_sold_out) {
                            $prodUpdates['is_sold_out'] = false;
                        } elseif ($prodTotalStock <= 0) {
                            $prodUpdates['is_sold_out'] = true;
                        }
                        $prod->update($prodUpdates);
                    }
                } elseif ($inventory->product_id) {
                    $totalStock = Inventory::where('product_id', $inventory->product_id)->sum('quantity');
                    $prod = \App\Models\Product::find($inventory->product_id);
                    if ($prod) {
                        $prodUpdates = ['stock' => $totalStock];
                        if ($totalStock > 0 && $prod->is_sold_out) {
                            $prodUpdates['is_sold_out'] = false;
                        } elseif ($totalStock <= 0) {
                            $prodUpdates['is_sold_out'] = true;
                        }
                        $prod->update($prodUpdates);
                    }
                }

                // Record audit log
                $adjustment = AdminInventoryAdjustment::create([
                    'inventory_id' => $inventory->id,
                    'admin_user_id' => $admin->id,
                    'previous_quantity' => $previousQuantity,
                    'adjustment_amount' => $adjustmentAmount,
                    'resulting_quantity' => $resultingQuantity,
                    'reason' => $validated['reason'],
                ]);

                // Invalidate catalog cache for the affected product
                $targetProductId = $variant ? $variant->product_id : $inventory->product_id;
                $targetProduct = $targetProductId ? \App\Models\Product::with(['variants.inventories.warehouse', 'directInventories.warehouse'])->find($targetProductId) : null;
                if ($targetProduct) {
                    \App\Services\Cache\CatalogCacheService::invalidateProduct($targetProduct);
                }

                return [
                    'inventory' => $inventory->fresh([
                        'product.brand',
                        'product.categories',
                        'product.images',
                        'variant.product.brand',
                        'variant.product.categories',
                        'variant.product.images',
                        'warehouse',
                    ]),
                    'adjustment' => $adjustment->load('adminUser'),
                    'variant_total_stock' => $totalStock ?? null,
                    'product_stock' => $targetProduct ? $targetProduct->stock : null,
                    'on_hand_stock' => $targetProduct ? $targetProduct->getOnHandStock() : null,
                    'available_stock' => $targetProduct ? $targetProduct->getTotalAvailableStock() : null,
                    'available_moqs' => $targetProduct ? $targetProduct->getAvailableMoqs() : null,
                    'warehouse_breakdown' => $targetProduct ? $targetProduct->getWarehouseStockBreakdown() : null,
                ];
            });

            return $this->success($result, 'Inventory adjusted successfully');
        } catch (\Exception $e) {
            $code = $e->getCode() >= 400 && $e->getCode() < 500 ? $e->getCode() : 422;
            return $this->error($e->getMessage(), $code);
        }
    }

    /**
     * GET /api/v1/admin/warehouses
     */
    public function warehouses(): JsonResponse
    {
        $warehouses = Warehouse::withCount('inventories')
            ->orderBy('name', 'asc')
            ->get();

        return $this->success($warehouses, 'Warehouses retrieved');
    }

    /**
     * POST /api/v1/admin/warehouses
     */
    public function storeWarehouse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:warehouses,code'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'country_code' => ['required', 'string', 'max:10'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $warehouse = Warehouse::create($validated);

        return $this->success($warehouse, 'Warehouse created successfully', 201);
    }
}
