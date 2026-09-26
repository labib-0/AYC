<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductSlugReuseTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Brand $brand;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Store Admin',
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->brand = Brand::create(['name' => 'Test Brand', 'slug' => 'test-brand']);
        $this->category = Category::create(['name' => 'Shirts', 'slug' => 'shirts']);
    }

    /**
     * Test that deleting a product via DELETE /api/v1/products/{id}
     * releases its slug and permits creating a brand new product with the same slug.
     */
    public function test_deleting_product_releases_slug_and_allows_reusing_same_slug(): void
    {
        // 1. Create initial product with slug 'test-resilience-shirt'
        $createRes1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'name' => 'Original Resilience Shirt',
            'slug' => 'test-resilience-shirt',
            'sku' => 'RES-SHIRT-001',
            'wholesale_price' => 22.00,
            'moq' => 20,
            'brand_id' => $this->brand->id,
            'category_ids' => [$this->category->id],
        ]);
        $createRes1->assertStatus(201);
        $productId1 = $createRes1->json('data.id');

        // 2. Attempting to create duplicate slug while active fails with 422
        $dupRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'name' => 'Another Shirt',
            'slug' => 'test-resilience-shirt',
            'sku' => 'RES-SHIRT-DUP',
            'wholesale_price' => 22.00,
            'moq' => 20,
        ]);
        $dupRes->assertStatus(422);
        $dupRes->assertJsonValidationErrors(['slug']);

        // 3. Delete the product
        $deleteRes = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/products/{$productId1}");
        $deleteRes->assertStatus(200);

        // Verify the deleted product's slug has been released with -deleted- suffix
        $deletedProduct = Product::withTrashed()->find($productId1);
        $this->assertNotNull($deletedProduct->deleted_at);
        $this->assertStringContainsString('-deleted-', $deletedProduct->slug);
        $this->assertNotEquals('test-resilience-shirt', $deletedProduct->slug);

        // 4. NOW REUSE THE EXACT SAME SLUG 'test-resilience-shirt'
        $createRes2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'name' => 'New Resilience Shirt',
            'slug' => 'test-resilience-shirt',
            'sku' => 'RES-SHIRT-002',
            'wholesale_price' => 25.00,
            'moq' => 20,
            'brand_id' => $this->brand->id,
            'category_ids' => [$this->category->id],
        ]);
        $createRes2->assertStatus(201);
        $productId2 = $createRes2->json('data.id');
        $this->assertEquals('test-resilience-shirt', $createRes2->json('data.slug'));
        $this->assertNotEquals($productId1, $productId2);

        // 5. Viewing by slug returns the new product
        $showRes = $this->getJson('/api/v1/products/test-resilience-shirt');
        $showRes->assertStatus(200);
        $this->assertEquals($productId2, $showRes->json('data.id'));
        $this->assertEquals('New Resilience Shirt', $showRes->json('data.name'));
    }

    /**
     * Test that direct model-level soft delete ($product->delete())
     * automatically frees the slug and SKU via Eloquent deleting hook.
     */
    public function test_model_soft_delete_lifecycle_hook_frees_slug_and_sku(): void
    {
        $product = Product::create([
            'name' => 'Model Hook Shirt',
            'slug' => 'hook-test-shirt',
            'sku' => 'HOOK-SKU-001',
            'wholesale_price' => 30.00,
            'moq' => 10,
        ]);

        $productId = $product->id;
        $product->delete();

        $fresh = Product::withTrashed()->find($productId);
        $this->assertNotNull($fresh->deleted_at);
        $this->assertStringContainsString('hook-test-shirt-deleted-', $fresh->slug);
        $this->assertStringContainsString('HOOK-SKU-001-del-', $fresh->sku);

        // Can immediately create a new product reusing 'hook-test-shirt'
        $newProduct = Product::create([
            'name' => 'Reused Hook Shirt',
            'slug' => 'hook-test-shirt',
            'sku' => 'HOOK-SKU-001',
            'wholesale_price' => 35.00,
            'moq' => 10,
        ]);

        $this->assertEquals('hook-test-shirt', $newProduct->slug);
        $this->assertEquals('HOOK-SKU-001', $newProduct->sku);
    }

    /**
     * Test updating a product to take a slug that belonged to a deleted product.
     */
    public function test_update_product_can_take_slug_of_deleted_product(): void
    {
        // 1. Create and delete product A
        $productA = Product::create([
            'name' => 'Product A',
            'slug' => 'target-slug-to-reuse',
            'sku' => 'PROD-A-001',
            'wholesale_price' => 20.00,
            'moq' => 10,
        ]);
        $productA->delete();

        // 2. Create product B with a different slug
        $productB = Product::create([
            'name' => 'Product B',
            'slug' => 'initial-product-b-slug',
            'sku' => 'PROD-B-001',
            'wholesale_price' => 20.00,
            'moq' => 10,
        ]);

        // 3. Update product B to use product A's former slug
        $updateRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$productB->id}", [
            'slug' => 'target-slug-to-reuse',
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals('target-slug-to-reuse', $updateRes->json('data.slug'));
    }
}
