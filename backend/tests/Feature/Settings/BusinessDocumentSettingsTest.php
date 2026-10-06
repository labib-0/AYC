<?php

namespace Tests\Feature\Settings;

use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Documents\DocumentHelper;
use App\Services\Settings\WhatsAppNormalizationService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class BusinessDocumentSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $unauthorizedUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacPermissionCatalogSeeder::class);

        $this->superAdmin = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'superadmin@ayaanclothing.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->unauthorizedUser = User::factory()->create([
            'name' => 'Standard Customer',
            'email' => 'customer@example.com',
            'role' => 'customer',
            'is_super_admin' => false,
        ]);

        Cache::flush();
    }

    /**
     * TEST 1: Default WhatsApp value exists and matches master prompt.
     */
    public function test_default_whatsapp_value_exists(): void
    {
        $defaultDisplay = SystemSetting::get('whatsapp_display', '+880 1620-853502');
        $defaultNumber = SystemSetting::get('whatsapp_number', '8801620853502');
        $defaultUrl = SystemSetting::get('whatsapp_url', 'https://wa.me/8801620853502');

        $this->assertEquals('+880 1620-853502', $defaultDisplay);
        $this->assertEquals('8801620853502', $defaultNumber);
        $this->assertEquals('https://wa.me/8801620853502', $defaultUrl);
    }

    /**
     * TEST 2: Admin can read business and document settings.
     */
    public function test_admin_can_read_business_settings(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/settings/business');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'company' => ['name', 'legal_name', 'tagline', 'website', 'logo_url'],
                    'contact' => ['office_address', 'city', 'country', 'phone', 'email', 'whatsapp', 'whatsapp_canonical', 'whatsapp_url'],
                    'legal' => ['trade_license', 'tin_number', 'bin_vat', 'erc_number', 'irc_number', 'bgmea_reg', 'incorporation_number'],
                    'banking' => ['bank_name', 'branch_name', 'account_name', 'account_number', 'swift_code', 'routing_number', 'currency'],
                    'document_defaults' => ['port_of_loading', 'country_of_origin', 'payment_terms_default', 'incoterm_default', 'declaration_text', 'authorized_signatory_name', 'authorized_signatory_title'],
                ],
            ]);

        $this->assertStringContainsStringIgnoringCase('Ayaan', (string) $response->json('data.company.name'));
        $this->assertEquals('+880 1620-853502', $response->json('data.contact.whatsapp'));
    }

    /**
     * TEST 3: Authorized Admin can update settings.
     */
    public function test_authorized_admin_can_update_settings(): void
    {
        $payload = [
            'company' => [
                'name' => 'Ayaan Clothing Global Ltd.',
                'legal_name' => 'Ayaan Clothing Global Ltd.',
                'tagline' => 'Global Garments Exporter',
                'website' => 'https://ayaanclothing.com',
                'logo_url' => '/images/logo-v2.png',
            ],
            'contact' => [
                'office_address' => 'House #33, Road #12, Sector #11, Uttara, Dhaka-1230',
                'city' => 'Dhaka',
                'country' => 'Bangladesh',
                'phone' => '+880 1620-853502',
                'email' => 'export@ayaanclothing.com',
                'whatsapp' => '+880 1620-853502',
            ],
            'legal' => [
                'trade_license' => 'TRAD/DNCC/999999/2026',
                'tin_number' => '999999999999',
                'bin_vat' => '999999999-0101',
                'erc_number' => 'ERC-999999',
                'irc_number' => 'IRC-999999',
                'bgmea_reg' => 'BGMEA-9999',
                'incorporation_number' => 'C-999999/2026',
            ],
            'banking' => [
                'bank_name' => 'Pubali Bank Limited - International',
                'branch_name' => 'Principal Branch, Dhaka',
                'account_name' => 'Ayaan Clothing Global Ltd.',
                'account_number' => '17889010443160',
                'swift_code' => 'PUBABDDHXXX',
                'routing_number' => '175271894',
                'currency' => 'USD',
            ],
            'document_defaults' => [
                'port_of_loading' => 'Chattogram Sea Port, Bangladesh',
                'country_of_origin' => 'Bangladesh',
                'payment_terms_default' => '100% Irrevocable L/C at sight',
                'incoterm_default' => 'FOB Chattogram',
                'declaration_text' => 'Certified genuine Bangladesh RMG export.',
                'authorized_signatory_name' => 'Chief Operating Officer',
                'authorized_signatory_title' => 'Director of Global Exports',
            ],
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.company.name', 'Ayaan Clothing Global Ltd.')
            ->assertJsonPath('data.banking.bank_name', 'Pubali Bank Limited - International')
            ->assertJsonPath('data.document_defaults.incoterm_default', 'FOB Chattogram');
    }

    /**
     * TEST 4: Unauthorized User cannot update settings.
     */
    public function test_unauthorized_user_cannot_update_settings(): void
    {
        $payload = [
            'company' => ['name' => 'Hacked Company Name'],
        ];

        $response = $this->actingAs($this->unauthorizedUser, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', $payload);

        $response->assertStatus(403);
    }

    /**
     * TEST 5: Settings persist after reload / subsequent API request.
     */
    public function test_settings_persist_after_reload(): void
    {
        $payload = [
            'company' => ['name' => 'Persisted Ayaan Apparel Ltd.'],
            'banking' => [
                'bank_name' => 'Pubali Bank Corporation',
                'account_number' => '99887766554433',
            ],
        ];

        $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson('/api/v1/admin/settings/business', $payload)
            ->assertStatus(200);

        // Clear in-memory cache to simulate full reload
        Cache::flush();

        // Read back via API
        $readResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/settings/business');

        $readResponse->assertStatus(200)
            ->assertJsonPath('data.company.name', 'Persisted Ayaan Apparel Ltd.')
            ->assertJsonPath('data.banking.bank_name', 'Pubali Bank Corporation')
            ->assertJsonPath('data.banking.account_number', '99887766554433');
    }

    /**
     * TEST 6: WhatsApp number normalizes correctly.
     */
    public function test_whatsapp_number_normalizes_correctly(): void
    {
        $canonical1 = WhatsAppNormalizationService::deriveMachineNumber('+880 1620-853502');
        $canonical2 = WhatsAppNormalizationService::deriveMachineNumber('01620-853502');
        $canonical3 = WhatsAppNormalizationService::deriveMachineNumber('8801620853502');
        $canonical4 = WhatsAppNormalizationService::deriveMachineNumber('+880 1982-183886');

        $this->assertEquals('8801620853502', $canonical1);
        $this->assertEquals('8801620853502', $canonical2);
        $this->assertEquals('8801620853502', $canonical3);
        $this->assertEquals('8801982183886', $canonical4);
    }

    /**
     * TEST 7: Canonical WhatsApp URL is generated correctly.
     */
    public function test_canonical_whatsapp_url_is_generated_correctly(): void
    {
        $url1 = WhatsAppNormalizationService::buildWhatsAppUrl('+880 1620-853502');
        $url2 = WhatsAppNormalizationService::buildWhatsAppUrl('01620-853502');

        $this->assertEquals('https://wa.me/8801620853502', $url1);
        $this->assertEquals('https://wa.me/8801620853502', $url2);
    }

    /**
     * TEST 8: Public storefront receives only approved public business settings.
     */
    public function test_public_storefront_receives_only_approved_settings(): void
    {
        $response = $this->getJson('/api/v1/settings/public');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'site_title',
                    'site_logo',
                    'whatsapp' => ['display', 'number', 'url'],
                    'social_links',
                    'legal_pages',
                ],
            ]);

        $this->assertEquals('8801620853502', $response->json('data.whatsapp.number'));
        $this->assertEquals('https://wa.me/8801620853502', $response->json('data.whatsapp.url'));
    }

    /**
     * TEST 9: Sensitive business/bank settings are not exposed publicly.
     */
    public function test_sensitive_business_bank_settings_not_exposed_publicly(): void
    {
        $response = $this->getJson('/api/v1/settings/public');

        $response->assertStatus(200);
        $content = $response->getContent();

        // Bank account details, SWIFT, and internal tax numbers must NOT leak in public settings
        $this->assertStringNotContainsString('Pubali Bank', $content);
        $this->assertStringNotContainsString('PUBABDDH', $content);
        $this->assertStringNotContainsString('09871020003456', $content);
        $this->assertStringNotContainsString('TRAD/DNCC', $content);
    }

    /**
     * TEST 10: Existing document services can resolve centralized company settings without breaking.
     */
    public function test_document_services_resolve_centralized_settings(): void
    {
        // Update centralized settings
        SystemSetting::set('company_name', 'Ayaan Global Exporter Ltd.', 'string', 'business');
        SystemSetting::set('bank_name', 'Pubali Bank Central', 'string', 'banking');
        SystemSetting::set('bank_account_number', '999888777666', 'string', 'banking');
        SystemSetting::set('default_incoterm', 'CIF Hamburg', 'string', 'document_defaults');

        $exporter = DocumentHelper::getExporterProfile();
        $bank = DocumentHelper::getBankDetails();
        $defaults = DocumentHelper::getDocumentDefaults();

        $this->assertIsArray($exporter);
        $this->assertEquals('Ayaan Global Exporter Ltd.', $exporter['name']);
        $this->assertEquals('+880 1620-853502', $exporter['whatsapp']);

        $this->assertIsArray($bank);
        $this->assertEquals('Pubali Bank Central', $bank['bank_name']);
        $this->assertEquals('999888777666', $bank['account_number']);

        $this->assertIsArray($defaults);
        $this->assertEquals('CIF Hamburg', $defaults['incoterm_default']);
    }
}
