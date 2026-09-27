<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('services.google.client_id', 'test-client-id.apps.googleusercontent.com');
        Config::set('services.google.client_secret', 'test-client-secret');
        Config::set('services.google.redirect', 'https://ayaanclothing.com/api/v1/auth/google/callback');
        Config::set('app.customer_frontend_url', 'https://ayaanclothing.com');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Helper to mock successful Google Socialite user retrieval
     */
    protected function mockSocialiteUser(
        string $id = 'google-unique-123456',
        string $email = 'customer@example.com',
        string $name = 'Ayaan Customer',
        ?string $avatar = 'https://lh3.googleusercontent.com/avatar.jpg',
        bool $emailVerified = true
    ): void {
        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getId')->andReturn($id);
        $socialiteUser->shouldReceive('getEmail')->andReturn($email);
        $socialiteUser->shouldReceive('getName')->andReturn($name);
        $socialiteUser->shouldReceive('getAvatar')->andReturn($avatar);
        $socialiteUser->shouldReceive('getNickname')->andReturn(null);
        $socialiteUser->user = [
            'email_verified' => $emailVerified,
        ];

        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    // ── 1. REDIRECT TESTS ────────────────────────────────────────────────────────

    public function test_google_redirect_initiates_oauth_flow(): void
    {
        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('redirect')->once()->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/auth?client_id=test'));

        Socialite::shouldReceive('driver')->with('google')->once()->andReturn($provider);

        $response = $this->get('/api/v1/auth/google/redirect?redirect=/dashboard/orders');

        $response->assertStatus(302);
        $this->assertEquals('https://accounts.google.com/o/oauth2/auth?client_id=test', $response->headers->get('Location'));
    }

    public function test_google_redirect_returns_error_if_not_configured(): void
    {
        Config::set('services.google.client_id', null);

        $response = $this->getJson('/api/v1/auth/google/redirect');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Google Sign-In is not currently configured on this server.',
            ]);
    }

    // ── 2. NEW CUSTOMER CREATION ─────────────────────────────────────────────────

    public function test_successful_google_callback_creates_new_customer(): void
    {
        $this->mockSocialiteUser(
            id: 'google-new-987654',
            email: 'newbuyer@ayaanclothing.com',
            name: 'New Buyer',
            avatar: 'https://images.example.com/avatar.png'
        );

        $response = $this->get('/api/v1/auth/google/callback');

        // Should redirect to frontend auth callback WITHOUT bearer token in URL
        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('https://ayaanclothing.com/auth/callback', $location);
        $this->assertStringNotContainsString('token=', $location);
        $response->assertCookie('google_auth_ticket');

        // Verify one-time exchange succeeds
        $ticket = $response->getCookie('google_auth_ticket')->getValue();
        $exchangeRes = $this->withCookie('google_auth_ticket', $ticket)
            ->postJson('/api/v1/auth/google/exchange');

        $exchangeRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'newbuyer@ayaanclothing.com',
                        'role' => User::ROLE_CUSTOMER,
                    ],
                ],
            ]);
        $this->assertNotEmpty($exchangeRes->json('data.token'));

        // Verify ticket is single-use (burned immediately)
        $secondExchange = $this->withCookie('google_auth_ticket', $ticket)
            ->postJson('/api/v1/auth/google/exchange');
        $secondExchange->assertStatus(401);

        // Verify database user
        $user = User::where('email', 'newbuyer@ayaanclothing.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('google-new-987654', $user->google_id);
        $this->assertEquals('New Buyer', $user->name);
        $this->assertEquals(User::ROLE_CUSTOMER, $user->role);
        $this->assertEquals('active', $user->status);
        $this->assertFalse((bool) $user->is_super_admin);
        $this->assertNotNull($user->email_verified_at);
        $this->assertEquals('https://images.example.com/avatar.png', $user->avatar_url);
    }

    public function test_production_environment_never_redirects_to_localhost(): void
    {
        Config::set('app.env', 'production');
        Config::set('app.customer_frontend_url', 'http://localhost:3000');
        Config::set('app.frontend_url', 'http://localhost:3000');

        $this->mockSocialiteUser(
            id: 'google-prod-check',
            email: 'produser@ayaanclothing.com'
        );

        $response = $this->get('/api/v1/auth/google/callback');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringStartsWith('https://ayaanclothing.com/auth/callback', $location);
        $this->assertStringNotContainsString('localhost', $location);
        $this->assertStringNotContainsString('127.0.0.1', $location);
        $this->assertStringNotContainsString('token=', $location);
    }

    public function test_successful_google_callback_returns_json_when_requested(): void
    {
        $this->mockSocialiteUser(
            id: 'google-api-112233',
            email: 'apibuyer@ayaanclothing.com',
            name: 'API Buyer'
        );

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'user' => [
                        'email' => 'apibuyer@ayaanclothing.com',
                        'role' => User::ROLE_CUSTOMER,
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));
    }

    // ── 3. EXISTING CUSTOMER AUTHENTICATION (GOOGLE ID) ──────────────────────────

    public function test_google_callback_authenticates_existing_customer_by_google_id(): void
    {
        $existing = User::factory()->create([
            'email' => 'existing@ayaanclothing.com',
            'google_id' => 'google-existing-445566',
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
            'password' => Hash::make('SecretPass123!'),
        ]);

        $this->mockSocialiteUser(
            id: 'google-existing-445566',
            email: 'existing@ayaanclothing.com',
            name: 'Existing Customer'
        );

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $existing->id,
                        'email' => 'existing@ayaanclothing.com',
                    ],
                ],
            ]);

        // Ensure password is not modified
        $existing->refresh();
        $this->assertTrue(Hash::check('SecretPass123!', $existing->password));
    }

    // ── 4. EXISTING CUSTOMER EMAIL LINKING ───────────────────────────────────────

    public function test_google_callback_safely_links_existing_verified_customer_email(): void
    {
        $existing = User::factory()->create([
            'email' => 'legacybuyer@ayaanclothing.com',
            'google_id' => null,
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
            'password' => Hash::make('OriginalPassword!'),
        ]);

        $this->mockSocialiteUser(
            id: 'google-new-link-778899',
            email: 'legacybuyer@ayaanclothing.com',
            name: 'Legacy Buyer'
        );

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(200);

        $existing->refresh();
        $this->assertEquals('google-new-link-778899', $existing->google_id);
        $this->assertEquals(User::ROLE_CUSTOMER, $existing->role);
        $this->assertTrue(Hash::check('OriginalPassword!', $existing->password));
    }

    // ── 5. ADMIN ACCOUNT PROTECTION ──────────────────────────────────────────────

    public function test_admin_account_with_matching_email_cannot_sign_in_via_google(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@ayaanclothing.com',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => true,
            'status' => 'active',
            'google_id' => null,
        ]);

        $this->mockSocialiteUser(
            id: 'google-malicious-admin-attempt',
            email: 'admin@ayaanclothing.com',
            name: 'Attempted Admin'
        );

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Google Sign-In is restricted to customer accounts only. Administrators must sign in using the admin login page.',
            ]);

        // Admin account must not be linked
        $admin->refresh();
        $this->assertNull($admin->google_id);
        $this->assertEquals(User::ROLE_ADMIN, $admin->role);
        $this->assertTrue((bool) $admin->is_super_admin);
    }

    public function test_admin_account_with_matching_google_id_cannot_sign_in(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin2@ayaanclothing.com',
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
            'google_id' => 'google-admin-id-999',
        ]);

        $this->mockSocialiteUser(
            id: 'google-admin-id-999',
            email: 'admin2@ayaanclothing.com',
            name: 'Admin User'
        );

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    // ── 6. DISABLED CUSTOMER CHECKS ──────────────────────────────────────────────

    public function test_disabled_customer_is_rejected_on_callback(): void
    {
        User::factory()->create([
            'email' => 'banned@ayaanclothing.com',
            'google_id' => 'google-banned-000',
            'role' => User::ROLE_CUSTOMER,
            'status' => 'inactive',
        ]);

        $this->mockSocialiteUser(
            id: 'google-banned-000',
            email: 'banned@ayaanclothing.com',
            name: 'Banned User'
        );

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'This account has been deactivated. Please contact an administrator.',
            ]);
    }

    // ── 7. OAUTH ERRORS & CANCELLATIONS ──────────────────────────────────────────

    public function test_google_cancellation_is_handled_gracefully(): void
    {
        $response = $this->get('/api/v1/auth/google/callback?error=access_denied');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('/login?error=', $location);
        $this->assertStringContainsString('cancelled', strtolower($location));
    }

    public function test_invalid_state_exception_is_handled_gracefully(): void
    {
        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->andThrow(new InvalidStateException('Invalid OAuth state'));

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid callback state. Please try logging in again.',
            ]);
    }

    public function test_general_oauth_failure_is_handled_gracefully(): void
    {
        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->andThrow(new \Exception('Token exchange network timeout'));

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Google authentication failed. Please try again.',
            ]);
    }

    public function test_missing_email_from_google_is_rejected(): void
    {
        $this->mockSocialiteUser(
            id: 'google-no-email-123',
            email: ''
        );

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Google account email is missing or inaccessible.',
            ]);
    }

    public function test_unverified_email_from_google_is_rejected(): void
    {
        $this->mockSocialiteUser(
            id: 'google-unverified-123',
            email: 'unverified@example.com',
            name: 'Unverified User',
            avatar: null,
            emailVerified: false
        );

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Google account email is not verified.',
            ]);
    }

    // ── 8. OPEN REDIRECT DEFENSE ─────────────────────────────────────────────────

    public function test_open_redirect_urls_are_neutralized(): void
    {
        $this->mockSocialiteUser(
            id: 'google-security-check',
            email: 'sec@example.com'
        );

        // Attempting an open redirect attack
        $response = $this->withSession(['google_oauth_redirect' => 'https://malicious.com/steal-token'])
            ->get('/api/v1/auth/google/callback');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        // Malicious domain must NOT appear in the redirect target
        $this->assertStringNotContainsString('malicious.com', $location);
        $this->assertStringContainsString('redirect=%2Fdashboard', $location);
    }

    // ── 9. TOKEN USAGE: /auth/me AND /auth/logout ────────────────────────────────

    public function test_google_authenticated_customer_can_access_me_and_logout(): void
    {
        $this->mockSocialiteUser(
            id: 'google-session-test',
            email: 'sessionbuyer@example.com',
            name: 'Session Buyer'
        );

        $loginResponse = $this->getJson('/api/v1/auth/google/callback');
        $token = $loginResponse->json('data.token');
        $this->assertNotEmpty($token);

        // 1. Access /api/v1/auth/me with bearer token
        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $meResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'email' => 'sessionbuyer@example.com',
                    'role' => User::ROLE_CUSTOMER,
                ],
            ]);

        // 2. Logout via /api/v1/auth/logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Logged out successfully',
            ]);

        // Clear cached auth guards for new request
        $this->app['auth']->forgetGuards();

        // 3. Subsequent /api/v1/auth/me should be 401 Unauthenticated
        $afterLogoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $afterLogoutResponse->assertStatus(401);


    }
}
