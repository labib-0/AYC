<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit\ActivityLogger;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

/**
 * RbacController — RBAC management API for roles, permissions, and role assignments.
 *
 * All endpoints require: auth:sanctum + role:admin
 * Mutating endpoints additionally require: is_super_admin = true
 * (enforced per-method, not via middleware, so normal admins can still read)
 */
class RbacController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization,
    ) {}

    // ──────────────────────────────────────────────────────────────────────────
    // Roles
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/admin/rbac/roles
     * List all RBAC roles with their permission slugs.
     * Accessible by any admin with role.view OR Super Admin.
     */
    public function indexRoles(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && ! $this->authorization->can($user, 'role.view')) {
            return $this->forbidden('You do not have permission to view roles.');
        }

        $roles = Role::with('permissions:id,slug,name,module')
            ->when(! $request->boolean('include_inactive'), fn ($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => $this->formatRole($role));

        return $this->success($roles, 'Roles retrieved successfully');
    }

    /**
     * POST /api/v1/admin/rbac/roles
     * Create a new role. Super Admin only.
     */
    public function storeRole(Request $request): JsonResponse
    {
        $this->requireSuperAdmin($request);

        $validated = $request->validate([
            'name'             => ['required', 'string', 'max:100'],
            'slug'             => ['required', 'string', 'max:100', 'unique:roles,slug', 'regex:/^[a-z0-9_]+$/'],
            'description'      => ['nullable', 'string', 'max:500'],
            'is_active'        => ['nullable', 'boolean'],
            'permission_slugs' => ['nullable', 'array'],
            'permission_slugs.*' => ['string', Rule::exists('permissions', 'slug')],
        ]);

        $role = Role::create([
            'name'        => $validated['name'],
            'slug'        => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'is_system'   => false,
            'is_active'   => $validated['is_active'] ?? true,
            'created_by'  => $request->user()->id,
            'updated_by'  => $request->user()->id,
        ]);

        if (! empty($validated['permission_slugs'])) {
            $permissionIds = Permission::whereIn('slug', $validated['permission_slugs'])->pluck('id')->all();
            $role->permissions()->sync($permissionIds);
        }

        ActivityLogger::log('role.created', $role, [
            'role' => [
                'slug'        => $role->slug,
                'name'        => $role->name,
                'permissions' => $validated['permission_slugs'] ?? [],
            ],
        ]);

        return $this->success($this->formatRole($role->fresh()->load('permissions')), 'Role created successfully', 201);
    }

    /**
     * GET /api/v1/admin/rbac/roles/{id}
     */
    public function showRole(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! $user->isSuperAdmin() && ! $this->authorization->can($user, 'role.view')) {
            return $this->forbidden('You do not have permission to view roles.');
        }

        $role = Role::with(['permissions:id,slug,name,module,action', 'admins:id,name,email'])->find($id);
        if (! $role) {
            return $this->notFound('Role not found');
        }

        return $this->success($this->formatRole($role, detailed: true), 'Role retrieved');
    }

    /**
     * PUT /api/v1/admin/rbac/roles/{id}
     * Update role metadata. Super Admin only. System roles cannot be renamed.
     */
    public function updateRole(Request $request, int $id): JsonResponse
    {
        $this->requireSuperAdmin($request);

        $role = Role::find($id);
        if (! $role) {
            return $this->notFound('Role not found');
        }

        $validated = $request->validate([
            'name'        => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        $before = $role->only('name', 'description', 'is_active');
        $role->update(array_merge($validated, ['updated_by' => $request->user()->id]));
        $after = $role->fresh()->only('name', 'description', 'is_active');

        // Invalidate all users holding this role
        $this->authorization->invalidateRole($role);

        ActivityLogger::log('role.updated', $role, ['before' => $before, 'after' => $after]);

        return $this->success($this->formatRole($role->load('permissions')), 'Role updated');
    }

    /**
     * DELETE /api/v1/admin/rbac/roles/{id}
     * Delete a non-system role. Super Admin only.
     */
    public function destroyRole(Request $request, int $id): JsonResponse
    {
        $this->requireSuperAdmin($request);

        $role = Role::find($id);
        if (! $role) {
            return $this->notFound('Role not found');
        }

        if ($role->is_system) {
            return $this->error('System roles cannot be deleted.', 422);
        }

        // Safety check: verify no admins are currently assigned to this role
        $adminCount = $role->admins()->count();
        if ($adminCount > 0) {
            return $this->error("Cannot delete role '{$role->name}': it is currently assigned to {$adminCount} administrator(s). Remove this role from all administrators first.", 422);
        }

        $this->authorization->invalidateRole($role);
        ActivityLogger::log('role.deleted', $role, ['role' => ['slug' => $role->slug, 'name' => $role->name]]);

        $role->delete();

        return $this->success(null, 'Role deleted successfully');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Role Permissions
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * PUT /api/v1/admin/rbac/roles/{id}/permissions
     * Sync permissions on a role. Super Admin only.
     */
    public function syncRolePermissions(Request $request, int $id): JsonResponse
    {
        $this->requireSuperAdmin($request);

        $role = Role::with('permissions')->find($id);
        if (! $role) {
            return $this->notFound('Role not found');
        }

        $validated = $request->validate([
            'permission_slugs'   => ['required', 'array'],
            'permission_slugs.*' => ['string', Rule::exists('permissions', 'slug')],
        ]);

        $permissionIds = Permission::whereIn('slug', $validated['permission_slugs'])->pluck('id')->all();
        $before = $role->permissions->pluck('slug')->all();
        $role->permissions()->sync($permissionIds);
        $after = $role->fresh()->permissions->pluck('slug')->all();

        // Invalidate all users holding this role
        $this->authorization->invalidateRole($role);

        ActivityLogger::log('role.permissions_synced', $role, [
            'before' => $before,
            'after'  => $after,
        ]);

        return $this->success(
            $this->formatRole($role->load('permissions')),
            'Role permissions updated'
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Permissions Catalog
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/admin/rbac/permissions
     * List permission catalog, optionally grouped by module.
     */
    public function indexPermissions(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->isSuperAdmin() && ! $this->authorization->can($user, 'permission.view')) {
            return $this->forbidden('You do not have permission to view the permission catalog.');
        }

        $permissions = Permission::with('dependencies:id,slug,name')
            ->orderBy('module')
            ->orderBy('slug')
            ->get()
            ->map(fn (Permission $p) => [
                'id'           => $p->id,
                'slug'         => $p->slug,
                'name'         => $p->name,
                'module'       => $p->module,
                'action'       => $p->action,
                'description'  => $p->description,
                'is_system'    => $p->is_system,
                'requires'     => $p->dependencies->pluck('slug')->all(),
            ]);

        if ($request->boolean('group_by_module')) {
            $grouped = $permissions->groupBy('module')->toArray();
            return $this->success($grouped, 'Permissions grouped by module');
        }

        return $this->success($permissions, 'Permission catalog retrieved');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Admin Role Assignments
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/admin/rbac/admins/{adminId}/roles
     * Get RBAC roles assigned to an admin. Super Admin only.
     */
    public function getAdminRoles(Request $request, int $adminId): JsonResponse
    {
        $this->requireSuperAdmin($request);

        $admin = User::where('role', 'admin')->find($adminId);
        if (! $admin) {
            return $this->notFound('Administrator not found');
        }

        $roles = $admin->rbacRoles()->with('permissions:id,slug')->get()
            ->map(fn (Role $role) => $this->formatRole($role));

        $effectivePermissions = $this->authorization->getPermissionSlugs($admin);

        return $this->success([
            'admin'                => ['id' => $admin->id, 'name' => $admin->name, 'email' => $admin->email, 'is_super_admin' => $admin->is_super_admin],
            'assigned_roles'       => $roles,
            'effective_permissions'=> $effectivePermissions,
        ], 'Admin RBAC assignments retrieved');
    }

    /**
     * POST /api/v1/admin/rbac/admins/{adminId}/roles
     * Assign a role to an admin. Super Admin only.
     */
    public function assignRole(Request $request, int $adminId): JsonResponse
    {
        $this->requireSuperAdmin($request);

        $admin = User::where('role', 'admin')->find($adminId);
        if (! $admin) {
            return $this->notFound('Administrator not found');
        }

        // Normal admins cannot be assigned Super Admin here; use the artisan command
        if ($admin->isSuperAdmin()) {
            return $this->error('Super Admin accounts do not require explicit role assignment.', 422);
        }

        $validated = $request->validate([
            'role_slug' => ['required', 'string', Rule::exists('roles', 'slug')],
        ]);

        $role = Role::where('slug', $validated['role_slug'])->first();

        // Idempotent: no error if already assigned
        $admin->rbacRoles()->syncWithoutDetaching([
            $role->id => ['assigned_by' => $request->user()->id, 'assigned_at' => now()],
        ]);

        $this->authorization->invalidateUser($admin);

        ActivityLogger::log('role.assigned', $admin, [
            'role' => ['id' => $role->id, 'slug' => $role->slug],
            'assigned_by' => $request->user()->id,
        ]);

        return $this->success(null, "Role '{$role->name}' assigned to {$admin->name}");
    }

    /**
     * DELETE /api/v1/admin/rbac/admins/{adminId}/roles/{roleId}
     * Remove a role from an admin. Super Admin only.
     */
    public function removeRole(Request $request, int $adminId, int $roleId): JsonResponse
    {
        $this->requireSuperAdmin($request);

        $admin = User::where('role', 'admin')->find($adminId);
        if (! $admin) {
            return $this->notFound('Administrator not found');
        }

        $role = Role::find($roleId);
        if (! $role) {
            return $this->notFound('Role not found');
        }

        $admin->rbacRoles()->detach($roleId);
        $this->authorization->invalidateUser($admin);

        ActivityLogger::log('role.removed', $admin, [
            'role' => ['id' => $role->id, 'slug' => $role->slug],
            'removed_by' => $request->user()->id,
        ]);

        return $this->success(null, "Role '{$role->name}' removed from {$admin->name}");
    }

    /**
     * GET /api/v1/admin/rbac/me
     * Return the authenticated admin's own RBAC roles and effective permissions.
     */
    public function myPermissions(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin()) {
            return $this->forbidden('This endpoint is for administrators only.');
        }

        return $this->success([
            'is_super_admin'        => $user->isSuperAdmin(),
            'assigned_roles'        => $user->rbacRoles()->pluck('slug')->all(),
            'effective_permissions' => $this->authorization->getPermissionSlugs($user),
        ], 'Your RBAC profile');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Abort with 403 if the requesting user is not Super Admin.
     * Used for all mutating RBAC endpoints.
     */
    private function requireSuperAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! $user->isSuperAdmin()) {
            abort(response()->json([
                'success' => false,
                'message' => 'Forbidden: Super Admin authority required.',
            ], 403));
        }
    }

    private function formatRole(Role $role, bool $detailed = false): array
    {
        $directPerms = $role->permissions ? $role->permissions->map(fn ($p) => [
            'id'     => $p->id,
            'slug'   => $p->slug,
            'name'   => $p->name,
            'module' => $p->module,
            'action' => $p->action ?? 'view',
        ])->values() : collect();

        $directSlugs = $directPerms->pluck('slug')->all();
        $adminCount = $role->relationLoaded('admins') ? $role->admins->count() : $role->admins()->count();

        $data = [
            'id'               => $role->id,
            'name'             => $role->name,
            'slug'             => $role->slug,
            'description'      => $role->description,
            'is_system'        => (bool) $role->is_system,
            'is_active'        => (bool) $role->is_active,
            'permissions'      => $directPerms,
            'permission_count' => $directPerms->count(),
            'admin_count'      => $adminCount,
            'created_at'       => $role->created_at?->toISOString(),
            'updated_at'       => $role->updated_at?->toISOString(),
        ];

        if ($detailed) {
            // Compute effective permissions with dependency expansion
            $allPerms = Permission::with('dependencies')->get()->keyBy('slug');
            $expandedSlugs = [];
            $queue = $directSlugs;
            $visited = [];

            while (! empty($queue)) {
                $curr = array_shift($queue);
                if (in_array($curr, $visited, true)) {
                    continue;
                }
                $visited[] = $curr;
                $expandedSlugs[] = $curr;

                $p = $allPerms->get($curr);
                if ($p && $p->dependencies->isNotEmpty()) {
                    foreach ($p->dependencies as $dep) {
                        if (! in_array($dep->slug, $visited, true)) {
                            $queue[] = $dep->slug;
                        }
                    }
                }
            }

            $effectiveList = [];
            foreach ($expandedSlugs as $slug) {
                $p = $allPerms->get($slug);
                $effectiveList[] = [
                    'slug'         => $slug,
                    'name'         => $p ? $p->name : $slug,
                    'module'       => $p ? $p->module : 'General',
                    'action'       => $p ? $p->action : 'action',
                    'description'  => $p ? $p->description : null,
                    'is_direct'    => in_array($slug, $directSlugs, true),
                    'is_inherited' => ! in_array($slug, $directSlugs, true),
                ];
            }

            $data['effective_permissions'] = $effectiveList;
            $data['effective_permissions_count'] = count($effectiveList);

            if ($role->relationLoaded('admins')) {
                $data['admins'] = $role->admins->map(fn ($a) => [
                    'id'    => $a->id,
                    'name'  => $a->name,
                    'email' => $a->email,
                ])->values();
            }
        }

        return $data;
    }
}
