<?php

namespace Tests\Feature\Security;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityAndSanitizationTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;
    private User $customerA;
    private User $customerB;
    private User $wholesaleCustomer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create(['role' => 'admin']);
        $this->customerA = User::factory()->create(['role' => 'customer']);
        $this->customerB = User::factory()->create(['role' => 'customer']);
        $this->wholesaleCustomer = User::factory()->create(['role' => 'customer', 'b2b_approval_status' => 'approved']);
    }

    public function test_unauthenticated_request_to_admin_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(401);
    }

    public function test_standard_customer_cannot_access_any_admin_endpoint(): void
    {
        $endpoints = [
            ['GET', '/api/v1/admin/dashboard'],
            ['GET', '/api/v1/admin/inventory'],
            ['GET', '/api/v1/admin/customers'],
            ['GET', '/api/v1/admin/orders'],
            ['GET', '/api/v1/admin/coupons'],
        ];

        foreach ($endpoints as [$method, $url]) {
            $response = $this->actingAs($this->customerA, 'sanctum')->json($method, $url);
            $response->assertStatus(403);
        }

        // Verify removed promotion endpoint is 404
        $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/admin/promotions')
            ->assertStatus(404);
    }

    public function test_wholesale_customer_cannot_access_admin_endpoints(): void
    {
        $response = $this->actingAs($this->wholesaleCustomer, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(403);
    }

    public function test_customer_cannot_view_or_cancel_another_customers_order(): void
    {
        $orderB = Order::create([
            'order_number' => 'AYN-2026-TEST-ORD-B',
            'user_id' => $this->customerB->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'currency' => 'USD',
            'subtotal' => 100.00,
            'total_amount' => 105.00,
            'email' => $this->customerB->email,
            'shipping_name' => 'Customer B',
            'shipping_address1' => '456 Elm St',
            'shipping_city' => 'Boston',
            'shipping_postal_code' => '02108',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
        ]);

        // Customer A attempts viewing Customer B's order -> 403
        $showResponse = $this->actingAs($this->customerA, 'sanctum')
            ->getJson("/api/v1/orders/{$orderB->id}");
        $showResponse->assertStatus(403);

        // Customer A attempts cancelling Customer B's order -> 403
        $cancelResponse = $this->actingAs($this->customerA, 'sanctum')
            ->postJson("/api/v1/orders/{$orderB->id}/cancel");
        $cancelResponse->assertStatus(403);

        // Admin CAN view Customer B's order -> 200
        $adminResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson("/api/v1/orders/{$orderB->id}");
        $adminResponse->assertOk();
    }

    public function test_payment_webhook_rejects_missing_payload_identifiers(): void
    {
        $response = $this->postJson('/api/v1/payments/webhook', [
            'type' => 'payment.succeeded',
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('message', 'Missing order or transaction identifier');
    }

    public function test_all_order_currencies_remain_strictly_usd(): void
    {
        $brand = Brand::create(['name' => 'Ayaan', 'slug' => 'ayaan']);
        $product = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Test Crewneck',
            'slug' => 'test-crewneck',
            'sku' => 'AYN-TEST-001',
            'wholesale_price' => 20.00,
            'msrp_price' => 45.00,
            'status' => 'published',
        ]);
        $variant = \App\Models\ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'AYN-TEST-001-M',
            'title' => 'Size M',
            'size' => 'M',
            'stock' => 100,
        ]);

        $response = $this->actingAs($this->customerA, 'sanctum')->postJson('/api/v1/orders', [
            'email' => $this->customerA->email,
            'shipping_name' => 'John A',
            'shipping_address1' => '123 Main St',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size' => 'M',
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.currency', 'USD');
    }

}
