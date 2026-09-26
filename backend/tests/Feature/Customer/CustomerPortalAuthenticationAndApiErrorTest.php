<?php

namespace Tests\Feature\Customer;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerPortalAuthenticationAndApiErrorTest extends TestCase
{
    use RefreshDatabase;

    /**
     * TEST 1: Authenticated customer API request succeeds and enforces data isolation.
     */
    public function test_authenticated_customer_api_request_succeeds_and_enforces_isolation(): void
    {
        $customerA = User::factory()->create(['role' => 'customer', 'email' => 'buyer_a@example.com']);
        $customerB = User::factory()->create(['role' => 'customer', 'email' => 'buyer_b@example.com']);

        $product = Product::factory()->create([
            'name' => 'Cotton Crewneck Lot',
            'wholesale_price' => 12.00,
            'moq' => 10,
            'status' => 'published',
        ]);

        $orderA = Order::factory()->create([
            'user_id' => $customerA->id,
            'email' => $customerA->email,
            'order_number' => 'AYN-2026-111111',
            'total_amount' => 120.00,
        ]);

        OrderItem::create([
            'order_id' => $orderA->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 10,
            'unit_price' => 12.00,
            'line_total' => 120.00,
        ]);

        $orderB = Order::factory()->create([
            'user_id' => $customerB->id,
            'email' => $customerB->email,
            'order_number' => 'AYN-2026-222222',
            'total_amount' => 240.00,
        ]);

        // Customer A fetches orders
        $response = $this->actingAs($customerA, 'sanctum')->getJson('/api/v1/orders');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $orderNumbers = collect($response->json('data'))->pluck('order_number')->all();
        $this->assertContains('AYN-2026-111111', $orderNumbers);
        $this->assertNotContains('AYN-2026-222222', $orderNumbers);
    }

    /**
     * TEST 2: Customer API returns 401 when token is missing or revoked.
     */
    public function test_customer_api_returns_401_when_unauthenticated(): void
    {
        $response = $this->getJson('/api/v1/orders');

        $response->assertStatus(401);
    }

    /**
     * TEST 3: Customer accessing admin endpoint returns 403 Forbidden without logging out.
     */
    public function test_customer_accessing_admin_endpoint_returns_403_forbidden(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $response = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/products', [
            'name' => 'Unauthorized Product Creation',
            'wholesale_price' => 10.00,
        ]);

        $response->assertStatus(403);
    }

    /**
     * TEST 3b: Customer accessing another customer's order returns 403 Forbidden.
     */
    public function test_customer_accessing_another_customers_order_returns_403_forbidden(): void
    {
        $customerA = User::factory()->create(['role' => 'customer', 'email' => 'buyer_a@example.com']);
        $customerB = User::factory()->create(['role' => 'customer', 'email' => 'buyer_b@example.com']);

        $orderB = Order::factory()->create([
            'user_id' => $customerB->id,
            'email' => $customerB->email,
            'order_number' => 'AYN-2026-333333',
        ]);

        $response = $this->actingAs($customerA, 'sanctum')->getJson("/api/v1/orders/{$orderB->id}");

        $response->assertStatus(403);
    }

    /**
     * TEST 4: Customer API returns 404 for nonexistent resource.
     */
    public function test_customer_api_returns_404_for_nonexistent_order(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $response = $this->actingAs($customer, 'sanctum')->getJson('/api/v1/orders/999999');

        $response->assertStatus(404);
    }

    /**
     * TEST 5: Customer API returns 422 for validation error.
     */
    public function test_customer_api_returns_422_for_validation_failure(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $response = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/orders', []);

        $response->assertStatus(422)
            ->assertJsonStructure(['errors']);
    }

    /**
     * TEST 10: Quick Reorder query correctly extracts purchased items for authenticated customer only.
     */
    public function test_quick_reorder_isolates_customer_purchased_products(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $productA = Product::factory()->create(['name' => 'Jersey Tee Lot', 'wholesale_price' => 10.00, 'moq' => 10]);
        $productB = Product::factory()->create(['name' => 'Fleece Hoodie Lot', 'wholesale_price' => 25.00, 'moq' => 5]);

        $order = Order::factory()->create([
            'user_id' => $customer->id,
            'email' => $customer->email,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $productA->id,
            'product_name' => $productA->name,
            'quantity' => 20,
            'unit_price' => 10.00,
            'line_total' => 200.00,
        ]);

        $response = $this->actingAs($customer, 'sanctum')->getJson('/api/v1/orders');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);

        $items = $data[0]['items'];
        $this->assertCount(1, $items);
        $this->assertEquals((string) $productA->id, (string) $items[0]['product_id']);
        $this->assertEquals('Jersey Tee Lot', $items[0]['product_name']);
        $this->assertEquals(20, $items[0]['quantity']);
    }
}
