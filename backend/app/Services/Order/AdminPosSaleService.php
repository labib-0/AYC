<?php

namespace App\Services\Order;

use App\Models\AdminInventoryAdjustment;
use App\Models\Coupon;
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
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class AdminPosSaleService
{
    public const WALKIN_CUSTOMER_EMAIL = 'walkin@ayaanclothing.com';

    public function __construct(
        private readonly OrderCalculationService $calculationService,
        private readonly AdminAuthorizationService $authorization
    ) {}

    /**
     * Retrieve or create the single canonical walk-in customer record for in-store sales.
     */
    public function getOrCreateWalkinCustomer(): User
    {
        return User::firstOrCreate(
            ['email' => self::WALKIN_CUSTOMER_EMAIL],
            [
                'name' => 'Walk-in Customer',
                'role' => User::ROLE_CUSTOMER,
                'phone' => '+880 1700-000000',
                'company_name' => 'POS Walk-in Counter',
                'password' => Hash::make(Str::random(32)),
                'email_verified_at' => now(),
                'status' => 'active',
            ]
        );
    }

    /**
     * Fast customer registration from POS screen.
     * Matches existing customers by email or phone to prevent duplicate accounts.
     * Never generates synthetic or fabricated email addresses.
     */
    public function quickCreateCustomer(array $data, User $admin): array
    {
        $name = trim($data['name']);
        $phone = isset($data['phone']) ? trim($data['phone']) : null;
        $email = !empty($data['email']) ? strtolower(trim($data['email'])) : null;
        $companyName = !empty($data['company_name']) ? trim($data['company_name']) : null;

        // 1. Check duplicate/existing customer by email if provided
        if (!empty($email)) {
            $existing = User::where('role', User::ROLE_CUSTOMER)
                ->whereNotNull('email')
                ->whereRaw('lower(email) = ?', [$email])
                ->first();
            if ($existing) {
                return [
                    'customer' => $this->formatCustomerResponse($existing),
                    'matched' => true,
                    'created' => false,
                ];
            }
        }

        // 2. Check duplicate/existing customer by phone if provided
        if (!empty($phone)) {
            $cleanPhone = preg_replace('/\D/', '', $phone);
            $matchingCustomers = User::where('role', User::ROLE_CUSTOMER)
                ->whereNotNull('phone')
                ->where(function ($q) use ($phone, $cleanPhone) {
                    $q->where('phone', $phone);
                    if (strlen($cleanPhone) >= 7) {
                        $suffix = substr($cleanPhone, -7);
                        $q->orWhere('phone', 'like', "%{$suffix}%");
                    }
                })
                ->get()
                ->filter(function ($u) use ($phone, $cleanPhone) {
                    if ($u->phone === $phone) {
                        return true;
                    }
                    $uClean = preg_replace('/\D/', '', (string) $u->phone);
                    return $uClean !== '' && ($uClean === $cleanPhone || (strlen($cleanPhone) >= 8 && str_ends_with($uClean, substr($cleanPhone, -8))));
                });

            if ($matchingCustomers->count() === 1) {
                return [
                    'customer' => $this->formatCustomerResponse($matchingCustomers->first()),
                    'matched' => true,
                    'created' => false,
                ];
            } elseif ($matchingCustomers->count() > 1) {
                throw ValidationException::withMessages([
                    'phone' => 'Multiple existing customers match this phone number. Please search and select the correct customer record.',
                ]);
            }
        }

        // 3. Create new real customer account (No synthetic email!)
        $customer = User::create([
            'name' => $name,
            'email' => $email, // Stored as real email or null. Never fabricated.
            'phone' => $phone ?: null,
            'company_name' => $companyName ?: null,
            'role' => User::ROLE_CUSTOMER,
            'password' => Hash::make(Str::random(32)),
            'email_verified_at' => null, // Explicitly unverified for quick registration
            'status' => 'active',
        ]);

        ActivityLogger::log('pos.customer_quick_created', $customer, [
            'admin_id' => $admin->id,
            'admin_name' => $admin->name,
            'customer_id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
        ]);

        return [
            'customer' => $this->formatCustomerResponse($customer),
            'matched' => false,
            'created' => true,
        ];
    }

    /**
     * Format customer representation for POS responses.
     */
    public function formatCustomerResponse(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'company_name' => $user->company_name,
            'avatar_url' => $user->avatar_url,
            'orders_count' => (int) ($user->orders()->count() ?? 0),
            'created_at' => $user->created_at?->toISOString(),
            'is_walkin' => $user->email === self::WALKIN_CUSTOMER_EMAIL,
        ];
    }

    /**
     * Search existing customers for POS sale assignment.
     * Strictly restricted to customer accounts (role = 'customer').
     * Excludes generic walk-in account from selection results.
     */
    public function searchCustomers(string $query = '', int $limit = 20): array
    {
        $limit = min(max(1, $limit), 50);

        $q = User::where('role', User::ROLE_CUSTOMER)
            ->where(function ($sub) {
                $sub->whereNull('email')
                    ->orWhere('email', '!=', self::WALKIN_CUSTOMER_EMAIL);
            })
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
                'is_walkin' => $user->email === self::WALKIN_CUSTOMER_EMAIL,
            ];
        })->all();
    }

    /**
     * Search products for POS catalog lookup.
     * Returns lightweight, authoritative catalog items with availability and pricing.
     */
    public function searchProducts(string $query = '', ?int $warehouseId = null, int $limit = 25, ?int $categoryId = null): array
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

        if ($categoryId !== null) {
            $q->whereHas('categories', function ($cq) use ($categoryId) {
                $cq->where('categories.id', $categoryId);
            });
        }

        $query = trim($query);
        if ($query !== '') {
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

            if (is_numeric($query)) {
                $q->where(function ($sub) use ($query, $likeOp) {
                    $sub->where('id', (int) $query)
                        ->orWhere('sku', $likeOp, "%{$query}%")
                        ->orWhere('name', $likeOp, "%{$query}%")
                        ->orWhereHas('variants', function ($vq) use ($query, $likeOp) {
                            $vq->where('sku', $likeOp, "%{$query}%");
                        });
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

            // Prioritize exact SKU or ID match
            $exactEscaped = str_replace("'", "''", $query);
            $numericId = is_numeric($query) ? (int) $query : 0;
            $q->orderByRaw("CASE
                WHEN sku = '{$exactEscaped}' THEN 0
                WHEN id = {$numericId} THEN 0
                ELSE 1
            END");
        }

        $products = $q->orderBy('name', 'asc')->limit($limit)->get();

        return $products->map(function (Product $product) use ($warehouseId) {
            $hasAllocations = $product->packageAllocations->isNotEmpty();
            $variants = $product->variants;
            $hasVariants = $variants->isNotEmpty();
            $totalStock = $product->getTotalAvailableStock();
            $isSoldOut = (bool) ($product->is_sold_out || $totalStock <= 0);

            // Warehouse stock breakdown
            $rawBreakdown = $product->getWarehouseStockBreakdown();
            $breakdown = array_map(function ($wh) {
                $avail = (int) ($wh['available_quantity'] ?? $wh['available'] ?? 0);
                $onHand = (int) ($wh['on_hand_quantity'] ?? $wh['on_hand'] ?? 0);
                return array_merge($wh, [
                    'available' => $avail,
                    'available_quantity' => $avail,
                    'on_hand' => $onHand,
                    'on_hand_quantity' => $onHand,
                ]);
            }, $rawBreakdown);

            $selectedWarehouseStock = null;
            if ($warehouseId !== null) {
                foreach ($breakdown as $wh) {
                    if ((int) $wh['warehouse_id'] === $warehouseId) {
                        $selectedWarehouseStock = (int) ($wh['available'] ?? $wh['available_quantity'] ?? 0);
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
        ?User $admin = null,
        ?string $couponCode = null,
        ?array $manualDiscount = null,
        ?float $shippingCost = null,
        ?string $shippingMethod = null,
        ?array $payment = null
    ): array {
        if (empty($items)) {
            return [
                'subtotal' => 0.00,
                'coupon_discount_amount' => 0.00,
                'manual_discount_amount' => 0.00,
                'discount_amount' => 0.00,
                'shipping_cost' => 0.00,
                'tax_amount' => 0.00,
                'other_charges' => 0.00,
                'total_amount' => 0.00,
                'paid_amount' => 0.00,
                'balance_due' => 0.00,
                'payment_status' => 'pending',
                'total_quantity' => 0,
                'lines' => [],
            ];
        }

        // Check manual discount RBAC permission if requested
        if (!empty($manualDiscount) && is_array($manualDiscount)) {
            if ($admin && !$this->authorization->can($admin, 'pos.discount')) {
                throw ValidationException::withMessages([
                    'manual_discount' => 'You do not have permission to apply manual discounts on POS sales.'
                ]);
            }
        }

        $calc = $this->calculationService->calculate(
            itemsInput: $items,
            couponCode: $couponCode,
            shippingMethod: $shippingMethod ?? 'POS In-Store Fulfillment',
            carrier: 'POS Direct',
            shippingCostOverride: $shippingCost ?? 0.00,
            user: $customer,
            manualDiscount: $manualDiscount
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

        $totalAmount = (float) $calc['total_amount'];
        $paymentMethod = $payment['payment_method'] ?? 'pos_cash';

        if ($paymentMethod === 'pos_cash') {
            if (isset($payment['tendered_amount'])) {
                $tenderedAmount = (float) $payment['tendered_amount'];
            } elseif (isset($payment['paid_amount'])) {
                $tenderedAmount = (float) $payment['paid_amount'];
            } else {
                $tenderedAmount = $totalAmount;
            }

            if ($tenderedAmount < 0) {
                throw ValidationException::withMessages([
                    'tendered_amount' => 'Tendered amount cannot be negative.'
                ]);
            }

            if ($tenderedAmount >= $totalAmount) {
                $actualPaid = $totalAmount;
                $changeReturn = round($tenderedAmount - $totalAmount, 2);
                $balanceDue = 0.00;
                $paymentStatus = $totalAmount > 0 ? 'paid' : 'pending';
            } else {
                $actualPaid = $tenderedAmount;
                $changeReturn = 0.00;
                $balanceDue = round($totalAmount - $tenderedAmount, 2);
                $paymentStatus = $tenderedAmount > 0 ? 'partially_paid' : 'pending';
            }
        } else {
            // Non-cash payment methods (card, bank_transfer, mobile_banking)
            $actualPaid = isset($payment['paid_amount']) ? (float) $payment['paid_amount'] : $totalAmount;
            $tenderedAmount = $actualPaid;
            $changeReturn = 0.00;

            if ($actualPaid < 0) {
                throw ValidationException::withMessages([
                    'paid_amount' => 'Paid amount cannot be negative.'
                ]);
            }
            if ($actualPaid > $totalAmount) {
                throw ValidationException::withMessages([
                    'paid_amount' => "Paid amount (\${$actualPaid}) cannot exceed the grand total (\${$totalAmount})."
                ]);
            }

            $balanceDue = max(0.0, round($totalAmount - $actualPaid, 2));
            $paymentStatus = 'pending';
            if ($actualPaid >= $totalAmount && $totalAmount > 0) {
                $paymentStatus = 'paid';
            } elseif ($actualPaid > 0) {
                $paymentStatus = 'partially_paid';
            }
        }

        return [
            'subtotal' => (float) $calc['subtotal'],
            'coupon_discount_amount' => (float) ($calc['coupon_discount_amount'] ?? 0.00),
            'manual_discount_amount' => (float) ($calc['manual_discount_amount'] ?? 0.00),
            'discount_amount' => (float) $calc['discount_amount'],
            'coupon_code' => $calc['applied_coupon']?->code,
            'manual_discount' => $calc['manual_discount'] ?? null,
            'shipping_cost' => (float) $calc['shipping_cost'],
            'shipping_method' => $calc['shipping_method'],
            'tax_amount' => (float) $calc['tax_amount'],
            'other_charges' => (float) $calc['other_charges'],
            'total_amount' => $totalAmount,
            'paid_amount' => round($actualPaid, 2),
            'tendered_amount' => round($tenderedAmount, 2),
            'change_return' => round($changeReturn, 2),
            'balance_due' => $balanceDue,
            'payment_status' => $paymentStatus,
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

        if ($customer->email === self::WALKIN_CUSTOMER_EMAIL) {
            throw ValidationException::withMessages(['customer' => 'New POS sales cannot use the generic walk-in customer account. Please select or register an identifiable customer.']);
        }

        if (empty($items)) {
            throw ValidationException::withMessages(['items' => 'Sale items cannot be empty.']);
        }

        // Validate manual discount permissions
        $manualDiscount = $options['manual_discount'] ?? null;
        if (!empty($manualDiscount) && is_array($manualDiscount)) {
            if (!$this->authorization->can($admin, 'pos.discount')) {
                throw ValidationException::withMessages([
                    'manual_discount' => 'You do not have permission to apply manual discounts on POS sales.'
                ]);
            }
        }

        // Validate payment method
        $paymentMethod = $options['payment_method'] ?? 'pos_cash';
        $allowedPaymentMethods = ['pos_cash', 'card', 'bank_transfer', 'mobile_banking', 'transfer'];
        if (!in_array($paymentMethod, $allowedPaymentMethods, true)) {
            throw ValidationException::withMessages([
                'payment_method' => "Unsupported payment method '{$paymentMethod}'. Supported methods: pos_cash, card, bank_transfer, mobile_banking."
            ]);
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
            $createdOrder = DB::transaction(function () use ($admin, $customer, $items, $options, $manualDiscount, $paymentMethod) {
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
                    user: $customer,
                    manualDiscount: $manualDiscount
                );

                $totalAmount = (float) $calc['total_amount'];

                if ($paymentMethod === 'pos_cash') {
                    if (isset($options['tendered_amount'])) {
                        $tenderedAmount = (float) $options['tendered_amount'];
                    } elseif (isset($options['paid_amount'])) {
                        $tenderedAmount = (float) $options['paid_amount'];
                    } else {
                        $tenderedAmount = $totalAmount;
                    }

                    if ($tenderedAmount < 0) {
                        throw ValidationException::withMessages([
                            'tendered_amount' => 'Tendered amount cannot be negative.'
                        ]);
                    }

                    if ($tenderedAmount < $totalAmount) {
                        throw ValidationException::withMessages([
                            'tendered_amount' => "Cash tendered (\${$tenderedAmount}) is insufficient for the total amount due (\${$totalAmount})."
                        ]);
                    }

                    $actualPaid = $totalAmount;
                    $changeReturn = round($tenderedAmount - $totalAmount, 2);
                    $balanceDue = 0.00;
                    $paymentStatus = 'paid';
                } else {
                    // Non-cash payment (card, bank_transfer, mobile_banking)
                    $actualPaid = isset($options['paid_amount']) ? (float) $options['paid_amount'] : $totalAmount;
                    $tenderedAmount = $actualPaid;
                    $changeReturn = 0.00;

                    if ($actualPaid < 0) {
                        throw ValidationException::withMessages([
                            'paid_amount' => 'Paid amount cannot be negative.'
                        ]);
                    }
                    if ($actualPaid > $totalAmount) {
                        throw ValidationException::withMessages([
                            'paid_amount' => "Paid amount (\${$actualPaid}) cannot exceed the grand total (\${$totalAmount})."
                        ]);
                    }

                    $balanceDue = max(0.0, round($totalAmount - $actualPaid, 2));
                    $paymentStatus = 'pending';
                    if ($actualPaid >= $totalAmount && $totalAmount > 0) {
                        $paymentStatus = 'paid';
                    } elseif ($actualPaid > 0) {
                        $paymentStatus = 'partially_paid';
                    }
                }

                // If coupon applied, lock and validate usage limit atomically
                if ($calc['applied_coupon']) {
                    $cLocked = Coupon::where('id', $calc['applied_coupon']->id)->lockForUpdate()->first();
                    if ($cLocked->usage_limit && $cLocked->usage_count >= $cLocked->usage_limit) {
                        throw ValidationException::withMessages([
                            'coupon' => 'This promo code has reached its usage limit.'
                        ]);
                    }
                    $cLocked->increment('usage_count');
                }

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
                $paymentReference = trim((string) ($options['payment_reference'] ?? ''));
                $notes = $options['notes'] ?? null;

                $order = Order::create([
                    'order_number' => $orderNumber,
                    'user_id' => $customer->id,
                    'created_by_admin_id' => $admin->id,
                    'order_source' => 'pos',
                    'coupon_id' => $calc['applied_coupon']?->id,
                    'coupon_code' => $calc['applied_coupon']?->code,
                    'status' => $paymentStatus === 'paid' ? 'processing' : 'pending',
                    'payment_status' => $paymentStatus,
                    'fulfillment_status' => 'unfulfilled',
                    'currency' => 'USD',
                    'subtotal' => $calc['subtotal'],
                    'shipping_cost' => $calc['shipping_cost'],
                    'tax_amount' => $calc['tax_amount'],
                    'other_charges' => $calc['other_charges'],
                    'discount_amount' => $calc['discount_amount'],
                    'manual_discount_amount' => (float) ($calc['manual_discount_amount'] ?? 0.00),
                    'manual_discount_type' => $calc['manual_discount']['type'] ?? null,
                    'manual_discount_value' => isset($calc['manual_discount']['value']) ? (float) $calc['manual_discount']['value'] : null,
                    'manual_discount_reason' => $calc['manual_discount']['reason'] ?? null,
                    'total_amount' => $totalAmount,
                    'paid_amount' => round($actualPaid, 2),
                    'balance_due' => $balanceDue,
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
                    'payment_details' => [
                        'method' => $paymentMethod,
                        'reference' => $paymentReference ?: null,
                        'tendered_amount' => round($tenderedAmount, 2),
                        'change_return' => round($changeReturn, 2),
                        'paid_amount' => round($actualPaid, 2),
                        'balance_due' => $balanceDue,
                        'status' => $paymentStatus,
                        'warehouse_id' => $warehouseId,
                    ],
                    'payment_confirmed_at' => $paymentStatus === 'paid' ? now() : null,
                    'payment_confirmed_by' => $paymentStatus === 'paid' ? $admin->id : null,
                    'notes' => $notes ? "[POS Note] {$notes}" : 'Point of Sale transaction',
                    'placed_at' => now(),
                ]);

                // 5. Create Order Items & Atomically Deduct Inventory via Canonical Workflow
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
                }

                // If payment is confirmed at counter, decrement inventory atomically via canonical Order service
                if ($paymentStatus === 'paid' || $actualPaid > 0) {
                    $order->decrementInventory($admin->id, "POS Order #{$orderNumber}", $warehouseId);
                }

                // 6. Record Authoritative Payment record
                if ($actualPaid > 0) {
                    $trxId = !empty($paymentReference) ? $paymentReference : ('pos_' . strtolower(Str::random(16)));

                    $payment = Payment::create([
                        'order_id' => $order->id,
                        'customer_id' => $customer->id,
                        'transaction_id' => $trxId,
                        'provider' => $paymentMethod,
                        'payment_method' => $paymentMethod,
                        'amount' => round($actualPaid, 2),
                        'currency' => 'USD',
                        'status' => 'succeeded',
                        'payer_name' => $customer->name,
                        'account_number' => $paymentReference ?: null,
                        'payload' => [
                            'tendered_amount' => round($tenderedAmount, 2),
                            'change_return' => round($changeReturn, 2),
                            'is_walkin' => $customer->email === self::WALKIN_CUSTOMER_EMAIL,
                        ],
                        'payment_date' => now(),
                        'confirmed_at' => now(),
                        'confirmed_by' => $admin->id,
                        'notes' => $paymentMethod === 'pos_cash'
                            ? "POS cash payment of \${$actualPaid} confirmed by {$admin->name}. Tendered: \${$tenderedAmount}, Change: \${$changeReturn}."
                            : "POS payment of \${$actualPaid} ({$paymentMethod}) confirmed by {$admin->name}. Reference: " . ($paymentReference ?: 'N/A'),
                    ]);

                    ActivityLogger::log('pos.payment_recorded', $payment, [
                        'order_id' => $order->id,
                        'order_number' => $orderNumber,
                        'payment_status' => $paymentStatus,
                        'payment_method' => $paymentMethod,
                        'paid_amount' => round($actualPaid, 2),
                        'tendered_amount' => round($tenderedAmount, 2),
                        'change_return' => round($changeReturn, 2),
                        'balance_due' => $balanceDue,
                        'transaction_id' => $trxId,
                    ]);
                }

                // 7. Audit manual discount if applied
                if (!empty($calc['manual_discount'])) {
                    ActivityLogger::log('pos.manual_discount', $order, [
                        'admin_id' => $admin->id,
                        'admin_name' => $admin->name,
                        'order_number' => $orderNumber,
                        'previous_total' => (float) $calc['subtotal'],
                        'discount_type' => $calc['manual_discount']['type'],
                        'discount_value' => (float) $calc['manual_discount']['value'],
                        'discount_amount' => (float) $calc['manual_discount_amount'],
                        'reason' => $calc['manual_discount']['reason'],
                        'final_total' => (float) $order->total_amount,
                    ]);
                }

                // 8. Record Timeline Events
                OrderStatusEvent::create([
                    'order_id' => $order->id,
                    'user_id' => $admin->id,
                    'event_type' => 'order_placed',
                    'message' => "Order #{$orderNumber} created via POS by {$admin->name} for customer {$customer->name}.",
                ]);

                if ($actualPaid > 0) {
                    $eventMsg = $paymentStatus === 'paid'
                        ? ($paymentMethod === 'pos_cash' && $changeReturn > 0
                            ? "POS cash payment of \${$actualPaid} processed in full. Tendered: \${$tenderedAmount}, Change returned: \${$changeReturn}."
                            : "POS payment of \${$actualPaid} ({$paymentMethod}) processed in full.")
                        : "POS partial payment of \${$actualPaid} ({$paymentMethod}) processed. Balance due: \${$balanceDue}.";

                    OrderStatusEvent::create([
                        'order_id' => $order->id,
                        'user_id' => $admin->id,
                        'event_type' => $paymentStatus === 'paid' ? 'payment_succeeded' : 'payment_partial',
                        'message' => $eventMsg,
                    ]);
                }

                // 9. Dispatch canonical customer lifecycle notification
                $targetLifecycleStage = $paymentStatus === 'paid'
                    ? Order::CUSTOMER_STATUS_ORDER_CONFIRMED
                    : Order::CUSTOMER_STATUS_PAYMENT_PENDING;
                $order->notifyCustomerOfLifecycleTransition($targetLifecycleStage);

                // 10. Log system activity audit
                ActivityLogger::log('pos.order_created', $order, [
                    'order_number' => $orderNumber,
                    'admin_id' => $admin->id,
                    'admin_name' => $admin->name,
                    'customer_id' => $customer->id,
                    'customer_name' => $customer->name,
                    'total_amount' => (float) $order->total_amount,
                    'paid_amount' => round($actualPaid, 2),
                    'tendered_amount' => round($tenderedAmount, 2),
                    'change_return' => round($changeReturn, 2),
                    'balance_due' => $balanceDue,
                    'payment_status' => $paymentStatus,
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
