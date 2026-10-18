<?php

namespace Tests\Feature\Seo;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class GoogleTagsSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $customer;
    protected User $staffAdminWithoutPermission;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->create([
            'name' => 'Super Administrator',
            'email' => 'admin@ayaanclothing.com',
            'role' => 'admin',
            'is_super_admin' => true,
            'status' => 'active',
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Storefront Customer',
            'email' => 'customer@example.com',
            'role' => 'customer',
            'status' => 'active',
        ]);

        $this->staffAdminWithoutPermission = User::factory()->create([
            'name' => 'Staff Admin',
            'email' => 'staff@ayaanclothing.com',
            'role' => 'staff',
            'is_super_admin' => false,
            'status' => 'active',
        ]);
    }

    public function test_super_admin_can_retrieve_empty_google_tags(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/homepage/google-tags');

        $response->assertStatus(200)
            ->assertJsonPath('data.head_code', null)
            ->assertJsonPath('data.body_code', null)
            ->assertJsonPath('data.is_head_configured', false)
            ->assertJsonPath('data.is_body_configured', false);
    }

    public function test_super_admin_can_save_head_and_body_code_independently(): void
    {
        $headSnippet = "<!-- Google tag (gtag.js) -->\n<script async src=\"https://www.googletagmanager.com/gtag/js?id=G-TEST9999\"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-TEST9999');\n</script>";
        $bodySnippet = "<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src=\"https://www.googletagmanager.com/ns.html?id=GTM-TEST8888\" height=\"0\" width=\"0\" style=\"display:none;visibility:hidden\"></iframe></noscript>";

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/google-tags', [
                'head_code' => $headSnippet,
                'body_code' => $bodySnippet,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.head_code', $headSnippet)
            ->assertJsonPath('data.body_code', $bodySnippet)
            ->assertJsonPath('data.is_head_configured', true)
            ->assertJsonPath('data.is_body_configured', true);

        // Verify database persistence
        $this->assertEquals($headSnippet, SystemSetting::getGoogleTagHeadCode());
        $this->assertEquals($bodySnippet, SystemSetting::getGoogleTagBodyCode());
    }

    public function test_updating_head_code_does_not_overwrite_existing_body_code(): void
    {
        $existingBody = '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-INITIAL"></iframe></noscript>';
        SystemSetting::setGoogleTags(null, $existingBody);

        $newHead = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-NEWHEAD"></script>';

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/google-tags', [
                'head_code' => $newHead,
                // body_code omitted to verify partial update preservation
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.head_code', $newHead)
            ->assertJsonPath('data.body_code', $existingBody);

        $this->assertEquals($newHead, SystemSetting::getGoogleTagHeadCode());
        $this->assertEquals($existingBody, SystemSetting::getGoogleTagBodyCode());
    }

    public function test_updating_body_code_does_not_overwrite_existing_head_code(): void
    {
        $existingHead = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-EXISTING"></script>';
        SystemSetting::setGoogleTags($existingHead, null);

        $newBody = '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NEWBODY"></iframe></noscript>';

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/google-tags', [
                // head_code omitted
                'body_code' => $newBody,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.head_code', $existingHead)
            ->assertJsonPath('data.body_code', $newBody);

        $this->assertEquals($existingHead, SystemSetting::getGoogleTagHeadCode());
        $this->assertEquals($newBody, SystemSetting::getGoogleTagBodyCode());
    }

    public function test_empty_string_or_null_disables_tracking_code(): void
    {
        SystemSetting::setGoogleTags('<script>tag()</script>', '<noscript>frame</noscript>');

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/google-tags', [
                'head_code' => '',
                'body_code' => null,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.head_code', null)
            ->assertJsonPath('data.body_code', null)
            ->assertJsonPath('data.is_head_configured', false)
            ->assertJsonPath('data.is_body_configured', false);

        $this->assertNull(SystemSetting::getGoogleTagHeadCode());
        $this->assertNull(SystemSetting::getGoogleTagBodyCode());
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $response = $this->postJson('/api/v1/admin/homepage/google-tags', [
            'head_code' => '<script>console.log("unauth")</script>',
        ]);

        $response->assertStatus(401);
    }

    public function test_customer_request_is_rejected_with_403(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/admin/homepage/google-tags', [
                'head_code' => '<script>console.log("customer")</script>',
            ]);

        $response->assertStatus(403);
    }

    public function test_unauthorized_staff_cannot_update_google_tags(): void
    {
        $response = $this->actingAs($this->staffAdminWithoutPermission, 'sanctum')
            ->postJson('/api/v1/admin/homepage/google-tags', [
                'head_code' => '<script>console.log("staff")</script>',
            ]);

        $response->assertStatus(403);
    }

    public function test_oversized_payload_is_rejected_with_422(): void
    {
        // 65537 bytes (exceeds 65536 max limit)
        $oversizedScript = '<script>' . str_repeat('a', 65530) . '</script>';

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/google-tags', [
                'head_code' => $oversizedScript,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['head_code']);
    }

    public function test_admin_homepage_index_exposes_google_tags(): void
    {
        $head = '<script>head_tag()</script>';
        $body = '<noscript>body_tag</noscript>';
        SystemSetting::setGoogleTags($head, $body);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/homepage');

        $response->assertStatus(200)
            ->assertJsonPath('data.google_tag_head_code', $head)
            ->assertJsonPath('data.google_tag_body_code', $body);
    }

    public function test_public_storefront_homepage_exposes_google_tags(): void
    {
        $head = '<script>storefront_head()</script>';
        $body = '<noscript>storefront_body</noscript>';
        SystemSetting::setGoogleTags($head, $body);

        $response = $this->getJson('/api/v1/homepage');

        $response->assertStatus(200)
            ->assertJsonPath('data.google_tag_head_code', $head)
            ->assertJsonPath('data.google_tag_body_code', $body);
    }

    public function test_public_settings_exposes_google_tags_and_invalidates_cache(): void
    {
        Cache::forget('site_settings_public');

        $head = '<script>settings_head()</script>';
        $body = '<noscript>settings_body</noscript>';

        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/google-tags', [
                'head_code' => $head,
                'body_code' => $body,
            ])
            ->assertStatus(200);

        $response = $this->getJson('/api/v1/settings/public');

        $response->assertStatus(200)
            ->assertJsonPath('data.google_tag_head_code', $head)
            ->assertJsonPath('data.google_tag_body_code', $body);
    }

    public function test_saving_google_tags_preserves_unrelated_settings(): void
    {
        SystemSetting::set('hot_sale_visible', true, 'boolean', 'homepage');
        SystemSetting::setGoogleSearchConsoleVerification('gsc_test_token_123');

        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/google-tags', [
                'head_code' => '<script>analytics()</script>',
            ])
            ->assertStatus(200);

        $this->assertTrue(SystemSetting::isHotSaleVisible());
        $this->assertEquals('gsc_test_token_123', SystemSetting::getGoogleSearchConsoleVerification());
    }
}
