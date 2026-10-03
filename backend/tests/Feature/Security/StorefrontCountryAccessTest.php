<?php

namespace Tests\Feature\Security;

use App\Models\Permission;
use App\Models\Role;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Security\StorefrontCountryAccessService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Stevebauman\Location\Facades\Location;
use Stevebauman\Location\Position;
use Tests\TestCase;

class StorefrontCountryAccessTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $customer;
    protected StorefrontCountryAccessService $service;

    protected const BD_IPV4 = '103.230.104.1';
    protected const BD_IPV6 = '2400:c600:452f:11e1:3cd2:400d:95c5:e35f';
    protected const US_IPV4 = '8.8.8.8';
    protected const US_IPV6 = '2001:4860:4860::8888';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacPermissionCatalogSeeder::class);
        $this->service = app(StorefrontCountryAccessService::class);

        // Super Admin (has super admin bypass / permissions)
        $this->superAdmin = User::factory()->create([
            'name' => 'Super Administrator',
            'email' => 'superadmin@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
            'status' => 'active',
        ]);

        // Regular customer
        $this->customer = User::factory()->create([
            'name' => 'Customer User',
            'email' => 'customer@ayaan-test.local',
            'role' => 'customer',
            'status' => 'active',
        ]);

        // Setup Location::fake with predictable country positions (never call real external network)
        $bdPosition = new Position();
        $bdPosition->countryCode = 'BD';
        $bdPosition->countryName = 'Bangladesh';

        $usPosition = new Position();
        $usPosition->countryCode = 'US';
        $usPosition->countryName = 'United States';

        Location::fake([
            self::BD_IPV4 => $bdPosition,
            self::BD_IPV6 => $bdPosition,
            self::US_IPV4 => $usPosition,
            self::US_IPV6 => $usPosition,
        ]);
    }

    /**
     * 1. Block OFF + Bangladesh -> ALLOWED
     */
    public function test_block_off_with_bangladesh_ip_is_allowed(): void
    {
        $this->service->setBlockEnabled(false);

        $decision = $this->service->checkAccess(self::BD_IPV4);

        $this->assertFalse($decision['enabled']);
        $this->assertFalse($decision['blocked']);
        $this->assertTrue($decision['allowed']);

        // Test via internal endpoint
        $response = $this->withHeaders([
            'X-Internal-Secret' => config('services.internal.secret'),
            'X-Internal-Client-IP' => self::BD_IPV4,
        ])->getJson('/api/v1/internal/storefront/access-check');

        $response->assertStatus(200)
            ->assertJson([
                'allowed' => true,
            ]);
    }

    /**
     * 2. Block ON + Bangladesh -> BLOCKED
     */
    public function test_block_on_with_bangladesh_ip_is_blocked(): void
    {
        $this->service->setBlockEnabled(true);

        $decision = $this->service->checkAccess(self::BD_IPV4);

        $this->assertTrue($decision['enabled']);
        $this->assertEquals('BD', $decision['country']);
        $this->assertTrue($decision['blocked']);
        $this->assertFalse($decision['allowed']);

        // Test via internal endpoint
        $response = $this->withHeaders([
            'X-Internal-Secret' => config('services.internal.secret'),
            'X-Internal-Client-IP' => self::BD_IPV4,
        ])->getJson('/api/v1/internal/storefront/access-check');

        $response->assertStatus(200)
            ->assertJson([
                'allowed' => false,
            ]);
    }

    /**
     * 3. Block ON + Non-Bangladesh -> ALLOWED
     */
    public function test_block_on_with_non_bangladesh_ip_is_allowed(): void
    {
        $this->service->setBlockEnabled(true);

        $decision = $this->service->checkAccess(self::US_IPV4);

        $this->assertTrue($decision['enabled']);
        $this->assertEquals('US', $decision['country']);
        $this->assertFalse($decision['blocked']);
        $this->assertTrue($decision['allowed']);

        // Test via internal endpoint
        $response = $this->withHeaders([
            'X-Internal-Secret' => config('services.internal.secret'),
            'X-Internal-Client-IP' => self::US_IPV4,
        ])->getJson('/api/v1/internal/storefront/access-check');

        $response->assertStatus(200)
            ->assertJson([
                'allowed' => true,
            ]);
    }

    /**
     * IPv6: Block ON + Bangladesh IPv6 -> BLOCKED
     */
    public function test_block_on_with_bangladesh_ipv6_is_blocked(): void
    {
        $this->service->setBlockEnabled(true);

        $decision = $this->service->checkAccess(self::BD_IPV6);

        $this->assertTrue($decision['enabled']);
        $this->assertEquals('BD', $decision['country']);
        $this->assertTrue($decision['blocked']);
        $this->assertFalse($decision['allowed']);

        $response = $this->withHeaders([
            'X-Internal-Secret' => config('services.internal.secret'),
            'X-Internal-Client-IP' => self::BD_IPV6,
        ])->getJson('/api/v1/internal/storefront/access-check');

        $response->assertStatus(200)
            ->assertJson([
                'allowed' => false,
            ]);
    }

    /**
     * 4. Admin route + Bangladesh -> ALLOWED
     * Regardless of block state, /ayc and admin endpoints remain accessible.
     */
    public function test_admin_route_with_bangladesh_ip_remains_accessible(): void
    {
        $this->service->setBlockEnabled(true);

        // Authenticated admin accessing admin homepage endpoints from BD IP
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->withServerVariables(['REMOTE_ADDR' => self::BD_IPV4])
            ->getJson('/api/v1/admin/homepage/bangladesh-storefront-access');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'enabled' => true,
                ],
            ]);
    }

    /**
     * 5. API route + Bangladesh -> Existing behavior
     * Public and customer REST APIs are NOT blocked by storefront country lock.
     */
    public function test_api_route_with_bangladesh_ip_preserves_existing_behavior(): void
    {
        $this->service->setBlockEnabled(true);

        // Public health endpoint
        $healthResponse = $this->withServerVariables(['REMOTE_ADDR' => self::BD_IPV4])
            ->getJson('/api/v1/health');

        $healthResponse->assertStatus(200);

        // Public homepage catalog endpoint
        $homepageResponse = $this->withServerVariables(['REMOTE_ADDR' => self::BD_IPV4])
            ->getJson('/api/v1/homepage');

        $homepageResponse->assertStatus(200);
    }

    /**
     * 6. Storage route + Bangladesh -> Existing behavior
     */
    public function test_storage_and_media_routes_preserve_existing_behavior(): void
    {
        $this->service->setBlockEnabled(true);

        // Non-storefront media/upload routes remain governed by their own auth
        $unauthUpload = $this->withServerVariables(['REMOTE_ADDR' => self::BD_IPV4])
            ->postJson('/api/v1/upload');

        $unauthUpload->assertStatus(401);
    }

    /**
     * 7. GeoIP lookup failure -> FAIL OPEN (ALLOWED)
     * If GeoIP service is down or returns null, visitors are not randomly blocked.
     */
    public function test_geoip_lookup_failure_preserves_storefront_access_fail_open(): void
    {
        $this->service->setBlockEnabled(true);

        // IP that cannot be resolved (not in fake table)
        $unknownIp = '198.51.100.99';

        $decision = $this->service->checkAccess($unknownIp);

        $this->assertTrue($decision['enabled']);
        $this->assertNull($decision['country']);
        $this->assertFalse($decision['blocked']);
        $this->assertTrue($decision['allowed']);

        // Via internal endpoint
        $response = $this->withHeaders([
            'X-Internal-Secret' => config('services.internal.secret'),
            'X-Internal-Client-IP' => $unknownIp,
        ])->getJson('/api/v1/internal/storefront/access-check');

        $response->assertStatus(200)
            ->assertJson([
                'allowed' => true,
            ]);
    }

    /**
     * 8. Unauthorized Admin toggle -> FORBIDDEN
     */
    public function test_unauthorized_user_cannot_toggle_setting(): void
    {
        // Unauthenticated
        $this->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
            'enabled' => true,
        ])->assertStatus(401);

        // Customer
        $this->actingAs($this->customer, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
                'enabled' => true,
            ])->assertStatus(403);

        // Restricted admin without homepage.banner.edit permission
        $restrictedAdmin = User::factory()->create([
            'name' => 'Restricted Admin',
            'email' => 'restricted@ayaan-demo.local',
            'role' => 'admin',
            'is_super_admin' => false,
            'status' => 'active',
        ]);

        $this->actingAs($restrictedAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
                'enabled' => true,
            ])->assertStatus(403);
    }

    /**
     * 8b. Restricted Admin WITH permission CAN toggle
     */
    public function test_restricted_admin_with_permission_can_toggle(): void
    {
        $admin = User::factory()->create([
            'name' => 'Homepage Admin',
            'email' => 'homepage_admin@ayaan-demo.local',
            'role' => 'admin',
            'is_super_admin' => false,
            'status' => 'active',
        ]);

        $role = Role::create([
            'name' => 'Homepage Editor',
            'slug' => 'role_homepage_editor_' . uniqid(),
            'is_system' => false,
            'is_active' => true,
        ]);

        $perm = Permission::where('slug', 'homepage.banner.edit')->first();
        if ($perm) {
            $role->permissions()->attach($perm->id);
            $admin->rbacRoles()->attach($role->id, [
                'assigned_by' => $this->superAdmin->id,
                'assigned_at' => now(),
            ]);
        }

        Cache::flush();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
                'enabled' => true,
            ])
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'enabled' => true,
                ],
            ]);
    }

    /**
     * 9. Authorized Admin toggle -> SUCCESS
     */
    public function test_authorized_admin_can_toggle_setting(): void
    {
        $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
                'enabled' => true,
            ])
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'enabled' => true,
                ],
            ]);

        $this->assertTrue($this->service->isBlockEnabled());

        // Toggle back OFF
        $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/homepage/bangladesh-storefront-access', [
                'enabled' => false,
            ])
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'enabled' => false,
                ],
            ]);

        $this->assertFalse($this->service->isBlockEnabled());
    }

    /**
     * 10. Toggle persistence in database
     */
    public function test_toggle_persistence_in_database(): void
    {
        $this->service->setBlockEnabled(true);

        $this->assertDatabaseHas('system_settings', [
            'key' => 'bangladesh_storefront_block_enabled',
            'value' => '1',
        ]);

        $this->service->setBlockEnabled(false);

        $this->assertDatabaseHas('system_settings', [
            'key' => 'bangladesh_storefront_block_enabled',
            'value' => '0',
        ]);
    }

    /**
     * 11. Cache invalidation after toggle
     */
    public function test_cache_invalidation_after_toggle(): void
    {
        $this->service->setBlockEnabled(true);

        // Check for BD IP gives blocked
        $decision1 = $this->service->checkAccess(self::BD_IPV4);
        $this->assertTrue($decision1['blocked']);

        // Toggle OFF
        $this->service->setBlockEnabled(false);

        // Next check for the same BD IP immediately returns allowed
        $decision2 = $this->service->checkAccess(self::BD_IPV4);
        $this->assertFalse($decision2['blocked']);
        $this->assertTrue($decision2['allowed']);
    }

    /**
     * 12. Internal endpoint cannot be abused publicly
     */
    public function test_internal_endpoint_cannot_be_abused_without_valid_secret(): void
    {
        // No header
        $this->getJson('/api/v1/internal/storefront/access-check')
            ->assertStatus(403)
            ->assertJson([
                'error' => 'Unauthorized internal request.',
            ]);

        // Wrong secret
        $this->withHeaders([
            'X-Internal-Secret' => 'invalid-fake-secret',
            'X-Internal-Client-IP' => self::BD_IPV4,
        ])->getJson('/api/v1/internal/storefront/access-check')
            ->assertStatus(403)
            ->assertJson([
                'error' => 'Unauthorized internal request.',
            ]);
    }

    /**
     * 13. Internal endpoint strictly rejects query parameter IP spoofing
     */
    public function test_internal_endpoint_strictly_rejects_query_parameter_ip_spoofing(): void
    {
        // Even with valid secret, attempting to pass ?ip= is rejected
        $response = $this->withHeaders([
            'X-Internal-Secret' => config('services.internal.secret'),
            'X-Internal-Client-IP' => self::BD_IPV4,
        ])->getJson('/api/v1/internal/storefront/access-check?ip=8.8.8.8');

        $response->assertStatus(400)
            ->assertJson([
                'error' => 'Query parameter ip is forbidden. Client IP must be supplied via trusted internal header.',
            ]);
    }

    /**
     * 14. Internal endpoint requires valid X-Internal-Client-IP header
     */
    public function test_internal_endpoint_requires_valid_internal_client_ip_header(): void
    {
        // Missing X-Internal-Client-IP header
        $this->withHeaders([
            'X-Internal-Secret' => config('services.internal.secret'),
        ])->getJson('/api/v1/internal/storefront/access-check')
            ->assertStatus(400)
            ->assertJson([
                'error' => 'Missing or invalid X-Internal-Client-IP header.',
            ]);

        // Malformed IP in header
        $this->withHeaders([
            'X-Internal-Secret' => config('services.internal.secret'),
            'X-Internal-Client-IP' => 'invalid-ip-format',
        ])->getJson('/api/v1/internal/storefront/access-check')
            ->assertStatus(400)
            ->assertJson([
                'error' => 'Missing or invalid X-Internal-Client-IP header.',
            ]);
    }

    /**
     * 15. Block ON + Non-Bangladesh IPv6 -> ALLOWED
     */
    public function test_block_on_with_non_bangladesh_ipv6_is_allowed(): void
    {
        $this->service->setBlockEnabled(true);

        $decision = $this->service->checkAccess(self::US_IPV6);

        $this->assertTrue($decision['enabled']);
        $this->assertEquals('US', $decision['country']);
        $this->assertFalse($decision['blocked']);
        $this->assertTrue($decision['allowed']);

        $response = $this->withHeaders([
            'X-Internal-Secret' => config('services.internal.secret'),
            'X-Internal-Client-IP' => self::US_IPV6,
        ])->getJson('/api/v1/internal/storefront/access-check');

        $response->assertStatus(200)
            ->assertJson([
                'allowed' => true,
            ]);
    }

    /**
     * 16. Invalid IP format -> returns null and fails open safely
     */
    public function test_invalid_ip_format_returns_null_and_fails_open_safely(): void
    {
        $this->service->setBlockEnabled(true);

        $decision = $this->service->checkAccess('not-a-valid-ip');

        $this->assertTrue($decision['enabled']);
        $this->assertNull($decision['country']);
        $this->assertFalse($decision['blocked']);
        $this->assertTrue($decision['allowed']);
    }

    /**
     * 17. geoip:status artisan command outputs metadata and succeeds
     */
    public function test_geoip_status_artisan_command_returns_success_and_metadata(): void
    {
        $this->artisan('geoip:status')
            ->assertExitCode(0)
            ->expectsOutputToContain('MAXMIND GEOIP DATABASE DIAGNOSTIC STATUS')
            ->expectsOutputToContain('HEALTHY');
    }

    /**
     * 18. geoip:status --json outputs valid JSON structure
     */
    public function test_geoip_status_json_option_returns_valid_json(): void
    {
        $output = '';
        \Illuminate\Support\Facades\Artisan::call('geoip:status', ['--json' => true]);
        $output = \Illuminate\Support\Facades\Artisan::output();

        $decoded = json_decode($output, true);
        $this->assertIsArray($decoded);
        $this->assertArrayHasKey('database_exists', $decoded);
        $this->assertArrayHasKey('health_status', $decoded);
        $this->assertArrayHasKey('is_valid', $decoded);
        $this->assertTrue($decoded['is_valid']);
        $this->assertEquals('GeoLite2-Country', $decoded['metadata']['database_type']);
    }

    /**
     * 19. GeoIpDatabaseManager validates authentic database and rejects corrupted file
     */
    public function test_geoip_database_manager_validates_authentic_file_and_rejects_corrupted_file(): void
    {
        $manager = app(\App\Services\Security\GeoIpDatabaseManager::class);
        $activeDbPath = $manager->getDatabasePath();

        // Active database must validate successfully
        $this->assertTrue($manager->validateDatabaseFile($activeDbPath));

        // Create a temporary corrupted file (small random text)
        $corruptFile = tempnam(sys_get_temp_dir(), 'corrupt_mmdb_');
        file_put_contents($corruptFile, 'not-a-real-maxmind-database');

        $this->assertFalse($manager->validateDatabaseFile($corruptFile));

        @unlink($corruptFile);
    }

    /**
     * 20. Invalidate GeoIP cache bumps version salt
     */
    public function test_geoip_cache_invalidation_bumps_cache_salt(): void
    {
        $manager = app(\App\Services\Security\GeoIpDatabaseManager::class);

        $initialSalt = (int) Cache::get(\App\Services\Security\GeoIpDatabaseManager::CACHE_SALT_KEY, 1);
        $manager->invalidateGeoIpCache();
        $newSalt = (int) Cache::get(\App\Services\Security\GeoIpDatabaseManager::CACHE_SALT_KEY, 1);

        $this->assertGreaterThan($initialSalt, $newSalt);
    }
}
