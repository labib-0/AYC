<?php

namespace Tests\Feature\Rbac;

use App\Models\Activity;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * RbacManagementTest — Feature test suite for Phase 2:
 * Super Admin Management Center, Administrator CRUD, Role CRUD,
 * Permission Dependencies, Provenance Breakdown, and Security Invariants.
 */
class RbacManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $ordinaryAdmin;
    private User $customer;
    private AdminAuthorizationService $rbacService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RbacPermissionCatalogSeeder::class);
        $this->rbacService = app(AdminAuthorizationService::class);

        // Authoritative Super Admin
        $this->superAdmin = User::factory()->create([
            'role'           => User::ROLE_ADMIN,
            'is_super_admin' => true,
            'status'         => 'active',
            'email'          => 'super_' . uniqid() . '@ayaan.test',
        ]);

        // Ordinary Admin (no roles initially)
        $this->ordinaryAdmin = User::factory()->create([
            'role'           => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status'         => 'active',
            'email'          => 'admin_' . uniqid() . '@ayaan.test',
        ]);

        // Customer
        $this->customer = User::factory()->create([
            'role'           => User::ROLE_CUSTOMER,
            'is_super_admin' => false,
            'status'         => 'active',
            'email'          => 'customer_' . uniqid() . '@ayaan.test',
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Administrator CRUD (Super Admin Authority)
    // ──────────────────────────────────────────────────────────────────────────

    public function test_super_admin_can_list_administrators(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/administrators');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertIsArray($data);
        $this->assertGreaterThanOrEqual(2, count($data));

        $foundSuper = collect($data)->firstWhere('id', $this->superAdmin->id);
        $this->assertNotNull($foundSuper);
        $this->assertTrue($foundSuper['is_super_admin']);
    }

    public function test_super_admin_can_create_administrator_with_initial_roles(): void
    {
        $role = Role::where('slug', 'product_draft_editor')->first();

        $payload = [
            'name'       => 'New Staff Member',
            'email'      => 'staff_' . uniqid() . '@ayaan.test',
            'password'   => 'SecretPassword123!',
            'phone'      => '+8801700000000',
            'status'     => 'active',
            'role_slugs' => [$role->slug],
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/administrators', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'New Staff Member')
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.is_super_admin', false);

        $newAdminId = $response->json('data.id');
        $newAdmin = User::find($newAdminId);
        $this->assertNotNull($newAdmin);
        $this->assertEquals(User::ROLE_ADMIN, $newAdmin->role);
        $this->assertTrue($newAdmin->rbacRoles->contains('id', $role->id));

        // Check activity log
        $this->assertDatabaseHas('activities', [
            'action'      => 'admin.created',
            'subject_id'  => (string) $newAdminId,
            'user_id'     => $this->superAdmin->id,
        ]);
    }

    public function test_super_admin_can_update_administrator(): void
    {
        $target = User::factory()->create([
            'role'           => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status'         => 'active',
        ]);

        $role = Role::where('slug', 'order_manager')->first();

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson("/api/v1/admin/administrators/{$target->id}", [
                'name'       => 'Updated Name',
                'phone'      => '+8801999999999',
                'role_slugs' => [$role->slug],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Updated Name');

        $this->assertEquals('Updated Name', $target->fresh()->name);
        $this->assertTrue($target->fresh()->rbacRoles->contains('id', $role->id));
    }

    public function test_super_admin_can_toggle_administrator_status(): void
    {
        $target = User::factory()->create([
            'role'           => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status'         => 'active',
        ]);

        // Deactivate
        $resDeactivate = $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson("/api/v1/admin/administrators/{$target->id}/status", [
                'status' => 'inactive',
            ]);

        $resDeactivate->assertStatus(200)
            ->assertJsonPath('data.status', 'inactive');
        $this->assertEquals('inactive', $target->fresh()->status);

        // Activate
        $resActivate = $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson("/api/v1/admin/administrators/{$target->id}/status", [
                'status' => 'active',
            ]);

        $resActivate->assertStatus(200)
            ->assertJsonPath('data.status', 'active');
        $this->assertEquals('active', $target->fresh()->status);
    }

    public function test_super_admin_can_reset_administrator_password(): void
    {
        $target = User::factory()->create([
            'role'           => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status'         => 'active',
            'password'       => Hash::make('OldPassword123!'),
        ]);

        $newPassword = 'BrandNewPassword999!';

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/admin/administrators/{$target->id}/reset-password", [
                'password' => $newPassword,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertTrue(Hash::check($newPassword, $target->fresh()->password));

        // Audit log verified
        $this->assertDatabaseHas('activities', [
            'action'     => 'admin.password_reset',
            'subject_id' => (string) $target->id,
            'user_id'    => $this->superAdmin->id,
        ]);
    }

    public function test_super_admin_can_safely_delete_administrator(): void
    {
        $target = User::factory()->create([
            'role'           => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status'         => 'active',
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/administrators/{$target->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // User is soft deleted
        $this->assertSoftDeleted('users', ['id' => $target->id]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Permission Provenance / Inspection
    // ──────────────────────────────────────────────────────────────────────────

    public function test_permission_inspection_shows_provenance_and_dependencies(): void
    {
        $role = Role::where('slug', 'product_publisher')->first();

        $target = User::factory()->create([
            'role'           => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status'         => 'active',
        ]);
        $target->rbacRoles()->attach($role->id);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/v1/admin/administrators/{$target->id}/permissions");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.admin.id', $target->id);

        $permissions = $response->json('data.permissions_flat');
        $this->assertIsArray($permissions);

        // product.publish is directly assigned from Product Publisher
        $publishPerm = collect($permissions)->firstWhere('slug', 'product.publish');
        $this->assertNotNull($publishPerm);
        $this->assertTrue($publishPerm['is_direct']);
        $this->assertContains($role->name, $publishPerm['direct_roles']);

        // product.view is inherited as a prerequisite
        $viewPerm = collect($permissions)->firstWhere('slug', 'product.view');
        $this->assertNotNull($viewPerm);
        $this->assertTrue($viewPerm['is_inherited'] || $viewPerm['is_direct']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Super Admin Protections & Self-Lockout Prevention
    // ──────────────────────────────────────────────────────────────────────────

    public function test_ordinary_admin_cannot_modify_super_admin(): void
    {
        // Grant admin.edit permission to ordinary admin via a custom role
        $role = Role::create([
            'name'      => 'Admin Editor',
            'slug'      => 'test_admin_editor_' . uniqid(),
            'is_system' => false,
        ]);
        $perm = Permission::where('slug', 'admin.edit')->first();
        $role->permissions()->attach($perm->id);
        $this->ordinaryAdmin->rbacRoles()->attach($role->id);

        $response = $this->actingAs($this->ordinaryAdmin, 'sanctum')
            ->putJson("/api/v1/admin/administrators/{$this->superAdmin->id}", [
                'name' => 'Attempted Tamper',
            ]);

        $response->assertStatus(403);
        $this->assertNotEquals('Attempted Tamper', $this->superAdmin->fresh()->name);
    }

    public function test_ordinary_admin_cannot_deactivate_super_admin(): void
    {
        $role = Role::create([
            'name'      => 'Admin Deactivator',
            'slug'      => 'test_admin_deactivator_' . uniqid(),
            'is_system' => false,
        ]);
        $perm = Permission::where('slug', 'admin.deactivate')->first();
        $role->permissions()->attach($perm->id);
        $this->ordinaryAdmin->rbacRoles()->attach($role->id);

        $response = $this->actingAs($this->ordinaryAdmin, 'sanctum')
            ->patchJson("/api/v1/admin/administrators/{$this->superAdmin->id}/status", [
                'status' => 'inactive',
            ]);

        $response->assertStatus(403);
        $this->assertEquals('active', $this->superAdmin->fresh()->status);
    }

    public function test_ordinary_admin_cannot_delete_super_admin(): void
    {
        $role = Role::create([
            'name'      => 'Admin Deleter',
            'slug'      => 'test_admin_deleter_' . uniqid(),
            'is_system' => false,
        ]);
        $perm = Permission::where('slug', 'admin.delete')->first();
        $role->permissions()->attach($perm->id);
        $this->ordinaryAdmin->rbacRoles()->attach($role->id);

        $response = $this->actingAs($this->ordinaryAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/administrators/{$this->superAdmin->id}");

        $response->assertStatus(403);
        $this->assertNull($this->superAdmin->fresh()->deleted_at);
    }

    public function test_ordinary_admin_cannot_reset_super_admin_password(): void
    {
        $role = Role::create([
            'name'      => 'Password Resetter',
            'slug'      => 'test_pw_reset_' . uniqid(),
            'is_system' => false,
        ]);
        $perm = Permission::where('slug', 'admin.reset_password')->first();
        $role->permissions()->attach($perm->id);
        $this->ordinaryAdmin->rbacRoles()->attach($role->id);

        $response = $this->actingAs($this->ordinaryAdmin, 'sanctum')
            ->postJson("/api/v1/admin/administrators/{$this->superAdmin->id}/reset-password", [
                'password' => 'HackedPassword123!',
            ]);

        $response->assertStatus(403);
    }

    public function test_cannot_deactivate_self(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson("/api/v1/admin/administrators/{$this->superAdmin->id}/status", [
                'status' => 'inactive',
            ]);

        $response->assertStatus(422);
        $this->assertEquals('active', $this->superAdmin->fresh()->status);
    }

    public function test_cannot_delete_self(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/administrators/{$this->superAdmin->id}");

        $response->assertStatus(422);
        $this->assertNull($this->superAdmin->fresh()->deleted_at);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Role CRUD & Safe Deletion
    // ──────────────────────────────────────────────────────────────────────────

    public function test_super_admin_can_create_custom_role_with_permissions(): void
    {
        $slug = 'custom_role_' . uniqid();
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/rbac/roles', [
                'name'             => 'Custom Inventory Reviewer',
                'slug'             => $slug,
                'description'      => 'Reviews stock levels',
                'permission_slugs' => ['inventory.view', 'inventory.view_warehouse'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.slug', $slug)
            ->assertJsonPath('data.is_system', false);

        $role = Role::where('slug', $slug)->first();
        $this->assertNotNull($role);
        $this->assertTrue($role->permissions->contains('slug', 'inventory.view'));
    }

    public function test_cannot_delete_system_role(): void
    {
        $systemRole = Role::where('is_system', true)->first();
        $this->assertNotNull($systemRole);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/rbac/roles/{$systemRole->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'System roles cannot be deleted.');
    }

    public function test_cannot_delete_role_assigned_to_admins(): void
    {
        $role = Role::create([
            'name'      => 'Assigned Role',
            'slug'      => 'assigned_role_' . uniqid(),
            'is_system' => false,
        ]);
        $this->ordinaryAdmin->rbacRoles()->attach($role->id);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/rbac/roles/{$role->id}");

        $response->assertStatus(422);
        $this->assertStringContainsString('currently assigned', $response->json('message'));
        $this->assertNotNull(Role::find($role->id));
    }

    public function test_can_delete_unassigned_custom_role(): void
    {
        $role = Role::create([
            'name'      => 'Disposable Role',
            'slug'      => 'disposable_role_' . uniqid(),
            'is_system' => false,
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/rbac/roles/{$role->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertNull(Role::find($role->id));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Customer Access Rejection (403)
    // ──────────────────────────────────────────────────────────────────────────

    public function test_customer_cannot_access_administrators_endpoints(): void
    {
        $resIndex = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/administrators');
        $resIndex->assertStatus(403);

        $resRoles = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/rbac/roles');
        $resRoles->assertStatus(403);
    }
}
