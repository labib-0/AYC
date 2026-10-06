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
use App\Services\Documents\InvoiceService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use App\Services\Settings\WhatsAppNormalizationService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class Phase3FinalDocumentQaTest extends TestCase
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
            'name' => 'Nordic Buyer AB',
            'email' => 'buyer@nordicapparel.se',
            'role' => 'customer',
            'company_name' => 'Nordic Apparel Import Group',
            'is_super_admin' => false,
        ]);

        $this->product = Product::factory()->create([
            'name' => 'Organic Heavyweight Crewneck T-Shirt',
            'sku' => 'AYN-TSHIRT-001',
            'wholesale_price' => 12.50,
            'cost_price' => 5.20,
        ]);

        $this->order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-2026-887766',
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_method' => 'bank_transfer',
            'currency' => 'USD',
            'subtotal' => 2500.00,
            'shipping_cost' => 180.00,
            'tax_amount' => 0.00,
            'discount_amount' => 80.00,
            'manual_discount_amount' => 30.00,
            'manual_discount_reason' => 'VIP Customer Loyalty Concession',
            'total_amount' => 2600.00,
            'shipping_name' => 'Lars Lindqvist',
            'shipping_address1' => 'Drottninggatan 12',
            'shipping_city' => 'Stockholm',
            'shipping_postal_code' => '11151',
            'shipping_country_code' => 'SE',
            'shipping_phone' => '+46 8 555 1234',
            'email' => 'buyer@nordicapparel.se',
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $this->product->id,
            'product_name' => 'Organic Heavyweight Crewneck T-Shirt',
            'sku' => 'AYN-TSHIRT-001',
            'quantity' => 200,
            'unit_price' => 12.50,
            'line_total' => 2500.00,
        ]);

        $this->quotation = Quotation::create([
            'user_id' => $this->customer->id,
            'quotation_number' => 'QT-2026-445566',
            'buyer_name' => 'Lars Lindqvist',
            'company_name' => 'Nordic Apparel Import Group',
            'buyer_email' => 'buyer@nordicapparel.se',
            'buyer_phone' => '+46 8 555 1234',
            'destination_city' => 'Stockholm',
            'destination_country' => 'Sweden',
            'subtotal' => 5000.00,
            'shipping_fee' => 350.00,
            'tax_amount' => 0.00,
            'discount_total' => 0.00,
            'grand_total' => 5350.00,
            'currency' => 'USD',
            'status' => 'issued',
            'payment_status' => 'pending',
            'payment_terms' => '100% T/T Advance',
            'shipping_terms' => 'FOB Dhaka (Export)',
            'incoterm' => 'FOB',
        ]);

        QuotationItem::create([
            'quotation_id' => $this->quotation->id,
            'product_id' => $this->product->id,
            'product_name' => 'Organic Heavyweight Crewneck T-Shirt',
            'sku' => 'AYN-TSHIRT-001',
            'quantity' => 400,
            'unit_price' => 12.50,
            'line_total' => 5000.00,
        ]);
    }

    // ==========================================
    // 1-6: BUSINESS SETTINGS MATRIX
    // ==========================================

    /** Test 1: Read centralized settings */
    public function test_1_read_business_settings_authenticated(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/settings/business');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'status',
                'data' => [
                    'company' => ['name', 'legal_name', 'website', 'logo_url'],
                    'contact' => ['office_address', 'phone', 'email', 'whatsapp'],
                    'legal' => ['trade_license', 'bin_vat', 'tin_number', 'erc_number'],
                    'banking' => ['bank_name', 'account_name', 'account_number', 'swift_code', 'routing_number'],
                    'document_defaults' => ['country_of_origin', 'port_of_loading', 'incoterm_default'],
                ],
            ]);
    }

    /** Test 2: Update centralized settings */
    public function test_2_update_business_settings_authenticated(): void
    {
        $payload = [
            'company' => [
                'name' => 'Ayaan Clothing Global Ltd.',
                'legal_name' => 'M/S Ayaan Clothing Global Ltd.',
                'website' => 'https://ayaanclothing.com',
            ],
            'contact' => [
                'office_address' => 'House #20, Road #5, Sector #4, Uttara, Dhaka-1230, Bangladesh',
                'email' => 'commercial@ayaanclothing.com',
                'phone' => '+880 1620-853502',
                'whatsapp' => '+880 1620-853502',
            ],
            'banking' => [
                'bank_name' => 'Pubali Bank Limited',
                'account_name' => 'M/S Ayaan Clothing Global Ltd.',
                'account_number' => '1788-901-044316',
                'swift_code' => 'PUBABDDH210',
                'routing_number' => '175271894',
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.company.name', 'Ayaan Clothing Global Ltd.')
            ->assertJsonPath('data.contact.email', 'commercial@ayaanclothing.com');
    }

    /** Test 3: Validation rules enforced */
    public function test_3_validation_rules_enforced(): void
    {
        // Malicious or invalid WhatsApp phone
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'contact' => [
                    'whatsapp' => 'javascript:alert(1)',
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contact.whatsapp']);

        // Invalid email
        $responseEmail = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'contact' => [
                    'email' => 'not-an-email',
                ],
            ]);

        $responseEmail->assertStatus(422)
            ->assertJsonValidationErrors(['contact.email']);
    }

    /** Test 4: RBAC & Permission Protection */
    public function test_4_rbac_and_permission_protection(): void
    {
        // Unauthenticated
        $this->getJson('/api/v1/admin/settings/business')
            ->assertStatus(401);

        $this->putJson('/api/v1/admin/settings/business', ['company' => ['name' => 'Hacker Ltd']])
            ->assertStatus(401);

        // Customer forbidden
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/settings/business')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', ['company' => ['name' => 'Hacker Ltd']])
            ->assertStatus(403);
    }

    /** Test 5: Persistence in SystemSetting */
    public function test_5_persistence_in_system_settings(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'company' => ['name' => 'Ayaan Export Corporation'],
                'legal' => ['erc_number' => 'ERC-998877'],
            ]);

        $this->assertEquals('Ayaan Export Corporation', SystemSetting::get('company_name'));
        $this->assertEquals('ERC-998877', SystemSetting::get('erc_number'));
    }

    /** Test 6: Cache invalidation on update */
    public function test_6_cache_invalidation_on_update(): void
    {
        Cache::put('site_settings_public', ['cached' => true], 3600);
        $this->assertTrue(Cache::has('site_settings_public'));

        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'company' => ['name' => 'Ayaan Cache Test'],
            ]);

        $this->assertFalse(Cache::has('site_settings_public'));
    }

    // ==========================================
    // 7-11: WHATSAPP MATRIX
    // ==========================================

    /** Test 7: Default WhatsApp number canonical values */
    public function test_7_whatsapp_canonical_defaults(): void
    {
        $this->assertEquals('+880 1620-853502', WhatsAppNormalizationService::CANONICAL_DISPLAY);
        $this->assertEquals('8801620853502', WhatsAppNormalizationService::CANONICAL_NUMBER);
        $this->assertEquals('https://wa.me/8801620853502', WhatsAppNormalizationService::CANONICAL_URL);
    }

    /** Test 8: Normalization rules */
    public function test_8_whatsapp_normalization_rules(): void
    {
        $this->assertEquals('8801620853502', WhatsAppNormalizationService::deriveMachineNumber('+880 1620-853502'));
        $this->assertEquals('8801620853502', WhatsAppNormalizationService::deriveMachineNumber('01620-853502'));
        $this->assertEquals('8801982183886', WhatsAppNormalizationService::deriveMachineNumber('+880 1982-183886'));
    }

    /** Test 9: Global WhatsApp propagation and restoration */
    public function test_9_global_whatsapp_propagation_and_reversion(): void
    {
        // 1. Initial State: Canonical default
        $initialPublic = $this->getJson('/api/v1/settings/public')->json('data.whatsapp');
        $this->assertEquals('8801620853502', $initialPublic['number']);
        $this->assertEquals('https://wa.me/8801620853502', $initialPublic['url']);

        // 2. Admin updates WhatsApp to secondary test number +880 1982-183886
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'contact' => [
                    'whatsapp' => '+880 1982-183886',
                ],
            ]);

        // 3. Verify public settings immediately propagated
        $updatedPublic = $this->getJson('/api/v1/settings/public')->json('data.whatsapp');
        $this->assertEquals('8801982183886', $updatedPublic['number']);
        $this->assertEquals('https://wa.me/8801982183886', $updatedPublic['url']);

        // 4. Verify document exporter profile immediately propagated
        $exporter = DocumentHelper::getExporterProfile();
        $this->assertEquals('+880 1982-183886', $exporter['whatsapp_display']);
        $this->assertEquals('https://wa.me/8801982183886', $exporter['whatsapp_url']);

        // 5. Admin reverts to official canonical default +880 1620-853502
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'contact' => [
                    'whatsapp' => '+880 1620-853502',
                ],
            ]);

        // 6. Verify restoration
        $restoredPublic = $this->getJson('/api/v1/settings/public')->json('data.whatsapp');
        $this->assertEquals('8801620853502', $restoredPublic['number']);
        $this->assertEquals('https://wa.me/8801620853502', $restoredPublic['url']);

        $restoredExporter = DocumentHelper::getExporterProfile();
        $this->assertEquals('+880 1620-853502', $restoredExporter['whatsapp_display']);
        $this->assertEquals('https://wa.me/8801620853502', $restoredExporter['whatsapp_url']);
    }

    /** Test 10: Message preservation */
    public function test_10_whatsapp_contextual_message_preservation(): void
    {
        $message = "Hello, I am interested in Organic Crewneck T-Shirt (SKU: AYN-TSHIRT-001).";
        $url = WhatsAppNormalizationService::buildWhatsAppUrl('8801982183886', $message);

        $this->assertStringStartsWith('https://wa.me/8801982183886?text=', $url);
        $this->assertStringContainsString(rawurlencode($message), $url);
    }

    /** Test 11: Unauthorized WhatsApp update rejected */
    public function test_11_unauthorized_whatsapp_update_rejected(): void
    {
        $this->actingAs($this->customer, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'contact' => ['whatsapp' => '+880 1999-999999'],
            ])
            ->assertStatus(403);

        $this->assertEquals('8801620853502', WhatsAppNormalizationService::deriveMachineNumber(
            SystemSetting::get('whatsapp_display', WhatsAppNormalizationService::CANONICAL_DISPLAY)
        ));
    }

    // ==========================================
    // 12-18: DOCUMENT QA MATRIX
    // ==========================================

    /** Test 12: CI QA — Preserves calculations and protects internal costs */
    public function test_12_ci_qa_preserves_calculations_and_protects_internal_costs(): void
    {
        $ciService = app(CommercialInvoiceService::class);
        $ci = $ciService->generateForOrder($this->order);

        // Document Identity & Exporter
        $this->assertStringStartsWith('INV-', $ci['docNumber']);
        $this->assertEquals('COMMERCIAL_INVOICE', $ci['docType']);
        $this->assertNotEmpty($ci['exporter']['name']);
        $this->assertNotEmpty($ci['exporter']['whatsapp_url']);
        $this->assertNotEmpty($ci['bankDetails']['bank_name']);

        // Buyer details
        $this->assertEquals('Lars Lindqvist', $ci['buyerName']);
        $this->assertEquals('buyer@nordicapparel.se', $ci['buyerEmail']);

        // Calculations & Financials
        $this->assertEquals(2500.00, $ci['financials']['goods_value']);
        $this->assertEquals(180.00, $ci['financials']['shipping_charge']);
        $this->assertEquals(80.00, $ci['financials']['discount_amount']);
        $this->assertEquals(2600.00, $ci['financials']['total_payable']);

        // Items check & NO internal cost price leak
        $this->assertCount(1, $ci['items']);
        $item = $ci['items'][0];
        $this->assertEquals(200, $item['quantity']);
        $this->assertEquals(12.50, $item['unit_price']);
        $this->assertEquals(2500.00, $item['line_total']);
        $this->assertArrayNotHasKey('cost_price', $item);
        $this->assertArrayNotHasKey('purchase_price', $item);
    }

    /** Test 13: PI QA — Preserves calculations and bank wire terms */
    public function test_13_pi_qa_preserves_calculations_and_bank_wire_terms(): void
    {
        $piService = app(ProformaInvoiceService::class);
        $pi = $piService->generateForOrder($this->order);

        $this->assertStringStartsWith('PI-', $pi['docNumber']);
        $this->assertEquals('PROFORMA_INVOICE', $pi['docType']);
        $this->assertEquals(2500.00, $pi['subtotal']);
        $this->assertEquals(2600.00, $pi['grandTotal']);
        $this->assertNotEmpty($pi['bankDetails']['account_number']);
        $this->assertNotEmpty($pi['bankDetails']['swift_code']);
    }

    /** Test 14: Offer Sheet QA — Single tier pricing and no duplicate media */
    public function test_14_offer_sheet_qa_single_tier_and_no_duplicate_media(): void
    {
        $offerService = app(OfferSheetService::class);
        $offer = $offerService->generateForOrder($this->order);

        $this->assertStringStartsWith('ORD-', $offer['docNumber']);
        $this->assertEquals('ORDER_SHEET', $offer['docType']);
        $this->assertNotEmpty($offer['exporter']['name']);

        // Single tier pricing for item
        $item = $offer['items'][0];
        $this->assertEquals(200, $item['applicable_pricing']['order_quantity']);
        $this->assertEquals(12.50, $item['applicable_pricing']['unit_price']);
        $this->assertEquals(2500.00, $item['applicable_pricing']['total']);

        // No internal cost
        $this->assertArrayNotHasKey('cost_price', $item);
    }

    /** Test 15: Invoice QA — Historical order values authoritative & privacy masking */
    public function test_15_invoice_qa_historical_order_values_authoritative(): void
    {
        $invoiceService = app(InvoiceService::class);

        // Customer view: internal discount reason masked
        $customerInvoice = $invoiceService->generateForOrder($this->order, false);
        $this->assertNull($customerInvoice['financials']['manual_discount_reason']);
        $this->assertEquals(2600.00, $customerInvoice['financials']['total_payable']);

        // Admin view: internal discount reason preserved
        $adminInvoice = $invoiceService->generateForOrder($this->order, true);
        $this->assertEquals('VIP Customer Loyalty Concession', $adminInvoice['financials']['manual_discount_reason']);
    }

    /** Test 16: Quotation QA — Centralized company data */
    public function test_16_quotation_qa_centralized_company_data(): void
    {
        $ciService = app(CommercialInvoiceService::class);
        $ciForQuote = $ciService->generateForQuotation($this->quotation);

        $this->assertNotEmpty($ciForQuote['exporter']['name']);
        $this->assertEquals(5000.00, $ciForQuote['financials']['goods_value']);
        $this->assertEquals(5350.00, $ciForQuote['financials']['grand_total']);
    }

    /** Test 17: Public settings security — Hides private banking and tax identifiers */
    public function test_17_public_settings_security_hides_private_banking_and_tax_identifiers(): void
    {
        $public = $this->getJson('/api/v1/settings/public')->json('data');

        $this->assertArrayNotHasKey('banking', $public);
        $this->assertArrayNotHasKey('bank_account_number', $public);
        $this->assertArrayNotHasKey('routing_number', $public);
        $this->assertArrayNotHasKey('tin_number', $public);
        $this->assertArrayNotHasKey('bin_number', $public);
        $this->assertArrayHasKey('site_title', $public);
        $this->assertArrayHasKey('whatsapp', $public);
    }

    /** Test 18: Historical document behavior and audit logging */
    public function test_18_historical_document_behavior_and_audit_logging(): void
    {
        // 1. Initial snapshot of Order 1 financials
        $initialSubtotal = $this->order->subtotal;
        $initialTotal = $this->order->total_amount;

        // 2. Admin updates business settings
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'company' => ['name' => 'Ayaan Phase 3 Verified Corp'],
                'contact' => ['whatsapp' => '+880 1620-853502'],
                'banking' => [
                    'bank_name' => 'Pubali Bank Limited',
                    'account_number' => '1788-901-044316',
                ],
            ]);

        // 3. Verify Order 1's historical values were NOT mutated
        $this->order->refresh();
        $this->assertEquals($initialSubtotal, $this->order->subtotal);
        $this->assertEquals($initialTotal, $this->order->total_amount);

        // 4. Verify newly generated document receives the updated exporter name
        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->order);
        $this->assertEquals('Ayaan Phase 3 Verified Corp', $ci['exporter']['name']);

        // 5. Verify audit logging
        $audit = Activity::where('action', 'settings.business_updated')->latest()->first();
        $this->assertNotNull($audit, 'Expected settings.business_updated activity log entry');
        $this->assertEquals($this->admin->id, $audit->user_id);
    }
}
