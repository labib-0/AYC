<?php

namespace Tests\Feature\Auth;

use App\Models\EmailVerificationToken;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Notifications\CustomerVerifyEmailNotification;
use App\Services\Auth\EmailVerificationService;
use Carbon\Carbon;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function mockSocialiteGoogleUser(string $id, string $email, string $name = 'Google User', ?string $avatar = null): void
    {
        Config::set('services.google.client_id', 'test-client-id.apps.googleusercontent.com');
        Config::set('services.google.client_secret', 'test-client-secret');

        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getId')->andReturn($id);
        $socialiteUser->shouldReceive('getEmail')->andReturn($email);
        $socialiteUser->shouldReceive('getName')->andReturn($name);
        $socialiteUser->shouldReceive('getAvatar')->andReturn($avatar);
        $socialiteUser->shouldReceive('getNickname')->andReturn(null);
        $socialiteUser->user = [
            'email_verified' => true,
        ];

        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    public function test_email_password_registration_dispatches_verification_email(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alice Doe',
            'email' => 'alice@example.com',
            'password' => 'securePass123',
            'password_confirmation' => 'securePass123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'requires_verification' => true,
                ],
            ]);

        $user = User::where('email', 'alice@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);

        Notification::assertSentTo($user, CustomerVerifyEmailNotification::class);
    }

    public function test_google_oauth_registration_creates_unverified_account_and_dispatches_notification(): void
    {
        Notification::fake();

        $this->mockSocialiteGoogleUser(
            id: 'google-test-id-12345',
            email: 'googlecustomer@example.com',
            name: 'Google Customer'
        );

        $response = $this->get('/api/v1/auth/google/callback');
        $response->assertStatus(302);

        $user = User::where('email', 'googlecustomer@example.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('google-test-id-12345', $user->google_id);
        $this->assertNull($user->email_verified_at, 'Google OAuth registration must NOT auto-verify account.');

        Notification::assertSentTo($user, CustomerVerifyEmailNotification::class);
    }

    public function test_repeated_google_oauth_login_does_not_auto_verify_account(): void
    {
        Notification::fake();

        // Account created previously via Google OAuth, still unverified
        $user = User::factory()->create([
            'email' => 'repeatgoogle@example.com',
            'google_id' => 'google-test-repeat-888',
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $this->mockSocialiteGoogleUser(
            id: 'google-test-repeat-888',
            email: 'repeatgoogle@example.com',
            name: 'Repeat Google Customer'
        );

        $response = $this->get('/api/v1/auth/google/callback');
        $response->assertStatus(302);

        // Verification status must remain null
        $this->assertNull($user->fresh()->email_verified_at, 'Repeated Google login must not bypass verification.');
    }

    public function test_unverified_customer_cannot_place_order_and_leaves_zero_side_effects(): void
    {
        $unverifiedCustomer = User::factory()->create([
            'email' => 'unverified@example.com',
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $product = Product::factory()->create([
            'wholesale_price' => 50.00,
            'msrp_price' => 50.00,
            'moq' => 1,
            'status' => 'published',
        ]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'L',
            'stock' => 100,
        ]);

        $initialStock = $variant->fresh()->stock;
        $initialOrderCount = Order::count();
        $initialPaymentCount = Payment::count();

        $response = $this->actingAs($unverifiedCustomer, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $unverifiedCustomer->email,
            'shipping_name' => 'Unverified Customer',
            'shipping_address1' => '456 Test Ave',
            'shipping_city' => 'Dallas',
            'shipping_postal_code' => '75001',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size' => 'L',
                    'quantity' => 2,
                ],
            ],
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'EMAIL_VERIFICATION_REQUIRED',
            ]);

        // Verify ZERO side-effects: no orders, no payments, stock untouched
        $this->assertEquals($initialOrderCount, Order::count());
        $this->assertEquals($initialPaymentCount, Payment::count());
        $this->assertEquals($initialStock, $variant->fresh()->stock);
    }

    public function test_unverified_customer_cannot_validate_checkout(): void
    {
        $unverifiedCustomer = User::factory()->create([
            'email' => 'unverified_check@example.com',
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $product = Product::factory()->create([
            'wholesale_price' => 40.00,
            'moq' => 1,
            'status' => 'published',
        ]);

        $response = $this->actingAs($unverifiedCustomer, 'sanctum')->postJson('/api/v1/checkout/validate', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'EMAIL_VERIFICATION_REQUIRED',
            ]);
    }

    public function test_verified_customer_can_place_order_normally(): void
    {
        $verifiedCustomer = User::factory()->create([
            'email' => 'verified@example.com',
            'email_verified_at' => now(),
            'role' => User::ROLE_CUSTOMER,
        ]);

        $product = Product::factory()->create([
            'wholesale_price' => 30.00,
            'msrp_price' => 30.00,
            'moq' => 1,
            'status' => 'published',
        ]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'M',
            'stock' => 50,
        ]);

        $response = $this->actingAs($verifiedCustomer, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $verifiedCustomer->email,
            'shipping_name' => 'Verified Customer',
            'shipping_address1' => '789 Broadway',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10002',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size' => 'M',
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertEquals(1, Order::where('user_id', $verifiedCustomer->id)->count());
    }

    public function test_user_can_verify_email_with_valid_challenge_and_unlock_order_placement(): void
    {
        Event::fake([Verified::class]);

        $customer = User::factory()->create([
            'email' => 'flowtest@example.com',
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        /** @var EmailVerificationService $service */
        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($customer);

        // Before verification: orders blocked
        $this->actingAs($customer, 'sanctum')->postJson('/api/v1/checkout/validate', [
            'items' => [['product_id' => 1, 'quantity' => 1]],
        ])->assertStatus(403);

        // Perform verification via signed link
        $response = $this->getJson($challenge['verification_url']);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'verified' => true,
                ],
            ]);

        $this->assertNotNull($customer->fresh()->email_verified_at);
        Event::assertDispatched(Verified::class);

        // Verify token is marked as consumed
        $tokenRecord = EmailVerificationToken::where('user_id', $customer->id)->first();
        $this->assertNotNull($tokenRecord->used_at);

        // Now order validation succeeds
        $product = Product::factory()->create([
            'wholesale_price' => 25.00,
            'moq' => 1,
            'status' => 'published',
        ]);
        $valRes = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/checkout/validate', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ]);
        $valRes->assertStatus(200);
    }

    public function test_user_cannot_verify_email_with_invalid_signature(): void
    {
        $customer = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($customer);

        $tamperedUrl = $challenge['verification_url'] . '&tamper=1';
        $response = $this->getJson($tamperedUrl);

        $response->assertStatus(403);
        $this->assertNull($customer->fresh()->email_verified_at);
    }

    public function test_user_cannot_verify_email_with_expired_token(): void
    {
        $customer = User::factory()->create([
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($customer);

        // Expire token record
        EmailVerificationToken::where('user_id', $customer->id)->update([
            'expires_at' => Carbon::now()->subMinutes(15),
        ]);

        $response = $this->getJson($challenge['verification_url']);

        $response->assertStatus(403);
        $this->assertNull($customer->fresh()->email_verified_at);
    }

    public function test_already_verified_user_returns_proper_response(): void
    {
        $customer = User::factory()->create([
            'email_verified_at' => now(),
            'role' => User::ROLE_CUSTOMER,
        ]);

        $service = app(EmailVerificationService::class);
        $challenge = $service->createChallenge($customer);

        $response = $this->getJson($challenge['verification_url']);

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

        $customer = User::factory()->create([
            'email' => 'resendtest2@example.com',
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $response = $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => 'resendtest2@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        Notification::assertSentTo($customer, CustomerVerifyEmailNotification::class);
    }

    public function test_resend_to_non_existent_email_returns_success_without_leaking(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => 'nonexistent999@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        Notification::assertNothingSent();
    }

    public function test_successful_registration_dispatches_exactly_one_notification(): void
    {
        Notification::fake();

        $email = 'single_dispatch_' . time() . '@example.com';
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Single Dispatch Test',
            'email' => $email,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'requires_verification' => true,
                ],
            ]);

        $user = User::where('email', $email)->first();
        $this->assertNotNull($user);

        // Crucial regression assert: EXACTLY 1 notification dispatched
        Notification::assertSentToTimes($user, CustomerVerifyEmailNotification::class, 1);
    }

    public function test_failed_registration_does_not_dispatch_notification(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Failed Reg',
            'email' => 'invalid-email-format',
            'password' => 'short',
        ]);

        $response->assertStatus(422);
        Notification::assertNothingSent();
    }

    public function test_resend_inside_60s_cooldown_returns_429_and_blocks_duplicate_dispatch(): void
    {
        Notification::fake();

        $email = 'cooldowntest_' . time() . '@example.com';
        $user = User::factory()->create([
            'email' => $email,
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        // First resend request succeeds
        $res1 = $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => $email,
        ]);
        $res1->assertStatus(200);
        Notification::assertSentToTimes($user, CustomerVerifyEmailNotification::class, 1);

        // Second resend request within 60s MUST return 429
        $res2 = $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => $email,
        ]);
        $res2->assertStatus(429)
            ->assertJson([
                'success' => false,
                'error_code' => 'VERIFICATION_RESEND_COOLDOWN',
            ]);

        // Notification count MUST remain strictly 1
        Notification::assertSentToTimes($user, CustomerVerifyEmailNotification::class, 1);
    }

    public function test_resend_to_already_verified_account_does_not_dispatch_notification(): void
    {
        Notification::fake();

        $email = 'alreadyverified_' . time() . '@example.com';
        $user = User::factory()->create([
            'email' => $email,
            'email_verified_at' => now(),
            'role' => User::ROLE_CUSTOMER,
        ]);

        $response = $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => $email,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'already_verified' => true,
                ],
            ]);

        Notification::assertNothingSent();
    }

    public function test_unverified_order_placement_does_not_dispatch_email(): void
    {
        Notification::fake();

        $unverifiedCustomer = User::factory()->create([
            'email' => 'order_no_resend@example.com',
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $response = $this->actingAs($unverifiedCustomer, 'sanctum')->postJson('/api/v1/orders', [
            'shipping_name' => 'Test User',
            'shipping_address1' => '123 Main St',
            'shipping_city' => 'Anytown',
            'shipping_postal_code' => '12345',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'EMAIL_VERIFICATION_REQUIRED',
            ]);

        // Order placement failure MUST NOT trigger email verification notification
        Notification::assertNothingSent();
    }

    public function test_verification_status_endpoint_works_for_both_auth_and_email_query(): void
    {
        $unverified = User::factory()->create([
            'email' => 'statuscheck_unverified@example.com',
            'email_verified_at' => null,
            'role' => User::ROLE_CUSTOMER,
        ]);

        $verified = User::factory()->create([
            'email' => 'statuscheck_verified@example.com',
            'email_verified_at' => now(),
            'role' => User::ROLE_CUSTOMER,
        ]);

        // 1. Authenticated status check
        $resAuthUnverified = $this->actingAs($unverified, 'sanctum')->getJson('/api/v1/auth/email/verification-status');
        $resAuthUnverified->assertStatus(200)->assertJson(['data' => ['is_verified' => false]]);

        $resAuthVerified = $this->actingAs($verified, 'sanctum')->getJson('/api/v1/auth/email/verification-status');
        $resAuthVerified->assertStatus(200)->assertJson(['data' => ['is_verified' => true]]);

        // 2. Unauthenticated status check with email parameter (for pending page)
        $resPublicUnverified = $this->getJson('/api/v1/auth/email/verification-status?email=' . urlencode($unverified->email));
        $resPublicUnverified->assertStatus(200)->assertJson(['data' => ['is_verified' => false]]);

        $resPublicVerified = $this->getJson('/api/v1/auth/email/verification-status?email=' . urlencode($verified->email));
        $resPublicVerified->assertStatus(200)->assertJson(['data' => ['is_verified' => true]]);
    }
}
