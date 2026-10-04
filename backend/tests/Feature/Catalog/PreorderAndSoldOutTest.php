<?php

namespace Tests\Feature\Catalog;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Wishlist;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PreorderAndSoldOutTest extends TestCase
{
    use RefreshDatabase;

    protected Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->warehouse = Warehouse::create([
            'name' => 'Main Test WH',
            'code' => 'WH-TEST-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    private function adminUser(): User
    {
        return User::factory()->create([
            'email' => 'admin_poso_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);
    }

    private function customerUser(): User
    {
        return User::factory()->create([
            'email' => 'customer_poso_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    private function minimalPayload(array $overrides = []): array
    {
        $uid = strtolower(substr(uniqid(), -6));
        return array_merge([
            'product_id' => 'AYC-T-' . strtoupper($uid),
            'name' => 'Test Item ' . $uid,
            'slug' => 'test-item-' . $uid,
            'sku' => 'SKU-T-' . $uid,
            'brand' => 'Ayaan',
            'audience' => 'MEN',
            'status' => 'published',
            'wholesale_price' => 20.00,
            'bulk_threshold' => 50,
            'bulk_price' => 18.00,
            'full_stock_price' => 15.00,
            'moq' => 5,
            'warehouse_id' => $this->warehouse->id,
            'stock' => 50,
            'variants' => [
                ['size' => 'M', 'stock' => 25, 'color' => 'Black'],
                ['size' => 'L', 'stock' => 25, 'color' => 'Black'],
            ],
        ], $overrides);
    }

    public function test_mutual_exclusivity_on_creation(): void
    {
        $admin = $this->adminUser();
        $payload = $this->minimalPayload([
            'is_preorder' => true,
            'is_sold_out' => true,
            'estimated_delivery_date' => Carbon::today()->addDays(20)->toDateString(),
        ]);

        $res = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['is_sold_out']);
    }

    public function test_mutual_exclusivity_on_update(): void
    {
        $admin = $this->adminUser();
        $product = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => true,
            'is_sold_out' => false,
            'estimated_delivery_date' => Carbon::today()->addDays(20)->toDateString(),
        ]);

        $res = $this->actingAs($admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", [
            'is_sold_out' => true,
            'is_preorder' => true,
            'estimated_delivery_date' => Carbon::today()->addDays(20)->toDateString(),
        ]);
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['is_sold_out']);
    }

    public function test_sold_out_product_cannot_be_added_to_cart(): void
    {
        $user = $this->customerUser();
        $product = Product::factory()->create([
            'status' => 'published',
            'is_sold_out' => true,
            'is_preorder' => false,
            'stock' => 100,
            'wholesale_price' => 25.00,
        ]);
        ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'M',
            'stock' => 50,
        ]);

        $res = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'M',
            'quantity' => 5,
        ]);

        $res->assertStatus(422);
        $res->assertJson([
            'error_code' => 'PRODUCT_SOLD_OUT',
        ]);
    }

    public function test_preorder_product_can_be_added_to_cart_even_with_zero_stock(): void
    {
        $user = $this->customerUser();
        $futureDate = Carbon::today()->addDays(25)->toDateString();
        $product = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => true,
            'is_sold_out' => false,
            'stock' => 0,
            'wholesale_price' => 30.00,
            'estimated_delivery_date' => $futureDate,
        ]);
        ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'Free Size',
            'stock' => 0,
        ]);

        $res = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'Free Size',
            'quantity' => 10,
        ]);

        $res->assertStatus(200);
        $res->assertJson([
            'success' => true,
        ]);

        $item = CartItem::where('product_id', $product->id)->first();
        $this->assertNotNull($item);
        $this->assertEquals(10, $item->quantity);
    }

    public function test_cannot_mix_ready_stock_and_preorder_products_in_cart(): void
    {
        $user = $this->customerUser();

        // 1. Add Pre-Order item
        $poProduct = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => true,
            'is_sold_out' => false,
            'stock' => 0,
            'wholesale_price' => 30.00,
            'estimated_delivery_date' => Carbon::today()->addDays(20)->toDateString(),
        ]);
        ProductVariant::factory()->create([
            'product_id' => $poProduct->id,
            'size' => 'M',
            'stock' => 0,
        ]);

        $res1 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $poProduct->id,
            'size' => 'M',
            'quantity' => 5,
        ]);
        $res1->assertStatus(200);

        // 2. Try to add Ready Stock item
        $readyProduct = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => false,
            'is_sold_out' => false,
            'stock' => 100,
            'wholesale_price' => 20.00,
        ]);
        ProductVariant::factory()->create([
            'product_id' => $readyProduct->id,
            'size' => 'M',
            'stock' => 50,
        ]);

        $res2 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $readyProduct->id,
            'size' => 'M',
            'quantity' => 5,
        ]);

        $res2->assertStatus(422);
        $res2->assertJson([
            'error_code' => 'INCOMPATIBLE_CART_ITEMS',
        ]);
    }

    public function test_cannot_add_preorder_to_ready_stock_cart(): void
    {
        $user = $this->customerUser();

        // 1. Add Ready Stock item first
        $readyProduct = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => false,
            'is_sold_out' => false,
            'stock' => 100,
            'wholesale_price' => 20.00,
        ]);
        ProductVariant::factory()->create([
            'product_id' => $readyProduct->id,
            'size' => 'M',
            'stock' => 50,
        ]);

        $res1 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $readyProduct->id,
            'size' => 'M',
            'quantity' => 5,
        ]);
        $res1->assertStatus(200);

        // 2. Try to add Pre-Order item
        $poProduct = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => true,
            'is_sold_out' => false,
            'stock' => 0,
            'wholesale_price' => 30.00,
            'estimated_delivery_date' => Carbon::today()->addDays(20)->toDateString(),
        ]);
        ProductVariant::factory()->create([
            'product_id' => $poProduct->id,
            'size' => 'M',
            'stock' => 0,
        ]);

        $res2 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $poProduct->id,
            'size' => 'M',
            'quantity' => 5,
        ]);

        $res2->assertStatus(422);
        $res2->assertJson([
            'error_code' => 'INCOMPATIBLE_CART_ITEMS',
        ]);
    }

    public function test_sold_out_product_can_be_added_to_wishlist(): void
    {
        $user = $this->customerUser();
        $product = Product::factory()->create([
            'status' => 'published',
            'is_sold_out' => true,
            'is_preorder' => false,
            'stock' => 0,
            'wholesale_price' => 45.00,
        ]);

        $res = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', [
            'product_id' => $product->id,
        ]);

        $res->assertStatus(201);
        $this->assertDatabaseHas('wishlist_items', [
            'product_id' => $product->id,
        ]);
    }

    public function test_catalog_availability_filters(): void
    {
        $ready = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => false,
            'is_sold_out' => false,
        ]);

        $preorder = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => true,
            'is_sold_out' => false,
            'estimated_delivery_date' => Carbon::today()->addDays(14)->toDateString(),
        ]);

        $soldOut = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => false,
            'is_sold_out' => true,
        ]);

        // Filter availability=preorder
        $resPo = $this->getJson('/api/v1/products?availability=preorder');
        $resPo->assertStatus(200);
        $poIds = collect($resPo->json('data'))->pluck('id')->all();
        $this->assertContains($preorder->id, $poIds);
        $this->assertNotContains($ready->id, $poIds);
        $this->assertNotContains($soldOut->id, $poIds);

        // Filter availability=sold_out
        $resSo = $this->getJson('/api/v1/products?availability=sold_out');
        $resSo->assertStatus(200);
        $soIds = collect($resSo->json('data'))->pluck('id')->all();
        $this->assertContains($soldOut->id, $soIds);
        $this->assertNotContains($ready->id, $soIds);
        $this->assertNotContains($preorder->id, $soIds);

        // Filter availability=ready_stock
        $resRs = $this->getJson('/api/v1/products?availability=ready_stock');
        $resRs->assertStatus(200);
        $rsIds = collect($resRs->json('data'))->pluck('id')->all();
        $this->assertContains($ready->id, $rsIds);
        $this->assertNotContains($preorder->id, $rsIds);
        $this->assertNotContains($soldOut->id, $rsIds);
    }

    public function test_sold_out_products_ordered_at_the_end_of_catalog(): void
    {
        // Create older ready product
        $olderReady = Product::factory()->create([
            'status' => 'published',
            'is_sold_out' => false,
            'created_at' => Carbon::now()->subDays(5),
        ]);

        // Create newer sold out product
        $newerSoldOut = Product::factory()->create([
            'status' => 'published',
            'is_sold_out' => true,
            'created_at' => Carbon::now(),
        ]);

        $res = $this->getJson('/api/v1/products');
        $res->assertStatus(200);

        $items = collect($res->json('data'));
        $olderReadyIdx = $items->search(fn($p) => $p['id'] === $olderReady->id);
        $newerSoldOutIdx = $items->search(fn($p) => $p['id'] === $newerSoldOut->id);

        $this->assertNotFalse($olderReadyIdx);
        $this->assertNotFalse($newerSoldOutIdx);
        // Older ready product must come BEFORE newer sold-out product
        $this->assertLessThan($newerSoldOutIdx, $olderReadyIdx);
    }

    public function test_order_creation_with_preorder_product_succeeds_with_zero_stock(): void
    {
        $user = $this->customerUser();
        $futureDate = Carbon::today()->addDays(20)->toDateString();
        $poProduct = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => true,
            'is_sold_out' => false,
            'stock' => 0,
            'wholesale_price' => 45.00,
            'msrp_price' => 45.00,
            'moq' => 1,
            'estimated_delivery_date' => $futureDate,
        ]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $poProduct->id,
            'size' => 'M',
            'stock' => 0,
        ]);

        // Add to cart
        $cartRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $poProduct->id,
            'size' => 'M',
            'quantity' => 2,
        ]);
        $cartRes->assertStatus(200);

        // Checkout
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $user->email,
            'shipping_name' => 'Jane Buyer',
            'shipping_address1' => '456 Preorder Ave',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'email' => $user->email,
            'status' => 'processing',
        ]);
    }
}
