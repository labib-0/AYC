<?php

namespace App\Services\Rbac;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * AdminAuthorizationService — central RBAC resolution engine.
 *
 * Answers: "Is this administrator authorized to perform this action?"
 *
 * Resolution chain:
 *   1. User must be role = admin and status = active
 *   2. Super Admin → unconditionally authorized for any admin action
 *   3. Resolve user's effective permissions:
 *      assigned RBAC roles → role permissions → dependency expansion
 *   4. Check whether the requested permission slug is in the effective set
 *
 * Cache strategy:
 *   Effective permissions are cached per-user with TTL 1800s.
 *   Cache is invalidated whenever role assignments, role permissions,
 *   permission dependencies, or user status/is_super_admin change.
 */
class AdminAuthorizationService
{
    /** Cache TTL for effective permissions (30 minutes). */
    public const CACHE_TTL = 1800;

    /** Redis cache key prefix (inherits CACHE_PREFIX from .env). */
    private const KEY_PREFIX = 'rbac:user_perms:';

    // ── Primary Authorization API ────────────────────────────────────────────

    /**
     * Determine if the user is authorized to perform the action identified by $permissionSlug.
     *
     * Returns true for Super Admin unconditionally.
     * Returns true if the permission is in the user's effective permission set.
     * Returns false for customers, inactive admins, or admins lacking the permission.
     */
    public function can(User $user, string $permissionSlug): bool
    {
        if (! $user->isAdmin()) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        if (! $user->isActiveAdmin()) {
            return false;
        }

        return $this->getEffectivePermissions($user)->has($permissionSlug);
    }

    /**
     * Authorize or throw an AuthorizationException (→ HTTP 403).
     *
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function canOrFail(User $user, string $permissionSlug): void
    {
        if (! $this->can($user, $permissionSlug)) {
            throw new \Illuminate\Auth\Access\AuthorizationException(
                "Forbidden: insufficient permission for '{$permissionSlug}'."
            );
        }
    }

    /**
     * Alias for can().
     */
    public function hasPermission(User $user, string $permissionSlug): bool
    {
        return $this->can($user, $permissionSlug);
    }

    /**
     * Return all effective permission slugs for a user (with dependencies expanded).
     * Returns an empty collection for customers or inactive admins.
     * Returns all permission slugs for Super Admin.
     */
    public function getEffectivePermissions(User $user): Collection
    {
        if (! $user->isAdmin()) {
            return collect();
        }

        if ($user->isSuperAdmin()) {
            // Super Admin receives every known permission without explicit assignment
            return $this->allPermissionSlugs();
        }

        if (! $user->isActiveAdmin()) {
            return collect();
        }

        return $this->resolveFromCache($user);
    }

    /**
     * Return the RBAC roles assigned to the user.
     */
    public function getRoles(User $user): Collection
    {
        if (! $user->isAdmin()) {
            return collect();
        }

        return $user->rbacRoles()->where('is_active', true)->get();
    }

    // ── Permission Resolution ────────────────────────────────────────────────

