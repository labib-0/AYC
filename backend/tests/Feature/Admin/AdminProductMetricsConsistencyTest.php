<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Catalog\AdminProductMetricsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProductMetricsConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Brand $brand;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->brand = Brand::create([
            'name' => 'Ayaan Couture',
            'slug' => 'ayaan-couture',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'code' => 'WH-UTTARA-01',
            'name' => 'Uttara Warehouse',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * Test 1: Verify shared AdminProductMetricsService and that Dashboard & Products statistics
     * return IDENTICAL numbers for total, published, draft, and low-stock products.
     */
    public function test_dashboard_and_products_endpoints_return_identical_metrics(): void
    {
        // 1. Published & Storefront-visible Product (In Stock: MOQ=20, Available=50)
        $p1 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'wholesale_price' => 50.00,
            'moq' => 20,
        ]);
        $v1 = ProductVariant::factory()->create([
            'product_id' => $p1->id,
            'stock' => 50,
        ]);
        Inventory::create([
            'product_variant_id' => $v1->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 50,
        ]);

        // 2. Published & Storefront-visible Product (LOW STOCK: MOQ=30, Available=10 < 30)
        $p2 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'wholesale_price' => 35.00,
            'moq' => 30,
        ]);
        $v2 = ProductVariant::factory()->create([
            'product_id' => $p2->id,
            'stock' => 10,
        ]);
        Inventory::create([
            'product_variant_id' => $v2->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 10,
        ]);

        // 3. Draft Product (In Stock: MOQ=10, Available=25)
        $p3 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'draft',
            'wholesale_price' => 20.00,
            'moq' => 10,
        ]);
        $v3 = ProductVariant::factory()->create([
            'product_id' => $p3->id,
            'stock' => 25,
        ]);
        Inventory::create([
            'product_variant_id' => $v3->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 25,
        ]);

        // 4. Draft Product (LOW STOCK: MOQ=40, Available=5 < 40)
        $p4 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'draft',
            'wholesale_price' => 45.00,
            'moq' => 40,
        ]);
        $v4 = ProductVariant::factory()->create([
            'product_id' => $p4->id,
            'stock' => 5,
        ]);
        Inventory::create([
            'product_variant_id' => $v4->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 5,
        ]);

        // 5. Archived Product (In Stock: MOQ=5, Stock=100)
        $p5 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'archived',
            'wholesale_price' => 15.00,
            'moq' => 5,
            'stock' => 100,
        ]);

        // 6. Soft-Deleted Product (Must be excluded everywhere!)
        $pDeleted = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'published',
            'wholesale_price' => 60.00,
            'moq' => 10,
        ]);
        $pDeleted->delete();

        // Query 1: Dashboard API
        $dashRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $dashRes->assertStatus(200);
        $dashData = $dashRes->json('data');

        // Query 2: Product Statistics API
        $statsRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/products/statistics');
        $statsRes->assertStatus(200);
        $statsData = $statsRes->json('data');

        // Query 3: Products Catalog API (meta.counts)
        $catRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products?isAdmin=true');
        $catRes->assertStatus(200);
        $catMeta = $catRes->json('meta');

        // Total Products must strictly match: 5 active products (2 published + 2 draft + 1 archived)
        $this->assertEquals(5, $dashData['total_products']);
        $this->assertEquals(5, $statsData['total_products']);
        $this->assertEquals(5, $catMeta['counts']['total']);

        // Published Products must strictly match: 2 published
        $this->assertEquals(2, $dashData['published_products']);
        $this->assertEquals(2, $dashData['active_products']);
        $this->assertEquals(2, $statsData['published_products']);
        $this->assertEquals(2, $catMeta['counts']['published']);

        // Draft Products must strictly match: 2 draft
        $this->assertEquals(2, $dashData['draft_products']);
        $this->assertEquals(2, $statsData['draft_products']);
        $this->assertEquals(2, $catMeta['counts']['draft']);

        // Low Stock Products must strictly match: 2 products (p2 has 10 < 30, p4 has 5 < 40)
        $this->assertEquals(2, $dashData['low_stock_items']);
        $this->assertEquals(2, $dashData['low_stock_products']);
        $this->assertEquals(2, $statsData['low_stock_products']);
        $this->assertEquals(2, $catMeta['counts']['low_stock']);

        // Soft-deleted product pDeleted is never counted in any metric
        $this->assertFalse(Product::whereNull('deleted_at')->where('id', $pDeleted->id)->exists());
    }

    /**
     * Test 2: Verify ?all=true allows retrieving all catalog products unpaginated for Admin.
     */
    public function test_products_endpoint_supports_all_query(): void
    {
        // Create 25 products (more than the default page limit of 20)
        Product::factory()->count(25)->create([
            'brand_id' => $this->brand->id,
            'status' => 'published',
            'wholesale_price' => 30.00,
        ]);

        // Default query without all=true returns 20
        $defaultRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products?isAdmin=true');
        $defaultRes->assertStatus(200);
        $this->assertCount(20, $defaultRes->json('data'));

        // Query with all=true returns all 25 products
        $allRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products?isAdmin=true&all=true');
        $allRes->assertStatus(200);
        $this->assertCount(25, $allRes->json('data'));
        $this->assertEquals(25, $allRes->json('meta.total'));
    }
}
