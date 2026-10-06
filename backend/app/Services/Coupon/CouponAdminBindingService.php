<?php

namespace App\Services\Coupon;

use App\Models\Coupon;
use App\Models\CouponAdminBinding;
use App\Models\User;
use App\Services\Audit\ActivityLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class CouponAdminBindingService
{
    /**
     * Resolve the list of coupon IDs bound to the given administrator.
     *
     * @param User $adminUser
     * @return int[]
     */
    public function getBoundCouponIds(User $adminUser): array
    {
        if (!$adminUser->isAdmin()) {
            return [];
        }

        return CouponAdminBinding::where('admin_user_id', $adminUser->id)
            ->pluck('coupon_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * Retrieve all Coupon entities bound to the given administrator.
     * Queries fresh from database to avoid stale Eloquent relation cache.
     */
    public function getBoundCoupons(User $adminUser): Collection
    {
        if (!$adminUser->isAdmin()) {
            return new Collection();
        }

        $couponIds = $this->getBoundCouponIds($adminUser);
        if (empty($couponIds)) {
            return new Collection();
        }

        return Coupon::whereIn('id', $couponIds)->orderBy('code')->get();
    }

    /**
     * List all coupon-to-admin bindings with search and filtering.
     */
    public function listBindings(?string $search = null, ?int $adminId = null, ?int $couponId = null): Collection
    {
        $query = CouponAdminBinding::with([
            'coupon:id,code,discount_type,discount_value,min_spend,max_discount,is_active,expires_at,usage_count',
            'adminUser:id,name,email,role,status',
            'creator:id,name,email',
        ]);

        if ($adminId) {
            $query->where('admin_user_id', $adminId);
        }

        if ($couponId) {
            $query->where('coupon_id', $couponId);
        }

        if (!empty($search)) {
            $term = trim($search);
            $query->where(function ($q) use ($term) {
                $q->whereHas('coupon', function ($cq) use ($term) {
                    $cq->where('code', 'ilike', "%{$term}%");
                })->orWhereHas('adminUser', function ($uq) use ($term) {
                    $uq->where('name', 'ilike', "%{$term}%")
                       ->orWhere('email', 'ilike', "%{$term}%");
                });
            });
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Bind a coupon to an administrator with full eligibility and integrity checks.
     *
     * @throws ValidationException
     */
    public function bind(int $couponId, int $adminUserId, ?User $actor = null): CouponAdminBinding
    {
        // 1. Verify administrator existence and eligibility
        $admin = User::find($adminUserId);
        if (!$admin) {
            throw ValidationException::withMessages([
                'admin_user_id' => 'The selected user does not exist.',
            ]);
        }

        if (!$admin->isAdmin()) {
            throw ValidationException::withMessages([
                'admin_user_id' => 'The selected user is not an administrator. Customers cannot be bound to coupons.',
            ]);
        }

        if (!$admin->isActiveAdmin()) {
            throw ValidationException::withMessages([
                'admin_user_id' => 'The administrator account is inactive or suspended.',
            ]);
        }

        // 2. Verify coupon existence
        $coupon = Coupon::find($couponId);
        if (!$coupon) {
            throw ValidationException::withMessages([
                'coupon_id' => 'The selected coupon does not exist.',
            ]);
        }

        // 3. Prevent duplicate bindings
        $alreadyBound = CouponAdminBinding::where('coupon_id', $couponId)
            ->where('admin_user_id', $adminUserId)
            ->exists();

        if ($alreadyBound) {
            throw ValidationException::withMessages([
                'coupon_id' => "Administrator '{$admin->name}' is already bound to coupon '{$coupon->code}'.",
            ]);
        }

        // 4. Create the binding record
        $binding = CouponAdminBinding::create([
            'coupon_id'     => $couponId,
            'admin_user_id' => $adminUserId,
            'created_by'    => $actor?->id,
        ]);

        // 5. Invalidate coupon sales cache immediately
        \App\Services\Cache\CouponSalesCacheService::invalidateForBinding($adminUserId);

        // 6. Record immutable audit log
        ActivityLogger::log('coupon.bound_to_admin', $binding, [
            'coupon_id'     => $coupon->id,
            'coupon_code'   => $coupon->code,
            'admin_user_id' => $admin->id,
            'admin_name'    => $admin->name,
            'admin_email'   => $admin->email,
        ], $actor);

        return $binding->fresh(['coupon', 'adminUser', 'creator']);
    }

    /**
     * Unbind a coupon from an administrator.
     * Safe deletion: only removes the binding, never deletes the coupon, user, or orders.
     */
    public function unbind(int $bindingId, ?User $actor = null): bool
    {
        $binding = CouponAdminBinding::with(['coupon', 'adminUser'])->findOrFail($bindingId);
        $adminUserId = (int) $binding->admin_user_id;

        // Record audit log before removal
        ActivityLogger::log('coupon.unbound_from_admin', $binding, [
            'coupon_id'     => $binding->coupon_id,
            'coupon_code'   => $binding->coupon?->code,
            'admin_user_id' => $binding->admin_user_id,
            'admin_name'    => $binding->adminUser?->name,
            'admin_email'   => $binding->adminUser?->email,
        ], $actor);

        $binding->delete();

        // Invalidate coupon sales cache immediately
        \App\Services\Cache\CouponSalesCacheService::invalidateForBinding($adminUserId);

        return true;
    }
}
