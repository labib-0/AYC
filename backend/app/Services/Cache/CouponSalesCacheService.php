<?php

namespace App\Services\Cache;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class CouponSalesCacheService
{
    public const TTL_SUMMARY = 300; // 5 minutes
    public const TTL_OVERVIEW = 300; // 5 minutes

    private const GLOBAL_VERSION_KEY = 'coupon_sales:global_version';
    private const ADMIN_VERSION_PREFIX = 'coupon_sales:admin_version:';

    /**
     * Get the current global coupon sales cache version.
     */
    public static function getGlobalVersion(): int
    {
        return (int) Cache::get(self::GLOBAL_VERSION_KEY, 1);
    }

    /**
     * Invalidate all global coupon sales caches (Super Admin view).
     */
    public static function invalidateGlobal(): void
    {
        if (!Cache::has(self::GLOBAL_VERSION_KEY)) {
            Cache::forever(self::GLOBAL_VERSION_KEY, 2);
        } else {
            Cache::increment(self::GLOBAL_VERSION_KEY);
        }
    }

    /**
     * Get the current version for a specific administrator's bound scope.
     */
    public static function getAdminVersion(int $adminUserId): int
    {
        return (int) Cache::get(self::ADMIN_VERSION_PREFIX . $adminUserId, 1);
    }

    /**
     * Invalidate cached data for a specific administrator.
     */
    public static function invalidateAdmin(int $adminUserId): void
    {
        $key = self::ADMIN_VERSION_PREFIX . $adminUserId;
        if (!Cache::has($key)) {
            Cache::forever($key, 2);
        } else {
            Cache::increment($key);
        }
    }

    /**
     * Invalidate both global and specific admin caches when bindings change.
     */
    public static function invalidateForBinding(int $adminUserId): void
    {
        self::invalidateAdmin($adminUserId);
        self::invalidateGlobal();
    }

    /**
     * Generate an isolated summary cache key.
     */
    public static function summaryKey(User $user, array $params = []): string
    {
        ksort($params);
        $filterHash = md5(json_encode($params));

        if ($user->isSuperAdmin()) {
            $version = self::getGlobalVersion();
            return "coupon_sales:v{$version}:super_admin:summary:{$filterHash}";
        }

        $version = self::getAdminVersion($user->id);
        return "coupon_sales:v{$version}:admin_{$user->id}:summary:{$filterHash}";
    }

    /**
     * Generate an isolated coupons-overview cache key for Super Admin.
     */
    public static function overviewKey(User $user, array $params = []): string
    {
        ksort($params);
        $filterHash = md5(json_encode($params));
        $version = self::getGlobalVersion();

        return "coupon_sales:v{$version}:super_admin:overview:{$filterHash}";
    }

    /**
     * Retrieve or compute cached item.
     */
    public static function remember(string $key, int $ttl, callable $callback): mixed
    {
        return Cache::remember($key, $ttl, $callback);
    }
}
