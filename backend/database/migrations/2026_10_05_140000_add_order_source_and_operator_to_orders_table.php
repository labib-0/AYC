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
            if (!Schema::hasColumn('orders', 'order_source')) {
                $table->string('order_source', 30)->default('storefront')->index()->after('order_number');
            }
            if (!Schema::hasColumn('orders', 'created_by_admin_id')) {
                $table->foreignId('created_by_admin_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });

        // Seed POS permissions idempotently into RBAC catalog
        $posPermissions = [
            'pos.view' => [
                'name' => 'View POS',
                'module' => 'POS',
                'action' => 'view',
                'description' => 'Access Admin POS interface and search products/customers',
                'requires' => [],
            ],
            'pos.create' => [
                'name' => 'Create POS Sale',
                'module' => 'POS',
                'action' => 'create',
                'description' => 'Create POS sales orders and deduct inventory',
                'requires' => ['pos.view'],
            ],
        ];

        foreach ($posPermissions as $slug => $data) {
            $permission = Permission::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $data['name'],
                    'module' => $data['module'],
                    'action' => $data['action'],
                    'description' => $data['description'],
                    'is_system' => true,
                ]
            );

            // Seed dependencies
            foreach ($data['requires'] as $reqSlug) {
                $req = Permission::where('slug', $reqSlug)->first();
                if ($req) {
                    DB::table('permission_dependencies')->insertOrIgnore([
                        'permission_id' => $permission->id,
                        'requires_permission_id' => $req->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // Attach to super_admin or roles with order.view
        $superAdminRole = Role::where('slug', 'super_admin')->first();
        if ($superAdminRole) {
            $posPermIds = Permission::whereIn('slug', ['pos.view', 'pos.create'])->pluck('id');
            $superAdminRole->permissions()->syncWithoutDetaching($posPermIds);
        }

        Cache::forget('rbac:all_permission_slugs');
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'created_by_admin_id')) {
                $table->dropForeign(['created_by_admin_id']);
                $table->dropColumn('created_by_admin_id');
            }
            if (Schema::hasColumn('orders', 'order_source')) {
                $table->dropColumn('order_source');
            }
        });
    }
};
