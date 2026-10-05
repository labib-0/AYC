<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\Permission;
use App\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Seed document.invoice.generate permission into RBAC catalog idempotently
        $invoicePerm = Permission::updateOrCreate(
            ['slug' => 'document.invoice.generate'],
            [
                'name' => 'Generate Sales Invoice',
                'module' => 'Documents',
                'action' => 'invoice.generate',
                'description' => 'Generate and download sales invoice commercial documents',
                'is_system' => true,
            ]
        );

        // Attach prerequisites: document.view, document.generate, order.view
        foreach (['document.view', 'document.generate', 'order.view'] as $reqSlug) {
            $req = Permission::where('slug', $reqSlug)->first();
            if ($req) {
                DB::table('permission_dependencies')->updateOrInsert(
                    ['permission_id' => $invoicePerm->id, 'requires_permission_id' => $req->id]
                );
            }
        }

        // Attach to super_admin, admin, and order_manager roles if they exist
        $roles = Role::whereIn('slug', ['super_admin', 'admin', 'order_manager'])->get();
        foreach ($roles as $role) {
            DB::table('role_permissions')->updateOrInsert(
                ['role_id' => $role->id, 'permission_id' => $invoicePerm->id]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $perm = Permission::where('slug', 'document.invoice.generate')->first();
        if ($perm) {
            DB::table('permission_dependencies')->where('permission_id', $perm->id)->delete();
            DB::table('permission_dependencies')->where('requires_permission_id', $perm->id)->delete();
            DB::table('role_permissions')->where('permission_id', $perm->id)->delete();
            $perm->delete();
        }
    }
};
