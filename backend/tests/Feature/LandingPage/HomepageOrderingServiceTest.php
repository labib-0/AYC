<?php

namespace Tests\Feature\LandingPage;

use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageFeaturedBrand;
use App\Models\HomepageFeaturedProduct;
use App\Models\HomepageHotSaleCategory;
use App\Models\HomepageTickerItem;
use App\Models\Product;
use App\Models\User;
use App\Services\Catalog\HomepageOrderingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomepageOrderingServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private HomepageOrderingService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->service = app(HomepageOrderingService::class);
    }

    public function test_normalize_sequence_deduplicates_and_assigns_0_based_indices(): void
    {
        $input = [
            ['brand_id' => 5, 'is_active' => true],
            ['brand_id' => 12, 'is_active' => true],
            ['brand_id' => 5, 'is_active' => false], // Duplicate ID
            ['brand_id' => 8, 'is_active' => true],
        ];

        $result = $this->service->normalizeSequence($input, 'brand_id');

        $this->assertCount(3, $result);
        $this->assertEquals(5, $result[0]['brand_id']);
        $this->assertEquals(0, $result[0]['sort_order']);
        $this->assertEquals(12, $result[1]['brand_id']);
        $this->assertEquals(1, $result[1]['sort_order']);
        $this->assertEquals(8, $result[2]['brand_id']);
        $this->assertEquals(2, $result[2]['sort_order']);
    }

    public function test_sync_featured_brands_persists_order_and_entity_flags(): void
    {
        $b1 = Brand::create(['name' => 'Brand 1', 'slug' => 'b1', 'is_active' => true]);
        $b2 = Brand::create(['name' => 'Brand 2', 'slug' => 'b2', 'is_active' => true]);
        $b3 = Brand::create(['name' => 'Brand 3', 'slug' => 'b3', 'is_active' => true]);

        // Reorder b3 first, then b1
        $saved = $this->service->syncFeaturedBrands([
            ['brand_id' => $b3->id, 'is_active' => true],
            ['brand_id' => $b1->id, 'is_active' => true],
        ]);

        $this->assertCount(2, $saved);
        $this->assertEquals($b3->id, $saved[0]->brand_id);
        $this->assertEquals(0, $saved[0]->sort_order);
        $this->assertEquals($b1->id, $saved[1]->brand_id);
        $this->assertEquals(1, $saved[1]->sort_order);

        // Check Brand table flags
        $this->assertTrue($b3->fresh()->is_featured_on_landing);
        $this->assertEquals(0, $b3->fresh()->landing_sort_order);
        $this->assertTrue($b1->fresh()->is_featured_on_landing);
        $this->assertEquals(1, $b1->fresh()->landing_sort_order);
        $this->assertFalse($b2->fresh()->is_featured_on_landing);
    }

    public function test_sync_hot_sale_categories_persists_order_and_entity_flags(): void
    {
        $c1 = Category::create(['name' => 'Cat 1', 'slug' => 'c1', 'is_active' => true]);
        $c2 = Category::create(['name' => 'Cat 2', 'slug' => 'c2', 'is_active' => true]);

        $saved = $this->service->syncHotSaleCategories([
            ['category_id' => $c2->id, 'is_active' => true],
            ['category_id' => $c1->id, 'is_active' => false],
        ]);

        $this->assertCount(2, $saved);
        $this->assertEquals($c2->id, $saved[0]->category_id);
        $this->assertEquals(0, $saved[0]->sort_order);
        $this->assertEquals($c1->id, $saved[1]->category_id);
        $this->assertEquals(1, $saved[1]->sort_order);

        $this->assertTrue($c2->fresh()->is_featured_on_landing);
        $this->assertFalse($c1->fresh()->is_featured_on_landing);
    }

    public function test_sync_featured_products_persists_order_and_entity_flags(): void
    {
        $brand = Brand::create(['name' => 'Test Brand', 'slug' => 'test-brand', 'is_active' => true]);
        $p1 = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Product 1',
            'slug' => 'p1',
            'sku' => 'SKU-1',
            'wholesale_price' => 10,
            'status' => 'published',
        ]);
        $p2 = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Product 2',
            'slug' => 'p2',
            'sku' => 'SKU-2',
            'wholesale_price' => 20,
            'status' => 'published',
        ]);

        $saved = $this->service->syncFeaturedProducts([
            ['product_id' => $p2->id, 'is_active' => true],
            ['product_id' => $p1->id, 'is_active' => true],
        ]);

        $this->assertCount(2, $saved);
        $this->assertEquals($p2->id, $saved[0]->product_id);
        $this->assertEquals(0, $saved[0]->sort_order);
        $this->assertEquals($p1->id, $saved[1]->product_id);
        $this->assertEquals(1, $saved[1]->sort_order);

        $this->assertTrue($p2->fresh()->is_featured);
        $this->assertEquals(0, $p2->fresh()->featured_sort_order);
        $this->assertTrue($p1->fresh()->is_featured);
        $this->assertEquals(1, $p1->fresh()->featured_sort_order);
    }

    public function test_sync_ticker_items_persists_order_and_creates_updates(): void
    {
        $existing = HomepageTickerItem::create([
            'text' => 'OLD TICKER',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $saved = $this->service->syncTickerItems([
            ['id' => $existing->id, 'text' => 'UPDATED TICKER', 'is_active' => true],
            ['text' => 'NEW TICKER', 'is_active' => false],
        ]);

        $this->assertCount(2, $saved);
        $this->assertEquals('UPDATED TICKER', $saved[0]->text);
        $this->assertEquals(0, $saved[0]->sort_order);
        $this->assertEquals('NEW TICKER', $saved[1]->text);
        $this->assertEquals(1, $saved[1]->sort_order);
        $this->assertFalse($saved[1]->is_active);
    }

    public function test_search_brands_excludes_specified_ids(): void
    {
        $b1 = Brand::create(['name' => 'Alpha Brand', 'slug' => 'alpha', 'is_active' => true]);
        $b2 = Brand::create(['name' => 'Beta Brand', 'slug' => 'beta', 'is_active' => true]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/homepage/search-brands?exclude_ids={$b1->id}");

        $response->assertStatus(200);
        $ids = collect($response->json('data.items'))->pluck('id')->all();
        $this->assertNotContains($b1->id, $ids);
        $this->assertContains($b2->id, $ids);
    }

    public function test_search_categories_excludes_specified_ids(): void
    {
        $c1 = Category::create(['name' => 'Alpha Cat', 'slug' => 'alpha-cat', 'is_active' => true]);
        $c2 = Category::create(['name' => 'Beta Cat', 'slug' => 'beta-cat', 'is_active' => true]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/homepage/search-categories?exclude_ids={$c1->id}");

        $response->assertStatus(200);
        $ids = collect($response->json('data.items'))->pluck('id')->all();
        $this->assertNotContains($c1->id, $ids);
        $this->assertContains($c2->id, $ids);
    }

    public function test_search_products_excludes_specified_ids(): void
    {
        $brand = Brand::create(['name' => 'Brand X', 'slug' => 'brand-x', 'is_active' => true]);
        $p1 = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Alpha Product',
            'slug' => 'alpha-prod',
            'sku' => 'SKU-A',
            'wholesale_price' => 10,
            'status' => 'published',
        ]);
        $p2 = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Beta Product',
            'slug' => 'beta-prod',
            'sku' => 'SKU-B',
            'wholesale_price' => 20,
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/homepage/search-products?exclude_ids={$p1->id}");

        $response->assertStatus(200);
        $ids = collect($response->json('data.items'))->pluck('id')->all();
        $this->assertNotContains($p1->id, $ids);
        $this->assertContains($p2->id, $ids);
    }
}
