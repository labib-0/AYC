<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminUserController extends ApiController
{
    /**
     * GET /api/v1/admin/users
     * List system administrator accounts separately from customer accounts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::where('role', User::ROLE_ADMIN);

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

        // Filter by access level
        if ($request->filled('access_level') && $request->input('access_level') !== 'all') {
            $query->where('access_level', $request->input('access_level'));
        }

        $admins = $query->orderBy('created_at', 'desc')->get();

        $data = $admins->map(function ($admin) {
            return [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
                'status' => $admin->status ?? 'active',
                'access_level' => $admin->access_level ?? 'super_admin',
                'permissions' => $admin->permissions ?? ['all'],
                'phone' => $admin->phone,
                'company_name' => $admin->company_name,
                'avatar_url' => $admin->avatar_url,
                'is_demo' => (bool) $admin->is_demo,
                'created_at' => $admin->created_at?->toISOString(),
                'updated_at' => $admin->updated_at?->toISOString(),
            ];
        });

        return $this->success($data, 'Administrators retrieved successfully');
    }

    /**
     * POST /api/v1/admin/users
     * Create a new administrator account.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
            'access_level' => ['nullable', 'string', 'in:super_admin,admin,manager,editor'],
            'permissions' => ['nullable', 'array'],
        ]);

        $admin = User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password' => Hash::make($validated['password']),
            'role' => User::ROLE_ADMIN,
            'status' => $validated['status'] ?? 'active',
            'access_level' => $validated['access_level'] ?? 'super_admin',
            'permissions' => $validated['permissions'] ?? ['all'],
            'phone' => $validated['phone'] ?? null,
            'company_name' => 'Ayaan Sourcing Ltd.',
            'b2b_approval_status' => 'approved',
            'is_demo' => false,
        ]);

        return $this->success([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => $admin->role,
            'status' => $admin->status,
            'access_level' => $admin->access_level,
            'permissions' => $admin->permissions,
            'phone' => $admin->phone,
            'created_at' => $admin->created_at?->toISOString(),
        ], 'Administrator account created successfully', 201);
    }

    /**
     * GET /api/v1/admin/users/{id}
     * Retrieve single administrator details.
     */
    public function show(int $id): JsonResponse
    {
        $admin = User::where('role', User::ROLE_ADMIN)->find($id);

        if (!$admin) {
            return $this->notFound('Administrator account not found');
        }

        return $this->success([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => $admin->role,
            'status' => $admin->status ?? 'active',
            'access_level' => $admin->access_level ?? 'super_admin',
            'permissions' => $admin->permissions ?? ['all'],
            'phone' => $admin->phone,
            'company_name' => $admin->company_name,
            'created_at' => $admin->created_at?->toISOString(),
            'updated_at' => $admin->updated_at?->toISOString(),
        ], 'Administrator details retrieved');
    }

    /**
     * PUT /api/v1/admin/users/{id}
     * Update administrator details, status, permissions, or password.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $admin = User::where('role', User::ROLE_ADMIN)->find($id);

        if (!$admin) {
            return $this->notFound('Administrator account not found');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($id)],
            'password' => ['nullable', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
            'access_level' => ['sometimes', 'string', 'in:super_admin,admin,manager,editor'],
            'permissions' => ['nullable', 'array'],
        ]);

        // Prevent disabling own account
        if ($request->user() && $request->user()->id === $admin->id && isset($validated['status']) && $validated['status'] === 'inactive') {
            return $this->error('You cannot deactivate your own administrative account.', 422);
        }

        if (isset($validated['name'])) $admin->name = $validated['name'];
        if (isset($validated['email'])) $admin->email = strtolower($validated['email']);
        if (!empty($validated['password'])) $admin->password = Hash::make($validated['password']);
        if (array_key_exists('phone', $validated)) $admin->phone = $validated['phone'];
        if (isset($validated['status'])) $admin->status = $validated['status'];
        if (isset($validated['access_level'])) $admin->access_level = $validated['access_level'];
        if (array_key_exists('permissions', $validated)) $admin->permissions = $validated['permissions'];

        $admin->save();

        return $this->success([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => $admin->role,
            'status' => $admin->status,
            'access_level' => $admin->access_level,
            'permissions' => $admin->permissions,
            'phone' => $admin->phone,
            'updated_at' => $admin->updated_at?->toISOString(),
        ], 'Administrator account updated successfully');
    }

    /**
     * PATCH /api/v1/admin/users/{id}/status
     * Quickly toggle or set administrator status (active/inactive).
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $admin = User::where('role', User::ROLE_ADMIN)->find($id);

        if (!$admin) {
            return $this->notFound('Administrator account not found');
        }

        if ($request->user() && $request->user()->id === $admin->id) {
            return $this->error('You cannot change your own account status.', 422);
        }

        $newStatus = $request->input('status');
        if (!in_array($newStatus, ['active', 'inactive'])) {
            $newStatus = ($admin->status === 'active') ? 'inactive' : 'active';
        }

        $admin->status = $newStatus;
        $admin->save();

        return $this->success([
            'id' => $admin->id,
            'status' => $admin->status,
        ], "Administrator status changed to {$admin->status}");
    }

    /**
     * DELETE /api/v1/admin/users/{id}
     * Remove administrator account where permitted.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $admin = User::where('role', User::ROLE_ADMIN)->find($id);

        if (!$admin) {
            return $this->notFound('Administrator account not found');
        }

        // Cannot delete self
        if ($request->user() && $request->user()->id === $admin->id) {
            return $this->error('You cannot delete your own administrative account.', 422);
        }

        // Check if this is the last remaining administrator
        $activeAdminCount = User::where('role', User::ROLE_ADMIN)->count();
        if ($activeAdminCount <= 1) {
            return $this->error('Cannot remove the only remaining administrator account in the system.', 422);
        }

        $admin->delete();

        return $this->success(null, 'Administrator account removed successfully');
    }
}
