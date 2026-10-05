<?php

namespace Tests\Feature\Admin;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Quote;
use App\Models\Role;
use App\Models\User;
use App\Services\Documents\CommercialInvoiceService;
use App\Services\Documents\DocumentPdfService;
use App\Services\Documents\InvoiceService;
use App\Services\Documents\ProformaInvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPosPhase3DocumentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected User $otherCustomer;
    protected Product $product;
    protected Order $posOrderPaid;
    protected Order $posOrderPartial;
    protected Order $storeOrder;
    protected Quotation $quotation;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure Document permissions exist in DB
        $docView = Permission::firstOrCreate(
            ['slug' => 'document.view'],
            ['name' => 'View Documents', 'module' => 'Documents', 'action' => 'view']
        );
        $docDownload = Permission::firstOrCreate(
            ['slug' => 'document.download'],
            ['name' => 'Download Document', 'module' => 'Documents', 'action' => 'download']
        );
        $docInvoice = Permission::firstOrCreate(
            ['slug' => 'document.invoice.generate'],
            ['name' => 'Generate Sales Invoice', 'module' => 'Documents', 'action' => 'invoice.generate']
        );
        $docProforma = Permission::firstOrCreate(
            ['slug' => 'document.proforma.generate'],
            ['name' => 'Generate Proforma Invoice', 'module' => 'Documents', 'action' => 'proforma.generate']
        );
        $docCi = Permission::firstOrCreate(
            ['slug' => 'document.commercial_invoice.generate'],
            ['name' => 'Generate Commercial Invoice', 'module' => 'Documents', 'action' => 'commercial_invoice.generate']
        );

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaanclothing.com',
            'name' => 'POS Cashier Admin',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'retailer@buyer.com',
            'name' => 'Retail Buyer Inc',
            'role' => 'customer',
        ]);

        $this->otherCustomer = User::factory()->create([
            'email' => 'other@retailer.com',
            'name' => 'Other Customer Corp',
            'role' => 'customer',
        ]);

        $this->product = Product::create([
            'name' => 'Premium Combed Cotton Crewneck T-Shirt',
            'slug' => 'premium-combed-cotton-crewneck-t-shirt',
            'sku' => 'AYN-TSHIRT-001',
            'brand' => 'Ayaan Basics',
            'audience' => 'MEN',
            'wholesale_price' => 5.50,
            'price' => 5.50,
            'bulk_price' => 5.00,
            'bulk_threshold' => 100,
            'moq' => 20,
            'stock' => 1000,
            'status' => 'published',
        ]);

        // 1. Fully Paid POS Order with coupon and manual discount
        $this->posOrderPaid = Order::create([
            'order_number' => 'AYN-POS-20261005-FULL01',
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'shipping_name' => $this->customer->name,
            'shipping_address1' => 'Plot 42, Export Processing Zone, Dhaka',
            'shipping_city' => 'Dhaka',
            'shipping_postal_code' => '1230',
            'shipping_country_code' => 'BD',
            'status' => 'completed',
            'payment_status' => 'paid',
            'payment_method' => 'cash',
            'payment_reference' => 'CASH-REC-99881',
            'currency' => 'USD',
            'subtotal' => 550.00,
            'shipping_cost' => 0.00,
            'tax_amount' => 0.00,
            'discount_amount' => 55.00,
            'coupon_code' => 'SUMMER10',
            'coupon_discount_amount' => 25.00,
            'manual_discount_amount' => 30.00,
            'manual_discount_type' => 'fixed',
            'manual_discount_value' => 30.00,
            'manual_discount_reason' => 'VIP Counter Client Discount',
            'total_amount' => 495.00,
            'paid_amount' => 495.00,
            'balance_due' => 0.00,
            'order_source' => 'pos',
            'operator_admin_id' => $this->admin->id,
        ]);

        OrderItem::create([
            'order_id' => $this->posOrderPaid->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 100,
            'unit_price' => 5.50,
            'line_total' => 550.00,
            'size' => 'L',
            'color' => 'Navy',
        ]);

        Payment::create([
            'order_id' => $this->posOrderPaid->id,
            'user_id' => $this->customer->id,
            'amount' => 495.00,
            'currency' => 'USD',
            'payment_method' => 'cash',
            'transaction_id' => 'CASH-REC-99881',
            'status' => 'succeeded',
        ]);

        // 2. Partially Paid POS Order
        $this->posOrderPartial = Order::create([
            'order_number' => 'AYN-POS-20261005-PART02',
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'shipping_name' => $this->customer->name,
            'shipping_address1' => 'Plot 42, Export Processing Zone, Dhaka',
            'shipping_city' => 'Dhaka',
            'shipping_postal_code' => '1230',
            'shipping_country_code' => 'BD',
            'status' => 'processing',
            'payment_status' => 'partially_paid',
            'payment_method' => 'pos_card',
            'payment_reference' => 'POS-TRX-PART-1234',
            'currency' => 'USD',
            'subtotal' => 1000.00,
            'shipping_cost' => 0.00,
            'tax_amount' => 0.00,
            'discount_amount' => 100.00,
            'manual_discount_amount' => 100.00,
            'manual_discount_type' => 'fixed',
            'manual_discount_value' => 100.00,
            'manual_discount_reason' => 'Store Promotion Override',
            'total_amount' => 900.00,
            'paid_amount' => 500.00,
            'balance_due' => 400.00,
            'order_source' => 'pos',
            'operator_admin_id' => $this->admin->id,
        ]);

        OrderItem::create([
            'order_id' => $this->posOrderPartial->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 200,
            'unit_price' => 5.00,
            'line_total' => 1000.00,
            'size' => 'M',
            'color' => 'White',
        ]);

        Payment::create([
            'order_id' => $this->posOrderPartial->id,
            'user_id' => $this->customer->id,
            'amount' => 500.00,
            'currency' => 'USD',
            'payment_method' => 'card',
            'transaction_id' => 'POS-TRX-PART-1234',
            'status' => 'succeeded',
        ]);

        // 3. Standard Online Storefront Order (Pending Payment)
        $this->storeOrder = Order::create([
            'order_number' => 'AYN-20261005-STORE01',
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'shipping_name' => 'Fashion Retailer Online',
            'shipping_address1' => '123 Broadway St, Suite 400',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'bank_transfer',
            'currency' => 'USD',
            'subtotal' => 2500.00,
            'shipping_cost' => 350.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'total_amount' => 2850.00,
            'paid_amount' => 0.00,
            'balance_due' => 2850.00,
            'order_source' => 'storefront',
        ]);

        OrderItem::create([
            'order_id' => $this->storeOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 500,
            'unit_price' => 5.00,
            'line_total' => 2500.00,
        ]);

        // 4. Commercial Quotation
        $quote = Quote::create([
            'rfq_number' => 'RFQ-20261005-001',
            'user_id' => $this->customer->id,
            'status' => 'reviewed',
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'full_name' => $this->customer->name,
            'email' => $this->customer->email,
            'company_name' => 'Retail Buyer Inc',
            'shipping_country' => 'US',
            'shipping_city' => 'New York',
        ]);

        $this->quotation = Quotation::create([
            'quotation_number' => 'QT-20261005-000888',
            'quote_id' => $quote->id,
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Retail Buyer Inc',
            'destination_country' => 'United States',
            'destination_city' => 'New York',
            'status' => 'ready',
            'payment_status' => 'pending',
            'payment_terms' => '30% T/T Advance, 70% Before Bill of Lading',
            'currency' => 'USD',
            'subtotal' => 4500.00,
            'shipping_fee' => 500.00,
            'tax_amount' => 0.00,
            'discount_total' => 200.00,
            'grand_total' => 4800.00,
        ]);

        QuotationItem::create([
            'quotation_id' => $this->quotation->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 900,
            'unit_price' => 5.00,
            'line_total' => 4500.00,
            'selected_size' => 'M',
            'selected_color' => 'Black',
        ]);
    }

    /**
     * Test 01: POS order generates Sales Invoice document via OrderController.
     */
    public function test_01_pos_order_generates_sales_invoice_document(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/orders/{$this->posOrderPaid->id}/documents/INVOICE");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'INVOICE')
            ->assertJsonPath('data.title', 'SALES INVOICE')
            ->assertJsonPath('data.doc_number', $this->posOrderPaid->invoice_number);

        $doc = $response->json('data');
        $this->assertEquals(550.00, $doc['financials']['subtotal']);
        $this->assertEquals(25.00, $doc['financials']['coupon_discount_amount']);
        $this->assertEquals(30.00, $doc['financials']['manual_discount_amount']);
        $this->assertEquals(55.00, $doc['financials']['discount_amount']);
        $this->assertEquals(495.00, $doc['financials']['grand_total']);
        $this->assertEquals(495.00, $doc['financials']['paid_amount']);
        $this->assertEquals(0.00, $doc['financials']['balance_due']);
        $this->assertEquals('PAID', $doc['payment_details']['payment_status']);
    }

    /**
     * Test 02: POS order generates Proforma Invoice (PI) document.
     */
    public function test_02_pos_order_generates_proforma_invoice_document(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/orders/{$this->posOrderPaid->id}/documents/PROFORMA_INVOICE");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'PROFORMA_INVOICE')
            ->assertJsonPath('data.title', 'PROFORMA INVOICE')
            ->assertJsonPath('data.doc_number', $this->posOrderPaid->proforma_invoice_number);
    }

    /**
     * Test 03: POS order generates Commercial Invoice (CI) when fully paid.
     */
    public function test_03_pos_order_generates_commercial_invoice_document(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/orders/{$this->posOrderPaid->id}/documents/COMMERCIAL_INVOICE");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'COMMERCIAL_INVOICE')
            ->assertJsonPath('data.title', 'COMMERCIAL INVOICE');
    }

    /**
     * Test 04: Partial payment POS order displays correct balance due on Invoice.
     */
    public function test_04_partial_payment_pos_order_displays_correct_balance_due(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/orders/{$this->posOrderPartial->id}/documents/INVOICE");

        $response->assertOk();
        $this->assertEquals(1000.00, $response->json('data.financials.subtotal'));
        $this->assertEquals(100.00, $response->json('data.financials.manual_discount_amount'));
        $this->assertEquals(900.00, $response->json('data.financials.grand_total'));
        $this->assertEquals(500.00, $response->json('data.financials.paid_amount'));
        $this->assertEquals(400.00, $response->json('data.financials.balance_due'));
    }

    /**
     * Test 05: Document numbering is deterministic, consistent, and unique.
     */
    public function test_05_document_numbering_deterministic_and_unique(): void
    {
        $year = date('Y');
        $invSuffixPaid = substr($this->posOrderPaid->order_number, -6);
        $invSuffixPartial = substr($this->posOrderPartial->order_number, -6);

        $this->assertEquals("INV-{$year}-{$invSuffixPaid}", $this->posOrderPaid->invoice_number);
        $this->assertEquals("PI-{$year}-{$invSuffixPaid}", $this->posOrderPaid->proforma_invoice_number);
        $this->assertEquals("INV-{$year}-{$invSuffixPartial}", $this->posOrderPartial->invoice_number);

        $this->assertNotEquals($this->posOrderPaid->invoice_number, $this->posOrderPartial->invoice_number);
    }

    /**
     * Test 06: Direct PDF streaming binary endpoint with format=pdf query parameter.
     */
    public function test_06_direct_pdf_streaming_with_format_pdf_query(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->get("/api/v1/orders/{$this->posOrderPaid->id}/documents/INVOICE?format=pdf");

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-1.4', $response->getContent());
    }

    /**
     * Test 07: Dedicated /pdf endpoint produces downloadable PDF stream.
     */
    public function test_07_dedicated_pdf_endpoint_produces_downloadable_pdf_stream(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->get("/api/v1/orders/{$this->posOrderPaid->id}/documents/INVOICE/pdf");

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment', $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF-1.4', $response->getContent());
    }

    /**
     * Test 08: Customer owner can access their own POS order invoice.
     */
    public function test_08_customer_owner_can_access_their_own_order_invoice(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$this->posOrderPaid->id}/documents/INVOICE");

        $response->assertOk()
            ->assertJsonPath('data.order_number', $this->posOrderPaid->order_number);
    }

    /**
     * Test 09: Sensitive manual discount reasons and internal operator notes are masked for customers.
     */
    public function test_09_internal_admin_discount_reason_masked_for_customer(): void
    {
        // Admin sees the audit reason
        $adminRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/orders/{$this->posOrderPaid->id}/documents/INVOICE");
        $adminRes->assertOk();
        $this->assertEquals('VIP Counter Client Discount', $adminRes->json('data.financials.manual_discount_reason'));

        // Customer DOES NOT see the internal audit reason
        $custRes = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$this->posOrderPaid->id}/documents/INVOICE");
        $custRes->assertOk();
        $this->assertNull($custRes->json('data.financials.manual_discount_reason'));
    }

    /**
     * Test 10: Unauthorized customer cannot access another customer's order documents (403 Forbidden).
     */
    public function test_10_unauthorized_customer_cannot_access_other_customer_documents(): void
    {
        $response = $this->actingAs($this->otherCustomer, 'sanctum')
            ->getJson("/api/v1/orders/{$this->posOrderPaid->id}/documents/INVOICE");

        $response->assertStatus(403);
    }

    /**
     * Test 11: Unauthenticated request to documents returns 401 Unauthorized.
     */
    public function test_11_unauthenticated_request_to_documents_returns_401(): void
    {
        $response = $this->getJson("/api/v1/orders/{$this->posOrderPaid->id}/documents/INVOICE");
        $response->assertStatus(401);
    }

    /**
     * Test 12: Customer cannot access Commercial Invoice (CI) until order is paid (Payment Gating).
     */
    public function test_12_customer_payment_gating_on_commercial_invoice(): void
    {
        // Unpaid storefront order
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$this->storeOrder->id}/documents/COMMERCIAL_INVOICE");

        $response->assertStatus(403)
            ->assertJsonPath('is_gated', true);
    }

    /**
     * Test 13: Customer CAN access Proforma Invoice (PI) and Sales Invoice for unpaid orders.
     */
    public function test_13_customer_can_access_pi_and_invoice_for_unpaid_order(): void
    {
        // PI is never gated
        $piRes = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$this->storeOrder->id}/documents/PROFORMA_INVOICE");
        $piRes->assertOk();

        // Invoice is never gated
        $invRes = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$this->storeOrder->id}/documents/INVOICE");
        $invRes->assertOk();
    }

    /**
     * Test 14: Non-existent order returns 404 Not Found.
     */
    public function test_14_non_existent_order_returns_404(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/orders/999999/documents/INVOICE");

        $response->assertStatus(404);
    }

    /**
     * Test 15: Quotation documents endpoint supports INVOICE via InvoiceService.
     */
    public function test_15_quotation_documents_endpoint_supports_invoice(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/quotations/{$this->quotation->id}/documents/INVOICE");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'INVOICE')
            ->assertJsonPath('data.title', 'SALES INVOICE');
    }

    /**
     * Test 16: Quotation documents endpoint supports direct PDF streaming.
     */
    public function test_16_quotation_documents_endpoint_supports_direct_pdf_streaming(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->get("/api/v1/quotations/{$this->quotation->id}/documents/PROFORMA_INVOICE?format=pdf");

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-1.4', $response->getContent());
    }

    /**
     * Test 17: Existing storefront orders maintain regression compatibility.
     */
    public function test_17_existing_storefront_orders_regression_compatibility(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/orders/{$this->storeOrder->id}/documents/ORDER_SHEET");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doc_type', 'ORDER_SHEET');
    }

    /**
     * Test 18: Document services generate valid PDF objects directly.
     */
    public function test_18_document_pdf_service_renders_valid_pdf_stream(): void
    {
        $invoiceService = app(InvoiceService::class);
        $payload = $invoiceService->generateForOrder($this->posOrderPaid, true);

        $pdfService = app(DocumentPdfService::class);
        $binary = $pdfService->render($payload)->output();

        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-1.4', $binary);
        $this->assertStringEndsWith("%%EOF\n", $binary);
    }
}
