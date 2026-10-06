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
use App\Services\Documents\DocumentHelper;
use App\Services\Documents\DocumentPdfService;
use App\Services\Documents\InvoiceService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use App\Services\Settings\WhatsAppNormalizationService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DocumentSettingsConnectionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private Order $order;
    private Quotation $quotation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacPermissionCatalogSeeder::class);

        $this->admin = User::factory()->create([
            'name' => 'Super Administrator',
            'email' => 'admin@ayaanclothing.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Nordic Buyer',
            'email' => 'buyer@nordicapparel.se',
            'role' => 'customer',
            'company_name' => 'Nordic Retail Group AB',
            'is_super_admin' => false,
        ]);

        $product = Product::factory()->create([
            'name' => 'Premium Heavyweight Cotton T-Shirt',
            'sku' => 'AYN-TSHIRT-001',
        ]);

        $this->order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-2026-998877',
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_method' => 'bank_transfer',
            'currency' => 'USD',
            'subtotal' => 2500.00,
            'shipping_cost' => 150.00,
            'tax_amount' => 0.00,
            'discount_amount' => 50.00,
            'total_amount' => 2600.00,
            'shipping_name' => 'Lars Svensson',
            'shipping_address1' => 'Storgatan 45',
            'shipping_city' => 'Stockholm',
            'shipping_postal_code' => '11455',
            'shipping_country_code' => 'SE',
            'shipping_phone' => '+46 8 123 4567',
            'email' => 'buyer@nordicapparel.se',
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $product->id,
            'product_name' => 'Premium Heavyweight Cotton T-Shirt',
            'sku' => 'AYN-TSHIRT-001',
            'quantity' => 250,
            'unit_price' => 10.00,
            'line_total' => 2500.00,
        ]);

        $this->quotation = Quotation::create([
            'quotation_number' => 'QT-2026-554433',
            'buyer_name' => 'Lars Svensson',
            'company_name' => 'Nordic Retail Group AB',
            'buyer_email' => 'buyer@nordicapparel.se',
            'buyer_phone' => '+46 8 123 4567',
            'destination_city' => 'Stockholm',
            'destination_country' => 'Sweden',
            'subtotal' => 3000.00,
            'shipping_fee' => 200.00,
            'tax_amount' => 0.00,
            'discount_total' => 100.00,
            'grand_total' => 3100.00,
            'currency' => 'USD',
            'status' => 'active',
            'payment_status' => 'pending',
            'payment_terms' => '100% T/T Advance',
            'shipping_terms' => 'FOB Dhaka (Export)',
            'incoterm' => 'FOB',
        ]);

        QuotationItem::create([
            'quotation_id' => $this->quotation->id,
            'product_id' => $product->id,
            'product_name' => 'Premium Heavyweight Cotton T-Shirt',
            'sku' => 'AYN-TSHIRT-001',
            'quantity' => 300,
            'unit_price' => 10.00,
            'line_total' => 3000.00,
        ]);

        Cache::flush();
    }

    /**
     * TEST 1: Change Company Name -> Generate CI -> CI reflects new company name.
     */
    public function test_1_change_company_name_reflects_in_commercial_invoice(): void
    {
        SystemSetting::set('company_name', 'Ayaan Global Apparel Ltd.', 'string', 'business');

        $ciService = app(CommercialInvoiceService::class);
        $ciDoc = $ciService->generateForOrder($this->order);

        $this->assertEquals('Ayaan Global Apparel Ltd.', $ciDoc['exporter']['company_name']);
        $this->assertEquals('Ayaan Global Apparel Ltd.', $ciDoc['exporter']['name']);

        // Verify PDF binary rendering contains the new company name
        $pdfService = app(DocumentPdfService::class);
        $pdfBinary = $pdfService->render($ciDoc)->output();
        $this->assertStringContainsString('AYAAN GLOBAL APPAREL LTD.', $pdfBinary);
    }

    /**
     * TEST 2: Change Company Name -> Generate PI -> PI reflects new company name.
     */
    public function test_2_change_company_name_reflects_in_proforma_invoice(): void
    {
        SystemSetting::set('company_name', 'Ayaan Worldwide Export Corporation', 'string', 'business');

        $piService = app(ProformaInvoiceService::class);
        $piDoc = $piService->generateForOrder($this->order);

        $this->assertEquals('Ayaan Worldwide Export Corporation', $piDoc['exporter']['company_name']);

        $pdfService = app(DocumentPdfService::class);
        $pdfBinary = $pdfService->render($piDoc)->output();
        $this->assertStringContainsString('AYAAN WORLDWIDE EXPORT CORPORATION', $pdfBinary);
    }

    /**
     * TEST 3: Change Company Name -> Generate Offer Sheet -> Offer Sheet reflects new company name.
     */
    public function test_3_change_company_name_reflects_in_offer_sheet(): void
    {
        SystemSetting::set('company_name', 'Ayaan Textile Holdings Ltd.', 'string', 'business');

        $offerService = app(OfferSheetService::class);
        $offerDoc = $offerService->generateForOrder($this->order);

        $this->assertEquals('Ayaan Textile Holdings Ltd.', $offerDoc['exporter']['company_name']);

        $pdfService = app(DocumentPdfService::class);
        $pdfBinary = $pdfService->render($offerDoc)->output();
        $this->assertStringContainsString('AYAAN TEXTILE HOLDINGS LTD.', $pdfBinary);
    }

    /**
     * TEST 4: Change Company Name -> Generate Invoice -> Invoice reflects new company name.
     */
    public function test_4_change_company_name_reflects_in_invoice(): void
    {
        SystemSetting::set('company_name', 'Ayaan Garments International', 'string', 'business');

        $invService = app(InvoiceService::class);
        $invDoc = $invService->generateForOrder($this->order, true);

        $this->assertEquals('Ayaan Garments International', $invDoc['exporter']['company_name']);

        $pdfBinary = $invService->generatePdfForOrder($this->order, true);
        $this->assertStringContainsString('AYAAN GARMENTS INTERNATIONAL', $pdfBinary);
    }

    /**
     * TEST 5: Change Phone/Email -> Generate all applicable documents -> Expected new values.
     */
    public function test_5_change_phone_and_email_reflects_across_all_documents(): void
    {
        SystemSetting::set('business_phone', '+880 1711-998877', 'string', 'contact');
        SystemSetting::set('business_email', 'commercial.desk@ayaanclothing.com', 'string', 'contact');
        SystemSetting::set('whatsapp_display', '+880 1711-998877', 'string', 'contact');

        $ciDoc = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $piDoc = app(ProformaInvoiceService::class)->generateForOrder($this->order);
        $offerDoc = app(OfferSheetService::class)->generateForOrder($this->order);
        $invDoc = app(InvoiceService::class)->generateForOrder($this->order);

        foreach ([$ciDoc, $piDoc, $offerDoc, $invDoc] as $doc) {
            $this->assertEquals('commercial.desk@ayaanclothing.com', $doc['exporter']['email']);
            $this->assertEquals('+880 1711-998877', $doc['exporter']['phone']);
            $this->assertEquals('+880 1711-998877', $doc['exporter']['whatsapp']);
        }

        // PDF binary checks
        $pdfBinary = app(DocumentPdfService::class)->render($ciDoc)->output();
        $this->assertStringContainsString('commercial.desk@ayaanclothing.com', $pdfBinary);
        $this->assertStringContainsString('+880 1711-998877', $pdfBinary);
    }

    /**
     * TEST 6: Change WhatsApp -> Generate document containing WhatsApp -> Expected new WhatsApp number.
     */
    public function test_6_change_whatsapp_reflects_in_document_and_pdf(): void
    {
        SystemSetting::set('whatsapp_display', '+880 1982-183886', 'string', 'contact');
        SystemSetting::set('whatsapp_number', '8801982183886', 'string', 'contact');

        $exporter = DocumentHelper::getExporterProfile();
        $this->assertEquals('+880 1982-183886', $exporter['whatsapp_display']);
        $this->assertEquals('8801982183886', $exporter['whatsapp_number']);
        $this->assertEquals('https://wa.me/8801982183886', $exporter['whatsapp_url']);

        $ciDoc = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $this->assertEquals('+880 1982-183886', $ciDoc['exporter']['whatsapp_display']);

        $pdfBinary = app(DocumentPdfService::class)->render($ciDoc)->output();
        $this->assertStringContainsString('+880 1982-183886', $pdfBinary);
    }

    /**
     * TEST 7: Default WhatsApp is +880 1620-853502 -> Canonical 8801620853502 -> URL https://wa.me/8801620853502.
     */
    public function test_7_default_whatsapp_resolves_canonical_values(): void
    {
        $display = WhatsAppNormalizationService::CANONICAL_DISPLAY;
        $number = WhatsAppNormalizationService::CANONICAL_NUMBER;
        $url = WhatsAppNormalizationService::CANONICAL_URL;

        $this->assertEquals('+880 1620-853502', $display);
        $this->assertEquals('8801620853502', $number);
        $this->assertEquals('https://wa.me/8801620853502', $url);

        $response = $this->getJson('/api/v1/settings/public');
        $response->assertStatus(200)
            ->assertJsonPath('data.whatsapp.display', '+880 1620-853502')
            ->assertJsonPath('data.whatsapp.number', '8801620853502')
            ->assertJsonPath('data.whatsapp.url', 'https://wa.me/8801620853502');
    }

    /**
     * TEST 8: Admin changes +880 1620-853502 to +880 1982-183886 -> Expected all links resolve to https://wa.me/8801982183886.
     * NO DEPLOYMENT should be required.
     */
    public function test_8_admin_change_whatsapp_immediately_updates_public_api_and_documents(): void
    {
        // Admin updates via centralized API endpoint
        $payload = [
            'site_title' => 'AYAAN CLOTHING LTD.',
            'whatsapp_display' => '+880 1982-183886',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.whatsapp_display', '+880 1982-183886')
            ->assertJsonPath('data.whatsapp_number', '8801982183886')
            ->assertJsonPath('data.whatsapp_url', 'https://wa.me/8801982183886');

        // Verify public storefront API immediately reflects the change without cache delay
        $publicResponse = $this->getJson('/api/v1/settings/public');
        $publicResponse->assertStatus(200)
            ->assertJsonPath('data.whatsapp.display', '+880 1982-183886')
            ->assertJsonPath('data.whatsapp.number', '8801982183886')
            ->assertJsonPath('data.whatsapp.url', 'https://wa.me/8801982183886');

        // Verify documents generated afterward use the updated number
        $ciDoc = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $this->assertEquals('+880 1982-183886', $ciDoc['exporter']['whatsapp_display']);
        $this->assertEquals('8801982183886', $ciDoc['exporter']['whatsapp_number']);
        $this->assertEquals('https://wa.me/8801982183886', $ciDoc['exporter']['whatsapp_url']);
    }

    /**
     * TEST 9: Prefilled WhatsApp message preserves custom text while destination number changes.
     */
    public function test_9_prefilled_whatsapp_message_preserved_with_new_number(): void
    {
        $customMessage = "Hello AYAAN CLOTHING,\n\nI need an export quotation for 5,000 pcs of AYN-TSHIRT-001.\nPlease advise CIF Hamburg pricing.";

        $url = WhatsAppNormalizationService::buildWhatsAppUrl('8801982183886', $customMessage);

        $this->assertStringStartsWith('https://wa.me/8801982183886?text=', $url);
        $this->assertStringContainsString(rawurlencode("Hello AYAAN CLOTHING,"), $url);
        $this->assertStringContainsString("AYN-TSHIRT-001", $url);
        $this->assertStringContainsString(rawurlencode("CIF Hamburg"), $url);
    }

    /**
     * TEST 10: Unauthorized customer / user attempts to modify WhatsApp or business settings -> Rejected.
     */
    public function test_10_unauthorized_user_cannot_modify_business_settings(): void
    {
        $payload = [
            'company' => ['name' => 'Hacker Apparel'],
            'contact' => ['whatsapp' => '+880 1999-999999'],
        ];

        // 1. Unauthenticated request
        $this->putJson('/api/v1/admin/settings/business', $payload)
            ->assertStatus(401);

        // 2. Customer role request
        $this->actingAs($this->customer, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', $payload)
            ->assertStatus(403);

        // Ensure settings were not modified
        $this->assertNotEquals('Hacker Apparel', SystemSetting::get('company_name'));
    }

    /**
     * TEST 11: Admin configures bank details -> Documents use new bank details -> Public storefront API NEVER exposes private bank data.
     */
    public function test_11_bank_details_wire_into_documents_but_remain_hidden_from_public_api(): void
    {
        // Admin configures banking
        $bankPayload = [
            'banking' => [
                'is_configured' => true,
                'bank_name' => 'Standard Chartered Bank Bangladesh',
                'account_name' => 'Ayaan Clothing Ltd. Export Account',
                'account_number' => '01-9988776-01',
                'swift_code' => 'SCBLBDDX',
                'branch_name' => 'Gulshan Branch, Dhaka',
                'routing_number' => '215260987',
                'currency' => 'USD',
            ],
        ];

        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', $bankPayload)
            ->assertStatus(200);

        // 1. Commercial Invoice contains bank credentials
        $ciDoc = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $this->assertEquals('Standard Chartered Bank Bangladesh', $ciDoc['bankDetails']['bank_name']);
        $this->assertEquals('01-9988776-01', $ciDoc['bankDetails']['account_no']);
        $this->assertEquals('SCBLBDDX', $ciDoc['bankDetails']['swift_code']);

        // 2. Proforma Invoice contains bank credentials
        $piDoc = app(ProformaInvoiceService::class)->generateForOrder($this->order);
        $this->assertEquals('Standard Chartered Bank Bangladesh', $piDoc['bankDetails']['bank_name']);
        $this->assertEquals('01-9988776-01', $piDoc['bankDetails']['account_no']);

        // 3. Sales Invoice contains bank credentials
        $invDoc = app(InvoiceService::class)->generateForOrder($this->order);
        $this->assertEquals('Standard Chartered Bank Bangladesh', $invDoc['bank_details']['bank_name']);

        // 4. Binary PDF renders bank details
        $pdfBinary = app(DocumentPdfService::class)->render($ciDoc)->output();
        $this->assertStringContainsString('Standard Chartered Bank', $pdfBinary);
        $this->assertStringContainsString('01-9988776-01', $pdfBinary);
        $this->assertStringContainsString('SCBLBDDX', $pdfBinary);

        // 5. PUBLIC STOREFRONT API MUST NOT EXPOSE PRIVATE BANK DATA
        $publicResponse = $this->getJson('/api/v1/settings/public');
        $publicResponse->assertStatus(200);
        $content = $publicResponse->getContent();

        $this->assertStringNotContainsString('Standard Chartered', $content);
        $this->assertStringNotContainsString('01-9988776-01', $content);
        $this->assertStringNotContainsString('SCBLBDDX', $content);
        $this->assertStringNotContainsString('215260987', $content);
    }

    /**
     * TEST 12: Admin configures registration / export information -> Only applicable documents display it.
     */
    public function test_12_registration_and_export_information_connected_to_documents(): void
    {
        $regPayload = [
            'legal' => [
                'reg_number' => 'TRAD/DNCC/998877/2026',
                'tin_number' => '998877665544',
                'bin_number' => '009988776-0101',
                'erc_number' => '26-998877',
                'bgmea_reg' => 'BGMEA-REG-2026-99',
            ],
            'document_defaults' => [
                'country_of_origin' => 'People\'s Republic of Bangladesh',
                'air_port_of_loading' => 'Hazrat Shahjalal International Airport (DAC), Dhaka',
                'incoterm_default' => 'FOB Chattogram Port',
                'ci_notes' => 'Certified Bangladeshi Ready-made Knit Garments. Fully compliant with export regulations.',
            ],
        ];

        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', $regPayload)
            ->assertStatus(200);

        $ciDoc = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $this->assertEquals('TRAD/DNCC/998877/2026', $ciDoc['exporter']['reg_number']);
        $this->assertEquals('998877665544', $ciDoc['exporter']['tin_number']);
        $this->assertEquals('People\'s Republic of Bangladesh', $ciDoc['estimated_shipping_data']['country_of_origin']);
        $this->assertEquals('Certified Bangladeshi Ready-made Knit Garments. Fully compliant with export regulations.', $ciDoc['notes']);

        // Public API must NOT expose internal tax registrations
        $publicContent = $this->getJson('/api/v1/settings/public')->getContent();
        $this->assertStringNotContainsString('TRAD/DNCC/998877/2026', $publicContent);
        $this->assertStringNotContainsString('998877665544', $publicContent);
        $this->assertStringNotContainsString('009988776-0101', $publicContent);
    }

    /**
     * TEST 13: Customer and order data remain dynamically derived from the real order/buyer snapshot,
     * never overwritten by global company settings.
     */
    public function test_13_customer_and_order_data_remain_dynamic_and_immutable(): void
    {
        $ciDoc = app(CommercialInvoiceService::class)->generateForOrder($this->order);

        $this->assertEquals('ORD-2026-998877', $ciDoc['orderNumber']);
        $this->assertEquals('Lars Svensson', $ciDoc['buyerName']);
        $this->assertEquals('buyer@nordicapparel.se', $ciDoc['buyerEmail']);
        $this->assertEquals('Storgatan 45', $ciDoc['buyerAddress']);
        $this->assertEquals(2500.00, $ciDoc['subtotal']);
        $this->assertEquals(150.00, $ciDoc['shipping']);
        $this->assertEquals(2600.00, $ciDoc['grandTotal']);
        $this->assertEquals(250, $ciDoc['items'][0]['quantity']);
        $this->assertEquals(10.00, $ciDoc['items'][0]['unit_price']);
    }
}
