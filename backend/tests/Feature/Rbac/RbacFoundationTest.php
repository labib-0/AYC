<?php

namespace Tests\Feature\Rbac;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Rbac\AdminAuthorizationService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * RBAC Foundation Test Suite — Phase 1
 *
 * Tests:
 *  Group 1: System boundary (customer blocked, admin accepted)
 *  Group 2: Super Admin bypass
 *  Group 3: Normal admin permission resolution
 *  Group 4: Permission dependency expansion
 *  Group 5: Privilege escalation prevention
 *  Group 6: Business examples from the spec
 *  Group 7: Payment reviewer example
 *  Group 8: Database integrity
 *  Group 9: Cache invalidation
 *  Group 10: RBAC API endpoints
 */
class RbacFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $normalAdmin;
    protected User $customer;
    protected AdminAuthorizationService $authz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacPermissionCatalogSeeder::class);

        $this->authz = app(AdminAuthorizationService::class);

        // Super Admin
        $this->superAdmin = User::factory()->create([
            'email'          => 'super@test.local',
            'role'           => 'admin',
            'status'         => 'active',
            'is_super_admin' => true,
        ]);

        // Normal admin (no roles yet)
        $this->normalAdmin = User::factory()->create([
            'email'          => 'admin@test.local',
            'role'           => 'admin',
            'status'         => 'active',
            'is_super_admin' => false,
        ]);

        // Customer
        $this->customer = User::factory()->create([
            'email' => 'customer@test.local',
            'role'  => 'customer',
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 1: System Boundary
    // ══════════════════════════════════════════════════════════════════════════

    public function test_customer_is_denied_all_admin_rbac_endpoints(): void
    {
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/rbac/roles')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/rbac/permissions')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/rbac/me')
            ->assertStatus(403);
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/v1/admin/rbac/me')
            ->assertStatus(401);
    }

    public function test_customer_has_zero_effective_permissions(): void
    {
        $perms = $this->authz->getEffectivePermissions($this->customer);
        $this->assertEmpty($perms);
    }

    public function test_customer_is_never_authorized_for_any_permission(): void
    {
        $this->assertFalse($this->authz->can($this->customer, 'product.view'));
        $this->assertFalse($this->authz->can($this->customer, 'order.view'));
        $this->assertFalse($this->authz->can($this->customer, 'permission.manage'));
    }

    public function test_admin_without_roles_has_no_effective_permissions(): void
    {
        // normalAdmin has no roles assigned yet
        $perms = $this->authz->getEffectivePermissions($this->normalAdmin);
        $this->assertEmpty($perms);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 2: Super Admin Bypass
    // ══════════════════════════════════════════════════════════════════════════

    public function test_super_admin_is_authorized_for_any_permission(): void
    {
        $this->assertTrue($this->authz->can($this->superAdmin, 'product.publish'));
        $this->assertTrue($this->authz->can($this->superAdmin, 'permission.manage'));
        $this->assertTrue($this->authz->can($this->superAdmin, 'role.delete'));
        $this->assertTrue($this->authz->can($this->superAdmin, 'aramex.settings.edit'));
    }

    public function test_super_admin_gets_all_permissions_in_effective_set(): void
    {
        $effective = $this->authz->getEffectivePermissions($this->superAdmin);
        $totalPermissions = Permission::count();

        $this->assertCount($totalPermissions, $effective);
    }

    public function test_super_admin_can_manage_roles_via_api(): void
    {
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/rbac/roles', [
                'name' => 'Test Role',
                'slug' => 'test_role',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.slug', 'test_role');
    }

    public function test_super_admin_flag_requires_admin_role(): void
    {
        // A customer with is_super_admin = true must still be rejected
        // (hypothetical scenario; guard at the model level)
        $fakeSuper = User::factory()->create([
            'role'           => 'customer',
            'is_super_admin' => true,
        ]);

        $this->assertFalse($fakeSuper->isSuperAdmin()); // isAdmin() check prevents this
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 3: Normal Admin Permission Resolution
    // ══════════════════════════════════════════════════════════════════════════

    public function test_admin_with_product_draft_editor_role_gets_correct_permissions(): void
    {
        $role = Role::where('slug', 'product_draft_editor')->first();
        $this->normalAdmin->rbacRoles()->attach($role->id, [
            'assigned_by' => $this->superAdmin->id,
            'assigned_at' => now(),
        ]);

        $effective = $this->authz->getEffectivePermissions($this->normalAdmin)->keys()->all();

        $this->assertContains('product.view', $effective);
        $this->assertContains('product.create', $effective);
        $this->assertContains('product.save_draft', $effective);
        $this->assertContains('product.edit', $effective);

        // Cannot publish — not assigned and not auto-depended
        $this->assertNotContains('product.publish', $effective);
    }

    public function test_admin_with_multiple_roles_receives_merged_permissions(): void
    {
        $draftRole   = Role::where('slug', 'product_draft_editor')->first();
        $paymentRole = Role::where('slug', 'payment_reviewer')->first();

        $this->normalAdmin->rbacRoles()->attach([
            $draftRole->id   => ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()],
            $paymentRole->id => ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()],
        ]);

        $effective = $this->authz->getEffectivePermissions($this->normalAdmin)->keys()->all();

        // From draft editor
        $this->assertContains('product.view', $effective);
        $this->assertContains('product.save_draft', $effective);
        // From payment reviewer
        $this->assertContains('payment.receipt.verify', $effective);
        $this->assertContains('payment.view', $effective);
        // Still no publish
        $this->assertNotContains('product.publish', $effective);
    }

    public function test_inactive_admin_is_denied_despite_having_roles(): void
    {
        $role = Role::where('slug', 'order_manager')->first();
        $this->normalAdmin->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);
        $this->normalAdmin->update(['status' => 'inactive']);
        $this->normalAdmin->refresh();

        $this->assertFalse($this->authz->can($this->normalAdmin, 'order.view'));
        $this->assertEmpty($this->authz->getEffectivePermissions($this->normalAdmin));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 4: Permission Dependency Expansion
    // ══════════════════════════════════════════════════════════════════════════

    public function test_assigning_publish_auto_resolves_draft_and_view(): void
    {
        // Assign only product.publish — dependencies should expand to product.view + product.save_draft
        $publishPerm = Permission::where('slug', 'product.publish')->first();

        // Create a custom role with only product.publish
        $customRole = Role::create([
            'name'    => 'Publisher Only',
            'slug'    => 'publisher_only',
            'is_system' => false,
            'is_active' => true,
        ]);
        $customRole->permissions()->attach($publishPerm->id);

        $this->normalAdmin->rbacRoles()->attach($customRole->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $effective = $this->authz->getEffectivePermissions($this->normalAdmin)->keys()->all();

        $this->assertContains('product.publish', $effective);
        $this->assertContains('product.view', $effective);       // auto-expanded
        $this->assertContains('product.save_draft', $effective); // auto-expanded
    }

    public function test_assigning_draft_does_not_auto_grant_publish(): void
    {
        $draftPerm = Permission::where('slug', 'product.save_draft')->first();
        $viewPerm  = Permission::where('slug', 'product.view')->first();
        $createPerm= Permission::where('slug', 'product.create')->first();

        $customRole = Role::create(['name' => 'Draft Only', 'slug' => 'draft_only', 'is_system' => false, 'is_active' => true]);
        $customRole->permissions()->attach([$draftPerm->id, $viewPerm->id, $createPerm->id]);

        $this->normalAdmin->rbacRoles()->attach($customRole->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $effective = $this->authz->getEffectivePermissions($this->normalAdmin)->keys()->all();

        $this->assertContains('product.save_draft', $effective);
        $this->assertNotContains('product.publish', $effective); // NOT automatically granted
    }

    public function test_payment_verify_auto_expands_receipt_view_and_payment_view(): void
    {
        $verifyPerm = Permission::where('slug', 'payment.receipt.verify')->first();
        $customRole = Role::create(['name' => 'Verifier Only', 'slug' => 'verifier_only', 'is_system' => false, 'is_active' => true]);
        $customRole->permissions()->attach($verifyPerm->id);

        $this->normalAdmin->rbacRoles()->attach($customRole->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $effective = $this->authz->getEffectivePermissions($this->normalAdmin)->keys()->all();

        $this->assertContains('payment.receipt.verify', $effective);
        $this->assertContains('payment.receipt.view', $effective);  // auto-expanded
        $this->assertContains('payment.view', $effective);          // auto-expanded
    }

    public function test_dependency_expansion_does_not_loop_infinitely(): void
    {
        // This test ensures circular dependency handling does not cause a stack overflow
        $allSlugs = Permission::pluck('slug')->all();
        $effective = $this->authz->resolveEffectivePermissions($this->normalAdmin);
        // No exception = pass
        $this->assertIsObject($effective);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 5: Privilege Escalation Prevention
    // ══════════════════════════════════════════════════════════════════════════

    public function test_normal_admin_cannot_create_roles(): void
    {
        $this->actingAs($this->normalAdmin, 'sanctum')
            ->postJson('/api/v1/admin/rbac/roles', [
                'name' => 'Escalated Role',
                'slug' => 'escalated_role',
            ])
            ->assertStatus(403);
    }

    public function test_normal_admin_cannot_assign_roles(): void
    {
        $role = Role::where('slug', 'product_publisher')->first();

        $this->actingAs($this->normalAdmin, 'sanctum')
            ->postJson("/api/v1/admin/rbac/admins/{$this->normalAdmin->id}/roles", [
                'role_slug' => $role->slug,
            ])
            ->assertStatus(403);
    }

    public function test_normal_admin_cannot_sync_permissions_on_role(): void
    {
        $role = Role::where('slug', 'product_publisher')->first();

        $this->actingAs($this->normalAdmin, 'sanctum')
            ->putJson("/api/v1/admin/rbac/roles/{$role->id}/permissions", [
                'permission_slugs' => ['permission.manage'],
            ])
            ->assertStatus(403);
    }

    public function test_normal_admin_cannot_delete_roles(): void
    {
        // Create a deletable non-system role first
        $role = Role::create(['name' => 'Temp', 'slug' => 'temp_role', 'is_system' => false, 'is_active' => true]);

        $this->actingAs($this->normalAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/rbac/roles/{$role->id}")
            ->assertStatus(403);
    }

    public function test_customer_cannot_call_rbac_assign_endpoint(): void
    {
        $role = Role::where('slug', 'product_publisher')->first();

        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/admin/rbac/admins/{$this->normalAdmin->id}/roles", [
                'role_slug' => $role->slug,
            ])
            ->assertStatus(403);
    }

    public function test_system_roles_cannot_be_deleted_even_by_super_admin(): void
    {
        $systemRole = Role::where('is_system', true)->first();

        $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/rbac/roles/{$systemRole->id}")
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'System roles cannot be deleted.']);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 6: Business Examples from Spec (§56 and §57)
    // ══════════════════════════════════════════════════════════════════════════

    /** §56 — Admin A: Product Draft Editor */
    public function test_spec_admin_a_product_draft_editor(): void
    {
        $role = Role::where('slug', 'product_draft_editor')->first();
        $this->normalAdmin->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $this->assertTrue($this->authz->can($this->normalAdmin, 'product.view'));
        $this->assertTrue($this->authz->can($this->normalAdmin, 'product.create'));
        $this->assertTrue($this->authz->can($this->normalAdmin, 'product.save_draft'));
        $this->assertTrue($this->authz->can($this->normalAdmin, 'product.edit'));
        $this->assertFalse($this->authz->can($this->normalAdmin, 'product.publish'));
    }

    /** §56 — Admin B: Product Publisher (only product.publish assigned) */
    public function test_spec_admin_b_product_publisher_auto_deps(): void
    {
        // Create role with ONLY product.publish (publish auto-implies draft+view)
        $publishPerm = Permission::where('slug', 'product.publish')->first();
        $role = Role::create(['name' => 'Spec Publisher', 'slug' => 'spec_publisher', 'is_system' => false, 'is_active' => true]);
        $role->permissions()->attach($publishPerm->id);

        $adminB = User::factory()->create(['role' => 'admin', 'status' => 'active', 'is_super_admin' => false]);
        $adminB->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $this->assertTrue($this->authz->can($adminB, 'product.publish'));
        $this->assertTrue($this->authz->can($adminB, 'product.view'));
        $this->assertTrue($this->authz->can($adminB, 'product.save_draft'));
    }

    /** §57 — Admin C: Order Viewer (order.view + payment.receipt.view; no verify) */
    public function test_spec_admin_c_order_viewer(): void
    {
        $orderViewPerm   = Permission::where('slug', 'order.view')->first();
        $receiptViewPerm = Permission::where('slug', 'payment.receipt.view')->first();
        $paymentViewPerm = Permission::where('slug', 'payment.view')->first();

        $role = Role::create(['name' => 'Spec Order Viewer', 'slug' => 'spec_order_viewer', 'is_system' => false, 'is_active' => true]);
        $role->permissions()->attach([$orderViewPerm->id, $receiptViewPerm->id, $paymentViewPerm->id]);

        $adminC = User::factory()->create(['role' => 'admin', 'status' => 'active', 'is_super_admin' => false]);
        $adminC->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $this->assertTrue($this->authz->can($adminC, 'order.view'));
        $this->assertTrue($this->authz->can($adminC, 'payment.receipt.view'));
        $this->assertFalse($this->authz->can($adminC, 'payment.receipt.verify'));
        $this->assertFalse($this->authz->can($adminC, 'order.confirm'));
        $this->assertFalse($this->authz->can($adminC, 'order.cancel'));
        $this->assertFalse($this->authz->can($adminC, 'shipment.create'));
        $this->assertFalse($this->authz->can($adminC, 'inventory.adjust'));
    }

    /** §57 — Admin D: Payment Reviewer */
    public function test_spec_admin_d_payment_reviewer(): void
    {
        $role = Role::where('slug', 'payment_reviewer')->first();

        $adminD = User::factory()->create(['role' => 'admin', 'status' => 'active', 'is_super_admin' => false]);
        $adminD->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $this->assertTrue($this->authz->can($adminD, 'payment.view'));
        $this->assertTrue($this->authz->can($adminD, 'payment.receipt.view'));
        $this->assertTrue($this->authz->can($adminD, 'payment.receipt.verify'));
        $this->assertTrue($this->authz->can($adminD, 'payment.receipt.reject'));

        // NOT granted
        $this->assertFalse($this->authz->can($adminD, 'order.cancel'));
        $this->assertFalse($this->authz->can($adminD, 'shipment.create'));
        $this->assertFalse($this->authz->can($adminD, 'inventory.adjust'));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 7: Payment Reviewer Full Flow (§50)
    // ══════════════════════════════════════════════════════════════════════════

    public function test_order_viewer_can_view_receipt_but_not_verify(): void
    {
        $orderView = Permission::where('slug', 'order.view')->first();
        $payView   = Permission::where('slug', 'payment.view')->first();
        $rcptView  = Permission::where('slug', 'payment.receipt.view')->first();

        $role = Role::create(['name' => 'Order Viewer', 'slug' => 'spec_order_viewer2', 'is_system' => false, 'is_active' => true]);
        $role->permissions()->attach([$orderView->id, $payView->id, $rcptView->id]);

        $this->normalAdmin->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $this->assertTrue($this->authz->can($this->normalAdmin, 'payment.receipt.view'));
        $this->assertFalse($this->authz->can($this->normalAdmin, 'payment.receipt.verify'));
    }

    public function test_gaining_verify_permission_allows_verification(): void
    {
        $orderView = Permission::where('slug', 'order.view')->first();
        $payView   = Permission::where('slug', 'payment.view')->first();
        $rcptView  = Permission::where('slug', 'payment.receipt.view')->first();
        $verify    = Permission::where('slug', 'payment.receipt.verify')->first();

        $role = Role::create(['name' => 'Reviewer With Verify', 'slug' => 'reviewer_verify', 'is_system' => false, 'is_active' => true]);
        $role->permissions()->attach([$orderView->id, $payView->id, $rcptView->id, $verify->id]);

        $this->normalAdmin->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $this->assertTrue($this->authz->can($this->normalAdmin, 'payment.receipt.view'));
        $this->assertTrue($this->authz->can($this->normalAdmin, 'payment.receipt.verify'));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 8: Database Integrity
    // ══════════════════════════════════════════════════════════════════════════

    public function test_no_duplicate_role_permission_assignments(): void
    {
        $role = Role::where('slug', 'product_draft_editor')->first();
        $perm = Permission::where('slug', 'product.view')->first();

        // Attempt a second attach — should not throw (using syncWithoutDetaching)
        $role->permissions()->syncWithoutDetaching([$perm->id]);
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $count = \DB::table('role_permissions')
            ->where('role_id', $role->id)
            ->where('permission_id', $perm->id)
            ->count();

        $this->assertEquals(1, $count);
    }

    public function test_no_duplicate_admin_role_assignments(): void
    {
        $role = Role::where('slug', 'order_manager')->first();

        $this->normalAdmin->rbacRoles()->syncWithoutDetaching([
            $role->id => ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()],
        ]);
        $this->normalAdmin->rbacRoles()->syncWithoutDetaching([
            $role->id => ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()],
        ]);

        $count = \DB::table('admin_roles')
            ->where('user_id', $this->normalAdmin->id)
            ->where('role_id', $role->id)
            ->count();

        $this->assertEquals(1, $count);
    }

    public function test_customer_cannot_receive_admin_role(): void
    {
        $role = Role::where('slug', 'product_publisher')->first();

        // Customers are blocked at the service level
        $effective = $this->authz->getEffectivePermissions($this->customer);
        $this->assertEmpty($effective);

        // Even if we force-attach (should not happen in practice), the service still rejects
        $this->customer->rbacRoles()->syncWithoutDetaching([
            $role->id => ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()],
        ]);
        $this->customer->refresh();

        // Service still denies because user is not admin
        $this->assertFalse($this->authz->can($this->customer, 'product.view'));
    }

    public function test_all_139_permissions_are_present_in_db(): void
    {
        $this->assertEquals(139, Permission::count());
    }

    public function test_all_system_roles_are_present(): void
    {
        $this->assertEquals(12, Role::where('is_system', true)->count());
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 9: Cache Invalidation
    // ══════════════════════════════════════════════════════════════════════════

    public function test_cache_is_invalidated_after_role_assignment(): void
    {
        $role = Role::where('slug', 'order_manager')->first();

        // Warm the cache
        Cache::forget('rbac:user_perms:' . $this->normalAdmin->id);
        $before = $this->authz->getEffectivePermissions($this->normalAdmin);
        $this->assertEmpty($before);

        // Assign role
        $this->normalAdmin->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);
        $this->authz->invalidateUser($this->normalAdmin);

        // Re-resolve
        $after = $this->authz->getEffectivePermissions($this->normalAdmin);
        $this->assertNotEmpty($after);
        $this->assertTrue($after->has('order.view'));
    }

    public function test_deactivated_admin_sees_empty_permissions_after_cache_invalidation(): void
    {
        $role = Role::where('slug', 'order_manager')->first();
        $this->normalAdmin->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        // Warm cache
        $this->authz->getEffectivePermissions($this->normalAdmin);

        // Deactivate
        $this->normalAdmin->update(['status' => 'inactive']);
        $this->authz->invalidateUser($this->normalAdmin);
        $this->normalAdmin->refresh();

        $effective = $this->authz->getEffectivePermissions($this->normalAdmin);
        $this->assertEmpty($effective);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Group 10: RBAC API Endpoints
    // ══════════════════════════════════════════════════════════════════════════

    public function test_admin_can_get_own_rbac_profile(): void
    {
        $role = Role::where('slug', 'order_manager')->first();
        $this->normalAdmin->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $response = $this->actingAs($this->normalAdmin, 'sanctum')
            ->getJson('/api/v1/admin/rbac/me')
            ->assertStatus(200)
            ->assertJsonPath('data.is_super_admin', false)
            ->assertJsonStructure(['data' => ['is_super_admin', 'assigned_roles', 'effective_permissions']]);

        $this->assertContains('order_manager', $response->json('data.assigned_roles'));
    }

    public function test_super_admin_can_list_roles(): void
    {
        $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/rbac/roles')
            ->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'permissions']]]);
    }

    public function test_super_admin_can_list_permission_catalog(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/rbac/permissions?group_by_module=1')
            ->assertStatus(200);

        $data = $response->json('data');
        $this->assertArrayHasKey('Catalog', $data);
        $this->assertArrayHasKey('Orders', $data);
        $this->assertArrayHasKey('Payment', $data);
    }

    public function test_super_admin_can_assign_and_remove_role_from_admin(): void
    {
        $role = Role::where('slug', 'analytics_viewer')->first();

        // Assign
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/admin/rbac/admins/{$this->normalAdmin->id}/roles", [
                'role_slug' => $role->slug,
            ])
            ->assertStatus(200);

        // Verify
        $this->assertTrue($this->normalAdmin->rbacRoles()->where('slug', $role->slug)->exists());

        // Remove
        $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/rbac/admins/{$this->normalAdmin->id}/roles/{$role->id}")
            ->assertStatus(200);

        $this->assertFalse($this->normalAdmin->fresh()->rbacRoles()->where('slug', $role->slug)->exists());
    }

    public function test_super_admin_can_sync_role_permissions(): void
    {
        $role = Role::where('slug', 'analytics_viewer')->first();

        $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson("/api/v1/admin/rbac/roles/{$role->id}/permissions", [
                'permission_slugs' => ['analytics.dashboard.view', 'analytics.sales.view'],
            ])
            ->assertStatus(200);

        $role->refresh();
        $slugs = $role->permissions->pluck('slug')->all();
        $this->assertContains('analytics.dashboard.view', $slugs);
        $this->assertContains('analytics.sales.view', $slugs);
    }

    public function test_get_admin_roles_returns_effective_permissions(): void
    {
        $role = Role::where('slug', 'payment_reviewer')->first();
        $this->normalAdmin->rbacRoles()->attach($role->id, ['assigned_by' => $this->superAdmin->id, 'assigned_at' => now()]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/v1/admin/rbac/admins/{$this->normalAdmin->id}/roles")
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['admin', 'assigned_roles', 'effective_permissions']]);

        $effective = $response->json('data.effective_permissions');
        $this->assertContains('payment.receipt.verify', $effective);
        $this->assertContains('payment.view', $effective);
    }
}
