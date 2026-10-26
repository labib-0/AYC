<?php

namespace Tests\Feature\Customer;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CustomerPasswordChangeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * TEST 1: Updating password with valid current password succeeds and persists new hash.
     */
    public function test_customer_can_update_password_with_valid_current_password(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
            'email' => 'customer_secure@example.com',
            'password' => Hash::make('CurrentSecret123!'),
        ]);

        $response = $this->actingAs($customer, 'sanctum')->putJson('/api/v1/users/me', [
            'current_password' => 'CurrentSecret123!',
            'password' => 'BrandNewSecret456!',
            'password_confirmation' => 'BrandNewSecret456!',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // Verify password in response is hidden/not returned
        $this->assertArrayNotHasKey('password', $response->json('data'));

        // Refresh user from database and verify hash
        $customer->refresh();
        $this->assertTrue(Hash::check('BrandNewSecret456!', $customer->password));
        $this->assertFalse(Hash::check('CurrentSecret123!', $customer->password));
    }

    /**
     * TEST 2: Attempting to update password with incorrect current password is rejected.
     */
    public function test_customer_cannot_update_password_with_incorrect_current_password(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
            'email' => 'customer_wrong_pw@example.com',
            'password' => Hash::make('OriginalSecret123!'),
        ]);

        $response = $this->actingAs($customer, 'sanctum')->putJson('/api/v1/users/me', [
            'current_password' => 'WrongGuessPassword!',
            'password' => 'BrandNewSecret456!',
            'password_confirmation' => 'BrandNewSecret456!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        // Verify original password is unchanged
        $customer->refresh();
        $this->assertTrue(Hash::check('OriginalSecret123!', $customer->password));
        $this->assertFalse(Hash::check('BrandNewSecret456!', $customer->password));
    }

    /**
     * TEST 3: Attempting to update password without current password is rejected.
     */
    public function test_customer_cannot_update_password_without_current_password(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
            'email' => 'customer_no_current@example.com',
            'password' => Hash::make('OriginalSecret123!'),
        ]);

        $response = $this->actingAs($customer, 'sanctum')->putJson('/api/v1/users/me', [
            'password' => 'BrandNewSecret456!',
            'password_confirmation' => 'BrandNewSecret456!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        $customer->refresh();
        $this->assertTrue(Hash::check('OriginalSecret123!', $customer->password));
    }

    /**
     * TEST 4: Attempting to update password with mismatched confirmation is rejected.
     */
    public function test_customer_cannot_update_password_with_mismatched_confirmation(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
            'email' => 'customer_mismatch@example.com',
            'password' => Hash::make('OriginalSecret123!'),
        ]);

        $response = $this->actingAs($customer, 'sanctum')->putJson('/api/v1/users/me', [
            'current_password' => 'OriginalSecret123!',
            'password' => 'BrandNewSecret456!',
            'password_confirmation' => 'DifferentSecret789!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $customer->refresh();
        $this->assertTrue(Hash::check('OriginalSecret123!', $customer->password));
    }

    /**
     * TEST 5: Attempting to update password below minimum length is rejected.
     */
    public function test_customer_cannot_update_password_below_minimum_length(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
            'email' => 'customer_short@example.com',
            'password' => Hash::make('OriginalSecret123!'),
        ]);

        $response = $this->actingAs($customer, 'sanctum')->putJson('/api/v1/users/me', [
            'current_password' => 'OriginalSecret123!',
            'password' => '12345',
            'password_confirmation' => '12345',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $customer->refresh();
        $this->assertTrue(Hash::check('OriginalSecret123!', $customer->password));
    }

    /**
     * TEST 6: Unauthenticated request to /api/v1/users/me is rejected with 401.
     */
    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->putJson('/api/v1/users/me', [
            'current_password' => 'SomePassword123!',
            'password' => 'BrandNewSecret456!',
            'password_confirmation' => 'BrandNewSecret456!',
        ]);

        $response->assertStatus(401);
    }

    /**
     * TEST 7: Strict account isolation — parameters targeting another user_id are ignored.
     */
    public function test_password_change_enforces_strict_account_isolation(): void
    {
        $victim = User::factory()->create([
            'role' => 'customer',
            'email' => 'victim@example.com',
            'password' => Hash::make('VictimSecret123!'),
        ]);

        $attacker = User::factory()->create([
            'role' => 'customer',
            'email' => 'attacker@example.com',
            'password' => Hash::make('AttackerSecret123!'),
        ]);

        // Attacker attempts to provide victim's id and email in the body
        $response = $this->actingAs($attacker, 'sanctum')->putJson('/api/v1/users/me', [
            'id' => $victim->id,
            'user_id' => $victim->id,
            'email' => $victim->email,
            'current_password' => 'AttackerSecret123!',
            'password' => 'HackedPassword999!',
            'password_confirmation' => 'HackedPassword999!',
        ]);

        $response->assertStatus(200);

        // Victim's password remains unchanged
        $victim->refresh();
        $this->assertTrue(Hash::check('VictimSecret123!', $victim->password));
        $this->assertFalse(Hash::check('HackedPassword999!', $victim->password));

        // Attacker's own password was updated
        $attacker->refresh();
        $this->assertTrue(Hash::check('HackedPassword999!', $attacker->password));
    }
}
