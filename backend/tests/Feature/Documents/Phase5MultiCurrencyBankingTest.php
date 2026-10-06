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

class Phase5MultiCurrencyBankingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private Order $usdOrder;
    private Order $eurOrder;
    private Order $gbpOrder;
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

        // USD Order
        $this->usdOrder = Order::factory()->create([
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
        ]);

        OrderItem::create([
            'order_id' => $this->usdOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 200,
            'unit_price' => 14.50,
            'line_total' => 2900.00,
            'size' => 'L',
            'color' => 'Navy Blue',
        ]);

        // EUR Order
        $this->eurOrder = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-2026-990022',
            'status' => 'confirmed',
            'payment_status' => 'pending',
            'payment_method' => 'bank_wire',
            'currency' => 'EUR',
            'subtotal' => 5800.00,
            'shipping_cost' => 300.00,
            'tax_amount' => 0.00,
            'discount_amount' => 100.00,
            'total_amount' => 6000.00,
            'shipping_name' => 'Pierre Dupont',
            'shipping_address1' => 'Rue de Rivoli 12',
            'shipping_city' => 'Paris',
            'shipping_postal_code' => '75001',
            'shipping_country_code' => 'FR',
            'shipping_phone' => '+33 1 42 68 00 00',
        ]);

        OrderItem::create([
            'order_id' => $this->eurOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 400,
            'unit_price' => 14.50,
            'line_total' => 5800.00,
            'size' => 'M',
            'color' => 'Heather Grey',
        ]);

        // GBP Order
        $this->gbpOrder = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-2026-990033',
            'status' => 'confirmed',
            'payment_status' => 'pending',
            'payment_method' => 'bank_wire',
            'currency' => 'GBP',
            'subtotal' => 1450.00,
            'shipping_cost' => 100.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'total_amount' => 1550.00,
            'shipping_name' => 'Arthur Pendelton',
            'shipping_address1' => 'Oxford Street 100',
            'shipping_city' => 'London',
            'shipping_postal_code' => 'W1D 1LL',
            'shipping_country_code' => 'GB',
            'shipping_phone' => '+44 20 7946 0912',
        ]);

        OrderItem::create([
            'order_id' => $this->gbpOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 100,
            'unit_price' => 14.50,
            'line_total' => 1450.00,
            'size' => 'XL',
            'color' => 'Black',
        ]);
    }

    private function configureMultiCurrencyProfiles(): void
    {
        $profiles = [
            [
                'id' => 'prof_usd_primary',
                'name' => 'Pubali Bank - USD Settlement',
                'currency' => 'USD',
                'bank_name' => 'Pubali Bank Limited',
                'account_title' => 'M/S AYAAN  CLOTHING',
                'account_number' => '1788-901-044316',
                'swift_code' => 'PUBABDDH210',
                'branch' => 'Nawabpur Road Branch',
                'bank_address' => "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh",
                'routing_number' => '175271894',
                'notes' => 'Primary USD export wire instructions.',
                'is_active' => true,
                'is_default' => true,
            ],
            [
                'id' => 'prof_eur_primary',
                'name' => 'Standard Chartered Bank - EUR Settlement',
                'currency' => 'EUR',
                'bank_name' => 'Standard Chartered Bank',
                'account_title' => 'M/S AYAAN  CLOTHING',
                'account_number' => '01-8899776-02',
                'swift_code' => 'SCBLBDDX',
                'branch' => 'Gulshan Branch',
                'bank_address' => "67 Gulshan Avenue, Dhaka-1212, Bangladesh",
                'routing_number' => '215260844',
                'notes' => 'Direct EUR correspondent routing.',
                'is_active' => true,
                'is_default' => false,
            ],
            [
                'id' => 'prof_gbp_primary',
                'name' => 'HSBC Bangladesh - GBP Settlement',
                'currency' => 'GBP',
                'bank_name' => 'HSBC Bangladesh',
                'account_title' => 'M/S AYAAN  CLOTHING',
                'account_number' => '001-334455-067',
                'swift_code' => 'HSBCBDDH',
                'branch' => 'Dhaka Main Branch',
                'bank_address' => "Anchor Tower, 1/1 Sonargaon Road, Dhaka-1205, Bangladesh",
                'routing_number' => '115261778',
                'notes' => 'UK trade settlement account in GBP.',
                'is_active' => true,
                'is_default' => false,
            ],
        ];

        SystemSetting::set('bank_profiles', $profiles, 'json', 'banking');
    }

    /** TEST 1: USD document resolves USD bank profile */
    public function test_01_usd_document_resolves_usd_bank_profile(): void
    {
        $this->configureMultiCurrencyProfiles();

        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->usdOrder);
        $pi = app(ProformaInvoiceService::class)->generateForOrder($this->usdOrder);
        $orderDoc = $this->usdOrder->getCommercialDocument('PROFORMA_INVOICE');

        $this->assertEquals('USD', $ci['financials']['currency']);
        $this->assertEquals('Pubali Bank Limited', $ci['bank_details']['bank_name']);
        $this->assertEquals('1788-901-044316', $ci['bank_details']['account_number']);
        $this->assertEquals('PUBABDDH210', $ci['bank_details']['swift_code']);
        $this->assertEquals('USD', $ci['bank_details']['currency']);

        $this->assertEquals('Pubali Bank Limited', $pi['bank_details']['bank_name']);
        $this->assertEquals('USD', $pi['bank_details']['currency']);

        $this->assertEquals('Pubali Bank Limited', $orderDoc['bank_details']['bank_name']);
        $this->assertEquals('USD', $orderDoc['bank_details']['currency']);
    }

    /** TEST 2: EUR document resolves EUR bank profile */
    public function test_02_eur_document_resolves_eur_bank_profile(): void
    {
        $this->configureMultiCurrencyProfiles();

        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->eurOrder);
        $pi = app(ProformaInvoiceService::class)->generateForOrder($this->eurOrder);
        $orderDoc = $this->eurOrder->getCommercialDocument('PROFORMA_INVOICE');

        $this->assertEquals('EUR', $ci['financials']['currency']);
        $this->assertEquals('Standard Chartered Bank', $ci['bank_details']['bank_name']);
        $this->assertEquals('01-8899776-02', $ci['bank_details']['account_number']);
        $this->assertEquals('SCBLBDDX', $ci['bank_details']['swift_code']);
        $this->assertEquals('EUR', $ci['bank_details']['currency']);

        $this->assertEquals('Standard Chartered Bank', $pi['bank_details']['bank_name']);
        $this->assertEquals('EUR', $pi['bank_details']['currency']);

        $this->assertEquals('Standard Chartered Bank', $orderDoc['bank_details']['bank_name']);
        $this->assertEquals('EUR', $orderDoc['bank_details']['currency']);
    }

    /** TEST 3: GBP document resolves GBP bank profile */
    public function test_03_gbp_document_resolves_gbp_bank_profile(): void
    {
        $this->configureMultiCurrencyProfiles();

        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->gbpOrder);
        $pi = app(ProformaInvoiceService::class)->generateForOrder($this->gbpOrder);
        $orderDoc = $this->gbpOrder->getCommercialDocument('COMMERCIAL_INVOICE');

        $this->assertEquals('GBP', $ci['financials']['currency']);
        $this->assertEquals('HSBC Bangladesh', $ci['bank_details']['bank_name']);
        $this->assertEquals('001-334455-067', $ci['bank_details']['account_number']);
        $this->assertEquals('HSBCBDDH', $ci['bank_details']['swift_code']);
        $this->assertEquals('GBP', $ci['bank_details']['currency']);

        $this->assertEquals('HSBC Bangladesh', $pi['bank_details']['bank_name']);
        $this->assertEquals('GBP', $pi['bank_details']['currency']);

        $this->assertEquals('HSBC Bangladesh', $orderDoc['bank_details']['bank_name']);
        $this->assertEquals('GBP', $orderDoc['bank_details']['currency']);
    }

    /** TEST 4: No matching profile falls back to configured default profile */
    public function test_04_unmatched_currency_falls_back_to_configured_default_profile(): void
    {
        $this->configureMultiCurrencyProfiles();

        $jpyOrder = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-2026-990044',
            'status' => 'confirmed',
            'currency' => 'JPY',
            'subtotal' => 500000.00,
            'total_amount' => 500000.00,
        ]);

        $ci = app(CommercialInvoiceService::class)->generateForOrder($jpyOrder);

        // Document keeps JPY as financial currency
        $this->assertEquals('JPY', $ci['financials']['currency']);
        // Bank details fall back to default profile (USD Pubali Bank)
        $this->assertEquals('Pubali Bank Limited', $ci['bank_details']['bank_name']);
        $this->assertEquals('1788-901-044316', $ci['bank_details']['account_number']);
        $this->assertTrue($ci['bank_details']['is_default']);
    }

    /** TEST 5: Inactive matching profile falls back according to business rule */
    public function test_05_inactive_matching_profile_falls_back_to_default_profile(): void
    {
        // Set EUR profile as inactive
        $profiles = [
            [
                'id' => 'prof_usd_primary',
                'name' => 'Pubali Bank - USD Settlement',
                'currency' => 'USD',
                'bank_name' => 'Pubali Bank Limited',
                'account_number' => '1788-901-044316',
                'is_active' => true,
                'is_default' => true,
            ],
            [
                'id' => 'prof_eur_inactive',
                'name' => 'SCB - EUR Account (Deactivated)',
                'currency' => 'EUR',
                'bank_name' => 'Standard Chartered Bank',
                'account_number' => '01-8899776-02',
                'is_active' => false,
                'is_default' => false,
            ],
        ];

        SystemSetting::set('bank_profiles', $profiles, 'json', 'banking');

        $ci = app(CommercialInvoiceService::class)->generateForOrder($this->eurOrder);

        // Should NOT use the inactive SCB profile; must fall back to the active default USD Pubali Bank profile
        $this->assertEquals('Pubali Bank Limited', $ci['bank_details']['bank_name']);
        $this->assertEquals('1788-901-044316', $ci['bank_details']['account_number']);
        $this->assertTrue($ci['bank_details']['is_default']);
    }

    /** TEST 6: Historical document immutability */
    public function test_06_historical_document_immutability_preserved(): void
    {
        $this->configureMultiCurrencyProfiles();

        $originalSubtotal = $this->usdOrder->subtotal;
        $originalTotal = $this->usdOrder->total_amount;
        $originalCurrency = $this->usdOrder->currency;

        // Admin updates bank profiles
        $updatedProfiles = [
            [
                'id' => 'prof_usd_primary',
                'name' => 'Updated Bank USD Account',
                'currency' => 'USD',
                'bank_name' => 'New USD Global Bank',
                'account_number' => '9999-000-111111',
                'account_title' => 'M/S AYAAN  CLOTHING',
                'is_active' => true,
                'is_default' => true,
            ],
        ];
        SystemSetting::set('bank_profiles', $updatedProfiles, 'json', 'banking');

        // Order database fields must NOT be mutated
        $this->usdOrder->refresh();
        $this->assertEquals($originalSubtotal, $this->usdOrder->subtotal);
        $this->assertEquals($originalTotal, $this->usdOrder->total_amount);
        $this->assertEquals($originalCurrency, $this->usdOrder->currency);
    }

    /** TEST 7: Admin edits bank profile -> new document uses new data */
    public function test_07_admin_edits_bank_profile_propagates_to_new_documents(): void
    {
        $payload = [
            'bank_profiles' => [
                [
                    'id' => 'prof_usd_custom',
                    'name' => 'Eastern Bank PLC - USD Trade Unit',
                    'currency' => 'USD',
                    'bank_name' => 'Eastern Bank PLC',
                    'account_title' => 'Ayaan Clothing Ltd.',
                    'account_number' => '1041-029-384756',
                    'swift_code' => 'EBLBDDH',
                    'branch' => 'Principal Branch',
                    'bank_address' => '10 Dilkusha C/A, Dhaka-1000',
                    'is_active' => true,
                    'is_default' => true,
                ],
                [
                    'id' => 'prof_eur_custom',
                    'name' => 'City Bank PLC - EUR Export Unit',
                    'currency' => 'EUR',
                    'bank_name' => 'City Bank PLC',
                    'account_title' => 'Ayaan Clothing Ltd.',
                    'account_number' => '3101-992-883746',
                    'swift_code' => 'CIBLBDDH',
                    'branch' => 'Gulshan Branch',
                    'bank_address' => '136 Gulshan Avenue, Dhaka',
                    'is_active' => true,
                    'is_default' => false,
                ],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', $payload);

        $response->assertStatus(200);

        // Generate documents for USD and EUR orders
        $ciUsd = app(CommercialInvoiceService::class)->generateForOrder($this->usdOrder);
        $ciEur = app(CommercialInvoiceService::class)->generateForOrder($this->eurOrder);

        $this->assertEquals('Eastern Bank PLC', $ciUsd['bank_details']['bank_name']);
        $this->assertEquals('1041-029-384756', $ciUsd['bank_details']['account_number']);

        $this->assertEquals('City Bank PLC', $ciEur['bank_details']['bank_name']);
        $this->assertEquals('3101-992-883746', $ciEur['bank_details']['account_number']);
    }

    /** TEST 8: Public Settings API strictly shields all bank details and profiles */
    public function test_08_public_api_strict_shielding_no_private_banking_leakage(): void
    {
        $this->configureMultiCurrencyProfiles();
        Cache::forget('site_settings_public');

        $response = $this->getJson('/api/v1/settings/public');
        $response->assertStatus(200);
        $data = $response->json('data');

        // Sensitive bank profile lists must NEVER be exposed
        $this->assertArrayNotHasKey('banking', $data);
        $this->assertArrayNotHasKey('bank_profiles', $data);
        $this->assertArrayNotHasKey('bank_name', $data);
        $this->assertArrayNotHasKey('account_number', $data);
        $this->assertArrayNotHasKey('bank_account_number', $data);
        $this->assertArrayNotHasKey('swift_code', $data);
        $this->assertArrayNotHasKey('routing_number', $data);

        // Raw JSON output must not contain bank account numbers or swift codes
        $raw = $response->getContent();
        $this->assertStringNotContainsString('1788-901-044316', $raw);
        $this->assertStringNotContainsString('01-8899776-02', $raw);
        $this->assertStringNotContainsString('PUBABDDH210', $raw);
        $this->assertStringNotContainsString('SCBLBDDX', $raw);
    }

    /** TEST 9: Currency consistency — Document currency, words, and bank match without exchange rate conversion */
    public function test_09_currency_consistency_without_exchange_rate_conversion(): void
    {
        $this->configureMultiCurrencyProfiles();

        // 1. USD Order
        $ciUsd = app(CommercialInvoiceService::class)->generateForOrder($this->usdOrder);
        $this->assertEquals('USD', $ciUsd['financials']['currency']);
        $this->assertEquals('USD', $ciUsd['bank_details']['currency']);
        $this->assertEquals(3000.00, $ciUsd['financials']['grand_total']);
        $this->assertStringStartsWith('US Dollars Three Thousand', $ciUsd['financials']['amount_in_words']);

        // 2. EUR Order
        $ciEur = app(CommercialInvoiceService::class)->generateForOrder($this->eurOrder);
        $this->assertEquals('EUR', $ciEur['financials']['currency']);
        $this->assertEquals('EUR', $ciEur['bank_details']['currency']);
        $this->assertEquals(6000.00, $ciEur['financials']['grand_total']);
        $this->assertStringStartsWith('Euros Six Thousand', $ciEur['financials']['amount_in_words']);

        // 3. GBP Order
        $ciGbp = app(CommercialInvoiceService::class)->generateForOrder($this->gbpOrder);
        $this->assertEquals('GBP', $ciGbp['financials']['currency']);
        $this->assertEquals('GBP', $ciGbp['bank_details']['currency']);
        $this->assertEquals(1550.00, $ciGbp['financials']['grand_total']);
        $this->assertStringStartsWith('Pounds Sterling One Thousand Five Hundred Fifty', $ciGbp['financials']['amount_in_words']);

        // No rate conversion was applied — original order totals remain unchanged
        $this->assertEquals(3000.00, $this->usdOrder->total_amount);
        $this->assertEquals(6000.00, $this->eurOrder->total_amount);
        $this->assertEquals(1550.00, $this->gbpOrder->total_amount);
    }

    /** TEST 10: Server-side validation prevents removing or deactivating all default profiles */
    public function test_10_admin_validation_prevents_invalid_or_missing_default_profiles(): void
    {
        // 1. Empty profiles array rejected
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'bank_profiles' => [],
            ])
            ->assertStatus(422);

        // 2. Unsupported currency rejected
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'bank_profiles' => [
                    [
                        'name' => 'Swiss Account',
                        'currency' => 'CHF', // Not supported
                        'bank_name' => 'UBS',
                        'account_title' => 'Ayaan Clothing',
                        'account_number' => 'CH930000',
                        'is_active' => true,
                        'is_default' => true,
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['bank_profiles.0.currency']);

        // 3. Duplicate active profiles for the same currency rejected
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'bank_profiles' => [
                    [
                        'name' => 'USD Profile 1',
                        'currency' => 'USD',
                        'bank_name' => 'Bank One',
                        'account_title' => 'Ayaan Clothing',
                        'account_number' => '111',
                        'is_active' => true,
                        'is_default' => true,
                    ],
                    [
                        'name' => 'USD Profile 2',
                        'currency' => 'USD',
                        'bank_name' => 'Bank Two',
                        'account_title' => 'Ayaan Clothing',
                        'account_number' => '222',
                        'is_active' => true,
                        'is_default' => false,
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['bank_profiles.1.currency']);

        // 4. Missing Bank Name rejected
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'bank_profiles' => [
                    [
                        'name' => 'Incomplete Profile',
                        'currency' => 'USD',
                        'bank_name' => '',
                        'account_number' => '12345',
                        'is_active' => true,
                        'is_default' => true,
                    ],
                ],
            ])
            ->assertStatus(422);
    }

    /** TEST 11: Security & RBAC — Customer or unauthenticated users cannot modify bank profiles */
    public function test_11_rbac_security_customer_cannot_modify_bank_profiles(): void
    {
        // Unauthenticated
        $this->putJson('/api/v1/admin/settings/business', [
            'bank_profiles' => [
                [
                    'name' => 'Hacked Profile',
                    'currency' => 'USD',
                    'bank_name' => 'Hacked Bank',
                    'account_number' => '999',
                    'is_active' => true,
                    'is_default' => true,
                ],
            ],
        ])->assertStatus(401);

        // Customer
        $this->actingAs($this->customer, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', [
                'bank_profiles' => [
                    [
                        'name' => 'Hacked Profile',
                        'currency' => 'USD',
                        'bank_name' => 'Hacked Bank',
                        'account_number' => '999',
                        'is_active' => true,
                        'is_default' => true,
                    ],
                ],
            ])->assertStatus(403);
    }

    /** TEST 12: Packing List strictly omits bank details; Offer Sheet preserves field boundaries */
    public function test_12_packing_list_and_offer_sheet_field_ownership_preservation(): void
    {
        $this->configureMultiCurrencyProfiles();

        $pl = $this->usdOrder->getCommercialDocument('PACKING_LIST');
        $offer = app(OfferSheetService::class)->generateForOrder($this->usdOrder);

        // Packing List strictly does NOT contain active bank details
        $this->assertNull($pl['bank_details']);
        $this->assertNull($pl['bankDetails']);

        // Offer sheet remains an offer document without price tier leaks
        $this->assertEquals('COMMERCIAL ORDER SHEET', $offer['title']);
        $this->assertFalse($offer['show_all_pricing_tiers']);
    }

    /** TEST 13: PDF byte stream generation renders with correct currency and bank profiles */
    public function test_13_pdf_generation_with_multi_currency_bank_profiles(): void
    {
        $this->configureMultiCurrencyProfiles();

        $pdfService = app(DocumentPdfService::class);

        // 1. USD CI PDF
        $docUsd = app(CommercialInvoiceService::class)->generateForOrder($this->usdOrder);
        $pdfUsd = $pdfService->render($docUsd)->output();

        $this->assertStringStartsWith('%PDF-', $pdfUsd);
        $this->assertStringContainsString('%%EOF', $pdfUsd);
        $this->assertGreaterThan(500, strlen($pdfUsd));

        // 2. EUR PI PDF
        $docEur = app(ProformaInvoiceService::class)->generateForOrder($this->eurOrder);
        $pdfEur = $pdfService->render($docEur)->output();

        $this->assertStringStartsWith('%PDF-', $pdfEur);
        $this->assertStringContainsString('%%EOF', $pdfEur);
        $this->assertGreaterThan(500, strlen($pdfEur));
    }

    /** TEST 14: Centralized WhatsApp setting remains authoritative and uninterrupted */
    public function test_14_whatsapp_centralized_regression(): void
    {
        $waService = app(WhatsAppNormalizationService::class);

        $this->assertEquals('8801620853502', $waService->getCanonicalWhatsApp());
        $this->assertEquals('+880 1620-853502', $waService->getFormattedWhatsApp());
        $this->assertEquals('https://wa.me/8801620853502', $waService->getWhatsAppUrl());
    }
}
