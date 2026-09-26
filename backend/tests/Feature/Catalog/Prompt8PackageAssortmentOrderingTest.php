<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductPackageAllocation;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Prompt8PackageAssortmentOrderingTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private Brand $brand;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create();
        $this->brand = Brand::create(['name' => 'Ayaan Export', 'slug' => 'ayaan-export']);
        $this->category = Category::create(['name' => 'Knitwear', 'slug' => 'knitwear']);
    }

    /**
     * Helper to create the standard Prompt 8 test product:
     * Package:
     * Black/S = 2, Black/M = 4, White/S = 2, White/M = 4
     * MOQ = 12
     */
    private function createPrompt8Product(array $customStock = []): array
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Universal Package Polo',
            'slug' => 'universal-package-polo',
            'sku' => 'SKU-UNIV-12',
            'wholesale_price' => 15.00,
            'bulk_threshold' => 60,
            'bulk_price' => 12.00,
            'moq' => 12,
            'status' => 'published',
        ]);

        $defaultStock = [
            'Black_S' => 100,
            'Black_M' => 100,
            'White_S' => 100,
            'White_M' => 100,
        ];
        $stock = array_merge($defaultStock, $customStock);

        $vBlackS = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Black / S',
            'sku' => 'SKU-UNIV-BLK-S',
            'color' => 'Black',
            'size' => 'S',
            'wholesale_price' => 15.00,
            'stock' => $stock['Black_S'],
            'is_active' => true,
        ]);

        $vBlackM = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Black / M',
            'sku' => 'SKU-UNIV-BLK-M',
            'color' => 'Black',
            'size' => 'M',
            'wholesale_price' => 15.00,
            'stock' => $stock['Black_M'],
            'is_active' => true,
        ]);

        $vWhiteS = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'White / S',
            'sku' => 'SKU-UNIV-WHT-S',
            'color' => 'White',
            'size' => 'S',
            'wholesale_price' => 15.00,
            'stock' => $stock['White_S'],
            'is_active' => true,
        ]);

        $vWhiteM = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'White / M',
            'sku' => 'SKU-UNIV-WHT-M',
            'color' => 'White',
            'size' => 'M',
            'wholesale_price' => 15.00,
            'stock' => $stock['White_M'],
            'is_active' => true,
        ]);

        // Package assortment: Black/S=2, Black/M=4, White/S=2, White/M=4 (Sum = 12 = MOQ)
        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $vBlackS->id,
            'package_name' => 'Universal Package',
            'color' => 'Black',
            'size' => 'S',
            'quantity' => 2,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $vBlackM->id,
            'package_name' => 'Universal Package',
            'color' => 'Black',
            'size' => 'M',
            'quantity' => 4,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $vWhiteS->id,
            'package_name' => 'Universal Package',
            'color' => 'White',
            'size' => 'S',
            'quantity' => 2,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $vWhiteM->id,
            'package_name' => 'Universal Package',
            'color' => 'White',
            'size' => 'M',
            'quantity' => 4,
        ]);

        return [
            'product' => $product->fresh(['variants', 'packageAllocations']),
            'variants' => [
                'Black_S' => $vBlackS,
                'Black_M' => $vBlackM,
                'White_S' => $vWhiteS,
                'White_M' => $vWhiteM,
            ],
        ];
    }

    private function getBaseOrderPayload(): array
    {
        return [
            'shipping_name' => 'Antigravity Buyer',
            'email' => 'buyer@example.com',
            'shipping_phone' => '+1 555-0199',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'Springfield',
            'shipping_region' => 'OR',
            'shipping_postal_code' => '97477',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
        ];
    }

    /**
     * TEST 1:
     * Package: Black/S=2, Black/M=4, White/S=2, White/M=4 (MOQ=12).
     * Customer requests 1 package (12 pcs).
     * Expected: Black/S=2, Black/M=4, White/S=2, White/M=4.
     */
    public function test_1_customer_requests_1_package_breakdown_matches(): void
    {
        ['product' => $product] = $this->createPrompt8Product();

        $breakdown = $product->getPackageBreakdownForQuantity(12);

        $this->assertCount(4, $breakdown);

        $map = [];
        foreach ($breakdown as $item) {
            $map[$item['color'] . '_' . $item['size']] = $item['quantity'];
        }

        $this->assertEquals(2, $map['Black_S']);
        $this->assertEquals(4, $map['Black_M']);
        $this->assertEquals(2, $map['White_S']);
        $this->assertEquals(4, $map['White_M']);
        $this->assertEquals(12, array_sum($map));
    }

    /**
     * TEST 2:
     * Customer requests 3 packages (36 pcs).
     * Expected: Black/S=6, Black/M=12, White/S=6, White/M=12. Total = 36.
     */
    public function test_2_customer_requests_3_packages_breakdown_multiplies_exactly(): void
    {
        ['product' => $product] = $this->createPrompt8Product();

        $breakdown = $product->getPackageBreakdownForQuantity(36);

        $this->assertCount(4, $breakdown);

        $map = [];
        foreach ($breakdown as $item) {
            $map[$item['color'] . '_' . $item['size']] = $item['quantity'];
        }

        $this->assertEquals(6, $map['Black_S']);
        $this->assertEquals(12, $map['Black_M']);
        $this->assertEquals(6, $map['White_S']);
        $this->assertEquals(12, $map['White_M']);
        $this->assertEquals(36, array_sum($map));
    }

    /**
     * TEST 3:
     * Customer attempts individual variant order.
     * Expected: backend rejects because package_count is the required purchase unit.
     */
    public function test_3_customer_attempts_individual_variant_order_rejected(): void
    {
        ['product' => $product, 'variants' => $variants] = $this->createPrompt8Product();

        // 1. Attempt adding single variant by ID to cart
        $cartRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'variant_id' => $variants['Black_S']->id,
            'quantity' => 12,
        ]);

        $cartRes->assertStatus(422)
            ->assertJsonPath('error_code', 'VARIANT_ORDERING_NOT_ALLOWED');

        // 2. Attempt adding single size 'S' to cart
        $cartResSize = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'S',
            'quantity' => 12,
        ]);

        $cartResSize->assertStatus(422)
            ->assertJsonPath('error_code', 'VARIANT_ORDERING_NOT_ALLOWED');

        // 3. Attempt direct order submission specifying a single variant
        $orderRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', array_merge($this->getBaseOrderPayload(), [
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variants['Black_S']->id,
                    'size' => 'S',
                    'quantity' => 12,
                ]
            ]
        ]));

        $orderRes->assertStatus(422);
    }

    /**
     * TEST 4:
     * Package requires: Black/S = 2.
     * Inventory: Black/S = 3.
     * Customer requests: 2 packages (Required: 4).
     * Expected: order rejected for insufficient variant inventory.
     */
    public function test_4_insufficient_variant_inventory_for_required_multiplier_rejected(): void
    {
        ['product' => $product] = $this->createPrompt8Product([
            'Black_S' => 3, // Only 3 pcs available, but 2 packages require 4 pcs!
            'Black_M' => 100,
            'White_S' => 100,
            'White_M' => 100,
        ]);

        // Attempt order for 2 packages = 24 pcs
        $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', array_merge($this->getBaseOrderPayload(), [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 24, // 2 packages
                ]
            ]
        ]));

        $res->assertStatus(422)
            ->assertJsonPath('error_code', 'INSUFFICIENT_STOCK')
            ->assertJsonPath('data.size', 'S')
            ->assertJsonPath('data.color', 'Black')
            ->assertJsonPath('data.requested_quantity', 4)
            ->assertJsonPath('data.available_quantity', 3);
    }

    /**
     * TEST 5:
     * All required variants support 5 packages.
     * Expected: 5 packages accepted.
     */
    public function test_5_all_required_variants_support_5_packages_accepted(): void
    {
        ['product' => $product, 'variants' => $variants] = $this->createPrompt8Product([
            'Black_S' => 20, // 5 packages need 10
            'Black_M' => 30, // 5 packages need 20
            'White_S' => 20, // 5 packages need 10
            'White_M' => 30, // 5 packages need 20
        ]);

        $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', array_merge($this->getBaseOrderPayload(), [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 60, // 5 packages * 12 pcs
                ]
            ]
        ]));

        $res->assertStatus(201)
            ->assertJsonPath('success', true);

        // Verify inventory deduction per variant (scaled by 5 packages)
        $this->assertEquals(10, $variants['Black_S']->fresh()->stock); // 20 - 10 = 10
        $this->assertEquals(10, $variants['Black_M']->fresh()->stock); // 30 - 20 = 10
        $this->assertEquals(10, $variants['White_S']->fresh()->stock); // 20 - 10 = 10
        $this->assertEquals(10, $variants['White_M']->fresh()->stock); // 30 - 20 = 10
    }

    /**
     * TEST 6:
     * Inventory total is sufficient but one required variant is insufficient.
     * Total stock = 1000 pcs, but White/M has only 2 pcs.
     * Expected: order rejected.
     */
    public function test_6_total_inventory_sufficient_but_one_variant_insufficient_rejected(): void
    {
        ['product' => $product] = $this->createPrompt8Product([
            'Black_S' => 300,
            'Black_M' => 400,
            'White_S' => 298,
            'White_M' => 2, // Total stock = 1000 pcs! But 1 package needs 4 White/M!
        ]);

        // Attempt 1 package = 12 pcs
        $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', array_merge($this->getBaseOrderPayload(), [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 12,
                ]
            ]
        ]));

        $res->assertStatus(422)
            ->assertJsonPath('error_code', 'INSUFFICIENT_STOCK')
            ->assertJsonPath('data.color', 'White')
            ->assertJsonPath('data.size', 'M')
            ->assertJsonPath('data.requested_quantity', 4)
            ->assertJsonPath('data.available_quantity', 2);
    }

    /**
     * TEST 7:
     * Cart quantity changes: 2 packages -> 4 packages.
     * Expected: all variant requirements recalculate automatically.
     */
    public function test_7_cart_quantity_change_recalculates_all_variant_requirements(): void
    {
        ['product' => $product] = $this->createPrompt8Product([
            'Black_S' => 50,
            'Black_M' => 50,
            'White_S' => 50,
            'White_M' => 50,
        ]);

        // 1. Add 2 packages = 24 pcs
        $addRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 24,
        ]);
        $addRes->assertOk();

        $cartItemId = $addRes->json('data.items.0.id');

        // 2. Update to 4 packages = 48 pcs
        $updRes = $this->actingAs($this->buyer, 'sanctum')->putJson("/api/v1/cart/{$cartItemId}", [
            'quantity' => 48,
        ]);
        $updRes->assertOk();

        $updatedItem = $updRes->json('data.items.0');
        $this->assertEquals(48, $updatedItem['quantity']);

        $bdMap = [];
        foreach ($updatedItem['package_breakdown'] as $cell) {
            $bdMap[$cell['color'] . '_' . $cell['size']] = $cell['quantity'];
        }

        // Scaled by 4 packages: Black/S: 2*4=8, Black/M: 4*4=16, White/S: 2*4=8, White/M: 4*4=16
        $this->assertEquals(8, $bdMap['Black_S']);
        $this->assertEquals(16, $bdMap['Black_M']);
        $this->assertEquals(8, $bdMap['White_S']);
        $this->assertEquals(16, $bdMap['White_M']);
        $this->assertEquals(48, array_sum($bdMap));
    }

    /**
     * TEST 8:
     * MOQ changes after admin edits package assortment.
     * Expected: future orders use new package definition. Historical orders remain unchanged.
     */
    public function test_8_historical_orders_preserve_snapshot_when_admin_edits_assortment(): void
    {
        ['product' => $product] = $this->createPrompt8Product([
            'Black_S' => 200,
            'Black_M' => 200,
            'White_S' => 200,
            'White_M' => 200,
        ]);

        // Place initial order for 1 package = 12 pcs
        $orderRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', array_merge($this->getBaseOrderPayload(), [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 12,
                ]
            ]
        ]));

        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('data.id');

        $orderItem = OrderItem::where('order_id', $orderId)->first();
        $this->assertNotNull($orderItem);
        $this->assertEquals(12, $orderItem->quantity);

        $initialBreakdown = $orderItem->package_breakdown;
        $this->assertCount(4, $initialBreakdown);
        $this->assertEquals(12, array_sum(array_column($initialBreakdown, 'quantity')));

        // Admin now edits product: updates package assortment to 24 pcs (double quantities)
        foreach ($product->packageAllocations as $alloc) {
            $alloc->update(['quantity' => $alloc->quantity * 2]);
        }
        $product->update(['moq' => 24]);

        // Verify historical order item remains COMPLETELY UNCHANGED
        $historicalItem = OrderItem::where('order_id', $orderId)->first();
        $this->assertEquals(12, $historicalItem->quantity);
        $this->assertEquals($initialBreakdown, $historicalItem->package_breakdown);

        // Verify a new future order requires the NEW MOQ of 24
        $newOrderRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', array_merge($this->getBaseOrderPayload(), [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 24, // 1 package under new 24-pc MOQ
                ]
            ]
        ]));

        $newOrderRes->assertStatus(201);
        $newOrderId = $newOrderRes->json('data.id');
        $newOrderItem = OrderItem::where('order_id', $newOrderId)->first();
        $this->assertEquals(24, $newOrderItem->quantity);
        $this->assertEquals(24, array_sum(array_column($newOrderItem->package_breakdown, 'quantity')));
    }
}
