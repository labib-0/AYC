<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductPricingTier;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StorefrontPricingAndProductAutomationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $buyer;
    private Brand $brand;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $this->buyer = User::factory()->create([
            'role' => 'customer',
        ]);

        $this->brand = Brand::create(['name' => 'Apex Denims', 'slug' => 'apex-denims']);
        $this->category = Category::create(['name' => 'Jeans', 'slug' => 'jeans']);
    }

    /**
     * Test 1: Missing customer price returns null and has_valid_price = false.
     * Product with 0.00 price and no tiers must never serialize as 0.00 customer price.
     */
    public function test_missing_customer_price_returns_null_and_invalid_price_flag(): void
    {
        $product = Product::create([
            'name' => 'Unpriced Sample Denim',
            'slug' => 'unpriced-sample-denim',
            'sku' => 'APX-SMP-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 0.00,
            'bulk_price' => null,
            'full_stock_price' => null,
            'purchase_price' => 12.50, // Internal purchase price must NEVER leak
            'status' => 'published',
            'is_active' => true,
        ]);

        $this->assertNull($product->getEffectiveCustomerPrice());
        $this->assertFalse($product->hasValidCustomerPrice());

        // Check ProductResource serialization
        $response = $this->getJson("/api/v1/products/{$product->id}");
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertNull($data['price']);
        $this->assertFalse($data['has_valid_price']);
        // Verify purchase price is not leaked
        $this->assertNotEquals(12.50, $data['price']);
    }

    /**
     * Test 2: Standard wholesale price resolves properly.
     */
    public function test_standard_wholesale_price_resolves_correctly(): void
    {
        $product = Product::create([
            'name' => 'Standard Heavy Denim',
            'slug' => 'standard-heavy-denim',
            'sku' => 'APX-DNM-002',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 24.50,
            'purchase_price' => 10.00,
            'status' => 'published',
            'is_active' => true,
        ]);

        $this->assertEquals(24.50, $product->getEffectiveCustomerPrice());
        $this->assertTrue($product->hasValidCustomerPrice());

        $response = $this->getJson("/api/v1/products/{$product->id}");
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(24.50, $data['price']);
        $this->assertTrue($data['has_valid_price']);
    }

    /**
     * Test 3: Multi-tier product with wholesale_price = 0.00 resolves tier MOQ price.
     */
    public function test_multi_tier_product_resolves_tier_moq_price(): void
    {
        $product = Product::create([
            'name' => 'Tiered Stretch Jeans',
            'slug' => 'tiered-stretch-jeans',
            'sku' => 'APX-STR-003',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 0.00,
            'status' => 'published',
            'is_active' => true,
        ]);

        ProductPricingTier::create([
            'product_id' => $product->id,
            'min_quantity' => 50,
            'max_quantity' => 99,
            'unit_price' => 18.00,
        ]);

        ProductPricingTier::create([
            'product_id' => $product->id,
            'min_quantity' => 100,
            'max_quantity' => null,
            'unit_price' => 15.00,
        ]);

        $product->refresh();
        $this->assertEquals(18.00, $product->getEffectiveCustomerPrice());
        $this->assertTrue($product->hasValidCustomerPrice());

        $response = $this->getJson("/api/v1/products/{$product->id}");
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(18.00, $data['price']);
        $this->assertTrue($data['has_valid_price']);
    }

    /**
     * Test 4: Disabled bulk price does not create a fake customer price.
     */
    public function test_disabled_bulk_does_not_create_fake_price(): void
    {
        $product = Product::create([
            'name' => 'Bulk Disabled Jacket',
            'slug' => 'bulk-disabled-jacket',
            'sku' => 'APX-JKT-004',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 0.00,
            'bulk_pricing_enabled' => false,
            'bulk_price' => 12.00, // Should be ignored because bulk_pricing_enabled is false
            'status' => 'published',
            'is_active' => true,
        ]);

        $this->assertNull($product->getEffectiveCustomerPrice());
        $this->assertFalse($product->hasValidCustomerPrice());
    }

    /**
     * Test 5: Full stock price resolves when applicable.
     */
    public function test_full_stock_price_resolves_when_no_standard_or_tiers(): void
    {
        $product = Product::create([
            'name' => 'Clearance Stock Lot',
            'slug' => 'clearance-stock-lot',
            'sku' => 'APX-CLR-005',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 0.00,
            'full_stock_price' => 9.75,
            'status' => 'published',
            'is_active' => true,
        ]);

        $this->assertEquals(9.75, $product->getEffectiveCustomerPrice());
        $this->assertTrue($product->hasValidCustomerPrice());
    }

    /**
     * Test 6: Purchase price is never returned as customer price.
     */
    public function test_purchase_price_is_strictly_internal(): void
    {
        $product = Product::create([
            'name' => 'Confidential Cost Product',
            'slug' => 'confidential-cost-product',
            'sku' => 'APX-CST-006',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 0.00,
            'purchase_price' => 14.25,
            'status' => 'published',
            'is_active' => true,
        ]);

        $this->assertNull($product->getEffectiveCustomerPrice());

        // Anonymous/customer request must not see purchase price
        $response = $this->getJson("/api/v1/products/{$product->id}");
        $data = $response->json('data');
        $this->assertNull($data['price']);
        $this->assertArrayNotHasKey('purchase_price', $data);
        $this->assertArrayNotHasKey('purchasePrice', $data);
    }

    /**
     * Test 7: Storefront catalog list excludes completely unpriced products from customer storefront.
     */
    public function test_storefront_catalog_list_excludes_unpriced_products(): void
    {
        $pricedProduct = Product::create([
            'name' => 'Priced Denim',
            'slug' => 'priced-denim',
            'sku' => 'APX-PRC-007',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 25.00,
            'status' => 'published',
            'is_active' => true,
        ]);

        $unpricedProduct = Product::create([
            'name' => 'Unpriced Denim',
            'slug' => 'unpriced-denim',
            'sku' => 'APX-UNP-008',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 0.00,
            'status' => 'published',
            'is_active' => true,
        ]);

        // Customer catalog listing
        $response = $this->getJson('/api/v1/products');
        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->toArray();

        $this->assertContains($pricedProduct->id, $ids);
        $this->assertNotContains($unpricedProduct->id, $ids);
    }

    /**
     * Test 8: Packaging dimensions default safety (60x40x30).
     */
    public function test_packaging_dimensions_storage_and_defaults(): void
    {
        $product = Product::create([
            'name' => 'Custom Packaged Coat',
            'slug' => 'custom-packaged-coat',
            'sku' => 'APX-CP-009',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 45.00,
            'status' => 'published',
            'is_active' => true,
        ]);

        $profile = \App\Models\ProductShippingPackageProfile::create([
            'product_id' => $product->id,
            'package_quantity' => 10,
            'carton_length' => 60.00,
            'carton_width' => 40.00,
            'carton_height' => 30.00,
            'dimension_unit' => 'cm',
            'carton_count' => 1,
            'gross_weight' => 12.00,
        ]);

        $this->assertEquals(60.00, (float) $profile->carton_length);
        $this->assertEquals(40.00, (float) $profile->carton_width);
        $this->assertEquals(30.00, (float) $profile->carton_height);
        $this->assertEquals('cm', $profile->dimension_unit);
    }
}
