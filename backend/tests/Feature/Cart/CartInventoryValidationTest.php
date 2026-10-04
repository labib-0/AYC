<?php

namespace Tests\Feature\Cart;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartInventoryValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function createProductWithVariants(): array
    {
        $product = Product::factory()->create([
            'name' => "Men's Luxury Merino Wool Knit Sweater",
            'status' => 'published',
            'wholesale_price' => 45.00,
            'moq' => 10,
        ]);

        $wh = Warehouse::firstOrCreate(
            ['code' => 'MAIN-WH'],
            ['name' => 'Main Distribution Center', 'country_code' => 'US', 'is_active' => true]
        );

        $variantS = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'S',
            'color' => 'Charcoal Heather',
            'stock' => 80,
        ]);

        Inventory::create([
            'product_variant_id' => $variantS->id,
            'warehouse_id' => $wh->id,
            'quantity' => 80,
        ]);

        $variantM = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Charcoal Heather',
            'stock' => 120,
        ]);

        Inventory::create([
            'product_variant_id' => $variantM->id,
            'warehouse_id' => $wh->id,
            'quantity' => 120,
        ]);

        return [$product, $variantS, $variantM];
    }

    public function test_case_1_requested_10_available_80_succeeds(): void
    {
        [$product, $variantS] = $this->createProductWithVariants();

        $response = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'variant_id' => $variantS->id,
            'size' => 'S',
            'quantity' => 10,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_items' => 10,
                ],
            ]);
    }

    public function test_case_2_requested_80_available_80_succeeds(): void
    {
        [$product, $variantS] = $this->createProductWithVariants();

        $response = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'variant_id' => $variantS->id,
            'size' => 'S',
            'quantity' => 80,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_items' => 80,
                ],
            ]);
    }

    public function test_case_3_requested_81_available_80_is_rejected(): void
    {
        [$product, $variantS] = $this->createProductWithVariants();

        $response = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'variant_id' => $variantS->id,
            'size' => 'S',
            'quantity' => 81,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'INSUFFICIENT_STOCK',
            ]);

        $this->assertEquals(80, $response->json('data.available_quantity'));
        $this->assertEquals(81, $response->json('data.requested_quantity'));
    }

    public function test_case_4_requested_220_available_80_is_rejected_before_entering_cart(): void
    {
        [$product, $variantS] = $this->createProductWithVariants();

        $response = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'variant_id' => $variantS->id,
            'size' => 'S',
            'quantity' => 220,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'INSUFFICIENT_STOCK',
                'data' => [
                    'product_id' => $product->id,
                    'variant_id' => $variantS->id,
                    'size' => 'S',
                    'requested_quantity' => 220,
                    'available_quantity' => 80,
                ],
            ]);

        // Verify cart is empty
        $cartResponse = $this->getJson('/api/v1/cart');
        $this->assertEquals(0, $cartResponse->json('data.total_items'));
    }

    public function test_case_5_cart_quantity_update_rejects_exceeding_stock(): void
    {
        [$product, $variantS] = $this->createProductWithVariants();

        // Add valid 10
        $addResponse = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'variant_id' => $variantS->id,
            'size' => 'S',
            'quantity' => 10,
        ]);
        $addResponse->assertStatus(200);
        $itemId = $addResponse->json('data.items.0.id');

        // Update to 220 (exceeds 80)
        $updateResponse = $this->putJson("/api/v1/cart/{$itemId}", [
            'quantity' => 220,
        ]);

        $updateResponse->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'INSUFFICIENT_STOCK',
                'data' => [
                    'requested_quantity' => 220,
                    'available_quantity' => 80,
                ],
            ]);

        // Verify cart quantity was not mutated to 220
        $cartResponse = $this->getJson('/api/v1/cart');
        $this->assertEquals(10, $cartResponse->json('data.items.0.quantity'));
    }

    public function test_case_6_cart_revalidation_detects_reduced_stock(): void
    {
        [$product, $variantS] = $this->createProductWithVariants();

        // Client has 220 in stale cart payload
        $response = $this->postJson('/api/v1/cart/revalidate', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variantS->id,
                    'size' => 'S',
                    'quantity' => 220,
                ],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'is_valid' => false,
            ]);

        $this->assertCount(1, $response->json('violations'));
        $violation = $response->json('violations.0');
        $this->assertEquals(220, $violation['requested_quantity']);
        $this->assertEquals(80, $violation['available_quantity']);
        $this->assertStringContainsString('Only 80 units are currently available', $violation['message']);
    }

    public function test_case_7_variant_level_isolation_between_sizes(): void
    {
        [$product, $variantS, $variantM] = $this->createProductWithVariants();

        // Size M has 120 in stock, size S has 80
        // Requesting 100 of size M succeeds
        $resM = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'variant_id' => $variantM->id,
            'size' => 'M',
            'quantity' => 100,
        ]);
        $resM->assertStatus(200);

        // Requesting 100 of size S fails (only 80 available)
        $resS = $this->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'variant_id' => $variantS->id,
            'size' => 'S',
            'quantity' => 100,
        ]);
        $resS->assertStatus(422)
            ->assertJson([
                'error_code' => 'INSUFFICIENT_STOCK',
                'data' => [
                    'size' => 'S',
                    'available_quantity' => 80,
                ],
            ]);
    }

    public function test_case_8_checkout_final_atomic_validation_with_insufficient_stock(): void
    {
        [$product, $variantS] = $this->createProductWithVariants();
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', [
            'shipping_name' => 'John Buyer',
            'email' => 'john@buyer.com',
            'shipping_phone' => '+12025550192',
            'shipping_address1' => '123 Market St',
            'shipping_city' => 'New York',
            'shipping_region' => 'NY',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'shipping_method' => 'Discuss Directly',
            'carrier' => 'Export Desk',
            'payment_method' => 'card',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variantS->id,
                    'size' => 'S',
                    'quantity' => 220,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'INSUFFICIENT_STOCK',
                'data' => [
                    'product_id' => $product->id,
                    'variant_id' => $variantS->id,
                    'size' => 'S',
                    'requested_quantity' => 220,
                    'available_quantity' => 80,
                ],
            ]);
    }
}
