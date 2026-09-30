<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductPackageAllocation;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductPackageAssortmentAndSpecificationsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Brand $brand;
    private Category $category;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Store Admin',
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->brand = Brand::create(['name' => 'Ayaan Luxury', 'slug' => 'ayaan-luxury']);
        $this->category = Category::create(['name' => 'Denim', 'slug' => 'denim']);
        $this->warehouse = Warehouse::create([
            'name' => 'Dhaka WH',
            'code' => 'WH-DHK',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    public function test_admin_can_save_manual_size_and_colour_specifications_independent_of_variants(): void
    {
        $payload = [
            'product_id' => 'AYC-DNM-001',
            'name' => 'Raw Selvedge Denim',
            'slug' => 'raw-selvedge-denim',
            'sku' => 'AYN-DNM-001',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 50.00,
            'bulk_threshold' => 50,
            'bulk_price' => 45.00,
            'full_stock_price' => 40.00,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 10,
            'status' => 'published',
            'design_type' => 'ORIGINAL',
            'material' => '100% Japanese Selvedge Cotton',
            'size_description' => '28–38',
            'colour_description' => 'Olive, Red, Navy',
            'variants' => [
                ['color' => 'Indigo', 'size' => '30', 'stock' => 10],
                ['color' => 'Indigo', 'size' => '32', 'stock' => 10],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $product = Product::where('slug', 'raw-selvedge-denim')->firstOrFail();
        $this->assertEquals('28–38', $product->size_description);
        $this->assertEquals('Olive, Red, Navy', $product->colour_description);
        $this->assertEquals('100% Japanese Selvedge Cotton', $product->material);
        $this->assertEquals('ORIGINAL', $product->design_type);

        // Verify that variants did NOT overwrite or get populated into size_description or colour_description
        $this->assertNotEquals('30, 32', $product->size_description);
        $this->assertNotEquals('Indigo', $product->colour_description);

        // Verify public API returns these specifications
        $publicRes = $this->getJson('/api/v1/products/' . $product->slug);
        $publicRes->assertStatus(200);
        $data = $publicRes->json('data');

        $this->assertEquals('28–38', $data['size_description']);
        $this->assertEquals('28–38', $data['sizeDescription']);
        $this->assertEquals('Olive, Red, Navy', $data['colour_description']);
        $this->assertEquals('Olive, Red, Navy', $data['colourDescription']);
        $this->assertEquals('ORIGINAL', $data['design_type']);
        $this->assertEquals('100% Japanese Selvedge Cotton', $data['material']);
    }

    public function test_package_assortment_visibility_does_not_affect_product_storefront_visibility(): void
    {
        $product = Product::create([
            'product_id' => 'AYC-DNM-002',
            'name' => 'Hidden Assortment Cargo Pants',
            'slug' => 'hidden-assortment-cargo-pants',
            'sku' => 'AYN-DNM-002',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 35.00,
            'bulk_threshold' => 50,
            'bulk_price' => 32.00,
            'full_stock_price' => 30.00,
            'moq' => 10,
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'package_assortment_visible' => false,
            'package_assortment_message' => 'Custom surplus package allocation note for buyers.',
        ]);

        $this->assertFalse($product->package_assortment_visible);
        $this->assertFalse($product->is_hidden_from_storefront);

        // Product MUST still appear in public product list
        $listRes = $this->getJson('/api/v1/products');
        $listRes->assertStatus(200);
        $slugs = collect($listRes->json('data'))->pluck('slug')->all();
        $this->assertContains('hidden-assortment-cargo-pants', $slugs);

        // Product MUST still be viewable publicly
        $detailRes = $this->getJson('/api/v1/products/' . $product->slug);
        $detailRes->assertStatus(200);
        $data = $detailRes->json('data');
        $this->assertFalse($data['package_assortment_visible']);
        $this->assertEquals('Custom surplus package allocation note for buyers.', $data['package_assortment_message']);
    }

    public function test_public_storefront_redacts_package_allocations_when_package_assortment_hidden(): void
    {
        $product = Product::create([
            'product_id' => 'AYC-DNM-003',
            'name' => 'Redacted Assortment Jeans',
            'slug' => 'redacted-assortment-jeans',
            'sku' => 'AYN-DNM-003',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 35.00,
            'bulk_threshold' => 50,
            'bulk_price' => 32.00,
            'full_stock_price' => 30.00,
            'moq' => 10,
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'package_assortment_visible' => false,
            'package_assortment_message' => 'Surplus pack note.',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Navy / 32',
            'color' => 'Navy',
            'size' => '32',
            'stock' => 50,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'package_name' => 'Universal Package',
            'product_variant_id' => $variant->id,
            'quantity' => 10,
        ]);

        // Unauthenticated customer query
        $detailRes = $this->getJson('/api/v1/products/' . $product->slug);
        $detailRes->assertStatus(200);
        $data = $detailRes->json('data');

        $this->assertFalse($data['package_assortment_visible']);
        $this->assertEmpty($data['package_allocations']);
        $this->assertEquals('Surplus pack note.', $data['package_assortment_message']);
    }

    public function test_admin_can_view_package_allocations_even_when_package_assortment_hidden(): void
    {
        $product = Product::create([
            'product_id' => 'AYC-DNM-004',
            'name' => 'Admin Visible Assortment Jeans',
            'slug' => 'admin-visible-assortment-jeans',
            'sku' => 'AYN-DNM-004',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 35.00,
            'bulk_threshold' => 50,
            'bulk_price' => 32.00,
            'full_stock_price' => 30.00,
            'moq' => 10,
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'package_assortment_visible' => false,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Navy / 32',
            'color' => 'Navy',
            'size' => '32',
            'stock' => 50,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'package_name' => 'Universal Package',
            'product_variant_id' => $variant->id,
            'quantity' => 10,
        ]);

        $adminRes = $this->actingAs($this->admin)->getJson('/api/v1/products/' . $product->slug);
        $adminRes->assertStatus(200);
        $adminData = $adminRes->json('data');

        $this->assertNotEmpty($adminData['package_allocations']);
        $this->assertEquals(10, $adminData['package_allocations'][0]['quantity']);
    }

    public function test_default_package_assortment_message_fallback_when_hidden_and_no_custom_message(): void
    {
        $product = Product::create([
            'product_id' => 'AYC-DNM-005',
            'name' => 'Default Fallback Jeans',
            'slug' => 'default-fallback-jeans',
            'sku' => 'AYN-DNM-005',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 40.00,
            'bulk_threshold' => 50,
            'bulk_price' => 38.00,
            'full_stock_price' => 35.00,
            'moq' => 10,
            'status' => 'published',
            'package_assortment_visible' => false,
            'package_assortment_message' => null,
        ]);

        $detailRes = $this->getJson('/api/v1/products/' . $product->slug);
        $detailRes->assertStatus(200);
        $data = $detailRes->json('data');

        $this->assertFalse($data['package_assortment_visible']);
        $this->assertStringContainsString('Each package includes a mixed assortment of all available colours and sizes.', $data['package_assortment_message']);
    }

    public function test_admin_can_update_package_assortment_visibility_and_custom_message(): void
    {
        $product = Product::create([
            'product_id' => 'AYC-DNM-006',
            'name' => 'Updating Product',
            'slug' => 'updating-product',
            'sku' => 'AYN-DNM-006',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 40.00,
            'bulk_threshold' => 50,
            'bulk_price' => 38.00,
            'full_stock_price' => 35.00,
            'moq' => 10,
            'status' => 'published',
            'package_assortment_visible' => true,
        ]);

        $updatePayload = [
            'package_assortment_visible' => false,
            'package_assortment_message' => 'Newly updated custom message.',
            'size_description' => 'S to XXL',
            'colour_description' => 'Charcoal & Sand',
        ];

        $response = $this->actingAs($this->admin)->putJson('/api/v1/products/' . $product->id, $updatePayload);
        $response->assertStatus(200);

        $product->refresh();
        $this->assertFalse($product->package_assortment_visible);
        $this->assertEquals('Newly updated custom message.', $product->package_assortment_message);
        $this->assertEquals('S to XXL', $product->size_description);
        $this->assertEquals('Charcoal & Sand', $product->colour_description);
    }
}
