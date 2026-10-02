<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductStandardPricingPublishValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Category $category;
    private Brand $brand;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'email' => 'admin.pricing@ayaanclothing.com',
            'is_super_admin' => true,
        ]);

        $this->category = Category::factory()->create([
            'name' => 'T-Shirts',
            'slug' => 't-shirts',
            'is_active' => true,
        ]);

        $this->brand = Brand::factory()->create([
            'name' => 'Ayaan Basics',
            'slug' => 'ayaan-basics',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'code' => 'WH-CENTRAL-01',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * TEST 1: Standard Unit Price = $4.30 allows publish validation to pass without legacy wholesale_price.
     */
    public function test_publish_product_with_standard_unit_price_passes(): void
    {
        $payload = [
            'product_id' => 'AY-STD-430',
            'name' => 'Premium Crewneck Tee',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 200,
            'standard_price' => 4.30,
            'full_stock_price' => 4.00,
            'status' => 'published',
            'package_allocations' => [
                ['color' => 'Navy', 'size' => 'M', 'quantity' => 100],
                ['color' => 'Navy', 'size' => 'L', 'quantity' => 100],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $data = $response->json('data');
        $this->assertEquals(4.30, (float) $data['standard_price']);
        $this->assertEquals(4.30, (float) $data['standardPrice']);
        $this->assertEquals('published', $data['status']);

        // Assert database stores 4.30 in underlying column
        $this->assertDatabaseHas('products', [
            'product_id' => 'AY-STD-430',
            'wholesale_price' => 4.30,
            'status' => 'published',
        ]);
    }

    /**
     * TEST 2: CamelCase standardPrice = $4.30 is accepted and mapped.
     */
    public function test_publish_product_with_camel_case_standard_price_passes(): void
    {
        $payload = [
            'productId' => 'AY-STD-CAMEL',
            'name' => 'CamelCase Price Tee',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 50,
            'standardPrice' => 4.30,
            'fullStockPrice' => 4.00,
            'status' => 'published',
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'S', 'quantity' => 50],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'product_id' => 'AY-STD-CAMEL',
            'wholesale_price' => 4.30,
            'status' => 'published',
        ]);
    }

    /**
     * TEST 3: Standard Unit Price = NULL or missing fails publish with 422 and current message.
     */
    public function test_publish_product_fails_when_standard_price_is_null_or_missing(): void
    {
        $payload = [
            'product_id' => 'AY-STD-NULL',
            'name' => 'No Price Tee',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 100,
            'full_stock_price' => 4.00,
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(422);
        // Error message must not contain legacy "Wholesale price must be greater than"
        $responseContent = json_encode($response->json());
        $this->assertStringNotContainsString('Wholesale price must be greater than $0.00 to publish.', $responseContent);
        $this->assertStringContainsString('Standard unit price', $responseContent);
    }

    /**
     * TEST 4: Standard Unit Price = 0.00 fails publish with 422 and current message.
     */
    public function test_publish_product_fails_when_standard_price_is_zero(): void
    {
        $payload = [
            'product_id' => 'AY-STD-ZERO',
            'name' => 'Zero Price Tee',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 100,
            'standard_price' => 0.00,
            'full_stock_price' => 4.00,
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(422);
        $responseContent = json_encode($response->json());
        $this->assertStringNotContainsString('Wholesale price must be greater than $0.00 to publish.', $responseContent);
        $this->assertStringContainsString('Standard unit price must be greater than $0.00 to publish.', $responseContent);
    }

    /**
     * TEST 5: Transitioning draft to published with standard_price = 4.30 succeeds.
     */
    public function test_transition_draft_to_published_succeeds_with_standard_price(): void
    {
        $draft = Product::create([
            'product_id' => 'AY-DRAFT-01',
            'name' => 'Draft Product',
            'slug' => 'draft-product-01',
            'sku' => 'AYN-DFT-001',
            'status' => 'draft',
            'category_id' => $this->category->id,
            'moq' => 200,
            'wholesale_price' => null, // No initial price
        ]);

        $updatePayload = [
            'status' => 'published',
            'standard_price' => 4.30,
            'full_stock_price' => 4.00,
            'warehouse_id' => $this->warehouse->id,
        ];

        $response = $this->actingAs($this->admin)->putJson("/api/v1/products/{$draft->id}", $updatePayload);

        $response->assertStatus(200);
        $draft->refresh();
        $this->assertEquals('published', $draft->status);
        $this->assertEquals(4.30, (float) $draft->wholesale_price);
    }

    /**
     * TEST 6: Transitioning draft to published without standard price fails with 422.
     */
    public function test_transition_draft_to_published_without_price_fails_with_standard_price_error(): void
    {
        $draft = Product::create([
            'product_id' => 'AY-DRAFT-NOPRICE',
            'name' => 'Draft Product No Price',
            'slug' => 'draft-product-noprice',
            'sku' => 'AYN-DFT-002',
            'status' => 'draft',
            'category_id' => $this->category->id,
            'moq' => 200,
            'wholesale_price' => null,
        ]);

        $updatePayload = [
            'status' => 'published',
            'warehouse_id' => $this->warehouse->id,
        ];

        $response = $this->actingAs($this->admin)->putJson("/api/v1/products/{$draft->id}", $updatePayload);

        $response->assertStatus(422);
        $this->assertEquals('Standard unit price must be greater than $0.00 to publish.', $response->json('message'));
    }

    /**
     * TEST 7: Internal Purchase Price (cost_price) alone does NOT satisfy selling price.
     */
    public function test_purchase_price_alone_does_not_satisfy_customer_selling_price(): void
    {
        $payload = [
            'product_id' => 'AY-COST-ONLY',
            'name' => 'Cost Only Product',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 100,
            'cost_price' => 2.50, // Internal cost only!
            'full_stock_price' => 4.00,
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(422);
        $responseContent = json_encode($response->json());
        $this->assertStringContainsString('Standard unit price', $responseContent);
    }

    /**
     * TEST 8: Purchase Price is optional for publish - product publishes cleanly without it.
     */
    public function test_purchase_price_is_optional_for_publishing(): void
    {
        $payload = [
            'product_id' => 'AY-NO-COST',
            'name' => 'No Cost Price Tee',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 200,
            'standard_price' => 4.30,
            'full_stock_price' => 4.00,
            'status' => 'published',
            'package_allocations' => [
                ['color' => 'White', 'size' => 'M', 'quantity' => 100],
                ['color' => 'White', 'size' => 'L', 'quantity' => 100],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'product_id' => 'AY-NO-COST',
            'cost_price' => null,
            'status' => 'published',
        ]);
    }

    /**
     * TEST 9: Bulk disabled does NOT trigger bulk validation even if bulk fields are empty.
     */
    public function test_bulk_disabled_does_not_trigger_bulk_validation(): void
    {
        $payload = [
            'product_id' => 'AY-BULK-DIS',
            'name' => 'Bulk Disabled Tee',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 200,
            'standard_price' => 4.30,
            'full_stock_price' => 4.00,
            'bulk_pricing_enabled' => false,
            'bulk_threshold' => null,
            'bulk_price' => null,
            'status' => 'published',
            'package_allocations' => [
                ['color' => 'Grey', 'size' => 'M', 'quantity' => 100],
                ['color' => 'Grey', 'size' => 'L', 'quantity' => 100],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'product_id' => 'AY-BULK-DIS',
            'bulk_pricing_enabled' => false,
            'bulk_threshold' => null,
            'bulk_price' => null,
        ]);
    }

    /**
     * TEST 10: Bulk enabled validates minimum quantity > MOQ.
     */
    public function test_bulk_enabled_validates_bulk_minimum_greater_than_moq(): void
    {
        $payload = [
            'product_id' => 'AY-BULK-INV',
            'name' => 'Bulk Invalid Tee',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 200,
            'standard_price' => 4.30,
            'full_stock_price' => 4.00,
            'bulk_pricing_enabled' => true,
            'bulk_threshold' => 150, // <= MOQ (200), must be rejected!
            'bulk_price' => 4.10,
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(422);
        $this->assertStringContainsString('strictly greater than MOQ', $response->json('message'));
    }

    /**
     * TEST 11: Bulk enabled requires valid Bulk Unit Price > 0.
     */
    public function test_bulk_enabled_requires_valid_bulk_price(): void
    {
        $payload = [
            'product_id' => 'AY-BULK-NOPRICE',
            'name' => 'Bulk No Price Tee',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 200,
            'standard_price' => 4.30,
            'full_stock_price' => 4.00,
            'bulk_pricing_enabled' => true,
            'bulk_threshold' => 500,
            'bulk_price' => 0.00, // Invalid!
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(422);
    }

    /**
     * TEST 12: Customer-facing pricing never silently falls back to $0.00.
     */
    public function test_customer_facing_pricing_never_falls_back_to_zero(): void
    {
        $product = Product::create([
            'product_id' => 'AY-DRAFT-ZEROCHECK',
            'name' => 'Draft Zero Check',
            'slug' => 'draft-zero-check',
            'sku' => 'AYN-DFT-003',
            'status' => 'draft',
            'category_id' => $this->category->id,
            'moq' => 100,
            'wholesale_price' => null,
        ]);

        $this->assertNull($product->wholesale_price);
        $this->assertNull($product->standard_price);

        // Attempting to update published with null price must fail, not save 0.00
        $response = $this->actingAs($this->admin)->putJson("/api/v1/products/{$product->id}", [
            'status' => 'published',
            'standard_price' => null,
            'warehouse_id' => $this->warehouse->id,
        ]);

        $response->assertStatus(422);

        $product->refresh();
        $this->assertNull($product->wholesale_price);
        $this->assertTrue($product->wholesale_price === null);
    }

    /**
     * TEST 13: Pricing tiers first tier satisfies standard unit price when explicit standard_price is omitted.
     */
    public function test_pricing_tiers_first_tier_satisfies_standard_unit_price(): void
    {
        $payload = [
            'product_id' => 'AY-TIER-430',
            'name' => 'Tier Price Product',
            'category_id' => $this->category->id,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 200,
            'pricing_tiers' => [
                ['min_quantity' => 200, 'unit_price' => 4.30],
            ],
            'full_stock_price' => 4.00,
            'status' => 'published',
            'package_allocations' => [
                ['color' => 'Navy', 'size' => 'M', 'quantity' => 100],
                ['color' => 'Navy', 'size' => 'L', 'quantity' => 100],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'product_id' => 'AY-TIER-430',
            'wholesale_price' => 4.30,
            'status' => 'published',
        ]);
    }

    /**
     * TEST 14: Full Stock quantity is derived from authoritative inventory, not a pricing field.
     */
    public function test_full_stock_quantity_comes_from_available_inventory(): void
    {
        $product = Product::create([
            'product_id' => 'AY-STOCK-DERIVED',
            'name' => 'Stock Derived Product',
            'slug' => 'stock-derived-product',
            'sku' => 'AYN-STK-001',
            'status' => 'published',
            'category_id' => $this->category->id,
            'moq' => 200,
            'wholesale_price' => 4.30,
            'full_stock_price' => 4.00,
        ]);

        // When inventory is added (1,000 units in warehouse)
        \App\Models\Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 1000,
            'reserved_quantity' => 0,
        ]);

        $this->assertEquals(1000, $product->getTotalAvailableStock());

        // Attempting to pass a manual fake "full_stock_quantity" in pricing update does not alter actual inventory
        $this->actingAs($this->admin)->putJson("/api/v1/products/{$product->id}", [
            'full_stock_price' => 3.90,
            'full_stock_quantity' => 9999, // Should be ignored as pricing UI is read-only
        ]);

        $this->assertEquals(1000, $product->getTotalAvailableStock());
    }
}
