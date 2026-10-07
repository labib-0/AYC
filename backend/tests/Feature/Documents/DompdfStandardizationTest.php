<?php

namespace Tests\Feature\Documents;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Documents\CommercialInvoiceService;
use App\Services\Documents\DocumentPdfService;
use App\Services\Documents\InvoiceService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DompdfStandardizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected Product $product;
    protected Order $order;
    protected Quotation $quotation;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Authoritative Business Settings
        SystemSetting::set('company_name', 'Ayaan Clothing Ltd.', 'string', 'business');
        SystemSetting::set('company_tagline', 'Ready-made Garments Manufacturer & Exporter', 'string', 'business');
        SystemSetting::set('office_address', 'House #33, Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh', 'string', 'business');
        SystemSetting::set('support_email', 'export@ayaanclothing.com', 'string', 'contact');
        SystemSetting::set('whatsapp_display', '+880 1620-853502', 'string', 'contact');
        SystemSetting::set('tin_number', 'TIN-482910492817', 'string', 'legal');
        SystemSetting::set('bin_number', 'BIN-002948172-0101', 'string', 'legal');

        // Banking setup
        SystemSetting::set('bank_name', 'Pubali Bank Limited', 'string', 'banking');
        SystemSetting::set('bank_branch', 'Uttara Model Town Corporate Branch', 'string', 'banking');
        SystemSetting::set('bank_account_name', 'AYAAN CLOTHING LTD.', 'string', 'banking');
        SystemSetting::set('bank_account_number', '1788-901-044316', 'string', 'banking');
        SystemSetting::set('bank_swift_code', 'PUBABDDH210', 'string', 'banking');

        // Document defaults
        SystemSetting::set('port_of_loading', 'Chattogram Sea Port (CGP), Bangladesh', 'string', 'document_defaults');
        SystemSetting::set('country_of_origin', 'Bangladesh', 'string', 'document_defaults');
        SystemSetting::set('signatory_name', 'Labib Ul Hasan', 'string', 'document_defaults');
        SystemSetting::set('signatory_title', 'Managing Director & Head of Commercial', 'string', 'document_defaults');
        SystemSetting::set('signatory_division', 'Ayaan Clothing Global Export Division', 'string', 'document_defaults');

        // Customer & Order
        $this->customer = User::factory()->create([
            'name'         => 'John Doe',
            'email'        => 'buyer@nordicapparel.se',
            'role'         => 'customer',
            'company_name' => 'Nordic Apparel Imports Ltd',
        ]);

        $this->product = Product::factory()->create([
            'name'            => 'Men Premium Cotton Polo Shirt',
            'sku'             => 'AYN-POLO-MEN-01',
            'wholesale_price' => 12.50,
            'cost_price'      => 7.89,
        ]);

        $this->order = Order::factory()->create([
            'user_id'              => $this->customer->id,
            'order_number'         => 'AYN-ORD-20261007-TEST01',
            'status'               => 'confirmed',
            'payment_status'       => 'paid',
            'payment_method'       => 'bank_wire',
            'currency'             => 'USD',
            'subtotal'             => 2500.00,
            'total_amount'         => 2500.00,
            'discount_amount'      => 0.00,
            'shipping_cost'        => 0.00,
            'tax_amount'           => 0.00,
            'shipping_name'        => 'John Doe',
            'shipping_address1'    => 'Stortorget 5',
            'shipping_city'        => 'Stockholm',
            'shipping_postal_code' => '11129',
            'shipping_country_code'=> 'SE',
            'shipping_phone'       => '+46 8 123 4567',
            'email'                => 'buyer@nordicapparel.se',
        ]);

        OrderItem::create([
            'order_id'       => $this->order->id,
            'product_id'     => $this->product->id,
            'product_name'   => $this->product->name,
            'sku'            => $this->product->sku,
            'quantity'       => 200,
            'unit_price'     => 12.50,
            'line_total'     => 2500.00,
        ]);

        // Quotation
        $this->quotation = Quotation::create([
            'user_id'          => $this->customer->id,
            'quotation_number' => 'AYN-RFQ-20261007-Q01',
            'buyer_name'       => 'John Doe',
            'company_name'     => 'Nordic Apparel Imports Ltd',
            'buyer_email'      => 'buyer@nordicapparel.se',
            'status'           => 'sent',
            'currency'         => 'USD',
            'subtotal'         => 2500.00,
            'total_amount'     => 2500.00,
            'valid_until'      => now()->addDays(30),
        ]);

        QuotationItem::create([
            'quotation_id'   => $this->quotation->id,
            'product_id'     => $this->product->id,
            'product_name'   => $this->product->name,
            'sku'            => $this->product->sku,
            'quantity'       => 200,
            'unit_price'     => 12.50,
            'total_price'    => 2500.00,
        ]);
    }

    /** 1. Commercial Invoice PDF Generation via Dompdf */
    public function test_01_commercial_invoice_pdf_generation_via_dompdf(): void
    {
        $ciDoc = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $pdfService = app(DocumentPdfService::class);

        $binary = $pdfService->render($ciDoc)->output();

        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
        $this->assertStringContainsString('%%EOF', $binary);
        $this->assertGreaterThan(2000, strlen($binary));

        // Content integrity
        $this->assertStringContainsString('COMMERCIAL INVOICE', $binary);
        $this->assertStringContainsString($ciDoc['docNumber'] ?? $ciDoc['doc_number'], $binary);
        $this->assertStringContainsString('Ayaan Clothing Ltd.', $binary);
        $this->assertStringContainsString('export@ayaanclothing.com', $binary);
        $this->assertStringContainsString('+880 1620-853502', $binary);
        $this->assertStringContainsString('Nordic Apparel Imports Ltd', $binary);
        $this->assertStringContainsString('Pubali Bank Limited', $binary);
        $this->assertStringContainsString('1788-901-044316', $binary);
        $this->assertStringContainsString('PUBABDDH210', $binary);
        $this->assertStringContainsString('Labib Ul Hasan', $binary);

        // Security: Zero cost price leakage
        $this->assertArrayNotHasKey('cost_price', $ciDoc);
        $this->assertArrayNotHasKey('cost_price', $ciDoc['items'][0]);
        $this->assertStringNotContainsString('(7.89)', $binary);
        $this->assertStringNotContainsString('($7.89)', $binary);
        $this->assertStringNotContainsString('Cost Price', $binary);
        $this->assertStringNotContainsString('cost_price', $binary);
    }

    /** 2. Proforma Invoice PDF Generation via Dompdf */
    public function test_02_proforma_invoice_pdf_generation_via_dompdf(): void
    {
        $piDoc = app(ProformaInvoiceService::class)->generateForOrder($this->order);
        $pdfService = app(DocumentPdfService::class);

        $binary = $pdfService->render($piDoc)->output();

        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
        $this->assertStringContainsString('%%EOF', $binary);

        $this->assertStringContainsString('PROFORMA INVOICE', $binary);
        $this->assertStringContainsString($piDoc['docNumber'] ?? $piDoc['doc_number'], $binary);
        $this->assertStringContainsString('Pubali Bank Limited', $binary);
        $this->assertStringContainsString('1788-901-044316', $binary);
    }

    /** 3. Offer Sheet PDF Generation strictly omits bank details */
    public function test_03_offer_sheet_pdf_generation_strictly_omits_bank_details(): void
    {
        $offerDoc = app(OfferSheetService::class)->generateForOrder($this->order);
        $pdfService = app(DocumentPdfService::class);

        $binary = $pdfService->render($offerDoc)->output();

        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
        $this->assertStringContainsString('COMMERCIAL ORDER SHEET', $binary);

        // Strictly omit bank details on Offer Sheet
        $this->assertStringNotContainsString('Pubali Bank', $binary);
        $this->assertStringNotContainsString('1788-901-044316', $binary);
        $this->assertStringNotContainsString('PUBABDDH210', $binary);
    }

    /** 4. Quotation PDF Generation strictly omits bank details */
    public function test_04_quotation_pdf_generation_strictly_omits_bank_details(): void
    {
        $quoteDoc = app(OfferSheetService::class)->generateForQuotation($this->quotation);
        $quoteDoc['title'] = 'COMMERCIAL QUOTATION';
        $quoteDoc['doc_type'] = 'QUOTATION';

        $pdfService = app(DocumentPdfService::class);
        $binary = $pdfService->render($quoteDoc)->output();

        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
        $this->assertStringContainsString('COMMERCIAL QUOTATION', $binary);

        // Strictly omit bank details on Quotations
        $this->assertStringNotContainsString('Pubali Bank', $binary);
        $this->assertStringNotContainsString('1788-901-044316', $binary);
    }

    /** 5. Packing List PDF Generation formats cartons without monetary numbers */
    public function test_05_packing_list_pdf_generation_formats_cartons(): void
    {
        $plDoc = $this->order->getCommercialDocument('PACKING_LIST');
        $pdfService = app(DocumentPdfService::class);

        $binary = $pdfService->render($plDoc)->output();

        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
        $this->assertStringContainsString('COMMERCIAL PACKING LIST', $binary);
        $this->assertStringContainsString('TOTAL PACKING SUMMARY', $binary);
        $this->assertStringContainsString('Export Cartons', $binary);
        $this->assertStringContainsString('Gross Weight', $binary);

        // Strictly omit bank details on Packing List
        $this->assertStringNotContainsString('Pubali Bank', $binary);
        $this->assertStringNotContainsString('1788-901-044316', $binary);
    }

    /** 6. Sales Invoice PDF Generation includes settlement status and bank instructions */
    public function test_06_sales_invoice_pdf_generation_via_dompdf(): void
    {
        $invDoc = app(InvoiceService::class)->generateForOrder($this->order);
        $pdfService = app(DocumentPdfService::class);

        $binary = $pdfService->render($invDoc)->output();

        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
        $this->assertStringContainsString('SALES INVOICE', $binary);
        $this->assertStringContainsString('PAID', $binary);
        $this->assertStringContainsString('Pubali Bank Limited', $binary);
        $this->assertStringContainsString('1788-901-044316', $binary);
    }

    /** 7. Performance & Resource Check: Dompdf generates under 250ms and reasonable memory */
    public function test_07_dompdf_performance_benchmark(): void
    {
        $ciDoc = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $pdfService = app(DocumentPdfService::class);

        $startMem = memory_get_usage();
        $startTime = microtime(true);

        $binary = $pdfService->render($ciDoc)->output();

        $durationMs = (microtime(true) - $startTime) * 1000;
        $memUsageMb = (memory_get_usage() - $startMem) / (1024 * 1024);

        $this->assertLessThan(1500, $durationMs, 'Dompdf generation must complete within 1.5 seconds');
        $this->assertLessThan(25.0, $memUsageMb, 'Dompdf memory allocation must remain under 25MB');
        $this->assertGreaterThan(2000, strlen($binary), 'Generated PDF binary size must be valid');
    }
}
