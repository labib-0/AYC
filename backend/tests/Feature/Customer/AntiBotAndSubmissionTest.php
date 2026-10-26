<?php

namespace Tests\Feature\Customer;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Quote;
use App\Models\User;
use App\Services\Security\NativeBotProtectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AntiBotAndSubmissionTest extends TestCase
{
    use RefreshDatabase;

    private function createCustomer(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => 'customer',
            'email_verified_at' => now(),
        ], $attributes));
    }

    private function generateValidFormToken(string $action): string
    {
        return app(NativeBotProtectionService::class)->generateFormToken($action);
    }

    /**
     * TEST 1: RFQ submission with populated honeypot is rejected with 422.
     */
    public function test_rfq_submission_rejects_populated_honeypot(): void
    {
        $customer = $this->createCustomer();
        $product = Product::factory()->create(['status' => 'published']);
        $token = $this->generateValidFormToken('rfq-create');

        $response = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/rfq', [
            'request_title' => 'Bulk Fleece Jacket Inquiry',
            'buyer_name' => $customer->name,
            'buyer_email' => $customer->email,
            'company_name' => 'Apex Apparel Inc',
            'destination_country' => 'United States',
            'website_url_hp' => 'https://malicious-spam-vector.com',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 100,
                    'target_price' => 15.00,
                ],
            ],
        ], [
            'X-Form-Token' => $token,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Automated form submission detected.',
            ]);

        $this->assertDatabaseMissing('quotes', [
            'buyer_email' => $customer->email,
        ]);
    }

    /**
     * TEST 2: Legitimate human RFQ submission with clean honeypot passes and persists.
     */
    public function test_rfq_submission_accepts_clean_human_request(): void
    {
        $customer = $this->createCustomer();
        $product = Product::factory()->create(['status' => 'published']);
        $token = $this->generateValidFormToken('rfq-create');

        $response = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/rfq', [
            'request_title' => 'Wholesale French Terry Hoodies',
            'buyer_name' => $customer->name,
            'buyer_email' => $customer->email,
            'company_name' => 'Nordic Outfitters Ltd',
            'destination_country' => 'Norway',
            'destination_city' => 'Oslo',
            'shipping_port' => 'Port of Oslo',
            'website_url_hp' => '',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 200,
                    'target_price' => 18.50,
                ],
            ],
        ], [
            'X-Form-Token' => $token,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('quotes', [
            'buyer_email' => $customer->email,
            'company_name' => 'Nordic Outfitters Ltd',
            'destination_country' => 'Norway',
        ]);
    }

    /**
     * TEST 3: Unauthenticated RFQ attempt is rejected with 401.
     */
    public function test_rfq_submission_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/rfq', [
            'request_title' => 'Unauthenticated Spam',
            'buyer_name' => 'Ghost',
            'buyer_email' => 'ghost@anonymous.net',
            'items' => [
                ['name' => 'Custom Shirt', 'quantity' => 100],
            ],
        ]);

        $response->assertStatus(401);
    }

    /**
     * TEST 4: Order checkout with populated honeypot is rejected with 422.
     */
    public function test_order_checkout_rejects_populated_honeypot(): void
    {
        $customer = $this->createCustomer();
        $product = Product::factory()->create(['wholesale_price' => 20.00, 'moq' => 1, 'status' => 'published']);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 100]);
        $token = $this->generateValidFormToken('order-checkout');

        $response = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $customer->email,
            'shipping_name' => 'Tariq Al-Mansoor',
            'shipping_address1' => 'Warehouse 42, Al Qouz Industrial Area 3',
            'shipping_city' => 'Dubai',
            'shipping_postal_code' => '00000',
            'shipping_country_code' => 'AE',
            'payment_method' => 'proforma_invoice',
            'website_url_hp' => 'https://credential-stuffing-bot.org',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 10,
                ],
            ],
        ], [
            'X-Form-Token' => $token,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Automated form submission detected.',
            ]);

        $this->assertDatabaseMissing('orders', [
            'user_id' => $customer->id,
        ]);
    }

    /**
     * TEST 5: Legitimate order checkout with clean honeypot passes and decrements inventory once.
     */
    public function test_order_checkout_accepts_clean_human_submission(): void
    {
        $customer = $this->createCustomer();
        $product = Product::factory()->create(['wholesale_price' => 25.00, 'moq' => 1, 'status' => 'published']);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'L', 'stock' => 50]);
        $token = $this->generateValidFormToken('order-checkout');

        $response = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $customer->email,
            'shipping_name' => 'Tariq Al-Mansoor',
            'shipping_address1' => 'Warehouse 42, Al Qouz Industrial Area 3',
            'shipping_city' => 'Dubai',
            'shipping_postal_code' => '00000',
            'shipping_country_code' => 'AE',
            'payment_method' => 'proforma_invoice',
            'website_url_hp' => '',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 5,
                ],
            ],
        ], [
            'X-Form-Token' => $token,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('orders', [
            'user_id' => $customer->id,
            'shipping_city' => 'Dubai',
            'payment_status' => 'pending',
        ]);

        // Stock correctly decremented from 50 to 45
        $this->assertEquals(45, $variant->fresh()->stock);
    }

    /**
     * TEST 6: Unauthenticated order attempt is rejected with 401.
     */
    public function test_order_checkout_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/orders', [
            'email' => 'anonymous@example.com',
            'shipping_name' => 'Anonymous Buyer',
            'items' => [
                ['product_id' => 1, 'quantity' => 10],
            ],
        ]);

        $response->assertStatus(401);
    }

    /**
     * TEST 7: Empty cart or missing required fields in order checkout fails validation.
     */
    public function test_order_checkout_rejects_empty_items(): void
    {
        $customer = $this->createCustomer();
        $token = $this->generateValidFormToken('order-checkout');

        $response = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $customer->email,
            'shipping_name' => 'Valid Name',
            'shipping_address1' => '123 Street',
            'shipping_city' => 'City',
            'items' => [],
        ], [
            'X-Form-Token' => $token,
        ]);

        $response->assertStatus(422);
    }

    /**
     * TEST 8: Concurrent requests with same Idempotency-Key return original order without duplication.
     */
    public function test_order_checkout_idempotency_prevents_duplicate_orders(): void
    {
        $customer = $this->createCustomer();
        $product = Product::factory()->create(['wholesale_price' => 30.00, 'moq' => 1, 'status' => 'published']);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'XL', 'stock' => 100]);
        $token = $this->generateValidFormToken('order-checkout');
        $idempotencyKey = 'idemp_key_test_' . uniqid();

        $payload = [
            'email' => $customer->email,
            'shipping_name' => 'Tariq Al-Mansoor',
            'shipping_address1' => 'Warehouse 42, Al Qouz Industrial Area 3',
            'shipping_city' => 'Dubai',
            'shipping_postal_code' => '00000',
            'shipping_country_code' => 'AE',
            'payment_method' => 'proforma_invoice',
            'website_url_hp' => '',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 10,
                ],
            ],
        ];

        $headers = [
            'X-Form-Token' => $token,
            'X-Idempotency-Key' => $idempotencyKey,
        ];

        // First submission
        $res1 = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/orders', $payload, $headers);
        $res1->assertStatus(201);
        $orderId1 = $res1->json('data.id');

        // Rapid retry with identical idempotency key
        $res2 = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/orders', $payload, $headers);
        // Returns 200 or 201 with the exact same order ID
        $this->assertTrue(in_array($res2->status(), [200, 201]));
        $orderId2 = $res2->json('data.id');

        $this->assertEquals($orderId1, $orderId2);

        // Exactly one order exists in the database
        $this->assertEquals(1, Order::where('user_id', $customer->id)->count());

        // Stock was decremented exactly once (100 - 10 = 90)
        $this->assertEquals(90, $variant->fresh()->stock);
    }
}
