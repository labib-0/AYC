<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Http\Resources\Api\V1\ProductResource;
use Illuminate\Http\Request;
use Tests\TestCase;

class LowestCustomerUnitPriceTest extends TestCase
{
    /**
     * CASE A: Standard = $5.00, Bulk = $4.50, Full Stock = $4.20
     * Should return $4.20
     */
    public function test_case_a_full_stock_lowest(): void
    {
        $product = new Product([
            'wholesale_price' => 5.00,
            'moq' => 10,
            'bulk_pricing_enabled' => true,
            'bulk_threshold' => 100,
            'bulk_price' => 4.50,
            'full_stock_price' => 4.20,
        ]);
        // Mock inventory methods
        $product = \Mockery::mock($product)->makePartial();
        $product->shouldReceive('getTotalAvailableStock')->andReturn(500);
        $product->shouldReceive('getCompletePackageStock')->andReturn(500);

        $this->assertEquals(4.20, $product->getLowestCustomerUnitPrice());
    }

    /**
     * CASE B: Standard = $5.00, Bulk = $4.50, Full Stock unavailable
     * Should return $4.50
     */
    public function test_case_b_bulk_lowest_when_full_stock_unavailable(): void
    {
        $product = new Product([
            'wholesale_price' => 5.00,
            'moq' => 10,
            'bulk_pricing_enabled' => true,
            'bulk_threshold' => 100,
            'bulk_price' => 4.50,
            'full_stock_price' => 4.20,
        ]);
        $product = \Mockery::mock($product)->makePartial();
        // Available stock (50) is less than bulk_threshold (100) -> not full stock eligible
        $product->shouldReceive('getTotalAvailableStock')->andReturn(50);
        $product->shouldReceive('getCompletePackageStock')->andReturn(50);

        $this->assertEquals(4.50, $product->getLowestCustomerUnitPrice());
    }

    /**
     * CASE C: Standard = $5.00, Bulk disabled, Full Stock = $4.20
     * Should return $4.20
     */
    public function test_case_c_full_stock_lowest_when_bulk_disabled(): void
    {
        $product = new Product([
            'wholesale_price' => 5.00,
            'moq' => 10,
            'bulk_pricing_enabled' => false,
            'bulk_threshold' => 100,
            'bulk_price' => 4.50,
            'full_stock_price' => 4.20,
        ]);
        $product = \Mockery::mock($product)->makePartial();
        $product->shouldReceive('getTotalAvailableStock')->andReturn(300);
        $product->shouldReceive('getCompletePackageStock')->andReturn(300);

        $this->assertEquals(4.20, $product->getLowestCustomerUnitPrice());
    }

    /**
     * CASE D: Standard = $5.00, Bulk disabled, Full Stock unavailable
     * Should return $5.00
     */
    public function test_case_d_standard_fallback_when_bulk_disabled_and_full_stock_unavailable(): void
    {
        $product = new Product([
            'wholesale_price' => 5.00,
            'moq' => 50,
            'bulk_pricing_enabled' => false,
            'full_stock_price' => 4.20,
        ]);
        $product = \Mockery::mock($product)->makePartial();
        // Stock 0 -> full stock ineligible
        $product->shouldReceive('getTotalAvailableStock')->andReturn(0);
        $product->shouldReceive('getCompletePackageStock')->andReturn(0);

        $this->assertEquals(5.00, $product->getLowestCustomerUnitPrice());
    }

    /**
     * CASE E: Standard = $5.00, Bulk = NULL, Full Stock = NULL
     * Should return $5.00
     */
    public function test_case_e_standard_when_no_tiers_configured(): void
    {
        $product = new Product([
            'wholesale_price' => 5.00,
            'moq' => 10,
            'bulk_pricing_enabled' => false,
            'bulk_price' => null,
            'full_stock_price' => null,
        ]);
        $product = \Mockery::mock($product)->makePartial();
        $product->shouldReceive('getTotalAvailableStock')->andReturn(100);
        $product->shouldReceive('getCompletePackageStock')->andReturn(100);

        $this->assertEquals(5.00, $product->getLowestCustomerUnitPrice());
    }

    /**
     * CASE F: Standard = NULL, Bulk disabled, Full Stock unavailable
     * Should return NULL (Never 0.00!)
     */
    public function test_case_f_never_return_zero_when_no_price(): void
    {
        $product = new Product([
            'wholesale_price' => null,
            'cost_price' => 2.50, // Internal cost price must never leak!
            'moq' => 10,
            'bulk_pricing_enabled' => false,
            'full_stock_price' => null,
        ]);
        $product = \Mockery::mock($product)->makePartial();
        $product->shouldReceive('getTotalAvailableStock')->andReturn(100);
        $product->shouldReceive('getCompletePackageStock')->andReturn(100);

        $this->assertNull($product->getLowestCustomerUnitPrice());
    }

