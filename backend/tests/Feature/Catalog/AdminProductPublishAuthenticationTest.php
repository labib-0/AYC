<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProductPublishAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private Category $category;
    private Brand $brand;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'email' => 'admin.test@ayaanclothing.com',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'email' => 'buyer.test@ayaanclothing.com',
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Shirts',
            'slug' => 'shirts',
            'is_active' => true,
        ]);

        $this->brand = Brand::factory()->create([
            'name' => 'Ayaan Premium',
            'slug' => 'ayaan-premium',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'name' => 'Dhaka WH',
            'code' => 'WH-DHK',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * TEST 1: Unauthenticated request to publish product must return 401
     */
    public function test_unauthenticated_request_to_create_product_returns_401(): void
    {
        $payload = [
            'name' => 'Unauthenticated Shirt',
            'slug' => 'unauth-shirt',
            'sku' => 'AYN-UNAUTH-01',
            'brand' => 'Ayaan Premium',
            'wholesale_price' => 30.00,
            'bulk_threshold' => 100,
            'bulk_price' => 24.00,
            'status' => 'published',
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'M', 'quantity' => 10],
                ['color' => 'Black', 'size' => 'L', 'quantity' => 15],
            ],
        ];

        $response = $this->postJson('/api/v1/products', $payload);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthenticated',
            ]);
    }

    /**
     * TEST 2: Customer user (authenticated but unauthorized) must return 403 Forbidden
     */
    public function test_customer_user_returns_403_forbidden_when_attempting_to_publish_product(): void
    {
        $payload = [
            'name' => 'Customer Attempt Shirt',
            'slug' => 'customer-shirt',
            'sku' => 'AYN-CUST-01',
            'brand' => 'Ayaan Premium',
            'wholesale_price' => 30.00,
            'bulk_threshold' => 100,
            'bulk_price' => 24.00,
            'status' => 'published',
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'M', 'quantity' => 10],
                ['color' => 'Black', 'size' => 'L', 'quantity' => 15],
            ],
        ];

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    /**
     * TEST 3: Authenticated Admin publishes product directly with 201 Created and status = published
     */
    public function test_authenticated_admin_can_publish_product_directly(): void
    {
        $payload = [
            'name' => 'Admin Oxford Shirt',
            'slug' => 'admin-oxford-shirt',
            'sku' => 'AYN-OXF-01',
            'brand' => 'Ayaan Premium',
            'wholesale_price' => 32.50,
            'bulk_threshold' => 75,
            'bulk_price' => 26.00,
            'full_stock_price' => 22.00,
            'warehouse_id' => $this->warehouse->id,
            'msrp_price' => 85.00,
            'status' => 'published',
            'package_allocations' => [
                ['color' => 'Blue', 'size' => 'M', 'quantity' => 10],
                ['color' => 'Blue', 'size' => 'L', 'quantity' => 15],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Product created successfully',
            ]);

        $this->assertDatabaseHas('products', [
            'slug' => 'admin-oxford-shirt',
            'sku' => 'AYN-OXF-01',
            'status' => 'published',
            'wholesale_price' => 32.50,
            'moq' => 25,
        ]);
    }

    /**
     * TEST 4: Authenticated Admin can save product as draft with status = draft
     */
    public function test_authenticated_admin_can_save_product_as_draft(): void
    {
        $payload = [
            'name' => 'Admin Draft Shirt',
            'slug' => 'admin-draft-shirt',
            'sku' => 'AYN-DRF-01',
            'brand' => 'Ayaan Premium',
            'wholesale_price' => 28.00,
            'bulk_threshold' => 100,
            'bulk_price' => 22.00,
            'full_stock_price' => 18.00,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'draft',
            'package_allocations' => [
                ['color' => 'White', 'size' => 'S', 'quantity' => 10],
                ['color' => 'White', 'size' => 'M', 'quantity' => 10],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);

        $this->assertDatabaseHas('products', [
            'slug' => 'admin-draft-shirt',
            'status' => 'draft',
            'moq' => 20,
        ]);
    }

    /**
     * TEST 5: Backend session verification endpoint /auth/me returns valid admin role
     */
    public function test_auth_me_endpoint_verifies_admin_identity(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'email' => 'admin.test@ayaanclothing.com',
                    'role' => 'admin',
                ],
            ]);
    }
}
