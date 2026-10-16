<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\CustomerVerifyEmailNotification;
use Carbon\Carbon;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_dispatches_email_verification_notification(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alice Doe',
            'email' => 'alice@example.com',
            'password' => 'securePass123',
            'password_confirmation' => 'securePass123',
        ]);

        $response->assertStatus(201);

        $user = User::where('email', 'alice@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);

        Notification::assertSentTo($user, CustomerVerifyEmailNotification::class);
    }

    public function test_user_can_verify_email_with_valid_signed_url(): void
    {
        Event::fake([Verified::class]);

        $user = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $signedUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        $response = $this->getJson($signedUrl);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'verified' => true,
                ],
            ]);

        $this->assertNotNull($user->fresh()->email_verified_at);
        Event::assertDispatched(Verified::class);
    }

    public function test_user_cannot_verify_email_with_invalid_signature(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $signedUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        // Tamper with signature
        $tamperedUrl = $signedUrl . '&tamper=1';

        $response = $this->getJson($tamperedUrl);

        $response->assertStatus(403);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_user_cannot_verify_email_with_expired_signature(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $expiredUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->subMinutes(5),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        $response = $this->getJson($expiredUrl);

        $response->assertStatus(403);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_user_cannot_verify_email_with_tampered_hash(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $otherUser = User::factory()->create([
            'email' => 'other@example.com',
            'email_verified_at' => null,
        ]);

        // Generate signed URL with user's ID but other user's email hash
        $url = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1('different@example.com'),
            ]
        );

        $response = $this->getJson($url);

        $response->assertStatus(403);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_already_verified_user_returns_proper_response(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => User::ROLE_CUSTOMER,
        ]);

        $signedUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        $response = $this->getJson($signedUrl);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'already_verified' => true,
                ],
            ]);
    }

    public function test_unauthenticated_user_can_request_verification_resend(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'resendtest@example.com',
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $response = $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => 'resendtest@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        Notification::assertSentTo($user, CustomerVerifyEmailNotification::class);
    }

    public function test_resend_to_non_existent_email_returns_success_without_sending(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => 'doesnotexist@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        Notification::assertNothingSent();
    }

    public function test_authenticated_user_can_check_verification_status(): void
    {
        $unverifiedUser = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $response = $this->actingAs($unverifiedUser, 'sanctum')
            ->getJson('/api/v1/auth/email/verification-status');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'is_verified' => false,
                ],
            ]);

        $unverifiedUser->markEmailAsVerified();

        $responseVerified = $this->actingAs($unverifiedUser, 'sanctum')
            ->getJson('/api/v1/auth/email/verification-status');

        $responseVerified->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'is_verified' => true,
                ],
            ]);
    }

    public function test_existing_customer_and_admin_can_login_without_lockout(): void
    {
        $password = 'Secret123!';

        // Existing unverified customer
        $customer = User::factory()->create([
            'email' => 'existingcust@example.com',
            'password' => bcrypt($password),
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
            'email_verified_at' => null,
        ]);

        // Customer login succeeds
        $customerResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'existingcust@example.com',
            'password' => $password,
        ]);

        $customerResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        // Existing admin
        $admin = User::factory()->create([
            'email' => 'existingadmin@example.com',
            'password' => bcrypt($password),
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
            'email_verified_at' => null,
        ]);

        // Admin login succeeds
        $adminResponse = $this->postJson('/api/v1/auth/admin/login', [
            'email' => 'existingadmin@example.com',
            'password' => $password,
        ]);

        $adminResponse->assertStatus(200)
            ->assertJson(['success' => true]);
    }
}
