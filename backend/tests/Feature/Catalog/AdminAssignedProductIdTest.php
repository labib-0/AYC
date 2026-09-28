<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * STEP — Admin-Assigned Unique Product ID Feature Tests
 */
class AdminAssignedProductIdTest extends TestCase
{
    use RefreshDatabase;

    protected Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->warehouse = Warehouse::create([
            'name' => 'Main Test WH',
            'code' => 'WH-ID-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    private function adminUser(): User
    {
        return User::factory()->create([
            'email' => 'admin_id_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);
    }

    private function customerUser(): User
    {
        return User::factory()->create([
            'email' => 'customer_id_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    private function baseProductPayload(array $overrides = []): array
    {
        $uid = strtolower(substr(uniqid(), -6));
        return array_merge([
            'product_id' => 'AYC-2026-' . strtoupper($uid),
            'name' => 'Product ' . $uid,
            'slug' => 'product-' . $uid,
            'sku' => 'SKU-' . $uid,
            'brand' => 'Ayaan Active',
            'audience' => 'MEN',
            'status' => 'published',
            'wholesale_price' => 25.00,
            'bulk_threshold' => 100,
            'bulk_price' => 20.00,
            'full_stock_price' => 18.00,
            'moq' => 10,
            'initial_stock' => 500,
            'warehouse_id' => $this->warehouse->id,
            'colors' => ['Navy'],
            'sizes' => ['M', 'L'],
        ], $overrides);
    }

    /**
     * 1. Create product with valid Product ID
     */
    public function test_admin_can_create_product_with_valid_product_id(): void
    {
        $admin = $this->adminUser();
        $payload = $this->baseProductPayload([
            'product_id' => 'AYC-2026-0001',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'slug' => $payload['slug'],
            'product_id' => 'AYC-2026-0001',
        ]);
    }

    /**
     * 2. Save draft with Product ID
     */
    public function test_admin_can_save_draft_with_product_id(): void
    {
        $admin = $this->adminUser();
        $payload = $this->baseProductPayload([
            'product_id' => 'AYC-2026-DRAFT1',
            'status' => 'draft',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'slug' => $payload['slug'],
            'product_id' => 'AYC-2026-DRAFT1',
            'status' => 'draft',
        ]);
    }

    /**
     * Product ID is required even for draft creation
     */
    public function test_product_id_is_required_for_draft(): void
    {
        $admin = $this->adminUser();
        $payload = $this->baseProductPayload([
            'status' => 'draft',
        ]);
        unset($payload['product_id']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_id']);
    }

    /**
     * 3. Attempt duplicate Product ID returns clear error message
     */
    public function test_attempt_duplicate_product_id_fails_with_clear_message(): void
    {
        $admin = $this->adminUser();
        $payload1 = $this->baseProductPayload([
            'product_id' => 'AYC-2026-DUP01',
            'slug' => 'prod-first-' . uniqid(),
            'sku' => 'SKU-DUP-1',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $payload1)
            ->assertStatus(201);

        // Attempt second product with identical product_id
        $payload2 = $this->baseProductPayload([
            'product_id' => 'AYC-2026-DUP01',
            'slug' => 'prod-second-' . uniqid(),
            'sku' => 'SKU-DUP-2',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $payload2);

        $response->assertStatus(422);
        $errors = $response->json('errors.product_id');
        $this->assertNotEmpty($errors);
        $this->assertStringContainsString('Product ID AYC-2026-DUP01 is already in use', $errors[0]);
    }

    /**
     * 4. Update product with duplicate Product ID fails
     */
    public function test_update_product_with_duplicate_product_id_fails(): void
    {
        $admin = $this->adminUser();
        $productA = Product::factory()->create([
            'product_id' => 'AYC-2026-PRODA',
        ]);
        $productB = Product::factory()->create([
            'product_id' => 'AYC-2026-PRODB',
        ]);

        // Attempt updating product B to use product A's product_id
        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/products/{$productB->id}", [
                'product_id' => 'AYC-2026-PRODA',
            ]);

        $response->assertStatus(422);
        $errors = $response->json('errors.product_id');
        $this->assertNotEmpty($errors);
        $this->assertStringContainsString('Product ID AYC-2026-PRODA is already in use', $errors[0]);
    }

    /**
     * Update product retaining its own Product ID succeeds
     */
    public function test_update_product_retaining_own_product_id_succeeds(): void
    {
        $admin = $this->adminUser();
        $product = Product::factory()->create([
            'product_id' => 'AYC-2026-STABLE',
            'name' => 'Original Name',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'product_id' => 'AYC-2026-STABLE',
                'name' => 'Updated Product Name',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Product Name',
            'product_id' => 'AYC-2026-STABLE',
        ]);
    }

    /**
     * 5. Search by exact Product ID
     */
    public function test_admin_can_search_by_exact_product_id(): void
    {
        $admin = $this->adminUser();
        $target = Product::factory()->create([
            'product_id' => 'AYC-2026-EXACT99',
            'name' => 'Unrelated Name For Testing',
            'status' => 'published',
        ]);
        Product::factory()->create([
            'product_id' => 'AYC-2026-OTHER01',
            'name' => 'Another Product',
            'status' => 'published',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/products?isAdmin=true&q=AYC-2026-EXACT99');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($target->id, $data[0]['id']);
    }

    /**
     * 6. Search by partial Product ID
     */
    public function test_admin_can_search_by_partial_product_id(): void
    {
        $admin = $this->adminUser();
        $product1 = Product::factory()->create([
            'product_id' => 'AYC-2026-SERIES-101',
            'status' => 'published',
        ]);
        $product2 = Product::factory()->create([
            'product_id' => 'AYC-2026-SERIES-102',
            'status' => 'published',
        ]);
        Product::factory()->create([
            'product_id' => 'AYC-2026-DIFF-999',
            'status' => 'published',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/products?isAdmin=true&search=SERIES-10');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);
        $ids = array_column($data, 'id');
        $this->assertContains($product1->id, $ids);
        $this->assertContains($product2->id, $ids);
    }

    /**
     * 7. View Product ID in Admin
     */
    public function test_admin_can_view_product_id_in_product_resource(): void
    {
        $admin = $this->adminUser();
        $product = Product::factory()->create([
            'product_id' => 'AYC-2026-VIEW01',
            'status' => 'published',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.productId', 'AYC-2026-VIEW01')
            ->assertJsonPath('data.product_id', 'AYC-2026-VIEW01');
    }

    /**
     * 8. Verify Product ID is absent from public product API
     */
    public function test_product_id_is_strictly_absent_from_public_catalog_api(): void
    {
        $product = Product::factory()->create([
            'product_id' => 'AYC-2026-SECRET',
            'status' => 'published',
        ]);

        // Unauthenticated public request
        $response = $this->getJson("/api/v1/products/{$product->slug}");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertArrayNotHasKey('productId', $data);
        $this->assertArrayNotHasKey('product_id', $data);
    }

    /**
     * 9. Verify Product ID is absent from customer responses
     */
    public function test_product_id_is_strictly_absent_from_customer_api(): void
    {
        $customer = $this->customerUser();
        $product = Product::factory()->create([
            'product_id' => 'AYC-2026-SECRET2',
            'status' => 'published',
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/products/{$product->slug}");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertArrayNotHasKey('productId', $data);
        $this->assertArrayNotHasKey('product_id', $data);
    }

    /**
     * 10. Customer cannot search or find products using internal product_id
     */
    public function test_customer_search_does_not_match_product_id(): void
    {
        $customer = $this->customerUser();
        Product::factory()->create([
            'name' => 'Casual Fleece Hoodie',
            'product_id' => 'AYC-2026-HOODIE-ID',
            'status' => 'published',
        ]);

        // Customer searching for internal product_id should return 0 results
        $response = $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/products?q=HOODIE-ID');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(0, $data);
    }
}
