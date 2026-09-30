<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductPricingTier;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Order\OrderCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OptionalBulkPricingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private Brand $brand;
    private Category $category;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'buyer@ayaan.test',
            'role' => 'customer',
        ]);

        $this->brand = Brand::create(['name' => 'Ayaan Basics', 'slug' => 'ayaan-basics']);
        $this->category = Category::create(['name' => 'Tops', 'slug' => 'tops']);
        $this->warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'code' => 'CH-01',
            'city' => 'Dhaka',
            'country' => 'Bangladesh',
            'is_active' => true,
        ]);
    }

    /**
     * Case A: MOQ = 80, Available = 80, Bulk = disabled.
     * Valid. Standard: 80 PCS -> Standard Price. Full Stock: 80 PCS -> Full Stock Price.
     */
    public function test_case_a_moq_80_available_80_bulk_disabled(): void
    {
        $payload = [
            'product_id' => 'AYN-CASE-A',
            'name' => 'Product Case A',
            'slug' => 'product-case-a',
            'sku' => 'AYN-CASE-A',
            'status' => 'published',
            'wholesale_price' => 30.00,
            'full_stock_price' => 20.00,
            'moq' => 80,
            'initial_stock' => 80,
            'warehouse_id' => $this->warehouse->id,
            'bulk_pricing_enabled' => false,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $this->assertFalse((bool) $res->json('data.bulkPricingEnabled'));
        $this->assertNull($res->json('data.bulkThreshold'));
        $this->assertNull($res->json('data.bulkPrice'));

        $product = Product::where('slug', 'product-case-a')->firstOrFail();
        $this->assertFalse($product->bulk_pricing_enabled);
        $this->assertNull($product->bulk_threshold);
        $this->assertNull($product->bulk_price);

        // Full Stock works when available stock equals MOQ
        $this->assertEquals(20.00, $product->getResolvedFullStockPrice(80));
        $this->assertEquals(20.00, $product->getUnitPriceForQuantity(80, 'full_stock'));
        // Normal purchase of MOQ gets standard price
        $this->assertEquals(30.00, $product->getUnitPriceForQuantity(80));
    }

    /**
     * Case B: MOQ = 80, Available = 160, Bulk = disabled.
     * Valid. Standard applies to normal purchases; Full Stock gets Full Stock price.
     */
    public function test_case_b_moq_80_available_160_bulk_disabled(): void
    {
        $product = Product::create([
            'name' => 'Product Case B',
            'slug' => 'product-case-b',
            'sku' => 'AYN-CASE-B',
            'status' => 'published',
            'wholesale_price' => 30.00,
            'full_stock_price' => 22.00,
            'moq' => 80,
            'stock' => 160,
            'bulk_pricing_enabled' => false,
        ]);

        $this->assertFalse($product->bulk_pricing_enabled);

        // Normal purchase of 80 pcs gets Standard price ($30.00)
        $this->assertEquals(30.00, $product->getUnitPriceForQuantity(80));
        // Normal purchase of 160 pcs (without full_stock mode) still gets Standard price ($30.00) because bulk is disabled
        $this->assertEquals(30.00, $product->getUnitPriceForQuantity(160, 'standard'));
        // Full Stock purchase gets Full Stock price ($22.00)
        $this->assertEquals(22.00, $product->getResolvedFullStockPrice(160));
        $this->assertEquals(22.00, $product->getUnitPriceForQuantity(160, 'full_stock'));
    }

    /**
     * Case C: MOQ = 80, Available = 160, Bulk enabled, Bulk Minimum = 160.
     * Valid.
     */
    public function test_case_c_moq_80_bulk_enabled_threshold_160(): void
    {
        $payload = [
            'product_id' => 'AYN-CASE-C',
            'name' => 'Product Case C',
            'slug' => 'product-case-c',
            'sku' => 'AYN-CASE-C',
            'status' => 'published',
            'wholesale_price' => 30.00,
            'bulk_pricing_enabled' => true,
            'bulk_threshold' => 160,
            'bulk_price' => 25.00,
            'full_stock_price' => 20.00,
            'moq' => 80,
            'initial_stock' => 160,
            'warehouse_id' => $this->warehouse->id,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $this->assertTrue((bool) $res->json('data.bulkPricingEnabled'));
        $this->assertEquals(160, $res->json('data.bulkThreshold'));
        $this->assertEquals(25.00, (float) $res->json('data.bulkPrice'));

        $product = Product::where('slug', 'product-case-c')->firstOrFail();
        $this->assertEquals(30.00, $product->getUnitPriceForQuantity(80));
        $this->assertEquals(25.00, $product->getUnitPriceForQuantity(160));
    }

    /**
     * Case D: MOQ = 80, Bulk enabled, Bulk Minimum = 80 (Invalid: <= MOQ).
     */
    public function test_case_d_bulk_threshold_equals_moq_is_invalid(): void
    {
        $payload = [
            'product_id' => 'AYN-CASE-D',
            'name' => 'Product Case D',
            'slug' => 'product-case-d',
            'sku' => 'AYN-CASE-D',
            'status' => 'published',
            'wholesale_price' => 30.00,
            'bulk_pricing_enabled' => true,
            'bulk_threshold' => 80, // equal to MOQ 80
            'bulk_price' => 25.00,
            'full_stock_price' => 20.00,
            'moq' => 80,
            'initial_stock' => 160,
            'warehouse_id' => $this->warehouse->id,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(422);
    }

    /**
     * Case E: MOQ = 80, Bulk enabled, Bulk Minimum = 50 (Invalid: < MOQ).
     */
    public function test_case_e_bulk_threshold_less_than_moq_is_invalid(): void
    {
        $payload = [
            'product_id' => 'AYN-CASE-E',
            'name' => 'Product Case E',
            'slug' => 'product-case-e',
            'sku' => 'AYN-CASE-E',
            'status' => 'published',
            'wholesale_price' => 30.00,
            'bulk_pricing_enabled' => true,
            'bulk_threshold' => 50, // less than MOQ 80
            'bulk_price' => 25.00,
            'full_stock_price' => 20.00,
            'moq' => 80,
            'initial_stock' => 160,
            'warehouse_id' => $this->warehouse->id,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(422);
    }

    /**
     * Case F: MOQ = 80, Bulk disabled, Bulk Minimum = empty, Bulk Price = empty.
     * Valid.
     */
    public function test_case_f_bulk_disabled_empty_fields_valid(): void
    {
        $payload = [
            'product_id' => 'AYN-CASE-F',
            'name' => 'Product Case F',
            'slug' => 'product-case-f',
            'sku' => 'AYN-CASE-F',
            'status' => 'published',
            'wholesale_price' => 28.00,
            'bulk_pricing_enabled' => false,
            'bulk_threshold' => null,
            'bulk_price' => null,
            'full_stock_price' => 22.00,
            'moq' => 80,
            'initial_stock' => 80,
            'warehouse_id' => $this->warehouse->id,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $this->assertFalse((bool) $res->json('data.bulkPricingEnabled'));
    }

    /**
     * Case G: Stale bulk values in database are redacted when bulk_pricing_enabled is false.
     */
    public function test_case_g_stale_bulk_values_redacted_for_storefront(): void
    {
        $product = Product::create([
            'name' => 'Product Case G',
            'slug' => 'product-case-g',
            'sku' => 'AYN-CASE-G',
            'status' => 'published',
            'wholesale_price' => 30.00,
            'full_stock_price' => 20.00,
            'moq' => 40,
            'stock' => 200,
            'bulk_pricing_enabled' => false,
            'bulk_threshold' => 120, // Stale legacy value
            'bulk_price' => 24.00,   // Stale legacy value
        ]);

        // Public customer requests the product
        $res = $this->getJson("/api/v1/products/{$product->slug}");
        $res->assertStatus(200);
        $this->assertFalse((bool) $res->json('data.bulkPricingEnabled'));
        // Customer MUST receive null for bulk fields to prevent exposing stale pricing
        $this->assertNull($res->json('data.bulkThreshold'));
        $this->assertNull($res->json('data.bulkPrice'));

        // Price resolution skips bulk and uses standard price even at quantity 120
        $this->assertEquals(30.00, $product->getUnitPriceForQuantity(120));
    }

    /**
     * Order calculation works seamlessly without bulk pricing tier.
     */
    public function test_order_calculation_service_without_bulk_pricing(): void
    {
        $product = Product::create([
            'name' => 'Assorted Shirt No Bulk',
            'slug' => 'assorted-shirt-no-bulk',
            'sku' => 'AYN-SHIRT-NB',
            'status' => 'published',
            'wholesale_price' => 40.00,
            'full_stock_price' => 32.00,
            'moq' => 20,
            'bulk_pricing_enabled' => false,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Standard',
            'sku' => 'AYN-SHIRT-NB-STD',
            'size' => 'M',
            'color' => 'Navy',
            'stock' => 100,
            'is_active' => true,
        ]);

        $orderCalc = app(OrderCalculationService::class);
        $result = $orderCalc->calculate(
            [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant->id,
                    'quantity' => 40, // 2x MOQ
                    'size' => 'M',
                ]
            ],
            user: $this->customer
        );

        $this->assertEquals(1600.00, $result['subtotal']); // 40 * 40.00
        $this->assertEquals(40.00, $result['lines'][0]['unit_price']);
    }
}
