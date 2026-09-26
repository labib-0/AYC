<?php

namespace Tests\Feature\Cart;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_retrieve_cart(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/cart');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'user_id',
                    'items',
                    'total_items',
                    'subtotal',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user_id' => (string) $user->id,
                    'total_items' => 0,
                    'subtotal' => 0,
                ],
            ]);
    }

    public function test_guest_user_can_retrieve_and_manage_cart_with_session_id(): void
    {
        $product = Product::factory()->create(['wholesale_price' => 50.00, 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 100]);

        $sessionId = 'sess_test_12345';

        // Add item as guest
        $addResponse = $this->withHeader('X-Session-Id', $sessionId)
            ->postJson('/api/v1/cart', [
                'product_id' => $product->id,
                'size' => 'M',
                'quantity' => 2,
            ]);

        $addResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'session_id' => $sessionId,
                    'total_items' => 2,
                    'subtotal' => 100.00,
                ],
            ]);

        // Retrieve guest cart
        $getResponse = $this->withHeader('X-Session-Id', $sessionId)->getJson('/api/v1/cart');
        $getResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'session_id' => $sessionId,
                    'total_items' => 2,
                    'subtotal' => 100.00,
                ],
            ]);
    }

    public function test_adding_same_variant_or_size_increases_quantity(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['wholesale_price' => 35.00, 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'L', 'stock' => 50]);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'L',
            'quantity' => 3,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'L',
            'quantity' => 2,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_items' => 5,
                    'subtotal' => 175.00,
                ],
            ]);

        $this->assertCount(1, $response->json('data.items'));
    }

    public function test_cannot_add_more_quantity_than_available_stock(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'S', 'stock' => 5]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'S',
            'quantity' => 10,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_cannot_add_inactive_or_unpublished_product(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['status' => 'draft']);
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 20]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'M',
            'quantity' => 1,
        ]);

        $response->assertStatus(422);
    }

    public function test_prices_are_calculated_server_side_and_client_prices_ignored(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['wholesale_price' => 80.00, 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'XL', 'price' => 80.00, 'stock' => 30]);

        // Client attempts to pass fake price 1.00
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'XL',
            'quantity' => 2,
            'price' => 1.00,
            'subtotal' => 2.00,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'subtotal' => 160.00,
                    'items' => [
                        [
                            'unit_price' => 80.00,
                            'line_total' => 160.00,
                        ],
                    ],
                ],
            ]);
    }

    public function test_can_update_quantity_and_delete_when_zero(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['wholesale_price' => 40.00, 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 20]);

        $addResponse = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'M',
            'quantity' => 2,
        ]);

        $itemId = $addResponse->json('data.items.0.id');

        // Update quantity to 4
        $updateResponse = $this->actingAs($user, 'sanctum')->putJson("/api/v1/cart/{$itemId}", [
            'quantity' => 4,
        ]);

        $updateResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_items' => 4,
                    'subtotal' => 160.00,
                ],
            ]);

        // Update quantity to 0 removes item
        $zeroResponse = $this->actingAs($user, 'sanctum')->putJson("/api/v1/cart/{$itemId}", [
            'quantity' => 0,
        ]);

        $zeroResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_items' => 0,
                    'subtotal' => 0,
                ],
            ]);
    }

    public function test_can_remove_item_and_clear_cart(): void
    {
        $user = User::factory()->create();
        $p1 = Product::factory()->create(['wholesale_price' => 20.00, 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $p1->id, 'size' => 'S', 'stock' => 20]);
        $p2 = Product::factory()->create(['wholesale_price' => 30.00, 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $p2->id, 'size' => 'L', 'stock' => 20]);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', ['product_id' => $p1->id, 'size' => 'S', 'quantity' => 1]);
        $addResponse = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', ['product_id' => $p2->id, 'size' => 'L', 'quantity' => 1]);

        $this->assertEquals(2, $addResponse->json('data.total_items'));

        $p1ItemId = $addResponse->json('data.items.0.id');

        // Remove 1 item
        $removeResponse = $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/cart/{$p1ItemId}");
        $removeResponse->assertStatus(200);
        $this->assertEquals(1, $removeResponse->json('data.total_items'));

        // Clear cart
        $clearResponse = $this->actingAs($user, 'sanctum')->deleteJson('/api/v1/cart');
        $clearResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_items' => 0,
                    'subtotal' => 0,
                ],
            ]);
    }

    public function test_guest_cart_merges_into_user_cart_on_login(): void
    {
        $user = User::factory()->create();
        $sessionId = 'sess_merge_test_999';

        $p1 = Product::factory()->create(['wholesale_price' => 50.00, 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $p1->id, 'size' => 'M', 'stock' => 100]);

        $p2 = Product::factory()->create(['wholesale_price' => 25.00, 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $p2->id, 'size' => 'L', 'stock' => 100]);

        // Add p1 to guest cart
        $this->withHeader('X-Session-Id', $sessionId)->postJson('/api/v1/cart', [
            'product_id' => $p1->id,
            'size' => 'M',
            'quantity' => 2,
        ]);

        // Add p2 to user cart
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $p2->id,
            'size' => 'L',
            'quantity' => 1,
        ]);

        // Merge
        $mergeResponse = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart/merge', [
            'session_id' => $sessionId,
        ]);

        $mergeResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_items' => 3,
                    'subtotal' => 125.00,
                ],
            ]);
    }
}
