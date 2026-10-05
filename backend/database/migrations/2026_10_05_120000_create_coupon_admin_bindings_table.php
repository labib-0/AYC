<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create coupon_admin_bindings table
        if (!Schema::hasTable('coupon_admin_bindings')) {
            Schema::create('coupon_admin_bindings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('coupon_id')->constrained('coupons')->cascadeOnDelete();
                $table->foreignId('admin_user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['coupon_id', 'admin_user_id'], 'coupon_admin_bindings_unique');
                $table->index('coupon_id');
                $table->index('admin_user_id');
            });
        }

        // 2. Idempotently seed the prebuilt editable role: Coupon Sales Manager
        $role = Role::firstOrCreate(
            ['slug' => 'coupon_sales'],
            [
                'name'        => 'Coupon Sales Manager',
                'description' => 'View sales, orders, and performance metrics attributed to bound discount coupons.',
                'is_system'   => false, // Normal editable role as required by Section 5
                'is_active'   => true,
            ]
        );

        // Initial granular permissions (Section 6)
        $initialPermSlugs = [
            'coupon.view',
            'order.view',
            'order.view_customer',
            'order.view_items',
            'analytics.sales.view',
            'analytics.orders.view',
        ];

        $permissionIds = Permission::whereIn('slug', $initialPermSlugs)->pluck('id')->all();
        if (!empty($permissionIds)) {
            $role->permissions()->syncWithoutDetaching($permissionIds);
        }

        Cache::forget('rbac:all_permission_slugs');
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_admin_bindings');
    }
};
