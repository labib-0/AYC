<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_profile_fields(): void
    {
        $user = User::factory()->create([
            'name' => 'Original Name',
            'phone' => '+1111111111',
            'company_name' => 'Original Co.',
            'role' => 'customer',
        ]);
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/users/me', [
                'name' => 'Updated Name',
                'phone' => '+2222222222',
                'company_name' => 'Updated Co.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => [
                    'name' => 'Updated Name',
                    'phone' => '+2222222222',
                    'company_name' => 'Updated Co.',
                    'role' => 'customer',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'phone' => '+2222222222',
            'company_name' => 'Updated Co.',
        ]);
    }

    public function test_customer_cannot_escalate_role_via_profile_update(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
        ]);
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/users/me', [
                'name' => 'Hacker Name',
                'role' => 'admin', // Malicious attempt to escalate role
            ]);

        $response->assertStatus(200);

        // Verify role remained unchanged
        $this->assertEquals('customer', $user->fresh()->role);
    }

    public function test_unauthenticated_user_cannot_update_profile(): void
    {
        $response = $this->putJson('/api/v1/users/me', [
            'name' => 'Ghost User',
        ]);

        $response->assertStatus(401);
    }
}
