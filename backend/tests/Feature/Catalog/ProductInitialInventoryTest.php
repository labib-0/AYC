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

    public function postJson($uri, array $data = [], array $headers = [], $options = 0)
    {
        if ($uri === '/api/v1/products' && !isset($data['product_id'])) {
            $data['product_id'] = 'AYC-TEST-' . strtoupper(uniqid());
        }
        return parent::postJson($uri, $data, $headers, $options);
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
            'bulk_threshold' => 100,
            'bulk_price' => 16.50,
            'full_stock_price' => 15.00,
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
        $inventory = Inventory::where(function ($q) use ($product) {
            $q->where('product_id', $product->id)
              ->orWhereIn('product_variant_id', $product->variants()->pluck('id'));
        })->where('warehouse_id', $this->activeWarehouse->id)->firstOrFail();

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
            'bulk_threshold' => 100,
            'bulk_price' => 12.00,
            'full_stock_price' => 10.00,
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
            'bulk_threshold' => 200,
            'bulk_price' => 7.00,
            'full_stock_price' => 6.00,
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
        $this->assertDatabaseHas('inventories', [
            'product_id' => $product->id,
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
            'bulk_threshold' => 50,
            'bulk_price' => 8.50,
            'full_stock_price' => 7.00,
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
            'bulk_threshold' => 50,
            'bulk_price' => 8.50,
            'full_stock_price' => 7.00,
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
            'bulk_threshold' => 50,
            'bulk_price' => 8.50,
            'full_stock_price' => 7.00,
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
            'bulk_threshold' => 50,
            'bulk_price' => 8.50,
            'full_stock_price' => 7.00,
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
            'bulk_threshold' => 50,
            'bulk_price' => 10.00,
            'full_stock_price' => 8.50,
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
            'bulk_threshold' => 50,
            'bulk_price' => 8.00,
            'full_stock_price' => 7.00,
            'moq' => 10,
            'initial_stock' => 50,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(403);
    }

    // =========================================================================
    // AUTHORITATIVE TESTS: 12 REQUIRED SPECIFICATIONS (Prompt 909)
    // =========================================================================

    /** 1. Initial stock creation */
    public function test_1_initial_stock_creation(): void
    {
        $payload = [
            'name' => 'Initial Stock Item',
            'slug' => 'initial-stock-item',
            'sku' => 'SKU-INIT-01',
            'wholesale_price' => 20.00,
            'bulk_threshold' => 100,
            'bulk_price' => 18.00,
            'full_stock_price' => 15.00,
            'moq' => 50,
            'initial_stock' => 500,
            'warehouse_id' => $this->activeWarehouse->id,
            'status' => 'published',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $data = $response->json('data');
        $this->assertEquals(500, $data['stock']);
        $this->assertEquals(500, $data['on_hand_stock']);
        $this->assertEquals(0, $data['reserved_stock']);
        $this->assertEquals(500, $data['available_stock']);
        $this->assertEquals(10, $data['available_moqs']);
    }

    /** 2. MOQ calculation */
    public function test_2_moq_calculation(): void
    {
        $payload = [
            'name' => 'MOQ Calculation Item',
            'slug' => 'moq-calc-item',
            'sku' => 'SKU-MOQ-01',
            'wholesale_price' => 20.00,
            'bulk_threshold' => 100,
            'bulk_price' => 18.00,
            'full_stock_price' => 15.00,
            'moq' => 50,
            'initial_stock' => 500,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $product = Product::where('sku', 'SKU-MOQ-01')->firstOrFail();
        $this->assertEquals(10, $product->getAvailableMoqs());
    }

    /** 3. FLOOR calculation: never rounds up */
    public function test_3_floor_calculation_never_rounds_up(): void
    {
        $testCases = [
            ['stock' => 500, 'moq' => 50, 'expected' => 10], // 500 / 50 = 10
            ['stock' => 499, 'moq' => 50, 'expected' => 9],  // 499 / 50 = 9.98 -> 9
            ['stock' => 101, 'moq' => 50, 'expected' => 2],  // 101 / 50 = 2.02 -> 2
            ['stock' => 99,  'moq' => 50, 'expected' => 1],  // 99 / 50 = 1.98 -> 1
        ];

        foreach ($testCases as $i => $tc) {
            $payload = [
                'name' => "Floor Item {$i}",
                'slug' => "floor-item-{$i}",
                'sku' => "SKU-FLOOR-{$i}",
                'wholesale_price' => 20.00,
                'bulk_threshold' => 100,
                'bulk_price' => 18.00,
                'full_stock_price' => 15.00,
                'moq' => $tc['moq'],
                'initial_stock' => $tc['stock'],
                'warehouse_id' => $this->activeWarehouse->id,
            ];

            $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
            $response->assertStatus(201);

            $this->assertEquals($tc['expected'], $response->json('data.available_moqs'));
        }
    }

    /** 4. Available stock calculation: On Hand - Reserved */
    public function test_4_available_stock_calculation(): void
    {
        $payload = [
            'name' => 'Available Stock Test',
            'slug' => 'available-stock-test',
            'sku' => 'SKU-AVAIL-01',
            'wholesale_price' => 25.00,
            'bulk_threshold' => 100,
            'bulk_price' => 20.00,
            'full_stock_price' => 18.00,
            'moq' => 20,
            'initial_stock' => 200,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $product = Product::where('sku', 'SKU-AVAIL-01')->firstOrFail();
        $inventory = Inventory::where('product_id', $product->id)->firstOrFail();

        // Simulate 40 pcs reserved
        $inventory->update(['reserved_quantity' => 40]);

        // Available = 200 - 40 = 160
        $this->assertEquals(200, $product->getOnHandStock());
        $this->assertEquals(40, $product->getReservedStock());
        $this->assertEquals(160, $product->getTotalAvailableStock());
        $this->assertEquals(8, $product->getAvailableMoqs()); // 160 / 20 = 8
    }

    /** 5. Full Stock Price required validation */
    public function test_5_full_stock_price_required_validation(): void
    {
        // Missing full_stock_price
        $payloadMissing = [
            'name' => 'No Full Stock Price',
            'slug' => 'no-full-stock-price',
            'sku' => 'SKU-NO-FSP',
            'wholesale_price' => 20.00,
            'bulk_threshold' => 100,
            'bulk_price' => 18.00,
            'moq' => 50,
            'initial_stock' => 100,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $resMissing = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payloadMissing);
        $resMissing->assertStatus(422)->assertJsonValidationErrors(['full_stock_price']);

        // full_stock_price <= 0
        $payloadZero = array_merge($payloadMissing, ['full_stock_price' => 0]);
        $resZero = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payloadZero);
        $resZero->assertStatus(422)->assertJsonValidationErrors(['full_stock_price']);
    }

    /** 6. Bulk tier validation */
    public function test_6_bulk_tier_validation(): void
    {
        // A. Missing bulk tier altogether
        $payloadNoTier = [
            'name' => 'No Bulk Tier',
            'slug' => 'no-bulk-tier',
            'sku' => 'SKU-NO-TIER',
            'wholesale_price' => 20.00,
            'full_stock_price' => 15.00,
            'moq' => 50,
            'initial_stock' => 100,
            'warehouse_id' => $this->activeWarehouse->id,
        ];
        $resNoTier = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payloadNoTier);
        $resNoTier->assertStatus(422);

        // B. Bulk threshold <= MOQ
        $payloadThresholdLow = array_merge($payloadNoTier, [
            'bulk_threshold' => 50, // equal to MOQ 50
            'bulk_price' => 18.00,
        ]);
        $resThresholdLow = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payloadThresholdLow);
        $resThresholdLow->assertStatus(422);

        // C. Bulk price <= 0
        $payloadZeroPrice = array_merge($payloadNoTier, [
            'bulk_threshold' => 100,
            'bulk_price' => 0,
        ]);
        $resZeroPrice = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payloadZeroPrice);
        $resZeroPrice->assertStatus(422);
    }

    /** 7. Available stock above threshold -> Full Stock Price applies */
    public function test_7_available_stock_above_threshold(): void
    {
        // Threshold = 100, Available = 140 -> Full Stock Price ($12.00) applies
        $payload = [
            'name' => 'Above Threshold Item',
            'slug' => 'above-threshold-item',
            'sku' => 'SKU-ABOVE-TH',
            'wholesale_price' => 20.00,
            'bulk_threshold' => 100,
            'bulk_price' => 16.00,
            'full_stock_price' => 12.00,
            'moq' => 20,
            'initial_stock' => 140,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $product = Product::where('sku', 'SKU-ABOVE-TH')->firstOrFail();
        $this->assertEquals(140, $product->getTotalAvailableStock());
        $this->assertEquals(12.00, $product->getResolvedFullStockPrice());
    }

    /** 8. Available stock equal to threshold -> Normal bulk/MOQ price applies */
    public function test_8_available_stock_equal_to_threshold(): void
    {
        // Threshold = 100, Available = 100 -> Normal bulk/MOQ price ($20.00) applies
        $payload = [
            'name' => 'Equal Threshold Item',
            'slug' => 'equal-threshold-item',
            'sku' => 'SKU-EQUAL-TH',
            'wholesale_price' => 20.00,
            'bulk_threshold' => 100,
            'bulk_price' => 16.00,
            'full_stock_price' => 12.00,
            'moq' => 20,
            'initial_stock' => 100,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $product = Product::where('sku', 'SKU-EQUAL-TH')->firstOrFail();
        $this->assertEquals(100, $product->getTotalAvailableStock());
        $this->assertEquals(20.00, $product->getResolvedFullStockPrice());
    }

    /** 9. Available stock below threshold -> Normal bulk/MOQ price applies */
    public function test_9_available_stock_below_threshold(): void
    {
        // Threshold = 100, Available = 80 -> Normal bulk/MOQ price ($20.00) applies
        $payload = [
            'name' => 'Below Threshold Item',
            'slug' => 'below-threshold-item',
            'sku' => 'SKU-BELOW-TH',
            'wholesale_price' => 20.00,
            'bulk_threshold' => 100,
            'bulk_price' => 16.00,
            'full_stock_price' => 12.00,
            'moq' => 20,
            'initial_stock' => 80,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $product = Product::where('sku', 'SKU-BELOW-TH')->firstOrFail();
        $this->assertEquals(80, $product->getTotalAvailableStock());
        $this->assertEquals(20.00, $product->getResolvedFullStockPrice());
    }

    /** 10. Full Stock remains visible in all cases */
    public function test_10_full_stock_remains_visible_in_all_cases(): void
    {
        // Check product resource returns fullStockPrice regardless of stock levels
        $stockLevels = [140, 100, 80, 0];

        foreach ($stockLevels as $stock) {
            $product = Product::create([
                'name' => "Visible Item {$stock}",
                'slug' => "visible-item-{$stock}",
                'sku' => "SKU-VIS-{$stock}",
                'wholesale_price' => 20.00,
                'bulk_threshold' => 100,
                'bulk_price' => 16.00,
                'full_stock_price' => 12.00,
                'moq' => 20,
                'status' => 'published',
            ]);

            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'title' => 'Default',
                'sku' => $product->sku . '-DEF',
                'price' => 20.00,
                'stock' => $stock,
                'is_active' => true,
            ]);

            Inventory::create([
                'product_variant_id' => $variant->id,
                'warehouse_id' => $this->activeWarehouse->id,
                'quantity' => $stock,
                'reserved_quantity' => 0,
            ]);

            $response = $this->getJson("/api/v1/products/{$product->id}");
            $response->assertStatus(200);

            // Full stock configured price is always visible in product data
            $this->assertEquals(12.00, $response->json('data.configuredFullStockPrice'));
        }
    }

    /** 11. Correct Full Stock price selection */
    public function test_11_correct_full_stock_price_selection(): void
    {
        $product = Product::create([
            'name' => 'Price Selection Item',
            'slug' => 'price-selection-item',
            'sku' => 'SKU-PRC-SEL',
            'wholesale_price' => 22.00,
            'bulk_threshold' => 100,
            'bulk_price' => 18.00,
            'full_stock_price' => 14.50,
            'moq' => 25,
            'status' => 'published',
        ]);

        // When stock = 150 (> 100 threshold) -> Full stock price 14.50
        $this->assertEquals(14.50, $product->getResolvedFullStockPrice(150));

        // When stock = 100 (<= 100 threshold) -> Normal MOQ price 22.00
        $this->assertEquals(22.00, $product->getResolvedFullStockPrice(100));

        // When stock = 75 (<= 100 threshold) -> Normal MOQ price 22.00
        $this->assertEquals(22.00, $product->getResolvedFullStockPrice(75));
    }

    /** 12. Saved Full Stock Price is not overwritten by inventory changes */
    public function test_12_saved_full_stock_price_is_not_overwritten_by_inventory_changes(): void
    {
        $payload = [
            'name' => 'Persistent Price Item',
            'slug' => 'persistent-price-item',
            'sku' => 'SKU-PERST-01',
            'wholesale_price' => 30.00,
            'bulk_threshold' => 100,
            'bulk_price' => 25.00,
            'full_stock_price' => 20.00,
            'moq' => 20,
            'initial_stock' => 150,
            'warehouse_id' => $this->activeWarehouse->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $product = Product::where('sku', 'SKU-PERST-01')->firstOrFail();
        $inventory = Inventory::where('product_id', $product->id)->firstOrFail();

        // 1. Initial: Available 150 > 100 -> price is 20.00
        $this->assertEquals(20.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(20.00, (float) $product->fresh()->full_stock_price);

        // 2. Inventory drops to 60 (< 100 threshold)
        $inventory->update(['quantity' => 60]);

        // Dynamic price changes to normal MOQ price
        $this->assertEquals(30.00, $product->getResolvedFullStockPrice());

        // Stored configured full_stock_price on the model remains exactly 20.00!
        $this->assertEquals(20.00, (float) $product->fresh()->full_stock_price);

        // 3. Inventory restocked to 200 (> 100 threshold)
        $inventory->update(['quantity' => 200]);

        // Dynamic price changes back to full stock price
        $this->assertEquals(20.00, $product->getResolvedFullStockPrice());

        // Stored full_stock_price remains 20.00
        $this->assertEquals(20.00, (float) $product->fresh()->full_stock_price);
    }
}
