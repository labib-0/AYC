<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Role — a reusable bundle of permissions that can be assigned to admins.
 *
 * is_system = true → cannot be deleted; only Super Admin can modify.
 * Slugs must be stable: e.g. 'product_publisher', 'order_manager'.
 */
class Role extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_system',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────────────

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions')
            ->withTimestamps();
    }

    /** Admins who hold this role. */
    public function admins(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'admin_roles', 'role_id', 'user_id')
            ->withPivot('assigned_by', 'assigned_at')
            ->withTimestamps();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public static function findBySlug(string $slug): ?static
    {
        return static::where('slug', $slug)->first();
    }

    /** Return all permission slugs assigned to this role (no dependency expansion). */
    public function permissionSlugs(): array
    {
        return $this->permissions()->pluck('slug')->all();
    }
}
