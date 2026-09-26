<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductPackageAllocation;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Prompt5MoqMultipleEnforcementTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private Brand $brand;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create();
        $this->brand = Brand::create(['name' => 'Ayaan Basics', 'slug' => 'ayaan-basics']);
        $this->category = Category::create(['name' => 'Apparel', 'slug' => 'apparel']);
    }

    /**
     * Helper to create a product with authoritative package assortment deriving MOQ.
     */
    private function createProductWithMoq(int $moq, int $totalStock = 1000): Product
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => "Product MOQ {$moq}",
            'slug' => "product-moq-{$moq}",
            'sku' => "SKU-MOQ-{$moq}",
            'wholesale_price' => 20.00,
            'bulk_threshold' => $moq + 50,
            'bulk_price' => 16.00,
            'moq' => $moq,
            'status' => 'published',
        ]);

        // Create variants for Black and White
        $variantBlack = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Black / M',
            'sku' => "SKU-MOQ-{$moq}-BLK",
            'color' => 'Black',
            'size' => 'M',
            'wholesale_price' => 20.00,
            'stock' => (int) ceil($totalStock / 2),
            'is_active' => true,
        ]);

        $variantWhite = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'White / M',
            'sku' => "SKU-MOQ-{$moq}-WHT",
            'color' => 'White',
            'size' => 'M',
            'wholesale_price' => 20.00,
            'stock' => (int) floor($totalStock / 2),
            'is_active' => true,
        ]);

        // Create package assortment summing to MOQ
        $half = (int) floor($moq / 2);
        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $variantBlack->id,
            'package_name' => 'Universal Package',
            'color' => 'Black',
            'size' => 'M',
            'quantity' => $half,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $variantWhite->id,
            'package_name' => 'Universal Package',
            'color' => 'White',
            'size' => 'M',
            'quantity' => $moq - $half,
        ]);

        return $product->fresh(['variants', 'packageAllocations']);
    }

    /**
     * TEST CASE 39 — MOQ = 25
     * Accept: 25, 50, 75, 100
     * Reject: 24, 26, 49, 51, 80
     */
    public function test_moq_25_multiples_enforced_strictly_in_cart(): void
    {
        $product = $this->createProductWithMoq(25, 1000);

        // Valid multiples -> ACCEPT (200)
        foreach ([25, 50, 75, 100] as $qty) {
            $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
                'product_id' => $product->id,
                'quantity' => $qty,
            ]);
            $res->assertOk();
            // Clear cart between runs
            $this->actingAs($this->buyer, 'sanctum')->deleteJson('/api/v1/cart');
        }

        // Invalid quantities -> REJECT (422) with structured business error contract
        foreach ([24, 26, 49, 51, 80] as $qty) {
            $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
                'product_id' => $product->id,
                'quantity' => $qty,
            ]);
            $res->assertStatus(422);

            $expectedCode = $qty < 25 ? 'BELOW_MOQ' : 'INVALID_MOQ_MULTIPLE';
            $res->assertJsonPath('error_code', $expectedCode);
            $res->assertJsonPath('data.code', $expectedCode);
            $res->assertJsonPath('data.moq', 25);
            $res->assertJsonPath('data.requested_quantity', $qty);
        }
    }

    /**
     * TEST CASE 39 — MOQ = 65
     * Accept: 65, 130, 195, 260
     * Reject: 64, 66, 100, 129
     */
    public function test_moq_65_multiples_enforced_strictly_in_cart(): void
    {
        $product = $this->createProductWithMoq(65, 1000);

        // Valid multiples -> ACCEPT
        foreach ([65, 130, 195, 260] as $qty) {
            $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
                'product_id' => $product->id,
                'quantity' => $qty,
            ]);
            $res->assertOk();
            $this->actingAs($this->buyer, 'sanctum')->deleteJson('/api/v1/cart');
        }

        // Invalid quantities -> REJECT
        foreach ([64, 66, 100, 129] as $qty) {
            $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
                'product_id' => $product->id,
                'quantity' => $qty,
            ]);
            $res->assertStatus(422);

            $expectedCode = $qty < 65 ? 'BELOW_MOQ' : 'INVALID_MOQ_MULTIPLE';
            $res->assertJsonPath('error_code', $expectedCode);
            $res->assertJsonPath('data.code', $expectedCode);
            $res->assertJsonPath('data.moq', 65);
            $res->assertJsonPath('data.requested_quantity', $qty);
        }
    }

    /**
     * TEST CASE 40 — COMBINED STOCK + MOQ ENFORCEMENT
     * MOQ = 25, Stock = 80
     * 25 → ACCEPT
     * 50 → ACCEPT
     * 75 → ACCEPT
     * 100 → REJECT stock (exceeds 80)
     * 80 → REJECT MOQ (80 is not a multiple of 25, even though 80 units are in stock!)
     */
    public function test_combined_stock_and_moq_enforcement_moq_25_stock_80(): void
    {
        $product = $this->createProductWithMoq(25, 80);

        // 25 -> ACCEPT
        $res25 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 25,
        ]);
        $res25->assertOk();
        $this->actingAs($this->buyer, 'sanctum')->deleteJson('/api/v1/cart');

        // 50 -> ACCEPT
        $res50 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 50,
        ]);
        $res50->assertOk();
        $this->actingAs($this->buyer, 'sanctum')->deleteJson('/api/v1/cart');

        // 75 -> ACCEPT
        $res75 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 75,
        ]);
        $res75->assertOk();
        $this->actingAs($this->buyer, 'sanctum')->deleteJson('/api/v1/cart');

        // 100 -> REJECT stock (stock is 80)
        $res100 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 100,
        ]);
        $res100->assertStatus(422)
            ->assertJsonPath('error_code', 'INSUFFICIENT_STOCK');

        // 80 -> REJECT MOQ (80 is in stock, but 80 % 25 !== 0! NO stock bypass!)
        $res80 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 80,
        ]);
        $res80->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_MOQ_MULTIPLE');
    }

    /**
     * TEST CASE 40 (PART 2) — MOQ = 65, Stock = 150
     * 65 → ACCEPT
     * 130 → ACCEPT
     * 195 → REJECT stock (exceeds 150)
     * 150 → REJECT MOQ (150 is not a multiple of 65)
     */
    public function test_combined_stock_and_moq_enforcement_moq_65_stock_150(): void
    {
        $product = $this->createProductWithMoq(65, 150);

        // 65 -> ACCEPT
        $res65 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 65,
        ]);
        $res65->assertOk();
        $this->actingAs($this->buyer, 'sanctum')->deleteJson('/api/v1/cart');

        // 130 -> ACCEPT
        $res130 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 130,
        ]);
        $res130->assertOk();
        $this->actingAs($this->buyer, 'sanctum')->deleteJson('/api/v1/cart');

        // 195 -> REJECT stock (150 available)
        $res195 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 195,
        ]);
        $res195->assertStatus(422)
            ->assertJsonPath('error_code', 'INSUFFICIENT_STOCK');

        // 150 -> REJECT MOQ (150 % 65 !== 0)
        $res150 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 150,
        ]);
        $res150->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_MOQ_MULTIPLE');
    }

    /**
     * TEST: Cart quantity updates must enforce MOQ multiples
     */
    public function test_cart_item_update_enforces_moq_multiples(): void
    {
        $product = $this->createProductWithMoq(25, 200);

        // Add 25
        $addRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 25,
        ]);
        $addRes->assertOk();
        $itemId = $addRes->json('data.items.0.id');

        // Update 25 -> 50: ACCEPT
        $up50 = $this->actingAs($this->buyer, 'sanctum')->putJson("/api/v1/cart/{$itemId}", [
            'quantity' => 50,
        ]);
        $up50->assertOk()
            ->assertJsonPath('data.items.0.quantity', 50);

        // Update 50 -> 60: REJECT (60 % 25 !== 0)
        $up60 = $this->actingAs($this->buyer, 'sanctum')->putJson("/api/v1/cart/{$itemId}", [
            'quantity' => 60,
        ]);
        $up60->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_MOQ_MULTIPLE');
    }

    /**
     * TEST: Pre-checkout revalidation checks against CURRENT product MOQ
     */
    public function test_pre_checkout_revalidation_detects_stale_moq_violations(): void
    {
        $product = $this->createProductWithMoq(25, 500);

        // Buyer adds 50 pcs (valid multiple of 25)
        $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 50,
        ]);

        // Admin updates package assortment: new MOQ = 40!
        $product->update(['moq' => 40]);

        // Revalidate cart
        $reval = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart/revalidate');
        $reval->assertOk()
            ->assertJsonPath('is_valid', false);

        $this->assertCount(1, $reval->json('violations'));
        $this->assertEquals('INVALID_MOQ_MULTIPLE', $reval->json('violations.0.error_code'));
        $this->assertEquals(40, $reval->json('violations.0.moq'));
    }

    /**
     * TEST: Final order placement strictly validates MOQ multiple and inventory atomically
     */
    public function test_order_creation_rejects_non_multiple_of_moq(): void
    {
        $product = $this->createProductWithMoq(25, 500);

        $baseOrderPayload = [
            'shipping_name' => 'John Doe',
            'email' => 'buyer@test.com',
            'shipping_phone' => '+1 555-0100',
            'shipping_address1' => '123 Export Ave',
            'shipping_city' => 'New York',
            'shipping_region' => 'NY',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
        ];

        // 1. Order with 80 pcs (not a multiple of 25) -> REJECTED 422
        $res80 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', array_merge($baseOrderPayload, [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 80,
                ]
            ]
        ]));

        $res80->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_MOQ_MULTIPLE')
            ->assertJsonPath('data.moq', 25)
            ->assertJsonPath('data.requested_quantity', 80);

        // 2. Order with 50 pcs (valid multiple of 25) -> ACCEPTED 201
        $res50 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', array_merge($baseOrderPayload, [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 50,
                ]
            ]
        ]));

        $res50->assertStatus(201)
            ->assertJsonPath('success', true);
    }
}
