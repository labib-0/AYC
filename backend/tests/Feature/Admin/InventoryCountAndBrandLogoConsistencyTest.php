<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductPackageAllocation;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryCountAndBrandLogoConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouse1;
    private Warehouse $warehouse2;

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
    }

    /**
     * Test 1: Brand logo source consistency between Brand entity and ProductResource.
     */
    public function test_brand_logo_source_consistency_between_brand_and_product_resource(): void
    {
        $brand = Brand::create([
            'name' => 'Apex Athletics',
            'slug' => 'apex-athletics',
            'logo_url' => 'http://localhost:8000/storage/brands/apex-verified-logo.png',
            'is_active' => true,
        ]);

        $product = Product::factory()->create([
            'brand_id' => $brand->id,
            'name' => 'Apex Pro Jersey',
            'slug' => 'apex-pro-jersey',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/products/{$product->slug}");

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals('Apex Athletics', $data['brand']);
        $this->assertEquals($brand->logo_url, $data['brand_logo']);
        $this->assertEquals($brand->logo_url, $data['brandLogo']);
        $this->assertNotNull($data['brand_data']);
        $this->assertEquals($brand->logo_url, $data['brand_data']['logo_url']);
    }

    /**
     * Test 2: One product with multiple variants and inventory rows counts as 1 product.
     */
    public function test_one_product_with_multiple_inventory_rows_counts_as_one_product(): void
    {
        $product = Product::factory()->create(['name' => 'Single Resilience Shirt']);

        // Create 4 variants
        $variants = [
            ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'S', 'color' => 'Navy', 'stock' => 100]),
            ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'color' => 'Navy', 'stock' => 100]),
            ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'L', 'color' => 'White', 'stock' => 100]),
            ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'XL', 'color' => 'White', 'stock' => 100]),
        ];

        foreach ($variants as $v) {
            Inventory::create([
                'product_variant_id' => $v->id,
                'warehouse_id' => $this->warehouse1->id,
                'quantity' => 100,
            ]);
        }

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/inventory/summary');

        $res->assertStatus(200);
        $data = $res->json('data');

        // 1 product, 4 records, 400 total units
        $this->assertEquals(1, $data['totalProducts']);
        $this->assertEquals(1, $data['totalItems']);
        $this->assertEquals(4, $data['totalRecords']);
        $this->assertEquals(400, $data['totalQuantity']);
    }

    /**
     * Test 3: Multiple products count correctly and do not collapse.
     */
    public function test_multiple_products_count_correctly(): void
    {
        $p1 = Product::factory()->create();
        $p2 = Product::factory()->create();
        $p3 = Product::factory()->create();

        $v1 = ProductVariant::factory()->create(['product_id' => $p1->id, 'stock' => 50]);
        $v2 = ProductVariant::factory()->create(['product_id' => $p2->id, 'stock' => 60]);
        $v3 = ProductVariant::factory()->create(['product_id' => $p3->id, 'stock' => 70]);

        Inventory::create(['product_variant_id' => $v1->id, 'warehouse_id' => $this->warehouse1->id, 'quantity' => 50]);
        Inventory::create(['product_variant_id' => $v2->id, 'warehouse_id' => $this->warehouse1->id, 'quantity' => 60]);
        Inventory::create(['product_variant_id' => $v3->id, 'warehouse_id' => $this->warehouse1->id, 'quantity' => 70]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/inventory/summary');

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals(3, $data['totalProducts']);
        $this->assertEquals(3, $data['totalItems']);
        $this->assertEquals(3, $data['totalRecords']);
        $this->assertEquals(180, $data['totalQuantity']);
    }

    /**
     * Test 4: Multiple variants do not multiply product count.
     */
    public function test_multiple_variants_do_not_multiply_product_count(): void
    {
        $product = Product::factory()->create(['name' => '16 Variant Shirt']);

        // 16 variants for 1 product
        for ($i = 0; $i < 16; $i++) {
            $v = ProductVariant::factory()->create([
                'product_id' => $product->id,
                'size' => "Size-{$i}",
                'color' => 'Black',
                'stock' => 25,
            ]);

            Inventory::create([
                'product_variant_id' => $v->id,
                'warehouse_id' => $this->warehouse1->id,
                'quantity' => 25,
            ]);
        }

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/inventory/summary');

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals(1, $data['totalProducts'], 'Product count must remain 1 despite 16 variants');
        $this->assertEquals(1, $data['totalItems']);
        $this->assertEquals(16, $data['totalRecords'], 'Inventory records count must accurately reflect 16 rows');
        $this->assertEquals(400, $data['totalQuantity']);
    }

    /**
     * Test 5: Multiple warehouses do not multiply product count.
     */
    public function test_multiple_warehouses_do_not_multiply_product_count(): void
    {
        $product = Product::factory()->create(['name' => 'Multi-Warehouse Apparel']);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 300]);

        // Stock across Warehouse 1 AND Warehouse 2
        Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 200,
        ]);
        Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $this->warehouse2->id,
            'quantity' => 100,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/inventory/summary');

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals(1, $data['totalProducts'], 'Product count must remain 1 across multiple warehouses');
        $this->assertEquals(1, $data['totalItems']);
        $this->assertEquals(2, $data['totalRecords']);
        $this->assertEquals(300, $data['totalQuantity']);
    }

    /**
     * Test 6: Package allocations do not multiply product count.
     */
    public function test_package_allocations_do_not_multiply_product_count(): void
    {
        $product = Product::factory()->create(['name' => 'Packaged Product']);
        $v1 = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'color' => 'Navy', 'stock' => 100]);
        $v2 = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'L', 'color' => 'Navy', 'stock' => 100]);

        Inventory::create(['product_variant_id' => $v1->id, 'warehouse_id' => $this->warehouse1->id, 'quantity' => 100]);
        Inventory::create(['product_variant_id' => $v2->id, 'warehouse_id' => $this->warehouse1->id, 'quantity' => 100]);

        // Create 6 package allocations for this product
        for ($i = 0; $i < 6; $i++) {
            ProductPackageAllocation::create([
                'product_id' => $product->id,
                'product_variant_id' => ($i % 2 === 0) ? $v1->id : $v2->id,
                'package_name' => "Prepack Tier {$i}",
                'color' => 'Navy',
                'size' => ($i % 2 === 0) ? 'M' : 'L',
                'quantity' => 5,
            ]);
        }

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/inventory/summary');

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals(1, $data['totalProducts'], 'Package allocations must not multiply product count');
        $this->assertEquals(1, $data['totalItems']);
        $this->assertEquals(2, $data['totalRecords']);
        $this->assertEquals(200, $data['totalQuantity']);
    }

    /**
     * Test 7: Inventory quantity remains unchanged by count query fix.
     */
    public function test_inventory_quantity_remains_unchanged_by_count_query_fix(): void
    {
        $product = Product::factory()->create();
        $v1 = ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 77]);
        $v2 = ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 123]);

        Inventory::create(['product_variant_id' => $v1->id, 'warehouse_id' => $this->warehouse1->id, 'quantity' => 77]);
        Inventory::create(['product_variant_id' => $v2->id, 'warehouse_id' => $this->warehouse1->id, 'quantity' => 123]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/inventory/summary');

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals(1, $data['totalProducts']);
        $this->assertEquals(200, $data['totalQuantity'], 'Sum of 77 + 123 must strictly equal 200');
    }
}
