<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private User $corporateCustomer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name'           => 'Main System Admin',
            'email'          => 'sysadmin@ayaan.local',
            'role'           => User::ROLE_ADMIN,
            'is_super_admin' => true,
            'status'         => 'active',
            'access_level'   => 'super_admin',
            'company_name'   => 'Ayaan Management Ltd.',
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Individual Buyer',
            'email' => 'buyer@test.local',
            'role' => User::ROLE_CUSTOMER,
            'company_name' => null,
            'b2b_approval_status' => 'none',
        ]);

        $this->corporateCustomer = User::factory()->create([
            'name' => 'Corporate Partner',
            'email' => 'corporate@buyer.local',
            'role' => User::ROLE_CUSTOMER,
            'company_name' => 'Apex Apparel Sourcing LLC',
            'b2b_approval_status' => 'approved',
        ]);
    }

    public function test_customers_endpoint_never_contains_admin_accounts(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/customers');

        $response->assertStatus(200);
        $data = $response->json('data.data');

        // Total should be exactly 2 (customer + corporateCustomer), NOT including admin
        $this->assertEquals(2, $response->json('data.total'));
        $this->assertCount(2, $data);

        // Verify no admin appears in list
        $emails = array_column($data, 'email');
        $this->assertNotContains('sysadmin@ayaan.local', $emails);
        $this->assertContains('buyer@test.local', $emails);
        $this->assertContains('corporate@buyer.local', $emails);

        // Even with role=admin parameter, admin accounts must NEVER be returned
        $badFilterResponse = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/customers?role=admin');

        $badFilterResponse->assertStatus(200);
        $filteredEmails = array_column($badFilterResponse->json('data.data'), 'email');
        $this->assertNotContains('sysadmin@ayaan.local', $filteredEmails);
    }

    public function test_customer_summary_metrics_strictly_exclude_admins(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/customers/summary');

        $response->assertStatus(200);
        $metrics = $response->json('data');

        // Total customers = 2 (customer + corporateCustomer, excluding admin)
        $this->assertEquals(2, $metrics['totalCustomers']);
        $this->assertArrayHasKey('totalOrders', $metrics);
        $this->assertArrayHasKey('totalSpent', $metrics);
        $this->assertArrayNotHasKey('corporateAccounts', $metrics);
        $this->assertArrayNotHasKey('approvedB2b', $metrics);
    }

    public function test_customer_show_returns_404_for_admin_id(): void
    {
        // Admin ID must not be retrievable as a customer
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/customers/{$this->admin->id}");

        $response->assertStatus(404);
    }

    public function test_dedicated_admin_users_api(): void
    {
        // 1. List admins
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/users');

        $response->assertStatus(200);
        $admins = $response->json('data');
        $this->assertCount(1, $admins);
        $this->assertEquals('sysadmin@ayaan.local', $admins[0]['email']);
        $this->assertEquals('super_admin', $admins[0]['access_level']);

        // 2. Create new admin
        $createRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/users', [
                'name' => 'Secondary Admin',
                'email' => 'secondary@ayaan.local',
                'password' => 'SecureAdminPass@123',
                'phone' => '+880 1711-223344',
                'access_level' => 'admin',
                'status' => 'active',
            ]);

        $createRes->assertStatus(201);
        $newAdminId = $createRes->json('data.id');
        $this->assertNotNull($newAdminId);

        // 3. Edit admin
        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/users/{$newAdminId}", [
                'name' => 'Secondary Admin Updated',
                'access_level' => 'manager',
            ]);

        $updateRes->assertStatus(200);
        $this->assertEquals('Secondary Admin Updated', $updateRes->json('data.name'));
        $this->assertEquals('manager', $updateRes->json('data.access_level'));

        // 4. Toggle status to inactive
        $toggleRes = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/users/{$newAdminId}/status", [
                'status' => 'inactive',
            ]);

        $toggleRes->assertStatus(200);
        $this->assertEquals('inactive', $toggleRes->json('data.status'));

        // 5. Self-deactivation must be rejected
        $selfToggleRes = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/users/{$this->admin->id}/status", [
                'status' => 'inactive',
            ]);

        $selfToggleRes->assertStatus(422);

        // 6. Delete created admin
        $deleteRes = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/users/{$newAdminId}");

        $deleteRes->assertStatus(200);

        // 7. Attempting to delete the only remaining admin must be rejected
        $deleteLastRes = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/users/{$this->admin->id}");

        $deleteLastRes->assertStatus(422);
    }
}
