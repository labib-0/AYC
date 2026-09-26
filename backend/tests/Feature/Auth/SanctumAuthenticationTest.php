<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SanctumAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_register_and_receives_token_and_customer_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'John Doe',
            'email' => 'johndoe@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'company_name' => 'Acme Wholesale',
            'tax_id' => 'TX-12345',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => ['id', 'name', 'email', 'role'],
                    'token',
                ],
            ])
            ->assertJsonPath('data.user.role', 'customer')
            ->assertJsonMissing(['password']);

        $this->assertDatabaseHas('users', [
            'email' => 'johndoe@example.com',
            'role' => 'customer',
        ]);
    }

    public function test_registration_with_admin_or_b2b_buyer_role_is_rejected(): void
    {
        // Role b2b_buyer must fail validation
        $response1 = $this->postJson('/api/v1/auth/register', [
            'name' => 'Hacker User',
            'email' => 'hacker1@example.com',
            'password' => 'SecurePass123!',
            'role' => 'b2b_buyer',
        ]);
        $response1->assertStatus(422)->assertJsonValidationErrors(['role']);

        // Role admin must fail validation
        $response2 = $this->postJson('/api/v1/auth/register', [
            'name' => 'Hacker User 2',
            'email' => 'hacker2@example.com',
            'password' => 'SecurePass123!',
            'role' => 'admin',
        ]);
        $response2->assertStatus(422)->assertJsonValidationErrors(['role']);
    }

    public function test_customer_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
            'password' => bcrypt('ValidPassword123!'),
            'role' => 'customer',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'ValidPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['user', 'token'],
            ])
            ->assertJsonPath('data.user.email', 'customer@example.com');
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => bcrypt('ValidPassword123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_customer_can_retrieve_me_profile(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.role', 'customer');
    }

    public function test_customer_cannot_access_protected_admin_endpoints(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $response = $this->actingAs($customer, 'sanctum')->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_to_admin_returns_401(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(401);
    }

    public function test_admin_can_access_protected_admin_endpoints(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(200);
    }

    public function test_customer_can_logout_and_revoke_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout');

        $response->assertStatus(200);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);
    }
}
