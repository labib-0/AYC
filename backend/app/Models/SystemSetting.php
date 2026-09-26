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
        if (!$setting) {
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
        $serialized = match ($type) {
            'boolean' => $value ? '1' : '0',
            'json' => json_encode($value),
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
     * Get the active storewide collection season.
     * Default: "2026 Core Collection"
     */
    public static function getActiveSeason(): string
    {
        return (string) static::get('active_season', '2026 Core Collection');
    }
}
