<?php

namespace App\Services\Rbac;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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

        $cached = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($user) {
            return $this->resolveEffectivePermissions($user)->all();
        });

        if ($cached instanceof Collection) {
            return $cached;
        }

        return is_array($cached) ? collect($cached) : collect([]);
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
        $cached = Cache::remember('rbac:all_permission_slugs', self::CACHE_TTL, function () {
            return Permission::pluck('slug')->mapWithKeys(fn ($slug) => [$slug => true])->all();
        });

        if ($cached instanceof Collection) {
            return $cached;
        }

        return is_array($cached) ? collect($cached) : collect([]);
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
        Cache::forget('rbac:all_permission_slugs');
        $adminIds = User::where('role', User::ROLE_ADMIN)->pluck('id')->all();
        foreach ($adminIds as $id) {
            Cache::forget(self::KEY_PREFIX . $id);
        }
        Log::info('RBAC: system-wide cache invalidation executed for ' . count($adminIds) . ' admins');
    }

    /**
     * Determine whether adding a dependency ($permissionId requires $requiresPermissionId)
     * would introduce a circular dependency (e.g. A -> B -> C -> A).
     */
    public function wouldCreateCycle(int $permissionId, int $requiresPermissionId): bool
    {
        if ($permissionId === $requiresPermissionId) {
            return true;
        }

        // BFS traversal from $requiresPermissionId to verify if it already depends on $permissionId
        $visited = [];
        $queue = [$requiresPermissionId];

        while (! empty($queue)) {
            $currentId = array_shift($queue);
            if ($currentId === $permissionId) {
                return true; // Cycle detected!
            }

            if (in_array($currentId, $visited, true)) {
                continue;
            }
            $visited[] = $currentId;

            $deps = DB::table('permission_dependencies')
                ->where('permission_id', $currentId)
                ->pluck('requires_permission_id')
                ->all();

            foreach ($deps as $depId) {
                if (! in_array((int) $depId, $visited, true)) {
                    $queue[] = (int) $depId;
                }
            }
        }

        return false;
    }

    /**
     * Add a dependency relationship safely, preventing circular dependencies.
     * Throws InvalidArgumentException if a cycle is detected.
     */
    public function addDependency(int|Permission $permission, int|Permission $requires): bool
    {
        $permId = $permission instanceof Permission ? $permission->id : $permission;
        $reqId = $requires instanceof Permission ? $requires->id : $requires;

        if ($this->wouldCreateCycle($permId, $reqId)) {
            throw new \InvalidArgumentException("Circular permission dependency detected: cannot make permission #{$permId} require #{$reqId}.");
        }

        DB::table('permission_dependencies')->updateOrInsert([
            'permission_id' => $permId,
            'requires_permission_id' => $reqId,
        ], [
            'updated_at' => now(),
            'created_at' => now(),
        ]);

        $this->invalidateAll();

        return true;
    }

    /**
     * Remove a dependency relationship safely and invalidate relevant caches.
     */
    public function removeDependency(int|Permission $permission, int|Permission $requires): bool
    {
        $permId = $permission instanceof Permission ? $permission->id : $permission;
        $reqId = $requires instanceof Permission ? $requires->id : $requires;

        DB::table('permission_dependencies')
            ->where('permission_id', $permId)
            ->where('requires_permission_id', $reqId)
            ->delete();

        $this->invalidateAll();

        return true;
    }

    /**
     * Return a detailed map of effective permissions with their provenance (sources).
     * Distinguishes directly assigned permissions from those inherited as dependencies.
     *
     * Format:
     * [
     *   'product.view' => [
     *     'slug' => 'product.view',
     *     'name' => 'View Products',
     *     'module' => 'Catalog',
     *     'description' => '...',
     *     'is_direct' => true,
     *     'direct_roles' => ['Product Draft Editor'],
     *     'is_inherited' => false,
     *     'inherited_from' => [],
     *   ],
     *   ...
     * ]
     *
     * @return array<string, array>
     */
    public function getPermissionSourceMap(User $user): array
    {
        if (! $user->isAdmin()) {
            return [];
        }

        // All system permissions indexed by slug
        $allPermissions = Permission::with('dependencies')->get()->keyBy('slug');

        if ($user->isSuperAdmin()) {
            $result = [];
            foreach ($allPermissions as $slug => $perm) {
                $result[$slug] = [
                    'slug'           => $slug,
                    'name'           => $perm->name,
                    'module'         => $perm->module,
                    'action'         => $perm->action,
                    'description'    => $perm->description,
                    'is_direct'      => true,
                    'direct_roles'   => ['Super Admin Authority'],
                    'is_inherited'   => false,
                    'inherited_from' => [],
                ];
            }
            return $result;
        }

        if (! $user->isActiveAdmin()) {
            return [];
        }

        // 1. Direct assignments from active roles
        $directMap = []; // slug => [role_names]
        $roles = $user->rbacRoles()->where('roles.is_active', true)->with('permissions')->get();

        foreach ($roles as $role) {
            foreach ($role->permissions as $perm) {
                $directMap[$perm->slug][] = $role->name;
            }
        }

        // 2. Expand dependencies and record parent -> required links
        $inheritedMap = []; // required_slug => [parent_slugs]
        $queue = array_keys($directMap);
        $visited = [];

        while (! empty($queue)) {
            $currentSlug = array_shift($queue);
            if (in_array($currentSlug, $visited, true)) {
                continue;
            }
            $visited[] = $currentSlug;

            $permModel = $allPermissions->get($currentSlug);
            if ($permModel && $permModel->dependencies->isNotEmpty()) {
                foreach ($permModel->dependencies as $dep) {
                    $depSlug = $dep->slug;
                    $inheritedMap[$depSlug][] = $currentSlug;
                    if (! in_array($depSlug, $visited, true)) {
                        $queue[] = $depSlug;
                    }
                }
            }
        }

        // 3. Build combined effective permission descriptors
        $allEffectiveSlugs = array_unique(array_merge(array_keys($directMap), array_keys($inheritedMap)));
        $result = [];

        foreach ($allEffectiveSlugs as $slug) {
            $perm = $allPermissions->get($slug);
            $directRoles = array_values(array_unique($directMap[$slug] ?? []));
            $parents = array_values(array_unique($inheritedMap[$slug] ?? []));

            $result[$slug] = [
                'slug'           => $slug,
                'name'           => $perm ? $perm->name : $slug,
                'module'         => $perm ? $perm->module : 'General',
                'action'         => $perm ? $perm->action : 'action',
                'description'    => $perm ? $perm->description : null,
                'is_direct'      => ! empty($directRoles),
                'direct_roles'   => $directRoles,
                'is_inherited'   => ! empty($parents),
                'inherited_from' => $parents,
            ];
        }

        return $result;
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
