<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardLowStockTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouse1;
    private Warehouse $warehouse2;
    private Brand $brand;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->warehouse1 = Warehouse::create([
            'name' => 'Uttara Warehouse',
            'code' => 'WH-UTT-01',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->warehouse2 = Warehouse::create([
            'name' => 'Chattogram Warehouse',
            'code' => 'WH-CTG-01',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->brand = Brand::create([
            'name' => 'Test Brand',
            'slug' => 'test-brand',
            'is_active' => true,
        ]);
    }

    /**
     * Test 1: Low stock metric returns 0 when all products have available stock >= MOQ.
     */
    public function test_low_stock_metric_returns_zero_when_stock_meets_or_exceeds_moq(): void
    {
        // Product 1: MOQ = 30, Available = 60
        $p1 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 30,
            'status' => 'published',
        ]);
        $v1 = ProductVariant::factory()->create([
            'product_id' => $p1->id,
            'stock' => 60,
        ]);
        Inventory::create([
            'product_variant_id' => $v1->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 60,
            'reserved_quantity' => 0,
        ]);

        // Product 2: MOQ = 50, Available = 50 (Exact match: Available = MOQ is NOT low stock)
        $p2 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 50,
            'status' => 'published',
        ]);
        $v2 = ProductVariant::factory()->create([
            'product_id' => $p2->id,
            'stock' => 50,
        ]);
        Inventory::create([
            'product_variant_id' => $v2->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 50,
            'reserved_quantity' => 0,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(2, $data['total_products']);
        $this->assertEquals(0, $data['low_stock_items']);
    }

    /**
     * Test 2: Low stock metric counts unique products whose available stock is strictly below MOQ.
     */
    public function test_low_stock_metric_counts_unique_products_below_moq(): void
    {
        // Product 1: MOQ = 50, Available = 20 (< 50) -> Low stock
        $p1 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 50,
            'status' => 'published',
        ]);
        $v1 = ProductVariant::factory()->create([
            'product_id' => $p1->id,
            'stock' => 20,
        ]);
        Inventory::create([
            'product_variant_id' => $v1->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 20,
            'reserved_quantity' => 0,
        ]);

        // Product 2: MOQ = 30, Available = 100 (>= 30) -> In stock
        $p2 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 30,
            'status' => 'published',
        ]);
        $v2 = ProductVariant::factory()->create([
            'product_id' => $p2->id,
            'stock' => 100,
        ]);
        Inventory::create([
            'product_variant_id' => $v2->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);

        // Product 3: MOQ = 20, Available = 0 (out of stock) -> Low stock
        $p3 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 20,
            'status' => 'published',
        ]);
        $v3 = ProductVariant::factory()->create([
            'product_id' => $p3->id,
            'stock' => 0,
        ]);
        Inventory::create([
            'product_variant_id' => $v3->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 0,
            'reserved_quantity' => 0,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(3, $data['total_products']);
        $this->assertEquals(2, $data['low_stock_items']); // p1 and p3
    }

    /**
     * Test 3: Reserved stock reduces available inventory and correctly flags low stock.
     */
    public function test_reserved_stock_reduces_available_inventory_for_low_stock(): void
    {
        // On hand = 100, but reserved = 80 -> Available = 20. MOQ = 30 -> Low stock (20 < 30)
        $p = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 30,
            'status' => 'published',
        ]);
        $v = ProductVariant::factory()->create([
            'product_id' => $p->id,
            'stock' => 100,
        ]);
        Inventory::create([
            'product_variant_id' => $v->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 100,
            'reserved_quantity' => 80,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(1, $data['total_products']);
        $this->assertEquals(1, $data['low_stock_items']);
    }

    /**
     * Test 4: Product with multiple variants across multiple warehouses counts as exactly ONE product.
     */
    public function test_multiple_variants_and_warehouses_counted_as_single_product(): void
    {
        // Product with 4 variants, each variant across 2 warehouses (8 inventory rows)
        // Total available = 4 * (2 + 2) = 16. MOQ = 30.
        // Must count as 1 low-stock product, NOT 4 or 8!
        $p = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 30,
            'status' => 'published',
        ]);

        for ($i = 1; $i <= 4; $i++) {
            $v = ProductVariant::factory()->create([
                'product_id' => $p->id,
                'stock' => 4,
            ]);
            Inventory::create([
                'product_variant_id' => $v->id,
                'warehouse_id' => $this->warehouse1->id,
                'quantity' => 3,
                'reserved_quantity' => 1, // available = 2
            ]);
            Inventory::create([
                'product_variant_id' => $v->id,
                'warehouse_id' => $this->warehouse2->id,
                'quantity' => 2,
                'reserved_quantity' => 0, // available = 2
            ]);
        }

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(1, $data['total_products']);
        $this->assertEquals(1, $data['low_stock_items']); // exactly 1, not 4 or 8
    }

    /**
     * Test 5: Soft-deleted (archived) products are excluded from low-stock count.
     */
    public function test_archived_products_are_excluded_from_low_stock(): void
    {
        $p = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 50,
            'status' => 'published',
        ]);
        $v = ProductVariant::factory()->create([
            'product_id' => $p->id,
            'stock' => 0,
        ]);
        Inventory::create([
            'product_variant_id' => $v->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 0,
            'reserved_quantity' => 0,
        ]);

        // Soft delete the product
        $p->delete();

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(0, $data['total_products']);
        $this->assertEquals(0, $data['low_stock_items']);
    }
}
