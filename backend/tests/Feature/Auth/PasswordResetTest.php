<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_reset_link_or_records_token(): void
    {
        $user = User::factory()->create([
            'email' => 'resetme@ayaanclothing.com',
        ]);

        $response = $this->postJson('/api/v1/auth/password/forgot', [
            'email' => 'resetme@ayaanclothing.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'resetme@ayaanclothing.com',
        ]);
    }

    public function test_forgot_password_alias_endpoint_also_works(): void
    {
        $user = User::factory()->create([
            'email' => 'alias@ayaanclothing.com',
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'alias@ayaanclothing.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'validtoken@ayaanclothing.com',
            'password' => Hash::make('old_password'),
        ]);

        $token = Password::createToken($user);

        $response = $this->postJson('/api/v1/auth/password/reset', [
            'token' => $token,
            'email' => 'validtoken@ayaanclothing.com',
            'password' => 'new_password123',
            'password_confirmation' => 'new_password123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertTrue(Hash::check('new_password123', $user->fresh()->password));
    }

    public function test_reset_password_fails_with_invalid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'invalidtoken@ayaanclothing.com',
        ]);

        $response = $this->postJson('/api/v1/auth/password/reset', [
            'token' => 'invalid-token-12345',
            'email' => 'invalidtoken@ayaanclothing.com',
            'password' => 'new_password123',
            'password_confirmation' => 'new_password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
