<?php

namespace Tests\Feature\Catalog;

use App\Models\AdminInventoryAdjustment;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductInitialInventoryTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected Brand $brand;
    protected Category $category;
    protected Warehouse $activeWarehouse;
    protected Warehouse $inactiveWarehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaan-demo.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'customer@ayaan-demo.local',
            'role' => 'customer',
        ]);

        $this->brand = Brand::create([
            'name' => 'Ayaan Manufacturing',
            'slug' => 'ayaan-manufacturing',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Heavyweight Hoodies',
            'slug' => 'heavyweight-hoodies',
            'is_active' => true,
        ]);

        $this->activeWarehouse = Warehouse::create([
            'name' => 'Uttara Main Logistics Hub',
            'code' => 'WH-UTTARA-MAIN',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->inactiveWarehouse = Warehouse::create([
            'name' => 'Old Chittagong Deprecated',
            'code' => 'WH-CTG-INACTIVE',
            'city' => 'Chittagong',
            'country_code' => 'BD',
            'is_active' => false,
        ]);
    }

    public function test_admin_can_create_product_with_initial_stock_and_warehouse(): void
    {
        $payload = [
            'name' => 'Export Heavyweight Hoodie',
            'slug' => 'export-heavyweight-hoodie',
            'sku' => 'AYN-HD-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 18.50,
            'moq' => 50,
            'initial_stock' => 250,
            'warehouse_id' => $this->activeWarehouse->id,
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertEquals(50, $data['moq']);
        $this->assertEquals(250, $data['stock']);
        $this->assertEquals(250, $data['on_hand_stock']);
        $this->assertEquals(0, $data['reserved_stock']);
        $this->assertEquals(250, $data['available_stock']);
        $this->assertEquals(5, $data['available_moqs']); // floor(250 / 50) = 5 complete MOQs

        // Assert database inventory record exists for the selected warehouse
        $product = Product::where('sku', 'AYN-HD-001')->firstOrFail();
        $variant = $product->variants()->firstOrFail();

        $inventory = Inventory::where('product_variant_id', $variant->id)
            ->where('warehouse_id', $this->activeWarehouse->id)
            ->firstOrFail();

        $this->assertEquals(250, $inventory->quantity);
        $this->assertEquals(0, $inventory->reserved_quantity);

        // Assert audited adjustment was recorded
        $adjustment = AdminInventoryAdjustment::where('inventory_id', $inventory->id)->firstOrFail();
        $this->assertEquals($this->admin->id, $adjustment->admin_user_id);
        $this->assertEquals(0, $adjustment->previous_quantity);
        $this->assertEquals(250, $adjustment->adjustment_amount);
        $this->assertEquals(250, $adjustment->resulting_quantity);
        $this->assertEquals('Initial stock on product creation', $adjustment->reason);
    }

    public function test_available_moq_calculates_correctly_with_partial_stock(): void
    {
        $payload = [
            'name' => 'Export Casual Sweatshirt',
            'slug' => 'export-casual-sweatshirt',
            'sku' => 'AYN-SW-002',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 14.00,
            'moq' => 50,
            'initial_stock' => 220, // 220 / 50 = 4 complete MOQs (+ 20 partial)
            'warehouse_id' => $this->activeWarehouse->id,
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertEquals(50, $data['moq']);
        $this->assertEquals(220, $data['stock']);
        $this->assertEquals(220, $data['available_stock']);
        $this->assertEquals(4, $data['available_moqs']); // floor(220 / 50) = 4
    }

    public function test_available_moq_is_zero_when_stock_is_zero(): void
    {
        $payload = [
            'name' => 'Export Sample Tee',
            'slug' => 'export-sample-tee',
            'sku' => 'AYN-TEE-003',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 8.00,
            'moq' => 100,
            'initial_stock' => 0,
            'warehouse_id' => $this->activeWarehouse->id,
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertEquals(0, $data['stock']);
        $this->assertEquals(0, $data['available_moqs']);

        $product = Product::where('sku', 'AYN-TEE-003')->firstOrFail();
        $variant = $product->variants()->firstOrFail();
        $this->assertDatabaseHas('inventories', [
            'product_variant_id' => $variant->id,
            'warehouse_id' => $this->activeWarehouse->id,
            'quantity' => 0,
        ]);
    }

    public function test_product_creation_rejects_non_positive_moq(): void
    {
        // Test moq = 0
        $payloadZero = [
            'name' => 'Invalid MOQ Zero',
            'slug' => 'invalid-moq-zero',
            'sku' => 'AYN-INV-0',
            'wholesale_price' => 10.00,
            'moq' => 0,
            'initial_stock' => 100,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $resZero = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payloadZero);

        $resZero->assertStatus(422)
            ->assertJsonValidationErrors(['moq']);

        // Test moq < 0
        $payloadNeg = [
            'name' => 'Invalid MOQ Negative',
            'slug' => 'invalid-moq-negative',
            'sku' => 'AYN-INV-NEG',
            'wholesale_price' => 10.00,
            'moq' => -5,
            'initial_stock' => 100,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $resNeg = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payloadNeg);

        $resNeg->assertStatus(422)
            ->assertJsonValidationErrors(['moq']);
    }

    public function test_product_creation_rejects_negative_stock(): void
    {
        $payload = [
            'name' => 'Invalid Negative Stock',
            'slug' => 'invalid-negative-stock',
            'sku' => 'AYN-INV-STOCK',
            'wholesale_price' => 10.00,
            'moq' => 10,
            'initial_stock' => -10,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['initial_stock']);
    }

    public function test_product_creation_rejects_inactive_warehouse(): void
    {
        $payload = [
            'name' => 'Invalid Inactive Warehouse Product',
            'slug' => 'invalid-inactive-warehouse-product',
            'sku' => 'AYN-INV-WH',
            'wholesale_price' => 10.00,
            'moq' => 10,
            'initial_stock' => 50,
            'warehouse_id' => $this->inactiveWarehouse->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(422);
        $this->assertStringContainsString('inactive', strtolower($response->json('message')));
    }

    public function test_product_creation_with_variants_distributes_stock_and_creates_audits(): void
    {
        $payload = [
            'name' => 'Multi Variant Polo Shirt',
            'slug' => 'multi-variant-polo-shirt',
            'sku' => 'AYN-POLO-MVAR',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 12.00,
            'moq' => 20,
            'initial_stock' => 100,
            'warehouse_id' => $this->activeWarehouse->id,
            'variants' => [
                ['color' => 'Navy', 'size' => 'M', 'price' => 12.00, 'stock' => 60],
                ['color' => 'Navy', 'size' => 'L', 'price' => 12.00, 'stock' => 40],
            ],
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertEquals(100, $data['stock']);
        $this->assertEquals(100, $data['available_stock']);
        $this->assertEquals(5, $data['available_moqs']); // floor(100 / 20) = 5

        $product = Product::where('sku', 'AYN-POLO-MVAR')->firstOrFail();
        $this->assertCount(2, $product->variants);

        // Check each variant inventory in the selected warehouse
        $navyM = $product->variants()->where('size', 'M')->firstOrFail();
        $navyL = $product->variants()->where('size', 'L')->firstOrFail();

        $invM = Inventory::where('product_variant_id', $navyM->id)->where('warehouse_id', $this->activeWarehouse->id)->firstOrFail();
        $invL = Inventory::where('product_variant_id', $navyL->id)->where('warehouse_id', $this->activeWarehouse->id)->firstOrFail();

        $this->assertEquals(60, $invM->quantity);
        $this->assertEquals(40, $invL->quantity);

        // Check adjustment records
        $this->assertDatabaseHas('admin_inventory_adjustments', [
            'inventory_id' => $invM->id,
            'adjustment_amount' => 60,
        ]);
        $this->assertDatabaseHas('admin_inventory_adjustments', [
            'inventory_id' => $invL->id,
            'adjustment_amount' => 40,
        ]);
    }

    public function test_customer_cannot_create_product(): void
    {
        $payload = [
            'name' => 'Unauthorized Product',
            'slug' => 'unauthorized-product',
            'sku' => 'AYN-UNAUTH-01',
            'wholesale_price' => 10.00,
            'moq' => 10,
            'initial_stock' => 50,
        ];

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(403);
    }
}
