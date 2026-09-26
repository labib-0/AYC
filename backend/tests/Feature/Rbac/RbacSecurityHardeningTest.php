<?php

namespace Tests\Feature\Rbac;

use App\Models\Activity;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use App\Services\Rbac\AdminAuthorizationService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * MASTER PROMPT 4 — RBAC SECURITY AUDIT, HARDENING, AND NEGATIVE TESTING SUITE
 *
 * Verifies all security invariants, privilege escalation barriers, IDOR defenses,
 * delegation safeguards, data leakage masking, and concurrency protections.
 */
class RbacSecurityHardeningTest extends TestCase
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
            'name'           => 'Master Super Admin',
            'email'          => 'superadmin@test.local',
            'password'       => Hash::make('Secret123!'),
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => true,
        ]);

        // Ordinary Admin
        $this->normalAdmin = User::factory()->create([
            'name'           => 'Ordinary Admin',
            'email'          => 'admin@test.local',
            'password'       => Hash::make('Secret123!'),
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);

        // Customer
        $this->customer = User::factory()->create([
            'name'           => 'Store Customer',
            'email'          => 'customer@test.local',
            'password'       => Hash::make('Secret123!'),
            'role'           => User::ROLE_CUSTOMER,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Boundary & Authentication Invariants
    // ──────────────────────────────────────────────────────────────────────────

    public function test_customer_accessing_admin_endpoint_returns_403(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_guest_accessing_admin_endpoint_returns_401(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(401);
    }

    public function test_admin_without_required_permission_returns_403(): void
    {
        // normalAdmin has no roles/permissions assigned
        $response = $this->actingAs($this->normalAdmin, 'sanctum')
            ->getJson('/api/v1/admin/users');

        $response->assertStatus(403);
    }

    public function test_admin_with_permission_is_allowed(): void
    {
        $role = Role::create([
            'name'      => 'User Inspector',
            'slug'      => 'user_inspector',
            'is_system' => false,
            'is_active' => true,
        ]);
        $perm = Permission::where('slug', 'admin.view')->firstOrFail();
        $role->permissions()->attach($perm->id);
        $this->normalAdmin->rbacRoles()->attach($role->id);
        $this->authz->invalidateUser($this->normalAdmin);

        $response = $this->actingAs($this->normalAdmin, 'sanctum')
            ->getJson('/api/v1/admin/users');

        $response->assertStatus(200);
    }

    public function test_super_admin_has_unconditional_access_without_explicit_role(): void
    {
        // superAdmin has no assigned roles in admin_roles table
        $this->assertCount(0, $this->superAdmin->rbacRoles);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/users');

        $response->assertStatus(200);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Deactivation & Token Revocation Hardening
    // ──────────────────────────────────────────────────────────────────────────

    public function test_deactivated_admin_cannot_authenticate_via_login(): void
    {
        $this->normalAdmin->update(['status' => 'inactive']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@test.local',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
    }

    public function test_deactivation_immediately_revokes_tokens_and_denies_further_access(): void
    {
        // Create active tokens for both superAdmin and normalAdmin
        $superToken = $this->superAdmin->createToken('super_session')->plainTextToken;
        $adminToken = $this->normalAdmin->createToken('admin_session')->plainTextToken;

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $this->normalAdmin->id,
        ]);

        // Super Admin deactivates the admin via toggleStatus endpoint using Bearer token
        $response = $this->withToken($superToken)
            ->patchJson("/api/v1/admin/administrators/{$this->normalAdmin->id}/status", [
                'status' => 'inactive',
            ]);
        $response->assertStatus(200);

        // Verify normalAdmin tokens were purged from DB
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $this->normalAdmin->id,
        ]);

        // Verify cached permissions evaluate to false for deactivated admin
        $this->assertFalse($this->authz->can($this->normalAdmin->fresh(), 'admin.view'));

        // Invalidate guard state in memory so subsequent request re-authenticates via Bearer token
        app('auth')->forgetGuards();

        // Making a request with the purged normalAdmin token must now be 401
        $reqResponse = $this->withToken($adminToken)
            ->getJson('/api/v1/admin/users');
        $reqResponse->assertStatus(401);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Role Lifecycle, Determinism, & Circular Dependency Prevention
    // ──────────────────────────────────────────────────────────────────────────

    public function test_role_removal_immediately_revokes_permissions_and_invalidates_cache(): void
    {
        $role = Role::create([
            'name'      => 'Catalog Operator',
            'slug'      => 'catalog_operator',
            'is_system' => false,
            'is_active' => true,
        ]);
        $role->permissions()->attach(Permission::where('slug', 'product.create')->firstOrFail()->id);
        $this->normalAdmin->rbacRoles()->attach($role->id);

        $this->assertTrue($this->authz->can($this->normalAdmin, 'product.create'));

        // Remove role
        $this->normalAdmin->rbacRoles()->detach($role->id);
        $this->authz->invalidateUser($this->normalAdmin);

        $this->assertFalse($this->authz->can($this->normalAdmin, 'product.create'));
    }

    public function test_role_permission_update_immediately_updates_effective_permissions(): void
    {
        $role = Role::create([
            'name'      => 'Editor',
            'slug'      => 'editor',
            'is_system' => false,
            'is_active' => true,
        ]);
        $role->permissions()->attach(Permission::where('slug', 'product.view')->firstOrFail()->id);
        $this->normalAdmin->rbacRoles()->attach($role->id);

        // Initially only view
        $this->assertTrue($this->authz->can($this->normalAdmin, 'product.view'));
        $this->assertFalse($this->authz->can($this->normalAdmin, 'product.create'));

        // Super Admin updates role permissions via RbacController
        $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson("/api/v1/admin/rbac/roles/{$role->id}/permissions", [
                'permission_slugs' => ['product.view', 'product.create'],
            ])->assertStatus(200);

        // Effective permissions reflect change immediately without restart
        $this->assertTrue($this->authz->can($this->normalAdmin->fresh(), 'product.create'));
    }

    public function test_deterministic_dependency_expansion(): void
    {
        $role = Role::create([
            'name'      => 'Publisher Role',
            'slug'      => 'publisher_role',
            'is_system' => false,
            'is_active' => true,
        ]);
        // product.publish requires [product.view, product.save_draft]
        // and product.save_draft requires [product.view, product.create]
        $role->permissions()->attach(Permission::where('slug', 'product.publish')->firstOrFail()->id);
        $this->normalAdmin->rbacRoles()->attach($role->id);

        $effective = $this->authz->getPermissionSlugs($this->normalAdmin);

        $this->assertContains('product.publish', $effective);
        $this->assertContains('product.save_draft', $effective);
        $this->assertContains('product.view', $effective);
    }

    public function test_circular_dependency_is_detected_and_rejected(): void
    {
        $permA = Permission::where('slug', 'product.view')->firstOrFail();
        $permB = Permission::where('slug', 'product.create')->firstOrFail();

        // In catalog, product.create requires product.view.
        // Attempting to make product.view require product.create would create a cycle: create -> view -> create
        $this->assertTrue($this->authz->wouldCreateCycle($permA->id, $permB->id));

        $this->expectException(\InvalidArgumentException::class);
        $this->authz->addDependency($permA->id, $permB->id);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Privilege Escalation Barricades
    // ──────────────────────────────────────────────────────────────────────────

    public function test_ordinary_admin_cannot_escalate_roles_on_self(): void
    {
        // Create an existing valid role to request
        $targetRole = Role::create([
            'name'      => 'High Authority Role',
            'slug'      => 'high_authority_role',
            'is_system' => false,
            'is_active' => true,
        ]);

        // Give normalAdmin the admin.edit and admin.assign_role permissions
        $role = Role::create([
            'name'      => 'Admin Editor',
            'slug'      => 'admin_editor',
            'is_system' => false,
            'is_active' => true,
        ]);
        $role->permissions()->attach(Permission::whereIn('slug', ['admin.view', 'admin.edit', 'admin.assign_role'])->pluck('id'));
        $this->normalAdmin->rbacRoles()->attach($role->id);
        $this->authz->invalidateUser($this->normalAdmin);

        // Attempt to assign self the new role
        $response = $this->actingAs($this->normalAdmin, 'sanctum')
            ->putJson("/api/v1/admin/administrators/{$this->normalAdmin->id}", [
                'role_slugs' => ['high_authority_role'],
            ]);

        $response->assertStatus(403);
    }

    public function test_ordinary_admin_cannot_delegate_permissions_exceeding_own_authority(): void
    {
        // Admin A has only product permissions + admin.create + admin.assign_role
        $roleA = Role::create([
            'name'      => 'Product Officer',
            'slug'      => 'product_officer',
            'is_system' => false,
            'is_active' => true,
        ]);
        $roleA->permissions()->attach(Permission::whereIn('slug', ['admin.create', 'admin.assign_role', 'product.view'])->pluck('id'));
        $this->normalAdmin->rbacRoles()->attach($roleA->id);
        $this->authz->invalidateUser($this->normalAdmin);

        // Role B has payment.receipt.verify (which normalAdmin does NOT have)
        $roleB = Role::create([
            'name'      => 'Payment Verifier Role',
            'slug'      => 'payment_verifier_role',
            'is_system' => false,
            'is_active' => true,
        ]);
        $roleB->permissions()->attach(Permission::where('slug', 'payment.receipt.verify')->firstOrFail()->id);

        // Normal admin attempts to create an admin with Role B
        $response = $this->actingAs($this->normalAdmin, 'sanctum')
            ->postJson('/api/v1/admin/administrators', [
                'name'       => 'Unauthorized Delegated Admin',
                'email'      => 'delegated@test.local',
                'password'   => 'Secret123!',
                'role_slugs' => ['payment_verifier_role'],
            ]);

        $response->assertStatus(403);
    }

    public function test_ordinary_admin_cannot_modify_or_deactivate_super_admin(): void
    {
        // Give normalAdmin full admin.* permissions except super_admin
        $role = Role::create([
            'name'      => 'Admin Manager',
            'slug'      => 'admin_manager',
            'is_system' => false,
            'is_active' => true,
        ]);
        $role->permissions()->attach(Permission::whereIn('slug', ['admin.view', 'admin.edit', 'admin.deactivate', 'admin.delete'])->pluck('id'));
        $this->normalAdmin->rbacRoles()->attach($role->id);
        $this->authz->invalidateUser($this->normalAdmin);

        // Attempt to edit Super Admin
        $this->actingAs($this->normalAdmin, 'sanctum')
            ->putJson("/api/v1/admin/administrators/{$this->superAdmin->id}", [
                'name' => 'Hacked Super Admin',
            ])->assertStatus(403);

        // Attempt to deactivate Super Admin
        $this->actingAs($this->normalAdmin, 'sanctum')
            ->patchJson("/api/v1/admin/administrators/{$this->superAdmin->id}/status", [
                'status' => 'inactive',
            ])->assertStatus(403);

        // Attempt to delete Super Admin
        $this->actingAs($this->normalAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/administrators/{$this->superAdmin->id}")
            ->assertStatus(403);
    }

    public function test_last_super_admin_cannot_be_deactivated_or_deleted(): void
    {
        // Sole Super Admin attempts to deactivate self
        $responseDeactivate = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson("/api/v1/admin/administrators/{$this->superAdmin->id}", [
                'status' => 'inactive',
            ]);
        $responseDeactivate->assertStatus(422);

        // Sole Super Admin attempts to delete self
        $responseDelete = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/administrators/{$this->superAdmin->id}");
        $responseDelete->assertStatus(422);
    }

    public function test_mass_assignment_cannot_alter_user_role_via_profile(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->putJson('/api/v1/users/me', [
                'name'           => 'Updated Name',
                'role'           => User::ROLE_ADMIN,
                'is_super_admin' => true,
            ]);

        $response->assertStatus(200);
        $this->assertEquals(User::ROLE_CUSTOMER, $this->customer->fresh()->role);
        $this->assertFalse((bool) $this->customer->fresh()->is_super_admin);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Generic Endpoints & State Transition Protection
    // ──────────────────────────────────────────────────────────────────────────

    public function test_generic_product_update_cannot_bypass_publish_permission(): void
    {
        $brand = Brand::factory()->create();
        $category = Category::factory()->create();
        $product = Product::factory()->create([
            'brand_id' => $brand->id,
            'status'   => 'draft',
        ]);
        $product->categories()->attach($category->id);

        // normalAdmin has product.edit and product.save_draft, but NOT product.publish
        $role = Role::create([
            'name'      => 'Draft Editor',
            'slug'      => 'draft_editor',
            'is_system' => false,
            'is_active' => true,
        ]);
        $role->permissions()->attach(Permission::whereIn('slug', ['product.view', 'product.edit', 'product.save_draft'])->pluck('id'));
        $this->normalAdmin->rbacRoles()->attach($role->id);
        $this->authz->invalidateUser($this->normalAdmin);

        // Attempting to publish via PUT /api/v1/products/{id}
        $response = $this->actingAs($this->normalAdmin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'name'   => 'Updated Product',
                'status' => 'published',
            ]);

        $response->assertStatus(403);
        $this->assertEquals('draft', $product->fresh()->status);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. Data Leakage & IDOR Prevention
    // ──────────────────────────────────────────────────────────────────────────

    public function test_product_resource_masks_cost_price_from_unauthorized_admins(): void
    {
        $brand = Brand::factory()->create();
        $category = Category::factory()->create();
        $product = Product::factory()->create([
            'brand_id'   => $brand->id,
            'status'     => 'published',
            'cost_price' => 45.50,
        ]);
        $product->categories()->attach($category->id);

        // normalAdmin has only product.view (no pricing or COGS permission)
        $role = Role::create([
            'name'      => 'Viewer',
            'slug'      => 'viewer',
            'is_system' => false,
            'is_active' => true,
        ]);
        $role->permissions()->attach(Permission::where('slug', 'product.view')->firstOrFail()->id);
        $this->normalAdmin->rbacRoles()->attach($role->id);
        $this->authz->invalidateUser($this->normalAdmin);

        $response = $this->actingAs($this->normalAdmin, 'sanctum')
            ->getJson("/api/v1/products/{$product->id}");

        $response->assertStatus(200);
        $this->assertNull($response->json('data.costPrice'));

        // Super Admin must see the costPrice
        $superResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/v1/products/{$product->id}");
        $superResponse->assertStatus(200);
        $this->assertEquals(45.50, (float) $superResponse->json('data.costPrice'));
    }

    public function test_guest_order_cannot_be_viewed_by_unauthorized_customers_idor_prevention(): void
    {
        $guestOrder = Order::factory()->create([
            'user_id'      => null,
            'email'        => 'guest.buyer@external.local',
            'order_number' => 'ORD-GUEST-1001',
        ]);

        // Customer attempts to view guest order without matching email
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$guestOrder->id}");

        $response->assertStatus(403);
    }

    public function test_commercial_documents_cannot_be_downloaded_without_permission(): void
    {
        $order = Order::factory()->create([
            'user_id'      => $this->customer->id,
            'email'        => $this->customer->email,
            'order_number' => 'ORD-CUST-1002',
        ]);

        // Normal admin without document.view / document.download
        $role = Role::create([
            'name'      => 'Basic Support',
            'slug'      => 'basic_support',
            'is_system' => false,
            'is_active' => true,
        ]);
        $role->permissions()->attach(Permission::where('slug', 'order.view')->firstOrFail()->id);
        $this->normalAdmin->rbacRoles()->attach($role->id);
        $this->authz->invalidateUser($this->normalAdmin);

        $response = $this->actingAs($this->normalAdmin, 'sanctum')
            ->getJson("/api/v1/orders/{$order->id}/documents/ORDER_SHEET");

        $response->assertStatus(403);
    }

    public function test_activity_audit_logs_are_recorded_for_rbac_mutations(): void
    {
        $role = Role::create([
            'name'      => 'Full Admin Manager',
            'slug'      => 'full_admin_manager',
            'is_system' => false,
            'is_active' => true,
        ]);
        $role->permissions()->attach(Permission::whereIn('slug', ['admin.view', 'admin.create', 'admin.edit', 'admin.assign_role'])->pluck('id'));
        $this->superAdmin->rbacRoles()->attach($role->id);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/administrators', [
                'name'     => 'Audited Admin',
                'email'    => 'audited@test.local',
                'password' => 'Secret123!',
            ]);

        $response->assertStatus(201);
        $newAdminId = $response->json('data.id');

        $this->assertDatabaseHas('activities', [
            'action'       => 'admin.created',
            'subject_type' => User::class,
            'subject_id'   => $newAdminId,
        ]);
    }
}
