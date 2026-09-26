<?php

namespace Tests\Feature\Shipping;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AramexShipmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->customer = User::factory()->create(['role' => 'customer']);

        $this->order = Order::create([
            'order_number' => 'AYN-20260831-ARAMEX01',
            'user_id' => $this->customer->id,
            'status' => 'processing',
            'payment_status' => 'paid',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 1200.00,
            'shipping_cost' => 150.00,
            'tax_amount' => 60.00,
            'other_charges' => 0.00,
            'total_amount' => 1410.00,
            'email' => 'buyer@fashionbrands.co.uk',
            'shipping_name' => 'Johnathan Sterling',
            'shipping_phone' => '+44 20 7946 0192',
            'shipping_address1' => '100 Regent Street',
            'shipping_city' => 'London',
            'shipping_region' => 'Greater London',
            'shipping_postal_code' => 'W1B 5TH',
            'shipping_country_code' => 'GB',
            'shipping_method' => 'Aramex Priority Parcel Express',
            'carrier' => 'Aramex',
            'shipping_snapshot' => [
                'shipping_method' => 'Aramex Priority Parcel Express',
                'carrier' => 'Aramex',
                'carton_count' => 2,
                'gross_weight' => 30.0,
                'net_weight' => 26.0,
                'weight_unit' => 'kg',
                'cbm' => 0.144,
                'carton_dimensions' => ['length' => 60, 'width' => 40, 'height' => 30, 'unit' => 'cm'],
            ],
            'payment_method' => 'card',
        ]);
    }

    public function test_admin_can_create_aramex_shipment_successfully(): void
    {
        Http::fake([
            '*/Shipping/Service_1_0.svc/json/CreateShipments' => Http::response([
                'HasErrors' => false,
                'Notifications' => [],
                'Shipments' => [
                    [
                        'ID' => '328192839102',
                        'Reference1' => $this->order->order_number,
                        'HasErrors' => false,
                        'Notifications' => [],
                        'ShipmentLabel' => [
                            'LabelURL' => 'https://ws.aramex.net/labels/328192839102.pdf',
                            'ShipmentNumber' => '328192839102',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/orders/{$this->order->id}/shipment/aramex");

        $response->assertStatus(200)
            ->assertJsonPath('data.tracking_number', '328192839102')
            ->assertJsonPath('data.carrier', 'Aramex')
            ->assertJsonPath('data.carrier_status', 'Shipment Created');

        $this->order->refresh();
        $this->assertEquals('328192839102', $this->order->tracking_number);
        $this->assertEquals('shipped', $this->order->fulfillment_status);
        $this->assertEquals('https://ws.aramex.net/labels/328192839102.pdf', $this->order->shipment_label_url);
    }

    public function test_aramex_shipment_creation_failure_is_handled_safely(): void
    {
        Http::fake([
            '*/Shipping/Service_1_0.svc/json/CreateShipments' => Http::response([
                'HasErrors' => true,
                'Notifications' => [
                    [
                        'Code' => 'ERR01',
                        'Message' => 'Invalid destination postal code for country GB',
                    ],
                ],
                'Shipments' => [],
            ], 200),
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/orders/{$this->order->id}/shipment/aramex");

        $response->assertStatus(422);

        $this->order->refresh();
        $this->assertNull($this->order->tracking_number);
        $this->assertEquals('unfulfilled', $this->order->fulfillment_status);
        $this->assertStringContainsString('Invalid destination postal code', $this->order->last_shipment_error);
    }

    public function test_duplicate_shipment_creation_prevention_on_retry(): void
    {
        // Pre-populate existing tracking number
        $this->order->update([
            'tracking_number' => '328192839102',
            'carrier' => 'Aramex',
            'fulfillment_status' => 'shipped',
        ]);

        // Attempt second creation
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/orders/{$this->order->id}/shipment/aramex");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_duplicate_prevented', true)
            ->assertJsonPath('data.tracking_number', '328192839102');

        // No new HTTP calls needed
        Http::assertNothingSent();
    }

    public function test_non_admin_cannot_create_aramex_shipment(): void
    {
        $response = $this->actingAs($this->customer)
            ->postJson("/api/v1/admin/orders/{$this->order->id}/shipment/aramex");

        $response->assertStatus(403);
    }

    public function test_live_carrier_tracking_lookup(): void
    {
        $this->order->update([
            'tracking_number' => '328192839102',
            'carrier' => 'Aramex',
            'fulfillment_status' => 'shipped',
        ]);

        Http::fake([
            '*/Tracking/Service_1_0.svc/json/TrackShipments' => Http::response([
                'HasErrors' => false,
                'TrackingResults' => [
                    [
                        'WaybillNumber' => '328192839102',
                        'Value' => [
                            [
                                'UpdateCode' => 'SH001',
                                'UpdateDescription' => 'Shipment Record Created',
                                'UpdateLocation' => 'Dhaka Hub, BD',
                                'UpdateDateTime' => '/Date(1756598400000+0000)/',
                            ],
                            [
                                'UpdateCode' => 'SH014',
                                'UpdateDescription' => 'Departed Operations Facility',
                                'UpdateLocation' => 'Hazrat Shahjalal Int Airport, BD',
                                'UpdateDateTime' => '/Date(1756684800000+0000)/',
                            ],
                            [
                                'UpdateCode' => 'SH005',
                                'UpdateDescription' => 'In Transit to Destination Hub',
                                'UpdateLocation' => 'Dubai Hub, UAE',
                                'UpdateDateTime' => '/Date(1756771200000+0000)/',
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        // 1. Admin Refresh
        $adminRes = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/orders/{$this->order->id}/tracking/refresh");

        $adminRes->assertStatus(200)
            ->assertJsonPath('data.tracking.carrier_status', 'In Transit to Destination Hub')
            ->assertJsonCount(3, 'data.tracking.events');

        // 2. Customer Tracking Lookup
        $customerRes = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$this->order->id}/tracking");

        $customerRes->assertStatus(200)
            ->assertJsonPath('data.carrier_status', 'In Transit to Destination Hub')
            ->assertJsonPath('data.tracking_number', '328192839102');
    }
}
