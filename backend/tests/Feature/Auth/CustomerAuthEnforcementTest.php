<?php

namespace Tests\Feature\Auth;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Quote;
use App\Models\Order;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerAuthEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $otherCustomer;
    protected Product $product;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create([
            'name' => 'Authentic Buyer',
            'email' => 'buyer@example.com',
            'role' => 'customer',
        ]);

        $this->otherCustomer = User::factory()->create([
            'name' => 'Victim User',
            'email' => 'victim@example.com',
            'role' => 'customer',
        ]);

        $this->product = Product::factory()->create([
            'name' => 'Premium Oxford Cotton Shirt',
            'slug' => 'premium-oxford-cotton-shirt',
            'sku' => 'OXF-SHT-001',
            'status' => 'published',
            'wholesale_price' => 20.00,
            'moq' => 5,
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'title' => 'Size M',
            'sku' => 'OXF-SHT-M',
            'size' => 'M',
            'stock' => 100,
        ]);
    }

    /**
     * 1. Public browsing must remain available to guests.
     */
    public function test_guest_can_browse_products_categories_and_brands(): void
    {
        $this->getJson('/api/v1/products')->assertStatus(200);
        $this->getJson('/api/v1/products/' . $this->product->slug)->assertStatus(200);
        $this->getJson('/api/v1/categories')->assertStatus(200);
        $this->getJson('/api/v1/brands')->assertStatus(200);
        $this->getJson('/api/v1/shipping/settings')->assertStatus(200);
    }

    /**
     * 2. Guest can add and manage items in guest cart with session ID.
     */
    public function test_guest_can_use_guest_cart(): void
    {
        $sessionId = 'sess_test_guest_123';

        $res = $this->withHeader('X-Session-Id', $sessionId)
            ->postJson('/api/v1/cart/items', [
                'product_id' => $this->product->id,
                'variant_id' => $this->variant->id,
                'size' => 'M',
                'quantity' => 5,
            ]);

        $res->assertStatus(200);

        $getRes = $this->withHeader('X-Session-Id', $sessionId)
            ->getJson('/api/v1/cart');

        $getRes->assertStatus(200);
        $this->assertCount(1, $getRes->json('data.items'));
    }

    /**
     * 3. Guest cannot validate checkout without authentication.
     */
    public function test_guest_checkout_validate_is_rejected_with_401(): void
    {
        $res = $this->postJson('/api/v1/checkout/validate', [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'variant_id' => $this->variant->id,
                    'size' => 'M',
                    'quantity' => 5,
                ],
            ],
        ]);

        $res->assertStatus(401);
    }

    /**
     * 4. Guest cannot place order without authentication.
     */
    public function test_guest_order_creation_is_rejected_with_401(): void
    {
        $res = $this->postJson('/api/v1/orders', [
            'email' => 'guest@example.com',
            'shipping_name' => 'Guest Buyer',
            'shipping_phone' => '+1234567890',
            'shipping_address1' => '123 Main St',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'variant_id' => $this->variant->id,
                    'size' => 'M',
                    'quantity' => 5,
                ],
            ],
        ]);

        $res->assertStatus(401);
        $this->assertEquals(0, Order::count());
    }

    /**
     * 5. Guest cannot submit RFQ without authentication.
     */
    public function test_guest_rfq_creation_is_rejected_with_401(): void
    {
        $res = $this->postJson('/api/v1/rfq', [
            'buyer_name' => 'Guest Buyer',
            'buyer_email' => 'guest@example.com',
            'company_name' => 'Guest Imports LLC',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_name' => $this->product->name,
                    'quantity' => 50,
                ],
            ],
        ]);

        $res->assertStatus(401);
        $this->assertEquals(0, Quote::count());
    }

    /**
     * 6. Authenticated customer can validate checkout.
     */
    public function test_authenticated_customer_can_validate_checkout(): void
    {
        $res = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/checkout/validate', [
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'variant_id' => $this->variant->id,
                        'size' => 'M',
                        'quantity' => 5,
                    ],
                ],
            ]);

        $res->assertStatus(200);
        $this->assertTrue($res->json('success'));
    }

    /**
     * 7. Authenticated customer can create order and user_id is authoritatively set to caller.
     */
    public function test_authenticated_customer_can_place_order_and_user_id_is_guaranteed(): void
    {
        $res = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/orders', [
                'user_id' => $this->otherCustomer->id, // Attempt IDOR / spoofing
                'customer_id' => $this->otherCustomer->id,
                'shipping_name' => 'Authentic Buyer',
                'shipping_phone' => '+1234567890',
                'shipping_address1' => '123 Main St',
                'shipping_city' => 'New York',
                'shipping_postal_code' => '10001',
                'shipping_country_code' => 'US',
                'payment_method' => 'card',
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'variant_id' => $this->variant->id,
                        'size' => 'M',
                        'quantity' => 5,
                    ],
                ],
            ]);

        $res->assertStatus(201);
        $order = Order::first();
        $this->assertNotNull($order);
        // The order user_id MUST be the authenticated customer, NEVER the spoofed one
        $this->assertEquals($this->customer->id, $order->user_id);
        $this->assertNotEquals($this->otherCustomer->id, $order->user_id);
    }

    /**
     * 8. Authenticated customer can create RFQ and user_id is authoritatively set to caller.
     */
    public function test_authenticated_customer_can_submit_rfq_and_user_id_is_guaranteed(): void
    {
        $res = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/rfq', [
                'user_id' => $this->otherCustomer->id, // Attempt IDOR
                'buyer_name' => 'Authentic Buyer',
                'company_name' => 'Authentic Corp',
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'product_name' => $this->product->name,
                        'quantity' => 10,
                    ],
                ],
            ]);

        $res->assertStatus(201);
        $quote = Quote::first();
        $this->assertNotNull($quote);
        // The RFQ user_id MUST be the authenticated customer
        $this->assertEquals($this->customer->id, $quote->user_id);
        $this->assertNotEquals($this->otherCustomer->id, $quote->user_id);
    }
}