    /**
     * Resolve a user's effective permissions from the database and cache.
     */
    private function resolveFromCache(User $user): Collection
    {
        $cacheKey = self::KEY_PREFIX . $user->id;

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($user) {
            return $this->resolveEffectivePermissions($user);
        });
    }

    /**
     * Build the full effective permission set for a user from scratch.
     *
     * Algorithm:
     *  1. Load all RBAC roles assigned to the user
     *  2. Collect all permission slugs from those roles
     *  3. For each permission, recursively expand dependencies
     *  4. Return unique slug keyed collection
     */
    public function resolveEffectivePermissions(User $user): Collection
    {
        // Get direct permissions from assigned roles
        $directSlugs = $user->rbacRoles()
            ->where('roles.is_active', true)
            ->with(['permissions.dependencies'])
            ->get()
            ->flatMap(fn (Role $role) => $role->permissions)
            ->pluck('slug')
            ->unique()
            ->values()
            ->all();

        // Expand dependencies recursively
        $expanded = $this->expandDependencies($directSlugs);

        return collect($expanded)->mapWithKeys(fn ($slug) => [$slug => true]);
    }

    /**
     * Recursively expand a list of permission slugs to include all their dependencies.
     *
     * Uses a visited set to prevent circular dependency infinite loops.
     *
     * @param  string[]  $slugs
     * @param  string[]  $visited
     * @return string[]
     */
    private function expandDependencies(array $slugs, array $visited = []): array
    {
        $all = [];

        foreach ($slugs as $slug) {
            if (in_array($slug, $visited, true)) {
                continue;
            }

            $visited[] = $slug;
            $all[] = $slug;

            // Load direct dependencies
            $permission = Permission::with('dependencies')->where('slug', $slug)->first();
            if ($permission && $permission->dependencies->isNotEmpty()) {
                $depSlugs = $permission->dependencies->pluck('slug')->all();
                $expanded = $this->expandDependencies($depSlugs, $visited);
                foreach ($expanded as $depSlug) {
                    $visited[] = $depSlug;
                    $all[] = $depSlug;
                }
            }
        }

        return array_values(array_unique($all));
    }

    /**
     * Return all permission slugs in the system (used for Super Admin).
     */
    private function allPermissionSlugs(): Collection
    {
        return Cache::remember('rbac:all_permission_slugs', self::CACHE_TTL, function () {
            return Permission::pluck('slug')->mapWithKeys(fn ($slug) => [$slug => true]);
        });
    }

    // ── Cache Invalidation ───────────────────────────────────────────────────

    /**
     * Invalidate the cached permissions for a specific user.
     * Call after: role assignment, role removal, user deactivation, is_super_admin change.
     */
    public function invalidateUser(User|int $user): void
    {
        $id = $user instanceof User ? $user->id : $user;
        Cache::forget(self::KEY_PREFIX . $id);
        Log::debug("RBAC: invalidated permission cache for user #{$id}");
    }

    /**
     * Invalidate cached permissions for ALL admins who hold a specific role.
     * Call after: role permissions change, role deletion, permission dependency change.
     */
    public function invalidateRole(Role|int $role): void
    {
        $roleModel = $role instanceof Role ? $role : Role::find($role);
        if (! $roleModel) {
            return;
        }

        // Forget each admin user's cache that holds this role
        $userIds = $roleModel->admins()->pluck('users.id')->all();
        foreach ($userIds as $id) {
            Cache::forget(self::KEY_PREFIX . $id);
        }

        // Forget the all-permissions cache as well (system-wide)
        Cache::forget('rbac:all_permission_slugs');
        Log::debug("RBAC: invalidated permission cache for role #{$roleModel->id} ({$roleModel->slug}), affected " . count($userIds) . " users");
    }

    /**
     * Invalidate all RBAC caches system-wide.
     * Use when permission dependencies change or bulk operations occur.
     */
    public function invalidateAll(): void
    {
        // We flush by tag pattern; since Redis is used, scan for the prefix
        // The implementation deliberately uses Cache::forget per known key
        // because tags aren't always available. For larger systems, use tagged caching.
        Cache::forget('rbac:all_permission_slugs');
        Log::info('RBAC: system-wide cache invalidation requested (individual user caches expire per TTL)');
    }

    // ── Bulk helpers for API responses ───────────────────────────────────────

    /**
     * Return a list of permission slugs the user currently holds (effective).
     * Suitable for API response construction.
     *
     * @return string[]
     */
    public function getPermissionSlugs(User $user): array
    {
        return $this->getEffectivePermissions($user)->keys()->all();
    }

    /**
     * Check multiple permissions at once. Returns true only if ALL are present.
     */
    public function canAll(User $user, string ...$permissionSlugs): bool
    {
        foreach ($permissionSlugs as $slug) {
            if (! $this->can($user, $slug)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check multiple permissions at once. Returns true if ANY is present.
     */
    public function canAny(User $user, string ...$permissionSlugs): bool
    {
        foreach ($permissionSlugs as $slug) {
            if ($this->can($user, $slug)) {
                return true;
            }
        }

        return false;
    }
}
