<?php

namespace Tests\Feature\Seo;

use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Seo\GoogleVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class GoogleSearchConsoleVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $customer;

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
            'name' => 'Customer User',
            'email' => 'customer@example.com',
            'role' => 'customer',
            'status' => 'active',
        ]);
    }

    public function test_service_parses_raw_valid_token(): void
    {
        $token = 'dBwP_abc123XYZ-9876543210_test';
        $result = GoogleVerificationService::parseAndValidate($token);

        $this->assertTrue($result['valid']);
        $this->assertEquals($token, $result['token']);
        $this->assertNull($result['error']);
    }

    public function test_service_extracts_token_from_full_meta_tag(): void
    {
        $token = 'google1234567890abcdefABCDEF';
        $tag = '<meta name="google-site-verification" content="' . $token . '" />';

        $result = GoogleVerificationService::parseAndValidate($tag);
        $this->assertTrue($result['valid']);
        $this->assertEquals($token, $result['token']);

        // Also test content attribute appearing first
        $tagContentFirst = '<meta content="' . $token . '" name="google-site-verification">';
        $resultContentFirst = GoogleVerificationService::parseAndValidate($tagContentFirst);
        $this->assertTrue($resultContentFirst['valid']);
        $this->assertEquals($token, $resultContentFirst['token']);
    }

    public function test_service_rejects_arbitrary_scripts_and_html(): void
    {
        $scriptInput = '<script>alert("xss")</script>';
        $result = GoogleVerificationService::parseAndValidate($scriptInput);
        $this->assertFalse($result['valid']);
        $this->assertNotNull($result['error']);

        $iframeInput = '<iframe src="https://attacker.com"></iframe>';
        $result = GoogleVerificationService::parseAndValidate($iframeInput);
        $this->assertFalse($result['valid']);

        $eventHandler = '<meta onload="alert(1)" name="google-site-verification" content="abc" />';
        $result = GoogleVerificationService::parseAndValidate($eventHandler);
        $this->assertFalse($result['valid']);
    }

    public function test_service_handles_empty_or_null_as_clear(): void
    {
        $resultNull = GoogleVerificationService::parseAndValidate(null);
        $this->assertTrue($resultNull['valid']);
        $this->assertNull($resultNull['token']);

        $resultEmpty = GoogleVerificationService::parseAndValidate('   ');
        $this->assertTrue($resultEmpty['valid']);
        $this->assertNull($resultEmpty['token']);
    }

    public function test_authorized_administrator_can_save_valid_token_via_dedicated_endpoint(): void
    {
        $token = 'google_verified_token_sample_123456';

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/seo', [
                'google_search_console_verification' => $token,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.google_search_console_verification', $token);

        $this->assertEquals($token, SystemSetting::getGoogleSearchConsoleVerification());
    }

    public function test_authorized_administrator_can_paste_full_meta_tag(): void
    {
        $token = 'extracted_token_abc_xyz_789';
        $fullTag = '<meta name="google-site-verification" content="' . $token . '" />';

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/seo', [
                'google_search_console_verification' => $fullTag,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.google_search_console_verification', $token);

        $this->assertEquals($token, SystemSetting::getGoogleSearchConsoleVerification());
    }

    public function test_authorized_administrator_can_remove_token(): void
    {
        SystemSetting::setGoogleSearchConsoleVerification('existing_token_123');

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/seo', [
                'google_search_console_verification' => '',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.google_search_console_verification', null);

        $this->assertNull(SystemSetting::getGoogleSearchConsoleVerification());
    }

    public function test_unauthenticated_user_cannot_update_verification(): void
    {
        $response = $this->postJson('/api/v1/admin/homepage/seo', [
            'google_search_console_verification' => 'test_token',
        ]);

        $response->assertStatus(401);
    }

    public function test_customer_user_cannot_update_verification(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/admin/homepage/seo', [
                'google_search_console_verification' => 'test_token',
            ]);

        $response->assertStatus(403);
    }

    public function test_dangerous_input_is_rejected_with_422(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/seo', [
                'google_search_console_verification' => '<script>window.location="http://evil.com"</script>',
            ]);

        $response->assertStatus(422);
    }

    public function test_admin_homepage_index_returns_verification_code(): void
    {
        SystemSetting::setGoogleSearchConsoleVerification('token_visible_in_admin_index');

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/homepage');

        $response->assertStatus(200)
            ->assertJsonPath('data.google_search_console_verification', 'token_visible_in_admin_index');
    }

    public function test_public_storefront_homepage_exposes_verification_code(): void
    {
        SystemSetting::setGoogleSearchConsoleVerification('public_storefront_token_12345');

        $response = $this->getJson('/api/v1/homepage');

        $response->assertStatus(200)
            ->assertJsonPath('data.google_search_console_verification', 'public_storefront_token_12345');
    }

    public function test_public_storefront_settings_exposes_verification_code(): void
    {
        Cache::forget('site_settings_public');
        SystemSetting::setGoogleSearchConsoleVerification('public_settings_token_99999');

        $response = $this->getJson('/api/v1/settings/public');

        $response->assertStatus(200)
            ->assertJsonPath('data.google_search_console_verification', 'public_settings_token_99999');
    }

    public function test_saving_seo_preserves_other_homepage_settings(): void
    {
        SystemSetting::set('hot_sale_visible', true, 'boolean', 'homepage');

        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/homepage/seo', [
                'google_search_console_verification' => 'preserve_settings_token',
            ])
            ->assertStatus(200);

        $this->assertTrue(SystemSetting::isHotSaleVisible());
    }
}
