<?php

namespace App\Services\Security;

use App\Models\SystemSetting;
use App\Services\Cache\CatalogCacheService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Stevebauman\Location\Facades\Location;

class StorefrontCountryAccessService
{
    private const CACHE_PREFIX = 'geoip_country:';
    private const CACHE_TTL_SECONDS = 1800; // 30 minutes
    private const SETTING_KEY = 'bangladesh_storefront_block_enabled';

    /**
     * Check whether Bangladesh customer storefront restriction is currently enabled.
     * Default: false (Storefront accessible in Bangladesh).
     */
    public function isBlockEnabled(): bool
    {
        return SystemSetting::isBangladeshStorefrontBlockEnabled();
    }

    /**
     * Toggle the Bangladesh customer storefront restriction ON or OFF.
     * Persists to database and immediately purges relevant caches.
     */
    public function setBlockEnabled(bool $enabled): bool
    {
        SystemSetting::setBangladeshStorefrontBlockEnabled($enabled);

        // Invalidate catalog caches so any server-cached storefront pages adapt
        CatalogCacheService::invalidateAll();

        return $this->isBlockEnabled();
    }

    /**
     * Resolve the 2-letter uppercase ISO country code for an IP address.
     * Uses stevebauman/location (configured for local MaxMind GeoLite2 with fallbacks).
     * Caches IP -> country code for 30 minutes.
     * Fail-safe: Returns null on any exception or unresolvable IP.
     */
    public function resolveCountry(?string $ip): ?string
    {
        if (empty($ip)) {
            return null;
        }

        $ip = trim($ip);

        // Validate IP format (supports IPv4 and IPv6)
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return null;
        }

        // Cache resolution for 30 minutes to eliminate repeated lookups
        return Cache::remember(self::CACHE_PREFIX . $ip, self::CACHE_TTL_SECONDS, function () use ($ip) {
            try {
                $position = Location::get($ip);

                if (!$position) {
                    return null;
                }

                $countryCode = $position->countryCode ?? $position->isoCode ?? null;

                if (!empty($countryCode) && is_string($countryCode)) {
                    return strtoupper(trim($countryCode));
                }

                return null;
            } catch (\Throwable $e) {
                // Fail-safe: Rate-limited error logging (at most once every 5 minutes per error hash)
                $errHash = md5($e->getMessage() . $e->getFile() . $e->getLine());
                if (Cache::add('log_geoip_err:' . $errHash, 1, 300)) {
                    Log::warning('StorefrontCountryAccessService: GeoIP lookup failed', [
                        'ip' => $ip,
                        'error' => $e->getMessage(),
                    ]);
                }
                return null;
            }
        });
    }

    /**
     * Evaluate storefront access for an IP address.
     *
     * Rules:
     * 1. If block is OFF -> always ALLOW (blocked = false, allowed = true).
     * 2. If block is ON:
     *    - If country is BD -> BLOCK (blocked = true, allowed = false).
     *    - If country is not BD -> ALLOW (blocked = false, allowed = true).
     *    - If GeoIP lookup fails (null) -> Fail-open ALLOW (blocked = false, allowed = true).
     *
     * @return array{enabled: bool, country: ?string, blocked: bool, allowed: bool}
     */
    public function checkAccess(?string $ip): array
    {
        $enabled = $this->isBlockEnabled();

        if (!$enabled) {
            return [
                'enabled' => false,
                'country' => null,
                'blocked' => false,
                'allowed' => true,
            ];
        }

        $country = $this->resolveCountry($ip);
        $isBangladesh = ($country === 'BD');

        // Only block if confirmed to be BD
        $blocked = $isBangladesh;

        return [
            'enabled' => true,
            'country' => $country,
            'blocked' => $blocked,
            'allowed' => !$blocked,
        ];
    }

    /**
     * Get authoritative status summary for Admin UI.
     */
    public function getStatus(): array
    {
        $dbPath = config('location.maxmind.local.path');
        $settingRecord = SystemSetting::where('key', self::SETTING_KEY)->first();

        return [
            'enabled' => $this->isBlockEnabled(),
            'driver' => config('location.driver', 'Stevebauman\Location\Drivers\MaxMind'),
            'local_database_exists' => is_string($dbPath) && file_exists($dbPath),
            'updated_at' => $settingRecord?->updated_at?->toIso8601String() ?? now()->toIso8601String(),
        ];
    }
}
