<?php

namespace Tests\Feature\Admin;

use App\Models\Coupon;
use App\Models\CouponAdminBinding;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Coupon\CouponAdminBindingService;
use App\Services\Coupon\CouponSalesReportService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponSalesAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $adminA;
    protected User $adminB;
    protected User $unauthorizedAdmin;
    protected User $customer;
    protected Coupon $couponA;
    protected Coupon $couponB;
    protected Order $orderA1;
    protected Order $orderA2;
    protected Order $orderB1;
    protected Role $couponRole;
    protected CouponAdminBindingService $bindingService;
    protected CouponSalesReportService $reportService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacPermissionCatalogSeeder::class);

        $this->bindingService = app(CouponAdminBindingService::class);
        $this->reportService = app(CouponSalesReportService::class);

        $this->couponRole = Role::where('slug', 'coupon_sales')->firstOrFail();

        // 1. Super Admin
        $this->superAdmin = User::factory()->create([
            'name'           => 'Super Administrator',
            'email'          => 'super@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => true,
        ]);

        // 2. Admin A (Coupon Sales Role)
        $this->adminA = User::factory()->create([
            'name'           => 'Audited Admin A',
            'email'          => 'admina@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);
        $this->adminA->rbacRoles()->attach($this->couponRole->id, ['assigned_by' => $this->superAdmin->id]);

        // 3. Admin B (Coupon Sales Role)
        $this->adminB = User::factory()->create([
            'name'           => 'Audited Admin B',
            'email'          => 'adminb@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);
        $this->adminB->rbacRoles()->attach($this->couponRole->id, ['assigned_by' => $this->superAdmin->id]);

        // 4. Unauthorized Admin (No analytics.sales.view or order.view)
        $this->unauthorizedAdmin = User::factory()->create([
            'name'           => 'Unprivileged Admin',
            'email'          => 'unprivileged@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);

        // 5. Customer
        $this->customer = User::factory()->create([
            'name'           => 'Audit Customer',
            'email'          => 'customer@ayaan.local',
            'role'           => User::ROLE_CUSTOMER,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);

        // 6. Coupons
        $this->couponA = Coupon::create([
            'code'           => 'AUDIT-COUPON-A',
            'discount_type'  => 'percentage',
            'discount_value' => 15.00,
            'min_spend'      => 50.00,
            'is_active'      => true,
        ]);

        $this->couponB = Coupon::create([
            'code'           => 'AUDIT-COUPON-B',
            'discount_type'  => 'fixed',
            'discount_value' => 30.00,
            'min_spend'      => 100.00,
            'is_active'      => true,
        ]);

        // 7. Bindings: Admin A -> Coupon A, Admin B -> Coupon B
        $this->bindingService->bind($this->couponA->id, $this->adminA->id, $this->superAdmin);
        $this->bindingService->bind($this->couponB->id, $this->adminB->id, $this->superAdmin);

        $shipping = [
            'shipping_name'        => 'Audit Customer',
            'shipping_address1'    => '789 Broadway',
            'shipping_city'        => 'New York',
            'shipping_postal_code' => '10003',
            'shipping_country_code'=> 'US',
            'email'                => 'customer@ayaan.local',
            'currency'             => 'USD',
        ];

        // 8. Order A1 (Admin A)
        $this->orderA1 = Order::create(array_merge($shipping, [
            'order_number'    => 'AYN-AUDIT-A01',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponA->id,
            'coupon_code'     => $this->couponA->code,
            'status'          => 'confirmed',
            'payment_status'  => 'paid',
            'subtotal'        => 500.00,
            'discount_amount' => 75.00,
            'total_amount'    => 425.00,
        ]));

        // Order A2 (Admin A) with multiple items
        $this->orderA2 = Order::create(array_merge($shipping, [
            'order_number'    => 'AYN-AUDIT-A02',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponA->id,
            'coupon_code'     => $this->couponA->code,
            'status'          => 'delivered',
            'payment_status'  => 'paid',
            'subtotal'        => 1000.00,
            'discount_amount' => 150.00,
            'total_amount'    => 850.00,
        ]));

        // Order B1 (Admin B)
        $this->orderB1 = Order::create(array_merge($shipping, [
            'order_number'    => 'AYN-AUDIT-B01',
            'user_id'         => $this->customer->id,
            'coupon_id'       => $this->couponB->id,
            'coupon_code'     => $this->couponB->code,
            'status'          => 'processing',
            'payment_status'  => 'paid',
            'subtotal'        => 600.00,
            'discount_amount' => 30.00,
            'total_amount'    => 570.00,
        ]));
    }

    // ── Audit 1: Complete Isolation Between Admin A and Admin B ──────────────

    public function test_audit_admin_a_and_admin_b_mutual_isolation(): void
    {
        // Admin A view: sees only A1 & A2 (2 orders, $1275 total, $225 discount)
        $resA = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/admin/coupon-sales/orders');
        $resA->assertOk();
        $this->assertCount(2, $resA->json('data.data'));
        $numbersA = array_column($resA->json('data.data'), 'order_number');
        $this->assertContains('AYN-AUDIT-A01', $numbersA);
        $this->assertContains('AYN-AUDIT-A02', $numbersA);
        $this->assertNotContains('AYN-AUDIT-B01', $numbersA);

        // Admin B view: sees only B1 (1 order, $570 total, $30 discount)
        $resB = $this->actingAs($this->adminB, 'sanctum')->getJson('/api/v1/admin/coupon-sales/orders');
        $resB->assertOk();
        $this->assertCount(1, $resB->json('data.data'));
        $numbersB = array_column($resB->json('data.data'), 'order_number');
        $this->assertContains('AYN-AUDIT-B01', $numbersB);
        $this->assertNotContains('AYN-AUDIT-A01', $numbersB);
        $this->assertNotContains('AYN-AUDIT-A02', $numbersB);
    }

    // ── Audit 2: Direct Parameter Tampering Defense ──────────────────────────

    public function test_audit_direct_parameter_tampering_is_safely_ignored(): void
    {
        // Admin A tries to pass coupon_id of Coupon B, admin_id=1, scope=all
        $tamperedUrl = "/api/v1/admin/coupon-sales/orders?coupon_id={$this->couponB->id}&admin_id=1&scope=all";
        $response = $this->actingAs($this->adminA, 'sanctum')->getJson($tamperedUrl);

        $response->assertOk();
        // Because Coupon B is not in Admin A's bound scope, query returns 0 orders
        $this->assertCount(0, $response->json('data.data'));
        $this->assertEquals(0, $response->json('data.total'));
    }

    public function test_audit_order_detail_url_tampering_aborts_403(): void
    {
        // Admin A attempts to access Order B1 via reporting show endpoint
        $resReport = $this->actingAs($this->adminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders/{$this->orderB1->id}");
        $resReport->assertForbidden();

        // Admin A attempts to access Order B1 via core admin orders show endpoint
        $resCore = $this->actingAs($this->adminA, 'sanctum')
            ->getJson("/api/v1/admin/orders/{$this->orderB1->id}");
        $resCore->assertForbidden();
    }

    // ── Audit 3: CSV Export Security & Filter Tampering Defense ──────────────

    public function test_audit_csv_export_tampering_defense(): void
    {
        // Admin A attempts to export with coupon_id of Coupon B
        $response = $this->actingAs($this->adminA, 'sanctum')
            ->get("/api/v1/admin/coupon-sales/export?coupon_id={$this->couponB->id}");

        $response->assertOk();
        $content = $response->streamedContent();

        // Header exists
        $this->assertStringContainsString('Order Number', $content);
        // Neither B1 nor A1/A2 are in this filtered export
        $this->assertStringNotContainsString('AYN-AUDIT-B01', $content);
        $this->assertStringNotContainsString('AYN-AUDIT-A01', $content);
    }

    // ── Audit 4: Dynamic Binding Changes Update Reporting Instantly ──────────

    public function test_audit_binding_mutation_instantly_updates_reporting(): void
    {
        // Initial state: Admin A has 2 orders
        $res1 = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/admin/coupon-sales/summary');
        $this->assertEquals(2, $res1->json('data.total_orders'));

        // Super Admin unbinds Coupon A from Admin A
        $bindingA = CouponAdminBinding::where('admin_user_id', $this->adminA->id)->firstOrFail();
        $this->bindingService->unbind($bindingA->id, $this->superAdmin);

        // Immediate verification: Admin A now sees 0 orders, has_bindings = false
        $res2 = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/admin/coupon-sales/summary');
        $this->assertFalse($res2->json('data.has_bindings'));
        $this->assertEquals(0, $res2->json('data.total_orders'));

        // Super Admin binds Coupon B to Admin A
        $this->bindingService->bind($this->couponB->id, $this->adminA->id, $this->superAdmin);

        // Immediate verification: Admin A now sees Order B1 (1 order)
        $res3 = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/admin/coupon-sales/summary');
        $this->assertTrue($res3->json('data.has_bindings'));
        $this->assertEquals(1, $res3->json('data.total_orders'));
        $this->assertEquals(570.00, $res3->json('data.total_sales'));

        // Critical safety check: Historical order records were NEVER modified or deleted
        $this->assertDatabaseHas('orders', ['order_number' => 'AYN-AUDIT-A01']);
        $this->assertDatabaseHas('orders', ['order_number' => 'AYN-AUDIT-A02']);
        $this->assertDatabaseHas('orders', ['order_number' => 'AYN-AUDIT-B01']);
    }

    // ── Audit 5: Role Editability & Dynamic Permission Changes ────────────────

    public function test_audit_role_permission_revocation_enforces_immediately(): void
    {
        // Initial check: Admin A can access summary
        $resInit = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/admin/coupon-sales/summary');
        $resInit->assertOk();

        // Revoke 'analytics.sales.view' permission from 'coupon_sales' role
        $salesViewPerm = Permission::where('slug', 'analytics.sales.view')->firstOrFail();
        $this->couponRole->permissions()->detach($salesViewPerm->id);
        app(\App\Services\Rbac\AdminAuthorizationService::class)->invalidateRole($this->couponRole);

        // Admin A immediately gets 403 Forbidden
        $resRevoked = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/admin/coupon-sales/summary');
        $resRevoked->assertForbidden();

        // Restore 'analytics.sales.view' permission
        $this->couponRole->permissions()->attach($salesViewPerm->id);
        app(\App\Services\Rbac\AdminAuthorizationService::class)->invalidateRole($this->couponRole);

        // Admin A immediately regains access
        $resRestored = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/admin/coupon-sales/summary');
        $resRestored->assertOk();
    }

    // ── Audit 6: No Sensitive Data Leakage in API Responses ───────────────────

    public function test_audit_responses_contain_no_sensitive_secrets_or_tokens(): void
    {
        $response = $this->actingAs($this->adminA, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders/{$this->orderA1->id}");

        $response->assertOk();
        $json = $response->json();
        $content = json_encode($json);

        // Verify forbidden keys are absent
        $this->assertStringNotContainsString('password', $content);
        $this->assertStringNotContainsString('remember_token', $content);
        $this->assertStringNotContainsString('google_id', $content);
        $this->assertStringNotContainsString('secret', $content);
        $this->assertStringNotContainsString('supplier_cost', $content);
        $this->assertStringNotContainsString('buying_price', $content);
    }

    // ── Audit 7: Consistency Between Summary, Table, and CSV Export ──────────

    public function test_audit_qualifying_status_rule_consistency_across_all_surfaces(): void
    {
        // 1. Summary
        $resSummary = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/admin/coupon-sales/summary');
        $resSummary->assertOk();
        $summaryOrders = $resSummary->json('data.total_orders');
        $summarySales = $resSummary->json('data.total_sales');

        // 2. Table
        $resTable = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/admin/coupon-sales/orders');
        $resTable->assertOk();
        $tableOrders = $resTable->json('data.total');

        // 3. CSV Export
        $resExport = $this->actingAs($this->adminA, 'sanctum')->get('/api/v1/admin/coupon-sales/export');
        $resExport->assertOk();
        $csvContent = trim($resExport->streamedContent());
        $csvLines = explode("\n", $csvContent);
        // Exclude header row
        $csvDataRowsCount = count($csvLines) - 1;

        // All three surfaces must match EXACTLY
        $this->assertEquals(2, $summaryOrders);
        $this->assertEquals(2, $tableOrders);
        $this->assertEquals(2, $csvDataRowsCount);
        $this->assertEquals(1275.00, $summarySales);
    }

    // ── Audit 8: Unprivileged Admin Denial ────────────────────────────────────

    public function test_audit_unprivileged_admin_cannot_access_any_reporting_endpoints(): void
    {
        $this->actingAs($this->unauthorizedAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/summary')
            ->assertForbidden();

        $this->actingAs($this->unauthorizedAdmin, 'sanctum')
            ->getJson('/api/v1/admin/coupon-sales/orders')
            ->assertForbidden();

        $this->actingAs($this->unauthorizedAdmin, 'sanctum')
            ->get('/api/v1/admin/coupon-sales/export')
            ->assertForbidden();

        $this->actingAs($this->unauthorizedAdmin, 'sanctum')
            ->getJson("/api/v1/admin/coupon-sales/orders/{$this->orderA1->id}")
            ->assertForbidden();
    }
}
