<?php

namespace Tests\Feature\Auth;

use App\Models\EmailVerificationToken;
use App\Models\User;
use App\Notifications\CustomerVerifyEmailNotification;
use App\Services\Auth\EmailVerificationService;
use Carbon\Carbon;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
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

    public function test_registration_when_verification_enabled_issues_token_and_sets_binding_cookie(): void
    {
        Notification::fake();
        config(['auth.verification.enabled' => true]);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Charlie Bob',
            'email' => 'charlie@example.com',
            'password' => 'secretPassword123',
            'password_confirmation' => 'secretPassword123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'requires_verification' => true,
                ],
            ]);

        // Security check: raw token must NOT be returned in JSON response
        $this->assertArrayNotHasKey('token', $response->json('data'));

        // Security check: browser binding cookie must be present
        $response->assertCookie('ayc_reg_binding');

        $user = User::where('email', 'charlie@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);

        // Challenge token record stored hashed in database
        $tokenRecord = EmailVerificationToken::where('user_id', $user->id)->first();
        $this->assertNotNull($tokenRecord);
        $this->assertNull($tokenRecord->used_at);

        Notification::assertSentTo($user, CustomerVerifyEmailNotification::class);
    }

    public function test_registration_when_verification_disabled_preserves_immediate_login(): void
    {
        config(['auth.verification.enabled' => false]);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Dave Miller',
            'email' => 'dave@example.com',
            'password' => 'secretPassword123',
            'password_confirmation' => 'secretPassword123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertArrayHasKey('access_token', $response->json('data'));
    }

    public function test_verification_with_valid_token_and_matching_browser_binding_succeeds(): void
    {
        config(['auth.verification.enabled' => true]);

        $user = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        /** @var EmailVerificationService $service */
        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($user);

        $response = $this->withCookie('ayc_reg_binding', $challenge['browser_binding_secret'])
            ->getJson("/api/v1/auth/email/verify/{$user->id}/" . sha1($user->getEmailForVerification()) . "?token={$challenge['token']}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'verified' => true,
                ],
            ]);

        $this->assertNotNull($user->fresh()->email_verified_at);

        // Token must be consumed
        $tokenRecord = EmailVerificationToken::where('user_id', $user->id)->first();
        $this->assertNotNull($tokenRecord->used_at);

        // Browser binding cookie should be cleared
        $response->assertCookieExpired('ayc_reg_binding');
    }

    public function test_verification_without_browser_binding_cookie_rejects_and_does_not_consume_token(): void
    {
        config(['auth.verification.enabled' => true]);

        $user = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        /** @var EmailVerificationService $service */
        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($user);

        // Request with NO cookie (link scanner / prefetcher scenario)
        $response = $this->getJson("/api/v1/auth/email/verify/{$user->id}/" . sha1($user->getEmailForVerification()) . "?token={$challenge['token']}");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'status' => 'different_browser',
            ]);

        // CRITICAL: Account must NOT be verified
        $this->assertNull($user->fresh()->email_verified_at);

        // CRITICAL: Token must NOT be consumed
        $tokenRecord = EmailVerificationToken::where('user_id', $user->id)->first();
        $this->assertNull($tokenRecord->used_at);
    }

    public function test_verification_with_mismatched_browser_binding_cookie_rejects(): void
    {
        config(['auth.verification.enabled' => true]);

        $user = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        /** @var EmailVerificationService $service */
        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($user);

        // Request with WRONG cookie
        $response = $this->withCookie('ayc_reg_binding', 'wrong_browser_secret_1234567890abcdef')
            ->getJson("/api/v1/auth/email/verify/{$user->id}/" . sha1($user->getEmailForVerification()) . "?token={$challenge['token']}");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'status' => 'different_browser',
            ]);

        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertNull(EmailVerificationToken::where('user_id', $user->id)->first()->used_at);
    }

    public function test_cross_browser_recovery_with_valid_password_succeeds(): void
    {
        config(['auth.verification.enabled' => true]);

        $user = User::factory()->create([
            'email_verified_at' => null,
            'password' => bcrypt('myPassword123!'),
            'role' => User::ROLE_CUSTOMER,
        ]);

        /** @var EmailVerificationService $service */
        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($user);

        // Recovery request from different browser with password
        $response = $this->postJson('/api/v1/auth/email/verify-with-credentials', [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
            'token' => $challenge['token'],
            'password' => 'myPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'verified' => true,
                ],
            ]);

        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertNotNull(EmailVerificationToken::where('user_id', $user->id)->first()->used_at);
    }

    public function test_cross_browser_recovery_with_wrong_password_fails(): void
    {
        config(['auth.verification.enabled' => true]);

        $user = User::factory()->create([
            'email_verified_at' => null,
            'password' => bcrypt('myPassword123!'),
            'role' => User::ROLE_CUSTOMER,
        ]);

        /** @var EmailVerificationService $service */
        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($user);

        $response = $this->postJson('/api/v1/auth/email/verify-with-credentials', [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
            'token' => $challenge['token'],
            'password' => 'incorrectPassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertNull(EmailVerificationToken::where('user_id', $user->id)->first()->used_at);
    }

    public function test_verification_with_expired_token_fails(): void
    {
        config(['auth.verification.enabled' => true]);

        $user = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        /** @var EmailVerificationService $service */
        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($user);

        // Manually expire the token
        EmailVerificationToken::where('user_id', $user->id)->update([
            'expires_at' => Carbon::now()->subMinutes(10),
        ]);

        $response = $this->withCookie('ayc_reg_binding', $challenge['browser_binding_secret'])
            ->getJson("/api/v1/auth/email/verify/{$user->id}/" . sha1($user->getEmailForVerification()) . "?token={$challenge['token']}");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'status' => 'invalid_or_expired',
            ]);

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_verification_with_reused_token_fails(): void
    {
        config(['auth.verification.enabled' => true]);

        $user = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        /** @var EmailVerificationService $service */
        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($user);

        // First verification succeeds
        $service->verify($user->id, $challenge['token'], $challenge['browser_binding_secret']);
        $this->assertNotNull($user->fresh()->email_verified_at);

        // Second verification with identical token must return already_verified
        $response = $this->withCookie('ayc_reg_binding', $challenge['browser_binding_secret'])
            ->getJson("/api/v1/auth/email/verify/{$user->id}/" . sha1($user->getEmailForVerification()) . "?token={$challenge['token']}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'already_verified' => true,
                ],
            ]);
    }

    public function test_legacy_customer_exempt_from_verification(): void
    {
        config([
            'auth.verification.enabled' => true,
            'auth.verification.enforce_from' => '2026-10-18 00:00:00',
        ]);

        // Legacy customer registered before cutoff
        $legacyCustomer = new User([
            'email' => 'legacy@example.com',
            'role' => User::ROLE_CUSTOMER,
        ]);
        $legacyCustomer->created_at = Carbon::parse('2026-10-17 12:00:00');
        $legacyCustomer->email_verified_at = null;

        $this->assertTrue($legacyCustomer->isVerifiedOrLegacyExempt());

        // New customer registered after cutoff
        $newCustomer = new User([
            'email' => 'newuser@example.com',
            'role' => User::ROLE_CUSTOMER,
        ]);
        $newCustomer->created_at = Carbon::parse('2026-10-18 12:00:00');
        $newCustomer->email_verified_at = null;

        $this->assertFalse($newCustomer->isVerifiedOrLegacyExempt());
    }
}

