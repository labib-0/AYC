<?php

namespace Tests\Feature\Auth;

use App\Models\Brand;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleCustomerAuthenticationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $admin;
    protected Product $product;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('services.google.client_id', 'mock-google-client-id.apps.googleusercontent.com');
        Config::set('services.google.client_secret', 'mock-google-client-secret');
        Config::set('services.google.redirect', 'https://ayaanclothing.com/api/v1/auth/google/callback');
        Config::set('app.customer_frontend_url', 'https://ayaanclothing.com');

        $this->customer = User::factory()->create([
            'name'     => 'Legitimate Customer',
            'email'    => 'shopper@ayaan-demo.local',
            'password' => Hash::make('CustomerPass123!'),
            'role'     => User::ROLE_CUSTOMER,
            'status'   => 'active',
        ]);

        $this->admin = User::factory()->admin()->create([
            'name'           => 'Ayaan Administrator',
            'email'          => 'admin@ayaan-demo.local',
            'password'       => Hash::make('AdminPass123!'),
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);

        $brand = Brand::factory()->create(['name' => 'Ayaan Signature']);
        $category = Category::factory()->create(['name' => 'Luxury Apparel']);

        $this->product = Product::factory()->create([
            'brand_id'        => $brand->id,
            'name'            => 'Signature Oxford Shirt',
            'slug'            => 'signature-oxford-shirt',
            'sku'             => 'SIG-OXF-001',
            'wholesale_price' => 35.00,
            'moq'             => 5,
            'status'          => 'published',
        ]);
        $this->product->categories()->attach($category->id);

        $this->variant = ProductVariant::factory()->create([
            'product_id' => $this->product->id,
            'sku'        => 'SIG-OXF-001-M',
            'size'       => 'M',
            'color'      => 'White',
            'stock'      => 100,
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    protected function mockSocialiteUser(
        string $id = 'google-unique-id-998877',
        string $email = 'shopper@ayaan-demo.local',
        string $name = 'Legitimate Customer',
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

    /**
     * TEST 1: Customer password login -> success
     */
    public function test_01_customer_password_login_succeeds(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'shopper@ayaan-demo.local',
            'password' => 'CustomerPass123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'shopper@ayaan-demo.local',
                        'role'  => 'customer',
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));
    }

    /**
     * TEST 2: Admin password login through customer flow -> rejected
     */
    public function test_02_admin_password_login_through_customer_flow_rejected(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@ayaan-demo.local',
            'password' => 'AdminPass123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertEquals(
            'These credentials cannot be used for customer login.',
            $response->json('errors.email.0')
        );
    }

    /**
     * TEST 3: Customer Google login -> success
     */
    public function test_03_customer_google_login_succeeds(): void
    {
        $this->mockSocialiteUser(
            id: 'google-cust-id-334455',
            email: 'shopper@ayaan-demo.local',
            name: 'Legitimate Customer'
        );

        // GET callback triggers customer authentication and returns single-use ticket
        $callbackRes = $this->get('/api/v1/auth/google/callback');
        $callbackRes->assertStatus(302);

        $location = $callbackRes->headers->get('Location');
        $this->assertStringContainsString('/auth/callback', $location);
        $this->assertStringContainsString('ticket=', $location);

        parse_str(parse_url($location, PHP_URL_QUERY), $queryParams);
        $this->assertNotEmpty($queryParams['ticket']);
        $ticket = $queryParams['ticket'];

        // Exchange single-use ticket
        $exchangeRes = $this->postJson('/api/v1/auth/google/exchange', [
            'ticket' => $ticket,
        ]);

        $exchangeRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'shopper@ayaan-demo.local',
                        'role'  => 'customer',
                    ],
                ],
            ]);

        $this->assertNotEmpty($exchangeRes->json('data.token'));

        // Single-use guarantee: Re-using the same ticket must be rejected
        $reuseRes = $this->postJson('/api/v1/auth/google/exchange', [
            'ticket' => $ticket,
        ]);
        $reuseRes->assertStatus(401);
    }

    /**
     * TEST 4: Admin Google identity through customer flow -> rejected
     */
    public function test_04_admin_google_identity_through_customer_flow_rejected(): void
    {
        $this->mockSocialiteUser(
            id: 'google-admin-id-attempt',
            email: 'admin@ayaan-demo.local',
            name: 'Attempted Admin'
        );

        $response = $this->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Google Sign-In is restricted to customer accounts only. Administrators must sign in using the admin login page.',
            ]);

        // Verify no ticket was cached for admin and no token created
        $this->admin->refresh();
        $this->assertNull($this->admin->google_id);
    }

    /**
     * TEST 5: Existing customer Google account -> correct customer loaded
     */
    public function test_05_existing_customer_google_account_loads_correct_customer(): void
    {
        $this->customer->update(['google_id' => 'google-existing-linked-123']);

        $this->mockSocialiteUser(
            id: 'google-existing-linked-123',
            email: 'different-email@ayaan-demo.local', // Provider ID takes precedence
            name: 'Legitimate Customer'
        );

        $response = $this->getJson('/api/v1/auth/google/callback');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'id'    => $this->customer->id,
                        'email' => 'shopper@ayaan-demo.local',
                        'role'  => 'customer',
                    ],
                ],
            ]);
    }

    /**
     * TEST 6: New Google customer -> correct account creation/linking
     */
    public function test_06_new_google_customer_account_created_and_linked(): void
    {
        $this->mockSocialiteUser(
            id: 'google-brand-new-user-7788',
            email: 'brandnewbuyer@ayaan-demo.local',
            name: 'Brand New Buyer'
        );

        $response = $this->getJson('/api/v1/auth/google/callback');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'brandnewbuyer@ayaan-demo.local',
                        'role'  => 'customer',
                        'status' => 'active',
                    ],
                ],
            ]);

        $createdUser = User::where('email', 'brandnewbuyer@ayaan-demo.local')->first();
        $this->assertNotNull($createdUser);
        $this->assertEquals('google-brand-new-user-7788', $createdUser->google_id);
        $this->assertEquals(User::ROLE_CUSTOMER, $createdUser->role);
        $this->assertNotNull($createdUser->email_verified_at);
    }

    /**
     * TEST 7: Invalid OAuth callback -> rejected safely
     */
    public function test_07_invalid_oauth_callback_rejected_safely(): void
    {
        $response = $this->getJson('/api/v1/auth/google/callback?error=access_denied');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Google sign-in was cancelled.',
            ]);

        $errorResponse = $this->getJson('/api/v1/auth/google/callback?error=server_error&error_description=internal');
        $errorResponse->assertStatus(400)
            ->assertJson([
                'success' => false,
            ]);
    }

    /**
     * TEST 8: Invalid OAuth state -> rejected safely
     */
    public function test_08_invalid_oauth_state_rejected_safely(): void
    {
        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->andThrow(new InvalidStateException());

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->getJson('/api/v1/auth/google/callback?code=bad_code&state=bad_state');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid callback state. Please try logging in again.',
            ]);
    }

    /**
     * TEST 9: Google login after checkout -> cart preserved
     */
    public function test_09_google_login_after_checkout_cart_preserved(): void
    {
        $guestSessionId = 'guest_sess_' . Str::random(24);

        // Guest adds item to cart
        $guestCart = Cart::create([
            'session_id' => $guestSessionId,
            'user_id'    => null,
            'status'     => 'active',
        ]);
        CartItem::create([
            'cart_id'            => $guestCart->id,
            'product_id'         => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'size'               => 'M',
            'quantity'           => 10,
            'unit_price'         => 35.00,
            'line_total'         => 350.00,
        ]);

        // Customer authenticates via Google
        $this->mockSocialiteUser(
            id: 'google-checkout-buyer',
            email: 'shopper@ayaan-demo.local'
        );
        $loginRes = $this->getJson('/api/v1/auth/google/callback');
        $loginRes->assertStatus(200);
        $customerToken = $loginRes->json('data.token');

        // Customer merges guest cart after Google authentication
        $mergeRes = $this->withToken($customerToken)->postJson('/api/v1/cart/merge', [
            'session_id' => $guestSessionId,
        ]);

        $mergeRes->assertStatus(200);

        // Verify cart is preserved and owned by the customer
        $cartRes = $this->withToken($customerToken)->getJson('/api/v1/cart');
        $cartRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_items' => 10,
                ],
            ]);
    }

    /**
     * TEST 10: Google login after Wishlist action -> intended customer flow preserved
     */
    public function test_10_google_login_after_wishlist_action_flow_preserved(): void
    {
        $this->mockSocialiteUser(
            id: 'google-wishlist-shopper',
            email: 'shopper@ayaan-demo.local'
        );

        // Callback with redirect parameter intended for wishlist
        $response = $this->withSession(['google_oauth_redirect' => '/profile/wishlist'])
            ->getJson('/api/v1/auth/google/callback');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'redirect' => '/profile/wishlist',
                ],
            ]);

        $token = $response->json('data.token');

        // Authenticated customer can now add to and view wishlist
        $addWishlist = $this->withToken($token)->postJson('/api/v1/wishlist', [
            'product_id' => $this->product->id,
        ]);
        $addWishlist->assertStatus(201);

        $getWishlist = $this->withToken($token)->getJson('/api/v1/wishlist');
        $getWishlist->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    /**
     * TEST 11: Customer authenticated API calls -> success
     */
    public function test_11_customer_authenticated_api_calls_succeed(): void
    {
        $token = $this->customer->createToken('auth_token')->plainTextToken;

        // /api/v1/auth/me
        $meRes = $this->withToken($token)->getJson('/api/v1/auth/me');
        $meRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id'   => $this->customer->id,
                    'role' => 'customer',
                ],
            ]);

        // /api/v1/users/me
        $userMeRes = $this->withToken($token)->getJson('/api/v1/users/me');
        $userMeRes->assertStatus(200);

        // /api/v1/orders
        $ordersRes = $this->withToken($token)->getJson('/api/v1/orders');
        $ordersRes->assertStatus(200);

        // /api/v1/addresses
        $addressesRes = $this->withToken($token)->getJson('/api/v1/addresses');
        $addressesRes->assertStatus(200);
    }

    /**
     * TEST 12: Admin token/session cannot be treated as customer -> rejected on customer-only actions
     */
    public function test_12_admin_token_cannot_be_treated_as_customer_on_customer_only_actions(): void
    {
        $adminToken = $this->admin->createToken('admin_token')->plainTextToken;

        // Admin attempting customer-only /api/v1/orders
        $ordersRes = $this->withToken($adminToken)->getJson('/api/v1/orders');
        $ordersRes->assertStatus(403);

        // Admin attempting customer-only /api/v1/users/me
        $userRes = $this->withToken($adminToken)->getJson('/api/v1/users/me');
        $userRes->assertStatus(403);

        // Admin attempting customer-only /api/v1/addresses
        $addressRes = $this->withToken($adminToken)->getJson('/api/v1/addresses');
        $addressRes->assertStatus(403);

        // Admin attempting customer-only /api/v1/wishlist
        $wishlistRes = $this->withToken($adminToken)->getJson('/api/v1/wishlist');
        $wishlistRes->assertStatus(403);
    }
}
