<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\PackageAllocation;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Minimal Product Variant Configuration + Optional Package Breakdown Tests
 * Covers all 15 required business test scenarios:
 * 1. Draft with zero colors / zero sizes
 * 2. Publish with zero colors / zero sizes
 * 3. Draft without package breakdown
 * 4. Publish without package breakdown
 * 5. Variantless product creation
 * 6. Variantless product retrieval
 * 7. Variantless product API serialization
 * 8. Variantless product cart flow
 * 9. Variantless product RFQ flow
 * 10. Variant product regression
 * 11. Package-enabled product regression
 * 12. Product with colors but no sizes
 * 13. Product with sizes but no colors
 * 14. Zero-variant product inventory behavior
 * 15. Zero-variant product ordering quantity behavior
 */
class MinimalProductVariantTest extends TestCase
{
    use RefreshDatabase;

    protected Warehouse $warehouse;
    protected Brand $brand;
    protected Category $category;
    protected User $admin;
    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->warehouse = Warehouse::create([
            'name' => 'Main Test Warehouse',
            'code' => 'WH-TEST-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->brand = Brand::factory()->create([
            'name' => 'Ayaan Basics',
            'slug' => 'ayaan-basics-' . uniqid(),
            'is_active' => true,
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Shirts',
            'slug' => 'shirts-' . uniqid(),
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_minvar_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'customer_minvar_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    private function basePayload(array $overrides = []): array
    {
        $uid = strtolower(substr(uniqid(), -6));
        return array_merge([
            'product_id' => 'AYC-' . strtoupper($uid),
            'name' => 'Minimal Test Product ' . $uid,
            'slug' => 'min-product-' . $uid,
            'sku' => 'SKU-' . strtoupper($uid),
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 25.00,
            'full_stock_price' => 22.00,
            'bulk_threshold' => 50,
            'bulk_price' => 20.00,
            'moq' => 10,
            'initial_stock' => 500,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'draft',
            'colors' => [],
            'sizes' => [],
            'variants' => [],
        ], $overrides);
    }

    /** 1. Draft with zero colors / zero sizes */
    public function test_1_draft_with_zero_colors_and_zero_sizes(): void
    {
        $payload = $this->basePayload([
            'colors' => [],
            'sizes' => [],
            'status' => 'draft',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft');

        $productId = $res->json('data.id');
        $product = Product::find($productId);
        $this->assertNotNull($product);
        $this->assertEquals(0, $product->variants()->count());
    }

    /** 2. Publish with zero colors / zero sizes */
    public function test_2_publish_with_zero_colors_and_zero_sizes(): void
    {
        $payload = $this->basePayload([
            'colors' => [],
            'sizes' => [],
            'status' => 'published',
            'images' => ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'published');

        $productId = $res->json('data.id');
        $product = Product::find($productId);
        $this->assertNotNull($product);
        $this->assertEquals('published', $product->status);
        $this->assertEquals(0, $product->variants()->count());
    }

    /** 3. Draft without package breakdown */
    public function test_3_draft_without_package_breakdown(): void
    {
        $payload = $this->basePayload([
            'status' => 'draft',
        ]);
        unset($payload['package_allocations']);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('success', true);

        $product = Product::find($res->json('data.id'));
        $this->assertNotNull($product);
        $this->assertEquals(0, $product->packageAllocations()->count());
    }

    /** 4. Publish without package breakdown */
    public function test_4_publish_without_package_breakdown(): void
    {
        $payload = $this->basePayload([
            'status' => 'published',
            'images' => ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'],
        ]);
        unset($payload['package_allocations']);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'published');

        $product = Product::find($res->json('data.id'));
        $this->assertEquals(0, $product->packageAllocations()->count());
    }

    /** 5. Variantless product creation - verifies no fake variants */
    public function test_5_variantless_product_creation_has_zero_variants(): void
    {
        $payload = $this->basePayload([
            'colors' => [],
            'sizes' => [],
            'variants' => [],
            'status' => 'published',
            'initial_stock' => 300,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);

        $res->assertStatus(201);
        $productId = $res->json('data.id');

        $variants = ProductVariant::where('product_id', $productId)->get();
        $this->assertCount(0, $variants, "Zero variants means ZERO variants. No fake or placeholder variants allowed.");
    }

    /** 6. Variantless product retrieval */
    public function test_6_variantless_product_retrieval(): void
    {
        $payload = $this->basePayload([
            'status' => 'published',
            'images' => ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $slug = $res->json('data.slug');

        $getRes = $this->getJson('/api/v1/products/' . $slug);
        $getRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.slug', $slug);
    }

    /** 7. Variantless product API serialization */
    public function test_7_variantless_product_api_serialization(): void
    {
        $payload = $this->basePayload([
            'colors' => [],
            'sizes' => [],
            'variants' => [],
            'status' => 'published',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $slug = $res->json('data.slug');

        $getRes = $this->getJson('/api/v1/products/' . $slug);
        $getRes->assertStatus(200);

        $data = $getRes->json('data');
        $this->assertIsArray($data['variants']);
        $this->assertEmpty($data['variants']);
        $this->assertIsArray($data['sizes']);
        $this->assertEmpty($data['sizes']);
        $this->assertIsArray($data['colors']);
        $this->assertEmpty($data['colors']);
    }

    /** 8. Variantless product cart flow */
    public function test_8_variantless_product_cart_flow(): void
    {
        $payload = $this->basePayload([
            'status' => 'published',
            'initial_stock' => 100,
            'moq' => 10,
        ]);

        $createRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $productId = $createRes->json('data.id');

        $cartRes = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/cart/items', [
            'product_id' => $productId,
            'quantity' => 10,
        ]);

        $cartRes->assertStatus(200)
            ->assertJsonPath('success', true);

        // Cart items check
        $getCartRes = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/cart');
        $getCartRes->assertStatus(200);
        $items = $getCartRes->json('data.items');
        $this->assertNotEmpty($items);
        $this->assertEquals($productId, $items[0]['product_id']);
        $this->assertNull($items[0]['product_variant_id']);
    }

    /** 9. Variantless product RFQ flow */
    public function test_9_variantless_product_rfq_flow(): void
    {
        $payload = $this->basePayload([
            'status' => 'published',
            'initial_stock' => 100,
            'moq' => 10,
        ]);

        $createRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $productId = $createRes->json('data.id');

        $rfqPayload = [
            'buyer_name' => 'Global Buyer',
            'buyer_email' => 'buyer@example.com',
            'company_name' => 'Global Retailers Ltd',
            'items' => [
                [
                    'product_id' => $productId,
                    'product_name' => 'Minimal Test Product',
                    'quantity' => 50,
                    'selected_color' => null,
                    'selected_size' => null,
                ]
            ],
        ];

        $res = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/rfq', $rfqPayload);
        $res->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    /** 10. Variant product regression */
    public function test_10_variant_product_regression(): void
    {
        $payload = $this->basePayload([
            'colors' => ['Black', 'Navy'],
            'sizes' => ['S', 'M'],
            'variants' => [
                ['color' => 'Black', 'size' => 'S', 'stock' => 50, 'wholesale_price' => 25.00],
                ['color' => 'Black', 'size' => 'M', 'stock' => 50, 'wholesale_price' => 25.00],
                ['color' => 'Navy', 'size' => 'S', 'stock' => 50, 'wholesale_price' => 25.00],
                ['color' => 'Navy', 'size' => 'M', 'stock' => 50, 'wholesale_price' => 25.00],
            ],
            'status' => 'published',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $productId = $res->json('data.id');

        $variants = ProductVariant::where('product_id', $productId)->get();
        $this->assertCount(4, $variants);

        $getRes = $this->getJson('/api/v1/products/' . $res->json('data.slug'));
        $data = $getRes->json('data');
        $this->assertCount(4, $data['variants']);
        $this->assertCount(2, $data['colors']);
        $this->assertCount(2, $data['sizes']);
    }

    /** 11. Package-enabled product regression */
    public function test_11_package_enabled_product_regression(): void
    {
        $payload = $this->basePayload([
            'colors' => ['Black'],
            'sizes' => ['M'],
            'variants' => [
                ['color' => 'Black', 'size' => 'M', 'stock' => 100, 'wholesale_price' => 25.00],
            ],
            'package_allocations' => [
                ['package_name' => 'Assortment Box', 'color' => 'Black', 'size' => 'M', 'quantity' => 10],
            ],
            'status' => 'published',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $product = Product::find($res->json('data.id'));
        $this->assertEquals(1, $product->packageAllocations()->count());
    }

    /** 12. Product with colors but no sizes */
    public function test_12_product_with_colors_but_no_sizes(): void
    {
        $payload = $this->basePayload([
            'colors' => ['Navy'],
            'sizes' => [],
            'variants' => [],
            'status' => 'draft',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $product = Product::find($res->json('data.id'));
        $this->assertNotNull($product);
        $this->assertEquals(0, $product->variants()->count());
    }

    /** 13. Product with sizes but no colors */
    public function test_13_product_with_sizes_but_no_colors(): void
    {
        $payload = $this->basePayload([
            'colors' => [],
            'sizes' => ['XL'],
            'variants' => [],
            'status' => 'draft',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $product = Product::find($res->json('data.id'));
        $this->assertNotNull($product);
        $this->assertEquals(0, $product->variants()->count());
    }

    /** 14. Zero-variant product inventory behavior */
    public function test_14_zero_variant_product_inventory_behavior(): void
    {
        $payload = $this->basePayload([
            'initial_stock' => 450,
            'status' => 'published',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $product = Product::find($res->json('data.id'));
        $this->assertEquals(450, $product->stock);

        // Verify direct product-level inventory record
        $inv = Inventory::where('product_id', $product->id)->whereNull('product_variant_id')->first();
        $this->assertNotNull($inv);
        $this->assertEquals(450, $inv->quantity);

        // Total available stock calculation
        $this->assertEquals(450, $product->getTotalAvailableStock());
    }

    /** 15. Zero-variant product ordering quantity behavior */
    public function test_15_zero_variant_product_ordering_quantity_behavior(): void
    {
        $payload = $this->basePayload([
            'initial_stock' => 200,
            'moq' => 10,
            'status' => 'published',
            'wholesale_price' => 30.00,
        ]);

        $createRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $productId = $createRes->json('data.id');

        $orderPayload = [
            'payment_method' => 'card',
            'shipping_name' => 'Jane Buyer',
            'shipping_phone' => '+1234567890',
            'shipping_address1' => '123 Main St',
            'shipping_city' => 'New York',
            'shipping_region' => 'NY',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'items' => [
                [
                    'product_id' => $productId,
                    'quantity' => 50,
                ]
            ],
        ];

        $orderRes = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders', $orderPayload);
        $orderRes->assertStatus(201);

        // Verify product stock decremented
        $product = Product::find($productId);
        $this->assertEquals(150, $product->fresh()->stock);

        // Verify direct warehouse inventory decremented
        $inv = Inventory::where('product_id', $productId)->whereNull('product_variant_id')->first();
        $this->assertEquals(150, $inv->fresh()->quantity);

        // Cancel order and verify stock restoration
        $orderId = $orderRes->json('data.id');
        $cancelRes = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$orderId}/cancel", [
            'reason' => 'Test cancellation',
        ]);
        $cancelRes->assertStatus(200);

        $this->assertEquals(200, $product->fresh()->stock);
        $this->assertEquals(200, $inv->fresh()->quantity);
    }
}
