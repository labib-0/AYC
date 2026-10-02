<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PackageAssortmentMessageBackfillTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Brand $brand;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->brand = Brand::create([
            'name' => 'Ayaan Prime',
            'slug' => 'ayaan-prime',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Denim & Bottoms',
            'slug' => 'denim-bottoms',
            'is_active' => true,
        ]);

        $this->warehouse = \App\Models\Warehouse::create([
            'name' => 'Dhaka WH',
            'code' => 'WH-DHK-01',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    public function test_newly_created_product_automatically_initializes_with_exact_default_message(): void
    {
        $product = Product::create([
            'product_id' => 'AYN-PKG-001',
            'name' => 'Default Message Cargo Pants',
            'slug' => 'default-message-cargo-pants',
            'sku' => 'AYN-PKG-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 35.00,
            'moq' => 10,
            'status' => 'published',
        ]);

        $this->assertEquals(
            Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
            $product->package_assortment_message
        );

        $expectedExact = 'Each package includes a mixed assortment of all available colours and sizes. All listed colours and sizes will be included in the package. Quantity may vary by colour and size due to original surplus stock availability.';
        $this->assertSame($expectedExact, $product->package_assortment_message);
    }

    public function test_newly_created_product_with_whitespace_or_empty_message_gets_exact_default(): void
    {
        $productEmpty = Product::create([
            'product_id' => 'AYN-PKG-002',
            'name' => 'Empty String Product',
            'slug' => 'empty-string-product',
            'sku' => 'AYN-PKG-002',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 25.00,
            'moq' => 10,
            'status' => 'published',
            'package_assortment_message' => '',
        ]);

        $this->assertSame(
            Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
            $productEmpty->package_assortment_message
        );

        $productWhitespace = Product::create([
            'product_id' => 'AYN-PKG-003',
            'name' => 'Whitespace String Product',
            'slug' => 'whitespace-string-product',
            'sku' => 'AYN-PKG-003',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 25.00,
            'moq' => 10,
            'status' => 'published',
            'package_assortment_message' => '    ',
        ]);

        $this->assertSame(
            Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
            $productWhitespace->package_assortment_message
        );
    }

    public function test_custom_message_is_preserved_and_not_overwritten(): void
    {
        $customText = 'Custom buyer note: Pack includes 50% Black and 50% Navy only.';

        $product = Product::create([
            'product_id' => 'AYN-PKG-004',
            'name' => 'Custom Assortment Product',
            'slug' => 'custom-assortment-product',
            'sku' => 'AYN-PKG-004',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 45.00,
            'moq' => 10,
            'status' => 'published',
            'package_assortment_message' => $customText,
        ]);

        $this->assertSame($customText, $product->package_assortment_message);

        // Storefront detail endpoint returns custom message
        $response = $this->getJson('/api/v1/products/' . $product->slug);
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertSame($customText, $data['package_assortment_message']);
        $this->assertSame($customText, $data['packageAssortmentMessage']);
    }

    public function test_storefront_returns_exact_default_message_when_no_custom_message_configured(): void
    {
        $product = Product::create([
            'product_id' => 'AYN-PKG-005',
            'name' => 'No Assortment Configured Shirt',
            'slug' => 'no-assortment-configured-shirt',
            'sku' => 'AYN-PKG-005',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'moq' => 5,
            'status' => 'published',
            'package_assortment_visible' => true,
        ]);

        $response = $this->getJson('/api/v1/products/' . $product->slug);
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertSame(
            Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
            $data['package_assortment_message']
        );
        $this->assertSame(
            Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
            $data['packageAssortmentMessage']
        );
    }

    public function test_admin_api_store_and_update_maintains_message_rules(): void
    {
        // 1. Create product via Admin API without message -> receives default
        $createRes = $this->actingAs($this->admin)->postJson('/api/v1/products', [
            'product_id' => 'AYC-CHN-001',
            'name' => 'API Created Chino',
            'slug' => 'api-created-chino',
            'sku' => 'AYN-CHN-001',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'warehouse_id' => $this->warehouse->id,
            'wholesale_price' => 28.00,
            'full_stock_price' => 24.00,
            'moq' => 10,
            'status' => 'published',
        ]);
        $createRes->assertStatus(201);
        $productId = $createRes->json('data.id');

        $product = Product::findOrFail($productId);
        $this->assertSame(Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE, $product->package_assortment_message);

        // 2. Admin customizes message
        $customText = 'Exclusive assortment: European size scale (38-46).';
        $updateRes = $this->actingAs($this->admin)->putJson('/api/v1/products/' . $productId, [
            'package_assortment_message' => $customText,
        ]);
        $updateRes->assertStatus(200);

        $product->refresh();
        $this->assertSame($customText, $product->package_assortment_message);

        // 3. Admin clears message (empty or whitespace) -> safely restores exact default message
        $resetRes = $this->actingAs($this->admin)->putJson('/api/v1/products/' . $productId, [
            'package_assortment_message' => '   ',
        ]);
        $resetRes->assertStatus(200);

        $product->refresh();
        $this->assertSame(Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE, $product->package_assortment_message);
    }

    public function test_migration_backfill_safely_updates_only_empty_records_and_preserves_custom(): void
    {
        // Force raw database rows to simulate legacy pre-existing data
        \Illuminate\Support\Facades\DB::table('products')->insert([
            [
                'product_id' => 'LEGACY-001',
                'name' => 'Legacy Null Message Product',
                'slug' => 'legacy-null-message-product',
                'sku' => 'LEGACY-SKU-001',
                'brand_id' => $this->brand->id,
                'wholesale_price' => 15.00,
                'moq' => 5,
                'status' => 'published',
                'package_assortment_visible' => true,
                'package_assortment_message' => null,
            ],
            [
                'product_id' => 'LEGACY-002',
                'name' => 'Legacy Empty Message Product',
                'slug' => 'legacy-empty-message-product',
                'sku' => 'LEGACY-SKU-002',
                'brand_id' => $this->brand->id,
                'wholesale_price' => 16.00,
                'moq' => 5,
                'status' => 'published',
                'package_assortment_visible' => false,
                'package_assortment_message' => '',
            ],
            [
                'product_id' => 'LEGACY-003',
                'name' => 'Legacy Whitespace Message Product',
                'slug' => 'legacy-whitespace-message-product',
                'sku' => 'LEGACY-SKU-003',
                'brand_id' => $this->brand->id,
                'wholesale_price' => 17.00,
                'moq' => 5,
                'status' => 'published',
                'package_assortment_visible' => true,
                'package_assortment_message' => "   \t  \n  ",
            ],
            [
                'product_id' => 'LEGACY-004',
                'name' => 'Legacy Custom Message Product',
                'slug' => 'legacy-custom-message-product',
                'sku' => 'LEGACY-SKU-004',
                'brand_id' => $this->brand->id,
                'wholesale_price' => 18.00,
                'moq' => 5,
                'status' => 'published',
                'package_assortment_visible' => false,
                'package_assortment_message' => 'Original custom allocation: 2 Red, 2 Blue, 1 Black.',
            ],
        ]);

        // Run the backfill migration logic
        $migration = require database_path('migrations/2026_10_02_160000_backfill_package_assortment_message_on_products.php');
        $migration->up();

        // 1. Verify NULL product is backfilled
        $p1 = Product::where('sku', 'LEGACY-SKU-001')->firstOrFail();
        $this->assertSame(Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE, $p1->package_assortment_message);
        $this->assertSame(15.00, (float) $p1->wholesale_price);
        $this->assertSame('Legacy Null Message Product', $p1->name);

        // 2. Verify empty string product is backfilled
        $p2 = Product::where('sku', 'LEGACY-SKU-002')->firstOrFail();
        $this->assertSame(Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE, $p2->package_assortment_message);
        $this->assertFalse($p2->package_assortment_visible);

        // 3. Verify whitespace-only product is backfilled
        $p3 = Product::where('sku', 'LEGACY-SKU-003')->firstOrFail();
        $this->assertSame(Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE, $p3->package_assortment_message);

        // 4. Verify custom message product is PRESERVED EXACTLY
        $p4 = Product::where('sku', 'LEGACY-SKU-004')->firstOrFail();
        $this->assertSame('Original custom allocation: 2 Red, 2 Blue, 1 Black.', $p4->package_assortment_message);
        $this->assertSame(18.00, (float) $p4->wholesale_price);
    }
}

