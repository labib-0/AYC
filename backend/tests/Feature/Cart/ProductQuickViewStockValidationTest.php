<?php

namespace Tests\Feature\Cart;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductQuickViewStockValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function createWholesaleProduct(int $stock = 5475, int $moq = 500): Product
    {
        $product = Product::factory()->create([
            'name' => 'Boys Short Sleeve Drop Shoulder T-Shirt',
            'status' => 'published',
            'wholesale_price' => 12.50,
            'moq' => $moq,
            'stock' => $stock,
        ]);

        $wh = Warehouse::firstOrCreate(
            ['code' => 'MAIN-WH'],
            ['name' => 'Main Distribution Center', 'country_code' => 'US', 'is_active' => true]
        );

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $wh->id,
            'quantity' => $stock,
        ]);

        return $product;
    }

    /**
     * TEST 1: Quantity 500 with MOQ 500 and sufficient availability (5,000 sellable package stock) succeeds.
     */
    public function test_quantity_500_with_moq_500_succeeds(): void
    {
        $product = $this->createWholesaleProduct(5475, 500);

        $response = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'Assorted',
            'quantity' => 500,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_items' => 500,
                ],
            ]);
    }

    /**
     * TEST 2: Quantity 6,000 exceeds sellable complete package stock (5,000 pcs) and is rejected with 422.
     * Available stock in error message is reconciled to 5,000 pcs (complete package stock).
     */
    public function test_quantity_exceeding_complete_package_stock_is_rejected(): void
    {
        $product = $this->createWholesaleProduct(5475, 500);

        $response = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'Assorted',
            'quantity' => 6000,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'INSUFFICIENT_STOCK',
                'data' => [
                    'product_id' => $product->id,
                    'requested_quantity' => 6000,
                    'available_quantity' => 5000,
                ],
            ]);

        $this->assertStringContainsString('Requested: 6000, Available: 5000', $response->json('message'));
    }

    /**
     * TEST 3: Cart accumulation transparency.
     * When cart already contains 5,500 pcs and user adds 500 pcs, total requested is 6,000 pcs.
     * Response returns transparent existing cart breakdown and reconciled available stock of 5,000 pcs.
     */
    public function test_cart_accumulation_reports_clear_breakdown_when_stock_exceeded(): void
    {
        // First create product with 6000 stock to allow adding 5500 pcs
        $product = $this->createWholesaleProduct(6500, 500);

        // Add 5500 pcs to cart
        $initialRes = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'Assorted',
            'quantity' => 5500,
        ]);
        $initialRes->assertStatus(200);

        // Now adjust product stock to 5475 (available package stock = 5000)
        Inventory::where('product_id', $product->id)->update(['quantity' => 5475]);
        $product->update(['stock' => 5475]);

        // Attempt to add 500 pcs more
        $addMoreRes = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'Assorted',
            'quantity' => 500,
        ]);

        $addMoreRes->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'INSUFFICIENT_STOCK',
                'data' => [
                    'product_id' => $product->id,
                    'requested_quantity' => 6000,
                    'current_request_quantity' => 500,
                    'existing_cart_quantity' => 5500,
                    'available_quantity' => 5000,
                ],
            ]);

        $this->assertStringContainsString('Adding 500 pcs to your existing cart quantity of 5500 pcs', $addMoreRes->json('message'));
        $this->assertStringContainsString('total: 6000 pcs', $addMoreRes->json('message'));
        $this->assertStringContainsString('available stock of 5000 pcs', $addMoreRes->json('message'));
    }

    /**
     * TEST 4: Product display stock versus sellable stock model.
     * Verify getCompletePackageStock() and getTotalAvailableStock() distinctions.
     */
    public function test_complete_package_stock_calculation(): void
    {
        $product = $this->createWholesaleProduct(5475, 500);

        $this->assertEquals(5475, $product->getTotalAvailableStock());
        $this->assertEquals(10, $product->getMaxCompletePackages());
        $this->assertEquals(5000, $product->getCompletePackageStock());
        $this->assertEquals(10, $product->getAvailableMoqs());
    }

    /**
     * TEST 5: Cart quantity update validates against reconciled complete package stock.
     */
    public function test_cart_update_validates_complete_package_stock(): void
    {
        $product = $this->createWholesaleProduct(5475, 500);

        // Add initial 500 pcs
        $addRes = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'Assorted',
            'quantity' => 500,
        ]);
        $addRes->assertStatus(200);

        // Update to 6,000 pcs -> rejected because complete package stock is 5,000
        $updateRes = $this->putJson('/api/v1/cart/items', [
            'product_id' => $product->id,
            'size' => 'Assorted',
            'quantity' => 6000,
        ]);

        $updateRes->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'INSUFFICIENT_STOCK',
                'data' => [
                    'requested_quantity' => 6000,
                    'available_quantity' => 5000,
                ],
            ]);
    }
}
