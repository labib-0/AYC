<?php

namespace Tests\Feature\Documents;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductShippingPackageProfile;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Documents\CommercialInvoiceService;
use App\Services\Documents\CommercialPdfArtifactService;
use App\Services\Documents\DocumentPdfService;
use App\Services\Documents\ProformaInvoiceService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\View;
use Tests\TestCase;

class CommercialInvoiceConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;
    private User $unrelatedCustomer;
    private User $admin;
    private CommercialInvoiceService $ciService;
    private ProformaInvoiceService $piService;
    private CommercialPdfArtifactService $artifactService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacPermissionCatalogSeeder::class);

        $this->customer = User::factory()->create([
            'name' => 'Synthetic Test Buyer',
            'email' => 'synthetic-buyer@example.test',
            'role' => 'customer',
            'company_name' => 'Nordic Apparel Imports Ltd',
        ]);

        $this->unrelatedCustomer = User::factory()->create([
            'name' => 'Unrelated Customer',
            'email' => 'unrelated@example.test',
            'role' => 'customer',
            'company_name' => 'Other Corp',
        ]);

        $this->admin = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@ayaanclothing.com',
            'role' => 'admin',
        ]);

        $this->ciService = app(CommercialInvoiceService::class);
        $this->piService = app(ProformaInvoiceService::class);
        $this->artifactService = app(CommercialPdfArtifactService::class);

        SystemSetting::set('business_email', 'sales@ayaanclothing.com');
        SystemSetting::set('business_name', 'AYAAN CLOTHING');
        SystemSetting::set('whatsapp_display', '+880 1620-853502');
    }

    private function createSyntheticOrder(array $attributes = []): Order
    {
        $order = Order::factory()->create(array_merge([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-CI-' . rand(1000, 9999),
            'shipping_name' => 'Nordic Apparel Imports Ltd',
            'shipping_address1' => 'Storgata 15',
            'shipping_city' => 'Oslo',
            'shipping_country_code' => 'Norway',
            'email' => 'synthetic-buyer@example.test',
            'currency' => 'USD',
            'subtotal' => 4500.00,
            'shipping_cost' => 300.00,
            'tax_amount' => 180.00,
            'discount_amount' => 0.00,
            'total_amount' => 4980.00,
            'payment_status' => 'pending',
            'status' => 'pending',
            'payment_method' => 'bank_transfer',
        ], $attributes));

        $product = Product::factory()->create([
            'name' => 'Export Interlock Jacket',
            'sku' => 'JAC-EXP-001',
            'wholesale_price' => 45.00,
        ]);

        ProductShippingPackageProfile::create([
            'product_id' => $product->id,
            'package_quantity' => 100,
            'carton_count' => 5,
            'carton_length' => 60,
            'carton_width' => 40,
            'carton_height' => 30,
            'gross_weight' => 20.0,
            'is_active' => true,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 100,
            'unit_price' => 45.00,
            'line_total' => 4500.00,
        ]);

        return $order->fresh(['items.product.shippingPackageProfiles', 'user', 'payments']);
    }

    /**
     * Test 1: Unpaid invoice — Amount Paid is zero, Payment Status is pending, correct balance due.
     */
    public function test_01_unpaid_invoice_shows_zero_paid_and_full_balance_due(): void
    {
        $order = $this->createSyntheticOrder();

        $payload = $this->ciService->generateForOrder($order);

        $this->assertEquals(0.00, $payload['financials']['paid_amount']);
        $this->assertEquals(4980.00, $payload['financials']['balance_due']);
        $this->assertEquals('PAYMENT PENDING', $payload['financials']['payment_status'] ?? $payload['payment_status']);
        $this->assertFalse($payload['is_payment_verified']);

        $html = View::make('pdf.commercial-invoice', ['doc' => $payload])->render();

        $this->assertStringContainsString('COMMERCIAL INVOICE', $html);
        $this->assertStringContainsString('Amount Paid:', $html);
        $this->assertStringContainsString('$0.00', $html);
        $this->assertStringContainsString('Balance Due:', $html);
        $this->assertStringContainsString('$4,980.00', $html);
        $this->assertStringContainsString('PAYMENT PENDING', $html);
    }

    /**
     * Test 2: Partial payment — Amount Paid equals verified payment sum, remaining balance accurate, not marked fully paid.
     */
    public function test_02_partial_payment_updates_amount_paid_and_balance_due(): void
    {
        $order = $this->createSyntheticOrder();

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'TXN-PARTIAL-001',
            'amount' => 1800.00,
            'currency' => 'USD',
            'status' => 'confirmed',
            'payment_method' => 'bank_transfer',
            'payer_name' => 'Nordic Treasury AS',
            'bank_name' => 'DNB Bank ASA',
            'confirmed_at' => now(),
        ]);

        $order->load('payments');
        $payload = $this->ciService->generateForOrder($order);

        $this->assertEquals(1800.00, $payload['financials']['paid_amount']);
        $this->assertEquals(3180.00, $payload['financials']['balance_due']); // 4980 - 1800 = 3180
        $this->assertEquals('PARTIAL', $payload['payment_status']);
        $this->assertFalse($payload['is_payment_verified']);

        $html = View::make('pdf.commercial-invoice', ['doc' => $payload])->render();

        $this->assertStringContainsString('$1,800.00', $html);
        $this->assertStringContainsString('Balance Due:', $html);
        $this->assertStringContainsString('$3,180.00', $html);
        $this->assertStringContainsString('PARTIAL', $html);
    }

    /**
     * Test 3: Fully paid invoice — Amount Paid equals Total Payable, status is PAID, Balance Due row is absent.
     */
    public function test_03_fully_paid_invoice_suppresses_balance_due_row(): void
    {
        $order = $this->createSyntheticOrder(['payment_status' => 'paid']);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'TXN-FULL-SETTLE',
            'amount' => 4980.00,
            'currency' => 'USD',
            'status' => 'confirmed',
            'payment_method' => 'bank_transfer',
            'payer_name' => 'Nordic Treasury AS',
            'bank_name' => 'DNB Bank ASA',
            'confirmed_at' => now(),
        ]);

        $order->load('payments');
        $payload = $this->ciService->generateForOrder($order);

        $this->assertEquals(4980.00, $payload['financials']['paid_amount']);
        $this->assertEquals(0.00, $payload['financials']['balance_due']);
        $this->assertEquals('PAID', $payload['payment_status']);
        $this->assertTrue($payload['is_payment_verified']);

        $html = View::make('pdf.commercial-invoice', ['doc' => $payload])->render();

        $this->assertStringContainsString('TOTAL PAYABLE:', $html);
        $this->assertStringContainsString('$4,980.00 USD', $html);
        $this->assertStringContainsString('Amount Paid:', $html);
        $this->assertStringContainsString('$4,980.00', $html);
        $this->assertStringContainsString('PAID', $html);

        // Crucial requirement: Balance Due row must be completely absent when balance is zero
        $this->assertStringNotContainsString('Balance Due:', $html);
    }

    /**
     * Test 4: Pending transaction reference — buyer's submitted reference does NOT mark invoice as paid.
     */
    public function test_04_pending_buyer_submitted_transaction_does_not_mark_as_paid(): void
    {
        $order = $this->createSyntheticOrder([
            'payment_status' => 'payment_submitted',
            'payment_reference' => 'UNVERIFIED-BUYER-REF-999',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'UNVERIFIED-BUYER-REF-999',
            'amount' => 4980.00,
            'currency' => 'USD',
            'status' => 'submitted', // submitted/pending, not confirmed!
            'payment_method' => 'bank_transfer',
            'payer_name' => 'Pending Buyer Account',
            'bank_name' => 'Pending Bank Int',
        ]);

        $order->load('payments');
        $payload = $this->ciService->generateForOrder($order);

        // Must NOT be marked as paid
        $this->assertEquals(0.00, $payload['financials']['paid_amount']);
        $this->assertEquals(4980.00, $payload['financials']['balance_due']);
        $this->assertFalse($payload['is_payment_verified']);

        $html = View::make('pdf.commercial-invoice', ['doc' => $payload])->render();

        $this->assertStringContainsString('UNVERIFIED-BUYER-REF-999', $html);
        $this->assertStringContainsString('Pending Buyer Account', $html);
        $this->assertStringContainsString('Pending Bank Int', $html);
        $this->assertStringContainsString('Balance Due:', $html);
        $this->assertStringContainsString('$4,980.00', $html);
        $this->assertStringNotContainsString('status-paid', $html);
    }

    /**
     * Test 5: Failed or rejected transaction — excluded from Amount Paid.
     */
    public function test_05_failed_or_rejected_transactions_excluded_from_paid_amount(): void
    {
        $order = $this->createSyntheticOrder();

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'TXN-FAILED-001',
            'amount' => 4980.00,
            'currency' => 'USD',
            'status' => 'failed',
            'payment_method' => 'card',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'TXN-REJECTED-002',
            'amount' => 4980.00,
            'currency' => 'USD',
            'status' => 'rejected',
            'payment_method' => 'bank_transfer',
        ]);

        $order->load('payments');
        $payload = $this->ciService->generateForOrder($order);

        $this->assertEquals(0.00, $payload['financials']['paid_amount']);
        $this->assertEquals(4980.00, $payload['financials']['balance_due']);
        $this->assertFalse($payload['is_payment_verified']);
    }

    /**
     * Test 6: Multiple verified transactions — amounts aggregated correctly without duplicate counting.
     */
    public function test_06_multiple_verified_payments_aggregate_correctly(): void
    {
        $order = $this->createSyntheticOrder();

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'TXN-PART-1',
            'amount' => 1500.00,
            'currency' => 'USD',
            'status' => 'confirmed',
            'payment_method' => 'bank_transfer',
            'payer_name' => 'Nordic Corp',
            'bank_name' => 'Nordea',
            'confirmed_at' => now(),
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'TXN-PART-2',
            'amount' => 2000.00,
            'currency' => 'USD',
            'status' => 'succeeded',
            'payment_method' => 'bank_transfer',
            'payer_name' => 'Nordic Corp',
            'bank_name' => 'Nordea',
            'confirmed_at' => now(),
        ]);

        $order->load('payments');
        $payload = $this->ciService->generateForOrder($order);

        $this->assertEquals(3500.00, $payload['financials']['paid_amount']); // 1500 + 2000 = 3500
        $this->assertEquals(1480.00, $payload['financials']['balance_due']); // 4980 - 3500 = 1480
        $this->assertEquals('PARTIAL', $payload['payment_status']);
    }

    /**
     * Test 7: Duplicate notification or callback — same payment is not counted twice.
     */
    public function test_07_duplicate_notification_callback_not_counted_twice(): void
    {
        $order = $this->createSyntheticOrder();

        // Simulate duplicate webhook / callback creating twin records with same transaction_id
        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'TXN-DUP-CALLBACK-777',
            'amount' => 2500.00,
            'currency' => 'USD',
            'status' => 'confirmed',
            'payment_method' => 'bank_transfer',
            'payer_name' => 'Nordic Corp',
            'bank_name' => 'Nordea',
            'confirmed_at' => now(),
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'TXN-DUP-CALLBACK-777',
            'amount' => 2500.00,
            'currency' => 'USD',
            'status' => 'confirmed',
            'payment_method' => 'bank_transfer',
            'payer_name' => 'Nordic Corp',
            'bank_name' => 'Nordea',
            'confirmed_at' => now(),
        ]);

        $order->load('payments');
        $payload = $this->ciService->generateForOrder($order);

        // Deduplication by transaction_id ensures it counts as 2,500.00, not 5,000.00
        $this->assertEquals(2500.00, $payload['financials']['paid_amount']);
        $this->assertEquals(2480.00, $payload['financials']['balance_due']);
        $this->assertEquals('PARTIAL', $payload['payment_status']);
    }

    /**
     * Test 8: Stale PDF cache — refreshed CI reflects current verified payment information.
     */
    public function test_08_stale_pdf_cache_invalidates_and_reflects_verified_payment(): void
    {
        $order = $this->createSyntheticOrder(['payment_status' => 'pending']);

        // First pass: generate while unpaid
        $doc1 = $this->ciService->generateForOrder($order);
        $fp1 = $this->artifactService->computeOrderFingerprint($order, 'COMMERCIAL_INVOICE', false);
        $artifact1 = $this->artifactService->getOrGenerateForOrder($order, 'COMMERCIAL_INVOICE', $doc1, false);

        $this->assertFalse($artifact1['is_hit']);
        $this->assertStringContainsString('Balance Due', $artifact1['content']);

        // Update order with confirmed full payment
        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'TXN-SETTLE-CACHE-01',
            'amount' => 4980.00,
            'currency' => 'USD',
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);
        $order->update(['payment_status' => 'paid']);
        $order->refresh();
        $order->load('payments');

        $doc2 = $this->ciService->generateForOrder($order);
        $fp2 = $this->artifactService->computeOrderFingerprint($order, 'COMMERCIAL_INVOICE', false);

        // Fingerprint must have changed due to payment status & transaction inclusion
        $this->assertNotEquals($fp1, $fp2);

        $artifact2 = $this->artifactService->getOrGenerateForOrder($order, 'COMMERCIAL_INVOICE', $doc2, false);
        $this->assertFalse($artifact2['is_hit']);
        $this->assertStringNotContainsString('Balance Due', $artifact2['content']);
        $this->assertStringContainsString('PAID', $artifact2['content']);
    }

    /**
     * Test 9: Buyer payment details — account name, originating bank name, and transaction ID display correctly.
     */
    public function test_09_buyer_payment_details_display_accurately_without_beneficiary_confusion(): void
    {
        $order = $this->createSyntheticOrder();

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->user_id,
            'transaction_id' => 'WIRE-REF-554433',
            'amount' => 4980.00,
            'currency' => 'USD',
            'status' => 'confirmed',
            'payment_method' => 'International Wire Transfer',
            'payer_name' => 'Acme Apparel Logistics AS',
            'bank_name' => 'Skandinaviska Enskilda Banken (SEB)',
            'account_number' => 'SEB-NO-99887766',
            'confirmed_at' => now(),
        ]);

        $order->load('payments');
        $payload = $this->ciService->generateForOrder($order);

        $this->assertEquals('Acme Apparel Logistics AS', $payload['buyer_payment']['payer_name']);
        $this->assertEquals('Skandinaviska Enskilda Banken (SEB)', $payload['buyer_payment']['payer_bank_name']);
        $this->assertEquals('WIRE-REF-554433', $payload['buyer_payment']['transaction_id']);

        $html = View::make('pdf.commercial-invoice', ['doc' => $payload])->render();

        // Originating buyer bank info
        $this->assertStringContainsString('Acme Apparel Logistics AS', $html);
        $this->assertStringContainsString('Skandinaviska Enskilda Banken (SEB)', $html);
        $this->assertStringContainsString('WIRE-REF-554433', $html);

        // Beneficiary bank wire info is separate and intact
        $this->assertStringContainsString('BENEFICIARY BANK WIRE INSTRUCTIONS:', $html);
        $this->assertStringContainsString('Pubali Bank Limited', $html);
        $this->assertStringContainsString('1788-901-044316', $html);
        $this->assertStringContainsString('PUBABDDH210', $html);
    }

    /**
     * Test 10: Access control — payment details are not exposed to unrelated customers.
     */
    public function test_10_access_control_protects_commercial_invoice_from_unrelated_customers(): void
    {
        $order = $this->createSyntheticOrder(['payment_status' => 'paid']);

        // Authenticated as owner -> permitted
        $responseOwner = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$order->id}/commercial-invoice");
        $this->assertContains($responseOwner->status(), [200, 302]);

        // Authenticated as unrelated customer -> forbidden (403)
        $responseUnrelated = $this->actingAs($this->unrelatedCustomer, 'sanctum')
            ->getJson("/api/v1/orders/{$order->id}/commercial-invoice");
        $responseUnrelated->assertStatus(403);
    }

    /**
     * Test 11: Numbered declaration remarks — the 3 statements are absent while product-table numbering remains.
     */
    public function test_11_numbered_declaration_remarks_are_absent(): void
    {
        $order = $this->createSyntheticOrder();

        $payload = $this->ciService->generateForOrder($order);
        $html = View::make('pdf.commercial-invoice', ['doc' => $payload])->render();

        // Must NOT contain the 3 numbered declaration remarks
        $this->assertStringNotContainsString('1. ISO 9001 & OEKO-TEX Standard 100 quality compliance.', $html);
        $this->assertStringNotContainsString('ISO 9001 & OEKO-TEX', $html);
        $this->assertStringNotContainsString('2. Export Loading:', $html);
        $this->assertStringNotContainsString('Chattogram Sea Port (CGP)', $html);
        $this->assertStringNotContainsString('3. Country of Origin: Bangladesh.', $html);

        // Product line-item numbering in the goods table MUST be preserved
        $this->assertStringContainsString('<th style="width: 5%;" class="text-center">#</th>', $html);
        $this->assertStringContainsString('<td class="text-center" style="color: #64748b;">1</td>', $html);
    }

    /**
     * Test 12: Visual parity — CI matches PI border spacing, header, typography, layout, and footer.
     */
    public function test_12_ci_matches_pi_visual_structure_and_design_system(): void
    {
        $order = $this->createSyntheticOrder();

        $ciDoc = $this->ciService->generateForOrder($order);
        $piDoc = $this->piService->generateForOrder($order);

        $ciHtml = View::make('pdf.commercial-invoice', ['doc' => $ciDoc])->render();
        $piHtml = View::make('pdf.proforma-invoice', ['doc' => $piDoc])->render();

        // 1. Both use exact same @page geometry
        $this->assertStringContainsString('margin: 14mm 14mm 16mm 14mm;', $ciHtml);
        $this->assertStringContainsString('margin: 14mm 14mm 16mm 14mm;', $piHtml);

        // 2. Both use header-banner with 15.5pt company title and right-side badge box
        $this->assertStringContainsString('class="header-banner"', $ciHtml);
        $this->assertStringContainsString('class="header-banner"', $piHtml);
        $this->assertStringContainsString('font-size: 15.5pt;', $ciHtml);
        $this->assertStringContainsString('font-size: 15.5pt;', $piHtml);
        $this->assertStringContainsString('background-color: #1e3a8a;', $ciHtml);
        $this->assertStringContainsString('background-color: #1e3a8a;', $piHtml);

        // 3. Both use two-column parties table with party-card
        $this->assertStringContainsString('class="parties-table"', $ciHtml);
        $this->assertStringContainsString('class="party-card"', $ciHtml);
        $this->assertStringContainsString('class="parties-table"', $piHtml);
        $this->assertStringContainsString('class="party-card"', $piHtml);

        // 4. Both use meta-strip with 2-row x 3-column layout
        $this->assertStringContainsString('class="meta-strip"', $ciHtml);
        $this->assertStringContainsString('class="meta-strip"', $piHtml);

        // 5. Both use goods-table with dark header (#1e293b)
        $this->assertStringContainsString('class="goods-table"', $ciHtml);
        $this->assertStringContainsString('background-color: #1e293b;', $ciHtml);
        $this->assertStringContainsString('class="goods-table"', $piHtml);
        $this->assertStringContainsString('background-color: #1e293b;', $piHtml);

        // 6. Both use single-block centered signatory
        $this->assertStringContainsString('class="sig-block"', $ciHtml);
        $this->assertStringContainsString('class="sig-block"', $piHtml);

        // 7. Both use canvas script with 39.68, 814.0 coordinates
        $this->assertStringContainsString('$pdf->text(39.68, 814.0,', $ciHtml);
        $this->assertStringContainsString('$pdf->text(39.68, 814.0,', $piHtml);

        // Titles remain distinct
        $this->assertStringContainsString('COMMERCIAL INVOICE', $ciHtml);
        $this->assertStringContainsString('PROFORMA INVOICE', $piHtml);
    }

    /**
     * Test 13: Financial integrity — CI preserves legitimate shipping, tax, discounts, and product calculations.
     */
    public function test_13_ci_preserves_legitimate_financial_calculations(): void
    {
        $order = $this->createSyntheticOrder([
            'subtotal' => 4500.00,
            'shipping_cost' => 300.00,
            'tax_amount' => 180.00,
            'discount_amount' => 150.00,
            'total_amount' => 4830.00, // 4500 + 300 + 180 - 150 = 4830
        ]);

        $payload = $this->ciService->generateForOrder($order);

        $this->assertEquals(4500.00, $payload['subtotal']);
        $this->assertEquals(300.00, $payload['shipping']);
        $this->assertEquals(180.00, $payload['tax']);
        $this->assertEquals(150.00, $payload['discount']);
        $this->assertEquals(4830.00, $payload['grandTotal']);

        $html = View::make('pdf.commercial-invoice', ['doc' => $payload])->render();

        $this->assertStringContainsString('$4,500.00', $html);
        $this->assertStringContainsString('Shipping &amp; Freight:', $html);
        $this->assertStringContainsString('$300.00', $html);
        $this->assertStringContainsString('Tax / Surcharge:', $html);
        $this->assertStringContainsString('$180.00', $html);
        $this->assertStringContainsString('-$150.00', $html);
        $this->assertStringContainsString('TOTAL PAYABLE:', $html);
        $this->assertStringContainsString('$4,830.00 USD', $html);
    }
}
