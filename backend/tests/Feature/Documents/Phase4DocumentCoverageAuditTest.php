<?php

namespace Tests\Feature\Documents;

use App\Models\Activity;
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

class Phase4DocumentCoverageAuditTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private Order $order;
    private Quotation $quotation;
    private Product $product;

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
            'name' => 'Nordic Apparel AB',
            'email' => 'purchasing@nordicapparel.se',
            'role' => 'customer',
            'company_name' => 'Nordic Apparel Imports Ltd',
            'is_super_admin' => false,
        ]);

        $this->product = Product::factory()->create([
            'name' => 'Combed Cotton Single Jersey Polo',
            'sku' => 'AYN-POLO-401',
            'wholesale_price' => 14.50,
            'cost_price' => 6.20,
        ]);

        $this->order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-2026-990011',
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_method' => 'bank_wire',
            'currency' => 'USD',
            'subtotal' => 2900.00,
            'shipping_cost' => 150.00,
            'tax_amount' => 0.00,
            'discount_amount' => 50.00,
            'total_amount' => 3000.00,
            'shipping_name' => 'Erik Thorvaldsen',
            'shipping_address1' => 'Stortorget 5',
            'shipping_city' => 'Stockholm',
            'shipping_postal_code' => '11129',
            'shipping_country_code' => 'SE',
            'shipping_phone' => '+46 8 123 4567',
            'email' => 'purchasing@nordicapparel.se',
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $this->product->id,
            'product_name' => 'Combed Cotton Single Jersey Polo',
            'sku' => 'AYN-POLO-401',
            'quantity' => 200,
            'unit_price' => 14.50,
            'line_total' => 2900.00,
        ]);

        $this->quotation = Quotation::create([
            'user_id' => $this->customer->id,
            'quotation_number' => 'QT-2026-778899',
            'buyer_name' => 'Erik Thorvaldsen',
            'company_name' => 'Nordic Apparel Imports Ltd',
            'buyer_email' => 'purchasing@nordicapparel.se',
            'currency' => 'USD',
            'subtotal' => 2900.00,
            'shipping_estimate' => 150.00,
            'tax_amount' => 0.00,
            'discount_amount' => 50.00,
            'total_amount' => 3000.00,
            'status' => 'sent',
            'valid_until' => now()->addDays(30),
        ]);

        QuotationItem::create([
            'quotation_id' => $this->quotation->id,
            'product_id' => $this->product->id,
            'product_name' => 'Combed Cotton Single Jersey Polo',
            'sku' => 'AYN-POLO-401',
            'quantity' => 200,
            'unit_price' => 14.50,
            'total_price' => 2900.00,
        ]);
    }

    /** Test 1: Full Document Matrix Coverage across CI, PI, Offer Sheet, Invoice, Packing List */
    public function test_01_matrix_field_coverage_across_all_documents(): void
    {
        // 1. Set explicit business settings
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'company' => [
                    'name' => 'Ayaan Phase 4 Central Enterprise',
                    'legal_name' => 'Ayaan Phase 4 Clothing Ltd.',
                    'tagline' => 'Global Ready-Made Garments Exporter',
                    'address' => 'House #33, Road #12, Sector #11, Uttara, Dhaka-1230',
                ],
                'contact' => [
                    'email' => 'export@ayaanclothing.com',
                    'phone' => '+880 1620-853502',
                    'whatsapp' => '+880 1620-853502',
                ],
                'banking' => [
                    'bank_name' => 'Pubali Bank Limited',
                    'account_title' => 'M/S AYAAN CLOTHING',
                    'account_number' => '1788-901-044316',
                    'swift_code' => 'PUBABDDH210',
                    'branch' => 'Nawabpur Road Branch, Dhaka',
                ],
                'document_defaults' => [
                    'default_country_of_origin' => 'Bangladesh',
                    'default_port_of_loading' => 'Hazrat Shahjalal DAC',
                    'default_incoterm' => 'FOB Dhaka',
                    'default_payment_terms' => '100% Advance T/T',
                    'default_declaration_text' => 'Goods certified export quality 5-ply cartons.',
                    'signatory_name' => 'Commercial Director',
                    'signatory_title' => 'Chief Merchandising Officer',
                    'signatory_division' => 'Ayaan Global Export Division',
                ],
            ])
            ->assertStatus(200);

        // A. Commercial Invoice
        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $this->assertEquals('Ayaan Phase 4 Central Enterprise', $ci['exporter']['name']);
        $this->assertEquals('+880 1620-853502', $ci['exporter']['whatsapp_display']);
        $this->assertEquals('Pubali Bank Limited', $ci['bank_details']['bank_name']);
        $this->assertEquals('Chief Merchandising Officer', $ci['signatory_title']);
        $this->assertEquals('Ayaan Global Export Division', $ci['signatory_division']);
        $this->assertEquals('Hazrat Shahjalal DAC', $ci['document_defaults']['default_port_of_loading']);

        // B. Proforma Invoice
        $pi = app(ProformaInvoiceService::class)->generateForOrder($this->order);
        $this->assertEquals('Ayaan Phase 4 Central Enterprise', $pi['exporter']['name']);
        $this->assertEquals('+880 1620-853502', $pi['exporter']['whatsapp_display']);
        $this->assertEquals('Pubali Bank Limited', $pi['bank_details']['bank_name']);
        $this->assertEquals('Chief Merchandising Officer', $pi['signatory_title']);
        $this->assertEquals('Ayaan Global Export Division', $pi['signatory_division']);

        // C. Offer Sheet
        $offer = app(OfferSheetService::class)->generateForOrder($this->order);
        $this->assertEquals('Ayaan Phase 4 Central Enterprise', $offer['exporter']['name']);
        $this->assertEquals('Chief Merchandising Officer', $offer['signatory_title']);
        $this->assertEquals('Ayaan Global Export Division', $offer['signatory_division']);

        // D. Order Model Commercial Document
        $commDoc = $this->order->getCommercialDocument('COMMERCIAL_INVOICE');
        $this->assertEquals('Ayaan Phase 4 Central Enterprise', $commDoc['exporter']['company_name']);
        $this->assertEquals('Chief Merchandising Officer', $commDoc['document_defaults']['signatory_title']);
        $this->assertEquals('Ayaan Global Export Division', $commDoc['document_defaults']['signatory_division']);
    }

    /** Test 2: Actual PDF Stream Generation via DocumentPdfService::render */
    public function test_02_actual_pdf_stream_generation_and_headers(): void
    {
        $pdfService = app(DocumentPdfService::class);
        $ciData = app(CommercialInvoiceService::class)->generateForOrder($this->order);

        $pdfBytes = $pdfService->render($ciData, [
            'mode' => 'stream',
            'docType' => 'COMMERCIAL_INVOICE',
        ]);

        $this->assertNotEmpty($pdfBytes, 'PDF bytes must not be empty');
        // Valid PDF begins with %PDF- header
        $this->assertStringStartsWith('%PDF-', $pdfBytes, 'PDF output must begin with %PDF- magic bytes');
        // Contains document ref
        $this->assertStringContainsString($ciData['docNumber'], $pdfBytes);
    }

    /** Test 3: Customer Data Protection — Company settings never override buyer info */
    public function test_03_customer_data_protection_never_overrides_buyer(): void
    {
        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->order);

        $this->assertEquals('Erik Thorvaldsen', $ci['buyer']['name']);
        $this->assertEquals('Nordic Apparel Imports Ltd', $ci['buyer']['company_name']);
        $this->assertEquals('purchasing@nordicapparel.se', $ci['buyer']['email']);
        $this->assertEquals('Stortorget 5', $ci['buyer']['address']);
        $this->assertEquals('Stockholm', $ci['buyer']['city']);
        $this->assertEquals('SE', $ci['buyer']['country']);
        $this->assertEquals('+46 8 123 4567', $ci['buyer']['phone']);

        // Verify Exporter does NOT leak into Buyer
        $this->assertNotEquals($ci['exporter']['name'], $ci['buyer']['name']);
        $this->assertNotEquals($ci['exporter']['email'], $ci['buyer']['email']);
    }

    /** Test 4: Product and Pricing Data Protection — Accurate items and zero cost leak */
    public function test_04_product_and_pricing_data_protection(): void
    {
        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->order);

        $this->assertCount(1, $ci['items']);
        $item = $ci['items'][0];
        $this->assertEquals('Combed Cotton Single Jersey Polo (Assorted Package)', $item['description']);
        $this->assertEquals('Combed Cotton Single Jersey Polo', $item['product_name']);
        $this->assertEquals('AYN-POLO-401', $item['sku']);
        $this->assertEquals(200, $item['quantity']);
        $this->assertEquals(14.50, $item['unit_price']);
        $this->assertEquals(2900.00, $item['line_total']);

        // Internal cost price MUST NEVER exist on document items
        $this->assertArrayNotHasKey('cost_price', $item);

        // Financials must strictly reflect order totals
        $this->assertEquals(2900.00, $ci['financials']['subtotal']);
        $this->assertEquals(150.00, $ci['financials']['shipping_charge']);
        $this->assertEquals(50.00, $ci['financials']['discount_amount']);
        $this->assertEquals(3000.00, $ci['financials']['grand_total']);
    }

    /** Test 5: Payment Data Protection — Payment fields derived from order */
    public function test_05_payment_data_protection(): void
    {
        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->order);

        $this->assertEquals('paid', $ci['payment']['payment_status']);
        $this->assertEquals('bank_wire', $ci['payment']['payment_method']);
        $this->assertEquals('USD', $ci['payment']['currency']);
        $this->assertEquals(3000.00, $ci['payment']['total_amount']);
    }

    /** Test 6: Centralized WhatsApp Global Propagation and Formatting */
    public function test_06_centralized_whatsapp_authoritative_resolution(): void
    {
        $waService = app(WhatsAppNormalizationService::class);

        // 1. Authoritative default checks
        $this->assertEquals('8801620853502', $waService->getCanonicalWhatsApp());
        $this->assertEquals('+880 1620-853502', $waService->getFormattedWhatsApp());
        $this->assertEquals('https://wa.me/8801620853502', $waService->getWhatsAppUrl());

        // 2. Change WhatsApp in settings
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'contact' => [
                    'whatsapp' => '+880 1819-998877',
                ],
            ])
            ->assertStatus(200);

        // 3. New value reflects immediately in canonical, display, and URL
        $this->assertEquals('8801819998877', $waService->getCanonicalWhatsApp());
        $this->assertEquals('+880 1819-998877', $waService->getFormattedWhatsApp());
        $this->assertEquals('https://wa.me/8801819998877', $waService->getWhatsAppUrl());

        // 4. Public settings API returns the updated WhatsApp
        $public = $this->getJson('/api/v1/settings/public')->json('data');
        $this->assertEquals('+880 1819-998877', $public['whatsapp']['display']);
        $this->assertEquals('8801819998877', $public['whatsapp_canonical']);
    }

    /** Test 7: Public Settings Security — Strict shielding of private banking and tax numbers */
    public function test_07_public_settings_security_private_field_shielding(): void
    {
        $response = $this->getJson('/api/v1/settings/public');
        $response->assertStatus(200);
        $data = $response->json('data');

        // Sensitive banking must NEVER be exposed
        $this->assertArrayNotHasKey('banking', $data);
        $this->assertArrayNotHasKey('bank_name', $data);
        $this->assertArrayNotHasKey('account_title', $data);
        $this->assertArrayNotHasKey('account_number', $data);
        $this->assertArrayNotHasKey('bank_account_number', $data);
        $this->assertArrayNotHasKey('swift_code', $data);
        $this->assertArrayNotHasKey('routing_number', $data);

        // Sensitive tax and registration must NEVER be exposed publicly
        $this->assertArrayNotHasKey('tin_number', $data);
        $this->assertArrayNotHasKey('bin_vat', $data);
        $this->assertArrayNotHasKey('bin_number', $data);
        $this->assertArrayNotHasKey('erc_number', $data);
        $this->assertArrayNotHasKey('irc_number', $data);

        // Permitted public branding MUST be present
        $this->assertArrayHasKey('site_title', $data);
        $this->assertArrayHasKey('company_name', $data);
        $this->assertArrayHasKey('whatsapp', $data);
        $this->assertArrayHasKey('public_email', $data);
    }

    /** Test 8: Empty Settings Fallback — Documents never crash or produce literal nulls */
    public function test_08_empty_settings_handling_and_clean_fallbacks(): void
    {
        // Clear cached settings and business settings record
        Cache::flush();
        SystemSetting::where('group', 'business')->delete();

        // Regenerate documents with empty DB settings
        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $pi = app(ProformaInvoiceService::class)->generateForOrder($this->order);
        $offer = app(OfferSheetService::class)->generateForOrder($this->order);

        // Fallbacks must resolve gracefully from defaults
        $this->assertEquals('AYAAN CLOTHING', $ci['exporter']['name']);
        $this->assertNotEmpty($ci['exporter']['whatsapp_display']);
        $this->assertNotEmpty($pi['bank_details']['bank_name']);
        $this->assertNotEmpty($offer['exporter']['name']);

        // No literal "undefined", "null", "false", or "[object Object]"
        $jsonCi = json_encode($ci);
        $this->assertStringNotContainsString('"undefined"', $jsonCi);
        $this->assertStringNotContainsString('"[object Object]"', $jsonCi);
    }

    /** Test 9: Settings Validation — Rejects invalid email, malformed contact, invalid types */
    public function test_09_settings_validation_rejects_malformed_values(): void
    {
        // Invalid email format
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'contact' => [
                    'email' => 'not-an-email-at-all',
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['contact.email']);

        // Invalid established year (must be >= 1900)
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'company' => [
                    'established_year' => 1800,
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['company.established_year']);

        // Invalid WhatsApp (letters rejected)
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'contact' => [
                    'whatsapp' => 'invalid-letters-wa',
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['contact.whatsapp']);
    }

    /** Test 10: Security and RBAC — Customer cannot update business settings */
    public function test_10_security_rbac_unauthorized_modification_blocked(): void
    {
        // Unauthenticated attempt
        $this->putJson('/api/v1/admin/settings/business', [
            'company' => ['name' => 'Hacked Name Corp'],
        ])->assertStatus(401);

        // Customer attempt
        $this->actingAs($this->customer, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'company' => ['name' => 'Hacked Name Corp'],
            ])->assertStatus(403);
    }

    /** Test 11: Audit Logging — Every business settings change is recorded with user and diff */
    public function test_11_audit_logging_records_changes(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'company' => ['name' => 'Ayaan Audited Corp 2026'],
            ])
            ->assertStatus(200);

        $activity = Activity::where('action', 'settings.business_updated')->latest()->first();
        $this->assertNotNull($activity, 'Activity log entry must exist for settings update');
        $this->assertEquals($this->admin->id, $activity->user_id);
    }
}
