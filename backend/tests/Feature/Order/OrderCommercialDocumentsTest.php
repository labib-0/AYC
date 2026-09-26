<?php

namespace Tests\Feature\Order;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderCommercialDocumentsTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $otherCustomer;
    protected User $admin;
    protected Product $product;
    protected Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create([
            'email' => 'buyer@fashionbrands.com',
            'name' => 'Fashion Brands Sourcing',
            'role' => 'customer',
        ]);

        $this->otherCustomer = User::factory()->create([
            'email' => 'other@retailer.com',
            'name' => 'Other Retailer Inc.',
            'role' => 'customer',
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaanclothing.com',
            'name' => 'Export Director',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->product = Product::create([
            'name' => 'Export Luxury Pique Polo Shirt',
            'slug' => 'export-luxury-pique-polo-shirt',
            'sku' => 'AYN-POLO-LUX-01',
            'brand' => 'Ayaan Manufacturing',
            'audience' => 'MEN',
            'category_id' => null,
            'wholesale_price' => 25.00,
            'price' => 25.00,
            'bulk_threshold' => 200,
            'bulk_price' => 25.00,
            'moq' => 50,
            'stock' => 5000,
            'status' => 'published',
        ]);

        // Create initial pending order (200 pcs = $5,000 + $620 shipping = $5,620 total)
        $this->order = Order::create([
            'order_number' => 'AYN-20260831-998811',
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'shipping_name' => 'Fashion Brands Sourcing Dept',
            'shipping_phone' => '+1 555 839 2011',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'New York',
            'shipping_region' => 'NY',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'transfer',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 5000.00,
            'shipping_cost' => 620.00,
            'tax_amount' => 0.00,
            'other_charges' => 0.00,
            'discount_amount' => 0.00,
            'total_amount' => 5620.00,
            'shipping_method' => 'Aramex Priority Parcel Express',
            'carrier' => 'Aramex',
            'shipping_snapshot' => [
                'shipping_method' => 'Aramex Priority Parcel Express',
                'carrier' => 'Aramex',
                'quoted_shipping_charge' => 620.00,
                'currency' => 'USD',
                'package_quantity' => 200,
                'carton_count' => 4,
                'carton_dimensions' => ['length' => 60, 'width' => 40, 'height' => 30, 'unit' => 'cm'],
                'gross_weight' => 88.0,
                'net_weight' => 80.0,
                'weight_unit' => 'kg',
                'cbm' => 0.288,
                'total_cbm' => 0.288,
                'chargeable_weight' => 88.0,
                'quote_reference_id' => 'QT-ARX-TEST-001',
                'quoted_at' => now()->toIso8601String(),
                'is_provisional' => false,
            ],
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'product_image_url' => '/images/polo-cover.jpg',
            'size' => 'L',
            'color' => 'Navy',
            'package_breakdown' => [
                ['color' => 'Navy', 'size' => 'L', 'quantity' => 200],
            ],
            'quantity' => 200,
            'unit_price' => 25.00,
            'line_total' => 5000.00,
        ]);
    }

    public function test_proforma_invoice_and_order_sheet_available_before_payment(): void
    {
        $responsePI = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/PROFORMA_INVOICE");

        $responsePI->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'PROFORMA_INVOICE')
            ->assertJsonPath('data.doc_number', 'PI-' . date('Y') . '-998811');

        $this->assertEquals(5620.00, (float) $responsePI->json('data.financials.grand_total'));

        $responseOS = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/ORDER_SHEET");

        $responseOS->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'ORDER_SHEET')
            ->assertJsonPath('data.doc_number', 'ORD-' . date('Y') . '-998811');
    }

    public function test_commercial_invoice_and_packing_list_are_gated_before_payment(): void
    {
        $responseInv = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/COMMERCIAL_INVOICE");

        $responseInv->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('is_gated', true);

        $responsePL = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/PACKING_LIST");

        $responsePL->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('is_gated', true);
    }

    public function test_commercial_invoice_and_packing_list_become_available_after_payment(): void
    {
        // Admin verifies payment
        $this->order->update([
            'payment_status' => 'paid',
            'status' => 'processing',
        ]);

        $responseInv = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/COMMERCIAL_INVOICE");

        $responseInv->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'COMMERCIAL_INVOICE')
            ->assertJsonPath('data.doc_number', 'INV-' . date('Y') . '-998811')
            ->assertJsonPath('data.is_payment_verified', true)
            ->assertJsonPath('data.is_gated', false)
            ->assertJsonPath('data.exporter.company_name', 'AYAAN CLOTHING')
            ->assertJsonPath('data.exporter.brand_mark', 'AYC')
            ->assertJsonPath('data.exporter.address', 'House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh')
            ->assertJsonPath('data.exporter.whatsapp', '+8801826304930')
            ->assertJsonPath('data.exporter.whatsapp_number', '8801826304930')
            ->assertJsonPath('data.exporter.est_year', 2010)
            ->assertJsonPath('data.exporter.country', 'Bangladesh')
            ->assertJsonPath('data.logistics.country_of_origin', 'Bangladesh')
            ->assertJsonPath('data.financials.amount_in_words', 'US Dollars Five Thousand Six Hundred Twenty and 00/100 Only');

        $responsePL = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/PACKING_LIST");

        $responsePL->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'PACKING_LIST')
            ->assertJsonPath('data.doc_number', 'PL-' . date('Y') . '-998811')
            ->assertJsonPath('data.related_invoice_number', 'INV-' . date('Y') . '-998811')
            ->assertJsonPath('data.totals_summary.total_cartons', 4)
            ->assertJsonPath('data.totals_summary.total_quantity', 200);
    }

    public function test_document_say_in_words_converter(): void
    {
        $this->assertEquals(
            'US Dollars Five Thousand Six Hundred Twenty and 00/100 Only',
            Order::numberToWords(5620.00)
        );

        $this->assertEquals(
            'US Dollars One Hundred Twenty-Five Thousand Four Hundred Fifty and 50/100 Only',
            Order::numberToWords(125450.50)
        );
    }

    public function test_documents_preserve_historical_snapshot_even_if_products_are_updated(): void
    {
        $this->order->update(['payment_status' => 'paid']);

        // Vendor updates current live catalog price from $25 to $40 and changes product name
        $this->product->update([
            'name' => 'NEW REDESIGNED POLO 2027',
            'wholesale_price' => 40.00,
            'price' => 40.00,
        ]);

        $response = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/COMMERCIAL_INVOICE");

        $response->assertStatus(200);
        $items = $response->json('data.items');

        // Historical order snapshot price remains $25.00, total remains $5,000.00
        $this->assertEquals(25.00, (float) $items[0]['unit_price']);
        $this->assertEquals(5000.00, (float) $items[0]['line_total']);
        $this->assertEquals('Export Luxury Pique Polo Shirt', $items[0]['product_name']);
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $response = $this->getJson("/api/v1/orders/{$this->order->id}/documents/PROFORMA_INVOICE");

        $response->assertStatus(401);
    }

    public function test_unauthorized_user_cannot_access_other_customers_documents(): void
    {
        $response = $this->actingAs($this->otherCustomer)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/ORDER_SHEET");

        $response->assertStatus(403)
            ->assertJsonPath('message', 'You are not authorized to view commercial documents for this order');
    }

    public function test_customer_cannot_access_other_customer_document_for_any_doc_type(): void
    {
        $docTypes = ['ORDER_SHEET', 'PROFORMA_INVOICE', 'COMMERCIAL_INVOICE', 'PACKING_LIST'];

        foreach ($docTypes as $docType) {
            $response = $this->actingAs($this->otherCustomer)
                ->getJson("/api/v1/orders/{$this->order->id}/documents/{$docType}");

            $response->assertStatus(403)
                ->assertJsonPath('message', 'You are not authorized to view commercial documents for this order');
        }
    }

    public function test_owner_customer_can_access_own_documents(): void
    {
        $response = $this->actingAs($this->customer)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/PROFORMA_INVOICE");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'PROFORMA_INVOICE');
    }

    public function test_admin_can_preview_all_documents(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/orders/{$this->order->id}/documents/COMMERCIAL_INVOICE");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
