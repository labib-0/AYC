<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageFeaturedProduct;
use App\Models\Product;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Cache\CatalogCacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class PinnedProductsManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected Brand $brand;
    protected Category $category;

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

        $this->brand = Brand::create([
            'name' => 'Ayaan Originals',
            'slug' => 'ayaan-originals',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Apparel',
            'slug' => 'apparel',
            'is_active' => true,
        ]);
    }

    protected function createProduct(array $overrides = []): Product
    {
        static $seq = 1;
        $idNum = $seq++;

        $defaults = [
            'name' => "Product {$idNum}",
            'slug' => "product-{$idNum}",
            'sku' => "SKU-{$idNum}",
            'status' => 'published',
            'wholesale_price' => 10.00,
            'brand_id' => $this->brand->id,
            'is_hidden_from_storefront' => false,
            'is_pinned' => false,
            'is_featured' => false,
            'pinned_order' => 0,
            'featured_sort_order' => 0,
            'sort_order' => 100 + $idNum,
            'created_at' => now()->subMinutes($idNum * 10),
        ];

        return Product::create(array_merge($defaults, $overrides));
    }

    /**
     * Test 1: Initialization selects exactly 5 eligible products and is idempotent.
     */
    public function test_initialization_selects_exactly_five_eligible_products_and_never_rerandomizes(): void
    {
        // Create 8 eligible products and 2 non-eligible products (draft & hidden)
        $eligibleProducts = [];
        for ($i = 0; $i < 8; $i++) {
            $eligibleProducts[] = $this->createProduct();
        }

        $draftProduct = $this->createProduct([
            'status' => 'draft',
            'name' => 'Draft Product',
            'slug' => 'draft-product',
            'sku' => 'DRAFT-01',
        ]);

        $hiddenProduct = $this->createProduct([
            'is_hidden_from_storefront' => true,
            'name' => 'Hidden Product',
            'slug' => 'hidden-product',
            'sku' => 'HIDDEN-01',
        ]);

        // Run initialization command
        $exitCode = Artisan::call('catalog:initialize-pinned-products');
        $this->assertEquals(0, $exitCode);

        // Marker must be true
        $this->assertTrue(SystemSetting::get('pinned_products_initialized'));
        $initialIds = SystemSetting::get('initial_pinned_product_ids');
        $this->assertCount(5, $initialIds);

        // Verify exactly 5 products are pinned in the database
        $pinnedCount = Product::where('is_pinned', true)->count();
        $this->assertEquals(5, $pinnedCount);

        // Draft and hidden products must NEVER be among the selected pinned products
        $this->assertNotContains($draftProduct->id, $initialIds);
        $this->assertNotContains($hiddenProduct->id, $initialIds);

        // Run command a second time: must NOT re-randomize or change the initial IDs
        Artisan::call('catalog:initialize-pinned-products');
        $this->assertEquals($initialIds, SystemSetting::get('initial_pinned_product_ids'));
        $currentPinnedIds = Product::where('is_pinned', true)->orderBy('pinned_order')->pluck('id')->all();
        $this->assertEquals($initialIds, $currentPinnedIds);
    }

    /**
     * Test 2: Pin and Unpin via authenticated API persist in database.
     */
    public function test_pin_and_unpin_persist_in_database_and_homepage_featured_products(): void
    {
        $product = $this->createProduct();

        // Customer cannot pin
        $forbiddenResponse = $this->actingAs($this->customer, 'sanctum')
            ->patchJson("/api/v1/products/{$product->id}/toggle-pin", ['is_pinned' => true]);
        $forbiddenResponse->assertStatus(403);

        // Admin pins the product
        $pinResponse = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/products/{$product->id}/toggle-pin", ['is_pinned' => true]);
        $pinResponse->assertStatus(200);
        $pinResponse->assertJsonPath('data.isPinned', true);

        $product->refresh();
        $this->assertTrue($product->is_pinned);
        $this->assertTrue($product->is_featured);
        $this->assertDatabaseHas('homepage_featured_products', [
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        // Admin unpins the product
        $unpinResponse = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/products/{$product->id}/toggle-pin", ['is_pinned' => false]);
        $unpinResponse->assertStatus(200);
        $unpinResponse->assertJsonPath('data.isPinned', false);

        $product->refresh();
        $this->assertFalse($product->is_pinned);
        $this->assertFalse($product->is_featured);
        $this->assertDatabaseMissing('homepage_featured_products', [
            'product_id' => $product->id,
        ]);
    }

    /**
     * Test 3: Admin product listing places pinned products first across filters.
     */
    public function test_admin_product_listing_places_pinned_products_first(): void
    {
        $oldProduct = $this->createProduct(['created_at' => now()->subDays(10), 'wholesale_price' => 50.00]);
        $newProduct = $this->createProduct(['created_at' => now(), 'wholesale_price' => 10.00]);

        // Pin the old product
        $oldProduct->update(['is_pinned' => true, 'is_featured' => true, 'pinned_order' => 1, 'featured_sort_order' => 1]);

        // Query admin product list
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?all=1&isAdmin=1&sort=newest');

        $response->assertStatus(200);
        $items = $response->json('data');

        // Pinned product must be first even though newer unpinned product exists
        $this->assertEquals($oldProduct->id, $items[0]['id']);
        $this->assertTrue($items[0]['isPinned']);
        $this->assertEquals($newProduct->id, $items[1]['id']);
        $this->assertFalse($items[1]['isPinned']);
    }

    /**
     * Test 4: Reordering cannot place an unpinned product above a pinned product.
     */
    public function test_reorder_enforces_pinned_group_remains_above_unpinned_group(): void
    {
        $pinned1 = $this->createProduct(['is_pinned' => true, 'is_featured' => true, 'pinned_order' => 1]);
        $pinned2 = $this->createProduct(['is_pinned' => true, 'is_featured' => true, 'pinned_order' => 2]);
        $unpinned1 = $this->createProduct(['is_pinned' => false, 'is_featured' => false]);
        $unpinned2 = $this->createProduct(['is_pinned' => false, 'is_featured' => false]);

        // Client attempts to place unpinned1 ahead of pinned1
        $illegalOrder = [
            ['id' => $unpinned1->id, 'sort_order' => 1],
            ['id' => $pinned1->id, 'sort_order' => 2],
            ['id' => $pinned2->id, 'sort_order' => 3],
            ['id' => $unpinned2->id, 'sort_order' => 4],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/products/reorder', ['orders' => $illegalOrder]);

        $response->assertStatus(200);

        // Server-side invariant enforcement: pinned products remain at the top
        $pinned1->refresh();
        $pinned2->refresh();
        $unpinned1->refresh();
        $unpinned2->refresh();

        $this->assertLessThan($unpinned1->sort_order, $pinned1->sort_order);
        $this->assertLessThan($unpinned1->sort_order, $pinned2->sort_order);
        $this->assertLessThan($unpinned2->sort_order, $pinned1->sort_order);
    }

    /**
     * Test 5: Storefront Featured Products places pinned products first, then unpinned by created_at DESC.
     */
    public function test_storefront_featured_products_ordering(): void
    {
        // Product A (old, pinned)
        $pinnedOld = $this->createProduct(['name' => 'Pinned Old']);
        // Product B (newer, pinned, order 2)
        $pinnedNewer = $this->createProduct(['name' => 'Pinned Newer']);

        HomepageFeaturedProduct::create(['product_id' => $pinnedOld->id, 'sort_order' => 1, 'is_active' => true]);
        HomepageFeaturedProduct::create(['product_id' => $pinnedNewer->id, 'sort_order' => 2, 'is_active' => true]);
        Product::where('id', $pinnedOld->id)->update([
            'is_pinned' => true,
            'is_featured' => true,
            'pinned_order' => 1,
            'featured_sort_order' => 1,
            'created_at' => now()->subHours(20),
        ]);
        Product::where('id', $pinnedNewer->id)->update([
            'is_pinned' => true,
            'is_featured' => true,
            'pinned_order' => 2,
            'featured_sort_order' => 2,
            'created_at' => now()->subHours(15),
        ]);

        // Product C (newest unpinned)
        $unpinnedNewest = $this->createProduct(['name' => 'Unpinned Newest']);
        Product::where('id', $unpinnedNewest->id)->update(['created_at' => now()->subHours(1)]);

        // Product D (middle unpinned)
        $unpinnedMiddle = $this->createProduct(['name' => 'Unpinned Middle']);
        Product::where('id', $unpinnedMiddle->id)->update(['created_at' => now()->subHours(5)]);

        // Product E (oldest unpinned)
        $unpinnedOldest = $this->createProduct(['name' => 'Unpinned Oldest']);
        Product::where('id', $unpinnedOldest->id)->update(['created_at' => now()->subHours(10)]);

        // Query public storefront featured endpoint
        $response = $this->getJson('/api/v1/products/featured?limit=10&offset=0');
        $response->assertStatus(200);

        $returnedIds = collect($response->json('data'))->pluck('id')->all();

        // Expected sequence:
        // 1. Pinned Old (sort_order 1)
        // 2. Pinned Newer (sort_order 2)
        // 3. Unpinned Newest (created_at newest)
        // 4. Unpinned Middle (created_at middle)
        // 5. Unpinned Oldest (created_at oldest)
        $expected = [
            $pinnedOld->id,
            $pinnedNewer->id,
            $unpinnedNewest->id,
            $unpinnedMiddle->id,
            $unpinnedOldest->id,
        ];

        $this->assertEquals($expected, $returnedIds);
    }
}
