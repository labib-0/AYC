<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
    ];

    /**
     * Get a setting by key with a default fallback.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        if (!$setting || $setting->value === null) {
            return $default;
        }

        return match ($setting->type) {
            'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $setting->value,
            'float' => (float) $setting->value,
            'json' => json_decode($setting->value, true),
            default => $setting->value,
        };
    }

    /**
     * Set a setting by key.
     */
    public static function set(string $key, mixed $value, string $type = 'string', string $group = 'general'): static
    {
        $serialized = match (true) {
            $value === null => null,
            $type === 'boolean' => $value ? '1' : '0',
            $type === 'json' => json_encode($value),
            default => (string) $value,
        };

        return static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $serialized,
                'type' => $type,
                'group' => $group,
            ]
        );
    }

    /**
     * Check whether Aramex shipping is currently enabled.
     * Default: false (DISABLED BY DEFAULT)
     */
    public static function isAramexEnabled(): bool
    {
        return (bool) static::get('aramex_enabled', false);
    }

    /**
     * Check whether Hot Sale section is currently visible on the homepage.
     * Default: true
     */
    public static function isHotSaleVisible(): bool
    {
        return (bool) static::get('hot_sale_visible', true);
    }

    /**
     * Check whether Bangladesh customer storefront restriction is currently enabled.
     * Default: false (DISABLED BY DEFAULT - Storefront accessible in Bangladesh)
     */
    public static function isBangladeshStorefrontBlockEnabled(): bool
    {
        return (bool) static::get('bangladesh_storefront_block_enabled', false);
    }

    /**
     * Set the Bangladesh customer storefront restriction setting.
     */
    public static function setBangladeshStorefrontBlockEnabled(bool $enabled): static
    {
        return static::set('bangladesh_storefront_block_enabled', $enabled, 'boolean', 'security');
    }
}
