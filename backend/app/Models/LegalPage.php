<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LegalPage extends Model
{
    protected $fillable = [
        'type',
        'title',
        'content',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public const TYPE_PRIVACY_POLICY = 'privacy_policy';
    public const TYPE_TERMS_CONDITIONS = 'terms_conditions';

    /**
     * Supported legal page types
     */
    public static function supportedTypes(): array
    {
        return [
            self::TYPE_PRIVACY_POLICY,
            self::TYPE_TERMS_CONDITIONS,
        ];
    }
}
