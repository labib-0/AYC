<?php

namespace Tests\Feature\Order;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductShippingPackageProfile;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderShippingSnapshotTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $admin;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        \App\Models\SystemSetting::set('aramex_enabled', true, 'boolean', 'shipping');

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'b2b_approval_status' => 'approved',
            'company_name' => 'Global Retailers LLC',
        ]);

        $this->admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $brand = Brand::create([
            'name' => 'Ayaan Signature',
            'slug' => 'ayaan-signature',
            'is_active' => true,
        ]);

        $category = Category::create([
            'name' => 'Tops',
            'slug' => 'tops',
            'is_active' => true,
        ]);

        $this->product = Product::create([
            'name' => 'Premium Wholesale Tee',
            'slug' => 'premium-wholesale-tee',
            'sku' => 'AYN-PWT-001',
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'status' => 'published',
            'weight_grams' => 200,
            'moq' => 50,
            'cost_price' => 5.00,
            'wholesale_price' => 10.00,
            'bulk_threshold' => 100,
            'bulk_price' => 8.50,
            'full_stock_price' => 7.00,
        ]);

        ProductVariant::create([
            'product_id' => $this->product->id,
            'title' => 'Medium / Black',
            'size' => 'M',
            'color_name' => 'Black',
            'stock' => 500,
            'sku' => 'AYN-PWT-001-M',
        ]);

        // Authoritative packaging profile
        ProductShippingPackageProfile::create([
            'product_id' => $this->product->id,
            'package_quantity' => 100,
            'quantity_max' => null,
            'carton_count' => 2,
            'carton_length' => 60,
            'carton_width' => 40,
            'carton_height' => 30,
            'dimension_unit' => 'cm',
            'gross_weight' => 24.0,
            'net_weight' => 20.0,
            'weight_unit' => 'kg',
            'notes' => '2 Master Export Cartons',
            'is_active' => true,
        ]);
    }

    public function test_order_creation_captures_immutable_shipping_snapshot_and_totals(): void
    {
        $payload = [
            'email' => 'buyer@globalretail.com',
            'shipping_name' => 'Marcus Vance',
            'shipping_phone' => '+1 555 019 2831',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'Springfield',
            'shipping_region' => 'IL',
            'shipping_postal_code' => '62704',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
            'shipping_method' => 'Aramex Priority Parcel Express (PPX)',
            'carrier' => 'Aramex',
            'shipping_cost' => 125.50,
            'other_charges' => 25.00,
            'shipping_quote_id' => 'QT-2026-88123',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 100,
                ],
            ],
        ];

        $response = $this->actingAs($this->customer)
            ->postJson('/api/v1/orders', $payload);

        $response->assertStatus(201);
        $orderData = $response->json('data');

        $this->assertNotEmpty($orderData['id']);
        $this->assertEquals('Aramex', $orderData['carrier']);
        $this->assertEquals(125.50, $orderData['shipping_cost']);
        $this->assertEquals(25.00, $orderData['other_charges']);

        // Check snapshot immutability in database
        $order = Order::find($orderData['id']);
        $this->assertNotNull($order->shipping_snapshot);
        $snapshot = $order->shipping_snapshot;

        $this->assertEquals(2, $snapshot['carton_count']);
        $this->assertEquals(24.0, $snapshot['gross_weight']);
        $this->assertEquals(20.0, $snapshot['net_weight']);
        $this->assertEquals(0.144, $snapshot['cbm']);
        $this->assertEquals('QT-2026-88123', $snapshot['quote_reference_id']);

        // Check Grand Total formula: Subtotal ($850) + Shipping ($125.50) + Tax ($42.50) + Other Charges ($25.00) = $1043.00
        $subtotal = 850.00; // 100 * $8.50 bulk price
        $tax = round(850.00 * 0.05, 2); // $42.50
        $expectedTotal = $subtotal + 125.50 + $tax + 25.00; // 1043.00
        $this->assertEquals($expectedTotal, (float) $order->total_amount);
    }

    public function test_commercial_documents_proforma_invoice_and_order_sheet_render_snapshot(): void
    {
        $order = Order::create([
            'order_number' => 'AYN-20260831-DEMO01',
            'user_id' => $this->customer->id,
            'status' => 'processing',
            'payment_status' => 'paid',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 850.00,
            'shipping_cost' => 125.50,
            'tax_amount' => 42.50,
            'other_charges' => 25.00,
            'total_amount' => 1043.00,
            'email' => 'buyer@globalretail.com',
            'shipping_name' => 'Marcus Vance',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'Springfield',
            'shipping_postal_code' => '62704',
            'shipping_country_code' => 'US',
            'shipping_method' => 'Aramex Priority Parcel Express',
            'carrier' => 'Aramex',
            'shipping_quote_id' => 'QT-2026-88123',
            'shipping_snapshot' => [
                'shipping_method' => 'Aramex Priority Parcel Express',
                'carrier' => 'Aramex',
                'carton_count' => 2,
                'gross_weight' => 24.0,
                'net_weight' => 20.0,
                'cbm' => 0.144,
                'weight_unit' => 'kg',
                'is_provisional' => false,
            ],
            'payment_method' => 'card',
        ]);

        // 1. Proforma Invoice
        $piRes = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$order->id}/documents/PROFORMA_INVOICE");

        $piRes->assertStatus(200)
            ->assertJsonPath('data.title', 'PROFORMA INVOICE');
        
        $this->assertEquals(850.00, (float) $piRes->json('data.financials.goods_value'));
        $this->assertEquals(125.50, (float) $piRes->json('data.financials.shipping_charge'));
        $this->assertEquals(25.00, (float) $piRes->json('data.financials.other_charges'));
        $this->assertEquals(1043.00, (float) $piRes->json('data.financials.total_payable'));
        $this->assertEquals(2, $piRes->json('data.shipping_snapshot.carton_count'));
        $this->assertEquals(24.0, (float) $piRes->json('data.shipping_snapshot.gross_weight'));
        $this->assertEquals(0.144, (float) $piRes->json('data.shipping_snapshot.cbm'));

        // 2. Order Sheet
        $osRes = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$order->id}/documents/ORDER_SHEET");

        $osRes->assertStatus(200)
            ->assertJsonPath('data.title', 'COMMERCIAL ORDER SHEET');
        
        $this->assertEquals(1043.00, (float) $osRes->json('data.financials.grand_total'));
    }
}
