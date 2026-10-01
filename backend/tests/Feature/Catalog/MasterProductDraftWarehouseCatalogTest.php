<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * MASTER PROMPT TEST SUITE — FIX DEFAULT WAREHOUSE, DRAFT SAVE WORKFLOW, AND PRODUCT CATALOG DRAFT FILTER
 */
class MasterProductDraftWarehouseCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected Warehouse $warehouse1;
    protected Warehouse $warehouse2;
    protected Brand $brand;
    protected Category $category;
    protected User $admin;
    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->warehouse1 = Warehouse::create([
            'name' => 'Uttara Warehouse',
            'code' => 'WH-UTTARA-01',
            'city' => 'Uttara, Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->warehouse2 = Warehouse::create([
            'name' => 'Chittagong Port Warehouse',
            'code' => 'WH-CTG-01',
            'city' => 'Chittagong',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->brand = Brand::factory()->create([
            'name' => 'Master Brand',
            'slug' => 'master-brand-' . uniqid(),
            'is_active' => true,
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Master Apparel',
            'slug' => 'master-apparel-' . uniqid(),
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_test_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'customer_test_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    /**
     * TEST 1 & 2: Minimal Draft Creation with ONLY Product ID
     */
    public function test_01_save_draft_with_only_product_id_succeeds_without_fake_data(): void
    {
        $payload = [
            'product_id' => 'AY-1001',
            'status' => 'draft',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.productId', 'AY-1001')
            ->assertJsonPath('data.status', 'draft');

        $productId = $response->json('data.id');
        $product = Product::find($productId);
        $this->assertNotNull($product);

        $this->assertEquals('AY-1001', $product->product_id);
        $this->assertEquals('draft', $product->status);
        $this->assertNull($product->wholesale_price);
        $this->assertNull($product->moq);
        $this->assertTrue($product->stock === null || $product->stock === 0);

        // Assert NO warehouse or inventory records were fabricated
        $this->assertDatabaseMissing('inventories', [
            'product_id' => $product->id,
        ]);
        $this->assertCount(0, $product->directInventories);
        $this->assertCount(0, $product->variants);
    }

    /**
     * TEST 3: Save Draft with Partial Data (Product ID + Name only)
     */
    public function test_02_save_draft_with_partial_data_succeeds(): void
    {
        $payload = [
            'product_id' => 'AY-1002',
            'name' => 'Minimal Summer Tee',
            'status' => 'draft',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $product = Product::where('product_id', 'AY-1002')->first();
        $this->assertNotNull($product);
        $this->assertEquals('Minimal Summer Tee', $product->name);
        $this->assertEquals('draft', $product->status);
        $this->assertNull($product->wholesale_price);
    }

    /**
     * TEST 4: Missing Product ID fails Save Draft
     */
    public function test_03_missing_product_id_fails_draft_validation(): void
    {
        $payload = [
            'name' => 'No Product ID Tee',
            'status' => 'draft',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_id']);
    }

    /**
     * TEST 5: Duplicate Product ID fails Save Draft
     */
    public function test_04_duplicate_product_id_fails_uniqueness(): void
    {
        // First draft
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AY-UNIQUE-01',
            'status' => 'draft',
        ])->assertStatus(201);

        // Second draft with same ID
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AY-UNIQUE-01',
            'status' => 'draft',
        ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['product_id']);
    }

    /**
     * TEST 6: Product ID with spaces/slashes is normalized properly
     */
    public function test_05_product_id_spaces_normalized_and_slashes_supported(): void
    {
        $payload = [
            'product_id' => 'AY / 2026 - A ',
            'status' => 'draft',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $this->assertEquals('AY/2026-A', $response->json('data.productId'));

        $this->assertDatabaseHas('products', [
            'product_id' => 'AY/2026-A',
        ]);
    }

    /**
     * TEST 7, 8, 9, 10, 11: Warehouse is NOT auto-selected; Admin can assign warehouse later
     */
    public function test_06_draft_warehouse_lifecycle_starts_empty_and_assigns_later(): void
    {
        // 1. Initial draft without warehouse
        $createRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AY-WH-FLOW',
            'status' => 'draft',
        ]);
        $createRes->assertStatus(201);
        $id = $createRes->json('data.id');

        $this->assertDatabaseMissing('inventories', [
            'product_id' => $id,
        ]);

        // 2. Admin later edits draft and selects warehouse with stock
        $updateRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$id}", [
            'status' => 'draft',
            'warehouse_id' => $this->warehouse1->id,
            'stock' => 150,
        ]);
        $updateRes->assertStatus(200);

        // Verify inventory row was created for chosen warehouse
        $this->assertDatabaseHas('inventories', [
            'product_id' => $id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 150,
        ]);

        // 3. Admin switches to warehouse 2
        $updateRes2 = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$id}", [
            'status' => 'draft',
            'warehouse_id' => $this->warehouse2->id,
            'stock' => 200,
        ]);
        $updateRes2->assertStatus(200);

        $this->assertDatabaseHas('inventories', [
            'product_id' => $id,
            'warehouse_id' => $this->warehouse2->id,
            'quantity' => 200,
        ]);
    }

    /**
     * TEST 12, 13, 14, 15, 16, 17: Product Catalog status=draft filter
     */
    public function test_07_catalog_filters_by_draft_status_accurately(): void
    {
        // Create 2 draft products
        $d1 = Product::create([
            'product_id' => 'CAT-DFT-1',
            'name' => 'Draft Product 1',
            'slug' => 'draft-product-1',
            'sku' => 'SKU-DFT-1',
            'status' => 'draft',
        ]);
        $d2 = Product::create([
            'product_id' => 'CAT-DFT-2',
            'name' => 'Draft Product 2 Searchable',
            'slug' => 'draft-product-2',
            'sku' => 'SKU-DFT-2',
            'status' => 'draft',
        ]);

        // Create 2 published products
        $p1 = Product::create([
            'product_id' => 'CAT-PUB-1',
            'name' => 'Published Product 1',
            'slug' => 'published-product-1',
            'sku' => 'SKU-PUB-1',
            'wholesale_price' => 25.00,
            'full_stock_price' => 20.00,
            'moq' => 10,
            'status' => 'published',
        ]);

        // 1. Query status=draft as admin
        $draftRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?isAdmin=1&status=draft');

        $draftRes->assertStatus(200);
        $draftItems = $draftRes->json('data');

        $draftIds = collect($draftItems)->pluck('productId')->toArray();
        $this->assertContains('CAT-DFT-1', $draftIds);
        $this->assertContains('CAT-DFT-2', $draftIds);
        $this->assertNotContains('CAT-PUB-1', $draftIds);

        // 2. Search within draft products
        $searchRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?isAdmin=1&status=draft&search=Searchable');

        $searchRes->assertStatus(200);
        $searchItems = $searchRes->json('data');
        $this->assertCount(1, $searchItems);
        $this->assertEquals('CAT-DFT-2', $searchItems[0]['productId']);

        // 3. Clear filter (status=all)
        $allRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?isAdmin=1&status=all');

        $allRes->assertStatus(200);
        $allIds = collect($allRes->json('data'))->pluck('productId')->toArray();
        $this->assertContains('CAT-DFT-1', $allIds);
        $this->assertContains('CAT-PUB-1', $allIds);
    }

    /**
     * TEST 18 & 21: Publish validation remains strictly enforced
     */
    public function test_08_publish_from_draft_strictly_enforces_readiness(): void
    {
        // Minimal draft created via API with only Product ID
        $createRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AY-PUB-ENFORCE',
            'status' => 'draft',
        ]);
        $createRes->assertStatus(201);
        $productId = $createRes->json('data.id');

        // Attempting to publish without name, warehouse, wholesale price fails with 422
        $failPublish = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'status' => 'published',
            ]);
        $failPublish->assertStatus(422);

        // Now provide all required publishing data
        $successPublish = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'status' => 'published',
                'name' => 'Complete Production Garment',
                'wholesale_price' => 35.00,
                'full_stock_price' => 28.00,
                'warehouse_id' => $this->warehouse1->id,
                'stock' => 500,
                'moq' => 20,
            ]);

        $successPublish->assertStatus(200)
            ->assertJsonPath('data.status', 'published');

        $product = Product::find($productId);
        $this->assertEquals('published', $product->status);
        $this->assertEquals('Complete Production Garment', $product->name);

        // Product is now published: excluded from status=draft query
        $draftRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?isAdmin=1&status=draft');
        $draftIds = collect($draftRes->json('data'))->pluck('productId')->toArray();
        $this->assertNotContains('AY-PUB-ENFORCE', $draftIds);
    }
}
