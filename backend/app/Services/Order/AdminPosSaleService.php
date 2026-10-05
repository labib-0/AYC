<?php

namespace App\Services\Order;

use App\Models\AdminInventoryAdjustment;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusEvent;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Audit\ActivityLogger;
use App\Services\Order\OrderCalculationService;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class AdminPosSaleService
{
    public function __construct(
        private readonly OrderCalculationService $calculationService,
        private readonly AdminAuthorizationService $authorization
    ) {}

    /**
     * Search existing customers for POS sale assignment.
     * Strictly restricted to customer accounts (role = 'customer').
     */
    public function searchCustomers(string $query = '', int $limit = 20): array
    {
        $limit = min(max(1, $limit), 50);

        $q = User::where('role', User::ROLE_CUSTOMER)
            ->withCount('orders');

        $query = trim($query);
        if ($query !== '') {
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

            if (is_numeric($query)) {
                $q->where(function ($sub) use ($query, $likeOp) {
                    $sub->where('id', (int) $query)
                        ->orWhere('phone', $likeOp, "%{$query}%");
                });
            } else {
                $q->where(function ($sub) use ($query, $likeOp) {
                    $sub->where('name', $likeOp, "%{$query}%")
                        ->orWhere('email', $likeOp, "%{$query}%")
                        ->orWhere('phone', $likeOp, "%{$query}%")
                        ->orWhere('company_name', $likeOp, "%{$query}%");
                });
            }
        }

        $customers = $q->orderBy('created_at', 'desc')->limit($limit)->get();

        return $customers->map(function (User $user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'company_name' => $user->company_name,
                'avatar_url' => $user->avatar_url,
                'orders_count' => (int) $user->orders_count,
                'created_at' => $user->created_at?->toISOString(),
            ];
        })->all();
    }

    /**
     * Search products for POS catalog lookup.
     * Returns lightweight, authoritative catalog items with availability and pricing.
     */
    public function searchProducts(string $query = '', ?int $warehouseId = null, int $limit = 25): array
    {
        $limit = min(max(1, $limit), 60);

        $q = Product::where('status', 'published')
            ->with([
                'brand',
                'images',
                'variants.inventories.warehouse',
                'packageAllocations.variant',
                'pricingTiers',
            ]);

        $query = trim($query);
        if ($query !== '') {
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

            if (is_numeric($query)) {
                $q->where(function ($sub) use ($query, $likeOp) {
                    $sub->where('id', (int) $query)
                        ->orWhere('sku', $likeOp, "%{$query}%")
                        ->orWhere('name', $likeOp, "%{$query}%");
                });
            } else {
                $q->where(function ($sub) use ($query, $likeOp) {
                    $sub->where('name', $likeOp, "%{$query}%")
                        ->orWhere('sku', $likeOp, "%{$query}%")
                        ->orWhere('slug', $likeOp, "%{$query}%")
                        ->orWhereHas('brand', function ($bq) use ($query, $likeOp) {
                            $bq->where('name', $likeOp, "%{$query}%");
                        })
                        ->orWhereHas('variants', function ($vq) use ($query, $likeOp) {
                            $vq->where('sku', $likeOp, "%{$query}%");
                        });
                });
            }
        }

        $products = $q->orderBy('name', 'asc')->limit($limit)->get();

        return $products->map(function (Product $product) use ($warehouseId) {
            $hasAllocations = $product->packageAllocations->isNotEmpty();
            $variants = $product->variants;
            $hasVariants = $variants->isNotEmpty();
            $totalStock = $product->getTotalAvailableStock();
            $isSoldOut = (bool) ($product->is_sold_out || $totalStock <= 0);

            // Warehouse stock breakdown
            $breakdown = $product->getWarehouseStockBreakdown();
            $selectedWarehouseStock = null;
            if ($warehouseId !== null) {
                foreach ($breakdown as $wh) {
                    if ((int) $wh['warehouse_id'] === $warehouseId) {
                        $selectedWarehouseStock = (int) $wh['available'];
                        break;
                    }
                }
            }

            return [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'sku' => $product->sku,
                'brand' => $product->brand?->name,
                'color_name' => $product->color_name,
                'moq' => max(1, (int) ($product->moq ?? 1)),
                'image_url' => $product->images->first()?->image_url ?? '/placeholder.jpg',
                'has_variants' => $hasVariants,
                'has_package_allocations' => $hasAllocations,
                'package_assortment_message' => $hasAllocations ? ($product->package_assortment_message ?: Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE) : null,
                'total_available_stock' => $totalStock,
                'selected_warehouse_stock' => $selectedWarehouseStock,
                'is_sold_out' => $isSoldOut,
                'unit_price' => (float) ($product->wholesale_price ?? $product->getEffectiveCustomerPrice() ?? 0),
                'pricing_tiers' => $product->pricingTiers->map(fn($t) => [
                    'min_quantity' => (int) $t->min_quantity,
                    'max_quantity' => $t->max_quantity ? (int) $t->max_quantity : null,
                    'unit_price' => (float) $t->unit_price,
                ])->values()->all(),
                'variants' => $hasVariants && !$hasAllocations ? $variants->map(fn($v) => [
                    'id' => $v->id,
                    'sku' => $v->sku,
                    'title' => $v->title,
                    'size' => $v->size,
                    'color' => $v->color,
                    'stock' => (int) $v->stock,
                    'price' => $v->price !== null ? (float) $v->price : (float) ($product->wholesale_price ?? 0),
                    'is_active' => (bool) $v->is_active,
                ])->values()->all() : [],
                'warehouse_breakdown' => $breakdown,
            ];
        })->all();
    }

    /**
     * Get active warehouses.
     */
    public function getActiveWarehouses(): array
    {
        return Warehouse::where('is_active', true)
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'code', 'city', 'country_code'])
            ->toArray();
    }

    /**
     * Preview calculation for POS cart using authoritative OrderCalculationService.
     */
    public function calculatePreview(
        array $items,
        User $customer,
        ?string $couponCode = null,
        ?float $shippingCost = null,
        ?string $shippingMethod = null
    ): array {
        if (empty($items)) {
            return [
                'subtotal' => 0.00,
                'discount_amount' => 0.00,
                'shipping_cost' => 0.00,
                'tax_amount' => 0.00,
                'other_charges' => 0.00,
                'total_amount' => 0.00,
                'total_quantity' => 0,
                'lines' => [],
            ];
        }

        $calc = $this->calculationService->calculate(
            itemsInput: $items,
            couponCode: $couponCode,
            shippingMethod: $shippingMethod ?? 'discuss_directly',
            carrier: 'POS Direct',
            shippingCostOverride: $shippingCost ?? 0.00,
            user: $customer
        );

        $cleanLines = array_map(function ($line) {
            return [
                'product_id' => $line['product_id'],
                'product_name' => $line['product_name'],
                'product_slug' => $line['product_slug'],
                'sku' => $line['sku'],
                'product_variant_id' => $line['product_variant_id'],
                'variant_title' => $line['variant_title'],
                'size' => $line['size'],
                'color' => $line['color'],
                'product_image_url' => $line['product_image_url'],
                'unit_price' => (float) $line['unit_price'],
                'quantity' => (int) $line['quantity'],
                'line_total' => (float) $line['line_total'],
                'package_breakdown' => $line['package_breakdown'],
            ];
        }, $calc['lines']);

        return [
            'subtotal' => (float) $calc['subtotal'],
            'discount_amount' => (float) $calc['discount_amount'],
            'coupon_code' => $calc['applied_coupon']?->code,
            'shipping_cost' => (float) $calc['shipping_cost'],
            'shipping_method' => $calc['shipping_method'],
            'tax_amount' => (float) $calc['tax_amount'],
            'other_charges' => (float) $calc['other_charges'],
            'total_amount' => (float) $calc['total_amount'],
            'total_quantity' => (int) $calc['total_quantity'],
            'lines' => $cleanLines,
        ];
    }

    /**
     * Authoritative, atomic execution of a POS sale.
     * Creates a real Order, deduces inventory, logs operator attribution, and records inventory adjustments.
     *
     * @throws ValidationException|InvalidArgumentException|\Exception
     */
    public function executeSale(
        User $admin,
        User $customer,
        array $items,
        array $options = []
    ): Order {
        if (! $admin->isAdmin()) {
            throw ValidationException::withMessages(['admin' => 'Unauthorized operator. Admin authentication required.']);
        }

        if ($customer->role !== User::ROLE_CUSTOMER) {
            throw ValidationException::withMessages(['customer' => 'POS sale buyer must be a valid customer account.']);
        }

        if (empty($items)) {
            throw ValidationException::withMessages(['items' => 'Sale items cannot be empty.']);
        }

        // Idempotency check to prevent duplicate order creation on rapid double-submit
        $idempotencyKey = $options['idempotency_key'] ?? null;
        if (!empty($idempotencyKey)) {
            $cachedOrderId = Cache::get("pos_idempotency_{$idempotencyKey}");
            if ($cachedOrderId) {
                $cachedOrder = Order::with(['items.product.images', 'items.variant', 'user', 'createdByAdmin', 'payments'])->find($cachedOrderId);
                if ($cachedOrder) {
                    return $cachedOrder;
                }
            }
        }

        // Concurrency lock per operator
        $lockKey = "pos_operator_lock_" . ($idempotencyKey ?: "admin_{$admin->id}");
        $lock = Cache::lock($lockKey, 10);
        if (!$lock->get()) {
            throw ValidationException::withMessages(['concurrency' => 'A POS transaction is already processing for this session. Please wait.']);
        }

        try {
            $createdOrder = DB::transaction(function () use ($admin, $customer, $items, $options) {
                // 1. Authoritative calculation and business rule verification
                $couponCode = $options['coupon_code'] ?? null;
                $shippingCost = isset($options['shipping_cost']) ? (float) $options['shipping_cost'] : 0.00;
                $shippingMethod = $options['shipping_method'] ?? 'POS In-Store Fulfillment';

                $calc = $this->calculationService->calculate(
                    itemsInput: $items,
                    couponCode: $couponCode,
                    shippingMethod: $shippingMethod,
                    carrier: 'POS Direct',
                    shippingCostOverride: $shippingCost,
                    user: $customer
                );

                // 2. Strict Inventory Re-Validation & Locking (pessimistic lock)
                $warehouseId = !empty($options['warehouse_id']) ? (int) $options['warehouse_id'] : null;

                foreach ($calc['lines'] as $line) {
                    $product = Product::where('id', $line['product_id'])->lockForUpdate()->first();
                    if (!$product || $product->status !== 'published') {
                        throw ValidationException::withMessages([
                            'items' => "Product '{$line['product_name']}' is no longer available for purchase."
                        ]);
                    }

                    if (!empty($line['locked_variants'])) {
                        foreach ($line['locked_variants'] as $lv) {
                            $vId = $lv['variant']->id;
                            $vLocked = ProductVariant::where('id', $vId)->lockForUpdate()->first();
                            $needed = (int) $lv['deduct_qty'];
                            if (!$vLocked || (int) $vLocked->stock < $needed) {
                                $avail = $vLocked ? (int) $vLocked->stock : 0;
                                throw ValidationException::withMessages([
                                    'stock' => "Insufficient stock for '{$line['product_name']}' ({$vLocked?->size} / {$vLocked?->color}). Available: {$avail}, Requested: {$needed}."
                                ]);
                            }
                        }
                    } else {
                        // Product level or standalone variant
                        if (!empty($line['product_variant_id'])) {
                            $vLocked = ProductVariant::where('id', $line['product_variant_id'])->lockForUpdate()->first();
                            $needed = (int) $line['quantity'];
                            if (!$vLocked || (int) $vLocked->stock < $needed) {
                                $avail = $vLocked ? (int) $vLocked->stock : 0;
                                throw ValidationException::withMessages([
                                    'stock' => "Insufficient stock for '{$line['product_name']}' ({$vLocked?->size}). Available: {$avail}, Requested: {$needed}."
                                ]);
                            }
                        } else {
                            // Variantless product
                            $needed = (int) $line['quantity'];
                            if ((int) $product->stock < $needed) {
                                $avail = (int) $product->stock;
                                throw ValidationException::withMessages([
                                    'stock' => "Insufficient stock for '{$line['product_name']}'. Available: {$avail}, Requested: {$needed}."
                                ]);
                            }
                        }
                    }
                }

                // 3. Generate Unique Order Number
                do {
                    $orderNumber = 'AYN-POS-' . date('Ymd') . '-' . strtoupper(Str::random(6));
                } while (Order::where('order_number', $orderNumber)->exists());

                // 4. Create the Authoritative Order Record
                $paymentMethod = $options['payment_method'] ?? 'pos_cash';
                $notes = $options['notes'] ?? null;

                $order = Order::create([
                    'order_number' => $orderNumber,
                    'user_id' => $customer->id,
                    'created_by_admin_id' => $admin->id,
                    'order_source' => 'pos',
                    'coupon_id' => $calc['applied_coupon']?->id,
                    'coupon_code' => $calc['applied_coupon']?->code,
                    'status' => 'processing',
                    'payment_status' => 'paid',
                    'fulfillment_status' => 'unfulfilled',
                    'currency' => 'USD',
                    'subtotal' => $calc['subtotal'],
                    'shipping_cost' => $calc['shipping_cost'],
                    'tax_amount' => $calc['tax_amount'],
                    'other_charges' => $calc['other_charges'],
                    'discount_amount' => $calc['discount_amount'],
                    'total_amount' => $calc['total_amount'],
                    'email' => $customer->email,
                    'shipping_name' => $customer->name,
                    'shipping_phone' => $customer->phone ?: 'N/A',
                    'shipping_address1' => $customer->company_name ?: 'POS Direct Sale',
                    'shipping_address2' => null,
                    'shipping_city' => 'Dhaka',
                    'shipping_region' => 'Dhaka Division',
                    'shipping_postal_code' => '1230',
                    'shipping_country_code' => 'BD',
                    'shipping_method' => $shippingMethod,
                    'carrier' => 'POS Direct',
                    'shipping_snapshot' => $calc['shipping_snapshot'] ?? null,
                    'payment_method' => $paymentMethod,
                    'notes' => $notes ? "[POS Note] {$notes}" : 'Point of Sale transaction',
                    'placed_at' => now(),
                ]);

                // 5. Create Order Items & Atomically Deduct Inventory
                foreach ($calc['lines'] as $line) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $line['product_id'],
                        'product_variant_id' => $line['product_variant_id'],
                        'product_name' => $line['product_name'],
                        'product_slug' => $line['product_slug'],
                        'sku' => $line['sku'],
                        'variant_title' => $line['variant_title'],
                        'size' => $line['size'],
                        'color' => $line['color'],
                        'product_image_url' => $line['product_image_url'],
                        'unit_price' => $line['unit_price'],
                        'buying_price_at_sale' => $line['buying_price_at_sale'],
                        'quantity' => $line['quantity'],
                        'line_total' => $line['line_total'],
                        'package_breakdown' => $line['package_breakdown'],
                    ]);

                    // Deduct inventory
                    if (!empty($line['locked_variants'])) {
                        foreach ($line['locked_variants'] as $lv) {
                            $variant = $lv['variant'];
                            $deductQty = (int) $lv['deduct_qty'];

                            if ($deductQty > 0) {
                                // 1. Deduct ProductVariant stock
                                $variant->decrement('stock', $deductQty);

                                // 2. Deduct Inventory record
                                $invQuery = Inventory::where('product_variant_id', $variant->id)->lockForUpdate();
                                if ($warehouseId !== null) {
                                    $inv = (clone $invQuery)->where('warehouse_id', $warehouseId)->first();
                                } else {
                                    $inv = null;
                                }
                                if (!$inv) {
                                    $inv = $invQuery->first();
                                }

                                if ($inv) {
                                    $prevQty = (int) $inv->quantity;
                                    $actualDeduct = min($prevQty, $deductQty);
                                    $inv->decrement('quantity', $actualDeduct);
                                    $newQty = $inv->fresh()->quantity;

                                    // Record authoritative inventory adjustment
                                    AdminInventoryAdjustment::create([
                                        'inventory_id' => $inv->id,
                                        'admin_user_id' => $admin->id,
                                        'previous_quantity' => $prevQty,
                                        'adjustment_amount' => -$actualDeduct,
                                        'resulting_quantity' => $newQty,
                                        'reason' => "POS Order #{$orderNumber}",
                                    ]);
                                }
                            }
                        }

                        // Deduct product level aggregate stock
                        $line['product']->decrement('stock', $line['quantity']);
                    } else {
                        // Single variant or variantless
                        $product = $line['product'];
                        $deductQty = (int) $line['quantity'];

                        if (!empty($line['product_variant_id'])) {
                            $variant = ProductVariant::find($line['product_variant_id']);
                            if ($variant && $deductQty > 0) {
                                $variant->decrement('stock', $deductQty);

                                $invQuery = Inventory::where('product_variant_id', $variant->id)->lockForUpdate();
                                if ($warehouseId !== null) {
                                    $inv = (clone $invQuery)->where('warehouse_id', $warehouseId)->first();
                                } else {
                                    $inv = null;
                                }
                                if (!$inv) {
                                    $inv = $invQuery->first();
                                }

                                if ($inv) {
                                    $prevQty = (int) $inv->quantity;
                                    $actualDeduct = min($prevQty, $deductQty);
                                    $inv->decrement('quantity', $actualDeduct);
                                    $newQty = $inv->fresh()->quantity;

                                    AdminInventoryAdjustment::create([
                                        'inventory_id' => $inv->id,
                                        'admin_user_id' => $admin->id,
                                        'previous_quantity' => $prevQty,
                                        'adjustment_amount' => -$actualDeduct,
                                        'resulting_quantity' => $newQty,
                                        'reason' => "POS Order #{$orderNumber}",
                                    ]);
                                }
                            }
                            $product->decrement('stock', $deductQty);
                        } else {
                            // Variantless
                            if ($deductQty > 0) {
                                $product->decrement('stock', $deductQty);

                                $invQuery = Inventory::where('product_id', $product->id)->lockForUpdate();
                                if ($warehouseId !== null) {
                                    $inv = (clone $invQuery)->where('warehouse_id', $warehouseId)->first();
                                } else {
                                    $inv = null;
                                }
                                if (!$inv) {
                                    $inv = $invQuery->first();
                                }

                                if ($inv) {
                                    $prevQty = (int) $inv->quantity;
                                    $actualDeduct = min($prevQty, $deductQty);
                                    $inv->decrement('quantity', $actualDeduct);
                                    $newQty = $inv->fresh()->quantity;

                                    AdminInventoryAdjustment::create([
                                        'inventory_id' => $inv->id,
                                        'admin_user_id' => $admin->id,
                                        'previous_quantity' => $prevQty,
                                        'adjustment_amount' => -$actualDeduct,
                                        'resulting_quantity' => $newQty,
                                        'reason' => "POS Order #{$orderNumber}",
                                    ]);
                                }
                            }
                        }
                    }

                    // Update sold out if stock reached zero
                    if ($line['product']->fresh()->getTotalAvailableStock() <= 0) {
                        $line['product']->update(['is_sold_out' => true]);
                    }
                }

                // 6. Record Payment
                Payment::create([
                    'order_id' => $order->id,
                    'customer_id' => $customer->id,
                    'transaction_id' => 'pos_' . strtolower(Str::random(16)),
                    'provider' => $paymentMethod,
                    'payment_method' => $paymentMethod,
                    'amount' => $order->total_amount,
                    'currency' => 'USD',
                    'status' => 'succeeded',
                    'payer_name' => $customer->name,
                    'payment_date' => now(),
                    'confirmed_at' => now(),
                    'notes' => "POS payment confirmed by {$admin->name}",
                ]);

                // 7. Record Timeline Events
                OrderStatusEvent::create([
                    'order_id' => $order->id,
                    'user_id' => $admin->id,
                    'event_type' => 'order_placed',
                    'message' => "Order #{$orderNumber} created via POS by {$admin->name} for customer {$customer->name}.",
                ]);

                OrderStatusEvent::create([
                    'order_id' => $order->id,
                    'user_id' => $admin->id,
                    'event_type' => 'payment_succeeded',
                    'message' => "POS payment of \${$order->total_amount} ({$paymentMethod}) processed successfully.",
                ]);

                // 8. Log system activity audit
                ActivityLogger::log('pos.order_created', $order, [
                    'order_number' => $orderNumber,
                    'admin_id' => $admin->id,
                    'admin_name' => $admin->name,
                    'customer_id' => $customer->id,
                    'customer_name' => $customer->name,
                    'total_amount' => (float) $order->total_amount,
                    'items_count' => count($calc['lines']),
                ]);

                return $order;
            });

            if (!empty($idempotencyKey)) {
                Cache::put("pos_idempotency_{$idempotencyKey}", $createdOrder->id, now()->addMinutes(15));
            }

            return $createdOrder->load(['items.product.images', 'items.variant', 'user', 'createdByAdmin', 'payments']);
        } finally {
            optional($lock)->release();
        }
    }
}
