<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Order\OrderCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Prompt6PricingTiersAndFullStockTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private Brand $brand;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'name' => 'Wholesale Buyer',
            'email' => 'buyer@b2b-test.com',
            'role' => 'customer',
        ]);

        $this->brand = Brand::create(['name' => 'Ayaan Garments', 'slug' => 'ayaan-garments']);
        $this->category = Category::create(['name' => 'T-Shirts', 'slug' => 't-shirts']);
    }

    /**
     * Helper to create product with specific MOQ, inventory, bulk threshold, and full-stock price.
     */
    private function createProductWithScenario(
        int $moq,
        int $inventory,
        ?int $bulkThreshold = 100,
        ?float $bulkPrice = 22.00,
        ?float $fullStockPrice = 18.00,
        float $wholesalePrice = 28.00
    ): Product {
        $product = Product::create([
            'name' => 'Commercial Pique Polo',
            'slug' => 'commercial-pique-polo-' . uniqid(),
            'sku' => 'AYN-POLO-' . uniqid(),
            'brand_id' => $this->brand->id,
            'wholesale_price' => $wholesalePrice,
            'bulk_threshold' => $bulkThreshold,
            'bulk_price' => $bulkPrice,
            'full_stock_price' => $fullStockPrice,
            'moq' => $moq,
            'status' => 'published',
            'color_name' => 'Navy',
        ]);

        // Distribute inventory across 2 variants
        $half = (int) floor($inventory / 2);
        $remainder = $inventory - $half;

        ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Navy - M',
            'sku' => $product->sku . '-M',
            'size' => 'M',
            'color' => 'Navy',
            'stock' => $half,
            'is_active' => true,
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Navy - L',
            'sku' => $product->sku . '-L',
            'size' => 'L',
            'color' => 'Navy',
            'stock' => $remainder,
            'is_active' => true,
        ]);

        return $product->fresh(['variants']);
    }

    /**
     * CASE 1:
     * MOQ = 80, Inventory = 490, Bulk threshold = 100, Full Stock Price = 18
     * Full Stock quantity MUST be the exact currently available inventory (490),
     * NOT rounded down to an MOQ multiple.
     */
    public function test_case_1_full_stock_uses_exact_available_inventory(): void
    {
        $product = $this->createProductWithScenario(
            moq: 80,
            inventory: 490,
            bulkThreshold: 100,
            bulkPrice: 22.00,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );

        $this->assertEquals(490, $product->getTotalAvailableStock());
        $this->assertTrue($product->isFullStockEligible());
        $this->assertEquals(490, $product->getEligibleFullStockQuantity());
        $this->assertEquals(18.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(8820.00, $product->getEligibleFullStockTotal());
    }

    /**
     * CASE 2:
     * MOQ = 80, Inventory = 50
     * Verify Full Stock is unavailable.
     */
    public function test_case_2_full_stock_unavailable_when_inventory_below_moq(): void
    {
        $product = $this->createProductWithScenario(
            moq: 80,
            inventory: 50,
            bulkThreshold: 100,
            bulkPrice: 22.00,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );

        $this->assertEquals(50, $product->getTotalAvailableStock());
        $this->assertFalse($product->isFullStockEligible());
        $this->assertEquals(0, $product->getEligibleFullStockQuantity());
        $this->assertEquals(0.00, $product->getEligibleFullStockTotal());
    }

    /**
     * CASE 3:
     * MOQ = 80, Inventory = 80
     * Verify Full Stock follows the strict "inventory greater than qualifying minimum" rule.
     * When Inventory is exactly 80, inventory is NOT strictly greater than qualifying threshold (80).
     */
    public function test_case_3_full_stock_falls_back_to_normal_moq_price_when_inventory_not_strictly_greater_than_minimum(): void
    {
        $product = $this->createProductWithScenario(
            moq: 80,
            inventory: 80,
            bulkThreshold: 100,
            bulkPrice: 22.00,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );

        $this->assertEquals(80, $product->getTotalAvailableStock());
        $this->assertFalse($product->isFullStockEligible());
        $this->assertEquals(80, $product->getEligibleFullStockQuantity());
        $this->assertEquals(28.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(2240.00, $product->getEligibleFullStockTotal());

        // When bulk pricing is not configured / optional, full stock works when available stock equals MOQ (80 pcs)
        $productNoBulk = $this->createProductWithScenario(
            moq: 80,
            inventory: 80,
            bulkThreshold: null,
            bulkPrice: null,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );
        $this->assertTrue($productNoBulk->isFullStockEligible());
        $this->assertEquals(80, $productNoBulk->getEligibleFullStockQuantity());
        $this->assertEquals(18.00, $productNoBulk->getResolvedFullStockPrice());
    }

    /**
     * CASE 4:
     * MOQ = 80, Inventory = 160
     * Verify Full Stock can use 160 when eligibility requirements are satisfied.
     */
    public function test_case_4_full_stock_eligible_with_exact_moq_multiple(): void
    {
        $product = $this->createProductWithScenario(
            moq: 80,
            inventory: 160,
            bulkThreshold: 100,
            bulkPrice: 22.00,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );

        $this->assertEquals(160, $product->getTotalAvailableStock());
        $this->assertTrue($product->isFullStockEligible());
        $this->assertEquals(160, $product->getEligibleFullStockQuantity());
        $this->assertEquals(18.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(2880.00, $product->getEligibleFullStockTotal());
    }

    /**
     * CASE 5:
     * MOQ = 80, Inventory = 170
     * Verify Full Stock quantity MUST be exact currently available inventory (170),
     * NOT requiring quantity % MOQ === 0.
     */
    public function test_case_5_full_stock_allows_exact_non_multiple_inventory(): void
    {
        $product = $this->createProductWithScenario(
            moq: 80,
            inventory: 170,
            bulkThreshold: 100,
            bulkPrice: 22.00,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );

        $this->assertEquals(170, $product->getTotalAvailableStock());
        $this->assertTrue($product->isFullStockEligible());
        $this->assertEquals(170, $product->getEligibleFullStockQuantity());
        $this->assertEquals(18.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(3060.00, $product->getEligibleFullStockTotal());
    }

    /**
     * CASE 6:
     * Full Stock Price = 18, Eligible quantity = 490
     * Verify 490 × 18 = 8820 calculated server-side without relying on frontend calculations.
     */
    public function test_case_6_server_side_authoritative_total_calculation(): void
    {
        $product = $this->createProductWithScenario(
            moq: 80,
            inventory: 490,
            bulkThreshold: 100,
            bulkPrice: 22.00,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );

        $unitPrice = $product->getUnitPriceForQuantity(490, 'full_stock');
        $this->assertEquals(18.00, $unitPrice);

        $total = $product->getEligibleFullStockTotal();
        $this->assertEquals(8820.00, $total);
        $this->assertEquals(8820.00, round(490 * $unitPrice, 2));

        // In Cart: adding 490 calculates line total and subtotal authoritative
        $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 490,
            'pricing_mode' => 'full_stock',
        ]);

        $res->assertStatus(200);
        $this->assertEquals(18.00, (float) $res->json('data.items.0.unit_price'));
        $this->assertEquals(8820.00, (float) $res->json('data.items.0.line_total'));
        $this->assertEquals(8820.00, (float) $res->json('data.subtotal'));
    }

    /**
     * FULL-STOCK FALLBACK:
     * If customer requests full-stock pricing for non-eligible quantity or when full stock is unavailable,
     * backend falls back to applicable Standard or Bulk tier price.
     */
    public function test_full_stock_fallback_to_standard_or_bulk_pricing(): void
    {
        $product = $this->createProductWithScenario(
            moq: 80,
            inventory: 490,
            bulkThreshold: 100,
            bulkPrice: 22.00,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );

        // Standard quantity (80 pcs) with malicious 'full_stock' pricingMode request:
        // Must fallback to wholesale price 28.00 (not 18.00)
        $standardPriceResolved = $product->getUnitPriceForQuantity(80, 'full_stock');
        $this->assertEquals(28.00, $standardPriceResolved);

        // Bulk quantity (160 pcs) with 'full_stock' pricingMode request:
        // Must fallback to bulk price 22.00 (not 18.00)
        $bulkPriceResolved = $product->getUnitPriceForQuantity(160, 'full_stock');
        $this->assertEquals(22.00, $bulkPriceResolved);

        // Non-eligible product (e.g. inventory = 80):
        $ineligibleProduct = $this->createProductWithScenario(
            moq: 80,
            inventory: 80,
            bulkThreshold: 100,
            bulkPrice: 22.00,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );
        $this->assertEquals(28.00, $ineligibleProduct->getUnitPriceForQuantity(80, 'full_stock'));
    }

    /**
     * MOQ MULTIPLE REJECTION:
     * Attempting to order raw inventory (e.g. 490 pcs when MOQ is 80) is strictly rejected.
     */
    public function test_non_multiple_inventory_quantity_rejected_by_cart_and_checkout(): void
    {
        $product = $this->createProductWithScenario(
            moq: 80,
            inventory: 490,
            bulkThreshold: 100,
            bulkPrice: 22.00,
            fullStockPrice: 18.00,
            wholesalePrice: 28.00
        );

        // 1. Cart rejects 490 pcs
        $cartRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 490,
        ]);
        $cartRes->assertStatus(422);
        $cartRes->assertJsonFragment(['error_code' => 'INVALID_MOQ_MULTIPLE']);

        // 2. OrderCalculationService rejects 490 pcs
        $calcService = app(OrderCalculationService::class);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/multiple of the MOQ/i');
        $calcService->calculate([
            [
                'product_id' => $product->id,
                'quantity' => 490,
            ]
        ]);
    }
}
