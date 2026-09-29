<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductCatalogAndInventoryTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected Brand $brand;
    protected Category $category;
    protected Warehouse $warehouse;

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
            'name' => 'Ayaan Core',
            'slug' => 'ayaan-core',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Premium Knitwear',
            'slug' => 'premium-knitwear',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'name' => 'Dhaka WH',
            'code' => 'WH-DHK',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    public function test_catalog_listing_returns_paginated_products_with_proper_structure(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Test Merino Sweater',
            'slug' => 'test-merino-sweater',
            'sku' => 'TEST-SW-01',
            'audience' => 'MEN',
            'design_type' => 'ORIGINAL',
            'wholesale_price' => 120.00,
            'cost_price' => 50.00,
            'moq' => 5,
            'status' => 'published',
        ]);
        $product->categories()->attach($this->category->id);

        $response = $this->getJson('/api/v1/products');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'sku',
                        'brand',
                        'audience',
                        'design_type',
                        'designType',
                        'wholesalePrice',
                        'moq',
                    ],
                ],
                'meta' => ['current_page', 'per_page', 'total'],
                'links' => ['first', 'last'],
            ]);
    }

    public function test_composable_filtering_by_brand_audience_category_and_design_type(): void
    {
        // Product 1: Matches all filters
        $p1 = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Target Product',
            'slug' => 'target-product',
            'sku' => 'TP-01',
            'audience' => 'MEN',
            'design_type' => 'ORIGINAL',
            'wholesale_price' => 100.00,
            'status' => 'published',
        ]);
        $p1->categories()->attach($this->category->id);

        // Product 2: Different brand
        $otherBrand = Brand::create(['name' => 'Other Brand', 'slug' => 'other-brand', 'is_active' => true]);
        $p2 = Product::create([
            'brand_id' => $otherBrand->id,
            'name' => 'Other Brand Product',
            'slug' => 'other-brand-product',
            'sku' => 'OBP-02',
            'audience' => 'MEN',
            'design_type' => 'ORIGINAL',
            'wholesale_price' => 100.00,
            'status' => 'published',
        ]);
        $p2->categories()->attach($this->category->id);

        // Product 3: MASTER COPY design type
        $p3 = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Master Copy Product',
            'slug' => 'master-copy-product',
            'sku' => 'MCP-03',
            'audience' => 'MEN',
            'design_type' => 'MASTER COPY',
            'wholesale_price' => 100.00,
            'status' => 'published',
        ]);
        $p3->categories()->attach($this->category->id);

        // Combined filter query
        $url = "/api/v1/products?brand={$this->brand->slug}&audience=MEN&category={$this->category->slug}&design_type=ORIGINAL";
        $response = $this->getJson($url);

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals('target-product', $data[0]['slug']);
        $this->assertEquals('ORIGINAL', $data[0]['design_type']);

        // Query by design_type=MASTER COPY
        $mcResponse = $this->getJson("/api/v1/products?brand={$this->brand->slug}&design_type=MASTER COPY");
        $mcResponse->assertStatus(200);
        $mcData = $mcResponse->json('data');
        $this->assertCount(1, $mcData);
        $this->assertEquals('master-copy-product', $mcData[0]['slug']);

        // Query by alias 'MC'
        $aliasResponse = $this->getJson("/api/v1/products?brand={$this->brand->slug}&design_type=MC");
        $aliasResponse->assertStatus(200);
        $aliasData = $aliasResponse->json('data');
        $this->assertCount(1, $aliasData);
        $this->assertEquals('master-copy-product', $aliasData[0]['slug']);
    }

    public function test_sensitive_cost_price_is_hidden_from_customer_but_visible_to_admin(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Confidential Cost Shirt',
            'slug' => 'confidential-cost-shirt',
            'sku' => 'CONF-01',
            'wholesale_price' => 80.00,
            'cost_price' => 32.50,
            'status' => 'published',
        ]);

        // Unauthenticated visitor
        $guestRes = $this->getJson("/api/v1/products/{$product->slug}");
        $guestRes->assertStatus(200);
        $this->assertNull($guestRes->json('data.costPrice'));

        // Authenticated customer
        $customerRes = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/products/{$product->slug}");
        $customerRes->assertStatus(200);
        $this->assertNull($customerRes->json('data.costPrice'));

        // Authenticated admin
        $adminRes = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$product->slug}");
        $adminRes->assertStatus(200);
        $this->assertEquals(32.50, $adminRes->json('data.costPrice'));
    }

    public function test_customer_cannot_perform_admin_catalog_mutations(): void
    {
        // Product creation
        $resProduct = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/products', [
            'name' => 'Illegal Customer Product',
            'slug' => 'illegal-product',
            'sku' => 'ILL-01',
            'wholesale_price' => 50.00,
        ]);
        $resProduct->assertStatus(403);

        // Category creation
        $resCategory = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/categories', [
            'name' => 'Illegal Category',
        ]);
        $resCategory->assertStatus(403);

        // Brand creation
        $resBrand = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/brands', [
            'name' => 'Illegal Brand',
        ]);
        $resBrand->assertStatus(403);
    }

    public function test_admin_can_create_product_with_design_type(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-JKT-01',
            'name' => 'Admin Created Denim Jacket',
            'slug' => 'admin-created-denim-jacket',
            'sku' => 'ADM-JKT-01',
            'brand_id' => $this->brand->id,
            'audience' => 'MEN',
            'design_type' => 'MASTER COPY',
            'wholesale_price' => 95.00,
            'bulk_threshold' => 50,
            'bulk_price' => 85.00,
            'full_stock_price' => 75.00,
            'cost_price' => 45.00,
            'moq' => 5,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'published',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'slug' => 'admin-created-denim-jacket',
            'design_type' => 'MASTER COPY',
        ]);
    }

    public function test_admin_can_upload_product_image_non_destructively(): void
    {
        Storage::fake('public');

        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Image Test Product',
            'slug' => 'image-test-product',
            'sku' => 'IMG-01',
            'wholesale_price' => 45.00,
            'status' => 'published',
        ]);

        $imageFile = UploadedFile::fake()->image('test_product.jpg', 800, 1000);

        $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/products/{$product->id}/images", [
            'image' => $imageFile,
            'is_primary' => true,
            'alt_text' => 'Front view of test product',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => ['id', 'image_url', 'is_primary', 'sort_order'],
            ]);

        $this->assertDatabaseHas('product_images', [
            'product_id' => $product->id,
            'is_primary' => true,
        ]);
    }

    public function test_uploading_malicious_non_image_file_is_strictly_rejected(): void
    {
        Storage::fake('public');

        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Security Test Product',
            'slug' => 'sec-test-product',
            'sku' => 'SEC-01',
            'wholesale_price' => 45.00,
            'status' => 'published',
        ]);

        // Malicious fake script
        $fakeScript = UploadedFile::fake()->create('malicious.php', 100, 'application/x-php');

        $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/products/{$product->id}/images", [
            'image' => $fakeScript,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    public function test_authoritative_inventory_and_admin_adjustment(): void
    {
        $warehouse = Warehouse::create([
            'code' => 'WH-TEST-01',
            'name' => 'Test Central Warehouse',
            'is_active' => true,
        ]);

        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Inventory Product',
            'slug' => 'inventory-product',
            'sku' => 'INV-01',
            'wholesale_price' => 40.00,
            'status' => 'published',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'INV-01-M',
            'title' => 'Medium',
            'size' => 'M',
            'color' => 'Navy',
            'stock' => 50,
        ]);

        $inventory = Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 50,
        ]);

        // Customer cannot adjust stock
        $resCust = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/admin/inventory/adjust', [
            'inventory_id' => $inventory->id,
            'adjustment_amount' => 20,
            'reason' => 'Unauthorized adjustment',
        ]);
        $resCust->assertStatus(403);

        // Admin can adjust stock
        $resAdmin = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/inventory/adjust', [
            'inventory_id' => $inventory->id,
            'adjustment_amount' => 25,
            'reason' => 'Stock shipment received',
        ]);
        $resAdmin->assertStatus(200);

        $inventory->refresh();
        $this->assertEquals(75, $inventory->quantity);
    }
}
