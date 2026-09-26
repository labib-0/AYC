<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit\ActivityLogger;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * AdminUserController — Dedicated Administrator Management Controller.
 *
 * Manages administrator accounts (users.role = 'admin') and their RBAC roles.
 *
 * Security Rules:
 *   - users.role is ALWAYS 'admin'. Customers cannot be converted here.
 *   - Super Admin authority is strictly verified at the database level.
 *   - Ordinary admins cannot modify, deactivate, or delete the Super Admin.
 *   - Nobody can delete or deactivate their own account.
 *   - Nobody can delete or deactivate the last Super Admin.
 *   - All mutations are logged in ActivityLogger with sensitive fields redacted.
 */
class AdminUserController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization,
    ) {}

    /**
     * GET /api/v1/admin/administrators
     * List system administrator accounts.
     * Requires: admin.view permission or Super Admin.
     */
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->isSuperAdmin() && ! $this->authorization->can($actor, 'admin.view')) {
            return $this->forbidden('You do not have permission to view administrators.');
        }

        $query = User::where('role', User::ROLE_ADMIN)
            ->with(['rbacRoles:id,name,slug,is_system,is_active']);

        // Search by name, email, or phone
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        // Filter by status (active / inactive)
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        // Filter by role slug
        if ($request->filled('role') && $request->input('role') !== 'all') {
            $roleSlug = $request->input('role');
            $query->whereHas('rbacRoles', fn ($q) => $q->where('roles.slug', $roleSlug));
        }

        $admins = $query->orderBy('is_super_admin', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $data = $admins->map(fn (User $admin) => $this->formatAdmin($admin));

        return $this->success($data, 'Administrators retrieved successfully');
    }

    /**
     * POST /api/v1/admin/administrators
     * Create a new administrator account with initial RBAC roles.
     * Requires: admin.create permission or Super Admin.
     */
    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->isSuperAdmin() && ! $this->authorization->can($actor, 'admin.create')) {
            return $this->forbidden('You do not have permission to create administrators.');
        }

        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'email'        => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'     => ['required', 'string', 'min:8'],
            'phone'        => ['nullable', 'string', 'max:50'],
            'status'       => ['nullable', 'string', 'in:active,inactive'],
            'access_level' => ['nullable', 'string', 'max:50'],
            'role_slugs'   => ['nullable', 'array'],
            'role_slugs.*' => ['string', Rule::exists('roles', 'slug')],
        ]);

        // Create user record strictly as admin
        $admin = User::create([
            'name'                => trim($validated['name']),
            'email'               => strtolower(trim($validated['email'])),
            'password'            => Hash::make($validated['password']),
            'role'                => User::ROLE_ADMIN,
            'status'              => $validated['status'] ?? 'active',
            'access_level'        => $validated['access_level'] ?? 'admin',
            'is_super_admin'      => false, // New admins are never Super Admin via API
            'phone'               => $validated['phone'] ?? null,
            'company_name'        => 'Ayaan Sourcing Ltd.',
            'b2b_approval_status' => 'approved',
            'is_demo'             => false,
        ]);

        // Assign initial RBAC roles if provided
        $assignedRoleNames = [];
        if (! empty($validated['role_slugs'])) {
            // Role assignment requires admin.assign_role or Super Admin
            if ($actor->isSuperAdmin() || $this->authorization->can($actor, 'admin.assign_role')) {
                $roles = Role::whereIn('slug', $validated['role_slugs'])->get();
                $syncData = [];
                foreach ($roles as $role) {
                    $syncData[$role->id] = [
                        'assigned_by' => $actor->id,
                        'assigned_at' => now(),
                    ];
                    $assignedRoleNames[] = $role->name;
                }
                $admin->rbacRoles()->sync($syncData);
                $this->authorization->invalidateUser($admin);
            }
        }

        ActivityLogger::log('admin.created', $admin, [
            'admin' => [
                'id'         => $admin->id,
                'name'       => $admin->name,
                'email'      => $admin->email,
                'roles'      => $assignedRoleNames,
                'created_by' => $actor->id,
            ],
        ]);

        return $this->success(
            $this->formatAdmin($admin->load('rbacRoles'), detailed: true),
            'Administrator account created successfully',
            201
        );
    }

    /**
     * GET /api/v1/admin/administrators/{id}
     * Retrieve single administrator details.
     * Requires: admin.view permission or Super Admin.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->isSuperAdmin() && ! $this->authorization->can($actor, 'admin.view')) {
            return $this->forbidden('You do not have permission to view administrator details.');
        }

        $admin = User::where('role', User::ROLE_ADMIN)
            ->with(['rbacRoles:id,name,slug,description,is_system,is_active'])
            ->find($id);

        if (! $admin) {
            return $this->notFound('Administrator account not found');
        }

        return $this->success(
            $this->formatAdmin($admin, detailed: true),
            'Administrator details retrieved'
        );
    }

    /**
     * PUT /api/v1/admin/administrators/{id}
     * Update administrator profile, status, and role assignments.
     * Requires: admin.edit permission or Super Admin.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->isSuperAdmin() && ! $this->authorization->can($actor, 'admin.edit')) {
            return $this->forbidden('You do not have permission to edit administrators.');
        }

        $admin = User::where('role', User::ROLE_ADMIN)->find($id);
        if (! $admin) {
            return $this->notFound('Administrator account not found');
        }

        // Super Admin protection: ordinary admins CANNOT modify Super Admin accounts
        if ($admin->isSuperAdmin() && ! $actor->isSuperAdmin()) {
            return $this->forbidden('Only the Super Admin can modify Super Admin accounts.');
        }

        $validated = $request->validate([
            'name'         => ['sometimes', 'string', 'max:255'],
            'email'        => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($id)],
            'phone'        => ['nullable', 'string', 'max:50'],
            'status'       => ['sometimes', 'string', 'in:active,inactive'],
            'access_level' => ['nullable', 'string', 'max:50'],
            'role_slugs'   => ['nullable', 'array'],
            'role_slugs.*' => ['string', Rule::exists('roles', 'slug')],
        ]);

        // Prevent deactivating own account
        if ($actor->id === $admin->id && isset($validated['status']) && $validated['status'] === 'inactive') {
            return $this->error('You cannot deactivate your own administrative account.', 422);
        }

        // Prevent deactivating the last active Super Admin
        if ($admin->isSuperAdmin() && isset($validated['status']) && $validated['status'] === 'inactive') {
            $otherActiveSuperAdmins = User::where('role', User::ROLE_ADMIN)
                ->where('is_super_admin', true)
                ->where('status', 'active')
                ->where('id', '!=', $admin->id)
                ->count();
            if ($otherActiveSuperAdmins === 0) {
                return $this->error('Cannot deactivate the only active Super Admin account.', 422);
            }
        }

        $before = $admin->only('name', 'email', 'phone', 'status', 'access_level');

        if (isset($validated['name'])) $admin->name = trim($validated['name']);
        if (isset($validated['email'])) $admin->email = strtolower(trim($validated['email']));
        if (array_key_exists('phone', $validated)) $admin->phone = $validated['phone'];
        if (isset($validated['status'])) $admin->status = $validated['status'];
        if (isset($validated['access_level'])) $admin->access_level = $validated['access_level'];

        $admin->save();
        $after = $admin->fresh()->only('name', 'email', 'phone', 'status', 'access_level');

        // Update role assignments if provided
        if (array_key_exists('role_slugs', $validated)) {
            // Cannot modify Super Admin roles
            if ($admin->isSuperAdmin()) {
                // Super Admin has all permissions intrinsically; skip or reject if non-super
                if (! $actor->isSuperAdmin()) {
                    return $this->forbidden('Cannot alter roles for Super Admin.');
                }
            } else {
                if ($actor->isSuperAdmin() || $this->authorization->can($actor, 'admin.assign_role')) {
                    $roles = Role::whereIn('slug', $validated['role_slugs'] ?? [])->get();
                    $syncData = [];
                    foreach ($roles as $role) {
                        $syncData[$role->id] = [
                            'assigned_by' => $actor->id,
                            'assigned_at' => now(),
                        ];
                    }
                    $admin->rbacRoles()->sync($syncData);
                    $this->authorization->invalidateUser($admin);

                    ActivityLogger::log('admin.roles_synced', $admin, [
                        'admin_id' => $admin->id,
                        'roles'    => $roles->pluck('slug')->all(),
                        'actor_id' => $actor->id,
                    ]);
                }
            }
        }

        $this->authorization->invalidateUser($admin);

        ActivityLogger::log('admin.updated', $admin, [
            'before'   => $before,
            'after'    => $after,
            'actor_id' => $actor->id,
        ]);

        return $this->success(
            $this->formatAdmin($admin->fresh()->load('rbacRoles'), detailed: true),
            'Administrator account updated successfully'
        );
    }

    /**
     * PATCH /api/v1/admin/administrators/{id}/status
     * Toggle or set administrator status (active/inactive).
     * Requires: admin.activate / admin.deactivate permission or Super Admin.
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        $admin = User::where('role', User::ROLE_ADMIN)->find($id);

        if (! $admin) {
            return $this->notFound('Administrator account not found');
        }

        // Cannot toggle self
        if ($actor->id === $admin->id) {
            return $this->error('You cannot change your own account status.', 422);
        }

        // Ordinary admins cannot alter Super Admin status
        if ($admin->isSuperAdmin() && ! $actor->isSuperAdmin()) {
            return $this->forbidden('Only Super Admin can change Super Admin account status.');
        }

        $newStatus = $request->input('status');
        if (! in_array($newStatus, ['active', 'inactive'])) {
            $newStatus = ($admin->status === 'active') ? 'inactive' : 'active';
        }

        // Permission check based on intended direction
        $requiredPerm = ($newStatus === 'active') ? 'admin.activate' : 'admin.deactivate';
        if (! $actor->isSuperAdmin() && ! $this->authorization->can($actor, $requiredPerm)) {
            return $this->forbidden("You do not have permission to {$newStatus} administrator accounts.");
        }

        // Cannot deactivate the only active Super Admin
        if ($admin->isSuperAdmin() && $newStatus === 'inactive') {
            $otherActiveSuperAdmins = User::where('role', User::ROLE_ADMIN)
                ->where('is_super_admin', true)
                ->where('status', 'active')
                ->where('id', '!=', $admin->id)
                ->count();
            if ($otherActiveSuperAdmins === 0) {
                return $this->error('Cannot deactivate the only active Super Admin account.', 422);
            }
        }

        $previousStatus = $admin->status;
        $admin->status = $newStatus;
        $admin->save();

        // Invalidate cached permissions for this user immediately
        $this->authorization->invalidateUser($admin);

        $action = ($newStatus === 'active') ? 'admin.activated' : 'admin.deactivated';
        ActivityLogger::log($action, $admin, [
            'previous_status' => $previousStatus,
            'new_status'      => $newStatus,
            'actor_id'        => $actor->id,
        ]);

        return $this->success([
            'id'     => $admin->id,
            'status' => $admin->status,
        ], "Administrator account {$newStatus} successfully");
    }

    /**
     * POST /api/v1/admin/administrators/{id}/reset-password
     * Reset administrator password.
     * Requires: admin.reset_password permission or Super Admin.
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->isSuperAdmin() && ! $this->authorization->can($actor, 'admin.reset_password')) {
            return $this->forbidden('You do not have permission to reset administrator passwords.');
        }

        $admin = User::where('role', User::ROLE_ADMIN)->find($id);
        if (! $admin) {
            return $this->notFound('Administrator account not found');
        }

        // Ordinary admins cannot reset Super Admin passwords
        if ($admin->isSuperAdmin() && ! $actor->isSuperAdmin()) {
            return $this->forbidden('Only Super Admin can reset the Super Admin password.');
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);

        $admin->password = Hash::make($validated['password']);
        $admin->save();

        // Revoke all existing tokens for security
        $admin->tokens()->delete();

        // Invalidate permissions cache
        $this->authorization->invalidateUser($admin);

        ActivityLogger::log('admin.password_reset', $admin, [
            'admin_id' => $admin->id,
            'actor_id' => $actor->id,
        ]);

        return $this->success(null, "Password for administrator '{$admin->name}' has been reset successfully");
    }

    /**
     * GET /api/v1/admin/administrators/{id}/permissions
     * Inspect effective permissions with provenance breakdown (direct vs dependency).
     * Requires: admin.view permission or Super Admin.
     */
    public function permissions(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->isSuperAdmin() && ! $this->authorization->can($actor, 'admin.view')) {
            return $this->forbidden('You do not have permission to inspect administrator permissions.');
        }

        $admin = User::where('role', User::ROLE_ADMIN)->with('rbacRoles')->find($id);
        if (! $admin) {
            return $this->notFound('Administrator account not found');
        }

        $sourceMap = $this->authorization->getPermissionSourceMap($admin);

        // Group by module for clean display
        $grouped = [];
        foreach ($sourceMap as $item) {
            $module = $item['module'];
            $grouped[$module][] = $item;
        }

        ksort($grouped);

        return $this->success([
            'admin'                => [
                'id'             => $admin->id,
                'name'           => $admin->name,
                'email'          => $admin->email,
                'is_super_admin' => (bool) $admin->is_super_admin,
                'status'         => $admin->status,
            ],
            'assigned_roles'       => $admin->rbacRoles->map(fn (Role $r) => [
                'id'        => $r->id,
                'name'      => $r->name,
                'slug'      => $r->slug,
                'is_system' => (bool) $r->is_system,
            ])->values(),
            'total_effective'      => count($sourceMap),
            'permissions_by_module'=> $grouped,
            'permissions_flat'     => array_values($sourceMap),
        ], 'Administrator effective permissions retrieved');
    }

    /**
     * DELETE /api/v1/admin/administrators/{id}
     * Safely delete administrator account. Soft-deletes user and revokes tokens.
     * Requires: admin.delete permission or Super Admin.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->isSuperAdmin() && ! $this->authorization->can($actor, 'admin.delete')) {
            return $this->forbidden('You do not have permission to delete administrators.');
        }

        $admin = User::where('role', User::ROLE_ADMIN)->find($id);
        if (! $admin) {
            return $this->notFound('Administrator account not found');
        }

        // Cannot delete self
        if ($actor->id === $admin->id) {
            return $this->error('You cannot delete your own administrative account.', 422);
        }

        // Ordinary admins cannot delete Super Admin
        if ($admin->isSuperAdmin() && ! $actor->isSuperAdmin()) {
            return $this->forbidden('Only Super Admin can delete Super Admin accounts.');
        }

        // Cannot delete the only remaining active Super Admin
        if ($admin->isSuperAdmin()) {
            $otherSuperAdmins = User::where('role', User::ROLE_ADMIN)
                ->where('is_super_admin', true)
                ->where('id', '!=', $admin->id)
                ->count();
            if ($otherSuperAdmins === 0) {
                return $this->error('Cannot delete the only Super Admin account in the system.', 422);
            }
        }

        // Cannot delete if this is the only remaining admin in the system
        $totalAdmins = User::where('role', User::ROLE_ADMIN)->count();
        if ($totalAdmins <= 1) {
            return $this->error('Cannot delete the only remaining administrator account in the system.', 422);
        }

        // Detach roles
        $admin->rbacRoles()->detach();

        // Invalidate permissions cache and revoke tokens
        $this->authorization->invalidateUser($admin);
        $admin->tokens()->delete();

        // Soft delete user record to maintain foreign key integrity on orders, activities, etc.
        $admin->delete();

        ActivityLogger::log('admin.deleted', $admin, [
            'deleted_admin' => [
                'id'    => $admin->id,
                'name'  => $admin->name,
                'email' => $admin->email,
            ],
            'deleted_by'    => $actor->id,
        ]);

        return $this->success(null, 'Administrator account removed successfully');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private function formatAdmin(User $admin, bool $detailed = false): array
    {
        $roles = $admin->rbacRoles ? $admin->rbacRoles->map(fn (Role $r) => [
            'id'        => $r->id,
            'name'      => $r->name,
            'slug'      => $r->slug,
            'is_system' => (bool) $r->is_system,
            'is_active' => (bool) $r->is_active,
        ])->values() : collect();

        $effectivePerms = $this->authorization->getPermissionSlugs($admin);

        $data = [
            'id'                          => $admin->id,
            'name'                        => $admin->name,
            'email'                       => $admin->email,
            'role'                        => $admin->role,
            'status'                      => $admin->status ?? 'active',
            'access_level'                => $admin->access_level ?? ($admin->is_super_admin ? 'super_admin' : 'admin'),
            'is_super_admin'              => (bool) $admin->is_super_admin,
            'phone'                       => $admin->phone,
            'company_name'                => $admin->company_name,
            'avatar_url'                  => $admin->avatar_url,
            'is_demo'                     => (bool) $admin->is_demo,
            'roles'                       => $roles,
            'role_count'                  => $roles->count(),
            'effective_permissions_count' => count($effectivePerms),
            'created_at'                  => $admin->created_at?->toISOString(),
            'updated_at'                  => $admin->updated_at?->toISOString(),
        ];

        if ($detailed) {
            $data['effective_permissions'] = $effectivePerms;
        }

        return $data;
    }
}
