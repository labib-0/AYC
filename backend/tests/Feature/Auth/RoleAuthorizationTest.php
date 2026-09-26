<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_cannot_access_admin_endpoints(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);
        $token = $customer->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/categories', [
                'name' => 'Restricted Category',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_admin_can_access_admin_endpoints(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/categories', [
                'name' => 'Admin Created Category',
            ]);

        // Returns 201 Created or validated response
        $this->assertNotEquals(403, $response->status());
        $this->assertNotEquals(401, $response->status());
    }
}
