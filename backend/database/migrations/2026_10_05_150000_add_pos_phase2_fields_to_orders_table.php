<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'manual_discount_amount')) {
                $table->decimal('manual_discount_amount', 12, 2)->default(0.00)->after('discount_amount');
            }
            if (!Schema::hasColumn('orders', 'manual_discount_type')) {
                $table->string('manual_discount_type', 20)->nullable()->after('manual_discount_amount');
            }
            if (!Schema::hasColumn('orders', 'manual_discount_value')) {
                $table->decimal('manual_discount_value', 12, 2)->nullable()->after('manual_discount_type');
            }
            if (!Schema::hasColumn('orders', 'manual_discount_reason')) {
                $table->string('manual_discount_reason', 255)->nullable()->after('manual_discount_value');
            }
            if (!Schema::hasColumn('orders', 'paid_amount')) {
                $table->decimal('paid_amount', 12, 2)->default(0.00)->after('total_amount');
            }
            if (!Schema::hasColumn('orders', 'balance_due')) {
                $table->decimal('balance_due', 12, 2)->default(0.00)->after('paid_amount');
            }
        });

        // Seed pos.discount permission into RBAC catalog idempotently
        $discountPerm = Permission::updateOrCreate(
            ['slug' => 'pos.discount'],
            [
                'name' => 'Apply Manual POS Discount',
                'module' => 'POS',
                'action' => 'discount',
                'description' => 'Apply manual discounts and price overrides on POS sales',
                'is_system' => true,
            ]
        );

        // Attach dependencies: pos.view and pos.create
        foreach (['pos.view', 'pos.create'] as $reqSlug) {
            $req = Permission::where('slug', $reqSlug)->first();
            if ($req) {
                DB::table('permission_dependencies')->updateOrInsert(
                    ['permission_id' => $discountPerm->id, 'requires_permission_id' => $req->id]
                );
            }
        }

        // Attach pos.discount to super_admin, admin, and order_manager roles if they exist
        $roles = Role::whereIn('slug', ['super_admin', 'admin', 'order_manager'])->get();
        foreach ($roles as $role) {
            $role->permissions()->syncWithoutDetaching([$discountPerm->id]);
        }

        Cache::tags(['rbac'])->flush();
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $cols = [
                'manual_discount_amount',
                'manual_discount_type',
                'manual_discount_value',
                'manual_discount_reason',
                'paid_amount',
                'balance_due',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('orders', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        $perm = Permission::where('slug', 'pos.discount')->first();
        if ($perm) {
            DB::table('permission_dependencies')->where('permission_id', $perm->id)->orWhere('requires_permission_id', $perm->id)->delete();
            $perm->roles()->detach();
            $perm->delete();
        }

        Cache::tags(['rbac'])->flush();
    }
};
