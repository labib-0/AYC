<?php

namespace Tests\Feature\Admin;

use App\Models\Coupon;
use App\Models\CouponAdminBinding;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Coupon\CouponAdminBindingService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponAdminBindingTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $salesAdminA;
    protected User $salesAdminB;
    protected User $unboundAdmin;
    protected User $customer;
    protected Coupon $couponA;
    protected Coupon $couponB;
    protected CouponAdminBindingService $bindingService;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed permission catalog and prebuilt roles
        $this->seed(RbacPermissionCatalogSeeder::class);

        $this->bindingService = app(CouponAdminBindingService::class);

        $this->superAdmin = User::factory()->create([
            'name' => 'Super Administrator',
            'email' => 'superadmin@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
            'is_super_admin' => true,
        ]);

        $this->salesAdminA = User::factory()->create([
            'name' => 'Sales Agent Alice',
            'email' => 'alice@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
            'is_super_admin' => false,
        ]);

        $this->salesAdminB = User::factory()->create([
            'name' => 'Sales Agent Bob',
            'email' => 'bob@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
            'is_super_admin' => false,
        ]);

        $this->unboundAdmin = User::factory()->create([
            'name' => 'General Admin Charlie',
            'email' => 'charlie@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
            'is_super_admin' => false,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Retail Customer',
            'email' => 'customer@buyer.com',
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
            'is_super_admin' => false,
        ]);

        $this->couponA = Coupon::create([
            'code' => 'AYC-ALICE-10',
            'discount_type' => 'percentage',
            'discount_value' => 10.00,
            'min_spend' => 50.00,
            'max_discount' => 100.00,
            'usage_limit' => 500,
            'usage_count' => 0,
            'is_active' => true,
        ]);

        $this->couponB = Coupon::create([
            'code' => 'AYC-BOB-20',
            'discount_type' => 'fixed',
            'discount_value' => 20.00,
            'min_spend' => 100.00,
            'is_active' => true,
        ]);
    }

    // ── 1. Role Tests ────────────────────────────────────────────────────────

    public function test_prebuilt_coupon_sales_role_exists_and_is_editable(): void
    {
        $role = Role::where('slug', 'coupon_sales')->first();
        $this->assertNotNull($role);
        $this->assertEquals('Coupon Sales Manager', $role->name);
        // Section 5: Normal editable role (is_system must be false)
        $this->assertFalse($role->is_system, 'The coupon_sales role must be a normal editable role (is_system = false).');
        $this->assertTrue($role->is_active);

        // Section 6: Initial granular permissions
        $assignedSlugs = $role->permissions()->pluck('slug')->all();
        $this->assertContains('coupon.view', $assignedSlugs);
        $this->assertContains('order.view', $assignedSlugs);
        $this->assertContains('order.view_customer', $assignedSlugs);
        $this->assertContains('order.view_items', $assignedSlugs);
        $this->assertContains('analytics.sales.view', $assignedSlugs);
        $this->assertContains('analytics.orders.view', $assignedSlugs);

        // Verify non-granted permissions
        $this->assertNotContains('product.create', $assignedSlugs);
        $this->assertNotContains('inventory.adjust', $assignedSlugs);
        $this->assertNotContains('admin.create', $assignedSlugs);
        $this->assertNotContains('role.create', $assignedSlugs);

        // Verify Super Admin can edit permissions on this role
        $newPerms = ['coupon.view', 'order.view'];
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson("/api/v1/admin/rbac/roles/{$role->id}/permissions", [
                'permission_slugs' => $newPerms,
            ]);
        $response->assertOk();
        $this->assertEqualsCanonicalizing($newPerms, $role->fresh()->permissions()->pluck('slug')->all());

        // Verify re-running seeder does not create duplicate roles
        $this->seed(RbacPermissionCatalogSeeder::class);
        $this->assertEquals(1, Role::where('slug', 'coupon_sales')->count());
    }

    // ── 2. Binding Tests ─────────────────────────────────────────────────────

    public function test_super_admin_can_bind_admin_to_coupon(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/coupon-bindings', [
                'coupon_id' => $this->couponA->id,
                'admin_user_id' => $this->salesAdminA->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.coupon_id', $this->couponA->id)
            ->assertJsonPath('data.admin_user_id', $this->salesAdminA->id);

        $this->assertDatabaseHas('coupon_admin_bindings', [
            'coupon_id' => $this->couponA->id,
            'admin_user_id' => $this->salesAdminA->id,
            'created_by' => $this->superAdmin->id,
        ]);
    }

    public function test_duplicate_binding_rejected(): void
    {
        $this->bindingService->bind($this->couponA->id, $this->salesAdminA->id, $this->superAdmin);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/coupon-bindings', [
                'coupon_id' => $this->couponA->id,
                'admin_user_id' => $this->salesAdminA->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['coupon_id']);
    }

    public function test_unbind_works_without_deleting_coupon_or_user(): void
    {
        $binding = $this->bindingService->bind($this->couponA->id, $this->salesAdminA->id, $this->superAdmin);
        $bindingId = $binding->id;

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/coupon-bindings/{$bindingId}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('coupon_admin_bindings', ['id' => $bindingId]);
        // Coupon and User must remain untouched
        $this->assertDatabaseHas('coupons', ['id' => $this->couponA->id]);
        $this->assertDatabaseHas('users', ['id' => $this->salesAdminA->id]);
    }

    public function test_invalid_admin_rejected(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/coupon-bindings', [
                'coupon_id' => $this->couponA->id,
                'admin_user_id' => 999999,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['admin_user_id']);
    }

    public function test_customer_cannot_be_bound(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/coupon-bindings', [
                'coupon_id' => $this->couponA->id,
                'admin_user_id' => $this->customer->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['admin_user_id']);

        $this->assertStringContainsString('Customers cannot be bound', $response->json('errors.admin_user_id.0'));
    }

    public function test_inactive_admin_cannot_be_bound(): void
    {
        $inactiveAdmin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => 'suspended',
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/coupon-bindings', [
                'coupon_id' => $this->couponA->id,
                'admin_user_id' => $inactiveAdmin->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['admin_user_id']);
    }

    public function test_invalid_coupon_rejected(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/coupon-bindings', [
                'coupon_id' => 999999,
                'admin_user_id' => $this->salesAdminA->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['coupon_id']);
    }

    // ── 3. Authorization Tests ───────────────────────────────────────────────

    public function test_unauthenticated_request_rejected(): void
    {
        $response = $this->getJson('/api/v1/admin/coupon-bindings');
        $response->assertUnauthorized();
    }

    public function test_customer_cannot_access_coupon_bindings(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/coupon-bindings');
        $response->assertForbidden();
    }

    public function test_unauthorized_admin_cannot_manage_bindings(): void
    {
        // unboundAdmin has no coupon.edit or coupon.view permissions
        $response = $this->actingAs($this->unboundAdmin, 'sanctum')
            ->postJson('/api/v1/admin/coupon-bindings', [
                'coupon_id' => $this->couponA->id,
                'admin_user_id' => $this->salesAdminA->id,
            ]);

        $response->assertForbidden();
    }

    public function test_authorized_admin_can_view_permitted_bindings(): void
    {
        $couponRole = Role::where('slug', 'coupon_sales')->first();
        $this->salesAdminA->rbacRoles()->attach($couponRole->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $this->bindingService->bind($this->couponA->id, $this->salesAdminA->id, $this->superAdmin);

        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-bindings');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_can_view_own_bindings_via_my_bindings(): void
    {
        $this->bindingService->bind($this->couponA->id, $this->salesAdminA->id, $this->superAdmin);

        $response = $this->actingAs($this->salesAdminA, 'sanctum')
            ->getJson('/api/v1/admin/coupon-bindings/my-bindings');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.coupon_id', $this->couponA->id);
    }

    // ── 4. Data Scope Foundation Tests ───────────────────────────────────────

    public function test_data_scope_resolves_admin_bound_coupon_ids(): void
    {
        // Admin A bound to Coupon A
        $this->bindingService->bind($this->couponA->id, $this->salesAdminA->id, $this->superAdmin);

        // Admin B bound to Coupon B
        $this->bindingService->bind($this->couponB->id, $this->salesAdminB->id, $this->superAdmin);

        // Scope verification
        $aliceScope = $this->bindingService->getBoundCouponIds($this->salesAdminA);
        $bobScope = $this->bindingService->getBoundCouponIds($this->salesAdminB);
        $unboundScope = $this->bindingService->getBoundCouponIds($this->unboundAdmin);
        $customerScope = $this->bindingService->getBoundCouponIds($this->customer);

        $this->assertEquals([$this->couponA->id], $aliceScope);
        $this->assertEquals([$this->couponB->id], $bobScope);
        $this->assertEmpty($unboundScope);
        $this->assertEmpty($customerScope);

        // Eloquent relationship helpers
        $this->assertCount(1, $this->salesAdminA->boundCoupons);
        $this->assertEquals('AYC-ALICE-10', $this->salesAdminA->boundCoupons->first()->code);
    }

    // ── 5. Regression Tests ──────────────────────────────────────────────────

    public function test_existing_coupon_validation_redemption_still_works(): void
    {
        $response = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'AYC-ALICE-10',
            'subtotal' => 200.00,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.isValid', true)
            ->assertJsonPath('data.code', 'AYC-ALICE-10');

        $this->assertEquals(20, $response->json('data.discountAmount'));
    }

    public function test_existing_admin_coupon_crud_still_works(): void
    {
        // Super Admin creating a coupon via existing endpoint
        $createRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/coupons', [
                'code' => 'SUMMER-SPECIAL-25',
                'discount_type' => 'percentage',
                'discount_value' => 25.00,
                'min_spend' => 75.00,
            ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.code', 'SUMMER-SPECIAL-25');

        $couponId = $createRes->json('data.id');

        // Super Admin editing existing coupon
        $updateRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson("/api/v1/admin/coupons/{$couponId}", [
                'discount_value' => 30.00,
            ]);

        $updateRes->assertOk()
            ->assertJsonPath('data.discount_value', '30.00');
    }
}
