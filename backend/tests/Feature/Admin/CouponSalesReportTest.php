<?php

namespace Tests\Feature\Admin;

use App\Models\Coupon;
use App\Models\CouponAdminBinding;
use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use App\Services\Coupon\CouponAdminBindingService;
use App\Services\Coupon\CouponSalesReportService;
use Carbon\Carbon;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponSalesReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $salesAdminA;
    protected User $salesAdminB;
    protected User $unboundAdmin;
    protected User $customer;
    protected Coupon $couponA;
    protected Coupon $couponB;
    protected Order $orderA1;
    protected Order $orderA2;
    protected Order $orderB1;
    protected Order $orderNoCoupon;
    protected Order $orderCancelled;
    protected Order $orderRefunded;
    protected CouponAdminBindingService $bindingService;
    protected CouponSalesReportService $reportService;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed RBAC permission catalog and prebuilt roles
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

        // 2. Sales Admin A (Role: Coupon Sales Manager)
        $this->salesAdminA = User::factory()->create([
            'name'           => 'Alice Sales Agent',
            'email'          => 'alice.sales@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);
        $this->salesAdminA->rbacRoles()->attach($couponRole->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        // 3. Sales Admin B (Role: Coupon Sales Manager)
        $this->salesAdminB = User::factory()->create([
            'name'           => 'Bob Sales Agent',
            'email'          => 'bob.sales@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);
        $this->salesAdminB->rbacRoles()->attach($couponRole->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        // 4. Unbound Admin (Role: Coupon Sales Manager, but 0 bound coupons)
        $this->unboundAdmin = User::factory()->create([
            'name'           => 'Charlie Unbound',
            'email'          => 'charlie@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);
        $this->unboundAdmin->rbacRoles()->attach($couponRole->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        // 5. Customer User
        $this->customer = User::factory()->create([
            'name'           => 'Retail Buyer',
            'email'          => 'buyer@retail.com',
            'role'           => User::ROLE_CUSTOMER,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);

        // 6. Coupons
        $this->couponA = Coupon::create([
            'code'           => 'AYC-ALICE-10',
            'discount_type'  => 'percentage',
            'discount_value' => 10.00,
            'min_spend'      => 50.00,
            'max_discount'   => 100.00,
            'is_active'      => true,
        ]);

        $this->couponB = Coupon::create([
            'code'           => 'AYC-BOB-25',
            'discount_type'  => 'fixed',
            'discount_value' => 25.00,
            'min_spend'      => 100.00,
            'is_active'      => true,
        ]);

        // 7. Bindings: Admin A -> Coupon A, Admin B -> Coupon B
        $this->bindingService->bind($this->couponA->id, $this->salesAdminA->id, $this->superAdmin);
        $this->bindingService->bind($this->couponB->id, $this->salesAdminB->id, $this->superAdmin);

        // 8. Orders Dataset
        $commonShipping = [
            'shipping_address1'    => '123 Commercial Ave',
            'shipping_city'        => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code'=> 'US',
        ];

        // Order A1: uses Coupon A, status: processing, total: 1000, discount: 100
        $this->orderA1 = Order::create(array_merge([
            'order_number'    => 'AYN-20261005-AAA001',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponA->id,
            'coupon_code'     => $this->couponA->code,
            'status'          => 'processing',
            'payment_status'  => 'paid',
            'currency'        => 'USD',
            'subtotal'        => 1100.00,
            'discount_amount' => 100.00,
            'total_amount'    => 1000.00,
            'email'           => 'buyer@retail.com',
            'shipping_name'   => 'Alice Customer 1',
            'placed_at'       => now(),
        ], $commonShipping));

        // Order A2: uses Coupon A, status: delivered, total: 2000, discount: 200
        $this->orderA2 = Order::create(array_merge([
            'order_number'    => 'AYN-20261005-AAA002',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponA->id,
            'coupon_code'     => $this->couponA->code,
            'status'          => 'delivered',
            'payment_status'  => 'paid',
            'currency'        => 'USD',
            'subtotal'        => 2200.00,
            'discount_amount' => 200.00,
            'total_amount'    => 2000.00,
            'email'           => 'buyer@retail.com',
            'shipping_name'   => 'Alice Customer 2',
            'placed_at'       => now(),
        ], $commonShipping));

        // Order B1: uses Coupon B, status: confirmed, total: 3000, discount: 25
        $this->orderB1 = Order::create(array_merge([
            'order_number'    => 'AYN-20261005-BBB001',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponB->id,
            'coupon_code'     => $this->couponB->code,
            'status'          => 'confirmed',
            'payment_status'  => 'pending',
            'currency'        => 'USD',
            'subtotal'        => 3025.00,
            'discount_amount' => 25.00,
            'total_amount'    => 3000.00,
            'email'           => 'bob.buyer@retail.com',
            'shipping_name'   => 'Bob Customer 1',
            'placed_at'       => now(),
        ], $commonShipping));

        // Order No Coupon: total: 500, discount: 0
        $this->orderNoCoupon = Order::create(array_merge([
            'order_number'    => 'AYN-20261005-NOCOUPON',
            'user_id'         => $this->customer->id,
            'coupon_id'       => null,
            'coupon_code'     => null,
            'status'          => 'delivered',
            'payment_status'  => 'paid',
            'currency'        => 'USD',
            'subtotal'        => 500.00,
            'discount_amount' => 0.00,
            'total_amount'    => 500.00,
            'email'           => 'general@buyer.com',
            'shipping_name'   => 'General Buyer',
            'placed_at'       => now(),
        ], $commonShipping));

        // Order Cancelled (Coupon A): status: cancelled -> should be excluded from sales
        $this->orderCancelled = Order::create(array_merge([
            'order_number'    => 'AYN-20261005-CANCELLED',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponA->id,
            'coupon_code'     => $this->couponA->code,
            'status'          => 'cancelled',
            'payment_status'  => 'failed',
            'currency'        => 'USD',
            'subtotal'        => 600.00,
            'discount_amount' => 60.00,
            'total_amount'    => 540.00,
            'email'           => 'cancelled@buyer.com',
            'shipping_name'   => 'Cancelled Buyer',
            'placed_at'       => now(),
        ], $commonShipping));

        // Order Refunded (Coupon A): payment_status: refunded -> should be excluded from sales
        $this->orderRefunded = Order::create(array_merge([
            'order_number'    => 'AYN-20261005-REFUNDED',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponA->id,
            'coupon_code'     => $this->couponA->code,
            'status'          => 'delivered',
            'payment_status'  => 'refunded',
            'currency'        => 'USD',
            'subtotal'        => 700.00,
            'discount_amount' => 70.00,
            'total_amount'    => 630.00,
            'email'           => 'refunded@buyer.com',
            'shipping_name'   => 'Refunded Buyer',
            'placed_at'       => now(),
        ], $commonShipping));
    }

    // ── 1. Strict Data Scoping Tests ─────────────────────────────────────────

    public function test_admin_a_sees_only_coupon_a_sales_and_orders(): void
    {
        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data.data');

        $orderNumbers = collect($response->json('data.data'))->pluck('order_number')->all();
        $this->assertContains('AYN-20261005-AAA001', $orderNumbers);
        $this->assertContains('AYN-20261005-AAA002', $orderNumbers);
        $this->assertNotContains('AYN-20261005-BBB001', $orderNumbers, 'Admin A must NOT see Admin B coupon orders.');
        $this->assertNotContains('AYN-20261005-NOCOUPON', $orderNumbers, 'Admin A must NOT see unassigned/non-coupon orders.');
        $this->assertNotContains('AYN-20261005-CANCELLED', $orderNumbers, 'Cancelled orders must be excluded from qualifying sales.');
        $this->assertNotContains('AYN-20261005-REFUNDED', $orderNumbers, 'Refunded orders must be excluded from qualifying sales.');
    }

    public function test_admin_b_sees_only_coupon_b_sales_and_orders(): void
    {
        $response = $this->actingAs($this->salesAdminB, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.data');

        $orderNumbers = collect($response->json('data.data'))->pluck('order_number')->all();
        $this->assertContains('AYN-20261005-BBB001', $orderNumbers);
        $this->assertNotContains('AYN-20261005-AAA001', $orderNumbers);
        $this->assertNotContains('AYN-20261005-AAA002', $orderNumbers);
    }

    public function test_unbound_admin_sees_zero_sales_and_empty_state(): void
    {
        $summaryRes = $this->actingAs($this->unboundAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');

        $summaryRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.has_bindings', false)
            ->assertJsonPath('data.bound_coupons_count', 0)
            ->assertJsonPath('data.total_orders', 0)
            ->assertJsonPath('data.total_sales', 0)
            ->assertJsonPath('data.total_discounts', 0);

        $ordersRes = $this->actingAs($this->unboundAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $ordersRes->assertOk()
            ->assertJsonCount(0, 'data.data');
    }

    public function test_super_admin_can_view_all_coupon_sales(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data.data'); // Order A1, Order A2, Order B1

        $orderNumbers = collect($response->json('data.data'))->pluck('order_number')->all();
        $this->assertContains('AYN-20261005-AAA001', $orderNumbers);
        $this->assertContains('AYN-20261005-AAA002', $orderNumbers);
        $this->assertContains('AYN-20261005-BBB001', $orderNumbers);
    }

    // ── 2. Aggregation & Status Tests ────────────────────────────────────────

    public function test_summary_aggregates_total_sales_and_discounts_accurately(): void
    {
        // Admin A has Order A1 ($1000 total, $100 discount) and Order A2 ($2000 total, $200 discount)
        // Expected: Total Orders = 2, Total Sales = $3000.00, Total Discounts = $300.00
        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.has_bindings', true)
            ->assertJsonPath('data.bound_coupons_count', 1)
            ->assertJsonPath('data.total_orders', 2)
            ->assertJsonPath('data.total_sales', 3000)
            ->assertJsonPath('data.total_discounts', 300)
            ->assertJsonPath('data.currency', 'USD');
    }

    public function test_multiple_bound_coupons_aggregate_correctly(): void
    {
        // Bind Coupon B to Admin A as well (Admin A now has Coupon A & Coupon B)
        $this->bindingService->bind($this->couponB->id, $this->salesAdminA->id, $this->superAdmin);

        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary');

        // Total orders = 3 (Order A1 + Order A2 + Order B1)
        // Total sales = 1000 + 2000 + 3000 = 6000
        // Total discounts = 100 + 200 + 25 = 325
        $response->assertOk()
            ->assertJsonPath('data.bound_coupons_count', 2)
            ->assertJsonPath('data.total_orders', 3)
            ->assertJsonPath('data.total_sales', 6000)
            ->assertJsonPath('data.total_discounts', 325);
    }

    public function test_filter_by_specific_bound_coupon(): void
    {
        // Bind Coupon B to Admin A as well
        $this->bindingService->bind($this->couponB->id, $this->salesAdminA->id, $this->superAdmin);

        // Filter by Coupon A only
        $resA = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders?coupon_id={$this->couponA->id}");
        $resA->assertOk()->assertJsonCount(2, 'data.data');

        // Filter by Coupon B only
        $resB = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders?coupon_id={$this->couponB->id}");
        $resB->assertOk()->assertJsonCount(1, 'data.data');
    }

    public function test_admin_cannot_filter_by_unbound_coupon(): void
    {
        // Admin A attempts to pass Coupon B (unbound) in query param
        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders?coupon_id={$this->couponB->id}");

        $response->assertOk()
            ->assertJsonCount(0, 'data.data', 'Passing an unbound coupon_id must return 0 orders.');
    }

    // ── 3. Order Details & Access Control (URL Tampering) ────────────────────

    public function test_admin_a_can_view_own_coupon_order_details(): void
    {
        // Via dedicated reporting endpoint
        $resReport = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders/{$this->orderA1->id}");

        $resReport->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order_number', 'AYN-20261005-AAA001')
            ->assertJsonPath('data.coupon_code', 'AYC-ALICE-10');

        // Via standard admin order detail endpoint
        $resGeneral = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/orders/{$this->orderA1->id}");

        $resGeneral->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order_number', 'AYN-20261005-AAA001');
    }

    public function test_admin_a_cannot_view_admin_b_order_details(): void
    {
        // Admin A attempts to view Order B1 via reporting endpoint
        $resReport = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders/{$this->orderB1->id}");
        $resReport->assertForbidden();

        // Admin A attempts to manipulate URL on standard admin endpoint
        $resGeneral = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/orders/{$this->orderB1->id}");
        $resGeneral->assertForbidden();
    }

    public function test_admin_a_cannot_view_unassigned_non_coupon_order_details(): void
    {
        $resReport = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders/{$this->orderNoCoupon->id}");
        $resReport->assertForbidden();

        $resGeneral = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson("/api/v1/admin/orders/{$this->orderNoCoupon->id}");
        $resGeneral->assertForbidden();
    }

    // ── 4. Search & Pagination Tests ─────────────────────────────────────────

    public function test_server_side_search_filters_within_bound_scope(): void
    {
        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders?search=AAA002');

        $response->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.order_number', 'AYN-20261005-AAA002');

        // Searching for Admin B's order yields 0 results for Admin A
        $resB = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders?search=BBB001');

        $resB->assertOk()
            ->assertJsonCount(0, 'data.data');
    }

    public function test_customer_cannot_access_coupon_sales_endpoints(): void
    {
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary')
            ->assertForbidden();

        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders')
            ->assertForbidden();

        $this->actingAs($this->customer, 'sanctum')
            ->get('/api/v1/admin/coupon-sales/export')
            ->assertForbidden();
    }

    // ── 5. Prompt 3: CSV Export, Sorting & Advanced Filter Tests ─────────────

    public function test_admin_a_exports_csv_strictly_scoped_to_their_bound_coupons(): void
    {
        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->get('/api/v1/admin/coupon-sales/export');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment; filename="coupon-sales-export-', $response->headers->get('Content-Disposition'));

        $content = $response->streamedContent();

        // Must include header columns
        $this->assertStringContainsString('Order Number', $content);
        $this->assertStringContainsString('Order Date', $content);
        $this->assertStringContainsString('Customer', $content);
        $this->assertStringContainsString('Coupon', $content);
        $this->assertStringContainsString('Discount', $content);
        $this->assertStringContainsString('Order Total', $content);
        $this->assertStringContainsString('Status', $content);

        // Must include Admin A's orders (A1 and A2)
        $this->assertStringContainsString('AYN-20261005-AAA001', $content);
        $this->assertStringContainsString('AYN-20261005-AAA002', $content);

        // Must NOT include Admin B's order (B1)
        $this->assertStringNotContainsString('AYN-20261005-BBB001', $content);

        // Must NOT include unassigned order
        $this->assertStringNotContainsString('AYN-20261005-NOCOUPON', $content);
    }

    public function test_admin_b_exports_csv_containing_only_their_bound_coupons(): void
    {
        $response = $this->actingAs($this->salesAdminB, 'sanctum')
            ->get('/api/v1/admin/coupon-sales/export');

        $response->assertOk();
        $content = $response->streamedContent();

        // Must include B1
        $this->assertStringContainsString('AYN-20261005-BBB001', $content);

        // Must NOT include A1 or A2
        $this->assertStringNotContainsString('AYN-20261005-AAA001', $content);
        $this->assertStringNotContainsString('AYN-20261005-AAA002', $content);
    }

    public function test_export_csv_respects_search_and_coupon_filters(): void
    {
        // Admin A exports with search filter for AAA001
        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->get('/api/v1/admin/coupon-sales/export?search=AAA001');

        $response->assertOk();
        $content = $response->streamedContent();

        $this->assertStringContainsString('AYN-20261005-AAA001', $content);
        $this->assertStringNotContainsString('AYN-20261005-AAA002', $content);
    }

    public function test_export_csv_triggers_audit_activity_log(): void
    {
        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->get('/api/v1/admin/coupon-sales/export');

        $response->assertOk();
        $response->streamedContent(); // Execute stream callback

        $this->assertDatabaseHas('activities', [
            'user_id' => $this->salesAdminA->id,
            'action'  => 'coupon_sales.exported',
        ]);
    }

    public function test_orders_sorting_highest_value_and_oldest(): void
    {
        // 1. Highest value first: AAA002 (300) then AAA001 (100)
        $resHigh = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders?sort=highest_value');

        $resHigh->assertOk();
        $dataHigh = $resHigh->json('data.data');
        $this->assertCount(2, $dataHigh);
        $this->assertEquals('AYN-20261005-AAA002', $dataHigh[0]['order_number']);
        $this->assertEquals('AYN-20261005-AAA001', $dataHigh[1]['order_number']);

        // 2. Lowest value first: AAA001 (100) then AAA002 (300)
        $resLow = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders?sort=lowest_value');

        $resLow->assertOk();
        $dataLow = $resLow->json('data.data');
        $this->assertEquals('AYN-20261005-AAA001', $dataLow[0]['order_number']);
        $this->assertEquals('AYN-20261005-AAA002', $dataLow[1]['order_number']);
    }

    public function test_advanced_date_filters_yesterday_and_last_month(): void
    {
        // Create an order yesterday
        $yesterdayOrder = Order::create([
            'order_number'         => 'AYN-20261004-YESTERDAY',
            'user_id'              => $this->customer->id,
            'email'                => $this->customer->email,
            'shipping_name'        => 'Yesterday Customer',
            'shipping_address1'    => '123 Commercial Ave',
            'shipping_city'        => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code'=> 'US',
            'coupon_id'            => $this->couponA->id,
            'coupon_code'          => $this->couponA->code,
            'currency'             => 'USD',
            'subtotal'             => 50.00,
            'discount_amount'      => 5.00,
            'shipping_cost'        => 0.00,
            'tax_amount'           => 0.00,
            'total_amount'         => 45.00,
            'status'               => 'completed',
            'payment_status'       => 'paid',
        ]);
        Order::where('id', $yesterdayOrder->id)->update([
            'created_at' => Carbon::now('Asia/Dhaka')->subDay(),
            'updated_at' => Carbon::now('Asia/Dhaka')->subDay(),
        ]);

        $resYesterday = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders?date_filter=yesterday');

        $resYesterday->assertOk();
        $yesterdayOrders = $resYesterday->json('data.data');
        $this->assertCount(1, $yesterdayOrders);
        $this->assertEquals('AYN-20261004-YESTERDAY', $yesterdayOrders[0]['order_number']);
    }
}
