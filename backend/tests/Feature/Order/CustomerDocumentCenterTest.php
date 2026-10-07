<?php

namespace Tests\Feature\Order;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerDocumentCenterTest extends TestCase
{
    use RefreshDatabase;

    protected User $customerA;
    protected User $customerB;
    protected User $admin;
    protected Order $orderA1;
    protected Order $orderA2;
    protected Order $orderB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customerA = User::factory()->create([
            'email' => 'justgamer@buyer.com',
            'name' => 'Just Gamer',
            'company_name' => 'Just Gamer Ltd',
            'role' => 'customer',
        ]);

        $this->customerB = User::factory()->create([
            'email' => 'other@retailer.com',
            'name' => 'Other Retailer',
            'company_name' => 'Other Retailer Inc',
            'role' => 'customer',
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaanclothing.com',
            'name' => 'Super Admin',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        // Order A1: Paid order (has PI, CI, INV, OS, PL)
        $this->orderA1 = Order::create([
            'user_id' => $this->customerA->id,
            'order_number' => 'AYN-20261007-CZPIV',
            'status' => 'processing',
            'payment_status' => 'paid',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 3000.00,
            'total_amount' => 3192.00,
            'email' => 'justgamer@buyer.com',
            'shipping_name' => 'Just Gamer',
            'shipping_address1' => '123 Gamer Way',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'payment_method' => 'wire_transfer',
            'created_at' => '2026-10-07 10:00:00',
        ]);

        // Order A2: Unpaid order (has PI, INV, OS - CI & PL gated)
        $this->orderA2 = Order::create([
            'user_id' => $this->customerA->id,
            'order_number' => 'AYN-20261005-ABCD',
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 1800.00,
            'total_amount' => 1840.00,
            'email' => 'justgamer@buyer.com',
            'shipping_name' => 'Just Gamer',
            'shipping_address1' => '123 Gamer Way',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
            'created_at' => '2026-10-05 14:00:00',
        ]);

        // Order B: Belongs to Customer B
        $this->orderB = Order::create([
            'user_id' => $this->customerB->id,
            'order_number' => 'AYN-20261004-SECRET',
            'status' => 'processing',
            'payment_status' => 'paid',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 5000.00,
            'total_amount' => 5250.00,
            'email' => 'other@retailer.com',
            'shipping_name' => 'Other Retailer',
            'shipping_address1' => '456 Secret Ave',
            'shipping_city' => 'London',
            'shipping_postal_code' => 'EC1A 1BB',
            'shipping_country_code' => 'GB',
            'payment_method' => 'wire_transfer',
        ]);

        $this->orderA1->created_at = now();
        $this->orderA1->saveQuietly();

        $this->orderA2->created_at = now()->subDays(2);
        $this->orderA2->saveQuietly();

        $this->orderB->created_at = now()->subDays(3);
        $this->orderB->saveQuietly();
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/orders/documents');
        $response->assertStatus(401);
    }

    public function test_customer_receives_documents_grouped_by_order(): void
    {
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents');

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertCount(2, $data, 'Customer A has 2 orders');

        // Order 1 is A1 (most recent)
        $firstGroup = $data[0];
        $this->assertEquals('AYN-20261007-CZPIV', $firstGroup['order']['order_number']);
        $this->assertEquals(3192.00, $firstGroup['order']['total']);
        $this->assertEquals('Just Gamer', $firstGroup['order']['customer_name']);

        // Paid order A1 has 5 documents: PI, CI, INV, OS, PL
        $docTypes = array_column($firstGroup['documents'], 'doc_type');
        $this->assertContains('PROFORMA_INVOICE', $docTypes);
        $this->assertContains('COMMERCIAL_INVOICE', $docTypes);
        $this->assertContains('INVOICE', $docTypes);
        $this->assertContains('ORDER_SHEET', $docTypes);
        $this->assertContains('PACKING_LIST', $docTypes);

        // Every document has required fields
        foreach ($firstGroup['documents'] as $doc) {
            $this->assertNotEmpty($doc['reference']);
            $this->assertNotEmpty($doc['type_name']);
            $this->assertNotEmpty($doc['badge_code']);
            $this->assertEquals((string) $this->orderA1->id, $doc['source_id']);
        }
    }

    public function test_unpaid_order_omits_commercial_invoice_and_packing_list(): void
    {
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Second group is unpaid Order A2
        $secondGroup = $data[1];
        $this->assertEquals('AYN-20261005-ABCD', $secondGroup['order']['order_number']);

        $docTypes = array_column($secondGroup['documents'], 'doc_type');
        $this->assertContains('PROFORMA_INVOICE', $docTypes);
        $this->assertContains('INVOICE', $docTypes);
        $this->assertContains('ORDER_SHEET', $docTypes);
        $this->assertNotContains('COMMERCIAL_INVOICE', $docTypes);
        $this->assertNotContains('PACKING_LIST', $docTypes);
    }

    public function test_customer_isolation_boundary_enforced(): void
    {
        // Customer A must NEVER see Customer B's order
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents');

        $response->assertStatus(200);
        $data = $response->json('data');

        $orderNumbers = array_column(array_column($data, 'order'), 'order_number');
        $this->assertNotContains('AYN-20261004-SECRET', $orderNumbers);

        // Even when searching Customer B's name or order ID
        $searchResponse = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents?search=SECRET');

        $searchResponse->assertStatus(200);
        $this->assertCount(0, $searchResponse->json('data'));

        $nameSearch = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents?search=Other+Retailer');

        $nameSearch->assertStatus(200);
        $this->assertCount(0, $nameSearch->json('data'));
    }

    public function test_search_by_order_number_returns_complete_order_group(): void
    {
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents?search=CZPIV');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('AYN-20261007-CZPIV', $data[0]['order']['order_number']);
        $this->assertCount(5, $data[0]['documents']);
    }

    public function test_search_by_document_reference_returns_complete_order_group(): void
    {
        // Searching for PI reference returns the entire order group with all 5 documents
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents?search=PI-2026-CZPIV');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('AYN-20261007-CZPIV', $data[0]['order']['order_number']);
        $this->assertCount(5, $data[0]['documents']);
    }

    public function test_search_by_ci_reference_returns_complete_order_group(): void
    {
        // Searching for CI reference returns the entire order group
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents?search=CI-2026-CZPIV');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('AYN-20261007-CZPIV', $data[0]['order']['order_number']);
        $this->assertCount(5, $data[0]['documents']);
    }

    public function test_search_by_customer_name(): void
    {
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents?search=Just+Gamer');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);
    }

    public function test_filtering_preserves_order_grouping(): void
    {
        // Filter by INVOICES: order remains top-level entity, but only PI, CI, INV are inside
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents?filter=INVOICES');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);

        foreach ($data as $group) {
            $this->assertArrayHasKey('order', $group);
            $this->assertArrayHasKey('documents', $group);
            foreach ($group['documents'] as $doc) {
                $this->assertContains($doc['doc_type'], ['PROFORMA_INVOICE', 'COMMERCIAL_INVOICE', 'INVOICE']);
                $this->assertNotEquals('ORDER_SHEET', $doc['doc_type']);
                $this->assertNotEquals('PACKING_LIST', $doc['doc_type']);
            }
        }
    }

    public function test_packing_filter_excludes_orders_without_packing_list(): void
    {
        // Filter by PACKING: only Order A1 (paid) has a packing list
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents?filter=PACKING');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('AYN-20261007-CZPIV', $data[0]['order']['order_number']);
        $this->assertCount(1, $data[0]['documents']);
        $this->assertEquals('PACKING_LIST', $data[0]['documents'][0]['doc_type']);
    }

    public function test_pagination_is_order_based(): void
    {
        // Request with per_page=1: exactly 1 order returned
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/orders/documents?per_page=1&page=1');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('AYN-20261007-CZPIV', $data[0]['order']['order_number']);
        $this->assertCount(5, $data[0]['documents'], 'All 5 documents of order 1 are kept together');

        $meta = $response->json('meta');
        $this->assertEquals(1, $meta['current_page']);
        $this->assertEquals(2, $meta['total_orders']);
        $this->assertEquals(2, $meta['last_page']);
    }

    public function test_customer_document_center_alias_route_works(): void
    {
        $response = $this->actingAs($this->customerA, 'sanctum')
            ->getJson('/api/v1/customer/documents');

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $this->assertCount(2, $response->json('data'));
    }
}
