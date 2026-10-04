<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierManagementAndProductIntegrationTest extends TestCase
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
            'email' => 'customer@buyer.com',
            'role' => 'customer',
            'is_super_admin' => false,
        ]);

        $this->brand = Brand::create([
            'name' => 'Ayaan Export',
            'slug' => 'ayaan-export',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Hoodies',
            'slug' => 'hoodies',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'name' => 'Uttara Hub',
            'code' => 'WH-UTTARA-01',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * Test: Admin can search suppliers by name or code.
     */
    public function test_admin_can_search_suppliers_by_name_and_code(): void
    {
        Supplier::create([
            'code' => 'SUP-001',
            'name' => 'Dhaka Apparel Mills',
            'is_active' => true,
        ]);

        Supplier::create([
            'code' => 'SUP-002',
            'name' => 'Chittagong Textile Holdings',
            'is_active' => true,
        ]);

        Supplier::create([
            'code' => 'SUP-003',
            'name' => 'Inactive Vendor Ltd',
            'is_active' => false,
        ]);

        // Search by code
        $resCode = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/suppliers?q=SUP-001');
        $resCode->assertStatus(200);
        $dataCode = $resCode->json('data.data');
        $this->assertCount(1, $dataCode);
        $this->assertEquals('SUP-001', $dataCode[0]['code']);

        // Search by name
        $resName = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/suppliers?q=Chittagong');
        $resName->assertStatus(200);
        $dataName = $resName->json('data.data');
        $this->assertCount(1, $dataName);
        $this->assertEquals('SUP-002', $dataName[0]['code']);

        // Inactive excluded by default
        $resAll = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/suppliers');
        $resAll->assertStatus(200);
        $this->assertCount(2, $resAll->json('data.data'));
    }

    /**
     * Test: Non-admin is forbidden from accessing supplier search.
     */
    public function test_customer_cannot_access_supplier_search(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/suppliers');
        $response->assertStatus(403);
    }

    /**
     * Test: Associate supplier with product on create and update, and verify public storefront hides supplier.
     */
    public function test_product_supplier_association_and_public_isolation(): void
    {
        $supplier = Supplier::create([
            'code' => 'SUP-100',
            'name' => 'Apex Garments',
            'is_active' => true,
        ]);

        // Create product with supplier
        $createRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'product_id' => 'AY-TEST-SUP-1',
                'name' => 'Supplier Test Hoodie',
                'slug' => 'supplier-test-hoodie',
                'sku' => 'AY-STH-01',
                'brand_id' => $this->brand->id,
                'categories' => [$this->category->id],
                'supplier_id' => $supplier->id,
                'wholesale_price' => 20.00,
                'full_stock_price' => 18.00,
                'moq' => 10,
                'stock' => 100,
                'warehouse_id' => $this->warehouse->id,
                'status' => 'published',
            ]);

        $createRes->assertStatus(201);
        $prodData = $createRes->json('data');
        $this->assertEquals($supplier->id, $prodData['supplier_id']);
        $this->assertEquals('Apex Garments', $prodData['supplier']['name']);

        $productId = $prodData['id'];

        // Admin view product: supplier must be present
        $adminView = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/products/{$productId}");
        $adminView->assertStatus(200);
        $this->assertEquals($supplier->id, $adminView->json('data.supplier_id'));
        $this->assertEquals('SUP-100', $adminView->json('data.supplier.code'));

        // Customer view: supplier MUST NOT be exposed
        $publicView = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/products/{$productId}");
        $publicView->assertStatus(200);
        $this->assertArrayNotHasKey('supplier_id', $publicView->json('data'));
        $this->assertArrayNotHasKey('supplierId', $publicView->json('data'));
        $this->assertArrayNotHasKey('supplier', $publicView->json('data'));

        // Update with another supplier
        $supplier2 = Supplier::create([
            'code' => 'SUP-200',
            'name' => 'Global Knitwear',
            'is_active' => true,
        ]);

        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'supplier_id' => $supplier2->id,
            ]);

        $updateRes->assertStatus(200);
        $this->assertEquals($supplier2->id, $updateRes->json('data.supplier_id'));
        $this->assertEquals('Global Knitwear', $updateRes->json('data.supplier.name'));

        // Clear supplier
        $clearRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'supplier_id' => null,
            ]);
        $clearRes->assertStatus(200);
        $this->assertNull($clearRes->json('data.supplier_id'));
        $this->assertNull($clearRes->json('data.supplier'));
    }

    /**
     * Test: Repeated primary photo replacement properly updates primary image and ensures exactly one primary image.
     */
    public function test_repeated_primary_image_replacement_uniqueness(): void
    {
        $product = Product::create([
            'product_id' => 'AY-IMG-TEST',
            'name' => 'Image Replacement Polo',
            'slug' => 'image-replacement-polo',
            'sku' => 'AY-IRP-01',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 25.00,
            'status' => 'published',
        ]);

        // Initial image A
        $res1 = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'images' => [
                    'https://ayaanclothing.com/storage/products/imageA.webp',
                ],
            ]);
        $res1->assertStatus(200);
        $this->assertEquals(1, $product->images()->count());
        $this->assertEquals(1, $product->images()->where('is_primary', true)->count());
        $this->assertEquals('https://ayaanclothing.com/storage/products/imageA.webp', $product->images()->where('is_primary', true)->first()->image_url);

        // Replacement 1: Image B becomes primary, Image A becomes second
        $res2 = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'images' => [
                    'https://ayaanclothing.com/storage/products/imageB.webp',
                    'https://ayaanclothing.com/storage/products/imageA.webp',
                ],
            ]);
        $res2->assertStatus(200);
        $this->assertEquals(2, $product->images()->count());
        $this->assertEquals(1, $product->images()->where('is_primary', true)->count());
        $this->assertEquals('https://ayaanclothing.com/storage/products/imageB.webp', $product->images()->where('is_primary', true)->first()->image_url);

        // Replacement 2: Image C becomes primary, Image B second, Image A third
        $res3 = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'images' => [
                    'https://ayaanclothing.com/storage/products/imageC.webp',
                    'https://ayaanclothing.com/storage/products/imageB.webp',
                    'https://ayaanclothing.com/storage/products/imageA.webp',
                ],
            ]);
        $res3->assertStatus(200);
        $this->assertEquals(3, $product->images()->count());
        $this->assertEquals(1, $product->images()->where('is_primary', true)->count());
        $this->assertEquals('https://ayaanclothing.com/storage/products/imageC.webp', $product->images()->where('is_primary', true)->first()->image_url);
    }
}
