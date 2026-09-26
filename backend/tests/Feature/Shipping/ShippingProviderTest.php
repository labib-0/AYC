<?php

namespace Tests\Feature\Shipping;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductShippingPackageProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ShippingProviderTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaanclothing.com',
            'role' => 'admin',
        ]);

        $this->customer = User::factory()->create([
            'email' => 'buyer@exportfashion.com',
            'role' => 'customer',
        ]);

        $this->product = Product::create([
            'name' => 'Heavyweight Cotton Hoodie Wholesale',
            'slug' => 'heavyweight-cotton-hoodie-wholesale',
            'sku' => 'AYN-HD-001',
            'brand' => 'Ayaan Export',
            'wholesale_price' => 30.00,
            'price' => 30.00,
            'bulk_threshold' => 200,
            'bulk_price' => 30.00,
            'moq' => 50,
            'stock' => 2000,
            'status' => 'published',
        ]);

        ProductShippingPackageProfile::create([
            'product_id' => $this->product->id,
            'package_quantity' => 200,
            'carton_count' => 4,
            'carton_length' => 60,
            'carton_width' => 40,
            'carton_height' => 30,
            'dimension_unit' => 'cm',
            'gross_weight' => 88.0,
            'net_weight' => 80.0,
            'weight_unit' => 'kg',
            'is_active' => true,
        ]);
    }

    public function test_air_shipping_queries_aramex_and_does_not_call_akij(): void
    {
        Http::fake([
            '*/Shipping/Service_1_0.svc/json/CalculateRate' => Http::response([
                'HasErrors' => false,
                'Notifications' => [],
                'TotalAmount' => ['Value' => 620.00, 'CurrencyCode' => 'USD'],
                'RateDetails' => ['ChargeableWeight' => ['Value' => 88.0]],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/shipping/quote', [
            'items' => [['product_id' => $this->product->id, 'quantity' => 200]],
            'country_code' => 'US',
            'city' => 'New York',
            'postal_code' => '10001',
            'shipping_mode' => 'air',
        ]);

        $response->assertStatus(200);
        $quotes = $response->json('quotes');
        $this->assertCount(1, $quotes);

        $air = $quotes[0];
        $this->assertEquals('aramex', $air['provider']);
        $this->assertEquals('Aramex', $air['carrier']);
        $this->assertEquals('air', $air['mode']);
        $this->assertEquals(620.00, (float) $air['amount']);
        Http::assertSentCount(1);
    }

    public function test_sea_shipping_uses_akij_logistics_and_does_not_call_aramex(): void
    {
        Http::fake();

        $response = $this->postJson('/api/v1/shipping/quote', [
            'items' => [['product_id' => $this->product->id, 'quantity' => 200]],
            'country_code' => 'US',
            'city' => 'New York',
            'postal_code' => '10001',
            'shipping_mode' => 'sea',
        ]);

        $response->assertStatus(200);
        $quotes = $response->json('quotes');
        $this->assertCount(1, $quotes);

        $sea = $quotes[0];
        $this->assertEquals('akij', $sea['provider']);
        $this->assertEquals('Akij Logistics', $sea['carrier']);
        $this->assertEquals('sea', $sea['mode']);
        $this->assertStringContainsString('Chattogram Sea Port', $sea['port_of_loading']);
        $this->assertTrue((float) $sea['amount'] > 0);

        // 0 live calls made to Aramex parcel API
        Http::assertNothingSent();
    }

    public function test_all_mode_returns_both_aramex_air_and_akij_sea(): void
    {
        Http::fake([
            '*/Shipping/Service_1_0.svc/json/CalculateRate' => Http::response([
                'HasErrors' => false,
                'TotalAmount' => ['Value' => 620.00, 'CurrencyCode' => 'USD'],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/shipping/quote', [
            'items' => [['product_id' => $this->product->id, 'quantity' => 200]],
            'country_code' => 'US',
            'city' => 'New York',
            'postal_code' => '10001',
            'shipping_mode' => 'all',
        ]);

        $response->assertStatus(200);
        $quotes = $response->json('quotes');
        $this->assertCount(2, $quotes);

        $this->assertEquals('aramex', $quotes[0]['provider']);
        $this->assertEquals('Aramex', $quotes[0]['carrier']);

        $this->assertEquals('akij', $quotes[1]['provider']);
        $this->assertEquals('Akij Logistics', $quotes[1]['carrier']);
    }

    public function test_admin_can_update_akij_sea_freight_quote_and_order_snapshot(): void
    {
        $order = Order::create([
            'order_number' => 'AYN-20260831-778899',
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'shipping_name' => 'Buyer Inc',
            'shipping_address1' => '100 Port Rd',
            'shipping_city' => 'Hamburg',
            'shipping_postal_code' => '20095',
            'shipping_country_code' => 'DE',
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'transfer',
            'subtotal' => 6000.00,
            'shipping_cost' => 0.00,
            'total_amount' => 6000.00,
            'carrier' => 'Akij Logistics',
            'shipping_method' => 'Akij LCL Ocean Container Freight',
            'shipping_snapshot' => [
                'provider' => 'akij',
                'carrier' => 'Akij Logistics',
                'mode' => 'sea',
                'port_of_loading' => 'Chattogram Sea Port (CGP), Bangladesh',
                'package_quantity' => 200,
                'carton_count' => 4,
                'cbm' => 0.288,
                'gross_weight' => 88.0,
            ],
        ]);

        $payload = [
            'amount' => 280.00,
            'quote_reference' => 'QT-AKJ-CONFIRMED-8811',
            'valid_until' => '2026-10-31',
            'notes' => 'Custom FOB to CIF Hamburg vessel booking confirmed via Akij Logistics.',
        ];

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/v1/admin/orders/{$order->id}/shipping-quote", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $refreshed = $order->fresh();
        $this->assertEquals(280.00, (float) $refreshed->shipping_cost);
        $this->assertEquals(6280.00, (float) $refreshed->total_amount);
        $this->assertEquals('Akij Logistics', $refreshed->carrier);
        $this->assertEquals('QT-AKJ-CONFIRMED-8811', $refreshed->shipping_quote_id);
        $this->assertEquals('akij', $refreshed->shipping_snapshot['provider']);
    }

    public function test_commercial_documents_reflect_akij_logistics_for_sea_orders(): void
    {
        $order = Order::create([
            'order_number' => 'AYN-20260831-778899',
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'shipping_name' => 'Buyer Inc',
            'shipping_address1' => '100 Port Rd',
            'shipping_city' => 'Hamburg',
            'shipping_postal_code' => '20095',
            'shipping_country_code' => 'DE',
            'status' => 'processing',
            'payment_status' => 'paid',
            'payment_method' => 'transfer',
            'subtotal' => 6000.00,
            'shipping_cost' => 280.00,
            'total_amount' => 6280.00,
            'carrier' => 'Akij Logistics',
            'shipping_method' => 'Akij LCL Ocean Container Freight',
            'shipping_snapshot' => [
                'provider' => 'akij',
                'carrier' => 'Akij Logistics',
                'mode' => 'sea',
                'port_of_loading' => 'Chattogram Sea Port (CGP), Bangladesh',
                'package_quantity' => 200,
                'carton_count' => 4,
                'cbm' => 0.288,
                'gross_weight' => 88.0,
                'net_weight' => 80.0,
            ],
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 200,
            'unit_price' => 30.00,
            'line_total' => 6000.00,
        ]);

        $response = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$order->id}/documents/COMMERCIAL_INVOICE");

        $response->assertStatus(200)
            ->assertJsonPath('data.logistics.carrier', 'Akij Logistics')
            ->assertJsonPath('data.logistics.port_of_loading', 'Chattogram Sea Port (CGP), Bangladesh')
            ->assertJsonPath('data.shipping_snapshot.provider', 'akij');
    }
}
