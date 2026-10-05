<?php

namespace Tests\Feature\Auth;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class CustomerAdminIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $admin;
    protected User $superAdmin;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create([
            'name'     => 'Real Customer',
            'email'    => 'shopper@ayaan-test.local',
            'password' => Hash::make('CustomerSecret123!'),
            'role'     => User::ROLE_CUSTOMER,
            'status'   => 'active',
        ]);

        $this->admin = User::factory()->admin()->create([
            'name'           => 'Store Administrator',
            'email'          => 'admin@ayaan-test.local',
            'password'       => Hash::make('AdminSecret123!'),
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => false,
        ]);

        $this->superAdmin = User::factory()->admin()->create([
            'name'           => 'Super Administrator',
            'email'          => 'superadmin@ayaan-test.local',
            'password'       => Hash::make('SuperAdminSecret123!'),
            'role'           => User::ROLE_ADMIN,
            'status'         => 'active',
            'is_super_admin' => true,
        ]);

        $brand = Brand::factory()->create(['name' => 'Ayaan Isolation Brand']);
        $category = Category::factory()->create(['name' => 'Isolation Apparel']);
        $this->product = Product::factory()->create([
            'brand_id'        => $brand->id,
            'name'            => 'Security Test Polo',
            'slug'            => 'security-test-polo',
            'sku'             => 'SEC-POLO-001',
            'wholesale_price' => 25.00,
            'moq'             => 10,
            'status'          => 'published',
        ]);
        $this->product->categories()->attach($category->id);
    }

    /**
     * TEST 1: Customer credentials -> customer login succeeds.
     */
    public function test_1_customer_credentials_succeed_at_customer_login(): void
    {
        // Public /api/v1/auth/login
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'shopper@ayaan-test.local',
            'password' => 'CustomerSecret123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'shopper@ayaan-test.local',
                        'role'  => 'customer',
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));

        // Alias /api/v1/auth/customer/login
        $aliasResponse = $this->postJson('/api/v1/auth/customer/login', [
            'email'    => 'shopper@ayaan-test.local',
            'password' => 'CustomerSecret123!',
        ]);

        $aliasResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'shopper@ayaan-test.local',
                        'role'  => 'customer',
                    ],
                ],
            ]);
    }

    /**
     * TEST 2: Admin credentials -> customer login fails.
     */
    public function test_2_admin_credentials_fail_at_customer_login_with_safe_error(): void
    {
        // Normal Admin attempt on customer endpoint
        $adminAttempt = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@ayaan-test.local',
            'password' => 'AdminSecret123!',
        ]);

        $adminAttempt->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $errorMsg = $adminAttempt->json('errors.email.0');
        $this->assertEquals('These credentials cannot be used for customer login.', $errorMsg);

        // Super Admin attempt on customer endpoint
        $superAdminAttempt = $this->postJson('/api/v1/auth/login', [
            'email'    => 'superadmin@ayaan-test.local',
            'password' => 'SuperAdminSecret123!',
        ]);

        $superAdminAttempt->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $superErrorMsg = $superAdminAttempt->json('errors.email.0');
        $this->assertEquals('These credentials cannot be used for customer login.', $superErrorMsg);

        // Direct request to customer alias endpoint
        $aliasAttempt = $this->postJson('/api/v1/auth/customer/login', [
            'email'    => 'admin@ayaan-test.local',
            'password' => 'AdminSecret123!',
        ]);

        $aliasAttempt->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * TEST 3: Customer Google authentication -> succeeds.
     */
    public function test_3_customer_google_authentication_succeeds(): void
    {
        $ticket = Str::random(64);
        $token = $this->customer->createToken('auth_token')->plainTextToken;

        Cache::put("google_auth_ticket:{$ticket}", [
            'token'    => $token,
            'user_id'  => $this->customer->id,
            'intended' => '/dashboard',
        ], now()->addMinutes(2));

        $response = $this->postJson('/api/v1/auth/google/exchange', [
            'ticket' => $ticket,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'id'   => $this->customer->id,
                        'role' => 'customer',
                    ],
                    'token' => $token,
                ],
            ]);
    }

    /**
     * TEST 4: Admin identity through customer Google flow -> fails.
     */
    public function test_4_admin_identity_through_customer_google_flow_fails(): void
    {
        // Attempt exchange ticket pointing to Admin user
        $ticket = Str::random(64);
        $token = $this->admin->createToken('auth_token')->plainTextToken;

        Cache::put("google_auth_ticket:{$ticket}", [
            'token'    => $token,
            'user_id'  => $this->admin->id,
            'intended' => '/ayc/dashboard',
        ], now()->addMinutes(2));

        $response = $this->postJson('/api/v1/auth/google/exchange', [
            'ticket' => $ticket,
        ]);

        // Must reject admin account with 403 Forbidden
        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Google Sign-In is restricted to customer accounts only.',
            ]);

        // Attempt callback with JSON for admin account email
        $this->admin->update(['google_id' => 'google_admin_12345']);

        $callbackResponse = $this->getJson('/api/v1/auth/google/callback?error=access_denied');
        $callbackResponse->assertStatus(400);
    }

    /**
     * TEST 5: Admin authentication through dedicated admin endpoint -> succeeds.
     */
    public function test_5_admin_authentication_through_admin_endpoint_succeeds(): void
    {
        // Normal Admin login at /api/v1/auth/admin/login
        $response = $this->postJson('/api/v1/auth/admin/login', [
            'email'    => 'admin@ayaan-test.local',
            'password' => 'AdminSecret123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'admin@ayaan-test.local',
                        'role'  => 'admin',
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));

        // Super Admin login
        $superRes = $this->postJson('/api/v1/auth/admin/login', [
            'email'    => 'superadmin@ayaan-test.local',
            'password' => 'SuperAdminSecret123!',
        ]);

        $superRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'superadmin@ayaan-test.local',
                        'role'  => 'admin',
                    ],
                ],
            ]);

        // Alias /api/v1/admin/login
        $aliasRes = $this->postJson('/api/v1/admin/login', [
            'email'    => 'admin@ayaan-test.local',
            'password' => 'AdminSecret123!',
        ]);

        $aliasRes->assertStatus(200);
    }

    /**
     * TEST 6: Customer credentials -> cannot access admin login or Admin APIs.
     */
    public function test_6_customer_credentials_cannot_access_admin_login_or_admin_apis(): void
    {
        // Customer attempting admin login endpoint
        $adminLoginAttempt = $this->postJson('/api/v1/auth/admin/login', [
            'email'    => 'shopper@ayaan-test.local',
            'password' => 'CustomerSecret123!',
        ]);

        $adminLoginAttempt->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $errorMsg = $adminLoginAttempt->json('errors.email.0');
        $this->assertEquals('These credentials cannot be used for administrator login.', $errorMsg);

        // Customer token attempting admin protected routes
        $customerToken = $this->customer->createToken('customer_token')->plainTextToken;

        $adminApiRes = $this->withToken($customerToken)
            ->getJson('/api/v1/admin/dashboard');

        $adminApiRes->assertStatus(403);
    }

    /**
     * TEST 7: Admin token/session -> cannot access customer-only protected operations.
     */
    public function test_7_admin_token_cannot_access_customer_only_protected_operations(): void
    {
        $adminToken = $this->admin->createToken('admin_token')->plainTextToken;

        // Customer profile
        $profileRes = $this->withToken($adminToken)->getJson('/api/v1/users/me');
        $profileRes->assertStatus(403);

        // Customer address book
        $addressRes = $this->withToken($adminToken)->getJson('/api/v1/addresses');
        $addressRes->assertStatus(403);

        // Customer wishlist
        $wishlistRes = $this->withToken($adminToken)->getJson('/api/v1/wishlist');
        $wishlistRes->assertStatus(403);

        // Customer personal order list
        $orderListRes = $this->withToken($adminToken)->getJson('/api/v1/orders');
        $orderListRes->assertStatus(403);
    }

    /**
     * TEST 8: Admin attempting checkout / customer mutation -> rejected.
     */
    public function test_8_admin_attempting_checkout_and_customer_mutation_rejected(): void
    {
        $adminToken = $this->admin->createToken('admin_token')->plainTextToken;

        // Attempt checkout validation
        $validateRes = $this->withToken($adminToken)->postJson('/api/v1/checkout/validate', [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity'   => 10,
                ],
            ],
        ]);
        $validateRes->assertStatus(403);

        // Attempt direct order placement
        $orderRes = $this->withToken($adminToken)->postJson('/api/v1/orders', [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity'   => 10,
                ],
            ],
            'shipping_method' => 'manual',
            'payment_method'  => 'wire_transfer',
        ]);
        $orderRes->assertStatus(403);

        // Attempt RFQ creation
        $rfqRes = $this->withToken($adminToken)->postJson('/api/v1/rfq', [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity'   => 50,
                ],
            ],
            'buyer_name'  => 'Admin Buyer',
            'buyer_email' => 'admin@ayaan-test.local',
        ]);
        $rfqRes->assertStatus(403);
    }

    /**
     * TEST 9: Rejected Admin customer login creates NO customer token/session.
     */
    public function test_9_rejected_admin_customer_login_creates_no_token_or_session(): void
    {
        $initialTokenCount = DB::table('personal_access_tokens')->count();

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@ayaan-test.local',
            'password' => 'AdminSecret123!',
        ]);

        $response->assertStatus(422);

        $finalTokenCount = DB::table('personal_access_tokens')->count();
        $this->assertEquals($initialTokenCount, $finalTokenCount, 'Zero personal access tokens must be created upon rejected login.');

        // Verify no token exists for admin user
        $adminTokens = $this->admin->fresh()->tokens;
        $this->assertCount(0, $adminTokens);
    }

    /**
     * TEST 10: Existing customer login and logout still works.
     */
    public function test_10_existing_customer_login_and_logout_still_works(): void
    {
        // 1. Customer login
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email'    => 'shopper@ayaan-test.local',
            'password' => 'CustomerSecret123!',
        ]);

        $loginRes->assertStatus(200);
        $token = $loginRes->json('data.token');
        $this->assertNotEmpty($token);

        // 2. Access profile with token
        $meRes = $this->withToken($token)->getJson('/api/v1/auth/me');
        $meRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'email' => 'shopper@ayaan-test.local',
                    'role'  => 'customer',
                ],
            ]);

        // 3. Customer logout
        $logoutRes = $this->withToken($token)->postJson('/api/v1/auth/logout');
        $logoutRes->assertStatus(200);

        // 4. Token is deleted from personal_access_tokens
        $this->assertDatabaseCount('personal_access_tokens', 0);

        // Clear cached auth guards for new request
        $this->app['auth']->forgetGuards();

        // 5. Revoked token cannot be reused
        $revokedRes = $this->withToken($token)->getJson('/api/v1/auth/me');
        $revokedRes->assertStatus(401);
    }
}