    /**
     * CASE G: Standard = $5.00, Bulk = $4.50 but Bulk Pricing disabled
     * Should return $5.00
     */
    public function test_case_g_bulk_disabled_ignored(): void
    {
        $product = new Product([
            'wholesale_price' => 5.00,
            'moq' => 10,
            'bulk_pricing_enabled' => false, // Disabled
            'bulk_threshold' => 100,
            'bulk_price' => 4.50,
            'full_stock_price' => null,
        ]);
        $product = \Mockery::mock($product)->makePartial();
        $product->shouldReceive('getTotalAvailableStock')->andReturn(50);
        $product->shouldReceive('getCompletePackageStock')->andReturn(50);

        $this->assertEquals(5.00, $product->getLowestCustomerUnitPrice());
    }

    /**
     * CASE H: Standard = $5.00, Bulk = $4.50 but invalid Bulk threshold (bulk_threshold <= moq)
     * Should return $5.00
     */
    public function test_case_h_invalid_bulk_threshold_ignored(): void
    {
        $product = new Product([
            'wholesale_price' => 5.00,
            'moq' => 100,
            'bulk_pricing_enabled' => true,
            'bulk_threshold' => 50, // Invalid: threshold <= MOQ
            'bulk_price' => 4.50,
            'full_stock_price' => null,
        ]);
        $product = \Mockery::mock($product)->makePartial();
        $product->shouldReceive('getTotalAvailableStock')->andReturn(200);
        $product->shouldReceive('getCompletePackageStock')->andReturn(200);

        $this->assertEquals(5.00, $product->getLowestCustomerUnitPrice());
    }

    /**
     * Purchase/cost price is never used as fallback.
     */
    public function test_purchase_price_never_used(): void
    {
        $product = new Product([
            'wholesale_price' => 5.00,
            'cost_price' => 2.00, // internal cost
            'purchase_price' => 1.80, // internal purchase price
            'moq' => 10,
        ]);
        $product = \Mockery::mock($product)->makePartial();
        $product->shouldReceive('getTotalAvailableStock')->andReturn(50);
        $product->shouldReceive('getCompletePackageStock')->andReturn(50);

        $this->assertEquals(5.00, $product->getLowestCustomerUnitPrice());
    }

    /**
     * Resource serialization outputs authoritative lowest price fields.
     */
    public function test_product_resource_contains_lowest_unit_price_fields(): void
    {
        $product = new Product([
            'id' => 1,
            'product_id' => 'AY-TEST-001',
            'name' => 'Test Silk Shirt',
            'slug' => 'test-silk-shirt',
            'sku' => 'SKU-001',
            'wholesale_price' => 10.00,
            'moq' => 10,
            'bulk_pricing_enabled' => true,
            'bulk_threshold' => 50,
            'bulk_price' => 8.50,
            'full_stock_price' => 7.80,
        ]);
        $product = \Mockery::mock($product)->makePartial();
        $product->shouldReceive('getTotalAvailableStock')->andReturn(200);
        $product->shouldReceive('getCompletePackageStock')->andReturn(200);
        $product->shouldReceive('getOnHandStock')->andReturn(200);
        $product->shouldReceive('getAvailableMoqs')->andReturn(20);
        $product->shouldReceive('getWarehouseStockBreakdown')->andReturn([]);
        $product->shouldReceive('getMaxCompletePackages')->andReturn(20);
        $product->shouldReceive('isFeaturedActive')->andReturn(false);
        $product->shouldReceive('isHotActive')->andReturn(false);
        $product->shouldReceive('isNewActive')->andReturn(false);
        $product->shouldReceive('getVideoProvider')->andReturn(null);
        $product->shouldReceive('getVideoEmbedUrl')->andReturn(null);
        $product->shouldReceive('getYoutubeVideoId')->andReturn(null);
        $product->shouldReceive('getYoutubeEmbedUrl')->andReturn(null);
        $product->shouldReceive('getVimeoVideoId')->andReturn(null);

        $request = Request::create('/api/v1/products', 'GET');
        $resource = new ProductResource($product);
        $data = $resource->toArray($request);

        $this->assertArrayHasKey('effective_customer_unit_price', $data);
        $this->assertArrayHasKey('effectiveCustomerUnitPrice', $data);
        $this->assertArrayHasKey('lowest_customer_unit_price', $data);
        $this->assertArrayHasKey('lowestCustomerUnitPrice', $data);
        $this->assertEquals(7.80, $data['effective_customer_unit_price']);
        $this->assertEquals(7.80, $data['price']);
        $this->assertEquals(10.00, $data['wholesalePrice']); // Standard base price preserved
    }
}
