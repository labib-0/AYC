<?php

namespace Tests\Feature\Settings;

use App\Models\LegalPage;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Settings\WhatsAppNormalizationService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SiteSettingsAndLegalPagesTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $customer;

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

        $this->customer = User::factory()->create([
            'name' => 'Customer Buyer',
            'email' => 'buyer@example.com',
            'role' => 'customer',
            'is_super_admin' => false,
        ]);

        Storage::fake('public');
        Cache::flush();
    }

    /**
     * Test WhatsApp normalization logic deterministically.
     */
    public function test_whatsapp_normalization_logic(): void
    {
        // Bangladesh standard formatted numbers
        $this->assertEquals('8801982183886', WhatsAppNormalizationService::deriveMachineNumber('+880 1982-183886'));
        $this->assertEquals('8801982183886', WhatsAppNormalizationService::deriveMachineNumber('01982-183886'));
        $this->assertEquals('8801982183886', WhatsAppNormalizationService::deriveMachineNumber('8801982183886'));
        $this->assertEquals('8801982183886', WhatsAppNormalizationService::deriveMachineNumber('1982183886'));

        // International numbers
        $this->assertEquals('15552345678', WhatsAppNormalizationService::deriveMachineNumber('+1 (555) 234-5678'));
        $this->assertEquals('442079460958', WhatsAppNormalizationService::deriveMachineNumber('+44 20 7946 0958'));

        // Empty handling
        $this->assertEquals('', WhatsAppNormalizationService::deriveMachineNumber(''));
        $this->assertEquals('', WhatsAppNormalizationService::deriveMachineNumber(null));

        // URL building
        $this->assertEquals('https://wa.me/8801982183886', WhatsAppNormalizationService::buildWhatsAppUrl('8801982183886'));
        $this->assertEquals(
            'https://wa.me/8801982183886?text=Hello%20Ayaan',
            WhatsAppNormalizationService::buildWhatsAppUrl('8801982183886', 'Hello Ayaan')
        );
    }

    /**
     * Test public settings endpoint returns only safe public data and no secrets.
     */
    public function test_public_settings_endpoint_returns_safe_data(): void
    {
        SystemSetting::set('site_title', 'AYAAN CLOTHING LUXURY', 'string', 'branding');
        SystemSetting::set('whatsapp_display', '+880 1982-183886', 'string', 'contact');
        SystemSetting::set('whatsapp_number', '8801982183886', 'string', 'contact');

        $response = $this->getJson('/api/v1/settings/public');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.site_title', 'AYAAN CLOTHING LUXURY')
            ->assertJsonPath('data.whatsapp.display', '+880 1982-183886')
            ->assertJsonPath('data.whatsapp.number', '8801982183886')
            ->assertJsonPath('data.whatsapp.url', 'https://wa.me/8801982183886');

        // Verify secrets are NOT exposed
        $data = $response->json('data');
        $this->assertArrayNotHasKey('database', $data);
        $this->assertArrayNotHasKey('app_key', $data);
        $this->assertArrayNotHasKey('secret', $data);
        $this->assertArrayNotHasKey('password', $data);
    }

    /**
     * Test public legal page endpoint returns content and handles 404 for nonexistent pages.
     */
    public function test_public_legal_page_endpoint(): void
    {
        LegalPage::updateOrCreate(
            ['type' => 'privacy_policy'],
            [
                'title' => 'Privacy Policy & Data Security',
                'content' => '## Commercial Privacy Policy',
                'is_active' => true,
            ]
        );

        $response = $this->getJson('/api/v1/legal/privacy_policy');
        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'Privacy Policy & Data Security')
            ->assertJsonPath('data.content', '## Commercial Privacy Policy');

        // Test slug format with hyphen
        $responseHyphen = $this->getJson('/api/v1/legal/privacy-policy');
        $responseHyphen->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'Privacy Policy & Data Security');

        // Test non-existent page
        $missing = $this->getJson('/api/v1/legal/non_existent_page');
        $missing->assertStatus(404);
    }

    /**
     * Test admin can update site branding, title, whatsapp, and social links.
     */
    public function test_admin_can_update_settings(): void
    {
        $payload = [
            'site_title' => 'Ayaan Premium Apparel',
            'whatsapp_display' => '+880 1711-223344',
            'social_links' => [
                [
                    'provider' => 'facebook',
                    'name' => 'Facebook Official',
                    'url' => 'https://facebook.com/ayaanapparel',
                    'is_active' => true,
                    'sort_order' => 1,
                ],
                [
                    'provider' => 'instagram',
                    'name' => 'Instagram Fashion',
                    'url' => 'https://instagram.com/ayaanapparel',
                    'is_active' => true,
                    'sort_order' => 2,
                ],
                [
                    'provider' => 'x',
                    'name' => 'X News',
                    'url' => 'https://x.com/ayaanapparel',
                    'is_active' => false, // Inactive link
                    'sort_order' => 3,
                ],
            ],
            'footer_description' => 'Custom footer description for export buyers.',
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson('/api/v1/admin/settings', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.site_title', 'Ayaan Premium Apparel')
            ->assertJsonPath('data.whatsapp_display', '+880 1711-223344')
            ->assertJsonPath('data.whatsapp_number', '8801711223344');

        // Check public settings cache invalidation and updated data
        $publicResponse = $this->getJson('/api/v1/settings/public');
        $publicResponse->assertStatus(200)
            ->assertJsonPath('data.site_title', 'Ayaan Premium Apparel')
            ->assertJsonPath('data.whatsapp.number', '8801711223344');

        // Inactive link should NOT appear in public API
        $publicLinks = $publicResponse->json('data.social_links');
        $this->assertCount(2, $publicLinks);
        $this->assertEquals('facebook', $publicLinks[0]['provider']);
        $this->assertEquals('instagram', $publicLinks[1]['provider']);
    }


    /**
     * Test PNG logo upload succeeds and stores to storage/branding.
     */
    public function test_admin_can_upload_valid_png_logo(): void
    {
        $pngImage = UploadedFile::fake()->image('ayaan_logo.png', 300, 100);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/settings/logo', [
                'logo' => $pngImage,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertNotNull(SystemSetting::get('site_logo'));
        $this->assertStringContainsString('storage/branding', SystemSetting::get('site_logo'));
        $this->assertStringEndsWith('.png', SystemSetting::get('site_logo'));

        // Check removal
        $deleteResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson('/api/v1/admin/settings/logo');

        $deleteResponse->assertStatus(200);
        $this->assertNull(SystemSetting::get('site_logo'));
    }

    /**
     * Test SVG logo upload succeeds, sanitizes dangerous scripts, and stores as .svg.
     */
    public function test_admin_can_upload_valid_svg_logo(): void
    {
        $svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="navy"/></svg>';
        $svgFile = UploadedFile::fake()->createWithContent('logo.svg', $svgContent);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/settings/logo', [
                'logo' => $svgFile,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertNotNull(SystemSetting::get('site_logo'));
        $this->assertStringContainsString('storage/branding', SystemSetting::get('site_logo'));
        $this->assertStringEndsWith('.svg', SystemSetting::get('site_logo'));

        // Verify stored content in fake storage
        $storedLogo = SystemSetting::get('site_logo');
        $relativePath = str_replace(asset('storage/'), '', $storedLogo);
        $this->assertTrue(Storage::disk('public')->exists($relativePath));
        $storedContent = Storage::disk('public')->get($relativePath);
        $this->assertStringContainsString('<svg', $storedContent);
        $this->assertStringContainsString('circle', $storedContent);
    }

    /**
     * Test SVG logo with XSS payloads has dangerous scripts stripped during sanitization.
     */
    public function test_svg_logo_with_xss_is_sanitized_before_storing(): void
    {
        $maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert("xss")</script><rect width="50" height="50"/></svg>';
        $svgFile = UploadedFile::fake()->createWithContent('xss.svg', $maliciousSvg);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/settings/logo', [
                'logo' => $svgFile,
            ]);

        $response->assertStatus(200);

        $storedLogo = SystemSetting::get('site_logo');
        $relativePath = str_replace(asset('storage/'), '', $storedLogo);
        $storedContent = Storage::disk('public')->get($relativePath);

        $this->assertStringNotContainsString('onload', $storedContent);
        $this->assertStringNotContainsString('<script', $storedContent);
        $this->assertStringContainsString('rect', $storedContent);
    }

    /**
     * Test unsupported formats (JPG, JPEG, WebP, GIF, malformed SVG) are STRICTLY REJECTED.
     */
    public function test_unsupported_formats_are_strictly_rejected(): void
    {
        // 1. JPG rejected
        $jpgFile = UploadedFile::fake()->image('logo.jpg', 200, 200);
        $respJpg = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/settings/logo', ['logo' => $jpgFile]);
        $respJpg->assertStatus(422);

        // 2. WebP rejected
        $webpFile = UploadedFile::fake()->create('logo.webp', 100, 'image/webp');
        $respWebp = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/settings/logo', ['logo' => $webpFile]);
        $respWebp->assertStatus(422);

        // 3. GIF rejected
        $gifFile = UploadedFile::fake()->image('logo.gif', 50, 50);
        $respGif = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/settings/logo', ['logo' => $gifFile]);
        $respGif->assertStatus(422);

        // 4. Fake file with .png extension but text content (spoofing attempt)
        $spoofedFile = UploadedFile::fake()->create('fake.png', 100, 'text/plain');
        $respSpoof = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/settings/logo', ['logo' => $spoofedFile]);
        $respSpoof->assertStatus(422);

        // 5. Malformed SVG rejected
        $malformedSvg = UploadedFile::fake()->createWithContent('broken.svg', '<<<not xml at all>>>');
        $respBroken = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/settings/logo', ['logo' => $malformedSvg]);
        $respBroken->assertStatus(422);
    }

    /**
     * Test admin can update Legal Pages (Privacy Policy, Terms & Conditions).
     */
    public function test_admin_can_update_legal_pages(): void
    {
        $payload = [
            'title' => 'Ayaan Export Terms & Conditions',
            'content' => "## 1. Commercial Scope\nExport wholesale orders only.\n## 2. MOQ\nMinimum 500 pcs per style.",
            'is_active' => true,
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson('/api/v1/admin/legal/terms_conditions', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'Ayaan Export Terms & Conditions');

        $this->assertDatabaseHas('legal_pages', [
            'type' => 'terms_conditions',
            'title' => 'Ayaan Export Terms & Conditions',
            'is_active' => true,
        ]);

        // Verify public API reflects the update immediately
        $publicResp = $this->getJson('/api/v1/legal/terms_conditions');
        $publicResp->assertStatus(200)
            ->assertJsonPath('data.title', 'Ayaan Export Terms & Conditions');
        $this->assertStringContainsString('Minimum 500 pcs', $publicResp->json('data.content'));
    }

    /**
     * Test RBAC: Customer user cannot access admin settings.
     */
    public function test_customer_cannot_modify_admin_settings(): void
    {
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/settings')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->putJson('/api/v1/admin/settings', ['site_title' => 'Hacked'])
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->putJson('/api/v1/admin/legal/privacy_policy', ['title' => 'Hacked', 'content' => '...', 'is_active' => true])
            ->assertStatus(403);
    }
}
