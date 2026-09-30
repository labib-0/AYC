<?php

namespace Tests\Feature\LandingPage;

use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageBanner;
use App\Models\HomepageFeaturedProduct;
use App\Models\HomepageHotSaleCategory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LandingPageManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected Category $category1;
    protected Category $category2;
    protected Category $category3;
    protected Product $product1;
    protected Product $product2;
    protected Product $product3;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@ayaanclothing.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Storefront Buyer',
            'email' => 'buyer@example.com',
            'role' => 'customer',
        ]);

        $brand = Brand::create([
            'name' => 'Ayaan Studio',
            'slug' => 'ayaan-studio',
            'is_active' => true,
        ]);

        $this->category1 = Category::create([
            'name' => 'Sweaters',
            'slug' => 'sweaters',
            'description' => 'Winter knitwear and warm sweaters',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->category2 = Category::create([
            'name' => 'Towels',
            'slug' => 'towels',
            'description' => 'Luxury bath and hand towels',
            'is_active' => true,
            'sort_order' => 2,
        ]);

        $this->category3 = Category::create([
            'name' => 'Jackets',
            'slug' => 'jackets',
            'description' => 'Outerwear and jackets',
            'is_active' => true,
            'sort_order' => 3,
        ]);

        $this->product1 = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Heavyweight Boxy Hoodie',
            'slug' => 'heavyweight-boxy-hoodie',
            'sku' => 'AYN-HOD-001',
            'wholesale_price' => 32.00,
            'msrp_price' => 65.00,
            'moq' => 12,
            'status' => 'published',
            'is_featured' => true,
        ]);

        $this->product2 = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Classic Cotton Oversized Tee',
            'slug' => 'classic-cotton-oversized-tee',
            'sku' => 'AYN-TEE-002',
            'wholesale_price' => 18.00,
            'msrp_price' => 38.00,
            'moq' => 20,
            'status' => 'published',
            'is_featured' => true,
        ]);

        $this->product3 = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Chino Utility Trousers',
            'slug' => 'chino-utility-trousers',
            'sku' => 'AYN-TRO-003',
            'wholesale_price' => 25.00,
            'msrp_price' => 55.00,
            'moq' => 15,
            'status' => 'published',
            'is_featured' => false,
        ]);
    }

    // =========================================================================
    // 1. Public Customer Storefront API Tests
    // =========================================================================

    public function test_public_storefront_can_retrieve_homepage_configuration(): void
    {
        $response = $this->getJson('/api/v1/homepage');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'banner',
                    'ticker_items',
                    'hot_sale_categories',
                    'featured_products',
                ],
            ]);

        $this->assertTrue($response->json('success'));
    }

    public function test_homepage_alias_route_works(): void
    {
        $response = $this->getJson('/api/homepage');
        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
    }

    // =========================================================================
    // 2. Authorization Security Tests
    // =========================================================================

    public function test_unauthenticated_user_cannot_access_admin_homepage_endpoints(): void
    {
        $this->getJson('/api/v1/admin/homepage')->assertStatus(401);
        $this->postJson('/api/v1/admin/homepage/banner', ['headline' => 'Test'])->assertStatus(401);
        $this->postJson('/api/v1/admin/homepage/hot-sale-categories', ['categories' => []])->assertStatus(401);
        $this->postJson('/api/v1/admin/homepage/featured-products', ['products' => []])->assertStatus(401);
        $this->getJson('/api/v1/admin/homepage/search-products')->assertStatus(401);
    }

    public function test_regular_customer_cannot_access_admin_homepage_endpoints(): void
    {
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/homepage')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/admin/homepage/banner', ['headline' => 'Test'])
            ->assertStatus(403);
    }

    // =========================================================================
    // 3. Admin Landing Page Banner Management Tests
    // =========================================================================

    public function test_admin_can_retrieve_full_homepage_management_config(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/homepage');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'banner',
                    'all_banners',
                    'hot_sale_categories',
                    'featured_products',
                    'counts' => ['total_categories', 'total_products'],
                ],
            ]);
    }

    public function test_admin_can_update_banner_details_and_storefront_reflects_changes(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/banner', [
                'headline' => 'SUMMER MERCHANDISING 2026',
                'subtitle' => 'Exclusive discounts on export quality garments',
                'cta_text' => 'VIEW BULK CATALOG',
                'destination_type' => 'url',
                'destination_value' => '/products?category=summer',
                'is_active' => true,
            ]);

        $response->assertStatus(200);
        $this->assertEquals('SUMMER MERCHANDISING 2026', $response->json('data.headline'));

        // Customer storefront retrieves the exact updated configuration
        $storefront = $this->getJson('/api/v1/homepage');
        $storefront->assertStatus(200);
        $this->assertEquals('SUMMER MERCHANDISING 2026', $storefront->json('data.banner.headline'));
        $this->assertEquals('VIEW BULK CATALOG', $storefront->json('data.banner.cta_text'));
        $this->assertEquals('/products?category=summer', $storefront->json('data.banner.destination_value'));
    }

    public function test_admin_can_upload_banner_image_to_storage(): void
    {
        Storage::fake('public');

        $image = UploadedFile::fake()->image('summer_banner.jpg', 1375, 158);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/homepage/banner', [
                'headline' => 'NEW BANNER IMAGE TEST',
                'subtitle' => 'Quality verified',
                'file' => $image,
                'is_active' => true,
            ]);

        $response->assertStatus(200);
        $storedUrl = $response->json('data.image_url');
        $this->assertNotEmpty($storedUrl);
        $this->assertStringContainsString('storage/banners/', $storedUrl);
    }

    // =========================================================================
    // 4. Admin Hot Sale Categories Tests
    // =========================================================================

    public function test_admin_can_sync_and_reorder_hot_sale_categories(): void
    {
        // Set Hot Sale in order: Jackets (1), Sweaters (2), Towels (3)
        $payload = [
            'categories' => [
                ['category_id' => $this->category3->id, 'sort_order' => 0],
                ['category_id' => $this->category1->id, 'sort_order' => 1],
                ['category_id' => $this->category2->id, 'sort_order' => 2],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/hot-sale-categories', $payload);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(3, $data);
        $this->assertEquals($this->category3->id, $data[0]['category_id']);
        $this->assertEquals($this->category1->id, $data[1]['category_id']);
        $this->assertEquals($this->category2->id, $data[2]['category_id']);

        // Check customer storefront receives exactly this selection in this order
        $storefront = $this->getJson('/api/v1/homepage');
        $storefrontCats = $storefront->json('data.hot_sale_categories');
        $this->assertCount(3, $storefrontCats);
        $this->assertEquals('Jackets', $storefrontCats[0]['category']['name']);
        $this->assertEquals('Sweaters', $storefrontCats[1]['category']['name']);
        $this->assertEquals('Towels', $storefrontCats[2]['category']['name']);
    }

    // =========================================================================
    // 5. Admin Featured Products Tests
    // =========================================================================

    public function test_admin_can_sync_and_manually_reorder_featured_products(): void
    {
        // Admin orders products: Product 3, Product 1, Product 2
        $payload = [
            'products' => [
                ['product_id' => $this->product3->id, 'sort_order' => 0],
                ['product_id' => $this->product1->id, 'sort_order' => 1],
                ['product_id' => $this->product2->id, 'sort_order' => 2],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/featured-products', $payload);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(3, $data);
        $this->assertEquals($this->product3->id, $data[0]['product_id']);
        $this->assertEquals($this->product1->id, $data[1]['product_id']);
        $this->assertEquals($this->product2->id, $data[2]['product_id']);

        // Storefront receives exact admin order
        $storefront = $this->getJson('/api/v1/homepage');
        $storefrontProds = $storefront->json('data.featured_products');
        $this->assertCount(3, $storefrontProds);
        $this->assertEquals('Chino Utility Trousers', $storefrontProds[0]['product']['name']);
        $this->assertEquals('Heavyweight Boxy Hoodie', $storefrontProds[1]['product']['name']);
        $this->assertEquals('Classic Cotton Oversized Tee', $storefrontProds[2]['product']['name']);
    }

    public function test_admin_product_search_for_featured_selector(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/homepage/search-products?q=Hoodie');

        $response->assertStatus(200);
        $items = $response->json('data.items');
        $this->assertGreaterThanOrEqual(1, count($items));
        $this->assertEquals('Heavyweight Boxy Hoodie', $items[0]['name']);
    }

    public function test_deleting_category_safely_removes_from_hot_sale(): void
    {
        $this->category1->delete();

        $storefront = $this->getJson('/api/v1/homepage');
        $storefront->assertStatus(200);

        // Sweaters should not appear or crash the storefront
        $slugs = collect($storefront->json('data.hot_sale_categories'))->pluck('category.slug');
        $this->assertFalse($slugs->contains('sweaters'));
    }

    public function test_admin_can_sync_homepage_ticker_items(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/ticker', [
                'items' => [
                    ['text' => 'QUALITY APPAREL', 'is_active' => true, 'sort_order' => 0],
                    ['text' => 'FACTORY DIRECT', 'is_active' => true, 'sort_order' => 1],
                    ['text' => 'EXPORT READY', 'is_active' => false, 'sort_order' => 2],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertCount(3, $response->json('data'));
        $this->assertEquals('QUALITY APPAREL', $response->json('data.0.text'));
        $this->assertTrue($response->json('data.0.is_active'));
        $this->assertFalse($response->json('data.2.is_active'));

        // Customer storefront retrieves active ticker items in order
        $storefront = $this->getJson('/api/v1/homepage');
        $storefront->assertStatus(200);
        $activeItems = $storefront->json('data.ticker_items');
        $this->assertCount(2, $activeItems); // Only 2 active
        $this->assertEquals('QUALITY APPAREL', $activeItems[0]['text']);
        $this->assertEquals('FACTORY DIRECT', $activeItems[1]['text']);
    }

    public function test_customer_cannot_sync_ticker_items(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/admin/homepage/ticker', [
                'items' => [
                    ['text' => 'MALICIOUS TICKER', 'is_active' => true],
                ],
            ]);

        $response->assertStatus(403);
    }

    public function test_collection_season_endpoint_is_removed(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/season', [
                'season' => 'Spring / Summer 2027',
            ]);

        // Route no longer exists
        $response->assertStatus(404);
    }

    public function test_active_season_is_absent_from_homepage_responses(): void
    {
        $storefront = $this->getJson('/api/v1/homepage');
        $storefront->assertStatus(200);
        $this->assertArrayNotHasKey('active_season', $storefront->json('data'));

        $admin = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/homepage');
        $admin->assertStatus(200);
        $this->assertArrayNotHasKey('active_season', $admin->json('data'));
    }
}
