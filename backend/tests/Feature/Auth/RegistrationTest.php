<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_successfully(): void
    {
        $payload = [
            'name' => 'John Doe',
            'email' => 'johndoe@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'phone' => '+1234567890',
            'company_name' => 'Acme Inc.',
            'role' => 'customer',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'role',
                        'phone',
                        'company_name',
                        'created_at',
                    ],
                    'token',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'name' => 'John Doe',
                        'email' => 'johndoe@example.com',
                        'role' => 'customer',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'johndoe@example.com',
            'name' => 'John Doe',
            'role' => 'customer',
        ]);
    }

    public function test_duplicate_email_is_rejected(): void
    {
        User::factory()->create([
            'email' => 'duplicate@example.com',
        ]);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Another User',
            'email' => 'duplicate@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_requires_valid_input(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => '123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_password_confirmation_mismatch_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Mismatch Test',
            'email' => 'mismatch@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'different123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password_confirmation']);
    }
}
