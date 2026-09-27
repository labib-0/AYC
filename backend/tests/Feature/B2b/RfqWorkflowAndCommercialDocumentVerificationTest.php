<?php

namespace Tests\Feature\B2b;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RfqWorkflowAndCommercialDocumentVerificationTest extends TestCase
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
            'name' => 'John Bradley',
            'email' => 'john@manhattan-wholesale.com',
            'role' => 'customer',
            'company_name' => 'Manhattan Wholesale LLC',
        ]);

        $this->otherCustomer = User::factory()->create([
            'name' => 'Sara Connor',
            'email' => 'sara@cyber-textiles.com',
            'role' => 'customer',
            'company_name' => 'Cyber Textiles Inc',
        ]);

        $this->admin = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@ayaanclothing.com',
            'role' => 'admin',
            'is_super_admin' => true,
            'status' => 'active',
        ]);

        $brand = Brand::create(['name' => 'Ayaan Apparel', 'slug' => 'ayaan-apparel', 'is_active' => true]);
        $category = Category::create(['name' => 'T-Shirts', 'slug' => 't-shirts', 'is_active' => true]);

        // Catalog Product with standard Catalog Price = $5.00
        $this->product = Product::create([
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'name' => 'Premium Organic Cotton Crewneck',
            'slug' => 'premium-organic-cotton-crewneck',
            'sku' => 'AYN-TS-001',
            'price' => 5.00,
            'wholesale_price' => 5.00,
            'status' => 'active',
            'is_active' => true,
        ]);
    }

    /**
     * SECTION 2 & 7: RFQ List, Search, Status Filtering, Date Filtering, Sorting, and Pagination
     */
    public function test_rfq_list_filtering_sorting_and_pagination(): void
    {
        // Create RFQs with different dates, statuses, and buyers
        $rfqToday = Quote::create([
            'rfq_number' => 'RFQ-TEST-TODAY',
            'user_id' => $this->customer->id,
            'buyer_name' => 'John Bradley',
            'buyer_email' => 'john@manhattan-wholesale.com',
            'company_name' => 'Manhattan Wholesale LLC',
            'status' => 'SUBMITTED',
        ]);
        Quote::where('id', $rfqToday->id)->update(['created_at' => Carbon::today()->addHours(2)]);

        $rfqYesterday = Quote::create([
            'rfq_number' => 'RFQ-TEST-YEST',
            'user_id' => $this->customer->id,
            'buyer_name' => 'John Bradley',
            'buyer_email' => 'john@manhattan-wholesale.com',
            'company_name' => 'Manhattan Wholesale LLC',
            'status' => 'UNDER_REVIEW',
        ]);
        Quote::where('id', $rfqYesterday->id)->update(['created_at' => Carbon::yesterday()->addHours(2)]);

        $rfq5DaysAgo = Quote::create([
            'rfq_number' => 'RFQ-TEST-7DAYS',
            'user_id' => $this->otherCustomer->id,
            'buyer_name' => 'Sara Connor',
            'buyer_email' => 'sara@cyber-textiles.com',
            'company_name' => 'Cyber Textiles Inc',
            'status' => 'APPROVED',
        ]);
        Quote::where('id', $rfq5DaysAgo->id)->update(['created_at' => Carbon::now()->subDays(5)]);

        $rfq20DaysAgo = Quote::create([
            'rfq_number' => 'RFQ-TEST-30DAYS',
            'user_id' => $this->customer->id,
            'buyer_name' => 'John Bradley',
            'buyer_email' => 'john@manhattan-wholesale.com',
            'company_name' => 'Manhattan Wholesale LLC',
            'status' => 'QUOTATION_GENERATED',
        ]);
        Quote::where('id', $rfq20DaysAgo->id)->update(['created_at' => Carbon::now()->subDays(20)]);

        $rfqLastMonth = Quote::create([
            'rfq_number' => 'RFQ-TEST-LASTMO',
            'user_id' => $this->otherCustomer->id,
            'buyer_name' => 'Sara Connor',
            'buyer_email' => 'sara@cyber-textiles.com',
            'company_name' => 'Cyber Textiles Inc',
            'status' => 'PAID',
        ]);
        Quote::where('id', $rfqLastMonth->id)->update(['created_at' => Carbon::now()->subMonth()->startOfMonth()->addDays(2)]);

        // 1. Date Filter: Today
        $resToday = $this->actingAs($this->admin)->getJson('/api/v1/admin/rfqs?date_filter=today');
        $resToday->assertStatus(200);
        $this->assertEquals(1, count($resToday->json('data')));
        $this->assertEquals('RFQ-TEST-TODAY', $resToday->json('data.0.rfq_number'));

        // 2. Date Filter: Yesterday
        $resYest = $this->actingAs($this->admin)->getJson('/api/v1/admin/rfqs?date_filter=yesterday');
        $resYest->assertStatus(200);
        $this->assertEquals(1, count($resYest->json('data')));
        $this->assertEquals('RFQ-TEST-YEST', $resYest->json('data.0.rfq_number'));

        // 3. Date Filter: Last 7 Days
        $res7Days = $this->actingAs($this->admin)->getJson('/api/v1/admin/rfqs?date_filter=last_7_days');
        $res7Days->assertStatus(200);
        $this->assertGreaterThanOrEqual(3, count($res7Days->json('data')));

        // 4. Date Filter: Last 30 Days
        $res30Days = $this->actingAs($this->admin)->getJson('/api/v1/admin/rfqs?date_filter=last_30_days');
        $res30Days->assertStatus(200);
        $this->assertGreaterThanOrEqual(4, count($res30Days->json('data')));

        // 5. Date Filter: Last Month
        $resLastMo = $this->actingAs($this->admin)->getJson('/api/v1/admin/rfqs?date_filter=last_month');
        $resLastMo->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($resLastMo->json('data')));

        // 6. Search
        $resSearch = $this->actingAs($this->admin)->getJson('/api/v1/admin/rfqs?search=Cyber');
        $resSearch->assertStatus(200);
        $this->assertEquals(2, count($resSearch->json('data')));

        // 7. Status Filter
        $resStatus = $this->actingAs($this->admin)->getJson('/api/v1/admin/rfqs?status=UNDER_REVIEW');
        $resStatus->assertStatus(200);
        $this->assertEquals(1, count($resStatus->json('data')));
        $this->assertEquals('RFQ-TEST-YEST', $resStatus->json('data.0.rfq_number'));

        // 8. Sorting & Pagination Metadata
        $resPage = $this->actingAs($this->admin)->getJson('/api/v1/admin/rfqs?page=1&per_page=2&sort_by=created_at&sort_order=desc');
        $resPage->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data',
                    'meta' => ['current_page', 'last_page', 'per_page', 'total'],
                ],
            ]);
        $this->assertEquals(2, count($resPage->json('data.data')));
        $this->assertEquals(5, $resPage->json('data.meta.total'));
    }

    /**
     * SECTION 3: Business-Rule Workflow Transitions:
     * RFQ Received → Under Review → Approved → Quotation Generation → Quotation Approved → PI + Offer Sheet → Payment Paid → Commercial Invoice
     */
    public function test_complete_rfq_workflow_transitions(): void
    {
        // 1. Customer submits RFQ (RFQ Received)
        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-9001',
            'user_id' => $this->customer->id,
            'buyer_name' => 'John Bradley',
            'buyer_email' => 'john@manhattan-wholesale.com',
            'company_name' => 'Manhattan Wholesale LLC',
            'destination_country' => 'United States',
            'status' => 'SUBMITTED',
        ]);

        QuoteItem::create([
            'quote_id' => $rfq->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 500,
        ]);

        // Step 1 → 2: Move from RFQ Received to Under Review
        $resReview = $this->actingAs($this->admin)->patchJson("/api/v1/admin/rfqs/{$rfq->id}/status", [
            'status' => 'UNDER_REVIEW',
            'note' => 'Specifications reviewed by technical merchandising team.',
        ]);
        $resReview->assertStatus(200);
        $this->assertEquals('UNDER_REVIEW', $rfq->fresh()->status);

        // Step 2 → 3: Move from Under Review to Approved
        $resApproveRfq = $this->actingAs($this->admin)->patchJson("/api/v1/admin/rfqs/{$rfq->id}/status", [
            'status' => 'APPROVED',
            'note' => 'Approved for official commercial quotation.',
        ]);
        $resApproveRfq->assertStatus(200);
        $this->assertEquals('APPROVED', $rfq->fresh()->status);

        // Step 3 → 4: Generate Quotation
        $quoteRes = $this->actingAs($this->admin)->postJson('/api/v1/admin/quotations', [
            'rfq_id' => $rfq->id,
            'buyer_name' => $rfq->buyer_name,
            'buyer_email' => $rfq->buyer_email,
            'company_name' => $rfq->company_name,
            'shipping_fee' => 75.00,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_name' => $this->product->name,
                    'quantity' => 500,
                    'unit_price' => 3.85, // Custom Admin Price
                    'package_breakdown' => [
                        ['size' => 'S', 'quantity' => 100],
                        ['size' => 'M', 'quantity' => 200],
                        ['size' => 'L', 'quantity' => 200],
                    ],
                ],
            ],
        ]);
        $quoteRes->assertStatus(201);
        $quotationId = $quoteRes->json('data.id');
        $quotation = Quotation::find($quotationId);
        $this->assertNotNull($quotation);

        // Step 4 → 5: Approve Quotation
        $approveQuoteRes = $this->actingAs($this->admin)->postJson("/api/v1/admin/quotations/{$quotation->id}/approve");
        $approveQuoteRes->assertStatus(200);
        $this->assertEquals('APPROVED', $quotation->fresh()->status);

        // Step 5 → 6: Proforma Invoice & Offer Sheet available
        $piRes = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/PROFORMA_INVOICE");
        $piRes->assertStatus(200);
        $this->assertEquals(3.85, $piRes->json('data.items.0.unit_price'));

        $offerRes = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/OFFER_SHEET");
        $offerRes->assertStatus(200);
        $this->assertEquals(3.85, $offerRes->json('data.items.0.unit_price'));

        // Step 6 → 7: Commercial Invoice gated while payment is Pending
        $ciGatedRes = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/COMMERCIAL_INVOICE");
        $ciGatedRes->assertStatus(403);
        $this->assertTrue($ciGatedRes->json('is_gated') ?? true);

        // Step 7 → 8: Mark Payment as Paid
        $payRes = $this->actingAs($this->admin)->postJson("/api/v1/admin/quotations/{$quotation->id}/payment", [
            'payment_status' => 'PAID',
            'note' => 'Wire transfer confirmed via SWIFT MT103.',
        ]);
        $payRes->assertStatus(200);
        $this->assertEquals('PAID', $quotation->fresh()->status);

        // Commercial Invoice now available!
        $ciPaidRes = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/COMMERCIAL_INVOICE");
        $ciPaidRes->assertStatus(200);
        $this->assertEquals('COMMERCIAL_INVOICE', $ciPaidRes->json('data.docType'));
        $this->assertEquals(3.85, $ciPaidRes->json('data.items.0.unit_price'));
    }

    /**
     * SECTION 4: Price Authority Test
     * Catalog Price: $5.00
     * Admin Custom Price: $3.85
     * Must persist $3.85 across Quotation, PI, Offer Sheet, Commercial Invoice without catalog recalculation.
     */
    public function test_price_authority_custom_admin_price_does_not_recalculate_from_catalog(): void
    {
        $this->assertEquals(5.00, (float) $this->product->wholesale_price);

        // Create Quotation with Admin Custom Price = $3.85
        $quotation = Quotation::create([
            'quotation_number' => 'QT-AYN-2026-PRICEAUTH',
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'currency' => 'USD',
            'subtotal' => 1925.00, // 500 * 3.85
            'shipping_fee' => 75.00,
            'grand_total' => 2000.00,
            'status' => 'PAID',
            'created_by' => $this->admin->id,
        ]);

        QuotationItem::create([
            'quotation_id' => $quotation->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 500,
            'unit_price' => 3.85, // Custom Admin Price
            'line_total' => 1925.00,
        ]);

        // Now catalog price increases to $12.00
        $this->product->update(['price' => 12.00, 'wholesale_price' => 12.00]);

        // 1. Quotation Show endpoint
        $resShow = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}");
        $resShow->assertStatus(200);
        $this->assertEquals(3.85, (float) $resShow->json('data.items.0.unit_price'));

        // 2. Proforma Invoice
        $resPI = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/PROFORMA_INVOICE");
        $resPI->assertStatus(200);
        $this->assertEquals(3.85, (float) $resPI->json('data.items.0.unit_price'));
        $this->assertEquals(1925.00, (float) $resPI->json('data.subtotal'));

        // 3. Offer Sheet
        $resOffer = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/OFFER_SHEET");
        $resOffer->assertStatus(200);
        $this->assertEquals(3.85, (float) $resOffer->json('data.items.0.unit_price'));
        $this->assertEquals(1925.00, (float) $resOffer->json('data.subtotal'));

        // 4. Commercial Invoice
        $resCI = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/COMMERCIAL_INVOICE");
        $resCI->assertStatus(200);
        $this->assertEquals(3.85, (float) $resCI->json('data.items.0.unit_price'));
        $this->assertEquals(1925.00, (float) $resCI->json('data.subtotal'));
    }

    /**
     * SECTION 5: Shipping Test
     * Product Subtotal: $1,000
     * Admin Shipping Fee: $75
     * Expected Total: $1,075
     * Must persist across Quotation, PI, Offer Sheet, Commercial Invoice.
     */
    public function test_shipping_fee_persistence_and_grand_total_calculation(): void
    {
        $quotation = Quotation::create([
            'quotation_number' => 'QT-AYN-2026-SHIPTEST',
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'currency' => 'USD',
            'subtotal' => 1000.00,
            'shipping_fee' => 75.00,
            'grand_total' => 1075.00,
            'status' => 'PAID',
            'created_by' => $this->admin->id,
        ]);

        QuotationItem::create([
            'quotation_id' => $quotation->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 200,
            'unit_price' => 5.00,
            'line_total' => 1000.00,
        ]);

        // 1. Quotation
        $resQuote = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}");
        $resQuote->assertStatus(200);
        $this->assertEquals(75.00, (float) $resQuote->json('data.shipping_fee'));
        $this->assertEquals(1075.00, (float) $resQuote->json('data.grand_total'));

        // 2. PI
        $resPI = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/PROFORMA_INVOICE");
        $resPI->assertStatus(200);
        $this->assertEquals(75.00, (float) $resPI->json('data.shipping'));
        $this->assertEquals(1075.00, (float) $resPI->json('data.grandTotal'));

        // 3. Offer Sheet
        $resOffer = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/OFFER_SHEET");
        $resOffer->assertStatus(200);
        $this->assertEquals(75.00, (float) $resOffer->json('data.shipping'));
        $this->assertEquals(1075.00, (float) $resOffer->json('data.grandTotal'));

        // 4. Commercial Invoice
        $resCI = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/COMMERCIAL_INVOICE");
        $resCI->assertStatus(200);
        $this->assertEquals(75.00, (float) $resCI->json('data.shipping_fee'));
        $this->assertEquals(1075.00, (float) $resCI->json('data.grandTotal'));
    }

    /**
     * SECTION 6: Package Breakdown Test
     * Assortment / ratio / package breakdown must be preserved identically throughout:
     * RFQ → Quotation → PI → Offer Sheet → Commercial Invoice
     */
    public function test_package_breakdown_preserved_throughout_all_commercial_documents(): void
    {
        $breakdown = [
            ['size' => 'S', 'ratio' => 1, 'quantity' => 50],
            ['size' => 'M', 'ratio' => 2, 'quantity' => 100],
            ['size' => 'L', 'ratio' => 2, 'quantity' => 100],
            ['size' => 'XL', 'ratio' => 1, 'quantity' => 50],
        ];

        // 1. RFQ Item
        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-PKG',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'status' => 'APPROVED',
        ]);

        QuoteItem::create([
            'quote_id' => $rfq->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 300,
        ]);

        // 2. Quotation with breakdown
        $quotation = Quotation::create([
            'quotation_number' => 'QT-AYN-2026-PKG',
            'quote_id' => $rfq->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'currency' => 'USD',
            'subtotal' => 1155.00,
            'shipping_fee' => 50.00,
            'grand_total' => 1205.00,
            'status' => 'PAID',
            'created_by' => $this->admin->id,
        ]);

        QuotationItem::create([
            'quotation_id' => $quotation->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 300,
            'unit_price' => 3.85,
            'line_total' => 1155.00,
            'package_breakdown' => $breakdown,
        ]);

        // PI
        $pi = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/PROFORMA_INVOICE");
        $pi->assertStatus(200);
        $this->assertEquals($breakdown, $pi->json('data.items.0.package_breakdown'));

        // Offer Sheet
        $os = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/OFFER_SHEET");
        $os->assertStatus(200);
        $this->assertEquals($breakdown, $os->json('data.items.0.package_breakdown'));

        // Commercial Invoice
        $ci = $this->actingAs($this->admin)->getJson("/api/v1/admin/quotations/{$quotation->id}/documents/COMMERCIAL_INVOICE");
        $ci->assertStatus(200);
        $this->assertEquals($breakdown, $ci->json('data.items.0.package_breakdown'));
    }

    /**
     * SECTION 8: Authorization Tests
     * Admin permitted, Customer forbidden on Admin actions.
     */
    public function test_authorization_admin_vs_customer_access(): void
    {
        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-AUTH-TEST',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'status' => 'SUBMITTED',
        ]);

        // 1. Customer cannot access Admin RFQs list
        $resCustList = $this->actingAs($this->customer)->getJson('/api/v1/admin/rfqs');
        $resCustList->assertStatus(403);

        // 2. Customer cannot set administrative status
        $resCustStatus = $this->actingAs($this->customer)->patchJson("/api/v1/admin/rfqs/{$rfq->id}/status", [
            'status' => 'UNDER_REVIEW',
        ]);
        $resCustStatus->assertStatus(403);

        // 3. Customer cannot create quotation via admin endpoint
        $resCustStoreQuote = $this->actingAs($this->customer)->postJson('/api/v1/admin/quotations', [
            'rfq_id' => $rfq->id,
            'buyer_name' => 'John',
            'buyer_email' => 'john@test.com',
            'company_name' => 'Co',
            'items' => [['product_name' => 'T-Shirt', 'quantity' => 100]],
        ]);
        $resCustStoreQuote->assertStatus(403);

        // 4. Admin CAN access all of the above
        $resAdminList = $this->actingAs($this->admin)->getJson('/api/v1/admin/rfqs');
        $resAdminList->assertStatus(200);

        $resAdminStatus = $this->actingAs($this->admin)->patchJson("/api/v1/admin/rfqs/{$rfq->id}/status", [
            'status' => 'UNDER_REVIEW',
        ]);
        $resAdminStatus->assertStatus(200);
    }

    /**
     * SECTION 9: Data Integrity & Immutability Test
     * Approved quotation cannot be edited; historical values remain immutable.
     */
    public function test_approved_quotation_immutability(): void
    {
        $quotation = Quotation::create([
            'quotation_number' => 'QT-AYN-IMMUTABLE-01',
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name,
            'currency' => 'USD',
            'subtotal' => 385.00,
            'shipping_fee' => 25.00,
            'grand_total' => 410.00,
            'status' => 'APPROVED',
            'payment_status' => 'pending',
            'created_by' => $this->admin->id,
        ]);

        // Attempting to modify an APPROVED quotation must be rejected with 422
        $resEdit = $this->actingAs($this->admin)->putJson("/api/v1/admin/quotations/{$quotation->id}", [
            'shipping_fee' => 100.00,
        ]);
        $resEdit->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertEquals(25.00, (float) $quotation->fresh()->shipping_fee);
    }
}
