<?php

namespace Tests\Feature\Admin;

use App\Models\Activity;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Security\CloudflareSecurityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BangladeshStorefrontAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $restrictedAdmin;
    private User $customer;

    private string $fakeZoneId = 'fake-zone-12345';
    private string $fakeRulesetId = 'fake-ruleset-67890';
    private string $fakeRuleId = 'fake-rule-abcde';
    private string $fakeApiToken = 'fake-token-xyz';

    private string $validExpression = '(ip.src.country eq "BD" and http.host in {"ayaanclothing.com" "www.ayaanclothing.com"} and (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/products") or starts_with(http.request.uri.path, "/search") or starts_with(http.request.uri.path, "/shop") or starts_with(http.request.uri.path, "/categories") or starts_with(http.request.uri.path, "/brands") or starts_with(http.request.uri.path, "/dashboard") or starts_with(http.request.uri.path, "/profile") or starts_with(http.request.uri.path, "/rfq") or starts_with(http.request.uri.path, "/order-access") or starts_with(http.request.uri.path, "/auth/") or http.request.uri.path in {"/login" "/signup" "/privacy-policy" "/terms-and-conditions"}))';

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Super Admin with all privileges
        $this->superAdmin = User::factory()->create([
            'name' => 'Super Administrator',
            'email' => 'superadmin@ayaan.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        // 2. Restricted Admin without homepage banner edit permission
        $this->restrictedAdmin = User::factory()->create([
            'name' => 'Restricted Admin',
            'email' => 'restricted@ayaan.com',
            'role' => 'admin',
            'is_super_admin' => false,
        ]);

        // 3. Regular Customer
        $this->customer = User::factory()->create([
            'name' => 'Regular Customer',
            'email' => 'customer@ayaan.com',
            'role' => 'customer',
            'is_super_admin' => false,
        ]);

        // Configure Cloudflare credentials in test environment
        Config::set('services.cloudflare.api_token', $this->fakeApiToken);
        Config::set('services.cloudflare.zone_id', $this->fakeZoneId);
        Config::set('services.cloudflare.ruleset_id', $this->fakeRulesetId);
        Config::set('services.cloudflare.rule_id', $this->fakeRuleId);
    }

    public function test_unauthenticated_user_cannot_access_bangladesh_storefront_endpoints(): void
    {
        $this->getJson('/api/v1/admin/homepage/bangladesh-storefront-access')
            ->assertStatus(401);

        $this->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', ['enabled' => true])
            ->assertStatus(401);
    }

    public function test_customer_is_forbidden_from_bangladesh_storefront_endpoints(): void
    {
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/homepage/bangladesh-storefront-access')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', ['enabled' => true])
            ->assertStatus(403);
    }

    public function test_restricted_admin_without_permissions_is_forbidden_from_toggling(): void
    {
        $this->actingAs($this->restrictedAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', ['enabled' => true])
            ->assertStatus(403);
    }

    public function test_authorized_admin_can_retrieve_real_cloudflare_rule_state(): void
    {
        Http::fake([
            "https://api.cloudflare.com/client/v4/zones/{$this->fakeZoneId}/rulesets/{$this->fakeRulesetId}/rules/{$this->fakeRuleId}" => Http::response([
                'success' => true,
                'result' => [
                    'id' => $this->fakeRuleId,
                    'action' => 'block',
                    'description' => 'Storefront Only Bangladesh Geo-Restriction',
                    'expression' => $this->validExpression,
                    'enabled' => true,
                    'last_updated' => '2026-10-03T12:00:00Z',
                ],
            ], 200),
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/homepage/bangladesh-storefront-access');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.status', 'blocked')
            ->assertJsonPath('data.cloudflare_configured', true)
            ->assertJsonPath('data.cloudflare_rule.enabled', true);
    }

    public function test_authorized_admin_can_toggle_on_updates_exact_cloudflare_rule(): void
    {
        $ruleEnabled = false;

        Http::fake(function ($request) use (&$ruleEnabled) {
            if ($request->method() === 'PATCH') {
                $ruleEnabled = (bool) $request['enabled'];
                return Http::response([
                    'success' => true,
                    'result' => [
                        'id' => $this->fakeRuleId,
                        'action' => 'block',
                        'description' => 'Storefront Only Bangladesh Geo-Restriction',
                        'expression' => $this->validExpression,
                        'enabled' => $ruleEnabled,
                    ],
                ], 200);
            }

            return Http::response([
                'success' => true,
                'result' => [
                    'id' => $this->fakeRuleId,
                    'action' => 'block',
                    'description' => 'Storefront Only Bangladesh Geo-Restriction',
                    'expression' => $this->validExpression,
                    'enabled' => $ruleEnabled,
                ],
            ], 200);
        });

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
                'enabled' => true,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.status', 'blocked');

        // Verify exact Cloudflare PATCH call with expected payload
        Http::assertSent(function ($request) {
            return $request->method() === 'PATCH' &&
                   str_contains($request->url(), "/zones/{$this->fakeZoneId}/rulesets/{$this->fakeRulesetId}/rules/{$this->fakeRuleId}") &&
                   $request['enabled'] === true;
        });

        // Verify Audit Log was recorded
        $log = Activity::where('action', 'BANGLADESH_STOREFRONT_BLOCK')->latest()->first();
        $this->assertNotNull($log, 'Audit log for BANGLADESH_STOREFRONT_BLOCK was not found.');
        $this->assertEquals('ENABLED', $log->metadata['action']);
        $this->assertEquals('blocked', $log->metadata['status']);
        $this->assertEquals($this->superAdmin->email, $log->metadata['changed_by']);
    }

    public function test_authorized_admin_can_toggle_off_updates_exact_cloudflare_rule(): void
    {
        $ruleEnabled = true;

        Http::fake(function ($request) use (&$ruleEnabled) {
            if ($request->method() === 'PATCH') {
                $ruleEnabled = (bool) $request['enabled'];
                return Http::response([
                    'success' => true,
                    'result' => [
                        'id' => $this->fakeRuleId,
                        'action' => 'block',
                        'description' => 'Storefront Only Bangladesh Geo-Restriction',
                        'expression' => $this->validExpression,
                        'enabled' => $ruleEnabled,
                    ],
                ], 200);
            }

            return Http::response([
                'success' => true,
                'result' => [
                    'id' => $this->fakeRuleId,
                    'action' => 'block',
                    'description' => 'Storefront Only Bangladesh Geo-Restriction',
                    'expression' => $this->validExpression,
                    'enabled' => $ruleEnabled,
                ],
            ], 200);
        });

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
                'enabled' => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.enabled', false)
            ->assertJsonPath('data.status', 'accessible');

        // Verify exact Cloudflare PATCH call with enabled = false
        Http::assertSent(function ($request) {
            return $request->method() === 'PATCH' &&
                   str_contains($request->url(), "/zones/{$this->fakeZoneId}/rulesets/{$this->fakeRulesetId}/rules/{$this->fakeRuleId}") &&
                   $request['enabled'] === false;
        });

        // Verify Audit Log was recorded
        $log = Activity::where('action', 'BANGLADESH_STOREFRONT_BLOCK')->latest()->first();
        $this->assertNotNull($log);
        $this->assertEquals('DISABLED', $log->metadata['action']);
        $this->assertEquals('accessible', $log->metadata['status']);
    }

    public function test_cloudflare_api_failure_preserves_previous_state(): void
    {
        Http::fake(function ($request) {
            if ($request->method() === 'PATCH') {
                return Http::response([
                    'success' => false,
                    'errors' => [
                        ['message' => 'Internal Cloudflare WAF Error'],
                    ],
                ], 500);
            }

            return Http::response([
                'success' => true,
                'result' => [
                    'id' => $this->fakeRuleId,
                    'action' => 'block',
                    'description' => 'Storefront Only Bangladesh Geo-Restriction',
                    'expression' => $this->validExpression,
                    'enabled' => true,
                ],
            ], 200);
        });

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
                'enabled' => false,
            ]);

        $response->assertStatus(500)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Unable to update Bangladesh storefront access. The Cloudflare configuration was not changed.');
    }

    public function test_malformed_payload_is_rejected(): void
    {
        $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
                'enabled' => 'not-a-boolean',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['enabled']);

        $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['enabled']);
    }

    public function test_rule_expression_validation_rejects_unsafe_rules(): void
    {
        $service = new CloudflareSecurityService();

        // 1. Missing BD check
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Rule does not target ip.src.country "BD"');
        $service->validateRuleExpression('(ip.src.country eq "IN" and http.request.uri.path eq "/")');
    }

    public function test_rule_expression_validation_rejects_admin_targeting_rules(): void
    {
        $service = new CloudflareSecurityService();

        // Attempts to block admin
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Rule illegally targets Admin (/ayc) route');
        $service->validateRuleExpression('(ip.src.country eq "BD" and http.request.uri.path eq "/ayc")');
    }

    public function test_rule_expression_validation_rejects_catch_all_rules(): void
    {
        $service = new CloudflareSecurityService();

        // Catch-all without path matching
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Rule lacks route matching constraints');
        $service->validateRuleExpression('(ip.src.country eq "BD")');
    }
}
