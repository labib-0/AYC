<?php

namespace Tests\Feature\Order;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_customer_can_create_order_from_cart(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['wholesale_price' => 45.00, 'msrp_price' => 45.00, 'moq' => 1, 'status' => 'published']);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 50]);

        // Add to cart
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'M',
            'quantity' => 2,
        ]);

        // Checkout
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $user->email,
            'shipping_name' => 'John Buyer',
            'shipping_address1' => '123 Main St',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'order_number',
                    'subtotal',
                    'total_amount',
                    'status',
                    'payment_status',
                    'items',
                    'status_events',
                    'payments',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'subtotal' => 90.00,
                    'shipping_cost' => 15.00, // <= 150 gets 15.00
                    'tax_amount' => 4.50,     // 5% of 90.00
                    'total_amount' => 109.50,
                    'payment_status' => 'paid',
                    'status' => 'processing',
                ],
            ]);

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'email' => $user->email,
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);

        // Stock was decremented from 50 to 48
        $this->assertEquals(48, $variant->fresh()->stock);

        // Cart is cleared
        $cartCheck = $this->actingAs($user, 'sanctum')->getJson('/api/v1/cart');
        $this->assertEquals(0, $cartCheck->json('data.total_items'));
    }

    public function test_server_calculates_prices_and_client_prices_are_ignored(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['wholesale_price' => 100.00, 'msrp_price' => 100.00, 'moq' => 1, 'status' => 'published']);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'L', 'stock' => 20]);

        // Place order directly with bogus prices in payload
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $user->email,
            'shipping_name' => 'Jane Buyer',
            'shipping_address1' => '456 Market St',
            'shipping_city' => 'Chicago',
            'shipping_postal_code' => '60601',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size' => 'L',
                    'quantity' => 2,
                    'unit_price' => 1.00,       // Client sends $1.00 fake price
                    'subtotal' => 2.00,
                    'total' => 2.00,
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'subtotal' => 200.00, // 2 * 100.00
                    'shipping_cost' => 0.00, // > 150 gets FREE shipping
                    'tax_amount' => 10.00,   // 5% of 200.00
                    'total_amount' => 210.00,
                    'payment_status' => 'pending',
                ],
            ]);
    }

    public function test_insufficient_stock_fails_checkout_without_corrupting_inventory_or_cart(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['wholesale_price' => 50.00, 'msrp_price' => 50.00, 'moq' => 1, 'status' => 'published']);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'S', 'stock' => 2]);


        // Add 2 to cart
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'S',
            'quantity' => 2,
        ]);

        // Another buyer buys 1 in background, reducing stock to 1
        $variant->update(['stock' => 1]);

        // Attempt checkout for 2
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $user->email,
            'shipping_name' => 'Buyer',
            'shipping_address1' => '123 St',
            'shipping_city' => 'City',
            'shipping_postal_code' => '12345',
        ]);

        $response->assertStatus(422);

        // Inventory is not corrupted (remains 1)
        $this->assertEquals(1, $variant->fresh()->stock);

        // No order was created
        $this->assertDatabaseCount('orders', 0);

        // Cart items remain intact
        $cartCheck = $this->actingAs($user, 'sanctum')->getJson('/api/v1/cart');
        $this->assertEquals(2, $cartCheck->json('data.total_items'));
    }

    public function test_draft_or_inactive_product_fails_checkout(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['status' => 'draft']);
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 20]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $user->email,
            'shipping_name' => 'Buyer',
            'shipping_address1' => '123 St',
            'shipping_city' => 'City',
            'shipping_postal_code' => '12345',
            'items' => [
                ['product_id' => $product->id, 'size' => 'M', 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_customer_can_list_own_orders(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        Order::factory()->create(['user_id' => $user->id, 'order_number' => 'AYN-2026-USER1']);
        Order::factory()->create(['user_id' => $otherUser->id, 'order_number' => 'AYN-2026-USER2']);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/orders');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('AYN-2026-USER1', $response->json('data.0.order_number'));
    }

    public function test_customer_can_view_own_order_detail_and_cannot_view_others(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownOrder = Order::factory()->create(['user_id' => $user->id]);
        $otherOrder = Order::factory()->create(['user_id' => $otherUser->id]);

        // Own order
        $response = $this->actingAs($user, 'sanctum')->getJson("/api/v1/orders/{$ownOrder->id}");
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => (string) $ownOrder->id,
                ],
            ]);

        // Other user's order
        $forbiddenResponse = $this->actingAs($user, 'sanctum')->getJson("/api/v1/orders/{$otherOrder->id}");
        $forbiddenResponse->assertStatus(403);
    }

    public function test_order_cancellation_restores_inventory(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['wholesale_price' => 60.00, 'status' => 'published']);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 10]);

        $orderResponse = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $user->email,
            'shipping_name' => 'Buyer',
            'shipping_address1' => '123 St',
            'shipping_city' => 'City',
            'shipping_postal_code' => '12345',
            'items' => [
                ['product_id' => $product->id, 'size' => 'M', 'quantity' => 3],
            ],
        ]);

        $orderId = $orderResponse->json('data.id');
        $this->assertEquals(7, $variant->fresh()->stock);

        // Cancel order
        $cancelResponse = $this->actingAs($user, 'sanctum')->postJson("/api/v1/orders/{$orderId}/cancel", [
            'reason' => 'Changed my mind',
        ]);

        $cancelResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'cancelled',
                ],
            ]);

        // Stock restored back to 10
        $this->assertEquals(10, $variant->fresh()->stock);
    }

    public function test_payment_proof_upload(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $user->id, 'payment_method' => 'transfer']);

        $file = UploadedFile::fake()->create('bank_receipt.pdf', 500, 'application/pdf');

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/v1/orders/{$order->id}/payment-proof", [
            'receipt' => $file,
        ]);

        $response->assertStatus(200);
        $this->assertNotNull($response->json('data.payment_proof_url'));
    }

    public function test_payment_webhook_handles_status_update_idempotently(): void
    {
        $order = Order::factory()->create([
            'order_number' => 'AYN-2026-WEBHOOK-TEST',
            'payment_status' => 'pending',
            'status' => 'pending',
        ]);

        $response = $this->postJson('/api/v1/payments/webhook', [
            'event' => 'payment.succeeded',
            'order_number' => 'AYN-2026-WEBHOOK-TEST',
            'transaction_id' => 'txn_stripe_123456',
            'amount' => 5000,
        ]);

        $response->assertStatus(200);

        $order->refresh();
        $this->assertEquals('paid', $order->payment_status);
        $this->assertEquals('processing', $order->status);
    }
}
