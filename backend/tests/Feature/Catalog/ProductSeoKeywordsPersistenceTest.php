<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductSeoKeywordsPersistenceTest extends TestCase
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
            'name' => 'SEO Test Warehouse',
            'code' => 'WH-SEO-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->brand = Brand::factory()->create([
            'name' => 'SEO Denim Co',
            'slug' => 'seo-denim-co-' . uniqid(),
            'is_active' => true,
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Jeans & Denim',
            'slug' => 'jeans-denim-' . uniqid(),
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_seo_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'customer_seo_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
            'is_super_admin' => false,
        ]);
    }

    /**
     * Test 1 & 8: Newly created SEO keywords persist into database.
     */
    public function test_newly_created_product_with_seo_keywords_persists_successfully(): void
    {
        $payload = [
            'product_id' => 'PRD-SEO-001',
            'name' => 'Men Relaxed Denim Jeans',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'description' => "High grade denim\nLine 2",
            'wholesale_price' => 24.50,
            'full_stock_price' => 19.99,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            'stock' => 500,
            'status' => 'published',
            'seo_title' => 'Wholesale Men Relaxed Denim Jeans',
            'seo_description' => 'Premium export denim jeans direct from manufacturer.',
            'keywords' => ['jeans', 'denim', "men's jeans", 'wholesale jeans'],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $productData = $response->json('data');
        $this->assertNotNull($productData);
        $this->assertEquals(['jeans', 'denim', "men's jeans", 'wholesale jeans'], $productData['keywords']);
        $this->assertEquals(['jeans', 'denim', "men's jeans", 'wholesale jeans'], $productData['seo_keywords']);
        $this->assertEquals('Wholesale Men Relaxed Denim Jeans', $productData['seoTitle']);
        $this->assertEquals('Wholesale Men Relaxed Denim Jeans', $productData['seo_title']);
        $this->assertEquals('Premium export denim jeans direct from manufacturer.', $productData['seoDescription']);

        // Verify in DB directly
        $dbProduct = Product::find($productData['id']);
        $this->assertNotNull($dbProduct);
        $this->assertEquals(['jeans', 'denim', "men's jeans", 'wholesale jeans'], $dbProduct->keywords);
        $this->assertEquals(['jeans', 'denim', "men's jeans", 'wholesale jeans'], $dbProduct->seo_keywords);
        $this->assertEquals('Wholesale Men Relaxed Denim Jeans', $dbProduct->seo_title);
    }

    /**
     * Test 2 & 9: Existing SEO keywords are returned by the edit-product GET API.
     */
    public function test_existing_seo_keywords_are_returned_by_product_get_api(): void
    {
        $savedKeywords = ['jeans', 'denim', "mens jeans", 'wholesale clothing'];
        $product = Product::create([
            'product_id' => 'PRD-SEO-002',
            'name' => 'Classic Slim Fit Denim',
            'slug' => 'classic-slim-fit-denim-' . uniqid(),
            'sku' => 'SKU-SEO-002-' . uniqid(),
            'brand_id' => $this->brand->id,
            'wholesale_price' => 28.00,
            'full_stock_price' => 22.00,
            'status' => 'published',
            'seo_title' => 'Classic Slim Fit Denim | Ayaan',
            'seo_description' => 'Export quality slim fit jeans for men.',
            'keywords' => $savedKeywords,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$product->id}");
        $response->assertStatus(200);

        $json = $response->json('data');
        $this->assertEquals($savedKeywords, $json['keywords']);
        $this->assertEquals($savedKeywords, $json['seo_keywords']);
        $this->assertEquals('Classic Slim Fit Denim | Ayaan', $json['seoTitle']);
        $this->assertEquals('Export quality slim fit jeans for men.', $json['seoDescription']);
    }

    /**
     * Test 3: Multiple saved keywords all appear correctly with exact order and casing preserved.
     */
    public function test_multiple_saved_keywords_preserve_exact_strings_and_order(): void
    {
        $complexKeywords = [
            'Premium Selvedge Denim',
            "100% Cotton Men's Jeans",
            'AQL 2.5 Export Standards',
            'Bulk Wholesale Dhaka',
        ];

        $product = Product::create([
            'product_id' => 'PRD-SEO-003',
            'name' => 'Premium Selvedge Product',
            'slug' => 'premium-selvedge-' . uniqid(),
            'sku' => 'SKU-SEO-003-' . uniqid(),
            'brand_id' => $this->brand->id,
            'wholesale_price' => 35.00,
            'full_stock_price' => 29.00,
            'status' => 'published',
            'keywords' => $complexKeywords,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$product->id}");
        $response->assertStatus(200);

        $json = $response->json('data');
        $this->assertSame($complexKeywords, $json['keywords']);
        $this->assertSame($complexKeywords, $json['seo_keywords']);
    }

    /**
     * Test 4: Editing another product field only does NOT erase SEO keywords.
     */
    public function test_editing_other_fields_does_not_erase_seo_keywords(): void
    {
        $initialKeywords = ['raw denim', 'indigo dye', 'heavyweight jeans'];
        $product = Product::create([
            'product_id' => 'PRD-SEO-004',
            'name' => 'Raw Indigo Jeans',
            'slug' => 'raw-indigo-jeans-' . uniqid(),
            'sku' => 'SKU-SEO-004-' . uniqid(),
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'full_stock_price' => 25.00,
            'status' => 'published',
            'keywords' => $initialKeywords,
        ]);

        // Edit price and name only; omit keywords from payload
        $updatePayload = [
            'wholesale_price' => 32.50,
            'name' => 'Raw Indigo Jeans - Updated Edition',
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", $updatePayload);
        $res->assertStatus(200);

        $product->refresh();
        $this->assertEquals(32.50, (float) $product->wholesale_price);
        $this->assertEquals('Raw Indigo Jeans - Updated Edition', $product->name);
        // Keywords must remain untouched!
        $this->assertEquals($initialKeywords, $product->keywords);
        $this->assertEquals($initialKeywords, $res->json('data.keywords'));
    }

    /**
     * Test 5 & 6: Save Draft and Publish preserve SEO keywords.
     */
    public function test_draft_and_publish_preserve_seo_keywords(): void
    {
        $keywords = ['winter jacket', 'puffer coat', 'wholesale outerwear'];

        // 1. Save Draft with keywords
        $draftPayload = [
            'product_id' => 'PRD-SEO-DRAFT',
            'name' => 'Winter Puffer Jacket Draft',
            'brand_id' => $this->brand->id,
            'status' => 'draft',
            'wholesale_price' => 45.00,
            'full_stock_price' => 40.00,
            'keywords' => $keywords,
            'seo_title' => 'Winter Puffer Draft',
        ];

        $draftRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $draftPayload);
        $draftRes->assertStatus(201);
        $draftProduct = $draftRes->json('data');
        $this->assertEquals('draft', $draftProduct['status']);
        $this->assertEquals($keywords, $draftProduct['keywords']);

        // 2. Publish the draft while keeping or updating keywords
        $publishPayload = [
            'status' => 'published',
            'warehouse_id' => $this->warehouse->id,
            'stock' => 100,
            'keywords' => $keywords,
        ];

        $pubRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$draftProduct['id']}", $publishPayload);
        $pubRes->assertStatus(200);
        $pubProduct = $pubRes->json('data');
        $this->assertEquals('published', $pubProduct['status']);
        $this->assertEquals($keywords, $pubProduct['keywords']);
        $this->assertEquals('Winter Puffer Draft', $pubProduct['seoTitle']);
    }

    /**
     * Test 7: Support both camelCase and snake_case field names (seoKeywords/seo_keywords/keywords).
     */
    public function test_api_accepts_and_persists_seo_keywords_alias(): void
    {
        $payload = [
            'product_id' => 'PRD-SEO-ALIAS',
            'name' => 'Alias Keyword Product',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 15.00,
            'full_stock_price' => 12.00,
            'status' => 'draft',
            'seo_keywords' => ['tag one', 'tag two', 'tag three'],
            'seoTitle' => 'Alias SEO Title',
            'seoDescription' => 'Alias SEO Description',
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $data = $res->json('data');
        $this->assertEquals(['tag one', 'tag two', 'tag three'], $data['keywords']);
        $this->assertEquals(['tag one', 'tag two', 'tag three'], $data['seo_keywords']);
        $this->assertEquals('Alias SEO Title', $data['seoTitle']);
        $this->assertEquals('Alias SEO Description', $data['seoDescription']);
    }

    /**
     * Test 10: Empty SEO keywords remain valid when intentionally empty.
     */
    public function test_empty_seo_keywords_remain_valid(): void
    {
        $product = Product::create([
            'product_id' => 'PRD-SEO-EMPTY',
            'name' => 'Product Without Keywords',
            'slug' => 'product-without-keywords-' . uniqid(),
            'sku' => 'SKU-SEO-EMPTY-' . uniqid(),
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'full_stock_price' => 16.00,
            'status' => 'published',
            'keywords' => [],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$product->id}");
        $res->assertStatus(200);
        $this->assertSame([], $res->json('data.keywords'));

        // Update to clear existing keywords intentionally
        $productWithKws = Product::create([
            'product_id' => 'PRD-SEO-CLEAR',
            'name' => 'Product To Clear Keywords',
            'slug' => 'product-to-clear-keywords-' . uniqid(),
            'sku' => 'SKU-SEO-CLEAR-' . uniqid(),
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'full_stock_price' => 16.00,
            'status' => 'published',
            'keywords' => ['tag1', 'tag2'],
        ]);

        $clearRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$productWithKws->id}", [
            'keywords' => [],
        ]);
        $clearRes->assertStatus(200);
        $this->assertSame([], $clearRes->json('data.keywords'));
    }
}
