<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductImageStorageAndPipelineTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Brand $brand;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->brand = Brand::create([
            'name' => 'Ayaan Garments',
            'slug' => 'ayaan-garments',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Polo Shirts',
            'slug' => 'polo-shirts',
            'is_active' => true,
        ]);
    }

    public function test_admin_can_upload_jpg_image_and_file_is_stored_on_disk(): void
    {
        $file = UploadedFile::fake()->image('shirt.jpg', 800, 1000);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', [
                'folder' => 'products',
                'file' => $file,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertNotEmpty($data['url']);
        $this->assertNotEmpty($data['path']);
        $this->assertStringContainsString('products/', $data['path']);
        $this->assertStringEndsWith('.jpg', $data['path']);
        $this->assertNotEquals(asset('storage'), $data['url']);
        $this->assertStringContainsString('/storage/products/', $data['url']);

        Storage::disk('public')->assertExists($data['path']);
    }

    public function test_admin_can_upload_png_and_webp_images(): void
    {
        $pngFile = UploadedFile::fake()->image('front.png', 600, 800);
        $webpFile = UploadedFile::fake()->image('back.webp', 600, 800);

        $resPng = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', [
                'folder' => 'products',
                'file' => $pngFile,
            ]);
        $resPng->assertStatus(201);
        $pathPng = $resPng->json('data.path');
        Storage::disk('public')->assertExists($pathPng);

        $resWebp = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', [
                'folder' => 'products',
                'file' => $webpFile,
            ]);
        $resWebp->assertStatus(201);
        $pathWebp = $resWebp->json('data.path');
        Storage::disk('public')->assertExists($pathWebp);
    }

    public function test_product_creation_persists_uploaded_images_correctly(): void
    {
        $file1 = UploadedFile::fake()->image('preview1.jpg', 800, 1000);
        $file2 = UploadedFile::fake()->image('preview2.jpg', 800, 1000);

        $res1 = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', ['folder' => 'products', 'file' => $file1]);
        $url1 = $res1->json('data.url');

        $res2 = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', ['folder' => 'products', 'file' => $file2]);
        $url2 = $res2->json('data.url');

        $warehouse = \App\Models\Warehouse::create([
            'name' => 'Main Test Warehouse',
            'code' => 'WH-IMG-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $prodResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'name' => 'Classic Pique Polo',
                'slug' => 'classic-pique-polo-' . uniqid(),
                'sku' => 'SKU-IMG-' . uniqid(),
                'product_id' => 'AYC-2026-TEST-IMG',
                'brand_id' => $this->brand->id,
                'category_id' => $this->category->id,
                'warehouse_id' => $warehouse->id,
                'wholesale_price' => 25.00,
                'bulk_threshold' => 50,
                'bulk_price' => 22.00,
                'full_stock_price' => 20.00,
                'status' => 'draft',
                'images' => [$url1, $url2],
            ]);

        $prodResponse->assertStatus(201);

        $productId = $prodResponse->json('data.id');
        $this->assertDatabaseHas('product_images', [
            'product_id' => $productId,
            'image_url' => $url1,
            'is_primary' => true,
            'sort_order' => 0,
        ]);
        $this->assertDatabaseHas('product_images', [
            'product_id' => $productId,
            'image_url' => $url2,
            'is_primary' => false,
            'sort_order' => 1,
        ]);

        $showResponse = $this->getJson("/api/v1/products/{$productId}");
        $showResponse->assertStatus(200);
        $images = $showResponse->json('data.images');
        $this->assertCount(2, $images);
        $this->assertEquals($url1, $images[0]);
        $this->assertEquals($url2, $images[1]);
    }

    public function test_bare_storage_url_is_rejected_in_product_creation(): void
    {
        $warehouse = \App\Models\Warehouse::create([
            'name' => 'Bare Test Warehouse',
            'code' => 'WH-BARE-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $bareUrl = asset('storage');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'name' => 'Broken Image Product',
                'slug' => 'broken-image-product-' . uniqid(),
                'sku' => 'SKU-BARE-' . uniqid(),
                'product_id' => 'AYC-2026-TEST-BARE',
                'brand_id' => $this->brand->id,
                'category_id' => $this->category->id,
                'warehouse_id' => $warehouse->id,
                'wholesale_price' => 25.00,
                'bulk_threshold' => 50,
                'bulk_price' => 22.00,
                'full_stock_price' => 20.00,
                'status' => 'draft',
                'images' => [$bareUrl, '/storage', '/storage/'],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['images.0', 'images.1', 'images.2']);
    }
}
