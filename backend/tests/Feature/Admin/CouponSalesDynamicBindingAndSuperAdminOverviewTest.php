<?php

namespace Tests\Feature\Admin;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use App\Services\Cache\CouponSalesCacheService;
use App\Services\Coupon\CouponAdminBindingService;
use App\Services\Coupon\CouponSalesReportService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CouponSalesDynamicBindingAndSuperAdminOverviewTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $salesAdminA;
    protected User $salesAdminB;
    protected User $customer;
    protected Coupon $couponA;
    protected Coupon $couponB;
    protected Coupon $couponC;
    protected Order $orderA;
    protected Order $orderB;
    protected Order $orderC;
    protected Order $orderCancelled;
    protected Order $orderRefunded;
    protected CouponAdminBindingService $bindingService;
    protected CouponSalesReportService $reportService;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        $this->seed(RbacPermissionCatalogSeeder::class);

        $this->bindingService = app(CouponAdminBindingService::class);
        $this->reportService = app(CouponSalesReportService::class);

        $couponRole = Role::where('slug', 'coupon_sales')->first();

        // 1. Super Admin
        $this->superAdmin = User::factory()->create([
            'name'           => 'Super Administrator',
            'email'          => 'superadmin@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => true,
        ]);

        // 2. Sales Admin A
        $this->salesAdminA = User::factory()->create([
            'name'           => 'Alice Sales Agent',
            'email'          => 'alice.sales@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);
        $this->salesAdminA->rbacRoles()->attach($couponRole->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        // 3. Sales Admin B
        $this->salesAdminB = User::factory()->create([
            'name'           => 'Bob Sales Agent',
            'email'          => 'bob.sales@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);
        $this->salesAdminB->rbacRoles()->attach($couponRole->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        // 4. Customer
        $this->customer = User::factory()->create([
            'name'           => 'Retail Customer',
            'email'          => 'buyer@example.com',
            'role'           => User::ROLE_CUSTOMER,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);

        // 5. Coupons
        $this->couponA = Coupon::create([
            'code'           => 'COUPON-A',
            'discount_type'  => 'percentage',
            'discount_value' => 10.00,
            'min_spend'      => 50.00,
            'is_active'      => true,
            'usage_count'    => 1,
        ]);

        $this->couponB = Coupon::create([
            'code'           => 'COUPON-B',
            'discount_type'  => 'flat',
            'discount_value' => 20.00,
            'min_spend'      => 100.00,
            'is_active'      => true,
            'usage_count'    => 1,
        ]);

        $this->couponC = Coupon::create([
            'code'           => 'COUPON-C',
            'discount_type'  => 'flat',
            'discount_value' => 30.00,
            'min_spend'      => 150.00,
            'is_active'      => true,
            'usage_count'    => 1,
        ]);

        // 6. Bindings: Admin A -> Coupon A, Admin B -> Coupon B
        $this->bindingService->bind($this->couponA->id, $this->salesAdminA->id, $this->superAdmin);
        $this->bindingService->bind($this->couponB->id, $this->salesAdminB->id, $this->superAdmin);

        $commonShipping = [
            'shipping_address1'    => '789 Fashion St',
            'shipping_city'        => 'Dhaka',
            'shipping_postal_code' => '1212',
            'shipping_country_code'=> 'BD',
        ];

        // 7. Orders
        $this->orderA = Order::create(array_merge([
            'order_number'    => 'ORD-AAA-100',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponA->id,
            'coupon_code'     => $this->couponA->code,
            'status'          => 'delivered',
            'payment_status'  => 'paid',
            'currency'        => 'USD',
            'subtotal'        => 1000.00,
            'discount_amount' => 100.00,
            'total_amount'    => 900.00,
            'email'           => 'buyer@example.com',
            'shipping_name'   => 'Alice Customer',
            'placed_at'       => now(),
        ], $commonShipping));

        $this->orderB = Order::create(array_merge([
            'order_number'    => 'ORD-BBB-200',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponB->id,
            'coupon_code'     => $this->couponB->code,
            'status'          => 'confirmed',
            'payment_status'  => 'paid',
            'currency'        => 'USD',
            'subtotal'        => 500.00,
            'discount_amount' => 20.00,
            'total_amount'    => 480.00,
            'email'           => 'buyer@example.com',
            'shipping_name'   => 'Bob Customer',
            'placed_at'       => now(),
        ], $commonShipping));

        $this->orderC = Order::create(array_merge([
            'order_number'    => 'ORD-CCC-300',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponC->id,
            'coupon_code'     => $this->couponC->code,
            'status'          => 'processing',
            'payment_status'  => 'paid',
            'currency'        => 'USD',
            'subtotal'        => 800.00,
            'discount_amount' => 30.00,
            'total_amount'    => 770.00,
            'email'           => 'buyer@example.com',
            'shipping_name'   => 'Charlie Customer',
            'placed_at'       => now(),
        ], $commonShipping));

        $this->orderCancelled = Order::create(array_merge([
            'order_number'    => 'ORD-CANCELLED-999',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponA->id,
            'coupon_code'     => $this->couponA->code,
            'status'          => 'cancelled',
            'payment_status'  => 'failed',
            'currency'        => 'USD',
            'subtotal'        => 400.00,
            'discount_amount' => 40.00,
            'total_amount'    => 360.00,
            'email'           => 'buyer@example.com',
            'shipping_name'   => 'Cancelled Customer',
            'placed_at'       => now(),
        ], $commonShipping));

        $this->orderRefunded = Order::create(array_merge([
            'order_number'    => 'ORD-REFUNDED-888',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponA->id,
            'coupon_code'     => $this->couponA->code,
            'status'          => 'delivered',
            'payment_status'  => 'refunded',
            'currency'        => 'USD',
            'subtotal'        => 300.00,
            'discount_amount' => 30.00,
            'total_amount'    => 270.00,
            'email'           => 'buyer@example.com',
            'shipping_name'   => 'Refunded Customer',
            'placed_at'       => now(),
        ], $commonShipping));
    }

    // ── TEST 1: Admin A sees Coupon A only ────────────────────────────────────
    public function test_test_1_admin_a_bound_to_coupon_a_sees_coupon_a_only(): void
    {
        $res = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $res->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.order_number', 'ORD-AAA-100');

        $summary = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');

        $summary->assertOk()
            ->assertJsonPath('data.total_orders', 1)
            ->assertJsonPath('data.total_sales', 900)
            ->assertJsonPath('data.total_discounts', 100)
            ->assertJsonPath('data.bound_coupons_count', 1);
    }

    // ── TEST 2: Admin A bound to Coupon A + B sees A + B ──────────────────────
    public function test_test_2_admin_a_bound_to_a_and_b_sees_both(): void
    {
        $this->bindingService->bind($this->couponB->id, $this->salesAdminA->id, $this->superAdmin);

        $res = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $res->assertOk()->assertJsonCount(2, 'data.data');
        $orderNumbers = collect($res->json('data.data'))->pluck('order_number')->all();
        $this->assertContains('ORD-AAA-100', $orderNumbers);
        $this->assertContains('ORD-BBB-200', $orderNumbers);
        $this->assertNotContains('ORD-CCC-300', $orderNumbers);

        $summary = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');

        // Total orders: 2, total sales: 900 + 480 = 1380, total discount: 100 + 20 = 120
        $summary->assertOk()
            ->assertJsonPath('data.total_orders', 2)
            ->assertJsonPath('data.total_sales', 1380)
            ->assertJsonPath('data.total_discounts', 120)
            ->assertJsonPath('data.bound_coupons_count', 2);
    }

    // ── TEST 3: Admin A direct filter on unbound Coupon C returns no data ─────
    public function test_test_3_admin_a_direct_filter_on_unbound_coupon_returns_no_data(): void
    {
        $res = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders?coupon_id={$this->couponC->id}");

        $res->assertOk()->assertJsonCount(0, 'data.data');

        $summary = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/summary?coupon_id={$this->couponC->id}");

        $summary->assertOk()
            ->assertJsonPath('data.total_orders', 0)
            ->assertJsonPath('data.total_sales', 0)
            ->assertJsonPath('data.bound_coupons_count', 0);
    }

    // ── TEST 4: Super Admin binds Coupon C to Admin A -> immediately appears ─
    public function test_test_4_binding_coupon_c_to_admin_a_dynamically_updates_scope(): void
    {
        // Initially Admin A does not see Order C
        $res1 = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');
        $this->assertNotContains('ORD-CCC-300', collect($res1->json('data.data'))->pluck('order_number')->all());

        // Super Admin binds Coupon C to Admin A
        $bindRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/coupon-bindings', [
                'coupon_id'     => $this->couponC->id,
                'admin_user_id' => $this->salesAdminA->id,
            ]);
        $bindRes->assertCreated();

        // Next request by Admin A must dynamically include Coupon C
        $res2 = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');
        $orderNumbers = collect($res2->json('data.data'))->pluck('order_number')->all();
        $this->assertContains('ORD-AAA-100', $orderNumbers);
        $this->assertContains('ORD-CCC-300', $orderNumbers);
    }

    // ── TEST 5: Super Admin unbinds Coupon A from Admin A -> immediately disappears
    public function test_test_5_unbinding_coupon_a_from_admin_a_dynamically_removes_scope(): void
    {
        // Locate binding
        $binding = \App\Models\CouponAdminBinding::where('coupon_id', $this->couponA->id)
            ->where('admin_user_id', $this->salesAdminA->id)
            ->firstOrFail();

        // Super Admin unbinds
        $unbindRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/coupon-bindings/{$binding->id}");
        $unbindRes->assertOk();

        // Next request by Admin A must show 0 orders (since Admin A now has 0 bound coupons)
        $res = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');
        $res->assertOk()->assertJsonCount(0, 'data.data');

        $summary = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');
        $summary->assertOk()
            ->assertJsonPath('data.has_bindings', false)
            ->assertJsonPath('data.bound_coupons_count', 0)
            ->assertJsonPath('data.total_orders', 0);
    }

    // ── TEST 6: Admin A attempts another Admin's coupon ID ───────────────────
    public function test_test_6_admin_a_attempts_another_admins_coupon_id(): void
    {
        // Admin A requests Coupon B (which is bound to Admin B)
        $res = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders?coupon_id={$this->couponB->id}");

        $res->assertOk()->assertJsonCount(0, 'data.data');

        // Order detail for Order B1 must return 403 Forbidden
        $detailRes = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders/{$this->orderB->id}");
        $detailRes->assertForbidden();
    }

    // ── TEST 7: Admin A changes admin_id in request -> strictly ignored ──────
    public function test_test_7_admin_a_tampering_with_admin_id_is_strictly_ignored(): void
    {
        // Admin A attempts to pass admin_id=<Admin B's id>
        $res = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders?admin_id={$this->salesAdminB->id}");

        $res->assertOk();
        $orderNumbers = collect($res->json('data.data'))->pluck('order_number')->all();
        // Still sees only Admin A's order, NOT Admin B's order
        $this->assertContains('ORD-AAA-100', $orderNumbers);
        $this->assertNotContains('ORD-BBB-200', $orderNumbers);
    }

    // ── TEST 8: Super Admin sees global coupon usage metrics ─────────────────
    public function test_test_8_super_admin_sees_global_coupon_usage_metrics(): void
    {
        $summary = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');

        $summary->assertOk()
            ->assertJsonPath('data.is_super_admin', true)
            ->assertJsonPath('data.has_bindings', true)
            ->assertJsonPath('data.total_coupons', 3)
            ->assertJsonPath('data.total_active_coupons', 3)
            ->assertJsonPath('data.total_inactive_coupons', 0)
            ->assertJsonPath('data.total_used_coupons', 3);

        $boundCoupons = $summary->json('data.bound_coupons');
        $this->assertCount(3, $boundCoupons, 'Super Admin dropdown must include all system coupons.');
    }

    // ── TEST 9: Super Admin sees all qualifying coupon sales ─────────────────
    public function test_test_9_super_admin_sees_all_qualifying_coupon_sales(): void
    {
        $res = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $res->assertOk()->assertJsonCount(3, 'data.data');
        $orderNumbers = collect($res->json('data.data'))->pluck('order_number')->all();
        $this->assertContains('ORD-AAA-100', $orderNumbers);
        $this->assertContains('ORD-BBB-200', $orderNumbers);
        $this->assertContains('ORD-CCC-300', $orderNumbers);
        $this->assertNotContains('ORD-CANCELLED-999', $orderNumbers);
        $this->assertNotContains('ORD-REFUNDED-888', $orderNumbers);
    }

    // ── TEST 10: Super Admin sees overall total discount and sales ───────────
    public function test_test_10_super_admin_sees_overall_total_discount_and_sales(): void
    {
        $summary = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');

        // Total orders: 3, total sales: 900 + 480 + 770 = 2150, total discount: 100 + 20 + 30 = 150
        $summary->assertOk()
            ->assertJsonPath('data.total_orders', 3)
            ->assertJsonPath('data.total_sales', 2150)
            ->assertJsonPath('data.total_discounts', 150);
    }

    // ── TEST 11: Super Admin sees coupon-level performance overview ──────────
    public function test_test_11_super_admin_coupons_overview_endpoint(): void
    {
        $res = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/coupons-overview');

        $res->assertOk()
            ->assertJsonPath('success', true);

        $coupons = collect($res->json('data'));
        $this->assertCount(3, $coupons);

        $couponAOverview = $coupons->firstWhere('code', 'COUPON-A');
        $this->assertNotNull($couponAOverview);
        $this->assertEquals(1, $couponAOverview['orders_count']);
        $this->assertEquals(900.00, $couponAOverview['sales_value']);
        $this->assertEquals(100.00, $couponAOverview['total_discount']);
        $this->assertCount(1, $couponAOverview['bound_admins']);
        $this->assertEquals('Alice Sales Agent', $couponAOverview['bound_admins'][0]['name']);

        // Normal Admin attempting this endpoint must receive 403 Forbidden
        $forbiddenRes = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/coupons-overview');
        $forbiddenRes->assertForbidden();
    }

    // ── TEST 12: Completed qualifying order is included ──────────────────────
    public function test_test_12_completed_qualifying_coupon_order_included(): void
    {
        $res = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $orderNumbers = collect($res->json('data.data'))->pluck('order_number')->all();
        $this->assertContains('ORD-AAA-100', $orderNumbers);
    }

    // ── TEST 13: Cancelled order is excluded ─────────────────────────────────
    public function test_test_13_cancelled_order_excluded_from_coupon_sales(): void
    {
        $res = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $orderNumbers = collect($res->json('data.data'))->pluck('order_number')->all();
        $this->assertNotContains('ORD-CANCELLED-999', $orderNumbers);
    }

    // ── TEST 14: Refunded order is excluded ──────────────────────────────────
    public function test_test_14_refunded_order_excluded_from_coupon_sales(): void
    {
        $res = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $orderNumbers = collect($res->json('data.data'))->pluck('order_number')->all();
        $this->assertNotContains('ORD-REFUNDED-888', $orderNumbers);
    }

    // ── TEST 15: Normal Admin CSV export contains only bound coupon data ─────
    public function test_test_15_normal_admin_csv_export_contains_only_bound_coupon_data(): void
    {
        $res = $this->actingAs($this->salesAdminA, 'sanctum')
            ->get('/api/v1/admin/coupon-sales/export');

        $res->assertOk();
        $content = $res->streamedContent();

        $this->assertStringContainsString('ORD-AAA-100', $content);
        $this->assertStringNotContainsString('ORD-BBB-200', $content);
        $this->assertStringNotContainsString('ORD-CCC-300', $content);
    }

    // ── TEST 16: Super Admin CSV export contains global authorized data ──────
    public function test_test_16_super_admin_csv_export_contains_global_authorized_data(): void
    {
        $res = $this->actingAs($this->superAdmin, 'sanctum')
            ->get('/api/v1/admin/coupon-sales/export');

        $res->assertOk();
        $content = $res->streamedContent();

        $this->assertStringContainsString('ORD-AAA-100', $content);
        $this->assertStringContainsString('ORD-BBB-200', $content);
        $this->assertStringContainsString('ORD-CCC-300', $content);
    }

    // ── TEST 17: Cache isolation: Admin A cache never serves to Admin B ──────
    public function test_test_17_cache_isolation_between_admins(): void
    {
        // Admin A requests summary -> cached with Admin A's isolated key
        $resA = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');
        $resA->assertOk();
        $keyA = CouponSalesCacheService::summaryKey($this->salesAdminA);

        // Admin B requests summary -> cached with Admin B's isolated key
        $resB = $this->actingAs($this->salesAdminB, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');
        $resB->assertOk();
        $keyB = CouponSalesCacheService::summaryKey($this->salesAdminB);

        $this->assertNotEquals($keyA, $keyB, 'Cache keys between Admin A and Admin B must be strictly isolated.');
        $this->assertEquals(900, $resA->json('data.total_sales'));
        $this->assertEquals(480, $resB->json('data.total_sales'));
    }

    // ── TEST 18: Binding added/removed invalidates stale authorization cache ──
    public function test_test_18_binding_mutation_invalidates_cache(): void
    {
        // Admin A loads summary -> caches version 1
        $initialSummary = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');
        $this->assertEquals(900, $initialSummary->json('data.total_sales'));

        $keyBefore = CouponSalesCacheService::summaryKey($this->salesAdminA);

        // Super Admin binds Coupon C to Admin A
        $this->bindingService->bind($this->couponC->id, $this->salesAdminA->id, $this->superAdmin);

        $keyAfter = CouponSalesCacheService::summaryKey($this->salesAdminA);
        $this->assertNotEquals($keyBefore, $keyAfter, 'Version increment must generate a new cache key.');

        // Next request dynamically returns updated total sales (900 + 770 = 1670)
        $updatedSummary = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');
        $this->assertEquals(1670, $updatedSummary->json('data.total_sales'));
        $this->assertEquals(2, $updatedSummary->json('data.total_orders'));
    }
}
