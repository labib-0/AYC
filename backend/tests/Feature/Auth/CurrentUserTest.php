<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurrentUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_fetch_own_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'Ayaan Member',
            'email' => 'member@ayaanclothing.com',
            'role' => 'customer',
        ]);
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'name' => 'Ayaan Member',
                    'email' => 'member@ayaanclothing.com',
                    'role' => 'customer',
                ],
            ]);
    }

    public function test_unauthenticated_request_to_me_returns_401(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401);
    }
}
