<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductPackageAllocation;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Order\OrderCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * FullStockPricingLogicCorrectionTest
 *
 * Verifies Authoritative Business Rules from ANTIGRAVITY PROMPT — CORRECT FULL STOCK PRICING LOGIC:
 * 1. Full Stock option is ALWAYS visible.
 * 2. Only price is conditional:
 *    Available Inventory > Minimum Bulk Order Quantity
 *      ├── YES → full_stock_price
 *      └── NO  → normal MOQ / standard applicable price
 * 3. Package calculations and complete package quantities obey inventory rules.
 * 4. Current Available Inventory (On Hand minus Reserved) is authoritative.
 * 5. Dynamic price adjustments on stock change without config changes.
 * 6. Server-side OrderCalculationService, Cart, and Checkout recalculate independently.
 */
class FullStockPricingLogicCorrectionTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private Brand $brand;
    private Category $category;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'name' => 'Wholesale Retailer',
            'email' => 'retailer@ayaan-test.com',
            'role' => 'customer',
        ]);

        $this->brand = Brand::create(['name' => 'Ayaan Garments', 'slug' => 'ayaan-garments']);
        $this->category = Category::create(['name' => 'Shirts', 'slug' => 'shirts']);
        $this->warehouse = Warehouse::create([
            'name' => 'Dhaka Central Hub',
            'code' => 'DHK-01',
            'city' => 'Dhaka',
            'country' => 'Bangladesh',
            'is_active' => true,
        ]);
    }

    /**
     * Create product with package assortment: 20 pcs MOQ / package (10 M, 10 L).
     * Normal MOQ Price = $22.00, Bulk Threshold = 100, Bulk Price = $19.00, Full Stock Price = $17.00.
     */
    private function createPackagedProduct(
        int $inventoryTotal,
        int $reservedTotal = 0,
        int $bulkThreshold = 100,
        float $bulkPrice = 19.00,
        float $fullStockPrice = 17.00,
        float $wholesalePrice = 22.00,
        int $packageSize = 20
    ): Product {
        $product = Product::create([
            'name' => 'Ayaan Classic Oxford Shirt',
            'slug' => 'ayaan-classic-oxford-' . uniqid(),
            'sku' => 'AYN-OXF-' . uniqid(),
            'brand_id' => $this->brand->id,
            'wholesale_price' => $wholesalePrice,
            'bulk_threshold' => $bulkThreshold,
            'bulk_price' => $bulkPrice,
            'full_stock_price' => $fullStockPrice,
            'moq' => $packageSize,
            'status' => 'published',
            'color_name' => 'Sky Blue',
        ]);

        // 2 Variants (M and L), each 10 pcs per package
        $ratioM = 10;
        $ratioL = 10;

        $vM = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Sky Blue - M',
            'sku' => $product->sku . '-M',
            'size' => 'M',
            'color' => 'Sky Blue',
            'stock' => (int) floor($inventoryTotal / 2),
            'is_active' => true,
        ]);

        $vL = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Sky Blue - L',
            'sku' => $product->sku . '-L',
            'size' => 'L',
            'color' => 'Sky Blue',
            'stock' => $inventoryTotal - (int) floor($inventoryTotal / 2),
            'is_active' => true,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $vM->id,
            'size' => 'M',
            'color' => 'Sky Blue',
            'quantity' => $ratioM,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $vL->id,
            'size' => 'L',
            'color' => 'Sky Blue',
            'quantity' => $ratioL,
        ]);

        // Create warehouse inventory records with on hand and reserved quantities
        $invM = (int) floor($inventoryTotal / 2);
        $resM = (int) floor($reservedTotal / 2);
        Inventory::create([
            'product_variant_id' => $vM->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => $invM,
            'reserved_quantity' => $resM,
        ]);

        $invL = $inventoryTotal - $invM;
        $resL = $reservedTotal - $resM;
        Inventory::create([
            'product_variant_id' => $vL->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => $invL,
            'reserved_quantity' => $resL,
        ]);

        return $product->fresh(['variants.inventories', 'packageAllocations']);
    }

    /**
     * EXAMPLE 1:
     * Available Inventory = 140 pcs, Bulk Minimum = 100 pcs.
     * Full Stock Price = $17.00, Normal MOQ Price = $22.00.
     * 140 > 100 is TRUE -> Expect 7 packages · 140 pcs @ $17.00 / pc.
     */
    public function test_example_1_available_140_uses_full_stock_price(): void
    {
        $product = $this->createPackagedProduct(inventoryTotal: 140, reservedTotal: 0);

        $this->assertEquals(140, $product->getTotalAvailableStock());
        $this->assertEquals(7, $product->getMaxCompletePackages());
        $this->assertEquals(140, $product->getCompletePackageStock());
        $this->assertEquals(140, $product->getEligibleFullStockQuantity());

        // Price: 140 > 100 is true -> full_stock_price $17.00
        $this->assertEquals(17.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(2380.00, $product->getEligibleFullStockTotal());
        $this->assertEquals(17.00, $product->getUnitPriceForQuantity(140, 'full_stock'));

        // API Resource response test
        $res = $this->getJson("/api/v1/products/{$product->slug}");
        $res->assertStatus(200);
        $this->assertEquals(17.00, (float) $res->json('data.fullStockPrice'));
        $res->assertJsonPath('data.fullStockQuantity', 140);
        $res->assertJsonPath('data.maxCompletePackages', 7);
        $res->assertJsonPath('data.is_full_stock_eligible', true);
    }

    /**
     * EXAMPLE 2:
     * Available Inventory = 100 pcs, Bulk Minimum = 100 pcs.
     * Full Stock Price = $17.00, Normal MOQ Price = $22.00.
     * 100 > 100 is FALSE -> Expect 5 packages · 100 pcs @ $22.00 / pc (Normal MOQ Price).
     */
    public function test_example_2_available_100_uses_normal_moq_price(): void
    {
        $product = $this->createPackagedProduct(inventoryTotal: 100, reservedTotal: 0);

        $this->assertEquals(100, $product->getTotalAvailableStock());
        $this->assertEquals(5, $product->getMaxCompletePackages());
        $this->assertEquals(100, $product->getCompletePackageStock());
        $this->assertEquals(100, $product->getEligibleFullStockQuantity());

        // Price: 100 > 100 is false -> falls back to normal MOQ price $22.00
        $this->assertEquals(22.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(2200.00, $product->getEligibleFullStockTotal());
        $this->assertEquals(22.00, $product->getUnitPriceForQuantity(100, 'full_stock'));

        // In contrast, Bulk purchasing mode for 100 pcs gets bulk price ($19.00)
        $this->assertEquals(19.00, $product->getUnitPriceForQuantity(100, 'bulk'));

        // API Resource response test
        $res = $this->getJson("/api/v1/products/{$product->slug}");
        $res->assertStatus(200);
        $this->assertEquals(22.00, (float) $res->json('data.fullStockPrice'));
        $res->assertJsonPath('data.fullStockQuantity', 100);
        $res->assertJsonPath('data.maxCompletePackages', 5);
        $res->assertJsonPath('data.is_full_stock_eligible', false);
    }

    /**
     * EXAMPLE 3:
     * Available Inventory = 80 pcs, Bulk Minimum = 100 pcs.
     * Full Stock Price = $17.00, Normal MOQ Price = $22.00.
     * 80 > 100 is FALSE -> Expect 4 packages · 80 pcs @ $22.00 / pc.
     */
    public function test_example_3_available_80_uses_normal_moq_price(): void
    {
        $product = $this->createPackagedProduct(inventoryTotal: 80, reservedTotal: 0);

        $this->assertEquals(80, $product->getTotalAvailableStock());
        $this->assertEquals(4, $product->getMaxCompletePackages());
        $this->assertEquals(80, $product->getCompletePackageStock());
        $this->assertEquals(80, $product->getEligibleFullStockQuantity());

        // Price: 80 > 100 is false -> falls back to normal MOQ price $22.00
        $this->assertEquals(22.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(1760.00, $product->getEligibleFullStockTotal());
        $this->assertEquals(22.00, $product->getUnitPriceForQuantity(80, 'full_stock'));

        // API Resource response test
        $res = $this->getJson("/api/v1/products/{$product->slug}");
        $res->assertStatus(200);
        $this->assertEquals(22.00, (float) $res->json('data.fullStockPrice'));
        $res->assertJsonPath('data.fullStockQuantity', 80);
        $res->assertJsonPath('data.maxCompletePackages', 4);
        $res->assertJsonPath('data.is_full_stock_eligible', false);
    }

    /**
     * EXAMPLE 4:
     * Available Inventory = 101 pcs, Bulk Minimum = 100 pcs.
     * Full Stock Price = $17.00, Normal MOQ Price = $22.00.
     * 101 > 100 is TRUE -> Expect 5 packages · 100 pcs @ $17.00 / pc.
     */
    public function test_example_4_available_101_uses_full_stock_price_with_complete_packages(): void
    {
        $product = $this->createPackagedProduct(inventoryTotal: 101, reservedTotal: 0);

        $this->assertEquals(101, $product->getTotalAvailableStock());
        // Package assortment: 5 packages * 20 = 100 complete pcs (1 pc loose remainder)
        $this->assertEquals(5, $product->getMaxCompletePackages());
        $this->assertEquals(100, $product->getCompletePackageStock());
        $this->assertEquals(100, $product->getEligibleFullStockQuantity());

        // Price: Available Inventory (101) > Bulk Min (100) is true -> full_stock_price $17.00
        $this->assertEquals(17.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(1700.00, $product->getEligibleFullStockTotal());
        $this->assertEquals(17.00, $product->getUnitPriceForQuantity(100, 'full_stock'));

        // API Resource response test
        $res = $this->getJson("/api/v1/products/{$product->slug}");
        $res->assertStatus(200);
        $this->assertEquals(17.00, (float) $res->json('data.fullStockPrice'));
        $res->assertJsonPath('data.fullStockQuantity', 100);
        $res->assertJsonPath('data.maxCompletePackages', 5);
        $res->assertJsonPath('data.is_full_stock_eligible', true);
    }

    /**
     * SECTION 9: INVENTORY MUST BE CURRENT (On Hand = 140, Reserved = 50 -> Available = 90).
     * Bulk minimum = 100.
     * 90 > 100 is FALSE -> Full Stock price is Normal MOQ price $22.00.
     */
    public function test_section_9_inventory_must_be_current_available_not_merely_on_hand(): void
    {
        $product = $this->createPackagedProduct(inventoryTotal: 140, reservedTotal: 50);

        $this->assertEquals(140, $product->getOnHandStock());
        $this->assertEquals(50, $product->getReservedStock());
        $this->assertEquals(90, $product->getTotalAvailableStock());

        // Complete packages supported by available inventory: floor(90 / 20) = 4 packages = 80 pcs
        $this->assertEquals(4, $product->getMaxCompletePackages());
        $this->assertEquals(80, $product->getCompletePackageStock());
        $this->assertEquals(80, $product->getEligibleFullStockQuantity());

        // Price: Available (90) > 100 is false -> Normal MOQ price $22.00
        $this->assertEquals(22.00, $product->getResolvedFullStockPrice());
        $this->assertEquals(1760.00, $product->getEligibleFullStockTotal());
        $this->assertEquals(22.00, $product->getUnitPriceForQuantity(80, 'full_stock'));
    }

    /**
     * SECTION 10: DYNAMIC BEHAVIOR
     * Stock changes from 140 -> 90 -> 120 dynamically without config changes.
     */
    public function test_section_10_dynamic_price_behavior_on_stock_fluctuations(): void
    {
        $product = $this->createPackagedProduct(inventoryTotal: 140, reservedTotal: 0);

        // 1. Available = 140 -> Full stock price $17.00
        $this->assertEquals(17.00, $product->getResolvedFullStockPrice());

        // 2. Stock becomes 90 (reserve 50 pcs) -> price switches to normal MOQ price $22.00
        $invM = Inventory::where('product_variant_id', $product->variants[0]->id)->first();
        $invM->update(['reserved_quantity' => 25]);
        $invL = Inventory::where('product_variant_id', $product->variants[1]->id)->first();
        $invL->update(['reserved_quantity' => 25]);

        $product = $product->fresh(['variants.inventories']);
        $this->assertEquals(90, $product->getTotalAvailableStock());
        $this->assertEquals(22.00, $product->getResolvedFullStockPrice());

        // 3. Stock becomes 120 (release 30 reserved pcs, reserved is now 20) -> switches back to $17.00
        $invM->update(['reserved_quantity' => 10]);
        $invL->update(['reserved_quantity' => 10]);

        $product = $product->fresh(['variants.inventories']);
        $this->assertEquals(120, $product->getTotalAvailableStock());
        $this->assertEquals(17.00, $product->getResolvedFullStockPrice());
    }

    /**
     * SECTION 12, 13, 14: CART & CHECKOUT SERVER-SIDE RE-EVALUATION
     * Do not trust client-provided price; server recalculates authoritative price.
     */
    public function test_section_12_13_14_cart_and_checkout_authoritative_recalculation(): void
    {
        $product = $this->createPackagedProduct(inventoryTotal: 140, reservedTotal: 0);

        // 1. Add Full Stock (140 pcs) to Cart
        $cartRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 140,
            'pricing_mode' => 'full_stock',
        ]);
        $cartRes->assertStatus(200);
        $this->assertEquals(17.00, (float) $cartRes->json('data.items.0.unit_price'));
        $this->assertEquals(2380.00, (float) $cartRes->json('data.items.0.line_total'));
        $this->assertEquals(2380.00, (float) $cartRes->json('data.subtotal'));

        // 2. OrderCalculationService recalculation
        $calcService = app(OrderCalculationService::class);
        $calc = $calcService->calculate([
            [
                'product_id' => $product->id,
                'quantity' => 140,
                'pricing_mode' => 'full_stock',
            ]
        ]);
        $this->assertEquals(17.00, $calc['lines'][0]['unit_price']);
        $this->assertEquals(2380.00, $calc['lines'][0]['line_total']);

        // 3. Re-evaluate if stock dropped to 80 pcs before checkout:
        // When quantity is 80 pcs in full_stock mode with 80 available, price becomes $22.00
        $calcReduced = $calcService->calculate([
            [
                'product_id' => $product->id,
                'quantity' => 80,
                'pricing_mode' => 'full_stock',
            ]
        ]);
        // 80 <= 100 bulk min -> re-evaluates to $22.00
        $this->assertEquals(22.00, $calcReduced['lines'][0]['unit_price']);
        $this->assertEquals(1760.00, $calcReduced['lines'][0]['line_total']);
    }

    /**
     * SECTION 15: COMPLETE TEST MATRIX
     * Matrix:
     * - Available 140 / Bulk min 100 -> Full Stock price $17.00
     * - Available 101 / Bulk min 100 -> Full Stock price $17.00
     * - Available 100 / Bulk min 100 -> Normal MOQ price $22.00
     * - Available 99 / Bulk min 100  -> Normal MOQ price $22.00
     * - Available 80 / Bulk min 100  -> Normal MOQ price $22.00
     * - Available 0 / Bulk min 100   -> Normal MOQ price $22.00, 0 qty
     */
    public function test_section_15_complete_matrix_cases(): void
    {
        $matrixCases = [
            ['available' => 140, 'expectedPrice' => 17.00, 'expectedEligible' => true],
            ['available' => 101, 'expectedPrice' => 17.00, 'expectedEligible' => true],
            ['available' => 100, 'expectedPrice' => 22.00, 'expectedEligible' => false],
            ['available' => 99,  'expectedPrice' => 22.00, 'expectedEligible' => false],
            ['available' => 80,  'expectedPrice' => 22.00, 'expectedEligible' => false],
            ['available' => 0,   'expectedPrice' => 22.00, 'expectedEligible' => false],
        ];

        foreach ($matrixCases as $case) {
            $product = $this->createPackagedProduct(inventoryTotal: $case['available'], reservedTotal: 0);

            $this->assertEquals(
                $case['expectedPrice'],
                $product->getResolvedFullStockPrice(),
                "Failed matrix case for available inventory = {$case['available']}"
            );

            $this->assertEquals(
                $case['expectedEligible'],
                $product->isFullStockEligible(),
                "Failed eligibility flag for available inventory = {$case['available']}"
            );
        }
    }
}
