<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductStorefrontVisibilityAndUnifiedSkuTest extends TestCase
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
            'name' => 'Ayaan Premium',
            'slug' => 'ayaan-premium-' . uniqid(),
            'is_active' => true,
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Shirts',
            'slug' => 'shirts-' . uniqid(),
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
            'email' => 'admin_' . uniqid() . '@ayaan.test',
        ]);

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'email' => 'customer_' . uniqid() . '@ayaan.test',
        ]);
    }

    public function test_product_id_and_sku_are_unique_and_product_sku_is_manually_set(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-MANUAL-001',
            'name' => 'Manual SKU Product',
            'slug' => 'manual-sku-product',
            'sku' => 'LAC-POLO-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 25.00,
            'full_stock_price' => 22.00,
            'bulk_threshold' => 50,
            'bulk_price' => 20.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'published',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'product_id' => 'AYC-MANUAL-001',
            'sku' => 'LAC-POLO-001',
        ]);

        // Duplicate SKU should be rejected
        $dupSkuResp = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-MANUAL-002',
            'name' => 'Duplicate SKU Product',
            'slug' => 'dup-sku-product',
            'sku' => 'LAC-POLO-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);
        $dupSkuResp->assertStatus(422);

        // Duplicate Product ID should be rejected
        $dupPidResp = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-MANUAL-001',
            'name' => 'Duplicate PID Product',
            'slug' => 'dup-pid-product',
            'sku' => 'LAC-POLO-002',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);
        $dupPidResp->assertStatus(422);
    }

    public function test_variants_do_not_generate_variant_skus(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-VAR-001',
            'name' => 'Multi Variant Product',
            'slug' => 'multi-variant-product',
            'sku' => 'AYC-SKU-ROOT',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 30.00,
            'full_stock_price' => 28.00,
            'bulk_threshold' => 50,
            'bulk_price' => 25.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'published',
            'variants' => [
                ['color' => 'Navy', 'size' => 'M', 'stock' => 50],
                ['color' => 'Navy', 'size' => 'L', 'stock' => 50],
            ],
        ]);

        $response->assertStatus(201);
        $productId = $response->json('data.id');

        $variants = ProductVariant::where('product_id', $productId)->get();
        $this->assertCount(2, $variants);
        foreach ($variants as $variant) {
            $this->assertNull($variant->sku, 'Variant SKU must be null/empty, not auto-generated.');
        }

        // Public/customer ProductResource should not expose variant SKU
        $this->app['auth']->forgetGuards();
        $publicResp = $this->getJson("/api/v1/products/{$productId}");
        $publicResp->assertStatus(200);
        $retrievedVariants = $publicResp->json('data.variants');
        $this->assertCount(2, $retrievedVariants);
        $this->assertArrayNotHasKey('sku', $retrievedVariants[0], 'Variant SKU must not be exposed in API resource.');
    }

    public function test_hidden_published_product_is_excluded_from_public_catalog_and_show(): void
    {
        $product = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'product_id' => 'AYC-HIDDEN-001',
            'name' => 'Exclusive Hidden Jacket',
            'slug' => 'exclusive-hidden-jacket',
            'sku' => 'AYC-EXC-001',
            'status' => 'published',
            'is_hidden_from_storefront' => true,
            'is_featured' => true,
            'wholesale_price' => 50.00,
            'moq' => 1,
            'stock' => 100,
        ]);
        $product->categories()->sync([$this->category->id]);

        // 1. Excluded from public index
        $indexResp = $this->getJson('/api/v1/products');
        $indexResp->assertStatus(200);
        $ids = collect($indexResp->json('data'))->pluck('id')->all();
        $this->assertNotContains($product->id, $ids, 'Hidden product must be excluded from public products index.');

        // 2. Excluded from public search
        $searchResp = $this->getJson('/api/v1/products?q=Exclusive');
        $searchResp->assertStatus(200);
        $searchIds = collect($searchResp->json('data'))->pluck('id')->all();
        $this->assertNotContains($product->id, $searchIds, 'Hidden product must be excluded from search.');

        // 3. Excluded from search suggestions
        $suggResp = $this->getJson('/api/v1/search/suggestions?q=Exclusive');
        $suggResp->assertStatus(200);
        $suggIds = collect($suggResp->json('data.products'))->pluck('id')->all();
        $this->assertNotContains((string)$product->id, $suggIds, 'Hidden product must be excluded from suggestions.');

        // 4. Excluded from public featured
        $featuredResp = $this->getJson('/api/v1/products/featured');
        $featuredResp->assertStatus(200);
        $featIds = collect($featuredResp->json('data'))->pluck('id')->all();
        $this->assertNotContains($product->id, $featIds, 'Hidden product must be excluded from featured products.');

        // 5. Excluded from direct public show URL (returns 404)
        $showResp = $this->getJson("/api/v1/products/{$product->slug}");
        $showResp->assertStatus(404);

        // 6. Accessible by Admin
        $adminShowResp = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$product->slug}");
        $adminShowResp->assertStatus(200);
        $this->assertTrue($adminShowResp->json('data.isHiddenFromStorefront'));

        // 7. Admin can query with hidden filter
        $adminIndexResp = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products?is_hidden_from_storefront=1');
        $adminIndexResp->assertStatus(200);
        $adminIds = collect($adminIndexResp->json('data'))->pluck('id')->all();
        $this->assertContains($product->id, $adminIds);
    }

    public function test_admin_can_toggle_storefront_visibility(): void
    {
        $product = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'product_id' => 'AYC-TOGGLE-001',
            'name' => 'Toggleable Product',
            'slug' => 'toggleable-product',
            'sku' => 'AYC-TOG-001',
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'wholesale_price' => 40.00,
            'moq' => 1,
            'stock' => 100,
        ]);

        // Initially visible
        $show1 = $this->getJson("/api/v1/products/{$product->slug}");
        $show1->assertStatus(200);

        // Toggle to hidden
        $toggleResp = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/products/{$product->id}/toggle-storefront-visibility");
        $toggleResp->assertStatus(200);
        $this->assertTrue($toggleResp->json('data.isHiddenFromStorefront'));
        $this->assertTrue($product->fresh()->is_hidden_from_storefront);

        // Now not found for public customer
        $this->app['auth']->forgetGuards();
        $show2 = $this->getJson("/api/v1/products/{$product->slug}");
        $show2->assertStatus(404);

        // Toggle back to visible
        $toggleResp2 = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/products/{$product->id}/toggle-storefront-visibility");
        $toggleResp2->assertStatus(200);
        $this->assertFalse($toggleResp2->json('data.isHiddenFromStorefront'));
        $this->assertFalse($product->fresh()->is_hidden_from_storefront);

        // Public customer can view again
        $this->app['auth']->forgetGuards();
        $show3 = $this->getJson("/api/v1/products/{$product->slug}");
        $show3->assertStatus(200);
    }

    public function test_historical_orders_and_data_are_not_affected_by_hiding_product(): void
    {
        $product = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'product_id' => 'AYC-HIST-001',
            'name' => 'Historical Product',
            'slug' => 'historical-product',
            'sku' => 'AYC-HIST-SKU',
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'wholesale_price' => 45.00,
            'moq' => 1,
            'stock' => 50,
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'pending',
            'total_amount' => 450.00,
        ]);

        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_slug' => $product->slug,
            'sku' => $product->sku,
            'unit_price' => 45.00,
            'quantity' => 10,
            'line_total' => 450.00,
        ]);

        // Hide product from storefront
        $product->update(['is_hidden_from_storefront' => true]);

        // Order and OrderItem must be completely intact
        $this->assertDatabaseHas('order_items', [
            'id' => $orderItem->id,
            'order_id' => $order->id,
            'product_id' => $product->id,
            'sku' => 'AYC-HIST-SKU',
            'quantity' => 10,
        ]);
        $this->assertEquals(10, $order->fresh()->items->first()->quantity);
        $this->assertEquals('AYC-HIST-SKU', $order->fresh()->items->first()->sku);
    }

    public function test_hidden_product_is_excluded_from_category_and_brand_queries(): void
    {
        $visibleProduct = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'name' => 'Visible Item',
            'slug' => 'visible-item-' . uniqid(),
            'sku' => 'AYC-VIS-' . uniqid(),
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'wholesale_price' => 20.00,
            'moq' => 1,
            'stock' => 50,
        ]);
        $visibleProduct->categories()->sync([$this->category->id]);

        $hiddenProduct = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'name' => 'Hidden Item',
            'slug' => 'hidden-item-' . uniqid(),
            'sku' => 'AYC-HID-' . uniqid(),
            'status' => 'published',
            'is_hidden_from_storefront' => true,
            'wholesale_price' => 20.00,
            'moq' => 1,
            'stock' => 50,
        ]);
        $hiddenProduct->categories()->sync([$this->category->id]);

        // Category filter query on public products
        $catResp = $this->getJson("/api/v1/products?category={$this->category->slug}");
        $catResp->assertStatus(200);
        $catIds = collect($catResp->json('data'))->pluck('id')->all();
        $this->assertContains($visibleProduct->id, $catIds);
        $this->assertNotContains($hiddenProduct->id, $catIds);

        // Brand filter query on public products
        $brandResp = $this->getJson("/api/v1/products?brand={$this->brand->slug}");
        $brandResp->assertStatus(200);
        $brandIds = collect($brandResp->json('data'))->pluck('id')->all();
        $this->assertContains($visibleProduct->id, $brandIds);
        $this->assertNotContains($hiddenProduct->id, $brandIds);
    }

    public function test_zero_variants_product_is_valid_and_has_no_variant_skus(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-ZERO-001',
            'name' => 'Zero Variant T-Shirt',
            'slug' => 'zero-variant-tshirt',
            'sku' => 'AYC-ZERO-SKU',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 18.00,
            'full_stock_price' => 16.00,
            'bulk_threshold' => 100,
            'bulk_price' => 14.00,
            'moq' => 10,
            'stock' => 500,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'published',
            'variants' => [], // zero variants
        ]);

        $response->assertStatus(201);
        $productId = $response->json('data.id');

        $this->assertEquals(0, ProductVariant::where('product_id', $productId)->count());
        $this->assertEquals('AYC-ZERO-SKU', Product::find($productId)->sku);
    }
}
