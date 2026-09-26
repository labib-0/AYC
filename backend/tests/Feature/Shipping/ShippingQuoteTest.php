<?php

namespace Tests\Feature\Shipping;

use App\Models\Product;
use App\Models\ProductShippingPackageProfile;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ShippingQuoteTest extends TestCase
{
    use RefreshDatabase;

    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();

        $this->product = Product::create([
            'name' => 'Premium Polo Wholesale Shirt',
            'slug' => 'premium-polo-wholesale-shirt',
            'sku' => 'AYN-POLO-001',
            'brand' => 'Ayaan Classic',
            'audience' => 'MEN',
            'category_id' => null,
            'wholesale_price' => 22.40,
            'price' => 22.40,
            'bulk_threshold' => 200,
            'bulk_price' => 22.40,
            'moq' => 50,
            'stock' => 1000,
            'status' => 'published',
        ]);

        ProductVariant::create([
            'product_id' => $this->product->id,
            'title' => 'Standard / L',
            'size' => 'L',
            'color_name' => 'Navy',
            'stock' => 500,
            'sku' => 'AYN-POLO-001-L',
        ]);

        // Define Authoritative Physical Packaging Profile: 200 pcs = 4 cartons (60x40x30 cm), 88 kg gross
        ProductShippingPackageProfile::create([
            'product_id' => $this->product->id,
            'package_quantity' => 200,
            'quantity_max' => null,
            'carton_count' => 4,
            'carton_length' => 60,
            'carton_width' => 40,
            'carton_height' => 30,
            'dimension_unit' => 'cm',
            'gross_weight' => 88.0,
            'net_weight' => 80.0,
            'weight_unit' => 'kg',
            'notes' => '4 Master Export Cartons',
            'is_active' => true,
        ]);
    }

    public function test_shipping_quote_calculates_authoritative_packaging_and_calls_aramex_rate_calculator(): void
    {
        Http::fake([
            '*/Shipping/Service_1_0.svc/json/CalculateRate' => Http::response([
                'HasErrors' => false,
                'Notifications' => [],
                'TotalAmount' => [
                    'Value' => 620.00,
                    'CurrencyCode' => 'USD',
                ],
                'RateDetails' => [
                    'Amount' => 620.00,
                    'CurrencyCode' => 'USD',
                    'ChargeableWeight' => [
                        'Value' => 88.0,
                        'Unit' => 'KG',
                    ],
                ],
            ], 200),
        ]);

        $payload = [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 200,
                ],
            ],
            'country_code' => 'US',
            'city' => 'New York',
            'postal_code' => '10001',
            'address1' => '123 Fashion Ave',
            'shipping_mode' => 'all',
        ];

        $response = $this->postJson('/api/v1/shipping/quote', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('currency', 'USD')
            ->assertJsonPath('shipment_specs.carton_count', 4);

        $this->assertEquals(4480.00, (float) $response->json('goods_value'));
        $this->assertEquals(88.0, (float) $response->json('shipment_specs.gross_weight'));
        $this->assertEquals(0.288, (float) $response->json('shipment_specs.cbm'));

        $quotes = $response->json('quotes');
        $this->assertCount(2, $quotes);

        // 1. Aramex Express (Air)
        $airQuote = $quotes[0];
        $this->assertEquals('Aramex', $airQuote['carrier']);
        $this->assertEquals('air', $airQuote['mode']);
        $this->assertEquals(620.00, (float) $airQuote['amount']);
        $this->assertEquals('USD', $airQuote['currency']);
        $this->assertTrue($airQuote['is_available']);

        // 2. Ocean Freight (Sea - Akij Logistics)
        $seaQuote = $quotes[1];
        $this->assertEquals('akij', $seaQuote['provider']);
        $this->assertEquals('Akij Logistics', $seaQuote['carrier']);
        $this->assertEquals('sea', $seaQuote['mode']);
        $this->assertTrue((float) $seaQuote['amount'] > 0);
        $this->assertEquals('USD', $seaQuote['currency']);
        $this->assertTrue($seaQuote['is_available']);
    }

    public function test_shipping_quote_handles_unserviceable_destination_safely(): void
    {
        Http::fake([
            '*/Shipping/Service_1_0.svc/json/CalculateRate' => Http::response([
                'HasErrors' => true,
                'Notifications' => [
                    [
                        'Code' => 'ERR_RATE',
                        'Message' => 'Destination postal code is not currently serviced by Priority Express',
                    ],
                ],
            ], 200),
        ]);

        $payload = [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 200,
                ],
            ],
            'country_code' => 'US',
            'city' => 'Remote Island',
            'postal_code' => '99999',
            'shipping_mode' => 'air',
        ];

        $response = $this->postJson('/api/v1/shipping/quote', $payload);

        $response->assertStatus(200);
        $quotes = $response->json('quotes');
        $this->assertCount(1, $quotes);
        $this->assertFalse($quotes[0]['is_available']);
        $this->assertStringContainsString('not currently serviced', $quotes[0]['error_message']);
    }

    public function test_client_cannot_override_shipment_specs_with_tampered_values(): void
    {
        Http::fake([
            '*/Shipping/Service_1_0.svc/json/CalculateRate' => Http::response([
                'HasErrors' => false,
                'TotalAmount' => ['Value' => 620.00, 'CurrencyCode' => 'USD'],
            ], 200),
        ]);

        $tamperedPayload = [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 200,
                ],
            ],
            'country_code' => 'US',
            // Attempt to inject fake client values
            'carton_count' => 1,
            'gross_weight' => 0.1,
            'cbm' => 0.001,
            'shipping_cost' => 5.0,
        ];

        $response = $this->postJson('/api/v1/shipping/quote', $tamperedPayload);

        $response->assertStatus(200)
            ->assertJsonPath('shipment_specs.carton_count', 4);

        $this->assertEquals(88.0, (float) $response->json('shipment_specs.gross_weight'));
        $this->assertEquals(0.288, (float) $response->json('shipment_specs.cbm'));
    }

    public function test_shipping_quote_is_cached_for_identical_queries(): void
    {
        Http::fake([
            '*/Shipping/Service_1_0.svc/json/CalculateRate' => Http::response([
                'HasErrors' => false,
                'TotalAmount' => ['Value' => 620.00, 'CurrencyCode' => 'USD'],
            ], 200),
        ]);

        $payload = [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 200,
                ],
            ],
            'country_code' => 'US',
            'city' => 'New York',
            'postal_code' => '10001',
        ];

        // First request
        $res1 = $this->postJson('/api/v1/shipping/quote', $payload);
        $res1->assertStatus(200);

        // Second request (hits cache)
        $res2 = $this->postJson('/api/v1/shipping/quote', $payload);
        $res2->assertStatus(200);

        // Only 1 outbound HTTP call made to Aramex
        Http::assertSentCount(1);
    }

    public function test_shipping_quote_validates_input_fields(): void
    {
        $response = $this->postJson('/api/v1/shipping/quote', [
            'items' => [],
            'country_code' => 'INVALID_CODE',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['items', 'country_code']);
    }
}
