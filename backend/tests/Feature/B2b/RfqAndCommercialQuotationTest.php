<?php

namespace Tests\Feature\B2b;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RfqMessage;
use App\Models\User;
use App\Notifications\QuotationCreatedNotification;
use App\Notifications\RfqCreatedNotification;
use App\Notifications\RfqMessageNotification;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RfqAndCommercialQuotationTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $otherCustomer;
    protected User $admin;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create([
            'name' => 'Elena Rostova',
            'email' => 'elena@buyer-corp.com',
            'role' => 'customer',
            'company_name' => 'Nordic Sourcing AS',
        ]);

        $this->otherCustomer = User::factory()->create([
            'name' => 'Jean-Luc Picard',
            'email' => 'jeanluc@enterprise-retail.com',
            'role' => 'customer',
            'company_name' => 'Enterprise Retail SAS',
        ]);

        $this->admin = User::factory()->create([
            'name' => 'Export Director',
            'email' => 'director@ayaanclothing.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $brand = Brand::create(['name' => 'Ayaan Signature', 'slug' => 'ayaan-sig', 'is_active' => true]);
        $category = Category::create(['name' => 'Polo Shirts', 'slug' => 'polos', 'is_active' => true]);

        $this->product = Product::create([
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'name' => 'Luxury Pique Polo',
            'slug' => 'luxury-pique-polo',
            'sku' => 'LPP-001',
            'wholesale_price' => 50.00,
            'bulk_threshold' => 100,
            'bulk_price' => 42.00,
            'full_stock_price' => 38.00,
            'cost_price' => 25.00,
            'moq' => 10,
            'stock' => 500,
            'status' => 'published',
            'primary_image_url' => '/images/polo-primary.jpg',
        ]);

        ProductImage::create([
            'product_id' => $this->product->id,
            'image_url' => '/images/polo-primary.jpg',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        ProductImage::create([
            'product_id' => $this->product->id,
            'image_url' => '/images/polo-side.jpg',
            'sort_order' => 1,
            'is_primary' => false,
        ]);

        ProductImage::create([
            'product_id' => $this->product->id,
            'image_url' => '/images/polo-back.jpg',
            'sort_order' => 2,
            'is_primary' => false,
        ]);
    }

    /**
     * SECTION 1 & 2: RFQ Creation, Items Persistence, and Unique Reference
     */
    public function test_customer_can_create_rfq_with_items_and_unique_reference(): void
    {
        Notification::fake();

        $response = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/rfq', [
            'buyer_name' => 'Elena Rostova',
            'buyer_email' => 'elena@buyer-corp.com',
            'company_name' => 'Nordic Sourcing AS',
            'destination_country' => 'Norway',
            'destination_city' => 'Oslo',
            'general_notes' => 'Looking for seasonal delivery of export polo shirts.',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_name' => 'Luxury Pique Polo',
                    'sku' => 'LPP-001',
                    'quantity' => 150,
                    'moq' => 10,
                    'target_price' => 40.00,
                    'selected_color' => 'Navy Blue',
                    'selected_size' => 'L',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $rfqData = $response->json('data');
        $this->assertNotEmpty($rfqData['rfq_number']);
        $this->assertStringStartsWith('RFQ-AYN-', $rfqData['rfq_number']);
        $this->assertEquals('SUBMITTED', $rfqData['status']);
        $this->assertCount(1, $rfqData['items']);
        $this->assertEquals(150, $rfqData['items'][0]['quantity']);
        $this->assertEquals('Navy Blue', $rfqData['items'][0]['selected_color']);

        // Verify initial message was persisted
        $this->assertDatabaseHas('rfq_messages', [
            'quote_id' => $rfqData['id'],
            'sender_role' => 'customer',
            'message' => 'Looking for seasonal delivery of export polo shirts.',
        ]);

        Notification::assertSentTo($this->customer, RfqCreatedNotification::class);
    }

    /**
     * SECTION 3: Persistent RFQ Messages and Customer-Admin Conversation
     */
    public function test_persistent_rfq_messages_conversation_flow(): void
    {
        Notification::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-999001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'destination_country' => 'Norway',
            'status' => 'SUBMITTED',
        ]);

        // 1. Customer posts a follow-up message
        $customerMsgRes = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/rfq/{$rfq->id}/messages", [
            'message' => 'Can you confirm lead time for 500 pcs?',
        ]);
        $customerMsgRes->assertStatus(201)
            ->assertJsonPath('data.sender_role', 'customer');

        // 2. Admin replies
        $adminMsgRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/rfq/{$rfq->id}/messages", [
            'message' => 'Production lead time is 21 days from order confirmation.',
        ]);
        $adminMsgRes->assertStatus(201)
            ->assertJsonPath('data.sender_role', 'admin');

        // 3. Customer retrieves message thread
        $threadRes = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/rfq/{$rfq->id}/messages");
        $threadRes->assertStatus(200);
        $this->assertCount(2, $threadRes->json('data'));
        $this->assertEquals('Can you confirm lead time for 500 pcs?', $threadRes->json('data.0.message'));
        $this->assertEquals('Production lead time is 21 days from order confirmation.', $threadRes->json('data.1.message'));

        // 4. Unauthorized other customer cannot read or post messages
        $forbiddenGet = $this->actingAs($this->otherCustomer, 'sanctum')->getJson("/api/v1/rfq/{$rfq->id}/messages");
        $forbiddenGet->assertStatus(403);

        $forbiddenPost = $this->actingAs($this->otherCustomer, 'sanctum')->postJson("/api/v1/rfq/{$rfq->id}/messages", [
            'message' => 'Intruder trying to send message',
        ]);
        $forbiddenPost->assertStatus(403);
    }

    /**
     * SECTION 4: RFQ Status Transitions and Access Control
     */
    public function test_rfq_status_transitions_and_role_protection(): void
    {
        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-999002',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'destination_country' => 'Norway',
            'status' => 'SUBMITTED',
        ]);

        // Customer cannot set administrative status 'QUOTATION_PREPARED'
        $invalidCust = $this->actingAs($this->customer, 'sanctum')->patchJson("/api/v1/rfq/{$rfq->id}/status", [
            'status' => 'QUOTATION_PREPARED',
        ]);
        $invalidCust->assertStatus(403);

        // Customer CAN cancel their own RFQ
        $cancelCust = $this->actingAs($this->customer, 'sanctum')->patchJson("/api/v1/rfq/{$rfq->id}/status", [
            'status' => 'CANCELLED',
            'note' => 'Buyer project postponed.',
        ]);
        $cancelCust->assertStatus(200)
            ->assertJsonPath('data.status', 'CANCELLED');

        // Admin CAN set any valid status
        $adminUpdate = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/rfq/{$rfq->id}/status", [
            'status' => 'UNDER_REVIEW',
            'note' => 'Under export desk review.',
        ]);
        $adminUpdate->assertStatus(200)
            ->assertJsonPath('data.status', 'UNDER_REVIEW');
    }

    /**
     * SECTION 5: Admin Date/Time and Range Filtering
     */
    public function test_admin_rfq_date_time_and_range_filtering(): void
    {
        // RFQ created today
        $todayQuote = Quote::create([
            'rfq_number' => 'RFQ-AYN-TODAY-01',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Today Buyer',
            'buyer_email' => 'today@buyer.com',
            'company_name' => 'Today Corp',
        ]);
        DB::table('quotes')->where('id', $todayQuote->id)->update(['created_at' => Carbon::now()]);

        // RFQ created yesterday
        $yesterdayQuote = Quote::create([
            'rfq_number' => 'RFQ-AYN-YEST-01',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Yesterday Buyer',
            'buyer_email' => 'yesterday@buyer.com',
            'company_name' => 'Yesterday Corp',
        ]);
        DB::table('quotes')->where('id', $yesterdayQuote->id)->update(['created_at' => Carbon::yesterday()->setTime(14, 0)]);

        // RFQ created 10 days ago
        $pastQuote = Quote::create([
            'rfq_number' => 'RFQ-AYN-PAST-01',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Past Buyer',
            'buyer_email' => 'past@buyer.com',
            'company_name' => 'Past Corp',
        ]);
        DB::table('quotes')->where('id', $pastQuote->id)->update(['created_at' => Carbon::now()->subDays(10)]);

        // 1. Admin filters by 'today'
        $todayRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/rfqs?date_filter=today');
        $todayRes->assertStatus(200);
        $this->assertTrue(collect($todayRes->json('data'))->contains('rfq_number', 'RFQ-AYN-TODAY-01'));
        $this->assertFalse(collect($todayRes->json('data'))->contains('rfq_number', 'RFQ-AYN-PAST-01'));

        // 2. Admin filters by 'yesterday'
        $yesterdayRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/rfqs?date_filter=yesterday');
        $yesterdayRes->assertStatus(200);
        $this->assertTrue(collect($yesterdayRes->json('data'))->contains('rfq_number', 'RFQ-AYN-YEST-01'));
        $this->assertFalse(collect($yesterdayRes->json('data'))->contains('rfq_number', 'RFQ-AYN-TODAY-01'));

        // 3. Admin filters by custom date range
        $rangeRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/rfqs?from_date=' . Carbon::yesterday()->toDateString() . '&to_date=' . Carbon::today()->toDateString());
        $rangeRes->assertStatus(200);
        $this->assertTrue(collect($rangeRes->json('data'))->contains('rfq_number', 'RFQ-AYN-TODAY-01'));
        $this->assertTrue(collect($rangeRes->json('data'))->contains('rfq_number', 'RFQ-AYN-YEST-01'));
        $this->assertFalse(collect($rangeRes->json('data'))->contains('rfq_number', 'RFQ-AYN-PAST-01'));
    }

    /**
     * SECTION 6, 7 & 8: Commercial Quotation Creation with Centralized Phase 3 Wholesale Tier Pricing
     */
    public function test_admin_can_create_quotation_with_wholesale_tier_price_snapshot(): void
    {
        Notification::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-888001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'destination_country' => 'Norway',
            'status' => 'SUBMITTED',
        ]);

        // Quantity requested: 120 pcs.
        // Product pricing: wholesale_price = 50.00, bulk_threshold = 100, bulk_price = 42.00.
        // Authoritative resolution must pick $42.00/pc!
        $quoteRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/quotations', [
            'rfq_id' => $rfq->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'destination_country' => 'Norway',
            'destination_city' => 'Oslo',
            'shipping_terms' => 'FOB Chittagong',
            'payment_terms' => '30% T/T Advance, 70% against B/L',
            'incoterm' => 'FOB',
            'shipping_fee' => 350.00,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_name' => $this->product->name,
                    'quantity' => 120,
                    'selected_size' => 'L',
                ],
            ],
        ]);

        $quoteRes->assertStatus(201)
            ->assertJsonPath('success', true);

        $quotation = $quoteRes->json('data');
        $this->assertStringStartsWith('QT-AYN-', $quotation['quotation_number']);
        
        // 120 * $42.00 = $5,040.00 subtotal
        $this->assertEquals(42.00, (float) $quotation['items'][0]['unit_price']);
        $this->assertEquals(5040.00, (float) $quotation['items'][0]['line_total']);
        $this->assertEquals(5040.00, (float) $quotation['subtotal']);
        $this->assertEquals(5390.00, (float) $quotation['grand_total']); // 5040 + 350 shipping

        // Historical snapshot verification: admin changes product prices later
        $this->product->update([
            'wholesale_price' => 70.00,
            'bulk_price' => 60.00,
        ]);

        // Customer views quotation -> prices MUST remain $42.00 and $5,040.00!
        $custView = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/quotations/{$quotation['id']}");
        $custView->assertStatus(200);
        $this->assertEquals(42.00, (float) $custView->json('data.items.0.unit_price'));
        $this->assertEquals(5040.00, (float) $custView->json('data.subtotal'));

        // Customer isolation: other customer CANNOT view this quotation
        $otherView = $this->actingAs($this->otherCustomer, 'sanctum')->getJson("/api/v1/quotations/{$quotation['id']}");
        $otherView->assertStatus(403);
    }

    /**
     * SECTION 9: Quotation Customer Response (Accept / Reject / Negotiation)
     */
    public function test_customer_can_accept_and_reject_quotation(): void
    {
        $quotation = Quotation::create([
            'quotation_number' => 'QT-AYN-2026-777001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'destination_country' => 'Norway',
            'subtotal' => 2100.00,
            'grand_total' => 2100.00,
            'status' => 'READY',
        ]);

        // Customer accepts quotation -> generates proforma invoice reference
        $acceptRes = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/quotations/{$quotation->id}/respond", [
            'response' => 'accept',
        ]);
        $acceptRes->assertStatus(200)
            ->assertJsonPath('data.status', 'ACCEPTED');
        $this->assertNotEmpty($acceptRes->json('data.proforma_invoice_id'));
        $this->assertStringStartsWith('PI-AYN-', $acceptRes->json('data.proforma_invoice_id'));
    }

    /**
     * SECTION 10, 11, 12, 13 & 14: Commercial Documents, Exact Pubali Bank Credentials, Single-Tier Pricing, Multi-Image Gallery
     */
    public function test_offer_sheet_document_conforms_to_exact_bank_and_single_tier_specifications(): void
    {
        $quotation = Quotation::create([
            'quotation_number' => 'QT-AYN-2026-555001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'destination_country' => 'Norway',
            'destination_city' => 'Oslo',
            'subtotal' => 2100.00,
            'grand_total' => 2100.00,
            'status' => 'READY',
        ]);

        QuotationItem::create([
            'quotation_id' => $quotation->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 50,
            'unit_price' => 42.00,
            'line_total' => 2100.00,
        ]);

        $docRes = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/quotations/{$quotation->id}/documents/OFFER_SHEET");
        $docRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $doc = $docRes->json('data');

        // 1. Exact Pubali Bank Limited values verified
        $this->assertEquals('Pubali Bank Limited', $doc['bankDetails']['bank_name']);
        $this->assertEquals('M/S AYAAN  CLOTHING', $doc['bankDetails']['account_title']);
        $this->assertEquals('1788-901-044316', $doc['bankDetails']['account_no']);
        $this->assertEquals('PUBABDDH210', $doc['bankDetails']['swift_code']);
        $this->assertStringContainsString('Nawabpur Road Branch', $doc['bankDetails']['bank_address']);
        $this->assertStringContainsString('125 Nawabpur Road', $doc['bankDetails']['bank_address']);
        $this->assertStringContainsString('Dhaka-1100', $doc['bankDetails']['bank_address']);
        $this->assertArrayNotHasKey('routing_no', $doc['bankDetails']);
        $this->assertArrayNotHasKey('routing_number', $doc['bankDetails']);

        // 2. Offer Sheet shows ONLY the pricing relevant to requested quantity (50 pcs * $42 = $2100)
        $this->assertFalse($doc['show_all_pricing_tiers']);
        $this->assertEquals(50, $doc['items'][0]['applicable_pricing']['order_quantity']);
        $this->assertEquals(42.00, $doc['items'][0]['applicable_pricing']['unit_price']);
        $this->assertEquals(2100.00, $doc['items'][0]['applicable_pricing']['total']);

        // 3. Multi-image product gallery verified (all available product images included)
        $this->assertNotEmpty($doc['product_gallery']);
        $this->assertContains('/images/polo-primary.jpg', $doc['product_gallery']);
        $this->assertContains('/images/polo-side.jpg', $doc['product_gallery']);
        $this->assertContains('/images/polo-back.jpg', $doc['product_gallery']);
    }

    /**
     * SECTION 26 & 27: Customer Cannot Access Internal Buying Cost or Margins
     */
    public function test_customer_cannot_expose_internal_buying_cost_in_rfq_or_quotations(): void
    {
        $quotation = Quotation::create([
            'quotation_number' => 'QT-AYN-2026-111001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'destination_country' => 'Norway',
            'subtotal' => 1000.00,
            'grand_total' => 1000.00,
            'status' => 'READY',
        ]);

        QuotationItem::create([
            'quotation_id' => $quotation->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 20,
            'unit_price' => 50.00,
            'line_total' => 1000.00,
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/quotations/{$quotation->id}");
        $response->assertStatus(200);

        // Verify sensitive fields are strictly excluded
        $item = $response->json('data.items.0');
        $this->assertArrayNotHasKey('cost_price', $item);
        $this->assertArrayNotHasKey('buying_price', $item);
        $this->assertArrayNotHasKey('gross_profit', $item);
        $this->assertArrayNotHasKey('margin', $item);
    }

    /**
     * STF-005: Customer RFQ Retrieval and Isolation
     */
    public function test_customer_can_retrieve_rfq_list_via_both_endpoints_with_isolation(): void
    {
        // Create an RFQ for this customer
        $rfq1 = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-TEST01',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Nordic Sourcing',
            'destination_country' => 'Norway',
            'status' => 'SUBMITTED',
        ]);

        // Create an RFQ for another customer
        $rfq2 = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-TEST02',
            'user_id' => $this->otherCustomer->id,
            'buyer_name' => $this->otherCustomer->name,
            'buyer_email' => $this->otherCustomer->email,
            'company_name' => 'Other Corp',
            'destination_country' => 'Sweden',
            'status' => 'SUBMITTED',
        ]);

        // Test GET /api/v1/rfq (singular)
        $resSingular = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/rfq');
        $resSingular->assertStatus(200);
        $dataSingular = $resSingular->json('data');
        $this->assertNotEmpty($dataSingular);
        $numbersSingular = collect($dataSingular)->pluck('rfq_number')->all();
        $this->assertContains('RFQ-AYN-2026-TEST01', $numbersSingular);
        $this->assertNotContains('RFQ-AYN-2026-TEST02', $numbersSingular);

        // Test GET /api/v1/rfqs (plural alias)
        $resPlural = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/rfqs');
        $resPlural->assertStatus(200);
        $dataPlural = $resPlural->json('data');
        $numbersPlural = collect($dataPlural)->pluck('rfq_number')->all();
        $this->assertContains('RFQ-AYN-2026-TEST01', $numbersPlural);
        $this->assertNotContains('RFQ-AYN-2026-TEST02', $numbersPlural);
    }
}
