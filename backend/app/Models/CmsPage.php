<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CmsPage extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'cms_pages';

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    /**
     * Authoritative list of reserved slugs that cannot be claimed by CMS pages.
     * Prevents collisions with core application routes and system endpoints.
     */
    public const RESERVED_SLUGS = [
        'admin',
        'ayc',
        'api',
        'auth',
        'cart',
        'checkout',
        'compliance',
        'dashboard',
        'faq',
        'login',
        'order-access',
        'privacy-policy',
        'products',
        'profile',
        'rfq',
        'search',
        'signup',
        'terms-and-conditions',
        'wishlist',
        'sitemap',
        'robots',
        'manifest',
        'favicon',
        'images',
        'assets',
        'static',
    ];

    protected $fillable = [
        'title',
        'slug',
        'status',
        'sections',
        'draft_sections',
        'parent_id',
        'breadcrumb_label',
        'show_in_footer',
        'footer_label',
        'footer_sort_order',
        'meta_title',
        'meta_description',
        'canonical_url',
        'og_image_url',
        'is_indexable',
        'scheduled_publish_at',
        'scheduled_unpublish_at',
        'published_at',
        'created_by',
        'updated_by',
        'previous_slugs',
    ];

    protected function casts(): array
    {
        return [
            'sections'               => 'array',
            'draft_sections'         => 'array',
            'previous_slugs'         => 'array',
            'show_in_footer'         => 'boolean',
            'is_indexable'           => 'boolean',
            'footer_sort_order'      => 'integer',
            'published_at'           => 'datetime',
            'scheduled_publish_at'   => 'datetime',
            'scheduled_unpublish_at' => 'datetime',
        ];
    }

    /* ─── SCOPES ─── */

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED)
            ->where(function ($q) {
                $q->whereNull('scheduled_unpublish_at')
                  ->orWhere('scheduled_unpublish_at', '>', now());
            });
    }

    public function scopeFooterVisible(Builder $query): Builder
    {
        return $query->published()
            ->where('show_in_footer', true)
            ->orderBy('footer_sort_order', 'asc')
            ->orderBy('title', 'asc');
    }

    public function scopeIndexable(Builder $query): Builder
    {
        return $query->published()->where('is_indexable', true);
    }

    /* ─── RELATIONSHIPS ─── */

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /* ─── BUSINESS HELPERS ─── */

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }

    /**
     * Atomically promote the working draft into published sections snapshot.
     */
    public function publishDraft(?int $userId = null): bool
    {
        $draft = $this->draft_sections;
        if (!empty($draft)) {
            $this->sections = $draft;
        }

        $this->status = self::STATUS_PUBLISHED;
        $this->published_at = now();
        if ($userId) {
            $this->updated_by = $userId;
        }

        return $this->save();
    }

    public function unpublish(?int $userId = null): bool
    {
        $this->status = self::STATUS_DRAFT;
        if ($userId) {
            $this->updated_by = $userId;
        }
        return $this->save();
    }

    public function archive(?int $userId = null): bool
    {
        $this->status = self::STATUS_ARCHIVED;
        if ($userId) {
            $this->updated_by = $userId;
        }
        return $this->save();
    }
}

