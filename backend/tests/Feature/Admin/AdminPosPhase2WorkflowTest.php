<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Coupon;
use App\Models\CouponAdminBinding;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Audit\ActivityLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPosPhase2WorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $posAdminWithDiscount;
    private User $posAdminWithoutDiscount;
    private User $couponBoundAdmin;
    private User $customer;
    private Warehouse $warehouse;
    private Product $product;
    private Coupon $validCoupon;
    private Coupon $expiredCoupon;
    private Coupon $inactiveCoupon;
    private Coupon $cappedCoupon;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Seed Permissions
        $posView = Permission::firstOrCreate(
            ['slug' => 'pos.view'],
            ['name' => 'View POS', 'module' => 'POS', 'action' => 'view', 'description' => 'View POS', 'is_system' => true]
        );
        $posCreate = Permission::firstOrCreate(
            ['slug' => 'pos.create'],
            ['name' => 'Create POS Sale', 'module' => 'POS', 'action' => 'create', 'description' => 'Create POS Sale', 'is_system' => true]
        );
        $posDiscount = Permission::firstOrCreate(
            ['slug' => 'pos.discount'],
            ['name' => 'Apply Manual POS Discount', 'module' => 'POS', 'action' => 'discount', 'description' => 'Apply Manual POS Discount', 'is_system' => true]
        );

        // Role with pos.discount
        $roleWithDiscount = Role::firstOrCreate(
            ['slug' => 'pos_manager'],
            ['name' => 'POS Manager', 'description' => 'POS with discount', 'is_system' => false]
        );
        $roleWithDiscount->permissions()->syncWithoutDetaching([$posView->id, $posCreate->id, $posDiscount->id]);

        // Role without pos.discount
        $roleWithoutDiscount = Role::firstOrCreate(
            ['slug' => 'pos_cashier'],
            ['name' => 'POS Cashier', 'description' => 'POS without discount', 'is_system' => false]
        );
        $roleWithoutDiscount->permissions()->syncWithoutDetaching([$posView->id, $posCreate->id]);

        // 2. Users
        $this->superAdmin = User::factory()->create([
            'name' => 'Super Administrator',
            'email' => 'superadmin@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => true,
            'status' => 'active',
        ]);

        $this->posAdminWithDiscount = User::factory()->create([
            'name' => 'Discount Permitted Admin',
            'email' => 'discountadmin@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status' => 'active',
        ]);
        $this->posAdminWithDiscount->rbacRoles()->attach($roleWithDiscount->id);

        $this->posAdminWithoutDiscount = User::factory()->create([
            'name' => 'Cashier No Discount Admin',
            'email' => 'cashier@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status' => 'active',
        ]);
        $this->posAdminWithoutDiscount->rbacRoles()->attach($roleWithoutDiscount->id);

        $this->couponBoundAdmin = User::factory()->create([
            'name' => 'Coupon Bound Sales Admin',
            'email' => 'couponbound@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status' => 'active',
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Khadija Rahman',
            'email' => 'khadija@boutique.com',
            'phone' => '+8801811223344',
            'company_name' => 'Elegance Boutique',
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
        ]);

        // 3. Warehouse & Product
        $this->warehouse = Warehouse::firstOrCreate(
            ['code' => 'WH-TEST-P2'],
            ['name' => 'Phase 2 Test Warehouse', 'country_code' => 'BD', 'is_active' => true]
        );

        $brand = Brand::firstOrCreate(['slug' => 'test-brand'], ['name' => 'Test Brand']);

        $this->product = Product::create([
            'brand_id' => $brand->id,
            'name' => 'POS Phase 2 Test Garment',
            'slug' => 'pos-phase-2-test-garment',
            'sku' => 'POS-P2-001',
            'wholesale_price' => 100.00,
            'cost_price' => 45.00,
            'moq' => 1,
            'stock' => 200,
            'status' => 'published',
            'is_sold_out' => false,
        ]);

        Inventory::create([
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->product->id,
            'quantity' => 200,
            'safety_stock' => 10,
        ]);

        // 4. Coupons
        $this->validCoupon = Coupon::create([
            'code' => 'SAVE10PCT',
            'discount_type' => 'percentage',
            'discount_value' => 10, // 10%
            'min_spend' => 50,
            'max_discount' => 100,
            'usage_limit' => 50,
            'usage_count' => 0,
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addMonth(),
        ]);

        $this->expiredCoupon = Coupon::create([
            'code' => 'EXPIRED20',
            'discount_type' => 'percentage',
            'discount_value' => 20,
            'min_spend' => 0,
            'usage_limit' => 10,
            'usage_count' => 0,
            'is_active' => true,
            'starts_at' => now()->subMonths(2),
            'expires_at' => now()->subDay(),
        ]);

        $this->inactiveCoupon = Coupon::create([
            'code' => 'INACTIVE15',
            'discount_type' => 'percentage',
            'discount_value' => 15,
            'min_spend' => 0,
            'is_active' => false,
        ]);

        $this->cappedCoupon = Coupon::create([
            'code' => 'CAP50',
            'discount_type' => 'flat',
            'discount_value' => 200, // $200 requested, but capped at $50
            'max_discount' => 50,
            'min_spend' => 100,
            'is_active' => true,
        ]);
    }

    /**
     * TEST 1: No discount -> correct total.
     */
    public function test_01_no_discount_correct_total(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // 2 units * $100 = $200 subtotal
        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 200)
            ->assertJsonPath('data.discount_amount', 0)
            ->assertJsonPath('data.total_amount', 200)
            ->assertJsonPath('data.paid_amount', 200)
            ->assertJsonPath('data.balance_due', 0)
            ->assertJsonPath('data.payment_status', 'paid');
    }

    /**
     * TEST 2: Valid percentage manual discount -> correct total.
     */
    public function test_02_valid_percentage_manual_discount(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // Subtotal $500 (5 * $100), 10% manual discount = $50 off -> total $450
        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 5],
            ],
            'manual_discount' => [
                'type' => 'percentage',
                'value' => 10,
                'reason' => 'Negotiated wholesale loyalty pricing',
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 500)
            ->assertJsonPath('data.manual_discount_amount', 50)
            ->assertJsonPath('data.discount_amount', 50)
            ->assertJsonPath('data.total_amount', 450)
            ->assertJsonPath('data.balance_due', 0);
    }

    /**
     * TEST 3: Valid flat manual discount -> correct total.
     */
    public function test_03_valid_flat_manual_discount(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // Subtotal $400, flat $35 discount -> total $365
        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 4],
            ],
            'manual_discount' => [
                'type' => 'fixed',
                'value' => 35,
                'reason' => 'Special store opening promotional credit',
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 400)
            ->assertJsonPath('data.manual_discount_amount', 35)
            ->assertJsonPath('data.total_amount', 365);
    }

    /**
     * TEST 4: Discount exceeds eligible amount -> rejected.
     */
    public function test_04_discount_exceeds_eligible_amount_rejected(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // Subtotal $200, flat $250 discount -> rejected
        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
            'manual_discount' => [
                'type' => 'fixed',
                'value' => 250,
                'reason' => 'Invalid huge discount',
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    /**
     * TEST 5: Unauthorized Admin attempts manual discount -> rejected.
     */
    public function test_05_unauthorized_admin_cannot_apply_manual_discount(): void
    {
        Sanctum::actingAs($this->posAdminWithoutDiscount);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 3],
            ],
            'manual_discount' => [
                'type' => 'percentage',
                'value' => 15,
                'reason' => 'Attempted cashier discount',
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonFragment(['manual_discount' => ['You do not have permission to apply manual discounts on POS sales.']]);
    }

    /**
     * TEST 6: Manual discount without required reason -> rejected.
     */
    public function test_06_manual_discount_without_reason_rejected(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
            'manual_discount' => [
                'type' => 'percentage',
                'value' => 10,
                'reason' => '', // empty reason
            ],
        ]);

        $response->assertStatus(422);
    }

    /**
     * TEST 7: Valid coupon -> accepted.
     */
    public function test_07_valid_coupon_accepted(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // Subtotal $300, 10% coupon = $30 discount -> total $270
        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 3],
            ],
            'coupon_code' => 'SAVE10PCT',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 300)
            ->assertJsonPath('data.coupon_discount_amount', 30)
            ->assertJsonPath('data.coupon_code', 'SAVE10PCT')
            ->assertJsonPath('data.total_amount', 270);
    }

    /**
     * TEST 8: Expired coupon -> rejected with exact error.
     */
    public function test_08_expired_coupon_rejected(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
            'coupon_code' => 'EXPIRED20',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Promo code has expired.']);
    }

    /**
     * TEST 9: Inactive coupon -> rejected with exact error.
     */
    public function test_09_inactive_coupon_rejected(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
            'coupon_code' => 'INACTIVE15',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'This promo code is currently inactive.']);
    }

    /**
     * TEST 10: Minimum subtotal not met -> rejected with exact error.
     */
    public function test_10_minimum_subtotal_not_met_rejected(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // Coupon requires min $100. Product price $25 -> quantity 2 = $50 (< $100)
        $cheapProduct = Product::create([
            'brand_id' => $this->product->brand_id,
            'name' => 'Low Value Item',
            'slug' => 'low-val-item',
            'sku' => 'LOW-01',
            'wholesale_price' => 25.00,
            'stock' => 50,
            'status' => 'published',
            'moq' => 1,
        ]);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $cheapProduct->id, 'quantity' => 2],
            ],
            'coupon_code' => 'CAP50', // min_spend = 100
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Minimum order of $100 is required for this promo code.']);
    }

    /**
     * TEST 11: Usage limit exceeded -> rejected with exact error.
     */
    public function test_11_usage_limit_exceeded_rejected(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $limitCoupon = Coupon::create([
            'code' => 'MAXEDOUT',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'usage_limit' => 3,
            'usage_count' => 3,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
            'coupon_code' => 'MAXEDOUT',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'This promo code has reached its usage limit.']);
    }

    /**
     * TEST 12: Maximum discount cap -> correct discount.
     */
    public function test_12_maximum_discount_cap_enforced(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // Subtotal $500. CAP50 has discount_value $200 but max_discount $50 -> discount is capped at $50
        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 5],
            ],
            'coupon_code' => 'CAP50',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 500)
            ->assertJsonPath('data.coupon_discount_amount', 50)
            ->assertJsonPath('data.total_amount', 450);
    }

    /**
     * TEST 13: Coupon sales attribution -> correct in Coupon Sales Dashboard.
     */
    public function test_13_coupon_sales_attribution_correct(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // Bind valid coupon to couponBoundAdmin
        CouponAdminBinding::create([
            'coupon_id' => $this->validCoupon->id,
            'admin_user_id' => $this->couponBoundAdmin->id,
            'created_by' => $this->superAdmin->id,
        ]);

        // Place POS order using SAVE10PCT
        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 4],
            ],
            'coupon_code' => 'SAVE10PCT',
            'payment_method' => 'pos_cash',
            'paid_amount' => 360, // 400 - 40 = 360
        ]);

        $response->assertStatus(201);
        $orderId = $response->json('data.id');

        $order = Order::find($orderId);
        $this->assertEquals($this->validCoupon->id, $order->coupon_id);

        // Bound Admin scope query includes this POS order
        $salesQuery = Order::forCouponSalesAdmin($this->couponBoundAdmin);
        $this->assertTrue($salesQuery->where('orders.id', $orderId)->exists());

        // Coupon usage count was incremented
        $this->assertEquals(1, $this->validCoupon->fresh()->usage_count);
    }

    /**
     * TEST 14: Duplicate submission protection (Idempotency).
     */
    public function test_14_duplicate_submission_does_not_duplicate_order_or_coupon_usage(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $idempotencyKey = 'unique-pos-draft-' . uniqid();

        $payload = [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
            'coupon_code' => 'SAVE10PCT',
            'payment_method' => 'pos_cash',
            'paid_amount' => 180,
            'idempotency_key' => $idempotencyKey,
        ];

        $initialUsage = $this->validCoupon->fresh()->usage_count;
        $initialOrderCount = Order::count();

        // 1st submit
        $res1 = $this->postJson('/api/v1/admin/pos/orders', $payload);
        $res1->assertStatus(201);

        // 2nd rapid submit with same idempotency key
        $res2 = $this->postJson('/api/v1/admin/pos/orders', $payload);
        $res2->assertStatus(201);

        $this->assertEquals($res1->json('data.id'), $res2->json('data.id'));
        $this->assertEquals($initialOrderCount + 1, Order::count());
        $this->assertEquals($initialUsage + 1, $this->validCoupon->fresh()->usage_count);
    }

    /**
     * TEST 15: Paid in full -> status paid.
     */
    public function test_15_paid_in_full_sets_status_paid(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2], // $200
            ],
            'payment_method' => 'pos_cash',
            'paid_amount' => 200,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.paid_amount', 200)
            ->assertJsonPath('data.balance_due', 0);

        $orderId = $response->json('data.id');
        $this->assertDatabaseHas('payments', [
            'order_id' => $orderId,
            'amount' => 200,
            'status' => 'succeeded',
        ]);
    }

    /**
     * TEST 16: Partially paid -> status partially_paid.
     */
    public function test_16_partially_paid_sets_status_partially_paid(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2], // $200
            ],
            'payment_method' => 'card',
            'paid_amount' => 80,
            'payment_reference' => 'CARD-AUTH-998822',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'partially_paid')
            ->assertJsonPath('data.paid_amount', 80)
            ->assertJsonPath('data.balance_due', 120);

        $orderId = $response->json('data.id');
        $this->assertDatabaseHas('payments', [
            'order_id' => $orderId,
            'amount' => 80,
            'status' => 'succeeded',
            'transaction_id' => 'CARD-AUTH-998822',
        ]);
    }

    /**
     * TEST 17: No payment -> status pending and no payment record.
     */
    public function test_17_no_payment_sets_status_pending_and_zero_payments(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 3], // $300
            ],
            'payment_method' => 'bank_transfer',
            'paid_amount' => 0,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'pending')
            ->assertJsonPath('data.paid_amount', 0)
            ->assertJsonPath('data.balance_due', 300);

        $orderId = $response->json('data.id');
        $this->assertEquals(0, Payment::where('order_id', $orderId)->count());
    }

    /**
     * TEST 18: Invalid payment method -> rejected.
     */
    public function test_18_invalid_payment_method_rejected(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1],
            ],
            'payment_method' => 'unsupported_bitcoin_gateway',
            'paid_amount' => 100,
        ]);

        $response->assertStatus(422);
    }

    /**
     * TEST 19: Negative paid amount -> rejected.
     */
    public function test_19_negative_paid_amount_rejected(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1],
            ],
            'paid_amount' => -50,
        ]);

        $response->assertStatus(422);
    }

    /**
     * TEST 20: Payment reference stored and auditable.
     */
    public function test_20_payment_reference_stored_and_auditable(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
            'payment_method' => 'mobile_banking',
            'paid_amount' => 200,
            'payment_reference' => 'BKASH-TX-990011',
        ]);

        $response->assertStatus(201);
        $orderId = $response->json('data.id');

        $payment = Payment::where('order_id', $orderId)->first();
        $this->assertNotNull($payment);
        $this->assertEquals('BKASH-TX-990011', $payment->transaction_id);
    }

    /**
     * TEST 21: Product 10,000, Coupon 500 discount, Manual discount 250, Final 9,250, Paid 9,250.
     * Expected: Order successful with exact authoritative numbers.
     */
    public function test_21_combined_coupon_and_manual_discount_exact_totals(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // Product of $10,000 subtotal (100 units * $100 = $10,000)
        // Fixed coupon of $500
        $coupon500 = Coupon::create([
            'code' => 'COUPON500',
            'discount_type' => 'fixed',
            'discount_value' => 500,
            'min_spend' => 1000,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 100],
            ],
            'coupon_code' => 'COUPON500',
            'manual_discount' => [
                'type' => 'fixed',
                'value' => 250,
                'reason' => 'Negotiated VIP commercial contract',
            ],
            'payment_method' => 'bank_transfer',
            'paid_amount' => 9250,
            'payment_reference' => 'WIRE-P21-REF',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.subtotal', 10000)
            ->assertJsonPath('data.manual_discount_amount', 250)
            ->assertJsonPath('data.discount_amount', 750)
            ->assertJsonPath('data.total_amount', 9250)
            ->assertJsonPath('data.paid_amount', 9250)
            ->assertJsonPath('data.balance_due', 0)
            ->assertJsonPath('data.payment_status', 'paid');

        $orderId = $response->json('data.id');
        $order = Order::find($orderId);
        $this->assertEquals(10000.00, (float) $order->subtotal);
        $this->assertEquals(250.00, (float) $order->manual_discount_amount);
        $this->assertEquals(750.00, (float) $order->discount_amount);
        $this->assertEquals(9250.00, (float) $order->total_amount);
        $this->assertEquals(9250.00, (float) $order->paid_amount);
        $this->assertEquals(0.00, (float) $order->balance_due);
        $this->assertEquals('paid', $order->payment_status);
    }

    /**
     * TEST 22: Stacking and combining discount rules: total discount strictly capped at subtotal.
     */
    public function test_22_total_discount_strictly_capped_at_subtotal(): void
    {
        Sanctum::actingAs($this->posAdminWithDiscount);

        // Subtotal $200 (2 units * $100)
        // Coupon discount $150
        $hugeCoupon = Coupon::create([
            'code' => 'HUGE150',
            'discount_type' => 'fixed',
            'discount_value' => 150,
            'is_active' => true,
        ]);

        // Manual discount $80 -> combined would be $230, but subtotal is $200
        // Total discount clamped at $200, manual discount clamped to remaining $50, total = $0.00
        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
            'coupon_code' => 'HUGE150',
            'manual_discount' => [
                'type' => 'fixed',
                'value' => 80,
                'reason' => 'Stacking overflow test',
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 200)
            ->assertJsonPath('data.coupon_discount_amount', 150)
            ->assertJsonPath('data.manual_discount_amount', 50) // Clamped to remaining 50
            ->assertJsonPath('data.discount_amount', 200)
            ->assertJsonPath('data.total_amount', 0);
    }
}
